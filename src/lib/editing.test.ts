import { describe, expect, it } from 'vitest';
import {
  findInsertionIndex,
  insertPointAt,
  removePointAt,
  replacePointAt,
} from './editing';
import type { LngLat } from './geometry';

const square: LngLat[] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
];

describe('findInsertionIndex', () => {
  it('appends to open shapes', () => {
    expect(findInsertionIndex(square, [0.5, 0.5], false)).toBe(4);
  });

  it('inserts on the nearest edge of closed shapes', () => {
    expect(findInsertionIndex(square, [0.5, 1.01], true)).toBe(2);
    expect(findInsertionIndex(square, [0.5, -0.01], true)).toBe(4);
  });
});

describe('point edits', () => {
  it('inserts, replaces, and removes points', () => {
    expect(insertPointAt(square, 1, [9, 9])[1]).toEqual([9, 9]);
    expect(replacePointAt(square, 0, [9, 9])[0]).toEqual([9, 9]);
    expect(removePointAt(square, 0)).toEqual(square.slice(1));
  });
});
