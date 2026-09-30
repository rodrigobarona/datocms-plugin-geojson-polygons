import {
  findInsertionIndex,
  insertPointAt,
  removePointAt,
  replacePointAt,
} from './editing';
import type { LngLat } from './geometry';
import type { ImportedShape } from './importText';
import { canClose, createShape, findShape, MIN_POLYGON_POINTS, type Shape } from './shapes';

const HISTORY_LIMIT = 50;

export type EditorState = {
  shapes: Shape[];
  activeShapeId: string | null;
  past: Shape[][];
  isDragging: boolean;
  /** Bumped whenever the map should re-fit to the shapes. */
  fitRequest: number;
};

export type EditorAction =
  | { type: 'addPoint'; point: LngLat }
  | { type: 'removePoint'; shapeId: string; pointIndex: number }
  | { type: 'beginDrag' }
  | { type: 'moveVertex'; shapeId: string; pointIndex: number; point: LngLat }
  | { type: 'endDrag' }
  | { type: 'closeShape' }
  | { type: 'newShape' }
  | { type: 'selectShape'; shapeId: string }
  | { type: 'deleteActiveShape' }
  | { type: 'clearAll' }
  | { type: 'importShapes'; shapes: ImportedShape[] }
  | { type: 'fitToShapes' }
  | { type: 'undo' };

export function createEditorState(shapes: Shape[]): EditorState {
  return {
    shapes,
    activeShapeId: shapes.at(-1)?.id ?? null,
    past: [],
    isDragging: false,
    fitRequest: shapes.length > 0 ? 1 : 0,
  };
}

function commit(
  state: EditorState,
  shapes: Shape[],
  activeShapeId: string | null = state.activeShapeId,
): EditorState {
  return {
    ...state,
    shapes,
    activeShapeId,
    past: [...state.past, state.shapes].slice(-HISTORY_LIMIT),
  };
}

function updateShape(
  shapes: Shape[],
  shapeId: string,
  update: (shape: Shape) => Shape,
): Shape[] {
  return shapes.map((shape) => (shape.id === shapeId ? update(shape) : shape));
}

function lastShapeId(shapes: Shape[]): string | null {
  return shapes.at(-1)?.id ?? null;
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  const active = findShape(state.shapes, state.activeShapeId);

  switch (action.type) {
    case 'addPoint': {
      if (!active) {
        const shape = createShape([action.point]);
        return commit(state, [...state.shapes, shape], shape.id);
      }

      const index = findInsertionIndex(active.points, action.point, active.isClosed);
      return commit(
        state,
        updateShape(state.shapes, active.id, (shape) => ({
          ...shape,
          points: insertPointAt(shape.points, index, action.point),
        })),
      );
    }

    case 'removePoint': {
      const target = findShape(state.shapes, action.shapeId);
      if (!target) {
        return state;
      }

      const points = removePointAt(target.points, action.pointIndex);
      if (points.length === 0) {
        const remaining = state.shapes.filter((shape) => shape.id !== target.id);
        return commit(state, remaining, lastShapeId(remaining));
      }

      return commit(
        state,
        updateShape(state.shapes, target.id, (shape) => ({
          ...shape,
          points,
          isClosed: shape.isClosed && points.length >= MIN_POLYGON_POINTS,
        })),
      );
    }

    case 'beginDrag':
      return { ...commit(state, state.shapes), isDragging: true };

    case 'moveVertex':
      return {
        ...state,
        shapes: updateShape(state.shapes, action.shapeId, (shape) => ({
          ...shape,
          points: replacePointAt(shape.points, action.pointIndex, action.point),
        })),
      };

    case 'endDrag':
      return { ...state, isDragging: false };

    case 'closeShape':
      if (!active || !canClose(active)) {
        return state;
      }
      return commit(
        state,
        updateShape(state.shapes, active.id, (shape) => ({ ...shape, isClosed: true })),
      );

    case 'newShape': {
      if (active && !active.isClosed && active.points.length === 0) {
        return state;
      }
      const shape = createShape();
      return commit(state, [...state.shapes, shape], shape.id);
    }

    case 'selectShape':
      return findShape(state.shapes, action.shapeId)
        ? { ...state, activeShapeId: action.shapeId }
        : state;

    case 'deleteActiveShape': {
      if (!active) {
        return state;
      }
      const remaining = state.shapes.filter((shape) => shape.id !== active.id);
      return commit(state, remaining, lastShapeId(remaining));
    }

    case 'clearAll':
      if (state.shapes.length === 0) {
        return state;
      }
      return commit(state, [], null);

    case 'importShapes': {
      const imported = action.shapes.map((shape) =>
        createShape(shape.points, shape.isClosed),
      );
      const shapes = [...state.shapes.filter((shape) => shape.points.length > 0), ...imported];
      return {
        ...commit(state, shapes, lastShapeId(shapes)),
        fitRequest: state.fitRequest + 1,
      };
    }

    case 'fitToShapes':
      return state.shapes.length > 0
        ? { ...state, fitRequest: state.fitRequest + 1 }
        : state;

    case 'undo': {
      const previous = state.past.at(-1);
      if (!previous) {
        return state;
      }
      return {
        ...state,
        shapes: previous,
        activeShapeId: findShape(previous, state.activeShapeId)
          ? state.activeShapeId
          : lastShapeId(previous),
        past: state.past.slice(0, -1),
        isDragging: false,
      };
    }

    default: {
      const unhandled: never = action;
      throw new Error(`Unhandled editor action: ${JSON.stringify(unhandled)}`);
    }
  }
}
