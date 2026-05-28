/**
 * Biddy Animation Selector
 * ------------------------
 * Weighted-random selection of Biddy animations per (creature × activity) context.
 *
 * Usage:
 *   import { pickAnimation, getContext } from './biddy-animation-selector';
 *   const anim = pickAnimation('cat-laptop');   // -> { slot, file, label, weight, placeholder }
 *   // render `/avatars/biddy/cat-laptop/${anim.file}`
 *
 * Design notes:
 * - Weights need not sum to 100; we normalize against the running total.
 * - Placeholders are still selectable by default (so the rotation feels full while real
 *   files are pending). Pass { excludePlaceholders: true } to skip them.
 * - To avoid the same animation repeating back-to-back, pass the previous slot via
 *   { avoidSlot }. If every candidate is the avoided slot (degenerate), it is allowed.
 */

export interface BiddyAnimation {
  slot: string;
  file: string;
  label: string;
  weight: number;
  placeholder: boolean;
}

export interface BiddyContext {
  creature: string;
  activity: string;
  animations: BiddyAnimation[];
}

export interface AnimationManifest {
  version: number;
  defaults: { mainWeight: number; variationWeight: number };
  contexts: Record<string, BiddyContext | unknown>;
}

export interface PickOptions {
  /** Skip animations flagged placeholder. Default false. */
  excludePlaceholders?: boolean;
  /** Avoid returning this slot if any alternative exists (prevents immediate repeats). */
  avoidSlot?: string;
  /** Inject a custom RNG for tests. Defaults to Math.random. Must return [0, 1). */
  rng?: () => number;
}

/**
 * Type guard: a manifest entry is a real context (not the $futureContexts string note).
 */
function isContext(value: unknown): value is BiddyContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'animations' in value &&
    Array.isArray((value as BiddyContext).animations)
  );
}

/**
 * Resolve a context by key (e.g. "cat-laptop") from a loaded manifest.
 * Returns null if the key is missing or not a real context.
 */
export function getContext(
  manifest: AnimationManifest,
  contextKey: string,
): BiddyContext | null {
  const raw = manifest.contexts[contextKey];
  return isContext(raw) ? raw : null;
}

/**
 * Weighted-random pick from a list of animations.
 * Returns the chosen animation, or null if the candidate list is empty.
 */
export function pickFrom(
  animations: BiddyAnimation[],
  options: PickOptions = {},
): BiddyAnimation | null {
  const rng = options.rng ?? Math.random;

  let candidates = animations;

  if (options.excludePlaceholders) {
    const real = candidates.filter((a) => !a.placeholder);
    // Only narrow if at least one real animation exists; otherwise fall back to all.
    if (real.length > 0) candidates = real;
  }

  if (options.avoidSlot) {
    const without = candidates.filter((a) => a.slot !== options.avoidSlot);
    // Only narrow if something remains; never end up with an empty list.
    if (without.length > 0) candidates = without;
  }

  if (candidates.length === 0) return null;

  const total = candidates.reduce((sum, a) => sum + Math.max(0, a.weight), 0);
  if (total <= 0) {
    // All weights zero/negative: fall back to uniform pick.
    return candidates[Math.floor(rng() * candidates.length)] ?? null;
  }

  let r = rng() * total;
  for (const a of candidates) {
    r -= Math.max(0, a.weight);
    if (r <= 0) return a;
  }
  // Floating-point fallthrough guard.
  return candidates[candidates.length - 1] ?? null;
}

/**
 * Convenience: pick directly from a manifest + context key.
 * Throws if the context key is unknown (fail fast — a missing context is a bug).
 */
export function pickAnimation(
  manifest: AnimationManifest,
  contextKey: string,
  options: PickOptions = {},
): BiddyAnimation {
  const ctx = getContext(manifest, contextKey);
  if (!ctx) {
    throw new Error(`Biddy animation context not found: "${contextKey}"`);
  }
  const picked = pickFrom(ctx.animations, options);
  if (!picked) {
    throw new Error(`No selectable animations for context: "${contextKey}"`);
  }
  return picked;
}

/**
 * Build the asset path for a chosen animation.
 * Adjust BASE to wherever the SVGs are served from.
 */
const BASE = '/avatars/biddy';
export function animationPath(contextKey: string, anim: BiddyAnimation): string {
  return `${BASE}/${contextKey}/${anim.file}`;
}
