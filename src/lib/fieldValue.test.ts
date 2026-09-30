import { describe, expect, it } from 'vitest';
import { isClockwise, type LngLat } from './geometry';
import { buildPolygonCollection, serializeShapes, shapesFromFieldValue } from './fieldValue';
import { createShape } from './shapes';

const clockwise: LngLat[] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
];

describe('serializeShapes', () => {
  it('stores closed polygons as a counter-clockwise FeatureCollection', () => {
    const collection = buildPolygonCollection([
      createShape(clockwise, true),
      createShape([[5, 5]]),
    ]);

    expect(collection.features).toHaveLength(1);
    const ring = collection.features[0]!.geometry.coordinates[0]!;
    expect(ring).toHaveLength(5);
    expect(isClockwise(ring as LngLat[])).toBe(false);
  });

  it('returns null when there is nothing to save', () => {
    expect(serializeShapes([])).toBeNull();
    expect(serializeShapes([createShape([[1, 1]])])).toBeNull();
  });
});

describe('shapesFromFieldValue', () => {
  it('round-trips a saved value', () => {
    const saved = serializeShapes([createShape(clockwise, true)]);
    const shapes = shapesFromFieldValue(saved);

    expect(shapes).toHaveLength(1);
    expect(shapes[0]?.isClosed).toBe(true);
    expect(shapes[0]?.points).toHaveLength(4);
  });

  it('accepts already-parsed objects', () => {
    const collection = buildPolygonCollection([createShape(clockwise, true)]);
    expect(shapesFromFieldValue(collection)).toHaveLength(1);
  });

  it('treats empty or invalid values as no shapes', () => {
    expect(shapesFromFieldValue(null)).toEqual([]);
    expect(shapesFromFieldValue('')).toEqual([]);
    expect(shapesFromFieldValue('not json')).toEqual([]);
    expect(shapesFromFieldValue('{"type":"Nope"}')).toEqual([]);
  });
});
