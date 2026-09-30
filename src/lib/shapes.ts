import type { LngLat } from './geometry';

export type Shape = {
  id: string;
  points: LngLat[];
  isClosed: boolean;
};

export const MIN_POLYGON_POINTS = 3;

export function createShapeId(): string {
  return crypto.randomUUID();
}

export function createShape(points: LngLat[] = [], isClosed = false): Shape {
  return {
    id: createShapeId(),
    points,
    isClosed: isClosed && points.length >= MIN_POLYGON_POINTS,
  };
}

export function canClose(shape: Shape): boolean {
  return !shape.isClosed && shape.points.length >= MIN_POLYGON_POINTS;
}

export function isPolygon(shape: Shape): boolean {
  return shape.isClosed && shape.points.length >= MIN_POLYGON_POINTS;
}

export function findShape(
  shapes: Shape[],
  shapeId: string | null,
): Shape | null {
  if (!shapeId) {
    return null;
  }

  return shapes.find((shape) => shape.id === shapeId) ?? null;
}

export const SHAPE_COLORS = [
  '#0ea5e9',
  '#8b5cf6',
  '#f59e0b',
  '#10b981',
  '#ec4899',
  '#6366f1',
] as const;

export function getShapeColor(index: number): string {
  return SHAPE_COLORS[index % SHAPE_COLORS.length]!;
}
