import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import {
  Button,
  ButtonGroup,
  ButtonGroupButton,
  Canvas,
  FieldError,
  FieldHint,
  TextareaField,
} from 'datocms-react-ui';
import MapView, { type MapViewHandlers } from '../../components/MapView';
import type { BasemapId } from '../../lib/basemaps';
import { createEditorState, editorReducer } from '../../lib/editorState';
import { serializeShapes, shapesFromFieldValue } from '../../lib/fieldValue';
import { ImportError, parseImportText } from '../../lib/importText';
import { getValueAtPath, normalizePluginParameters } from '../../lib/parameters';
import { canClose, findShape, getShapeColor, isPolygon } from '../../lib/shapes';
import styles from './PolygonField.module.css';

type PolygonFieldProps = {
  ctx: RenderFieldExtensionCtx;
};

const COORDINATE_DIGITS = 6;

function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export default function PolygonField({ ctx }: PolygonFieldProps) {
  const defaults = normalizePluginParameters(ctx.plugin.attributes.parameters);
  const [state, dispatch] = useReducer(editorReducer, undefined, () =>
    createEditorState(shapesFromFieldValue(getValueAtPath(ctx.formValues, ctx.fieldPath))),
  );
  const [basemapId, setBasemapId] = useState<BasemapId>(defaults.basemap);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string>();
  const lastSavedRef = useRef(serializeShapes(state.shapes));

  const { shapes, activeShapeId, isDragging } = state;
  const activeShape = findShape(shapes, activeShapeId);
  const polygonCount = shapes.filter(isPolygon).length;
  const disabled = ctx.disabled;

  useEffect(() => {
    if (isDragging || disabled) {
      return;
    }

    const next = serializeShapes(shapes);

    if (next !== lastSavedRef.current) {
      lastSavedRef.current = next;
      void ctx.setFieldValue(ctx.fieldPath, next);
    }
  }, [ctx, disabled, isDragging, shapes]);

  const handlers = useMemo<MapViewHandlers>(
    () => ({
      onAddPoint: (point) => dispatch({ type: 'addPoint', point }),
      onRemovePoint: (shapeId, pointIndex) =>
        dispatch({ type: 'removePoint', shapeId, pointIndex }),
      onSelectShape: (shapeId) => dispatch({ type: 'selectShape', shapeId }),
      onBeginDrag: () => dispatch({ type: 'beginDrag' }),
      onMoveVertex: (shapeId, pointIndex, point) =>
        dispatch({ type: 'moveVertex', shapeId, pointIndex, point }),
      onEndDrag: () => dispatch({ type: 'endDrag' }),
    }),
    [],
  );

  async function handleClearAll() {
    const confirmed = await ctx.openConfirm({
      title: 'Remove all polygons?',
      content: 'This clears the field. You can still undo it before saving the record.',
      choices: [{ label: 'Remove all', value: true, intent: 'negative' }],
      cancel: { label: 'Cancel', value: false },
    });

    if (confirmed) {
      dispatch({ type: 'clearAll' });
    }
  }

  function handleImport() {
    try {
      const imported = parseImportText(importText);
      dispatch({ type: 'importShapes', shapes: imported });
      setImportOpen(false);
      setImportText('');
      setImportError(undefined);

      const open = imported.filter((shape) => !shape.isClosed).length;
      ctx.notice(
        `Imported ${pluralize(imported.length, 'shape')}.` +
          (open > 0 ? ` ${pluralize(open, 'open shape')} will be saved once closed.` : ''),
      );
    } catch (error) {
      setImportError(error instanceof ImportError ? error.message : 'Could not import coordinates.');
    }
  }

  return (
    <Canvas ctx={ctx}>
      <div className={styles.toolbar}>
        <div className={styles.actions}>
          <Button
            type="button"
            buttonSize="s"
            disabled={disabled || !activeShape || !canClose(activeShape)}
            onClick={() => dispatch({ type: 'closeShape' })}
          >
            Close shape
          </Button>
          <Button
            type="button"
            buttonSize="s"
            disabled={disabled || (activeShape !== null && activeShape.points.length === 0)}
            onClick={() => dispatch({ type: 'newShape' })}
          >
            New polygon
          </Button>
          <Button
            type="button"
            buttonSize="s"
            buttonType="muted"
            disabled={disabled || state.past.length === 0}
            onClick={() => dispatch({ type: 'undo' })}
          >
            Undo
          </Button>
        </div>
      </div>

      <MapView
        shapes={shapes}
        activeShapeId={activeShapeId}
        basemapId={basemapId}
        center={defaults.center}
        zoom={defaults.zoom}
        fitRequest={state.fitRequest}
        disabled={disabled}
        onBasemapChange={setBasemapId}
        {...handlers}
      />

      {shapes.length > 0 ? (
        <div className={styles.shapes}>
          <ButtonGroup>
            {shapes.map((shape, index) => (
              <ButtonGroupButton
                key={shape.id}
                selected={shape.id === activeShapeId}
                onClick={() => dispatch({ type: 'selectShape', shapeId: shape.id })}
              >
                <span
                  className={styles.swatch}
                  style={{ backgroundColor: getShapeColor(index) }}
                />
                {isPolygon(shape) ? `Polygon ${index + 1}` : `Draft ${index + 1}`}
              </ButtonGroupButton>
            ))}
          </ButtonGroup>
        </div>
      ) : null}

      {activeShape && !activeShape.isClosed && activeShape.points.length > 0 ? (
        <FieldHint>
          This shape is still open and is not saved yet. Add at least three points, then
          press “Close shape”.
        </FieldHint>
      ) : null}

      {activeShape && activeShape.points.length > 0 ? (
        <div className={styles.coordinates}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Latitude</th>
                <th>Longitude</th>
              </tr>
            </thead>
            <tbody>
              {activeShape.points.map(([lng, lat], index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{lat.toFixed(COORDINATE_DIGITS)}</td>
                  <td>{lng.toFixed(COORDINATE_DIGITS)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className={styles.footer}>
        <FieldHint>
          {polygonCount > 0
            ? `Saved as a GeoJSON FeatureCollection with ${pluralize(polygonCount, 'polygon')}.`
            : 'No polygons saved yet.'}
        </FieldHint>
        <div className={styles.actions}>
          <Button
            type="button"
            buttonSize="s"
            buttonType="muted"
            disabled={shapes.length === 0}
            onClick={() => dispatch({ type: 'fitToShapes' })}
          >
            Fit to polygons
          </Button>
          <Button
            type="button"
            buttonSize="s"
            buttonType="muted"
            disabled={disabled}
            onClick={() => setImportOpen((open) => !open)}
          >
            {importOpen ? 'Cancel import' : 'Import'}
          </Button>
          <Button
            type="button"
            buttonSize="s"
            buttonType="muted"
            disabled={disabled || !activeShape}
            onClick={() => dispatch({ type: 'deleteActiveShape' })}
          >
            Delete polygon
          </Button>
          <Button
            type="button"
            buttonSize="s"
            buttonType="negative"
            disabled={disabled || shapes.length === 0}
            onClick={() => void handleClearAll()}
          >
            Clear all
          </Button>
        </div>
      </div>

      {importOpen ? (
        <div className={styles.import}>
          <TextareaField
            id={`${ctx.fieldPath}-import`}
            name="import"
            label="Coordinates or GeoJSON"
            hint="Paste GeoJSON (FeatureCollection, Feature, Polygon, MultiPolygon), a coordinate array, or one “longitude, latitude” pair per line. Separate shapes with a blank line."
            placeholder={'-9.1393, 38.7223\n-9.1350, 38.7250\n-9.1300, 38.7200'}
            value={importText}
            onChange={(value) => {
              setImportText(value);
              setImportError(undefined);
            }}
            textareaInputProps={{ rows: 6, monospaced: true }}
          />
          {importError ? <FieldError>{importError}</FieldError> : null}
          <div className={styles.importActions}>
            <Button
              type="button"
              buttonSize="s"
              buttonType="primary"
              disabled={!importText.trim()}
              onClick={handleImport}
            >
              Add to map
            </Button>
          </div>
        </div>
      ) : null}
    </Canvas>
  );
}
