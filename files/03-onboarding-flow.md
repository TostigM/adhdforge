# Focus Forge — Onboarding Flow Specification

**Status:** Draft v1.0
**Owners:** Focus Forge Project

---

## 1. Why Onboarding Is The Highest-Stakes Surface

Background:

Onboarding is therefore not "introduction." Onboarding is **proving the app can deliver one win before the user's executive function runs out.**

### Design Principles

| Concern | Principle |
|---|---|
| **Reward delivery** | The user MUST experience the dopamine hit (badge earned) within their first session. Not "after they explore." Not "once they configure." Within their first session. |
| **Tone** | No setup wizards. Wizards trigger pre-emptive shame ("I'm already failing this"). Onboarding must feel like discovery, not configuration. |
| **Visual hierarchy** | Progressive disclosure is mandatory. One decision per screen. Skip buttons on every step. |
| **Scope** | Onboarding can NOT collect symptom data. We are not a diagnostic tool. Asking "How severe is your ADHD?" is inappropriate without a licensed practitioner present. |
| **Friction** | First-session friction predicts 30-day retention better than any other variable. Reduce decisions, defer customization, deliver value fast. |
| **Skip paths** | Every step needs a "Skip for now" path. Every. Single. Step. |

---

## 2. The Three-Phase Model

Onboarding is split into three distinct phases. Each has a different goal.

```
Phase 1: First Touch (0–90 seconds)
  └─→ Goal: User experiences ONE feature working

Phase 2: First Session (the rest of session 1)
  └─→ Goal: User earns at least one Bronze Badge

Phase 3: Progressive Discovery (sessions 2-10)
  └─→ Goal: User encounters new features at the moment they're useful
```

This is **not** a 3-step flow. Phases 2 and 3 are organic; only Phase 1 is scripted.

---

## 3. Phase 1: First Touch (Scripted, 0–90 seconds)

### 3.1 Landing → First Action

**Step 1 — Landing page** (post-signup):

```
┌────────────────────────────────────┐
│                                    │
│         ✨ Focus Forge              │
│                                    │
│    Welcome. Let's start with       │
│    something small.                │
│                                    │
│    What's one thing on your        │
│    mind right now?                 │
│                                    │
│    [_______________________]       │
│                                    │
│    [   Capture it   ]              │
│                                    │
│    skip for now                    │
│                                    │
└────────────────────────────────────┘
```

**Why this design:**
- ONE input field. Not five.
- "Capture it" not "Add task" — softer, less commitment language
- "skip for now" in small text — present but non-pressuring
- Voice Dump button (mic icon) appears next to the field for users who'd rather speak
- No "tour" being offered yet — they're already doing the thing

### 3.2 The First Capture → First Reward

When the user submits text or voice, the sequence is **strictly ordered** to avoid race conditions:

1. **Task is persisted with raw text only** (no AI parsing yet, no steps yet)
2. **Task appears as a `<TaskCard>` on the dashboard** (immediately, with raw text)
3. **First Capture Badge toast fires within 500ms** — celebrates the *act of capturing*
4. **AI parsing happens asynchronously in the background** (5–15 seconds typically)
5. **When parsed steps arrive, they appear on the TaskCard** with a subtle update animation

Critical implementation note: **the badge must NOT depend on AI completion.** A badge for "trusting the app with a thought" should fire even if the AI parser is down. We enforce this — fail open.

```
┌──────────────────────────┐
│ ✨ First Capture Badge   │
│ Earned just now          │
└──────────────────────────┘
```

**Important:** the badge is earned for the *act of capturing*, not for completing the task. Completion can come later. The act of trusting the app with a thought is itself a behavioral win that deserves reinforcement.

### 3.3 The Anti-Tour

**There is no product tour.** No "Click here to see the timer." No "This is your dashboard."

Instead, contextual hints appear ONLY when the user's gaze (cursor hover) suggests they're looking for something. Hints are dismissible permanently with one click.

---

## 4. Phase 2: First Session (Organic Discovery)

After the first capture, the user lands on a minimal dashboard:

```
┌────────────────────────────────────┐
│  ☰  Focus Forge          ⚙        │
├────────────────────────────────────┤
│                                    │
│  Hi [Name].                        │
│                                    │
│  ─────────────────────────────     │
│                                    │
│  📝 [Their captured task]          │
│     • Step 1: ...                  │
│     • Step 2: ...                  │
│     • Step 3: ...                  │
│                                    │
│     [ Walk me through it ]         │
│     [ Done. Next step. ]           │
│     [ Push to later ]              │
│                                    │
│  ─────────────────────────────     │
│                                    │
│  [+]  Capture another thought       │
│                                    │
│  ─────────────────────────────     │
│                                    │
│  ⏱  Start a Focus Timer            │
│                                    │
└────────────────────────────────────┘
```

**Three options visible. Two paths to value.** No menus to explore. No tabs. No sidebars.

### 4.1 What Each Path Triggers

**"Walk me through it"** → enters single-step mode → user completes step → earns "First Step" badge → returns to dashboard with that step crossed off.

**"Start a Focus Timer"** → opens timer setup with three preset durations (15min, 25min, 45min) → user picks one → analog wedge appears → timer counts down. After completion: "Focus Session" badge.

**"Done. Next step."** → step crossed off with subtle animation → next step displayed → if all done: "Task Complete" badge + soft confetti-free celebration.

### 4.2 The First-Session Goal

By end of session 1, we want one of these to be true:
- User earned at least 2 badges
- User started a timer
- User used "Walk Me Through It"

If NONE of these happen by 5 minutes in, the dashboard surfaces a gentle hint:
```
"No pressure. Even capturing thoughts counts.
Want to try [feature]?"
```

---

## 5. Phase 3: Progressive Discovery (Sessions 2–10)

Features unfurl as the user encounters their need for them. **We don't push features; we surface them at the Point of Performance.**

### 5.1 Discovery Triggers

**Free-tier features** surface based on user behavior:

| Feature | Surfaced When |
|---|---|
| **Reverse Scheduler ("Doorknob")** | User adds a task with a time (e.g., "Doctor at 2pm") OR captures something containing a time phrase |
| **Sound Families** | User opens the timer for the 3rd time |
| **Body Check-Ins** | User starts a focus session of 60+ minutes |
| **Decision Paralysis Breaker** | User has 3+ tasks pending and hasn't started one in 24 hours |
| **Launchpad** | User uses the Doorknob mode for the first time |
| **Praise Repository** | User has completed 5+ tasks (they've earned positive feedback) — note: free tier gets 3 active memos |

**Pro-only features** surface differently. A hard rule: **never tease a feature to a struggling user that they can't access.** When the user might benefit from a Pro feature:

| Feature | Surfaced When | How |
|---|---|---|
| **Body Doubling** | User has had 2 focus sessions end with status='incomplete' in the past 7 days | Soft framing: "Some folks find co-working with others helps. It's a Pro feature — here's how it works." Clearly labels it as Pro. |

A focus session is `status='incomplete'` when the user pauses and never resumes within 4 hours, OR closes the timer before completion. This is neutral framing — never "you failed."

**No Pro feature is surfaced as a fix to a problem the user is struggling with.** The discovery is informational ("here's a thing that exists"), not aspirational ("you need this"). users sensitive to perceived rejection feel intensely shamed by upsells dressed as solutions.

### 5.2 How Features Are Surfaced

Never via popup. Never via modal. Always via a soft "discovery card" that appears once on the dashboard:

```
┌────────────────────────────────────┐
│  💡 Try this?                       │
│                                    │
│  Got an appointment with a hard    │
│  arrival time? "Doorknob mode"     │
│  will tell you exactly when to     │
│  put on your shoes.                │
│                                    │
│  [ Try it ]   [ Maybe later ]      │
│                                    │
└────────────────────────────────────┘
```

**Maybe later** dismisses the card permanently from the dashboard. The feature remains available in the menu — but we don't badger.

---

## 6. The "Skip Onboarding" Path

A "Skip" link is on EVERY onboarding step. If clicked at any point:

1. User lands on the empty dashboard
2. The "First Capture Badge" is held in reserve — they earn it on their first real capture, no matter when
3. Discovery cards still trigger normally
4. No re-engagement prompts attempt to drag them back into onboarding

**Note:** Some users skip because they're testing the app cynically. Some skip because their executive function failed mid-flow. Both deserve a working app on the other side, not a re-onboarding loop.

---

## 7. Account Setup Deferral

These are NOT collected at signup or in onboarding:

- ❌ Display name (they may have given one to OAuth provider; otherwise default to "you")
- ❌ Profile photo
- ❌ Time zone (auto-detected; user can correct later)
- ❌ Notification preferences (defaults are sensible)
- ❌ Sound family preference (default to "soft chimes"; surfaces during 3rd timer use)
- ❌ Avatar
- ❌ Goal-setting questions
- ❌ "What do you want to accomplish?"
- ❌ ADHD subtype questions (see §1 — inappropriate)

**These ARE collected, only when relevant:**

- ✅ Email verification (banner-style, non-blocking)
- ✅ Push notification permission (asked at first scheduled reminder)
- ✅ Microphone permission (asked at first Voice Dump attempt)
- ✅ Screen sharing / camera permission (asked at first Body Doubling attempt)

---

## 8. Returning User Experience

### 8.1 Day 2 (Second Session)

If user returns within 7 days of signup:
- No "Welcome back!" modal
- Dashboard shows their existing tasks with one new addition: a small banner if they earned 0 badges yesterday: "Yesterday was a quiet day. That's allowed. Anything new on your mind?"

If user returns after 7+ days:
- No "We missed you!" message (sensitivity trigger)
- No "Where have you been?"
- Just the dashboard, exactly as they left it
- Optional gentle line: "Welcome back. Your stuff is still here."

### 8.2 The "Restart" Anti-Pattern

We MUST NOT have any feature that:
- Resets streaks
- Marks tasks as "missed yesterday"
- Asks "Want to try again?" in a way that implies failure
- Sends "You haven't been here in X days" emails

**A hard rule:** these are distress traps. If even one slips through, users uninstall.

---

## 9. Onboarding Telemetry (For Internal Use)

We need to know if onboarding is working. **All telemetry is anonymous and aggregate-only** — no per-user tracking.

| Event | Tracked |
|---|---|
| Landing page reached | Yes (count only) |
| First capture submitted | Yes |
| First capture method | Yes (text vs voice) |
| First capture skipped | Yes |
| First badge earned (which one) | Yes |
| Time to first badge | Yes (histogram) |
| Session duration | Yes |
| Day-2 return | Yes |
| Discovery card shown / accepted / dismissed | Yes |

These map to drop-off points. No PII. No content of captures.

---

## 10. Edge Cases & Recovery

### 10.1 User Lands But Doesn't Type

After 30 seconds of inactivity on landing:
- The placeholder text rotates softly through examples:
  - "Email Sarah back"
  - "Don't forget the dentist"
  - "Buy oranges"
- Mic button gently pulses (twice, then stops)
- After 90 seconds: a "Skip for now →" link becomes more prominent

### 10.2 Voice Dump Fails

If mic permission denied OR transcription fails:
- Falls back silently to text input
- Toast: "Voice not working — typed input works fine."
- No red error. No retry prompt. Just keep moving.

### 10.3 User Closes Tab Mid-Onboarding

- Whatever they typed is auto-saved
- On return, dashboard shows that draft as a TaskCard
- No "You didn't finish onboarding!" prompt

### 10.4 User Signs Up But Never Returns

- **Day 1:** Welcome email at signup (one-time, transactional, not re-engagement)
- **All subsequent days:** Nothing. Silence is respect.
- **Day 90:** Account moves to dormant state internally; user-facing experience unchanged

**No re-engagement campaigns at any interval. No "we miss you" emails. No "your captures are still here" emails. ADHD users find these humiliating.**

A hard rule, restated: if the user is gone, leave them gone. They will return if and when they choose. Their data waits patiently. Their absence is not a problem to solve.

---

## 11. Onboarding Flow Diagram

```
                          ┌─────────────────┐
                          │  Sign-Up Done   │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   Landing       │
                          │   "What's on    │
                          │    your mind?"  │
                          └────┬─────────┬──┘
                       capture │         │ skip
                               │         │
              ┌────────────────┘         │
              ▼                          │
     ┌──────────────────┐                │
     │  First Badge     │                │
     │  Toast (auto)    │                │
     └────────┬─────────┘                │
              │                          │
              ▼                          ▼
     ┌────────────────────────────────────┐
     │       Minimal Dashboard            │
     │                                    │
     │  - Their task (if any)             │
     │  - "Capture another"               │
     │  - "Start a Focus Timer"           │
     └─────────────────┬──────────────────┘
                       │
                       │ (organic use)
                       ▼
             ┌─────────────────────┐
             │   Phase 3:          │
             │   Discovery cards   │
             │   appear at PoP     │
             └─────────────────────┘
```

---

## 12. Acceptance Criteria

Onboarding is "done" when:

- [ ] User can complete signup → first capture → first badge in under 90 seconds
- [ ] No required fields beyond email/password during signup
- [ ] Skip path is present and works on every onboarding step
- [ ] First Capture Badge fires reliably on first task creation
- [ ] No ADHD-related health questions appear anywhere
- [ ] No setup wizard, no product tour, no "tutorial mode"
- [ ] Discovery cards appear correctly per the trigger table (§5.1)
- [ ] Returning user experience contains no streak-resetting or shame language
- [ ] Voice Dump fallback to text is silent and seamless
- [ ] Telemetry captures drop-off points without PII
- [ ] No re-engagement emails sent at any time after signup (welcome email at signup is permitted)
- [ ] Tab-close → reopen preserves user's in-progress capture
- [ ] All onboarding text is in plain language (8th-grade reading level or below)
- [ ] All onboarding screens pass axe-core
