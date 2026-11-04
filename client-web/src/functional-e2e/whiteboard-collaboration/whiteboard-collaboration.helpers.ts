import { expect, type Locator, type Page } from '@playwright/test';
import {
  createWhiteboardFramedCallout,
  entitleSpaceForWhiteboardMultiUser,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
  type WhiteboardPeer,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { baseUrl } from '../helpers/space-access.helper';
import { getWhiteboardEditorDialog } from '../templates-CRD/template-types/forms/whiteboards/whiteboard-dialog';

/**
 * Shared by the whiteboard-collaboration walks (excalidraw-yjs#13): the Space
 * seed, how a browser opens the editor, how it draws, and the "is the editor
 * still alive" oracle. The raw-document oracle is the Node peer in the lib
 * (`connectWhiteboardPeer`); nothing here reads canvas content.
 */

/**
 * The walks need a client-web that resolves `@excalidraw-yjs/excalidraw` >= 0.5.6
 * (alkem-io/excalidraw-yjs#13 released and bumped, checklist item M-2). On an
 * environment without it WC-01 and WC-02 are RED by design — they pin the
 * incident. Set WHITEBOARD_COLLAB_FIXED=1 to run them against a build that has
 * the fix (a local stack with the PR build, or an environment after the bump).
 */
export const fixedBuildAvailable = process.env.WHITEBOARD_COLLAB_FIXED === '1';
export const SKIP_UNTIL_FIXED_BUILD =
  'the environment client-web still resolves @excalidraw-yjs/excalidraw 0.5.5; the walks pin the fix of alkem-io/excalidraw-yjs#13 (client-web bump PR not opened yet). Run with WHITEBOARD_COLLAB_FIXED=1 against a >= 0.5.6 build';

export type WhiteboardSpace = {
  scenario: OrganizationWithSpaceModel;
  calloutId: string;
  whiteboardId: string;
  calloutTitle: string;
};

/**
 * A fresh Space with the multi-user whiteboard plan and one callout framing an
 * empty whiteboard. Members: space.admin (admin), space.member, qa.user.
 * NB the factory's `addWhiteboardCallout` frames NO whiteboard, so the callout
 * is created here.
 */
export const seedWhiteboardSpace = async (
  name: string,
  record: (scenario: OrganizationWithSpaceModel) => void
): Promise<WhiteboardSpace> => {
  const uid = UniqueIDGenerator.getID();
  const scenario = await TestScenarioFactory.createBaseScenario({
    name: `${name}-${uid}`,
    space: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER, TestUser.QA_USER],
      },
    },
  });
  record(scenario);
  const calloutTitle = `${name} ${uid} whiteboard callout`;
  const { calloutId, whiteboardId } = await createWhiteboardFramedCallout(
    scenario.space.collaboration.calloutsSetId,
    calloutTitle,
    `${name}-${uid}`
  );
  await entitleSpaceForWhiteboardMultiUser(scenario.space.id, calloutId);
  return { scenario, calloutId, whiteboardId, calloutTitle };
};

/** Page errors of one page, collected from the moment it is called. */
export const collectPageErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
};

/** The editor dialog, and the controls the walks use. */
export const editorOf = (page: Page): Promise<Locator> => getWhiteboardEditorDialog(page);

/**
 * Open the whiteboard of the seeded callout in the editor: Space page → callout
 * link → "Open whiteboard" → the editor dialog, waited until its toolbar and
 * canvas exist (the editor is editable, not just mounted).
 */
export const openWhiteboardInEditor = async (page: Page, space: WhiteboardSpace): Promise<Locator> => {
  await page.goto(`${baseUrl}/${space.scenario.space.nameId}`);
  await page.getByRole('link', { name: new RegExp(`Open .*${space.calloutTitle}`) }).click();
  await page.getByRole('dialog').getByRole('button', { name: /open whiteboard/i }).click();
  const editor = await editorOf(page);
  await expect(editor.getByTitle(/^Rectangle —/)).toBeVisible();
  await expect(editor.locator('canvas.excalidraw__canvas.interactive').first()).toBeVisible();
  return editor;
};

export const canvasOf = (editor: Locator): Locator => editor.locator('canvas.excalidraw__canvas.interactive').first();

/** Collaborators other than yourself, as Excalidraw's UserList shows them (a class locator: canvas apps expose no role here). */
export const collaboratorAvatars = (editor: Locator): Locator => editor.locator('.UserList .Avatar');

const OOPS = (page: Page): Locator => page.getByRole('heading', { name: 'Oops!' });
const WENT_WRONG = (page: Page): Locator => page.getByText('Looks like something went wrong');

/**
 * Two animation frames: whatever React was going to render for a message that
 * has already been delivered (a throw included) has been rendered. Not a time
 * wait — it resolves on the browser's own frame callbacks.
 */
export const settleFrames = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );

/**
 * The editor of `page` survived: the dialog with the `Drawing canvas` region is
 * visible (primary oracle) and the top-level error page ("Oops!" /
 * "Looks like something went wrong") is not (secondary one).
 */
export const expectEditorAlive = async (page: Page, who: string): Promise<void> => {
  await settleFrames(page);
  await expect(OOPS(page), `${who}: the crash page is showing`).toHaveCount(0);
  await expect(WENT_WRONG(page), `${who}: the crash copy is showing`).toHaveCount(0);
  const editor = page.getByRole('dialog').filter({ has: page.getByText('Drawing canvas') });
  await expect(editor.last(), `${who}: the editor dialog is gone`).toBeVisible();
};

/**
 * Wait until `page` has shown `count` other collaborators — OR the crash page
 * appeared, so a crash fails at the oracle that names it rather than as a
 * missing avatar.
 */
export const waitForCollaborators = async (page: Page, editor: Locator, count: number, who: string): Promise<void> => {
  await expect
    .poll(async () => (await OOPS(page).count()) > 0 || (await collaboratorAvatars(editor).count()) === count, {
      message: `${who}: waiting for ${count} collaborator avatar(s)`,
    })
    .toBe(true);
};

/** Drag with the mouse in `steps` moves, in canvas-relative coordinates. */
export const dragOnCanvas = async (
  page: Page,
  editor: Locator,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 8
): Promise<void> => {
  const box = await canvasOf(editor).boundingBox();
  if (!box) throw new Error('the whiteboard canvas has no bounding box');
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + to.x, box.y + to.y, { steps });
  await page.mouse.up();
};

/** Pick a toolbar tool by its title ("Arrow — A or 5"); the radio inputs are visually hidden. */
export const pickTool = async (editor: Locator, title: RegExp): Promise<void> => {
  await editor.getByTitle(title).click();
};

/** Close every peer; never throws, so one failed close cannot hide the test's own verdict. */
export const closePeers = async (peers: WhiteboardPeer[]): Promise<void> => {
  while (peers.length > 0) await peers.pop()?.close().catch(() => undefined);
};
