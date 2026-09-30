import { DEFAULT_BASEMAP_ID, isBasemapId, type BasemapId } from './basemaps';
import { isValidLngLat, type LngLat } from './geometry';

export type PluginParameters = {
  center: LngLat;
  zoom: number;
  basemap: BasemapId;
};

export const DEFAULT_PARAMETERS: PluginParameters = {
  center: [-9.1393, 38.7223],
  zoom: 12,
  basemap: DEFAULT_BASEMAP_ID,
};

export const MIN_ZOOM = 0;
export const MAX_ZOOM = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

export function normalizePluginParameters(value: unknown): PluginParameters {
  if (!isRecord(value)) {
    return DEFAULT_PARAMETERS;
  }

  const lng = toNumber(value.longitude);
  const lat = toNumber(value.latitude);
  const zoom = toNumber(value.zoom);

  return {
    center: isValidLngLat(lng, lat) ? [lng, lat] : DEFAULT_PARAMETERS.center,
    zoom:
      Number.isFinite(zoom) && zoom >= MIN_ZOOM && zoom <= MAX_ZOOM
        ? zoom
        : DEFAULT_PARAMETERS.zoom,
    basemap: isBasemapId(value.basemap) ? value.basemap : DEFAULT_PARAMETERS.basemap,
  };
}

/** Walks `formValues` with a dotted field path, including block array indexes. */
export function getValueAtPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}
