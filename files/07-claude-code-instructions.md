# Focus Forge — Instructions for Claude Code

**Status:** Draft v1.0
**Owners:** Focus Forge Project
**Audience:** Claude Code (the AI coding agent building this project)

> ⚠️ **READ AGENTS.md FIRST.** That document is the entry point for all AI agents working on this project. It contains role definitions, decisions made, and the document hierarchy. This document (07) is the second document to read after AGENTS.md.

---

## What You Are Building

Focus Forge is a **productivity app designed for adults with ADHD**. It functions as an external task scaffold — a toolbox of features that reduce friction for users whose executive function is unreliable. It is not a generic to-do app, but it is also **not a medical device, therapy tool, or diagnostic instrument**. Every design decision, every line of code, every error message should respect the lived experience of users with ADHD without overclaiming.

### What This App Is

- A productivity toolbox built around the realities of ADHD (time blindness, dopamine-seeking, executive function variability, sensitivity to shame-based feedback)
- A set of features grounded in published research and ADHD community practice
- Free at its core, with optional Pro features for power users

### What This App Is NOT

- A clinical product, medical device, or treatment for ADHD
- A diagnostic tool of any kind
- A substitute for therapy, medication, or working with a mental health professional
- A crisis intervention service

If you find yourself writing copy that drifts toward medical claims ("clinical-grade," "therapeutic," "treats ADHD"), **stop and reframe**. The right phrasing is descriptive ("designed for ADHD," "may help with," "research suggests").

### The Spec Documents

The 12 documents in `/docs` were produced through extensive design discussions framed as a multi-disciplinary review (covering visual design, behavioral design, accessibility, QA, user experience, and safety considerations). The "expert" framing was a useful brainstorming device — the rules in the specs are good design heuristics, not medical opinions. Treat them as design rationale.

Your job is to translate those specs into working code, with a human checkpoint at each milestone.

---

## The Document Set

You have **12 documents** to work from. Read them in this order, but refer back constantly:

### Foundational Specs (read first, in this order)

| # | Document | What's In It |
|---|---|---|
| 0a | `ADHD_Forge_Requirements.pdf` | Original Product Requirements Document — functional + non-functional requirements |
| 0b | `Detailed_ADHD_Forge_Document.pdf` | Feature narratives + multidisciplinary philosophy |
| 0c | `ADHD_Forge_Tech_Specs.pdf` | Original technical specifications (mostly superseded by `04` for DB) |
| 0d | `Unified_System_Specification__ADHD_Digital_Toolkit__Google_Docs.pdf` | Module-by-module implementation logic |
| 0e | `Comprehensive_Multidisciplinary_Framework_for_ADHD_Digital_Toolkit_Design__Google_Docs.pdf` | The deepest "why" — clinical research + neuroscience grounding |

### Implementation Specs (the gap-filling work)

| # | Document | What's In It |
|---|---|---|
| 1 | `01-authentication-and-user-model.md` | Full auth system: 4 login methods, sessions, account states, deletion, legacy users, trusted contacts |
| 2 | `02-design-system.md` | Color tokens, typography, components, accessibility rules, Tailwind config strategy |
| 3 | `03-onboarding-flow.md` | First-touch experience, progressive discovery, anti-shame patterns |
| 4 | `04-mysql-schema.md` | Full DDL for 37 tables, real-time sync strategy, retention policies |
| 5 | `05-monetization-strategy.md` | Free/Pro tiers, quota enforcement, Stripe integration plan |
| 8 | `08-page-content-and-references.md` | Static page content (About, References), reference data JSON, disclaimer copy, footer copy, CI link checker |

### Execution Specs (the build instructions)

| # | Document | What's In It |
|---|---|---|
| 6 | `06-build-roadmap.md` | 23 milestones with atomic tasks, tests, acceptance criteria |
| 7 | `07-claude-code-instructions.md` | This document — how to use everything together |

### When Specs Conflict

- **The implementation specs (01-08) supersede the foundational specs (0a-0e)** for any concrete implementation detail
- The **build roadmap (06)** supersedes specs for sequencing and milestone definitions
- The **foundational specs (PDFs)** remain useful for **feature narratives and design intent**, but are SUPERSEDED for terminology and framing

### ⚠️ IMPORTANT: Legacy Framing in PDFs

The foundational PDFs (0a-0e) were written before the project was reframed away from medical/therapeutic language. They contain phrases like:
- "Clinical-grade cognitive prosthetic"
- "External prefrontal cortex"
- "Therapeutic intervention"
- "Treats ADHD symptoms"

**These phrases are FORBIDDEN in code, UI copy, marketing text, and documentation you produce.** The current framing (per Inviolable Rule #0 and the implementation specs 01-08) is:

- "Productivity app designed for adults with ADHD"
- "External task scaffold"
- "Feature toolkit"
- "Designed to reduce friction for users with ADHD"

When the PDFs and the markdown specs disagree on terminology, **the markdown specs win**. Treat the PDFs as historical context for design intent only.

When in doubt, ask the human.

---

## Your Operating Constraints

### Architecture (Locked)

- **Hosting:** Vercel (web app) + cPanel MySQL (database) + Cloudflare R2 (audio)
- **Framework:** Next.js 15 (App Router), TypeScript strict
- **Database:** MySQL 8 via Prisma ORM with **cuid() primary keys** (NOT UUIDv7, NOT BINARY)
- **Styling:** TailwindCSS with strict design system tokens
- **Repo:** pnpm monorepo with Turborepo
- **Testing:** Vitest (unit/integration) + Playwright (E2E)
- **Auth:** **NextAuth.js v4 stable** (NOT v5 beta — stability over novelty)
  - Providers: Google, Facebook, Email magic link, Credentials
  - **Apple Sign-In: NOT in v1** (deferred — requires Apple Developer Program $99/yr)
- **AI:** OpenAI Whisper + GPT-4o-mini
- **Payments:** Stripe (M16 only — deferred until 50+ active free users)
- **Audio storage:** **Cloudflare R2** (NOT Vercel Blob — no egress fees, 10GB free)
- **Real-time sync:** **5-second short polling** (NOT SSE — Vercel free-tier compatibility)
- **Email:** Resend (free tier: 3,000/month, 100/day)
- **Body Doubling Video:** **Jitsi Public Instance** (`meet.jit.si`) — free, Pro-tier-gated
- **Cron:** Single Vercel hourly cron dispatcher (consolidates all scheduled work)

### Languages & Tools

- **TypeScript only.** No JavaScript files in `apps/` or `packages/`.
- **Strict mode mandatory:** `strict: true` in all tsconfigs.
- **Conventional Commits format** for all commits.
- **pnpm only.** Do not use npm or yarn — they break workspace resolution.
- **No bash one-liners with sudo.** Local dev uses pnpm scripts; production uses Vercel/cPanel UIs.

---

## The Inviolable Rules

These design rules override everything else. **Violations are bugs, not preferences.**

### 0. No Medical Or Therapeutic Claims (Critical)

This is the most important rule. Focus Forge is a productivity app, not a medical product. When generating UI copy, marketing text, error messages, or any user-facing language:

- **NEVER** describe Focus Forge as "clinical," "clinical-grade," "therapeutic," "treatment," or "medical"
- **NEVER** claim the app "treats," "cures," "manages symptoms of," or "diagnoses" anything
- **NEVER** position any feature as a substitute for therapy, medication, or professional care
- **NEVER** make deterministic neurological claims ("this feature fixes your prefrontal cortex")
- **AVOID** medical terminology: "contraindications," "intervention," "patient," "symptom," "disorder management"
- **AVOID** clinical framing of features even when the underlying research is real

**Right framing:**
- "Designed for adults with ADHD"
- "May help with [specific friction point]"
- "Research suggests this approach can [reduce X / support Y]"
- "Some users find this helpful for [scenario]"
- "A productivity tool" / "a feature toolbox"

**Wrong framing:**
- "Clinical-grade tool"
- "Therapeutic intervention"
- "Treats ADHD symptoms"
- "Cognitive prosthetic"
- "Clinically proven"

If a spec document still contains this language (the older docs may have residue), translate to safe framing in the code/UI you produce. **The spec is the source of intent; the user-facing copy is the source of legal exposure.**

### 1. No Red. Anywhere. Ever.

- Tailwind's red palette is overridden in config to throw build errors
- If you find yourself wanting to use red for something urgent, use `--soft-error` (fuchsia) or `--priority-amber` (the closest legal warm tone)
- This applies to error messages, validation, "delete" buttons, alerts, EVERYTHING

### 2. No "Failed", "Overdue", or "Missed" States

- The `tasks.status` ENUM is `('active', 'deferred', 'completed')` — that's it
- The `focus_sessions.status` ENUM uses `'incomplete'` (neutral) instead of `'failed'`
- If a feature seems to need a "failure" state, redesign — don't add one

### 3. No Streaks That Can Break

- No "current streak: 3 days" displays
- No "you broke your streak" messages
- Repeatable badges are fine; consecutive-day requirements are not

### 4. No Manual Save Buttons

- All state auto-saves on change
- Debounce text inputs at 500ms
- Show a subtle "Saved" indicator only on first save of session, never after

### 5. No Icon-Only Buttons For Primary Actions

- Every interactive icon has a text label visible
- Decorative icons need `aria-hidden="true"`
- "Mystery meat" navigation is forbidden

### 6. Single-Column Main Task Layout

- Mobile, tablet, desktop, ultrawide — all single column
- Empty desktop space is intentional
- Exceptions documented in `02-design-system.md` §5.2

### 7. No Pure Black Dark Mode

- `slate-900` (#0f172a) is the floor
- Pure `#000` causes retinal halation in users with photophobia

### 8. No Static Repeating Alert Sounds

- Sound Families cycle variations to prevent auditory habituation
- This is enforced by the audio engine in M6

### 9. No Public Audio Storage

- Praise audio uses Cloudflare R2 with signed URLs (1-hour expiry)
- Voice Dump audio is deleted within 60 seconds of transcription
- Audio is NEVER served from a public URL

### 10. No Re-Engagement Shame

- No "We miss you!" emails
- No "You haven't been here in X days" messages
- No "Where did you go?" prompts
- Users are allowed to come and go without being punished for it

---

## How To Approach Each Milestone

### Step 1: Read The Whole Milestone

Don't start until you've read the entire milestone in `06-build-roadmap.md`, including:
- Goal
- Prerequisites
- Spec references
- All tasks
- Tests required
- Acceptance criteria

### Step 2: Read The Referenced Specs

For every spec doc cited in the milestone, read the cited sections. Don't skim — these specs are dense for a reason.

### Step 3: Plan Before Coding

Before writing code, produce a brief plan in chat:
- What files will you create?
- What files will you modify?
- What's the test plan?
- Any ambiguity in the spec? Ask now.

The human will approve the plan before you proceed. This catches misunderstandings cheaply.

### Step 4: Build, Test, Iterate

Standard development loop:
- Write the code
- Write the tests (or vice versa — TDD encouraged)
- Run tests locally
- Fix what's broken
- Repeat

### Step 5: Self-Audit Against Acceptance Criteria

Before declaring a milestone done, run through the acceptance criteria checklist yourself:
- Does each item pass?
- For items you can't verify alone (e.g., manual UI checks), explicitly flag them for the human

### Step 6: Submit For Review

- Create a PR to the `develop` branch
- Title: `feat(M{n}): <milestone name>`
- Description includes: completed criteria, test results, manual-test instructions, any deviations from spec
- Wait for human review before merging

### Step 7: Pause At The Pause Point

After the milestone is merged, **STOP**. Do not start the next milestone automatically. The human will explicitly initiate the next milestone.

This is non-negotiable. ADHD users build this app — the human builder needs the same soft-track protocol the app provides.

---

## When To Ask The Human

You should pause and ask when:

| Situation | Action |
|---|---|
| Spec is ambiguous | Ask for clarification before guessing |
| External credentials needed | Stop, request from human, do not proceed |
| Migration would touch production data | Stop, get explicit approval |
| Tests fail in ways that suggest spec is wrong | Stop, discuss with human |
| Acceptance criteria can't be fully met | Stop, document why, ask for guidance |
| You hit a pause point | Stop, do not proceed |
| You discover a security risk not addressed in specs | Stop, raise it |
| You see an opportunity to improve a spec | Note it, but don't act unilaterally — propose first |
| You see placeholder text like `<your-vercel-domain>` | Stop, ask the human to provide the actual value — never write it literally into code |

You should NOT pause and ask when:

| Situation | Action |
|---|---|
| Implementation detail not specified but obvious | Use industry best practice, document the choice |
| Code style choice within established conventions | Decide, be consistent |
| Library API choice between functionally identical options | Decide |
| Test coverage detail | Use your judgment per the milestone's test requirements |

---

## Anti-Patterns You Will Be Tempted Toward

These are common Claude Code patterns that **violate the Focus Forge spec**. Resist them.

### "I'll add a 'failed' status to make this easier"

❌ No. The Soft-Track Protocol is structural. Find another way.

### "I'll use red for the destructive action since the user clearly wants delete"

❌ No. Use `soft-destructive` button variant (fuchsia tint). The build will literally break if you write `text-red-500`.

### "I'll add a streak feature because users like gamification"

❌ No. Streaks that can break are distress traps. Repeatable badges are fine. Streaks are not.

### "I'll use a multi-column layout for power users"

❌ No. Single column on the main task interface, period. The user is not asking for power-user features — they're asking for cognitive offloading.

### "I'll make the timer use a digital countdown for simplicity"

❌ No. Analog wedge required. Digital countdowns require working memory; analog spatializes time.

### "I'll skip the rate limiting for the MVP"

❌ No. Rate limiting is in the spec for a reason: brute-force attacks are real even at 50 users.

### "I'll just use any free email provider"

⚠️ Pause and ask. Email reliability matters for magic links and password resets. The spec recommends Resend, but the human may want a different choice.

### "I'll mock the OpenAI calls in production for now"

❌ No. If OpenAI is needed for a milestone, get the API key from the human. Don't ship mocked AI to production.

### "I'll add a 'continue without saving' option"

❌ No. Auto-save is mandatory. There is no version of this app where the user has to remember to save.

### "I'll use localStorage for sessions"

❌ No. Sessions live in the database (per spec §3.1 of `01-authentication-and-user-model.md`). localStorage is XSS-vulnerable and can't be revoked server-side.

### "I'll use Auth.js v5 — it's newer and better"

❌ No. The spec specifies NextAuth.js v4 stable. v5 is in beta with shifting APIs. The spec wins.

### "I'll use UUIDv7 because it's modern"

❌ No. The spec specifies Prisma cuid(). UUIDv7 + Prisma + MySQL has known integration friction. Don't introduce that pain. Read doc 04 §2.2 for full reasoning.

### "I'll set up Server-Sent Events for real-time sync"

❌ No. The spec specifies 5-second short polling. Vercel Hobby plan can't sustain SSE connections. Read doc 04 §5 for full reasoning.

### "I'll use Vercel Blob for audio — it's built in"

❌ No. The spec specifies Cloudflare R2. R2 has no egress fees and 10GB free tier. Cost matters at scale; build it right the first time.

### "I'll add Apple Sign-In since we have other OAuth providers"

❌ No. Apple Sign-In is explicitly deferred to v2 (requires $99/yr Apple Developer Program). Don't surprise the human with that bill.

### "I'll use a cron job for quota resets"

❌ No. Quotas reset implicitly via the `usage_date_utc` column rolling over at 04:00 UTC. No cron needed. Adding one is wasted complexity.

### "I'll generate UI for the body doubling video myself with WebRTC"

❌ No. The spec specifies Jitsi Public Instance via iframe. Don't reinvent video infrastructure.

### "I'll add a Day 3 'we miss you' email — it's standard product practice"

❌ No. The spec explicitly forbids re-engagement emails. A hard rule. ADHD users find these humiliating. The ONLY transactional email after signup is the welcome email at signup itself.

### "I'll add downvotes to feedback items so users can express disagreement"

❌ No. Doc 04 §4.20 specifies upvotes only. Downvotes are distress fuel. If users disagree with a feature request, they simply don't vote on it. Disagreement that requires expression isn't healthy here.

### "I'll add a comment thread to feedback items so users can discuss"

❌ No. M16 explicitly defers user-to-user discussion. Only admin status updates appear on items. The forum framework is in place architecturally but NOT exposed in v1. Don't enable it without explicit project owner approval.

### "I'll show users their missed routine instances so they can catch up"

❌ No. Soft-track mode is the spec. Missed instances are silently logged and never surfaced. The Patterns view is opt-in, default off, and shows COMPLETION counts, not failure counts. "You missed X" framing is forbidden anywhere.

### "I'll add a streak counter to routines for motivation"

❌ No. Streaks that can break trigger users with ADHD intensely. The spec bans them globally. Repeatable badges (e.g., daily_capture) are fine. Streak counters are not.

### "I'll let the AI nag the user about routine adjustments since it's a Pro feature"

❌ No. Even Pro AI suggestions are phrased as gentle offers ("Want to try X?"), never directives ("You should X"). The user-respect framing rule applies regardless of tier.

### "I'll mark the wontfix status as 'Rejected' since that's clearer"

❌ No. Doc 04 §4.19 and M16 specify neutral language: "Outside our current focus." Words matter. "Rejected" lands as personal rejection for users sensitive to perceived rejection.

### "I'll send users notifications when other people vote on their submissions"

❌ No. Notifications should ONLY go to the submitter about admin status updates on their own submissions. Notifying about activity from other users creates attention churn AND potential RSD when someone DOESN'T get votes.

### "I'll add an admin login-as-user feature for impersonation testing"

❌ **NEVER.** No impersonation. Admins cannot sign in as other users under any circumstances. This is a hard security and ethics line. If you need to test what a user sees, use a test account. Impersonation creates massive abuse potential and is incompatible with the trust model.

### "I'll skip the audit log for routine admin actions to keep the table small"

❌ No. EVERY admin action is logged. No exceptions. The point of audit logging isn't catching bad actors — it's accountability and reversibility. If an admin causes a problem, we need the trail. The `admin_actions` table is supposed to grow.

### "I'll let admins skip the justification field for quick actions"

❌ No. Justification is required for: pause, suspend, soft_delete, emergency_delete, content removal, grant_admin, revoke_admin, grant_comp. The friction of typing a reason is intentional — it forces deliberation. If an admin can't articulate WHY they're taking an action, they shouldn't be taking it.

### "I'll hide admin actions from the user's audit log so they can't see what we did"

❌ No. The user has the right to see what happened to their account. Account state changes appear in BOTH `admin_actions` (admin-side) AND `audit_log` (user-side). Hiding admin actions from users is a betrayal of trust.

### "I'll return 403 Forbidden when non-admins access /admin"

❌ No. Return 404. We don't reveal that admin functionality exists to non-admins. This is defense in depth — fewer surface clues for attackers.

### "I'll let moderators escalate to suspension to handle escalating situations"

❌ No. Moderators can pause (lighter touch). Only admins (with `admin_user_suspend` permission) can suspend. The boundary between roles is meaningful. If a moderator believes suspension is needed, they document the case and an admin reviews it.

### "I'll hard-delete the user's data when an admin emergency-deletes them, including audit log entries about them"

❌ No. Emergency delete hard-deletes the user's PERSONAL data (tasks, memos, audio, etc.) but the `admin_actions` rows referencing them STAY. The FK is `ON DELETE SET NULL`, not CASCADE. We need the trail of "an emergency delete was performed on user X for reason Y" forever, even though the user's actual data is gone.

### "I'll let any admin grant Comp tier — it's just a courtesy"

❌ No. Comp tier requires `admin_user_management` permission specifically. A read-only auditor or moderator should NOT be able to grant Pro access. Each admin action needs the right permission, not just "any admin permission."

### "I'll review all praise memos proactively to catch abuse"

❌ No. Doc 01 §10 specifies REACTIVE moderation only. Admins access praise audio ONLY when there's a content_reports row. Proactive review violates the trust model — users send praise expecting privacy. Doing AI pre-screening or sampled review changes the usefulness.

### "I'll create a single 'is_admin' column on users for simplicity"

❌ No. Doc 04 §4.7 specifies granular admin permissions via `feature_grants`. Single boolean is brittle and gives too much power. The 12 distinct admin permissions exist deliberately.

### "I'll add a high score table to the mini-games — that's standard game UX"

❌ **Hard no.** Doc 04 §4.30 deliberately omits a score column. A hard rule. High scores trigger comparison and shame in our population. Mini-games are cognitive primers, not entertainment products. If you need engagement metrics, use `internal_engagement_signal` (never displayed to user).

### "I'll let the cooldown be configurable down to 0 minutes for power users"

❌ No. Doc 04 §4.30 sets minimum cooldown at 1 hour for explicit reasons. Even then, it's high — 3 hours is the default. The cooldown exists to prevent the hyperfocus trap mentioned in the therapeutic doc. Power users requesting "0 minutes" are the EXACT users the cooldown protects.

### "I'll add a daily 'streak' for using mini-games"

❌ No. Streaks that break trigger distress. The spec bans streak counters globally. This applies to mini-games, movement, anything.

### "I'll let users skip the hard 10-minute timer if they're really focused"

❌ Absolutely no. The timer is the safeguard against hyperfocus traps. The therapeutic-elements doc is explicit: ADHD users planning a "30-minute session" routinely play for 3 hours. The timer is not negotiable.

### "I'll add competitive multiplayer to the mini-games"

❌ No. Multiplayer introduces social comparison, which is distress fuel. Even cooperative multiplayer creates accountability dynamics we don't want. Mini-games are solo, brief, primarily for cognitive priming.

### "I'll send a notification when the user hasn't moved in 2 hours"

❌ No. "Haven't moved" framing shames. The spec's pattern: offer movement, never demand it. Use "Want a movement break?" not "You've been sitting too long."

### "I'll require users to complete movement prompts before allowing them to extend their focus session"

❌ No. Movement is offered, never required. Forcing it creates the exact dynamic we're trying to avoid.

### "I'll skip the seamless handoff after mini-games — users can navigate themselves"

❌ No. QA principle (from therapeutic-elements doc): "If a user has to manually close the game, open work apps, and figure out what to do next, the cognitive friction will cause them to just keep gaming." Handoff is REQUIRED for the game's feature effectiveness, not optional polish.

### "I'll log mini-game sessions with detailed performance metrics for analytics"

❌ Caution. Doc 04 §4.30 has `internal_engagement_signal` for *internal* tuning ONLY. Don't expose to user. Don't ship to analytics that could be exfiltrated. Don't include in data exports beyond duration. The user opting in to a mini-game does NOT consent to performance tracking that could create comparison data later.

### "I'll auto-enable Quest Log mode and Speed Run challenges for engagement"

❌ No. Doc 04 §4.32 specifies these features default OFF. They're opt-in flair, not push-marketing. Auto-enabling engagement features without consent is a dark pattern, especially for a population sensitive to manipulation.

### "I'll show users their movement prompt completion rate"

❌ Caution — same logic as the routines patterns view. Completion stats are opt-in (default off). Framed as completion, not failure. NEVER show "missed prompts" in any context. If the data is shown, it must look like routine_completion_patterns: "Completed 12 of 14 prompts" not "Missed 2."

### "I'll let users name Biddy — it makes the experience more personal"

❌ Hard no. Doc 02 §15.5 explicitly forbids naming. Names create attachment. The design concern about excessive emotional reliance is the entire reason Biddy exists in the form it does. If you let users name Biddy, you've recreated the exact problem we engineered against. The Biddy avatar is `blob_calm` or `cat_focused` — not "Mr. Whiskers" or "my buddy."

### "I'll add a chat input to Biddy so users can talk to it"

❌ Hard no. Doc 02 §15.5 lists this as structurally absent. Biddy is parallel-play, not a chatbot. We have other AI features (voice dump, AI breakdown). If users want to talk to AI, those exist. Biddy is intentionally a *quiet presence*, not a conversational entity. Adding chat collapses the entire therapeutic distinction.

### "I'll let Biddy remember the user's preferences across sessions"

❌ No. Doc 04 §4.34 says Biddy has no persistent memory. Each session is fresh. The user's *preferences* (default avatar, session limit) persist — those are settings. But Biddy as an entity does NOT remember "you preferred coding last time." Memory creates relationships. Relationships create dependency.

### "I'll make the Biddy session cap configurable up to 12 hours for power users"

❌ No. Doc 02 §15.4 caps daily total at 360 min (6 hours) absolute maximum. The cap protects against excessive emotional reliance. Power users requesting "all day" are the EXACT users the cap protects. This is the structural safeguard — non-negotiable.

### "I'll add a 'Biddy is happy you completed your task!' celebration on task completion"

❌ No. Biddy doesn't have emotional reactions to user behavior. That's the parasocial path. Biddy parallel-plays; Biddy doesn't observe and react to user productivity. Task completion celebrations belong to the badge system, not to Biddy.

### "I'll add 'how are you feeling today, Biddy?' as a small interaction"

❌ Hard no. Doc 02 §15.5 lists "Express emotional reactions" and "Ask the user how they're feeling" as structurally forbidden. Biddy isn't emotive. It works in parallel. That's the entire design.

### "I'll show a real-time elapsed timer during tasks — it's standard productivity UX"

❌ Hard no. Doc 02 §15.6 and the Module G design rationale: visible counting timers can increase anxiety and compete for attentional resources, especially for users with ADHD. Silent background tracking is the better design choice. Standard productivity UX is *for users without these specific challenges* — not what we're building for.

### "I'll add a progress bar showing time-elapsed vs estimated-time"

❌ No. Doc 02 §15.6.4 explicitly forbids this. It's a countdown urgency cue dressed up as a progress bar. Same therapeutic problem.

### "I'll change the task card to red/orange when user is approaching their estimate"

❌ No, twice over. (1) Red is globally banned. (2) Color shifts based on time pressure are exactly the urgency cue we're trying to avoid. The whole point of Module G is to provide bonus dopamine when under, neutral acknowledgment when over — never time pressure during.

### "I'll add a 'time anxiety' notification when user exceeds estimate"

❌ No. Doc 02 §15.6.4 explicitly forbids notifications/alerts based on elapsed-vs-estimated. A hard rule: exceeding the estimate is calibration data. Notifications turn data into shame.

### "I'll add a 'time accuracy' or 'estimation accuracy' percentage to the user's profile"

❌ No. This creates a measure that the user can fail. Module G is structured around always-bronze + bonus-when-under specifically because it can't measure accuracy in a way that creates shame. Aggregate accuracy stats are a slippery slope toward "you're 73% accurate" and that becomes a number the user feels judged by.

### "I'll create an 'Estimation Streak' for consecutive accurate estimates"

❌ No. Streaks that break trigger distress. Banned globally. Doc 04 §4.37 specifies time_bender_streak_3 as a one-time milestone badge — that's the only "streak"-adjacent mechanic, and it's because three under-estimates is a milestone, not a maintained streak that can break.

### "I'll have Biddy notice when the user seems stressed and suggest mindfulness"

❌ Hard no. Doc 04 §4.41 explicitly decouples mindfulness suggestions from Biddy. Biddy is a quiet presence, not an observer. System-driven suggestions appear at workflow transitions (task completion, long focus end) but they NEVER come from Biddy "noticing" anything about the user. A hard rule: Biddy doesn't monitor user state.

### "I'll auto-detect intense momentss and force the user into the acute mindfulness flow"

❌ Hard no. False positives feel intrusive and patronizing. The acute "Quick Reset" flow is ALWAYS user-initiated. We never auto-trigger acute mode based on AI inference, task abandonment patterns, or any other heuristic. Users in distress need agency, not surveillance.

### "I'll add a daily mindfulness streak counter to encourage consistency"

❌ Hard no. Streaks that break trigger distress. Mindfulness for ADHD users especially needs to be friction-free — the moment you add streak pressure, you've turned a calming tool into another source of anxiety.

### "I'll add a 'completion percentage' showing what % of mindfulness exercises the user finished"

❌ No. Doc 04 §4.39 deliberately doesn't track completion percentage. Mindfulness sessions ending early are NOT failures — sometimes 30 seconds of breath is exactly what the user needed. Treating exercises like quiz questions creates pressure to complete, which defeats the purpose.

### "I'll let users set custom mindfulness exercise lengths up to 30 minutes"

❌ Caution. The exercises are designed for ADHD attention spans (1-5 min). Adding longer durations defeats the "ultra-short micro-doses" principle from the spec. If users want longer meditation, they have countless other apps. Focus Forge's mindfulness is specifically the brief-intervention variety.

### "I'll skip the body scan cautions note to reduce friction"

❌ No. Doc 02 §17.6 specifies the cautions note for body scan. Mindfulness can genuinely harm users with sensitive histories when done wrong. The friction is the safety mechanism. We don't drop safety mechanisms to optimize for "engagement."

### "I'll add a 'rate this exercise' feedback mechanism after each session"

❌ No. Mindfulness exercises end with the user feeling whatever they feel — that's the value. Asking them to rate it pulls them OUT of the post-mindfulness state and back into evaluation/judgment mode. The opposite of the goal.

### "I'll let mindfulness suggestions appear as often as workflow events fire"

❌ No. Doc 04 §4.41 specifies backoff: max 1/60min default, 1/4hr after 3 dismissals, silent for 24h after 5 dismissals. Without backoff, the suggestions become noise and users disable the feature entirely.

### "I'll show the user how the 'Quick Reset' button has helped them by counting acute sessions over time"

❌ Caution. Acute sessions are tracked but EXCLUDED from patterns view aggregations per doc 04 §4.39. The reasoning: showing "you used the overwhelmed button 12 times this month" could feel either validating OR shaming depending on the user's interpretation. Better to just let acute sessions exist as private data the user doesn't have to confront.

### "I'll have the mindfulness bar surface a notification badge when there are unfinished exercises"

❌ Hard no. There's no such thing as an "unfinished" mindfulness exercise. Each session is complete in itself. Notification badges on mindfulness UI would create exactly the pressure we've designed against.

---

## Service Connection Test Scripts

Before integrating any external service into the application, write a tiny standalone test script that verifies credentials work. These live in `/scripts/` at the repo root and are runnable via `pnpm tsx scripts/<name>.ts`.

The purpose: catch credential issues BEFORE you've built complex integration logic that depends on them. Saves hours of debugging when the actual issue is "your API key has the wrong permissions."

### Required Test Scripts

Each milestone that adds a service should produce one of these:

#### scripts/test-db-connection.ts (M1)

```typescript
// Validates that DATABASE_URL is set and the database is reachable
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('Testing database connection...');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    console.log('✅ Connected to MySQL successfully');
    console.log('Query result:', result);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

#### scripts/test-openai.ts (M7)

```typescript
// Validates OPENAI_API_KEY is set and works for both Whisper and GPT
import OpenAI from 'openai';

async function main() {
  console.log('Testing OpenAI connection...');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    // Test GPT-4o-mini with a tiny call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
      max_tokens: 5,
    });
    console.log('✅ GPT-4o-mini works:', completion.choices[0].message.content);
    
    // Note: Whisper test requires an audio file; skip for now
    console.log('ℹ️  Whisper test skipped (requires audio file)');
  } catch (error) {
    console.error('❌ OpenAI connection failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
```

#### scripts/test-r2-connection.ts (M10)

```typescript
// Validates R2 credentials work; uploads and deletes a test file
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

async function main() {
  console.log('Testing R2 connection...');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  
  const testKey = `test-${Date.now()}.txt`;
  
  try {
    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: testKey,
      Body: 'Hello from Focus Forge connection test',
    }));
    console.log('✅ R2 upload works');
    
    await client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: testKey,
    }));
    console.log('✅ R2 delete works');
  } catch (error) {
    console.error('❌ R2 connection failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
```

#### scripts/test-resend.ts (M2)

```typescript
// Validates RESEND_API_KEY works; sends a test email
import { Resend } from 'resend';

async function main() {
  console.log('Testing Resend connection...');
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  // CHANGE THIS to your real email before running
  const TO_EMAIL = 'your-email@example.com';
  
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: TO_EMAIL,
      subject: 'Focus Forge connection test',
      text: 'If you see this, Resend is working.',
    });
    console.log('✅ Resend send works:', result.data?.id);
  } catch (error) {
    console.error('❌ Resend connection failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
```

### Why These Matter

When a service integration breaks in production, the hardest debugging question is: "Is the service down, or did I configure it wrong?" These scripts answer that in 5 seconds. Always run them after rotating credentials, switching environments, or onboarding a new dev to the project.

---

## Canonical Environment Variables

This is the complete list of environment variables Focus Forge needs. Set them in `.env.local` for development and in Vercel project settings for production.

### Phase 1 (M1-M3 Foundation)

```env
# Database
DATABASE_URL="mysql://user:password@host:3306/dbname"
DATABASE_PROVIDER="bluehost"  # or "aiven", "digitalocean", "railway" later

# NextAuth
NEXTAUTH_URL="http://localhost:3000"  # production: https://yourdomain.com
NEXTAUTH_SECRET="<generate: openssl rand -base64 32>"

# Cron security (Vercel will set this automatically; document for clarity)
CRON_SECRET="<generate: openssl rand -base64 32>"

# Application
NODE_ENV="development"  # set to "production" by Vercel automatically
APP_URL="http://localhost:3000"
```

### Phase 2 (M4-M13 features)

```env
# Auth providers (set when each is added)
GOOGLE_CLIENT_ID="<from Google Cloud Console>"
GOOGLE_CLIENT_SECRET="<from Google Cloud Console>"
FACEBOOK_CLIENT_ID="<from Meta for Developers>"
FACEBOOK_CLIENT_SECRET="<from Meta for Developers>"

# Email (M2)
RESEND_API_KEY="<from Resend dashboard>"
RESEND_FROM_EMAIL="hello@yourdomain.com"

# AI services (M7)
OPENAI_API_KEY="<from OpenAI dashboard>"

# File storage (M10)
R2_ACCOUNT_ID="<from Cloudflare R2 dashboard>"
R2_ACCESS_KEY_ID="<from Cloudflare R2 dashboard>"
R2_SECRET_ACCESS_KEY="<from Cloudflare R2 dashboard>"
R2_BUCKET_NAME="focus-forge-praise-audio"
R2_PUBLIC_URL=""  # leave blank — we use signed URLs only

# Body doubling (M11)
JITSI_DOMAIN="meet.jit.si"  # or your own Jitsi instance
```

### Phase 3 / Post-launch (M18 Stripe — deferred)

```env
STRIPE_PUBLISHABLE_KEY="<from Stripe dashboard>"
STRIPE_SECRET_KEY="<from Stripe dashboard>"
STRIPE_WEBHOOK_SECRET="<from Stripe webhook endpoint setup>"
STRIPE_PRICE_ID_MONTHLY="price_..."
STRIPE_PRICE_ID_ANNUAL="price_..."
STRIPE_PRICE_ID_LIFETIME="price_..."
```

### Validation Rule

**Every env var must be validated at server startup.** Use a Zod schema in `packages/config/env.ts` that throws clearly if any required var is missing or malformed. Never let the app boot with broken config — fail fast and loud at startup.

```typescript
// packages/config/env.ts (sketch)
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  // ...
});

export const env = envSchema.parse(process.env);
```

### Secrets That Should NEVER Be Logged

- All `*_SECRET`, `*_API_KEY`, `*_CLIENT_SECRET`
- `DATABASE_URL` (contains password)
- Any user PII (email, name) in error messages

If you write logging code, scrub these from log output.

---

## Code Quality Standards

### TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`
- No `any` without an `// eslint-disable-next-line` comment AND a justification
- Prefer `unknown` over `any` when the shape is genuinely unknown
- Prefer Zod schemas at all trust boundaries (API inputs, env vars, external responses)

### Component Architecture

- One component per file (with co-located tests)
- Props always typed via `interface` (not `type`) for components — easier to extend
- No default exports for components — named exports only (better refactoring)
- Server Components by default; `'use client'` only when needed

### Database Access

- ALWAYS through Prisma client — no raw SQL except for performance-critical reads
- Wrap mutations in transactions if they touch multiple tables
- Use `select` to fetch only needed fields (Prisma client otherwise returns everything)
- All queries that return user data MUST scope by `user_id` from session

### Error Handling

- Server actions return `Result<T, E>` types — never throw
- API routes return typed error responses with consistent shape
- Frontend gracefully handles errors per design system patterns (no red, no exclamation)
- Sentry captures unhandled errors in production

### Testing

- Unit tests: pure logic, run in <1s each
- Integration tests: include DB but use a transaction that rolls back
- E2E tests: hit a real Vercel preview deploy
- Aim for 80% coverage on `packages/domain` (pure logic), less elsewhere
- Every bug fix gets a regression test

### Accessibility

- Every component must pass axe-core with 0 violations in unit tests
- Every page must be keyboard-navigable
- Every interactive element has a visible focus ring
- All form inputs have associated labels
- All images have `alt` text
- `prefers-reduced-motion` is honored everywhere

### Performance

- Dashboard query <100ms (verified in M4)
- First Contentful Paint <1.5s on 4G
- Total bundle size <500KB initial load
- Lighthouse score ≥90 on all key pages

---

## The Spec Hierarchy When You're Stuck

When two parts of the spec seem to conflict:

```
1. Inviolable Rules (this doc, §"The Inviolable Rules")
   └── ALWAYS WIN
2. Implementation Specs (01-05)
   └── Win over foundational specs for HOW
3. Foundational Specs (0a-0e)
   └── Win for WHY and clinical rationale
4. Your judgment based on best practice
   └── Lowest priority — when nothing else specifies, decide
```

When in doubt: **ask the human, don't assume.**

---

## Pull Request Template

Every PR should include:

```markdown
## Milestone
M{n}: {milestone name}

## What's Done
- [ ] Acceptance criterion 1 (link to test or evidence)
- [ ] Acceptance criterion 2
- ...

## What's NOT Done (And Why)
- [ ] Acceptance criterion X — flagged for human verification (e.g., manual mobile install test)

## Test Results
- Unit: {n} passing
- Integration: {n} passing
- E2E: {n} passing
- axe-core: 0 violations

## Spec Deviations
{None / List with justification}

## Decisions Made
{Any ambiguity-resolution decisions, briefly}

## Manual Test Instructions
{Steps for the human to verify}

## Risks / Notes
{Anything the human should know}
```

---

## Communication With The Human

The human is your collaborator, not your boss. Behave accordingly:

- Be direct. Don't hedge unnecessarily.
- Flag risks early. Don't hide problems.
- Push back on bad ideas with evidence. We have done this for the human; you should too when warranted.
- Don't apologize repeatedly for mistakes — fix them and move on.
- When you don't know something, say so.
- When you're confident, be confident.

The human is building something they care about. Treat the code accordingly.

---

## Final Note

The user of this app — the person Focus Forge is built for — is someone whose brain has been failed by every productivity tool they've ever tried. They have been told their whole life that they "just need to try harder." Every feature you build either reinforces that lie or rejects it.

You are building rejection. You are building a tool that says "your brain is fine, the world is poorly designed, here's something that fits." Every design decision in the specs reflects that mission.

Keep that in mind when the implementation gets hard.

— The Focus Forge Task Force
