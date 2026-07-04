import { describe, it, expect } from 'vitest';
import {
  lerp, easeOutQuad, clamp01,
  spreadAt, scaleAt, opacityAt, yAt, xAt,
} from '../src/funnel.js';

describe('helpers', () => {
  it('lerp interpolates', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
  it('easeOutQuad endpoints', () => {
    expect(easeOutQuad(0)).toBe(0);
    expect(easeOutQuad(1)).toBe(1);
  });
  it('clamp01 clamps', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });
});

describe('spreadAt', () => {
  it('is narrow at the bottom and wide at the top', () => {
    expect(spreadAt(0, 100)).toBeLessThan(10);
    expect(spreadAt(1, 100)).toBeCloseTo(100);
  });
  it('grows monotonically', () => {
    let prev = -Infinity;
    for (let p = 0; p <= 1.001; p += 0.1) {
      const s = spreadAt(p, 100);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });
});

describe('scaleAt', () => {
  it('goes from 0.15 to 1', () => {
    expect(scaleAt(0)).toBeCloseTo(0.15);
    expect(scaleAt(1)).toBeCloseTo(1);
  });
});

describe('opacityAt', () => {
  it('is 0 before spawn, 1 mid-flight, 0 at the top', () => {
    expect(opacityAt(-0.05)).toBe(0);
    expect(opacityAt(0.5)).toBe(1);
    expect(opacityAt(1)).toBe(0);
  });
});

describe('yAt', () => {
  it('maps p to bottom→top of an 800px viewport', () => {
    expect(yAt(0, 800)).toBeCloseTo(-350);
    expect(yAt(1, 800)).toBeCloseTo(520);
  });
});

describe('xAt', () => {
  it('stays near center for lane 0 (wobble only)', () => {
    expect(Math.abs(xAt(0.5, 0, 3.2, 0.7, 400))).toBeLessThanOrEqual(14);
  });
  it('spreads lanes apart at the top', () => {
    const left = xAt(1, -1, 0, 0.1, 400);
    const right = xAt(1, 1, 0, 0.1, 400);
    expect(right - left).toBeGreaterThan(600);
  });
});
