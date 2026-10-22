/**
 * Persisted P1 acceptance walk for comment images, User Story 1 —
 * "Add images to a comment".
 *
 * Authored by forge-verify from a green pseudo-manual walk driven headless
 * against the live stack at http://localhost:3000 (the gateway; NEVER :3001).
 * Every scenario is driven as an ORDINARY space member (M); a second ordinary
 * member (V) is the second session for the live-update scenario.
 *
 * Preconditions (the walk does not seed; it reads a stack prepared as in
 * the comment-images feature quickstart, stack-preparation section). Everything is overridable by env:
 *   US1_SPACE_NAMEID          private space S                       (default us1-space)
 *   US1_CALLOUT_NAMEID        callout C, comments enabled           (default calloutc)
 *   US1_POSTS_CALLOUT_NAMEID  callout holding post P                (default postcallout)
 *   US1_POST_NAMEID           post P                                (default postp)
 *   US1_MEMBER_EMAIL / US1_VIEWER_EMAIL                             (us1m@ / us1v@example.com)
 *   US1_PERSONA_PASSWORD      password of the two personas
 *
 * Covers US1-AS1 .. US1-AS11 (see the spec for the Given/When/Then of each).
 * Each test uses image file names unique to the run, so assertions never
 * depend on what earlier runs left in the thread.
 *
 * Run:
 *   cd client-web
 *   pnpm exec playwright test tests/comment-images-us1-add.spec.ts --grep @forge-acceptance
 */

import { deflateSync } from 'node:zlib';
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';
import { fillSecret } from '../src/functional-e2e/helpers/login.helper';

const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const SPACE = process.env.US1_SPACE_NAMEID || 'us1-space';
const CALLOUT = process.env.US1_CALLOUT_NAMEID || 'calloutc';
const POSTS_CALLOUT = process.env.US1_POSTS_CALLOUT_NAMEID || 'postcallout';
const POST = process.env.US1_POST_NAMEID || 'postp';

const MEMBER_EMAIL = process.env.US1_MEMBER_EMAIL || 'us1m@example.com';
const VIEWER_EMAIL = process.env.US1_VIEWER_EMAIL || 'us1v@example.com';
const PERSONA_PASSWORD = process.env.US1_PERSONA_PASSWORD || '';

const CALLOUT_URL = `${BASE_URL}/${SPACE}/collaboration/${CALLOUT}`;
const POST_URL = `${BASE_URL}/${SPACE}/collaboration/${POSTS_CALLOUT}/posts/${POST}`;

const ONE_FILE_MESSAGE = 'You can attach only one file.';
const UPLOAD_ROUTE = '**/rest/messaging/media/upload**';
const RUN = Date.now().toString(36);

// --- fixtures: tiny real PNGs, distinct per name so they are never one cached blob -----------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
/** A real 32x32 RGB PNG whose colour derives from `seed`. */
function makePng(seed: string): Buffer {
  const size = 32;
  const hash = [...seed].reduce(
    (h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0,
    7
  );
  const [r, g, b] = [hash & 0xff, (hash >>> 8) & 0xff, (hash >>> 16) & 0xff];
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.from(Array.from({ length: size }, () => [r, g, b]).flat()),
  ]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(2, 9); // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const image = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: makePng(name),
});

// --- helpers -------------------------------------------------------------------------------------

async function signIn(
  browser: Browser,
  email: string
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1100 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);
  const cookies = page.getByRole('button', { name: /accept all/i });
  if (await cookies.isVisible().catch(() => false)) await cookies.click();
  await page.getByRole('textbox', { name: 'E-Mail' }).fill(email);
  await fillSecret(
    page.getByRole('textbox', { name: 'Password' }),
    PERSONA_PASSWORD
  );
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), {
    timeout: 60_000,
  });
  return { context, page };
}

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
  const cookies = page.getByRole('button', { name: /accept all cookies/i });
  if (await cookies.isVisible().catch(() => false)) await cookies.click();
  return {
    dlg,
    box,
    stagedList: dlg.getByRole('list', { name: 'Files to send' }),
    addImage: dlg.getByRole('button', { name: 'Add image' }),
    send: dlg.getByRole('button', { name: 'Send', exact: true }),
    fileInput: dlg.locator('input[type=file]').first(),
  };
}

/** Collects the sendMessageToRoom GraphQL responses the page receives. */
function trackSends(page: Page): {
  bodies: Array<{ data?: any; errors?: unknown }>;
  stop: () => void;
} {
  const bodies: Array<{ data?: any; errors?: unknown }> = [];
  const onResponse = async (response: Response) => {
    if (
      response.url().includes('graphql') &&
      (response.request().postData() ?? '').includes('sendMessageToRoom')
    ) {
      bodies.push(await response.json());
    }
  };
  page.on('response', onResponse);
  return { bodies, stop: () => page.off('response', onResponse) };
}

/** Dispatches a synthetic paste or drag event carrying one real image file. */
async function transfer(
  box: Locator,
  kind: 'paste' | 'drop' | 'dragover',
  file: { name: string; mimeType: string; buffer: Buffer }
): Promise<void> {
  await box.evaluate(
    (el, { kind, name, mimeType, base64 }) => {
      const dt = new DataTransfer();
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      dt.items.add(new File([bytes], name, { type: mimeType }));
      const init = { bubbles: true, cancelable: true };
      if (kind === 'paste')
        el.dispatchEvent(
          new ClipboardEvent('paste', { ...init, clipboardData: dt })
        );
      else if (kind === 'drop')
        el.dispatchEvent(new DragEvent('drop', { ...init, dataTransfer: dt }));
      else {
        el.dispatchEvent(
          new DragEvent('dragenter', { ...init, dataTransfer: dt })
        );
        el.dispatchEvent(
          new DragEvent('dragover', { ...init, dataTransfer: dt })
        );
      }
    },
    {
      kind,
      name: file.name,
      mimeType: file.mimeType,
      base64: file.buffer.toString('base64'),
    }
  );
}

const inlineImage = (dlg: Locator, name: string): Locator =>
  dlg.getByRole('img', { name: `Attached image: ${name}` });

test.describe.configure({ mode: 'serial' });

test.describe(
  'Comment images — US1 P1 add-an-image walk',
  { tag: ['@forge-acceptance'] },
  () => {
    test.skip(!PERSONA_PASSWORD, 'US1_PERSONA_PASSWORD is required');

    let m: Page;
    let v: { context: BrowserContext; page: Page };

    test.beforeAll(async ({ browser }) => {
      m = (await signIn(browser, MEMBER_EMAIL)).page;
      v = await signIn(browser, VIEWER_EMAIL);
    });

    test('US1-AS1: pasting an image stages a removable chip; nothing is uploaded; Send is enabled', async () => {
      const uploads: string[] = [];
      m.on('request', r => {
        if (r.url().includes('/messaging/media/upload')) uploads.push(r.url());
      });
      const c = await openComposer(m, CALLOUT_URL);
      await expect(c.addImage).toBeVisible();
      await transfer(c.box, 'paste', image('one.png'));
      await expect(c.stagedList.getByRole('listitem')).toHaveText('one.png');
      await expect(
        c.stagedList.getByRole('button', { name: 'Remove one.png' })
      ).toBeVisible();
      await expect(c.send).toBeEnabled();
      expect(uploads, 'staging must not upload').toHaveLength(0);
    });

    test('US1-AS2: text + staged image → text comment with the inline picture beneath; click opens full size in a new tab', async () => {
      const name = `as2-${RUN}.png`;
      const text = `see this ${RUN}`;
      const c = await openComposer(m, CALLOUT_URL);
      await transfer(c.box, 'paste', image(name));
      await expect(c.stagedList).toContainText(name);
      await c.box.fill(text);
      await c.send.click();

      const picture = inlineImage(c.dlg, name);
      await expect(picture).toBeVisible();
      await expect(c.dlg.getByText(text, { exact: true })).toBeVisible();
      // No chip, and no filename line anywhere in the thread.
      await expect(c.stagedList).toHaveCount(0);
      await expect(c.dlg.getByText(name, { exact: true })).toHaveCount(0);
      // Newest first: the text comment is above the picture.
      const textBox = await c.dlg
        .getByText(text, { exact: true })
        .boundingBox();
      const pictureBox = await picture.boundingBox();
      expect(textBox!.y).toBeLessThan(pictureBox!.y);

      const [tab] = await Promise.all([
        m.context().waitForEvent('page'),
        picture.click(),
      ]);
      await tab.waitForLoadState('load');
      expect(tab.url()).toContain('/storage/file/by-reference');
      expect(await tab.evaluate(() => document.contentType)).toBe('image/png');
      await tab.close();
    });

    test('US1-AS3: image + text → exactly two new rows, the text on top and the image directly beneath', async () => {
      const name = `as3-${RUN}.png`;
      const text = `as3 text ${RUN}`;
      const c = await openComposer(m, CALLOUT_URL);
      const sends = trackSends(m);
      await transfer(c.box, 'paste', image(name));
      await c.box.fill(text);
      await c.send.click();
      await expect.poll(() => sends.bodies.length).toBe(2);
      await expect(inlineImage(c.dlg, name)).toBeVisible();
      await expect(c.dlg.getByText(text, { exact: true })).toBeVisible();
      sends.stop();
      expect(sends.bodies.every(b => b.errors === undefined)).toBe(true);
      const messages = sends.bodies.map(b => b.data.sendMessageToRoom);
      expect(messages.filter(x => x.attachments.length === 1)).toHaveLength(1);
      expect(messages.filter(x => x.message === text)).toHaveLength(1);
      const textBox = await c.dlg
        .getByText(text, { exact: true })
        .boundingBox();
      const pictureBox = await inlineImage(c.dlg, name).boundingBox();
      expect(textBox!.y).toBeLessThan(pictureBox!.y);
    });

    test('US1-AS4: a staged image with no text posts an image-only comment rendered inline', async () => {
      const name = `as4-${RUN}.png`;
      const c = await openComposer(m, CALLOUT_URL);
      const sends = trackSends(m);
      await transfer(c.box, 'paste', image(name));
      await expect(c.box).toHaveValue('');
      await expect(c.send).toBeEnabled();
      await c.send.click();
      await expect(inlineImage(c.dlg, name)).toBeVisible();
      sends.stop();
      expect(sends.bodies).toHaveLength(1);
      expect(
        sends.bodies[0].data.sendMessageToRoom.attachments[0].mimeType
      ).toBe('image/png');
      await expect(c.stagedList).toHaveCount(0);
    });

    test('US1-AS5: the image button opens an images-only picker by mouse and keyboard; dragging shows the hint; a drop stages', async () => {
      const c = await openComposer(m, CALLOUT_URL);
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
      const c = await openComposer(m, CALLOUT_URL);
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
      const c = await openComposer(m, CALLOUT_URL);
      const sends = trackSends(m);
      await transfer(c.box, 'paste', image('a.png'));
      await expect(c.stagedList).toContainText('a.png');
      await c.stagedList.getByRole('button', { name: 'Remove a.png' }).click();
      await expect(c.stagedList).toHaveCount(0);
      sends.stop();
      expect(sends.bodies).toHaveLength(0);
    });

    test("US1-AS8: the same flow behaves identically in a post's own comments (contribution dialog)", async () => {
      const name = `as8-${RUN}.png`;
      const text = `as8 text ${RUN}`;
      const c = await openComposer(m, POST_URL);
      await expect(c.addImage).toBeVisible();
      await transfer(c.box, 'paste', image(name));
      await expect(c.stagedList).toContainText(name);
      await c.box.fill(text);
      await c.send.click();
      const picture = inlineImage(c.dlg, name);
      await expect(picture).toBeVisible();
      await expect(c.dlg.getByText(text, { exact: true })).toBeVisible();
      await expect(c.stagedList).toHaveCount(0);
      await expect(c.dlg.getByText(name, { exact: true })).toHaveCount(0);
      const textBox = await c.dlg
        .getByText(text, { exact: true })
        .boundingBox();
      const pictureBox = await picture.boundingBox();
      expect(textBox!.y).toBeLessThan(pictureBox!.y);
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
      const viewer = await openComposer(v.page, CALLOUT_URL);
      const sender = await openComposer(m, CALLOUT_URL);
      await expect(inlineImage(viewer.dlg, name)).toHaveCount(0);
      await transfer(sender.box, 'paste', image(name));
      await sender.send.click();
      await expect(inlineImage(sender.dlg, name)).toBeVisible();
      await expect(inlineImage(viewer.dlg, name)).toBeVisible({
        timeout: 30_000,
      });
      await v.page.reload();
      await expect(
        inlineImage(v.page.locator('[role=dialog]').last(), name)
      ).toBeVisible();
    });

    test('US1-AS10: accessible names, live-region upload status, alert refusal, keyboard operability', async () => {
      const c = await openComposer(m, CALLOUT_URL);
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

    test('US1-AS11: a failing upload posts nothing, marks the chip failed and keeps the text; after recovery Send posts the image then the text', async () => {
      const name = `as11-${RUN}.png`;
      const text = `as11 text ${RUN}`;
      const c = await openComposer(m, CALLOUT_URL);
      const sends = trackSends(m);
      await transfer(c.box, 'paste', image(name));
      await c.box.fill(text);
      await m.route(UPLOAD_ROUTE, route => route.abort('failed'));
      await c.send.click();
      await expect(c.dlg.getByRole('alert')).toHaveText(
        'Upload failed. Send again to retry, or remove the file.'
      );
      await expect(c.stagedList).toContainText(name);
      await expect(c.box).toHaveValue(text);
      await expect(c.box).toBeEnabled();
      expect(
        sends.bodies,
        'nothing may be posted while the upload fails'
      ).toHaveLength(0);

      await m.unroute(UPLOAD_ROUTE);
      await c.send.click();
      await expect.poll(() => sends.bodies.length).toBe(2);
      sends.stop();
      await expect(inlineImage(c.dlg, name)).toBeVisible();
      await expect(c.dlg.getByText(text, { exact: true })).toBeVisible();
      await expect(c.box).toHaveValue('');
      await expect(c.stagedList).toHaveCount(0);
      // Image first, then the text.
      expect(sends.bodies[0].data.sendMessageToRoom.attachments).toHaveLength(
        1
      );
      expect(sends.bodies[1].data.sendMessageToRoom.message).toBe(text);
    });
  }
);
