import type { LngLat } from './geometry';

const EARTH_RADIUS_METERS = 6_378_137;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineMeters(a: LngLat, b: LngLat): number {
  const dLat = toRadians(b[1] - a[1]);
  const dLng = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

function interpolate(a: LngLat, b: LngLat, t: number): LngLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Ternary search along the segment; distance to a segment is unimodal. */
export function pointToSegmentDistanceMeters(
  point: LngLat,
  start: LngLat,
  end: LngLat,
): number {
  if (haversineMeters(start, end) === 0) {
    return haversineMeters(point, start);
  }

  let low = 0;
  let high = 1;
  let best = Infinity;

  for (let step = 0; step < 20; step += 1) {
    const t1 = low + (high - low) / 3;
    const t2 = high - (high - low) / 3;
    const d1 = haversineMeters(point, interpolate(start, end, t1));
    const d2 = haversineMeters(point, interpolate(start, end, t2));

    if (d1 < d2) {
      high = t2;
      best = d1;
    } else {
      low = t1;
      best = d2;
    }
  }

  return best;
}

/**
 * Open shapes grow at the end; closed shapes get the point inserted on the
 * nearest edge so the outline stays intact.
 */
export function findInsertionIndex(
  points: LngLat[],
  point: LngLat,
  isClosed: boolean,
): number {
  if (!isClosed || points.length < 2) {
    return points.length;
  }

  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let index = 0; index < points.length; index += 1) {
    const start = points[index]!;
    const end = points[(index + 1) % points.length]!;
    const distance = pointToSegmentDistanceMeters(point, start, end);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex + 1;
}

export function insertPointAt(
  points: LngLat[],
  index: number,
  point: LngLat,
): LngLat[] {
  const clamped = Math.max(0, Math.min(index, points.length));
  return [...points.slice(0, clamped), point, ...points.slice(clamped)];
}

export function replacePointAt(
  points: LngLat[],
  index: number,
  point: LngLat,
): LngLat[] {
  return points.map((existing, existingIndex) =>
    existingIndex === index ? point : existing,
  );
}

export function removePointAt(points: LngLat[], index: number): LngLat[] {
  return points.filter((_, existingIndex) => existingIndex !== index);
}
