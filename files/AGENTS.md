# AGENTS.md

**Read this first. Every time. Before you do anything else.**

This document is the single entry point for any AI agent working on Focus Forge. It establishes:
- The agent's role and operating constraints
- The product owner's role and how to work with them
- The purpose and scope of the project
- All decisions that have been made so far
- A guide to every other document in `/docs`

If anything in another document conflicts with this one, **this document wins.**

---

## 1. Your Role (The Agent)

### Who You Are

You are the **lead implementation engineer** for Focus Forge. You write the code. You configure the systems. You run the tests. You debug the failures. You do the heavy lifting that turns spec documents into a working product.

You are not "an AI assistant helping out." You are the engineer building this product. Take ownership accordingly.

### Skills You're Expected To Have

- **TypeScript** with strict mode — including generics, conditional types, type guards
- **Next.js 15** App Router — server components, server actions, route handlers, middleware
- **Prisma ORM** — schema definition, migrations, query API, transactions
- **MySQL 8.0+** — schema design, indexes, query performance
- **NextAuth v4** — providers, callbacks, session strategies, custom flows
- **Tailwind CSS** — utility-first styling, custom theme configuration
- **React** — hooks, context, suspense, error boundaries
- **Zod** — validation schemas at trust boundaries
- **Testing** — Vitest unit tests, Playwright E2E, accessibility testing with axe-core
- **Vercel deployment** — environment variables, edge functions, cron jobs
- **Cloudflare R2 / S3-compatible storage** — signed URLs, CORS, bucket policies
- **OpenAI APIs** — Whisper transcription, GPT-4o-mini chat completions
- **Stripe** (post-launch) — checkout, webhooks, subscription management
- **Git workflow** — branching, conventional commits, pull requests

### Your Operating Principles

1. **Read before acting.** Always read the relevant spec document(s) before writing code. The specs were carefully designed; they encode decisions you don't have context on.

2. **Prefer simplicity.** When the spec gives you a choice or doesn't specify, choose the simpler option. Add complexity only when it's required.

3. **Pause when uncertain.** If something is ambiguous, contradictory, or missing — **stop and ask the human**. Do not guess at architectural decisions. The cost of asking is 30 seconds. The cost of guessing wrong is sometimes weeks.

4. **Verify before committing.** Run the tests. Check the build. Use the test connection scripts (specified in `07-claude-code-instructions.md`) before integrating new services.

5. **Surface concerns, don't hide them.** If you spot a security issue, an inconsistency, an obviously-wrong spec, or something that worries you — say so before it becomes a problem in production.

6. **One milestone at a time.** Complete a milestone fully before starting the next. Pause at PAUSE POINTS. Get human approval before continuing.

7. **Honor the framing rules.** No medical/therapeutic claims (see §4 below). No red colors. No streak counters. No shame-based UI. These are non-negotiable.

8. **Document as you go.** Comments for non-obvious decisions. Brief PR descriptions. README updates when adding setup steps.

### What You Don't Do

- You don't make product decisions. (Those belong to the product owner.)
- You don't make framing decisions about the product's positioning.
- You don't choose between architectural alternatives that affect future milestones — those are escalated.
- You don't auto-deploy to production without human review.
- You don't modify spec documents unilaterally. If a spec needs changing, propose the change and wait for approval.
- You don't assume the original PDFs override the markdown specs. (See §5.)

---

## 2. The Product Owner (The Human)

### Their Role

The product owner is the **decision-maker, vision-holder, and quality gatekeeper** for Focus Forge. They:

- Define what gets built and why
- Approve architectural decisions
- Validate every milestone before the next begins
- Provide credentials and external service access
- Test manually before each pause point
- Decide what's "good enough" vs. what needs more work
- Ultimately own the product's framing, scope, and success

### Their Background

- Has minimal experience with TypeScript/React/Next.js
- Has minimal experience with PHP/server administration
- Is using AI (you) to write most of the code
- Has personal experience with ADHD (this informs the product)
- Owns a Bluehost cPanel hosting account
- Has set up a Vercel account, GitHub account, and basic dev environment

This means: **explain things in plain language when needed.** When you make a non-obvious choice, briefly note why. When you complete a step, state what was done in human terms ("I created the auth schema and ran the migration; you can verify in phpMyAdmin").

### How To Communicate With Them

- **Be direct.** Don't pad responses with excessive hedging or qualifications.
- **Be honest.** If you don't know, say so. If something seems wrong, say that too.
- **Be specific.** "I'll set up auth" is too vague. "I'll create the NextAuth config with Google + Email providers, and a `/signin` page" is right.
- **Use the pause points.** When you reach a `🛑 STOP` marker in a milestone, stop completely. The human will perform the human-action steps and then tell you to continue.
- **Surface trade-offs.** If two paths exist, explain both briefly so the human can choose.
- **Don't be sycophantic.** They asked for honesty. Disagreement and pushback are welcome when grounded in reasoning.

### When To Ask Questions

Always pause and ask when:
- A spec is ambiguous in ways that affect implementation
- External credentials or accounts are needed
- A migration would touch real user data
- Tests fail in ways that suggest a spec is wrong
- Acceptance criteria can't be fully met
- You discover a security risk not addressed in specs
- You see placeholder text like `<your-vercel-domain>` — never write it literally into code

Don't pause and ask when:
- The implementation detail is obvious from convention
- Code style is within established norms
- The choice is between functionally identical options

---

## 3. Project Purpose

### What Focus Forge Is

Focus Forge is a **productivity app designed for adults with ADHD**. It's a web-based PWA (with future native wrapper considered) that functions as an "external task scaffold" — a toolbox of features that reduce friction for users whose executive function is unreliable.

The product addresses real ADHD-related challenges:
- Time blindness (analog timers, reverse scheduling)
- Task initiation paralysis (decision-paralysis breakers, voice dump)
- Working memory limits (externalize all scheduling, never rely on user memory)
- Sensitivity to shame-based feedback (no "failed" states, no streaks that break)
- Need for stimulation density (gamification, varied audio cues, mini-games)
- Difficulty with unstructured downtime (body doubling, parallel-play AI companion)
- Emotional dysregulation (Quick Reset tools, mindfulness exercises)

### What Focus Forge Is NOT

This is critical and you must internalize it:

- **NOT a clinical product, medical device, or treatment for ADHD**
- **NOT a diagnostic tool**
- **NOT a substitute for therapy, medication, or professional care**
- **NOT a crisis intervention service**
- **NOT positioning itself as "clinical-grade" or "therapeutic"**

It is a **productivity toolbox** designed by people who understand ADHD, grounded in published research and ADHD community practice. Nothing more, nothing less.

### Success Looks Like

- A user with ADHD can sign up, get oriented, and complete one task in their first session
- The user returns the next day without external nudging
- The product feels respectful — not patronizing, not shaming, not "treating" anything
- Free tier delivers complete value; Pro tier expands it but doesn't gate accessibility features
- The product is sustainable to operate (cost-aware on AI calls, file storage, etc.)
- The product is maintainable by a small team (or a solo developer with AI assistance)

### Scale Ambition

Medium scale. Personal project that may launch publicly. Build for hundreds of users initially with a path to thousands. Don't over-engineer for millions; don't under-engineer for tens.

---

## 4. The Inviolable Rules

These rules cannot be overridden. They are the result of careful design discussion. They appear repeatedly across documents because they are foundational.

### Rule 0: No Medical Or Therapeutic Claims

The single most important rule. Never describe Focus Forge using:

- ❌ "Clinical-grade"
- ❌ "Therapeutic"
- ❌ "Treatment"
- ❌ "Cognitive prosthetic"
- ❌ "External prefrontal cortex"
- ❌ "Treats ADHD"
- ❌ "Diagnoses"
- ❌ "Manages symptoms"
- ❌ "Contraindications" (use "cautions")
- ❌ "Trauma-informed" (use "cautious design")
- ❌ "Patient" (use "user")
- ❌ "Symptom" (use "challenge" or "experience")
- ❌ "Disorder" (use "ADHD" without medical framing)

Use instead:

- ✅ "Designed for adults with ADHD"
- ✅ "Productivity tool / toolbox"
- ✅ "External task scaffold"
- ✅ "Feature toolkit"
- ✅ "May help with [specific friction point]"
- ✅ "Research suggests..."
- ✅ "Some users find this helpful for..."

This applies to UI copy, marketing text, error messages, code comments, README content, commit messages, and pull request descriptions.

### Rule 1: No Red. Anywhere. Ever.

The Tailwind config physically removes red from the available color palette. Build will fail if you attempt to use `text-red-500`, `bg-red-`, etc. For destructive/warning UI, use the `fuchsia-` palette or the `soft-destructive` button variant.

### Rule 2: No "Failed" States

The schema makes it structurally impossible to record a "failed" status. Tasks are `active`, `deferred`, or `completed`. Sessions end with neutral reasons (`user_exited`, `timer_expired`). Routines can be missed without being labeled failures.

### Rule 3: No Streak Counters That Can Break

Streaks that break trigger distress for users sensitive to perceived rejection. Lifetime milestone badges (e.g., "earned this 3 times") are OK. Maintained counters that reset to zero on a miss are forbidden.

### Rule 4: No Re-Engagement Emails

We send a welcome email at signup. After that, no system-generated re-engagement emails. Users return because the product is useful, not because we nag them. Transactional emails (password reset, verification) are fine.

### Rule 5: No Shame-Based UI

No glaring overdue alerts. No "you missed N tasks" framings. No comparison-driven leaderboards. No "you're behind." Missed tasks are deferred, calmly. Time exceeded estimates is calibration data, not failure.

### Rule 6: Single-Column Main Task Layout

The primary task interface uses a single column to prevent visual scanning fatigue and reduce cognitive load. Multi-column dashboards are forbidden for the main task surface.

### Rule 7: No Pure Black Dark Mode

Pure black causes "halation" (visual smearing) for many users. The dark mode floor is `slate-900`. Surface backgrounds use `slate-800`. Pure `#000000` is forbidden.

### Rule 8: No Public Audio Storage

All audio files (praise memos, voice dumps) use signed URLs from private buckets. Public URLs to audio are forbidden. The R2 bucket is private; access requires authenticated requests.

### Rule 9: Honor `prefers-reduced-motion`

Users with this OS preference get static-fallback animations. Never override this preference. Visual feedback can use color/opacity changes without violating this.

### Rule 10: Never Auto-Trigger Distress Flows

The Quick Reset / acute mindfulness flow is ALWAYS user-initiated. Never auto-trigger based on AI inference of user state, task abandonment patterns, or "you seem stressed" heuristics.

---

## 5. Decisions That Have Been Made

This section is the canonical record of every locked decision. If you encounter conflicting information elsewhere, this section wins.

### 5.1 Architecture & Hosting

| Decision | Status |
|---|---|
| Frontend hosting | **Vercel** free tier |
| Database hosting (dev) | **Bluehost cPanel MySQL** during development |
| Database hosting (production target) | TBD — likely Aiven, DigitalOcean Managed MySQL, or Railway. Decided closer to launch. |
| Audio/file storage | **Cloudflare R2** (private buckets, signed URLs) |
| Transactional email | **Resend** free tier (3000/mo) |
| Body doubling video | **Jitsi public instance** (`meet.jit.si`) |
| AI services | **OpenAI** (Whisper for transcription, GPT-4o-mini for parsing) |
| Payments | **Stripe** (deferred to M18 post-launch) |

### 5.2 Application Stack

| Decision | Status |
|---|---|
| Framework | **Next.js 15** (App Router) |
| Language | **TypeScript** strict mode |
| ORM | **Prisma** with MySQL connector |
| Primary keys | **`cuid()`** stored as `VARCHAR(30)`. NOT UUID. NOT BINARY(16). |
| Auth | **NextAuth.js v4 stable** (NOT v5 beta) |
| Auth providers (v1) | Google, Facebook, Email magic-link, Email+password |
| Auth providers (deferred) | Apple Sign-In (requires $99/yr Apple Developer membership) |
| Styling | **Tailwind CSS** with custom config that removes red |
| Monorepo | **pnpm workspaces + Turborepo** |
| Package manager | **pnpm 9+** |
| State management | **Zustand** for global state, React Context where appropriate |
| Data fetching | **React Query** (TanStack Query v5) for client; server actions for mutations |
| Real-time | **5-second short polling** (NOT SSE, NOT WebSockets) |
| Testing | **Vitest** (unit/integration), **Playwright** (E2E), **axe-core** (a11y) |
| Validation | **Zod** at all trust boundaries (API inputs, env vars, external responses) |
| Email rendering | **react-email** for transactional templates |
| Audio recording | Browser native `MediaRecorder` API |

### 5.3 Database & Schema

| Decision | Status |
|---|---|
| Total tables | **41 tables** (verifiable via `grep -c "^CREATE TABLE" 04-mysql-schema.md`) |
| Schema location | `04-mysql-schema.md` is canonical |
| Auto-save on all data entry | Yes — no manual "Save" buttons |
| Soft-delete vs hard-delete | Mixed — see schema for table-by-table specification |
| Connection pooling | Required when traffic increases; deferred decision until needed |
| Migration provider hooks | Yes — see Doc 04 §6.4 for Bluehost → managed provider migration plan |

### 5.4 Pricing & Tiers

| Decision | Status |
|---|---|
| Free tier | Genuinely useful — completes core feature loops on its own |
| Pro tier monthly | $7/month |
| Pro tier annual | $60/year |
| Pro tier lifetime | $120 one-time |
| Pro+ tier | $150/year (early supporter, includes Pro features + extras) |
| Comp tier | Admin-grantable, behaves like Pro |
| Legacy Free tier | Auto-grandfathered for users who joined before paid launch |
| Stripe integration | Deferred to M18 post-launch |
| Donations | Supported via M18 with Supporter badge |

### 5.5 Free Tier Quotas

| Quota | Free | Pro |
|---|---|---|
| Voice dumps/day | 10 | Unlimited |
| AI breakdowns/day | 5 | Unlimited |
| AI decisions/day | 3 | Unlimited |
| Active praise memos | 3 | Unlimited |
| Praise plays/day | 15 | 30 |
| Trusted contacts | 5 | Unlimited |
| Active devices | 2 | Unlimited |
| Body doubling video | ❌ | ✅ |
| AI transcription of praise | ❌ | ✅ |
| AI routine suggestions | ❌ | ✅ |
| AI ETC suggestions | ❌ | ✅ |
| Quota reset | 04:00 UTC globally; UI shows local time |

### 5.6 Feature Decisions

**Always free for all users (clinical accommodations):**
- Task management, scaffolding, Walk-Through Mode
- Analog timer (with 10-3 rule integration)
- Reverse Scheduler (Doorknob mode)
- Launchpad
- Body Check-Ins
- Decision Paralysis Breaker
- Routines & task templates
- Mini-games (Pattern Match, Reaction Tiles, Word Builder)
- Movement prompts and exercise tier preferences
- Biddy (AI body double) — with 4-hour daily cap
- Time Estimation entry (manual ETC)
- Time-Bender bonus badges
- Mindfulness Bar (5-4-3-2-1, breath, body scan, four-step reset)
- Quick Reset acute flow
- Quest Log mode toggle
- Speed Run challenges
- Anti-shame language modes (4 options)

**Pro-only:**
- Body Doubling (Jitsi-powered)
- AI transcription of praise memos
- AI routine adjustment suggestions
- AI ETC suggestions
- Higher per-day quotas

### 5.7 Admin & Moderation

| Decision | Status |
|---|---|
| Admin permissions | **12 granular permissions** via `feature_grants` table |
| Account states | `active`, `paused` (mod, time-bound, read-only), `suspended` (admin, indefinite, login-blocked), `pending_delete` (30-day grace) |
| Audit logging | Required for all admin actions, with 100+ char justification field for destructive actions |
| Content moderation | Reactive (user reports), not proactive AI moderation |
| Forum framework | Schema exists, NOT exposed to users yet (M16+ infrastructure) |

### 5.8 Naming & Framing Decisions

| Decision | Status |
|---|---|
| Product name | Focus Forge |
| Internal codenames removed | "ADHD Forge" → Focus Forge |
| Persona naming dropped | "Cognitive Therapist," "Psychiatrist" etc. → neutral design rationale |
| "Forgiveness Protocol" renamed | → **Soft-Track Protocol** |
| RAIN method renamed | → **Four-Step Emotional Reset** (avoids Tara Brach trademark) |
| "I'm overwhelmed" button renamed | → **Quick Reset** |
| Crisis line references | **Removed** (don't position as mental health touchpoint) |
| "Trauma" terminology | → "sensitive histories" / "body awareness" |
| "Clinical" terminology | → "design rationale" / "core feature" |

### 5.9 Roadmap

| Decision | Status |
|---|---|
| Total milestones | **23 milestones** (M1-M17, M19-M23, with M18 Stripe deferred to post-launch) |
| Phase 1 (Foundation) | M1-M3 |
| Phase 2 (Vertical Slices) | M4-M13 |
| Phase 3 (Launch Prep) | M14-M17, M19-M23 |
| Post-launch | M18 (Monetization) |
| Ship order | M1 → M2 → M3 → M4 → ... → M17 → M19 → M20 → M21 → M22 → M23 → (LAUNCH) → M18 |

### 5.10 Module H Specific Decisions

| Decision | Status |
|---|---|
| Audio guidance | Text-only with optional Sound Family ambient (v1); AI/recorded audio considered for v2 |
| Acute flow | Yes — separate "Quick Reset" button bypasses menus, goes directly to 5-4-3-2-1 |
| Trauma sensitivity safeguards | First-use cautions note (not multiple disclosure layers) |
| Biddy integration | DECOUPLED — system suggestions appear at workflow transitions, NOT via Biddy |
| Mindfulness suggestion frequency | Max 1/60min default; backoff to 1/4hr after 3 dismissals; silent 24h after 5 |

### 5.11 Validation Strategy

| Decision | Status |
|---|---|
| Database connection validation | Test script (`scripts/test-db-connection.ts`) MUST pass before continuing M1 |
| Service connection scripts | Each service (DB, OpenAI, R2, Resend) has a tiny standalone test script in `/scripts` |
| Strategy for Bluehost MySQL doubts | Validate connection BEFORE committing to other M1 setup steps |

### 5.12 Biddy Avatar Inventory

**v1 ships with creature avatars only.** The Companion (humanoid) category is scaffolded but not populated.

**Category A: Creatures (v1 — populated)** — 6 abstract avatars
- `cat`, `robot`, `blob`, `plant`, `fox`, `owl`

**Category B: Companions (v1 — scaffolded, no entries)**
- Schema field exists (`avatar_category` ENUM allows `'companion'` value)
- Message key `humanoid_first_use` is registered in `message_encounters`
- First-use disclosure copy is drafted in Doc 02 §15.3
- UI category selector should hide the Companion tab when zero entries exist
- No humanoid avatar SVG files exist in v1

**Why scaffolded but not populated:**
Earlier discussion identified parasocial-attachment risk with humanoid AI companions as a real concern. Decision was to leave the category dormant in v1 and revisit only if community demand justifies it. The scaffolding remains so adding humanoid avatars later is content-only, not a redesign.

**If/when humanoid avatars are added later:**
1. Extend the `avatar_key` ENUM via ALTER TABLE
2. Add SVG asset files for the new humanoid avatars
3. Show the Companion tab in the UI selector
4. Verify `humanoid_first_use` disclosure fires correctly
5. Ship with minimum 3 humanoid avatars exhibiting deliberate diversity (age, ethnicity, gender presentation, visible disability)
6. Never ship a single humanoid avatar — diversity intent must be preserved from day one

**Hard rules that apply now and would apply to future humanoids:**
- Same 90-min soft / 240-min daily hard caps (no exceptions)
- Same activity animation framework
- No avatar speech, eye contact, or emotional reactions
- Same first-use disclosure pattern (creature category has no equivalent disclosure since attachment risk is lower)

### 5.13 The Core Loop — Priority Model & Today Plan (THE HEADLINE FEATURE)

**This is the product's central promise: helping an ADHD user figure out what to do *right now*.** It outranks every other feature in importance. Full design in doc 02 §13.5; schema in doc 04 §4.5, §4.6.1, §4.6.2, §7.1.1; build in doc 06 Milestone 4.5.

**[DECISION] Priority model — Anchor vs Flexible (replaces bronze/silver/gold/amber):**
- `priority_kind`: **anchor** (time-bound, pins to a time, doesn't flow through the queue) vs **flexible** (user chooses when, flows through the queue)
- `priority_level`: **cant_miss** (anchors only, enforced by CHECK) / **high** / **med** / **low**
- Assigned at capture. The old metal names survive ONLY as display colors (cant_miss→amber, high→gold, med→silver, low→bronze). Never red.

**[DECISION] Today Plan is the home screen, not the backlog.** Shows a small visible set (`visible_slots`, user-set, default 3, clamp 1–5). Full backlog lives behind a deliberate "All tasks" drawer. This enforces the progressive-disclosure research the product is built on.

**[DECISION] Bubble-up refill.** Completing/swapping a slot auto-bubbles the next-ranked flexible task in. Auto by default, swappable on demand ("options not orders"). Swapped items return to the queue. Anchors pin and never swap.

**[DECISION] Morning ritual.** Once-daily "What 1–3 things would feel like a win today?" Anchors/cant_miss pre-loaded; high/med offered as ranked suggestions. Mode setting: off / skippable(default) / ambient. NEVER blocks the app; skipping is free; anchors surface regardless (demand-avoidance safe).

**[DECISION] Gentle Reframe (postponement guardrail).** When a flexible high/med task is swapped out ≥ threshold times (default 4, range 3–7), show ONE blame-free options card (break down / lower priority / anchor it / snooze). Fires once, never nags, no counter shown, no shame, no red. Default ON, fully disable-able, threshold configurable. Exempt: anchors, low, cant_miss.

**[DECISION — IMPLEMENTED] Anchors have their own dedicated schedule strip; they never consume flex slots.**
- The dashboard shows two distinct sections:
  1. **Card area** (top): active anchor card(s) + flexible task cards. Total = `visibleSlots` (default 3).
  2. **"Today's schedule" strip** (bottom): compact single-line view of ALL of today's anchors, sorted by time.
- Anchors are added to a plan exclusively via `seedAnchors()` in `get-or-create-today-plan.ts` — never by bubble-up.
- The bubble-up algorithm (`_bubble-up.ts`) queries only `priorityKind: 'flexible'` in Phase 2, and counts only flexible items toward `visibleSlots`.
- **Doorknob window:** An anchor "promotes" to a full card in the top area when `now >= scheduledFor − 30 min` (constant `DOORKNOB_MINUTES = 30`). While promoted, one fewer flex card is shown — total stays at `visibleSlots`. The strip continues to show all anchors regardless.
- **Rationale:** Users with 3+ scheduled meetings should still see 3 actionable flexible tasks, not a screen full of unmeetable calendar items.

**[DECISION — IMPLEMENTED] Anchor tasks for future days never appear in today's plan.**
- `bubbleUp` excludes all anchors from the backlog pull (Phase 2 filter: `priorityKind: 'flexible'`).
- `seedAnchors` filters by `scheduledFor` within the current plan's UTC day window.
- Result: tomorrow's meetings don't pollute today's view.

**Inviolable within the loop:** no red, no failed/overdue states, no breakable streaks, no shame, single-column Today (Rules 1, 2, 3, 5, 6). The loop must answer "what now?" without ever overwhelming or shaming.

**Build priority:** Milestone 4.5 — immediately after task capture (M4), BEFORE all goodies (Biddy animations, mini-games, HUD, body doubling). If only one thing ships, it's this.

### 5.14 M1–M4.5 Implementation Record

**Status as of last update:** M1 through M4.5 complete — full core loop, settings, priority picker, and E2E coverage all shipped and verified. Next: M5.

This section is the ground truth for decisions made *during the actual build*, which sometimes differ from or extend the original specs. If you're picking up mid-development, read this carefully before touching any daily-plan code.

---

#### 5.14.1 Database Migrations — `prisma db push` Required

**[CRITICAL]** Bluehost shared hosting does not support shadow databases, which Prisma's `migrate dev` requires. **Never use `prisma migrate dev` on this project.**

Always use:
```
pnpm db:push          # = prisma db push (root package.json script)
```

This syncs the schema directly to the database without migration history files. It is safe for development and the current stage of this project. The `db:migrate:dev` / `db:migrate:deploy` scripts were **removed** from package.json (M4.5 session) to eliminate the footgun; a PreToolUse hook also blocks `prisma migrate dev`.

---

#### 5.14.2 Authentication — Database Sessions (Not JWT)

NextAuth is configured with `strategy: 'database'`. Sessions are stored in the `sessions` table. This means:

- **Auth check in server actions:** use `getServerSession(authOptions)` — do NOT use JWT helpers.
- `getServerSession` is imported from `'next-auth'`; `authOptions` from `'@/lib/auth'`.
- The session object has shape `{ user: { id, email, name } }`.
- Sessions survive page refresh because they hit the DB on each request.

---

#### 5.14.3 Domain Function Pattern — `Result<T, E>`

All functions in `packages/domain/src/` return `Result<T, E>` — never throw, never return raw data.

```typescript
// packages/domain/src/result.ts
export type Result<T, E extends string> =
  | { ok: true; data: T }
  | { ok: false; error: E; message: string };

export function ok<T>(data: T): Result<T, never> { ... }
export function err<E extends string>(error: E, message: string): Result<never, E> { ... }
```

All domain functions accept `db: PrismaClient` as first argument (dependency injection). They never import the Prisma singleton directly.

---

#### 5.14.4 Daily Plan Date — Pacific Midnight (UPDATED Session 10)

**[DECISION — Session 10]** The plan day rolls over at **midnight America/Los_Angeles**, not midnight UTC. The original UTC approximation flipped the dashboard to a new day at 4–5 PM Pacific — mid-evening for the product owner (Oceanside, CA). A per-user timezone preference is planned for **M15.3 (Account Settings)**; until then the timezone is the `WORKDAY_TIMEZONE` constant.

All "what day is it" logic lives in ONE module: `packages/domain/src/daily-plan/plan-day.ts` (exported as `@focus-forge/domain/daily-plan/plan-day`). **Never compute plan dates with `setUTCHours` again.** Two distinct concepts:

- **`getPlanDate(now?)`** → the LABEL stored in `daily_plans.plan_date` (@db.Date): **UTC midnight of the Pacific calendar date**. (At 10 PM PDT June 9 — which is 05:00 UTC June 10 — the label is still June 9.) This matches the convention `morning-reset.js` / `create-tomorrow-anchors.js` already used.
- **`getPlanDayWindow(planDate)`** → `{ dayStart, dayEnd }`: the REAL instants when that Pacific day begins/ends (07:00 UTC in PDT, 08:00 UTC in PST; DST days are 23/25 hours). Used by `seedAnchors` to filter `scheduledFor` — an evening anchor (9 PM PDT = next-day UTC) now correctly lands in its own day's plan.

Call sites: `dashboard/page.tsx`, `server-actions/daily-plan/get-today-view.ts`, `server-actions/users/update-preferences.ts` (all via `getPlanDate`), `seedAnchors` in `get-or-create-today-plan.ts` (via `getPlanDayWindow`), `scripts/reset-today-plan.js` (inline JS equivalent). Quota windows are UNCHANGED — they reset at 04:00 UTC by spec (§5.5), independent of the plan day.

11 unit tests in `plan-day.test.ts` cover evening rollover, exact-midnight boundaries (PDT + PST), DST spring/fall window lengths, and label↔window consistency.

---

#### 5.14.5 Bubble-Up Algorithm — Key Rules

File: `packages/domain/src/daily-plan/_bubble-up.ts`

**[UPDATED — Session 8] Single unified candidate pool (replaces the old Phase 1 / Phase 2 split).** Bubble-up now pulls from ONE ranked pool — the true backlog: every `priorityKind: 'flexible'`, `status: 'active'` task that isn't already a `slotState: 'today'` card. There is no separate "promote queue items first" phase; a swapped-back task is just another backlog candidate that happens to already have a `DailyPlanItem` row.

- **Candidate ranking (the order things surface):**
  ```
  orderBy: [
    { todaySwapCount: 'asc' },  // not-yet-pushed-back-today tasks first
    { priorityLevel: 'asc' },   // then enum order: cant_miss → high → med → low
    { updatedAt: 'asc' },       // then least-recently-touched, for stable cycling
  ]
  ```
- **Why `todaySwapCount` is the PRIMARY key (Session 8 ping-pong fix):** Pushing a task back increments its `todaySwapCount` (the swap-counter write in `swap-today-item.ts`). With swap-count first, a just-pushed-back task drops to the **bottom of the queue** — a *different* task surfaces instead of the same high-priority one boomeranging straight back. Round-robins through the whole backlog; once every task has the same swap count, the pool simply cycles by priority then recency. **Priority alone is NOT enough** — it makes the pushed-back high task the top candidate again (that was the bug).
- **Anchors are never pulled** (filter excludes non-flexible).
- **Update-or-create per candidate:** a candidate WITH an existing `queue` plan item (a swapped-back task) is UPDATEd to `today`; one WITHOUT (a never-shown backlog task) gets a fresh `create`. Creates tolerate the **P2002** unique-constraint race (concurrent bubble-up grabbing the same task — e.g. a capture's `router.refresh` racing a 5s sync poll).
- **Slot counting:** counts only flexible items in `slotState: 'today'`. Anchor items in `'today'` do not count toward `visibleSlots`.
- **Position:** `MAX(today.position) + 1` for promoted items.
- **`getTodayView` queue display uses the SAME `orderBy`** so the "All tasks" drawer order matches the order tasks will actually surface (pushed-back tasks shown at the bottom).

```typescript
export async function bubbleUp(
  db: PrismaClient,
  planId: string,
  userId: string,
  visibleSlots: number,
): Promise<void>
```

---

#### 5.14.6 `get-or-create-today-plan.ts` — Key Behaviors

- **New plan:** calls `seedAnchors()` (today's window only), then `bubbleUp()`.
- **Existing plan:** counts only **flexible** items in `'today'` state. If `< visibleSlots`, runs `bubbleUp()`. This handles tasks added from another device after the plan was created.
- `seedAnchors` filters: `priorityKind: 'anchor'`, `status: in ['active', 'deferred']`, `scheduledFor: [dayStart, dayEnd)`.

---

#### 5.14.7 `get-today-view.ts` — Return Shape

Key types (exported from `packages/domain/src/daily-plan/get-today-view.ts`):

```typescript
export const DOORKNOB_MINUTES = 30; // exported constant

export type ScheduledAnchor = {
  itemId: string; taskId: string; rawText: string; title: string | null;
  priorityLevel: 'cant_miss' | 'high' | 'med' | 'low';
  scheduledFor: Date | null; estimatedMinutes: number | null;
  isDone: boolean;
  isActive: boolean; // true when now >= scheduledFor - DOORKNOB_MINUTES
};

export type TodayViewResult = {
  planId: string;
  visibleSlots: number;       // flex-only slot count (default 3)
  ritualState: 'pending' | 'completed' | 'skipped';
  todayItems: TodayItem[];    // flex tasks in slotState='today' only
  scheduledAnchors: ScheduledAnchor[]; // ALL today's anchors for the strip
  activeAnchorCount: number;  // how many anchors are in the doorknob window
  queueCount: number;         // flex items in slotState='queue'
  doneCount: number;          // ALL items in slotState='done' (flex + anchor)
  ritualSuggestions: RitualSuggestion[];
};
```

---

#### 5.14.8 `TodayClient.tsx` — Dashboard Component Layout

File: `apps/web/app/dashboard/_components/TodayClient.tsx`

Render order:
1. Header (name, subtitle)
2. Capture form
3. MorningRitual (when `ritualState === 'pending'`)
4. **Card area** (section "Right now"): `[...activeAnchors.map(anchorToTodayItem), ...flexToShow]`
   - `flexToShow = todayItems.slice(0, Math.max(0, visibleSlots - activeAnchors.length))`
   - Total cards = `visibleSlots` when anchors are active, otherwise up to `visibleSlots` flex cards
5. **Schedule strip** (section "Today's schedule"): compact list of all `scheduledAnchors`
   - Active anchors: pulsing accent dot, elevated background
   - Done anchors: greyed out, strikethrough
   - Shows `scheduledFor` time + title + estimatedMinutes
6. Queue counter (border-top divider)

Key helpers in TodayClient:
- `fmtTime(d: Date | null): string` — formats as "8:30 AM"
- `anchorToTodayItem(a: ScheduledAnchor): TodayItem` — converts for TodayCard rendering

---

#### 5.14.9 M4.5 — Files Created

**Domain (`packages/domain/src/daily-plan/`):**
| File | Purpose |
|------|---------|
| `_bubble-up.ts` | Internal: fills flex slots from queue then backlog |
| `get-or-create-today-plan.ts` | Find or create today's plan; seed anchors; run bubble-up |
| `get-today-view.ts` | Full Today screen data in one call |
| `complete-today-item.ts` | Mark item done, complete task, run bubble-up, check badges |
| `swap-today-item.ts` | Move flex item to queue, increment swap count, check reframe |
| `add-to-today-plan.ts` | Add task to today's plan or queue |
| `update-ritual-state.ts` | Set ritual to completed or skipped |

**Server actions (`apps/web/server-actions/daily-plan/`):**
| File | Purpose |
|------|---------|
| `get-today-view.ts` | Server action wrapping domain function |
| `complete-plan-item.ts` | Auth check + call completeTodayItem |
| `swap-plan-item.ts` | Auth check + call swapTodayItem |
| `update-ritual.ts` | Auth check + call updateRitualState |
| `add-to-plan.ts` | Auth check + call addToTodayPlan |

**UI (`apps/web/app/dashboard/`):**
| File | Purpose |
|------|---------|
| `page.tsx` | Server component: calls getOrCreateTodayPlan + getTodayView, renders TodayClient |
| `_components/TodayClient.tsx` | Client component: full Today home screen |
| `_components/TodayCard.tsx` | Single task card (anchor or flex) with actions |
| `_components/MorningRitual.tsx` | Morning ritual flow (skippable) |

**Domain package exports (`packages/domain/package.json`):**
All 7 daily-plan modules exported as `"./daily-plan/<name>"` paths (added `reframe-today-item` in M4.5 session 2).

**Additional files from M4.5 session 2:**
- `packages/domain/src/daily-plan/reframe-today-item.ts` — snooze (24h) + lower (priorityLevel→low) reframe actions
- `packages/domain/src/daily-plan/__tests__/` — 7 test files covering all daily-plan functions (part of the 153-test domain suite)
- `apps/web/server-actions/daily-plan/reframe-plan-item.ts` — server action for snooze/lower
- `apps/web/app/dashboard/_components/TodayClient.tsx` — backlog drawer (QueueRow), single-task mode, reframe wired to real actions

**Test files created:**
| File | Tests |
|------|-------|
| `server-actions/tasks/__tests__/complete-task.test.ts` | 5 tests |
| `server-actions/tasks/__tests__/defer-task.test.ts` | 6 tests |
| `server-actions/tasks/__tests__/update-task-priority.test.ts` | 8 tests |
| `lib/sync/__tests__/use-sync-stream.test.ts` | 6 tests (jsdom) |

(The table above lists the original M4 apps/web tests — 84 at that checkpoint.)

**Current test totals (end of M4.5):** **153** domain unit tests across 12 files, plus the apps/web server-action + hook tests listed above, plus **12** Playwright E2E tests. All passing.

---

#### 5.14.10 M4.5 — Known Remaining Work

**Completed since last checkpoint:**
- ✅ **Domain unit tests** — 153 tests across 12 files (daily-plan + preferences suites)
- ✅ **"All tasks" backlog drawer** — `QueueItem` type + `queueItems` in `getTodayView`, `QueueRow` component, priority-ranked, capped at 20, overflow note
- ✅ **Reframe actions** — `snooze` (24h `reframeSnoozedUntil`) and `lower` (`priorityLevel='low'`) are real DB writes via `reframeTodayItem` domain fn + `reframePlanItemAction` server action; `break` and `anchor` are honest forward-pointing toasts (M5+)
- ✅ **"What should I do now?" single-task mode** — client-side toggle in `TodayClient`; hides all but the top card; "One thing at a time" / "Show everything" button in header

- ✅ **Priority picker at capture** — two-picker row below capture input: (1) Flexible|Anchor kind toggle, (2) Bronze/Silver/Gold level chips visible only when Flexible selected; Anchor shows "Time-pinned · set time in task details" hint instead; Silver/Flexible default; resets after capture
- ✅ **suppressHydrationWarning on `<body>`** — fixes Grammarly extension causing React hydration mismatch in layout.tsx
- ✅ **Manual smoke test passed** — capture, ritual, single-task mode, backlog drawer, Done + bubble-up all verified

- ✅ **Settings UI (Today settings)** — account page section with: visible-slots stepper (1–5), Gentle Reframe on/off toggle, threshold slider (3–7). Persists to `user.preferences` JSON via `updateUserPreferences` domain fn + `updatePreferencesAction`. Changing visibleSlots also updates today's `DailyPlan.visibleSlots` immediately. New plans read the preference in `getOrCreateTodayPlan`. Swap action + dashboard `getTodayView` honor the threshold (and disable via `Number.MAX_SAFE_INTEGER` when toggle off). 14 new unit tests (153 total).
- ✅ **E2E Playwright tests** — 12 scenarios across `apps/web/e2e/today-core.spec.ts` + `today-features.spec.ts`, all passing. Harness in §5.14.12.
- ✅ **Concurrency fix (found by E2E)** — `bubbleUp` Phase 2 now uses `createMany({ skipDuplicates: true })` instead of per-row `create`. Previously, a capture's `router.refresh()` racing a 5s sync poll could both pull the same backlog task and violate the `(daily_plan_id, task_id)` unique constraint → 500. Would have hit real users.

**M4.5 is complete.** All remaining items done.

---

#### 5.14.11 Environment & Tooling Notes

| Item | Detail |
|------|--------|
| Dev server port | `3000` (verify `NEXTAUTH_URL` in `.env.local` matches) |
| Package manager | `pnpm` — on Windows PowerShell, invoke via `& "$env:APPDATA\npm\pnpm.ps1"` |
| Run tests | `cd packages/domain && pnpm test` or `cd apps/web && pnpm test` (run per-package, not via turbo) |
| DB schema changes | `pnpm db:push` (never `migrate dev`) |
| Daily test reset | `pnpm reset:test` (or `/reset-test-data`) — wipes today's plan + active tasks, seeds 3 anchors + 6 flex. `pnpm reset:test:hard` for a full nuke. Loads `.env.local` itself; dates are dynamic. |
| Reset a daily plan | `node scripts/reset-today-plan.js` (lighter — plan items only; needs DATABASE_URL set) |
| Seed tomorrow's anchors | `node scripts/create-tomorrow-anchors.js` |

---

#### 5.14.12 E2E Playwright Harness

**Location:** `apps/web/e2e/`. Config: `apps/web/playwright.config.ts`.

**Run:** `cd apps/web && pnpm test:e2e` (also `:ui`, `:headed`). **The dev server must already be running on :3000** — the config has no `webServer` block (Playwright's auto-spawn was unreliable because `/` 307-redirects for auth, breaking its readiness probe).

**Auth bypass (database sessions):** There is no UI login in the tests. `e2e/global-setup.ts` seeds a dedicated user (`e2e@focusforge.test`) + a `sessions` row, then writes `e2e/.auth/state.json` (gitignored) with the `next-auth.session-token` cookie. Every test starts authenticated via `use.storageState`. `global-teardown.ts` deletes the user + all its data.

**Isolation:** `workers: 1`, `fullyParallel: false` — all specs share the ONE test user, so parallel runs would race on its data. Generous timeouts (60s test / 15s expect) for the slow Bluehost DB.

**Key helpers** (`e2e/helpers/`):
- `test-user.ts` — `seedTestUser`, `cleanupTestUser`, `createFlexTask`, `resetTestUserData`, `skipRitualForUser`, `addQueueItems`, `getLatestPlanId`, `resetPreferences`. Instantiates its own `PrismaClient` (worker process; loads `.env.local` via `env.ts`).
- `spec-base.ts` — re-exports `test`/`expect` + helpers, and `gotoDashboardReady(page, userId)` which navigates, skips the morning ritual (so the card area / empty state is what's under test, not the ritual prompt), and reloads.

**Gotchas baked into the specs:**
- Queue items only exist after a swap; unstarted backlog tasks aren't "queue". To test the drawer, fill all 3 today slots first (else `bubbleUp` promotes the seeded queue items), then `addQueueItems`.
- Settings writes are optimistic in the UI but commit slowly to the DB — poll the DB (`expect.poll`) before navigating to assert the persisted effect.
- The dashboard header subtitle also contains "Nothing pressing", so the empty-state assertion matches the unique `/That's allowed/i`.

---

### 5.15 M5 Implementation Record — Walk Me Through It

**Status:** Complete. Manual step creation + full-screen single-step Walk-Through, verified end-to-end (browser + 5 E2E tests).

**Framing (until M7):** Steps are **manual only**. No AI promises. Button copy is "Add steps manually"; the empty state says "Voice-driven step generation coming soon." M7 enhances this, doesn't replace it.

**Domain (`packages/domain/src/tasks/`):**
| File | Purpose |
|------|---------|
| `add-step.ts` | Append a step; `stepOrder = max+1`; validates ownership + text length |
| `complete-step.ts` | Mark step done → log `task_step.completed` event → `first_step` badge. When the **last** step finishes, auto-completes the task (logs `task.completed` → `first_complete` badge). Idempotent. Returns `{ taskCompleted, newBadges }`. |
| `reorder-steps.ts` | Takes the full ordered id list. **Two-phase update** inside a transaction (park in a temp range ≥10000, then write 0..n-1) to avoid the `(taskId, stepOrder)` unique-constraint collision. Validates the id set matches exactly. |
| `delete-step.ts` | Ownership-checked delete; gaps in stepOrder are harmless. |
| `list-steps.ts` | Ordered read with ownership check. |

37 new unit tests → **190 domain tests total**. All 5 modules exported in `packages/domain/package.json`.

**Server actions (`apps/web/server-actions/tasks/`):** `add-step`, `complete-step`, `reorder-steps`, `delete-step` — auth + revalidate `/tasks/[taskId]`, `/walk/[taskId]`, `/dashboard`.

**UI:**
- `app/tasks/[taskId]/page.tsx` + `_components/StepsEditor.tsx` — add/reorder/delete steps. **Reorder uses up/down buttons, not drag** (accessibility decision — see roadmap M5 acceptance). Optimistic UI.
- `app/walk/[taskId]/page.tsx` + `_components/WalkThrough.tsx` — full-screen, one step at a time, "Done. Next step.", Pause + **ESC** return to dashboard (resumes at first incomplete step — position persists because completed steps are saved). Calm 🎉 completion screen.
- `TodayCard` gained a "Break into steps →" link (flexible tasks only → `/tasks/[taskId]`).
- `middleware.ts` — added `/walk` to protected paths.

**Badges:** `first_step` (trigger `task_step.completed`) and `first_complete` already seeded in DB; both verified firing.

**E2E:** `apps/web/e2e/walk-through.spec.ts` — 5 scenarios (add step, reorder persists, walk-through auto-completes, ESC-pause-resume, no-steps redirect). **17 E2E tests total.** Helper `createTaskWithSteps` added to `test-user.ts`.

**Known dev-server gotcha (recurring):** Long-running `next dev` occasionally corrupts `.next` incremental chunks (`Cannot find module './vendor-chunks/*.js'` or `'./route-modules/pages/builtin/_error'`). Fix: stop node, delete `apps/web/.next`, restart. Not a code bug.

---

### 5.16 M6 Implementation Record — Analog Timer

**Status:** Complete. Diminishing-wedge focus timer with synthesized Sound Families, vibration, Picture-in-Picture, and badge wiring. Verified end-to-end (browser + 5 E2E).

**Schema:** Added `FocusSession` model (`focus_sessions` table, §4.12): plannedDurationSeconds, actualDurationSeconds, status `running|completed|incomplete|paused` (incomplete is NEUTRAL, never "failed"), soundFamily, timestamps. Relations on User + Task. Pushed via `db:push`.

**Audio = Web Audio synthesis (no asset files).** Sound Families (`soft_chimes`, `singing_bowls`, `pink_noise_pulse`) are parameter specs synthesized client-side in `apps/web/lib/audio/sound-engine.ts`. AudioContext must be unlocked from a user gesture (`unlockAudio()` in the Start handler).

**Domain (`packages/domain/src/timer/`):**
| File | Purpose |
|------|---------|
| `focus-session.ts` | start/pause/resume/end state machine. start→`focus_session.started`→first_focus; end+completed→`focus_session.completed`→focus_complete. Idempotent end. |
| `wedge.ts` | `computeWedge(elapsed, planned)` → fractionRemaining + zone (`fresh`/`mid`/`soon`) + sweepDegrees. Pure. |
| `sound-families.ts` | family + variation synthesis specs; `selectNextVariation` (no consecutive-same — anti-habituation). |
| `vibration-patterns.ts` | `resolveVibration(key, ctx)` → pattern or null (null when haptics off OR prefers-reduced-motion — vibration is motion). |
| `speed-run-hook.ts` | `checkSpeedRunEligibility` — fires `speed-run:eligible` when 2+ tasks complete in 15 min (opt-in; hooks-only, UI later). |

41 new unit tests → **231 domain tests**. All timer modules exported in package.json.

**UI:**
- `packages/ui/src/components/AnalogTimer.tsx` — SVG diminishing wedge, zone colours yellow→green→**mauve** (purple, never red), **no digital countdown**, honours prefers-reduced-motion. **Needs `'use client'`** (uses hooks) — a hooks-in-ui component must declare it or Next's build fails (typecheck won't catch this).
- `app/timer/page.tsx` + `_components/TimerClient.tsx` — setup (presets/custom + sound family + interval) → running/paused (wedge + Pause/Resume/Stop/Pop out) → done (celebration + badges). Tick at 250ms; elapsed tracked client-side across pause via refs.
- `apps/web/lib/pip/timer-pip.ts` — Picture-in-Picture via `documentPictureInPicture`, canvas wedge, `window.open` popup fallback. **Self-driving:** the pop-out runs its OWN interval (registered on the PiP window via `pipWindow.setInterval`) and counts from an absolute end-time, so it keeps running after the user navigates away from `/timer` (client-side nav tears down the React page but the PiP window + its interval survive). On reaching zero it POSTs `/api/timer/complete` so the session ends + `focus_complete` fires even if the user is elsewhere. Parent calls `pip.pause(remaining)`/`pip.resume(endsAtMs)` while mounted.
- `app/api/timer/complete/route.ts` — same-origin POST the pop-out calls on completion (idempotent `endFocusSession`).
- **Navigation handling:** `TimerClient`'s unmount cleanup ends a live session as `incomplete` UNLESS a pop-out is open (then the PiP keeps it alive). No orphaned `running` rows.
- Timer settings: `TimerSettingsClient` on /account — independent sound + haptics toggles. (`tenThreeRuleEnabled` + `speedRunChallengesEnabled` prefs exist but are intentionally **not surfaced** until M20.)
- Dashboard nav gained a "⏱ Focus timer" link.

**Scaffolding hooks (hooks-only, fire events; UX lands later):**
- 10-3 rule: TimerClient fires `recordTenThreeMarkAction` at each 10-min mark when `tenThreeRuleEnabled` (default off) → `ten-three-rule:movement-due` event.
- Speed Run: `complete-plan-item` action calls `checkSpeedRunEligibility` after each completion (default off).

**Badges:** `first_focus` (start) + `focus_complete` (repeatable, on completion) already seeded; both verified firing.

**Preferences:** `parsePreferences` now also returns `soundEnabled` (default true), `hapticsEnabled` (true), `tenThreeRuleEnabled` (false), `speedRunChallengesEnabled` (false).

**E2E:** `apps/web/e2e/timer.spec.ts` — 6 scenarios incl. **`page.clock.install()` + `runFor`** to fast-forward a 1-min timer to completion (verifies focus_complete badge without waiting real time), and a navigation-ends-neutrally regression test. (The pop-out-keeps-running case is verified manually — PiP needs a real user gesture + a separate window, which automation can't drive.)

---

### 5.17 M7 Implementation Record — Voice Dump + AI Parsing

**Status:** Complete. Hold-to-record → Whisper transcribe → GPT-4o-mini parse → tasks created, with daily quotas. All infra + UI shipped and tested; the real-audio happy path is the human smoke test (it spends OpenAI credits).

**OpenAI:** key lives in `apps/web/.env.local` as `OPENAI_API_KEY` (Next loads it automatically). **Must also be added to Vercel env for prod.** `pnpm test:openai` validates it (script now points at `apps/web/.env.local`).

**`packages/ai/` (new deps: `openai`):**
| File | Purpose |
|------|---------|
| `openai-client.ts` | Lazy singleton `getOpenAI()` (reads OPENAI_API_KEY at first use). `__setOpenAIForTests` seam. |
| `whisper-client.ts` | `transcribeAudio(file)` → text (whisper-1). |
| `gpt-task-parser.ts` | `parseTasks(text)` → `ParsedTask[]` via gpt-4o-mini **strict json_schema** + defensive coercion (cant_miss→high on flexible; scheduledFor nulled for flexible). |
| `prompts/task-parsing.ts` | The prompt + JSON schema. anchor only if a fixed time/deadline; cant_miss only for fixed time-bound anchors; never "urgent"/red. |

14 AI unit tests (OpenAI mocked).

**Quota domain (`packages/domain/src/quota/`):**
- `quota-window.ts` — 04:00 UTC quota day (`now−4h` UTC date as a **'YYYY-MM-DD' string**, identical for read + write) + next reset instant.
- `limits.ts` — free-tier caps (voice_dump 10, ai_breakdown 5, ai_decision 3, praise_play 15); comp/paid → unlimited.
- `check-quota.ts` — **fails OPEN** on any error (never block a user on our bug). Returns `resetsAtUtc`.
- `increment-quota.ts` — atomic raw `INSERT … ON DUPLICATE KEY UPDATE` (cuid2 id; needs `@paralleldrive/cuid2`). Best-effort, non-fatal.

19 quota unit tests → **250 domain tests total**.

**Route `apps/web/app/api/voice-dump/route.ts`** (`runtime = 'nodejs'`): auth → checkQuota (gate BEFORE any paid call) → 429 with reset info if exceeded → Whisper → **audio discarded (only in memory, never persisted — Rule 9)** → parseTasks → createTask (+addStep per step) → incrementQuota → return tasks + transcript. 6 integration tests (OpenAI/db mocked, 42 web unit total).

**UI:** `packages/ui/VoiceDumpButton` (hold-to-record MediaRecorder, ping ring + waveform, **`'use client'`**, silent `onMicDenied` fallback). Wired into `TodayClient` between the input and Add; quota-reached card shows local reset time (`toLocaleTimeString` from `resetsAtUtc`) + "Type instead" (focuses the input).

**E2E:** `apps/web/e2e/voice-dump.spec.ts` — 2 scenarios. Drives the **real mic button with a fake audio device** (`--use-fake-device-for-media-stream` + `--use-fake-ui-for-media-stream` + `permissions: ['microphone']` in playwright.config) to hit the quota-reached path — which 429s before any OpenAI call, so **zero cost**. Helper `seedQuotaAtLimit`. **25 E2E total.**

---

### 5.18 M8 Implementation Record — Reverse Scheduler / Doorknob

**Status:** Complete. Backward-calculated, color-zoned departure timeline with one-click "+15", client-side zone notifications, an active-session summary on Today, and the daily cron dispatcher. All tests green (298 domain, 34 E2E).

**⚠ Vercel Hobby gotcha (Session 12):** the Hobby plan only allows **daily** crons — an hourly `0 * * * *` in `vercel.json` makes Vercel **reject the deploy at creation** ("Hobby accounts are limited to daily cron jobs"), and a rejected deploy never appears in the Deployments list (looked exactly like a dead webhook). Schedule is now `0 8 * * *` (daily). Separately, **`prisma generate` must run in the build**, not just `postinstall`: Vercel reuses cached `node_modules` when the lockfile is unchanged, skipping install → stale Prisma client missing new models (e.g. `scheduledAlert`) → type error in the cron route. Fixed by `apps/web` build = `prisma generate … && next build` (+ `prisma` devDep on web).

**Schema:** `ScheduledAlert` model (`scheduled_alerts`, §4.14 verbatim: alert_type/scheduled_for/payload/status/fired_at, cuid PK, pending+scheduledFor and user+scheduledFor indexes). Pushed via `db:push`.

**[DECISION] No doorknob_sessions table.** The 41-table schema deliberately has none — a session IS its set of `doorknob_zone` alert rows (one per zone start), linked by `payload.sessionId`; every payload carries the full session params so the timeline rebuilds from any single row. Create cancels any previous pending doorknob alerts (one session at a time). A session "ends" three neutral ways: completed (out the door), cancelled (plans changed), or arrival passes (alerts swept by cron; `getActiveDoorknob` returns null).

**[DECISION] Zone model** (spec PDFs absent from repo; derived from the doc 02 §9 mockup): working back from arrival — `transit` (user input) ← `door` 10 min ← `gather` max(15, 5×checklist items) ← `wrap_up` 15 min. Defaults in `zones.ts`; gather scales with the checklist in `DoorknobSetup`. Colors: yellow/green/mauve/neutral — same hex palette as AnalogTimer, never red.

**[DECISION] Notification delivery is client-side.** Vercel Hobby cron is hourly — it cannot fire minute-precise zone alerts, and no web-push infra exists. `DoorknobClient` schedules `setTimeout` → browser `Notification` for each pending alert while the page is open (permission via explicit "🔔 Nudge me" button, never auto-prompted). The hourly cron (`/api/cron/hourly`, doc 04 §9 dispatcher pattern, CRON_SECRET-gated) runs `runScheduledAlertsDue()` as the idempotent bookkeeping backstop: pending+due → fired, logs `cron.alerts_swept`.

**Domain (`packages/domain/src/doorknob/`):** `zones.ts` (buildZones/currentPosition/shiftZones, pure), `calculate-schedule.ts` (pure, validates), `_session.ts` (internal payload parse/rebuild), `create-doorknob-session.ts`, `get-active-doorknob.ts`, `recalculate-late.ts` (+1..120 min, pending alerts only — fired stay put), `complete-doorknob.ts` (→ `doorknob.completed` → doorknob_made badge), `cancel-doorknob.ts` (→ `doorknob.cancelled`, no badge). All exported in package.json. 39 new unit tests (3 files) → **298 domain total**. `mock-prisma` gained `scheduledAlert` + `updateMany`/`deleteMany`.

**Web:** `app/doorknob/page.tsx` (server: getActiveDoorknob → setup or live view) + `_components/DoorknobSetup.tsx` (arrival datetime-local, transit presets+custom, freeform checklist one-per-line) + `_components/DoorknobClient.tsx` (timeline, checklist with client-side checkboxes, Running late/Out the door/Cancel, notification timers, auto-refresh at arrival). `packages/ui/DoorknobTimeline` (`'use client'`, horizontal — THE documented single-column exception; proportional segments, live position marker, motion-safe pulse only). Server actions ×4 in `server-actions/doorknob/`. Middleware protects `/doorknob`; dashboard nav gained "🚪 Doorknob".

**[ENHANCEMENT — Session 12] Active session surfaces on Today.** `dashboard/page.tsx` also calls `getActiveDoorknob` and passes a serialized `DoorknobSummary` (departAtIso/startAtIso/arrivalAtIso/positionState) into `TodayClient`. A calm card renders above the task cards: "Leave by {departAt} · start wrapping up at {startAt}", position-aware (highlights + "Time to start getting ready" once `positionState === 'in_zone'`), the whole card linking to `/doorknob`. It auto-clears when arrival passes (getActiveDoorknob → null). Placed ABOVE the task list, NOT in the queue — a time-bound departure must not enter the flexible bubble-up flow (same rationale as the anchor schedule strip). Updates on the dashboard's normal cadence (load + 5s sync poll). 1 new E2E (7 doorknob total).

**Events:** `doorknob.created` / `.recalculated` / `.completed` / `.cancelled` + system `cron.alerts_swept` (noun.verb convention). Badge `doorknob_made` ("On Time", gold, repeatable) was already seeded; verified firing in E2E.

**E2E:** `e2e/doorknob.spec.ts` — 7 scenarios (create→timeline+alerts persisted, +15 shifts all pending alerts exactly 15 min, notification at zone transition via stubbed `Notification` + clock fast-forward, out-the-door→badge, cancel→neutral, active session surfaces on Today + links back, no-red). Helper `getDoorknobAlerts`; reset helpers clean `scheduled_alerts`. **34 E2E total.**

**Deviations from the roadmap text:** page lives at `app/doorknob/` (the repo has no `(app)` route group); "scheduled alerts fire on time" is satisfied client-side with the hourly server sweep as backstop (see decision above); setup is a single calm form rather than a 3-step wizard (same three questions, less navigation).

**Deploy prerequisites:** `CRON_SECRET` added to Vercel env ✅ (Session 12). Vercel Root Directory is **`apps/web`**, so `vercel.json` (cron config) lives at `apps/web/vercel.json` ✅ (moved Session 12 — a repo-root vercel.json would be invisible to Vercel with this setting). Still pending for sign-in on the custom domain `focusforge.tostigames.com`: set `NEXTAUTH_URL` to the domain + add its `/api/auth/callback/google` to the Google OAuth client.

---

### 5.19 M9 Implementation Record — Launchpad

**Status:** Complete. By-the-door checklist with lazy daily reset, dashboard widget, Doorknob integration, and an opt-in nightly reminder. All tests green (341 domain, 39 E2E).

**Schema:** `LaunchpadItem` (`launchpad_items`, §4.11): label (≤120), displayOrder, isChecked, lastCheckedAt, `resetSchedule` ENUM(`never`,`daily`,`on_departure`) default daily. `resetTimeLocal` column exists per spec but v1 treats the reset time as a fixed 04:00 (per-item times activate with per-user timezones, M15.3). Pushed via `db:push`.

**[DECISION] Reset model — lazy on read + daily cron backstop.** Vercel Hobby allows only a DAILY cron, so minute-precise per-user resets are impossible server-side. Instead: (1) `getLaunchpadItems` unchecks any `daily` item whose lastCheckedAt predates the most recent **04:00 workday-timezone boundary** (one idempotent `updateMany`) — the list is always correct the moment it renders; (2) `runLaunchpadResets` in the daily cron does the same for ALL users, keeping the DB truthful for users who don't open the app. `lastCheckedAt` is preserved on reset (it's history and it's what makes the sweep idempotent). Timezone = `WORKDAY_TIMEZONE` constant until M15.3.

**Domain (`packages/domain/src/launchpad/`):** `reset-boundary.ts` (pure 04:00 boundary math; DST-safe via the shared `zonedTimeUtc` now exported from `daily-plan/plan-day.ts` — ONE implementation of the wall-clock→UTC technique), `reset-launchpad.ts` (`resetDailyItems` user/all-users + `resetOnDepartureItems`), `list-items.ts` (lazy reset then ordered read), `add-item.ts` (label 1–120, order max+1), `check-item.ts` (stamps lastCheckedAt; `launchpad_item.checked` event in the same transaction), `update-item.ts` (label/schedule), `reorder-items.ts` (full ordered-id list, validated set), `delete-item.ts`, `nightly-reminder.ts` (below). 39 unit tests incl. DST spring/fall boundary days. All exported in package.json; `mock-prisma` gained `launchpadItem`.

**Web:** 6 server actions in `server-actions/launchpad/` (requireUser guard; add = `create_data`). `/launchpad` page (requirePageUser → lazy-reset read → `LaunchpadClient`): single-column list, big checkboxes, up/down reorder (StepsEditor precedent), per-item schedule select, calm "Ready to go 🚪" all-checked state, 5s-poll cross-device refresh. **`LaunchpadClient` uses React 19 `useOptimistic`** — a plain local-state copy let an interleaved `router.refresh()` from a previous mutation clobber a newer optimistic check (caught by E2E); `useOptimistic` reverts to server truth automatically. Dashboard: compact "N of M by the door →" card (only when items exist; deliberately NOT in the bubble-up flow) + 🎒 nav link; the dashboard load also applies the lazy reset so counts are correct.

**Doorknob integration:** `DoorknobSetup` gets `launchpadLabels` (unchecked items) and an "Add from Launchpad" one-tap prefill into the pre-departure textarea (case-insensitive de-dupe). `completeDoorknobAction` calls `resetOnDepartureItems` after a successful completion (best-effort).

**[DECISION] Nightly reminder (M9.3) defaults OFF.** The roadmap's "default 21:00" is kept as the *time* default, but auto-enabling a nightly notification would violate the no-auto-enable rule (doc 07 anti-patterns). Prefs `launchpadReminderEnabled` (false) + `launchpadReminderTime` ('21:00', validated `TIME_OF_DAY_PATTERN`). `ensureNightlyReminder` converges pending `launchpad_nightly` alert rows to exactly one at the next occurrence of the chosen wall-clock time (self-healing; called from the launchpad page load and the settings action `setNightlyReminderAction`, which saves prefs + schedule together). Delivery is client-side (M8 pattern): the launchpad page arms a Notification timer while open; the daily cron sweeps overdue rows. Settings section on /account (`LaunchpadSettingsClient`); enabling requests browser permission via that click (the required user gesture) with honest copy that it fires while the app is open.

**E2E:** `e2e/launchpad.spec.ts` — 5 scenarios (persist across reload; stale-checked daily items uncheck on next visit while a `never` item survives; dashboard widget links through; Doorknob prefill; no-red). Helpers `createLaunchpadItem` / `getLaunchpadItemsForUser`; `resetTestUserData` clears launchpad rows. **39 E2E total.**

**Deviations from the roadmap text:** per-timezone reset job → lazy-read + daily-cron model above (Hobby cron limit); reminder enabled-by-default → opt-in (time default kept); reset time fixed at 04:00 until per-user timezones (column reserved).

---

### 5.20 M10 Implementation Record — Praise Repository

**Status:** Complete (2026-07-17/18). Trusted contacts, account-less sender flow, R2 audio storage, quota-gated playback, reactive moderation. 386 domain + 14 AI + 47 web unit + 44 E2E, prod build green.

**Schema:** `TrustedContact` (§4.10 — SHA-256-hashed 256-bit invite token, creation+7d expiry, memosRemaining 3, revocation), `PraiseMemo` (§4.9 + `sender_ip VARBINARY(16)` D4 column), `ContentReport` (§4.29). **No hidden flag on memos** — a memo with an OPEN report is excluded from the inbox BY QUERY, so `resolved_no_action` restores visibility automatically (one source of truth).

**Domain (`packages/domain/src/praise/`, 12 modules, 45 tests):** invite-token (pure), create-invite (5-contact free cap), verify-invite (ALL failure modes return one calm message — no reason leaking), revoke-invite (deletes memos in-tx, returns R2 keys for caller cleanup), submit-memo (60s cap, atomic slot decrement, recipient-name precedence, free-tier auto-archive of oldest at 3), list-inbox, list-contacts, play-memo (quota gate before grant, approved soft message VERBATIM as a constant), report-memo (dedupe), set-memo-category, purge-sender-ips (D4 cron), admin-review (content reachable ONLY through open reports — the absent function is the design). **Quota fix:** `praise_play` now caps at 30/day for paid tiers via new `PAID_TIER_LIMITS` (was wrongly unlimited).

**Storage (`apps/web/lib/r2.ts`):** lazy S3Client, server-mediated `putPraiseAudio` (D3 — no CORS needed), signed GETs (1h playback / 30min admin review), best-effort `deletePraiseAudio`. R2 env vars REQUIRED by `lib/env.ts` — boot fails without them (set in Vercel ✅ owner, 2026-07-16). `pnpm test:r2` validated against the dev bucket. SDK pinned to one version (client-s3 + presigner 3.1090.0) — mismatched versions produce gnarly private-property type errors.

**Web:** PUBLIC `/praise/[token]` (middleware protects `/praise` EXACT-match only; MediaRecorder 60s auto-stop, preview, honest privacy fine print incl. the 7-day IP note), `/praise` inbox (play via `/api/praise/play/[id]` → quota → signed URL; speeds 1×/1.25×/1.5×; categories; report modal; Pro transcript gate with soft note; play capability is `read_data` so paused accounts can still listen), `/account/praise-senders` (one-time link reveal + copy, revoke with plain-language confirm), `/api/praise/upload` (verify token → 2MB cap → R2 put → Pro-only transcription at upload → submit; failed submit deletes the object). Dashboard 💜 nav link.

**Moderation (doc 06 §10.6):** `/admin/reports` queue + review page gated by `admin_content_moderate` (404 otherwise). Loading the review page IS the audited access: `content.review_memo` admin_actions row + fresh 30-min URL per view. Resolution requires written notes both ways; removal deletes memo + R2 object, report record stays.

**E2E (5 → 44 total):** full loop (UI-created invite → fresh unauthenticated context → fake-mic recording → REAL R2 upload → memo in inbox), 4th-memo auto-archive via the real upload API, 16th-play soft message verbatim, report-hides-immediately, no-red on both surfaces.

**Locked decisions (2026-07-14):**

| # | Decision | Detail |
|---|---|---|
| D1 | M10 plan approved | Scope per doc 06 M10: trusted contacts, sender flow, inbox, R2 storage, play quotas, reactive moderation. |
| D2 | Invite expiry = **creation + 7 days**, flat | Resolves the roadmap ("7 days after first use") vs schema ("7 days after creation") conflict in the schema's favor. No first-use tracking. |
| D3 | **Server-mediated uploads** | Senders POST audio to our API; the server verifies the token and puts the object in R2. Bucket credentials never reach the browser; the R2 CORS step is unnecessary. |
| D4 | **Sender IP kept 7 days** (owner override of the 24h spec) | Rationale: an abusive memo may not be seen/reported until the recipient next logs in. New `sender_ip VARBINARY(16)` column on `praise_memos`; a daily cron handler nulls it after 7 days. Doc 01 §10.2 and doc 06 §10.2 amended to match. The public sender page states this retention honestly. |
| D5 | Free-tier transcripts stay `transcript_status='pending'` | Semantically "not transcribed yet" — an upgrade can transcribe retroactively. `failed_skip` reserved for actual transcription failures. |

---

## 6. Document Guide

This is your map of the spec set. There are 13 documents in `/docs`:

### Tier 1: Required Reading (Read First, In Order)

#### `AGENTS.md` (this document)
**Purpose:** Single entry point. Establishes roles, decisions, and document hierarchy.
**Read it:** First. Always. Before anything else. Re-read at each session start if context resets.
**Authority:** Highest. If anything in another document conflicts with this one, this one wins.

#### `07-claude-code-instructions.md`
**Purpose:** Detailed operating instructions for AI agents — coding standards, anti-patterns, environment variables, test scripts, framing rules.
**Read it:** Second. After AGENTS.md.
**What's in it:**
- The "What This App Is / Is NOT" framing
- The Inviolable Rules in detail with code examples
- Document set overview and conflict resolution
- Operating constraints (architecture, code style)
- ~50 anti-patterns Claude Code will be tempted toward
- Canonical environment variables list
- Service connection test script specifications
- Code quality standards (TypeScript strict, ESLint config, etc.)
- Pull request template

#### `06-build-roadmap.md`
**Purpose:** The execution plan. 23 milestones broken into atomic tasks with tests, acceptance criteria, and human-action stop points.
**Read it:** When starting a milestone, read that milestone's section thoroughly.
**Structure:**
- Phase Overview at top
- Each milestone has: Goal, Prerequisites, Spec References, Tasks, Tests Required, Acceptance Criteria, Manual Smoke Test, PAUSE POINT
- Human-action steps marked with `🛑 STOP` blocks
- Detailed setup walkthroughs for OAuth (M2), OpenAI (M7), R2 (M10)

### Tier 2: Reference Specs (Read When Working On Related Milestones)

#### `01-authentication-and-user-model.md`
**Purpose:** Auth system spec — sessions, account states, login methods, deletion, legacy users, trusted contacts.
**Read when:** Working on M2 (auth), M14 (account management), or anywhere user identity matters.
**Key sections:**
- §3: Login methods (Google, Facebook, magic link, password)
- §4: Account state machine (active → paused → suspended → pending_delete → deleted)
- §5: Tier system and Comp tier mechanics
- §10: Trusted contacts for praise repository
- §11: Privacy controls

#### `02-design-system.md`
**Purpose:** Visual design — color tokens, typography, components, accessibility, gamification, Module-specific UI patterns.
**Read when:** Implementing any UI component, or in M3 when building the design system primitives.
**Key sections:**
- §1-7: Foundation (colors, type, spacing, shadows, motion)
- §9: Component inventory (canonical Button, Input, etc.)
- §13: Tailwind config strategy (incl. red removal)
- §14: Gamification & stimulation design
- §15: Biddy avatar design
- §16: Time estimation UI patterns
- §17: Mindfulness Bar (Module H) design
- §18: Admin surface design

#### `03-onboarding-flow.md`
**Purpose:** First-touch experience design — progressive discovery, anti-shame patterns, first-session goal.
**Read when:** Working on M14 (onboarding milestone).
**Key sections:**
- Three-phase model (Welcome, First Capture, Discover)
- The "first task completion within 60 seconds" rule
- Skip paths on every step
- Anti-shame messaging patterns

#### `04-mysql-schema.md`
**Purpose:** Full database schema with DDL, indexes, and migration strategy.
**Read when:** Setting up Prisma in M1, working on any feature that touches the DB.
**Key sections:**
- §1: Schema philosophy (the structural Soft-Track Protocol)
- §2: Conventions (cuid PKs, timestamps, soft-delete)
- §3: Schema diagram (high-level table relationships)
- §4: Table definitions (~38 sub-sections, one per table)
- §5: Real-time sync strategy (5-second polling)
- §6: Migration strategy (incl. provider hooks for Bluehost → managed)
- §7: Indexes strategy
- §8: Initial badge seed data
- §9: Vercel cron consolidation
- §10: JSON column validation

#### `05-monetization-strategy.md`
**Purpose:** Free vs Pro tier mechanics, quotas, comp tier, legacy migration, Stripe integration plan.
**Read when:** Implementing quota enforcement, building tier-gated features, or planning M18.
**Key sections:**
- §2.1: Free tier quotas and rationales
- §2.2: Pro tier features and pricing
- §2.3: Legacy tier (grandfathered users)
- §2.4: Comp tier (admin-granted)
- §6: Stripe integration architecture
- §8: Body Doubling Pro-only rationale

#### `08-page-content-and-references.md`
**Purpose:** Static content — About page, References page, footer, disclaimer copy, CI link checker.
**Read when:** Building static pages in M14 or M15.
**Key sections:**
- Page-by-page content specifications
- 78 reference citations in JSON
- Disclaimer copy ("not a clinical service")
- Footer structure
- CI-runnable link checker spec

### Tier 3: Original Source Documents (Reference Only)

These are the original PDFs that started the project. They contain valuable feature narratives and design intent, BUT they were written before the medical framing was removed. **They contain language that violates Inviolable Rule #0.** Treat them as historical context.

#### `ADHD_Forge_Requirements.pdf`
**Purpose:** Original Product Requirements Document. Functional and non-functional requirements.
**Use:** Cross-reference when implementing features, but the markdown specs supersede.
**Watch for:** Old "clinical-grade" framing throughout.

#### `Detailed_ADHD_Forge_Document.pdf`
**Purpose:** Feature narratives explaining each module's design rationale.
**Use:** Helpful for understanding the *why* behind features.
**Watch for:** Persona-driven discussion ("the Psychiatrist's view") — these are old framings.

#### `ADHD_Forge_Tech_Specs.pdf`
**Purpose:** Original technical specs for the build.
**Use:** **Mostly superseded by `04-mysql-schema.md` and `06-build-roadmap.md`.**
**Watch for:** This was the original tech-spec doc and may have outdated decisions (e.g., references to UUIDv7, BINARY storage that we no longer use).

#### `Unified_System_Specification__ADHD_Digital_Toolkit__Google_Docs.pdf`
**Purpose:** Module-by-module implementation logic (Module A through F + later additions).
**Use:** Reference for original module organization. Note: Module letters A-F aren't used in current docs; we refer to features by name.
**Watch for:** Older terminology and persona attribution.

#### `Comprehensive_Multidisciplinary_Framework_for_ADHD_Digital_Toolkit_Design__Google_Docs.pdf`
**Purpose:** The deepest "why" document — extensive research citations, neuroscience grounding, design rationale.
**Use:** Read when you need to understand *why* a feature exists in its current form.
**Watch for:** Heavily medical language. The new framing supersedes this for any user-facing content.

---

## 7. Conflict Resolution

When documents disagree, this is the precedence order:

1. **AGENTS.md** (this document) — highest authority
2. **07-claude-code-instructions.md** — operating constraints
3. **04-mysql-schema.md** — for database decisions
4. **06-build-roadmap.md** — for sequencing and milestone definitions
5. **Tier 2 markdown specs (01, 02, 03, 05, 08)** — for their respective domains
6. **Original PDFs (Tier 3)** — for design intent and feature narratives only

When in doubt:
- If it's about *what* the product does → check the markdown specs
- If it's about *why* a feature exists → the PDFs may help, but use modern framing
- If it's about *how* to implement it → check Doc 04 (schema) and Doc 06 (roadmap)
- If it's about *style/UI* → check Doc 02
- If it's about *anything you're unsure of* → ask the human

---

## 8. Session Start Checklist

Every time you start a fresh session (context reset, new conversation, etc.), do this:

1. **Read AGENTS.md** (this document) — completely
2. **Read 07-claude-code-instructions.md** — at minimum, the Inviolable Rules section
3. **Identify the current milestone** — ask the human "where are we?" if unclear
4. **Read that milestone's section in 06-build-roadmap.md** thoroughly
5. **Read the spec references** for that milestone (typically in Doc 01, 02, 04, or 05)
6. **Summarize back to the human:**
   - What milestone we're on
   - Your understanding of the next task
   - Any prerequisites that need to be confirmed
   - The first concrete action you'll take
7. **Wait for human confirmation** before writing any code

This summary check catches drift, missed context, and misunderstandings before any code is written.

---

## 9. Quick Reference Card

**Current state:** M1–M10 complete. Core loop + Walk Me Through It + Analog Timer + Voice Dump + Doorknob + Launchpad + Praise Repository all done and verified. Next up: M11 (Body Doubling). ⏸ At the M10 PAUSE POINT.

**Milestones completed:** M1 (monorepo + DB), M2 (auth + admin), M3 (design system), M4 (task capture + dashboard), M4.5 (Today core loop — §5.14), M5 (Walk Me Through It — §5.15), M6 (Analog Timer — §5.16), M7 (Voice Dump + AI Parsing — §5.17), M8 (Reverse Scheduler / Doorknob — §5.18), M9 (Launchpad — §5.19), M10 (Praise Repository — §5.20).

**Test count:** 386 domain + 14 AI + 47 web unit tests, + 44 Playwright E2E (praise 5, launchpad 5, doorknob 7, today-core 8, today-features 6, timer 6, walk-through 5, voice-dump 2). All passing — full suite (unit + E2E + prod build) verified green at the end of Session 15 (M10).

**User preferences:** Stored sparse in `users.preferences` JSON (no migrations). Keys: `visibleSlots` (1–5, default 3), `gentleReframeEnabled` (default true), `gentleReframeThreshold` (3–7, default 4), `soundEnabled` (true), `hapticsEnabled` (true), `tenThreeRuleEnabled` (false), `speedRunChallengesEnabled` (false), `launchpadReminderEnabled` (false — opt-in, never auto-enabled), `launchpadReminderTime` ('21:00', HH:MM in the workday timezone). Always read via `parsePreferences()` from `@focus-forge/domain/users/update-preferences` — it clamps and fills defaults. Never read raw JSON directly.

**Quotas:** `@focus-forge/domain/quota/*`. `checkQuota(db, userId, key)` (fail-open) before any paid AI call; `incrementQuota` after. Window resets 04:00 UTC. Free caps: voice_dump 10, ai_breakdown 5, ai_decision 3, praise_play 15. Paid: unlimited EXCEPT praise_play 30/day (usage safeguard, `PAID_TIER_LIMITS`).

**OpenAI:** `OPENAI_API_KEY` in `apps/web/.env.local` (Next auto-loads) — and set in Vercel for prod ✅ (added Session 8). `@focus-forge/ai` exposes `transcribeAudio` + `parseTasks`.

**Next milestone:** M11 (Body Doubling — Jitsi public instance, Pro-gated). M10 is complete — ⏸ confirm before starting M11. Consider slotting enhancement E1 (choose-what-bubbles-up) first — it's small and owner-requested.

**Enhancement backlog (owner-requested, doc 06 top section):** E1 choose-what-bubbles-up on postpone (small; suggested right after M10); E2 photo → "where should I start?" (vision extension of M13). Propose slots at pause points; don't build unprompted.

**Critical dev rules:**
- Use `prisma db push` (NOT `migrate dev`) — Bluehost has no shadow DB support
- Plan day rolls over at midnight Pacific — ALWAYS use `getPlanDate()`/`getPlanDayWindow()` from `daily-plan/plan-day`, never `setUTCHours(0,0,0,0)` (§5.14.4)
- Auth uses database sessions. In server actions and protected pages, use `requireUser(capability)` / `requirePageUser()` from `apps/web/lib/require-user.ts` — NOT a bare `getServerSession` — so account-state rules (paused = read-only, suspended = blocked) are enforced in one place (Session 13)
- Required env vars are validated at startup by `apps/web/lib/env.ts` (via instrumentation.ts) — a new required var must be added to that schema or the server won't boot
- Domain functions return `Result<T, E>` — never throw
- All domain functions accept `db: PrismaClient` as first arg (DI)
- Bubble-up is flex-only — never pulls anchor tasks. Candidate `orderBy` is `[todaySwapCount asc, priorityLevel asc, updatedAt asc]` — swap-count FIRST so a pushed-back task sinks to the bottom (no ping-pong). Don't reorder these keys (§5.14.5).
- Reordering steps: two-phase update (temp range → final) to dodge the `(taskId, stepOrder)` unique constraint
- If `next dev` throws `Cannot find module './vendor-chunks/*'` or `_error`: stop node, delete `apps/web/.next`, restart (stale incremental cache, not a code bug)
- `packages/ui` components that use React hooks MUST start with `'use client'` — tsc won't catch the omission; the Next build will
- After `db:push`/`db:generate`, stop the dev server first (it locks the Prisma query-engine DLL → EPERM)

**Stack quick reference:**
- Frontend: Next.js 15 + TypeScript + Tailwind on Vercel
- Database: Bluehost MySQL (dev) → managed MySQL (prod, TBD)
- ORM: Prisma with `cuid()` PKs — `prisma db push` for schema changes
- Auth: NextAuth v4 database sessions — Google, Facebook, Email magic-link, Email+password
- Storage: Cloudflare R2
- Email: Resend
- Video: Jitsi public instance
- AI: OpenAI Whisper + GPT-4o-mini
- Payments: Stripe (deferred to M18)

**The single most important rule:** No medical or therapeutic framing. Ever. Anywhere.

**The single most important behavior:** When uncertain, stop and ask.

---

## 10. Document Versioning

This document is the source of truth. When decisions change, update this document FIRST, then update the affected spec docs.

**Last updated:** Session 15 (2026-07-14/18) — M10 Praise Repository complete (§5.20). Previously: Session 14 — M9 Launchpad (§5.19). Reverse Scheduler / Doorknob: scheduled_alerts schema, doorknob domain (sessions persisted as alert rows, no new table), DoorknobTimeline UI, /doorknob setup + live view, client-side zone notifications, hourly cron dispatcher, and a calm Doorknob summary card on the dashboard. 298 domain + 14 AI + 42 web unit + 34 E2E, all green; typecheck clean. Smoke-tested and liked by the product owner. CRON_SECRET set locally + in Vercel. ⏸ At the M8 PAUSE POINT — still UNCOMMITTED, awaiting the Vercel Root Directory answer (decides where vercel.json lives) before the M8 push.

**Total spec set:** 10 markdown files (8 tier-2 specs + this AGENTS.md + the living `09-code-map.md` function/usage map), 5 reference PDFs.

**Total lines of spec:** ~15,000+ lines (including implementation record).

**Changelog:**
| Date | Change |
|------|--------|
| Session 1 | Initial spec phase + AGENTS.md creation. Reframing pass. Connection-validation requirement. |
| Session 2 | M1–M4 complete. Prisma db push rule established. Auth database sessions. Result<T,E> pattern locked. |
| Session 3 | M4.5 core loop. Bubble-up flex-only rule. Anchor strip design. Doorknob window. §5.13 expanded. §5.14 added. Quick reference updated. |
| Session 4 | M4.5 finished: backlog drawer, reframe DB writes (snooze/lower), single-task mode, two-picker priority capture, settings UI (visibleSlots/reframe), 153 domain tests, 12 Playwright E2E tests. Fixed bubbleUp race (createMany skipDuplicates). Added morning-reset.js + `pnpm reset:test`. Removed migrate-dev scripts. MySQL MCP + E2E harness set up. |
| Session 5 | M5 complete — Walk Me Through It. Manual step CRUD + reorder (add/complete/reorder/delete/list-step domain fns, 37 tests → 190 total). `/tasks/[taskId]` editor + `/walk/[taskId]` full-screen single-step mode (ESC-pause-resume, auto-complete on last step). first_step + first_complete badges verified. 5 new E2E (17 total). Reorder via accessible up/down buttons (not drag — documented deviation). §5.15 added. |
| Session 6 | M6 complete — Analog Timer. FocusSession schema. Timer domain (focus-session state machine, wedge math, sound-families, vibration-patterns, speed-run-hook; 41 tests → 231 total). AnalogTimer SVG wedge (yellow→green→mauve, no digital countdown). Web Audio synthesis for Sound Families. `/timer` page (presets/custom, pause/resume/stop, PiP pop-out). Sound/haptics settings. first_focus/focus_complete badges. 10-3 + speed-run scaffolding hooks (events-only). 5 new E2E with clock fast-forward (22 total). §5.16 added. Self-driving PiP fix (keeps counting after navigation; /api/timer/complete). |
| Session 7 | M7 complete — Voice Dump + AI Parsing. `@focus-forge/ai` (openai SDK; whisper-client, gpt-task-parser strict-JSON, prompt; 14 tests). Quota domain (quota-window 04:00 UTC, limits, check fail-open, atomic increment; 19 tests → 250 domain). `/api/voice-dump` route (quota-gate → Whisper → parse → create tasks → increment; audio never persisted; 6 integration tests). `VoiceDumpButton` (hold-to-record + mic-denied fallback) + quota-reached card in TodayClient. 2 E2E driving a fake mic device to the 429 quota card without hitting OpenAI (25 total). §5.17 added. **Bugfix:** `getTodayView` queue is now the TRUE backlog (all active flexible tasks not in a today slot), so a capture made while slots are full no longer silently vanishes — it shows in "N more in the queue" + drawer. Added a capture confirmation toast + a "never vanishes" E2E. |
| Session 8 | **Bugfix — push-back ping-pong.** `_bubble-up.ts` rewritten from the old Phase 1 (promote queue) / Phase 2 (pull backlog) split into ONE unified candidate pool = the true backlog, ranked `[todaySwapCount asc, priorityLevel asc, updatedAt asc]`. Swap-count FIRST means a pushed-back task drops to the bottom of the queue, so a *different* task surfaces instead of the same high-priority one boomeranging back. Update-or-create per candidate (swapped-back tasks flip their existing queue row; never-shown tasks get a fresh row), P2002-tolerant. `getTodayView` backlog `orderBy` matched to the same keys so the drawer order = surface order. Rewrote `bubble-up.test.ts` for the unified behavior; updated `get-today-view.test.ts` orderBy assertion; added a ping-pong regression E2E. §5.14.5 rewritten. 248 domain + 26 E2E, all green. Browser-verified: two consecutive push-backs cycled Gold→Silver→Bronze with both Golds sinking to the bottom of the queue. |
| Session 9 | **First real Vercel deploy + git landing.** Found ALL of M4.5–M7 uncommitted (origin stuck at `ae3364d`); committed as 7 logical commits (chore build fix → foundation → M4.5 → M5 → M6 → M7 → tests+docs) and pushed `main`. **Deploy fix:** added root `postinstall: prisma generate` — cache-skipped Vercel installs never generated the Prisma client, so `next build` died with "@prisma/client did not initialize". Also gitignored `*.tsbuildinfo`. Verified a local `next build` (all 21 routes compile) before pushing; Vercel deploy went green (the turbo "cannot find binary path" was a local-only pnpm-shim-not-on-PATH quirk, irrelevant on Vercel). `OPENAI_API_KEY` added to Vercel env. Google OAuth login verified locally (earlier "Unexpected end of JSON input" was a transient dev-restart/stale-tab artifact — endpoints return valid JSON; signin POST hands back the correct Google OAuth URL). No code/test changes — repo at `590ad2e`. |
| Session 10 | **Full-suite baseline before M8 — all green, no code changes.** Ran every suite at `797d508`: 248 domain (26 files), 14 AI (2 files), 42 web unit (7 files), 27 Playwright E2E — all passing. `tsc --noEmit` clean on apps/web. Corrected the Quick Reference E2E count (26 → 27; the tally had drifted by one across Sessions 6–8). **Finding:** `packages/domain` and `packages/ai` have a `typecheck` script but NO tsconfig.json — their standalone typecheck has never worked (src is only checked transitively via apps/web's tsc; their test files aren't checked at all). Flagged for a separate fix, not blocking M8. Reproduced the local-only turbo "cannot find binary path" quirk (`pnpm dev` at root fails; `cd apps/web && pnpm dev` works). M8 plan drafted and approved-pending: no new table (Doorknob sessions persisted as `scheduled_alerts` rows), client-side browser notifications + hourly cron backstop, zones Yellow wrap-up → Green gather → Mauve door → transit. **Timezone fix — plan day now rolls over at midnight Pacific** (the UTC approximation flipped the dashboard to a new day at 4–5 PM for the Oceanside-based product owner): new `daily-plan/plan-day.ts` (`WORKDAY_TIMEZONE='America/Los_Angeles'`, `getPlanDate` label + `getPlanDayWindow` real instants, DST-safe via two-pass Intl offset); swapped into dashboard page, get-today-view + update-preferences actions, `seedAnchors` window, and `reset-today-plan.js`; 11 new unit tests (259 domain total); verified live during the 5 PM–midnight divergence window (01:53 UTC June 11 → planDate June 10 ✓) + full E2E green. Per-user timezone preference added to roadmap M15.3 (§5.14.4 rewritten). Workspace standards docs created at projects root (PROGRAMMING-PRACTICES.md, STYLE-GUIDE.md, TOSTIG.md) and wired into CLAUDE.md. |
| Session 11 | **M8 complete — Reverse Scheduler / Doorknob (§5.18).** `ScheduledAlert` schema (§4.14). Doorknob domain: pure zone math + backward calculator, session lifecycle persisted AS `doorknob_zone` alert rows linked by payload.sessionId (no new table — deliberate), one-session-at-a-time, +15 recalc shifts pending alerts only, complete→doorknob_made badge, cancel neutral. `DoorknobTimeline` UI (horizontal — the documented single-column exception; AnalogTimer palette). `/doorknob` setup + live view with client-side zone Notifications (explicit opt-in button) and arrival auto-resolve. Hourly cron dispatcher `/api/cron/hourly` (doc 04 §9 pattern, first handler `runScheduledAlertsDue`) + root `vercel.json`. 39 new domain tests (298 total), 6 new E2E (33 total), all suites + 5-package typecheck green. Pending human deploy steps: CRON_SECRET in Vercel env; confirm vercel.json location vs project Root Directory. |
| Session 12 | **M8 enhancement — active Doorknob session surfaces on Today** (user request). `dashboard/page.tsx` now also fetches `getActiveDoorknob` and passes a serialized `DoorknobSummary` to `TodayClient`, which renders a calm position-aware card ("Leave by X · start wrapping up at Y") above the task list, linking to `/doorknob`; auto-clears when arrival passes. Placed above the cards, deliberately NOT in the bubble-up queue (time-bound ≠ flexible). 1 new E2E → 7 doorknob / 34 total; typecheck clean. CRON_SECRET added to local `.env.local` + Vercel env. Still uncommitted; awaiting Vercel Root Directory answer before the M8 push. *(Resolved between sessions: M8 landed as `3e173e0`, vercel.json moved to apps/web, daily-cron + prisma-generate-in-build deploy fixes, root redirect, "Done" button label, Resend error surfacing — all pushed through 2026-06-15.)* |
| Session 13 | **Code review + hardening pass (2026-07-01).** Created `09-code-map.md` (living function/usage map) and reviewed the codebase against workspace PROGRAMMING-PRACTICES.md; then fixed all findings, high → low. **Security (high):** (1) Account state is now ENFORCED for live sessions — new `apps/web/lib/require-user.ts` guard (`requireUser(capability)` for all 17 server actions + voice-dump/timer-complete routes, `requirePageUser()` for all protected pages) wires the previously-orphaned `users/account-state.ts` domain rules: paused = read-only (calm copy), suspended = blocked; suspending also revokes the user's `sessions` rows in the same transaction; new cron handler `restoreExpiredPauses` heals expired pauses (guard already treats them as active on read). (2) Rate limits on the email-sending auth endpoints: password reset 3/hour per account (audit-log-backed, anti-enumeration response unchanged), magic link 3 per 15-min token lifetime (verification-token-backed — works for unknown emails). (3) Password reset now revokes ALL live sessions in the reset transaction. **Medium:** startup env validation (`lib/env.ts` Zod schema + `instrumentation.ts`, fails boot loudly, names-only errors; deviation: lives in apps/web not packages/config — that package is tsconfig-presets-only); Zod on `/api/timer/complete` body; domain `createTask` now validates estimatedMinutes (int 1–10080) + scheduledFor (valid Date); admin form dates validated before Prisma; 5 MB voice-dump audio cap; admin audit rows + mutations now commit in ONE `$transaction` (logAdminAction accepts a tx client) — the trail can no longer record an action that didn't happen; `completeTodayItem`'s 3 writes wrapped in a transaction + its silent badge-catch now logs. **Cleanup (low):** 17 tracked zip archives removed from git (`*.zip` gitignored; files kept on disk); dead M4 code deleted (DashboardClient, complete-task/defer-task/update-task-priority/get-today-view actions + 19 tests, list-active-tasks + list-steps domain fns + 4 tests, exports pruned — domain completeTask/deferTask KEPT as tested scaffolds for the task-detail UI); signin audit event records the real `account.provider`; `/dev/test-plan` now server-gated (`notFound()` in prod) instead of shipping with a client-side throw. Fixed reset-password mislabeled error (`token_invalid` vs `weak_password`). CLAUDE.md server-action template updated to the guard pattern. New tests: 13 require-user, 5 env, 5 password-reset, 8 create-task validation. **Totals: 302 domain + 14 AI + 46 web unit + 34 E2E, all green; tsc clean (web + domain); prod build compiles all 30 routes; dev server boots with env validation live.** Retention plan for append-only tables confirmed already documented (doc 04 §11) — implementation lands with the launch-prep milestones as spec'd. *(Post-session: all 9 commits pushed 2026-07-07; Vercel production deploy succeeded at `20a1ef0`. A "test locally against the live dev server before committing" working rule was added at the owner's request — recorded in TOSTIG.md.)* |
| Session 14 | **M9 complete — Launchpad (§5.19), 2026-07-09/11.** `launchpad_items` schema (§4.11). **Reset model:** lazy-on-read (most recent 04:00 workday-time boundary, DST-safe via `zonedTimeUtc` — now the ONE shared wall-clock→UTC helper exported from `plan-day.ts`) + `runLaunchpadResets` all-users daily-cron backstop; `lastCheckedAt` preserved for idempotency. Launchpad domain ×9 (list/add/check/update/reorder/delete, reset-boundary, reset-launchpad, nightly-reminder; 39 tests → 341 domain). 6 requireUser-guarded server actions. `/launchpad` page: single-column big-checkbox list, up/down reorder, per-item schedule select, calm all-packed state; **`useOptimistic` rewrite** after E2E caught a stale-refresh race clobbering optimistic checkbox state. Dashboard: "N of M by the door →" card + 🎒 nav link. Doorknob: "Add from Launchpad" prefill (de-duped) + `on_departure` reset on completion. **Nightly reminder (opt-in — documented deviation from roadmap default-on):** prefs `launchpadReminderEnabled`/`launchpadReminderTime` ('21:00'), `ensureNightlyReminder` converges `launchpad_nightly` alert rows (self-healing), `setNightlyReminderAction` saves prefs + schedule together, `LaunchpadSettingsClient` on /account requests notification permission on the enabling click, client-side delivery + cron sweep (M8 pattern). 5 new E2E (persist, boundary reset incl. `never` survivor, widget, prefill, no-red) → **39 total. Totals: 341 domain + 14 AI + 47 web unit + 39 E2E, all green; tsc clean; prod build green.** ⏸ At the M9 PAUSE POINT; M10 (Praise Repository) next — needs R2 credentials (human action). *(Post-session: M9 pushed + Vercel deploy verified green at `059ee15`; owner-requested enhancements E1/E2 captured in doc 06's new Enhancement Backlog (`4dfa52e`).)* |
| Session 15 | **M10 complete — Praise Repository (§5.20), 2026-07-14/18.** Owner locked D1–D5 (incl. the 7-day sender-IP retention override — doc 01 §10.2 + doc 06 amended) and set up Cloudflare R2 (buckets + token + env vars local/Vercel; `pnpm test:r2` green). Schema: `trusted_contacts`, `praise_memos` (+`sender_ip` D4), `content_reports` — hidden-on-report is DERIVED by query, no flag. Praise domain ×12 (45 tests → 386 domain): hashed invite tokens, calm single-message verify, atomic memo-slot spend, recipient-name precedence, free-tier auto-archive at 3, quota-gated play with the approved soft message verbatim, reactive moderation with content reachable ONLY via open reports. Quota fix: `praise_play` capped at 30/day for paid (`PAID_TIER_LIMITS` — was wrongly unlimited). `lib/r2.ts` (server-mediated upload D3, no CORS; 1h/30min signed URLs; R2 vars now REQUIRED at boot). Public `/praise/[token]` sender page (exact-match middleware carve-out, 60s MediaRecorder, honest privacy fine print incl. 7-day IP note), `/praise` inbox (speeds, categories, report modal, Pro transcript gate), `/account/praise-senders` (one-time link reveal), `/api/praise/upload` + `/api/praise/play/[id]`, `/admin/reports` review (per-access audit rows, 30-min URLs, notes-required resolutions). Cron: `runSenderIpPurge`. 5 new E2E incl. the full account-less sender loop with a REAL R2 upload (fake mic, zero OpenAI) → **44 E2E total. Totals: 386 domain + 14 AI + 47 web unit + 44 E2E, all green; tsc clean; prod build green (36 routes).** AWS SDK versions must match exactly (client-s3 + presigner both 3.1090.0) or tsc throws private-property type errors. ⏸ At the M10 PAUSE POINT; M11 (Body Doubling) next — consider E1 first. |
