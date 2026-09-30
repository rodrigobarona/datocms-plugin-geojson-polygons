import { useEffect, useRef, useState } from 'react';
import {
  Map as MapLibreMap,
  NavigationControl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
  type MapLayerTouchEvent,
  type MapMouseEvent,
  type MapTouchEvent,
  type PointLike,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getBasemap, type BasemapId } from '../lib/basemaps';
import BasemapControl from './BasemapControl';
import type { LngLat } from '../lib/geometry';
import { configureMapLibreWorker, isCoarsePointer } from '../lib/maplibre';
import { buildOverlayData, getShapesBounds } from '../lib/overlay';
import type { Shape } from '../lib/shapes';
import styles from './MapView.module.css';

configureMapLibreWorker();

const SOURCES = {
  polygons: 'geojson-polygons-polygons',
  lines: 'geojson-polygons-lines',
  points: 'geojson-polygons-points',
} as const;

const LAYERS = {
  fill: 'geojson-polygons-fill',
  outline: 'geojson-polygons-outline',
  line: 'geojson-polygons-line',
  points: 'geojson-polygons-points',
} as const;

const SHAPE_LAYERS = [LAYERS.fill, LAYERS.outline, LAYERS.line];

const TAP_MOVE_THRESHOLD_PX = 12;

type Vertex = { shapeId: string; pointIndex: number };

export type MapViewHandlers = {
  onAddPoint: (point: LngLat) => void;
  onRemovePoint: (shapeId: string, pointIndex: number) => void;
  onSelectShape: (shapeId: string) => void;
  onBeginDrag: () => void;
  onMoveVertex: (shapeId: string, pointIndex: number, point: LngLat) => void;
  onEndDrag: () => void;
};

type MapViewProps = MapViewHandlers & {
  shapes: Shape[];
  activeShapeId: string | null;
  basemapId: BasemapId;
  center: LngLat;
  zoom: number;
  fitRequest: number;
  disabled: boolean;
  onBasemapChange: (id: BasemapId) => void;
};

function addOverlay(map: MapLibreMap): void {
  const empty = { type: 'FeatureCollection' as const, features: [] };

  for (const source of Object.values(SOURCES)) {
    if (!map.getSource(source)) {
      map.addSource(source, { type: 'geojson', data: empty });
    }
  }

  const isActive: ExpressionSpecification = ['boolean', ['get', 'isActive'], false];

  if (!map.getLayer(LAYERS.fill)) {
    map.addLayer({
      id: LAYERS.fill,
      type: 'fill',
      source: SOURCES.polygons,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': ['case', isActive, 0.3, 0.15],
      },
    });
  }

  if (!map.getLayer(LAYERS.outline)) {
    map.addLayer({
      id: LAYERS.outline,
      type: 'line',
      source: SOURCES.polygons,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['case', isActive, 3, 2],
      },
    });
  }

  if (!map.getLayer(LAYERS.line)) {
    map.addLayer({
      id: LAYERS.line,
      type: 'line',
      source: SOURCES.lines,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['case', isActive, 3, 2],
        'line-dasharray': [2, 1],
      },
    });
  }

  if (!map.getLayer(LAYERS.points)) {
    map.addLayer({
      id: LAYERS.points,
      type: 'circle',
      source: SOURCES.points,
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5,
          ['case', isActive, 3, 2],
          14,
          ['case', isActive, 7, 4],
          18,
          ['case', isActive, 9, 5],
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 5, 1, 14, 2],
      },
    });
  }
}

function updateOverlay(map: MapLibreMap, shapes: Shape[], activeShapeId: string | null): void {
  const overlay = buildOverlayData(shapes, activeShapeId);
  map.getSource<GeoJSONSource>(SOURCES.polygons)?.setData(overlay.polygons);
  map.getSource<GeoJSONSource>(SOURCES.lines)?.setData(overlay.lines);
  map.getSource<GeoJSONSource>(SOURCES.points)?.setData(overlay.points);
}

function fitToShapes(map: MapLibreMap, shapes: Shape[], animate: boolean): void {
  const bounds = getShapesBounds(shapes);

  if (!bounds) {
    return;
  }

  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  const duration = animate ? 600 : 0;

  if (minLng === maxLng && minLat === maxLat) {
    map.easeTo({ center: [minLng, minLat], duration });
    return;
  }

  map.fitBounds(bounds, { padding: 48, maxZoom: 17, duration });
}

function readShapeId(feature: MapGeoJSONFeature | undefined): string | null {
  const shapeId: unknown = feature?.properties.shapeId;
  return typeof shapeId === 'string' ? shapeId : null;
}

function readActiveVertex(feature: MapGeoJSONFeature | undefined): Vertex | null {
  const shapeId = readShapeId(feature);
  const pointIndex: unknown = feature?.properties.pointIndex;

  if (!shapeId || feature?.properties.isActive !== true || typeof pointIndex !== 'number') {
    return null;
  }

  return { shapeId, pointIndex };
}

function vertexAt(map: MapLibreMap, point: PointLike): Vertex | null {
  return readActiveVertex(map.queryRenderedFeatures(point, { layers: [LAYERS.points] })[0]);
}

function shapeAt(map: MapLibreMap, point: PointLike): string | null {
  return readShapeId(map.queryRenderedFeatures(point, { layers: SHAPE_LAYERS })[0]);
}

export default function MapView({
  shapes,
  activeShapeId,
  basemapId,
  center,
  zoom,
  fitRequest,
  disabled,
  onBasemapChange,
  ...handlers
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const handlersRef = useRef(handlers);
  const shapesRef = useRef(shapes);
  const activeShapeIdRef = useRef(activeShapeId);
  const disabledRef = useRef(disabled);
  const initialViewRef = useRef({ center, zoom, basemapId });
  const appliedBasemapRef = useRef(basemapId);
  const appliedFitRef = useRef(0);
  const [mapReady, setMapReady] = useState(false);
  const [isTouch] = useState(isCoarsePointer);

  useEffect(() => {
    handlersRef.current = handlers;
    shapesRef.current = shapes;
    activeShapeIdRef.current = activeShapeId;
    disabledRef.current = disabled;
  });

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const initial = initialViewRef.current;
    const map = new MapLibreMap({
      container,
      style: getBasemap(initial.basemapId).style,
      center: initial.center,
      zoom: initial.zoom,
      cooperativeGestures: true,
      doubleClickZoom: false,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), 'top-left');

    let dragging: Vertex | null = null;
    let didDrag = false;
    let tapStart: { x: number; y: number } | null = null;
    let tapMoved = false;

    const canvasStyle = map.getCanvas().style;

    const startDrag = (event: MapLayerMouseEvent | MapLayerTouchEvent) => {
      const vertex = disabledRef.current ? null : readActiveVertex(event.features?.[0]);

      if (!vertex || ('button' in event.originalEvent && event.originalEvent.button !== 0)) {
        return;
      }

      event.preventDefault();
      dragging = vertex;
      didDrag = false;
      tapStart = null;
      canvasStyle.cursor = 'grabbing';
      map.dragPan.disable();
    };

    const moveDrag = (event: MapMouseEvent | MapTouchEvent) => {
      if (!dragging) {
        return;
      }

      if (!didDrag) {
        didDrag = true;
        handlersRef.current.onBeginDrag();
      }

      handlersRef.current.onMoveVertex(dragging.shapeId, dragging.pointIndex, [
        event.lngLat.lng,
        event.lngLat.lat,
      ]);
    };

    const endDrag = () => {
      if (!dragging) {
        return;
      }

      dragging = null;
      canvasStyle.cursor = '';
      map.dragPan.enable();

      if (didDrag) {
        handlersRef.current.onEndDrag();
      }
    };

    const addOrSelect = (event: MapMouseEvent | MapTouchEvent) => {
      const shapeId = shapeAt(map, event.point);

      if (shapeId && shapeId !== activeShapeIdRef.current) {
        handlersRef.current.onSelectShape(shapeId);
        return;
      }

      handlersRef.current.onAddPoint([event.lngLat.lng, event.lngLat.lat]);
    };

    map.on('mousedown', LAYERS.points, startDrag);
    map.on('touchstart', LAYERS.points, startDrag);
    map.on('mousemove', moveDrag);
    map.on('touchmove', moveDrag);
    map.on('mouseup', endDrag);
    window.addEventListener('mouseup', endDrag);
    map.on('touchend', endDrag);
    map.on('touchcancel', endDrag);

    map.on('mouseenter', LAYERS.points, (event) => {
      if (!dragging && !disabledRef.current && readActiveVertex(event.features?.[0])) {
        canvasStyle.cursor = 'grab';
      }
    });
    map.on('mouseleave', LAYERS.points, () => {
      if (!dragging) {
        canvasStyle.cursor = '';
      }
    });

    map.on('click', (event) => {
      if (disabledRef.current || isCoarsePointer()) {
        return;
      }

      const shapeId = shapeAt(map, event.point);
      if (shapeId && shapeId !== activeShapeIdRef.current) {
        handlersRef.current.onSelectShape(shapeId);
      }
    });

    map.on('contextmenu', (event) => {
      event.preventDefault();

      if (disabledRef.current || isCoarsePointer()) {
        return;
      }

      const vertex = vertexAt(map, event.point);
      if (vertex) {
        handlersRef.current.onRemovePoint(vertex.shapeId, vertex.pointIndex);
        return;
      }

      handlersRef.current.onAddPoint([event.lngLat.lng, event.lngLat.lat]);
    });

    map.on('touchstart', (event) => {
      if (!dragging) {
        didDrag = false;
      }
      tapStart =
        event.originalEvent.touches.length === 1 && !dragging
          ? { x: event.point.x, y: event.point.y }
          : null;
      tapMoved = false;
    });

    map.on('touchmove', (event) => {
      if (
        tapStart &&
        Math.hypot(event.point.x - tapStart.x, event.point.y - tapStart.y) > TAP_MOVE_THRESHOLD_PX
      ) {
        tapMoved = true;
      }
    });

    map.on('touchend', (event) => {
      const isTap = tapStart !== null && !tapMoved && !didDrag;
      tapStart = null;

      if (isTap && event.originalEvent.touches.length === 0 && !disabledRef.current) {
        addOrSelect(event);
      }
    });

    map.on('load', () => {
      addOverlay(map);
      setMapReady(true);
    });

    return () => {
      window.removeEventListener('mouseup', endDrag);
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (map && mapReady) {
      updateOverlay(map, shapes, activeShapeId);
    }
  }, [activeShapeId, mapReady, shapes]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady || fitRequest === appliedFitRef.current) {
      return;
    }

    const isInitialFit = appliedFitRef.current === 0;
    appliedFitRef.current = fitRequest;
    fitToShapes(map, shapesRef.current, !isInitialFit);
  }, [fitRequest, mapReady]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || basemapId === appliedBasemapRef.current) {
      return;
    }

    appliedBasemapRef.current = basemapId;

    // Registered before setStyle: inline styles can finish loading synchronously.
    map.once('style.load', () => {
      addOverlay(map);
      updateOverlay(map, shapesRef.current, activeShapeIdRef.current);
    });
    map.setStyle(getBasemap(basemapId).style);
  }, [basemapId]);

  const hint = disabled
    ? 'This field is read-only.'
    : isTouch
      ? 'Tap to add points, drag vertices to move them, use two fingers to pan.'
      : 'Right-click to add a point, right-click a vertex to remove it, drag vertices to move them.';

  return (
    <div className={styles.frame}>
      <div ref={containerRef} className={styles.map} />
      <BasemapControl value={basemapId} onChange={onBasemapChange} />
      <div className={styles.hint}>{hint}</div>
    </div>
  );
}
