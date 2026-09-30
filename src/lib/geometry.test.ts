import { describe, expect, it } from 'vitest';
import {
  closeRing,
  getBounds,
  isClockwise,
  openRing,
  toCounterClockwiseRing,
  type LngLat,
} from './geometry';

const clockwise: LngLat[] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
];

describe('rings', () => {
  it('closes and opens rings without duplicating the first point', () => {
    const closed = closeRing(clockwise);
    expect(closed).toHaveLength(5);
    expect(closeRing(closed)).toHaveLength(5);
    expect(openRing(closed)).toEqual(clockwise);
  });

  it('reverses clockwise rings to counter-clockwise', () => {
    expect(isClockwise(closeRing(clockwise))).toBe(true);
    const ring = toCounterClockwiseRing(clockwise);
    expect(isClockwise(ring)).toBe(false);
    expect(ring[0]).toEqual(ring.at(-1));
  });

  it('keeps counter-clockwise rings as they are', () => {
    const ccw = clockwise.slice().reverse();
    expect(toCounterClockwiseRing(ccw)).toEqual(closeRing(ccw));
  });
});

describe('getBounds', () => {
  it('returns null for no points and a box otherwise', () => {
    expect(getBounds([])).toBeNull();
    expect(getBounds(clockwise)).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });
});
