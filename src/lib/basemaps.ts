import type { StyleSpecification } from 'maplibre-gl';

export const BASEMAP_IDS = ['bright', 'liberty', 'dark', 'satellite'] as const;

export type BasemapId = (typeof BASEMAP_IDS)[number];

export type Basemap = {
  id: BasemapId;
  label: string;
  style: string | StyleSpecification;
};

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
      ],
      tileSize: 256,
      attribution:
        'Imagery © EOX IT Services GmbH (CC BY-NC-SA 4.0) | Contains modified Copernicus Sentinel data 2025',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
};

export const DEFAULT_BASEMAP_ID: BasemapId = 'bright';

export function getBasemap(id: BasemapId): Basemap {
  switch (id) {
    case 'bright':
      return {
        id,
        label: 'Bright',
        style: 'https://tiles.openfreemap.org/styles/bright',
      };
    case 'liberty':
      return {
        id,
        label: 'Liberty',
        style: 'https://tiles.openfreemap.org/styles/liberty',
      };
    case 'dark':
      return {
        id,
        label: 'Dark',
        style: 'https://tiles.openfreemap.org/styles/dark',
      };
    case 'satellite':
      return { id, label: 'Satellite', style: SATELLITE_STYLE };
    default: {
      const unhandled: never = id;
      throw new Error(`Unknown basemap: ${String(unhandled)}`);
    }
  }
}

export function isBasemapId(value: unknown): value is BasemapId {
  return BASEMAP_IDS.some((id) => id === value);
}
