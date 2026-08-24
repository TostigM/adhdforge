# Focus Forge — Code Map

**Status:** Living document — current through M10 (Praise Repository, Session 15).
**Purpose:** Maps every function in the codebase: which file defines it, what it does, and which pages/components consume it. Update when milestones add or retire code.

Reading guide:
- **Domain** functions are pure business logic (`packages/domain`). They take `db: PrismaClient` as the first argument and return `Result<T, E>`.
- **Server actions** (`apps/web/server-actions`) wrap domain functions with auth + `revalidatePath`. Client components call these.
- **API routes** (`apps/web/app/api`) serve callers that can't use server actions (polling, cron, the PiP pop-out, multipart uploads).
- ⚠️ marks code that nothing in the app currently uses (details in §7).

---

## 1. Domain package (`packages/domain/src/`)

### 1.1 Core

| File | Exports | Used by |
|---|---|---|
| `result.ts` | `Result<T,E>`, `ok()`, `err()` | Every domain function |
| `index.ts` | Barrel re-exports | — |

### 1.2 Daily plan (`daily-plan/`) — the core loop

| File | Function | What it does | Consumed by |
|---|---|---|---|
| `plan-day.ts` | `getPlanDate()` | The plan-date label (UTC midnight of the Pacific calendar day) | `dashboard/page.tsx`, `update-preferences` action |
| | `getPlanDayWindow()` | Real start/end instants of a Pacific day (DST-safe) | `seedAnchors` (internal) |
| | `zonedTimeUtc()`, `calendarDateInZone()` | THE shared DST-safe wall-clock→UTC math (M9) | launchpad `reset-boundary` + `nightly-reminder` |
| `get-or-create-today-plan.ts` | `getOrCreateTodayPlan()` | Find/create today's plan; seed anchors; run bubble-up | `dashboard/page.tsx` |
| `get-today-view.ts` | `getTodayView()` + types (`TodayViewResult`, `TodayItem`, `ScheduledAnchor`, `QueueItem`, `DOORKNOB_MINUTES`) | Full Today screen data in one call | `dashboard/page.tsx`; types used by `TodayClient`, `TodayCard`, `MorningRitual` |
| `_bubble-up.ts` | `bubbleUp()` (internal) | Refills flex slots from the unified backlog pool | `complete-today-item`, `swap-today-item`, `get-or-create-today-plan`, `add-to-today-plan` (domain-internal only) |
| `complete-today-item.ts` | `completeTodayItem()` | Mark item done, complete task, log event, badges, bubble-up | `complete-plan-item` action → **TodayClient** |
| `swap-today-item.ts` | `swapTodayItem()` | Push flex item back to queue, increment swap count, reframe check | `swap-plan-item` action → **TodayClient** |
| `add-to-today-plan.ts` | `addToTodayPlan()` | Add a task to today's plan or queue | `add-to-plan` action → **TodayClient** |
| `reframe-today-item.ts` | `reframeTodayItem()` | Gentle Reframe: `snooze` (24 h) or `lower` (priority → low) | `reframe-plan-item` action → **TodayClient** |
| `update-ritual-state.ts` | `updateRitualState()` | Morning ritual → completed/skipped | `update-ritual` action → **TodayClient** / MorningRitual |

### 1.3 Tasks (`tasks/`)

| File | Function | What it does | Consumed by |
|---|---|---|---|
| `create-task.ts` | `createTask()` | Validated task creation (text, priority, estimate, date) + event + badge | `create-task` action → **TodayClient**; `/api/voice-dump` |
| `complete-task.ts` | `completeTask()` | Task → completed + event + badge | ⚠️ Scaffold — kept for future task-detail UI (its M4 action was removed Session 13) |
| `defer-task.ts` | `deferTask()` | Task → deferred (never "failed") | ⚠️ Scaffold — same as above |
| `add-step.ts` | `addStep()` | Append step (`stepOrder = max+1`) | `add-step` action → **StepsEditor**; `/api/voice-dump` |
| `complete-step.ts` | `completeStep()` | Step done; auto-completes task on last step; badges | `complete-step` action → **WalkThrough** |
| `reorder-steps.ts` | `reorderSteps()` | Two-phase transactional reorder | `reorder-steps` action → **StepsEditor** |
| `delete-step.ts` | `deleteStep()` | Ownership-checked delete | `delete-step` action → **StepsEditor** |

### 1.4 Timer (`timer/`)

| File | Function | What it does | Consumed by |
|---|---|---|---|
| `focus-session.ts` | `startFocusSession()`, `pauseFocusSession()`, `resumeFocusSession()`, `endFocusSession()` | FocusSession state machine + badges; idempotent end | `timer/focus-session` actions → **TimerClient**; `endFocusSession` also via `/api/timer/complete` (PiP) |
| `wedge.ts` | `computeWedge()` | Elapsed → fraction remaining + zone + sweep degrees (pure) | **TimerClient**, `AnalogTimer` (via props) |
| `sound-families.ts` | `SOUND_FAMILIES`, `selectNextVariation()` | Synthesis specs; anti-habituation variation cycling | **TimerClient** → `lib/audio/sound-engine` |
| `vibration-patterns.ts` | `resolveVibration()` | Pattern or null (haptics off / reduced motion) | **TimerClient** |
| `speed-run-hook.ts` | `checkSpeedRunEligibility()` | Fires `speed-run:eligible` event (opt-in, hooks-only) | `complete-plan-item` action |

### 1.5 Doorknob (`doorknob/`)

| File | Function | What it does | Consumed by |
|---|---|---|---|
| `zones.ts` | `buildZones()`, `currentPosition()`, `shiftZones()` | Pure zone math (wrap_up ← gather ← door ← transit) | Domain-internal; types flow to `DoorknobTimeline` via props |
| `calculate-schedule.ts` | `calculateSchedule()` | Backward-calculated departure schedule (pure) | `create-doorknob-session`, `_session` |
| `_session.ts` | `parseAlertPayload()`, `scheduleFromParams()` (internal) | Session rebuild from `scheduled_alerts` payload rows | Domain-internal |
| `create-doorknob-session.ts` | `createDoorknobSession()` | Create session as alert rows; cancels previous session | `create-session` action → **DoorknobSetup** |
| `get-active-doorknob.ts` | `getActiveDoorknob()` | Rebuild the active session, or null | `dashboard/page.tsx` (summary card), `doorknob/page.tsx` |
| `recalculate-late.ts` | `recalculateLate()` | "+15" — shifts pending alerts only | `recalculate-late` action → **DoorknobClient** |
| `complete-doorknob.ts` | `completeDoorknob()` | Out the door → badge | `complete-session` action → **DoorknobClient** |
| `cancel-doorknob.ts` | `cancelDoorknob()` | Neutral cancel | `cancel-session` action → **DoorknobClient** |

### 1.6 Quota (`quota/`)

| File | Function | What it does | Consumed by |
|---|---|---|---|
| `quota-window.ts` | `getQuotaWindow()` | 04:00 UTC quota day + next reset instant | `check-quota`, `increment-quota` |
| `limits.ts` | `getQuotaLimit()`, `FREE_TIER_LIMITS` | Free-tier caps; comp/paid → unlimited | `check-quota` |
| `check-quota.ts` | `checkQuota()` | Gate before paid AI calls; **fails open** | `/api/voice-dump` |
| `increment-quota.ts` | `incrementQuota()` | Atomic raw `INSERT … ON DUPLICATE KEY UPDATE`; best-effort | `/api/voice-dump` |

### 1.7 Badges (`badges/`)

| File | Function | What it does | Consumed by |
|---|---|---|---|
| `check-and-award.ts` | `checkAndAward()` | Event-driven badge engine (idempotent) | Domain-internal: create-task, complete-task, complete-step, complete-today-item, focus-session, complete-doorknob |
| `get-user-badges.ts` | `getUserBadges()` | Badge list for trophy case | ⚠️ Unused until M10 trophy-case UI |

### 1.8 Users (`users/`)

| File | Function | What it does | Consumed by |
|---|---|---|---|
| `update-preferences.ts` | `parsePreferences()` | Read prefs JSON with clamping + defaults — **the only legal way to read prefs** | `dashboard/page.tsx`, `account/page.tsx`, `timer/page.tsx`, `complete-plan-item`/`swap-plan-item`/`hooks` actions |
| | `updateUserPreferences()` | Validated sparse-JSON preference write | `update-preferences` action → **TodaySettingsClient**, **TimerSettingsClient** |
| `account-state.ts` | `canUserDo()`, `getRedirectForState()`, `getStateBanner()`, `isPauseExpired()` | Account-state capability rules | `lib/require-user.ts` (every action + page), cron `restoreExpiredPauses` (wired Session 13; `getStateBanner` still awaits a banner UI) |
| `display-name.ts` | `getUserAddressName()`, `getUserAddressNameWithOAuth()` | Friendly address name | ⚠️ Unused in app |

### 1.9 Launchpad (`launchpad/`) — M9

| File | Function | What it does | Consumed by |
|---|---|---|---|
| `reset-boundary.ts` | `lastResetBoundary()` | Most recent 04:00 workday-time instant (pure, DST-safe) | `reset-launchpad` |
| `reset-launchpad.ts` | `resetDailyItems()` | Lazy/cron uncheck of stale `daily` items (idempotent) | `list-items`, cron `runLaunchpadResets` |
| | `resetOnDepartureItems()` | Uncheck `on_departure` items | `complete-session` doorknob action |
| `list-items.ts` | `getLaunchpadItems()` | Lazy reset, then ordered read | `/launchpad` page, `dashboard/page.tsx` (widget), `doorknob/page.tsx` (prefill) |
| `add-item.ts` | `addLaunchpadItem()` | Label 1–120, order max+1 | `add-item` action → **LaunchpadClient** |
| `check-item.ts` | `checkLaunchpadItem()` | Check (stamps lastCheckedAt + event, transactional) / uncheck | `check-item` action → **LaunchpadClient** |
| `update-item.ts` | `updateLaunchpadItem()` | Label / reset-schedule change | `update-item` action → **LaunchpadClient** |
| `reorder-items.ts` | `reorderLaunchpadItems()` | Full ordered-id list, validated set | `reorder-items` action → **LaunchpadClient** |
| `delete-item.ts` | `deleteLaunchpadItem()` | Ownership-checked delete | `delete-item` action → **LaunchpadClient** |
| `nightly-reminder.ts` | `ensureNightlyReminder()`, `nextReminderInstant()` | Converges pending `launchpad_nightly` alert rows to one (self-healing) | `/launchpad` page (lazy), `set-nightly-reminder` action |

### 1.10 Praise (`praise/`) — M10

| File | Function | What it does | Consumed by |
|---|---|---|---|
| `invite-token.ts` | `generateInviteToken()`, `hashInviteToken()` | 256-bit tokens, SHA-256 at rest (pure) | create/verify invite |
| `create-invite.ts` | `createPraiseInvite()` | 5-contact free cap; raw token returned once | `create-invite` action → **PraiseSendersClient** |
| `verify-invite.ts` | `verifyPraiseInvite()` | One calm message for every failure mode | `/praise/[token]` page, upload route, submit-memo |
| `revoke-invite.ts` | `revokePraiseContact()` | Deletes memos in-tx; returns R2 keys | `revoke-contact` action |
| `submit-memo.ts` | `submitPraiseMemo()` | 60s cap, atomic slot spend, recipient-name precedence, free auto-archive at 3 | `/api/praise/upload` |
| `list-inbox.ts` | `getPraiseInbox()` | Open-report memos hidden BY QUERY (no flag) | `/praise` page |
| `list-contacts.ts` | `listTrustedContacts()` | Senders + memo counts + link liveness | `/account/praise-senders` page |
| `play-memo.ts` | `playPraiseMemo()`, `PLAY_QUOTA_SOFT_MESSAGE` | Quota gate (15/30) before grant; meters on play_started | `/api/praise/play/[memoId]` |
| `report-memo.ts` | `reportPraiseMemo()` | Creates content_report; dedupes open ones | `report-memo` action → inbox modal |
| `set-memo-category.ts` | `setMemoCategory()`, `MEMO_CATEGORIES` | Listening-moment categories | `set-category` action |
| `purge-sender-ips.ts` | `purgeSenderIps()` | Nulls sender IPs >7 days (D4) | cron `runSenderIpPurge` |
| `admin-review.ts` | `listOpenReports()`, `getReportForReview()`, `resolveReport()` | Content reachable only via open reports; removal deletes memo + returns key | `/admin/reports` pages + actions |

### 1.11 Admin (`admin/`)

| File | Function | What it does | Consumed by |
|---|---|---|---|
| `permissions.ts` | `getAdminPermissions()`, `hasAdminPermission()`, `hasAnyAdminPermission()`, `hasAllAdminPermissions()`, `isAnyAdmin()`, `ADMIN_PERMISSIONS`, `MINIMUM_ADMIN_PERMISSIONS` | Granular permission checks via `feature_grants` | `admin/layout.tsx`, `admin/page.tsx`, `admin/users/[id]/page.tsx`, both admin `actions.ts` |
| `audit.ts` | `logAdminAction()`, `captureUserState()` | Mandatory admin audit trail | Both admin `actions.ts` |

---

## 2. Server actions (`apps/web/server-actions/`)

All follow: `requireUser(capability)` (auth + account-state check — see `lib/require-user.ts`) → domain call → `revalidatePath` on success → typed result. Creating actions use the `create_data` capability; everything else uses `mutate_data`. Paused accounts are read-only; suspended accounts are blocked.

| Action file | Function | Wraps (domain) | Called from |
|---|---|---|---|
| `daily-plan/add-to-plan.ts` | `addToPlanAction` | `addToTodayPlan` | TodayClient |
| `daily-plan/complete-plan-item.ts` | `completePlanItemAction` | `completeTodayItem` + `checkSpeedRunEligibility` | TodayClient |
| `daily-plan/swap-plan-item.ts` | `swapPlanItemAction` | `swapTodayItem` (+ prefs threshold) | TodayClient |
| `daily-plan/reframe-plan-item.ts` | `reframePlanItemAction` | `reframeTodayItem` | TodayClient |
| `daily-plan/update-ritual.ts` | `updateRitualAction` | `updateRitualState` | TodayClient (MorningRitual) |
| `tasks/create-task.ts` | `createTaskAction` | `createTask` | TodayClient |
| `tasks/add-step.ts` | `addStepAction` | `addStep` | StepsEditor |
| `tasks/complete-step.ts` | `completeStepAction` | `completeStep` | WalkThrough |
| `tasks/reorder-steps.ts` | `reorderStepsAction` | `reorderSteps` | StepsEditor |
| `tasks/delete-step.ts` | `deleteStepAction` | `deleteStep` | StepsEditor |
| `timer/focus-session.ts` | `startTimerAction`, `pauseTimerAction`, `resumeTimerAction`, `endTimerAction` | focus-session state machine | TimerClient |
| `timer/hooks.ts` | `recordTenThreeMarkAction` | (event write, prefs-gated) | TimerClient |
| `doorknob/create-session.ts` | `createDoorknobSessionAction` | `createDoorknobSession` | DoorknobSetup |
| `doorknob/recalculate-late.ts` | `recalculateLateAction` | `recalculateLate` | DoorknobClient |
| `doorknob/complete-session.ts` | `completeDoorknobAction` | `completeDoorknob` | DoorknobClient |
| `doorknob/cancel-session.ts` | `cancelDoorknobAction` | `cancelDoorknob` | DoorknobClient |
| `users/update-preferences.ts` | `updatePreferencesAction` | `updateUserPreferences` (+ live plan slot update) | TodaySettingsClient, TimerSettingsClient |
| `launchpad/add-item.ts` | `addLaunchpadItemAction` | `addLaunchpadItem` | LaunchpadClient |
| `launchpad/check-item.ts` | `checkLaunchpadItemAction` | `checkLaunchpadItem` | LaunchpadClient |
| `launchpad/update-item.ts` | `updateLaunchpadItemAction` | `updateLaunchpadItem` | LaunchpadClient |
| `launchpad/reorder-items.ts` | `reorderLaunchpadItemsAction` | `reorderLaunchpadItems` | LaunchpadClient |
| `launchpad/delete-item.ts` | `deleteLaunchpadItemAction` | `deleteLaunchpadItem` | LaunchpadClient |
| `launchpad/set-nightly-reminder.ts` | `setNightlyReminderAction` | `updateUserPreferences` + `ensureNightlyReminder` | LaunchpadSettingsClient |
| `praise/create-invite.ts` | `createPraiseInviteAction` | `createPraiseInvite` (+ builds the share URL) | PraiseSendersClient |
| `praise/revoke-contact.ts` | `revokePraiseContactAction` | `revokePraiseContact` + R2 delete | PraiseSendersClient |
| `praise/report-memo.ts` | `reportPraiseMemoAction` | `reportPraiseMemo` | PraiseInboxClient |
| `praise/set-category.ts` | `setMemoCategoryAction` | `setMemoCategory` | PraiseInboxClient |
| `admin/users/actions.ts` (in app dir) | `createUser` | inline Prisma + `logAdminAction` | admin/users/new |
| `admin/users/[id]/actions.ts` (in app dir) | `pauseUser`, `unpauseUser`, `suspendUser`, `unsuspendUser`, `softDeleteUser`, `emergencyDeleteUser`, `sendPasswordReset`, `grantCompTier` | inline Prisma + `logAdminAction`/`captureUserState` | admin user detail sub-pages (form actions) |

---

## 3. API routes (`apps/web/app/api/`)

| Route | Method | Purpose | Called by |
|---|---|---|---|
| `auth/[...nextauth]` | * | NextAuth (Google, magic link, credentials) | signin page / NextAuth client |
| `auth/request-password-reset` | POST | Anti-enumeration reset email (hashed token, 1 h TTL, 3/hour rate limit) | `(auth)/reset-password/page.tsx` (fetch) |
| `auth/reset-password` | POST | Validate token, set password (argon2), revoke all sessions — one transaction | `(auth)/reset-password/[token]/page.tsx` (fetch) |
| `sync` | GET | Events since `?since=` for the user (max 200) | `lib/sync/use-sync-stream.ts` (5 s poll) |
| `timer/complete` | POST | PiP pop-out ends its session as completed (idempotent; Zod-validated body) | `lib/pip/timer-pip.ts` |
| `voice-dump` | POST | Auth → quota gate → Whisper → GPT parse → create tasks → increment quota (5 MB audio cap) | TodayClient (fetch, via VoiceDumpButton recording) |
| `cron/hourly` | GET | Daily cron dispatcher (CRON_SECRET-gated); sweeps due `scheduled_alerts`, restores expired pauses, resets launchpad items, purges praise sender IPs >7d | Vercel Cron (`0 8 * * *`) |
| `praise/upload` | POST | PUBLIC — token verify → 2MB cap → R2 put → Pro transcription → submit (failed submit deletes the object) | `/praise/[token]` sender page (fetch) |
| `praise/play/[memoId]` | POST | Quota gate → 1-hour signed R2 URL (`read_data` — paused accounts can still listen) | PraiseInboxClient (fetch) |

---

## 4. Pages & client components (`apps/web/app/`)

| Route | Server data source | Client component(s) | Actions/APIs used |
|---|---|---|---|
| `/` | — | — | Redirects → /dashboard or /signin |
| `/signin`, `/signin/check-email` | — | signin form | NextAuth |
| `/reset-password`, `/reset-password/[token]` | — | inline forms | `/api/auth/request-password-reset`, `/api/auth/reset-password` |
| `/dashboard` | `requirePageUser` → `getOrCreateTodayPlan`, `getTodayView`, `getActiveDoorknob`, `getLaunchpadItems`, `parsePreferences` | **TodayClient** (+ TodayCard, MorningRitual; launchpad + doorknob summary cards) | create-task, complete-plan-item, swap-plan-item, add-to-plan, update-ritual, reframe-plan-item, `/api/voice-dump`, useSyncStream |
| `/launchpad` | `requirePageUser` → `getLaunchpadItems` (lazy reset), `ensureNightlyReminder` | **LaunchpadClient** (useOptimistic) | launchpad actions ×5, useSyncStream, browser Notification |
| `/account` | direct Prisma + `parsePreferences` | TodaySettingsClient, TimerSettingsClient, LaunchpadSettingsClient | update-preferences, set-nightly-reminder |
| `/account/suspended` | direct Prisma (state check) | — | — |
| `/tasks/[taskId]` | direct Prisma (task + steps) | **StepsEditor** | add-step, reorder-steps, delete-step |
| `/walk/[taskId]` | direct Prisma (task + steps) | **WalkThrough** | complete-step |
| `/timer` | `parsePreferences` | **TimerClient** | timer actions, hooks, sound-engine, timer-pip, wedge/sound/vibration domain |
| `/doorknob` | `getActiveDoorknob`, `getLaunchpadItems` (setup prefill) | **DoorknobSetup** / **DoorknobClient** | doorknob actions ×4 (complete also resets on-departure launchpad items), browser Notifications |
| `/praise` | `requirePageUser` → `getPraiseInbox` + tier | **PraiseInboxClient** (play, speeds, categories, report modal, Pro transcript gate) | play API, report-memo, set-category, useSyncStream |
| `/praise/[token]` | PUBLIC — `verifyPraiseInvite` | **PraiseSenderClient** (MediaRecorder ≤60s, preview, privacy fine print) | `/api/praise/upload` |
| `/account/praise-senders` | `requirePageUser` → `listTrustedContacts` + tier | **PraiseSendersClient** (one-time link reveal, revoke confirm) | create-invite, revoke-contact |
| `/admin/reports` + `[id]` | `admin_content_moderate` gate (404 otherwise); review page logs `content.review_memo` per access + 30-min signed URL | ResolveForm | `resolveReportAction` (notes required; removal deletes memo + R2 object) |
| `/admin` + subroutes | direct Prisma + `getAdminPermissions` | ActionForm | admin actions (form actions, transactional audit) |
| `/dev/test-plan` | server gate: `notFound()` in production | TestPlanClient | — |

All protected pages authenticate via `requirePageUser()` (redirects to /signin with a callback, or to the account-state landing page).

Shared server/client plumbing:

| File | Exports | Used by |
|---|---|---|
| `lib/auth.ts` | `authOptions` (NextAuth config; rate-limited credentials AND magic-link sends) | Every auth check |
| `lib/require-user.ts` | `requireUser(capability)`, `requirePageUser()` — auth + account-state guard (Session 13) | Every server action, mutating API route, and protected page |
| `lib/env.ts` + `instrumentation.ts` | `validateEnv()` — Zod env schema incl. R2 vars (M10), fails the boot loudly | Server startup |
| `lib/r2.ts` | `putPraiseAudio()`, `getPlaybackUrl()` (1h), `getReviewUrl()` (30min), `deletePraiseAudio()` | Praise routes/actions + admin review |
| `lib/sync/use-sync-stream.ts` | `useSyncStream()` | TodayClient |
| `lib/audio/sound-engine.ts` | `unlockAudio()`, `playVariation()` | TimerClient |
| `lib/pip/timer-pip.ts` | `openTimerPiP()` | TimerClient |
| `middleware.ts` | Cookie-presence gate for protected paths; /admin → 404 rewrite | Edge runtime |

---

## 5. AI package (`packages/ai/src/`)

| File | Function | Used by |
|---|---|---|
| `openai-client.ts` | `getOpenAI()` lazy singleton, `__setOpenAIForTests()` | whisper/gpt clients |
| `whisper-client.ts` | `transcribeAudio(file)` | `/api/voice-dump` |
| `gpt-task-parser.ts` | `parseTasks(text)` (strict json_schema + coercion) | `/api/voice-dump` |
| `prompts/task-parsing.ts` | `buildTaskParsingMessages()`, `PARSED_TASKS_JSON_SCHEMA` | gpt-task-parser |

---

## 6. UI package (`packages/ui/src/`)

Design-system components (no dependency on domain/database): `Button`, `Card`, `Checkbox`, `Drawer`, `EmptyState`, `ErrorBoundary`, `IconButton`, `Input`, `Label`, `LoadingSpinner`, `Modal`, `Radio`, `Select`, `SkeletonLoader`, `Slider`, `TaskCard`, `Textarea`, `Toast`/`ToastProvider`/`useToast`, `Toggle`, `ThemeProvider`, `cn()`.

Feature components: `AnalogTimer` (SVG wedge — TimerClient), `DoorknobTimeline` (horizontal timeline — DoorknobClient), `VoiceDumpButton` (hold-to-record — TodayClient).

---

## 7. Orphaned / scaffold code

Session 13 removed the dead M4 code (DashboardClient, its complete-task / defer-task / update-task-priority / get-today-view actions + tests, and the list-active-tasks / list-steps domain functions) and wired `account-state.ts` into the new guard. What remains unreferenced is deliberate:

| Item | Status | Note |
|---|---|---|
| `domain/badges/get-user-badges.ts` | Deliberate scaffold | Waits for M10 trophy-case UI. |
| `domain/tasks/complete-task.ts`, `defer-task.ts` | Deliberate scaffold | Core task operations for the future task-detail UI; fully tested. |
| `domain/users/display-name.ts` | Scaffold | Greeting currently derives the name inline; candidate for the M14 onboarding pass. |
| `getStateBanner()` in `account-state.ts` | Scaffold | Paused/pending-delete banner copy — awaits a banner slot in the app shell. |
