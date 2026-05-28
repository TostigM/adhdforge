# Focus Forge — MySQL Schema Specification

**Status:** Draft v1.0
**Owners:** Focus Forge Project
**Target:** MySQL 8.0+ (JSON columns, CTEs, window functions required)
**Charset:** `utf8mb4` / `utf8mb4_0900_ai_ci`

---

## 1. Schema Philosophy (Round-Table)

| Concern | Principle |
|---|---|
| **Schema discipline** | Every table has a primary key. Every foreign key has an index. No nullable columns without a documented reason. Every status enum is explicit — no magic strings. |
| **No-failure structure** | The schema must MAKE IT IMPOSSIBLE to record "failed" states. Status enums physically don't include 'failed'. This isn't policy — it's structure. |
| **Event-driven badges** | Every user action that could earn a badge must produce a database event. The badge engine reads from `events`, not from feature-specific tables. |
| **Legacy commitment** | The `feature_grants` table is the long-term commitment to legacy users. Once a row is written, it is never deleted, only audited. |
| **Performance** | Indexes must support sub-100ms reads on the dashboard query. Anything slower causes user abandonment. |
| **Pagination** | Pagination cursors, not offsets. Stable ordering. |

---

## 2. Conventions

### 2.1 Naming
- Tables: `snake_case`, plural (`tasks`, `users`, `praise_memos`)
- Columns: `snake_case`, singular
- Foreign keys: `<table>_id` (e.g., `user_id`)
- Boolean columns: prefixed `is_` or `has_`
- Timestamp columns: `<verb>_at` (`created_at`, `deleted_at`)
- Junction tables: alphabetical order (`task_tags`, not `tag_tasks`)

### 2.2 Primary Keys

All tables use **Prisma `cuid()`** as primary keys, stored as `VARCHAR(30)`.

**Why cuid() and not UUID:**
- Works out of the box with Prisma — `@id @default(cuid())` is one line
- 25-character collision-resistant ID, URL-safe
- Time-ordered (sorts naturally by creation, like UUIDv7)
- No need for binary encoding/decoding helpers
- No external library dependencies
- Avoids ID enumeration attacks (not sequential like auto-increment)

**Why not VARCHAR(30) UUIDs:**
- Prisma's Bytes type requires manual conversion at every read/write
- UUIDv7 generation requires an external library (less mature in Node ecosystem)
- Operational pain: phpMyAdmin shows binary UUIDs as garbled hex
- Build velocity matters more than the ~16 bytes saved per row

```prisma
// In Prisma schema:
model User {
  id String @id @default(cuid())
  // ...
}
```

```sql
-- In MySQL DDL:
id VARCHAR(30) NOT NULL PRIMARY KEY
```

**Migration note:** Earlier draft revisions used `BINARY(16)` for UUIDs. The schema in this document is now standardized on `VARCHAR(30)` with `cuid()` defaults. All sample SQL has been updated.

### 2.3 Timestamps

All tables include:
```sql
created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
```

`(3)` = millisecond precision (matters for event ordering).

### 2.4 Soft Delete vs. Hard Delete

Most user-facing data uses **hard deletes** (per privacy commitments). Specific exceptions documented per table.

### 2.5 JSON Columns

Used sparingly. Only for:
- AI-generated metadata (where structure may evolve)
- User preferences (sparse, optional fields)
- Step lists (when order matters but querying individual steps is rare)

**Never** for queryable data. If you'll query it, give it a column.

---

## 3. Schema Diagram (High-Level)

```
                         ┌──────────┐
                         │  users   │
                         └────┬─────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼─────┐         ┌─────▼────┐         ┌──────▼──────┐
   │ sessions │         │  tasks   │         │praise_memos │
   └──────────┘         └────┬─────┘         └─────────────┘
                             │
                        ┌────▼────┐
                        │  steps  │
                        └─────────┘

  Auth & access:
   ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
   │ auth_methods │    │ feature_grants │    │trusted_contacts  │
   └──────────────┘    └────────────────┘    └──────────────────┘

  Engagement:
   ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
   │   badges     │    │ user_badges    │    │ launchpad_items  │
   └──────────────┘    └────────────────┘    └──────────────────┘

  Sessions & time:
   ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
   │focus_sessions│    │ check_ins      │    │ scheduled_alerts │
   └──────────────┘    └────────────────┘    └──────────────────┘

  Logs & monetization:
   ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
   │   events     │    │   audit_log    │    │  quota_usage     │
   └──────────────┘    └────────────────┘    └──────────────────┘
   ┌──────────────┐
   │subscriptions │
   └──────────────┘

  Feedback (bug/feature reports):
   ┌──────────────┐    ┌────────────────┐    ┌──────────────────────────┐
   │feedback_items│◀───│ feedback_votes │    │feedback_status_updates   │
   └──────┬───────┘    └────────────────┘    └──────────────────────────┘
          │
          │            ┌──────────────────────┐
          │            │feature_announcements │  (forum framework placeholder)
          │            └──────────────────────┘

  Routines & templates:
   ┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
   │task_templates│◀───│ routine_steps  │◀───│   routines       │
   └──────────────┘    └────────┬───────┘    └──────────────────┘
                                │
                       ┌────────▼─────────────┐    ┌──────────────────────────────┐
                       │  routine_instances   │    │routine_completion_patterns   │
                       └──────────────────────┘    └──────────────────────────────┘

  Admin & moderation:
   ┌──────────────┐    ┌──────────────────┐
   │admin_actions │    │ content_reports  │
   └──────────────┘    └──────────────────┘

  Stimulation & movement:
   ┌──────────────────────┐    ┌──────────────────────┐    ┌────────────────────┐
   │ mini_game_sessions   │    │ movement_prompts_log │    │ message_encounters │
   └──────────────────────┘    └──────────────────────┘    └────────────────────┘

  AI body double & time calibration:
   ┌──────────────────────┐    ┌────────────────────────────┐
   │  biddy_sessions      │    │ etc_calibration_history    │
   └──────────────────────┘    └────────────────────────────┘

  Mindfulness:
   ┌──────────────────────────┐    ┌──────────────────────────────┐
   │  mindfulness_sessions    │    │ mindfulness_suggestion_log   │
   └──────────────────────────┘    └──────────────────────────────┘
```

---

## 4. Table Definitions

### 4.1 `users`

```sql
CREATE TABLE users (
  id                VARCHAR(30)    NOT NULL PRIMARY KEY,
  email             VARCHAR(254)  NOT NULL,
  email_verified_at TIMESTAMP(3)  NULL DEFAULT NULL,
  display_name      VARCHAR(80)   NULL DEFAULT NULL,
  password_hash     VARCHAR(255)  NULL DEFAULT NULL,    -- NULL if user only uses OAuth/magic-link

  -- Account state — see doc 01 §4 for full state machine
  account_state     ENUM('unverified', 'active', 'paused', 'suspended', 'pending_delete', 'deleted')
                    NOT NULL DEFAULT 'unverified',

  -- Pause-specific fields (used when account_state = 'paused')
  paused_at         TIMESTAMP(3)  NULL DEFAULT NULL,
  paused_until      TIMESTAMP(3)  NULL DEFAULT NULL,    -- Auto-restore when this passes
  paused_reason     VARCHAR(500)  NULL DEFAULT NULL,    -- Shown to user

  -- Suspension-specific fields (used when account_state = 'suspended')
  suspended_at      TIMESTAMP(3)  NULL DEFAULT NULL,
  suspended_reason  VARCHAR(500)  NULL DEFAULT NULL,    -- Shown to user

  -- NOTE: tier history is in feature_grants. This is current state.
  -- 'comp' = admin-granted complimentary access (see doc 01 §5.1.1)
  tier              ENUM('free', 'legacy_free', 'comp', 'paid', 'paid_lifetime')
                    NOT NULL DEFAULT 'free',

  -- Comp tier expiration (used when tier = 'comp', NULL = permanent comp)
  comp_expires_at   TIMESTAMP(3)  NULL DEFAULT NULL,
  comp_granted_by_admin_id VARCHAR(30) NULL DEFAULT NULL,
  comp_reason       VARCHAR(500)  NULL DEFAULT NULL,    -- Internal note (admin-only visibility)
  comp_previous_tier ENUM('free', 'legacy_free', 'paid', 'paid_lifetime') NULL DEFAULT NULL,
  -- ↑ When comp expires, the user reverts to this tier

  -- Preferences (sparse, evolve frequently)
  preferences       JSON          NULL DEFAULT NULL,
  -- Example shape:
  -- {
  --   "theme": "dark",
  --   "soundFamily": "soft_chimes",
  --   "reducedMotion": false,
  --   "timeZone": "America/Los_Angeles",
  --   "weekStartsOn": "monday"
  -- }

  pending_delete_at TIMESTAMP(3)  NULL DEFAULT NULL,    -- Set when deletion requested; +30d = hard delete
  pending_delete_initiated_by ENUM('user', 'admin') NULL DEFAULT NULL,
  pending_delete_admin_id VARCHAR(30) NULL DEFAULT NULL,  -- If admin initiated

  last_login_at     TIMESTAMP(3)  NULL DEFAULT NULL,
  last_login_ip     VARBINARY(16) NULL DEFAULT NULL,    -- IPv4 or IPv6 in binary

  created_at        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_users_comp_admin FOREIGN KEY (comp_granted_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_delete_admin FOREIGN KEY (pending_delete_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_account_state (account_state),
  KEY idx_users_pending_delete (pending_delete_at),
  KEY idx_users_paused_until (paused_until),
  KEY idx_users_comp_expires (comp_expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Notes:**
- `email` UNIQUE: enforces single account per email
- `password_hash` NULL allowed: OAuth-only users have no password
- `display_name` NULL: defaults to "you" in UI when null
- `tier`: see §4.7 for legacy-user logic

### 4.2 `auth_methods`

A user can have multiple auth methods linked. Each method is a row.

```sql
CREATE TABLE auth_methods (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NOT NULL,

  provider        ENUM('password', 'google', 'apple', 'facebook', 'magic_link')
                  NOT NULL,

  provider_account_id VARCHAR(255) NULL DEFAULT NULL,  -- e.g. Google sub claim
  -- For 'password': NULL (password is on users.password_hash)
  -- For 'magic_link': NULL (no persistent ID)
  -- For OAuth: the provider's stable user ID

  metadata        JSON          NULL DEFAULT NULL,
  -- Example for OAuth: { "email_at_provider": "...", "name_at_provider": "..." }

  last_used_at    TIMESTAMP(3)  NULL DEFAULT NULL,
  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_auth_methods_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_auth_methods_provider (provider, provider_account_id),
  KEY idx_auth_methods_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 4.3 `sessions`

Server-side session storage (cookie holds session ID only).

```sql
CREATE TABLE sessions (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NOT NULL,

  token_hash      BINARY(32)    NOT NULL,             -- SHA-256 of the session secret
  user_agent      VARCHAR(500)  NULL DEFAULT NULL,
  ip_address      VARBINARY(16) NULL DEFAULT NULL,

  expires_at      TIMESTAMP(3)  NOT NULL,
  last_active_at  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

A nightly job purges sessions where `expires_at < NOW()`.

### 4.4 `magic_link_tokens` & `password_reset_tokens` & `email_verification_tokens`

Three small, similar tables. One template:

```sql
CREATE TABLE magic_link_tokens (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NULL DEFAULT NULL,    -- NULL if signup-flow magic-link
  email           VARCHAR(254)  NOT NULL,             -- Captured at request time

  token_hash      BINARY(32)    NOT NULL,
  expires_at      TIMESTAMP(3)  NOT NULL,
  used_at         TIMESTAMP(3)  NULL DEFAULT NULL,    -- Set when consumed; tokens are single-use

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_magic_links_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_magic_link_token_hash (token_hash),
  KEY idx_magic_link_email (email),
  KEY idx_magic_link_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

`password_reset_tokens` and `email_verification_tokens` follow the same shape — different expiry windows (60min and 7 days respectively).

### 4.5 `tasks`

The core entity. Note explicit absence of any 'failed' status.

```sql
CREATE TABLE tasks (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NOT NULL,

  raw_text        TEXT          NOT NULL,             -- Original capture (text or transcript)

  -- AI-parsed canonical form
  title           VARCHAR(500)  NULL DEFAULT NULL,    -- Short title, may be NULL until AI runs
  notes           TEXT          NULL DEFAULT NULL,

  -- Priority — Anchor/Flexible model (replaces legacy bronze/silver/gold/amber).
  -- Soft-Track Protocol: NO 'urgent', NO 'red'. Display palette maps in the UI layer
  -- (cant_miss→amber, high→gold, med→silver, low→bronze) — see doc 02 §2 + §14.5.
  --
  -- priority_kind:  anchor   = time-bound, pins to scheduled_for, does NOT flow through
  --                            the bubble-up queue (it is simply true at its time)
  --                 flexible = the user chooses when; flows through the Today queue
  -- priority_level: cant_miss = non-negotiable (ANCHOR ONLY — enforced by CHECK below)
  --                 high / med / low = relative weight for ordering + bubble-up
  priority_kind   ENUM('anchor', 'flexible') NOT NULL DEFAULT 'flexible',
  priority_level  ENUM('cant_miss', 'high', 'med', 'low') NOT NULL DEFAULT 'med',

  -- Today-queue / Gentle-Reframe bookkeeping (see doc 02 §14.5, doc 04 §4.6.2)
  today_swap_count    SMALLINT UNSIGNED NOT NULL DEFAULT 0,  -- times swapped out of Today; drives Gentle Reframe
  reframe_offered_at  TIMESTAMP(3) NULL DEFAULT NULL,        -- when the Reframe card was last shown (fire-once)
  reframe_snoozed_until TIMESTAMP(3) NULL DEFAULT NULL,      -- user chose "not now"; suppress until this time

  -- Status — Soft-Track Protocol: NO 'failed' or 'overdue'
  status          ENUM('active', 'deferred', 'completed')
                  NOT NULL DEFAULT 'active',

  -- Optional scheduling. For anchors this is the pinned time and SHOULD be set.
  scheduled_for   TIMESTAMP(3)  NULL DEFAULT NULL,
  estimated_minutes SMALLINT UNSIGNED NULL DEFAULT NULL,

  -- Completion / deferral metadata
  completed_at    TIMESTAMP(3)  NULL DEFAULT NULL,
  deferred_count  SMALLINT UNSIGNED NOT NULL DEFAULT 0,  -- Tracked silently; never shown to user
  deferred_until  TIMESTAMP(3)  NULL DEFAULT NULL,

  -- Capture method (analytics)
  capture_method  ENUM('text', 'voice', 'imported', 'system')
                  NOT NULL DEFAULT 'text',

  -- AI metadata (loose schema)
  ai_metadata     JSON          NULL DEFAULT NULL,
  -- Example:
  -- {
  --   "model": "gpt-4o-mini",
  --   "parsed_at": "2026-...",
  --   "confidence": 0.87,
  --   "detected_time_phrase": "tomorrow at 3pm"
  -- }

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  -- Only ANCHOR tasks may be 'cant_miss'. Flexible tasks cannot be non-negotiable —
  -- if it truly cannot be missed, it has a time, so it is an anchor.
  CONSTRAINT chk_tasks_cantmiss_anchor CHECK (
    priority_level <> 'cant_miss' OR priority_kind = 'anchor'
  ),
  KEY idx_tasks_user_status (user_id, status, created_at),
  KEY idx_tasks_user_scheduled (user_id, scheduled_for),
  KEY idx_tasks_deferred_until (deferred_until),
  -- Powers the bubble-up queue ordering: active flexible tasks by level
  KEY idx_tasks_today_queue (user_id, status, priority_kind, priority_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Critical:** the status ENUM physically cannot store 'failed' or 'overdue'. A future developer cannot accidentally introduce shame mechanics without an explicit migration.

**Priority model note:** the legacy `priority` column (`bronze/silver/gold/amber`) is replaced by `priority_kind` + `priority_level`. The old metal names now live ONLY as a display-palette mapping in the UI layer (doc 02 §2), not as data. Any code referencing `task.priority` must migrate to the two-column model.

### 4.6 `task_steps`

Sub-steps generated by AI for the "Walk Me Through It" mode.

```sql
CREATE TABLE task_steps (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  task_id         VARCHAR(30)    NOT NULL,

  step_order      SMALLINT UNSIGNED NOT NULL,
  text            TEXT          NOT NULL,

  status          ENUM('active', 'completed', 'deferred')
                  NOT NULL DEFAULT 'active',
  completed_at    TIMESTAMP(3)  NULL DEFAULT NULL,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_task_steps_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE KEY uq_task_steps_order (task_id, step_order),
  KEY idx_task_steps_task_status (task_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Why a separate table (not a JSON array on `tasks`):**
- We query individual steps for the "Walk Me Through It" UI
- Step completions are independent events (each can earn a "First Step" badge)
- We may add per-step time estimates later

### 4.6.1 `daily_plans` — The Today Plan & Morning Ritual

THE CORE LOOP. One row per user per local day. Holds the day's configuration and ritual state. The actual visible task set is in `daily_plan_items` (§4.6.2). See design spec doc 02 §14.5.

```sql
CREATE TABLE daily_plans (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,

  -- The local calendar day this plan represents.
  plan_date       DATE          NOT NULL,

  -- How many tasks the user wants visible in their Today set at once.
  -- User-configurable, default 3, clamped 1-5. (Full backlog stays hidden regardless.)
  visible_slots   TINYINT UNSIGNED NOT NULL DEFAULT 3,

  -- Morning ritual state for the day.
  --   pending   = not yet shown / not yet acted on
  --   completed = user did the ritual (picked their wins)
  --   skipped   = user dismissed it (NO penalty — plan fills itself either way)
  ritual_state    ENUM('pending', 'completed', 'skipped') NOT NULL DEFAULT 'pending',
  ritual_completed_at TIMESTAMP(3) NULL DEFAULT NULL,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_daily_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_daily_plans_user_date (user_id, plan_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

The user's **ritual mode preference** (off / skippable / ambient) lives in `users.preferences` JSON, not here — this table records what actually happened on a given day. Mode semantics:
- `off` — never show the ritual prompt; plan populates ambiently
- `skippable` — show a dismissable prompt (default); never blocks
- `ambient` — no prompt, but the Today set auto-fills and the user can adjust anytime

Whatever the mode, **anchors and cant_miss items surface regardless** (demand-avoidance safe: the plan never withholds a genuinely time-bound thing just because the user skipped planning).

### 4.6.2 `daily_plan_items` — The Visible Today Set + Bubble-Up Queue

Links tasks into a day's plan with their slot position and lifecycle. This is what powers the "small visible set + queue that refills" behavior.

```sql
CREATE TABLE daily_plan_items (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  daily_plan_id   VARCHAR(30)   NOT NULL,
  task_id         VARCHAR(30)   NOT NULL,

  -- Where this item sits in the day.
  --   today  = currently in the visible set (a "slot")
  --   queue  = waiting to bubble up when a slot frees
  --   done   = completed today (kept for the day's history / dopamine recap)
  slot_state      ENUM('today', 'queue', 'done') NOT NULL DEFAULT 'queue',

  -- Display order within its state (lower = higher). For 'queue', this is the
  -- bubble-up order (derived from priority but materialized so manual reordering sticks).
  position        SMALLINT UNSIGNED NOT NULL DEFAULT 0,

  -- How the item entered the visible set (analytics + ritual vs auto distinction).
  --   ritual   = user chose it in the morning ritual
  --   anchor   = auto-surfaced because it is an anchor / cant_miss
  --   bubble   = auto-bubbled to refill a freed slot
  --   manual   = user pulled it in by hand
  source          ENUM('ritual', 'anchor', 'bubble', 'manual') NOT NULL DEFAULT 'bubble',

  added_at        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at    TIMESTAMP(3)  NULL DEFAULT NULL,

  CONSTRAINT fk_dpi_plan FOREIGN KEY (daily_plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_dpi_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE KEY uq_dpi_plan_task (daily_plan_id, task_id),
  KEY idx_dpi_plan_state (daily_plan_id, slot_state, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Bubble-up algorithm** (run after any completion or swap):
```typescript
// Keep the visible 'today' set full up to visible_slots by pulling the
// highest-ranked 'queue' item into it. Anchors/cant_miss are placed first.
async function bubbleUp(plan: DailyPlan) {
  const todayCount = await countItems(plan.id, 'today');
  let needed = plan.visible_slots - todayCount;
  if (needed <= 0) return;

  // Rank: cant_miss(0) < flexible-high(1) < med(2) < low(3); anchors sort by time.
  const queued = await getQueueItemsRanked(plan.id); // joins tasks for priority
  for (const item of queued) {
    if (needed <= 0) break;
    await setItemState(item.id, 'today', { source: item.source === 'ritual' ? 'ritual' : 'bubble' });
    needed--;
  }
}

// Completing a task: mark done, free its slot, refill.
async function completeItem(item: DailyPlanItem) {
  await setItemState(item.id, 'done', { completed_at: now() });
  await markTaskCompleted(item.task_id);
  await bubbleUp(item.daily_plan);
}

// Swapping a flexible task OUT of the visible set: send back to queue, refill,
// and increment the swap counter that drives the Gentle Reframe.
async function swapOut(item: DailyPlanItem) {
  const task = await getTask(item.task_id);
  if (task.priority_kind === 'anchor') return; // anchors cannot be swapped

  await setItemState(item.id, 'queue', { position: END_OF_QUEUE });
  await incrementSwapCount(task.id); // tasks.today_swap_count++
  await bubbleUp(item.daily_plan);
  await maybeOfferGentleReframe(task);
}
```

**Gentle Reframe trigger** (the postponement guardrail — see doc 02 §14.5):
```typescript
// Fires ONCE when a flexible high/med task has been swapped out enough times.
// Blame-free, optional, de-escalating. NEVER for anchors or low-priority.
async function maybeOfferGentleReframe(task: Task) {
  const prefs = await getUserPrefs(task.user_id);
  if (!prefs.gentle_reframe_enabled) return;                 // user disabled it (default ON)
  const threshold = prefs.gentle_reframe_threshold ?? 4;     // configurable 3-7
  if (task.priority_kind === 'anchor') return;               // anchors don't sink
  if (task.priority_level === 'low') return;                 // low is SUPPOSED to wait
  if (task.priority_level === 'cant_miss') return;           // (defensive; cant_miss is anchor-only anyway)
  if (task.reframe_offered_at) return;                       // fire once, ever (until reset)
  if (task.reframe_snoozed_until && task.reframe_snoozed_until > now()) return;
  if (task.today_swap_count < threshold) return;

  await offerReframeCard(task.id);            // UI shows the 4-option card
  await setReframeOfferedAt(task.id, now());  // never auto-shown again
}
// The card's four options (doc 02 §14.5): break into steps / lower priority /
// anchor it / snooze ("not now, don't ask again for a while" → sets reframe_snoozed_until).
// No counter is ever shown to the user. No shame. No escalation.
```

### 4.7 `feature_grants`

**The legacy-user commitment, made structural.**

```sql
CREATE TABLE feature_grants (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NOT NULL,
  feature_key     VARCHAR(80)   NOT NULL,             -- e.g., 'voice_dump', 'body_doubling'
  granted_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  granted_reason  ENUM('signup_default', 'legacy_grandfather', 'paid_subscription', 'lifetime_purchase', 'admin_grant')
                  NOT NULL,

  notes           VARCHAR(500)  NULL DEFAULT NULL,

  CONSTRAINT fk_feature_grants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_feature_grants (user_id, feature_key),
  KEY idx_feature_grants_user (user_id),
  KEY idx_feature_grants_reason (granted_reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Access check logic (in app code):**
```typescript
async function userHasFeature(userId: string, featureKey: string): Promise<boolean> {
  const user = await getUser(userId);

  // Paid users get everything
  if (user.tier === 'paid' || user.tier === 'paid_lifetime') return true;

  // Legacy + free users: check explicit grant
  const grant = await db.query(
    `SELECT 1 FROM feature_grants WHERE user_id = ? AND feature_key = ?`,
    [userId, featureKey]
  );

  return grant.length > 0;
}
```

**At paid-launch migration time:**

The migration is described in detail in `05-monetization-strategy.md` §11. This is the canonical reference. Summary:

1. The migration is run via a Prisma script (TypeScript), not raw SQL — this lets us use Prisma's cuid() for IDs naturally
2. Each free user gets `feature_grants` rows for the **unlimited variant** of each currently-free feature (e.g., `voice_dump_unlimited`, NOT just `voice_dump`)
3. Their `tier` is updated from `'free'` to `'legacy_free'`
4. The full feature_key list and TypeScript implementation lives in doc 05 §11.2

**Canonical feature_key registry** (single source of truth — used by both schema and monetization spec):

```
free-tier features (with their unlimited paid equivalents):
  - task_management            (no _unlimited variant — always free)
  - analog_timer               (no _unlimited variant — always free)
  - reverse_scheduler          (no _unlimited variant — always free)
  - launchpad                  (no _unlimited variant — always free)
  - body_check_ins             (no _unlimited variant — always free)
  - badges                     (no _unlimited variant — always free)
  - data_export                (no _unlimited variant — always free)
  - routines                   (no _unlimited variant — always free; core accessibility feature)
  - task_templates             (no _unlimited variant — always free)
  - feedback_submission        (no _unlimited variant — always free)
  - feedback_voting            (no _unlimited variant — always free)
  - completion_patterns        (no _unlimited variant — always free; opt-in feature)
  - mini_games                 (no _unlimited variant — always free; core accessibility feature)
  - movement_prompts           (no _unlimited variant — always free; core accessibility feature)
  - quest_log_mode             (no _unlimited variant — always free; UI variant)
  - speed_run_challenges       (no _unlimited variant — always free; opt-in)
  - biddy_companion            (no _unlimited variant — always free; core accessibility feature)
  - time_estimation            (no _unlimited variant — always free; basic ETC entry)
  - mindfulness                (no _unlimited variant — always free; core accessibility feature)

quota-gated features (free has limits, paid has _unlimited variant):
  - voice_dump            ↔  voice_dump_unlimited
  - ai_breakdown          ↔  ai_breakdown_unlimited
  - ai_decision           ↔  ai_decision_unlimited
  - praise_repository     ↔  praise_repository_unlimited
  - trusted_contacts      ↔  trusted_contacts_unlimited
  - device_sync           ↔  device_sync_unlimited

paid-only features (no free variant):
  - body_doubling
  - praise_transcription
  - ai_routine_suggestions     (Pro: AI-generated routine adjustment suggestions)
  - ai_etc_suggestions         (Pro: AI-suggested ETC based on user's calibration history)

admin features (granted manually to maintainers/staff — see doc 01 §4.7 for full role model):
  
  Read-only:
  - admin_user_view             (view account details, audit log for users)
  - admin_analytics             (view aggregate metrics dashboards)
  
  Moderator-level:
  - admin_user_pause            (pause/unpause accounts; lighter, time-bound)
  - admin_content_moderation    (review reported memos, body doubling reports)
  - admin_feedback_management   (post status updates, pin items, mark duplicates)
  
  Admin-level:
  - admin_user_management       (edit accounts, grant comp Pro, force password reset, sign out sessions)
  - admin_user_suspend          (suspend/unsuspend accounts; heavier, indefinite)
  - admin_user_soft_delete      (initiate 30-day soft delete on a user)
  - admin_announcements         (post feature_announcements)
  - admin_billing               (view subscriptions, issue refunds via Stripe)
  
  Super-admin only (initially only the project owner):
  - admin_user_emergency_delete (immediate hard delete; legal compliance only)
  - admin_grant_admin           (grant other admin permissions to other users)
```

**Common admin role compositions:**

| Role | Feature Grants |
|---|---|
| **Read-only Auditor** | `admin_user_view`, `admin_analytics` |
| **Moderator** | `admin_user_view`, `admin_user_pause`, `admin_content_moderation`, `admin_feedback_management` |
| **Full Admin** | All except `admin_user_emergency_delete` and `admin_grant_admin` |
| **Super Admin** | All admin permissions (project owner) |

These are *conventions*, not enforced groupings. The grant model is purely additive — admins can have any combination.

**On `ai_routine_suggestions` for legacy users:** routines themselves are always free (core accessibility feature). The *AI-generated suggestions* about routine adjustments are a Pro feature. Legacy users grandfathered at paid-tier launch did not have access to AI suggestions during the free era (the feature didn't exist), so this is NOT included in their legacy grant. New AI features added post-launch follow this rule.

### 4.8 `badges` (definitions) and `user_badges` (earned instances)

```sql
CREATE TABLE badges (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  badge_key       VARCHAR(80)   NOT NULL,             -- 'first_capture', 'first_focus_session'
  display_name    VARCHAR(120)  NOT NULL,
  description     VARCHAR(500)  NOT NULL,
  tier            ENUM('bronze', 'silver', 'gold')
                  NOT NULL DEFAULT 'bronze',

  -- Trigger logic (loose — interpreted by badge engine in app)
  trigger_event_type  VARCHAR(80) NULL DEFAULT NULL,  -- e.g., 'task.completed'
  trigger_threshold   INT UNSIGNED NULL DEFAULT NULL, -- e.g., 5 (completions)
  is_repeatable       BOOLEAN NOT NULL DEFAULT FALSE,

  icon_name       VARCHAR(80)   NOT NULL,             -- Lucide icon name
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE KEY uq_badges_key (badge_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_badges (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NOT NULL,
  badge_id        VARCHAR(30)    NOT NULL,

  earned_at       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  context         JSON          NULL DEFAULT NULL,    -- e.g., { "task_id": "...", "session_count": 5 }

  CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_badges_badge FOREIGN KEY (badge_id) REFERENCES badges(id),
  KEY idx_user_badges_user_earned (user_id, earned_at DESC),
  KEY idx_user_badges_badge (badge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

Non-repeatable badges have a uniqueness check enforced in app code (a partial unique index would be cleaner but MySQL doesn't support those — we add a compound `(user_id, badge_id)` unique only on non-repeatable rows via app-layer logic).

### 4.9 `praise_memos`

```sql
CREATE TABLE praise_memos (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NOT NULL,             -- Recipient
  trusted_contact_id VARCHAR(30) NOT NULL,             -- Sender

  sender_display_name VARCHAR(80) NOT NULL,           -- Captured at submission

  audio_path      VARCHAR(500)  NOT NULL,             -- Server-relative; never public
  audio_duration_ms INT UNSIGNED NOT NULL,
  audio_size_bytes INT UNSIGNED NOT NULL,

  transcript      TEXT          NULL DEFAULT NULL,    -- AI-generated; NULL during processing
  transcript_status ENUM('pending', 'completed', 'failed_skip')
                    NOT NULL DEFAULT 'pending',
  -- Note: 'failed_skip' just means we couldn't transcribe and moved on. Audio still works.

  category        VARCHAR(80)   NULL DEFAULT NULL,    -- 'after_failure', 'before_big_task', etc.

  is_archived     BOOLEAN       NOT NULL DEFAULT FALSE,
  last_played_at  TIMESTAMP(3)  NULL DEFAULT NULL,
  play_count      INT UNSIGNED  NOT NULL DEFAULT 0,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_praise_memos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_praise_memos_contact FOREIGN KEY (trusted_contact_id) REFERENCES trusted_contacts(id) ON DELETE CASCADE,
  KEY idx_praise_memos_user_created (user_id, created_at DESC),
  KEY idx_praise_memos_user_category (user_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 4.10 `trusted_contacts`

```sql
CREATE TABLE trusted_contacts (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NOT NULL,             -- The Focus Forge user receiving memos

  display_name    VARCHAR(80)   NOT NULL,             -- Set by user when generating link

  invite_token_hash BINARY(32)  NOT NULL,             -- Hash of the unique invite token
  invite_expires_at TIMESTAMP(3) NOT NULL,            -- 7 days after creation
  memos_remaining   SMALLINT UNSIGNED NOT NULL DEFAULT 3,

  is_revoked      BOOLEAN       NOT NULL DEFAULT FALSE,
  revoked_at      TIMESTAMP(3)  NULL DEFAULT NULL,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_trusted_contacts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_trusted_contacts_token (invite_token_hash),
  KEY idx_trusted_contacts_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 4.11 `launchpad_items`

The user's daily "items by the door."

```sql
CREATE TABLE launchpad_items (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NOT NULL,

  label           VARCHAR(120)  NOT NULL,             -- "Keys", "Wallet", "Lunch from fridge"
  display_order   SMALLINT UNSIGNED NOT NULL DEFAULT 0,

  is_checked      BOOLEAN       NOT NULL DEFAULT FALSE,
  last_checked_at TIMESTAMP(3)  NULL DEFAULT NULL,

  reset_schedule  ENUM('never', 'daily', 'on_departure')
                  NOT NULL DEFAULT 'daily',
  reset_time_local TIME         NULL DEFAULT '04:00:00',  -- Local time at user's TZ

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_launchpad_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_launchpad_user_order (user_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 4.12 `focus_sessions`

A focus timer run.

```sql
CREATE TABLE focus_sessions (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NOT NULL,
  task_id         VARCHAR(30)    NULL DEFAULT NULL,    -- Optional linked task

  planned_duration_seconds INT UNSIGNED NOT NULL,
  actual_duration_seconds  INT UNSIGNED NULL DEFAULT NULL,

  -- Soft-Track Protocol: 'incomplete' is neutral, NOT 'failed'
  status          ENUM('running', 'completed', 'incomplete', 'paused')
                  NOT NULL DEFAULT 'running',

  sound_family    VARCHAR(80)   NULL DEFAULT NULL,
  alert_interval_seconds INT UNSIGNED NULL DEFAULT NULL,

  started_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at        TIMESTAMP(3)  NULL DEFAULT NULL,

  CONSTRAINT fk_focus_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_focus_sessions_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  KEY idx_focus_sessions_user_started (user_id, started_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 4.13 `check_ins`

Body check-ins triggered during long focus sessions.

```sql
CREATE TABLE check_ins (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NOT NULL,
  focus_session_id VARCHAR(30)   NULL DEFAULT NULL,

  prompt_key      VARCHAR(80)   NOT NULL,             -- 'water', 'tension', 'posture'
  response        ENUM('yes', 'no', 'dismissed', 'no_response')
                  NULL DEFAULT NULL,

  prompted_at     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  responded_at    TIMESTAMP(3)  NULL DEFAULT NULL,

  CONSTRAINT fk_check_ins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_check_ins_session FOREIGN KEY (focus_session_id) REFERENCES focus_sessions(id) ON DELETE SET NULL,
  KEY idx_check_ins_user_prompted (user_id, prompted_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 4.14 `scheduled_alerts`

Future reminders (Doorknob mode, nightly Launchpad reminders, etc.).

```sql
CREATE TABLE scheduled_alerts (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NOT NULL,

  alert_type      ENUM('doorknob_zone', 'launchpad_nightly', 'task_reminder', 'check_in')
                  NOT NULL,

  scheduled_for   TIMESTAMP(3)  NOT NULL,
  payload         JSON          NULL DEFAULT NULL,    -- Flexible per alert type

  status          ENUM('pending', 'fired', 'cancelled')
                  NOT NULL DEFAULT 'pending',
  fired_at        TIMESTAMP(3)  NULL DEFAULT NULL,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_scheduled_alerts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_scheduled_alerts_pending (status, scheduled_for),
  KEY idx_scheduled_alerts_user (user_id, scheduled_for)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

A worker (cron job, every minute) selects rows where `status = 'pending' AND scheduled_for <= NOW()` and fires them.

### 4.15 `events`

Append-only event log. Drives the badge engine, analytics, audit.

```sql
CREATE TABLE events (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NULL DEFAULT NULL,    -- NULL for system events

  event_type      VARCHAR(80)   NOT NULL,
  -- Convention: 'noun.verb' (task.created, task.completed, focus_session.completed, badge.earned)

  payload         JSON          NULL DEFAULT NULL,
  occurred_at     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_events_user_type_time (user_id, event_type, occurred_at DESC),
  KEY idx_events_type_time (event_type, occurred_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Note:** `events` will grow large. Plan to partition by month or archive >180 days to a separate table after launch.

### 4.16 `audit_log`

Sensitive operations only. Separate from `events` for security/compliance.

```sql
CREATE TABLE audit_log (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)    NULL DEFAULT NULL,
  actor_id        VARCHAR(30)    NULL DEFAULT NULL,    -- e.g., admin acting on user

  action          VARCHAR(80)   NOT NULL,
  -- 'login.success', 'login.failed', 'password.changed', 'email.changed',
  -- 'account.delete_requested', 'account.delete_cancelled', 'account.deleted',
  -- 'feature_grant.created', 'admin.action'

  metadata        JSON          NULL DEFAULT NULL,
  ip_address      VARBINARY(16) NULL DEFAULT NULL,
  user_agent      VARCHAR(500)  NULL DEFAULT NULL,

  occurred_at     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  KEY idx_audit_user_time (user_id, occurred_at DESC),
  KEY idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**No FK from `audit_log` to `users`** — we want audit records to survive user deletion. We anonymize them but don't drop them.

**Example queries on audit_log:**

```sql
-- User asks: "Show me my login history"
SELECT action, ip_address, user_agent, occurred_at
FROM audit_log
WHERE user_id = ?
  AND action IN ('login.success', 'login.failed')
ORDER BY occurred_at DESC
LIMIT 50;

-- Investigate suspicious activity (admin, last 7 days)
SELECT action, COUNT(*) as cnt
FROM audit_log
WHERE user_id = ?
  AND occurred_at > NOW() - INTERVAL 7 DAY
GROUP BY action
ORDER BY cnt DESC;

-- Find accounts with elevated failed-login activity (security ops)
SELECT user_id, COUNT(*) as failed_count
FROM audit_log
WHERE action = 'login.failed'
  AND occurred_at > NOW() - INTERVAL 1 HOUR
GROUP BY user_id
HAVING failed_count >= 5;
```

### 4.17 `quota_usage`

Tracks daily quota consumption for free-tier features. Reset is implicit (new UTC day = new row).

```sql
CREATE TABLE quota_usage (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,
  quota_key       VARCHAR(80)   NOT NULL,
  -- Possible quota_key values:
  --   'voice_dump', 'ai_breakdown', 'ai_decision', 'praise_play'

  usage_date_utc  DATE          NOT NULL,           -- The UTC date the usage counts toward
  count           INT UNSIGNED  NOT NULL DEFAULT 0,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_quota_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_quota (user_id, quota_key, usage_date_utc),
  KEY idx_quota_user_key (user_id, quota_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Reset semantics:**
- Quotas reset at **04:00 UTC** for all users globally
- Implementation: the column `usage_date_utc` is computed as `(NOW() - INTERVAL 4 HOUR)::DATE` — i.e., the "quota day" rolls over at 04:00 UTC
- A new row is created on the first request after rollover
- No cron job needed — the date math handles it
- The UI displays the next reset time in the user's local timezone (e.g., "Resets at 8:00 PM your time" for a Pacific user)

**Atomic increment pattern (used at write time):**
```sql
INSERT INTO quota_usage (id, user_id, quota_key, usage_date_utc, count)
VALUES (?, ?, ?, ?, 1)
ON DUPLICATE KEY UPDATE count = count + 1;
```

**No daily cleanup needed** — old rows are kept for analytics. They're cheap.

### 4.18 `subscriptions`

Stripe subscription state, mirrored to MySQL. Used for tier checks and Customer Portal.

```sql
CREATE TABLE subscriptions (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,

  stripe_customer_id        VARCHAR(255) NOT NULL,
  stripe_subscription_id    VARCHAR(255) NULL DEFAULT NULL,
  stripe_price_id           VARCHAR(255) NULL DEFAULT NULL,

  status          ENUM('active', 'past_due', 'canceled', 'incomplete', 'trialing', 'paused')
                  NOT NULL,
  -- Note: 'trialing' kept for Stripe API compatibility but Focus Forge does NOT offer trials (see doc 05 §3.2)

  current_period_start TIMESTAMP(3) NULL DEFAULT NULL,
  current_period_end   TIMESTAMP(3) NULL DEFAULT NULL,
  cancel_at_period_end BOOLEAN      NOT NULL DEFAULT FALSE,

  plan_type       ENUM('monthly', 'annual', 'lifetime') NOT NULL,

  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_subs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_subs_user (user_id),
  UNIQUE KEY uq_subs_stripe_sub (stripe_subscription_id),
  KEY idx_subs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**`ON DELETE RESTRICT` rationale:** unlike most tables which CASCADE delete, we won't let a user delete their account while they have an active subscription. They must cancel through Stripe Customer Portal first. This prevents accidental orphaned Stripe charges. The deletion flow detects this and prompts the user appropriately (see doc 05 §9).

### 4.19 `feedback_items`

Bug reports and feature requests. The `kind` field distinguishes the two. **Architecturally extensible:** the schema is built so a future "discussions" table can plug in alongside without refactoring.

```sql
CREATE TABLE feedback_items (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,             -- Submitter

  kind            ENUM('bug', 'feature_request')
                  NOT NULL,

  title           VARCHAR(200)  NOT NULL,
  body            TEXT          NOT NULL,

  -- Status — Soft-Track Protocol applied: 'wontfix' is neutral, not harsh
  status          ENUM('open', 'acknowledged', 'in_progress', 'resolved', 'wontfix', 'duplicate')
                  NOT NULL DEFAULT 'open',

  vote_count      INT UNSIGNED  NOT NULL DEFAULT 1,    -- Submitter auto-votes; denormalized for sort speed
  is_pinned       BOOLEAN       NOT NULL DEFAULT FALSE, -- Admin can pin

  -- Optional metadata for bug reports
  bug_metadata    JSON          NULL DEFAULT NULL,
  -- Example shape:
  -- {
  --   "browser": "Chrome 124",
  --   "os": "macOS 14.5",
  --   "viewport": "1440x900",
  --   "url_when_reported": "/dashboard"
  -- }

  -- Resolved metadata
  resolved_in_version VARCHAR(50) NULL DEFAULT NULL,
  duplicate_of_id  VARCHAR(30)    NULL DEFAULT NULL,  -- FK to another feedback_items.id

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_feedback_duplicate FOREIGN KEY (duplicate_of_id) REFERENCES feedback_items(id) ON DELETE SET NULL,
  KEY idx_feedback_kind_status (kind, status, vote_count DESC),
  KEY idx_feedback_user (user_id),
  KEY idx_feedback_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Notes:**
- `ON DELETE SET NULL` for user_id: if a user deletes their account, their feedback items remain (other users may have voted on them) but become anonymous
- `vote_count` is denormalized for fast sorting — kept in sync via trigger or transaction
- The submitter is automatically counted as voting (vote_count starts at 1)
- `duplicate_of_id` is self-referential — admins can mark items as duplicates of others
- No `description` for forum-style threading. Future-extensibility note: a `discussions` table could reference `feedback_item_id` if we ever expose discussion later

### 4.20 `feedback_votes`

```sql
CREATE TABLE feedback_votes (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  feedback_item_id VARCHAR(30)  NOT NULL,
  user_id         VARCHAR(30)   NOT NULL,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_votes_item FOREIGN KEY (feedback_item_id) REFERENCES feedback_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_votes (feedback_item_id, user_id),
  KEY idx_votes_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Notes:**
- One vote per user per item, enforced by unique key
- **No downvotes.** Upvotes only. A hard rule: downvotes are distress fuel.
- When a vote is added, increment `feedback_items.vote_count` in same transaction
- When a vote is removed, decrement (allow toggle)

### 4.21 `feedback_status_updates`

Admin-posted updates on the status of a feedback item. Users can NOT post here — only admins.

```sql
CREATE TABLE feedback_status_updates (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  feedback_item_id VARCHAR(30)  NOT NULL,
  admin_user_id   VARCHAR(30)   NOT NULL,

  message         TEXT          NOT NULL,
  new_status      ENUM('open', 'acknowledged', 'in_progress', 'resolved', 'wontfix', 'duplicate')
                  NULL DEFAULT NULL,
  -- new_status nullable: an update can be informational without changing status

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_fsu_item FOREIGN KEY (feedback_item_id) REFERENCES feedback_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_fsu_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_fsu_item_time (feedback_item_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Admin role enforcement:** there's no `is_admin` boolean on `users`. Instead, admin permissions are granted via a `feature_grant` with `feature_key = 'admin_feedback_management'`. This pattern matches our existing entitlement model.

### 4.22 `task_templates`

Reusable task definitions that users assemble into routines. Can also be used standalone (apply a template to today as a one-off task).

```sql
CREATE TABLE task_templates (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,

  title           VARCHAR(500)  NOT NULL,
  notes           TEXT          NULL DEFAULT NULL,

  default_priority_kind  ENUM('anchor', 'flexible') NOT NULL DEFAULT 'flexible',
  default_priority_level ENUM('cant_miss', 'high', 'med', 'low') NOT NULL DEFAULT 'med',
  default_estimated_minutes SMALLINT UNSIGNED NULL DEFAULT NULL,

  -- Optional pre-defined sub-steps for the template
  default_steps   JSON          NULL DEFAULT NULL,
  -- Example shape:
  -- [
  --   { "text": "Open laptop", "estimated_minutes": 1 },
  --   { "text": "Check job board", "estimated_minutes": 30 }
  -- ]

  is_archived     BOOLEAN       NOT NULL DEFAULT FALSE,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_templates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_templates_user (user_id, is_archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 4.23 `routines`

A named, ordered collection of tasks that recur on selected days. Users can have multiple routines (e.g., "Morning Routine," "Weekend Wind-Down").

```sql
CREATE TABLE routines (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,

  name            VARCHAR(120)  NOT NULL,
  notes           TEXT          NULL DEFAULT NULL,

  -- Day selection: bitmask. Bit 0=Sunday, Bit 1=Monday, ..., Bit 6=Saturday
  -- 0b1111111 (127) = every day
  -- 0b0111110 (62)  = weekdays only (Mon-Fri)
  -- 0b1000001 (65)  = weekends only (Sat+Sun)
  active_days     TINYINT UNSIGNED NOT NULL DEFAULT 127,

  -- Hard scheduling: send notifications at task start times
  -- Soft scheduling: descriptive time labels only, no notifications
  is_hard_scheduled BOOLEAN     NOT NULL DEFAULT FALSE,

  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,    -- User can pause without deleting
  is_archived     BOOLEAN       NOT NULL DEFAULT FALSE,   -- Soft-deleted, hidden but recoverable

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_routines_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_routines_user_active (user_id, is_active, is_archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Day selection bitmask logic:**
```typescript
// Helpers in packages/domain/src/routines/days.ts
const DAY_BITS = {
  sunday:    0b0000001,
  monday:    0b0000010,
  tuesday:   0b0000100,
  wednesday: 0b0001000,
  thursday:  0b0010000,
  friday:    0b0100000,
  saturday:  0b1000000,
};

const PRESETS = {
  every_day:    0b1111111,  // 127
  weekdays:     0b0111110,  // 62
  weekends:     0b1000001,  // 65
};

function isActiveOnDay(routine: Routine, date: Date): boolean {
  const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
  return (routine.active_days & (1 << dayOfWeek)) !== 0;
}
```

### 4.24 `routine_steps`

The ordered list of tasks within a routine. Each step references a `task_templates` entry OR contains inline task data.

```sql
CREATE TABLE routine_steps (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  routine_id      VARCHAR(30)   NOT NULL,
  task_template_id VARCHAR(30)  NULL DEFAULT NULL,    -- Optional reference to template

  step_order      SMALLINT UNSIGNED NOT NULL,

  -- Inline task data (used if task_template_id is null, or to override template)
  title           VARCHAR(500)  NOT NULL,
  notes           TEXT          NULL DEFAULT NULL,
  priority_kind   ENUM('anchor', 'flexible') NOT NULL DEFAULT 'flexible',
  priority_level  ENUM('cant_miss', 'high', 'med', 'low') NOT NULL DEFAULT 'med',

  -- Time block (optional — only used if routine.is_hard_scheduled OR for descriptive display)
  start_time_local TIME         NULL DEFAULT NULL,    -- e.g., '08:00:00'
  duration_minutes SMALLINT UNSIGNED NULL DEFAULT NULL,

  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_rs_routine FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
  CONSTRAINT fk_rs_template FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE SET NULL,
  UNIQUE KEY uq_routine_step_order (routine_id, step_order),
  KEY idx_rs_routine_active (routine_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Notes:**
- `task_template_id` is optional. When set, the routine step inherits properties from the template. When the template is updated, future routine instances pick up the changes (NOT past completed instances).
- `title` is denormalized — kept in sync with the template at edit time. This protects against template deletion.
- `start_time_local` is in the user's local timezone (TIME, no date). When generating instances, we apply this to "today" in the user's timezone.

### 4.25 `routine_instances`

The actual generated tasks for a specific date from an active routine. These are created by the daily generation job (runs in the hourly cron dispatcher per doc 04 §9).

```sql
CREATE TABLE routine_instances (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  routine_id      VARCHAR(30)   NOT NULL,
  routine_step_id VARCHAR(30)   NOT NULL,
  task_id         VARCHAR(30)   NULL DEFAULT NULL,    -- Set when an actual task row is created (lazy)

  user_id         VARCHAR(30)   NOT NULL,
  scheduled_date_utc DATE       NOT NULL,             -- The "routine day" this instance represents

  -- Status — Soft-Track Protocol applied
  status          ENUM('pending', 'completed', 'skipped', 'expired')
                  NOT NULL DEFAULT 'pending',
  -- 'pending'   = waiting for the user (visible on today's dashboard)
  -- 'completed' = user marked it done
  -- 'skipped'   = user explicitly skipped (no shame)
  -- 'expired'   = day rolled over without completion (silent — never shown to user)

  completed_at    TIMESTAMP(3)  NULL DEFAULT NULL,
  expired_at      TIMESTAMP(3)  NULL DEFAULT NULL,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_ri_routine FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
  CONSTRAINT fk_ri_step FOREIGN KEY (routine_step_id) REFERENCES routine_steps(id) ON DELETE CASCADE,
  CONSTRAINT fk_ri_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  CONSTRAINT fk_ri_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_routine_instance_per_day (routine_step_id, scheduled_date_utc),
  KEY idx_ri_user_date (user_id, scheduled_date_utc, status),
  KEY idx_ri_user_pending (user_id, status, scheduled_date_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Notes:**
- The `expired` status enables soft-track mode (per doc 03 design): instances that weren't completed by end-of-day get marked `expired` silently and never resurface to the user
- `task_id` is lazy-bound: only when the user first interacts (views, completes, skips) is a corresponding row in `tasks` created. This avoids cluttering the dashboard with hundreds of pre-generated routine instances each day.
- The unique key prevents duplicate instances for the same step on the same day (idempotency for the cron job)

### 4.26 `routine_completion_patterns`

Aggregated completion data for the opt-in "Patterns" feature. Computed by a periodic job (runs daily in the cron dispatcher).

```sql
CREATE TABLE routine_completion_patterns (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,
  routine_step_id VARCHAR(30)   NOT NULL,

  -- Rolling window of last 30 active days
  window_days     SMALLINT UNSIGNED NOT NULL,         -- typically 30
  active_days_in_window SMALLINT UNSIGNED NOT NULL,   -- days the routine was scheduled
  completed_count SMALLINT UNSIGNED NOT NULL,
  skipped_count   SMALLINT UNSIGNED NOT NULL,
  expired_count   SMALLINT UNSIGNED NOT NULL,

  -- Derived metrics for "Patterns" UI
  completion_rate DECIMAL(5,4)  NOT NULL,             -- 0.0000 to 1.0000

  -- Day-of-week breakdown (JSON for flexibility)
  by_day_of_week  JSON          NOT NULL,
  -- Example:
  -- {
  --   "monday":   { "active": 4, "completed": 2 },
  --   "tuesday":  { "active": 4, "completed": 4 },
  --   "wednesday":{ "active": 4, "completed": 3 },
  --   ...
  -- }

  -- AI suggestion fields (Pro tier only)
  ai_suggestion   TEXT          NULL DEFAULT NULL,    -- e.g., "Mondays seem hard; consider rescheduling"
  ai_suggestion_at TIMESTAMP(3) NULL DEFAULT NULL,

  computed_at     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_rcp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rcp_step FOREIGN KEY (routine_step_id) REFERENCES routine_steps(id) ON DELETE CASCADE,
  UNIQUE KEY uq_rcp_user_step (user_id, routine_step_id),
  KEY idx_rcp_user_rate (user_id, completion_rate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Notes:**
- One row per (user, routine_step) — updated daily, not appended
- The Patterns page (opt-in, user must enable in settings) reads from this table
- AI suggestions: free users see basic patterns; **Pro users get AI-generated suggestions** for routine adjustments (more granular, more contextual)
- Free tier sees: "Mondays: 50% completion rate"
- Pro tier sees: "Mondays seem hard for the 8am Job Hunt block. The pattern suggests you might do better starting at 10am — would you like to try that?"

### 4.27 `feature_announcements` (Forum Framework Placeholder)

This is the **forum-readiness placeholder** — built now so the future forum can plug in cleanly. Currently used only for admin-pinned announcements visible on the feedback page (e.g., "We're aware of the timer bug, fix coming Tuesday").

```sql
CREATE TABLE feature_announcements (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  admin_user_id   VARCHAR(30)   NOT NULL,

  title           VARCHAR(200)  NOT NULL,
  body            TEXT          NOT NULL,

  is_pinned       BOOLEAN       NOT NULL DEFAULT FALSE,
  is_visible      BOOLEAN       NOT NULL DEFAULT TRUE,

  expires_at      TIMESTAMP(3)  NULL DEFAULT NULL,    -- Optional auto-hide

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_announcements_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_announcements_visible (is_visible, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Future forum integration path:** when/if a forum is added later, a `forum_threads` table can reference `feature_announcements.id` for sticky/featured threads. The schema doesn't lock that future decision in either direction — it just leaves the door open.

### 4.28 `admin_actions`

Admin-specific audit log. Separate from `audit_log` (which captures user-side events) because admin actions need different fields, longer retention, and stricter access control.

```sql
CREATE TABLE admin_actions (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,

  admin_user_id   VARCHAR(30)   NULL DEFAULT NULL,    -- The acting admin (NULL only after their account deleted)
  target_user_id  VARCHAR(30)   NULL DEFAULT NULL,    -- The user being acted upon (NULL for system-wide actions)
  target_resource_type VARCHAR(80) NULL DEFAULT NULL, -- 'praise_memo', 'feedback_item', 'body_doubling_report', etc.
  target_resource_id VARCHAR(30) NULL DEFAULT NULL,

  action          VARCHAR(80)   NOT NULL,
  -- Examples:
  --   'user.pause', 'user.suspend', 'user.unsuspend', 'user.unpause'
  --   'user.soft_delete', 'user.cancel_delete', 'user.emergency_delete'
  --   'user.grant_comp', 'user.revoke_comp', 'user.grant_feature', 'user.revoke_feature'
  --   'user.force_signout', 'user.force_password_reset'
  --   'content.review_memo', 'content.approve_memo', 'content.remove_memo'
  --   'feedback.update_status', 'feedback.pin', 'feedback.mark_duplicate'
  --   'admin.grant_permission', 'admin.revoke_permission'
  --   'announcement.create', 'announcement.update', 'announcement.delete'
  --   'billing.refund', 'billing.cancel_subscription'

  -- Justification — REQUIRED for non-trivial actions, enforced at app layer
  justification   TEXT          NULL DEFAULT NULL,

  -- Action metadata (action-specific fields)
  metadata        JSON          NULL DEFAULT NULL,
  -- Examples:
  --   For 'user.pause': { "duration_days": 7, "reason": "Reported abuse, cooling-off" }
  --   For 'user.grant_comp': { "duration": "permanent" | "30_days", "reason": "Beta tester" }
  --   For 'content.remove_memo': { "report_id": "...", "decision": "violates_policy" }

  -- Snapshot of state before the action (for reversibility & forensics)
  state_before    JSON          NULL DEFAULT NULL,

  ip_address      VARBINARY(16) NULL DEFAULT NULL,
  user_agent      VARCHAR(500)  NULL DEFAULT NULL,

  occurred_at     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_admin_actions_admin FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_admin_actions_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_admin_actions_admin_time (admin_user_id, occurred_at DESC),
  KEY idx_admin_actions_target_time (target_user_id, occurred_at DESC),
  KEY idx_admin_actions_action (action),
  KEY idx_admin_actions_time (occurred_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**No FK CASCADE on admin or target — set NULL on deletion.** Like the regular audit_log, admin actions persist past deletion of the involved users. This is essential for compliance and forensic purposes.

**Justification requirement (enforced at app layer):**
- Required for: pause, suspend, soft_delete, emergency_delete, content removal, grant_admin, revoke_admin
- Optional for: read-only actions, routine status updates, low-stakes operations
- Free-text but stored — admins are accountable for what they write

**State snapshot (`state_before`):**
- Captured before destructive actions to allow potential rollback
- E.g., before suspending: `{ "previous_state": "active" }`
- Before granting comp: `{ "previous_tier": "free" }`
- Used by the "undo" affordance in admin UI

### 4.29 `content_reports`

Tracks user reports of content (praise memos, body doubling participants) for moderator review. This implements Option A reactive moderation per doc 01 §10.

```sql
CREATE TABLE content_reports (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,

  reporter_user_id VARCHAR(30)  NOT NULL,             -- Who reported
  reported_user_id VARCHAR(30)  NULL DEFAULT NULL,    -- Who was reported (if applicable)

  content_type    ENUM('praise_memo', 'body_doubling_session', 'feedback_item', 'other')
                  NOT NULL,
  content_id      VARCHAR(30)   NULL DEFAULT NULL,    -- ID of the reported content

  reason_category ENUM('inappropriate', 'harassment', 'spam', 'illegal', 'other')
                  NOT NULL,
  reason_details  TEXT          NULL DEFAULT NULL,

  status          ENUM('pending_review', 'reviewing', 'resolved_no_action', 'resolved_action_taken', 'duplicate')
                  NOT NULL DEFAULT 'pending_review',

  -- Review fields (populated by moderator/admin)
  reviewed_by_admin_id VARCHAR(30) NULL DEFAULT NULL,
  reviewed_at     TIMESTAMP(3)  NULL DEFAULT NULL,
  review_notes    TEXT          NULL DEFAULT NULL,
  action_taken    VARCHAR(80)   NULL DEFAULT NULL,    -- e.g., 'memo_removed', 'user_warned', 'user_paused'

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reported FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_reports_reviewer FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_reports_status_created (status, created_at DESC),
  KEY idx_reports_reported_user (reported_user_id, created_at DESC),
  KEY idx_reports_content (content_type, content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Notes:**
- **Reactive moderation only:** moderators view memo content ONLY when there's a report referencing it
- The existing `body_doubling_reports` table from M11 should be **migrated into `content_reports`** with `content_type = 'body_doubling_session'`. This unifies the moderation queue into one workflow.
- Once a report is created, the moderator gains *time-bounded* access to the relevant content via signed URLs that expire after review
- All access is logged in `admin_actions` with `action = 'content.review_memo'` etc.

### 4.30 `mini_game_sessions`

Tracks user sessions of the built-in mini-games (Pattern Match, Reaction Tiles, Word Builder). Hard rules are encoded structurally:
- No high scores, no leaderboards
- Cooldown enforced at the schema layer
- Sessions auto-end at 10-minute timer
- Pre-task primer mode tracked separately for cooldown bypass logic

```sql
CREATE TABLE mini_game_sessions (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,

  game_key        ENUM('pattern_match', 'reaction_tiles', 'word_builder')
                  NOT NULL,

  -- Session timing
  started_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at        TIMESTAMP(3)  NULL DEFAULT NULL,
  duration_seconds INT UNSIGNED NULL DEFAULT NULL,

  -- How the session ended
  end_reason      ENUM('completed', 'timer_expired', 'user_skipped', 'page_closed')
                  NULL DEFAULT NULL,

  -- Pre-task primer flag — when true, this session was launched as warmup before a task
  is_pretask_primer BOOLEAN     NOT NULL DEFAULT FALSE,
  primer_for_task_id VARCHAR(30) NULL DEFAULT NULL,    -- The task this primed for (if any)

  -- Optional engagement signal (NOT a score — just internal tracking for game tuning)
  -- This is NEVER displayed to the user
  internal_engagement_signal JSON NULL DEFAULT NULL,
  -- Example: { "rounds_completed": 12, "abandoned_at_round": null }

  CONSTRAINT fk_mgs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mgs_task FOREIGN KEY (primer_for_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  KEY idx_mgs_user_started (user_id, started_at DESC),
  KEY idx_mgs_user_game (user_id, game_key, started_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Cooldown enforcement (application layer):**

Cooldown is enforced via this query at session-start time:

```sql
-- Block new session if last regular session was within cooldown window
-- Pre-task primer sessions BYPASS this cooldown (separate path)
SELECT MAX(started_at) AS last_session
FROM mini_game_sessions
WHERE user_id = ?
  AND is_pretask_primer = FALSE
  AND started_at > NOW() - INTERVAL ? HOUR;  -- ? = user's configured cooldown hours
-- If last_session is non-null, block. Show "next available at..." UI.
```

**Game inventory rationale:**
- `pattern_match` — visual matching, low stimulation, ~5 min
- `reaction_tiles` — color/shape reaction, moderate stimulation, ~5 min
- `word_builder` — anagram-style, cognitive engagement, ~5-10 min

**Hard 10-minute timer rule:**
- Each game has a built-in countdown
- At 10 minutes, the game gracefully ends regardless of user state
- `end_reason = 'timer_expired'` is logged
- The user is then offered handoff to next task or focus timer (per seamless handoff principle)

**No score storage:**
- The schema deliberately does NOT have a `score` or `result` column
- `internal_engagement_signal` exists for our internal tuning ONLY; never surfaced to user
- This structurally prevents future developers from adding leaderboards or high-score tables

### 4.31 `movement_prompts_log`

Tracks movement prompt firings and user responses. Used for analytics, prompt library tuning, and giving users (opt-in) a sense of their movement patterns.

```sql
CREATE TABLE movement_prompts_log (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,

  prompt_key      VARCHAR(80)   NOT NULL,             -- e.g., 'tier1_brisk_walk', 'tier3_deep_breath'
  prompt_tier     ENUM('tier1_aerobic', 'tier2_cognitive', 'tier3_mind_body')
                  NOT NULL,

  -- Context for the prompt
  triggered_by    ENUM('focus_session_10_3', 'long_session', 'manual_request', 'routine')
                  NOT NULL,
  focus_session_id VARCHAR(30)  NULL DEFAULT NULL,

  -- User response
  user_response   ENUM('accepted', 'snoozed', 'dismissed', 'no_response')
                  NOT NULL DEFAULT 'no_response',
  response_at     TIMESTAMP(3)  NULL DEFAULT NULL,

  -- If accepted, did they log completion?
  movement_logged BOOLEAN       NOT NULL DEFAULT FALSE,
  movement_duration_seconds INT UNSIGNED NULL DEFAULT NULL,

  fired_at        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_mpl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mpl_session FOREIGN KEY (focus_session_id) REFERENCES focus_sessions(id) ON DELETE SET NULL,
  KEY idx_mpl_user_fired (user_id, fired_at DESC),
  KEY idx_mpl_response (user_response, fired_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Movement Prompt Library** (referenced by `prompt_key`, defined in code or seeded):

```typescript
// packages/domain/src/movement/prompts.ts
export const MOVEMENT_PROMPTS = [
  // Tier 1: Aerobic (Dopamine Amplifier)
  { key: 'tier1_brisk_walk',     tier: 'tier1_aerobic', text: 'A brisk 3-minute walk?', icon: 'Footprints' },
  { key: 'tier1_jumping_jacks',  tier: 'tier1_aerobic', text: '20 jumping jacks?', icon: 'Activity' },
  { key: 'tier1_dance',          tier: 'tier1_aerobic', text: 'Put on music and dance for 2 minutes?', icon: 'Music' },
  { key: 'tier1_stairs',         tier: 'tier1_aerobic', text: 'A flight of stairs and back?', icon: 'TrendingUp' },

  // Tier 2: Cognitive (Cerebellum Boosters)
  { key: 'tier2_juggle',         tier: 'tier2_cognitive', text: 'Try juggling 2 objects for a minute?', icon: 'Repeat' },
  { key: 'tier2_balance',        tier: 'tier2_cognitive', text: 'Stand on one foot for 30 seconds, switch?', icon: 'Move' },
  { key: 'tier2_cross_crawl',    tier: 'tier2_cognitive', text: 'Cross-crawl exercise (right knee + left elbow alternating)?', icon: 'Move' },

  // Tier 3: Mind-Body (Inhibitory Control)
  { key: 'tier3_deep_breath',    tier: 'tier3_mind_body', text: '3 deep breaths, slow exhale?', icon: 'Wind' },
  { key: 'tier3_neck_stretch',   tier: 'tier3_mind_body', text: 'Gentle neck rolls and shoulder shrugs?', icon: 'User' },
  { key: 'tier3_yoga_warrior',   tier: 'tier3_mind_body', text: 'Hold warrior pose for 30 seconds each side?', icon: 'User' },
  { key: 'tier3_body_scan',      tier: 'tier3_mind_body', text: '60-second body scan: where are you holding tension?', icon: 'User' },
];
```

**Selection logic:**
- User can configure preferred tier(s) in settings (default: all three rotated)
- Prompts within a tier rotate to avoid repetition
- A user with `prefers-reduced-motion` set is shown only Tier 3 (mind-body) prompts by default
- Cooldown: same prompt not shown within 24 hours

### 4.32 Updates to `users.preferences` JSON

The `preferences` JSON column on `users` (defined in §4.1) gets new keys for these features:

```json
{
  "theme": "dark",
  "soundFamily": "soft_chimes",
  "reducedMotion": false,
  "timeZone": "America/Los_Angeles",
  "weekStartsOn": "monday",
  
  "antiShameLanguageMode": "diminishing",
  "// values: 'always_explicit' | 'diminishing' | 'mostly_neutral' | 'always_neutral'": null,
  "// 'diminishing' is default; explicit on first encounter, neutral after": null,
  
  "miniGamesEnabled": true,
  "miniGameCooldownHours": 3,
  "// minimum 1, maximum 24, default 3": null,
  
  "movementPromptsEnabled": true,
  "movementPromptTiers": ["tier1_aerobic", "tier2_cognitive", "tier3_mind_body"],
  "tenThreeRuleEnabled": false,
  "// when true, focus timer suggests 3-min movement after each 10-min block": null,
  
  "questLogModeEnabled": false,
  "// gamification flair on routines/tasks (quest log framing, level-up animations)": null,
  
  "speedRunChallengesEnabled": false,
  "// optional 'complete 2 tasks in 15 min' challenges, opt-in only": null
}
```

**Defaults are conservative** — most flair-adding features default OFF so users opt into the gamification rather than out of it. Design principle: don't force engagement-pattern features on people who may have ambivalent feelings about them.

### 4.33 Tracking Anti-Shame Language Encounters

To support the "diminishing didactic" mode, we need to know whether a user has encountered each anti-shame message before. Adding to schema:

```sql
CREATE TABLE message_encounters (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,

  message_key     VARCHAR(80)   NOT NULL,
  -- Examples:
  --   'minigame_first_intro'
  --   'movement_break_first_intro'
  --   'quest_log_first_intro'
  --   'speedrun_first_intro'

  first_seen_at   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  encounter_count INT UNSIGNED  NOT NULL DEFAULT 1,
  last_seen_at    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_me_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_me (user_id, message_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Used by:** `getMessageVariant(userId, messageKey)` helper that returns:
- `'explicit'` if user is in `always_explicit` mode, OR `diminishing` mode AND encounter_count ≤ 2
- `'neutral'` if user is in `always_neutral` mode, OR `diminishing` mode AND encounter_count > 2, OR `mostly_neutral` mode
- (mostly_neutral switches to explicit only when distress signals detected — heuristic for v2; for v1 it behaves like always_neutral)

This pattern lets each feature provide both message variants in code, and the helper picks the right one transparently.

### 4.34 `biddy_sessions`

Tracks user sessions with the AI Body Double Companion ("Biddy"). Hard rules are encoded structurally:
- Soft 90-minute session limit with gentle break prompt
- 4-hour daily total cap
- No chat/text input field on biddy_sessions (Biddy is silent presence, not conversational)
- No personalization that promotes parasocial attachment

```sql
CREATE TABLE biddy_sessions (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,

  -- Avatar category — 'creature' for v1; 'companion' is scaffolded for future humanoids (currently no entries)
  avatar_category ENUM('creature', 'companion') NOT NULL DEFAULT 'creature',

  -- Avatar selection
  -- v1 ships with creature options only. Companion (humanoid) entries are reserved
  -- for future addition pending community demand. Adding them later requires only an
  -- ALTER TABLE to extend the ENUM — no other schema changes needed.
  avatar_key      ENUM(
                    'cat', 'robot', 'blob', 'plant', 'fox', 'owl'
                    -- Future: humanoid companion entries will go here, e.g.:
                    -- , 'companion_a', 'companion_b', etc.
                    -- See Doc 02 §15.3 Category B for the design framework
                  ) NOT NULL DEFAULT 'cat',

  -- Activity Biddy is "doing" during this session
  activity_key    ENUM('computer', 'reading', 'knitting', 'cleaning', 'random')
                  NOT NULL DEFAULT 'random',

  -- Optional: link to user's task or focus session
  paired_task_id  VARCHAR(30)   NULL DEFAULT NULL,
  paired_focus_session_id VARCHAR(30) NULL DEFAULT NULL,

  -- Session timing
  started_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at        TIMESTAMP(3)  NULL DEFAULT NULL,
  duration_seconds INT UNSIGNED NULL DEFAULT NULL,

  -- How the session ended
  end_reason      ENUM('user_ended', 'soft_limit_break', 'soft_limit_extended', 'daily_cap_reached', 'page_closed')
                  NULL DEFAULT NULL,

  -- Soft limit handling
  soft_limit_warned_at TIMESTAMP(3) NULL DEFAULT NULL,
  user_extended_session BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT fk_biddy_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_biddy_task FOREIGN KEY (paired_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  CONSTRAINT fk_biddy_focus FOREIGN KEY (paired_focus_session_id) REFERENCES focus_sessions(id) ON DELETE SET NULL,
  KEY idx_biddy_user_started (user_id, started_at DESC),
  KEY idx_biddy_user_active (user_id, ended_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Avatar inventory (v1):**

*Creatures (the only populated category in v1):*
- `cat` — sleepy cat doing activities
- `robot` — friendly desk robot
- `blob` — amorphous creature with personality
- `plant` — anthropomorphized plant
- `fox` — cozy fox with notebook
- `owl` — wise owl

*Companions (scaffolded but not populated in v1):*

The Companion category is structurally present (in schema, in UI logic, in message-key registry) but contains zero avatars at v1 launch. The decision was deliberate — see Doc 02 §15.3 Category B for full reasoning. The category remains in the schema so future additions (community-demand-driven) plug in without redesign.

**To add humanoid avatars later:**
1. `ALTER TABLE biddy_sessions MODIFY avatar_key ENUM(...)` to extend the enum
2. Add corresponding SVG asset files under the same naming convention
3. Update the UI category selector to show the Companion tab
4. Verify `humanoid_first_use` first-use disclosure fires on first selection
5. Diversity intent: never ship with a single humanoid; minimum of 3 with deliberate variety in age, ethnicity, gender presentation, visible disability

**Why two categories despite v1 only using one:**
1. Removing and re-adding the `avatar_category` column later costs more than leaving it dormant
2. The category architecture documents the design decision (humanoid avatars warrant additional caution)
3. The `humanoid_first_use` message key is registered now so future code paths reference it consistently
4. Future analytics can correlate avatar category with session patterns without retroactive migration

The 90-min soft / 240-min daily hard caps apply to all avatars regardless of category.

**Activity inventory:**
- `computer` — Biddy working at a laptop (typing, mouse, etc.)
- `reading` — Biddy reading a book
- `knitting` — Biddy working needles/yarn
- `cleaning` — Biddy wiping/tidying
- `random` — system rotates activities every ~10 minutes

Each activity is backed by a **weighted set of 12 animations** (1 main + 11 variations), selected at runtime via the weighted-random selector. The chosen animation file is a presentation concern (see Doc 02 §15.2.1 and `animation-manifest.json`); the database only stores the `activity_key`, not the specific animation slot. Which variation played is ephemeral and not persisted.

**Soft limit logic (90 min):**
1. At 90 minutes elapsed, fire `biddy:soft-limit-reached` event
2. Show gentle prompt: "Want to take a break? You've been with Biddy for 90 minutes."
3. User options: "End session" | "Take 5-min break" | "Continue (15 more min)"
4. If user extends, log `user_extended_session=TRUE`
5. Extensions can repeat, but each shows the prompt again

**Daily cap logic (4 hours):**
- Sum `duration_seconds` for user's sessions today (UTC date)
- When total reaches 14400 seconds (4 hours), HARD-end any active session
- New session attempts blocked until next UTC date rollover
- Show: "You've spent 4 hours with Biddy today. Biddy will be back tomorrow."
- This is the ONLY hard limit in Biddy — the soft 90-minute limit can be extended; the 4-hour daily cap cannot

**Why no chat field in this schema:**
Biddy is presence, not conversation. The A core rule: adding chat would invite parasocial attachment and turn Biddy into a substitute for human relationship. The schema structurally prevents this — there is no `messages` table, no `biddy_messages` table, no field for Biddy to "say" anything to the user.

**Privacy boundary:**
- Biddy session data is strictly per-user
- The activity choices are NOT analyzed by AI to "improve" anything
- `paired_task_id` is optional metadata only — Biddy doesn't "know" what the task is

### 4.35 Updates to `tasks` table for Module G

The existing `tasks` table (defined in §4.5) gets new columns for Module G:

```sql
-- Add to tasks table:
ALTER TABLE tasks
  ADD COLUMN estimated_minutes SMALLINT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN estimated_minutes_source ENUM('user', 'ai_suggestion', 'template') NULL DEFAULT NULL,
  ADD COLUMN estimated_at TIMESTAMP(3) NULL DEFAULT NULL,
  ADD COLUMN actual_completion_seconds INT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN time_bender_badge_awarded BOOLEAN NOT NULL DEFAULT FALSE;
```

**Field semantics:**
- `estimated_minutes` — user's estimate (or AI-suggested estimate) for how long the task will take. Stored in minutes (the unit users think in).
- `estimated_minutes_source` — provenance for analytics and trust calibration
  - `'user'` — user typed this themselves
  - `'ai_suggestion'` — Pro tier feature; AI suggested based on historical data
  - `'template'` — inherited from a task template
- `estimated_at` — when the estimate was set (for staleness detection if user re-estimates later)
- `actual_completion_seconds` — silently tracked time from focus_session aggregate. Stored in **seconds** for precision (a task estimated at 30 min that completes in 29:50 should earn the Time-Bender badge).
- `time_bender_badge_awarded` — flag preventing duplicate badge awards if task is reopened

**Comparison logic (badge awarding):**
```typescript
// In packages/domain/src/tasks/badges.ts
const estimatedSeconds = task.estimated_minutes * 60;
if (task.actual_completion_seconds < estimatedSeconds) {
  awardBadge(userId, 'time_bender');
  task.time_bender_badge_awarded = true;
}
```

**Critical UX rules (enforced at app layer):**
- `actual_completion_seconds` is **NEVER** displayed by default during the task
- Hidden until task is complete, AND only shown if user opts in via setting
- Even when shown, it's a static number (no countdown, no color change, no urgency cues)
- Displayed in human-friendly format ("24m 30s" not "1470")

### 4.36 `etc_calibration_history`

Tracks user's estimate accuracy over time. Used by AI suggestion system (Pro feature) and by user's own opt-in patterns view.

```sql
CREATE TABLE etc_calibration_history (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,
  task_id         VARCHAR(30)   NULL DEFAULT NULL,    -- NULL after task deleted

  -- The estimate vs reality
  estimated_minutes  SMALLINT UNSIGNED NOT NULL,
  actual_minutes     SMALLINT UNSIGNED NOT NULL,

  -- The ratio (actual / estimated) — useful for spotting patterns
  -- Stored for query speed; NEVER shown to user as a raw number
  accuracy_ratio  DECIMAL(5,2)  NOT NULL,
  -- Examples: 1.0 = perfect, 1.5 = took 50% longer than estimated, 0.8 = finished 20% early

  -- Categorization for AI suggestions
  task_kind_tag   VARCHAR(80)   NULL DEFAULT NULL,    -- e.g., 'email', 'creative', 'admin'
  estimate_source ENUM('user', 'ai_suggestion', 'template') NOT NULL,

  -- Metadata (priority snapshot at completion, new anchor/flexible model)
  task_priority_kind  ENUM('anchor', 'flexible') NULL DEFAULT NULL,
  task_priority_level ENUM('cant_miss', 'high', 'med', 'low') NULL DEFAULT NULL,
  completed_at    TIMESTAMP(3)  NOT NULL,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_etc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_etc_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  KEY idx_etc_user_completed (user_id, completed_at DESC),
  KEY idx_etc_user_kind (user_id, task_kind_tag, completed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Soft-track principle applied here:**
- This table is the source of truth for AI estimates and patterns
- The user can view aggregated calibration data in the (opt-in) Patterns view
- Patterns view shows it as **growth data** ("Your estimates are 15% closer than 30 days ago")
- NEVER shown as failure data ("You exceed estimates 60% of the time")
- The `accuracy_ratio` column is for AI consumption, not user display

### 4.37 New Badges for Module G

Add to badge seed data (per §8 of this doc):

```typescript
{
  badge_key: 'time_bender',
  display_name: 'Time-Bender',
  description: 'Completed a task faster than your estimate',
  tier: 'silver',
  is_repeatable: true,
  // Earned automatically when task completes AND actual_completion_seconds < (estimated_minutes * 60)
}

{
  badge_key: 'time_bender_streak_3',
  display_name: 'Triple Time-Bender',
  description: 'Earned the Time-Bender badge 3 times',
  tier: 'gold',
  is_repeatable: false,
  // One-time milestone, fires when user accumulates 3 time_bender badges
  // NOT a maintained streak — three lifetime under-estimates triggers it once
}

{
  badge_key: 'estimate_first',
  display_name: 'First Estimator',
  description: 'Set your first time estimate on a task',
  tier: 'bronze',
  is_repeatable: false,
}

{
  badge_key: 'calibrating_well',
  display_name: 'Calibrating',
  description: 'Improved your estimate accuracy over a 30-day window',
  tier: 'gold',
  is_repeatable: true,
  // Awarded by daily cron job that compares accuracy_ratio averages
}
```

**Critical badge rules from Module G spec:**
- Bronze "task complete" badge ALWAYS awarded for completion (existing behavior)
- Time-Bender silver badge awarded ONLY when `actual_completion_seconds < (estimated_minutes * 60)` (bonus)
- `time_bender_streak_3` is a **lifetime milestone**, not a maintainable streak that can break — fires once when user has accumulated 3 lifetime time_benders
- **No "Slow" or "Overdue" badge exists.** Exceeding estimate is NEVER a negative event.
- Exceeding the estimate generates `etc_calibration_history` data silently — that's it
- The A core rule: "Calibration data, not judgment."

### 4.38 Updates to `users.preferences` JSON for Biddy and Module G

Adding to existing preferences structure:

```json
{
  "// Biddy preferences": null,
  "biddyEnabled": true,
  "biddyDefaultAvatar": "cat",
  "biddyDefaultActivity": "random",
  "biddySessionLimitMinutes": 90,
  "// User can lower below 90 but not raise above 120 (usage safeguard)": null,
  "biddyDailyCapMinutes": 240,
  "// HARD value, not user-configurable; documented for transparency": null,
  "biddyShowGuardrailReminders": true,
  "// Toggle for the 'Biddy is a tool' messaging at session end": null,

  "// Module G preferences": null,
  "moduleGEnabled": true,
  "moduleGAutoSuggestETC": true,
  "// When true, AI suggestion offered as a default option (Pro tier only)": null,
  "showElapsedTimeInTask": false,
  "// HARD DEFAULT FALSE per spec": null,
  "showElapsedTimeAfterCompletion": false,
  "// Even after task done, default false; user opts in": null,
  "etcAiSuggestionsEnabled": true,
  "// Pro feature; ignored for free users": null,
  "etcCalibrationPatternsEnabled": false
}
```

### 4.39 `mindfulness_sessions`

Tracks user sessions with the Module H mindfulness exercise library. Hard rules are encoded structurally:
- **No completion percentage tracking** that could feel like a performance metric
- **Acute (in-spiral) sessions tracked separately** so they can be excluded from any "patterns" analysis
- **No streak counters** — banned globally, including here
- **First-use cautions disclosure tracked** to ensure it shows once

```sql
CREATE TABLE mindfulness_sessions (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,

  -- Which exercise was selected
  exercise_key    ENUM(
                    'sensory_grounding_54321',
                    'three_breath_reset',
                    'micro_body_scan',
                    'four_step_reset'
                  ) NOT NULL,

  -- Entry mode — important for clinical analysis
  entry_mode      ENUM('calm', 'acute_overwhelmed', 'biddy_disabled', 'system_suggestion')
                  NOT NULL,
  -- 'calm'              = user opened bottom bar, browsed library, picked exercise
  -- 'acute_overwhelmed' = user used "Quick Reset" button, went straight to 5-4-3-2-1
  -- 'system_suggestion' = system suggested at workflow transition, user accepted
  -- 'biddy_disabled'    = (reserved; see notes below — currently unused)

  -- What triggered the session (more granular than entry_mode)
  trigger_context VARCHAR(80)   NULL DEFAULT NULL,
  -- Examples for system_suggestion:
  --   'task_completion', 'long_focus_end', 'body_doubling_end', 'routine_boundary'
  -- For calm: NULL (user-initiated browse)
  -- For acute: NULL (no specific trigger; user pressed the overwhelmed button)

  -- Optional pairing with related entities
  paired_task_id  VARCHAR(30)   NULL DEFAULT NULL,
  paired_focus_session_id VARCHAR(30) NULL DEFAULT NULL,

  -- Session timing
  started_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at        TIMESTAMP(3)  NULL DEFAULT NULL,
  duration_seconds SMALLINT UNSIGNED NULL DEFAULT NULL,

  -- How the session ended (no shame framing — these are all neutral)
  end_reason      ENUM('completed', 'user_exited', 'page_closed', 'session_too_long_auto_ended')
                  NULL DEFAULT NULL,

  CONSTRAINT fk_mindful_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mindful_task FOREIGN KEY (paired_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  CONSTRAINT fk_mindful_focus FOREIGN KEY (paired_focus_session_id) REFERENCES focus_sessions(id) ON DELETE SET NULL,
  KEY idx_mindful_user_started (user_id, started_at DESC),
  KEY idx_mindful_user_entry (user_id, entry_mode, started_at DESC),
  KEY idx_mindful_user_acute (user_id, entry_mode, started_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Why `acute_overwhelmed` is tracked separately:**

The Design rationale: a user using the acute flow is in a different cognitive state than one browsing the library. We separate them so:
- Patterns view (opt-in) can EXCLUDE acute sessions from "your mindfulness habits" analysis
- Frequent acute sessions could indicate a user struggling more — but we should NEVER expose this to the user as judgment
- The data exists for the user's own self-analysis if they enable patterns view, framed as completion data only

**Auto-end safeguard:** if a session has `started_at` more than 30 minutes old without an `ended_at`, the cron dispatcher marks it ended with reason `session_too_long_auto_ended`. This prevents orphaned sessions from page-close events.

### 4.40 Mindfulness Exercise Library

Defined in code (not seeded), referenced by `mindfulness_sessions.exercise_key`:

```typescript
// packages/domain/src/mindfulness/exercises.ts
export const MINDFULNESS_EXERCISES = [
  {
    key: 'sensory_grounding_54321',
    display_name: '5-4-3-2-1 Sensory Grounding',
    short_description: 'Anchor in the present using your senses',
    estimated_duration_seconds: 180,  // 3 minutes
    category: 'grounding',
    suitable_for_acute: true,    // The primary acute-flow exercise
    cautions: 'none',   // Universally safe
    steps: [
      { duration: 30, prompt: 'Look around. Name 5 things you can see.', interaction: 'count_5' },
      { duration: 30, prompt: 'Name 4 things you can touch.', interaction: 'count_4' },
      { duration: 30, prompt: 'Name 3 things you can hear.', interaction: 'count_3' },
      { duration: 30, prompt: 'Name 2 things you can smell.', interaction: 'count_2' },
      { duration: 30, prompt: 'Name 1 thing you can taste.', interaction: 'count_1' },
      { duration: 30, prompt: 'Take three slow breaths.', interaction: 'breaths_3' },
    ],
  },
  {
    key: 'three_breath_reset',
    display_name: 'Three-Breath Reset',
    short_description: 'A 60-second breathing pause',
    estimated_duration_seconds: 60,
    category: 'breath',
    suitable_for_acute: false,
    cautions: 'none',
    steps: [
      { duration: 20, prompt: 'Breath one: inhale slowly... hold... exhale fully.', interaction: 'breath' },
      { duration: 20, prompt: 'Breath two: inhale slowly... hold... exhale fully.', interaction: 'breath' },
      { duration: 20, prompt: 'Breath three: inhale slowly... hold... exhale fully. Notice.', interaction: 'breath' },
    ],
  },
  {
    key: 'micro_body_scan',
    display_name: 'Micro Body Scan',
    short_description: 'A 90-second tense-and-release through your body',
    estimated_duration_seconds: 90,
    category: 'body',
    suitable_for_acute: false,
    cautions: 'body_awareness',  // Triggers first-use informational note about body-focused exercises
    steps: [
      { duration: 15, prompt: 'Tense your shoulders. Hold... and release.', interaction: 'tense_release' },
      { duration: 15, prompt: 'Tense your hands into fists. Hold... and release.', interaction: 'tense_release' },
      { duration: 15, prompt: 'Tense your stomach. Hold... and release.', interaction: 'tense_release' },
      { duration: 15, prompt: 'Tense your legs. Hold... and release.', interaction: 'tense_release' },
      { duration: 15, prompt: 'Tense your face muscles. Hold... and release.', interaction: 'tense_release' },
      { duration: 15, prompt: 'Notice your whole body. Soft. Settled.', interaction: 'notice' },
    ],
  },
  {
    key: 'four_step_reset',
    display_name: 'Four-Step Emotional Reset',
    short_description: 'Process intense emotions with self-compassion',
    estimated_duration_seconds: 240,  // 4 minutes
    category: 'emotion_regulation',
    suitable_for_acute: true,
    cautions: 'high_distress',
    // For users in significant distress, suggest grounding (5-4-3-2-1) instead — it's faster and uses less working memory
    steps: [
      {
        duration: 60,
        prompt: 'RECOGNIZE: What are you feeling right now? Just name it. Frustration? Hurt? Anger? You don\'t need to fix it — just see it.',
        interaction: 'reflect',
      },
      {
        duration: 60,
        prompt: 'ALLOW: Let the feeling be there. You don\'t have to push it away or analyze it. It\'s okay that it\'s here.',
        interaction: 'reflect',
      },
      {
        duration: 60,
        prompt: 'INVESTIGATE: Where do you feel it in your body? Tightness? Heat? Heaviness? You\'re just observing — like a kind scientist.',
        interaction: 'reflect',
      },
      {
        duration: 60,
        prompt: 'NON-IDENTIFY: This feeling is moving through you. It is not who you are. You are the one noticing it. It will pass.',
        interaction: 'reflect',
      },
    ],
  },
];
```

**Exercise interaction types:**
- `count_N` — user taps "Done" or counts items mentally; advances when ready or timer elapses
- `breath` — visual breath circle expands/contracts; advances on timer
- `tense_release` — text guidance with timer; advances on timer
- `reflect` — minimal UI (just the prompt and a "Continue" button); user advances when ready

**No "skip" button mid-session.** Once started, user can EXIT (closing the session entirely) but cannot skip individual steps. This is a deliberate constraint — skipping creates a gamification dynamic we don't want here. The user can always end the session entirely without judgment.

### 4.41 `mindfulness_suggestion_log`

Tracks system-driven suggestions at workflow transitions. Used for backoff logic and (opt-in) pattern analysis.

```sql
CREATE TABLE mindfulness_suggestion_log (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,

  -- Trigger context
  trigger_event   ENUM('task_completion', 'long_focus_end', 'body_doubling_end', 'routine_boundary')
                  NOT NULL,
  trigger_entity_id VARCHAR(30) NULL DEFAULT NULL,    -- ID of the task, focus_session, etc.

  -- User response
  user_response   ENUM('accepted', 'dismissed', 'no_response')
                  NOT NULL DEFAULT 'no_response',
  response_at     TIMESTAMP(3)  NULL DEFAULT NULL,
  resulting_session_id VARCHAR(30) NULL DEFAULT NULL,  -- If accepted, the mindfulness_sessions row

  fired_at        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_msug_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_msug_session FOREIGN KEY (resulting_session_id) REFERENCES mindfulness_sessions(id) ON DELETE SET NULL,
  KEY idx_msug_user_fired (user_id, fired_at DESC),
  KEY idx_msug_user_response (user_id, user_response, fired_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Backoff logic (enforced at suggestion-time):**

```typescript
// packages/domain/src/mindfulness/suggestion-frequency.ts
async function shouldShowSuggestion(userId: string): Promise<boolean> {
  const recentDismissals = await prisma.mindfulnessSuggestionLog.count({
    where: {
      user_id: userId,
      user_response: 'dismissed',
      fired_at: { gte: subHours(new Date(), 24) },
    },
    orderBy: { fired_at: 'desc' },
    take: 5,
  });

  // 5+ consecutive dismissals → silent for 24 hours
  if (recentDismissals >= 5) return false;

  // 3+ recent dismissals → at most 1 per 4 hours
  if (recentDismissals >= 3) {
    const lastShown = await getLastSuggestionTime(userId);
    return !lastShown || differenceInHours(new Date(), lastShown) >= 4;
  }

  // Default: max 1 suggestion per 60 minutes
  const lastShown = await getLastSuggestionTime(userId);
  return !lastShown || differenceInMinutes(new Date(), lastShown) >= 60;
}
```

**Critical: suggestions are decoupled from Biddy.** A hard rule: Biddy does not "notice" the user. System suggestions appear in workflow UI (toast notifications, post-task completion screens) — never via Biddy speaking or reacting. This preserves Biddy as a quiet presence.

### 4.42 First-Use Cautions Disclosure

Tracked via the existing `message_encounters` table (defined in §4.33). New message keys:

- `mindfulness_first_intro` — general first-use note
- `bodyscan_cautions` — shown specifically before first body-scan exercise
- `acute_flow_first_use` — first time user uses "Quick Reset" button
- `humanoid_first_use` — registered in v1 but unused until Companion category is populated (scaffolding for future humanoid avatars)

The disclosure copy is in design system §17 (Module H UI patterns). Doc 04 just provides the tracking mechanism — the existing `message_encounters` table handles the "show once" logic.

### 4.43 Updates to `users.preferences` JSON for Module H

Adding to existing preferences structure:

```json
{
  "// Module H (Mindfulness) preferences": null,
  "mindfulnessEnabled": true,
  "mindfulnessSuggestionsMode": "standard",
  "// values: 'off' | 'limited' | 'standard'": null,
  "// 'off' = no system suggestions; bottom bar still works": null,
  "// 'limited' = only after long focus sessions (90+ min)": null,
  "// 'standard' = task completion, long focus, body doubling end, routine boundaries": null,
  "mindfulnessFavoriteExercise": null,
  "// Optional: user can pin a favorite for 1-tap access": null,
  "mindfulnessPatternsEnabled": false
}
```

**Default suggestion mode is `'standard'`** — but the backoff logic ensures it never becomes intrusive. Users uncomfortable with any system-driven prompts can set to `'off'` and use the bottom bar manually.

---

### 4.44 Nourishment Tracking — Settings

The Nourishment HUD (water + food tracking) is a survival-game-style overlay in the workspace. This table holds the user's configurable goals and mealtimes.

```sql
CREATE TABLE nourishment_settings (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,

  -- Water goal (glasses per day). Default 8. Editable in settings.
  water_goal      TINYINT UNSIGNED NOT NULL DEFAULT 8,

  -- Mealtimes: ordered array of "HH:MM" strings in the user's local time.
  -- The count of entries IS the daily meal goal (e.g. 3 entries = goal of 3 meals).
  -- Example: ["08:00", "12:30", "18:30"]
  mealtimes       JSON          NOT NULL,

  -- Whether the HUD is shown at all (user can hide the whole feature)
  hud_enabled     BOOLEAN       NOT NULL DEFAULT TRUE,

  -- Whether gentle reminders (pulse → glow) are enabled
  reminders_enabled BOOLEAN     NOT NULL DEFAULT TRUE,

  -- Grace window (minutes) after a mealtime passes before the food reminder begins.
  -- Default 45. Also used as a sane floor; see design spec.
  meal_grace_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 45,

  -- Hours since last water log before the water reminder begins. Default 2.
  water_reminder_hours TINYINT UNSIGNED NOT NULL DEFAULT 2,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_nourish_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_nourish_settings_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Notes:**
- One row per user (created lazily on first HUD use, seeded with defaults).
- `mealtimes` is validated as an array of `"HH:MM"` 24-hour strings, length 1–8 (see §10 JSON validation). The array length is the meal goal; there is no separate `meal_goal` column — this prevents the two from drifting out of sync.
- All reminder thresholds are user-editable per the design decision (water goal + mealtimes both configurable, with good defaults).

### 4.45 Nourishment Tracking — Daily Log

Tracks per-day counts. A new row is created per user per local day; the day rolls over at 04:00 **user-local** time (consistent with quota reset semantics, but computed in the user's timezone since nourishment is a personal daily rhythm).

```sql
CREATE TABLE nourishment_daily_log (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  user_id         VARCHAR(30)   NOT NULL,

  -- The local calendar day this row represents (date only, no time).
  log_date        DATE          NOT NULL,

  -- Running counts for the day
  water_count     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  meal_count      TINYINT UNSIGNED NOT NULL DEFAULT 0,

  -- Snapshot of the goals as they were on this day (so historical days
  -- aren't retroactively changed if the user later edits their settings).
  water_goal_snapshot TINYINT UNSIGNED NOT NULL,
  meal_goal_snapshot  TINYINT UNSIGNED NOT NULL,

  -- Badge award flags (so we never double-award within a day).
  -- Badges are daily-repeatable and streak-free (Rule 3): earned fresh each
  -- day, missing a day produces NOTHING (no shame, no broken streak).
  hydrated_badge_awarded     BOOLEAN NOT NULL DEFAULT FALSE,
  wellfed_badge_awarded      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Last-logged timestamps, used to compute reminder timing.
  last_water_at   TIMESTAMP(3)  NULL DEFAULT NULL,
  last_meal_at    TIMESTAMP(3)  NULL DEFAULT NULL,

  created_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  CONSTRAINT fk_nourish_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_nourish_log_user_date (user_id, log_date),
  KEY idx_nourish_log_user_date (user_id, log_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Notes:**
- `UNIQUE (user_id, log_date)` guarantees one row per user per day; logging a glass is an upsert that increments `water_count` and sets `last_water_at`.
- Goal snapshots mean a user who changes their water goal from 8→6 mid-week doesn't retroactively "complete" past days.
- Counts are clamped at their goal in the UI but the column allows over-logging if you later want to support "extra" glasses (no penalty either way; counting up only).
- **No per-event audit table.** We deliberately store only daily counts, not a timestamped row per glass/meal. This keeps the feature firmly in "did you nourish yourself?" territory and away from anything resembling detailed intake logging that could feed disordered patterns (see wellbeing note in design spec §19).

### 4.46 Nourishment — Reminder & Badge Logic

Reminder state is **computed, not stored** — the client derives it from `last_water_at`, `last_meal_at`, the configured thresholds, and the current time. No reminder-state column is needed.

```typescript
// packages/domain/src/nourishment/reminders.ts

// Water: reminder begins water_reminder_hours after last_water_at (or after
// day start if nothing logged yet). Two visual stages handled client-side:
// stage 1 = brief pulse (a few minutes), stage 2 = settle to quiet glow.
function waterReminderState(log, settings, now): 'none' | 'pulse' | 'glow' {
  const since = log.last_water_at ?? startOfLocalDay(now);
  const hrs = differenceInHours(now, since);
  if (log.water_count >= log.water_goal_snapshot) return 'none'; // goal met, rest easy
  if (hrs < settings.water_reminder_hours) return 'none';
  const minsIntoReminder = differenceInMinutes(now, addHours(since, settings.water_reminder_hours));
  return minsIntoReminder <= PULSE_STAGE_MINUTES ? 'pulse' : 'glow';
}

// Food: for each mealtime that has passed by > meal_grace_minutes and where
// meal_count hasn't been incremented to cover it, show the reminder.
// Same two-stage pulse → glow behavior.
function foodReminderState(log, settings, now): 'none' | 'pulse' | 'glow' {
  if (log.meal_count >= log.meal_goal_snapshot) return 'none';
  const dueMealtimes = settings.mealtimes.filter(mt =>
    minutesSinceLocalTime(mt, now) > settings.meal_grace_minutes
  );
  if (dueMealtimes.length <= log.meal_count) return 'none'; // logged enough to cover passed meals
  const mostRecentDue = latestPassed(dueMealtimes, settings.meal_grace_minutes, now);
  const minsIntoReminder = minutesSinceLocalTime(mostRecentDue, now) - settings.meal_grace_minutes;
  return minsIntoReminder <= PULSE_STAGE_MINUTES ? 'pulse' : 'glow';
}

const PULSE_STAGE_MINUTES = 3; // brief active pulse, then settle to passive glow
```

**Badge award (called after each successful log):**
```typescript
// Daily-repeatable, streak-free. Award once per day max. Missing a day = nothing.
function checkNourishmentBadges(log) {
  if (log.water_count >= log.water_goal_snapshot && !log.hydrated_badge_awarded) {
    awardBadge(log.user_id, 'hydrated');           // see §8 badge seed
    log.hydrated_badge_awarded = true;
  }
  if (log.meal_count >= log.meal_goal_snapshot && !log.wellfed_badge_awarded) {
    awardBadge(log.user_id, 'well_fed');           // see §8 badge seed
    log.wellfed_badge_awarded = true;
  }
}
```

**Inviolable-rule compliance:**
- Reminder colors are amber → settle to a soft amber glow. **Never red** (Rule 1).
- Reminders never escalate; they de-escalate (pulse → glow → just sits there). No nagging.
- Missing the goal produces **no message, no counter, no broken streak** (Rules 2, 3, 5). Silence on a miss; celebration on a hit.
- The whole HUD and its reminders are user-disableable (`hud_enabled`, `reminders_enabled`).

---

## 5. Real-Time Sync Strategy

### 5.1 Approach: Client-Initiated Short Polling

The original spec assumed Firestore's automatic real-time sync. We considered Server-Sent Events (SSE), but **Vercel Hobby plan's 10-second function timeout makes long-lived SSE connections impractical for v1**.

The chosen approach is **client-initiated short polling**:

- Client polls `GET /api/sync` every **5 seconds** while the tab is active
- Server returns events newer than the client's `since` timestamp
- Client merges into local Zustand store
- When tab is inactive (`document.hidden === true`), polling pauses
- When tab regains focus, immediate poll + resume

```typescript
// Pseudocode for client-side sync hook
function useSyncStream() {
  const [lastSync, setLastSync] = useState<string>(new Date().toISOString());

  useEffect(() => {
    if (document.hidden) return;

    const interval = setInterval(async () => {
      const events = await fetch(`/api/sync?since=${lastSync}`).then(r => r.json());
      events.forEach(processEvent);
      if (events.length > 0) setLastSync(events[events.length - 1].occurred_at);
    }, 5000);

    return () => clearInterval(interval);
  }, [lastSync]);
}
```

### 5.2 Why Short Polling Over SSE/WebSockets

For Focus Forge's scale and constraints:

| Concern | SSE | WebSockets | Short Polling |
|---|---|---|---|
| Vercel Hobby compatibility | ❌ Function timeout | ❌ Not supported | ✅ Works |
| Code complexity | Medium | High | Low |
| Battery impact (mobile) | Medium | Medium | Low (pauses on hidden) |
| Sync latency | <1s | <1s | ~5s |
| Server load (1000 users) | High (1000 open connections) | High | Low (~200 req/sec) |

The 5-second latency is **invisible to ADHD users for cross-device sync** — most users aren't watching two devices simultaneously. The our earlier concern about Point of Performance is satisfied: 5 seconds is well below human perception threshold for "is my note saved on my phone yet."

### 5.3 Optimistic UI

The frontend ALWAYS updates state immediately on user action via Zustand store mutation. The `/api/sync` endpoint is for **cross-device sync only**. This keeps the UI responsive even when the network is slow — important per the design mandate.

### 5.4 Migration Path

If the app grows to a scale where 5-second polling becomes insufficient (very-high-frequency collaboration features, live collaborative editing), migrate to:
1. **Vercel Edge Runtime SSE** (works on Pro plan, no timeout)
2. **Pusher / Ably** managed real-time service
3. **Supabase Realtime** if migrating off cPanel MySQL entirely

This is a Day 100 problem, not a Day 1 problem.

---

## 6. Migration Strategy

### 6.1 Tooling

**Prisma** with the MySQL connector is the recommended ORM and migration tool. Drizzle is a viable alternative. Prisma is preferred because:
- It generates migrations automatically from schema changes
- It's database-agnostic (same Prisma schema works on any MySQL 8.0+ provider)
- Excellent TypeScript types are auto-generated
- Good AI/Claude Code support

### 6.2 Migration Folder Structure

```
/db
  /migrations
    20260101000000_init.sql
    20260102000000_add_feature_grants.sql
    ...
  /seeds
    badges.sql
    initial_admin.sql
```

### 6.3 Initial Seed Data

The `badges` table needs seeding before the app works. Sample seeds in §8.

### 6.4 Provider Migration Hooks (Bluehost → Future Provider)

**The plan:** Start on Bluehost MySQL during development. Migrate to a managed provider (e.g., Aiven, DigitalOcean Managed MySQL, Railway) before public launch when concurrency limits or backup requirements demand it.

**Design rules to keep migration painless:**

1. **Connection details ALWAYS in environment variables** — never hardcoded
   ```env
   DATABASE_URL="mysql://user:pass@host:port/dbname"
   DATABASE_PROVIDER="bluehost"  # or "aiven", "digitalocean", "railway"
   ```
   Code can branch on `DATABASE_PROVIDER` if any tuning is provider-specific.

2. **Use only standard MySQL 8.0+ features** — no Bluehost-specific functions, no MariaDB-only syntax. The schema in this doc is already compatible with all major MySQL providers.

3. **Avoid stored procedures and database triggers.** All business logic lives in application code. Schema only describes data shape.

4. **Connection pooling:** when development → production, add a pooling layer. Options:
   - **Prisma's built-in connection pooling** (configure pool_size in DATABASE_URL)
   - **Vercel's serverless connection management** (configurable per project)
   - **PgBouncer-equivalent for MySQL** (if needed for very high concurrency, ProxySQL)

5. **Backups:** during Bluehost phase, set up cPanel automatic backups and weekly local SQL dumps. After migration, the managed provider handles backups; verify retention period covers your needs.

6. **Migration day playbook (when ready to switch providers):**
   - Step 1: Export full Bluehost MySQL dump: `mysqldump -h bluehost-host -u user -p dbname > backup.sql`
   - Step 2: Provision new provider, create empty database
   - Step 3: Import dump: `mysql -h new-host -u user -p newdb < backup.sql`
   - Step 4: Run Prisma migration check to confirm schema parity: `npx prisma migrate status`
   - Step 5: Update `DATABASE_URL` in Vercel project environment variables
   - Step 6: Redeploy. Verify connection in production.
   - Step 7: Keep Bluehost MySQL active in read-only mode for 7 days as fallback.
   - Step 8: After 7 days of stable operation, decommission Bluehost MySQL.

**Migration trigger criteria** — switch from Bluehost when ANY of these hits:
- 50+ concurrent active users (Bluehost connection limits start mattering)
- Database size approaches 1GB (Bluehost backup performance degrades)
- Audio/voice features generate sustained query load
- You sign up your first paid user (production stability becomes required, not optional)
- You need point-in-time recovery for a real incident

**Estimated migration effort:** 2-4 hours of careful work + 7-day verification period. The spec was written to make this straightforward.

---

## 7. Indexes Strategy

The dashboard is the most-hit query. It needs to return in <100ms.

### 7.1 The Backlog Query (full list — the "drawer", not the home screen)

This returns the full active set. **Important:** this is NOT the home screen. Per the core-loop design (doc 02 §14.5), the home screen is the Today view (§7.1.1), which shows only a small visible set. This query backs the deliberately-opened "all tasks" drawer.

```sql
-- Full active backlog, ordered by the anchor/flexible priority model
SELECT
  t.id, t.title, t.priority_kind, t.priority_level, t.status, t.scheduled_for, t.created_at,
  (SELECT COUNT(*) FROM task_steps s WHERE s.task_id = t.id) AS total_steps,
  (SELECT COUNT(*) FROM task_steps s WHERE s.task_id = t.id AND s.status = 'completed') AS done_steps
FROM tasks t
WHERE t.user_id = ?
  AND t.status IN ('active', 'deferred')
ORDER BY
  -- cant_miss first, then flexible-high, med, low; anchors with a time sort by it
  FIELD(t.priority_level, 'cant_miss', 'high', 'med', 'low'),
  (t.priority_kind = 'anchor') DESC,
  t.scheduled_for IS NULL, t.scheduled_for ASC,
  t.created_at DESC
LIMIT 100;
```

### 7.1.1 The Today Query (the home screen)

```sql
-- The visible Today set: items in this user's plan for today, in 'today' state.
SELECT
  dpi.id AS item_id, dpi.slot_state, dpi.position, dpi.source,
  t.id, t.title, t.priority_kind, t.priority_level, t.scheduled_for,
  t.today_swap_count, t.reframe_offered_at, t.reframe_snoozed_until
FROM daily_plan_items dpi
JOIN daily_plans dp ON dpi.daily_plan_id = dp.id
JOIN tasks t ON dpi.task_id = t.id
WHERE dp.user_id = ?
  AND dp.plan_date = ?          -- today, user-local
  AND dpi.slot_state = 'today'
ORDER BY
  (t.priority_kind = 'anchor') DESC,   -- anchors pinned at top
  FIELD(t.priority_level, 'cant_miss', 'high', 'med', 'low'),
  dpi.position ASC;
```

`idx_dpi_plan_state (daily_plan_id, slot_state, position)` covers the Today query; `idx_tasks_today_queue` supports bubble-up ranking. The backlog query is supported by `idx_tasks_user_status`.

### 7.2 The Badge Earned Query

```sql
-- Recent badges (for the trophy case UI)
SELECT b.badge_key, b.display_name, b.icon_name, ub.earned_at, ub.context
FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id
WHERE ub.user_id = ?
ORDER BY ub.earned_at DESC
LIMIT 20;
```

`idx_user_badges_user_earned` covers this.

---

## 8. Initial Badge Seed Data

Use Prisma's seed mechanism (`prisma/seed.ts`) — Prisma generates cuid IDs automatically:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BADGES = [
  { badge_key: 'first_capture', display_name: 'First Capture',
    description: 'You trusted the app with a thought.',
    tier: 'bronze', trigger_event_type: 'task.created',
    trigger_threshold: 1, is_repeatable: false, icon_name: 'Sparkles' },
  { badge_key: 'first_step', display_name: 'First Step',
    description: 'You moved forward.',
    tier: 'bronze', trigger_event_type: 'task_step.completed',
    trigger_threshold: 1, is_repeatable: false, icon_name: 'Footprints' },
  { badge_key: 'first_focus', display_name: 'First Focus',
    description: 'You started a timer.',
    tier: 'bronze', trigger_event_type: 'focus_session.started',
    trigger_threshold: 1, is_repeatable: false, icon_name: 'Timer' },
  { badge_key: 'first_complete', display_name: 'First Complete',
    description: 'You finished something.',
    tier: 'silver', trigger_event_type: 'task.completed',
    trigger_threshold: 1, is_repeatable: false, icon_name: 'Check' },
  { badge_key: 'daily_capture', display_name: 'Daily Capture',
    description: 'Captured a thought today.',
    tier: 'bronze', trigger_event_type: 'task.created',
    trigger_threshold: 1, is_repeatable: true, icon_name: 'Sparkles' },
  { badge_key: 'focus_complete', display_name: 'Focus Complete',
    description: 'Made it through a full timer.',
    tier: 'silver', trigger_event_type: 'focus_session.completed',
    trigger_threshold: 1, is_repeatable: true, icon_name: 'Timer' },
  { badge_key: 'praise_listen', display_name: 'Praise Listened',
    description: 'Listened to encouragement.',
    tier: 'bronze', trigger_event_type: 'praise_memo.played',
    trigger_threshold: 1, is_repeatable: true, icon_name: 'Heart' },
  { badge_key: 'doorknob_made', display_name: 'On Time',
    description: 'Made it out the door.',
    tier: 'gold', trigger_event_type: 'doorknob.completed',
    trigger_threshold: 1, is_repeatable: true, icon_name: 'DoorOpen' },
  { badge_key: 'check_in_yes', display_name: 'Body Listening',
    description: 'You checked in with yourself.',
    tier: 'bronze', trigger_event_type: 'check_in.responded',
    trigger_threshold: 1, is_repeatable: true, icon_name: 'HeartHandshake' },
  { badge_key: 'hydrated', display_name: 'Hydrated',
    description: 'You drank all your water today.',
    tier: 'silver', trigger_event_type: 'nourishment.water_goal_met',
    trigger_threshold: 1, is_repeatable: true, icon_name: 'GlassWater' },
  { badge_key: 'well_fed', display_name: 'Well Fed Body and Mind',
    description: 'You had all your meals today.',
    tier: 'silver', trigger_event_type: 'nourishment.meal_goal_met',
    trigger_threshold: 1, is_repeatable: true, icon_name: 'Drumstick' },
  { badge_key: 'supporter', display_name: 'Supporter',
    description: 'Thank you for supporting Focus Forge.',
    tier: 'gold', trigger_event_type: 'donation.received',
    trigger_threshold: 1, is_repeatable: false, icon_name: 'Sparkles' },
];

async function main() {
  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { badge_key: badge.badge_key },
      create: badge,
      update: badge,
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

Notice: there is **no badge for streaks**, no badge for "X days in a row," no negative-reinforcement badge. We enforces this absence.

### 8.1 Body Check-In Prompt Library

Used by the `check_ins` table (§4.13) for interoception prompts during long focus sessions. These should be seeded into a `check_in_prompts` definitions table OR kept as a static array in code — pick whichever fits your operational model.

We carefully co-authored these prompts. Each is:
- Phrased as a literal question, not a directive
- Soft, non-judgmental
- Specific to a single bodily signal
- Answerable with yes / not-yet / dismiss

```typescript
// packages/domain/src/check-ins/prompts.ts
export const CHECK_IN_PROMPTS = [
  // Hydration
  { key: 'water_recent',     icon: 'Droplet',     text: 'Have you had water recently?' },
  { key: 'water_thirsty',    icon: 'Droplet',     text: 'Are you thirsty right now?' },

  // Physical comfort
  { key: 'shoulders',        icon: 'User',        text: 'Are your shoulders tense?' },
  { key: 'jaw',              icon: 'User',        text: 'Is your jaw clenched?' },
  { key: 'posture',          icon: 'User',        text: 'How does your posture feel?' },
  { key: 'breath',           icon: 'Wind',        text: 'When did you last take a deep breath?' },

  // Energy & food
  { key: 'eaten',            icon: 'Apple',       text: 'Have you eaten in the last few hours?' },
  { key: 'energy',           icon: 'Battery',     text: 'How is your energy right now?' },

  // Bathroom (rotated less frequently — can feel intrusive)
  { key: 'bathroom',         icon: 'Home',        text: 'Do you need a bathroom break?' },

  // Movement
  { key: 'stood_up',         icon: 'StretchHorizontal', text: 'When did you last stand up?' },
  { key: 'eyes_screen',      icon: 'Eye',         text: 'Have your eyes been on the screen for a while?' },

  // Comfort temp
  { key: 'too_warm',         icon: 'Thermometer', text: 'Are you too warm or too cold?' },
];
```

**Selection logic:**
- Pick one randomly from the library when a check-in fires
- Avoid repeating the same prompt within the same focus session
- Bathroom prompt (`bathroom` key) appears at most once per 4 hours per user
- All other prompts can rotate freely

---

## 9. Vercel Cron Consolidation Strategy

Vercel Hobby plan limits cron jobs to **2 per project**. Multiple features need scheduled execution (Launchpad daily reset, Doorknob alerts, account deletion grace period, scheduled task reminders, link checker). To stay on free tier, we consolidate.

### 9.1 The Pattern: One Hourly Dispatcher

A single cron job runs every hour and dispatches to internal handlers based on what's due:

```typescript
// apps/web/app/api/cron/hourly/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Verify Vercel Cron signature
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Run all due tasks. Each is independent and idempotent.
  const results = await Promise.allSettled([
    runScheduledAlertsDue(),        // scheduled_alerts table
    runLaunchpadResets(),            // launchpad_items where reset_schedule = 'daily'
    runRoutineInstanceGeneration(),  // creates routine_instances for active routines (daily, at 04:00 UTC)
    runRoutineInstanceExpiration(),  // marks pending instances 'expired' at end of their day (silent)
    runRoutinePatternComputation(),  // refreshes routine_completion_patterns (daily, around 05:00 UTC)
    runMindfulnessSessionAutoEnd(),  // ends orphaned mindfulness_sessions (started >30 min ago, no ended_at)
    runAccountDeletionPurge(),       // users where pending_delete_at + 30 days < NOW()
    runPausedAccountRestoration(),   // users where account_state='paused' AND paused_until < NOW() → restore to 'active'
    runCompTierExpiration(),         // users where tier='comp' AND comp_expires_at < NOW() → revert to comp_previous_tier
    runEphemeralTokenCleanup(),      // expired magic_link_tokens, etc.
    runDormantAccountCheck(),        // users last_login_at > 90 days ago
  ]);

  return NextResponse.json({ ran: results.length, results });
}
```

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/hourly", "schedule": "0 * * * *" }
  ]
}
```

### 9.2 Why This Works

- **One cron entry**, room for the link checker as the second
- Each handler checks "what's due now" via DB query — no scheduling logic inside the handler
- Idempotent: if the cron is delayed and runs late, handlers do the right thing
- Each handler logs its work to the `events` table for observability

### 9.3 The Second Cron Slot

Reserved for the **CI link checker** workflow (defined in `08-page-content-and-references.md` §6.2). That's a GitHub Actions cron, not Vercel Cron — they're independent. So actually we have **2 Vercel Crons free**, and the link checker doesn't count against the limit.

If you need additional Vercel cron entries later, upgrade to Pro plan (40 jobs available).

### 9.4 Quota Reset Has NO Cron

Restating for clarity: quota resets are **implicit via the `usage_date_utc` column** (§4.17). No cron job runs at 04:00 UTC. The first request after the boundary creates a new row. This pattern uses zero cron slots.

---

---

## 10. JSON Column Validation

MySQL 8.0+ supports JSON schema validation via `JSON_SCHEMA_VALID()`. Use `CHECK` constraints where the JSON shape is critical:

```sql
-- Example: enforce shape of users.preferences
ALTER TABLE users
ADD CONSTRAINT chk_users_preferences_shape CHECK (
  preferences IS NULL OR JSON_SCHEMA_VALID(
    '{
      "type": "object",
      "properties": {
        "theme": { "enum": ["dark", "light", "system"] },
        "soundFamily": { "type": "string" },
        "reducedMotion": { "type": "boolean" },
        "timeZone": { "type": "string" },
        "weekStartsOn": { "enum": ["sunday", "monday"] }
      },
      "additionalProperties": true
    }',
    preferences
  )
);
```

Use sparingly — validation runs on every write. Apply only where shape stability matters.

**Nourishment mealtimes** are a good candidate, since the array length drives the meal goal:

```sql
-- Enforce mealtimes is an array of 1-8 "HH:MM" strings
ALTER TABLE nourishment_settings
ADD CONSTRAINT chk_nourish_mealtimes_shape CHECK (
  JSON_SCHEMA_VALID(
    '{
      "type": "array",
      "minItems": 1,
      "maxItems": 8,
      "items": {
        "type": "string",
        "pattern": "^([01][0-9]|2[0-3]):[0-5][0-9]$"
      }
    }',
    mealtimes
  )
);
```

Note: application-layer validation (Zod) should also enforce this before write — the DB constraint is a backstop.

---

## 11. Backup & Retention

### 11.1 Backup
- cPanel typically offers nightly database backups — enable.
- Additionally: a weekly mysqldump to off-host storage (S3, B2, or another cheap object store) — script via cron.

### 11.2 Retention Cleanup (cron jobs)

```sql
-- Daily: delete expired magic-link tokens
DELETE FROM magic_link_tokens WHERE expires_at < NOW() - INTERVAL 1 DAY;

-- Daily: delete expired sessions
DELETE FROM sessions WHERE expires_at < NOW();

-- Daily: hard-delete accounts past their 30-day grace period
-- (this is a complex multi-table cascade — see app-layer deletion service)

-- Weekly: archive events older than 180 days
INSERT INTO events_archive SELECT * FROM events WHERE occurred_at < NOW() - INTERVAL 180 DAY;
DELETE FROM events WHERE occurred_at < NOW() - INTERVAL 180 DAY;
```

---

## 12. Acceptance Criteria

The schema is "done" when:

- [ ] All 41 tables created with correct charset and engine
- [ ] All FKs in place with documented `ON DELETE` behavior
- [ ] All indexes created and verified against query plans
- [ ] No ENUM contains 'failed', 'overdue', or 'urgent'
- [ ] `feature_grants` migration tested for legacy-user grandfathering using the canonical feature_key registry
- [ ] `quota_usage` table works with atomic increment pattern
- [ ] `subscriptions` table FK uses `ON DELETE RESTRICT` (not CASCADE)
- [ ] `feedback_items` schema supports both bug and feature_request kinds
- [ ] `feedback_votes` enforces one vote per user per item, no downvotes possible
- [ ] `task_templates`, `routines`, `routine_steps`, `routine_instances` form coherent generation flow
- [ ] `routine_instances` lazy-binds to `tasks` only on user interaction
- [ ] `routine_completion_patterns` computed daily, AI suggestion column gated to Pro tier
- [ ] `feature_announcements` table exists as forum framework placeholder
- [ ] `admin_actions` table records all admin operations with justification
- [ ] `content_reports` unifies moderation queue (replaces `body_doubling_reports`)
- [ ] `users.account_state` ENUM includes 'paused' and 'suspended' as distinct states
- [ ] `users.tier` ENUM includes 'comp' for complimentary access
- [ ] Pause auto-expiration cron job runs hourly
- [ ] `mini_game_sessions` has NO score column (structurally prevents leaderboards)
- [ ] `mini_game_sessions` cooldown enforced via started_at query at session start
- [ ] Pre-task primer sessions (is_pretask_primer=TRUE) bypass cooldown
- [ ] `movement_prompts_log` tracks all 11 prompt keys across 3 tiers
- [ ] `message_encounters` enables diminishing didactic mode
- [ ] `users.preferences` JSON validates anti-shame mode, mini-game settings, movement settings, gamification toggles
- [ ] `biddy_sessions` table has NO chat/messages field (structurally prevents conversational drift)
- [ ] Biddy 90-min soft limit fires `biddy:soft-limit-reached` event
- [ ] Biddy 4-hour daily cap is HARD limit (cannot be extended)
- [ ] Biddy avatar inventory: 6 creature avatars + 3 humanoid companions (separate categories)
- [ ] `tasks.estimated_minutes` and `actual_completion_seconds` columns added
- [ ] `actual_completion_seconds` NEVER displayed during task (default off, opt-in only)
- [ ] `etc_calibration_history` row created on every task completion with estimate
- [ ] Time-Bender badge fires when actual < estimated
- [ ] NO "exceeded estimate" badge or negative event ever fires
- [ ] `mindfulness_sessions` table records all 4 exercise types
- [ ] `entry_mode` distinguishes calm/acute/system_suggestion
- [ ] Acute sessions (entry_mode='acute_overwhelmed') excluded from patterns view
- [ ] `mindfulness_suggestion_log` enforces backoff after 3 and 5 dismissals
- [ ] Auto-end safeguard marks sessions ended after 30 min orphaned
- [ ] No "completion percentage" or "streak" tracked for mindfulness sessions
- [ ] Seed badges inserted via Prisma seed script
- [ ] Body check-in prompts available (in code or seeded)
- [ ] JSON schemas validated where applicable
- [ ] Backup cron tested with restoration
- [ ] Retention cron tested
- [ ] Dashboard query <100ms on 100k-row test dataset
- [ ] Account deletion cascades correctly across all tables (except subscriptions: blocks deletion)
- [ ] Audit log survives user deletion (no FK to users)
- [ ] Single Vercel hourly cron consolidates all scheduled work (including routine generation)
- [ ] Quota reset works without any cron (implicit via usage_date_utc)
- [ ] Routine instances generated daily at 04:00 UTC
- [ ] Routine instances silently marked 'expired' at end-of-day (no user notification)
- [ ] Prisma configured with cuid() PKs throughout
- [ ] Migration tooling configured and a baseline migration committed
