# Focus Forge — Design System Specification

**Status:** Draft v1.0
**Owners:** Focus Forge Project
**Stack:** TailwindCSS + React + Next.js

---

## 1. Design Philosophy (Round-Table)

| Concern | Principle |
|---|---|
| **Visual hierarchy** | Strict COGA compliance. Single column, literal labels, progressive disclosure. The interface should feel quieter than the user's brain. |
| **Color discipline** | No red. No alert colors. Every state has a soft visual treatment. Empty states are encouraging, not blank. |
| **Color comfort** | Color contrast tuned for retinal comfort, not maximum WCAG numbers. Pure black causes "halation" in dark mode. Pastel priority colors prevent attention hijack by alarm hues. |
| **Feedback speed** | Every interactive element provides immediate visual feedback (≤100ms). Hover, focus, active, completion — all distinct. |
| **Component reuse** | One canonical version of every component. No drift. If a developer needs a button, they MUST use `<Button>`, not roll a new one. |
| **Consistency** | Visual consistency reduces cognitive load. Cognitive load is what we're designing against. |

---

## 2. Color System

### 2.1 The Forbidden Color: RED

**Red is physically removed from the codebase.** The Tailwind config overrides `red-*` to throw an error during build. Replacements below.

### 2.2 Background Layers (Dark Mode — Default)

```
slate-950   ┌─────────────────────────────────┐
            │  Page background (--bg-page)    │  Deepest layer
slate-900   │  ┌───────────────────────────┐  │
            │  │  Surface (--bg-surface)   │  │  Cards, modals
slate-800   │  │  ┌─────────────────────┐  │  │
            │  │  │  Elevated           │  │  │  Inputs, hover states
slate-700   │  │  │  (--bg-elevated)    │  │  │
            │  │  └─────────────────────┘  │  │
            │  └───────────────────────────┘  │
            └─────────────────────────────────┘
```

| Token | Hex | Use |
|---|---|---|
| `--bg-page` | `#0f172a` (slate-900) | Body background. **Never pure black** (#000) — causes retinal halation. |
| `--bg-surface` | `#1e293b` (slate-800) | Cards, primary content surfaces |
| `--bg-elevated` | `#334155` (slate-700) | Inputs, hover states, modals |
| `--bg-overlay` | `rgba(15,23,42,0.8)` | Modal backdrop |

### 2.3 Light Mode Support

Available, with photophobia-aware design considerations. Note: some ADHD users have photophobia that gets *worse* in dark mode, not better. We must respect their preference.

**Default behavior at signup:**
1. Honor `prefers-color-scheme` from OS if set (light → light, dark → dark)
2. If OS preference is `no-preference`, default to **dark mode** (slate-900 base)
3. User can override at any time from settings; their explicit choice persists

| Token | Hex (Light Mode) |
|---|---|
| `--bg-page` | `#fafaf9` (warm off-white, not pure white) |
| `--bg-surface` | `#ffffff` |
| `--bg-elevated` | `#f5f5f4` |

### 2.4 Text Colors

| Token | Hex (dark) | Hex (light) | Use |
|---|---|---|---|
| `--text-primary` | `#f1f5f9` (slate-100) | `#0f172a` | Body text |
| `--text-secondary` | `#94a3b8` (slate-400) | `#475569` | Labels, hints |
| `--text-tertiary` | `#64748b` (slate-500) | `#94a3b8` | Disabled, timestamps |
| `--text-on-priority` | varies | varies | Always test contrast against badge bg |

**Critical:** Body text must hit **WCAG AAA (7:1)** contrast against `--bg-page`. We're not aiming for "passing" — we're aiming for "comfortable for hours."

### 2.5 Priority Color Scale (distress-safe)

This palette was designed deliberately to avoid alarm hues.

| Priority | Token | Hex | Visual |
|---|---|---|---|
| Bronze (low) | `--priority-bronze` | `#a07452` | Soft, earthy, easy to ignore |
| Silver (medium) | `--priority-silver` | `#94a3b8` | Neutral, doesn't shout |
| Gold (high) | `--priority-gold` | `#d4a017` | Warm, draws eye without alarm |
| Amber (highest) | `--priority-amber` | `#f59e0b` | The closest we get to "urgent" — still warm, never red |

**No "urgent" or "critical" priority exists.** If everything is critical, nothing is. Amber is the ceiling.

### 2.6 Functional Colors

| Token | Hex | Use | NOT for |
|---|---|---|---|
| `--success` | `#10b981` (emerald-500) | Task completed, badge earned | Don't overuse — saturation fatigues |
| `--info` | `#7dd3fc` (sky-300) | Tooltips, neutral notices | |
| `--warning` | `#f59e0b` (amber-500) | "Heads up" — never "danger" | Form validation errors |
| `--soft-error` | `#d946ef` (fuchsia-500) | Errors, validation | Replaces all red usage |

**The fuchsia choice is deliberate.** It registers as "needs attention" without triggering the threat-response wiring that red activates.

### 2.7 Accent

| Token | Hex | Use |
|---|---|---|
| `--accent` | `#a78bfa` (violet-400) | Primary buttons, focus rings, active nav |
| `--accent-soft` | `#c4b5fd` (violet-300) | Hover states |

Violet is the brand color: distinctive, calming, none of the cultural baggage of green/blue.

---

## 3. Typography

### 3.1 Font Stack

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
--font-display: "Inter", sans-serif; /* Same as sans for v1 — keep simple */
```

**No serif fonts in v1.** Sans-serif is more readable for ADHD users and scales better at small sizes.

**Inter specifically:** designed for screens, has tabular numbers (critical for the timer), excellent at all sizes, free, self-hostable.

### 3.2 Type Scale

ADHD-friendly = larger than typical. Body text is 16px minimum.

| Token | Size | Line-height | Use |
|---|---|---|---|
| `--text-xs` | 12px | 1.5 | Timestamps, micro-labels (rare) |
| `--text-sm` | 14px | 1.5 | Secondary text, hints |
| `--text-base` | 16px | 1.6 | Body text (DEFAULT) |
| `--text-lg` | 18px | 1.5 | Emphasized body |
| `--text-xl` | 20px | 1.4 | Card titles |
| `--text-2xl` | 24px | 1.3 | Section headings |
| `--text-3xl` | 32px | 1.2 | Page titles |
| `--text-display` | 48px | 1.1 | Timer numerals, hero text |

### 3.3 Font Weights

Three weights only. More creates visual noise.

| Token | Weight |
|---|---|
| `--font-normal` | 400 |
| `--font-medium` | 500 |
| `--font-bold` | 700 |

### 3.4 Reading Width

Body text: **max 65 characters per line** (`max-w-[65ch]`). Beyond this, ADHD eyes lose their place between lines.

---

## 4. Spacing System

8-point grid. Every spacing value is a multiple of 4px (Tailwind's default).

| Token | px | Use |
|---|---|---|
| `space-1` | 4px | Icon-to-text gap |
| `space-2` | 8px | Tight inline spacing |
| `space-3` | 12px | Default inline gap |
| `space-4` | 16px | Default block gap |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Major section spacing |
| `space-12` | 48px | Hero/empty state spacing |
| `space-16` | 64px | Page-level breathing room |

**Touch targets minimum 44×44px.** No exceptions. ADHD users have variable motor control during dysregulation.

---

## 5. Layout Rules

### 5.1 Single-Column Mandate

The main task interface MUST be single column on every viewport. No exceptions.

```
Mobile (320px+):     [ single column ]
Tablet (768px+):     [   single column   ]    (max-w-2xl, centered)
Desktop (1024px+):   [   single column   ]    (max-w-2xl, centered)
Large (1440px+):     [   single column   ]    (still max-w-2xl)
```

The desktop empty space on either side is **intentional**. Filling it with sidebars violates COGA.

### 5.2 Allowed Multi-Column Surfaces

These are exceptions, justified case-by-case:

- **Settings pages** — two-column layout acceptable (nav + content)
- **Body Doubling room** — video tile grid
- **Praise Repository inbox** — single column, but each memo card is internally multi-region
- **Reverse Scheduler timeline** — visual horizontal layout for the time wedge

### 5.3 Z-Index Layers

```
0     Base content
10    Sticky header
20    Dropdown menus
30    Tooltips
40    Modal backdrop
50    Modal content
60    Toast notifications
70    Floating timer (Picture-in-Picture fallback)
9999  Critical recovery UI (offline banner, etc.)
```

---

## 6. Border Radius

| Token | px | Use |
|---|---|---|
| `--radius-sm` | 4px | Micro elements (badge dots) |
| `--radius` | 8px | Default — buttons, inputs, cards |
| `--radius-lg` | 12px | Modal corners |
| `--radius-xl` | 16px | Hero cards |
| `--radius-full` | 9999px | Avatars, pill badges |

**No sharp 90° corners on interactive elements.** Sharp corners read as "alert" / "warning."

---

## 7. Shadows

Used sparingly. Dark mode shadows are subtle.

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Cards |
| `--shadow` | `0 4px 12px rgba(0,0,0,0.4)` | Elevated cards, dropdowns |
| `--shadow-lg` | `0 12px 32px rgba(0,0,0,0.5)` | Modals |
| `--shadow-glow-success` | `0 0 16px rgba(16,185,129,0.4)` | Badge earned animation |
| `--shadow-glow-accent` | `0 0 16px rgba(167,139,250,0.4)` | Active focus session |

---

## 8. Animation & Motion

### 8.1 Durations

| Token | ms | Use |
|---|---|---|
| `--duration-instant` | 100 | Hover state changes |
| `--duration-fast` | 150 | Button press feedback |
| `--duration-normal` | 250 | Modal open/close, page transitions |
| `--duration-slow` | 400 | Timer wedge animations |
| `--duration-celebration` | 800 | Badge earned animation |

### 8.2 Easing

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);  /* Smooth, standard */
--ease-spring: cubic-bezier(0.5, 1.4, 0.5, 1); /* Slight bounce — ONLY for celebrations */
```

### 8.3 Reduced Motion

**MUST honor `prefers-reduced-motion: reduce`.** Some ADHD users have vestibular sensitivity. Replace all visual animations with instant transitions; keep opacity fades only.

**Critical clarification:** Reduced-motion disables **visual** animation only. **Audio cues (badge sounds, timer chimes) remain enabled** — they're not visual motion and many users with vestibular issues rely on auditory feedback. There is a separate "Disable sounds" preference for users who want quiet.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Audio is controlled separately via `userPreferences.soundsEnabled` (default true).

### 8.4 The Badge Earned Animation

This is the dopamine event. It must feel good.

```
1. Badge slides in from below (300ms, ease-spring)
2. Brief glow pulse (--shadow-glow-success, 600ms)
3. Soft chime plays (audio respects user's "Sound Family" preference)
4. Auto-dismisses after 2.5s, OR earlier if user clicks away
```

No confetti. Confetti is sensory overload for many ADHD users.

---

## 9. Component Inventory (v1)

QA mandate: **every UI element on the site uses one of these components.** No exceptions, no copies.

### 9.1 Primitives
- `<Button>` — variants: primary, secondary, ghost, soft-destructive (no "destructive" in red)
- `<IconButton>` — always with `aria-label`, never icon-only without text on critical actions
- `<Input>` — text, email, password, with show/hide toggle
- `<Textarea>` — auto-growing
- `<Select>` — native on mobile, custom on desktop (matched styling)
- `<Checkbox>` — large, satisfying tick animation
- `<Radio>` — same
- `<Toggle>` — for binary settings
- `<Slider>` — for things like timer duration
- `<Label>` — always with associated input via `htmlFor`

### 9.2 Containers
- `<Card>` — primary surface
- `<Modal>` — opens centered, dismissible by Esc and backdrop
- `<Drawer>` — slides from right (settings, secondary content)
- `<Toast>` — for soft notifications, auto-dismiss at 4s

### 9.3 Feedback
- `<Toast>` — soft, non-blocking
- `<EmptyState>` — encouraging illustration + message + CTA
- `<LoadingSpinner>` — only for >500ms operations; below that, nothing
- `<SkeletonLoader>` — for predictable layouts during fetch

### 9.4 ADHD-Specific Components
- `<TaskCard>` — single-column task display with priority badge
- `<MicroStep>` — single sub-task display for "Walk Me Through It" mode
- `<AnalogTimer>` — the wedge timer
- `<DoorknobTimeline>` — reverse scheduler visual
- `<PriorityBadge>` — bronze/silver/gold/amber pill
- `<EarnedBadge>` — celebration display
- `<VoiceDumpButton>` — large hold-to-record mic button
- `<DeferTaskButton>` — replaces the standard "delete" pattern
- `<PraiseMemoCard>` — voice memo with transcript + speed controls
- `<BodyCheckInPrompt>` — gentle interoception prompt
- `<SoundFamilyPicker>` — settings UI for alert variations

### 9.5 Wireframes for Novel Components

These ASCII wireframes anchor Claude Code's interpretation. Treat as guidance, not pixel-perfect specs.

**`<TaskCard>`**
```
┌─────────────────────────────────────────────┐
│ ● Bronze              Buy oranges           │
│                                             │
│   ▢ Get to the store                        │
│   ▢ Pick the oranges                        │
│   ▢ Pay and bring them home                 │
│                                             │
│   [ Done. Next step. ]  [ Push to later ]   │
└─────────────────────────────────────────────┘
```

**`<AnalogTimer>`** (the wedge — represented as time-remaining sector)
```
        ┌─────────────────┐
        │       ▲         │
        │     ╱   ╲       │
        │   ╱       ╲     │      Wedge fills clockwise:
        │ ╱           ╲   │      empty when timer ends
        │  GREEN ZONE     │
        │ ╲           ╱   │
        │   ╲       ╱     │
        │     ╲   ╱       │
        │       ▼         │
        └─────────────────┘
        25:00 remaining
        [ Pop out ] [ Pause ]
```

**`<DoorknobTimeline>`** (horizontal — exception to single-column)
```
NOW                                            ARRIVE
 │                                                │
 ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●
 │  YELLOW       │  GREEN    │  MAUVE  │  TRANSIT │
 │  Wrap up      │  Gather   │  Door   │  Drive   │
 │  3:00 PM      │  3:30 PM  │  3:45   │  4:00 PM │
 
 [ Running late (+15 min) ]
```

**`<VoiceDumpButton>`** (idle and recording states)
```
   IDLE:                  RECORDING (held):
   ┌────────────┐         ┌────────────┐
   │            │         │  ▁▂▄▆█▆▄▂  │
   │   ◉ MIC    │         │  ◉ MIC ●   │
   │            │         │  0:03      │
   │ Voice Dump │         │ Release to │
   │            │         │   save     │
   └────────────┘         └────────────┘
```

**`<PraiseMemoCard>`**
```
┌───────────────────────────────────────────────┐
│ 💛 From Mom                  2 days ago        │
│ ───────────────────────────────────────────── │
│   ▶ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢ 0:00 / 0:42             │
│                                                │
│   "Hey kiddo, just wanted to say I'm proud     │
│   of you for getting that thing done last      │
│   week. Love you."                             │
│                                                │
│   [ 1× ] [ 1.25× ] [ 1.5× ]                    │
│   Category: After a tough day                  │
└───────────────────────────────────────────────┘
```

**`<BodyCheckInPrompt>`** (toast-style, non-blocking)
```
┌───────────────────────────────────────┐
│ 💧 Have you had water recently?       │
│ [ Yes ]  [ Not yet ]  [ Later ]       │
└───────────────────────────────────────┘
```

**`<EarnedBadge>`** (toast that animates in from bottom)
```
┌───────────────────────────────────────┐
│ ✨  First Capture                      │
│     You trusted the app with a thought.│
└───────────────────────────────────────┘
```

---

## 10. Iconography

### 10.1 Icon Library

**Lucide React** — open source, consistent stroke weight, 1500+ icons. Single dependency.

### 10.2 Icon Rules (COGA-mandated)

1. **Every icon on a clickable element MUST have an accompanying text label.** "Voice Dump" next to mic icon, not just mic.
2. **Icons in body text are decorative, not interactive.**
3. **`aria-hidden="true"` on decorative icons; `aria-label` on functional ones.**
4. **Icon size: 16px (inline), 20px (default), 24px (emphasized).**
5. **No custom-drawn icons in v1.** Stick to Lucide.

### 10.3 Standard Icon Mapping

| Concept | Icon | Label |
|---|---|---|
| Voice recording | `Mic` | "Voice Dump" |
| Task complete | `Check` | "Done. Next step." |
| Defer task | `Clock` | "Push to later" (NOT "Snooze" — too sleepy) |
| Timer | `Timer` | "Start Timer" |
| Settings | `Settings` | "Settings" |
| Praise inbox | `Heart` | "Praise from your people" |
| Body doubling | `Users` | "Co-work" |
| Help/decision | `Sparkles` | "Help Me Decide" |
| Walk-through mode | `Footprints` | "Walk Me Through It" |
| Sign out | `LogOut` | "Sign out" |

---

## 11. State Patterns

### 11.1 Empty States

Every empty state has three parts:
1. Soft illustration (or large icon)
2. Encouraging message — never "You have nothing"
3. Single primary action

**Example — Empty task list:**
```
   ✨
"Nothing on your plate right now.
That's allowed."
[Capture a thought]
```

### 11.2 Loading States

| Duration | Treatment |
|---|---|
| 0–200ms | Nothing — too fast to indicate |
| 200–500ms | Subtle skeleton |
| 500ms–3s | Skeleton + soft spinner |
| 3s+ | Skeleton + reassurance text: "Still working — promise" |

### 11.3 Error States

**No red. No exclamation marks. No "ERROR" headers.**

Format: `<soft icon> + plain-language description + recovery action`

**Example:**
```
🌙  We couldn't reach the server.
    [Try again]   [Work offline]
```

### 11.4 Success States

Brief, warm, dismissible. Earned-badge animation is the celebration peak — don't over-celebrate every save.

---

## 12. Accessibility Compliance

### 12.1 Targets

- **WCAG 2.2 AA minimum, AAA where feasible**
- **COGA Working Group recommendations** (Cognitive Accessibility)
- **ARIA 1.2 patterns** for all custom components

### 12.2 Required Behaviors

- All interactive elements keyboard-reachable
- Focus visible on every element (`--accent` ring, 2px, with 2px offset)
- Skip-to-content link on every page
- All images have `alt` text (decorative = `alt=""`)
- All form inputs have associated labels
- Color is never the only indicator (priority levels also have an icon/label)
- Page must be usable at 200% zoom without horizontal scroll
- Page must be usable in browser default font size

### 12.3 Screen Reader Patterns

- Live regions for timer countdown updates (`aria-live="polite"`)
- Modal dialogs trap focus and restore on close
- Toast notifications use `role="status"`
- Form errors use `aria-describedby` linking input to error message

### 12.4 Testing

- Automated: `axe-core` in CI, must show 0 violations
- Manual: keyboard-only nav test before every release
- Manual: VoiceOver (macOS/iOS) and NVDA (Windows) smoke test before launch

---

## 13. Tailwind Config Strategy

### 13.1 Custom Theme Tokens

```js
// tailwind.config.js (excerpt)
theme: {
  extend: {
    colors: {
      bg: {
        page: 'var(--bg-page)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
      },
      text: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
      },
      // Priority DISPLAY colors. These are the visual palette only — the data model
      // is priority_kind + priority_level (doc 04 §4.5). Mapping: cant_miss→amber,
      // high→gold, med→silver, low→bronze. Never red. (See doc 02 §13.5.1.)
      priority: {
        bronze: 'var(--priority-bronze)',  // low
        silver: 'var(--priority-silver)',  // med
        gold: 'var(--priority-gold)',      // high
        amber: 'var(--priority-amber)',    // cant_miss
      },
      accent: {
        DEFAULT: 'var(--accent)',
        soft: 'var(--accent-soft)',
      },
      success: 'var(--success)',
      info: 'var(--info)',
      warning: 'var(--warning)',
      'soft-error': 'var(--soft-error)',
    },
  },
}
```

### 13.2 Red Removal

```js
// In tailwind.config.js, override Tailwind's red palette to throw at build:
const buildError = () => {
  throw new Error('Red is forbidden in Focus Forge. Use --soft-error (fuchsia) instead.');
};

theme: {
  extend: {
    colors: {
      red: new Proxy({}, { get: buildError }),
    },
  },
}
```

This is enforced at the build level — a developer cannot ship `text-red-500` even by accident.

### 13.3 CSS Variables in Globals

```css
/* app/globals.css */
:root {
  --bg-page: #0f172a;
  --bg-surface: #1e293b;
  /* ... etc */
}

@media (prefers-color-scheme: light) {
  :root {
    --bg-page: #fafaf9;
    /* ... etc */
  }
}

/* User-selected theme overrides system preference */
[data-theme="dark"] { /* ... */ }
[data-theme="light"] { /* ... */ }
```

---

## 13.5 THE CORE LOOP — Today Plan, Morning Ritual & Priority Model

**This is the most important section in the spec.** Everything else (Biddy, HUD, timers, body doubling) is a supporting actor. This section defines how a person with ADHD actually figures out *what to do right now* — the headline promise of the product. If this is built and the rest isn't, the product works. If everything else is built and this isn't, it's just another to-do list that gets abandoned.

### 13.5.1 The Priority Model (Anchor vs Flexible)

Priority is assigned **at task capture**, not guessed later. Two dimensions (schema: doc 04 §4.5):

- **`priority_kind`** — how the task relates to time:
  - **Anchor** — time-bound. Has a scheduled time, pins there, does NOT flow through the queue. (Therapy appointment, meds pickup, a meeting.) It's simply *true at its time*.
  - **Flexible** — the user chooses when. Flows through the Today queue and bubble-up.
- **`priority_level`** — relative weight: **cant_miss** (anchors only) / **high** / **med** / **low**.

**Display palette mapping** (never red — Rule 1). The metal names from the old system survive only as colors:
- cant_miss → amber · high → gold · med → silver · low → bronze

A "Call the dentist" is flexible-high (matters, but you pick when). A "Therapy at 2pm" is an anchor-cant_miss (pinned, non-negotiable). This distinction is what makes smart surfacing possible.

### 13.5.2 The Today View (the home screen)

The home screen is **Today**, not the backlog. It shows a **small visible set** (`visible_slots`, user-configurable, default 3, range 1–5). The full backlog is a deliberate tap away ("the drawer"), never the default view. This is the spec's own progressive-disclosure research, finally built.

Layout (single column, Rule 6):
- **Anchors pinned at top**, showing their time, with no Swap button (they can't be swapped — they're true).
- **Flexible tasks** fill the remaining slots, each with **Done** and **Swap** actions and a priority pill.
- A quiet **"N more in the queue"** counter — never the full list, never a "27 left" gut-punch.
- A **"What should I do now?"** button that surfaces exactly ONE task (the top of the visible set) and hides the rest — the maximal-progressive-disclosure escape hatch for overwhelmed moments.
- An **all-clear state** when the visible set empties: a calm "nothing pressing — rest, or pull something from the queue" message. Never "you have X left."

### 13.5.3 The Morning Ritual

A once-a-day, **10-second** prompt: *"What 1–3 things would feel like a win today?"*

- **Anchors / cant_miss items are already there**, pre-loaded at the top ("already on your plate"). They don't compete for a win slot — they're surfaced regardless.
- Below, **high/med tasks are offered as tappable suggestions** (ranked). The user taps to add. This is assisted planning — the cognitive work of "what matters" is mostly pre-done, but the user still chooses.
- **Options, not orders** (the AuDHD principle): the ritual suggests; the user decides.

**Ritual mode** is a user setting (stored in `users.preferences`, day-state in `daily_plans.ritual_state`):
- **off** — never prompt; plan populates ambiently
- **skippable** (default) — dismissable prompt; **never blocks** the app
- **ambient** — no prompt; Today just fills itself and is adjustable anytime

Critical for demand-avoidance: **skipping costs nothing.** The plan fills itself either way, and anchors surface regardless of whether the ritual was done. The app must never gate functionality behind completing the ritual.

### 13.5.4 Bubble-Up Refill

The Today set is a **living queue**, not a fixed list (schema + algorithm: doc 04 §4.6.2):

- Complete a task (**Done**) → it's marked complete (dopamine hit) → the next-highest-ranked queued task **bubbles up** to refill the freed slot.
- The user always sees a small, manageable set; it quietly replenishes as they progress. The refill is a small renewal moment, never a "still 27 to go."
- **Swap** (flexible only) → the task returns to the queue (end position) and the next one bubbles in. "Options, not orders": auto-filled by default, swappable on demand.
- A brief **"moved to queue"** micro-confirmation on swap, so the user sees where it went (don't let it just vanish).

Bubble-up ranking: cant_miss → flexible-high → med → low; anchors placed by their time.

### 13.5.5 The Gentle Reframe (postponement guardrail)

The risk: a flexible-high task ("call the dentist") gets swapped away day after day and silently sinks — the exact ADHD avoidance trap. The guardrail must **notice and offer help, never nag or shame** (Rules 2, 3, 5).

When a flexible **high or med** task has been swapped out `>= threshold` times (user-configurable, **default 4**, range 3–7), the system shows — **once** — a calm, blame-free card:

> **"This one keeps sliding — totally okay."**
> *"[Task] has moved a few times. Want to make it easier?"*
> - 🧩 **Break it into smaller steps** (runs the Decision Paralysis Breaker — maybe it's too big)
> - ↓ **Lower its priority** (maybe it's not actually high — that's fine)
> - 📌 **Give it a set time (anchor it)** (so it stops competing in the queue)
> - **Not now — don't ask again for a while** (snooze; sets `reframe_snoozed_until`)

Rule-safe properties (all enforced in doc 04 §4.6.2 logic):
- Framed as *the task* being sticky, never *the user* failing.
- **Options, not orders** — four ways out, including "leave me alone."
- **Fires once** (`reframe_offered_at`), then silent. No escalation, no repeat.
- **No counter is ever shown** to the user. No "you've postponed this 6 times."
- **No red, no streak-break, no shame.**
- **Exempt:** anchors (don't sink), low-priority (supposed to wait), cant_miss (anchor-only).
- **Fully disable-able** in settings (`gentle_reframe_enabled`, default ON); threshold configurable.

The insight: chronic postponement is a *signal* (too big, mis-prioritized, or needs a time). The guardrail surfaces it as help. That's ADHD-friendly accountability.

### 13.5.6 Hard Rules For The Core Loop

- Home screen is **Today** (small set), never the full backlog.
- `visible_slots` user-set, default 3, clamp 1–5. Backlog always hidden by default.
- Anchors pin and never swap; flexible tasks flow and bubble.
- Morning ritual **never blocks**; skipping is free; anchors surface regardless.
- Bubble-up is **automatic but swappable** (options not orders).
- Gentle Reframe fires **once**, offers help, never nags; default-on, disable-able, threshold 3–7.
- No red, no failed/overdue, no broken streaks, no shame anywhere in the loop (Rules 1, 2, 3, 5).
- Single-column Today layout (Rule 6).

---

## 14. Gamification & Stimulation Design

### 14.1 The "Alive Interface" Principle

The ADHD brain disengages from static, unresponsive UIs. The interface should feel reactive — small celebrations, subtle motion, immediate feedback — without crossing into casino-style stimulation.

**What this means in practice:**

| Pattern | Use For | Avoid |
|---|---|---|
| Subtle pulse on hover | All interactive elements | Constant ambient pulsing |
| Color shift on state change | Task → done, timer → expired | Rainbow gradients |
| Satisfying micro-animation on completion | Task complete, badge earn, mini-game level | Confetti-blast on every click |
| Smooth ease-out transitions | Page changes, modal opens | Bouncy spring physics everywhere |
| Light haptic feedback (mobile) | Task complete, badge earn | Every UI interaction |

### 14.2 Animation Tokens

Reactive animations use these duration tokens (Tailwind config):

```js
// tailwind.config.js
theme: {
  extend: {
    transitionDuration: {
      'micro': '120ms',     // Hover, focus, immediate response
      'soft':  '240ms',     // Page transitions, modal opens
      'satisfying': '480ms', // Task completion, badge earn
      'celebrate': '720ms',  // Major milestones (still bounded)
    },
    keyframes: {
      'satisfying-fade': {
        '0%': { opacity: '0', transform: 'scale(0.95)' },
        '100%': { opacity: '1', transform: 'scale(1)' },
      },
      'task-complete-glow': {
        '0%, 100%': { 'box-shadow': '0 0 0 0 rgba(245, 158, 11, 0)' },
        '50%': { 'box-shadow': '0 0 16px 4px rgba(245, 158, 11, 0.4)' },
      },
      'gentle-pulse': {
        '0%, 100%': { opacity: '1' },
        '50%': { opacity: '0.85' },
      },
      // NO 'flash', 'strobe', 'shake', or 'wobble' — these can trigger
      // photosensitive issues OR motion-sensitive ADHD/autism users
    }
  }
}
```

**Hard rule:** All animations honor `prefers-reduced-motion: reduce`. When detected, fade-only fallbacks replace transforms; pulses become static state changes.

### 14.3 Quest Log Mode (Optional UI Variant)

When user enables `questLogModeEnabled` in preferences, routines and tasks render with game-inspired framing.

**What changes:**
- Routine name → "Quest Chain" label visible
- Routine steps → "Objectives" with subtle icon
- Completion → satisfying animation with "Objective Complete" toast
- Daily routine completion → "Daily Quest Complete" celebration animation (still <1 second)
- Streak language is still BANNED — no "5-day streak"
- XP/Level metaphor allowed BUT with no comparison to other users and no "level required" gating

**What does NOT change:**
- Color tokens (still no red, still pastels)
- Single-column layout
- Accessibility (game framing must not reduce screen reader clarity)
- All literal labels remain — Quest Log mode adds flair, doesn't replace clarity

**Toggle:** Settings → Appearance → Quest Log Mode (default OFF)

### 14.4 Mini-Game Design Constraints

Strict design rules for the 3 launch mini-games (Pattern Match, Reaction Tiles, Word Builder):

**Visual constraints:**
- Use design system colors only (no neon, no oversaturated palettes)
- Background: same dark mode `slate-900` as rest of app
- Game elements: amber, emerald, slate variations
- NO red anywhere (continues global ban)
- NO flashing colors faster than 3 Hz (photosensitivity)
- Maximum simultaneous moving elements: 6 (cognitive load ceiling)

**Interaction constraints:**
- All games keyboard-playable (not mouse/touch only)
- Touch targets ≥44×44px on mobile
- Pause button always visible in top-left
- "Skip to my task" button always visible in top-right
- Timer (countdown to forced 10-min end) always visible
- Cooldown until next game shown after session ends

**Audio constraints:**
- Subtle game sounds tied to user's selected Sound Family
- Volume defaults to 30% of system
- Mute button always visible
- NO winning fanfare — just gentle completion chime
- NO failure buzzer — just neutral "round ended" tone

**The Pause Button Must Be Real:**
- Pause freezes timer
- Pause shows: "Resume" / "Skip to task" / "End game" buttons
- Game state preserved across pause
- Critical because ADHD interruptions are unpredictable

### 14.5 Speed Run Challenge UI

Optional feature when `speedRunChallengesEnabled` is true. Surfaces "Want a quick challenge? 2 tasks in 15 minutes" prompts.

**Visual design:**
- Prompt appears as a soft amber card (NOT urgent red)
- Countdown timer visible during challenge
- "End early" button always visible (no commitment lock-in)
- Result screen shows "Challenge complete!" with subtle celebration
- "Time's up" screen says "Challenge ended — nice effort." (NO "FAILED" framing)

**Important:** Speed run challenges are SAFE URGENCY — they create stimulation without the panic of real deadlines. The framing must reinforce this constantly.

### 14.6 Movement Prompt UI

Movement prompts appear as toast notifications during long focus sessions or on the 10-3 rule schedule.

**Default appearance (neutral language mode):**
```
┌─────────────────────────────────────┐
│  🚶  A brisk 3-minute walk?         │
│                                      │
│  [ Start ]  [ Snooze ]  [ Skip ]    │
└─────────────────────────────────────┘
```

**Anti-shame language mode (first encounter):**
```
┌─────────────────────────────────────┐
│  🚶  Movement helps your brain work  │
│      better. A brisk 3-minute walk?  │
│      Not mandatory — just an option. │
│                                      │
│  [ Start ]  [ Snooze ]  [ Skip ]    │
└─────────────────────────────────────┘
```

**Snooze behavior:** suppress for 30 minutes, then offer again
**Skip behavior:** suppress for 2 hours, log dismissal
**Repeat skip detection:** if user skips 3+ in a row, automatically reduce frequency for the rest of the day (no nagging)

---

## 15. Biddy (AI Body Double) Design

The design specifications for Biddy's visual presence.

### 15.1 Avatar Container

Biddy lives in a fixed-position panel (not modal, not blocking) that the user can position anywhere on screen. Default position: bottom-right corner.

**Container specs:**
- Default dimensions: 240×240px desktop, 120×120px mobile
- User-resizable within bounds: min 80×80px, max 400×400px
- Border: subtle `border-slate-700/40` (no harsh edges)
- Background: matches user's theme (dark mode default)
- Drop shadow: subtle, gives presence without dominance
- Always-on-top toggle (pinned to viewport during scroll)
- Drag handle visible on hover

### 15.2 Avatar Animation Specifications

All 6 avatar options use the same animation framework — only the illustration changes.

**Animation framework:**
- SVG-based animations (NOT video; NOT canvas)
- Self-contained animated SVGs: each file embeds its own CSS `<style>` block so it animates standalone (openable in a browser) AND when inlined in HTML
- Loop duration: ~1-8 seconds per loop depending on the action
- Stylized motion (not hyper-realistic)
- Reduced-motion mode: all animation disabled via `@media (prefers-reduced-motion: reduce)` inside each SVG (hard requirement, Rule 9)

**Activities (per creature):**

| Activity | Activity key | Visual concept |
|---|---|---|
| Working on a computer | `computer` | Creature at a laptop, paws/hands on keyboard |
| Reading | `reading` | Creature holding a book, eyes tracking (no real text) |
| Knitting | `knitting` | Creature working needles/yarn |
| Cleaning | `cleaning` | Creature wiping/tidying with a cloth or tool |

For abstract creatures (blob, plant), activities are interpreted suggestively rather than literally (e.g. a plant "cleaning" wipes a leaf; a blob "knitting" works needles with amorphous nubs). Keep them readable, not literal.

**Critical animation constraints (apply to every animation, main and variation):**
- NO speech bubbles, NO text emerging from Biddy
- NO direct eye contact with user (Biddy looks at their work, not the camera)
- NO "noticing" the user (no head turns toward user)
- NO emotional reactions (no smiling at user's progress, no frowning at delays)
- The creature faces its work (oriented away from the viewer, e.g. WSW three-quarter), reinforcing "doing its own thing"

### 15.2.1 Weighted Variation System

Each (creature × activity) context is not a single animation but a **weighted set of 12**:

- **1 "main" animation** (slot `main`) — the default action (typing, reading, etc.), heavily weighted (~56%)
- **11 "variation" animations** (slots `var-01` … `var-11`) — short idle-flavor beats (sipping coffee, stretching, moving the mouse, pausing to glance, etc.), each lightly weighted (~4%)

When Biddy needs an animation, the app rolls a weighted random pick from the context's set. This keeps Biddy feeling alive and non-repetitive without any single animation dominating beyond the main action.

**Architecture: shared base + swapped overlay.**
Within a context, every animation shares an identical **base** (the creature's persistent parts — head, tail, body — plus the activity prop like the laptop). Only a small **overlay** changes per variation (which paw does what, an added mug, raised arms, etc.). This keeps the 12 files visually consistent and cheap to maintain: change the base once and it propagates conceptually across the set. Files are still shipped self-contained (base embedded in each) for drop-in simplicity; the "shared base" is a production discipline, not a runtime composite.

**File naming convention:**
```
{creature}-{activity}-main.svg
{creature}-{activity}-var-01.svg  …  {creature}-{activity}-var-11.svg
```
Example: `cat-laptop-main.svg`, `cat-laptop-var-01.svg`. (Activity folder/prefix uses the human-friendly prop name where clearer, e.g. `cat-laptop`, mapped to activity key `computer` in the manifest.)

Full vision: **6 creatures × 4 activities × 12 slots = 288 files.**

**Manifest + selector:**
- `animation-manifest.json` lists every context and its 12 animations with `{ slot, file, label, weight, placeholder }`
- `biddy-animation-selector.ts` reads the manifest and does the weighted pick, with options to exclude placeholders and avoid immediate repeats (`avoidSlot`)
- Weights need not sum to 100; the selector normalizes against the running total

**Placeholder strategy (v1):**
The infrastructure supports all 12 slots immediately, but not all 12 real animations need to exist at launch. Slots without a real animation are filled with **renamed copies** of existing animations and flagged `"placeholder": true` in the manifest. The rotation feels full; placeholders are swapped for real animations over time. `pickAnimation(..., { excludePlaceholders: true })` can hide them once enough real ones exist.

**v1 shipped set (cat-laptop):** 5 real animations — `main` (typing), `var-01` (sipping coffee), `var-02` (stretching), `var-03` (moving the mouse), `var-04` (pause and glance) — plus 7 placeholder copies (`var-05` … `var-11`).

### 15.3 Avatar Visual Style

Avatars are organized into **two categories**, though only one is populated in v1.

#### Category A: Creatures (v1, the only populated category)

The 6 abstract creature avatars: cat, robot, blob, plant, fox, owl.

All share a coherent illustration style:
- Stylized, friendly, slightly rounded shapes
- Limited color palette per avatar (3-4 colors using design system tokens)
- No photorealism, no uncanny valley
- Visual style: closer to "indie game character" than "AI assistant avatar"

**Example: `cat` avatar specifications:**
- Sleepy/cozy aesthetic
- Color palette: warm browns/creams, blue accent for "work" items
- Idle state: tail flick every ~6 seconds, ear twitch occasionally
- Sitting at small desk with whatever activity prop

#### Category B: Companions (humanoid — DEFERRED)

**Status: scaffolded but not populated in v1.**

The Companion category exists structurally (in schema, in UI, in message-key registry) but contains zero avatars at launch. The decision was deliberate: humanoid AI companions carry a measurably higher risk of parasocial attachment than abstract creatures, and the design discussion concluded that the product's core mission (helping users with ADHD stay on task) is better served by encouraging real human connection over investment in AI presence.

**The category remains in the schema because:**
1. Adding humanoid avatars later is a community-feedback-driven decision, not a redesign
2. Removing the category and re-adding it later costs more than leaving it dormant
3. Future humanoid additions (if community demand justifies) can plug in without schema changes

**If humanoid avatars are added later:**
- They MUST trigger the `humanoid_first_use` informational note (already specced)
- They MUST share the same 90-min soft / 240-min daily hard caps (no exceptions)
- They MUST follow the same activity animation framework
- Diversity intent (across age, ethnicity, gender presentation, visible disability) MUST be present from day one — never ship with a single humanoid

**The first-use disclosure copy (ready when needed):**

```
You picked a humanoid companion. A few notes:

These avatars are people-shaped, which some users find more
relatable. But humanoid AI companions can sometimes feel more
like real social presence than they actually are. That's why
we have time caps on Biddy regardless of which avatar you pick:
90 minutes per session, 4 hours per day.

If you find yourself preferring Biddy company over real people,
that's worth noticing. Biddy is a tool — not a friend.

[ Got it — let's go ]   [ Pick a creature instead ]
```

**Hard rules for both categories (apply now, apply later):**
- No avatar speaks to the user, displays text, or makes eye contact
- No avatar reacts emotionally to user progress
- Same animation framework (typing, reading, drawing, thinking, organizing)
- Same time caps (90 min soft / 240 min daily hard)
- No idle reactions to user activity

**Why both creatures and (eventually maybe) companions need time caps:**
Spending hours per day with any AI presence — even a stylized cat — substitutes for human contact in ways we want to gently discourage. The caps aren't arbitrary punishment; they're the reason any AI-companion category can exist responsibly.

### 15.4 Soft Limit UI

When 90-min soft limit reached:

```
┌────────────────────────────────────┐
│   [biddy small avatar]             │
│                                     │
│   You've been with Biddy for 90    │
│   minutes. Want to take a break?   │
│                                     │
│   [ End session ]                  │
│   [ Take 5-min break ]             │
│   [ Continue 15 more min ]         │
└────────────────────────────────────┘
```

- Soft prompt, never red
- "Take 5-min break" pauses Biddy session, can be resumed
- "Continue" extends by 15 minutes; prompt repeats at next 15-min mark
- "End session" returns user to dashboard with summary

### 15.5 Hard Daily Cap UI

When 4-hour daily cumulative reached:

```
┌────────────────────────────────────┐
│   [biddy small avatar, sleepy]     │
│                                     │
│   You've spent 4 hours with Biddy  │
│   today. Biddy will be back        │
│   tomorrow at midnight UTC.        │
│                                     │
│   In the meantime: maybe a walk,   │
│   a friend, or some fresh air?     │
│                                     │
│   [ Got it ]                        │
└────────────────────────────────────┘
```

- Hard limit, no override
- The closing prompt suggests human alternatives (anti-parasocial rule)
- Session ends and is saved

### 15.6 Healthy-Use Reminders (Diminishing Didactic)

Per the anti-shame language pattern from §14, Biddy onboarding includes explicit healthy-use framing:

**First Biddy session (explicit framing):**
> "Biddy is here when you need company while working. Biddy is a tool — like a stuffed animal at your desk, but animated. Biddy isn't a friend, isn't your therapist, and isn't a replacement for human connection. Used in moderation, Biddy can help with task initiation. Used too much, Biddy can become a way to avoid people. We've built in some gentle limits to help."

**After first session (neutral framing):**
> "Biddy is ready when you are."

The first message appears once. After that, neutral framing only.

---

## 16. Time Estimation UI Patterns (Module G)

The design specifications for showing/hiding elapsed time.

### 16.1 The Hidden-By-Default Rule

**Default state during a task:** the elapsed time IS NOT visible. Anywhere. Not on the task card. Not in the focus timer. Not in the corner of the screen.

This is a hard default. It can be overridden by the user opting in to `showElapsedTimeInTask`, but defaults always start hidden.

### 16.2 Why The Default Matters

A design rule:
> "A visible elapsed timer counting up can increase anxiety for many users, especially those with ADHD. Research suggests time-pressure cues compete for attentional resources. Even a small ticking number in the corner can become the focus."

Therefore: silent background tracking is the only option for default users. The timer fires events; the UI doesn't show numbers.

### 16.3 Optional Elapsed Time Display (When Enabled)

If user enables `showElapsedTimeInTask`:

**Allowed:**
- Static number, updated once per minute (NOT once per second)
- Located in non-prominent area (e.g., small text in task header)
- Same color as body text (NEVER changes color)
- NO countdown framing ("23 minutes" not "37 minutes remaining")

**Forbidden:**
- Ticking second-by-second display
- Color changes as time passes
- Animation or motion
- "Time remaining" framing
- Comparison to estimate ("you estimated 30 min, current: 25 min")

### 16.4 The Estimate Entry UI

When user creates or edits a task, optional ETC field appears:

```
┌────────────────────────────────────────┐
│  Task title: [_________________]        │
│                                          │
│  How long will this take?                │
│  ○ I'll guess: [__] minutes              │
│  ○ Skip for now                          │
│  ○ Suggest based on history (Pro)        │
│                                          │
│  [ Save task ]                           │
└────────────────────────────────────────┘
```

- Estimate is OPTIONAL (skip is fine, no pressure)
- "Suggest based on history" is the Pro feature — disabled-with-tooltip for free users
- No validation enforced on minimum/maximum (user can estimate "5 min" or "300 min" freely)
- Anti-shame microcopy: "It's just a guess — calibration data, not commitment."

### 16.5 Completion Reveal

After task completes, IF user has `showElapsedTimeAfterCompletion=true`:

```
┌────────────────────────────────────┐
│  Task complete!                     │
│                                     │
│  Estimated: 30 minutes              │
│  Actual: 24 minutes                 │
│                                     │
│  🥈 Time-Bender badge earned!       │
└────────────────────────────────────┘
```

- Calm, non-celebratory layout (the badge IS the celebration)
- Numbers shown as data, not judgment
- If actual > estimated, NO red, NO sad face, NO "missed":
  ```
  Estimated: 30 minutes
  Actual: 41 minutes
  
  Calibration data saved. Future estimates will adjust.
  ```

### 16.6 Pro Tier ETC Suggestion UI

When Pro user creates a task and chooses "Suggest based on history":

```
┌────────────────────────────────────────┐
│  Based on your patterns, this task     │
│  might take 25 minutes.                 │
│                                          │
│  (Average of 8 similar tasks you've    │
│  done over the last 60 days.)          │
│                                          │
│  [ Use 25 min ]  [ Adjust ]            │
└────────────────────────────────────────┘
```

- Show the data behind the suggestion (transparency)
- Always allow override
- "Adjust" opens manual entry with the suggestion pre-filled

---

## 17. Mindfulness Bar (Module H) Design

The design specifications for the persistent bottom bar mindfulness tool.

### 17.1 The Bottom Bar

Anchored to the bottom of the viewport on all main app pages (NOT auth pages, NOT admin pages).

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                       [main app content]                           │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│  🧘 Reset    [💧 Quick Reset]              5-4-3-2-1 ▾  ⋯     │
└────────────────────────────────────────────────────────────────────┘
```

**Bar elements (left to right):**
- **🧘 Reset** — primary entry point. Click → opens exercise library popover
- **Quick Reset** — secondary button (more prominent visual treatment, fuchsia accent border, NEVER red). Click → goes directly to 5-4-3-2-1 grounding
- **Last-used exercise** — quick-access dropdown showing user's recent or pinned exercise
- **⋯** — overflow menu: Settings, Patterns view (if opted in)

**Bar specs:**
- Height: 56px desktop, 48px mobile
- Background: `bg-slate-900/95` with subtle backdrop blur
- Border-top: `border-slate-800`
- z-index: above main content, below modals
- Hides automatically during: focus mode (Walk-Through), Biddy fullscreen, mini-games
- ALWAYS visible during: dashboard, settings, routines, all main surfaces

**Mobile behavior:**
- Slightly reduced layout — only Reset + Quick Reset visible by default
- Last-used and overflow menu accessed via swipe-up gesture
- Safe area inset respected (avoids iOS home indicator)

### 17.2 The "I'm Overwhelmed" Button

This is the most critical UI element in Module H. Designed for users in distress who have minimal cognitive capacity.

**Visual design:**
- Slightly larger than other bottom-bar buttons
- Subtle fuchsia accent (the design system's "warning without alarm" color)
- Icon: a single calm dot (not exclamation mark, not warning sign — those escalate)
- Label text: "Quick Reset" or user-customizable to "Need a moment" / "Reset"

**Behavior on click:**
1. Page content dims slightly (does NOT navigate away — stays in place)
2. Modal slides up from bottom covering ~60% of viewport
3. Modal goes DIRECTLY to 5-4-3-2-1 first step (no menu, no choice)
4. Single large "Continue" button at each step
5. Easy exit (X in top corner, large enough to tap)

**Design philosophy:** users in distress cannot make decisions. They need ONE thing to do, big and simple. Menus are forbidden in this flow.

**First-time use disclosure:**
On first click of "Quick Reset", show this brief disclosure (using the `acute_flow_first_use` message_encounters key):

```
┌─────────────────────────────────────────────┐
│                                              │
│  This is your Quick Reset button.            │
│                                              │
│  When you press it, we'll guide you          │
│  through a 3-minute grounding exercise.      │
│  No decisions, no menus. Just steps.         │
│                                              │
│  Take a breath. We'll go one step at a time. │
│                                              │
│  [ Got it — let's begin ]                   │
│                                              │
└─────────────────────────────────────────────┘
```

This appears ONCE, then never again.

### 17.3 Exercise Library Popover

When user clicks 🧘 Reset (the calm-state entry):

```
┌─────────────────────────────────────────────┐
│  Mental Reset                                │
│  Pick one. Start small.                      │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ 5-4-3-2-1 Sensory Grounding   • 3 min  │ │
│  │ Anchor in the present using your senses │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ Three-Breath Reset            • 1 min  │ │
│  │ A 60-second breathing pause             │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ Micro Body Scan         ⓘ      • 2 min │ │
│  │ Tense and release through your body     │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ Four-Step Emotional Reset                   • 4 min  │ │
│  │ Process intense emotions with kindness  │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  Settings                                    │
└─────────────────────────────────────────────┘
```

**Card layout:**
- Each exercise is a tappable card
- Shows: name, short description, estimated duration
- Body scan card has small ⓘ icon — tap reveals cautions note
- Cards visually consistent (no "premium" badges, no rankings, no "most used")
- Tap → opens that exercise's guided flow

**Bottom links:**
- Settings — opens Module H preferences

### 17.4 The Guided Exercise Flow

Once an exercise starts, the UI is intentionally minimal:

```
┌─────────────────────────────────────────────┐
│                                          ✕   │
│                                              │
│              Step 1 of 5                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━              │
│                                              │
│                                              │
│         Look around.                         │
│         Name 5 things you can see.          │
│                                              │
│                                              │
│         ⚪⚪⚪⚪⚪                            │
│         (tap each as you find one)           │
│                                              │
│                                              │
│                                              │
│            [ Continue ]                      │
│                                              │
└─────────────────────────────────────────────┘
```

**UI rules:**
- One step on screen at a time (no peeking ahead)
- Large prompt text, generous whitespace
- Step indicator (e.g., "1 of 5") is small, not anxiety-inducing
- Progress bar is gentle — fills slowly, never urgent-looking
- Single primary action: "Continue" (or auto-advance for breath exercises)
- Exit (✕) always visible top-right; tapping ends the session immediately, no judgment
- NO timer countdown visible by default (Module G principle: visible timers create anxiety)
- For breath exercises: gentle animated breath circle replaces text prompts during the breath itself

### 17.5 Exercise-Specific UI Patterns

**5-4-3-2-1 Sensory Grounding:**
- Each step shows N empty circles
- User taps a circle as they identify each item (or just thinks them — circles are optional acknowledgment, not required)
- Step auto-advances when N circles are tapped OR after 30s

**Three-Breath Reset:**
- Animated breath circle: expands during inhale, holds, contracts during exhale
- Text prompts overlay the animation
- No skip button (it's only 60 seconds)

**Micro Body Scan:**
- Simple text prompt for each body part
- Optional small body diagram highlighting the current area
- 15-second timer per step (not visible as countdown — just gentle progress)

**Four-Step Emotional Reset:**
- Each step has 60 seconds for reflection
- "Continue" appears at 30s but user can stay longer
- After NON-IDENTIFY step: gentle close screen ("Notice how you feel now. Better, same, or different — all are fine.")

### 17.6 The Body Scan Cautions Note

Tapping the ⓘ on the body scan card shows:

```
┌─────────────────────────────────────────────┐
│  About body scans                            │
│                                              │
│  Body scan exercises ask you to focus on     │
│  physical sensations in your body. Many      │
│  people find this builds calm and awareness. │
│                                              │
│  Some people find body-focused exercises     │
│  uncomfortable. If body awareness feels      │
│  overwhelming, the breath reset or           │
│  5-4-3-2-1 grounding may work better.        │
│                                              │
│  This isn't medical advice — it's just a     │
│  productivity feature. If you have questions │
│  about what works for you, that's a good     │
│  conversation to have with a mental health   │
│  professional.                               │
│                                              │
│  [ Got it ]    [ Try a different one ]       │
│                                              │
└─────────────────────────────────────────────┘
```

This note is also shown automatically before the FIRST body scan use (tracked via `bodyscan_cautions` message_encounters key).

### 17.7 System-Suggestion Toast UI

When the system surfaces a mindfulness suggestion at a workflow transition:

```
┌─────────────────────────────────────────────┐
│  Nice work finishing that.                   │
│  60-second mental reset?                     │
│                                              │
│  [ Yes ]  [ Not now ]                       │
└─────────────────────────────────────────────┘
```

**Toast behavior:**
- Appears at top-right (desktop) or top-center (mobile)
- Auto-dismisses after 8 seconds (logged as `no_response`)
- "Yes" → goes to user's most-recent exercise OR three-breath reset (the shortest)
- "Not now" → logs as `dismissed`, contributes to backoff counter
- Subtle slide-in animation, no jarring entry

**Anti-shame variant pattern (per §14):**

| Mode | Text |
|---|---|
| Explicit (first encounters) | "Brief mental resets help your brain transition. 60 seconds?" |
| Neutral (after first encounter) | "60-second mental reset?" |

### 17.8 Settings UI

`/settings/mindfulness`:

```
┌─────────────────────────────────────────────┐
│  Mindfulness                                 │
│                                              │
│  ☑ Enable mindfulness bar                    │
│                                              │
│  Suggestions from Focus Forge:               │
│  ○ Off (button-only access)                  │
│  ○ Limited (only after long focus)           │
│  ● Standard (recommended)                    │
│                                              │
│  Pinned exercise:                            │
│  [ None ▾ ]                                 │
│                                              │
│  ☐ Show patterns view                        │
│  When enabled, see your reset history        │
│  framed as completion data, not failures.    │
│                                              │
└─────────────────────────────────────────────┘
```

### 17.9 Hard Rules For Module H Design

Hard rules:
- **No streak counters** anywhere (banned globally, applies here)
- **No "you missed your reset today"** notifications
- **No completion percentage** displayed
- **No "you should be doing more mindfulness"** messaging
- **No leaderboards or social comparison**
- **System never auto-launches an exercise** without user confirmation (even if Biddy were involved, which it isn't)

Hard design rules:
- Mindfulness bar uses design system tokens only
- No "premium" or "Pro" badges in the exercise library
- Body scan exercise has informational tooltip but is NOT visually de-emphasized
- Exit button always reachable in 1 tap

---

## 18. Nourishment HUD Design (Food & Water Tracking)

A persistent, glanceable "survival-game" overlay in the workspace that makes tracking food and water effortless. Sits in the **bottom-left** of the workspace, out of the main task flow.

### 18.1 The Two Chips

Two compact chips stacked vertically, bottom-left:

```
┌──────────────────────────────────────────┐
│  🥛  [▓▓▓▓░░░░]  4 / 8   [ + ]            │   ← water
├──────────────────────────────────────────┤
│  🍗  [▓▓░]       2 / 3   [ + ]            │   ← food
└──────────────────────────────────────────┘
       icon  progress bar  count   log button
```

Each chip, left to right:
1. **Icon** — waterglass (water) or crossed fork & spoon (food). Custom SVGs in the Style A vocabulary (see asset files `hud-water.svg`, `hud-food.svg`).
2. **Progress bar** — segmented, one segment per goal unit. Fills as the user logs. Color transitions **dark amber (empty/low) → emerald green (full)**. Never red.
3. **Count** — `current / goal` in tabular figures (e.g. `4 / 8`).
4. **`+` button** — one tap logs a glass / a meal. Count pops (scale bounce) on increment.

### 18.2 The Progress Bar

- **Segmented**, not continuous: one segment per goal unit (8 segments for default water, N for meal count). Maps cleanly to discrete glasses/meals.
- **Color logic:** the filled segments share a color computed from overall progress — interpolating from dark amber `#854f0b` (just started) toward emerald `#34d399` (goal met). Empty segments are a muted slate `#2a3344`.
- A full green bar is the visual "you did it" cue, landing just before the badge pops.
- Honors `prefers-reduced-motion`: fill color still changes (it's not motion), but the count-pop animation is disabled.

### 18.3 The Two-Stage Gentle Reminder

When water has gone untouched past the threshold (default 2h), or a mealtime has passed unlogged past the grace window (default 45min), the relevant chip reminds the user — **gently, and only once per lapse**:

- **Stage 1 — Pulse (first few minutes):** the chip border glows amber and pulses slowly (a soft scale + amber box-shadow, ~1.4s loop). This is the "hey, gentle heads-up" moment.
- **Stage 2 — Settle (after the pulse window):** the pulse stops and the chip settles into a **quiet, subtle persistent amber glow** — present but not demanding attention. It's a passive flag, not an active nag.

Logging (tapping `+`) immediately clears the reminder back to neutral.

```
Stage 1 (minutes):   gentle amber pulse  ●∿●∿●
Stage 2 (until logged): quiet steady glow  ◌
On log:              neutral               ·
```

**Hard rules for the reminder:**
- **Amber only, never red** (Rule 1). A red "you forgot" is exactly the punitive trigger we design against.
- **De-escalates, never escalates.** The pulse calms into a glow; it never intensifies or repeats louder.
- **No text nag.** No "you haven't had water in 3 hours!" message. The visual glow is the entire reminder.
- **No shame on a miss.** A passed mealtime that's never logged just… stays glowing quietly until the day rolls over. No "you missed lunch," no broken counter (Rules 2, 3, 5).
- Fully disableable (`reminders_enabled` in settings).

### 18.4 Badges

- Completing the water goal awards **Hydrated** (silver tier).
- Completing all meals awards **Well Fed Body and Mind** (silver tier).
- Both are **daily-repeatable and streak-free**: earned fresh each day, awarded once per day max. Missing a day produces **nothing** — no broken streak, no "you missed yesterday." (Rule 3.)
- Badge award uses the standard gamification celebration (scale-bounce pop + soft glow + sparkles), themed green/emerald to match the "full bar" moment.

### 18.5 Settings

Both goals are user-configurable (with sensible defaults):
- **Water goal** — number of glasses (default 8)
- **Mealtimes** — a list of times (default e.g. 08:00 / 12:30 / 18:30); the count of mealtimes is the meal goal
- **Reminders on/off**, and optionally the thresholds (water hours, meal grace minutes)
- **Hide the whole HUD** — for users who don't want it

Settings use the standard progressive-disclosure, single-decision-per-step pattern. Adding a mealtime is a simple time picker; the meal goal updates automatically to match the count.

### 18.6 Wellbeing Guardrail (important)

This feature is deliberately scoped to **counting positive actions upward** ("did you nourish yourself today?"). It MUST NOT drift toward intake surveillance:

- **No calorie tracking, no weight, no macros, no portion sizes, no "remaining" deficits.**
- **No per-event audit trail** — only daily counts are stored (see schema §4.45), never a timestamped log of every glass/bite.
- Framing is always supportive and additive ("4 glasses — nice"), never restrictive or comparative ("only 4 glasses," "2 below target").
- This keeps the feature firmly in supportive-scaffolding territory and away from anything that could reinforce disordered-eating patterns. If future feature requests push toward detailed intake logging, escalate — that's a wellbeing line we don't cross.

### 18.7 Hard Rules For Nourishment HUD Design

- Bottom-left placement; never blocks the main task column (Rule 6 keeps the task area single-column and clear).
- Amber → green only; **no red anywhere** (Rule 1).
- Reminders de-escalate; never nag (pulse → glow → quiet).
- Silence on a miss; celebration on a hit (Rules 2, 3, 5).
- No calorie/weight/macro tracking, ever (§18.6).
- Fully disableable.
- Count-pop animation respects `prefers-reduced-motion` (Rule 9).

---

## 19. Admin Surface Design Notes

The admin section (introduced in M2 per doc 06) follows the same design system as the rest of the app — no exceptions. Hard design rules:

### What's the Same as User-Facing UI

- All color tokens (no red anywhere — even for "danger" admin actions)
- All typography
- Single-column layouts for forms (admin doesn't get to violate this)
- Minimum 44×44 touch targets
- prefers-color-scheme honored
- All same accessibility requirements

### What's Different (Admin-Specific)

- **"ADMIN MODE" persistent banner** at top of all `/admin/*` routes
  - Color: `bg-amber-700/20 text-amber-200` (warm but not alarming)
  - Reminds the admin they're in privileged context
  - Cannot be dismissed
  
- **Destructive actions show extra friction** (not red — instead use a confirmation modal pattern)
  - "Are you sure you want to suspend this user?" modal
  - Justification textarea required (per spec — can't bypass)
  - Two-step confirmation: type the user's email to confirm
  - Use `text-fuchsia-400` for the warning text (NOT red)
  
- **Audit log entries** use a monospace font for the technical fields
  - Action key, timestamps, IDs in `font-mono`
  - Justification text in regular sans-serif (it's prose)

### What Admin Surfaces NEVER Have

- Red color (the global ban applies here too)
- Sound effects (the badge celebration sounds, etc. — admin work is serious, not gamified)
- Marketing language or promotional CTAs
- "Streaks" or any gamification of moderation actions
- Real-time updates that could cause whiplash (admin work needs to be deliberate; sync polling at 30s instead of 5s is fine here)

### Component Examples

```tsx
// Destructive admin action button
<Button
  variant="warning"  // Uses fuchsia, not red
  className="border-fuchsia-700 text-fuchsia-300 hover:bg-fuchsia-950"
  onClick={() => setShowConfirmModal(true)}
>
  Suspend User
</Button>

// Admin banner (always present)
<div className="sticky top-0 bg-amber-700/20 text-amber-200 px-4 py-2 text-sm font-medium border-b border-amber-700/30">
  ADMIN MODE — All actions are logged
</div>
```

---

## 20. Acceptance Criteria

The design system is "done" when:

- [ ] All component variants render in a Storybook (or equivalent)
- [ ] All color tokens defined in CSS and Tailwind config
- [ ] Red is impossible to use without a build error
- [ ] axe-core passes 0 violations on every component
- [ ] Every component has a documented use case
- [ ] Reduced-motion preference is honored everywhere
- [ ] Both dark and light modes pass WCAG AAA on body text
- [ ] Touch targets are 44×44px minimum throughout
- [ ] No custom-drawn icons; all icons from Lucide
- [ ] Single-column layout enforced on all main task surfaces
- [ ] Component library has TypeScript types and prop documentation
- [ ] Admin surfaces inherit all design rules (no red, no streaks, accessibility maintained)
- [ ] Admin "ADMIN MODE" banner persistent on all /admin/* routes
- [ ] Destructive admin actions use fuchsia warning color (not red) with confirmation friction
- [ ] Animation tokens defined (micro/soft/satisfying/celebrate)
- [ ] All animations honor prefers-reduced-motion
- [ ] No flashing colors faster than 3Hz anywhere (photosensitivity)
- [ ] Quest Log mode toggle works without changing accessibility characteristics
- [ ] Mini-games inherit dark mode tokens, no neon colors
- [ ] Mini-game pause button always visible during play
- [ ] Mini-game "Skip to task" button always visible during play
- [ ] Speed Run UI uses amber framing, never red
- [ ] Movement prompt UI has both neutral and anti-shame variants
- [ ] Biddy avatar inventory: 6 creature avatars + 3 humanoid companions (separate categories)
- [ ] Biddy makes no eye contact with user (looks at work, not camera)
- [ ] Biddy never displays speech bubbles or text
- [ ] Biddy never reacts emotionally to user's progress
- [ ] Biddy 90-min soft limit prompt offers extend/break/end options
- [ ] Biddy 4-hour daily cap is HARD (cannot be overridden)
- [ ] Biddy daily cap message suggests human alternatives
- [ ] First Biddy session shows explicit healthy-use framing
- [ ] Elapsed time hidden by default during all tasks
- [ ] When elapsed time enabled, updates only once per minute (not per second)
- [ ] Elapsed time NEVER changes color based on duration
- [ ] Time exceeded estimate shows neutral "calibration data" framing (no red, no sad)
- [ ] Pro ETC suggestion UI shows source data (transparency)
- [ ] Mindfulness bar persistent on all main app surfaces
- [ ] Mindfulness bar hidden during focus mode, Biddy fullscreen, mini-games
- [ ] "Quick Reset" button uses fuchsia accent (NOT red)
- [ ] Acute flow goes directly to 5-4-3-2-1 (no menu intermediary)
- [ ] First-time use of "Quick Reset" shows brief intro (once)
- [ ] Exercise library card layout consistent (no premium badges, no rankings)
- [ ] Body scan card has ⓘ cautions icon
- [ ] Body scan first-use auto-shows cautions note
- [ ] Guided exercise UI shows ONE step at a time (no peeking ahead)
- [ ] Exit button (✕) reachable in 1 tap during all exercises
- [ ] No timer countdown visible during exercises
- [ ] System suggestion toast auto-dismisses after 8 seconds
- [ ] No streak counters or completion percentages anywhere in mindfulness UI
