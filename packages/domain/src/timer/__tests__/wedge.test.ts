/**
 * Unit tests: computeWedge
 */

import { describe, it, expect } from 'vitest';
import { computeWedge } from '../wedge';

describe('computeWedge', () => {
  it('is full and fresh at the start', () => {
    const w = computeWedge(0, 1500);
    expect(w.fractionRemaining).toBe(1);
    expect(w.fractionElapsed).toBe(0);
    expect(w.zone).toBe('fresh');
    expect(w.sweepDegrees).toBe(360);
  });

  it('is half remaining at the midpoint (green/mid zone)', () => {
    const w = computeWedge(750, 1500);
    expect(w.fractionRemaining).toBeCloseTo(0.5, 5);
    expect(w.zone).toBe('mid');
    expect(w.sweepDegrees).toBeCloseTo(180, 5);
  });

  it('enters the mauve "soon" zone past two-thirds elapsed', () => {
    expect(computeWedge(1000, 1500).zone).toBe('soon'); // 2/3 elapsed
    expect(computeWedge(1400, 1500).zone).toBe('soon');
  });

  it('zone boundaries: <1/3 fresh, <2/3 mid, else soon', () => {
    expect(computeWedge(0, 300).zone).toBe('fresh');
    expect(computeWedge(99, 300).zone).toBe('fresh');   // 33%
    expect(computeWedge(120, 300).zone).toBe('mid');    // 40%
    expect(computeWedge(220, 300).zone).toBe('soon');   // 73%
  });

  it('clamps when elapsed exceeds planned', () => {
    const w = computeWedge(2000, 1500);
    expect(w.fractionRemaining).toBe(0);
    expect(w.fractionElapsed).toBe(1);
    expect(w.sweepDegrees).toBe(0);
    expect(w.zone).toBe('soon');
  });

  it('treats non-positive planned time as fully elapsed', () => {
    const w = computeWedge(10, 0);
    expect(w.fractionRemaining).toBe(0);
    expect(w.zone).toBe('soon');
  });

  it('handles NaN safely', () => {
    const w = computeWedge(Number.NaN, 1500);
    expect(w.fractionElapsed).toBe(0);
    expect(w.fractionRemaining).toBe(1);
  });
});
