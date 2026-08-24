# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@files/AGENTS.md
@files/07-claude-code-instructions.md

## Workspace-Wide Standards

The workspace root (`C:\Users\tosti\projects\`) holds two standards documents that apply to ALL projects in this workspace. Read them as part of session start:

@../PROGRAMMING-PRACTICES.md
@../STYLE-GUIDE.md

**Precedence:** this repo's own docs (AGENTS.md, 07-claude-code-instructions.md, the spec set in `files/`) override the workspace documents wherever they conflict — e.g. Focus Forge's Inviolable Rules, `Result<T,E>` pattern, and language rules always win.

---

## Custom Slash Commands

These are available in Claude Code as `/typecheck`, `/test-domain`, etc.:

| Command | Description |
|---|---|
| `/typecheck` | Run tsc --noEmit on web + domain packages |
| `/test-domain` | Run domain package Vitest suite |
| `/db-push` | Push Prisma schema to DB (safe for Bluehost) |
| `/db-generate` | Regenerate Prisma client after schema change |
| `/milestone-status` | Quick orientation: what's done, what's next |
| `/new-server-action` | Scaffold a server action from the standard template |
| `/reset-test-data` | Reset dashboard to a clean, known testing state for today |

---

## Hooks

**`PreToolUse` guard** (both Bash + PowerShell): Blocks any command matching `prisma migrate dev` and reminds to use `prisma db push` instead.

---

## Commands

All commands use **pnpm**. On Windows PowerShell, invoke pnpm as `& "$env:APPDATA\npm\pnpm.ps1"` if it's not in PATH.

### Development

```bash
pnpm dev                        # Start Next.js dev server on http://localhost:3000
pnpm build                      # Production build (all packages via Turborepo)
pnpm lint                       # ESLint across all packages
pnpm typecheck                  # tsc --noEmit across all packages
pnpm format                     # Prettier write (ts, tsx, md, json)
```

### Testing

Tests must be run **per-package** — Turborepo test task works but running directly is faster:

```bash
# Run all tests in a package
cd apps/web && pnpm test
cd packages/domain && pnpm test

# Watch mode
cd apps/web && pnpm test:watch

# Single test file
cd apps/web && pnpm exec vitest run server-actions/tasks/__tests__/complete-task.test.ts
cd packages/domain && pnpm exec vitest run src/__tests__/some-file.test.ts

# Coverage
cd apps/web && pnpm test:coverage

# E2E (Playwright) — dev server must already be running on :3000
cd apps/web && pnpm test:e2e          # headless
cd apps/web && pnpm test:e2e:headed   # watch it run
cd apps/web && pnpm test:e2e:ui       # interactive UI mode
```

Hook tests that use browser APIs require `// @vitest-environment jsdom` at the top of the file.

**E2E auth:** tests bypass login by seeding a DB session in `e2e/global-setup.ts` (writes `e2e/.auth/state.json` with the `next-auth.session-token` cookie). They run serially against a dedicated `e2e@focusforge.test` user on the live DB, cleaned up in teardown. The dev server must be running first — the config has no `webServer` block. See AGENTS.md §5.14.12.

### Database

```bash
# Sync schema to DB — ALWAYS use this, never migrate dev (Bluehost has no shadow DB)
pnpm db:push                    # = prisma db push (the blessed command)

# Regenerate Prisma client after schema changes
pnpm db:generate

# Open Prisma Studio (DB browser)
pnpm db:studio
```

### Service connection tests

```bash
pnpm test:db       # Validate MySQL connection
pnpm test:openai   # Validate OpenAI API key
pnpm test:r2       # Validate Cloudflare R2 connection
pnpm test:resend   # Validate Resend email
```

### Test data reset (daily testing)

`morning-reset.js` loads `.env.local` itself — no PowerShell env setup needed. Dates are computed dynamically so it never goes stale.

```bash
pnpm reset:test        # Clean state for today: wipe today's plan + active tasks,
                       #   seed 3 anchors (9:30/13:00/16:00) + 6 flex (Gold/Silver/Bronze).
                       #   Keeps completed tasks (history). Then reload the dashboard.
pnpm reset:test:hard   # Full nuke — also deletes completed tasks, all plans, events.
```

Also available as the `/reset-test-data` slash command.

### Other one-off scripts (require DATABASE_URL to be set)

```bash
# Set DATABASE_URL from .env.local first (PowerShell):
$env:DATABASE_URL = (Get-Content apps\web\.env.local | Select-String '^DATABASE_URL' | ForEach-Object { ($_ -replace '^DATABASE_URL=', '') -replace '^"', '' -replace '"$', '' })

node scripts/reset-today-plan.js       # Wipe today's plan items only (lighter than reset:test)
node scripts/create-tomorrow-anchors.js # Seed anchor tasks for tomorrow
```

---

## Monorepo Structure

```
adhdforge/
├── apps/
│   └── web/                    # Next.js 15 App Router app (the product)
├── packages/
│   ├── database/               # Prisma schema + singleton db client
│   │   └── prisma/schema.prisma  ← canonical schema (spec: files/04-mysql-schema.md)
│   ├── domain/                 # Pure business logic, no HTTP/React dependencies
│   │                           #   incl. daily-plan, tasks, timer, quota, doorknob, launchpad
│   ├── ui/                     # Design system components (packages/ui/src/index.ts)
│   ├── ai/                     # OpenAI (M7): transcribeAudio (Whisper), parseTasks (GPT-4o-mini)
│   └── config/                 # Shared tsconfig presets
├── files/                      # Spec documents (AGENTS.md, roadmap, schema spec, etc.)
└── scripts/                    # One-off dev/seed scripts
```

**Package dependency flow:** `apps/web` → `packages/domain` → `packages/database`  
`packages/ui` has no dependencies on the others (pure React + Tailwind).  
`packages/domain` functions accept `db: PrismaClient` as first argument — they never import the singleton directly.

---

## App Router Structure (`apps/web/app/`)

```
app/
├── layout.tsx                  # Root layout — ThemeProvider, ToastProvider
├── page.tsx                    # / redirect → /dashboard or /signin
├── (auth)/                     # Public auth routes (no nav chrome)
│   ├── signin/page.tsx
│   └── reset-password/[token]/page.tsx
├── dashboard/                  # THE CORE LOOP — home screen (M4.5)
│   ├── page.tsx                # Server component: getOrCreateTodayPlan → getTodayView → TodayClient
│   └── _components/
│       ├── TodayClient.tsx     # Full Today home screen (client)
│       ├── TodayCard.tsx       # Single task card (anchor or flex)
│       └── MorningRitual.tsx   # Once-daily ritual flow
├── account/                    # User account management + Today settings
├── tasks/[taskId]/             # Task detail / steps editor (M5)
│   ├── page.tsx                # Loads task + steps → StepsEditor
│   └── _components/StepsEditor.tsx   # Add/reorder(up-down)/delete manual steps
├── walk/[taskId]/              # Walk Me Through It — full-screen single-step (M5)
│   ├── page.tsx                # Resumes at first incomplete step
│   └── _components/WalkThrough.tsx   # One step, "Done. Next step.", ESC=pause
├── timer/                      # Analog focus timer (M6)
│   ├── page.tsx                # Reads sound/haptics prefs → TimerClient
│   └── _components/TimerClient.tsx   # Wedge, Web-Audio sound, pause/resume, PiP
├── doorknob/                   # Reverse Scheduler / Doorknob (M8)
│   ├── page.tsx                # getActiveDoorknob → DoorknobSetup or DoorknobClient
│   └── _components/            # DoorknobSetup (3 questions) + DoorknobClient (live timeline)
├── launchpad/                  # Items by the door, daily reset (M9)
│   ├── page.tsx                # Lazy reset + reminder healing → LaunchpadClient
│   └── _components/LaunchpadClient.tsx  # Checklist (useOptimistic), reorder, schedule select
├── praise/                     # Praise Repository (M10)
│   ├── page.tsx                # Inbox (quota-gated playback, Pro transcript gate)
│   └── [token]/                # PUBLIC sender page — no account, token = credential
├── admin/                      # Admin console (gated by feature_grants)
│   └── users/[id]/
└── api/
    ├── auth/[...nextauth]/     # NextAuth route handler
    ├── sync/route.ts           # 5-second polling endpoint (returns events since ?since=)
    ├── timer/complete/route.ts # Pop-out timer POSTs here on completion (M6)
    ├── voice-dump/route.ts     # M7: audio → Whisper → GPT parse → tasks (quota-gated)
    └── cron/hourly/route.ts    # M8: hourly dispatcher (CRON_SECRET-gated); sweeps due scheduled_alerts
```

**Voice Dump (M7):** `OPENAI_API_KEY` must be in `apps/web/.env.local` (set in Vercel for prod ✅). The `/api/voice-dump` route checks the daily quota (`checkQuota`, fail-open) *before* any paid OpenAI call; audio is never persisted (Rule 9). Quota helpers live in `@focus-forge/domain/quota/*`.

**Doorknob (M8):** A session is persisted as its `scheduled_alerts` rows (no `doorknob_sessions` table) — see AGENTS.md §5.18. Domain in `@focus-forge/domain/doorknob/*`; zone notifications are client-side; the hourly cron (`/api/cron/hourly`) is the bookkeeping backstop and needs `CRON_SECRET` in env. An active session also surfaces as a calm summary card on the Today dashboard.

**Launchpad (M9):** By-the-door checklist, `launchpad_items` table. Daily items reset **lazily on read** at the 04:00 Pacific boundary (`@focus-forge/domain/launchpad/*`; boundary math shares `zonedTimeUtc` from `plan-day.ts`), with the daily cron as the all-users backstop — never add a per-user reset cron. Doorknob setup prefils from unchecked items; completing a Doorknob resets `on_departure` items. The nightly reminder is opt-in (`launchpadReminderEnabled`, default off) — see AGENTS.md §5.19.

**Praise Repository (M10):** Trusted contacts record memos via account-less `/praise/[token]` links (middleware protects `/praise` EXACT-match only — the token page is deliberately public). Audio lives in a private R2 bucket, server-mediated uploads, signed URLs only (`apps/web/lib/r2.ts`; R2_* env vars REQUIRED at boot). Memos hidden on report are derived BY QUERY from open `content_reports` — never add a hidden flag. Sender IPs purge after 7 days via cron (owner decision D4). AWS SDK packages must stay on ONE exact version. See AGENTS.md §5.20.

All non-trivial logic lives in `server-actions/` or `packages/domain/` — pages are thin.

---

## Key Patterns

### Server Actions

Every server action follows this structure (Session 13: auth goes through
`requireUser`, which also enforces account state — paused = read-only,
suspended = blocked):

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@focus-forge/database/client';
import { requireUser } from '@/lib/require-user';

export async function myAction(input: string): Promise<{ ok: true } | { ok: false; error: string; message?: string }> {
  // 'create_data' for actions that create content, 'mutate_data' for the rest
  const auth = await requireUser('mutate_data');
  if (!auth.ok) return { ok: false, error: auth.error, message: auth.message };

  const result = await domainFunction(db, { ...input, userId: auth.userId });
  if (!result.ok) return { ok: false, error: result.error, message: result.message };

  revalidatePath('/dashboard');
  return { ok: true };
}
```

`revalidatePath` is only called on success. Pages use `requirePageUser()` from
the same module (redirects to /signin or the account-state landing page).
Never call `getServerSession` directly in a new action — the guard is the
single place account-state rules are enforced.

### Domain Functions

```typescript
// packages/domain/src/*/my-function.ts
import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

export type MyError = 'not_found' | 'forbidden' | 'db_error';

export async function myFunction(
  db: PrismaClient,           // always first arg — never imported
  input: { taskId: string; userId: string },
): Promise<Result<ReturnType, MyError>> {
  try {
    // ...
    return ok(value);
  } catch (e) {
    return err('db_error', 'Failed.');
  }
}
```

Result shape: `{ ok: true, value: T } | { ok: false, error: E, message?: string }`

### Testing Server Actions

Mock pattern — all server action tests in `apps/web`:

```typescript
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@focus-forge/database/client', () => ({ db: {} }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@focus-forge/domain/tasks/complete-task', () => ({ completeTask: vi.fn() }));

beforeEach(() => { vi.clearAllMocks(); }); // always — prevents call-count leaking
```

### Adding a New Domain Export

After adding a file to `packages/domain/src/`:
1. Add an entry to `packages/domain/package.json` `"exports"` field
2. Import in server actions as `@focus-forge/domain/<path>`

### CSS Variables

All styling uses CSS variables defined in `packages/ui/styles/globals.css`. Use these tokens, never hardcoded colors:

```
--bg-page, --bg-surface, --bg-elevated
--text-primary, --text-secondary, --text-tertiary
--border, --accent, --soft-error
```

Red is **physically removed** from the Tailwind config — `text-red-*` / `bg-red-*` will cause a build error.

---

## The Daily Plan System

The core of the product. Understand this before touching any daily-plan code.

**Data model:**
- `DailyPlan` — one row per user per UTC-midnight day
- `DailyPlanItem` — tasks attached to a plan; `slotState`: `today | queue | done`

**Two task kinds:**
- `anchor` — time-bound (meetings, appointments). Added to plan only by `seedAnchors()`. Never pulled by bubble-up. Shown in compact schedule strip at bottom of dashboard.
- `flexible` — flows through the queue. Bubble-up fills `visibleSlots` (default 3) with these.

**Key invariants:**
- Bubble-up pulls `priorityKind: 'flexible'` only (anchors never bubble up)
- **Bubble-up ranking = `[todaySwapCount asc, priorityLevel asc, updatedAt asc]`.** ONE unified candidate pool (the true backlog), NOT a queue-first/backlog-second split. Swap-count is the PRIMARY key on purpose: pushing a task back increments its `todaySwapCount`, so it sinks to the bottom of the queue and a *different* task surfaces — this is what prevents the 2-item ping-pong. Don't reorder these keys; priority-first reintroduces the boomerang bug. `getTodayView`'s backlog query uses the same `orderBy` so the drawer order matches what surfaces next.
- Slot counting (`visibleSlots`) ignores anchor items in `slotState: 'today'`
- Active anchors (within 30 min of `scheduledFor`) promote to a full card at top, borrowing one flex slot — total cards stays at `visibleSlots`
- `planDate` rolls over at **midnight Pacific** (`America/Los_Angeles`), stored as UTC midnight of the Pacific calendar date. ALWAYS use `getPlanDate()` / `getPlanDayWindow()` from `@focus-forge/domain/daily-plan/plan-day` — never `setUTCHours(0,0,0,0)`. Per-user timezone preference planned for M15.3.
- **Queue display = the true backlog.** `getTodayView`'s `queueCount`/`queueItems` are computed from the `tasks` table — *every* active flexible task not currently a visible "today" card — NOT just swap-created `slotState: 'queue'` plan items. This is why a captured/voice-dumped task never vanishes when all slots are full: it always shows in "N more in the queue" + the drawer, and bubble-up surfaces it when a slot frees.

**Entry point:** `apps/web/app/dashboard/page.tsx` → `getOrCreateTodayPlan` → `getTodayView` → `TodayClient`

---

## Environment Variables

All env vars live in `apps/web/.env.local`. Required for local dev:

```
DATABASE_URL=mysql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000      # must match dev server port exactly
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

Vercel reads these from its dashboard environment variables (not `.env.local`).
