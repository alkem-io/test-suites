// spec: client-web/src/functional-e2e/content-editing/content-editing-test-plan.md
// W2 journey 5 (docs/qa/server-rebuild/plan.md § W2), Collabora document: E9-1, E9-2.
//
// COOL renders the document on canvas inside an iframe, so typed text is never in
// any DOM. The oracle is therefore the stored file: Collabora saves through
// wopi-service `PutFile`, which overwrites the platform's file in place, and the
// lib reads those bytes back through the storage REST endpoint and extracts the
// paragraphs (`readOfficeDocumentText`). The footer's `Unsaved changes` → `Saved`
// transition is only the precondition that COOL registered the edit.
//
//   author `space.admin` · colleague `space.member` · private Space, own seed
//
// Needs: Collabora (CODE) behind /browser and /cool, wopi-service and the
// SPACE_FEATURE_OFFICE_DOCUMENTS plan. The walks FAIL, never skip, when the
// editor cannot load: an environment without Collabora must be loud.

import {
  expect,
  test,
  type FrameLocator,
  type Locator,
  type Page,
} from '@playwright/test';
import {
  AuthorizationPrivilege,
  readCalloutCollaboraDocument,
  readOfficeDocumentText,
  TestUserManager,
  type GraphqlActor,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must, sessionActor } from '../helpers/lib-actor.helper';
import {
  openPersonaPage,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  newUid,
  openDocument,
  saveStatus,
  seedContentSpace,
  teardownContent,
  type SeededContent,
} from './content-editing.helpers';

const uid = newUid();
const AUTHOR_TEXT = `DOC ${uid}`;
const MEMBER_TEXT = `MEMBER ${uid}`;

let scenario: OrganizationWithSpaceModel | undefined;
let seeded: SeededContent;
let author: PersonaPage | undefined;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  seeded = await seedContentSpace('collabora', uid, s => {
    scenario = s;
  });
  author = await openPersonaPage(
    browser,
    TestUserManager.users.spaceAdmin.email
  );
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await author?.close();
  await teardownContent(scenario);
  scenario = undefined;
});

/** The document as `actor` reads it: id, type, preview url (re-read every time, never cached) and privileges. */
const documentOf = async (actor?: GraphqlActor) =>
  must(
    await readCalloutCollaboraDocument(seeded.calloutId, actor),
    'readCalloutCollaboraDocument'
  ).lookup.callout!.framing.collaboraDocument!;

/** The paragraphs of the stored file, as `actor` reads it; `previewUrl` is re-read on every call. */
const storedParagraphs = async (page: Page): Promise<string[]> => {
  const actor = await sessionActor(page);
  const document = await documentOf(actor);
  return (await readOfficeDocumentText(document.previewUrl!, actor)).paragraphs;
};

/** Focus the document (the canvas inside the editor frame) so that keystrokes reach it. */
const focusDocument = async (frame: FrameLocator): Promise<void> => {
  await frame.locator('canvas').first().click();
};

const closeDocument = async (dialog: Locator): Promise<void> => {
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
};

test.describe('W2 journey 5 — a Collabora document is typed into, then reopened', () => {
  test('E9-1 the author types a line and saves; the stored file holds it', async () => {
    const page = author!.page;
    // Precondition (positive control): the read resolves THIS seeded document, and its stored file is the blank one
    // nobody has saved yet (a zero-byte DOCX, harness.md), so the marker found later can only come from this save.
    const first = await documentOf();
    expect(first.id, 'the callout frames the seeded document').toBe(
      seeded.collaboraDocumentId
    );
    expect(
      await readOfficeDocumentText(first.previewUrl!),
      'the seeded document is stored blank'
    ).toEqual({
      paragraphs: [],
      bytes: 0,
    });

    const { dialog, frame } = await openDocument(page, seeded);
    await focusDocument(frame);
    await page.keyboard.type(AUTHOR_TEXT);
    // The footer STARTS at "Saved", so only the transition means anything: COOL registered the edit...
    await expect(saveStatus(dialog, 'Unsaved changes')).toBeVisible();
    await page.keyboard.press('ControlOrMeta+S');
    // ...and then reported the save.
    await expect(saveStatus(dialog, 'Saved')).toBeVisible();

    // Guards: a save never stored, stored to another file, or a WOPI token issued for the wrong document.
    // The stored paragraph equals the marker exactly; `previewUrl` is re-read on every poll.
    await expect
      .poll(() => storedParagraphs(page), {
        message: 'the stored file holds the typed paragraph',
      })
      .toContain(AUTHOR_TEXT);
    await closeDocument(dialog);
  });

  test('E9-2 a colleague opens it after the author left, adds a line and saves; both lines survive, the author first', async ({
    browser,
  }) => {
    const member = await openPersonaPage(
      browser,
      TestUserManager.users.spaceMember.email
    );
    try {
      // Precondition: the member may write the document (CONTRIBUTE); a member without UPDATE_CONTENT would be refused PutFile.
      const mine = await documentOf(await sessionActor(member.page));
      expect(
        mine.authorization?.myPrivileges,
        'a member holds UPDATE_CONTENT on the document'
      ).toContain(AuthorizationPrivilege.UpdateContent);

      const { dialog, frame } = await openDocument(member.page, seeded);
      await focusDocument(frame);
      await member.page.keyboard.press('ControlOrMeta+End');
      await member.page.keyboard.press('Enter');
      await member.page.keyboard.type(MEMBER_TEXT);
      await expect(saveStatus(dialog, 'Unsaved changes')).toBeVisible();
      await member.page.keyboard.press('ControlOrMeta+S');
      await expect(saveStatus(dialog, 'Saved')).toBeVisible();

      // Read as the member. COOL saves the WHOLE document, so a session that had loaded a stale or blank file would have
      // written one without the author's line (the falsifiable substitute for "the second browser shows the text", which
      // canvas rendering makes impossible).
      await expect
        .poll(
          async () => {
            const paragraphs = await storedParagraphs(member.page);
            const at = paragraphs.indexOf(AUTHOR_TEXT);
            return {
              authorKept: at !== -1,
              memberAfterAuthor:
                paragraphs.indexOf(MEMBER_TEXT) > at && at !== -1,
              authorLines: paragraphs.filter(p => p === AUTHOR_TEXT).length,
            };
          },
          {
            message:
              "the stored file holds the author's line once, then the member's",
          }
        )
        .toEqual({ authorKept: true, memberAfterAuthor: true, authorLines: 1 });
      await closeDocument(dialog);
    } finally {
      await member.close();
    }
  });
});
