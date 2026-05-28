# Biddy Animation System

Weighted-random animated SVGs for the Biddy AI body-double companion.

## How it works

Each **(creature × activity)** context has **12 animations**:
- `*-main.svg` — the default action (heavily weighted, ~56%)
- `*-var-01.svg` … `*-var-11.svg` — short idle-flavor variations (~4% each)

At runtime, `biddy-animation-selector.ts` reads `animation-manifest.json` and does a weighted random pick. This keeps Biddy lively and non-repetitive.

## Files in this slice (cat-laptop)

| File | Action | Real? |
|---|---|---|
| `cat-laptop-main.svg` | Typing | ✅ real |
| `cat-laptop-var-01.svg` | Sipping coffee | ✅ real |
| `cat-laptop-var-02.svg` | Stretching | ✅ real |
| `cat-laptop-var-03.svg` | Moving the mouse | ✅ real |
| `cat-laptop-var-04.svg` | Pause and glance | ✅ real |
| `cat-laptop-var-05.svg` … `-11.svg` | Placeholder copies | ⏳ replace later |

## Conventions

- **Naming:** `{creature}-{activity}-main.svg`, `{creature}-{activity}-var-NN.svg`
- **Self-contained:** each SVG embeds its own `<style>` CSS animation. Drop it anywhere; it animates. No build step.
- **Reduced motion:** every file disables animation under `@media (prefers-reduced-motion: reduce)`. Do not remove this.
- **Palette:** design-system tokens only. No red. Creature faces away from viewer (WSW three-quarter), looking at its own work.
- **Shared base:** within a context, all 12 share the same head/tail/body/prop; only a small overlay changes per variation. Keep the base identical across the set so they read as one creature.

## Adding real animations later

1. Build the new animation reusing the exact base from `*-main.svg`
2. Save as the next `var-NN.svg`, overwriting the placeholder copy
3. Flip `"placeholder": false` for that slot in `animation-manifest.json`
4. Adjust the weight if desired (weights need not sum to 100; the selector normalizes)

## Selector usage

```ts
import manifest from './animation-manifest.json';
import { pickAnimation, animationPath } from './biddy-animation-selector';

const anim = pickAnimation(manifest, 'cat-laptop', { avoidSlot: lastSlot });
const src = animationPath('cat-laptop', anim); // /avatars/biddy/cat-laptop/cat-laptop-var-02.svg
lastSlot = anim.slot;
```

Options:
- `excludePlaceholders: true` — skip placeholder slots (use once enough real ones exist)
- `avoidSlot: '<slot>'` — prevent the same animation playing twice in a row
- `rng: () => number` — inject a deterministic RNG for tests

## Full vision

6 creatures (cat, robot, blob, plant, fox, owl) × 4 activities (computer, reading, knitting, cleaning) × 12 slots = **288 files**. Replicate this folder's pattern per context. The infrastructure (manifest + selector) already supports the full set; only the SVG files need producing.
