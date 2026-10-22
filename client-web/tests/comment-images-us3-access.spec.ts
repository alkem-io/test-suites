/**
 * Acceptance walk: who gets the image button and which files are refused.
 * Acts as a signed-in non-member, an ordinary member, a space admin and the
 * platform admin (the refusals run as the platform admin). Each case maps to
 * its acceptance scenario in comment-images-test-plan.md.
 */

import { writeFileSync } from 'node:fs';
import { expect, test, type Browser, type Page, type Route } from '@playwright/test';
import {
  ADMIN_EMAIL,
  addMember,
  addOutsider,
  addSpaceAdmin,
  cleanUpCommentImages,
  commentRoomMaxFileSize,
  expectOneSend,
  image,
  isSendOf,
  makePng,
  newSeed,
  openComposer,
  replyBox,
  rowsWithText,
  seedCommentImages,
  signIn as signInWith,
  trackSends,
  transfer,
  type SendOperation,
} from './comment-images.helpers';

const PNG = image('a.png');
const BITMAP = image('image.png');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');

const seed = newSeed();
const personas: { member: string; spaceAdmin: string; outsider: string } = {
  member: '',
  spaceAdmin: '',
  outsider: '',
};
/** The comment room bucket's `maxFileSize`, in bytes, read in beforeAll. */
let maxFileSize = 0;

/** A PNG exactly one byte larger than the room's limit. */
function oversizedPng(limit: number): Buffer {
  const png = makePng('big.png');
  return Buffer.concat([png, Buffer.alloc(limit + 1 - png.length)]);
}

/** The limit as the composer words it: whole mebibytes, rounded down. */
const limitInMb = (limit: number): number => Math.floor(limit / (1024 * 1024));

const signIn = (browser: Browser, email: string): Promise<Page> =>
  signInWith(browser, seed, email, { width: 1280, height: 900 });

/**
 * Submits with every call of `operation` held at the network, runs `whileHeld`
 * once the call has left the page (what the composer shows before the send
 * settles), then lets the call through and returns its response body.
 */
async function submitWhileSendHeld(
  page: Page,
  operation: SendOperation,
  submit: () => Promise<void>,
  whileHeld: () => Promise<void>
): Promise<{ data?: any; errors?: unknown }> {
  const isSend = isSendOf(operation);
  const graphql = (url: URL): boolean => url.pathname.includes('graphql');
  let release: () => void = () => undefined;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  let held = false;
  const hold = async (route: Route) => {
    if (!isSend(route.request())) return route.fallback();
    held = true;
    await gate;
    await route.continue();
  };
  await page.route(graphql, hold);
  try {
    const response = page.waitForResponse(r => isSend(r.request()));
    response.catch(() => undefined);
    await submit();
    await expect.poll(() => held, `${operation} left the page`).toBe(true);
    await whileHeld();
    release();
    return await (await response).json();
  } finally {
    release();
    await page.unroute(graphql, hold);
  }
}

test.describe('Comment images — US3 P1 access and validation walk', { tag: ['@forge-acceptance', '@comment-images'] }, () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await seedCommentImages(seed, 'us3', { post: true, event: true, discussion: true });
    personas.member = (await addMember(seed, 'member')).email;
    personas.spaceAdmin = (await addSpaceAdmin(seed, 'spaceadmin')).email;
    personas.outsider = (await addOutsider(seed, 'outsider')).email;
    maxFileSize = await commentRoomMaxFileSize(seed);
  });

  test.afterAll(async () => {
    await cleanUpCommentImages(seed);
  });

  test('US3-AS1: a signed-in non-member sees no comment field and no image button', async ({ browser }) => {
    const page = await signIn(browser, personas.outsider);
    for (const url of [seed.calloutUrl, seed.postUrl]) {
      await page.goto(url);
      await expect(page.getByRole('heading', { name: 'We are redirecting you...' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Add a comment...' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Add image' })).toHaveCount(0);
    }
  });

  // The platform admin is an extra case beside the two space roles.
  const roomUsers: Record<string, () => string> = {
    member: () => personas.member,
    'space admin': () => personas.spaceAdmin,
    'platform admin': () => ADMIN_EMAIL,
  };
  for (const [persona, email] of Object.entries(roomUsers)) {
    test(`US3-AS2: ${persona} sees the image button and can send an image on a callout and a post`, async ({
      browser,
    }) => {
      const page = await signIn(browser, email());
      for (const url of [seed.calloutUrl, seed.postUrl]) {
        // openComposer waits for the image button.
        const c = await openComposer(page, url);
        await c.fileInput.setInputFiles(PNG);
        await expect(c.stagedList).toContainText('a.png');
        const sends = trackSends(page);
        await c.send.click();
        // Staged list cleared: every call the send makes has left the page.
        await expect(c.stagedList).toHaveCount(0);
        await expectOneSend(sends, 'sendMessageToRoom', { mimeType: 'image/png' });
      }
    });
  }

  test.describe('refusals on the callout composer (admin)', () => {
    let page: Page;
    test.beforeAll(async ({ browser }) => {
      page = await signIn(browser, ADMIN_EMAIL);
    });

    test('US3-AS3: a PDF dropped or pasted is refused and nothing is staged', async () => {
      for (const kind of ['drop', 'paste'] as const) {
        const { dlg, box, stagedList } = await openComposer(page, seed.calloutUrl);
        await transfer(box, kind, { name: 'doc.pdf', mimeType: 'application/pdf', buffer: PDF });
        await expect(dlg.getByText('doc.pdf has an unsupported file type.')).toBeVisible();
        await expect(stagedList).toHaveCount(0);
      }
    });

    test('US3-AS4: an SVG picked is refused as unsupported', async () => {
      const { dlg, stagedList, fileInput } = await openComposer(page, seed.calloutUrl);
      await fileInput.setInputFiles({
        name: 'vector.svg',
        mimeType: 'image/svg+xml',
        buffer: SVG,
      });
      await expect(dlg.getByText('vector.svg has an unsupported file type.')).toBeVisible();
      await expect(stagedList).toHaveCount(0);
    });

    test('US3-AS5: an image above the size limit is refused with the limit in MB', async () => {
      const { dlg, stagedList, fileInput } = await openComposer(page, seed.calloutUrl);
      // Handed over as a file path: Playwright refuses an in-memory buffer above
      // 50 MB, and the limit is whatever the bucket reports.
      const bigPng = test.info().outputPath('big.png');
      writeFileSync(bigPng, oversizedPng(maxFileSize));
      await fileInput.setInputFiles(bigPng);
      await expect(dlg.getByRole('alert')).toHaveText(`big.png is larger than ${limitInMb(maxFileSize)} MB.`);
      await expect(stagedList).toHaveCount(0);
    });

    test('US3-AS7: plain text and Office rich text with a bitmap paste as text; nothing is staged', async () => {
      const { box, stagedList } = await openComposer(page, seed.calloutUrl);
      // The comment field inserts pasted text itself (its mention support takes
      // over the paste), so the clipboard text reaching the field proves the
      // image handling let the paste through. Each case starts from an empty field.
      // Plain text only: no files on the clipboard.
      await box.fill('');
      await transfer(box, 'paste', null, { 'text/plain': 'plain text' });
      await expect(box).toHaveValue('plain text');
      await expect(stagedList).toHaveCount(0);
      // Office rich text: RTF + HTML + text flavours alongside a rendered bitmap.
      await box.fill('');
      await transfer(box, 'paste', BITMAP, {
        'text/rtf': '{\\rtf1 office text}',
        'text/plain': 'office text',
        'text/html': '<p>office text</p>',
      });
      await expect(box).toHaveValue('office text');
      await expect(stagedList).toHaveCount(0);
      // Control: a bare bitmap is taken as an image — the paste is consumed, the
      // chip is staged and no text is inserted.
      await box.fill('');
      expect(await transfer(box, 'paste', BITMAP), 'a bare bitmap paste is consumed').toBe(true);
      await expect(stagedList.getByRole('listitem')).toHaveText('image.png');
      await expect(box).toHaveValue('');
    });
  });

  test('US3-AS6: calendar event and forum discussion have no image button; text comments and replies behave as on develop', async ({
    browser,
  }) => {
    const page = await signIn(browser, personas.member);
    for (const url of [seed.eventUrl, seed.discussionUrl]) {
      await page.goto(url);
      const box = page.getByRole('textbox', { name: 'Add a comment...' });
      await box.waitFor();
      await expect(page.getByRole('button', { name: 'Add image' })).toHaveCount(0);
      await expect(page.locator('input[type=file]')).toHaveCount(0);

      // Top level: the field clears on submit, before the send settles.
      const text = `US3 text comment ${Date.now()}`;
      await box.fill(text);
      const posted = await submitWhileSendHeld(
        page,
        'sendMessageToRoom',
        () => page.getByRole('button', { name: 'Send', exact: true }).click(),
        () => expect(box).toHaveValue('')
      );
      expect(posted.errors, 'text comment must post as before').toBeUndefined();
      expect(posted.data.sendMessageToRoom.message).toBe(text);
      await expect(page.getByText(text, { exact: true })).toBeVisible();

      // Reply: the box closes on submit, before the send settles. The room
      // holds this one comment, so its innermost list item is the last match.
      const item = rowsWithText(page, text).last();
      await item.getByRole('button', { name: 'Reply', exact: true }).click();
      const reply = replyBox(page);
      await expect(reply).toBeVisible();
      await expect(reply.getByRole('button', { name: 'Add image' })).toHaveCount(0);
      const replyText = `US3 text reply ${Date.now()}`;
      await reply.getByRole('textbox').fill(replyText);
      const replied = await submitWhileSendHeld(
        page,
        'sendMessageReplyToRoom',
        () => reply.getByRole('button', { name: 'Send', exact: true }).click(),
        () => expect(reply).toHaveCount(0)
      );
      expect(replied.errors, 'text reply must post as before').toBeUndefined();
      expect(replied.data.sendMessageReplyToRoom.message).toBe(replyText);
      await expect(page.getByText(replyText, { exact: true })).toBeVisible();
    }
  });
});
