/**
 * timer-pip.ts — Picture-in-Picture pop-out for the analog timer (M6).
 * ──────────────────────────────────────────────────────────────────────────────
 * SELF-DRIVING: the pop-out runs its OWN interval (registered on the PiP window)
 * and computes the wedge from an absolute end-time. This means it keeps counting
 * even after the user navigates away from /timer (client-side navigation tears
 * down the React timer page, but the PiP window — and the interval it owns —
 * survive). That's the whole point of a pop-out.
 *
 * Uses documentPictureInPicture (Chrome/Edge); falls back to a window.open popup
 * (Safari/Firefox). The wedge is drawn on a <canvas> so it survives DOM moves.
 *
 * On reaching zero while still open, the pop-out POSTs /api/timer/complete so the
 * session ends + the focus_complete badge fires even if the user is elsewhere.
 */

export type TimerPiP = {
  /** Freeze at the given remaining seconds (user paused on the main page). */
  pause: (remainingSeconds: number) => void;
  /** Resume counting toward a new absolute end-time (ms epoch). */
  resume: (endsAtMs: number) => void;
  close: () => void;
  /** Called when the PiP window is closed by the user. */
  onClose: (cb: () => void) => void;
};

export type OpenTimerPiPOptions = {
  endsAtMs: number;
  plannedSeconds: number;
  sessionId: string | null;
  paused?: boolean;
  size?: number;
};

type DPiP = { requestWindow: (opts: { width: number; height: number }) => Promise<Window> };

function hasDocumentPiP(): boolean {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}

function zoneColor(fractionElapsed: number): string {
  if (fractionElapsed < 1 / 3) return '#facc15'; // yellow
  if (fractionElapsed < 2 / 3) return '#34d399'; // green
  return '#c084fc'; // mauve
}

function drawWedge(ctx: CanvasRenderingContext2D, size: number, fractionRemaining: number): void {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const frac = Math.max(0, Math.min(1, fractionRemaining));

  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (frac > 0.001) {
    const start = -Math.PI / 2;
    const end = start + frac * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end, false);
    ctx.closePath();
    ctx.fillStyle = zoneColor(1 - frac);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
}

export async function openTimerPiP(opts: OpenTimerPiPOptions): Promise<TimerPiP | null> {
  if (typeof window === 'undefined') return null;
  const size = opts.size ?? 220;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // ── Shared timer state (lives in the opener heap; the PiP interval reads it) ──
  const planned = opts.plannedSeconds;
  let endsAtMs = opts.endsAtMs;
  let frozenRemaining: number | null = opts.paused ? Math.max(0, (endsAtMs - Date.now()) / 1000) : null;
  let completed = false;
  let closeCallback: (() => void) | null = null;

  const remainingNow = (): number =>
    frozenRemaining !== null ? frozenRemaining : Math.max(0, (endsAtMs - Date.now()) / 1000);

  async function fireComplete() {
    if (completed) return;
    completed = true;
    if (!opts.sessionId) return;
    try {
      await fetch('/api/timer/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId: opts.sessionId, actualDurationSeconds: planned }),
        keepalive: true,
      });
    } catch {
      // best-effort
    }
  }

  function frame() {
    const remaining = remainingNow();
    drawWedge(ctx!, size, planned > 0 ? remaining / planned : 0);
    if (remaining <= 0 && frozenRemaining === null) {
      void fireComplete();
    }
  }

  function attach(win: Window): TimerPiP {
    win.document.body.style.cssText =
      'margin:0;display:flex;align-items:center;justify-content:center;background:#0f172a;';
    win.document.body.append(canvas);
    frame();
    // Interval registered on the PiP window — survives opener SPA navigation.
    const id = win.setInterval(frame, 250);
    const cleanup = () => { win.clearInterval(id); closeCallback?.(); };
    win.addEventListener('pagehide', cleanup);
    win.addEventListener('beforeunload', cleanup);

    return {
      pause: (remainingSeconds: number) => { frozenRemaining = Math.max(0, remainingSeconds); },
      resume: (newEndsAtMs: number) => { frozenRemaining = null; endsAtMs = newEndsAtMs; },
      close: () => { win.clearInterval(id); win.close(); },
      onClose: (cb) => { closeCallback = cb; },
    };
  }

  // ── Preferred: documentPictureInPicture ────────────────────────────────────
  if (hasDocumentPiP()) {
    try {
      const dpip = (window as unknown as { documentPictureInPicture: DPiP }).documentPictureInPicture;
      const pipWindow = await dpip.requestWindow({ width: size + 24, height: size + 24 });
      return attach(pipWindow);
    } catch {
      // fall through to popup fallback
    }
  }

  // ── Fallback: floating popup window ─────────────────────────────────────────
  const popup = window.open('', 'focus-forge-timer', `width=${size + 24},height=${size + 24}`);
  if (!popup) return null;
  popup.document.title = 'Focus timer';
  return attach(popup);
}
