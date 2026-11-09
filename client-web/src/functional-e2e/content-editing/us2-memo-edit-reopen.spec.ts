// spec: client-web/src/functional-e2e/content-editing/content-editing-test-plan.md
// W2 journey 5 (docs/qa/server-rebuild/plan.md § W2), memo: E10-1, E10-2.
//
// The author types a paragraph into a seeded memo; the oracle is the platform's
// stored content (`Memo.markdown`, the checkpoint the server reads by the memo's
// content pointer, NOT the live room), polled until the collaboration service
// has saved. Then a colleague opens it in a fresh session after the author left,
// appends, and the author reopens: every session gets the stored text back.
//
//   author `space.admin` · colleague `space.member` · private Space, own seed
//
// Not here: signing (deferred, no Cleverbase identity), live relay to a second
// open editor (memo-pdf-download US1-AS4), the authorization negatives (API).

import { expect, test } from '@playwright/test';
import {
  AuthorizationPrivilege,
  readMemoContent,
  TestUserManager,
  type WhiteboardPeer,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must, sessionActor } from '../helpers/lib-actor.helper';
import { openPersonaPage, type PersonaPage } from '../helpers/space-access.helper';
import { appendMemoParagraph, newUid, openMemo, paragraphsOf, seedContentSpace, teardownContent, type SeededContent } from './content-editing.helpers';

const uid = newUid();
const SEED = `Seed ${uid}`;
const AUTHOR_TEXT = `MEMO ${uid}`;
const MEMBER_TEXT = `MEMBER ${uid}`;

let scenario: OrganizationWithSpaceModel | undefined;
let seeded: SeededContent;
let author: PersonaPage | undefined;
const noPeers: WhiteboardPeer[] = [];

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  seeded = await seedContentSpace('memo', uid, s => {
    scenario = s;
  });
  author = await openPersonaPage(browser, TestUserManager.users.spaceAdmin.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await author?.close();
  await teardownContent(noPeers, scenario);
  scenario = undefined;
});

const memoId = (): string => seeded.memoId ?? '';

test.describe('W2 journey 5 — a memo is edited, then reopened', () => {
  test('E10-1 the author types a paragraph and the platform stores it (stored markdown holds the seed and then the paragraph, in order)', async () => {
    const page = author!.page;
    // Precondition (positive control): the read works, and the create path stored the seed.
    const before = must(await readMemoContent(memoId()), 'readMemoContent (before)').lookup.memo!;
    expect(paragraphsOf(before.markdown), 'the seeded memo reads back its seed').toEqual([SEED]);

    const { dialog, editor } = await openMemo(page, seeded);
    // The author is the first and only connection, so the editor is editable (single-editor rule without the multi-user plan).
    await expect(editor).toHaveAttribute('contenteditable', 'true');
    await expect(editor.getByRole('paragraph')).toHaveText([SEED]);

    await appendMemoParagraph(page, editor, AUTHOR_TEXT);
    await expect(editor.getByRole('paragraph')).toHaveText([SEED, AUTHOR_TEXT]);

    // The stored checkpoint, read as the author's own session: exact, in order, nothing else.
    // Guards: the collaborator's edit never reaching the checkpoint, a stale pointer, an empty or stale resolver.
    await expect
      .poll(async () => paragraphsOf(must(await readMemoContent(memoId(), await sessionActor(page)), 'readMemoContent').lookup.memo!.markdown), {
        message: 'the stored markdown holds the seed, then the typed paragraph',
      })
      .toEqual([SEED, AUTHOR_TEXT]);
    const after = must(await readMemoContent(memoId(), await sessionActor(page)), 'readMemoContent (after)').lookup.memo!;
    expect(
      Date.parse(String(after.updatedDate)),
      'the memo row moved when the edit was stored'
    ).toBeGreaterThan(Date.parse(String(before.updatedDate)));

    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toBeHidden();
    // After the hidden check, which is the positive control that the page settled: nothing was left unsaved.
    await expect(page.getByRole('dialog', { name: 'Unsaved memo changes' })).toHaveCount(0);
  });

  test('E10-2 a colleague opens it in a fresh session after the author left and appends; the author reloads and sees all three paragraphs', async ({
    browser,
  }) => {
    const member = await openPersonaPage(browser, TestUserManager.users.spaceMember.email);
    try {
      // Precondition: the member may edit the memo in this Space (CONTRIBUTE), read as the member's own session.
      const mine = must(await readMemoContent(memoId(), await sessionActor(member.page)), 'readMemoContent as the member').lookup.memo!;
      expect(mine.authorization?.myPrivileges, 'a member holds UPDATE_CONTENT on the memo').toContain(AuthorizationPrivilege.UpdateContent);

      const { dialog, editor } = await openMemo(member.page, seeded);
      // Fails (rather than adapting) when the author's closed dialog left the memo room: the member would be admitted read-only.
      await expect(editor, "member admitted read-only: the author's connection is still in the memo room (single-editor rule)").toHaveAttribute(
        'contenteditable',
        'true'
      );
      // The second session sees the author's text BEFORE typing: it loaded the stored content, not the seed.
      await expect(editor.getByRole('paragraph')).toHaveText([SEED, AUTHOR_TEXT]);

      await appendMemoParagraph(member.page, editor, MEMBER_TEXT);
      await expect(editor.getByRole('paragraph')).toHaveText([SEED, AUTHOR_TEXT, MEMBER_TEXT]);

      // Read as the member: an authorization-scoped read-back. Guards: a later session that loads stale content and
      // overwrites it (the author's paragraph would be gone), and a member who cannot write to their own Space's memo.
      await expect
        .poll(async () => paragraphsOf(must(await readMemoContent(memoId(), await sessionActor(member.page)), 'readMemoContent').lookup.memo!.markdown), {
          message: 'the stored markdown holds all three paragraphs, in order',
        })
        .toEqual([SEED, AUTHOR_TEXT, MEMBER_TEXT]);

      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(dialog).toBeHidden();
    } finally {
      await member.close();
    }

    // The author, in the same tab as E10-1: a reload and a reopen is a fresh editor session.
    const page = author!.page;
    await page.reload();
    const { editor } = await openMemo(page, seeded);
    await expect(editor.getByRole('paragraph')).toHaveText([SEED, AUTHOR_TEXT, MEMBER_TEXT]);
  });
});
