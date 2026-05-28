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

**Inviolable within the loop:** no red, no failed/overdue states, no breakable streaks, no shame, single-column Today (Rules 1, 2, 3, 5, 6). The loop must answer "what now?" without ever overwhelming or shaming.

**Build priority:** Milestone 4.5 — immediately after task capture (M4), BEFORE all goodies (Biddy animations, mini-games, HUD, body doubling). If only one thing ships, it's this.

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

**Current state:** Spec phase complete. Tech stack locked. Ready for M1.

**Next action:** Validate Bluehost MySQL connection works from outside Bluehost (per the human's explicit requirement) before committing to other M1 setup steps.

**Stack quick reference:**
- Frontend: Next.js 15 + TypeScript + Tailwind on Vercel
- Database: Bluehost MySQL (dev) → managed MySQL (prod, TBD)
- ORM: Prisma with `cuid()` PKs
- Auth: NextAuth v4 — Google, Facebook, Email magic-link, Email+password
- Storage: Cloudflare R2
- Email: Resend
- Video: Jitsi public instance
- AI: OpenAI Whisper + GPT-4o-mini
- Payments: Stripe (deferred)

**The single most important rule:** No medical or therapeutic framing. Ever. Anywhere.

**The single most important behavior:** When uncertain, stop and ask.

---

## 10. Document Versioning

This document is the source of truth. When decisions change, update this document FIRST, then update the affected spec docs.

**Last updated:** Session ending with reframing pass + connection-validation requirement + AGENTS.md creation.

**Total spec set:** 9 markdown files (8 tier-2 specs + this AGENTS.md), 5 reference PDFs.

**Total lines of spec:** ~12,000+ lines.

**Status:** Ready for handoff to Claude Code in VS Code, pending Bluehost MySQL connection validation.
