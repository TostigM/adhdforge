/**
 * Unit tests: resolveVibration
 */

import { describe, it, expect } from 'vitest';
import { resolveVibration, VIBRATION_PATTERNS } from '../vibration-patterns';

describe('resolveVibration', () => {
  const on = { hapticsEnabled: true, prefersReducedMotion: false };

  it('returns the pattern when haptics on and motion allowed', () => {
    expect(resolveVibration('interval_chime', on)).toEqual([200]);
    expect(resolveVibration('timer_complete', on)).toEqual([200, 100, 200, 100, 400]);
    expect(resolveVibration('body_check_in_prompt', on)).toEqual([100]);
  });

  it('returns null when haptics disabled', () => {
    expect(resolveVibration('timer_complete', { hapticsEnabled: false, prefersReducedMotion: false })).toBeNull();
  });

  it('returns null under prefers-reduced-motion (vibration is motion)', () => {
    expect(resolveVibration('timer_complete', { hapticsEnabled: true, prefersReducedMotion: true })).toBeNull();
  });

  it('returns a copy, not the shared constant', () => {
    const result = resolveVibration('interval_chime', on);
    expect(result).not.toBe(VIBRATION_PATTERNS.interval_chime);
  });
});
