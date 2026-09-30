import { isLngLat, isValidLngLat, openRing, type LngLat } from './geometry';
import { MIN_POLYGON_POINTS } from './shapes';

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export type ImportedShape = {
  points: LngLat[];
  isClosed: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toPoints(value: unknown, label: string): LngLat[] {
  if (!Array.isArray(value)) {
    throw new ImportError(`Invalid ${label} coordinates.`);
  }

  return value.map((position) => {
    if (!isLngLat(position)) {
      throw new ImportError(
        `Invalid position in ${label}: ${JSON.stringify(position)}`,
      );
    }

    return [position[0], position[1]];
  });
}

function fromRing(value: unknown, label: string): ImportedShape {
  const points = openRing(toPoints(value, label));
  return { points, isClosed: points.length >= MIN_POLYGON_POINTS };
}

function fromCoordinateArray(value: unknown[]): ImportedShape[] | null {
  const first = value[0];

  if (isLngLat(first)) {
    return [fromRing(value, 'ring')];
  }

  if (Array.isArray(first) && isLngLat(first[0])) {
    return [fromRing(first, 'Polygon')];
  }

  return null;
}

/** Only exterior rings are kept; holes are not editable. */
function fromGeometry(value: unknown): ImportedShape[] {
  if (!isRecord(value)) {
    return [];
  }

  switch (value.type) {
    case 'Polygon': {
      const rings = value.coordinates;
      if (!Array.isArray(rings) || rings.length === 0) {
        throw new ImportError('Invalid Polygon coordinates.');
      }
      return [fromRing(rings[0], 'Polygon')];
    }
    case 'MultiPolygon': {
      const polygons = value.coordinates;
      if (!Array.isArray(polygons)) {
        throw new ImportError('Invalid MultiPolygon coordinates.');
      }
      return polygons.map((rings: unknown) =>
        fromRing(Array.isArray(rings) ? rings[0] : undefined, 'MultiPolygon'),
      );
    }
    case 'LineString':
      return [{ points: toPoints(value.coordinates, 'LineString'), isClosed: false }];
    case 'GeometryCollection':
      return Array.isArray(value.geometries)
        ? value.geometries.flatMap(fromGeometry)
        : [];
    default:
      return [];
  }
}

export function shapesFromGeoJson(value: unknown): ImportedShape[] {
  if (Array.isArray(value)) {
    const shapes = fromCoordinateArray(value);
    if (!shapes) {
      throw new ImportError('Unsupported JSON array format.');
    }
    return shapes;
  }

  if (!isRecord(value)) {
    throw new ImportError('Invalid GeoJSON.');
  }

  if (value.type === 'FeatureCollection') {
    if (!Array.isArray(value.features)) {
      throw new ImportError('FeatureCollection has no features array.');
    }
    return value.features.flatMap((feature: unknown) =>
      isRecord(feature) ? fromGeometry(feature.geometry) : [],
    );
  }

  if (value.type === 'Feature') {
    return fromGeometry(value.geometry);
  }

  if (typeof value.type === 'string') {
    return fromGeometry(value);
  }

  if (Array.isArray(value.coordinates)) {
    return fromCoordinateArray(value.coordinates) ?? [];
  }

  throw new ImportError(
    'Unsupported GeoJSON. Use a FeatureCollection, Feature, Polygon, MultiPolygon, or LineString.',
  );
}

function parseLine(line: string): LngLat {
  const parts = line.split(/[,;\s]+/).filter(Boolean);

  if (parts.length < 2) {
    throw new ImportError(`Invalid coordinate line: "${line}"`);
  }

  const lng = Number(parts[0]);
  const lat = Number(parts[1]);

  if (!isValidLngLat(lng, lat)) {
    throw new ImportError(`Invalid or out-of-range coordinate: "${line}"`);
  }

  return [lng, lat];
}

/**
 * Accepts GeoJSON, raw coordinate arrays, or one `lng, lat` pair per line.
 * A blank line separates shapes in the line-by-line format.
 */
export function parseImportText(text: string): ImportedShape[] {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new ImportError('Paste coordinates or GeoJSON to import.');
  }

  let shapes: ImportedShape[];

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new ImportError('Invalid JSON.');
    }
    shapes = shapesFromGeoJson(parsed);
  } else {
    shapes = trimmed.split(/\r?\n\s*\r?\n/).map((block) => {
      const points = openRing(
        block
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map(parseLine),
      );
      return { points, isClosed: points.length >= MIN_POLYGON_POINTS };
    });
  }

  const nonEmpty = shapes.filter((shape) => shape.points.length > 0);

  if (nonEmpty.length === 0) {
    throw new ImportError('No coordinates found.');
  }

  return nonEmpty;
}
