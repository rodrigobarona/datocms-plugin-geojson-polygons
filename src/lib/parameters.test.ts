import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMETERS, getValueAtPath, normalizePluginParameters } from './parameters';

describe('normalizePluginParameters', () => {
  it('falls back to defaults for missing or invalid values', () => {
    expect(normalizePluginParameters(undefined)).toEqual(DEFAULT_PARAMETERS);
    expect(
      normalizePluginParameters({ latitude: 200, longitude: 0, zoom: 99, basemap: 'nope' }),
    ).toEqual(DEFAULT_PARAMETERS);
  });

  it('accepts numeric strings from the settings form', () => {
    expect(
      normalizePluginParameters({ latitude: '40.4', longitude: '-3.7', zoom: '10', basemap: 'dark' }),
    ).toEqual({ center: [-3.7, 40.4], zoom: 10, basemap: 'dark' });
  });
});

describe('getValueAtPath', () => {
  it('reads localized and nested block paths', () => {
    const values = { area: { en: 'x' }, blocks: [{ area: 'y' }] };
    expect(getValueAtPath(values, 'area.en')).toBe('x');
    expect(getValueAtPath(values, 'blocks.0.area')).toBe('y');
    expect(getValueAtPath(values, 'missing.path')).toBeUndefined();
  });
});
