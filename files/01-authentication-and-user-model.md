# Focus Forge — Authentication & User Model Specification

**Status:** Draft v1.0
**Owners:** Focus Forge Project
**Stack:** Next.js (App Router) on cPanel Node + MySQL

---

## 1. Guiding Principles (Round-Table)

| Concern | Principle |
|---|---|
| **User experience** | Auth must never shame the user. No "wrong password" red text. No "account locked" panic states. Recovery flows must feel like help, not punishment. |
| **Visual design** | Single-column auth flows. One decision per screen. Literal labels ("Sign in with email" — not just an icon). Dark-mode default applies even on the login screen. |
| **Friction reduction** | Lowest possible friction at signup. Users with ADHD often abandon multi-step forms. The first 60 seconds of the app are make-or-break. |
| **Error handling** | Every error path must have a recovery action. No dead ends. Account state must be recoverable without contacting support. |
| **Data integrity** | The "Legacy Free" status is a long-term commitment — once granted, never revoked. This must be enforced at the data layer, not just policy. |
| **Speed** | Magic-link emails should arrive within 5 seconds or the flow feels broken. Either deliver fast or the user gives up. |

---

## 2. Authentication Methods

Three methods supported in v1. User picks one at signup; can link additional methods later from account settings.

**Apple Sign-In deferred** to post-launch (requires Apple Developer Program subscription).

### 2.1 Email + Password
- Primary, always available
- Password requirements: min 10 chars, no other rules (NIST 800-63B guidance — complexity rules backfire on ADHD users)
- Hashed with **argon2id** (preferred) or **bcrypt** (cost factor 12 minimum)
- Never logged, never displayed, never emailed

### 2.2 OAuth — Google, Facebook
- Implemented via **NextAuth.js v4** (stable, well-supported, reliable code patterns for Claude Code)
- OAuth flows redirect to provider, return with verified email
- If email matches an existing account, prompt user to link (never silently merge)
- **Apple Sign-In is intentionally NOT included in v1** — requires Apple Developer Program ($99/yr). Documented as future work.
- Migration path to v5 documented separately — wait until v5 stable release

### 2.3 Magic Link
- User enters email → server emails a single-use link valid for 15 minutes
- Link contains a signed token (JWT or random 256-bit token stored in DB)
- After click, user is logged in and asked: "Set a password for next time?" (skippable)

### 2.4 Method Linking
- Logged-in users can add/remove methods from `/account/security`
- Cannot remove the **last** authentication method (would lock account)
- Email change requires re-verification

### 2.5 Display Name Fallback Strategy

Display name is never required at signup, but the UI needs *something* to address the user. Resolution order at display time:

1. **`users.display_name`** if set explicitly by user
2. **OAuth-provided name** captured in `auth_methods.metadata.name_at_provider` (if user signed up via Google/Facebook)
3. **Email local part, capitalized** — `alex@gmail.com` → "Alex"
4. **"you"** as final fallback

This is implemented as a single utility function `getUserAddressName(user)` used everywhere the UI greets the user. The user can override at any time from settings.

For possessive grammar ("your tasks" not "you's tasks"), the UI always uses "your" — never templates the display name into possessive form.

---

## 3. Session Management

### 3.1 Session Strategy
- **HTTP-only, Secure, SameSite=Lax cookies** containing a session ID
- Session record stored in MySQL `sessions` table (NOT JWT — server must be able to revoke)
- Session lifetime: **30 days** sliding window (refreshed on activity)
- "Remember me" is **always on** — ADHD users hate re-logging in

### 3.2 Session Revocation
- Logout: deletes the session row
- "Sign out all devices" button in security settings: deletes all sessions for that user
- Password change: revokes all sessions except current

### 3.3 CSRF Protection
- Next.js Server Actions provide built-in CSRF protection
- For custom API routes: double-submit cookie pattern

---

## 4. User Account States

The state machine has expanded to support granular moderator/admin actions.

```
┌─────────────────┐
│  unverified     │  Just signed up, email not confirmed
└────────┬────────┘
         │ clicks email confirmation link
         ▼
┌─────────────────┐
│  active         │  Normal state
└────────┬────────┘
         │
         ├─── user self-deletes ────────→ pending_delete
         │
         ├─── moderator pauses ─────────→ paused
         │     (read-only, time-bound, lighter touch)
         │
         ├─── admin suspends ───────────→ suspended
         │     (login blocked, indefinite, manual reverse only)
         │
         ├─── admin soft-deletes ───────→ pending_delete
         │     (30-day grace, default — admin can override)
         │
         └─── super-admin emergency ───→ deleted
               (rare; legal compliance only; logged with justification)

┌─────────────────┐
│  paused         │  Moderator action
└────────┬────────┘
         │
         ├─── auto-expires after N days ──→ active
         ├─── moderator unpauses ────────→ active
         ├─── moderator extends ─────────→ paused (new expiry)
         └─── admin escalates ───────────→ suspended

┌─────────────────┐
│  suspended      │  Admin action, indefinite
└────────┬────────┘
         │
         ├─── admin reactivates ────────→ active
         ├─── admin soft-deletes ───────→ pending_delete
         └─── user appeals (offline) ───→ admin reactivates if approved

┌─────────────────┐
│  pending_delete │  30-day grace period (default)
└────────┬────────┘
         │
         ├─── user cancels (signin or email link) → active
         ├─── admin cancels (with reason) ────────→ active
         └─── 30 days pass ───────────────────────→ deleted

┌─────────────────┐
│  deleted        │  Hard-deleted, anonymized, email released
└─────────────────┘
```

### 4.1 State Definitions

| State | Set By | User Can Sign In? | User Can Use Features? | Reversible? |
|---|---|---|---|---|
| `unverified` | System (signup) | Yes | Yes (limited; some features need verified email) | Auto on email confirm |
| `active` | System / admin | Yes | Yes | N/A (normal state) |
| `paused` | Moderator | Yes (read-only mode) | Read-only — can view but not create/modify | Yes, automatic + manual |
| `suspended` | Admin | No | No | Yes, manual only |
| `pending_delete` | User OR Admin | Yes (sees "your account is scheduled for deletion") | Yes (existing data accessible) | Yes, by user OR admin within 30 days |
| `deleted` | System (after grace) OR Super-admin (emergency) | No | No | **No** (data hard-deleted) |

### 4.2 The `paused` State — Moderator Action

Designed to be the *lighter touch* compared to suspension.

- User can sign in and view their data
- Cannot create new content (tasks, memos, routines, etc.)
- Cannot modify existing content
- Sees a clear banner: "Your account is paused. [Reason from moderator] [Appeal email link]"
- Has an `expires_at` timestamp — the cron dispatcher auto-restores to `active` when it passes
- Moderator can extend (push expires_at) or unpause (clear expires_at, set state to active)
- If pause expires while user is offline, they sign in to a soft "Welcome back. Your account is no longer paused." message

**Why this exists:** Sometimes a user needs a "cool-off" period (e.g., heated argument in feedback comments — wait, those don't exist yet, but if we add them) without the heavier weight of indefinite suspension.

### 4.3 The `suspended` State — Admin Action

The heavier intervention, used for clear ToS violations.

- User cannot sign in at all
- Sign-in attempt shows: "Your account is suspended. [Reason] [Appeal email link]"
- No automatic expiration — must be reversed manually by admin
- All user data preserved
- User can email support to appeal; admin reviews and either reactivates or escalates to deletion

### 4.4 Admin-Initiated Soft Delete

Admin can place an account in `pending_delete` state with the SAME 30-day grace period as user-initiated deletion.

- Default behavior: 30-day grace period
- Admin can override to immediate `deleted` state with explicit justification (super-admin permission required)
- User receives email with appeal link
- During grace period, user can sign in and self-recover (cancels deletion)
- Admin who initiated can also cancel during grace

### 4.5 Super-Admin Emergency Delete

Reserved for genuinely emergency situations:
- Court order / subpoena
- DMCA takedown of user-uploaded content (note: we don't host much user-generated content publicly, but praise audio could theoretically be DMCA-flagged)
- Formal GDPR Article 17 right-to-erasure request
- Child safety / illegal content discovered
- Other legal compliance requirements

**Process:**
- Requires `admin_user_emergency_delete` permission (granted only to project owner initially)
- Justification text REQUIRED (logged in `admin_actions` audit table)
- Email sent to user (if possible) explaining the action
- All data hard-deleted immediately
- No grace period

**Why this exists separately:** Legal compliance sometimes requires immediate action that the 30-day grace period would prevent. Keeping this as a distinct capability with the highest permission requirement makes it intentional rather than accidental.

### 4.6 Soft-Track Protocol Applied To All States

- `pending_delete` users see a soft "Welcome back — want to keep your account?" screen
- `paused` and `suspended` users see empathetic explanations with reasons and appeal paths, never sterile error messages
- No account state is ever called "failed," "expired," "invalid," or "rejected"
- Even users in `suspended` state are told WHY and HOW to appeal — basic dignity

### 4.7 Audit Trail

**Every** state transition is logged in two places:
1. `audit_log` table (existing) — for the user's audit history
2. `admin_actions` table (new — see Doc 04) — when an admin/moderator caused the transition

The `admin_actions` log contains:
- Admin user ID
- Target user ID
- Action taken (pause, suspend, soft_delete, emergency_delete, etc.)
- Justification text (REQUIRED for all non-trivial actions)
- IP address of admin
- Timestamp

This dual logging means the user can always see what happened to them, AND we have a separate admin accountability trail.

---

## 5. Plan Tier & Legacy User Model

This is the most important piece for your future paid model. **Important rule: this be enforced at the data layer.**

### 5.1 Tier Definitions

| Tier | Description |
|---|---|
| `free` | Current free user — gets all features available at signup time |
| `legacy_free` | Granted automatically when paid model launches; preserves all features they had access to |
| `comp` | **Admin-granted complimentary access.** Behaves like `paid` but with no Stripe subscription. Used for: friends, family, beta testers, hardship grants, vocal advocates. |
| `paid` | Future paid tier |
| `paid_lifetime` | Reserved for future use (e.g., one-time purchase) |

### 5.1.1 Comp Tier Mechanics

Admins with `admin_user_management` permission can grant Comp tier in two ways:

**Quick comp (whole-tier grant):**
- Sets `users.tier = 'comp'`
- User immediately has Pro-equivalent access to everything
- Recorded in `admin_actions` audit log
- Can include an optional `comp_expires_at` (admin sets duration; null = permanent)
- The cron dispatcher auto-reverts expired comps to their previous tier (default `free`, or `legacy_free` if they had been one)

**Granular grants (specific features):**
- User stays at their current tier (e.g., `free`)
- Specific `feature_grants` rows are added by admin
- E.g., admin grants ONLY `voice_dump_unlimited` to a power user without giving them everything
- More flexible but more clicks

**User-facing presentation:**
- Comp users see "Comp Pro" or "Complimentary access" in their account UI
- They are NOT shown as "Pro" — honest framing matters
- A small thank-you message acknowledges their role: "Your access is provided as a courtesy."

### 5.2 Feature Access Logic

Instead of checking `user.tier == 'paid'` everywhere (brittle), we check:

```sql
-- Each user has a "feature_grant_set" — a snapshot of which features they have access to
-- New features added AFTER paid launch are gated by tier check
-- Features that existed BEFORE paid launch remain accessible to legacy_free users
```

**Implementation:** `feature_grants` table records WHICH features a user has access to and WHEN they were granted. When the paid model launches:

1. Run a migration that grants every `free` user access to every feature that currently exists
2. Convert their tier to `legacy_free`
3. New features added after launch check `tier IN ('paid', 'paid_lifetime', 'comp')` OR `feature_grants` contains the feature

`comp` users behave like `paid` users for feature gating purposes. They get Pro-tier access without the Stripe subscription.

This makes the legacy commitment **mechanically irrevocable** — even a future developer who doesn't know the policy can't accidentally lock out legacy users.

### 5.3 Grandfathering at Account Reactivation
- A `legacy_free` user who deletes their account and signs up again with the same email **does NOT get legacy status back**
- This is documented in the deletion confirmation: "If you sign up again later, you'll start as a regular user."

---

## 6. Sign-Up Flow (Onboarding Entry)

Detailed onboarding lives in `03-onboarding-flow.md`. Auth-specific steps:

```
Landing page
    │
    ▼
"Get Started" (one button, large, literal label)
    │
    ▼
Single screen with THREE auth options stacked:
  ┌─────────────────────────────────┐
  │  [G] Continue with Google       │
  ├─────────────────────────────────┤
  │  [f] Continue with Facebook     │
  ├─────────────────────────────────┤
  │  ✉  Continue with Email         │
  └─────────────────────────────────┘
    │
    ▼
(If email selected)
  Single field: "Your email"
  Single button: "Send me a magic link"
  Below: small text link: "I'd rather use a password"
    │
    ▼
(Magic link sent OR password screen)
    │
    ▼
First-run experience (separate doc)
```

**Critical UX rules:**
- No "Sign Up" vs "Sign In" distinction. The flow handles both seamlessly.
- New email → creates account. Existing email → signs in. User doesn't have to know which mode they're in.
- No CAPTCHA on first attempt. Add adaptive challenge only after suspicious activity.

---

## 7. Password Reset Flow

```
"Forgot password?" link on email/password screen
    │
    ▼
"Enter your email" — single field
    │
    ▼
"If an account exists, we sent a link" (always show this — don't leak account existence)
    │
    ▼
User clicks link in email (valid 60 minutes, single-use)
    │
    ▼
"Choose a new password" — single field, with show/hide toggle
    │
    ▼
Auto-logged-in, sessions on other devices revoked
    │
    ▼
Land on dashboard, with subtle confirmation: "Password updated."
```

**Note:** The phrase is "Reset password" — never "Recover account." Recovery implies something was lost. Reset implies a normal action.

---

## 8. Email Verification

- Required before access to features that send communications (Praise Repository invitations, body doubling)
- NOT required for basic task management — let new users get to value immediately
- Verification email includes a 6-digit code AND a click-link (some users prefer to type)
- Banner at top of dashboard: "Verify your email to unlock the Praise Repository →" (not a blocking modal)

---

## 9. Account Deletion

```
Settings → Account → Delete account
    │
    ▼
Soft confirmation: "We'll keep your data for 30 days in case you change your mind."
[Cancel] [Continue]
    │
    ▼
Final confirmation: "Type DELETE to confirm"
[Cancel] [Delete account]
    │
    ▼
Account → pending_delete state
Email sent: "Your account will be deleted on [date]. Click here to cancel."
    │
    ▼
30 days pass with no cancel
    │
    ▼
Hard delete:
  - User row anonymized (email → null, name → "Deleted user")
  - All tasks, voice dumps, praise memos hard-deleted
  - Audio files removed from disk
  - Sessions revoked
  - Email address released for re-registration
```

**Why 30-day grace period:** ADHD users impulsively delete things and regret it. The grace period is a Soft-Track Protocol applied to account state.

---

## 10. Trusted Contacts (Praise Repository Whitelist)

Praise Repository works only with senders the user has explicitly invited. This is a separate concept from "user accounts" but related.

### 10.1 Trusted Contact Model
- User generates a unique invite link from `/account/praise-senders`
- Link contains a signed token tied to the user's praise inbox
- Sender clicks link → can record up to 3 voice memos within the next 7 days
- After 7 days OR 3 memos, link expires
- User can revoke a sender at any time, deleting their memos

### 10.2 Sender Identity & Display Name Flow

The display name shown on a praise memo is determined as follows, resolving the earlier ambiguity:

1. **Recipient sets a default name** when creating the invite link (e.g., "Mom", "Sarah from work")
2. **Sender can confirm or correct** this when they record their first memo
3. **Recipient's name takes precedence** if there's a conflict — the user knows who they invited

Why this order: the recipient might invite "Mom" but Mom enters "Patricia Anderson" — neither is wrong, but the recipient's framing ("Mom") is what helps them emotionally during an intense moments. The recipient's framing wins.

Other sender privacy rules:
- Senders DO NOT need to create accounts on Focus Forge
- Senders' email is NOT collected (privacy-by-default)
- Senders' IP is NOT logged with the memo (only briefly for rate-limit abuse detection, then discarded after 24h)
- Senders are anonymous to other Focus Forge users; only the recipient knows they exist

---

## 11. Data Privacy & Compliance

### 11.1 Personal Data Stored
| Field | Purpose | Retention |
|---|---|---|
| Email | Auth, communications | Until account deletion + 30 days |
| Display name | UI personalization | Same |
| Hashed password | Auth | Same |
| OAuth provider IDs | Auth | Same |
| IP address (last login) | Security audit | 90 days rolling |
| Session tokens | Session management | Until logout or 30-day expiry |

### 11.2 Voice & Audio Data
- **Voice Dumps**: audio uploaded → transcribed → audio deleted within 60 seconds. Only transcript retained.
- **Praise audio**: retained as long as the user wants it. Stored on cPanel disk in a non-public directory; served via signed URLs valid for 1 hour.

### 11.3 GDPR / CCPA Compliance
- **Right to access**: `/account/data-export` generates a JSON download of all user data within 24 hours
- **Right to deletion**: handled by the deletion flow above
- **Right to rectification**: editable from `/account`
- **Privacy policy** required at `/privacy`
- **Cookie banner**: only required if we add analytics. For v1, use no third-party analytics → no banner needed.

### 11.4 What We Explicitly DO NOT Store
- Health information (the Voice Dump may *contain* it incidentally; the user is informed)
- Medication data (no field for it)
- Diagnostic data
- Geolocation
- Biometric data

---

## 12. Security Hardening Checklist

| Item | Implementation |
|---|---|
| Password hashing | argon2id with sane defaults |
| Brute-force protection | Rate limit: 5 failed logins per email per 15min, IP-based fallback |
| Session fixation | Regenerate session ID on login |
| HTTPS | Required (cPanel host must have valid cert; Let's Encrypt via cPanel UI) |
| Cookie flags | HttpOnly, Secure, SameSite=Lax |
| HSTS header | `max-age=31536000; includeSubDomains` |
| CSP header | Strict policy, no inline scripts (Next.js can do this) |
| Email enumeration | Generic responses on signup/reset to avoid leaking account existence |
| OAuth state param | Validated on every OAuth callback |
| Magic-link tokens | 256-bit random, single-use, 15-minute expiry, hashed in DB |
| Audit log | Every login, password change, email change, deletion → `audit_log` table |

---

## 13. Open Questions for Phase 2

These are deliberately deferred — flagging them for visibility:

- **2FA / TOTP**: Recommended for paid tier. Not blocking v1.
- **Passkey support (WebAuthn)**: Modern, ADHD-friendly, no passwords. Add when stable.
- **Email provider**: Resend, Postmark, or AWS SES? Decision needed before launch (SES is cheapest if comfortable with AWS).
- **OAuth app registration**: Need developer accounts at Google Cloud Console and Facebook for Developers. Both free.
- **Apple Sign-In**: Deferred to post-launch. Requires Apple Developer Program ($99/yr). Document as TODO when paid tier launches.

---

## 14. Acceptance Criteria

The auth system is "done" when:

- [ ] User can sign up with email+password, log in, log out
- [ ] User can sign up via Google and Facebook OAuth
- [ ] User can request a magic link and authenticate via email
- [ ] User can link additional auth methods to an existing account
- [ ] Password reset works end-to-end with no dead ends
- [ ] Email verification flow works without blocking core features
- [ ] Account deletion works with 30-day grace period and reversal
- [ ] Sessions survive 30 days of activity, expire after 30 days of inactivity
- [ ] Logout-everywhere works
- [ ] No red text appears anywhere in the auth flow
- [ ] All error states have a recovery action
- [ ] Trusted-contact invite links work for non-account-holders
- [ ] Data export produces a valid JSON file
- [ ] All forms work with keyboard-only navigation
- [ ] All forms work with screen readers (axe-core: 0 violations)
