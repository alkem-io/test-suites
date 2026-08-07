import { expect, test } from '@playwright/test';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  avatarComposite,
  composer,
  conversationRow,
  createConversation,
  ensureConversationList,
  expectMessageReceived,
  gutterRow,
  messageColumn,
  openChatPanel,
  openConversation,
  panelHeader,
  registerAndSignInAll,
  sendMessage,
  srOnlyAuthorName,
  teardownAccounts,
  uploadProfileAvatar,
  type TestPerson,
} from './chat-avatars.helpers';

/**
 * workspace#033-chat-avatars — User Story 3 (P2)
 *
 * "See who you are talking to in a private chat": a 1:1 thread shows the other
 * person's avatar next to their name at the top of the popup — the same avatar
 * (or initials fallback) their conversation-list row shows. The message bubbles
 * themselves are untouched: no avatars are added in a 1:1 thread, incoming or
 * outgoing.
 *
 * Covers spec.md US3 AS1–AS3. Every registered user is deleted in afterAll.
 */

test.describe.configure({ mode: 'serial' });

/** Same rule as `initials.ts`: first letter of the first two words, uppercased. */
const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => [...word][0]?.toUpperCase() ?? '')
    .join('');

test.describe('US3 — direct (1:1) thread header identity', { tag: ['@chat-avatars'] }, () => {
  let viewer: TestPerson, pictured: TestPerson, plain: TestPerson;
  let picturedAvatarSrc: string;
  let uid: string;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(600000);
    uid = UniqueIDGenerator.getID();

    // The viewer drives the walk, `pictured` uploads a picture and `plain`
    // answers in AS3 — all three need a session, created concurrently.
    [viewer, pictured, plain] = await registerAndSignInAll(browser, [
      { email: `chatavatars3-viewer-${uid}@alkem.io`, firstName: `Viewer3${uid}`, lastName: 'Reader' },
      { email: `chatavatars3-pictured-${uid}@alkem.io`, firstName: `Pia3${uid}`, lastName: 'Pictured' },
      { email: `chatavatars3-plain-${uid}@alkem.io`, firstName: `Percy3${uid}`, lastName: 'Plain' },
    ]);

    picturedAvatarSrc = await uploadProfileAvatar(pictured);

    await openChatPanel(viewer.page);
    await createConversation(viewer.page, [pictured.displayName]);
    await ensureConversationList(viewer.page);
    await createConversation(viewer.page, [plain.displayName]);
    await ensureConversationList(viewer.page);
  });

  test.afterAll(async () => {
    await teardownAccounts([viewer, pictured, plain]);
  });

  test("US3-AS1: the header shows the other person's profile picture, exactly as their list row does", async ({}, testInfo) => {
    await ensureConversationList(viewer.page);
    const row = conversationRow(viewer.page, [pictured.displayName]);
    await expect(row).toHaveCount(1, { timeout: 20000 });
    const listComposite = await avatarComposite(row);
    expect(listComposite.imgSrcs, 'the list row should show the uploaded picture').toEqual([picturedAvatarSrc]);

    await row.click();
    await expect(composer(viewer.page)).toBeVisible({ timeout: 20000 });

    const header = await avatarComposite(panelHeader(viewer.page));
    expect(header.imgSrcs).toEqual(listComposite.imgSrcs);
    expect(header.fallbackTexts).toHaveLength(0);
    // The title stays next to it — the avatar is added, nothing is replaced.
    await expect(panelHeader(viewer.page)).toContainText(pictured.displayName);
    await viewer.page.screenshot({ path: testInfo.outputPath('us3-as1-header-photo.png') });
  });

  /**
   * NOTE: this environment assigns every new account a generated avatar at
   * registration and the UI offers no way to remove a profile picture, so the
   * `avatarUrl === undefined` branch that renders `AvatarFallback` is not
   * reachable through the product — it is covered by `ConversationAvatar.test.tsx`.
   * What FR-001 actually requires, and what is reachable here, is that the header
   * uses the SAME treatment the list row uses for that person, whichever it is.
   */
  test('US3-AS2: a person who never uploaded a picture gets the same treatment in both surfaces', async ({}, testInfo) => {
    await ensureConversationList(viewer.page);
    const row = conversationRow(viewer.page, [plain.displayName]);
    await expect(row).toHaveCount(1, { timeout: 20000 });

    const listComposite = await avatarComposite(row);
    // Exactly one avatar cell — the platform-assigned image, or an initials tile.
    expect(listComposite.imgSrcs.length + listComposite.fallbackTexts.length).toBe(1);
    if (listComposite.fallbackTexts.length === 1) {
      expect(listComposite.fallbackTexts).toEqual([initialsOf(plain.displayName)]);
    }

    await row.click();
    await expect(composer(viewer.page)).toBeVisible({ timeout: 20000 });

    const header = await avatarComposite(panelHeader(viewer.page));
    expect(header.imgSrcs).toEqual(listComposite.imgSrcs);
    expect(header.fallbackTexts).toEqual(listComposite.fallbackTexts);
    // ...and it is this person's identity, not the picture AS1's contact uploaded.
    expect(header.imgSrcs).not.toContain(picturedAvatarSrc);
    await expect(panelHeader(viewer.page)).toContainText(plain.displayName);
    await viewer.page.screenshot({ path: testInfo.outputPath('us3-as2-header.png') });
  });

  test('US3-AS3: 1:1 message bubbles are unchanged — no avatars, incoming or outgoing', async () => {
    // Both sides open the thread themselves — this scenario does not depend on
    // which conversation an earlier test left open.
    await openConversation(viewer.page, [plain.displayName]);
    await openChatPanel(plain.page);
    await openConversation(plain.page, [viewer.displayName]);

    await sendMessage(viewer.page, 'AS3 outgoing in a direct chat');
    await expectMessageReceived(plain.page, 'AS3 outgoing in a direct chat');
    await sendMessage(plain.page, 'AS3 incoming in a direct chat');
    await expectMessageReceived(viewer.page, 'AS3 incoming in a direct chat');

    for (const text of ['AS3 outgoing in a direct chat', 'AS3 incoming in a direct chat']) {
      // No avatar gutter is ever reserved in a 1:1 thread (FR-011).
      await expect(gutterRow(viewer.page, text)).toHaveCount(0);
      // ...and no sender attribution is injected either.
      await expect(srOnlyAuthorName(messageColumn(viewer.page, text))).toHaveCount(0);
    }

    // Outgoing stays right-aligned, incoming stays left-aligned, as before.
    await expect(messageColumn(viewer.page, 'AS3 outgoing in a direct chat')).toHaveClass(/items-end/);
    await expect(messageColumn(viewer.page, 'AS3 incoming in a direct chat')).toHaveClass(/items-start/);
  });
});
