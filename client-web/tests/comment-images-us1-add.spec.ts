/**
 * Acceptance walk: adding an image to a top-level comment, on a callout and in
 * a post's own comments. Ordinary members act: M sends, V keeps the thread
 * open to see a picture arrive live. Each case maps to its acceptance
 * scenario in comment-images-test-plan.md.
 */

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  UPLOAD_FAILED_LABEL,
  UPLOAD_FAILED_MESSAGE,
  UPLOAD_ROUTE,
  addMember,
  cleanUpCommentImages,
  expectOneSend,
  holdUploads,
  image,
  inlineImage,
  newSeed,
  openComposer,
  rowsWithText,
  seedCommentImages,
  sentVariables,
  signIn,
  trackSends,
  transfer,
  type Composer,
  type SendTracker,
  type TransferFile,
} from './comment-images.helpers';

const ONE_FILE_MESSAGE = 'You can attach only one file.';
const RUN = Date.now().toString(36);

// --- helpers -------------------------------------------------------------------------------------

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
  const row = rowsWithText(dlg, text);
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
 * Sends `sentinel` as a text-only comment and checks it is the only send since
 * `sends` started. Sends are counted in the order they leave the page, so a
 * send caused by anything done before the sentinel is counted before it.
 */
async function expectOnlySentinelSent(
  c: Composer,
  sends: SendTracker,
  sentinel: string
): Promise<void> {
  await c.box.fill(sentinel);
  await c.send.click();
  await expect(rowsWithText(c.dlg, sentinel)).toHaveCount(1);
  await expect.poll(() => sends.requests.length).toBeGreaterThan(0);
  sends.stop();
  expect(sends.requests, 'nothing was sent before the sentinel').toHaveLength(
    1
  );
  const { messageData } = sentVariables(sends.requests[0]);
  expect(messageData.message).toBe(sentinel);
  expect(messageData.attachmentUpload ?? null).toBeNull();
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

    /**
     * Text + a pasted image at `url` post one row with the text above the
     * picture, leave no chip or filename line, and the picture opens full size
     * in a new tab.
     */
    async function sendCaptionedAndOpen(
      url: string,
      label: string
    ): Promise<void> {
      const name = `${label}-${RUN}.png`;
      const text = `${label} text ${RUN}`;
      const c = await openComposer(m, url);
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
    }

    test('US1-AS1: pasting an image stages a removable chip; nothing is uploaded; Send is enabled', async () => {
      const sentinel = `as1 sentinel ${RUN}`;
      const uploads: string[] = [];
      const onUpload = (r: { url: () => string }) => {
        if (r.url().includes('/messaging/media/upload')) uploads.push(r.url());
      };
      m.on('request', onUpload);
      const c = await openComposer(m, seed.calloutUrl);
      const sends = trackSends(m);
      await transfer(c.box, 'paste', image('one.png'));
      await expect(c.stagedList.getByRole('listitem')).toHaveText('one.png');
      const remove = c.stagedList.getByRole('button', {
        name: 'Remove one.png',
      });
      await expect(remove).toBeVisible();
      await expect(c.send).toBeEnabled();
      // Drop the chip and send a text-only sentinel: an upload caused by the
      // staging would have left the page before the sentinel's send.
      await remove.click();
      await expect(c.stagedList).toHaveCount(0);
      await expectOnlySentinelSent(c, sends, sentinel);
      m.off('request', onUpload);
      expect(uploads, 'staging must not upload').toHaveLength(0);
    });

    test('US1-AS2: text + staged image → one comment with the text and the inline picture beneath it; click opens full size in a new tab', async () => {
      await sendCaptionedAndOpen(seed.calloutUrl, 'as2');
    });

    test('US1-AS3: image + text → exactly one new comment row, carrying the text and the picture', async () => {
      const name = `as3-${RUN}.png`;
      const text = `as3 text ${RUN}`;
      const c = await openComposer(m, seed.calloutUrl);
      const sends = trackSends(m);
      await transfer(c.box, 'paste', image(name));
      await c.box.fill(text);
      await c.send.click();
      // Field and staged list cleared: every call the send makes has left.
      await expect(c.box).toHaveValue('');
      await expect(c.stagedList).toHaveCount(0);
      await expectOneSend(sends, 'sendMessageToRoom', { text });
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
      await expect(c.stagedList).toHaveCount(0);
      await expectOneSend(sends, 'sendMessageToRoom', {
        mimeType: 'image/png',
      });
    });

    test('US1-AS5: the image button opens an images-only picker by mouse and keyboard; dragging shows the hint; a drop stages', async () => {
      const c = await openComposer(m, seed.calloutUrl);
      expect(await c.fileInput.getAttribute('accept')).toContain('image/png');
      expect(await c.fileInput.getAttribute('accept')).not.toContain(
        'application/pdf'
      );

      const pressOnButton = (key: string) => async () => {
        await c.addImage.focus();
        await m.keyboard.press(key);
      };
      const openers = [
        () => c.addImage.click(),
        pressOnButton('Enter'),
        pressOnButton('Space'),
      ];
      for (const open of openers) {
        const [chooser] = await Promise.all([
          m.waitForEvent('filechooser'),
          open(),
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
      const staged = c.stagedList.getByRole('listitem');
      const adders: Array<(file: TransferFile) => Promise<unknown>> = [
        file => transfer(c.box, 'paste', file),
        file => transfer(c.box, 'drop', file),
        file => c.fileInput.setInputFiles(file),
      ];

      for (const add of adders) {
        await transfer(c.box, 'paste', image('a.png'));
        await expect(staged).toHaveText('a.png');
        await expect(alert).toHaveCount(0);
        await add(image('b.png'));
        await expect(alert).toBeVisible();
        await expect(staged).toHaveText('a.png');
        await c.stagedList
          .getByRole('button', { name: 'Remove a.png' })
          .click();
        await expect(c.stagedList).toHaveCount(0);
        await expect(alert).toHaveCount(0);
      }

      await c.fileInput.setInputFiles([image('a.png'), image('b.png')]);
      await expect(alert).toBeVisible();
      await expect(staged).toHaveText('a.png');
    });

    test('US1-AS7: removing a staged chip clears it and sends nothing', async () => {
      const c = await openComposer(m, seed.calloutUrl);
      const sends = trackSends(m);
      await transfer(c.box, 'paste', image('a.png'));
      await expect(c.stagedList).toContainText('a.png');
      await c.stagedList.getByRole('button', { name: 'Remove a.png' }).click();
      await expect(c.stagedList).toHaveCount(0);
      await expectOnlySentinelSent(c, sends, `as7 sentinel ${RUN}`);
    });

    test("US1-AS8: the same flow behaves identically in a post's own comments (contribution dialog)", async () => {
      await sendCaptionedAndOpen(seed.postUrl, 'as8');
    });

    test('US1-AS9: a second member with the thread open sees the inline picture without reload and after reload', async () => {
      const name = `as9-${RUN}.png`;
      const viewer = await openComposer(v, seed.calloutUrl);
      const sender = await openComposer(m, seed.calloutUrl);
      await expect(inlineImage(viewer.dlg, name)).toHaveCount(0);
      await transfer(sender.box, 'paste', image(name));
      await sender.send.click();
      await expect(inlineImage(sender.dlg, name)).toBeVisible();
      // The viewer gets the message over the room subscription, which can lag
      // the sender's own render by more than the default expect budget.
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
      const removeA = c.dlg.getByRole('button', { name: 'Remove a.png' });
      await transfer(c.box, 'paste', image('a.png'));
      await expect(c.stagedList).toBeVisible();
      await expect(removeA).toBeVisible();
      await transfer(c.box, 'paste', image('b.png'));
      await expect(c.dlg.getByRole('alert')).toHaveText(ONE_FILE_MESSAGE);

      // Tab order: the chip's remove control precedes the field, the image button follows it.
      await c.box.focus();
      await m.keyboard.press('Shift+Tab');
      await expect(removeA).toBeFocused();
      await m.keyboard.press('Tab');
      await expect(c.box).toBeFocused();
      await m.keyboard.press('Tab');
      await expect(c.addImage).toBeFocused();

      // Enter and Space operate the remove control.
      await removeA.focus();
      await m.keyboard.press('Enter');
      await expect(c.stagedList).toHaveCount(0);
      await transfer(c.box, 'paste', image('a.png'));
      await removeA.focus();
      await m.keyboard.press('Space');
      await expect(c.stagedList).toHaveCount(0);

      // Upload in progress is announced through a live region (<output> = role status).
      const releaseUploads = await holdUploads(m);
      await transfer(c.box, 'paste', image(`as10-${RUN}.png`));
      await c.send.focus();
      await m.keyboard.press('Enter');
      await expect(
        c.stagedList.getByRole('status', { name: 'Uploading…' })
      ).toBeVisible();
      releaseUploads();
      await expect(c.stagedList).toHaveCount(0);
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
      // Field and staged list cleared: every call the send makes has left.
      await expect(c.box).toHaveValue('');
      await expect(c.stagedList).toHaveCount(0);
      await expectOneSend(sends, 'sendMessageToRoom', { text });
      await expectOneCaptionedRow(c.dlg, text, name);
    });
  }
);
