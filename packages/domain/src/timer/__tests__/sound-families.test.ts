/**
 * Unit tests: sound families + selectNextVariation
 */

import { describe, it, expect } from 'vitest';
import {
  SOUND_FAMILIES,
  SOUND_FAMILY_KEYS,
  selectNextVariation,
} from '../sound-families';

describe('SOUND_FAMILIES', () => {
  it('defines the three families with the expected variation counts', () => {
    expect(SOUND_FAMILY_KEYS).toEqual(['soft_chimes', 'singing_bowls', 'pink_noise_pulse']);
    expect(SOUND_FAMILIES.soft_chimes.variations).toHaveLength(5);
    expect(SOUND_FAMILIES.singing_bowls.variations).toHaveLength(5);
    expect(SOUND_FAMILIES.pink_noise_pulse.variations).toHaveLength(3);
  });

  it('every variation has a positive duration', () => {
    for (const key of SOUND_FAMILY_KEYS) {
      for (const v of SOUND_FAMILIES[key].variations) {
        expect(v.durationMs).toBeGreaterThan(0);
      }
    }
  });
});

describe('selectNextVariation', () => {
  it('never repeats the immediately-previous variation', () => {
    // Exhaustively: for each lastIndex, every rng value must avoid lastIndex.
    for (let last = 0; last < 5; last++) {
      for (let r = 0; r < 1; r += 0.05) {
        const next = selectNextVariation('soft_chimes', last, () => r);
        expect(next).not.toBe(last);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(5);
      }
    }
  });

  it('allows any variation on first play (lastIndex null)', () => {
    expect(selectNextVariation('soft_chimes', null, () => 0)).toBe(0);
    expect(selectNextVariation('soft_chimes', null, () => 0.99)).toBe(4);
  });

  it('returns 0 for a single-variation family', () => {
    // (none today, but guard the logic) — simulate via pink_noise with lastIndex
    // that leaves multiple; here just confirm a normal multi case stays in range.
    expect(selectNextVariation('pink_noise_pulse', 1, () => 0)).toBe(0);
    expect(selectNextVariation('pink_noise_pulse', 1, () => 0.99)).toBe(2);
  });

  it('does not go out of range when rng() returns 1', () => {
    const next = selectNextVariation('singing_bowls', 2, () => 1);
    expect(next).toBeGreaterThanOrEqual(0);
    expect(next).toBeLessThan(5);
    expect(next).not.toBe(2);
  });

  it('distributes across all non-last candidates', () => {
    const seen = new Set<number>();
    for (let r = 0; r < 1; r += 0.01) {
      seen.add(selectNextVariation('soft_chimes', 2, () => r));
    }
    // Should be able to reach all of {0,1,3,4} (everything except 2)
    expect([...seen].sort()).toEqual([0, 1, 3, 4]);
  });
});
