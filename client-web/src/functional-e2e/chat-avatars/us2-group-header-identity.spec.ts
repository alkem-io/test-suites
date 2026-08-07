import { expect, test } from '@playwright/test';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  avatarCellCount,
  avatarComposite,
  composer,
  conversationRow,
  createConversation,
  ensureConversationList,
  openChatPanel,
  openConversation,
  panelHeader,
  registerAccounts,
  registerAndSignIn,
  setGroupPhoto,
  teardownAccounts,
  type TestAccount,
  type TestPerson,
} from './chat-avatars.helpers';

/**
 * workspace#033-chat-avatars — User Story 2 (P1)
 *
 * "Recognize the group conversation from the thread header": the open thread's
 * header shows the same visual identity the conversation list row shows for
 * that group — the custom photo when one is set, otherwise the composite of up
 * to four participant avatars — and it updates the same way the list does.
 *
 * Covers spec.md US2 AS1–AS4. Every registered user is deleted in afterAll.
 */

test.describe.configure({ mode: 'serial' });

test.describe('US2 — group thread header identity', { tag: ['@chat-avatars'] }, () => {
  let viewer: TestPerson;
  /**
   * The other participants exist only to be found in the people picker and to
   * appear in the group's avatar composite — this walk never drives them, so
   * they get accounts but no browser session (see `registerAccount`).
   */
  let members: TestAccount[] = [];
  let uid: string;

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(900000);
    uid = UniqueIDGenerator.getID();

    // Two "other" participants for AS1–AS3, three more for the >4 cap in AS4.
    // The viewer's session and all five accounts are created concurrently.
    const memberSpecs = [
      ['b', `Bella2${uid}`],
      ['c', `Charlie2${uid}`],
      ['d', `Dana2${uid}`],
      ['e', `Eli2${uid}`],
      ['f', `Fran2${uid}`],
    ].map(([slot, firstName]) => ({
      email: `chatavatars2-${slot}-${uid}@alkem.io`,
      firstName,
      lastName: 'Member',
    }));

    [viewer, members] = await Promise.all([
      registerAndSignIn(browser, {
        email: `chatavatars2-viewer-${uid}@alkem.io`,
        firstName: `Viewer2${uid}`,
        lastName: 'Reader',
      }),
      registerAccounts(browser, memberSpecs),
    ]);

    await openChatPanel(viewer.page);
    await createConversation(viewer.page, [members[0].displayName, members[1].displayName]);
  });

  test.afterAll(async () => {
    await teardownAccounts([viewer, ...members]);
  });

  test('US2-AS1: with no custom photo the header shows the list row’s composite', async ({}, testInfo) => {
    await ensureConversationList(viewer.page);
    const row = conversationRow(viewer.page, [members[0].displayName, members[1].displayName]);
    await expect(row).toHaveCount(1, { timeout: 20000 });

    const listComposite = await avatarComposite(row);
    // Two other participants (the viewer is excluded from the composite) → two
    // cells, each an image or an initials tile depending on that account's photo.
    expect(listComposite.imgSrcs.length + listComposite.fallbackTexts.length).toBe(2);
    await viewer.page.screenshot({ path: testInfo.outputPath('us2-as1-list-row.png') });

    await row.click();
    await expect(composer(viewer.page)).toBeVisible({ timeout: 20000 });

    // Header ≡ list row: same images, same fallbacks, same order.
    const headerComposite = await avatarComposite(panelHeader(viewer.page));
    expect(headerComposite.imgSrcs).toEqual(listComposite.imgSrcs);
    expect(headerComposite.fallbackTexts).toEqual(listComposite.fallbackTexts);
    await viewer.page.screenshot({ path: testInfo.outputPath('us2-as1-header.png') });
  });

  test('US2-AS2: a custom photo replaces the composite, in the header and the list alike', async ({}, testInfo) => {
    test.setTimeout(180000);
    // Open the thread this scenario acts on rather than inheriting whichever
    // view the previous test left behind.
    await openConversation(viewer.page, [members[0].displayName, members[1].displayName]);
    await setGroupPhoto(viewer.page, 'a');

    // Wait for the header to settle on the single-photo branch BEFORE reading it —
    // reading first and polling afterwards would assert on the pre-upload snapshot.
    await expect
      .poll(async () => avatarCellCount(panelHeader(viewer.page)), { timeout: 30000 })
      .toBe(1);

    const header = await avatarComposite(panelHeader(viewer.page));
    expect(header.imgSrcs).toHaveLength(1);
    expect(header.fallbackTexts).toHaveLength(0);
    await viewer.page.screenshot({ path: testInfo.outputPath('us2-as2-header.png') });

    await ensureConversationList(viewer.page);
    const row = conversationRow(viewer.page, [members[0].displayName, members[1].displayName]);
    await expect(row).toHaveCount(1, { timeout: 20000 });
    const listComposite = await avatarComposite(row);
    expect(listComposite.imgSrcs).toEqual(header.imgSrcs);
    expect(listComposite.fallbackTexts).toHaveLength(0);
    await viewer.page.screenshot({ path: testInfo.outputPath('us2-as2-list-row.png') });

    await row.click();
    await expect(composer(viewer.page)).toBeVisible({ timeout: 20000 });
  });

  test('US2-AS3: changing the photo updates the header the same way it updates the list', async ({}, testInfo) => {
    test.setTimeout(240000);
    await openConversation(viewer.page, [members[0].displayName, members[1].displayName]);

    // This scenario is about CHANGING an existing photo, so it needs one to be
    // there. Set it here when AS2 did not run (filtered run, shard, retry)
    // instead of failing on a precondition another test happens to own.
    if ((await avatarComposite(panelHeader(viewer.page))).imgSrcs.length === 0) {
      await setGroupPhoto(viewer.page, 'a');
      await expect.poll(async () => avatarCellCount(panelHeader(viewer.page)), { timeout: 30000 }).toBe(1);
    }
    const before = (await avatarComposite(panelHeader(viewer.page))).imgSrcs[0];
    expect(before, 'the group should have a photo before this scenario changes it').toBeTruthy();

    await setGroupPhoto(viewer.page, 'b');

    await expect
      .poll(async () => (await avatarComposite(panelHeader(viewer.page))).imgSrcs[0], { timeout: 30000 })
      .not.toBe(before);

    const header = await avatarComposite(panelHeader(viewer.page));
    await viewer.page.screenshot({ path: testInfo.outputPath('us2-as3-header.png') });

    await ensureConversationList(viewer.page);
    const row = conversationRow(viewer.page, [members[0].displayName, members[1].displayName]);
    await expect(row).toHaveCount(1, { timeout: 20000 });
    expect((await avatarComposite(row)).imgSrcs).toEqual(header.imgSrcs);
    await viewer.page.screenshot({ path: testInfo.outputPath('us2-as3-list-row.png') });
  });

  test('US2-AS4: with more than four other participants both surfaces show the same 4-avatar subset', async ({}, testInfo) => {
    test.setTimeout(180000);
    const names = members.map(member => member.displayName);
    expect(names, 'AS4 needs five other participants').toHaveLength(5);

    await createConversation(viewer.page, names);

    const header = await avatarComposite(panelHeader(viewer.page));
    // GroupAvatar caps the composite at four cells regardless of member count.
    expect(header.imgSrcs.length + header.fallbackTexts.length).toBe(4);
    await viewer.page.screenshot({ path: testInfo.outputPath('us2-as4-header.png') });

    await ensureConversationList(viewer.page);
    const row = conversationRow(viewer.page, names);
    await expect(row).toHaveCount(1, { timeout: 20000 });
    const listComposite = await avatarComposite(row);
    await viewer.page.screenshot({ path: testInfo.outputPath('us2-as4-list-row.png') });

    // Same subset, same order, on both surfaces.
    expect(listComposite.imgSrcs).toEqual(header.imgSrcs);
    expect(listComposite.fallbackTexts).toEqual(header.fallbackTexts);
  });
});
