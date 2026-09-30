import type { FeatureCollection, Polygon } from 'geojson';
import { toCounterClockwiseRing } from './geometry';
import { shapesFromGeoJson } from './importText';
import { createShape, isPolygon, type Shape } from './shapes';

export type PolygonCollection = FeatureCollection<Polygon, Record<string, never>>;

/** Reads the stored JSON field value; anything unreadable yields no shapes. */
export function shapesFromFieldValue(value: unknown): Shape[] {
  let data = value;

  if (typeof value === 'string') {
    if (!value.trim()) {
      return [];
    }
    try {
      data = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (data === null || data === undefined) {
    return [];
  }

  try {
    return shapesFromGeoJson(data)
      .filter((shape) => shape.isClosed)
      .map((shape) => createShape(shape.points, true));
  } catch {
    return [];
  }
}

export function buildPolygonCollection(shapes: Shape[]): PolygonCollection {
  return {
    type: 'FeatureCollection',
    features: shapes.filter(isPolygon).map((shape) => ({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [toCounterClockwiseRing(shape.points)],
      },
    })),
  };
}

/** Only closed polygons are persisted; an empty collection clears the field. */
export function serializeShapes(shapes: Shape[]): string | null {
  const collection = buildPolygonCollection(shapes);

  if (collection.features.length === 0) {
    return null;
  }

  return JSON.stringify(collection, undefined, 2);
}
