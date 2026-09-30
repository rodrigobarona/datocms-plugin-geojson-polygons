export type LngLat = [number, number];

export type Bounds = [[number, number], [number, number]];

export function pointsEqual(a: LngLat, b: LngLat): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

export function closeRing(points: LngLat[]): LngLat[] {
  const first = points[0];
  const last = points.at(-1);

  if (!first || !last || pointsEqual(first, last)) {
    return points;
  }

  return [...points, first];
}

export function openRing(points: LngLat[]): LngLat[] {
  const first = points[0];
  const last = points.at(-1);

  if (points.length > 1 && first && last && pointsEqual(first, last)) {
    return points.slice(0, -1);
  }

  return points;
}

/** Same shoelace test as `@turf/boolean-clockwise`, on a closed ring. */
export function isClockwise(ring: LngLat[]): boolean {
  let sum = 0;

  for (let index = 1; index < ring.length; index += 1) {
    const [x1, y1] = ring[index - 1]!;
    const [x2, y2] = ring[index]!;
    sum += (x2 - x1) * (y2 + y1);
  }

  return sum > 0;
}

/** RFC 7946 requires exterior rings to be counter-clockwise. */
export function toCounterClockwiseRing(points: LngLat[]): LngLat[] {
  const ring = closeRing(points);

  if (ring.length < 4 || !isClockwise(ring)) {
    return ring;
  }

  return ring.slice().reverse();
}

export function getBounds(points: LngLat[]): Bounds | null {
  const first = points[0];

  if (!first) {
    return null;
  }

  let [minLng, minLat] = first;
  let [maxLng, maxLat] = first;

  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function isValidLngLat(lng: number, lat: number): boolean {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

export function isLngLat(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    isValidLngLat(value[0], value[1])
  );
}
