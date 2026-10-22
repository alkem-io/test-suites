/**
 * Persisted P1 acceptance walk for comment images, User Story 3 —
 * "Only images, only for people who may comment".
 *
 * Authored by forge-verify from a green pseudo-manual walk driven headless
 * against the live stack at http://localhost:3000 (the gateway; NEVER :3001).
 *
 * Self-seeding (comment-images.helpers.ts): a private Space with callout C,
 * post P and calendar event E, a platform forum discussion D, a fresh ORDINARY
 * member M and a fresh signed-in non-member X, all created through the API in
 * beforeAll under a run-unique name and deleted in afterAll. The admin cases
 * sign in as the platform admin persona, which is never modified.
 *
 * Covers:
 *   US3-AS1  signed-in non-member: no comment field, no image button
 *   US3-AS2  member and admin: image button on callout and post rooms; each can send an image
 *   US3-AS3  PDF dropped or pasted: "doc.pdf has an unsupported file type."; nothing staged
 *   US3-AS4  SVG picked: refused as unsupported
 *   US3-AS5  oversized image picked: "big.png is larger than <N> MB."
 *   US3-AS6  calendar event and forum discussion: no image button; a text comment posts
 *   US3-AS7  plain text and Office rich text (with bitmap) pasted: text pastes; nothing staged
 *
 * `config/playwright.config.nightly.ts` registers the three walks as the
 * "Comment images" project (tier: extended). Run (from client-web/):
 *   pnpm run test:nightly --project="Comment images"
 *   pnpm run test:nightly --project="Comment images" comment-images-us3
 */

import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import {
  ADMIN_EMAIL,
  addMember,
  addOutsider,
  cleanUpCommentImages,
  image,
  makePng,
  newSeed,
  seedCommentImages,
  signIn as signInWith,
  transfer,
} from './comment-images.helpers';

const PNG = image('a.png');
const BITMAP = image('image.png');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
// Larger than any comment-room bucket limit used by the local stack (15 MB).
const BIG_PNG = Buffer.concat([makePng('big.png'), Buffer.alloc(20 * 1024 * 1024)]);

const seed = newSeed();
const personas: { member: string; outsider: string } = { member: '', outsider: '' };

const signIn = (browser: Browser, email: string): Promise<Page> =>
  signInWith(browser, seed, email, { width: 1280, height: 900 });

function dialog(page: Page): Locator {
  return page.locator('[role=dialog]').last();
}

async function dismissCookies(page: Page): Promise<void> {
  const cookies = page.getByRole('button', { name: /accept all cookies/i });
  if (await cookies.isVisible().catch(() => false)) await cookies.click();
}

async function openComposer(page: Page, url: string): Promise<{ dlg: Locator; box: Locator; stagedList: Locator }> {
  await page.goto(url);
  const dlg = dialog(page);
  const box = dlg.getByRole('textbox', { name: 'Add a comment...' });
  await box.waitFor();
  await dismissCookies(page);
  return { dlg, box, stagedList: dlg.getByRole('list', { name: 'Files to send' }) };
}

test.describe.configure({ mode: 'serial' });

test.describe('Comment images — US3 P1 access and validation walk', { tag: ['@forge-acceptance', '@comment-images'] }, () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await seedCommentImages(seed, 'us3', { post: true, event: true, discussion: true });
    personas.member = (await addMember(seed, 'member')).email;
    personas.outsider = (await addOutsider(seed, 'outsider')).email;
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

  for (const persona of ['member', 'admin'] as const) {
    test(`US3-AS2: ${persona} sees the image button and can send an image on a callout and a post`, async ({
      browser,
    }) => {
      const page =
        persona === 'member'
          ? await signIn(browser, personas.member)
          : await signIn(browser, ADMIN_EMAIL);
      for (const url of [seed.calloutUrl, seed.postUrl]) {
        const { dlg, stagedList } = await openComposer(page, url);
        await expect(dlg.getByRole('button', { name: 'Add image' })).toBeVisible();
        await dlg.locator('input[type=file]').first().setInputFiles(PNG);
        await expect(stagedList).toContainText('a.png');
        const sent = page.waitForResponse(
          r => r.url().includes('graphql') && (r.request().postData() ?? '').includes('sendMessageToRoom')
        );
        await dlg.getByRole('button', { name: 'Send', exact: true }).click();
        const response = await sent;
        const body = await response.json();
        expect(body.errors, 'sendMessageToRoom must not error').toBeUndefined();
        expect(body.data.sendMessageToRoom.attachments[0].mimeType).toBe('image/png');
        await expect(stagedList).toHaveCount(0);
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
        await expect(dlg.getByRole('button', { name: 'Add image' })).toBeVisible();
        await transfer(box, kind, { name: 'doc.pdf', mimeType: 'application/pdf', buffer: PDF });
        await expect(dlg.getByText('doc.pdf has an unsupported file type.')).toBeVisible();
        await expect(stagedList).toHaveCount(0);
      }
    });

    test('US3-AS4: an SVG picked is refused as unsupported', async () => {
      const { dlg, stagedList } = await openComposer(page, seed.calloutUrl);
      await expect(dlg.getByRole('button', { name: 'Add image' })).toBeVisible();
      await dlg.locator('input[type=file]').first().setInputFiles({
        name: 'vector.svg',
        mimeType: 'image/svg+xml',
        buffer: SVG,
      });
      await expect(dlg.getByText('vector.svg has an unsupported file type.')).toBeVisible();
      await expect(stagedList).toHaveCount(0);
    });

    test('US3-AS5: an image above the size limit is refused with the limit in MB', async () => {
      const { dlg, stagedList } = await openComposer(page, seed.calloutUrl);
      await expect(dlg.getByRole('button', { name: 'Add image' })).toBeVisible();
      await dlg.locator('input[type=file]').first().setInputFiles({
        name: 'big.png',
        mimeType: 'image/png',
        buffer: BIG_PNG,
      });
      await expect(dlg.getByText(/^big\.png is larger than \d+ MB\.$/)).toBeVisible();
      await expect(stagedList).toHaveCount(0);
    });

    test('US3-AS7: plain text and Office rich text with a bitmap paste as text; nothing is staged', async () => {
      const { dlg, box, stagedList } = await openComposer(page, seed.calloutUrl);
      await expect(dlg.getByRole('button', { name: 'Add image' })).toBeVisible();
      // Plain text: no files on the clipboard, so the field's default paste applies.
      await box.click();
      await box.pressSequentially('plain text');
      await expect(box).toHaveValue('plain text');
      await expect(stagedList).toHaveCount(0);
      // Office rich text: RTF + HTML + text flavours alongside a rendered bitmap.
      await transfer(box, 'paste', BITMAP, {
        'text/rtf': '{\\rtf1 office text}',
        'text/plain': 'office text',
        'text/html': '<p>office text</p>',
      });
      await expect(stagedList).toHaveCount(0);
      // Control: a bare bitmap on the clipboard is still staged.
      await transfer(box, 'paste', BITMAP);
      await expect(stagedList).toHaveCount(1);
    });
  });

  test('US3-AS6: calendar event and forum discussion have no image button and still post text', async ({
    browser,
  }) => {
    const page = await signIn(browser, personas.member);
    for (const url of [seed.eventUrl, seed.discussionUrl]) {
      await page.goto(url);
      const box = page.getByRole('textbox', { name: 'Add a comment...' });
      await box.waitFor();
      await dismissCookies(page);
      await expect(page.getByRole('button', { name: 'Add image' })).toHaveCount(0);
      await expect(page.locator('input[type=file]')).toHaveCount(0);
      const text = `US3 text comment ${Date.now()}`;
      await box.fill(text);
      const sent = page.waitForResponse(
        r => r.url().includes('graphql') && (r.request().postData() ?? '').includes('sendMessageToRoom')
      );
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      const body = await (await sent).json();
      expect(body.errors, 'text comment must post as before').toBeUndefined();
      expect(body.data.sendMessageToRoom.message).toBe(text);
      await expect(page.getByText(text)).toBeVisible();
    }
  });
});
