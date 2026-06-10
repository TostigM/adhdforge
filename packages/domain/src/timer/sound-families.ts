/**
 * sound-families.ts — Timer alert sound definitions + anti-habituation selection.
 * ──────────────────────────────────────────────────────────────────────────────
 * M6 synthesizes alert sounds in the browser via the Web Audio API (no recorded
 * asset files). Each "variation" is a parameter spec the client audio engine
 * renders. Families cycle their variations so the same cue never repeats back to
 * back — this prevents auditory habituation (Inviolable rule: no static
 * repeating alert sounds).
 *
 * Pure here: definitions + selection. Synthesis lives client-side.
 *
 * See 06-build-roadmap.md §6.4
 */

export type SoundFamilyKey = 'soft_chimes' | 'singing_bowls' | 'pink_noise_pulse';

/** A short pitched tone (one or more simultaneous frequencies). */
export type ToneSpec = {
  kind: 'tone';
  freqs: number[];
  waveform: 'sine' | 'triangle';
  durationMs: number;
  attackMs: number;
  releaseMs: number;
};

/** A soft filtered-noise burst. */
export type NoiseSpec = {
  kind: 'noise';
  durationMs: number;
  attackMs: number;
  releaseMs: number;
  filterHz: number;
};

export type VariationSpec = ToneSpec | NoiseSpec;

export type SoundFamily = {
  key: SoundFamilyKey;
  displayName: string;
  variations: VariationSpec[];
};

// ─── Definitions ──────────────────────────────────────────────────────────────

const tone = (freqs: number[], waveform: 'sine' | 'triangle', durationMs: number): ToneSpec => ({
  kind: 'tone', freqs, waveform, durationMs, attackMs: 8, releaseMs: durationMs - 8,
});

const noise = (durationMs: number, filterHz: number): NoiseSpec => ({
  kind: 'noise', durationMs, attackMs: 10, releaseMs: durationMs - 10, filterHz,
});

export const SOUND_FAMILIES: Record<SoundFamilyKey, SoundFamily> = {
  soft_chimes: {
    key: 'soft_chimes',
    displayName: 'Soft Chimes',
    variations: [
      tone([659.25, 987.77], 'sine', 650),     // E5 + B5
      tone([523.25, 783.99], 'sine', 650),     // C5 + G5
      tone([587.33, 880.0], 'triangle', 650),  // D5 + A5
      tone([783.99, 1174.66], 'sine', 600),    // G5 + D6
      tone([880.0, 1318.51], 'triangle', 600), // A5 + E6
    ],
  },
  singing_bowls: {
    key: 'singing_bowls',
    displayName: 'Singing Bowls',
    variations: [
      tone([196.0, 392.0], 'sine', 1600),   // G3 + G4
      tone([220.0, 330.0], 'sine', 1600),   // A3 + E4
      tone([261.63, 392.0], 'sine', 1500),  // C4 + G4
      tone([174.61, 261.63], 'sine', 1700), // F3 + C4
      tone([146.83, 220.0], 'sine', 1800),  // D3 + A3
    ],
  },
  pink_noise_pulse: {
    key: 'pink_noise_pulse',
    displayName: 'Pink Noise Pulse',
    variations: [
      noise(400, 900),
      noise(360, 1200),
      noise(440, 700),
    ],
  },
};

export const SOUND_FAMILY_KEYS = Object.keys(SOUND_FAMILIES) as SoundFamilyKey[];

// ─── Anti-habituation selection ───────────────────────────────────────────────

/**
 * Pick the next variation index for a family, never repeating the immediately
 * previous one. `lastIndex` of -1 (or null) means "first play — any variation".
 * `rng` is injectable for deterministic tests.
 */
export function selectNextVariation(
  family: SoundFamilyKey,
  lastIndex: number | null,
  rng: () => number = Math.random,
): number {
  const count = SOUND_FAMILIES[family].variations.length;
  if (count <= 1) return 0;

  // Choose uniformly among the indices that are NOT lastIndex.
  const candidates: number[] = [];
  for (let i = 0; i < count; i++) {
    if (i !== lastIndex) candidates.push(i);
  }
  const pick = Math.floor(rng() * candidates.length);
  // Guard against rng() === 1 producing an out-of-range index.
  return candidates[Math.min(pick, candidates.length - 1)]!;
}
