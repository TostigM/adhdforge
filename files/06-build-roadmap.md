# Focus Forge — Build Roadmap

**Status:** Draft v1.0
**Owners:** Focus Forge Project
**Architecture:** Vercel + cPanel MySQL + Monorepo + Prisma
**Builder:** Claude Code (primary) with human review at milestone gates

---

## How To Use This Document

This roadmap is structured for an AI coding agent to execute step by step. Each milestone is **atomic, verifiable, and rollback-able**.

### Reading Order
1. Read this entire file before starting Milestone 1.
2. Read the milestone you're working on in full before any code is written.
3. Refer to spec docs (`01–05`, `07`, `08`) when implementation details are unclear.
4. **Stop at every milestone gate** for human verification.

### What Each Milestone Contains
- **Goal** — One sentence: what's working at the end
- **Prerequisites** — What must be done first
- **Spec references** — Which other docs to consult
- **Files** — What to create/modify
- **Tasks** — Atomic, ordered steps
- **Tests** — Automated tests required (TDD encouraged but not mandatory)
- **Acceptance criteria** — Pass/fail gate
- **Manual smoke test** — What the human verifies
- **Pause point** — ✅ Safe to stop here

### Conventions
- All paths relative to monorepo root
- All commands assume `pnpm` package manager
- All code TypeScript with `strict: true`
- All tests use Vitest (unit/integration) + Playwright (E2E)
- All commits follow Conventional Commits format

---

## Phase Overview

```
PHASE 1: FOUNDATION (3 milestones)
  M1: Monorepo + Vercel + DB connection
  M2: Authentication system + Admin foundation
  M3: Design system primitives (incl. animation tokens)

PHASE 2: VERTICAL SLICES (10 milestones)
  M4: Task capture + dashboard
  M5: Walk Me Through It
  M6: Analog Timer (incl. 10-3 rule integration)
  M7: Voice Dump + AI parsing
  M8: Reverse Scheduler / Doorknob
  M9: Launchpad
  M10: Praise Repository
  M11: Body Doubling
  M12: Body Check-Ins
  M13: Decision Paralysis Breaker

PHASE 3: LAUNCH PREP (9 milestones)
  M14: Onboarding flow + first-session experience
  M15: PWA + offline + production hardening
  M16: Bug & Feature Request Tool (community feedback infrastructure)
  M17: Routines & Task Templates (recurring schedules)
  M19: Mini-Games (Pattern Match, Reaction Tiles, Word Builder)
  M20: Movement Integration (prompts, exercise tiers, expanded check-ins)
  M21: Biddy (AI Body Double Companion)
  M22: Module G — Time Estimation & Safe Urgency
  M23: Module H — Mindfulness Bar (5-4-3-2-1, breath, body scan, RAIN)

POST-LAUNCH (deferred):
  M18: Monetization (Stripe integration, Pro tier)
```

**Note on M16 ordering:** The Bug & Feature Request Tool intentionally ships in Phase 3 — early users need a way to report issues from day one.

**Note on M17 ordering:** Routines depend on the task system (M4) but don't directly depend on M14 or M15. They're sequenced after M15 for milestone discipline.

**Note on M18:** Build the entire app on the free tier first. Add paid-tier infrastructure once you have real users to validate pricing assumptions.

**Note on M19 and M20 ordering:** Mini-games and movement integration ship in Phase 3 because they're enhancements rather than core features. The core Focus Forge experience (M4-M13) works without them.

**Note on M21 (Biddy) ordering:** Biddy depends on Body Doubling (M11) being in place — they share the "parallel play" conceptual surface. M21 builds on the M11 foundation. Biddy is the largest illustration/animation effort in the project (135+ Lottie clips minimum), which warrants placing it later in the roadmap.

**Note on M22 (Module G) ordering:** Module G requires the task system (M4), badge system (M3), and quota infrastructure (M7). It's sequenced last in Phase 3 because the calibration data becomes more useful once users have substantial task history.

**Note on milestone numbering:** The actual SHIP order is: M14 → M15 → M16 → M17 → M19 → M20 → M21 → M22 → (launch) → M18 (post-launch monetization). M18 retains its post-launch position despite the higher numbers around it.

---

# PHASE 1: FOUNDATION

## Milestone 1: Monorepo + Vercel + DB Connection

**Goal:** A deployed monorepo on Vercel that connects to your cPanel MySQL and shows a "Hello, Focus Forge" page.

**Prerequisites:**
- GitHub account
- Vercel account (free tier)
- cPanel access with Remote MySQL feature enabled
- OpenAI API key (will use later)
- Local Node 20+ and pnpm 9+ installed

**Spec references:** `04-mysql-schema.md` §3, §6

### Tasks

#### 1.1 Monorepo Scaffolding
```
- Initialize repo with pnpm workspaces:
  - Create root package.json with "workspaces": ["apps/*", "packages/*"]
  - Create pnpm-workspace.yaml
  - Create turbo.json (Turborepo for build orchestration)
  - Create tsconfig.base.json (extended by all packages)
  - Create .editorconfig, .gitignore, .nvmrc (Node 20)
  
- Create folder structure:
  apps/web/              (Next.js app)
  packages/database/     (Prisma + DB client)
  packages/ui/           (Design system — empty for now)
  packages/domain/       (Pure business logic — empty for now)
  packages/ai/           (OpenAI integration — empty for now)
  packages/config/       (Shared TS, ESLint configs)
```

#### 1.2 Next.js App
```
- cd apps/web
- pnpm create next-app@latest . --typescript --tailwind --app --no-src-dir
  - When prompted: use App Router, TypeScript yes, Tailwind yes, no src dir
- Install: prisma, @prisma/client, zod, lucide-react
- Configure tailwind.config.ts to extend from packages/ui (when ui exists)
- Add @ alias for app paths
```

#### 1.3 Prisma Setup
```
- cd packages/database
- pnpm init
- pnpm add prisma @prisma/client
- pnpm dlx prisma init --datasource-provider mysql
- Configure schema.prisma with cuid() primary keys (per doc 04 §2.2):
    model User {
      id String @id @default(cuid())
      // ...
    }
- Create the basic users table in schema.prisma (just enough for M2)
- Add prisma scripts: "generate", "db:push", "studio" (NOT migrate dev — Bluehost has no shadow DB; see §M1 note below)
- Export Prisma client singleton from src/client.ts (avoid multiple instances)
- DO NOT use UUIDv7 or BINARY(16) — see doc 04 §2.2 for rationale
```

#### 1.4 Remote MySQL Setup (cPanel side)
```
🛑 STOP. CLAUDE CODE: PAUSE AND REQUEST HUMAN ACTION.

This step requires the human to perform actions in their Bluehost cPanel.
DO NOT continue past this step until the human confirms they have completed
all of these and provided the DATABASE_URL.

Human action required:
1. Log into Bluehost cPanel
2. Find "Remote MySQL" in the Databases section (search if needed)
3. Add Vercel's hosts to allowed connections:
   - Vercel doesn't publish static IPs for free tier
   - Add "%" (any host) as a temporary measure for development
   - Document that this is a security tradeoff to revisit before paid launch
4. Create a new MySQL database via "MySQL Databases":
   - Suggested name: focus_forge_dev
   - Bluehost will prefix with your account name automatically
   - Final name will look like: youraccount_focus_forge_dev
5. Create a new MySQL user:
   - Use a strong, unique password (save in password manager)
   - Add the user to focus_forge_dev with "ALL PRIVILEGES"
6. Determine connection details:
   - Host: usually your domain name OR a Bluehost server hostname (check cPanel docs)
   - Port: 3306 (MySQL default)
   - Database: youraccount_focus_forge_dev
   - User: youraccount_yourdbuser
   - Password: as you set it
7. Construct DATABASE_URL:
   mysql://USER:PASSWORD@HOST:3306/DBNAME
   (URL-encode special characters in password — Claude Code can help)
8. Test the connection from your local machine:
   mysql -h HOST -u USER -p DBNAME
   (If mysql client isn't installed locally, you can skip this and rely on
   Prisma to verify in the next step)
9. Provide the DATABASE_URL to Claude Code by adding it to .env.local

🛑 Claude Code: do not proceed until the human confirms they've done all 9 steps.
```

#### 1.5 Connection Validation Test (PRE-COMMIT)
```
Before committing to the rest of M1's setup, verify the Bluehost MySQL
connection actually works from outside Bluehost. This is the user's
explicit requirement.

- Create a tiny test script: scripts/test-db-connection.ts
- Use Prisma's $connect to validate the connection
- Run: pnpm tsx scripts/test-db-connection.ts
- Expected output: "✅ Connected to MySQL successfully"
- If it fails, debug before continuing — issues at this point are
  much cheaper to fix than after the schema is migrated.

Common failure modes:
- "Access denied for user" → password wrong or user not added to database
- "Unknown database" → database name mismatch (forgot account prefix?)
- "Connection refused" → Remote MySQL not enabled in cPanel
- "SSL connection error" → may need to add ?sslmode=disable to URL or
  configure SSL cert (Bluehost usually allows non-SSL but some hosts require it)
```

#### 1.6 Vercel Setup
```
- Push monorepo to GitHub (private repo)
- Import in Vercel:
  - Root Directory: apps/web
  - Framework Preset: Next.js
  - Build Command: pnpm build (Vercel auto-detects monorepo)
  - Install Command: pnpm install
  - Output Directory: .next
- Add environment variables in Vercel dashboard:
  - DATABASE_URL (from cPanel)
  - NEXTAUTH_SECRET (generate: openssl rand -base64 32)
  - NEXTAUTH_URL (https://your-vercel-url.vercel.app)
- Trigger first deploy
```

#### 1.7 Hello, Focus Forge
```
- Replace apps/web/app/page.tsx with a simple "Hello, Focus Forge" page
- Add a server component that queries the database (e.g., counts users — should return 0)
- Verify the DB connection works from Vercel
```

### Tests Required

```
packages/database/src/__tests__/client.test.ts:
  - Test that Prisma client connects (skip in CI without DB)

apps/web/__tests__/home.test.tsx:
  - Test that home page renders without error
  - Test that "Hello, Focus Forge" appears

CI setup:
  - GitHub Actions workflow runs lint + test on every push
  - .github/workflows/ci.yml: pnpm install, pnpm lint, pnpm test
```

### Acceptance Criteria

- [ ] `pnpm install` from repo root succeeds
- [ ] `pnpm dev` runs the web app locally on http://localhost:3000
- [ ] Home page shows "Hello, Focus Forge"
- [ ] `pnpm db:push` creates the users table on cPanel MySQL (NOT migrate dev — no shadow DB)
- [ ] phpMyAdmin shows the users table exists
- [ ] Vercel deploy succeeds and shows the same page at the public URL
- [ ] Vercel page successfully queries cPanel MySQL (e.g., count of users = 0)
- [ ] CI workflow runs and passes
- [ ] All TypeScript strict checks pass

### Manual Smoke Test (Human)

1. Open Vercel deploy URL → see "Hello, Focus Forge"
2. Open phpMyAdmin → see users table with 0 rows
3. Make a trivial change locally → push to GitHub → confirm Vercel auto-deploys

### ✅ PAUSE POINT — End of M1

Stop here. Verify everything works. The biggest deployment risks are now eliminated. Future milestones build on a known-working foundation.

---

## Milestone 2: Authentication System + Admin Foundation

**Goal:** Users can sign up and log in via email+password, Google, Facebook, and magic link. Sessions persist 30 days. **The foundational admin model is also in place** — admin permissions defined, audit logging working, and the project owner can manage their own grants. Granular admin features (content moderation, billing, etc.) ship in their respective milestones.

**Prerequisites:** M1 complete

**Spec references:** `01-authentication-and-user-model.md` (entire doc, including §4 account states and §5.1.1 comp tier), `04-mysql-schema.md` §4.1–4.4, §4.7 (admin feature_keys), §4.28 (admin_actions table)

### Why Admin Is In M2

Admin tools must exist from the moment real user accounts exist. A hostile early user could do real damage (abusive submissions, ToS violations) before later milestones ship if there's no way to manage them. M2 gets the *foundational* admin model — capability checks, audit logging, basic account management. Specialized admin features (content moderation queue, billing console, etc.) ship in their respective feature milestones.

### Tasks

#### 2.1 Install NextAuth.js (v4 stable)
```
- pnpm add next-auth@^4 @next-auth/prisma-adapter
- pnpm add @node-rs/argon2 (for password hashing)
- pnpm add resend (for transactional email — magic link, verification)

NOTE: Using NextAuth v4 stable, not v5 beta. v4 has battle-tested patterns
that Claude Code reliably implements. v5 migration is documented future work.
```

#### 2.2 Expand Prisma Schema
```
- Add all auth-related tables from 04-mysql-schema.md §4.1-4.4:
  - users (with all fields)
  - auth_methods
  - sessions
  - magic_link_tokens
  - password_reset_tokens
  - email_verification_tokens
  - feature_grants (set up structure now, populate later)
  - audit_log
- Run `pnpm db:push` (NOT migrate dev — Bluehost has no shadow DB)
- Verify in phpMyAdmin
```

#### 2.3 Configure Auth.js
```
- apps/web/lib/auth.ts: NextAuth config with Google, Facebook, Email (magic link), Credentials (password) providers
- Email provider configured for magic links via Resend
- Credentials provider for email+password
- Custom pages: /signin, /signup, /verify-email, /reset-password
- Custom callbacks for tier checks, feature_grants
- Session strategy: database (using sessions table)
```

#### 2.4 Auth UI Pages
```
- apps/web/app/(auth)/signin/page.tsx
- apps/web/app/(auth)/signup/page.tsx
- apps/web/app/(auth)/verify-email/page.tsx
- apps/web/app/(auth)/reset-password/page.tsx
- apps/web/app/(auth)/layout.tsx (centered, single-column)

These use raw HTML/Tailwind — design system components come in M3.
```

#### 2.5 Server Actions for Auth Flows
```
- apps/web/server-actions/auth/signup-with-password.ts
- apps/web/server-actions/auth/signin-with-password.ts
- apps/web/server-actions/auth/request-magic-link.ts
- apps/web/server-actions/auth/request-password-reset.ts
- apps/web/server-actions/auth/verify-email.ts
- apps/web/server-actions/auth/sign-out.ts

Each action:
  - Validates input with Zod
  - Logs to audit_log
  - Implements rate limiting (5 attempts per email per 15 min)
  - Returns typed result (not throwing)
```

#### 2.6 OAuth Provider Registration (HUMAN ACTION REQUIRED)
```
🛑 STOP. CLAUDE CODE: PAUSE AND REQUEST HUMAN ACTION.

This step requires the human to register the app with multiple identity
providers and obtain credentials. DO NOT continue past this step until the
human confirms they have all the credentials in their .env.local file.

═══════════════════════════════════════════════════════════════════════
SETUP 1 of 3: GOOGLE OAUTH
═══════════════════════════════════════════════════════════════════════

Time required: ~15 minutes
Cost: Free
Required: Google account

Step 1.1: Visit https://console.cloud.google.com
         Sign in with the Google account you want to manage this app.

Step 1.2: Top of page → click project dropdown → "New Project"
         Project name: "Focus Forge"
         Organization: leave default
         Click "Create"

Step 1.3: Wait for project creation (10-30 seconds), then select it from
         the project dropdown.

Step 1.4: Left sidebar → APIs & Services → OAuth consent screen
         User Type: External (unless you have a Google Workspace org)
         Click Create.
         
         App information:
           App name: Focus Forge
           User support email: <your email>
           App logo: skip for now (add later)
         App domain: skip for now
         Authorized domains: 
           - localhost (for development)
           - <your-vercel-domain>.vercel.app (after Vercel deploys)
         Developer contact info: <your email>
         Click Save and Continue
         
         Scopes screen: don't add any. Click Save and Continue.
         Test users: add your own email. Click Save and Continue.
         Summary: review, click Back to Dashboard.

Step 1.5: Left sidebar → APIs & Services → Credentials
         Click "+ Create Credentials" → "OAuth client ID"
         Application type: Web application
         Name: "Focus Forge Web"
         
         Authorized JavaScript origins:
           - http://localhost:3000
           - https://<your-vercel-domain>.vercel.app
         
         Authorized redirect URIs:
           - http://localhost:3000/api/auth/callback/google
           - https://<your-vercel-domain>.vercel.app/api/auth/callback/google
         
         Click Create.
         
         A modal appears with Client ID and Client Secret. SAVE BOTH NOW.
         Once you close this modal, you can view the ID again but the
         Secret is shown only once.

Step 1.6: Add to .env.local:
           GOOGLE_CLIENT_ID="<your client id>"
           GOOGLE_CLIENT_SECRET="<your client secret>"

Step 1.7: Add the same to Vercel:
         Vercel Dashboard → Project → Settings → Environment Variables
         Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
         Apply to: Production, Preview, Development (all three)

═══════════════════════════════════════════════════════════════════════
SETUP 2 of 3: FACEBOOK OAUTH
═══════════════════════════════════════════════════════════════════════

Time required: ~20 minutes (their UI is annoying)
Cost: Free
Required: Facebook account

Step 2.1: Visit https://developers.facebook.com
         Sign in. If first time, you may need to "register as a developer"
         (just a checkbox + phone verification).

Step 2.2: My Apps → Create App
         Use case: "Authenticate and request data from users with Facebook Login"
         Click Next.
         App type: Consumer
         Click Next.
         App name: Focus Forge
         Contact email: <your email>
         Click Create App.
         You may need to verify with Facebook password.

Step 2.3: From the app dashboard → Add Products → "Facebook Login" → Set up
         Choose "Web"
         Site URL: https://<your-vercel-domain>.vercel.app
         Click Save → Continue (you can skip the rest of the wizard)

Step 2.4: Left sidebar → Facebook Login → Settings
         Valid OAuth Redirect URIs:
           - http://localhost:3000/api/auth/callback/facebook
           - https://<your-vercel-domain>.vercel.app/api/auth/callback/facebook
         Click Save Changes.

Step 2.5: Left sidebar → Settings → Basic
         Note your App ID (visible at top)
         Click "Show" next to App Secret, then enter your password to reveal it
         SAVE BOTH.
         
         Add to "App Domains":
           - localhost
           - <your-vercel-domain>.vercel.app
         Privacy Policy URL: required to publish; for dev you can skip
         Click Save Changes.

Step 2.6: Top of page: "App Mode" toggle. KEEP IT ON "Development" for now.
         You can use the app for testing without going through Facebook's
         app review. Switch to "Live" only when you're ready to publish.

Step 2.7: Add to .env.local AND Vercel env vars:
           FACEBOOK_CLIENT_ID="<your app id>"
           FACEBOOK_CLIENT_SECRET="<your app secret>"

═══════════════════════════════════════════════════════════════════════
SETUP 3 of 3: RESEND (TRANSACTIONAL EMAIL)
═══════════════════════════════════════════════════════════════════════

Time required: ~10 minutes (longer if domain DNS verification needed)
Cost: Free up to 3,000 emails/month, 100/day
Required: A domain you own (for production); not needed for dev

Step 3.1: Visit https://resend.com → Sign Up
         Use the same email you want to send FROM (or a related team email)

Step 3.2: For development:
         Resend gives you onboarding@resend.dev for testing without setup.
         You can use this for the dev environment. Skip to Step 3.5.
         
         For production:
         Dashboard → Domains → Add Domain
         Enter your domain (e.g., focusforge.app)
         Follow their DNS instructions:
           - Add MX records to your DNS provider
           - Add TXT records (DKIM, DMARC, SPF)
         If your domain is at Bluehost, do this in Bluehost cPanel → Zone Editor.
         
         Verification can take 5-30 minutes after DNS changes.
         
Step 3.3: Once verified (or using onboarding@resend.dev): Dashboard → API Keys
         Click "Create API Key"
         Name: "Focus Forge Production" (or "Development")
         Permission: "Sending access" only
         Click Add.
         
         The key is shown ONCE. SAVE IT NOW.

Step 3.4: Decide your FROM email address:
         For development: onboarding@resend.dev (works without domain setup)
         For production: hello@yourdomain.com (or no-reply@, or whatever)

Step 3.5: Add to .env.local AND Vercel env vars:
           RESEND_API_KEY="re_xxxxxxxxxxxx"
           RESEND_FROM_EMAIL="onboarding@resend.dev"
         
         (For production, change RESEND_FROM_EMAIL to your verified domain)

═══════════════════════════════════════════════════════════════════════
APPLE SIGN-IN
═══════════════════════════════════════════════════════════════════════

DEFERRED for v1. Requires Apple Developer Program ($99/yr).
Will be added in a post-launch milestone. No action needed now.

═══════════════════════════════════════════════════════════════════════

🛑 Claude Code: do not proceed until the human confirms ALL THREE
provider setups (Google, Facebook, Resend) are complete and the env vars
are set both locally AND in Vercel. The OAuth callbacks will fail
silently if Vercel env vars are missing.
```

#### 2.7 Account Settings Page (Minimal)
```
- apps/web/app/(app)/account/page.tsx
- Shows current email, linked auth methods, "Sign out" button
- Shows account state (with appropriate UI for paused/suspended/pending_delete)
- Shows tier (with "Comp" indicator if applicable)
- Full account management (delete, export) deferred to M14
```

#### 2.8 Admin Foundation — Permission System
```
Per doc 04 §4.7 (admin feature_keys) and doc 01 §4.7 (audit trail):

- packages/domain/src/admin/permissions.ts
  - Define ADMIN_PERMISSIONS constant (all 12 admin feature_keys)
  - hasAdminPermission(userId, permission) helper using existing feature_grants table
  - requireAdminPermission(permission) middleware for API routes
  - Composite permission helpers (e.g., isAdmin = hasAny([...adminKeys]))
  
- packages/domain/src/admin/audit.ts
  - logAdminAction({ adminUserId, targetUserId, action, justification, metadata, stateBefore }) helper
  - Wraps insert into admin_actions table
  - Captures IP and user_agent automatically from request context

- ALL admin operations call logAdminAction() — no exceptions
- justification REQUIRED for: pause, suspend, soft_delete, emergency_delete,
  content removal, grant_admin, revoke_admin, grant_comp
```

#### 2.9 Admin Foundation — Account State Machine
```
Per doc 01 §4 expanded state machine:

- packages/domain/src/users/account-state.ts
  - getAccountStateForRequest(userId) — returns current effective state
    Considers: account_state column, paused_until, comp_expires_at
  - canUserPerformAction(userId, action) — guards based on state
    e.g., paused users cannot create content but can read

- Middleware: apps/web/middleware.ts
  - On every authenticated request, check account_state
  - 'paused' users: allow page reads, block mutations, show paused banner
  - 'suspended' users: redirect to /account/suspended page
  - 'pending_delete' users: show banner with cancel-deletion CTA
  - 'unverified' users: existing behavior (email verification banner)

- Pages:
  - /account/paused (shown to paused users on signin)
  - /account/suspended (shown to suspended users on signin attempt)
  - /account/scheduled-for-deletion (shown to pending_delete users with cancel CTA)
```

#### 2.10 Admin Foundation — Bootstrap Script
```
The project owner needs to grant themselves admin permissions before any admin UI exists.

- scripts/grant-super-admin.ts
  - Takes --email flag
  - Inserts feature_grants rows for ALL admin permissions
  - Records the action in admin_actions (admin_user_id = the granted user, target = self)
  - Idempotent (skips if already granted)
  - Run via: pnpm tsx scripts/grant-super-admin.ts --email you@example.com

CRITICAL: This script can ONLY be run from server/CLI. It is NOT exposed via any
HTTP endpoint. The first super-admin must be created out-of-band.

After bootstrap, the super-admin can grant other admins via the UI (M2.12).
```

#### 2.11 Admin Foundation — Minimal Admin UI
```
Just enough admin UI to be useful in early days. Full admin console expands in later milestones.

- apps/web/app/admin/layout.tsx
  - Wrapper layout for all /admin/* routes
  - Hard-checks at minimum admin_user_view permission
  - Forbidden users redirected to /404 (don't reveal admin exists)
  - Banner showing "ADMIN MODE" so admins remember they're in privileged context
  
- apps/web/app/admin/page.tsx (admin dashboard)
  - Quick links to: users, audit log, my permissions
  - Empty initially; expands as more admin features ship
  
- apps/web/app/admin/users/page.tsx (basic user list)
  - Search by email
  - Filter by account_state, tier
  - Per-user row: id, email, tier, state, signup date, last login
  - Click user → /admin/users/[id]
  
- apps/web/app/admin/users/[id]/page.tsx (user detail)
  - Read-only at minimum (admin_user_view)
  - Action buttons appear based on permissions:
    - admin_user_pause → Pause button
    - admin_user_suspend → Suspend button
    - admin_user_soft_delete → Soft Delete button
    - admin_user_management → Edit, Force Sign Out, Force Password Reset, Grant Comp
    - admin_user_emergency_delete → Emergency Delete (red-bordered confirmation)
  - All actions require justification text in modal
  - Audit log of actions taken on this user shown below
```

#### 2.12 Admin Foundation — User Management Actions
```
Server actions for the admin user management surface:

- apps/web/server-actions/admin/pause-user.ts
  - Required: target_user_id, duration_days, reason
  - Sets account_state='paused', paused_until=NOW()+duration
  - Logs to admin_actions with state_before snapshot
  
- apps/web/server-actions/admin/unpause-user.ts
- apps/web/server-actions/admin/suspend-user.ts
- apps/web/server-actions/admin/unsuspend-user.ts
- apps/web/server-actions/admin/soft-delete-user.ts
  - Required: target_user_id, justification
  - Optional: grace_period_days (default 30, super-admin can override to 0)
- apps/web/server-actions/admin/cancel-deletion.ts
- apps/web/server-actions/admin/emergency-delete-user.ts
  - Requires admin_user_emergency_delete permission
  - Requires extensive justification (min 100 chars)
  - Hard deletes immediately
  - Sends email to user if possible

- apps/web/server-actions/admin/grant-comp-tier.ts
  - Sets tier='comp', records previous tier for revert
  - Optional comp_expires_at
- apps/web/server-actions/admin/revoke-comp-tier.ts
- apps/web/server-actions/admin/grant-feature.ts (granular alternative to comp)
- apps/web/server-actions/admin/revoke-feature.ts
- apps/web/server-actions/admin/force-signout.ts
- apps/web/server-actions/admin/force-password-reset.ts

- apps/web/server-actions/admin/grant-admin-permission.ts
  - Requires admin_grant_admin (super-admin only)
- apps/web/server-actions/admin/revoke-admin-permission.ts
```

#### 2.13 Admin Foundation — Audit Log Viewer
```
- apps/web/app/admin/audit-log/page.tsx
  - Shows admin_actions table contents
  - Filter by: admin user, target user, action, date range
  - Each entry shows: when, who (admin), what (action), to whom (target), why (justification)
  - Required permission: admin_user_view OR admin_user_management
- Read-only — entries cannot be deleted or modified
```

### Tests Required

```
Unit tests (Vitest):
  - Password hashing/verification round-trip
  - Magic link token generation/validation
  - Email validation (edge cases: plus addressing, unicode)
  - Rate limiter logic
  - Admin permission checks (positive + negative cases)
  - Account state transitions (paused → active auto-restore, etc.)
  - logAdminAction always populates required fields

Integration tests:
  - Sign up with email+password creates user + auth_method rows
  - Sign in with correct password creates session
  - Sign in with wrong password does NOT create session, increments rate limit
  - Magic link flow end-to-end (mock email send)
  - Password reset flow end-to-end
  - OAuth callback creates user on first login, links on subsequent
  - Bootstrap script grants all admin permissions atomically
  - Admin pauses user → user cannot create content, can still sign in
  - Admin suspends user → user cannot sign in
  - Admin soft-deletes user → 30-day grace, user can self-recover
  - Non-admin attempts admin endpoint → 404 (NOT 403, hide admin existence)
  - Admin actions all create admin_actions rows with justification

E2E tests (Playwright):
  - User signs up with email+password → lands on dashboard
  - User signs out → can't access /account
  - User clicks "Forgot password" → receives email (mock) → resets → can log in
  - Project owner runs bootstrap script → can access /admin
  - Random user navigates to /admin → 404 page
  - Admin pauses user (with justification) → audit_actions row appears
  - Admin grants comp tier → user UI shows "Comp" indicator
  - Suspended user attempts sign in → sees suspension page with appeal info
```

### Acceptance Criteria

- [ ] User can sign up with email+password
- [ ] User can sign in with email+password
- [ ] User can sign in with Google OAuth
- [ ] User can sign in with Facebook OAuth
- [ ] Apple Sign-In: NOT in scope for v1 (skipped per spec)
- [ ] User can request and use magic link
- [ ] Sessions survive page refresh and 30-day inactivity simulation
- [ ] Password reset flow works end-to-end
- [ ] Email verification works (banner shown until verified, doesn't block app)
- [ ] Rate limiting kicks in after 5 failed attempts
- [ ] No red colors anywhere in auth UI (audit with grep)
- [ ] All forms keyboard-accessible
- [ ] axe-core passes 0 violations on all auth pages
- [ ] **Bootstrap script grants all 12 admin permissions to project owner**
- [ ] **Admin permission checks gate all /admin/* routes**
- [ ] **Forbidden access to /admin returns 404, not 403 (hides admin existence)**
- [ ] **Admin can pause/unpause users with justification**
- [ ] **Admin can suspend/unsuspend users with justification**
- [ ] **Admin can soft-delete users with 30-day grace (default) or override (super-admin)**
- [ ] **Super-admin can emergency-delete with min 100-char justification**
- [ ] **Admin can grant/revoke Comp tier with optional expiration**
- [ ] **Admin can grant/revoke specific feature_grants (granular alternative)**
- [ ] **All admin actions logged to admin_actions table with justification**
- [ ] **Audit log viewer shows all admin actions with filters**
- [ ] **Comp tier auto-expires via hourly cron (revert to comp_previous_tier)**
- [ ] **Paused accounts auto-restore via hourly cron when paused_until passes**
- [ ] **Paused users see banner, can read but not mutate**
- [ ] **Suspended users blocked from signing in, see appeal info**
- [ ] **Admin actions on locked users are tracked even if user is later deleted (admin_actions FK is SET NULL)**
- [ ] All tests pass

### Manual Smoke Test (Human)

1. Sign up with a real email — receive welcome
2. Log out, log back in with password
3. Log out, log in with Google
4. Log out, request magic link, click email link, verify auto-login
5. Forget password, reset, log in with new password
6. Check phpMyAdmin: users, auth_methods, sessions all populated correctly
7. Try to log in with wrong password 6 times → rate limit message appears

**Admin smoke tests:**
8. Run `pnpm tsx scripts/grant-super-admin.ts --email you@example.com`
9. Sign in as you — visit /admin, see admin dashboard
10. Sign in as a different user — visit /admin, see 404
11. As admin, find another user, pause them with reason "Testing"
12. As that user, sign in — see paused banner, try to create task → blocked
13. As admin, unpause the user
14. As admin, grant the user Comp tier with 7-day expiration
15. Verify in phpMyAdmin: users.tier='comp', comp_expires_at set
16. Wait 7+ days (or update timestamp manually) → cron reverts tier
17. Visit /admin/audit-log → see all actions taken with justifications

### ✅ PAUSE POINT — End of M2

Auth + admin is the most security-sensitive milestone. Verify thoroughly before continuing.

**Note:** This is a substantially larger M2 than originally specified. Plan accordingly. We chose to expand M2 rather than create a separate admin milestone because admin tools must exist from the moment user accounts exist.

---

## Milestone 3: Design System Primitives

**Goal:** Core UI components built and themed. Dark mode default. No red anywhere. Components live in `packages/ui` and are consumed by `apps/web`.

**Prerequisites:** M2 complete

**Spec references:** `02-design-system.md` (entire doc)

### Tasks

#### 3.1 Tailwind Config + Tokens
```
- packages/ui/tailwind.preset.ts: 
  - All color tokens from 02-design-system.md §2
  - All typography tokens from §3
  - All spacing/radius/shadow tokens from §4-7
  - Red removal via Proxy (§13.2)
- packages/ui/styles/globals.css:
  - CSS variables for both dark and light themes
  - Reduced-motion media query
- apps/web tailwind.config.ts extends the preset
```

#### 3.2 Component Library — Primitives
```
packages/ui/src/components/:

- Button.tsx (variants: primary, secondary, ghost, soft-destructive)
- IconButton.tsx (always with aria-label)
- Input.tsx (text, email, password, with show/hide toggle)
- Textarea.tsx (auto-growing)
- Select.tsx (native on mobile, custom on desktop)
- Checkbox.tsx
- Radio.tsx
- Toggle.tsx
- Slider.tsx
- Label.tsx

All components:
  - Use CSS variables (no hardcoded colors)
  - 44×44px minimum touch targets
  - Visible focus rings (--accent, 2px, 2px offset)
  - TypeScript prop types exported
  - JSDoc comments with examples
```

#### 3.3 Component Library — Containers
```
- Card.tsx
- Modal.tsx (focus trap, Esc-to-close, backdrop click)
- Drawer.tsx (slides from right)
- Toast.tsx (4s auto-dismiss, soft, non-blocking)
- ToastProvider.tsx (root provider for app)
```

#### 3.4 Component Library — Feedback
```
- EmptyState.tsx (illustration + message + single CTA)
- LoadingSpinner.tsx
- SkeletonLoader.tsx
- ErrorBoundary.tsx (graceful fail, Soft-Track Protocol — no red)
```

#### 3.5 Theme Provider
```
- packages/ui/src/theme/ThemeProvider.tsx
- Reads user preference from cookie / DB
- Falls back to prefers-color-scheme
- Applies data-theme attribute to <html>
```

#### 3.6 Storybook (Highly Recommended)
```
- pnpm dlx storybook@latest init in packages/ui
- Story file for every component
- This is your visual QA tool
```

#### 3.7 Apply To Auth Pages (Refactor)
```
- Refactor M2 auth pages to use new components
- This ensures the design system actually works under load
- Verify dark mode looks correct on all auth screens
```

### Tests Required

```
Unit tests:
  - Each component renders without crashing
  - Each component respects disabled state
  - Each component respects required ARIA attributes
  - ThemeProvider correctly switches themes

Visual regression (optional but recommended):
  - Storybook + Chromatic, or 
  - Playwright screenshot tests for each component

Accessibility tests:
  - axe-core integration in component tests
  - 0 violations required
```

### Acceptance Criteria

- [ ] All components in packages/ui exist with TypeScript types
- [ ] Storybook runs and shows every component in dark + light mode
- [ ] Auth pages refactored to use design system
- [ ] Build error if any code uses Tailwind red-* class
- [ ] axe-core: 0 violations on Storybook pages
- [ ] All components keyboard-navigable
- [ ] prefers-reduced-motion honored (verify with DevTools)
- [ ] All components have JSDoc with usage examples

### Manual Smoke Test (Human)

1. Open Storybook → tab through every component
2. Toggle dark/light theme → all components look correct
3. Enable "Reduce motion" in OS settings → animations disabled
4. Open auth pages → look identical to Storybook in dark mode
5. Try to write `text-red-500` somewhere → build fails with helpful error

### ✅ PAUSE POINT — End of M3 — End of Phase 1

Phase 1 complete. Foundation is solid. Vertical slices begin.

---

# PHASE 2: VERTICAL SLICES

## Milestone 4: Task Capture + Dashboard

**Goal:** Logged-in user can type a task, see it appear on the dashboard, mark it Complete or Defer. Soft-Track Protocol enforced everywhere. First Capture Badge fires on first task.

**Prerequisites:** M3 complete

**Spec references:** `04-mysql-schema.md` §4.5–4.6, §4.8, §4.15; `02-design-system.md` §9.4 (TaskCard, PriorityBadge); `03-onboarding-flow.md` §3

### Tasks

#### 4.1 Schema Additions
```
- Add to Prisma schema:
  - tasks
  - task_steps
  - badges (table for definitions)
  - user_badges
  - events (append-only log)
- `pnpm db:push` (NOT migrate dev — Bluehost has no shadow DB)
- Seed badges table (first_capture, first_step, first_focus, first_complete, etc.)
- See 04-mysql-schema.md §8 for seed data
```

#### 4.2 Task Domain Logic
```
packages/domain/src/tasks/:

- create-task.ts (input → tasks row + event log)
- complete-task.ts (status active → completed, badge check)
- defer-task.ts (status → deferred, increment deferred_count silently)
- list-active-tasks.ts (dashboard query, see schema doc §7.1)

Each function:
  - Pure logic, no UI
  - Returns typed Result<T, E>
  - Records to events table
  - Triggers badge engine check
```

#### 4.3 Badge Engine
```
packages/domain/src/badges/:

- check-and-award.ts (subscribe to events, award badges)
- get-user-badges.ts
- The engine reads from events table, not feature tables
- First Capture badge: fires on first task.created event for user
- Idempotent — running twice doesn't double-award
```

#### 4.4 Server Actions
```
apps/web/server-actions/tasks/:

- create-task.ts
- complete-task.ts
- defer-task.ts (with optional "defer until" datetime)
- update-task-priority.ts

All call domain functions, handle authentication, return typed results.
```

#### 4.5 Dashboard Page
```
- apps/web/app/(app)/page.tsx (the post-login landing)
- Shows:
  - User's display name (using getUserAddressName fallback per doc 01 §2.5)
  - List of active tasks (single column)
  - "Capture another thought" input at top
  - Empty state if no tasks (per spec §11.1)
- Cross-device sync via 5-second polling (M4 sets this up; reused later)
```

#### 4.6 TaskCard Component
```
- packages/ui/src/components/TaskCard.tsx
- Shows: title, priority pill, scheduled time if any, step progress
- Actions: "Done. Next step." / "Push to later"
- NO red, NO "delete," NO "overdue"
```

#### 4.7 Cross-Device Sync (Short Polling)
```
Per doc 04 §5 — chosen over SSE for Vercel free-tier compatibility:

- apps/web/app/api/sync/route.ts (returns events newer than ?since= timestamp)
- apps/web/lib/sync/use-sync-stream.ts (client hook with 5s polling interval)
- Pauses when document.hidden === true
- Resumes immediately when tab regains focus
- Updates Zustand store on new events
- Optimistic UI: local state updates immediately, sync is for cross-device only
```

### Tests Required

```
Unit tests:
  - create-task: validates input, creates row, logs event
  - complete-task: respects ENUM values, awards First Complete badge first time
  - defer-task: increments counter silently, never visible to user
  - Badge engine: idempotent, fires correct badges

Integration tests:
  - POST to create-task action: full round-trip
  - Dashboard page loads tasks for current user only
  - /api/sync endpoint returns events filtered by since param

E2E tests (Playwright):
  - User logs in → captures first task → sees First Capture Badge toast
  - User completes task → sees First Complete badge
  - User defers task → it disappears from dashboard, reappears at deferred time
  - Two browser tabs: change in one, appears in other within 3 seconds
```

### Acceptance Criteria

- [ ] User can capture a task via text input
- [ ] Task appears immediately on dashboard
- [ ] First Capture Badge fires on first task creation, only once
- [ ] User can mark task complete → "Done. Next step." → animation plays
- [ ] User can defer task → removed from view, no shame language
- [ ] Status enum cannot be set to "failed" (TS error)
- [ ] Priority enum cannot be set to "urgent" or "red" (TS error)
- [ ] Dashboard query returns in <100ms with 1000 tasks (load test)
- [ ] Polling sync keeps two tabs aligned within 7s (5s poll + 2s grace)
- [ ] No red colors anywhere
- [ ] Empty state per design system spec
- [ ] All tests pass
- [ ] axe-core 0 violations

### Manual Smoke Test (Human)

1. Log in → land on empty dashboard with empty state
2. Type "Buy oranges" → press Enter → see TaskCard appear
3. See First Capture Badge toast
4. Mark complete → animation, task moves out
5. Add task, defer for 1 hour → it disappears, reappears after 1 hour
6. Open second tab → both stay in sync

### ✅ PAUSE POINT — End of M4

Task capture and the backlog list work. But the backlog alone is just a styled to-do list — the actual ADHD core loop (figuring out *what to do now*) is M4.5, next, and is the product's headline promise.

---

## Milestone 4.5: THE CORE LOOP — Today Plan, Morning Ritual & Priority Model

> **STATUS: Substantially complete.** Core loop is working in the browser. See remaining items below.

**This is the single most important milestone in the build.** It's the difference between "a lovely app I stopped opening" and "the thing that finally helped me figure out what to do." Build it immediately after capture, before any of the goodies (Biddy animations, mini-games, HUD, body doubling).

**Goal:** The home screen becomes **Today** — a small, user-sized visible set (default 3) drawn from an anchor/flexible priority model. A skippable morning ritual pre-loads the day. Completing a task bubbles up the next from a hidden queue. A blame-free Gentle Reframe offers help when a flexible task keeps sliding. The full backlog is a deliberate tap away, never the default.

**Prerequisites:** M4 complete (task capture + tasks table). M3 (design system).

**Spec references:** `02-design-system.md` §13.5 (the whole core loop — priority model, Today view, ritual, bubble-up, Gentle Reframe, hard rules); `04-mysql-schema.md` §4.5 (new priority columns + CHECK), §4.6.1 (`daily_plans`), §4.6.2 (`daily_plan_items` + bubble-up + reframe logic), §7.1.1 (Today query); `AGENTS.md` §5.13 and §5.14 (locked decisions + implementation record).

**Numbering note:** Labeled 4.5 because it was specced after the milestone sequence was set, but it is NOT optional or secondary — it belongs here in priority order, right after capture.

### Implementation decisions made during build

The following decisions were made during the actual implementation and supersede the original task list where they conflict:

**[IMPLEMENTED] Anchor/Flex slot independence:**
The original spec described anchors pinned at the top of the visible set, consuming flex slots. After building, we discovered this means users with 3+ meetings see zero actionable tasks on the dashboard. The implemented design:
- Anchors have their own dedicated "Today's schedule" compact strip at the *bottom* of the screen
- Flexible tasks fill `visibleSlots` (default 3) independently in the card area at the top
- When an anchor's "doorknob window" opens (≤30 min before `scheduledFor`), it promotes to a full card at the top, borrowing one flex slot — total cards stays at `visibleSlots`
- See `AGENTS.md §5.13` and `§5.14.5–5.14.8` for complete details

**[IMPLEMENTED] Bubble-up is flex-only:**
`_bubble-up.ts` Phase 2 only queries `priorityKind: 'flexible'`. Anchors are added exclusively by `seedAnchors()`. Slot counting also ignores anchors (flex count only). This prevents tomorrow's meetings from appearing in today's plan.

**[IMPLEMENTED] `prisma db push` for all schema changes:**
Bluehost does not support shadow databases. Use `prisma db push` instead of `prisma migrate dev`.

### Tasks

```
✅ Schema migration: replace tasks.priority with priority_kind + priority_level + CHECK
✅ New tables: daily_plans, daily_plan_items
✅ Domain functions: get-or-create-today-plan, get-today-view, complete-today-item,
                    swap-today-item, add-to-today-plan, update-ritual-state, _bubble-up
✅ Server actions: get-today-view, complete-plan-item, swap-plan-item, update-ritual,
                  add-to-plan
✅ UI: TodayClient.tsx (full home screen), TodayCard.tsx, MorningRitual.tsx
✅ Dashboard: page.tsx rewritten as server component using getTodayView
✅ Anchor schedule strip: compact "Today's schedule" section below flex cards
✅ Anchor doorknob promotion: full card at top when within 30 min of scheduledFor
✅ Bubble-up refill: completeItem and swapOut both call bubbleUp()
✅ Swap confirmation: "Moved to queue" flash for 1.2s before refresh
✅ Morning ritual: skippable, pre-loads anchors, suggests high/med tasks
✅ Gentle Reframe: fires once at threshold, 4 blame-free options, no counter shown
✅ Queue counter at bottom (toggle shows explanation text)
✅ Cross-device sync: 5-second polling via useSyncStream
✅ Unit tests: complete-task, defer-task, update-task-priority, use-sync-stream (84 tests)
✅ Domain unit tests for all daily-plan functions (153 tests across 12 files)
✅ "All tasks" drawer — QueueRow list, priority-ranked, capped at 20, overflow note
✅ Reframe actions — snooze (24h snoozedUntil) + lower (priorityLevel→low) are real DB writes via reframeTodayItem + reframePlanItemAction; break/anchor are honest forward-pointing toasts (M5+)
✅ "What should I do now?" single-task mode — toggle in header, hides remaining cards, "N more waiting" note
✅ Priority picker at capture UI — two-picker row: Flexible|Anchor kind toggle + Bronze/Silver/Gold level chips (hidden when Anchor); Silver/Flexible default; resets after capture
✅ Settings UI — Today settings on account page: visible-slots stepper (1–5), Gentle Reframe toggle + threshold slider (3–7); persisted to user.preferences JSON; visibleSlots also updates today's plan live; swap + getTodayView honor the threshold
✅ E2E Playwright tests — 12 scenarios (today-core + today-features specs), all passing; seeded-session auth bypass; caught + fixed a real bubbleUp concurrency bug (createMany skipDuplicates)

**M4.5 is COMPLETE — all items above shipped and verified.**
```

### Tests

**Written and passing:**
- `complete-task.test.ts` — 5 tests
- `defer-task.test.ts` — 6 tests
- `update-task-priority.test.ts` — 8 tests
- `use-sync-stream.test.ts` — 6 tests (jsdom environment)

**Still needed:**
- Unit tests for all 7 daily-plan domain functions
- E2E Playwright tests (M4 + M4.5 scenarios)

### Acceptance Criteria
- [x] Home screen is Today (small set), not the backlog
- [x] Priority model (anchor/flexible + level) in DB schema and domain logic
- [x] Anchors cannot be swapped; flexible tasks bubble through a queue
- [x] Completing a task bubbles up the next flex task; user never sees full backlog by default
- [x] Swap returns task to queue with a "moved" confirmation
- [x] Morning ritual pre-loads anchors, suggests the rest, never blocks, free to skip
- [x] Gentle Reframe offers help once, never nags, no shame, threshold=4
- [x] Anchors shown in compact schedule strip; not consuming flex slots
- [x] Active anchors promote to full card within 30-min doorknob window
- [x] Tomorrow's anchors never appear in today's plan
- [x] No red, no failed/overdue, no broken streaks anywhere in the loop
- [x] Priority picker at capture form — two-picker row: Flexible|Anchor kind toggle + Bronze/Silver/Gold level chips (hidden when Anchor selected); Silver/Flexible default; hint text when Anchor; resets after capture
- [x] "What should I do now?" surfaces one task — toggle button in header, hides remaining cards, shows "N more waiting" note
- [x] All-clear rest state on empty — EmptyState renders "Nothing pressing right now. That's allowed." when the visible set empties (verified by E2E)
- [x] visible_slots configurable 1-5 (settings UI) — stepper on account page, persisted to user.preferences, updates today's plan live
- [x] Reframe actions mutate task correctly — snooze (24h) + lower (priorityLevel→low) are real DB writes; break/anchor are honest forward-pointing toasts
- [x] "All tasks" drawer implemented — priority-ranked QueueRow list, capped at 20, overflow note

### Manual Smoke Test
1. Capture a few flexible tasks (high/med/low)
2. Verify they appear on the dashboard (up to 3)
3. Complete a task → watch next bubble up from queue
4. Swap a flex-high task 4× → Gentle Reframe card appears; try each option (currently stubs)
5. If you have today's anchor tasks: see them in the compact schedule strip at bottom
6. Wait until 30 min before an anchor's scheduled time → it promotes to full card at top
7. Open the app fresh → morning ritual shows; skip it → app still fully usable
8. Reload the dashboard → cross-device sync works within 7 seconds

### ✅ PAUSE POINT — End of M4.5

The core loop answers "what do I do right now?" with a working implementation. Remaining items above (priority picker, reframe actions, all-tasks drawer) should be completed before moving to M5.

---

## Milestone 5: Walk Me Through It

**Goal:** When user has multi-step task, they can enter a focused single-step mode that hides all other UI.

**Prerequisites:** M4 complete

**Spec references:** `Detailed_ADHD_Forge_Document.pdf` §3.1; `Comprehensive_Multidisciplinary_Framework_*.pdf` §9 Tool 2

### Important Framing Note

M5 ships with **manual step creation**. AI-generated steps arrive in M7. During the M5–M7 window:

- The UI does NOT promise AI-generated steps yet
- Button copy: "Add steps manually" (not "Generate steps")
- The "Walk Me Through It" feature works on whatever steps exist (manual or AI, whatever's available)
- Help text on the empty state: "You can add steps yourself for now. Voice-driven step generation coming soon."

This avoids overpromising during the gap. M7 enhances rather than replaces.

### Tasks

#### 5.1 Manual Step Creation
```
- Edit task UI: "Add steps manually" button
- User can manually add ordered steps to a task
- packages/domain/src/tasks/add-step.ts
- packages/domain/src/tasks/complete-step.ts
- packages/domain/src/tasks/reorder-steps.ts
- Drag-to-reorder UX (large touch targets, mobile-friendly)
```

#### 5.2 Walk-Through UI
```
- apps/web/app/(app)/walk/[taskId]/page.tsx
- Full-screen, single-column, hides nav
- Shows ONE step at a time
- Big "Done. Next step." button
- "Pause" button returns to dashboard, preserves position
- ESC key acts as Pause
```

#### 5.3 First Step Badge
```
- Add to events: task_step.completed
- Badge engine: first_step badge fires on first step completion
```

### Tests Required

```
Unit:
  - add-step: validates order, returns step
  - complete-step: marks complete, awards badge
  - Step ordering remains stable on completion

E2E:
  - User adds 3 steps to task → enters walk-through → completes each → returns to dashboard
  - User pauses mid-walk → resumes → starts at correct step
  - User completes all steps → task auto-completes → First Complete badge
```

### Acceptance Criteria

- [x] User can add steps to a task manually — `/tasks/[taskId]` StepsEditor, "Add steps manually" button
- [x] Walk-through mode shows one step at a time — `/walk/[taskId]`, full-screen single step
- [x] No other UI visible in walk-through — only pause + quiet "Step X of N" + the step + advance button
- [x] First Step badge fires correctly — `task_step.completed` event → `first_step` badge (verified in browser + DB)
- [x] ESC pauses — returns to dashboard, position preserved (resumes at next incomplete step)
- [x] Mobile-friendly — **reorder uses accessible up/down buttons (large touch targets), not drag**. Intentional deviation: drag-only reordering is an accessibility anti-pattern for the motor-variable users this product serves; buttons are keyboard- + screen-reader- + touch-friendly. Drag can be added later as a non-exclusive enhancement.
- [x] No copy promises AI generation yet — button is "Add steps manually"; empty-state says "Voice-driven step generation coming soon" (verified by E2E)
- [x] All tests pass — 190 domain unit (37 new step tests) + 5 new Walk-Through E2E (17 E2E total)

**M5 is COMPLETE — verified end-to-end in the browser (add steps → walk through → auto-complete → first_step + first_complete badges) and by automated tests.**

### Manual Smoke Test (Human)
1. Add 3 steps to a task manually
2. Click "Walk Me Through It"
3. Complete each step in turn
4. Confirm dashboard shows task complete

### ✅ PAUSE POINT — End of M5

---

## Milestone 6: Analog Timer

**Goal:** User can start a timer with a diminishing wedge visual, optional Sound Family alerts, and Picture-in-Picture pop-out.

**Prerequisites:** M5 complete

**Spec references:** `Detailed_ADHD_Forge_Document.pdf` §3.2; `Comprehensive_Multidisciplinary_Framework_*.pdf` §4

### Tasks

#### 6.1 Timer Domain Logic
```
packages/domain/src/timer/:
- focus-session.ts (start/pause/resume/end)
- sound-families.ts (definitions)
```

#### 6.2 Schema
```
Add to Prisma:
- focus_sessions (per schema doc §4.12)
```

#### 6.3 AnalogTimer Component
```
packages/ui/src/components/AnalogTimer.tsx:
- SVG-based wedge that diminishes
- Color zones (yellow → green → mauve as time elapses)
- Smooth animation, respects prefers-reduced-motion
- Configurable duration (15/25/45 min presets + custom)
```

#### 6.4 Sound Family System
```
- Pre-recorded audio files in apps/web/public/sounds/families/
- soft_chimes/ (variations 1-5)
- singing_bowls/ (variations 1-5)
- pink_noise_pulse/ (variations 1-3)
- Random selection on each interval to prevent habituation
- No two consecutive selections from the same family use the same variation
```

#### 6.5 Tactile/Vibration Cues (Mobile)
```
Per Comprehensive_Multidisciplinary_Framework §4 — vibration prompts mentioned 
alongside audio in original spec but not previously tracked:

- packages/domain/src/timer/vibration-patterns.ts (define patterns)
- Use navigator.vibrate() for pattern-based haptic feedback on supported devices
- User preference: "haptic_feedback" boolean (default ON for mobile, ignored on desktop)
- Patterns:
  - interval_chime: [200] (single short pulse)
  - timer_complete: [200, 100, 200, 100, 400] (celebration pattern)
  - body_check_in_prompt: [100] (gentle nudge)
- Falls back silently on browsers without Vibration API
- Honors prefers-reduced-motion (vibration considered motion for some users)
- Sound and vibration are independently toggleable in settings
```

#### 6.6 Picture-in-Picture
```
- "Pop out" button uses documentPictureInPicture API
- Falls back to a normal floating window if API unavailable
- Pop-out shows minimal timer UI only
```

#### 6.7 First Focus Badge
```
- Event: focus_session.started → first_focus badge
- Event: focus_session.completed → focus_complete badge (repeatable)
```

#### 6.8 10-3 Rule Foundation (Phase 1 — Hooks Only)
```
Per Barkley's 10-3 rule (10 min focus / 3 min movement):

In M6, build the SCAFFOLDING for 10-3 rule integration. The actual prompt
content and movement library lands in M20.

- Setting: tenThreeRuleEnabled (boolean in users.preferences, default FALSE)
- Timer logic:
  - When 10-min mark hit during focus session, fire 'ten-three-rule:movement-due' event
  - The handler checks tenThreeRuleEnabled
  - If enabled: queue a movement prompt (handled by M20)
  - If M20 not yet built: log the event and continue silently
- Settings UI: toggle in /settings/timer with explanation:
  "After every 10 minutes of focus, suggest a 3-minute movement break.
   Based on Dr. Russell Barkley's research."
- Don't show toggle to users until M20 ships (gate behind feature flag)
```

#### 6.9 Optional Speed Run Trigger Hook (Phase 1 — Hooks Only)
```
Per design system §14.5 — speed runs are an opt-in stimulation feature:

- Setting: speedRunChallengesEnabled (boolean, default FALSE)
- Hook: when user completes 2+ tasks within 15 minutes,
  fire 'speed-run:eligible' event
- For M6, just fire the event — actual UI for speed runs lands later
- This pre-wires the data signal so adding speed runs later is purely UI work
```

### Tests Required

```
Unit:
  - Timer start/pause/resume/end state transitions
  - Sound family selection randomness (no consecutive repeats)
  - Wedge percentage calculation accuracy
  - Vibration pattern selection respects user preference

Integration:
  - focus_sessions row created on start, updated on end
  - Badge fires correctly

E2E:
  - User starts 30-second timer → wedge animates → completes → badge
  - User pops out timer → floating window appears
  - User pauses, resumes, completes
  - Vibration triggered on mobile (manual test only — Playwright can't verify haptics)
```

### Acceptance Criteria

- [x] Three preset durations + custom — 15/25/45 presets + a custom-minutes input
- [x] Visual wedge accurate to ±1 second — `computeWedge` (unit-tested), ticked at 250ms
- [x] Sound Family cycles variations correctly (no two consecutive same) — `selectNextVariation` (unit-tested exhaustively)
- [x] Vibration patterns fire on mobile devices that support Vibration API — `navigator.vibrate` via `resolveVibration`
- [x] Sound and vibration toggle independently in settings — two switches on /account
- [x] prefers-reduced-motion disables vibration — `resolveVibration` returns null under reduced-motion
- [x] Picture-in-Picture works in Chrome/Edge — `documentPictureInPicture`, canvas-based wedge
- [x] Fallback floating window in Safari/Firefox — `window.open` popup fallback
- [x] Mobile: timer works in foreground — responsive single-column layout
- [x] First Focus and Focus Complete badges fire — verified in browser + E2E (clock fast-forward)
- [x] All tests pass — 231 domain unit (41 new timer tests) + 5 new timer E2E (22 E2E total)

**Audio decision:** Sound Families are **synthesized via the Web Audio API** (not pre-recorded files) — works immediately, fully testable, satisfies the anti-habituation intent. **Reorder/PiP note:** the wedge shows NO digital countdown numerals (analog spatializes time, per design rationale).

**M6 is COMPLETE — verified end-to-end (start → wedge → complete → first_focus + focus_complete badges) and by automated tests.**

### Manual Smoke Test (Human)
1. Start 25-min timer → see wedge animate
2. Pop out → floating window, return to other tabs
3. Wait for completion → hear sound, see badge
4. On mobile: feel vibration on completion
5. Toggle "Disable haptics" in settings → no more vibrations

### ✅ PAUSE POINT — End of M6

---

## Milestone 7: Voice Dump + AI Parsing

**Goal:** User can hold a button to record audio, which is transcribed via Whisper and parsed into structured tasks via GPT-4o-mini.

**Prerequisites:** M6 complete

**Spec references:** `ADHD_Forge_Tech_Specs.pdf` §2; `Detailed_ADHD_Forge_Document.pdf` §3.1; `01-authentication-and-user-model.md` §11.2

### Tasks

#### 7.0 OpenAI Account Setup (HUMAN ACTION REQUIRED)
```
🛑 STOP. CLAUDE CODE: PAUSE AND REQUEST HUMAN ACTION.

This step requires the human to set up an OpenAI account with billing.
DO NOT continue past this step until the human confirms OPENAI_API_KEY
is set in both .env.local and Vercel.

═══════════════════════════════════════════════════════════════════════
OPENAI API SETUP
═══════════════════════════════════════════════════════════════════════

Time required: ~10 minutes
Cost: Pay-as-you-go (no monthly minimum)
  - Whisper transcription: $0.006/min of audio
  - GPT-4o-mini: ~$0.15/M input tokens, $0.60/M output tokens
  - At quota limits (10 voice dumps/day per free user, 30s avg) — well under $1/user/month
  - Recommended: set monthly hard limit at $20/month for safety while testing

Step 1: Visit https://platform.openai.com → Sign up
        Use a primary email; this account will be billed for AI usage.

Step 2: Verify email and phone (required for API access)

Step 3: Go to Billing → Add payment method
        - Add a credit card
        - Click "Add to credit balance" — start with $10 (it lasts a long time at this scale)
        - Important: under "Auto recharge" enable it with a $10 trigger
          and $10 reload amount, OR leave manual to control spending

Step 4: Set usage limits (CRITICAL — do not skip):
        Billing → Usage limits
        - Hard limit: $20/month (or whatever your tolerance is)
          When this is reached, ALL API calls will fail until next month.
          This is your safety net against runaway costs.
        - Soft limit: $10/month (alert email at this threshold)

Step 5: Generate API key:
        API keys → Create new secret key
        - Name: "Focus Forge Production"
        - Permissions: All (or restrict to "Restricted" with these checked):
          - Audio: Read & Write (for Whisper)
          - Model capabilities: Read & Write (for GPT calls)
        - Click Create.
        
        The key is shown ONCE. SAVE IT NOW.
        Format: sk-proj-...

Step 6: Add to .env.local AND Vercel env vars:
          OPENAI_API_KEY="sk-proj-..."

Step 7: Test the key works:
        Run: pnpm tsx scripts/test-openai.ts
        (This script will be created in 7.1; for now, verify the key
        is set correctly)

═══════════════════════════════════════════════════════════════════════
COST MONITORING ADVICE
═══════════════════════════════════════════════════════════════════════

- Check OpenAI Usage dashboard weekly during early development
- A single test of voice dump should cost <$0.01
- If you see unusual spikes, immediately revoke the key and create a new one
  (potential leak)
- For free-tier users at scale, the per-user AI cost is the largest
  variable expense. Monitor /api/voice-dump and /api/ai-breakdown latency
  and call counts in production.

🛑 Claude Code: do not proceed until the human confirms OPENAI_API_KEY
is set both locally and in Vercel.
```

#### 7.1 OpenAI Integration
```
packages/ai/src/:
- whisper-client.ts (transcription)
- gpt-task-parser.ts (text → structured tasks)
- prompts/task-parsing.ts (the actual prompt)

The task-parsing prompt must:
- Extract distinct tasks from messy text
- Suggest priority in the anchor/flexible model: priority_kind (anchor if a time/deadline
  is detected, else flexible) + priority_level (cant_miss/high/med/low — never "urgent",
  never red). cant_miss only when it's clearly a fixed, non-negotiable, time-bound event.
- If an anchor, extract the time into scheduled_for
- Suggest steps if task is complex
- Detect time references ("tomorrow at 3pm")
- Return JSON matching strict schema
```

#### 7.2 Audio Recording
```
- packages/ui/src/components/VoiceDumpButton.tsx
- Hold-to-record using MediaRecorder API
- Visual feedback: pulsing waveform during recording
- Falls back silently to text input if mic denied
```

#### 7.3 Audio Upload Flow
```
- POST /api/voice-dump (multipart upload)
- Audio sent to Whisper
- Audio deleted immediately after transcription
- Transcript sent to GPT-4o-mini for parsing
- Parsed tasks created in DB
- Audio NEVER persisted (per spec)
```

#### 7.4 Quota Enforcement (Build Now, Used Now and at M16)
```
- quota_usage table already in schema from M1 (per doc 04 §4.17)
- Implement checkQuota() and incrementQuota() per doc 05 §4.3-4.4
- Quota keys used in M7: 'voice_dump' (10/day free), 'ai_breakdown' (5/day free)
- Use canonical feature_key registry from doc 04 §4.7
- "Quota reached" UI per doc 05 §5
- All users get free-tier quotas (paid tier doesn't exist yet — this is fine)
- Reset works automatically via usage_date_utc — no cron needed
- UI displays reset time in user's local timezone
```

### Tests Required

```
Unit:
  - Task parser handles multiple tasks, single task, ambiguous text
  - Whisper client error handling
  - Quota check fail-open behavior (DB error → allow request)
  - Atomic increment prevents double-counting
  - Reset time conversion: UTC 04:00 → user's local time string

Integration:
  - POST /api/voice-dump → tasks created (mock OpenAI)
  - Quota increments correctly with ON DUPLICATE KEY UPDATE
  - Quota reached → returns 429 with reset time in user's timezone
  - usage_date_utc rolls over at 04:00 UTC boundary (test with mocked time)

E2E:
  - User records 5-second audio → tasks appear on dashboard
  - User records 11 times → 11th shows quota UI with "Type instead"
  - Quota UI displays user's local reset time correctly
```

### Acceptance Criteria

- [x] Voice recording works — hold-to-record `VoiceDumpButton` via MediaRecorder (Chrome/Edge/Firefox; Safari supported via the same API)
- [x] Whisper transcription succeeds — `transcribeAudio` (whisper-1); key validated, unit-tested (mocked)
- [x] GPT-4o-mini returns valid JSON — `parseTasks` uses strict json_schema structured output + defensive coercion
- [x] Audio deleted within 60s — audio lives only in the route handler's memory; never written to disk/R2 (Rule 9)
- [x] Quota enforced at 10/day (voice_dump) — checkQuota gate before any OpenAI call
- [x] Quota enforced at 5/day (ai_breakdown) — limit defined + tested (consumed at M9/M16)
- [x] Quota resets at 04:00 UTC, shown in user's local time — `getQuotaWindow` + client-side `toLocaleTimeString`
- [x] Quota check fails open if DB unavailable — checkQuota returns allowed on error (unit-tested)
- [x] Mic permission denied → silent fallback to text — `onMicDenied` focuses the text input, no shame
- [x] All tests pass — 250 domain + 14 AI + 42 web unit + 25 E2E (incl. fake-mic quota E2E that never hits OpenAI)

**Judgment calls:** automated tests mock OpenAI (zero cost, deterministic); the real-audio happy path is the Manual Smoke Test below (it spends OpenAI credits). Quota reset time is formatted client-side from `resetsAtUtc` (the server never needs the user's timezone). Atomic quota increment uses raw `INSERT … ON DUPLICATE KEY UPDATE` (cuid2 id).

**Vercel:** `OPENAI_API_KEY` added to the Vercel project env ✅ (Session 8) — prod deploy unblocked. Local `.env.local` covers dev.

**M7 is COMPLETE** — all infra + UI shipped and tested. The real-audio happy path is verified by the human via the smoke test (key already validated).

### Manual Smoke Test (Human)
1. Hold mic button, say "Email Sarah back, get groceries, and book the dentist"
2. See three tasks appear
3. Use voice dump 11 times → see quota UI showing local reset time
4. Wait until next 04:00 UTC → quota resets (verify via UI counter)

### ✅ PAUSE POINT — End of M7

---

## Milestone 8: Reverse Scheduler / Doorknob

**Goal:** User inputs an arrival time, transit duration, and pre-departure tasks. The app calculates backward and shows color-coded zones with a "+15 min" recalculator.

**Prerequisites:** M7 complete (uses AI for task parsing of "I need to leave at 3pm" inputs)

**Spec references:** `Detailed_ADHD_Forge_Document.pdf` §3.2; `Comprehensive_Multidisciplinary_Framework_*.pdf` §5

### Tasks

#### 8.1 Doorknob Domain Logic
```
packages/domain/src/doorknob/:
- calculate-schedule.ts (arrival - transit - tasks = start time)
- recalculate-late.ts (push entire schedule +15 min)
- zones.ts (yellow/green/mauve color logic)
```

#### 8.2 DoorknobTimeline Component
```
packages/ui/src/components/DoorknobTimeline.tsx:
- Horizontal timeline (special case from single-column rule)
- Color-coded zones per spec
- Current position indicator
- "+15 min" button
```

#### 8.3 Doorknob Setup Flow
```
- apps/web/app/(app)/doorknob/page.tsx
- Step 1: When do you need to be there?
- Step 2: How long is the trip?
- Step 3: Select pre-departure tasks (from Launchpad in M9, or freeform now)
- Result: full timeline shown
```

#### 8.4 Scheduled Alerts
```
Add to schema: scheduled_alerts (per §4.14)
- Cron job (Vercel Cron) fires alerts at zone transitions
- Browser notifications (with permission)
```

### Tests Required

```
Unit:
  - calculateSchedule correct for various inputs
  - recalculateLate adds 15 min to all downstream
  - Zone boundaries correct

E2E:
  - User creates Doorknob session → timeline displays
  - Click "+15 min" → all zones shift correctly
  - Browser notification at zone transition (mock)
```

### Acceptance Criteria

- [ ] Backward calculation correct
- [ ] Color zones match spec
- [ ] +15 button works in 1 click
- [ ] Scheduled alerts fire on time
- [ ] All tests pass

### ✅ PAUSE POINT — End of M8

---

## Milestone 9: Launchpad

**Goal:** User has a checklist of items by the door. Resets daily at user-defined time.

**Prerequisites:** M8 complete

**Spec references:** `Comprehensive_Multidisciplinary_Framework_*.pdf` §5; `04-mysql-schema.md` §4.11

### Tasks

#### 9.1 Schema + Domain
```
- launchpad_items table per §4.11
- Domain: add-item, check-item, reorder-items, reset-daily
- Vercel Cron: daily reset job (runs at 04:00 in each timezone — group by tz)
```

#### 9.2 Launchpad UI
```
- apps/web/app/(app)/launchpad/page.tsx
- Add to dashboard: launchpad summary widget
- Integrate with Doorknob: select Launchpad items as pre-departure tasks
```

#### 9.3 Nightly Reminder
```
- Scheduled alert: "Time to set up tomorrow's launchpad"
- User-configurable time (default 21:00 local)
```

### Tests Required

```
Unit:
  - Daily reset only resets items where reset_schedule = 'daily'
  - Timezone handling for reset time

E2E:
  - User adds Keys, Wallet, Lunch
  - Checks them off
  - At 04:00 local time, all unchecked again
```

### Acceptance Criteria

- [ ] Items persist across sessions
- [ ] Daily reset fires at correct local time
- [ ] Nightly reminder works
- [ ] Integrates with Doorknob mode

### ✅ PAUSE POINT — End of M9

---

## Milestone 10: Praise Repository

**Goal:** Users can invite trusted contacts (max 5 free), who can record voice memos. Free tier: 3 active memos, 15 plays/day. Pro tier: unlimited memos, 30 plays/day, AI transcripts included.

**Prerequisites:** M9 complete

**Spec references:** `Comprehensive_Multidisciplinary_Framework_*.pdf` §8; `04-mysql-schema.md` §4.9-4.10; `01-authentication-and-user-model.md` §10; `05-monetization-strategy.md` §2.1-2.2

### Tasks

#### 10.1 Trusted Contacts
```
- Schema: trusted_contacts table per doc 04 §4.10
- /account/praise-senders page
- User generates an invite link with a default sender display name
  (e.g., "Mom", "Sarah from work")
- Generate unique invite link with signed token (256-bit)
- 5-contact free limit (Pro: unlimited)
- User can revoke a sender at any time, deleting their memos
```

#### 10.2 Sender Flow (No Account Needed)
```
- /praise/[token] page (public route)
- Sender sees the display name the user set; can confirm or correct it
- The recipient's name takes precedence in case of ambiguity (per doc 01 §10.2)
- Sender records up to 3 memos within 7 days of first use
- Audio uploaded to Cloudflare R2 storage (not Vercel Blob)
- Token expires 7 days after first use OR after 3 memos
- Sender IP logged briefly for rate-limit abuse detection, discarded after 24h
- Sender's email is NOT collected
```

#### 10.3 Recipient Flow
```
- /praise inbox page
- Memo cards with playback, speed controls (1x, 1.25x, 1.5x)
- Categories: "Listen when overwhelmed", "Before a big task", "After a failure"
- AI transcription gated behind Pro tier (free users see audio only, with 
  a soft note: "Transcripts are a Pro feature")
- 3-active-memo free limit (oldest archived when adding 4th)
- Pro: unlimited memos, no archival
```

#### 10.4 Audio Storage on Cloudflare R2

Per doc 04 — using Cloudflare R2 (not Vercel Blob):

- @aws-sdk/client-s3 package (R2 is S3-compatible)
- Signed URLs valid 1 hour
- File size limit: 60 seconds max per memo
- Files stored in private bucket: focus-forge-praise-{env}
- Audio served via signed URL only — never public

#### 10.4.1 Cloudflare R2 Setup (HUMAN ACTION REQUIRED)
```
🛑 STOP. CLAUDE CODE: PAUSE AND REQUEST HUMAN ACTION.

This step requires the human to set up Cloudflare R2 and obtain credentials.
DO NOT continue past this step until the human confirms all R2 env vars
are set in both .env.local and Vercel.

═══════════════════════════════════════════════════════════════════════
CLOUDFLARE R2 SETUP
═══════════════════════════════════════════════════════════════════════

Time required: ~15 minutes
Cost: Free up to 10GB storage and 1 million Class A operations/month
  - For Focus Forge at small scale: $0/month
  - At medium scale: probably still free (10GB = ~6,000 1-min audio files at 192kbps)
  - Beyond free tier: $0.015/GB stored, $4.50 per million Class A ops

Step 1: Sign up at https://cloudflare.com (no credit card required for free tier)

Step 2: Verify email, complete onboarding

Step 3: From Cloudflare dashboard left sidebar → R2 Object Storage
        - First time: click "Subscribe to Free Plan" (still free, just adds R2 to your account)
        - You may be asked to add a payment method even for free tier — they only charge if
          you exceed free tier limits, but the card on file is required

Step 4: Click "Create bucket"
        Name: focus-forge-praise-prod
        Location hint: Automatic (or pick closest to your users)
        Click Create bucket.
        
        For development, also create: focus-forge-praise-dev
        (Same settings, different name)

Step 5: Generate API token:
        Left sidebar → R2 → "Manage R2 API Tokens"
        Click "Create API Token"
        Token name: "Focus Forge App"
        Permissions: 
          - Object Read & Write
          - Apply to specific buckets only:
            - focus-forge-praise-prod
            - focus-forge-praise-dev
        TTL: leave as default (forever)
        Click Create API Token.
        
        On the next screen, you'll see:
        - Access Key ID
        - Secret Access Key
        - Endpoint URL (looks like https://[account-id].r2.cloudflarestorage.com)
        SAVE ALL THREE NOW. The Secret is shown ONCE.

Step 6: Configure CORS for browser uploads:
        From the bucket page → Settings → CORS Policy
        Click "Edit CORS policy" and paste:
        
        [
          {
            "AllowedOrigins": [
              "http://localhost:3000",
              "https://your-vercel-domain.vercel.app",
              "https://your-production-domain.com"
            ],
            "AllowedMethods": ["GET", "PUT"],
            "AllowedHeaders": ["*"],
            "MaxAgeSeconds": 3600
          }
        ]
        
        Click Save.

Step 7: Find your R2 Account ID:
        Cloudflare dashboard → R2 → "Manage R2 API Tokens" page
        Account ID is shown at the top of the page

Step 8: Add to .env.local AND Vercel env vars:
          R2_ACCOUNT_ID="<your account id>"
          R2_ACCESS_KEY_ID="<your access key id>"
          R2_SECRET_ACCESS_KEY="<your secret access key>"
          R2_BUCKET_NAME="focus-forge-praise-dev"  # or -prod for production
          R2_PUBLIC_URL=""  # leave blank — we use signed URLs only
        
        For production deployments, set R2_BUCKET_NAME="focus-forge-praise-prod"

Step 9: Test the connection:
        Run: pnpm tsx scripts/test-r2-connection.ts
        (This script will be created in 10.4.2; for now, verify env vars are set)

═══════════════════════════════════════════════════════════════════════

🛑 Claude Code: do not proceed until the human confirms ALL R2 env vars
are set both locally and in Vercel.
```

#### 10.5 Play Quotas
```
Per doc 05 §2.1-2.2:

- Quota key: 'praise_play'
- Free tier: 15 plays per day total (any combination of memos)
- Pro tier: 30 plays per day total
- Increment happens on play_started event
- When quota reached, show approved soft message:
  "Take a breath. Come back tomorrow if you still need to listen.
   Your memos will be here."
- NEVER frame this as "you're using this too much" - usage safeguard
```

#### 10.6 Reactive Moderation (Reports Only)
```
Per doc 01 §10 and doc 04 §4.29 — Option A reactive moderation:

- "Report this memo" button on each memo card (recipient side)
- Opens modal: reason category (inappropriate | harassment | spam | other),
  details textarea
- Creates content_reports row with:
  - reporter_user_id = current user
  - content_type = 'praise_memo'
  - content_id = memo id
  - reason_category, reason_details
  - status = 'pending_review'
- Memo is HIDDEN from the recipient's inbox immediately on report
  (they don't have to keep seeing it while admin reviews)
- Memo is NOT deleted — admins need to review the actual content
- If report is later resolved as 'no action needed', memo can be restored
  (admin action with justification)

Privacy boundary:
- Admins can ONLY access memo content for reports with status 'pending_review' or 'reviewing'
- Access via signed URL valid 30 minutes, regenerated per access
- Each access logs admin_actions row with action='content.review_memo'
- No persistent admin access to praise audio outside active reports
```

### Tests Required

```
Unit:
  - Token signing/verification
  - 5-contact, 3-memo (free), unlimited (paid) limit enforcement
  - 60-second audio length validation
  - Sender display name precedence logic (recipient wins)
  - Report submission creates content_reports row
  - Reported memo hidden from recipient inbox

Integration:
  - Sender flow end-to-end (mock R2 storage)
  - Recipient sees new memos within 7 seconds via polling sync
  - Audio upload to R2 with correct CORS
  - Signed URL generation
  - Play quota: 15 plays succeed for free user, 16th blocked with soft message
  - Play quota: 30 plays succeed for paid user, 31st blocked
  - Admin with admin_content_moderation can access reported memo audio
  - Admin without that permission cannot access memo audio (404)
  - Each admin access logged in admin_actions
  - Resolved 'no action' report restores memo visibility

E2E:
  - User creates invite with name "Mom" → opens in incognito 
    → sender sees "Mom" pre-filled → records → user receives memo
  - User has 3 memos → 4th memo arrives → oldest auto-archived
  - Free user plays memos 15 times → 16th attempt shows soft cap message
```

### Acceptance Criteria

- [ ] Invite links work without sender account
- [ ] 5-contact free limit enforced (paid: unlimited)
- [ ] 3-memo free limit enforced with auto-archival of oldest
- [ ] 60-second per-memo length limit enforced
- [ ] 15-plays/day free, 30-plays/day paid
- [ ] Audio stored privately on Cloudflare R2 (not Vercel Blob)
- [ ] Signed URLs expire correctly (1 hour)
- [ ] Speed controls work (1x, 1.25x, 1.5x)
- [ ] AI transcription gated to Pro (free users see audio with soft Pro note)
- [ ] Sender abuse detection (rate limit by IP on token page)
- [ ] Sender display name precedence: recipient's setting wins
- [ ] Play cap message uses approved soft language (no shame framing)

### ✅ PAUSE POINT — End of M10

---

## Milestone 11: Body Doubling (Jitsi)

**Status:** ✅ Decision locked — Jitsi Public Instance, Pro tier only.

**Goal:** Pro users can join 24/7 silent co-working rooms with synchronized Pomodoro timer.

**Prerequisites:** M10 complete (note: M11 doesn't depend on M10 functionally; sequenced this way for milestone discipline)

**Spec references:** `Comprehensive_Multidisciplinary_Framework_*.pdf` §7; `05-monetization-strategy.md` §8

### Tasks

#### 11.1 Pro Tier Gate
```
- /co-work page (Pro-gated)
- Free users see informational page explaining the feature with soft Pro CTA
  per doc 03 §5.1 — never shame-framed
- Use feature_gates.userHasFeature(userId, 'body_doubling') to check access
```

#### 11.2 Jitsi Iframe Integration
```
- Use lib-jitsi-meet or @jitsi/react-sdk for iframe embedding
- Domain: meet.jit.si (free public instance)
- Room naming: focusforge-{roomId}-{themeName} 
  (namespaced to prevent collision with random Jitsi rooms)
- Default config:
  - startWithAudioMuted: true
  - startWithVideoMuted: false
  - prejoinPageEnabled: false (skip Jitsi's prejoin)
  - disableModeratorIndicator: true
  - hideRecordingLabel: true
- User cannot record (disabled in config)
```

#### 11.3 Themed Drop-In Rooms
```
- 5 always-on rooms, themed per Comprehensive Framework §7:
  - "Silent Cafe" (warm, casual atmosphere)
  - "Library Quiet" (focused, formal)
  - "Cozy Living Room" (relaxed)
  - "Office Hours" (professional)
  - "Late Night Owl" (for night workers)
- Each is a virtual Jitsi room with our custom UI overlay
- /co-work shows room list with our own participant counts (see note below)
- Click → joins room with mic-off, blur-on by default

⚠️ IMPORTANT TECHNICAL CONSTRAINT — Participant counts:
The free meet.jit.si public instance does NOT expose participant counts
to external applications via API. We cannot query "how many people are
in room X right now."

Workaround for v1:
- Track participant counts via OUR application's session tracking:
  - When a user joins a room via our /co-work UI, log to body_doubling_sessions table
  - When they leave (or session times out after 90 min), log the end
  - Compute "current participants" by counting active sessions per room
  - This count may not match what's actually in Jitsi (users could close
    the iframe without our cleanup running) — accept this as approximation

For v2 (if accuracy matters): consider self-hosting Jitsi or using
Jitsi as a Service (JaaS) which provides API access to room state.
Both have meaningful cost/complexity implications — defer until needed.
```

#### 11.4 Synchronized Pomodoro Overlay
```
- Custom React overlay on top of Jitsi iframe
- Shared timer visible to all participants in the room
- Stored in MySQL: room_pomodoro_state table
  - room_id, current_phase (work|break), phase_started_at, duration
- Polled by all participants every 5s (uses existing sync infrastructure)
- Anyone can start a new pomodoro; everyone sees it
- Timer is INDEPENDENT of Jitsi — it's our own UI
```

#### 11.5 Sensory Controls
```
- Quiet Mode toggle (default ON): mic stays muted, no auto-unmute
- Blur background toggle (default ON): uses Jitsi's built-in blur
- Hide self-view toggle (default OFF): hides own tile from grid
- Dim incoming video toggle (CSS opacity reduction): for sensory overload
```

#### 11.6 Reporting & Moderation (Unified content_reports)
```
Per doc 04 §4.29 — body doubling reports use the unified content_reports table:

- "Report user" button in participant menu
- Report modal: reason category, reason details
- Creates content_reports row with:
  - reporter_user_id = current user
  - reported_user_id = (NULL — we only have target_jitsi_id, not our user_id)
  - content_type = 'body_doubling_session'
  - content_id = room_key + jitsi_session_id (composite, stored in metadata)
  - reason_category, reason_details
  - status = 'pending_review'

Privacy boundary:
- We CANNOT review video/audio content — Jitsi controls that, not us
- Admin review consists of: examining reports against the same target,
  pattern-matching repeat offenders
- Action options: warn user, pause user, ban from body doubling specifically
  (revoke 'body_doubling' feature_grant)
- All admin decisions logged in admin_actions

Three-strike heuristic (admin discretion, not automated):
- 3+ reports against same user within 30 days → admin notified for review
- Admin reviews report context, can pause user pending investigation
```

#### 11.7 Schema Addition
```sql
-- Add to Prisma schema (only room_pomodoro_state — body_doubling_reports
-- is REPLACED by the unified content_reports table from doc 04 §4.29)

CREATE TABLE room_pomodoro_state (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  room_key        VARCHAR(80)   NOT NULL,        -- 'silent_cafe', etc.
  current_phase   ENUM('work', 'break', 'idle') NOT NULL DEFAULT 'idle',
  phase_started_at TIMESTAMP(3) NULL DEFAULT NULL,
  phase_duration_seconds INT UNSIGNED NULL DEFAULT NULL,
  started_by_user_id VARCHAR(30) NULL DEFAULT NULL,
  
  updated_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  UNIQUE KEY uq_room (room_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

**Note:** the originally-planned `body_doubling_reports` table is replaced by `content_reports` (doc 04 §4.29) which unifies the moderation queue across praise memos and body doubling. Single workflow, single admin UI.

### Tests Required

```
Unit:
  - Feature gate check (Pro vs free)
  - Pomodoro state transitions
  - Room state polling logic

Integration:
  - Free user accessing /co-work sees Pro CTA, not iframe
  - Pro user can load Jitsi iframe with correct config
  - Pomodoro state syncs across simulated participants

E2E:
  - Pro user joins room → sees Jitsi iframe with mic muted
  - Two Pro users in same room → both see same Pomodoro state
  - Free user attempts /co-work → sees Pro feature info (soft framing)
  - User reports another participant → row appears in content_reports with content_type='body_doubling_session'
```

### Acceptance Criteria

- [ ] /co-work route exists, gated by 'body_doubling' feature_grant
- [ ] Jitsi iframe loads with mic muted, blur on by default
- [ ] 5 themed rooms always available
- [ ] Synchronized Pomodoro timer visible to all participants
- [ ] Quiet Mode, blur, hide self-view, dim incoming all work
- [ ] Report button creates row in content_reports (unified moderation queue)
- [ ] Free users see soft Pro upsell (no shame language)
- [ ] No Jitsi-specific recording functionality enabled
- [ ] All tests pass

### Manual Smoke Test (Human)
1. As Pro user, visit /co-work → see 5 themed rooms
2. Join "Silent Cafe" → Jitsi iframe loads, mic muted by default
3. Open in second browser → both users see each other
4. Start Pomodoro from one tab → other tab updates within 5 seconds
5. As free user, visit /co-work → see Pro feature info, no iframe

### ✅ PAUSE POINT — End of M11

---

## Milestone 12: Body Check-Ins

**Goal:** During focus sessions ≥60 minutes, gentle prompts ask about water, tension, posture.

**Prerequisites:** M6 complete (uses focus_sessions); can be done anytime after M6

**Spec references:** `Comprehensive_Multidisciplinary_Framework_*.pdf` §9 Tool 1; `04-mysql-schema.md` §4.13 (table) and §8.1 (prompt library)

### Tasks

```
- Schema: check_ins table already in M1 (per doc 04 §4.13)
- Use prompt library from doc 04 §8.1 (CHECK_IN_PROMPTS array)
- Random selection at each check-in firing
- Non-blocking toast notification during long sessions
- Default ON for sessions ≥60 min, configurable per user
- Settings: enable/disable, opt out of bathroom prompts
- Bathroom prompt limited to once per 4 hours per user
- No prompt repeats within same focus session
- Default firing interval: every 30 minutes during sessions ≥60 min
```

### Tests
- Prompt fires at correct interval (mock timers)
- Random selection avoids repeats within session
- Bathroom prompt rate limit (once per 4h)
- Response captured to check_ins table
- Session ends → no more prompts queued
- Badge: check_in_yes fires on first 'yes'/'no' response (any non-dismiss)
- Disabled in settings → prompts never fire

### ✅ PAUSE POINT — End of M12

---

## Milestone 12.5: Nourishment HUD (Food & Water Tracking)

**Goal:** A persistent survival-game-style HUD in the bottom-left lets users log glasses of water and meals with one tap, shows a dark-amber→green progress bar, gently reminds via a two-stage pulse→glow when intake lapses, and awards the Hydrated / Well Fed badges on daily completion.

**Prerequisites:** M3 complete (design system, badge components); M2 complete (settings infrastructure). Independent of M12 but grouped here as a sibling wellbeing-nudge feature.

**Spec references:** `02-design-system.md` §18 (HUD design, two-stage reminder, wellbeing guardrail); `04-mysql-schema.md` §4.44–4.46 (settings, daily log, reminder/badge logic) and §8 (Hydrated + Well Fed badge seeds); `02-design-system.md` §18.6 (wellbeing guardrail)

**Numbering note:** Labeled 12.5 (rather than renumbering M13+) because it was specced after the milestone sequence was set. Build it any time after M3; its position here is conceptual (sits beside Body Check-Ins as a gentle nudge feature), not a strict dependency order.

### Tasks

```
- Schema: nourishment_settings + nourishment_daily_log tables (doc 04 §4.44, §4.45)
  - Add JSON CHECK constraint on mealtimes (doc 04 §10)
  - Lazy-create settings row with defaults (water_goal 8, mealtimes 08:00/12:30/18:30)
- Daily log upsert: UNIQUE(user_id, log_date); increment on +tap, set last_*_at
  - Day rollover at 04:00 USER-LOCAL time (not UTC — personal daily rhythm)
  - Snapshot goals into the day row so later settings edits don't rewrite history
- HUD component (bottom-left, two stacked chips): icon + segmented bar + count + (+)
  - Segmented progress bar, dark amber → emerald interpolation (doc 02 §18.2)
  - Count-pop animation on increment (respects prefers-reduced-motion)
  - Custom SVG icons: hud-water.svg (waterglass), hud-food.svg (crossed fork & spoon)
- Two-stage reminder (doc 02 §18.3, doc 04 §4.46):
  - Reminder state COMPUTED client-side from last_*_at + thresholds + now
  - Stage 1: amber pulse (~3 min); Stage 2: settle to quiet glow until logged
  - Water: begins water_reminder_hours (default 2) after last water / day start
  - Food: begins meal_grace_minutes (default 45) after a mealtime passes unlogged
  - Logging clears reminder to neutral immediately
  - AMBER ONLY, never red; de-escalates, never nags
- Badge award on goal completion (doc 04 §4.46):
  - Hydrated (water goal met), Well Fed Body and Mind (all meals)
  - Daily-repeatable, streak-free, once-per-day max
  - Standard celebration pop (emerald-themed)
- Settings UI: water goal stepper, mealtime add/remove (time picker),
  reminders on/off, hide-HUD toggle. Meal goal = count of mealtimes (auto).
- Wellbeing guardrail (doc 02 §18.6): NO calorie/weight/macro/portion tracking;
  daily counts only, no per-event audit trail; additive framing only.
```

### Tests
- + tap increments count and fills one bar segment
- Bar color interpolates amber→green as fraction rises; full bar is emerald
- Count clamps at goal in UI; over-log allowed in column but not required
- Day rollover at 04:00 local creates a fresh row; prior day preserved with snapshot goals
- Editing water goal does NOT alter prior days' completion
- Water reminder: state 'none' before threshold, 'pulse' then 'glow' after (mock timers)
- Food reminder: fires only after grace window past an unlogged mealtime
- Logging clears reminder to neutral
- Reminder never uses red (assert computed colors; grep component for red tokens)
- Hydrated badge fires once when water_count reaches goal; not re-awarded same day
- Well Fed badge fires once when meal_count reaches goal; not re-awarded same day
- Missing a day awards/penalizes NOTHING (no streak state exists)
- HUD disabled in settings → not rendered; reminders disabled → no pulse/glow
- prefers-reduced-motion → count-pop and pulse disabled, glow/color still apply
- Mealtimes JSON rejects malformed entries (DB constraint + Zod)

### Acceptance Criteria
- [ ] Two-chip HUD renders bottom-left, never overlapping the task column
- [ ] One-tap logging with satisfying count-pop + segment fill
- [ ] Segmented bar interpolates dark amber → emerald; no red anywhere
- [ ] Two-stage reminder: brief pulse settles to quiet glow; clears on log
- [ ] Water goal + mealtimes both user-configurable with sensible defaults
- [ ] Hydrated + Well Fed badges award daily, streak-free, once per day
- [ ] Missing goals produces no shame state of any kind
- [ ] No calorie/weight/macro tracking; daily counts only (wellbeing guardrail)
- [ ] Entire HUD and reminders independently disableable
- [ ] Custom water + crossed-utensils SVG icons match Style A vocabulary

### Manual Smoke Test
1. Open workspace → see two chips bottom-left
2. Tap water + a few times → bar fills, warms toward green, count rises
3. Fill water to goal → bar emerald, Hydrated badge pops
4. Set a mealtime in the recent past (settings) → after grace window, food chip pulses then glows
5. Tap food + → glow clears, count rises
6. Disable HUD in settings → it disappears
7. Toggle reduced motion → pops/pulse stop, color/glow remain

### ✅ PAUSE POINT — End of M12.5

---

## Milestone 13: Decision Paralysis Breaker

**Goal:** When user has 3+ tasks and hasn't started one in 24 hours, surface a "Help Me Decide" prompt that uses AI to pick 2 options.

**Prerequisites:** M7 complete (uses AI)

**Spec references:** `Comprehensive_Multidisciplinary_Framework_*.pdf` §9 Tool 2

### Tasks

```
- Detection logic: 3+ active tasks, no task completion in 24h
- "Help Me Decide" button on dashboard
- AI prompt: given task list, return 2 micro-step recommendations
- Quota: 3/day free
- Modal UI: two big buttons with the recommended steps
- Selecting one creates a task_step and enters Walk-Through mode
```

### Tests
- Trigger correctness
- AI returns exactly 2 options
- Quota enforcement
- Selection flows into Walk-Through

### ✅ PAUSE POINT — End of M13 — End of Phase 2

All features functional. Pre-launch hardening begins.

---

# PHASE 3: LAUNCH PREP

## Milestone 14: Onboarding Flow + First-Session Experience

**Goal:** New users complete the full onboarding per spec, including First Capture, badge surfacing, welcome email, and Phase 3 progressive discovery.

**Prerequisites:** M4–M13 complete

**Spec references:** `03-onboarding-flow.md` (entire doc)

### Tasks

```
- /welcome page (post-signup landing)
- First-capture flow per spec §3
- First Capture Badge fires within 500ms of task creation 
  (NOT dependent on AI parsing completion — fail open)
- Discovery card system
  - Pro features surfaced with soft "this is Pro" framing 
    (per doc 03 §5.1 update — never shame-framed)
- Returning-user logic per spec §8
  - NO Day 3 re-engagement email (removed per audit)
  - NO "we miss you" emails ever
- Telemetry events per spec §9
- Skip path on every step
- Email verification banner (non-blocking)

#### 14.1 Welcome Email (Transactional, NOT Re-Engagement)
- Triggered by 'user.signed_up' event, sent within 5 minutes
- Subject: "Your Focus Forge account is ready"
- Body (plain, no marketing):
  "Hi [name],

  Your Focus Forge account is set up and ready.

  Whatever brought you here — burnout, frustration with other tools,
  curiosity — we hope this helps.

  Sign in: https://focusforge.app/signin

  If you have questions, reply to this email.

  — Focus Forge"
- Sent via Resend
- This is the ONLY transactional onboarding email
- No drip sequence, no follow-up emails, no re-engagement

#### 14.2 Display Name Resolution (per doc 01 §2.5)
- Implement getUserAddressName(user) utility
- Used everywhere the UI greets the user
- Fallback chain: explicit display_name → OAuth name → email local part → "you"
```

### Tests
- Full first-touch flow under 90 seconds
- First Capture Badge fires immediately (not gated on AI completion)
- Skip path bypasses without errors
- Discovery cards trigger correctly per updated table (Pro features properly framed)
- No re-engagement emails sent at any point after welcome
- Returning user experience contains no shame language
- Display name fallback chain works end-to-end
- Welcome email sent on signup (mock Resend)

### Acceptance Criteria

- [ ] All §12 acceptance criteria from 03-onboarding-flow.md met
- [ ] First Capture Badge fires within 500ms of task creation
- [ ] AI parsing failure does NOT block badge or task display
- [ ] Welcome email sent exactly once per signup
- [ ] No emails sent at Day 3, Day 7, Day 30, or any other re-engagement window
- [ ] Pro features in discovery cards use soft framing (verified by content review)

### ✅ PAUSE POINT — End of M14

---

## Milestone 15: PWA + Offline + Static Pages + Production Hardening

**Goal:** App is installable as PWA on mobile, core features work offline, all static pages (About, References, legal) are live, CI link checker is running, and production is ready for real users.

**Prerequisites:** M14 complete

**Spec references:** `08-page-content-and-references.md` (entire doc)

### Tasks

#### 15.1 PWA Manifest
```
- public/manifest.json with icons, theme colors, name
- next.config.mjs with next-pwa or built-in PWA support
- Service worker for offline support
```

#### 15.2 Offline Support
```
- Cache: dashboard, active tasks, timer, design system
- Queue: task creation, completion (sync when online)
- Offline banner: "Working offline. Changes will sync."
```

#### 15.3 Account Settings (Full)
```
- Data export (JSON download)
- Delete account flow with 30-day grace
- Theme toggle
- Sound family preference
- Notification preferences
- Linked auth methods
- Settings → About link (jumps to /about)
```

#### 15.4 Static Pages — About, References, Legal
```
Per spec 08-page-content-and-references.md:

a) Reference Data Source
   - Create apps/web/data/references.json with all 75 references
     categorized per spec §3.2
   - Validate against TypeScript schema from spec §3.1
   - Each foundational/supporting reference has annotation

b) About Page
   - apps/web/app/about/page.tsx
   - Content from spec §4.1 (markdown source of truth)
   - Single column, max-w-65ch, design system tokens
   - Links to /about/references

c) References Page
   - apps/web/app/about/references/page.tsx
   - Renders categorized references with disclaimer (spec §2.2)
   - ReferenceCard component per spec §2.3
   - Search/filter input (client-side, instant)
   - All external links: target="_blank" rel="noopener noreferrer"
   - Small external-link icon next to each title
   - "Last updated: [date]" displays from references.json
   - Display weight indicator subtly (e.g., foundational refs slightly emphasized)

d) Footer Component
   - packages/ui/src/components/Footer.tsx
   - Layout per spec §5.1
   - Links per spec §5.2
   - Tagline per spec §5.3
   - Persistent on all non-auth pages
   - Auth pages keep minimal/no footer

e) Legal Pages
   - apps/web/app/privacy/page.tsx (Privacy Policy)
   - apps/web/app/terms/page.tsx (Terms of Service)
   - apps/web/app/refunds/page.tsx (Refund Policy)
   - Use Termly/Iubenda generated content for v1
   - Single column, design system tokens
```

#### 15.5 CI Link Checker
```
Per spec 08-page-content-and-references.md §6:

- Create .github/workflows/check-references.yml per spec §6.2
- Create scripts/post-link-check-results.js for result handling
- Configure result handling per spec §6.3:
  - Scheduled (weekly): opens GitHub issue if broken links found
  - PR (when references.json changes): comments with results, fails on NEW breaks
  - Manual: console output
- Test with deliberately broken URL (should be caught and flagged)
- Update references.json lastUpdated field on each successful run
```

#### 15.6 Production Hardening
```
- Sentry error tracking (free tier) with PII scrubbing rules:
  - sendDefaultPii: false (do NOT capture user emails, IPs by default)
  - Custom beforeSend hook to redact:
    - Voice Dump audio data (NEVER transmitted)
    - Praise memo content (NEVER transmitted)
    - Praise memo transcripts (redact 'transcript' fields)
    - User-typed task content (redact 'rawText', 'title', 'notes' fields)
    - Auth tokens, session IDs (redact any field matching /token|secret|password/i)
  - User context: only include user ID (no email, no name)
- Vercel Analytics (free, privacy-respecting)
- Rate limiting on all API routes:
  - Auth endpoints: 5/15min per email
  - Voice Dump: 10/day per user (matches quota)
  - Other write endpoints: 60/min per user
- Content Security Policy headers (strict, no inline scripts)
- HSTS, X-Frame-Options, X-Content-Type-Options
- robots.txt allowing all major search engines
- sitemap.xml including /about, /about/references, all public legal pages
```

#### 15.7 Mobile App Strategy (PWA Only For v1)
```
Per discussion notes — "build mobile apps on github" was clarified as PWA-only for v1:

- App is a Progressive Web App, installable on iOS and Android
- Native iOS/Android apps are FUTURE work, not in this roadmap
- The monorepo apps/mobile folder is reserved for future React Native or Expo build
- For v1, ship PWA with proper manifest:
  - Installable from browser "Add to Home Screen"
  - App icons for all required sizes
  - Splash screens
  - Standalone display mode
  - Proper theme color matching dark mode
```

#### 15.8 Performance Audits
```
- Lighthouse score ≥90 on all key pages
- Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
- Database query performance: dashboard <100ms
- Reference page initial render <1s (75 entries should not slow page)
```

### Tests Required

```
Unit tests:
  - References JSON validates against TypeScript schema
  - Reference card component renders all reference types
  - Search/filter logic correctly matches title, publisher, annotation
  - Footer renders correct links
  - Sentry beforeSend correctly redacts sensitive fields

Integration tests:
  - About page renders all section content
  - References page renders all categories with correct counts
  - Search input filters results without page reload
  - External links have correct rel attributes
  - 404 page renders with footer
  - Legal pages all return 200

E2E tests (Playwright):
  - User clicks footer "References" link from any page → lands on References
  - User searches "time blindness" → results filter live
  - User clicks external reference → opens in new tab (verify target attribute)
  - User navigates Settings → About → References (full path works)
  - Reduced-motion preference honored on References page

CI Link Checker tests:
  - Workflow runs on schedule
  - Workflow runs on PR touching references.json
  - Adding a known-broken URL to a PR fails the check
  - Existing-broken URL from scheduled run opens GitHub issue, doesn't fail builds

Accessibility tests:
  - axe-core: 0 violations on About page
  - axe-core: 0 violations on References page
  - All references keyboard-navigable
  - Reading-level check on About page content (Flesch-Kincaid 8th grade)
```

### Acceptance Criteria

- [ ] App installable on iOS and Android (as PWA)
- [ ] Offline support works for: dashboard, active tasks, timer
- [ ] Account deletion works end-to-end with 30-day grace
- [ ] Account deletion blocked by active Stripe subscription (must cancel first)
- [ ] Data export produces valid JSON
- [ ] Sentry captures errors in production
- [ ] **Sentry PII scrubbing verified: voice/audio/transcript/task content NEVER in error reports**
- [ ] **Sentry user context contains only user ID, no email or name**
- [ ] All Lighthouse scores ≥90
- [ ] All security headers verified
- [ ] **About page live with all content from spec §4.1**
- [ ] **References page live with all 75 references categorized**
- [ ] **Disclaimer block visible at top of References page**
- [ ] **All foundational/supporting references have annotations**
- [ ] **Footer present on all non-auth pages with all 6 links**
- [ ] **Search/filter on References page works without page reload**
- [ ] **All external links use rel="noopener noreferrer"**
- [ ] **No tracking on outbound link clicks**
- [ ] **CI link checker workflow exists and runs successfully**
- [ ] **CI link checker correctly catches a deliberately broken test URL**
- [ ] **lastUpdated date displays correctly on References page**
- [ ] Privacy Policy, Terms of Service, Refunds pages live
- [ ] axe-core: 0 violations on all static pages
- [ ] Native iOS/Android apps NOT in scope for v1 (documented as future work)

### Manual Smoke Test (Human)

1. Install PWA on iPhone
2. Use offline → tasks still accessible
3. Reconnect → changes sync
4. Trigger error → see in Sentry
5. Run Lighthouse → all green
6. **Open homepage → verify footer present with all links**
7. **Click "References" in footer → land on References page**
8. **Verify disclaimer is visible at top**
9. **Verify references are organized into 6 categories**
10. **Search "Barkley" → see relevant references filter**
11. **Click an external reference → opens in new tab, no Focus Forge tracking**
12. **Navigate Settings → About → click References link**
13. **Manually test CI link checker:**
    - Add a deliberately broken URL to references.json on a test branch
    - Open PR → verify CI fails the check
    - Remove the broken URL → verify CI passes
14. **Verify "Last updated" date is recent**

### ✅ PAUSE POINT — End of M15 — Core Launch Capability Reached

**Phase 3 still has M16 and M17 (and now M19 and M20) before final launch.** Continue.

---

## Milestone 16: Bug & Feature Request Tool

**Goal:** Public route where users can submit bug reports and feature requests, vote on existing items, and see status updates from maintainers. Forum framework placeholders in place but not exposed.

**Prerequisites:** M15 complete

**Spec references:** `04-mysql-schema.md` §4.19-4.21, §4.27; `05-monetization-strategy.md` §2.1 (free tier)

### Design Notes

This milestone replaces what would have been a forum. Hard rules:

- **No general user-to-user comments** in v1 (distress risk)
- **No downvotes** (only upvotes)
- **No public attribution by default** (submitter shown as "A user" unless they opt to be named)
- **No notifications** about other users' content (only about updates to YOUR submissions)
- **Status language is neutral** — `wontfix` is "Outside our current focus" in UI, never "rejected" or "denied"

### Tasks

#### 16.1 Schema (already in M1 from doc 04 §4.19-4.21, §4.27)
```
- feedback_items (with kind: bug | feature_request)
- feedback_votes (one per user per item; upvotes only)
- feedback_status_updates (admin-only)
- feature_announcements (forum framework placeholder, used now for admin pinned notices)
```

#### 16.2 Public Feedback Page
```
- Route: /feedback (publicly viewable, anyone can read; submission requires auth)
- apps/web/app/feedback/page.tsx
- Tabs: "Bugs" | "Feature Requests" (default: Feature Requests, sorted by votes)
- Filter: status (open | acknowledged | in_progress | resolved | wontfix)
- Sort: most-voted | newest | recently-updated
- Pinned items appear at top (admin-pinned)
- Active feature_announcements (visible, not expired) shown above the list
- Single-column layout (per design system)
```

#### 16.3 Feedback Item Detail Page
```
- Route: /feedback/[id]
- Shows: title, body, status badge, vote count, vote button
- Admin status updates rendered chronologically below the item
- "Report duplicate" button (creates internal flag, doesn't auto-merge)
- "Report inappropriate content" button (admin moderation queue)
- NO general comment thread (forum framework placeholder doesn't expose this)
```

#### 16.4 Submit Feedback Flow
```
- Route: /feedback/new
- Authenticated users only
- Form fields:
  - Kind: radio (Bug / Feature Request)
  - Title: required, max 200 chars
  - Body: required, min 30 chars, max 2000 chars
  - Bug metadata (auto-collected if Bug kind):
    - Browser + version (from User-Agent)
    - OS (from User-Agent)
    - Viewport size
    - Current URL when reported
- Show: "Your submission will be visible publicly. Your name is shown as
  'A user' unless you change this in settings."
- Rate limit: 3 submissions per user per hour
- Submitter auto-votes on their own item (vote_count starts at 1)
```

#### 16.5 Voting
```
- /api/feedback/[id]/vote endpoint
- POST = add vote, DELETE = remove vote
- Atomic increment/decrement of feedback_items.vote_count in same transaction
- Toggle vote button: shows count, highlighted state when voted
- Authenticated users only
- One vote per user per item (enforced by unique key)
```

#### 16.6 Admin Console (Plugs Into M2 Admin Foundation)
```
- Route: /admin/feedback (gated by 'admin_feedback_management' feature_grant)
- Plugs into the admin layout established in M2 (no new auth/permission scaffolding)
- All actions use the requireAdminPermission middleware from M2
- All status updates and pins logged to admin_actions with justification field
- List view of all items with admin actions:
  - Update status (open → acknowledged → in_progress → resolved/wontfix)
  - Add status update message (admin commentary)
  - Pin/unpin item
  - Mark as duplicate (set duplicate_of_id)
  - Delete (soft-delete, hides from public view)
- Future enhancement: better admin UI in M18 or beyond
```

#### 16.7 Email Notifications (Submitter Only)
```
- When YOUR submission gets a status update or admin response:
  - Email via Resend
  - Plain text, no marketing
  - Subject: "Update on your [bug report | feature request]"
  - Body: short summary + link
- User can disable in Settings → Notifications
- NEVER email about other users' submissions or activity
```

#### 16.8 Forum Framework Placeholder Documentation
```
- Add /docs/architecture/forum-readiness.md (internal docs)
- Documents:
  - Schema affordances built in (feature_announcements, room for discussions table)
  - UI affordances (feedback components built on a generic Feed pattern)
  - Decision history: why forum was deferred from v1
  - What would need to change to enable it (data model, moderation tools, sensitivity considerations)
- This is NOT user-facing — it's documentation for the next developer/AI agent
```

### Tests Required

```
Unit tests:
  - Vote count increment/decrement atomicity
  - Status transition logic (admin only)
  - Bug metadata auto-collection from User-Agent
  - Rate limiting on submissions (3/hour)

Integration tests:
  - Submit feedback → row created with vote_count=1
  - Vote on item → count increments, UI reflects
  - Toggle vote off → count decrements
  - Admin status update → email sent to submitter (mock Resend)
  - Non-admin attempts admin actions → 403
  - User submits, then deletes account → submission persists, user_id NULL

E2E tests:
  - Anonymous user views /feedback → sees items but cannot vote
  - Authenticated user submits bug → it appears in list
  - User votes on feature request → vote count updates
  - Admin marks item as resolved → submitter receives email notification
```

### Acceptance Criteria

- [ ] /feedback route accessible to all (read-only for anonymous)
- [ ] Submission requires authentication
- [ ] Voting requires authentication, one vote per user per item
- [ ] No downvote button anywhere in UI
- [ ] No general comments between users (admin-only status updates)
- [ ] Bug metadata auto-collected from browser
- [ ] Admin can transition item through all status states
- [ ] Status text in UI uses neutral language (no "rejected" — uses "Outside our current focus")
- [ ] Email notifications only to submitter, only about their own submissions
- [ ] Rate limit enforced (3 submissions/user/hour)
- [ ] Forum framework documentation exists in /docs/architecture/
- [ ] axe-core: 0 violations on all feedback pages
- [ ] Submitter shown as "A user" by default (privacy-by-default)

### Manual Smoke Test (Human)

1. Visit /feedback while logged out → see existing items, no submit button
2. Log in → "Submit feedback" button appears
3. Submit a bug report → see it in the Bugs tab
4. Vote on a feature request → count goes up, button highlighted
5. Click vote again → un-vote, count goes down
6. As admin (manually grant yourself the feature): visit /admin/feedback
7. Update a status, write a message → check submitter's email (manual or mock)
8. Try to use Apple Sign-In on submission → it doesn't exist (correctly per spec)

### ✅ PAUSE POINT — End of M16

---

## Milestone 17: Routines & Task Templates

**Goal:** Users can create reusable task templates, build them into routines, schedule routines on selected days (every day / weekdays / specific days), and choose hard or soft scheduling per routine. Free for all users.

**Prerequisites:** M4 (tasks), M6 (timer), M8 (Doorknob), M16 (Phase 3 complete)

**Spec references:** `04-mysql-schema.md` §4.22-4.26; `05-monetization-strategy.md` §2.1-2.2 (AI suggestions paid only)

### Design Notes

Background: routines are the highest-leverage core accessibility feature we have. Hard rules:

- **Missed routine instances are NEVER shown to the user by default.** Soft-track mode applies.
- **The "Patterns" view is opt-in only.** Users explicitly enable it in settings.
- **Patterns view shows COMPLETION counts, not failure counts.** "Completed 12 of 14" not "Missed 2."
- **No streak counters anywhere.** Streaks are distress traps.
- **AI suggestions phrased as offers, not corrections.** "Want to try X?" not "You should do X."

### Tasks

#### 17.1 Schema (already in M1 from doc 04 §4.22-4.26)
```
- task_templates
- routines
- routine_steps  
- routine_instances
- routine_completion_patterns
```

#### 17.2 Task Template Management
```
Routes:
- /templates (list)
- /templates/new (create)
- /templates/[id] (edit)
- /templates/[id]/delete (soft-delete, archives)

Server actions:
- create-template
- update-template
- archive-template
- duplicate-template

UI:
- Single-column list of user's templates
- Create form: title, notes, default_priority, default_estimated_minutes,
  optional default_steps array
- Edit existing templates inline
- "Use in routine" button creates a new routine seeded with this template
```

#### 17.3 Routine Builder
```
Routes:
- /routines (list of user's routines)
- /routines/new (create)
- /routines/[id] (edit)
- /routines/[id]/preview (see what it generates for a typical day)

UI flow (single-column, progressive disclosure):
  Step 1: Name your routine ("Morning Routine")
  Step 2: Select days
    - Visual day picker: S M T W T F S (toggle each)
    - Quick presets: "Every day" | "Weekdays" | "Weekends"
  Step 3: Hard or soft scheduling?
    - Hard: "Send me notifications when blocks start/end"
    - Soft: "Just show times as labels, no notifications"
  Step 4: Add tasks
    - "Add from template" picker OR
    - "Add new task" inline form
    - Drag to reorder
    - Set start time + duration per task (optional unless hard-scheduled)
  Step 5: Review & save

Server actions:
- create-routine (with steps in transaction)
- update-routine
- pause-routine (sets is_active=false, doesn't generate new instances)
- resume-routine
- archive-routine (soft-delete)
- reorder-routine-steps
```

#### 17.4 Daily Instance Generation
```
Run by hourly cron dispatcher at 04:00 UTC each day:

For each user with active routines:
  Compute "today" in user's timezone
  For each active routine where isActiveOnDay(routine, today):
    For each active routine_step:
      Insert routine_instance:
        scheduled_date_utc = today (UTC date)
        status = 'pending'
      (Skip if instance already exists — uq_routine_instance_per_day)

Idempotent: re-running doesn't create duplicates
Logs to events: 'routine.instances_generated' with counts
```

#### 17.5 Dashboard Integration
```
Today's routine instances show on the dashboard mixed with regular tasks:
- Sort: scheduled time (if any) ascending, then priority
- Visual differentiator: small icon indicating "from routine"
- Tapping creates a real task row (lazy bind via routine_instances.task_id)
- Completing → marks both task and routine_instance completed
- Skipping → marks routine_instance skipped (silent, no shame)
- End-of-day silent expiration: pending instances become 'expired' (never shown again)
```

#### 17.6 Hard Scheduling (Notifications)
```
For hard-scheduled routines:
- When generating instance, also create scheduled_alert:
  - Type: 'routine_block_start'
  - Scheduled for: routine_step.start_time_local converted to UTC for today
  - Payload: { routine_id, routine_step_id, kind: 'start' }
- Browser notification (with permission)
- Notification copy: "Time to start: [task title]"
- ALSO create end alert if duration_minutes set:
  - Notification copy: "Wrapping up: [task title] (block ends now)"
- User can mute notifications for a specific routine
```

#### 17.7 Patterns View (Opt-In)
```
Setting: Settings → Routines → "Show me my completion patterns" (toggle, default OFF)

When enabled:
- Route: /routines/patterns
- Shows routine_completion_patterns data
- For each routine_step:
  - "Job hunt: completed 12 of 14 days (last 30 days, 14 active)"
  - Day-of-week breakdown chart
- Free tier: raw completion data only
- Pro tier: AI-generated suggestions appear inline
  - Generated by daily cron job using routine_completion_patterns data
  - Stored in routine_completion_patterns.ai_suggestion column
  - Quota: AI suggestions are NOT counted against ai_decision quota
    (this is a Pro-only feature; no free version exists)
- BANNED in this view: streak counters, red highlighting, "missed" framing,
  "you should" phrasing, comparison to other users
```

#### 17.8 AI Suggestion Generation (Pro Only)
```
Run by hourly cron dispatcher (e.g., at 05:00 UTC daily):

For each Pro user with completion_patterns enabled:
  For each routine_step with completion_rate < 0.5:
    Generate AI suggestion using GPT-4o-mini:
      Prompt: "User's routine task '{title}' is completed only X% of the time.
      Day-of-week breakdown: {breakdown}. Suggest ONE gentle adjustment
      (e.g., time change, day removal, splitting into smaller tasks).
      Return as a single sentence offering, never a directive."
    Save to routine_completion_patterns.ai_suggestion

UI in Patterns view (Pro):
  Shows the suggestion below each step's data
  "Try this?" button creates a draft routine update for user to review
```

#### 17.9 Settings Integration
```
Settings → Routines section:
- Toggle: Show completion patterns (default OFF)
- Toggle: Notifications for hard-scheduled routines (default ON)
- List of routines with quick pause/resume
- Link to /routines page for full management
```

### Tests Required

```
Unit tests:
  - Day bitmask: isActiveOnDay correctly handles all 7 days
  - Day presets: every_day=127, weekdays=62, weekends=65
  - Routine step ordering preserved on reorder
  - Instance generation idempotency (run twice, same result)
  - End-of-day expiration logic
  - Pattern computation: completion_rate correct for various inputs
  - AI suggestion gating: only Pro users get suggestions

Integration tests:
  - Create template → use in routine → save → verify schema
  - Create routine for "every day" → verify instance generated next 04:00 UTC
  - Create routine for "weekdays" → verify NO instance on Saturday
  - Hard-scheduled routine → scheduled_alert created with correct UTC time
  - Pending instance at end-of-day → marked expired silently
  - Free user views patterns → sees data, no AI suggestion
  - Pro user views patterns → sees data + AI suggestion
  - Daily generation handles users across timezones correctly

E2E tests:
  - User creates first template, then first routine → tasks appear next morning
  - User pauses routine → next day's instances NOT generated
  - User resumes routine → following day's instances resume
  - User enables Patterns → /routines/patterns becomes accessible
  - User disables Patterns → /routines/patterns shows "feature off" page
```

### Acceptance Criteria

- [ ] Users can create unlimited task templates
- [ ] Users can create unlimited routines
- [ ] Day selection supports every-day, weekdays, weekends, custom (any combo)
- [ ] Hard vs soft scheduling toggle per routine
- [ ] Hard-scheduled routines fire browser notifications at correct local times
- [ ] Soft-scheduled routines show times as labels only, no notifications
- [ ] Daily generation runs at 04:00 UTC via hourly cron, idempotent
- [ ] Routine instances appear on dashboard mixed with regular tasks
- [ ] Completing instance from dashboard marks both task and routine_instance complete
- [ ] End-of-day pending instances silently expire (NEVER shown to user)
- [ ] Patterns view is OPT-IN, default off
- [ ] Patterns view shows completion counts, not failure counts
- [ ] No streak counters anywhere in routines feature
- [ ] AI suggestions appear ONLY for Pro users in Patterns view
- [ ] Free users see raw data without AI suggestions (clear, not nagging)
- [ ] All routine UI passes axe-core (0 violations)
- [ ] All tests pass

### Manual Smoke Test (Human)

1. Create 3 task templates: "Job hunt", "Breakfast", "Clean common area"
2. Create routine "Morning Routine":
   - Days: every day
   - Hard scheduling: yes
   - Tasks: 8am-10am Job Hunt, 10am Breakfast, 10:30am-2pm Clean
3. Wait until next 04:00 UTC → check dashboard, see 3 routine instances
4. Receive browser notification at 8am: "Time to start: Job hunt"
5. Complete one, skip another → end of day, check no shame messaging anywhere
6. Enable Settings → Show completion patterns
7. Visit /routines/patterns → see your completion data
8. As Pro user: see AI suggestions inline
9. As free user: see data only, no suggestions

### ✅ PAUSE POINT — End of M17

---

## Milestone 19: Mini-Games (Stimulation Toolkit)

**Goal:** Three built-in mini-games (Pattern Match, Reaction Tiles, Word Builder) provide cognitive primers and dopamine spikes within tightly-controlled boundaries. Free for all users.

**Prerequisites:** M17 complete

**Spec references:** `02-design-system.md` §14.4 (mini-game design constraints); `04-mysql-schema.md` §4.30 (mini_game_sessions); `05-monetization-strategy.md` §2.1 (free tier rationale); `Video_Game_and_Movement_Therapeutic_information.txt` (research basis)

### Design Notes

Hard rules are encoded structurally:
- **No high scores, no leaderboards** (schema lacks score column)
- **Hard 10-minute timer per session** (cannot be disabled)
- **Cooldown enforced server-side** (cannot be bypassed by client)
- **Pre-task primer mode tracked separately** (can bypass cooldown for legitimate use)
- **Anti-shame language available in all messages** (varies by user setting)

We adds: **the seamless handoff is critical.** When a session ends, the user should be guided to either their next task, a focus timer, or body doubling — never dropped into a void where they spiral.

### Tasks

#### 19.1 Schema (already in M1 from doc 04 §4.30)
```
- mini_game_sessions table
- users.preferences.miniGamesEnabled (default true)
- users.preferences.miniGameCooldownHours (default 3, min 1, max 24)
- feature_grant 'mini_games' for all users
```

#### 19.2 Mini-Game Routes & Layout
```
- /games — landing page listing 3 games with cooldown status
- /games/[gameKey] — playing surface
- /games/[gameKey]/handoff — post-session "where to next?" page

Layout requirements (per design system §14.4):
- Full-screen game canvas
- Always-visible: pause button (top-left), skip-to-task (top-right),
  countdown timer, cooldown indicator
- Single-column on mobile, centered on desktop
```

#### 19.3 Cooldown Enforcement
```
Per doc 04 §4.30:

- Server endpoint /api/games/check-cooldown returns:
  - { allowed: true, lastSession?: Date }
  - OR { allowed: false, nextAllowedAt: Date, reason: string }
- Client checks BEFORE rendering /games/[gameKey]
- If blocked: show cooldown screen with reason and countdown
- Cooldown reset is implicit (no cron) — first-pass query checks last session
- Pre-task primer sessions BYPASS cooldown:
  - Client posts to /api/games/start with isPretaskPrimer=true and primerForTaskId
  - Server validates the task exists, is owned by user, has duration ≥60 min
  - Logs is_pretask_primer=TRUE in mini_game_sessions
```

#### 19.4 Game 1: Pattern Match
```
- packages/ui/src/games/PatternMatch.tsx
- Mechanic: 3-tile sequence appears, user reproduces by tapping in order
- Each round: sequence grows by 1 tile (Simon-style, but no penalty for failure)
- Failure = round ends, new sequence starts (NO score, NO failure penalty)
- Visual: 4 colored tiles (amber, emerald, slate, fuchsia — all design system colors)
- Audio: gentle Sound Family chimes on tile press
- 10-minute auto-end (hard timer)
```

#### 19.5 Game 2: Reaction Tiles
```
- packages/ui/src/games/ReactionTiles.tsx
- Mechanic: tiles appear at random positions; user taps before they disappear
- Tile lifetime: 1.5 sec (gentle), reduces to 0.8 sec (challenging)
- NO scoring, NO miss penalty — missed tiles just fade
- Visual: tiles use design system colors with brief satisfying-fade animation
- Hard 10-minute timer ends session
- Optional: speed adjusts based on user's accuracy (adaptive difficulty without scoring)
```

#### 19.6 Game 3: Word Builder
```
- packages/ui/src/games/WordBuilder.tsx
- Mechanic: 6 letters shown; user forms valid English words by tapping letter sequence
- Word validation against bundled English dictionary (~50k common words)
- Each valid word adds to "your words" list (NOT a score, just a collection)
- Letters refresh on demand (button) or auto-refresh after 30 sec inactivity
- Hard 10-minute timer ends session
- Bundled dictionary: english-words npm package (10MB — bundle size acceptable)
- Accessibility: large tap targets, all keyboard-accessible (no mouse-only)
```

#### 19.7 Pre-Task Primer Flow
```
- Surface in task UI: "Want a quick warm-up?" prompt before starting tasks ≥60 min
- Anti-shame message variant per user preference:
  - Explicit: "Big tasks need warm-ups. A 5-minute game can help your brain prime — not procrastination, just priming. Want to try?"
  - Neutral: "Want a quick game first? (5 min)"
- User picks game OR skips
- If game chosen, mini_game_sessions row tagged is_pretask_primer=TRUE
- After game ends, automatic handoff to: focus timer for the task
```

#### 19.8 Seamless Handoff
```
Per QA design guidance — when game session ends, user must NOT
be dropped into a void. Three handoff paths:

When 10-min timer expires OR user clicks "Skip to task":
1. If pre-task primer mode: auto-navigate to focus timer for primer task
2. If user has active task chosen: navigate to walk-through OR focus timer
3. If no specific task: show /games/[gameKey]/handoff with options:
   - "Start working on [oldest pending task]" (one-tap)
   - "Pick a different task"
   - "Start a focus timer"
   - "Join a body doubling room" (if Pro and during business hours)
   - "I'm done for now"
```

#### 19.9 Anti-Shame Language Integration
```
Per doc 04 §4.32-4.33:

- Use getMessageVariant(userId, messageKey) helper for all gamification copy
- Message keys:
  - 'minigame_first_intro'
  - 'minigame_cooldown_blocked'
  - 'minigame_pretask_offer'
  - 'minigame_session_ending'
  - 'minigame_handoff_offer'
- Each has explicit and neutral variants per design system §14.6
- message_encounters table tracks first-encounter for diminishing didactic mode
```

### Tests Required

```
Unit:
  - Cooldown query correctly identifies recent sessions
  - Pre-task primer bypasses cooldown
  - 10-min timer cannot be extended
  - Pause/resume preserves game state
  - Word Builder dictionary lookup
  - Pattern Match sequence generation deterministic for testing

Integration:
  - Start session → mini_game_sessions row created
  - Complete session → row updated with end_reason
  - Timer expires → end_reason='timer_expired'
  - Cooldown check returns correct nextAllowedAt
  - Pre-task primer requires valid task with 60+ min duration

E2E:
  - User opens /games → sees 3 games with cooldown status
  - User plays Pattern Match → completes round → 10 min hits → forced end
  - User clicks pause → game state preserved → resume works
  - User in cooldown → /games shows lockout screen
  - Pre-task primer flow → game → handoff → focus timer
  - First-time encounter shows explicit anti-shame language
  - Repeat encounter shows neutral language
```

### Acceptance Criteria

- [ ] Three mini-games playable: Pattern Match, Reaction Tiles, Word Builder
- [ ] All games have hard 10-minute auto-end (cannot be disabled)
- [ ] No high scores, no leaderboards anywhere
- [ ] No "you lost" or "failed" framing in any game
- [ ] Pause button always visible during play
- [ ] Skip-to-task button always visible during play
- [ ] Cooldown enforced server-side (default 3 hours)
- [ ] Pre-task primer mode bypasses cooldown for tasks ≥60 min duration
- [ ] User can configure cooldown hours (1-24) in settings
- [ ] Seamless handoff offers task/focus/body doubling options
- [ ] Anti-shame language varies by user preference setting
- [ ] message_encounters tracks first-encounter for diminishing mode
- [ ] All games keyboard-playable (no mouse/touch-only mechanics)
- [ ] All games inherit design system colors (no neon, no red)
- [ ] No flashing >3Hz anywhere
- [ ] Game audio uses user's selected Sound Family
- [ ] All games functional with prefers-reduced-motion (animation fallbacks)
- [ ] axe-core: 0 violations on all game pages
- [ ] All tests pass

### Manual Smoke Test (Human)

1. Visit /games → see 3 games with "Available now" status
2. Play Pattern Match for 1 minute → click pause → see resume button
3. Resume → continue playing → click "Skip to task"
4. Visit /games again → see cooldown screen with countdown
5. Create a task with 90-minute estimated duration
6. Open task → see "Want a quick warm-up?" prompt → choose Word Builder
7. Play for 10 minutes → forced end → auto-handoff to focus timer for task
8. Verify mini_game_sessions has correct rows in phpMyAdmin
9. Toggle anti-shame language to "always_neutral" → see game intros change

### ✅ PAUSE POINT — End of M19

---

## Milestone 20: Movement Integration

**Goal:** Movement prompts integrated into focus timer (10-3 rule), body check-ins (M12), and as standalone suggestions. Three exercise tiers (aerobic, cognitive, mind-body) supported. Free for all users.

**Prerequisites:** M12 complete (uses check_ins infrastructure), M6 complete (uses focus timer hooks from §6.8)

**Spec references:** `04-mysql-schema.md` §4.31 (movement_prompts_log), §4.32 (preferences); `02-design-system.md` §14.6 (movement prompt UI); `Video_Game_and_Movement_Therapeutic_information.txt` (3-tier exercise framework, Barkley 10-3 rule)

### Design Notes

The Hard rules:
- **Movement is offered, never demanded.** All prompts have one-tap dismiss.
- **No shaming for skipped prompts.** No "You haven't moved in 2 hours."
- **Repeated dismissal triggers backoff** — system reduces frequency, doesn't escalate.
- **Tier respected.** User who selects Tier 3 only doesn't see "do jumping jacks."

### Tasks

#### 20.1 Schema (already in M1 from doc 04 §4.31)
```
- movement_prompts_log table
- users.preferences.movementPromptsEnabled (default TRUE)
- users.preferences.movementPromptTiers (array of tiers, default all three)
- users.preferences.tenThreeRuleEnabled (default FALSE)
- feature_grant 'movement_prompts' for all users
```

#### 20.2 Movement Prompt Library
```
Per doc 04 §4.31 — define library of 11 prompts across 3 tiers:

- packages/domain/src/movement/prompts.ts (constants array)
- Each prompt has: key, tier, text, icon
- Selection logic:
  - Filter by user's preferred tiers
  - Exclude prompts shown in last 24 hours
  - Random selection from remaining
  - User with prefers-reduced-motion: only Tier 3 by default
```

#### 20.3 10-3 Rule Integration With Focus Timer
```
Per M6 §6.8 — the hooks were laid in M6. Now we wire the actual prompts:

- Listener for 'ten-three-rule:movement-due' event from M6
- When fires AND tenThreeRuleEnabled:
  - Pick a Tier 1 movement (aerobic, brief)
  - Show toast notification with prompt
  - User options: Start (3-min movement timer) | Snooze | Skip
  - Log to movement_prompts_log with triggered_by='focus_session_10_3'
- "Start" launches a 3-minute movement timer (visual countdown)
- Pause focus timer during movement
- Resume focus timer when movement ends or user clicks "back to focus"
```

#### 20.4 Long Session Movement Suggestions
```
For focus sessions ≥60 minutes (regardless of 10-3 setting):

- Every 30 minutes during long sessions, fire movement prompt
- Use Tier 2 or Tier 3 (less interrupting than aerobic)
- Same UI as 10-3 rule prompt
- Log with triggered_by='long_session'
- Backoff logic: 3+ skips in row → reduce to every 60 min for rest of session
```

#### 20.5 Settings Integration
```
- /settings/movement page
- Toggle: movementPromptsEnabled (default ON)
- Toggle: tenThreeRuleEnabled (default OFF)
- Multi-select: movementPromptTiers (default all)
- Slider: minimum minutes between prompts (default 30)
- Description includes anti-shame framing variant per user preference
```

#### 20.6 Body Check-In Expansion
```
Building on M12 prompt library — add movement-related prompts:

- 'when_last_stood_up' (already exists in M12)
- 'last_walk' (NEW — "When did you last go for a walk?")
- 'fresh_air' (NEW — "Have you stepped outside today?")
- 'physical_energy' (NEW — "How's your physical energy?")

These are check-ins (M12), not movement prompts (M20). They ASK; they don't suggest.
```

#### 20.7 Anti-Shame Language Integration
```
Per doc 04 §4.32-4.33:

Movement prompt copy uses getMessageVariant pattern:
- 'movement_break_first_intro' (explicit on first encounter)
- 'movement_offer_neutral' (after first encounter)
- 'movement_skip_no_problem' (when user skips)
- 'movement_repeat_skip_backoff' (after 3 skips, system explains backoff)

The An earlier pattern:
1. Validate the need ("your brain works better with...")
2. Reframe as strategic ("priming, not weakness")
3. Remove moral weight ("no worries", "no rush")
4. Offer alternatives ("a walk also works")
```

#### 20.8 Manual Movement Logging (Optional)
```
For users who like to track:

- "I just moved!" button on dashboard
- Modal: "What did you do?" (free text or pick from prompts)
- Logs row in movement_prompts_log with triggered_by='manual_request'
- Useful for users using completion patterns to see movement habits
- Does NOT show as streak. Does NOT compare days.
```

### Tests Required

```
Unit:
  - Movement prompt selection respects user tier filter
  - Recent prompts (within 24h) excluded
  - prefers-reduced-motion limits to Tier 3
  - Backoff logic kicks in after 3 consecutive skips
  - 10-3 rule integration doesn't fire if disabled

Integration:
  - Focus timer fires 'movement-due' event at 10-min mark
  - Listener launches movement prompt (mock toast)
  - User accepts → 3-min movement timer starts
  - User skips → movement_prompts_log row with response='dismissed'
  - 3 consecutive skips → frequency reduced for rest of session
  - Manual movement log creates row with triggered_by='manual_request'

E2E:
  - User enables 10-3 rule → starts focus timer → at 10 min, sees prompt
  - User clicks "Start" → 3-min timer → returns to focus
  - User in long session sees prompt every 30 min
  - User skips 3 in a row → next prompt is 60 min later
  - User with reduced motion preference sees only Tier 3 prompts
```

### Acceptance Criteria

- [ ] Movement prompts can fire from focus timer (10-3 rule), long sessions, manual request
- [ ] User can configure preferred exercise tiers
- [ ] User can disable all movement prompts
- [ ] All prompts have one-tap dismiss
- [ ] Backoff after 3 consecutive skips (frequency reduced)
- [ ] No shaming language anywhere ("haven't moved", "you should", etc. banned)
- [ ] 3-minute movement timer integrates with focus timer pause/resume
- [ ] prefers-reduced-motion users default to Tier 3 only
- [ ] All movement_prompts_log rows captured with full context
- [ ] Manual movement logging available
- [ ] Anti-shame language varies by user preference setting
- [ ] Body check-in library expanded with movement-related questions
- [ ] axe-core: 0 violations on movement settings page
- [ ] All tests pass

### Manual Smoke Test (Human)

1. Enable 10-3 rule in settings
2. Start a focus timer
3. At 10-min mark → see movement prompt
4. Click "Start" → 3-min movement timer counts down
5. Movement timer ends → focus timer resumes
6. Continue session for 30 min → see another movement prompt
7. Skip 3 in a row → notice next prompt is delayed (60 min)
8. Toggle anti-shame language to "always_neutral" → see prompts change
9. Set tier preference to "tier3 only" → only mind-body prompts appear

### ✅ PAUSE POINT — End of M20

---

## Milestone 21: Biddy (AI Body Double Companion)

**Goal:** Users can launch a parallel-play AI companion ("Biddy") in a persistent window. Biddy shows an animated avatar engaged in chosen activities. Session limits and daily caps prevent parasocial dependency. Free for all users with a daily cap.

**Prerequisites:** M11 complete (Body Doubling provides the parallel-play conceptual surface), M3 complete (design system provides avatar styling tokens)

**Spec references:** `02-design-system.md` §15 (Biddy Design); `04-mysql-schema.md` §4.34-4.35 (biddy_sessions, animation library); `05-monetization-strategy.md` §2.1 (free tier rationale, daily cap structure)

### Design Notes

Hard rules are encoded structurally:
- **No persistent memory between sessions** (schema lacks fields for it)
- **No chat input** (UI structurally absent)
- **No avatar naming** (no field, no UI)
- **Session and daily caps** (enforced server-side)
- **Guardrail messaging** (built into close flow)
- **Session-end "Biddy is a tool, not a friend" reminder** (always shown)

QA principle: **single active session per user.** A user opening Biddy in a second tab connects to the same session, not a new one.

The Design principle: **abstract avatars by default.** Humanoids are opt-in; even then, they're abstract (no skin tones, no detailed features) to reduce uncanny valley and parasocial attachment.

### Tasks

#### 21.1 Schema (already in M1 from doc 04 §4.34)
```
- biddy_sessions table
- users.preferences.biddyEnabled (default true)
- users.preferences.biddyDefaultAvatar (default 'cat')
- users.preferences.biddyDefaultActivity (default 'random')
- users.preferences.biddySessionLimitMinutes (default 90, max 120)
- users.preferences.biddyDailyCapMinutes (default 240, hard max 240)
- users.preferences.biddyShowGuardrailReminders (default true)
- feature_grant 'biddy' for all users
```

#### 21.2 Animation Library Asset Production
```
This is a substantial illustration/animation effort. Plan for it.

- Source: 9 avatars × 5 activities × 3 variations = 135 Lottie clips minimum
- Format: Lottie JSON (.json)
- Tooling: Adobe After Effects + Bodymovin extension, OR LottieFiles, OR
  hand-coded SVG-to-Lottie using lottie-web

Options:
1. Commission an animator (highest quality, ~$50-100/clip x 135 = significant cost)
2. Use LottieFiles marketplace + customization (mid-quality, faster)
3. AI-assisted generation + manual polish (faster, variable quality)
4. MVP with smaller library: 3 avatars × 2 activities × 2 variations = 12 clips
   then expand based on user uptake

For v1, recommend option 4 — ship with reduced library, expand based on data.

Asset locations:
- apps/web/public/biddy/animations/{avatar_key}/{activity}/{variation_index}.json
- All assets bundle-served (no CDN dependency)
```

#### 21.3 Biddy Window Component
```
- packages/ui/src/biddy/BiddyWindow.tsx
- Resizable, draggable browser window (uses react-rnd or similar library)
- Position persists in users.preferences.biddyWindowPosition
- Renders Lottie animation in main canvas area
- Top bar: countdown timer (counts DOWN from session limit)
- Bottom controls: activity dropdown, avatar dropdown, pause, end session
- All controls always visible per design system §15.1
- NO chat input field (absence enforced by code review)
```

#### 21.4 Animation Selection Logic
```
- packages/domain/src/biddy/animation-selector.ts
- selectNextAnimation(avatarKey, activityFilter, recentlyPlayedKeys[]) returns next clip
- Algorithm:
  1. Filter library by avatar
  2. If activityFilter='random', pick random activity
  3. Filter activities by user's selected activity
  4. Exclude clips played in last N selections
  5. Random pick from remaining
- Activity rotation when 'random':
  - Switch activity every 30-90 seconds (random within range)
  - Smooth fade transition between clips
```

#### 21.5 Session Lifecycle
```
Server endpoints:
- POST /api/biddy/start
  - Check existing active session (return existing if found)
  - Check daily cap (deny if exceeded; show approved message)
  - Create biddy_sessions row, return session ID + config
- PATCH /api/biddy/sessions/:id
  - Update avatar/activity mid-session
- POST /api/biddy/sessions/:id/end
  - Mark ended_at, compute duration
  - Show session-end celebration with "tool not friend" reminder

Client state:
- BiddySessionContext provides current session ID, config, time remaining
- Heartbeat every 30s to keep session alive (browser idle detection)
- After 5 min of no heartbeat: server auto-ends session, end_reason='browser_idle'
```

#### 21.6 Session Limit & Daily Cap Enforcement
```
Soft 60-min prompt:
- When session timer hits configured limit, show modal:
  "You and Biddy have been working for 60 minutes..."
  Buttons: [End session] [Continue 30 more minutes]
- Continue extends timer by 30 min, then re-prompts
- User can extend up to daily cap

Daily cap enforcement:
- POST /api/biddy/start checks total time today
- If at cap: deny session, return cap_reached message
- Frontend shows approved message (per doc 02 §15.4)

Per-account safeguard:
- Configuration limits enforced at preferences API:
  - biddySessionLimitMinutes: 30 | 60 | 90 | 120 (max 120 — usage safeguard)
  - biddyDailyCapMinutes: 240 (HARD CAP — not user-configurable, usage safeguard)
- User cannot bypass these caps via UI
- Even Pro users have the same safeguards (per doc 05)
```

#### 21.7 Guardrail Messaging
```
Required messages (cannot be disabled):
- 60-min soft prompt (when session limit reached)
- Daily cap reached message
- Session-end celebration with "Biddy is a tool, not a friend" framing

Optional messages (controlled by biddyShowGuardrailReminders):
- Periodic "humans matter too" gentle reminders
- "Want to spend the rest of the day with humans?" check-in at high cumulative time
```

#### 21.8 Anti-Shame Language Integration
```
Per doc 04 §4.32-4.33:

Use getMessageVariant pattern for:
- 'biddy_first_intro'
- 'biddy_session_limit'
- 'biddy_daily_cap'
- 'biddy_session_end'

Each has explicit and neutral variants per design system §15.4.
First-time encounters get explicit anti-shame framing.
```

#### 21.9 Settings Integration
```
- /settings/biddy page
- Toggle: biddyEnabled (default ON)
- Dropdown: default avatar
- Dropdown: default activity
- Slider: session limit (30/60/90/120 min)
- Slider: daily cap (60/120/240/360 min)
- Toggle: show guardrail reminders
- Description includes anti-shame framing
- Link: "What is Biddy?" → educational content explaining the tool/parasocial concerns
```

### Tests Required

```
Unit:
  - Animation selector excludes recently played clips
  - Activity rotation triggers within 30-90s window
  - Session limit enforces correct values
  - Daily cap calculation handles UTC boundary

Integration:
  - POST /api/biddy/start creates session
  - Concurrent /api/biddy/start returns existing session (no duplicate)
  - Daily cap query correctly sums time across sessions
  - Session limit reached → soft prompt fires → user extends → re-prompt
  - Heartbeat maintains active session; missing heartbeat ends session
  - Anti-shame language switches per user preference

E2E:
  - User opens /biddy → window appears with default avatar
  - User changes avatar mid-session → animation transitions
  - User changes activity → animations switch to new activity
  - 60-min limit reached → modal appears → continue 30 → eventually capped
  - User opens Biddy in second tab → same session reused
  - User reaches daily cap → cannot start new session today
  - prefers-reduced-motion → high-motion clips filtered, slow speed
  - Session-end shows "tool not friend" message
```

### Acceptance Criteria

- [ ] /biddy route opens persistent, resizable, draggable window
- [ ] 6 avatars available (all creatures: cat, robot, blob, plant, fox, owl)
- [ ] Companion category tab hidden in UI when no humanoid entries exist
- [ ] avatar_category ENUM in schema includes 'companion' value (scaffolding for future)
- [ ] 5 activities supported per avatar
- [ ] Minimum 3 animation variations per (avatar × activity) combo OR
      MVP library of 12 clips (3 avatars × 2 activities × 2 variations)
- [ ] Animation never repeats consecutively
- [ ] Activity rotates every 30-90s when filter is 'random'
- [ ] Session timer counts DOWN, not up
- [ ] No chat input field anywhere in UI (verified by grep)
- [ ] No avatar naming feature
- [ ] Single active session per user (concurrent requests share)
- [ ] 60-min soft prompt fires reliably
- [ ] Daily cap enforced server-side
- [ ] Session limit cannot exceed 120 min (usage safeguard)
- [ ] Daily cap cannot exceed 360 min (usage safeguard)
- [ ] Session-end shows "Biddy is a tool, not a friend" message
- [ ] prefers-reduced-motion slows animations and filters high-motion clips
- [ ] Anti-shame language varies per user preference
- [ ] All tests pass

### Manual Smoke Test (Human)

1. Visit /biddy → see default Biddy (Calm Blob, random activity)
2. Resize and drag window → position persists on next visit
3. Change avatar dropdown → see avatar transform
4. Wait 1 minute → activity changes (visual differs)
5. Set session timer to 30 min → wait → see soft prompt
6. Choose "End session" → see "tool not friend" message
7. Open multiple tabs to /biddy → all show same session (single active)
8. Open Biddy in second account, set daily cap to 60 min, exceed → see cap message
9. Toggle prefers-reduced-motion → see animations slow

### ✅ PAUSE POINT — End of M21

---

## Milestone 22: Module G — Time Estimation & Safe Urgency

**Goal:** Users can estimate how long tasks will take, get AI-suggested estimates based on history, and earn bonus badges when they beat their estimate. Hidden elapsed time by default. Calibration framing throughout (no shame for over-estimate completions). Free for all users; AI suggestions quota-gated.

**Prerequisites:** M4 complete (tasks), M3 complete (badges system), M7 complete (quota infrastructure)

**Spec references:** `02-design-system.md` §15.6 (UI requirements); `04-mysql-schema.md` §4.36-4.38 (schema, badges, quota); `05-monetization-strategy.md` §2.1 (free with quotas)

### Design Notes

The Design principle: **always-bronze + maybe-bonus** preserves the Soft-Track Protocol perfectly. The user always wins for completing the task; under-estimate completion is just a bonus.

The Hard rule: **silent background tracking** for elapsed time. Visible counters significantly increase anxiety for users with ADHD. Track silently, reveal at completion only.

A hard rule: **calibration, not failure.** Over-estimate completions get neutral framing — "your future estimates will sharpen" — never shame.

The Hard design rule: **no UI urgency cues.** Even when user opts to see elapsed time, no countdown, no color change, no animation, no notification.

### Tasks

#### 22.1 Schema (already in M1 from doc 04 §4.36)
```
- tasks.estimated_minutes (nullable smallint)
- tasks.estimated_minutes_source (enum)
- tasks.estimated_at (timestamp)
- tasks.actual_completion_seconds (nullable, hidden by default)
- tasks.completion_was_under_estimate (computed at completion)
- New badges seeded: time_bender, time_bender_streak_3, estimate_first
- New feature_keys: ai_etc_suggestion (10/day free), ai_etc_suggestion_unlimited (Pro)
- users.preferences.showElapsedTimeInTask (default FALSE)
- users.preferences.moduleGEnabled (default TRUE)
- users.preferences.moduleGAutoSuggestETC (default TRUE)
```

#### 22.2 Task UI: ETC Entry
```
- packages/ui/src/tasks/EstimateEntry.tsx
- Optional field on task creation/edit forms
- Quick-pick durations: 5/15/30/60/120 min + custom input
- "I'm not sure → ask AI" button:
  - Calls /api/tasks/:id/suggest-etc
  - Consumes ai_etc_suggestion quota
  - On quota exceeded: show approved soft message, fallback to manual entry
- Help text varies per anti-shame language preference:
  - Explicit: "Estimates help your brain calibrate. Whether you go over or under, it's data."
  - Neutral: "Optional: how long do you think this will take?"
```

#### 22.3 AI ETC Suggestion Endpoint
```
- /api/tasks/:id/suggest-etc
- Inputs: task title, notes, user's recent completion patterns
- Quota check: ai_etc_suggestion (10/day free)
- Calls GPT-4o-mini with prompt template:
  "User wants to estimate this task: {title}
   Their similar past tasks averaged: {historical_avg} minutes
   Suggest an ETC in minutes (just the number)."
- Stores ai_suggestion timestamp on task
- Returns: { suggestedMinutes, reasoning, quota: { used, limit, resetsAt } }
- Atomic quota increment after successful response
```

#### 22.4 Silent Time Tracking
```
- focus_sessions table already tracks start/end (existing M6 infrastructure)
- When task completed, sum focus_session durations linked to it = actual_completion_seconds
- This is computed at completion, NOT polled in real-time
- API enforcement:
  - GET /api/tasks/:id excludes actual_completion_seconds for in-progress tasks
  - Field readable only after status='completed'
- Optional opt-in endpoint for elapsed view:
  - GET /api/tasks/:id/elapsed-optin (only when showElapsedTimeInTask=true)
  - Returns rounded-to-nearest-5-minutes value (no precision urgency)
```

#### 22.5 Badge Logic on Task Completion
```
On task completion (API event task.completed):

1. ALWAYS award bronze badge for the task type
   (existing badge system from M3)

2. IF task.estimated_minutes IS NOT NULL:
   IF task.actual_completion_seconds < (task.estimated_minutes * 60):
     - Set task.completion_was_under_estimate = TRUE
     - Award 'time_bender' badge (repeatable)
     - Check if user has earned 3 time_bender badges → award 'time_bender_streak_3' (one-time)
   ELSE:
     - Set task.completion_was_under_estimate = FALSE
     - DO NOT award penalty badge (no such badge exists)
     - Log calibration event for AI improvement (no user-facing message)

3. IF this was user's first ETC entry:
   - Award 'estimate_first' badge (one-time)
```

#### 22.6 Completion Reveal UI
```
- packages/ui/src/tasks/CompletionReveal.tsx
- Shows after task marked complete
- Two variants based on under/over estimate:

UNDER ETC:
  ✓ Task complete!
  🥉 Bronze Badge earned
  ⚡ Time-Bender Badge earned
  Estimated: 30 min  •  Actual: 23 min
  [ See badges ]   [ Next task ]

OVER ETC (or no ETC set):
  ✓ Task complete!
  🥉 Bronze Badge earned
  
  (If ETC set:)
  This one took longer than estimated.
  Your future estimates will sharpen.
  
  [ See badges ]   [ Next task ]

NO RED. NO failure framing. Bronze ALWAYS fires.
```

#### 22.7 Completion Patterns Integration
```
The existing routine_completion_patterns view (from M17) gets a new section:

For users with completion_patterns enabled AND moduleGEnabled:
- Show ETC accuracy data:
  "You estimated 12 tasks. 8 of them were under your estimate."
  Day-of-week breakdown (Pro only, gated as before)
  
NEVER show:
- Average error rate percentage
- "How off your estimates are" framing
- Comparison to other users
- Streak counts of accurate estimates (only positive streaks like time_bender_streak_3)
```

#### 22.8 Settings Integration
```
- /settings/time-estimation page
- Toggle: moduleGEnabled (default ON)
- Toggle: moduleGAutoSuggestETC (default ON)
- Toggle: showElapsedTimeInTask (default OFF, with strong warning)
  - Warning text varies per anti-shame language preference
  - Explicit: "Showing elapsed time can trigger time anxiety in ADHD brains. The system tracks silently for badges. Are you sure?"
  - Neutral: "Show elapsed time during tasks? (Off by default)"
- Description of the calibration philosophy (with anti-shame framing)
```

### Tests Required

```
Unit:
  - Badge logic: time_bender fires only when actual < estimated
  - Badge logic: bronze fires regardless
  - Badge logic: estimate_first fires only on first ETC entry ever
  - AI ETC quota check correctness
  - Hidden time field excluded from in-progress task API

Integration:
  - Task with ETC completed under → time_bender awarded
  - Task with ETC completed over → bronze only, no penalty badge
  - Task without ETC completed → bronze only
  - AI ETC suggestion consumes quota
  - 11th AI ETC request returns quota_reached
  - GET /api/tasks/:id (in progress) does NOT contain actual_completion_seconds
  - GET /api/tasks/:id (completed) DOES contain actual_completion_seconds
  - GET /api/tasks/:id/elapsed-optin only when user opted in

E2E:
  - User creates task with 30-min ETC → completes in 20 min → sees Time-Bender
  - User creates task with 30-min ETC → completes in 45 min → sees calibration framing
  - User uses "Ask AI" → suggestion appears → quota decrements
  - 11th AI suggestion blocked with soft message
  - User enables showElapsedTimeInTask → sees warning → confirms → time visible
  - User never sees red color or "overdue" label even on extreme over-estimate
```

### Acceptance Criteria

- [ ] Optional ETC field on task creation/edit
- [ ] AI ETC suggestion endpoint with quota gating
- [ ] AI ETC suggestion: 10/day free, unlimited Pro
- [ ] Silent time tracking via focus_session linkage
- [ ] actual_completion_seconds NOT exposed for in-progress tasks
- [ ] Bronze badge fires on EVERY completion
- [ ] Time-Bender badge fires ONLY when actual < estimated
- [ ] No badge for over-estimate completion (no penalty mechanic)
- [ ] estimate_first badge fires once
- [ ] time_bender_streak_3 badge fires once at 3 cumulative time-benders
- [ ] Completion reveal uses calibration framing (not shame)
- [ ] No red color anywhere in Module G UI
- [ ] showElapsedTimeInTask defaults FALSE
- [ ] Settings toggle for elapsed time has strong warning
- [ ] Anti-shame language varies per user preference
- [ ] Help text and completion messages reframe over-estimates as data
- [ ] All tests pass

### Manual Smoke Test (Human)

1. Create task "Write blog post" → set estimate to 30 min
2. Use focus timer to work on it for 20 min → mark complete
3. See completion reveal → bronze + Time-Bender badges
4. Create another task → set estimate to 15 min
5. Work on it for 30 min → complete
6. See completion reveal → bronze only, "estimates will sharpen" message
7. Create task → click "Ask AI" → see suggested ETC
8. Use 10 AI suggestions → 11th shows quota message
9. Enable showElapsedTimeInTask in settings → see warning
10. Confirm enable → during next task, see quiet elapsed counter (no urgency)

### ✅ PAUSE POINT — End of M22

---

## Milestone 23: Module H — Mindfulness Bar

**Goal:** A persistent bottom-bar tool offering 1-click access to four guided mindfulness exercises (5-4-3-2-1 sensory grounding, three-breath reset, micro body scan, four-step emotional reset). Includes a "Quick Reset" flow for users in distress. System-driven suggestions appear at workflow transitions, decoupled from Biddy. Free for all users.

**Prerequisites:** M14 complete (uses message_encounters for first-time disclosures), M22 complete (Phase 3 work continues)

**Spec references:** `02-design-system.md` §17 (Mindfulness Bar Design); `04-mysql-schema.md` §4.39-4.43 (mindfulness_sessions, exercise library, suggestion log, preferences); `05-monetization-strategy.md` §2.1-2.2 (free for all users rationale)

### Design Notes

Hard rules are encoded structurally:
- **No streak counters or completion percentages** — banned globally, applies here
- **Acute flow goes directly to 5-4-3-2-1** — no menu intermediary (users in distress can't make decisions)
- **Body scan exercises labeled with cautions** — cautious design
- **System suggestions decoupled from Biddy** — Biddy stays a quiet presence, doesn't observe user state
- **Backoff after 3 and 5 dismissals** — prevents nagging

Hard design rules:
- Mindfulness bar persistent on all main app surfaces
- "Quick Reset" button uses fuchsia accent (NEVER red)
- Exit button reachable in 1 tap during all exercises
- Single step on screen at a time (no peeking ahead)

### Tasks

#### 23.1 Schema (already in M1 from doc 04 §4.39-4.43)
```
- mindfulness_sessions table
- mindfulness_suggestion_log table
- users.preferences.mindfulnessEnabled (default TRUE)
- users.preferences.mindfulnessSuggestionsMode (default 'standard')
- users.preferences.mindfulnessFavoriteExercise (nullable)
- users.preferences.mindfulnessPatternsEnabled (default FALSE)
- feature_grant 'mindfulness' for all users
- New message_encounters keys: mindfulness_first_intro, bodyscan_cautions, acute_flow_first_use
```

#### 23.2 Bottom Bar Component
```
Per design system §17.1:

- packages/ui/src/mindfulness/MindfulnessBar.tsx
- Persistent fixed-bottom positioning
- Hides automatically during: focus mode (Walk-Through), Biddy fullscreen, mini-games
- Visible always on: dashboard, settings, routines, all main surfaces
- Layout: [🧘 Reset] [Quick Reset] [last-used dropdown] [⋯]
- Mobile: collapsed to [🧘] [Quick Reset], swipe-up for more
- Safe-area-inset-bottom respected on iOS PWA
```

#### 23.3 Exercise Library Constants
```
- packages/domain/src/mindfulness/exercises.ts
- 4 exercises per doc 04 §4.40
- Each exercise has: key, display_name, description, duration, category, suitable_for_acute, cautions, steps[]
- Step interaction types: count_N, breath, tense_release, reflect
```

#### 23.4 Calm-State Entry (Library Browse)
```
- Click 🧘 Reset → opens popover with all 4 exercise cards
- Card layout: name, description, duration estimate
- Body scan card has ⓘ icon (taps reveals cautions note)
- Click card → opens guided exercise flow
- First-time use: shows mindfulness_first_intro message (once)
```

#### 23.5 Acute "I'm Overwhelmed" Flow
```
- Click "Quick Reset" → bypasses all menus
- First-time: shows acute_flow_first_use message with brief intro message
- Goes DIRECTLY to 5-4-3-2-1 first step
- Modal slides up covering ~60% of viewport (page underneath dimmed)
- Single large "Continue" button at each step
- Exit (✕) always reachable

Critical: this flow has NO branches. Users in acute distress cannot
make decisions. One path, one button, one step at a time.
```

#### 23.6 Guided Exercise UI Component
```
- packages/ui/src/mindfulness/GuidedExercise.tsx
- Reads exercise definition from constants
- Renders one step at a time with prompt + interaction
- Step indicator (small, non-anxious): "Step 1 of 5"
- Gentle progress bar (fills slowly, never urgent-looking)
- Exit (✕) top-right always visible
- Step interaction renderers:
  - count_N: N tappable circles, auto-advance when N tapped or 30s elapsed
  - breath: animated breath circle, auto-advance on timer
  - tense_release: text + 15s timer
  - reflect: text + "Continue" button (appears at 30s of 60s minimum)
```

#### 23.7 Session Lifecycle Endpoints
```
- POST /api/mindfulness/sessions/start
  - Inputs: exercise_key, entry_mode (calm | acute_overwhelmed | system_suggestion), trigger_context
  - Creates mindfulness_sessions row
  - Returns session_id, exercise definition
  
- POST /api/mindfulness/sessions/:id/end
  - Inputs: end_reason (completed | user_exited)
  - Updates ended_at, duration_seconds
  - If session was system_suggestion accepted, links resulting_session_id in mindfulness_suggestion_log

- Auto-end safeguard: cron dispatcher closes any session started >30min ago without ended_at
```

#### 23.8 System Suggestion Engine
```
Per doc 04 §4.41:

Trigger hooks (existing event stream):
- task_completion event → maybe-suggest
- focus_session.ended event with duration > 60min → maybe-suggest
- biddy_sessions.ended event → maybe-suggest
- routine_instances completion → maybe-suggest

Maybe-suggest logic:
- Check user's mindfulnessSuggestionsMode preference (off | limited | standard)
- 'off': never suggest
- 'limited': only on long_focus_end with duration > 90min
- 'standard': all triggers
- Apply backoff: max 1/60min, 3+ dismissals → 1/4hr, 5+ dismissals → silent 24h
- If passes filter: write mindfulness_suggestion_log row, fire toast UI

Toast UI (per design system §17.7):
- Auto-dismiss after 8s (logged as no_response)
- "Yes" → opens user's pinned exercise OR three-breath reset (shortest)
- "Not now" → logs as dismissed, contributes to backoff counter
```

#### 23.9 Settings Page
```
- /settings/mindfulness route
- Toggle: mindfulnessEnabled (default TRUE)
- Radio: suggestionsMode (off | limited | standard)
- Pinned exercise picker (optional)
- Patterns view toggle (default OFF)
- 
```

#### 23.10 Patterns View (Opt-In)
```
- /mindfulness/patterns route, only accessible when mindfulnessPatternsEnabled = true
- Shows: count of completed sessions in last 30 days, by exercise type
- IMPORTANT: acute_overwhelmed sessions EXCLUDED from totals
  (they're tracked but not aggregated into "your habits")
- Framed as completion data: "Completed 12 sessions" not "Missed N"
- No streaks, no rankings, no "trending" indicators
```

### Tests Required

```
Unit:
  - Exercise constants validate against TypeScript schema
  - Step interaction renderers work for all 4 types
  - Backoff logic correctly counts recent dismissals
  - Session auto-end logic identifies orphaned sessions

Integration:
  - Start session → row in mindfulness_sessions
  - Complete session → ended_at set, duration computed
  - User exits → end_reason='user_exited', no shame messaging
  - System suggestion fired → row in mindfulness_suggestion_log
  - User dismisses 3 times → backoff to 1/4hr enforced
  - User dismisses 5 times → silent for 24h
  - Acute entry creates session with entry_mode='acute_overwhelmed'
  - Patterns view excludes acute sessions from totals

E2E:
  - User clicks 🧘 Reset → library popover appears
  - User picks 5-4-3-2-1 → guided flow with 5 steps
  - User exits mid-session → returns to dashboard, no judgment
  - User clicks "Quick Reset" first time → sees brief intro → continues
  - Subsequent uses skip the disclosure
  - User completes long focus → toast appears with suggestion
  - User dismisses 3 toasts in succession → next is delayed 4 hours
```

### Acceptance Criteria

- [ ] Bottom bar persistent on all main app surfaces
- [ ] Bar hides during focus mode, Biddy fullscreen, mini-games
- [ ] All 4 exercises playable: 5-4-3-2-1, breath reset, body scan, RAIN
- [ ] "Quick Reset" button uses fuchsia accent (NOT red)
- [ ] Acute flow skips menus, goes directly to 5-4-3-2-1
- [ ] First "Quick Reset" use shows brief intro (once)
- [ ] Body scan first use shows cautions note
- [ ] No streak counters, no completion percentages anywhere
- [ ] Exit (✕) reachable in 1 tap during all exercises
- [ ] One step on screen at a time (no peeking ahead)
- [ ] System suggestions respect mode preference (off/limited/standard)
- [ ] Backoff after 3 dismissals (4hr cooldown)
- [ ] Silent after 5 dismissals (24hr cooldown)
- [ ] Suggestions decoupled from Biddy (no Biddy involvement in suggestions)
- [ ] Acute sessions excluded from patterns view aggregations
- [ ] Auto-end safeguard closes orphaned sessions after 30min
- [ ] axe-core: 0 violations on all mindfulness pages
- [ ] All tests pass

### Manual Smoke Test (Human)

1. Visit dashboard → see mindfulness bar at bottom
2. Click 🧘 Reset → library popover with 4 exercises
3. Pick "Three-Breath Reset" → 60-second guided flow with breath animation
4. Complete → return to dashboard with neutral close
5. Click "Quick Reset" first time → brief intro appears
6. Continue → goes directly to 5-4-3-2-1 first step
7. Tap 5 circles → auto-advances to next step
8. Click ✕ mid-session → exits cleanly, no judgment messaging
9. Complete a long focus session → see toast suggestion
10. Dismiss 3 toasts in succession → notice 4th doesn't appear for 4+ hours
11. Visit Settings → Mindfulness → set mode to "off"
12. Complete another long session → no suggestion appears
13. Verify in phpMyAdmin: mindfulness_sessions and mindfulness_suggestion_log rows correct

### ✅ PAUSE POINT — End of M23 — End of Phase 3

---

# POST-LAUNCH

## Milestone 18: Monetization (Stripe + Pro Tier)

**Goal:** Free users can upgrade to Pro. Paid users get unlimited quotas and Body Doubling. Legacy migration plan documented and ready.

**Prerequisites:** M17 complete + at least 50 active free users

**Spec references:** `05-monetization-strategy.md` (entire doc)

⚠️ **NOTE: This milestone needs a detailed setup walkthrough before execution.** The current task list is high-level. When you reach this milestone, request a detailed Stripe setup walkthrough similar to those for OpenAI (M7), R2 (M10), and OAuth providers (M2). The walkthrough should cover:
- Stripe account creation and verification
- Products and Prices setup (Monthly, Annual, Lifetime, Pro+)
- Webhook endpoint registration
- Test mode vs Live mode workflow
- Customer Portal configuration
- Tax handling decisions (Stripe Tax vs not)

### Tasks (high-level)
```
- Stripe account, Products, Prices configured
- subscriptions table per spec §6.3 (already in schema from M1)
- Stripe webhook endpoint
- Customer Portal integration
- Quota check expansion: paid users skip checks
- Pro upgrade page with pricing
- Donation page with Supporter badge
- Legacy migration script (do not run yet — script is for future)
- Email templates: legacy notice, payment failed, etc.
```

### Tests
- Webhook handles all 5 event types
- Tier sync from Stripe → DB
- Past-due grace period (3-day soft, 7-day revert)
- Customer Portal flow
- Refund handling (manual)
- Account deletion + active subscription

### Manual Smoke Test (Human)
1. Subscribe via Stripe Test Mode → tier updates
2. Cancel subscription → tier reverts at period end
3. Trigger payment failure → grace period UI
4. Use Customer Portal → manages everything

### Acceptance Criteria

- [ ] All §14 acceptance criteria from 05-monetization-strategy.md met

---

# Cross-Cutting Concerns

## Documentation Updates
After every milestone:
- Update README.md with current capabilities
- Add ADR (Architecture Decision Record) for significant choices
- Update API reference if new endpoints added

## Database Migrations
- Every schema change = a new migration file
- Migrations are forward-only (no rollback in v1)
- Test migrations on staging copy before production
- phpMyAdmin for inspection, never for direct schema edits

## Branch Strategy
```
main           ← production
develop        ← integration
feature/M{n}-* ← per-milestone work
hotfix/*       ← critical production fixes
```

## Code Review (When Human + AI Collaborate)
- Claude Code submits PRs to `develop`
- Human reviews + tests on Vercel preview deploy
- Merge after acceptance criteria met
- `develop` → `main` only after milestone passes manual smoke test

## When To Ask The Human

Claude Code should pause and ask the human when:
- A spec doc is ambiguous on an implementation choice
- An external service (Stripe, OpenAI) needs credentials
- A migration would touch production data
- Tests fail in ways that suggest spec changes needed
- A milestone's acceptance criteria can't be fully met as written
- A pause point is reached
