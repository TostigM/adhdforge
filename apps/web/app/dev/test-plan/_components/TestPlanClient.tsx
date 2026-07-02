'use client';

/**
 * M4 Interactive Test Plan — client content.
 * The production gate lives in ../page.tsx (server-side notFound()), so this
 * component never renders outside development.
 */

import React, { useCallback, useEffect, useReducer, useState } from 'react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const AUTOMATED_SUITES = [
  {
    label: 'packages/domain',
    runner: 'Vitest 4',
    files: [
      { name: 'tasks/create-task.test.ts', tests: 16, focus: 'Validation, defaults, Soft-Track, event logging, db error safety' },
      { name: 'tasks/complete-task.test.ts', tests: 11, focus: 'Guards, status transition, badge engine isolation' },
      { name: 'tasks/defer-task.test.ts', tests: 11, focus: 'Guards, atomic increment, deferUntil storage, race-condition safety' },
      { name: 'badges/check-and-award.test.ts', tests: 10, focus: 'Idempotency, repeatable awards, threshold enforcement' },
    ],
  },
  {
    label: 'apps/web',
    runner: 'Vitest 4',
    files: [
      { name: 'api/sync/__tests__/route.test.ts', tests: 8, focus: '401 unauthed, 400 bad since, response shape, userId isolation' },
      { name: 'server-actions/tasks/__tests__/create-task.test.ts', tests: 5, focus: 'Auth gate, domain delegation, error propagation' },
    ],
  },
];

const ACCEPTANCE_CRITERIA = [
  { id: 'ac_ts_failed', label: 'TypeScript: `status` cannot be `"failed"`', auto: true, note: 'TaskStatus enum' },
  { id: 'ac_ts_urgent', label: 'TypeScript: priority cannot be `"urgent"` or `"red"`', auto: true, note: 'TaskPriorityLevel enum' },
  { id: 'ac_create_validates', label: 'createTask validates all inputs', auto: true, note: 'Unit test 3.1' },
  { id: 'ac_badge_idempotent', label: 'Badge engine is idempotent (no double-awards)', auto: true, note: 'Unit test 3.4 #3' },
  { id: 'ac_defer_atomic', label: 'deferredCount uses atomic increment (race-safe)', auto: true, note: 'Unit test 3.3 #10' },
  { id: 'ac_sync_auth', label: '/api/sync requires authentication', auto: true, note: 'Integration test 4.1 #1' },
  { id: 'ac_sync_filter', label: '/api/sync filters by userId and since timestamp', auto: true, note: 'Integration test 4.1 #7–8' },
  { id: 'ac_action_error', label: 'Server action propagates domain errors to client', auto: true, note: 'Integration test 4.2 #4' },
  { id: 'ac_capture_ui', label: 'User can capture a task via text input', auto: false },
  { id: 'ac_task_appears', label: 'Task appears immediately on dashboard', auto: false },
  { id: 'ac_badge_once', label: 'First Capture Badge fires only once per user', auto: false },
  { id: 'ac_complete', label: 'Complete task → "Done" → task removed', auto: false },
  { id: 'ac_defer', label: 'Defer task → removed from view, no shame language', auto: false },
  { id: 'ac_sync_tabs', label: 'Two tabs stay in sync within 7 seconds', auto: false },
  { id: 'ac_empty_state', label: 'Empty state renders per design system spec', auto: false },
  { id: 'ac_no_red', label: 'No red colors anywhere on the page', auto: false },
  { id: 'ac_axe', label: 'axe-core: 0 violations', auto: false },
];

const SMOKE_STEPS = [
  { id: 'sm_signin', label: 'Sign in', detail: 'Navigate to localhost:3001, sign in with your account.' },
  { id: 'sm_empty', label: 'Empty state', detail: 'Dashboard shows the empty state message. No crash. Text says "Nothing on your plate right now. That\'s allowed."' },
  { id: 'sm_capture', label: 'Capture a task', detail: 'Type "Buy oranges" into the input and press Enter.' },
  { id: 'sm_badge', label: 'First Capture Badge', detail: '"First Capture" badge toast appears within 2 seconds of task creation.' },
  { id: 'sm_card', label: 'TaskCard renders', detail: 'TaskCard appears with text "Buy oranges" and a Silver priority pill. Actions visible: "Done" and "Push to later".' },
  { id: 'sm_complete', label: 'Complete a task', detail: 'Click "Done" → TaskCard disappears. Success toast shows. First Complete badge may also appear.' },
  { id: 'sm_defer', label: 'Defer a task', detail: 'Add a new task. Click "Push to later" → task disappears. Info toast says "Moved it out of the way. You\'re good." Verify: no shame language visible.' },
  { id: 'sm_sync', label: 'Cross-tab sync', detail: 'Open /dashboard in a second tab. Add a task in tab 1. Verify it appears in tab 2 within 7 seconds without a manual refresh.' },
  { id: 'sm_no_red', label: 'No red check', detail: 'Inspect → computed styles → search for any rgb(239, or rgb(220, values on visible elements. Should be zero.' },
  { id: 'sm_persist', label: 'Data persists', detail: 'Sign out, sign back in → tasks are still there (not in-memory-only).' },
];

const E2E_SCENARIOS = [
  { id: 'e2e_empty', label: 'Empty dashboard renders correctly' },
  { id: 'e2e_capture', label: 'Capture task → TaskCard appears' },
  { id: 'e2e_badge_capture', label: 'First Capture Badge fires once only' },
  { id: 'e2e_complete', label: 'Complete task → removed + toast' },
  { id: 'e2e_badge_complete', label: 'First Complete Badge fires' },
  { id: 'e2e_defer', label: 'Defer task → removed, no shame text' },
  { id: 'e2e_shame', label: 'Full page: no shame-language scan' },
  { id: 'e2e_sync', label: 'Two tabs sync within 7s' },
  { id: 'e2e_sync_hidden', label: 'Sync resumes immediately when tab shown' },
  { id: 'e2e_auth_guard', label: '/dashboard redirects when logged out' },
  { id: 'e2e_no_red', label: 'No red anywhere (visual + axe)' },
  { id: 'e2e_axe', label: 'axe-core: 0 violations on dashboard' },
];

const KNOWN_GAPS = [
  { label: 'Playwright E2E full suite', milestone: 'Before M4 sign-off' },
  { label: 'list-active-tasks unit tests (ordering)', milestone: 'M4.5' },
  { label: 'get-user-badges unit tests', milestone: 'M10 (trophy case UI)' },
  { label: 'complete/defer/update-priority server action tests', milestone: 'Before M5' },
  { label: 'useSyncStream hook tests', milestone: 'Before M4.5' },
  { label: 'Load test: dashboard < 100ms with 1,000 tasks', milestone: 'M15' },
  { label: 'ESLint rule blocking *-red-* class names', milestone: 'M15' },
];

// ─── localStorage state ───────────────────────────────────────────────────────

const STORAGE_KEY = 'ff-m4-test-plan-v1';

type CheckState = Record<string, boolean>;
type E2EStatus = 'pending' | 'pass' | 'fail';
type E2EState = Record<string, E2EStatus>;

type PlanState = {
  criteria: CheckState;
  smoke: CheckState;
  e2e: E2EState;
};

function loadState(): PlanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { criteria: {}, smoke: {}, e2e: {} };
  } catch {
    return { criteria: {}, smoke: {}, e2e: {} };
  }
}

function saveState(state: PlanState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

type Action =
  | { type: 'TOGGLE_CRITERIA'; id: string }
  | { type: 'TOGGLE_SMOKE'; id: string }
  | { type: 'CYCLE_E2E'; id: string }
  | { type: 'RESET' };

function reducer(state: PlanState, action: Action): PlanState {
  switch (action.type) {
    case 'TOGGLE_CRITERIA':
      return { ...state, criteria: { ...state.criteria, [action.id]: !state.criteria[action.id] } };
    case 'TOGGLE_SMOKE':
      return { ...state, smoke: { ...state.smoke, [action.id]: !state.smoke[action.id] } };
    case 'CYCLE_E2E': {
      const cur = state.e2e[action.id] ?? 'pending';
      const next: E2EStatus = cur === 'pending' ? 'pass' : cur === 'pass' ? 'fail' : 'pending';
      return { ...state, e2e: { ...state.e2e, [action.id]: next } };
    }
    case 'RESET':
      return { criteria: {}, smoke: {}, e2e: {} };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ children, count, total }: { children: React.ReactNode; count?: number; total?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{children}</h2>
      {total !== undefined && (
        <span className="text-sm font-mono text-[var(--text-secondary)]">
          {count}/{total}
        </span>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: 'pass' | 'fail' | 'pending' | 'auto' }) {
  const map = {
    pass:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    fail:    'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
    pending: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    auto:    'bg-violet-500/15 text-violet-400 border-violet-500/30',
  };
  const labels = { pass: '✓ Pass', fail: '✗ Fail', pending: '○ Pending', auto: '⚡ Auto' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

function ProgressBar({ value, total, color = 'var(--accent)' }: { value: number; total: number; color?: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="relative h-2 w-full rounded-full bg-[var(--bg-elevated)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function Checkbox({ checked, onChange, label, detail, extra }: {
  checked: boolean;
  onChange: () => void;
  label: string;
  detail?: string;
  extra?: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group py-2 px-1 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors">
      <div className="mt-0.5 shrink-0">
        <div
          onClick={onChange}
          className={[
            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
            checked
              ? 'bg-[var(--accent)] border-[var(--accent)]'
              : 'border-[var(--border)] group-hover:border-[var(--accent)]',
          ].join(' ')}
        >
          {checked && (
            <svg className="w-3 h-3 text-slate-900" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0" onClick={onChange}>
        <span className={`text-sm ${checked ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
          {label}
        </span>
        {detail && (
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">{detail}</p>
        )}
      </div>
      {extra}
    </label>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TestPlanClient() {
  const [state, dispatch] = useReducer(reducer, { criteria: {}, smoke: {}, e2e: {} });
  const [hydrated, setHydrated] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Load from localStorage after mount
  useEffect(() => {
    const saved = loadState();
    if (Object.keys(saved.criteria).length || Object.keys(saved.smoke).length || Object.keys(saved.e2e).length) {
      dispatch({ type: 'RESET' });
      // Re-apply saved state by dispatching individual actions would be messy.
      // Instead, replace the entire state directly:
      Object.keys(saved.criteria).forEach(id => {
        if (saved.criteria[id]) dispatch({ type: 'TOGGLE_CRITERIA', id });
      });
      Object.keys(saved.smoke).forEach(id => {
        if (saved.smoke[id]) dispatch({ type: 'TOGGLE_SMOKE', id });
      });
      // E2E: cycle to correct state
      Object.keys(saved.e2e).forEach(id => {
        const target = saved.e2e[id];
        if (target === 'pass') dispatch({ type: 'CYCLE_E2E', id }); // pending → pass
        if (target === 'fail') {
          dispatch({ type: 'CYCLE_E2E', id }); // pending → pass
          dispatch({ type: 'CYCLE_E2E', id }); // pass → fail
        }
      });
    }
    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to localStorage on every state change
  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSection(prev => prev === id ? null : id);
  }, []);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const totalAutomated = AUTOMATED_SUITES.flatMap(s => s.files).reduce((n, f) => n + f.tests, 0);
  const manualCriteria = ACCEPTANCE_CRITERIA.filter(c => !c.auto);
  const checkedCriteria = manualCriteria.filter(c => state.criteria[c.id]).length;
  const autoCriteria = ACCEPTANCE_CRITERIA.filter(c => c.auto).length;
  const checkedSmoke = SMOKE_STEPS.filter(s => state.smoke[s.id]).length;
  const passedE2E = E2E_SCENARIOS.filter(s => state.e2e[s.id] === 'pass').length;

  const totalChecked = autoCriteria + checkedCriteria + checkedSmoke + passedE2E;
  const totalItems = ACCEPTANCE_CRITERIA.length + SMOKE_STEPS.length + E2E_SCENARIOS.length;
  const overallPct = Math.round((totalChecked / totalItems) * 100);

  // ── Collapsible section helper ──────────────────────────────────────────────
  function Section({ id, title, badge, badgeColor = 'var(--accent)', children }: {
    id: string; title: string; badge?: string; badgeColor?: string; children: React.ReactNode;
  }) {
    const open = expandedSection === id || expandedSection === null;
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--bg-elevated)] transition-colors"
          onClick={() => toggleSection(id)}
          aria-expanded={open}
        >
          <span className="font-semibold text-[var(--text-primary)]">{title}</span>
          <div className="flex items-center gap-2">
            {badge && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: `${badgeColor}20`, color: badgeColor }}>
                {badge}
              </span>
            )}
            <svg className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 16 16">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>
        {open && <div className="px-5 pb-5">{children}</div>}
      </section>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="text-[var(--text-tertiary)] text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-1">
                Focus Forge · Milestone 4
              </div>
              <h1 className="text-3xl font-bold">Task Capture + Dashboard</h1>
              <p className="text-[var(--text-secondary)] mt-1 text-sm">
                Interactive test plan · {totalAutomated} automated · {SMOKE_STEPS.length} manual · {E2E_SCENARIOS.length} E2E
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-4xl font-bold tabular-nums" style={{ color: overallPct === 100 ? 'var(--success)' : 'var(--accent)' }}>
                {overallPct}%
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{totalChecked}/{totalItems} criteria</div>
            </div>
          </div>
          <ProgressBar
            value={totalChecked}
            total={totalItems}
            color={overallPct === 100 ? 'var(--success)' : 'var(--accent)'}
          />
          <div className="flex gap-4 text-xs text-[var(--text-secondary)] flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {totalAutomated} automated passing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
              {checkedCriteria + autoCriteria}/{ACCEPTANCE_CRITERIA.length} acceptance criteria
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              {checkedSmoke}/{SMOKE_STEPS.length} smoke steps
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
              {passedE2E}/{E2E_SCENARIOS.length} E2E
            </span>
          </div>
        </div>

        {/* ── Automated Tests ─────────────────────────────────────────────────── */}
        <Section id="automated" title="Automated Tests" badge={`${totalAutomated} passing`} badgeColor="var(--success)">
          <div className="space-y-5 pt-1">
            {AUTOMATED_SUITES.map(suite => (
              <div key={suite.label}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-[var(--text-tertiary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded">
                    {suite.label}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">· {suite.runner}</span>
                </div>
                <div className="space-y-1">
                  {suite.files.map(f => (
                    <div key={f.name} className="flex items-start gap-3 py-2 px-3 rounded-lg bg-[var(--bg-elevated)]">
                      <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-[var(--text-secondary)] truncate">{f.name}</div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{f.focus}</div>
                      </div>
                      <span className="text-xs font-mono text-emerald-400 shrink-0">{f.tests} tests</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="text-xs text-[var(--text-tertiary)] pt-1 border-t border-[var(--border)]">
              Run: <code className="font-mono bg-[var(--bg-elevated)] px-1 rounded">pnpm test --filter @focus-forge/domain</code>
              {' '}&amp;{' '}
              <code className="font-mono bg-[var(--bg-elevated)] px-1 rounded">pnpm test --filter @focus-forge/web</code>
            </div>
          </div>
        </Section>

        {/* ── Acceptance Criteria ─────────────────────────────────────────────── */}
        <Section
          id="criteria"
          title="Acceptance Criteria"
          badge={`${autoCriteria + checkedCriteria}/${ACCEPTANCE_CRITERIA.length}`}
          badgeColor="var(--accent)"
        >
          <div className="space-y-0.5 pt-1">
            <SectionHeader count={autoCriteria + checkedCriteria} total={ACCEPTANCE_CRITERIA.length}>
              <span className="text-sm text-[var(--text-secondary)] font-normal">Check off as you verify manually</span>
            </SectionHeader>
            {ACCEPTANCE_CRITERIA.map(c => (
              <div key={c.id} className="flex items-center gap-2">
                {c.auto ? (
                  <div className="flex items-center gap-3 py-2 px-1 w-full">
                    <div className="w-5 h-5 rounded border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-[var(--text-secondary)] line-through">{c.label}</span>
                      <span className="ml-2 text-xs text-[var(--text-tertiary)]">{c.note}</span>
                    </div>
                    <StatusPill status="auto" />
                  </div>
                ) : (
                  <div className="w-full flex items-center gap-2">
                    <div className="flex-1">
                      <Checkbox
                        checked={!!state.criteria[c.id]}
                        onChange={() => dispatch({ type: 'TOGGLE_CRITERIA', id: c.id })}
                        label={c.label}
                      />
                    </div>
                    <StatusPill status={state.criteria[c.id] ? 'pass' : 'pending'} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* ── Manual Smoke Test ───────────────────────────────────────────────── */}
        <Section
          id="smoke"
          title="Manual Smoke Test"
          badge={`${checkedSmoke}/${SMOKE_STEPS.length} steps`}
          badgeColor="var(--warning)"
        >
          <div className="space-y-1 pt-1">
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Perform these steps in order with a real browser. Required before M4 is signed off.
            </p>
            {SMOKE_STEPS.map((step, i) => (
              <div key={step.id} className="flex items-start gap-3">
                <span className="mt-2.5 w-5 text-center text-xs text-[var(--text-tertiary)] shrink-0 font-mono">{i + 1}</span>
                <div className="flex-1">
                  <Checkbox
                    checked={!!state.smoke[step.id]}
                    onChange={() => dispatch({ type: 'TOGGLE_SMOKE', id: step.id })}
                    label={step.label}
                    detail={step.detail}
                  />
                </div>
              </div>
            ))}
            <div className="pt-3">
              <ProgressBar value={checkedSmoke} total={SMOKE_STEPS.length} color="var(--warning)" />
            </div>
          </div>
        </Section>

        {/* ── E2E Scenarios ───────────────────────────────────────────────────── */}
        <Section
          id="e2e"
          title="E2E Scenarios (Playwright)"
          badge={passedE2E > 0 ? `${passedE2E}/${E2E_SCENARIOS.length} pass` : 'Not yet run'}
          badgeColor="var(--info)"
        >
          <div className="space-y-1 pt-1">
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Click each row to cycle: <strong className="text-[var(--text-primary)]">Pending → Pass → Fail → Pending</strong>.
              Run <code className="font-mono bg-[var(--bg-elevated)] px-1 rounded">npx playwright test</code> once Playwright is installed.
            </p>
            {E2E_SCENARIOS.map((s, i) => {
              const status = state.e2e[s.id] ?? 'pending';
              return (
                <button
                  key={s.id}
                  onClick={() => dispatch({ type: 'CYCLE_E2E', id: s.id })}
                  className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors text-left"
                >
                  <span className="text-xs font-mono text-[var(--text-tertiary)] w-6 shrink-0">E{i + 1}</span>
                  <span className={`flex-1 text-sm ${status === 'fail' ? 'text-fuchsia-400' : status === 'pass' ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}`}>
                    {s.label}
                  </span>
                  <StatusPill status={status} />
                </button>
              );
            })}

            <div className="pt-3 space-y-1 text-xs text-[var(--text-tertiary)] border-t border-[var(--border)]">
              <div className="font-medium text-[var(--text-secondary)]">Setup (one-time):</div>
              <div><code className="font-mono bg-[var(--bg-elevated)] px-1 rounded">pnpm add -D @playwright/test --filter @focus-forge/web</code></div>
              <div><code className="font-mono bg-[var(--bg-elevated)] px-1 rounded">npx playwright install</code></div>
              <div className="pt-1 text-[var(--text-tertiary)]">Requires a seeded test user — see <code className="font-mono">files/m4-test-plan.md §5.3</code></div>
            </div>
          </div>
        </Section>

        {/* ── Known Gaps ──────────────────────────────────────────────────────── */}
        <Section id="gaps" title="Known Gaps" badge="Deferred" badgeColor="var(--text-tertiary)">
          <div className="space-y-2 pt-1">
            {KNOWN_GAPS.map((g, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[var(--bg-elevated)]">
                <span className="text-sm text-[var(--text-secondary)]">{g.label}</span>
                <span className="text-xs text-[var(--text-tertiary)] font-mono shrink-0 ml-3">{g.milestone}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[var(--text-tertiary)]">
            State saved to localStorage · Full plan: <code className="font-mono">files/m4-test-plan.md</code>
          </p>
          <button
            onClick={() => {
              if (confirm('Reset all manual checks?')) dispatch({ type: 'RESET' });
            }}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--soft-error)] transition-colors px-2 py-1 rounded"
          >
            Reset all
          </button>
        </div>

      </div>
    </div>
  );
}
