import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';
import {
  CollaboraDocumentType,
  createCollaboraFramedCallout,
  createMemoFramedCallout,
  createWhiteboardFramedCallout,
  entitleSpaceForOfficeDocuments,
  entitleSpaceForWhiteboardMultiUser,
  SpacePrivacyMode,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
  type WhiteboardPeer,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { baseUrl, teardownScenario } from '../helpers/space-access.helper';
import { closePeers, type WhiteboardSpace } from '../whiteboard-collaboration/whiteboard-collaboration.helpers';

/**
 * Shared by the three content-editing walks (W2 journey 5): the private Space
 * seed per content type, the memo and Collabora openers, the memo paragraph
 * reader, and the teardown. The whiteboard editor's own helpers (open, draw,
 * `editorElement`) are the ones of `whiteboard-collaboration/`.
 *
 * The oracle of every case is a server or service read-back, never the editor:
 * the whiteboard's raw Yjs doc and the durability barrier (lib peer), the
 * memo's stored `markdown` (GraphQL), the Collabora document's stored bytes
 * (storage REST).
 */

export type ContentKind = 'whiteboard' | 'memo' | 'collabora';

export type SeededContent = {
  scenario: OrganizationWithSpaceModel;
  uid: string;
  calloutId: string;
  /** The callout's heading on the Space page. */
  calloutTitle: string;
  whiteboardId?: string;
  memoId?: string;
  /** The memo's own title: it differs from the callout's, so the two dialogs are distinguishable. */
  memoTitle?: string;
  calloutUrl?: string;
  collaboraDocumentId?: string;
};

/**
 * A PRIVATE Space (so the second persona's reads are member reads) with the
 * admin and the member, and ONE framed callout of the requested kind.
 * `record` is called with the scenario the moment it exists, so a half-failed
 * `beforeAll` can still be torn down.
 */
export const seedContentSpace = async (
  kind: ContentKind,
  uid: string,
  record: (scenario: OrganizationWithSpaceModel) => void
): Promise<SeededContent> => {
  const scenario = await TestScenarioFactory.createBaseScenario({
    name: `content-${kind}-${uid}`,
    space: {
      collaboration: { addTutorialCallouts: false, addPostCollectionCallout: false },
      settings: { privacy: { mode: SpacePrivacyMode.Private } },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
      },
    },
  });
  record(scenario);
  const calloutsSetId = scenario.space.collaboration.calloutsSetId;
  switch (kind) {
    case 'whiteboard': {
      const calloutTitle = `WB callout ${uid}`;
      const { calloutId, whiteboardId } = await createWhiteboardFramedCallout(calloutsSetId, calloutTitle, `wb-${uid}`);
      await entitleSpaceForWhiteboardMultiUser(scenario.space.id, calloutId);
      return { scenario, uid, calloutId, calloutTitle, whiteboardId };
    }
    case 'memo': {
      const calloutTitle = `Memo callout ${uid}`;
      const memoTitle = `Memo ${uid}`;
      const { calloutId, memoId, calloutUrl } = await createMemoFramedCallout(calloutsSetId, {
        displayName: calloutTitle,
        memoTitle,
        markdown: `Seed ${uid}`,
      });
      return { scenario, uid, calloutId, calloutTitle, memoId, memoTitle, calloutUrl };
    }
    case 'collabora': {
      const calloutTitle = `Doc ${uid}`;
      await entitleSpaceForOfficeDocuments(scenario.space.id);
      const { calloutId, collaboraDocumentId } = await createCollaboraFramedCallout(calloutsSetId, {
        displayName: calloutTitle,
        nameID: `doc-${uid}`,
        documentType: CollaboraDocumentType.Wordprocessing,
      });
      return { scenario, uid, calloutId, calloutTitle, collaboraDocumentId };
    }
  }
};

/** The whiteboard editor helpers take the shape of the whiteboard-collaboration seed. */
export const asWhiteboardSpace = (seeded: SeededContent): WhiteboardSpace => ({
  scenario: seeded.scenario,
  calloutId: seeded.calloutId,
  whiteboardId: seeded.whiteboardId ?? '',
  calloutTitle: seeded.calloutTitle,
});

/**
 * File-level teardown: peers are closed first (never throwing), then the Space
 * tree and organization go, and a leak fails the hook.
 */
export const teardownContent = async (
  peers: WhiteboardPeer[],
  scenario: OrganizationWithSpaceModel | undefined
): Promise<void> => {
  await closePeers(peers);
  await teardownScenario(scenario);
};

/**
 * A memo's paragraphs as `Memo.markdown` serialises them: blocks separated by
 * blank lines. Exact and in order, so "the new text appeared somewhere" cannot pass.
 */
export const paragraphsOf = (markdown: string | null | undefined): string[] =>
  (markdown ?? '')
    .trim()
    .split(/\n{2,}/)
    .map(block => block.trim());

/**
 * Open the memo of the seeded callout: the callout's deep link, then the
 * callout DIALOG (named after the callout), then its "Open Memo", then the memo
 * dialog (named after the memo's own title). Opening the memo from the Space page
 * behind a lazily arriving callout dialog makes it nameless (see
 * authz-admin-guard/memo-sign-action-gate.spec.ts, nightlies 2026-10-22 and 2026-10-27).
 */
export const openMemo = async (page: Page, seeded: SeededContent): Promise<{ dialog: Locator; editor: Locator }> => {
  await page.goto(seeded.calloutUrl ?? '');
  const calloutDialog = page.getByRole('dialog', { name: seeded.calloutTitle, exact: true });
  await expect(calloutDialog).toBeVisible();
  await calloutDialog.getByRole('button', { name: 'Open Memo' }).click();
  const dialog = page.getByRole('dialog', { name: seeded.memoTitle, exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  // `.ProseMirror` is the editor's own class: it has no role for its editable root.
  return { dialog, editor: dialog.locator('.ProseMirror').first() };
};

/**
 * Append a new paragraph holding `text` at the END of the memo. The caret is put there by clicking the last
 * paragraph and pressing End, and the selection is READ BACK before any key that edits: a click on the editor
 * root right after the dialog opens was seen (2026-11-09, local stack) landing before the collaborative content
 * had settled, which left the caret at the start of the document and made "Enter + type" prepend instead of append.
 */
export const appendMemoParagraph = async (page: Page, editor: Locator, text: string): Promise<void> => {
  await expect(async () => {
    await editor.getByRole('paragraph').last().click();
    await page.keyboard.press('End');
    const caretAtEnd = await editor.evaluate(root => {
      const selection = root.ownerDocument.getSelection();
      const last = root.querySelector('p:last-of-type');
      const node = selection?.anchorNode ?? null;
      return Boolean(
        selection?.isCollapsed && last && node && last.contains(node) && selection.anchorOffset === (node.textContent ?? '').length
      );
    });
    expect(caretAtEnd, 'the caret sits at the end of the last paragraph').toBe(true);
  }).toPass();
  await page.keyboard.press('Enter');
  await page.keyboard.type(text);
};

/**
 * Open the Collabora document of the seeded callout from the Space page and wait until COOL has loaded it.
 *
 * - The editor is a full-screen dialog named after the document (`calloutTitle`, the title the seed gave it)
 *   that mounts `iframe[title="Document Editor"]`.
 * - client-web's footer has NO "connected" text and starts at "Saved", so it is no readiness signal. COOL's own
 *   status bar ("Page 1 of 1", rendered once the document is loaded) is the probe.
 * - CODE shows a "What's new" welcome modal (an iframe inside the editor frame) once per browser profile, and it
 *   swallows the keystrokes meant for the document. It arrives after the load, from COOL itself, so it is waited
 *   for for a bounded time and dismissed with Escape when it shows. If it never shows (no route out to its
 *   content) the walk goes on, and the first typed edit's "Unsaved changes" is the proof that keys reached the
 *   document.
 */
export const openDocument = async (
  page: Page,
  seeded: SeededContent
): Promise<{ dialog: Locator; frame: FrameLocator }> => {
  await page.goto(spaceUrl(seeded));
  await page.getByRole('button', { name: 'Open Document', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: seeded.calloutTitle, exact: true });
  await expect(dialog).toBeVisible();
  // The dialog shows "The document editor is temporarily unavailable" instead when the server cannot mint the editor
  // URL (collaboraEditorUrl answers an error: wopi-service unreachable from the server, bad WOPI_SERVICE_URL, no
  // office-documents plan). That is an environment red, and it is meant to be loud.
  await expect(
    dialog.locator('iframe[title="Document Editor"]'),
    'the Collabora editor did not mount: check collaboraEditorUrl on this stack (wopi-service reachable from the server, WOPI_SERVICE_URL, CODE up)'
  ).toBeVisible();
  const frame = dialog.frameLocator('iframe[title="Document Editor"]');
  await expect(frame.getByText(/^Page \d+ of \d+$/)).toBeVisible();
  const welcome = frame.locator('iframe.iframe-welcome-modal');
  const welcomeShown = await welcome
    .waitFor({ state: 'visible', timeout: WELCOME_WAIT_MS })
    .then(() => true)
    .catch(() => false);
  if (welcomeShown) {
    await page.keyboard.press('Escape');
    await expect(welcome).toBeHidden();
  }
  return { dialog, frame };
};

/** The footer's save chip: "Saved" / "Saving…" / "Unsaved changes" / "Error saving". It STARTS at "Saved". */
export const saveStatus = (dialog: Locator, text: string): Locator => dialog.getByText(text, { exact: true });

/** How long COOL's welcome modal is waited for after the document loaded (see `openDocument`). */
const WELCOME_WAIT_MS = 5_000;

export const spaceUrl = (seeded: SeededContent): string => `${baseUrl}/${seeded.scenario.space.nameId}`;

export const newUid = (): string => UniqueIDGenerator.getID();
