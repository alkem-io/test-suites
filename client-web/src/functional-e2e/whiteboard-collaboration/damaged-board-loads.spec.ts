// spec: client-web/src/functional-e2e/whiteboard-collaboration/whiteboard-collaboration-test-plan.md
// story: alkem-io/excalidraw-yjs#13 — undo racing a peer edit drops required element keys
//
// WC-02 — a board whose arrow lost `points` and `height` opens for every
// participant, live and on a fresh load (plan S5; risks R2, R6; PR fix part 2,
// `yMapToElement` defaults). The damaged state is the incident's: an element
// missing keys the renderer reads unguarded. A browser cannot be made to write
// it, so a Node peer (T-1) deletes the two keys in the raw document while two
// editors are open, and a second Node peer reads the raw doc back as the
// precondition oracle.

import { test, expect } from '@playwright/test';
import {
  connectWhiteboardPeer,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  type WhiteboardPeer,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { openPersonaPage, teardownScenario, type PersonaPage } from '../helpers/space-access.helper';
import {
  closePeers,
  collectPageErrors,
  dragOnCanvas,
  editorElement,
  expectEditorAlive,
  openWhiteboardInEditor,
  pickTool,
  seedWhiteboardSpace,
  type WhiteboardSpace,
  waitForCollaborators,
} from './whiteboard-collaboration.helpers';

let scenario: OrganizationWithSpaceModel | undefined;
let space: WhiteboardSpace;
const peers: WhiteboardPeer[] = [];
const personas: PersonaPage[] = [];

test.describe('WC-02 damaged board loads', () => {
  test.describe.configure({ retries: 0 });

  test.beforeAll(async () => {
    space = await seedWhiteboardSpace('wc02', created => {
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

  test('WC-02 an arrow without points/height arrives live and on fresh loads: nobody crashes', async ({ browser }) => {
    // B = space admin (draws the arrow), C = space member (observer), P = qa.user via the Node peer, D = checker peer.
    const uid = UniqueIDGenerator.getID();
    const b = await openPersonaPage(browser, TestUserManager.users.spaceAdmin.email);
    personas.push(b);
    const errorsB = collectPageErrors(b.page);

    // 1-2. B opens the editor and draws one arrow. (x >= 400 keeps clear of the style panel
    // on the left; the footer's "Saved" only means "sent", so the raw doc below is the oracle.)
    const editorB = await openWhiteboardInEditor(b.page, space);
    await pickTool(editorB, /^Arrow —/);
    await dragOnCanvas(b.page, editorB, { x: 700, y: 260 }, { x: 920, y: 300 });

    // 3. P sees exactly one live arrow in the raw doc.
    const p = await connectWhiteboardPeer({ whiteboardId: space.whiteboardId, actor: TestUser.QA_USER });
    peers.push(p);
    const arrow = await p.waitFor(() => {
      const arrows = p.liveElements('arrow');
      return arrows.length === 1 ? arrows[0] : undefined;
    }, 'exactly one live arrow in the raw document');
    const arrowId = arrow.id;
    // The arrow is whole before the damage (positive control for E1).
    expect(arrow.points, 'points before the damage').toEqual(expect.any(Array));
    expect(arrow.height, 'height before the damage').toEqual(expect.any(Number));

    // 4. C opens the same whiteboard.
    const c = await openPersonaPage(browser, TestUserManager.users.spaceMember.email);
    personas.push(c);
    const errorsC = collectPageErrors(c.page);
    const editorC = await openWhiteboardInEditor(c.page, space);

    // Baseline: B and C see each other. P has NOT announced, so it has no avatar yet; its first
    // announce, sent AFTER the damaged update, is the delivery gate for E2/E3 below. The avatar
    // alone proves only that the awareness frame was applied, so each leg also reads the arrow
    // from the editor's own scene (`editorElement`): the whole arrow here (positive control),
    // the defaulted one after the damage.
    await waitForCollaborators(b.page, editorB, 1, 'B (before the damage)');
    await waitForCollaborators(c.page, editorC, 1, 'C (before the damage)');
    await expect
      .poll(async () => (await editorElement(editorC, arrowId))?.height, { message: 'C shows the whole arrow before the damage' })
      .toBe(arrow.height);
    expect((await editorElement(editorB, arrowId))?.points, 'B shows the whole arrow before the damage').toEqual(arrow.points);

    // 5. The incident state arrives live while B and C are open.
    await p.write(elements => {
      const damaged = elements.get(arrowId);
      damaged?.delete('points');
      damaged?.delete('height');
    });
    await p.announce(`qa-wc02-${uid}`);

    // 6. D, a fresh peer, reads the raw doc.
    const d = await connectWhiteboardPeer({ whiteboardId: space.whiteboardId, actor: TestUser.QA_USER });
    peers.push(d);
    const raw = await d.waitFor(() => {
      const el = d.rawElement(arrowId);
      return el && !('points' in el) && !('height' in el) ? el : undefined;
    }, 'the raw arrow without points and height');
    // E1 (precondition): the damage is real and everything else is intact.
    expect(raw, 'E1 raw arrow after the damage').not.toHaveProperty('points');
    expect(raw, 'E1 raw arrow after the damage').not.toHaveProperty('height');
    for (const key of ['x', 'y', 'width']) {
      expect(raw[key], `E1 raw arrow keeps ${key}`).toEqual(expect.any(Number));
    }

    // E2, E3: both live editors survive the damaged state arriving, and each has APPLIED it: the
    // editor's own copy of the arrow now carries the read-side defaults (height 0, points from
    // the width) instead of the drawn shape. The avatar of P (announced after the write) is the
    // wait; the editor-side read is the proof.
    const expectDamagedInEditor = async (editor: Parameters<typeof editorElement>[0], who: string): Promise<void> => {
      await expect
        .poll(async () => (await editorElement(editor, arrowId))?.height, { message: `${who}: the editor applied the damaged update (height defaulted)` })
        .toBe(0);
      const shown = await editorElement(editor, arrowId);
      expect(shown?.isDeleted, `${who}: the damaged arrow is still a live element in the editor`).toBe(false);
      expect(shown?.points, `${who}: the editor defaulted the missing points from the width`).toEqual([
        [0, 0],
        [raw.width, 0],
      ]);
    };
    await waitForCollaborators(c.page, editorC, 2, 'E2 C (live arrival)');
    await waitForCollaborators(b.page, editorB, 2, 'E3 B (live arrival)');
    await expectEditorAlive(c.page, 'E2 C (live arrival)');
    await expectEditorAlive(b.page, 'E3 B (live arrival)');
    await expectDamagedInEditor(editorC, 'E2 C (live arrival)');
    await expectDamagedInEditor(editorB, 'E3 B (live arrival)');

    // The fresh loads below must load a room that is still damaged: if a live editor wrote the
    // keys back (healed the doc), they would prove nothing about loading a damaged board.
    const expectStillDamaged = (who: string): void => {
      const current = d.rawElement(arrowId);
      expect(current, `${who} precondition lost (healed): the raw arrow has points again`).not.toHaveProperty('points');
      expect(current, `${who} precondition lost (healed): the raw arrow has height again`).not.toHaveProperty('height');
    };

    // 7. B closes the editor and reopens it: a fresh load from the damaged room.
    await editorB.getByRole('button', { name: 'Close whiteboard' }).click();
    await expect(editorB).toBeHidden();
    expectStillDamaged('E4');
    const reopenedB = await openWhiteboardInEditor(b.page, space);
    await waitForCollaborators(b.page, reopenedB, 2, 'E4 B (fresh load)');
    await expectEditorAlive(b.page, 'E4 B (fresh load)');
    await expectDamagedInEditor(reopenedB, 'E4 B (fresh load)');

    // 8. A third, fresh browser context of C loads the damaged board.
    const c2 = await openPersonaPage(browser, TestUserManager.users.spaceMember.email);
    personas.push(c2);
    const errorsC2 = collectPageErrors(c2.page);
    expectStillDamaged('E5');
    const editorC2 = await openWhiteboardInEditor(c2.page, space);
    await waitForCollaborators(c2.page, editorC2, 3, 'E5 C (fresh context)');
    await expectEditorAlive(c2.page, 'E5 C (fresh context)');
    await expectDamagedInEditor(editorC2, 'E5 C (fresh context)');

    // Observation, not an assertion: reading never heals the stored document (R6).
    console.info('WC-02 observation: raw arrow after the fresh loads', JSON.stringify(d.rawElement(arrowId)));

    // E6: every editor is still alive at the end, and no uncaught page error on any page, from step 1.
    await expectEditorAlive(b.page, 'E6 B (end of walk)');
    await expectEditorAlive(c.page, 'E6 C (end of walk)');
    await expectEditorAlive(c2.page, 'E6 fresh C (end of walk)');
    expect(errorsB, 'E6 pageerror on B').toEqual([]);
    expect(errorsC, 'E6 pageerror on C').toEqual([]);
    expect(errorsC2, 'E6 pageerror on fresh C').toEqual([]);
  });
});
