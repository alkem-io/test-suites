/**
 * Persisted acceptance walk for images in comment replies.
 *
 * Authored from a green pseudo-manual walk driven headless against the live
 * stack at http://localhost:3000 (the gateway; NEVER :3001 — the raw vite
 * origin is CORS-blocked and yields false failures).
 *
 * Replying to a comment with an image, as an ORDINARY space member (M holds
 * only the member role; the image button in a reply box follows the right to
 * reply in the room, not upload rights on the bucket):
 *   - paste one image, Send → the reply box stays open (controls disabled)
 *     while the send is in flight, then closes; the reply is the last one in
 *     the thread, with the picture inline.
 *   - text + one image → one reply carrying both, the text as the image's
 *     caption.
 *   - upload route blocked → the box stays open with the typed text, the
 *     failure is announced and the chip stays listed, nothing is posted; after
 *     unblocking, Send again posts one reply with the text and the image; the
 *     chip can also be removed.
 *   - an image staged on comment A's reply box is not carried over to comment
 *     B's reply box.
 *
 * Self-seeding (comment-images.helpers.ts): a private Space with a published
 * callout with comments, a fresh member M and a fresh member O who writes two
 * top-level comments. Everything is deleted in afterAll.
 *
 * `config/playwright.config.nightly.ts` registers the three walks as the
 * "Comment images" project (tier: extended). Run (from client-web/):
 *   pnpm run test:nightly --project="Comment images"
 *   pnpm run test:nightly --project="Comment images" comment-images-us2
 */

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  UPLOAD_FAILED_LABEL,
  UPLOAD_FAILED_MESSAGE,
  UPLOAD_ROUTE,
  addMember,
  cleanUpCommentImages,
  displayNameOf,
  expectOneSend,
  holdUploads,
  image,
  inlineImage,
  newSeed,
  replyBox,
  rowsWithText,
  seedCommentImages,
  signIn,
  trackSends,
  transfer,
} from './comment-images.helpers';

const PNG_ONE = image('one.png');
const PNG_A = image('a.png');
const PNG_B = image('b.png');
const TEXT_REPLY = 'US2 text reply';
const TEXT_RETRY = 'US2 retried reply';

test.describe('Comment images — US2 P1 acceptance walk (replies)', { tag: ['@forge-acceptance', '@comment-images'] }, () => {
  const seed = newSeed();
  let memberPage: Page;
  let memberName: string;
  let commentA: string;
  let commentB: string;

  const dialog = (page: Page): Locator => page.getByRole('dialog', { name: seed.calloutName });
  /** The top-level comment (list item) carrying exactly this text. */
  const comment = (page: Page, text: string): Locator => rowsWithText(dialog(page), text).first();
  const openReply = async (item: Locator): Promise<Locator> => {
    await item.getByRole('button', { name: 'Reply', exact: true }).click();
    const box = replyBox(item);
    await expect(box).toBeVisible();
    // The reply box ignores pasted and dropped files until the room's storage
    // bucket is known; its image button appears with the bucket.
    await expect(box.getByRole('button', { name: 'Add image' })).toBeVisible();
    return box;
  };
  const stagedList = (box: Locator): Locator => box.getByRole('list', { name: 'Files to send' });
  /**
   * One entry per reply to the comment, oldest first: which of this walk's
   * reply texts it carries (empty for none), and its picture count. The reply
   * list has no accessible name, so a reply row is the list item that names M
   * as its author (every reply here is M's; the comments themselves are O's).
   */
  const replyRows = async (item: Locator): Promise<string[]> => {
    const rows = rowsWithText(item, memberName);
    const out: string[] = [];
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      let text = '';
      for (const candidate of [TEXT_REPLY, TEXT_RETRY]) {
        if ((await row.getByText(candidate, { exact: true }).count()) > 0) text = candidate;
      }
      const images = await row.getByRole('img', { name: /^Attached image/ }).count();
      out.push(`${text}|images=${images}`);
    }
    return out;
  };
  const openCallout = async (page: Page): Promise<void> => {
    await page.goto(seed.calloutUrl);
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByRole('textbox', { name: 'Add a comment...' }).first()).toBeVisible();
  };

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);

    await seedCommentImages(seed, 'us2');
    // M and O are ORDINARY members: the image button follows space
    // participation, not admin rights.
    const owner = await addMember(seed, 'owner');
    const member = await addMember(seed, 'member');

    // O writes two top-level comments, A then B.
    commentA = `US2 comment A ${seed.uid}`;
    commentB = `US2 comment B ${seed.uid}`;
    const ownerPage = await signIn(browser, seed, owner.email);
    await openCallout(ownerPage);
    for (const text of [commentA, commentB]) {
      const input = dialog(ownerPage).getByRole('textbox', { name: 'Add a comment...' }).first();
      await input.fill(text);
      await dialog(ownerPage).getByRole('button', { name: 'Send' }).first().click();
      await expect(comment(ownerPage, text)).toBeVisible();
      await expect(input).toHaveValue('');
    }
    await ownerPage.context().close();

    memberName = await displayNameOf(member);
    memberPage = await signIn(browser, seed, member.email);
  });

  test.afterAll(async () => {
    await cleanUpCommentImages(seed);
  });

  test('US2-AS1: a pasted image reply keeps the box open until the send completes, then shows the picture last in the thread', async () => {
    await openCallout(memberPage);
    const item = comment(memberPage, commentA);
    const rowsBefore = await replyRows(item);
    // openReply waits for the image button: it is offered to the ordinary member.
    const box = await openReply(item);

    // Hold the upload so the in-flight state is observable deterministically.
    const releaseUploads = await holdUploads(memberPage);

    await transfer(box.getByRole('textbox'), 'paste', PNG_ONE);
    await expect(stagedList(box)).toContainText('one.png');
    await box.getByRole('button', { name: 'Send' }).click();

    // In flight: the box is still open and its controls are disabled.
    await expect(box.getByRole('status', { name: 'Uploading…' })).toBeVisible();
    await expect(box.getByRole('textbox')).toBeDisabled();
    await expect(box.getByRole('button', { name: 'Send' })).toBeDisabled();
    await expect(box.getByRole('button', { name: 'Add image' })).toBeDisabled();

    await releaseUploads();
    await expect(box).toHaveCount(0);

    // The reply is the last one in the thread, with the picture rendered.
    const picture = inlineImage(item, 'one.png');
    await expect(picture).toBeVisible();
    await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(await replyRows(item)).toEqual([...rowsBefore, '|images=1']);

    await memberPage.reload();
    await expect(dialog(memberPage)).toBeVisible();
    await expect(inlineImage(comment(memberPage, commentA), 'one.png')).toHaveCount(1);
  });

  test('US2-AS2: text plus an image in a reply produces one reply carrying the text and the picture', async () => {
    await openCallout(memberPage);
    const item = comment(memberPage, commentB);
    const rowsBefore = await replyRows(item);
    const box = await openReply(item);

    await box.getByRole('textbox').fill(TEXT_REPLY);
    await transfer(box.getByRole('textbox'), 'paste', PNG_A);
    await expect(stagedList(box)).toContainText('a.png');
    await box.getByRole('button', { name: 'Send' }).click();
    await expect(box).toHaveCount(0);

    await expect(inlineImage(item, 'a.png')).toBeVisible();
    expect(await replyRows(item)).toEqual([...rowsBefore, `${TEXT_REPLY}|images=1`]);

    await memberPage.reload();
    await expect(dialog(memberPage)).toBeVisible();
    await expect(inlineImage(comment(memberPage, commentB), 'a.png')).toHaveCount(1);
    expect(await replyRows(comment(memberPage, commentB))).toEqual([...rowsBefore, `${TEXT_REPLY}|images=1`]);
  });

  test('US2-AS3: a failed upload keeps the box open with the typed text, a marked chip and a message; retry posts one reply with both; the chip can be removed', async () => {
    await openCallout(memberPage);
    const item = comment(memberPage, commentB);
    const rowsBefore = await replyRows(item);

    const box = await openReply(item);
    const sends = trackSends(memberPage, 'sendMessageReplyToRoom');
    await memberPage.route(UPLOAD_ROUTE, route => route.abort('failed'));
    await box.getByRole('textbox').fill(TEXT_RETRY);
    await transfer(box.getByRole('textbox'), 'paste', PNG_B);
    await expect(stagedList(box)).toContainText('b.png');
    await box.getByRole('button', { name: 'Send' }).click();

    // Box stays open with the typed text, the failure is announced, the chip
    // stays listed with its Remove control, nothing was posted.
    await expect(box.getByRole('alert')).toHaveText(UPLOAD_FAILED_MESSAGE);
    // The chip is marked failed in text, not by colour alone.
    await expect(stagedList(box).getByRole('listitem')).toHaveText(`b.png${UPLOAD_FAILED_LABEL}`);
    await expect(box.getByRole('button', { name: 'Remove b.png' })).toBeEnabled();
    await expect(box.getByRole('textbox')).toBeEnabled();
    await expect(box.getByRole('textbox')).toHaveValue(TEXT_RETRY);
    await expect(box.getByRole('button', { name: 'Send' })).toBeEnabled();
    // The reply text travels with the image, so a text sent ahead of the
    // upload would already be counted here.
    expect(sends.requests, 'nothing may be posted while the upload fails').toHaveLength(0);
    expect(await replyRows(item)).toEqual(rowsBefore);

    // Unblock and send again: the same chip uploads and one reply lands,
    // carrying the text and the picture.
    await memberPage.unroute(UPLOAD_ROUTE);
    await box.getByRole('button', { name: 'Send' }).click();
    await expect(box).toHaveCount(0);
    await expect(inlineImage(item, 'b.png')).toBeVisible();
    await expectOneSend(sends, 'sendMessageReplyToRoom', { text: TEXT_RETRY });
    expect(await replyRows(item)).toEqual([...rowsBefore, `${TEXT_RETRY}|images=1`]);

    // Remove path: fail again, then drop the chip instead of retrying.
    const box2 = await openReply(item);
    await memberPage.route(UPLOAD_ROUTE, route => route.abort('failed'));
    await transfer(box2.getByRole('textbox'), 'paste', PNG_A);
    await box2.getByRole('button', { name: 'Send' }).click();
    await expect(box2.getByRole('alert')).toBeVisible();
    await box2.getByRole('button', { name: 'Remove a.png' }).click();
    await expect(stagedList(box2)).toHaveCount(0);
    await expect(box2.getByRole('alert')).toHaveCount(0);
    await expect(box2).toBeVisible();
    await memberPage.unroute(UPLOAD_ROUTE);
    expect(await replyRows(item)).toEqual([...rowsBefore, `${TEXT_RETRY}|images=1`]);
  });

  test("US2-AS4: an image staged on comment A's reply box is not carried over to comment B's", async () => {
    await openCallout(memberPage);
    const itemA = comment(memberPage, commentA);
    const itemB = comment(memberPage, commentB);

    const boxA = await openReply(itemA);
    await transfer(boxA.getByRole('textbox'), 'paste', PNG_A);
    await expect(stagedList(boxA)).toContainText('a.png');

    const boxB = await openReply(itemB);
    await expect(boxA).toHaveCount(0);
    await expect(stagedList(boxB)).toHaveCount(0);
    await expect(boxB.getByRole('button', { name: /^Remove / })).toHaveCount(0);
    await expect(dialog(memberPage).getByRole('list', { name: 'Files to send' })).toHaveCount(0);
  });
});
