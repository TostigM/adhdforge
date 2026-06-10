# M4 Test Plan — Task Capture + Dashboard

**Milestone:** M4  
**Status:** Unit + integration tests written and passing. E2E pending Playwright setup.  
**Test runner:** Vitest (unit/integration) · Playwright (E2E, planned)  
**Last updated:** 2026-05-31

---

## 1. Scope

This plan covers everything shipped in M4:

| Area | Scope |
|---|---|
| Domain logic | `packages/domain/src/tasks/` and `packages/domain/src/badges/` |
| Server actions | `apps/web/server-actions/tasks/` |
| API route | `apps/web/app/api/sync/` |
| UI component | `packages/ui/src/components/TaskCard.tsx` |
| Dashboard page | `apps/web/app/dashboard/` |
| Sync hook | `apps/web/lib/sync/use-sync-stream.ts` |

**Out of scope for M4 tests:**  
M4.5 (daily plan / Today view), M5 (Walk Me Through It), voice capture (M7).

---

## 2. Test Infrastructure

### 2.1 Tooling

| Layer | Tool | Location |
|---|---|---|
| Unit tests | Vitest 4 | `packages/domain/vitest.config.ts` |
| Integration tests | Vitest 4 | `apps/web/vitest.config.ts` |
| E2E tests | Playwright | root `playwright.config.ts` (planned) |
| Accessibility | axe-core via Playwright | E2E suite (planned) |
| Coverage | @vitest/coverage-v8 | both packages |

### 2.2 Running tests

```bash
# All unit + integration tests
pnpm test --filter @focus-forge/domain
pnpm test --filter @focus-forge/web

# Or from the root (when turbo is wired up)
pnpm test

# Watch mode during development
pnpm test:watch --filter @focus-forge/domain

# Coverage report
pnpm test:coverage --filter @focus-forge/domain
```

### 2.3 Mock strategy

Domain functions accept `db: PrismaClient` as an explicit parameter (dependency injection).  
Tests pass a typed Vitest mock via `makeMockPrisma()` from:

```
packages/domain/src/__test-utils__/mock-prisma.ts
```

The mock:
- Stubs every model method with `vi.fn()`
- Implements `$transaction` as a pass-through that calls the callback with the same mock
- Provides fixture builders (`makeTask()`, `makeBadge()`, `makeEvent()`)

**No actual database is touched in unit or integration tests.**

---

## 3. Unit Tests — Domain Logic

All files in `packages/domain/src/**/__tests__/`.  
Run with `pnpm test --filter @focus-forge/domain`.

### 3.1 `create-task.test.ts` (16 tests)

**File:** `packages/domain/src/tasks/__tests__/create-task.test.ts`

| # | Test | Expected |
|---|---|---|
| 1 | Empty rawText | `err('raw_text_empty')` |
| 2 | Whitespace-only rawText | `err('raw_text_empty')` |
| 3 | rawText > 10,000 chars | `err('raw_text_too_long')` |
| 4 | rawText at exactly 10,000 chars | `ok(task)` |
| 5 | `cant_miss` + `flexible` kind | `err('cant_miss_requires_anchor')` |
| 6 | `cant_miss` + `anchor` kind | `ok(task)` |
| 7 | Returns created task on success | `result.value.id === task.id` |
| 8 | Trims whitespace from rawText | `task.create` called with trimmed text |
| 9 | Status always starts as `'active'` | `data.status === 'active'` |
| 10 | Defaults priorityKind to `'flexible'` | `data.priorityKind === 'flexible'` |
| 11 | Defaults priorityLevel to `'med'` | `data.priorityLevel === 'med'` |
| 12 | Defaults captureMethod to `'text'` | `data.captureMethod === 'text'` |
| 13 | Logs `task.created` event | `event.create` called with `eventType: 'task.created'` |
| 14 | Status never `'failed'` | `data.status !== 'failed'` |
| 15 | Status never `'overdue'` | `data.status !== 'overdue'` |
| 16 | DB error → `err('db_error')`, never throws | Result returned, not thrown |

### 3.2 `complete-task.test.ts` (11 tests)

**File:** `packages/domain/src/tasks/__tests__/complete-task.test.ts`

| # | Test | Expected |
|---|---|---|
| 1 | Task not found | `err('task_not_found')` |
| 2 | User ID mismatch | `err('forbidden')` |
| 3 | Already completed | `err('task_already_completed')` |
| 4 | Sets status to `'completed'` | `data.status === 'completed'` |
| 5 | Sets `completedAt` to a Date | `data.completedAt instanceof Date` |
| 6 | Logs `task.completed` event | `event.create` called |
| 7 | Returns updated task on success | `result.value.status === 'completed'` |
| 8 | Never sets status to `'failed'` | Soft-Track Protocol |
| 9 | DB error → `err('db_error')` | Graceful error |
| 10 | Badge engine failure doesn't propagate | Never throws |
| 11 | Badge check called after completion | `checkAndAward` invoked |

### 3.3 `defer-task.test.ts` (11 tests)

**File:** `packages/domain/src/tasks/__tests__/defer-task.test.ts`

| # | Test | Expected |
|---|---|---|
| 1 | Task not found | `err('task_not_found')` |
| 2 | User ID mismatch | `err('forbidden')` |
| 3 | Already completed | `err('task_already_completed')` |
| 4 | Sets status to `'deferred'` | `data.status === 'deferred'` |
| 5 | Increments deferredCount | `data.deferredCount = { increment: 1 }` |
| 6 | Stores deferUntil when provided | `data.deferredUntil = <Date>` |
| 7 | Stores null deferredUntil when omitted | `data.deferredUntil = null` |
| 8 | Logs `task.deferred` event | `event.create` called |
| 9 | Returns updated task on success | `result.value.status === 'deferred'` |
| 10 | Uses `{ increment: 1 }`, not read-then-write | Race-condition-safe update pattern |
| 11 | DB error → `err('db_error')` | Graceful error |

> **Note on test 10:** `deferredCount` uses Prisma's atomic `{ increment: 1 }` rather than
> reading the current count and writing `count + 1`. This is intentional — it prevents
> a race condition if two requests defer the same task simultaneously.

### 3.4 `check-and-award.test.ts` (10 tests)

**File:** `packages/domain/src/badges/__tests__/check-and-award.test.ts`

| # | Test | Expected |
|---|---|---|
| 1 | No matching badge definitions | Returns `[]`, no `create` called |
| 2 | First event → non-repeatable badge awarded | `['first_capture']` returned |
| 3 | Badge already earned → NOT re-awarded | `[]` returned, idempotent |
| 4 | Repeatable badge: awarded even if earned before | Badge created again |
| 5 | Repeatable badge: `findFirst` not called | No unnecessary DB read |
| 6 | Count below threshold | Returns `[]` |
| 7 | Count exactly at threshold | Badge awarded |
| 8 | Count above threshold | Badge awarded |
| 9 | Multiple badges for same event | All evaluated independently |
| 10 | Inactive badge (filtered by query) | Returns `[]` |

---

## 4. Integration Tests — API Routes

### 4.1 `GET /api/sync` (8 tests)

**File:** `apps/web/app/api/sync/__tests__/route.test.ts`

| # | Test | Expected |
|---|---|---|
| 1 | No session → 401 | `{ error: 'unauthenticated' }` |
| 2 | `since` = invalid string → 400 | `{ error: 'invalid_since' }` |
| 3 | `since` = epoch 0 (valid) → 200 | Succeeds, returns all events |
| 4 | Response includes `events` array | Array of event objects |
| 5 | Response includes `serverTime` ISO string | Valid `new Date(serverTime)` |
| 6 | Empty events when nothing new | `events: []` |
| 7 | Query filters by `userId` from session | DB called with correct userId |
| 8 | Query filters by `occurredAt > since` | DB called with `{ gt: <Date> }` |

### 4.2 `createTaskAction` server action (5 tests)

**File:** `apps/web/server-actions/tasks/__tests__/create-task.test.ts`

| # | Test | Expected |
|---|---|---|
| 1 | No session → unauthenticated error | `{ ok: false, error: 'unauthenticated' }` |
| 2 | Session → domain called with correct userId | `createTask` receives `userId` from session |
| 3 | Success → returns `{ ok: true, taskId }` | `result.taskId` defined |
| 4 | Domain validation error propagated | `error` and `message` passed through |
| 5 | `captureMethod` always set to `'text'` | Cannot be overridden by client input |

---

## 5. E2E Tests — Playwright (Planned)

> **Status:** Test files written, Playwright not yet installed.  
> Run `pnpm add -D @playwright/test --filter @focus-forge/web && npx playwright install` to set up.

**File:** `apps/web/e2e/m4-task-capture.spec.ts` _(to be created)_

### 5.1 Scenarios

| # | Scenario | Steps | Expected |
|---|---|---|---|
| E1 | **Empty dashboard** | Sign in as new user | Empty state renders: "Nothing on your plate right now. That's allowed." — no error, no crash |
| E2 | **First task capture** | Sign in → type "Buy oranges" → Enter | TaskCard appears with text "Buy oranges", priority pill "Silver" (default med) |
| E3 | **First Capture Badge** | After E2 | Toast notification with badge name appears within 2 seconds |
| E4 | **Complete a task** | E2 → click "Done. Next step." | Task disappears from list; success toast shows |
| E5 | **First Complete Badge** | After E4 (first completion ever) | Badge toast fires |
| E6 | **Defer a task** | Capture task → click "Push to later" | Task disappears; info toast shows "Moved it out of the way. You're good." |
| E7 | **No shame language** | E6 → inspect all visible text | No "failed", "overdue", "missed", "streak broken" anywhere |
| E8 | **Cross-device sync** | Open two tabs → capture task in tab 1 | Tab 2 reflects the new task within 7 seconds |
| E9 | **Sync pauses when hidden** | Open two tabs → hide tab 2 → capture in tab 1 → show tab 2 | Tab 2 refreshes immediately on becoming visible |
| E10 | **Auth guard** | Navigate to `/dashboard` while logged out | Redirected to `/signin?callbackUrl=%2Fdashboard` |
| E11 | **No red anywhere** | Full page scan of dashboard | `axe-core` + visual: no `text-red-*`, `bg-red-*`, `border-red-*` anywhere |
| E12 | **Accessibility (axe)** | Render dashboard with tasks | Zero axe-core violations |

### 5.2 Playwright setup (one-time)

```bash
# Install
pnpm add -D @playwright/test --filter @focus-forge/web
npx playwright install

# Run
npx playwright test
```

**Required environment for E2E:**  
A test user must exist in the database, or a fixture should seed one. The E2E suite needs `NEXTAUTH_URL`, `DATABASE_URL`, and the test user credentials in `.env.test`.

### 5.3 Test user strategy

Two options — pick one before implementing E2E:

**Option A — Seeded test user (recommended for CI):**  
Create `packages/database/prisma/seed.test.ts` that inserts a test user with a known password hash. E2E logs in with Credentials provider.

**Option B — Magic link bypass:**  
For each test run, call the API to create a session directly (bypassing email delivery) using a test-only route that only exists when `NODE_ENV === 'test'`.

---

## 6. Acceptance Criteria Checklist

These map directly to `06-build-roadmap.md §4` acceptance criteria.

| Criterion | Verified by |
|---|---|
| ✅ TypeScript: `status` cannot be `'failed'` | Type system — `TaskStatus` enum |
| ✅ TypeScript: priority cannot be `'urgent'` or `'red'` | Type system — `TaskPriorityLevel` enum |
| ✅ `createTask` validates all inputs | Unit test 3.1 |
| ✅ Badge engine is idempotent | Unit test 3.4 #3 |
| ✅ `deferredCount` uses atomic increment | Unit test 3.3 #10 |
| ✅ `/api/sync` requires auth | Integration test 4.1 #1 |
| ✅ `/api/sync` filters by user + since | Integration test 4.1 #7–8 |
| ✅ Server action propagates domain errors | Integration test 4.2 #4 |
| ⏳ User can capture a task via text input | E2E test E2 |
| ⏳ Task appears immediately | E2E test E2 |
| ⏳ First Capture Badge fires once only | E2E test E3 + unit test 3.4 #3 |
| ⏳ Complete → "Done. Next step." | E2E test E4 |
| ⏳ Defer → no shame language | E2E test E6–E7 |
| ⏳ Two tabs sync within 7s | E2E test E8 |
| ⏳ Empty state correct | E2E test E1 |
| ⏳ axe-core 0 violations | E2E test E12 |
| ⏳ Dashboard query < 100ms @ 1000 tasks | Load test (deferred to pre-launch hardening) |

---

## 7. Manual Smoke Test (Human — Required at Pause Point)

These steps must be performed manually before M4 is signed off.

1. **Sign in** — navigate to `http://localhost:3001`, sign in with your account.
2. **Empty state** — dashboard shows the empty state message, no crash.
3. **Capture** — type "Buy oranges" into the input and press Enter.
4. **Badge toast** — "First Capture" badge toast appears.
5. **Task visible** — TaskCard appears with a Silver priority pill.
6. **Complete** — click "Done. Next step." → TaskCard disappears, success toast shows.
7. **Defer** — add a new task → click "Push to later" → task disappears, info toast appears. Verify text contains no shame language ("missed", "failed", "you didn't").
8. **Second tab sync** — open `/dashboard` in a second tab → add a task in tab 1 → verify it appears in tab 2 within 7 seconds.
9. **No red check** — right-click → Inspect → search computed styles for any `rgb(239,` (red family) values on visible elements.
10. **Sign out + re-enter** — sign out, sign back in → tasks are still there (not in-memory-only).

---

## 8. Known Gaps (Deferred to Later Milestones)

| Gap | Deferred to |
|---|---|
| E2E Playwright tests (full suite) | Before M4 pause-point sign-off |
| Load test: dashboard < 100ms with 1,000 tasks | M15 (production hardening) |
| ESLint rule: `*-red-*` class names | M15 |
| `list-active-tasks` unit tests (ordering, pagination) | M4.5 (uses same query) |
| `get-user-badges` unit tests | M10 (trophy case UI) |
| Server action tests: `complete-task`, `defer-task`, `update-task-priority` | Before M5 |
| `useSyncStream` hook tests | Before M4.5 |
