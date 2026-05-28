# Focus Forge — Monetization Strategy Specification

**Status:** Draft v1.0
**Owners:** Focus Forge Project
**Architecture:** Vercel (web app) + cPanel MySQL + Stripe (future)

---

## 1. Philosophy (Round-Table)

| Concern | Principle |
|---|---|
| **Free-tier ethics** | Paywalling distress-prevention features is the wrong choice. The Praise Repository must always have a meaningful free floor — users in intense moments shouldn't be told "upgrade to feel better." |
| **Free baseline** | Core accessibility features (timers, scaffolding, Soft-Track Protocol) are the foundation — these stay free indefinitely. |
| **Free-tier completeness** | The free tier must deliver complete reward loops on its own. Paid features expand the loops; they don't gate access to them. |
| **Fail-open** | Every feature gate must fail open if the gating logic itself fails. A user should never lose access to features they're paying for due to a bug. |
| **Soft prompting** | Upgrade prompts must be contextual, never blocking. No "you have used 9/10 voice dumps today" panic states. Soft, factual: "Voice Dump (1 left today)". |
| **Reset timing** | Quotas should reset at user-friendly local times. Reset at midnight UTC when a user is in California (4pm) creates confusing artificial urgency. (Reconciled in §4.1: global 04:00 UTC reset displayed in user's local time.) |

---

## 2. Final Tier Definitions

### 2.1 Free Tier

**Forever free. No expiration. No "trial period" framing.**

| Feature | Free Tier Allowance |
|---|---|
| Task management & dashboard | Unlimited |
| Soft-Track Protocol (defer, no shame states) | Unlimited |
| Analog Timer + Sound Families | Unlimited |
| Reverse Scheduler / Doorknob | Unlimited |
| Launchpad | Unlimited |
| Body Check-Ins | Unlimited |
| Badges & gamification | Unlimited |
| **Routines (recurring schedules)** | **Unlimited routines, unlimited templates** |
| **Task Templates** | **Unlimited** |
| **Completion Patterns view** | **Free, opt-in (default off)** |
| **Bug & Feature Request submissions** | **Unlimited** |
| **Voting on feedback items** | **Unlimited** |
| **Mini-games (Pattern Match, Reaction Tiles, Word Builder)** | **Unlimited** (within cooldown rules) |
| **Movement prompts & 10-3 rule integration** | **Unlimited** |
| **Quest Log mode (gamification UI)** | **Free** (opt-in) |
| **Speed Run challenges** | **Free** (opt-in) |
| **Biddy (AI Body Double Companion)** | **Free** (4-hour daily cap; core accessibility feature) |
| **Time estimation entry (manual ETC)** | **Free** (basic Module G) |
| **Time-Bender bonus badges** | **Free** (gamification reward) |
| **AI ETC suggestions** | ❌ Pro only — see below |
| **Mindfulness Bar (5-4-3-2-1, breath, body scan, RAIN)** | **Free** (core accessibility feature) |
| **"Quick Reset" flow** | **Free** (always available) |
| **System mindfulness suggestions** | **Free** (configurable) |
| **Anti-shame language modes (4 settings)** | **Free, all modes available** |
| Voice Dump (audio + AI parsing) | **10 per day** |
| AI task breakdown ("Walk Me Through It" with AI scaffolding) | **5 per day** |
| AI decision support ("Help Me Decide") | **3 per day** |
| Praise Repository — receive memos | **3 active memos** (sender side unlimited; user can rotate) |
| Praise Repository — plays per day | **15 plays per day total** (any combination of memos) |
| Praise Repository — AI transcription | ❌ Audio plays without transcript |
| Trusted Contacts | **5 contacts** |
| Body Doubling (video) | ❌ |
| Cross-device sync | **2 devices** (covers Point of Performance: phone + laptop) |
| Data export (GDPR) | Unlimited |
| Audio storage (praise memos) | Stored as long as memo is active |
| **AI routine adjustment suggestions** | ❌ Pro only — see below |

### 2.2 Pro Tier (Paid)

| Feature | Pro Tier Allowance |
|---|---|
| All free features | Unlimited |
| Voice Dump | Unlimited |
| AI task breakdown | Unlimited |
| AI decision support | Unlimited |
| Praise Repository | Unlimited memos, **30 plays per day total** |
| Praise Repository — AI transcription | Included |
| Trusted Contacts | Unlimited |
| Body Doubling (video) | ✅ Included (Jitsi-powered) |
| Cross-device sync | Unlimited devices |
| **AI routine adjustment suggestions** | ✅ Personalized AI-generated suggestions for routine optimization |
| **AI ETC suggestions** | ✅ AI-suggested time estimates based on your task history |

#### Why Pro Has A Praise Play Cap

Even paid users are capped at 30 plays/day on praise memos. This is **not a cost-saving measure** — it's a usage safeguard we insisted on.

The Praise Repository is genuinely powerful for recovery from distress, but unlimited replay of validation can substitute for the work of internalizing self-worth. A 30/day cap is enormously generous for healthy use (listening to multiple memos several times during a hard day) while preventing what would functionally be an addiction loop.

When a Pro user hits the cap, the message is **never** "you're using this too much." Instead:

> *"Take a breath. Come back tomorrow if you still need to listen. Your memos will be here."*

Soft, neutral, caring. No shame, no warning, no implication that the user is doing something wrong.

#### Why Routines Are Free But AI Suggestions Are Pro

There was a clear consensus on this split:

**Routines are free forever** because they are a **core accessibility feature**. ADHD users desperately need scaffolding for daily structure; making them pay for that would violate the disability-rights framing we insisted on at project start.

**AI-generated routine adjustment suggestions are Pro** because they're an *enhancement* — not an accommodation. The basic feature (creating routines, seeing completion data) works without AI. AI adds value, and AI costs us money per call.

What free users see in Patterns view (opt-in):
> *"Mondays: 2 of 4 completed (50%)"*
> *"Wednesdays: 4 of 4 completed (100%)"*

What Pro users see in Patterns view:
> *"Mondays seem hard for the 8am Job Hunt block. The pattern suggests you might do better starting at 10am — would you like to try that?"*

The free version delivers the data. The paid version delivers the insight.

### 2.3 Legacy Free Tier

**The ethical commitment.**

When the paid tier launches, every existing free user is automatically converted to `legacy_free`. They keep:

- Everything they had access to **at the moment of conversion**
- All quotas, all features, no changes

What `legacy_free` users do NOT get:

- Features added after the paid-tier launch (those gate to `paid` only)
- Increased quotas if Pro quotas grow

**See `04-mysql-schema.md` §4.7 for the structural enforcement of this commitment via the `feature_grants` table.**

#### Why Mini-Games & Movement Prompts Are Free

Mirroring the routines decision: mini-games and movement integration are **core accessibility features**, not enhancements.

- **Mini-games address the dopamine deficit** that prevents task initiation. Per the therapeutic elements doc, this is a documented neurochemical reality of the ADHD brain. Putting it behind a paywall would be putting *the accommodation* behind a paywall.
- **Movement prompts address the willpower depletion** that exercise replenishes (Barkley's "willpower tank" model). Same reasoning.
- **The reasoning:** charging for these would be saying "your dopamine is a premium feature." That's wrong on its face.

Pro tier doesn't get *more* mini-games or *more* movement prompts. Both tiers get the same core feature toolkit. Pro tier earns its keep through power-user features (unlimited voice dump, body doubling video, AI suggestions) — not by gating core accessibility features.

#### Why Biddy Is Free For All Users

Biddy specifically addresses **social anxiety and isolation** — barriers that prevent ADHD users from accessing traditional body doubling. The reasoning: "If a user can't bring themselves to join a video call with strangers, they don't need MORE friction in the form of a paywall to get help with parallel-play presence."

The clinical population this serves most powerfully is users who:
- Have severe social anxiety alongside ADHD
- Are awake at 3am unable to start tasks
- Don't have human accountability partners available

Charging these users would be charging the most isolated for the help they most need. Unconscionable.

**The daily cap is a safeguard, not a paywall.** Even Pro users have the cap, because the clinical concern is parasocial dependence — a concern that doesn't change at higher payment tiers.

#### Why Module G Is Free (With Pro AI Suggestions)

Time blindness is one of the most documented and disabling features of ADHD. The basic ETC tracking, badges, and time-bender bonuses cost us nothing (it's just metadata on tasks). All free.

**AI ETC suggestions are Pro-only**, consistent with our `ai_routine_suggestions` pattern:
- Basic ETC entry (typing your own estimate) is free for all users — this is the core accommodation
- AI suggesting estimates based on your historical data is the *enhancement* — Pro tier
- Free users can still calibrate themselves manually; AI just makes it easier

Design principle: charge for AI work, not for accommodation. Free users get the full clinical benefit; Pro users get personalized AI assistance.

#### Why Module H (Mindfulness) Is Free For All Users

Mindfulness exercises specifically adapted for ADHD — and crisis-state grounding tools — are **mental health support**, not productivity enhancement. There was a clear consensus on this:

- The "Quick Reset" flow is a safety feature. Putting it behind a paywall would be unconscionable — exactly the user who needs it most might not have Pro.
- The full exercise library (5-4-3-2-1, breath reset, body scan, RAIN) is part of the core feature toolkit.
- System suggestions at workflow transitions are habit-stacking infrastructure — also free.

Pro tier doesn't get *more* exercises or *better* mindfulness tools. Both tiers get identical mindfulness capability. Pro tier earns its keep through power-user features (unlimited voice dump, body doubling video, AI suggestions) — not by gating mental health tools.

**The reasoning:** "Anyone who has ever experienced an intense moments and needed a way out knows: this isn't optional. It's required infrastructure."

### 2.4 Comp Tier (Admin-Granted Complimentary Access)

**Use cases:** friends and family, beta testers, hardship grants, vocal advocates, employees, accessibility advocates whose feedback shapes the product.

Admins with `admin_user_management` permission can grant Comp tier in two ways. The choice is per-user, made by the admin:

#### Option A: Quick Comp (whole-tier grant)

- One click in admin UI sets `users.tier = 'comp'`
- User gets Pro-equivalent access to everything immediately
- Optional `comp_expires_at` (admin sets duration, or null for permanent)
- When comp expires, hourly cron reverts user to `comp_previous_tier` (the tier they had before; default `free` or `legacy_free`)
- Recorded in `admin_actions` with full justification

**Best for:** "Give my mom Pro access," "Give all our beta testers Pro for 90 days"

#### Option B: Granular Grants (specific features only)

- User stays at their current tier (e.g., `free`)
- Admin adds specific `feature_grants` rows for individual capabilities
- E.g., grant ONLY `voice_dump_unlimited` to a power user

**Best for:** "Give this researcher unlimited voice dumps for their study," "This user contributed valuable feedback — give them transcription specifically"

#### User-Facing Presentation

Comp users see "Complimentary access" in their account UI — NOT shown as "Pro." Honest framing matters. A small thank-you message acknowledges their role: *"Your access is provided as a courtesy. Thank you."*

#### Comp Tier Tax Implications (Stripe, Future)

Since Comp users have no Stripe subscription, no payment processing happens. There are NO tax implications for the user (it's not income; it's free product access). The cost to the business is the marginal cost of serving the user (AI calls, storage) — same as a free user, just with the Pro feature set unlocked.

---

## 3. Pricing (Initial Recommendations)

Our recommendation, based on cost analysis from prior round-tables:

| Plan | Price | Justification |
|---|---|---|
| Free | $0 | Always |
| Pro Monthly | **$7/month** | Covers ~2x AI cost ceiling, video infrastructure, hosting margin |
| Pro Annual | **$60/year** ($5/mo equivalent) | 28% discount — encourages commitment |
| Pro Lifetime | **$120 one-time** | Reserved for early-supporter promotion only; revisit after first 6 months |
| Donation (free users) | $1, $5, $10, custom | Via Stripe one-time payment; gets a "Supporter" badge but no Pro features |

### 3.1 Why $7 / $60

Cost per heavy paid user per month:

- **AI (Whisper + GPT-4o-mini):** ~$3
- **Cloudflare R2 storage + egress:** ~$0.05 (R2 has no egress fees — major win)
- **Vercel hosting allocation:** ~$0.20 per user as we scale
- **Body doubling video (Jitsi Public Instance):** **$0** — Jitsi runs the infrastructure
- **Stripe fees:** 2.9% + $0.30 per transaction (~$0.50 on a $7 charge)
- **Email (Resend free tier):** $0 up to 3,000/month
- **Total cost:** ~$3.75 per heavy user
- **Margin for support, your time, and unexpected costs:** ~$3.25

This is honest pricing, not "what the market will bear." Our perspective: ADHD users are routinely overcharged for productivity tools they don't use. A fair price builds trust.

The economics are favorable largely because Jitsi (free) and R2 (no egress fees) eliminate two of the three biggest cost categories.

### 3.2 Pricing Posture

- **Never "sale" pricing.** No fake discounts, no "limited time offers." users sensitive to perceived rejection feel manipulated by FOMO marketing.
- **Annual savings shown plainly:** "$5/month if billed yearly" — factual, not pressure.
- **No "free trial of Pro."** Either someone signs up free (and stays free) or they sign up Pro intentionally. Free trials cause distress when they end.

---

## 4. Quota Enforcement Logic

### 4.1 The Quota Window — Global 04:00 UTC Reset

All quotas reset at **04:00 UTC** for every user globally. The UI displays the next reset time in the user's local timezone so it's still meaningful to them.

**Examples:**

| User location | Timezone | Reset displays as |
|---|---|---|
| San Diego, CA | UTC-8 (PST) | "Resets at 8:00 PM your time" |
| New York, NY | UTC-5 (EST) | "Resets at 11:00 PM your time" |
| London, UK | UTC+0 | "Resets at 4:00 AM your time" |
| Tokyo, JP | UTC+9 | "Resets at 1:00 PM your time" |

**Why global UTC reset:**
- Vastly simpler implementation (no per-user-timezone math at write time)
- One predictable reset time worldwide
- Eliminates the need for any cron job
- The UI does the timezone math at display time only — cheap and clear

**Why this is fine for UX:**
- A user in San Diego using voice dump at 7:50 PM might be surprised when at 8:00 PM their counter resets
- But the UI explicitly shows "Resets at 8:00 PM your time" — it's predictable, not magical
- The our earlier concern about midnight UTC being bad for US users is mitigated because we never *show* UTC to users

### 4.2 Quota Counters Storage

The `quota_usage` table is defined in `04-mysql-schema.md` §4.17 — that is the single source of truth. Brief recap:

- Column `usage_date_utc` represents the UTC date the usage counts toward
- A "quota day" rolls over at 04:00 UTC, computed as `(NOW() - INTERVAL 4 HOUR)::DATE`
- New rows created on first request after rollover (no cron needed)

### 4.3 Quota Check Code Pattern

```typescript
// packages/domain/src/quotas/check-quota.ts
import { addHours, startOfDay } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

export interface QuotaCheck {
  allowed: boolean;
  used: number;
  limit: number | 'unlimited';
  resetsAtUtc: Date;
  resetsAtUserLocalDisplay: string;  // e.g., "8:00 PM your time"
}

export type QuotaKey =
  | 'voice_dump'
  | 'ai_breakdown'
  | 'ai_decision'
  | 'praise_play';

export async function checkQuota(
  userId: string,
  quotaKey: QuotaKey,
): Promise<QuotaCheck> {
  const user = await getUser(userId);
  const limits = getLimitsForTier(user.tier);

  const limit = limits[quotaKey];

  // Calculate the current "quota day" — UTC date offset by 4 hours
  const now = new Date();
  const quotaDay = startOfDay(addHours(now, -4));

  // Find next reset
  const nextResetUtc = addHours(quotaDay, 28);  // 24h + 4h = next 04:00 UTC
  const userTz = user.preferences?.timeZone ?? 'UTC';
  const localResetTime = utcToZonedTime(nextResetUtc, userTz);
  const localDisplay = formatLocalReset(localResetTime);  // "8:00 PM your time"

  if (limit === 'unlimited') {
    return {
      allowed: true,
      used: 0,
      limit: 'unlimited',
      resetsAtUtc: nextResetUtc,
      resetsAtUserLocalDisplay: localDisplay,
    };
  }

  const usage = await prisma.quotaUsage.findUnique({
    where: {
      user_id_quota_key_usage_date_utc: {
        user_id: userId,
        quota_key: quotaKey,
        usage_date_utc: quotaDay,
      },
    },
  });

  const used = usage?.count ?? 0;
  return {
    allowed: used < limit,
    used,
    limit,
    resetsAtUtc: nextResetUtc,
    resetsAtUserLocalDisplay: localDisplay,
  };
}
```

### 4.4 Atomic Quota Increment

When a feature consumes a quota, increment atomically (Prisma + raw SQL because Prisma doesn't expose UPSERT well):

```typescript
// In a Prisma transaction
await prisma.$executeRaw`
  INSERT INTO quota_usage (id, user_id, quota_key, usage_date_utc, count)
  VALUES (${cuid()}, ${userId}, ${quotaKey}, ${quotaDay}, 1)
  ON DUPLICATE KEY UPDATE count = count + 1
`;
```

This prevents race conditions where two simultaneous requests both see "9 used, 1 left" and both proceed.

### 4.5 Fail-Open Principle

**If the quota check itself fails (DB down, code error), allow the request.** The design mandate: never block a user from a feature due to *our* bug. Log the failure for ops, but fail open.

```typescript
try {
  const check = await checkQuota(userId, 'voice_dump');
  if (!check.allowed) return showQuotaReachedUI(check);
} catch (error) {
  logger.error('quota_check_failed', { error, userId });
  // Fail open — proceed as if allowed
}
```

---

## 5. Quota Reached UI

When a user hits a daily quota:

### Approved UI Pattern

```
┌────────────────────────────────────────┐
│                                        │
│  You've used your free Voice Dumps     │
│  for today.                            │
│                                        │
│  Resets at [user's local time].        │
│  (e.g., "8:00 PM your time")           │
│                                        │
│  [ Type instead ]                      │
│                                        │
│  ─────────────────────────             │
│                                        │
│  Want unlimited? Pro is $7/mo.         │
│  [ Learn more ]                        │
│                                        │
└────────────────────────────────────────┘
```

**Reset time computation:** the displayed time comes from `QuotaCheck.resetsAtUserLocalDisplay` (see §4.3). The 04:00 UTC reset is converted to the user's local timezone for display. The user never sees UTC.

**Mandatory elements:**
- The fallback action is **first and prominent** ("Type instead" — they can still do the thing)
- The reset time is explicit
- The upgrade pitch is **second and small** — present but not aggressive
- No red. No exclamation marks. No "LIMIT REACHED" headers.

### Banned Patterns

- ❌ Modal that blocks the whole UI until dismissed
- ❌ Countdown timer showing "Resets in X hours"
- ❌ "You're missing out!" framing
- ❌ Comparison tables shown unprompted
- ❌ Email reminders that user is "still on the free tier"

---

## 6. Subscription Management (Stripe Integration)

### 6.1 Recommended Approach: Stripe Customer Portal

Instead of building a billing UI, use **Stripe's hosted Customer Portal**:

- User clicks "Manage subscription" in Focus Forge
- Redirects to Stripe-hosted page (themed to your brand colors)
- User can: change plan, update payment method, view invoices, cancel
- Stripe handles compliance (PCI, EU VAT, tax reporting, dunning emails)

**Why this matters:** ADHD users abandon billing flows constantly. Stripe's Customer Portal is industry-best at completion rates.

### 6.2 Required Stripe Configuration

| Setting | Value |
|---|---|
| Products | Focus Forge Pro |
| Prices | Monthly ($7), Annual ($60), Lifetime ($120) — separate Price objects |
| Tax | Stripe Tax (auto-handles US sales tax + EU VAT) |
| Customer Portal | Enabled, allow plan changes + cancellation |
| Webhooks | `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid`, `invoice.payment_failed` |
| Trial period | **None** — see §3.2 |
| Proration | Enabled on plan changes |

### 6.3 Webhook → Database Sync

The `subscriptions` table is defined in `04-mysql-schema.md` §4.18 — that is the single source of truth. Key behaviors:

- **One row per user**, unique on `user_id`
- **`ON DELETE RESTRICT`** prevents account deletion while an active subscription exists
- **`status` ENUM** matches Stripe's subscription statuses (we keep `'trialing'` for API compatibility but never use it — see §3.2 "no free trials")

**Soft-Track Protocol applied to billing:**
- `past_due` shows a gentle banner, never locks features immediately
- Grace period: 3 days past_due = features stay; after that, soft revert to free tier (see §6.5)

### 6.4 Tier State Sync

When a webhook fires, update `users.tier`:

```typescript
// On customer.subscription.created or .updated:
if (subscription.status === 'active' || subscription.status === 'trialing') {
  await db.user.update({
    where: { id: userId },
    data: { tier: subscription.plan_type === 'lifetime' ? 'paid_lifetime' : 'paid' }
  });
}

// On customer.subscription.deleted:
// Revert to legacy_free if user was a legacy user, otherwise free
const wasLegacy = await checkUserHasLegacyGrants(userId);
await db.user.update({
  where: { id: userId },
  data: { tier: wasLegacy ? 'legacy_free' : 'free' }
});
```

### 6.5 Past-Due Grace Period

When `invoice.payment_failed` fires:

```
Day 0:   Status → 'past_due'. Stripe auto-retries. User sees no change.
Day 1-2: Soft banner: "We couldn't process your payment. [Update card]"
Day 3:   Stripe sends retry attempts (configurable in Stripe dashboard)
Day 7:   If still failing, tier reverts to free/legacy_free with email:
         "Your Pro features are paused. Update payment to resume."
         User keeps account, all data, all settings.
```

**Critical:** never lock a user out. Their tasks, badges, voice dumps remain accessible. Only Pro-tier features become unavailable.

---

## 7. Donations (Free Users)

### 7.1 Implementation

- Settings page → "Support Focus Forge" link
- Opens Stripe Checkout (one-time payment)
- Amounts: $1, $5, $10, custom
- After payment: "Supporter" badge added to user (purely cosmetic, persistent)
- Receipt emailed automatically

### 7.2 Why Donations Belong in v1

- Many ADHD users WANT to support tools that work for them, but can't afford recurring subscriptions
- Donation revenue smooths early-launch finances when paid users are few
- Costs nothing to add (Stripe Checkout is plug-and-play)

### 7.3 Anti-Patterns

- ❌ "Want to help? Donate!" prompts on the dashboard
- ❌ Pleading copy
- ❌ Comparison ("Pro users get features, donors don't" — confusing)

The donate button lives quietly in settings. Users find it when they're ready.

---

## 8. Body Doubling: Jitsi Public Instance, Pro Tier

**Decision locked:** Body doubling video uses **Jitsi Public Instance** (`meet.jit.si`), gated to Pro tier only.

### 8.1 Why Jitsi Public Instance

- **Genuinely free forever** — Jitsi has run a public free instance since 2013 with no participant caps and no minute limits
- Their server, their bandwidth — Focus Forge pays $0 for video infrastructure
- Embed via iframe with their JS API
- Supports muted-by-default, background blur, hide self-view (all our spec requirements)
- Open source, mature, used in production by other ADHD apps

**Tradeoffs we accept:**
- Occasional reliability hiccups (rare; Jitsi public instance is highly reliable in practice)
- "Jitsi" branding is visible inside the video iframe (minor)
- We don't control retention or moderation of their service

### 8.2 Why Body Doubling Stays Pro-Only

Even with Jitsi being free for us, we paywall body doubling to:
1. **Reserve premium-feel features for paid users** (sustainable freemium economics)
2. **Limit moderation burden** — if free users can drop into rooms, abuse risk increases
3. **Match the user's expectation** that the 24/7 drop-in rooms with synchronized Pomodoro timers, structured sessions, and curated themed rooms are a "real product feature" worth paying for

### 8.3 Migration Path If Reliability Becomes A Problem

If Jitsi public instance reliability deteriorates after launch:

| Option | Cost | Effort |
|---|---|---|
| Self-hosted Jitsi on a VPS | ~$10/mo VPS | Medium (sysadmin work) |
| Daily.co paid plan | ~$0.004/min after free 10k mins | Low (drop-in SDK swap) |
| LiveKit Cloud paid plan | ~$0.001/min | Low |

This is a Day 100 decision, not a Day 1 decision. Build with Jitsi, monitor reliability, swap if needed.

---

## 9. Account Deletion + Active Subscription

If a Pro user requests account deletion:

```
1. Detect active subscription
2. Show modal:
   "You have an active Pro subscription.
    Deleting your account will:
    - Cancel your subscription immediately (no refund for the current period)
    - Delete all data after 30-day grace period"
3. Two options:
   [Cancel deletion]  [Cancel subscription AND delete account]
4. If user proceeds:
   a. Cancel Stripe subscription (immediate, not at period end)
   b. Move account to pending_delete state
   c. Keep grace-period revival possible (re-subscription required if revived)
```

**No refund processing built into v1.** If a user demands a refund, handle manually via Stripe dashboard. Build automated refunds later if volume warrants.

---

## 10. Tax & Compliance

### 10.1 Sales Tax

**Use Stripe Tax.** It auto-determines:
- US state sales tax (where applicable)
- EU VAT (required if you sell to EU residents)
- UK VAT, Australian GST, etc.

Stripe Tax costs **0.5% of transactions** (above standard Stripe fees). Worth every penny vs. building your own tax engine.

### 10.2 Receipts

Stripe generates and emails automatically. No work for us.

### 10.3 Refund Policy

Document in Terms of Service:
> *"We offer a 14-day refund window for any reason on first-time Pro purchases. Annual purchases are pro-rated. Lifetime purchases are non-refundable after 14 days."*

Pro-rate annual refunds manually for v1.

### 10.4 Required Legal Pages

- `/terms` — Terms of Service
- `/privacy` — Privacy Policy (already required; covers data + payment)
- `/refunds` — Refund policy

Use a service like Termly or Iubenda to generate v1 versions. Have a real lawyer review before paid launch.

---

## 11. Legacy User Migration (Day The Paid Tier Launches)

This is the most important migration in the project. Run only ONCE.

### 11.1 Pre-Migration Checklist

- [ ] All current features have `feature_key` entries documented
- [ ] `feature_grants` table is created and tested
- [ ] Migration script tested on a copy of production DB
- [ ] Rollback plan documented
- [ ] Email drafted to legacy users explaining the new tier

### 11.2 Migration Script

The migration is implemented as a Prisma script (TypeScript) so we get cuid() generation, type safety, and clear logging. This is the canonical implementation:

```typescript
// scripts/migrate-legacy-users.ts
// RUN ONCE at paid-tier launch. Test on staging copy first.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Canonical feature_key list — must match doc 04 §4.7 registry
const LEGACY_FEATURE_GRANTS = [
  // Always-free features (granted for completeness)
  'task_management',
  'analog_timer',
  'reverse_scheduler',
  'launchpad',
  'body_check_ins',
  'badges',
  'data_export',
  'routines',                      // Always free
  'task_templates',                // Always free
  'feedback_submission',           // Always free
  'feedback_voting',               // Always free
  'completion_patterns',           // Always free, opt-in
  'mini_games',                    // Always free, core accessibility feature
  'movement_prompts',              // Always free, core accessibility feature
  'quest_log_mode',                // Always free, UI variant
  'speed_run_challenges',          // Always free, opt-in
  'biddy_companion',               // Always free, core accessibility feature
  'time_estimation',               // Always free, basic Module G
  'mindfulness',                   // Always free, core accessibility feature
  'biddy',                         // Always free with cap, core accessibility feature
  'module_g_etc_tracking',         // Always free, calibration is core accommodation
  // Unlimited variants — legacy users get the UNLIMITED versions of quota-gated features
  'voice_dump_unlimited',
  'ai_breakdown_unlimited',
  'ai_decision_unlimited',
  'ai_etc_suggestion_unlimited',
  'praise_repository_unlimited',
  'praise_transcription',          // Pro-only feature, granted to legacy users
  'trusted_contacts_unlimited',
  'device_sync_unlimited',
  'body_doubling',                 // Pro-only feature, granted to legacy users
  // NOTE: 'ai_routine_suggestions' is intentionally NOT included.
  // It's a Pro feature added AFTER paid-tier launch — legacy users didn't have
  // access to it during the free era because it didn't exist.
  // New post-launch Pro features follow this rule.
];

async function main() {
  // Find all eligible users
  const eligibleUsers = await prisma.user.findMany({
    where: {
      tier: 'free',
      account_state: { in: ['active', 'unverified'] },
    },
    select: { id: true },
  });

  console.log(`Found ${eligibleUsers.length} eligible legacy users.`);

  // Use a transaction so it's all-or-nothing
  await prisma.$transaction(async (tx) => {
    for (const user of eligibleUsers) {
      // Insert feature_grants (skipDuplicates handles re-runs safely)
      await tx.featureGrant.createMany({
        data: LEGACY_FEATURE_GRANTS.map((feature_key) => ({
          user_id: user.id,
          feature_key,
          granted_reason: 'legacy_grandfather',
          notes: `Auto-granted at paid-tier launch on ${new Date().toISOString()}`,
        })),
        skipDuplicates: true,
      });
    }

    // Update tier label
    const updated = await tx.user.updateMany({
      where: {
        tier: 'free',
        account_state: { in: ['active', 'unverified'] },
      },
      data: { tier: 'legacy_free' },
    });

    console.log(`Updated ${updated.count} users to legacy_free tier.`);
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

**This grants the UNLIMITED variants intentionally.** Legacy users who used Focus Forge during the free era are promised continued access without the new paid-tier limits. This honors the spirit of the legacy commitment generously.

### 11.3 Post-Migration Verification

```sql
-- Should be 0 (all eligible users converted)
SELECT COUNT(*) FROM users WHERE tier = 'free' AND account_state IN ('active', 'unverified');

-- Should equal: (eligible_user_count × 15 features)
SELECT COUNT(*) FROM feature_grants WHERE granted_reason = 'legacy_grandfather';

-- Spot-check: pick a random legacy user, verify all 15 grants exist
SELECT feature_key FROM feature_grants
WHERE user_id = (SELECT id FROM users WHERE tier = 'legacy_free' LIMIT 1)
ORDER BY feature_key;
```

### 11.4 Email To Legacy Users

```
Subject: Focus Forge is launching a paid plan — here's what changes for you

You're receiving this because you've been with us since the early days.

Today we launched Focus Forge Pro. Here's what it means for you:

🎉 You're now a Legacy Free user. Your account just got upgraded:
  - Unlimited Voice Dumps
  - Unlimited AI features
  - Unlimited praise memos and trusted contacts
  - All free features you had remain free, forever

You don't need to do anything. Nothing changes about how you use the app.

If you'd like to support continued development, Pro is available for $7/month
or $60/year. New features added going forward will be Pro-only.

Thank you for being here from the beginning.
— The Focus Forge team
```

**Note:** this email is a *gift*, not a marketing pitch. Frame it that way. ADHD users have been burned by every "we're updating our terms" email — yours should feel different.

---

## 12. Edge Cases

### 12.1 User Has Lifetime + Wants Refund After 14 Days
Manual decision. Default: refuse. Lifetime is a gift to early supporters; honor that on both sides.

### 12.2 User Subscribes, Cancels, Re-Subscribes
Treat as new Pro user. No legacy benefits.

### 12.3 User Was Pro, Account Deleted, Re-Signs Up Same Email
Treat as brand new free user. No legacy, no carryover data.

### 12.4 Family/Team Plans
**Not in v1.** Document as "future possibility." If demand emerges, design then.

### 12.5 Gift Subscriptions
**Not in v1.** Stripe supports them but they add complexity to webhook handling.

### 12.6 Student Discounts
**Not in v1.** $7/month is already a fair price for students.

### 12.7 Free Tier Abuse (Multiple Accounts To Bypass Quotas)
- Not actively policed
- Rate-limit signup by IP if abuse becomes obvious
- Our view: if someone needs 30 voice dumps a day across 3 accounts, they probably need Pro and have a reason they're avoiding it. Make the tier accessible (low price, easy upgrade) rather than fight cat-and-mouse.

---

## 13. Metrics To Track

For internal use — never shown to users:

| Metric | Why |
|---|---|
| Free → Pro conversion rate | Health of pricing |
| Voice Dump quota-reached events / day | Is 10/day too low? |
| AI breakdown quota-reached events / day | Same |
| Cancellations / month | Health of product |
| Churn reason (from cancel survey) | What to fix |
| Donation count + total | Free tier sustainability signal |
| Legacy user retention | Are we keeping our promise? |

---

## 14. Acceptance Criteria

The monetization system is "done" when:

- [ ] All quota checks fail open on error
- [ ] All quotas reset at 04:00 user-local time
- [ ] All "quota reached" UIs follow the approved UI pattern
- [ ] Stripe webhook handles all five event types correctly
- [ ] Stripe Customer Portal is live and themed
- [ ] Past-due grace period works as specified (3-day soft, 7-day revert)
- [ ] Donations flow works end-to-end with Supporter badge granted
- [ ] Account deletion handles active subscriptions correctly
- [ ] Legacy migration script tested on staging DB
- [ ] All required legal pages live
- [ ] Stripe Tax enabled and working
- [ ] No "free trial" language anywhere in the codebase
- [ ] No countdown timers on quota UIs
- [ ] Tier change (free ↔ paid) triggers no destructive data operations
