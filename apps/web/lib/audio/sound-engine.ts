/**
 * sound-engine.ts — Web Audio synthesis for timer alert sounds (M6).
 * ──────────────────────────────────────────────────────────────────────────────
 * Renders the VariationSpec definitions from
 * @focus-forge/domain/timer/sound-families programmatically — no asset files.
 *
 * An AudioContext can only start after a user gesture, so `unlock()` must be
 * called from a click/tap handler (e.g. when the user presses Start).
 */

import type { VariationSpec } from '@focus-forge/domain/timer/sound-families';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Call from a user gesture so audio is allowed to play later. */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

function envelope(c: AudioContext, gain: GainNode, durationMs: number, attackMs: number, releaseMs: number, peak = 0.18) {
  const now = c.currentTime;
  const dur = durationMs / 1000;
  const atk = Math.min(attackMs / 1000, dur);
  const rel = Math.min(releaseMs / 1000, dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + atk);
  gain.gain.setValueAtTime(peak, now + Math.max(atk, dur - rel));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
}

function playTone(c: AudioContext, spec: Extract<VariationSpec, { kind: 'tone' }>) {
  const master = c.createGain();
  master.connect(c.destination);
  envelope(c, master, spec.durationMs, spec.attackMs, spec.releaseMs);

  const now = c.currentTime;
  for (const freq of spec.freqs) {
    const osc = c.createOscillator();
    osc.type = spec.waveform;
    osc.frequency.value = freq;
    osc.connect(master);
    osc.start(now);
    osc.stop(now + spec.durationMs / 1000 + 0.05);
  }
}

function playNoise(c: AudioContext, spec: Extract<VariationSpec, { kind: 'noise' }>) {
  const frames = Math.floor((c.sampleRate * spec.durationMs) / 1000);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = spec.filterHz;

  const master = c.createGain();
  envelope(c, master, spec.durationMs, spec.attackMs, spec.releaseMs, 0.25);

  src.connect(filter).connect(master).connect(c.destination);
  src.start(c.currentTime);
  src.stop(c.currentTime + spec.durationMs / 1000 + 0.05);
}

/** Synthesize and play a single variation. No-op if Web Audio is unavailable. */
export function playVariation(spec: VariationSpec): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  try {
    if (spec.kind === 'tone') playTone(c, spec);
    else playNoise(c, spec);
  } catch {
    // Audio failures are non-fatal — the timer still works visually.
  }
}
