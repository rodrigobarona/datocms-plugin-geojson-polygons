import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson';
import { getBounds, toCounterClockwiseRing, type Bounds } from './geometry';
import { getShapeColor, isPolygon, type Shape } from './shapes';

type ShapeProperties = {
  shapeId: string;
  color: string;
  isActive: boolean;
};

type PointProperties = ShapeProperties & { pointIndex: number };

export type OverlayData = {
  polygons: FeatureCollection<Polygon, ShapeProperties>;
  lines: FeatureCollection<LineString, ShapeProperties>;
  points: FeatureCollection<Point, PointProperties>;
};

export function buildOverlayData(
  shapes: Shape[],
  activeShapeId: string | null,
): OverlayData {
  const polygons: Feature<Polygon, ShapeProperties>[] = [];
  const lines: Feature<LineString, ShapeProperties>[] = [];
  const points: Feature<Point, PointProperties>[] = [];

  shapes.forEach((shape, shapeIndex) => {
    const properties: ShapeProperties = {
      shapeId: shape.id,
      color: getShapeColor(shapeIndex),
      isActive: shape.id === activeShapeId,
    };

    if (isPolygon(shape)) {
      polygons.push({
        type: 'Feature',
        properties,
        geometry: {
          type: 'Polygon',
          coordinates: [toCounterClockwiseRing(shape.points)],
        },
      });
    } else if (shape.points.length >= 2) {
      lines.push({
        type: 'Feature',
        properties,
        geometry: { type: 'LineString', coordinates: shape.points },
      });
    }

    shape.points.forEach((position, pointIndex) => {
      points.push({
        type: 'Feature',
        properties: { ...properties, pointIndex },
        geometry: { type: 'Point', coordinates: position },
      });
    });
  });

  return {
    polygons: { type: 'FeatureCollection', features: polygons },
    lines: { type: 'FeatureCollection', features: lines },
    points: { type: 'FeatureCollection', features: points },
  };
}

export function getShapesBounds(shapes: Shape[]): Bounds | null {
  return getBounds(shapes.flatMap((shape) => shape.points));
}
