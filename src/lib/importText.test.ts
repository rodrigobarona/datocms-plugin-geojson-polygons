import { describe, expect, it } from 'vitest';
import { ImportError, parseImportText } from './importText';

describe('parseImportText', () => {
  it('parses one lng, lat pair per line and closes three or more points', () => {
    expect(parseImportText('-9.1, 38.7\n-9.2 38.8\n-9.3,38.6')).toEqual([
      {
        points: [
          [-9.1, 38.7],
          [-9.2, 38.8],
          [-9.3, 38.6],
        ],
        isClosed: true,
      },
    ]);
  });

  it('splits line-by-line shapes on blank lines', () => {
    const shapes = parseImportText('0 0\n0 1\n1 1\n\n5 5\n5 6');
    expect(shapes).toHaveLength(2);
    expect(shapes[1]?.isClosed).toBe(false);
  });

  it('drops the repeated closing position of polygon rings', () => {
    const [shape] = parseImportText(
      JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      }),
    );
    expect(shape?.points).toHaveLength(3);
    expect(shape?.isClosed).toBe(true);
  });

  it('reads every polygon from feature collections and multipolygons', () => {
    const ring = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ];
    const text = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } },
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'MultiPolygon', coordinates: [[ring], [ring]] },
        },
      ],
    });
    expect(parseImportText(text)).toHaveLength(3);
  });

  it('accepts raw coordinate arrays', () => {
    expect(parseImportText('[[0,0],[1,0],[1,1]]')[0]?.isClosed).toBe(true);
  });

  it('rejects out-of-range and malformed input', () => {
    expect(() => parseImportText('200, 10\n0, 0')).toThrow(ImportError);
    expect(() => parseImportText('{ nope')).toThrow('Invalid JSON.');
    expect(() => parseImportText('   ')).toThrow(ImportError);
  });
});
