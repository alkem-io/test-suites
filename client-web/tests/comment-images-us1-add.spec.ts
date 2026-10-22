/**
 * Persisted acceptance walk for comment images: adding an image to a
 * top-level comment.
 *
 * Authored by forge-verify from a green pseudo-manual walk driven headless
 * against the live stack at http://localhost:3000 (the gateway; NEVER :3001).
 * Every scenario is driven as an ORDINARY space member (M); a second ordinary
 * member (V) is the second session for the live-update scenario.
 *
 * Self-seeding (comment-images.helpers.ts): a private Space with callout C
 * and post P (comments on), two fresh ORDINARY members M and V, all created
 * through the API in beforeAll under a run-unique name and deleted in
 * afterAll.
 *
 * Covers staging by paste, pick and drop; the one-image limit; sending an
 * image with text (one comment carrying both, the text as the image's
 * caption) or without; a post's own comments; a second viewer seeing the
 * picture live; accessibility; and a failed upload with its recovery. The
 * test plan maps each case to its acceptance scenario.
 *
 * `config/playwright.config.nightly.ts` registers the three walks as the
 * "Comment images" project (tier: extended). Run (from client-web/):
 *   pnpm run test:nightly --project="Comment images"
 *   pnpm run test:nightly --project="Comment images" comment-images-us1
 */

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  UPLOAD_FAILED_LABEL,
  UPLOAD_FAILED_MESSAGE,
  UPLOAD_ROUTE,
  addMember,
  cleanUpCommentImages,
  image,
  newSeed,
  seedCommentImages,
  sentVariables,
  signIn,
  trackSends,
  transfer,
  type SendTracker,
} from './comment-images.helpers';

const ONE_FILE_MESSAGE = 'You can attach only one file.';
const RUN = Date.now().toString(36);

// --- helpers -------------------------------------------------------------------------------------

type Composer = {
  dlg: Locator;
  box: Locator;
  stagedList: Locator;
  addImage: Locator;
  send: Locator;
  fileInput: Locator;
};

async function openComposer(page: Page, url: string): Promise<Composer> {
  await page.goto(url);
  const dlg = page.locator('[role=dialog]').last();
  const box = dlg.getByRole('textbox', { name: 'Add a comment...' });
  await box.waitFor();
  const addImage = dlg.getByRole('button', { name: 'Add image' });
  // The field renders before the room's storage bucket is known, and until
  // then the composer ignores pasted and dropped files. The image button
  // appears with the bucket, so it marks the composer as ready for them.
  await expect(addImage).toBeVisible();
  return {
    dlg,
    box,
    stagedList: dlg.getByRole('list', { name: 'Files to send' }),
    addImage,
    send: dlg.getByRole('button', { name: 'Send', exact: true }),
    fileInput: dlg.locator('input[type=file]').first(),
  };
}

const inlineImage = (scope: Locator, name: string): Locator =>
  scope.getByRole('img', { name: `Attached image: ${name}` });

/**
 * The comment rows (list items) whose text is exactly `text`. The picture's
 * own list item never carries the text, so a captioned image comment is one
 * match holding both the text and the picture.
 */
const commentRows = (dlg: Locator, text: string): Locator =>
  dlg
    .getByRole('listitem')
    .filter({ has: dlg.page().getByText(text, { exact: true }) });

/**
 * One comment row carries both the text and the picture: the picture sits in
 * that row's own Attachments list, the row holds no other list item (no reply
 * or second message nested in it), and the text reads above the picture.
 */
async function expectOneCaptionedRow(
  dlg: Locator,
  text: string,
  name: string
): Promise<Locator> {
  const row = commentRows(dlg, text);
  await expect(row).toHaveCount(1);
  const attachments = row.getByRole('list', { name: 'Attachments' });
  const picture = inlineImage(attachments, name);
  await expect(picture).toBeVisible();
  await expect(attachments.getByRole('listitem')).toHaveCount(1);
  await expect(row.getByRole('listitem')).toHaveCount(1);
  await expect(inlineImage(dlg, name)).toHaveCount(1);
  const textBox = await row.getByText(text, { exact: true }).boundingBox();
  const pictureBox = await picture.boundingBox();
  expect(textBox!.y).toBeLessThan(pictureBox!.y);
  return picture;
}

/**
 * Waits for a text-plus-image send to settle (field and staged list cleared,
 * so every call it makes has left the page), then checks it made exactly one
 * sendMessageToRoom call carrying the text and the image together.
 */
async function expectOneCaptionedSend(
  c: Composer,
  sends: SendTracker,
  text: string
): Promise<void> {
  await expect(c.box).toHaveValue('');
  await expect(c.stagedList).toHaveCount(0);
  await expect.poll(() => sends.bodies.length).toBe(1);
  sends.stop();
  expect(sends.requests, 'text and image travel in one message').toHaveLength(
    1
  );
  expect(sends.bodies).toHaveLength(1);
  const [body] = sends.bodies;
  expect(body.errors).toBeUndefined();
  const sent = body.data.sendMessageToRoom;
  expect(sent.message).toBe(text);
  expect(sent.attachments).toHaveLength(1);
}

test.describe(
  'Comment images — US1 P1 add-an-image walk',
  { tag: ['@forge-acceptance', '@comment-images'] },
  () => {
    const seed = newSeed();
    let m: Page;
    let v: Page;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(240_000);
      await seedCommentImages(seed, 'us1', { post: true });
      // M sends; V is a second ORDINARY member who keeps the thread open to
      // see a picture arrive live.
      const member = await addMember(seed, 'member');
      const viewer = await addMember(seed, 'viewer');
      m = await signIn(browser, seed, member.email);
      v = await signIn(browser, seed, viewer.email);
    });

    test.afterAll(async () => {
      await cleanUpCommentImages(seed);
    });

    test('US1-AS1: pasting an image stages a removable chip; nothing is uploaded; Send is enabled', async () => {
      const uploads: string[] = [];
      const onUpload = (r: { url: () => string }) => {
        if (r.url().includes('/messaging/media/upload')) uploads.push(r.url());
      };
      m.on('request', onUpload);
      const c = await openComposer(m, seed.calloutUrl);
      await expect(c.addImage).toBeVisible();
      await transfer(c.box, 'paste', image('one.png'));
      await expect(c.stagedList.getByRole('listitem')).toHaveText('one.png');
      await expect(
        c.stagedList.getByRole('button', { name: 'Remove one.png' })
      ).toBeVisible();
      await expect(c.send).toBeEnabled();
      m.off('request', onUpload);
      expect(uploads, 'staging must not upload').toHaveLength(0);
    });

    test('US1-AS2: text + staged image → one comment with the text and the inline picture beneath it; click opens full size in a new tab', async () => {
      const name = `as2-${RUN}.png`;
      const text = `see this ${RUN}`;
      const c = await openComposer(m, seed.calloutUrl);
      await transfer(c.box, 'paste', image(name));
      await expect(c.stagedList).toContainText(name);
      await c.box.fill(text);
      await c.send.click();

      const picture = await expectOneCaptionedRow(c.dlg, text, name);
      // No chip, and no filename line anywhere in the thread.
      await expect(c.stagedList).toHaveCount(0);
      await expect(c.dlg.getByText(name, { exact: true })).toHaveCount(0);

      const [tab] = await Promise.all([
        m.context().waitForEvent('page'),
        picture.click(),
      ]);
      await tab.waitForLoadState('load');
      expect(tab.url()).toContain('/storage/file/by-reference');
      expect(await tab.evaluate(() => document.contentType)).toBe('image/png');
      await tab.close();
    });

    test('US1-AS3: image + text → exactly one new comment row, carrying the text and the picture', async () => {
      const name = `as3-${RUN}.png`;
      const text = `as3 text ${RUN}`;
      const c = await openComposer(m, seed.calloutUrl);
      const sends = trackSends(m);
      await transfer(c.box, 'paste', image(name));
      await c.box.fill(text);
      await c.send.click();
      await expectOneCaptionedSend(c, sends, text);
      await expectOneCaptionedRow(c.dlg, text, name);
    });

    test('US1-AS4: a staged image with no text posts an image-only comment rendered inline', async () => {
      const name = `as4-${RUN}.png`;
      const c = await openComposer(m, seed.calloutUrl);
      const sends = trackSends(m);
      await transfer(c.box, 'paste', image(name));
      await expect(c.box).toHaveValue('');
      await expect(c.send).toBeEnabled();
      await c.send.click();
      await expect(inlineImage(c.dlg, name)).toBeVisible();
      // Response bodies are collected asynchronously; wait for this one to land.
      await expect.poll(() => sends.bodies.length).toBe(1);
      sends.stop();
      expect(sends.requests).toHaveLength(1);
      expect(sends.bodies).toHaveLength(1);
      expect(
        sends.bodies[0].data.sendMessageToRoom.attachments[0].mimeType
      ).toBe('image/png');
      await expect(c.stagedList).toHaveCount(0);
    });

    test('US1-AS5: the image button opens an images-only picker by mouse and keyboard; dragging shows the hint; a drop stages', async () => {
      const c = await openComposer(m, seed.calloutUrl);
      expect(await c.fileInput.getAttribute('accept')).toContain('image/png');
      expect(await c.fileInput.getAttribute('accept')).not.toContain(
        'application/pdf'
      );

      let [chooser] = await Promise.all([
        m.waitForEvent('filechooser'),
        c.addImage.click(),
      ]);
      await chooser.setFiles(image('a.png'));
      await expect(c.stagedList).toContainText('a.png');
      await c.stagedList.getByRole('button', { name: 'Remove a.png' }).click();
      await expect(c.stagedList).toHaveCount(0);

      for (const key of ['Enter', 'Space']) {
        await c.addImage.focus();
        [chooser] = await Promise.all([
          m.waitForEvent('filechooser'),
          m.keyboard.press(key),
        ]);
        await chooser.setFiles(image('a.png'));
        await expect(c.stagedList).toContainText('a.png');
        await c.stagedList
          .getByRole('button', { name: 'Remove a.png' })
          .click();
        await expect(c.stagedList).toHaveCount(0);
      }

      await transfer(c.box, 'dragover', image('a.png'));
      await expect(c.dlg.getByText('Drop files to attach')).toBeVisible();
      await transfer(c.box, 'drop', image('a.png'));
      await expect(c.stagedList).toContainText('a.png');
    });

    test('US1-AS6: a second image by paste, drop or pick is refused with the one-file alert; a two-file pick stages the first only', async () => {
      const c = await openComposer(m, seed.calloutUrl);
      const alert = c.dlg
        .getByRole('alert')
        .filter({ hasText: ONE_FILE_MESSAGE });
      const stageA = async () => {
        await transfer(c.box, 'paste', image('a.png'));
        await expect(c.stagedList.getByRole('listitem')).toHaveText('a.png');
        await expect(alert).toHaveCount(0);
      };
      const reset = async () => {
        await c.stagedList
          .getByRole('button', { name: 'Remove a.png' })
          .click();
        await expect(c.stagedList).toHaveCount(0);
        await expect(alert).toHaveCount(0);
      };

      await stageA();
      await transfer(c.box, 'paste', image('b.png'));
      await expect(alert).toBeVisible();
      await expect(c.stagedList.getByRole('listitem')).toHaveText('a.png');
      await reset();

      await stageA();
      await transfer(c.box, 'drop', image('b.png'));
      await expect(alert).toBeVisible();
      await expect(c.stagedList.getByRole('listitem')).toHaveText('a.png');
      await reset();

      await stageA();
      await c.fileInput.setInputFiles(image('b.png'));
      await expect(alert).toBeVisible();
      await expect(c.stagedList.getByRole('listitem')).toHaveText('a.png');
      await reset();

      await c.fileInput.setInputFiles([image('a.png'), image('b.png')]);
      await expect(alert).toBeVisible();
      await expect(c.stagedList.getByRole('listitem')).toHaveText('a.png');
    });

    test('US1-AS7: removing a staged chip clears it and sends nothing', async () => {
      const sentinel = `as7 sentinel ${RUN}`;
      const c = await openComposer(m, seed.calloutUrl);
      const sends = trackSends(m);
      await transfer(c.box, 'paste', image('a.png'));
      await expect(c.stagedList).toContainText('a.png');
      await c.stagedList.getByRole('button', { name: 'Remove a.png' }).click();
      await expect(c.stagedList).toHaveCount(0);
      // A text-only comment sent next is the barrier: sends are counted in the
      // order they leave the page, so one caused by the removal would be
      // counted before it.
      await c.box.fill(sentinel);
      await c.send.click();
      await expect(commentRows(c.dlg, sentinel)).toHaveCount(1);
      await expect.poll(() => sends.requests.length).toBeGreaterThan(0);
      sends.stop();
      expect(sends.requests, 'the removal sent nothing').toHaveLength(1);
      const { messageData } = sentVariables(sends.requests[0]);
      expect(messageData.message).toBe(sentinel);
      expect(messageData.attachmentUpload ?? null).toBeNull();
    });

    test("US1-AS8: the same flow behaves identically in a post's own comments (contribution dialog)", async () => {
      const name = `as8-${RUN}.png`;
      const text = `as8 text ${RUN}`;
      const c = await openComposer(m, seed.postUrl);
      await expect(c.addImage).toBeVisible();
      await transfer(c.box, 'paste', image(name));
      await expect(c.stagedList).toContainText(name);
      await c.box.fill(text);
      await c.send.click();
      const picture = await expectOneCaptionedRow(c.dlg, text, name);
      await expect(c.stagedList).toHaveCount(0);
      await expect(c.dlg.getByText(name, { exact: true })).toHaveCount(0);
      const [tab] = await Promise.all([
        m.context().waitForEvent('page'),
        picture.click(),
      ]);
      await tab.waitForLoadState('load');
      expect(await tab.evaluate(() => document.contentType)).toBe('image/png');
      await tab.close();
    });

    test('US1-AS9: a second member with the thread open sees the inline picture without reload and after reload', async () => {
      const name = `as9-${RUN}.png`;
      const viewer = await openComposer(v, seed.calloutUrl);
      const sender = await openComposer(m, seed.calloutUrl);
      await expect(inlineImage(viewer.dlg, name)).toHaveCount(0);
      await transfer(sender.box, 'paste', image(name));
      await sender.send.click();
      await expect(inlineImage(sender.dlg, name)).toBeVisible();
      await expect(inlineImage(viewer.dlg, name)).toBeVisible({
        timeout: 30_000,
      });
      await v.reload();
      await expect(
        inlineImage(v.locator('[role=dialog]').last(), name)
      ).toBeVisible();
    });

    test('US1-AS10: accessible names, live-region upload status, alert refusal, keyboard operability', async () => {
      const c = await openComposer(m, seed.calloutUrl);
      await expect(
        c.dlg.getByRole('button', { name: 'Add image' })
      ).toBeVisible();
      await transfer(c.box, 'paste', image('a.png'));
      await expect(
        c.dlg.getByRole('list', { name: 'Files to send' })
      ).toBeVisible();
      await expect(
        c.dlg.getByRole('button', { name: 'Remove a.png' })
      ).toBeVisible();
      await transfer(c.box, 'paste', image('b.png'));
      await expect(c.dlg.getByRole('alert')).toHaveText(ONE_FILE_MESSAGE);

      // Tab order: the chip's remove control precedes the field, the image button follows it.
      await c.box.focus();
      await m.keyboard.press('Shift+Tab');
      await expect(
        c.dlg.getByRole('button', { name: 'Remove a.png' })
      ).toBeFocused();
      await m.keyboard.press('Tab');
      await expect(c.box).toBeFocused();
      await m.keyboard.press('Tab');
      await expect(c.addImage).toBeFocused();

      // Enter and Space operate the remove control.
      await c.dlg.getByRole('button', { name: 'Remove a.png' }).focus();
      await m.keyboard.press('Enter');
      await expect(c.stagedList).toHaveCount(0);
      await transfer(c.box, 'paste', image('a.png'));
      await c.dlg.getByRole('button', { name: 'Remove a.png' }).focus();
      await m.keyboard.press('Space');
      await expect(c.stagedList).toHaveCount(0);

      // Upload in progress is announced through a live region (<output> = role status).
      let release!: () => void;
      const gate = new Promise<void>(resolve => {
        release = resolve;
      });
      await m.route(UPLOAD_ROUTE, async route => {
        await gate;
        await route.continue();
      });
      await transfer(c.box, 'paste', image(`as10-${RUN}.png`));
      await c.send.focus();
      await m.keyboard.press('Enter');
      await expect(
        c.stagedList.getByRole('status', { name: 'Uploading…' })
      ).toBeVisible();
      release();
      await expect(c.stagedList).toHaveCount(0);
      await m.unroute(UPLOAD_ROUTE);
    });

    test('US1-AS11: a failing upload posts nothing, marks the chip failed and keeps the text; after recovery Send posts one message carrying the text and the image', async () => {
      const name = `as11-${RUN}.png`;
      const text = `as11 text ${RUN}`;
      const c = await openComposer(m, seed.calloutUrl);
      const sends = trackSends(m);
      await transfer(c.box, 'paste', image(name));
      await c.box.fill(text);
      await m.route(UPLOAD_ROUTE, route => route.abort('failed'));
      await c.send.click();
      // The failure is announced as an alert, and the chip stays listed with
      // its Remove control so the file can be retried or dropped.
      await expect(c.dlg.getByRole('alert')).toHaveText(UPLOAD_FAILED_MESSAGE);
      // The chip is marked failed in text, not by colour alone.
      await expect(c.stagedList.getByRole('listitem')).toHaveText(
        `${name}${UPLOAD_FAILED_LABEL}`
      );
      await expect(
        c.stagedList.getByRole('button', { name: `Remove ${name}` })
      ).toBeEnabled();
      await expect(c.box).toHaveValue(text);
      await expect(c.box).toBeEnabled();
      expect(
        sends.requests,
        'nothing may be posted while the upload fails'
      ).toHaveLength(0);

      await m.unroute(UPLOAD_ROUTE);
      await c.send.click();
      await expectOneCaptionedSend(c, sends, text);
      await expectOneCaptionedRow(c.dlg, text, name);
    });
  }
);
