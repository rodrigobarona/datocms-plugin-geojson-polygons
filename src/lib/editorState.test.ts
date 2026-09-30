import { describe, expect, it } from 'vitest';
import { createEditorState, editorReducer, type EditorAction, type EditorState } from './editorState';
import type { LngLat } from './geometry';

function run(actions: EditorAction[], state = createEditorState([])): EditorState {
  return actions.reduce(editorReducer, state);
}

const addPoints = (...points: LngLat[]): EditorAction[] =>
  points.map((point) => ({ type: 'addPoint', point }));

const triangle = addPoints([0, 0], [1, 0], [1, 1]);

describe('editorReducer', () => {
  it('starts a shape on the first point and closes it', () => {
    const state = run([...triangle, { type: 'closeShape' }]);

    expect(state.shapes).toHaveLength(1);
    expect(state.shapes[0]?.isClosed).toBe(true);
    expect(state.shapes[0]?.points).toHaveLength(3);
  });

  it('refuses to close shapes with fewer than three points', () => {
    const state = run([...addPoints([0, 0], [1, 0]), { type: 'closeShape' }]);
    expect(state.shapes[0]?.isClosed).toBe(false);
  });

  it('inserts into the nearest edge once closed', () => {
    const state = run([...triangle, { type: 'closeShape' }, ...addPoints([0.5, -0.01])]);
    expect(state.shapes[0]?.points[1]).toEqual([0.5, -0.01]);
  });

  it('undoes one step at a time, including closing', () => {
    let state = run([...triangle, { type: 'closeShape' }]);
    state = editorReducer(state, { type: 'undo' });
    expect(state.shapes[0]?.isClosed).toBe(false);
    state = run([{ type: 'undo' }, { type: 'undo' }, { type: 'undo' }], state);
    expect(state.shapes).toEqual([]);
  });

  it('records one history entry per drag', () => {
    const start = run([...triangle, { type: 'closeShape' }]);
    const shapeId = start.shapes[0]!.id;
    const dragged = run(
      [
        { type: 'beginDrag' },
        { type: 'moveVertex', shapeId, pointIndex: 0, point: [0.1, 0.1] },
        { type: 'moveVertex', shapeId, pointIndex: 0, point: [0.2, 0.2] },
        { type: 'endDrag' },
      ],
      start,
    );

    expect(dragged.isDragging).toBe(false);
    expect(dragged.past).toHaveLength(start.past.length + 1);
    expect(editorReducer(dragged, { type: 'undo' }).shapes).toEqual(start.shapes);
  });

  it('reopens a polygon when removing a vertex leaves too few points', () => {
    const start = run([...triangle, { type: 'closeShape' }]);
    const state = editorReducer(start, {
      type: 'removePoint',
      shapeId: start.shapes[0]!.id,
      pointIndex: 0,
    });
    expect(state.shapes[0]?.isClosed).toBe(false);
  });

  it('starts new shapes, deletes the active one, and clears everything', () => {
    let state = run([...triangle, { type: 'closeShape' }, { type: 'newShape' }, ...addPoints([5, 5])]);
    expect(state.shapes).toHaveLength(2);

    state = editorReducer(state, { type: 'deleteActiveShape' });
    expect(state.shapes).toHaveLength(1);
    expect(state.activeShapeId).toBe(state.shapes[0]?.id);

    state = editorReducer(state, { type: 'clearAll' });
    expect(state.shapes).toEqual([]);
    expect(state.activeShapeId).toBeNull();
  });

  it('imports shapes, drops empty drafts, and requests a map fit', () => {
    const state = run([
      { type: 'newShape' },
      {
        type: 'importShapes',
        shapes: [{ points: [[0, 0], [1, 0], [1, 1]], isClosed: true }],
      },
    ]);

    expect(state.shapes).toHaveLength(1);
    expect(state.fitRequest).toBe(1);
  });
});
