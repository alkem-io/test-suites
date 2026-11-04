// spec: client-web/src/functional-e2e/whiteboard-collaboration/whiteboard-collaboration-test-plan.md
// story: alkem-io/excalidraw-yjs#13 — undo racing a peer edit drops required element keys
//
// WC-01 — the 2026-11-03 incident, end to end through the real client and the
// collaboration service (plan S4; risks R1, R4, R8; PR fix part 1,
// `applyElementHistoryStep`).
//
//   B (browser, space admin)   drags a rectangle, so its bound arrow X is rewritten every frame,
//                              then presses Ctrl+Z.
//   P (Node peer, client id 1) writes X's `height`/`points` CONCURRENTLY with B's first drag frame.
//                              Id 1 is lower than any random 32-bit browser id, so P's write loses
//                              the map-key conflict and is tombstoned — the incident's ordering.
//   C (browser, space member)  an observer: "every participant".
//   D (fresh Node peer)        reads the converged raw document.
//
// Why it is deterministic: concurrency is forced by P holding inbound updates while it writes; the
// lower id by clientId 1; and B has applied P's write BEFORE it undoes because P announces
// presence only AFTER its write, the service relays frames in arrival order, and B's browser
// applies messages in order — so P's avatar showing up on B's page proves the write was applied.
// E1 turns "the race was not reached" into an INCONCLUSIVE failure instead of a pass.

import { test, expect } from '@playwright/test';
import {
  connectWhiteboardPeer,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  type RawElement,
  type WhiteboardPeer,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { openPersonaPage, teardownScenario, type PersonaPage } from '../helpers/space-access.helper';
import {
  closePeers,
  collectPageErrors,
  dragOnCanvas,
  expectEditorAlive,
  fixedBuildAvailable,
  openWhiteboardInEditor,
  pickTool,
  seedWhiteboardSpace,
  SKIP_UNTIL_FIXED_BUILD,
  type WhiteboardSpace,
  waitForCollaborators,
} from './whiteboard-collaboration.helpers';

let scenario: OrganizationWithSpaceModel | undefined;
let space: WhiteboardSpace;
const peers: WhiteboardPeer[] = [];
const personas: PersonaPage[] = [];

const finite = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value);
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const shape = (x: RawElement | undefined) => ({ x: x?.x, y: x?.y, width: x?.width, height: x?.height, points: x?.points });

/**
 * The Yjs item that holds one key of an element at a peer (a Y.Map keeps one item per write of a
 * key; the current value is the rightmost one). `origin` is the item its writer had seen as the
 * latest for that key, so it tells a CONCURRENT write (origin is not the rival item) from a
 * causally later one.
 */
type KeyItem = { id: { client: number }; origin: { client: number } | null; left: KeyItem | null; deleted: boolean };
const keyItem = (peer: WhiteboardPeer, elementId: string, key: string): KeyItem | undefined =>
  (peer.doc.getMap('elements').get(elementId) as { _map?: Map<string, KeyItem> } | undefined)?._map?.get(key);
/** `key` of the element is held by someone else's write, made WITHOUT having seen `peer`'s write, which lost. */
const peerLostConcurrently = (peer: WhiteboardPeer, elementId: string, key: string): boolean => {
  const winner = keyItem(peer, elementId, key);
  if (!winner || winner.id.client === peer.clientId || winner.origin?.client === peer.clientId) return false;
  let item = winner.left;
  while (item && item.id.client !== peer.clientId) item = item.left;
  return item?.deleted === true;
};

test.describe('WC-01 undo racing a peer edit', () => {
  test.skip(!fixedBuildAvailable, SKIP_UNTIL_FIXED_BUILD);
  // A retry would hide a flaky ordering gate, which is exactly what this walk must not do.
  test.describe.configure({ retries: 0 });

  test.beforeAll(async () => {
    space = await seedWhiteboardSpace('wc01', created => {
      scenario = created;
    });
  });

  test.afterEach(async () => {
    await closePeers(peers);
    while (personas.length > 0) await personas.pop()?.close();
  });

  test.afterAll(async () => {
    await teardownScenario(scenario);
  });

  test('WC-01 a lower-id peer writes the arrow concurrently, then B undoes: no key is lost, nobody crashes', async ({ browser }) => {
    const uid = UniqueIDGenerator.getID();
    const b = await openPersonaPage(browser, TestUserManager.users.spaceAdmin.email);
    personas.push(b);
    const errorsB = collectPageErrors(b.page);

    // 1-2. B draws rectangle R, then arrow X whose end lands inside R and binds to it.
    // (x >= 400 keeps clear of the style panel on the left of the canvas.)
    const firstEditor = await openWhiteboardInEditor(b.page, space);
    await pickTool(firstEditor, /^Rectangle —/);
    await dragOnCanvas(b.page, firstEditor, { x: 800, y: 220 }, { x: 960, y: 340 });
    await pickTool(firstEditor, /^Arrow —/);
    await dragOnCanvas(b.page, firstEditor, { x: 600, y: 280 }, { x: 880, y: 280 });

    // The raw document is the oracle that the shapes exist and X is bound to R.
    const p = await connectWhiteboardPeer({ whiteboardId: space.whiteboardId, actor: TestUser.QA_USER, clientId: 1 });
    peers.push(p);
    const { rectId, arrowId } = await p.waitFor(() => {
      const rects = p.liveElements('rectangle');
      const arrows = p.liveElements('arrow');
      return rects.length === 1 && arrows.length === 1 ? { rectId: rects[0].id, arrowId: arrows[0].id } : undefined;
    }, 'one live rectangle and one live arrow in the raw document');
    const bound = await p.waitFor(() => {
      const x = p.rawElement(arrowId);
      return (x?.endBinding as { elementId?: string } | null | undefined)?.elementId === rectId ? x : undefined;
    }, 'arrow X bound to rectangle R (endBinding)');
    const x0 = bound.x;
    const y0 = bound.y;
    const width0 = bound.width as number;
    const height0 = bound.height as number;
    const points0 = bound.points;
    expect(finite(width0) && finite(height0) && Array.isArray(points0), 'X is whole before the race').toBe(true);

    // 3. Close and reopen: B's undo stack is empty, so the drag below is B's only step.
    await firstEditor.getByRole('button', { name: 'Close whiteboard' }).click();
    await expect(firstEditor).toBeHidden();
    const editorB = await openWhiteboardInEditor(b.page, space);
    await expect(editorB.getByRole('button', { name: 'Undo' })).toBeDisabled();

    // 4. C opens the same whiteboard; n0 = the collaborators B sees now (C only: P has not announced).
    const c = await openPersonaPage(browser, TestUserManager.users.spaceMember.email);
    personas.push(c);
    const errorsC = collectPageErrors(c.page);
    const editorC = await openWhiteboardInEditor(c.page, space);
    await waitForCollaborators(b.page, editorB, 1, 'B (baseline)');
    await waitForCollaborators(c.page, editorC, 1, 'C (baseline)');
    const n0 = 1;

    // 6-7. P stops applying inbound updates; B grabs R by its right edge and makes ONE drag move.
    p.holdInbound();
    // A reopened editor scrolls so the content's bounding box is centred in the canvas (zoom stays
    // 100%), so the screen position of R's edge is derived from the raw scene coordinates.
    const box = await editorB.locator('canvas.excalidraw__canvas.interactive').first().boundingBox();
    if (!box) throw new Error('the whiteboard canvas has no bounding box');
    const rect = p.rawElement(rectId) as { x: number; y: number; width: number; height: number };
    const left = Math.min(rect.x, x0 as number);
    const right = Math.max(rect.x + rect.width, (x0 as number) + width0);
    const top = Math.min(rect.y, y0 as number);
    const bottom = Math.max(rect.y + rect.height, (y0 as number) + height0);
    const toScreen = (sceneX: number, sceneY: number) => ({
      x: box.x + box.width / 2 + (sceneX - (left + right) / 2),
      y: box.y + box.height / 2 + (sceneY - (top + bottom) / 2),
    });
    // Grab R by its RIGHT edge, a quarter of the way down: the centring is exact horizontally but
    // can be a few pixels off vertically, and a vertical edge tolerates that along its length.
    const grab = toScreen(rect.x + rect.width, rect.y + rect.height / 4);
    await b.page.mouse.move(grab.x, grab.y);
    await b.page.mouse.down();
    await b.page.mouse.move(grab.x + 10, grab.y + 10);

    // 8. B's first drag frame has reached P and is NOT applied. Only now does P write the same keys.
    await p.waitFor(
      () => p.pendingInbound() >= 1,
      "B's first drag frame to arrive at P (held) — if this times out the drag never started: R was not under the pointer"
    );
    // The values are distinct from X's original AND from anything B's drag writes (B drags 50 down).
    const peerHeight = height0 + 37;
    const peerPoints = [
      [0, 0],
      [width0, peerHeight],
    ];
    await p.write(elements => {
      const x = elements.get(arrowId);
      x?.set('height', peerHeight);
      x?.set('points', peerPoints);
    });

    // 9-10. From here on P records X after every transaction it applies: the oracle for "the value
    // X held just before the undo step". P announces AFTER its write, then lets B's frames in.
    const history: RawElement[] = [];
    p.doc.on('afterTransaction', () => {
      const x = p.rawElement(arrowId);
      if (x) history.push(x);
    });
    await p.announce(`qa-gate-${uid}`);
    p.releaseInbound();

    // E1 (precondition, checked BEFORE the undo) — the race was reached. B's held frames are one
    // that moves R and one that rewrites X; once X's keys at P are no longer P's own write, both
    // `height` and `points` must hold B's write made WITHOUT having seen P's (concurrent), P's
    // write deleted (it lost the map-key conflict: lower id), and the value is B's drag, not the
    // original. Failing here means INCONCLUSIVE, never a pass, and never a product verdict.
    const e1 = 'E1 race precondition not reached (inconclusive, not a pass)';
    await p.waitFor(
      () => keyItem(p, arrowId, 'height')?.id.client !== p.clientId && keyItem(p, arrowId, 'points')?.id.client !== p.clientId,
      `${e1}: B's drag frame never rewrote X at P`
    );
    const raced = p.rawElement(arrowId);
    expect(
      peerLostConcurrently(p, arrowId, 'height') &&
        peerLostConcurrently(p, arrowId, 'points') &&
        !same(raced?.points, points0) &&
        raced?.height !== height0,
      `${e1}: P's write did not lose a concurrent conflict to B's drag. X at P: ${JSON.stringify(shape(raced))}; before: ${JSON.stringify(shape(bound))}; P wrote: ${JSON.stringify({ height: peerHeight, points: peerPoints })}`
    ).toBe(true);

    // B showing P's avatar proves B applied P's write before the drag continues and before the undo.
    await waitForCollaborators(b.page, editorB, n0 + 1, 'B (ordering gate)');

    // 11. B finishes the drag.
    await b.page.mouse.move(grab.x + 130, grab.y + 50, { steps: 8 });
    await b.page.mouse.up();

    // 12. B presses undo once.
    await expect(editorB.getByRole('button', { name: 'Undo' }), 'B has the drag to undo').toBeEnabled();
    await b.page.keyboard.press('ControlOrMeta+z');

    // 13. The undo has arrived at P once X's width (a key B changed, P did not) is back. The undo
    // and its repair arrive as one transaction (observed at the wire), so this is the final X.
    await p.waitFor(() => p.rawElement(arrowId)?.width === width0, "B's undo to restore X's width at P");
    const afterUndo = p.rawElement(arrowId);
    if (!afterUndo) throw new Error('X disappeared from the raw document');
    const dragAt = history.findIndex(x => x.width !== width0);
    const undoAt = history.findIndex((x, i) => dragAt >= 0 && i > dragAt && x.width === width0);
    const beforeUndo = history[undoAt - 1];
    // Still the precondition: what the undo starts from is B's dragged shape, distinct from the
    // original and from P's write, so the exact-value checks below can tell the outcomes apart.
    expect(
      undoAt > 0 &&
        beforeUndo !== undefined &&
        !same(beforeUndo.points, points0) &&
        !same(beforeUndo.points, peerPoints) &&
        beforeUndo.height !== height0 &&
        beforeUndo.height !== peerHeight,
      `E1 race precondition not reached (inconclusive, not a pass): X just before the undo step was not B's dragged shape: ${JSON.stringify(shape(beforeUndo))}`
    ).toBe(true);

    // 14. D joins fresh and reads the converged raw element.
    const d = await connectWhiteboardPeer({ whiteboardId: space.whiteboardId, actor: TestUser.QA_USER });
    peers.push(d);
    await d.waitFor(() => d.rawElement(arrowId)?.width === width0, 'D to receive the converged X');

    // From here on the race is proven reached: every failure is a PRODUCT failure.
    console.info(`WC-01 observation: X before the undo ${JSON.stringify(shape(beforeUndo))}, after ${JSON.stringify(shape(afterUndo))}`);
    // The undo reverted the keys only B's drag changed.
    expect(
      { x: afterUndo.x, y: afterUndo.y, width: afterUndo.width },
      'E2 product failure: the undo did not revert x/y/width of X'
    ).toEqual({ x: x0, y: y0, width: width0 });

    // E2, E3 — the keys the undo dropped are back, with the value they held just before the step.
    expect(Array.isArray(afterUndo.points), 'E2 points is an array').toBe(true);
    const points = afterUndo.points as unknown[];
    expect(points.length, 'E2 points has at least two pairs').toBeGreaterThanOrEqual(2);
    for (const pair of points) {
      expect(Array.isArray(pair) && pair.length === 2 && pair.every(finite), `E2 point ${JSON.stringify(pair)} is a finite pair`).toBe(true);
    }
    expect(afterUndo.points, 'E2 product failure: points is not the value X held just before the undo step').toEqual(beforeUndo.points);
    expect(finite(afterUndo.height), `E3 height is finite (got ${JSON.stringify(afterUndo.height)})`).toBe(true);
    expect(afterUndo.height, 'E3 product failure: height is not the value X held just before the undo step').toBe(beforeUndo.height);

    // E4, E5 — nobody crashed.
    await expectEditorAlive(b.page, 'E4 B (the undoer)');
    await expectEditorAlive(c.page, 'E5 C (the observer)');

    // E6 — the repair added no undo step: B had exactly one step, now undone.
    await expect(editorB.getByRole('button', { name: 'Undo' }), 'E6 B has no further step to undo').toBeDisabled();
    await expect(editorB.getByRole('button', { name: 'Redo' }), 'E6 the undone step can be redone').toBeEnabled();

    // E7 — the room converged on the repaired element (R8).
    expect(d.rawElement(arrowId), 'E7 D and P read the same raw X').toEqual(p.rawElement(arrowId));

    // E8 — still alive at the end of the walk, and no uncaught page error on B or C.
    await expectEditorAlive(b.page, 'E8 B (end of walk)');
    await expectEditorAlive(c.page, 'E8 C (end of walk)');
    expect(errorsB, 'E8 pageerror on B').toEqual([]);
    expect(errorsC, 'E8 pageerror on C').toEqual([]);
  });
});
