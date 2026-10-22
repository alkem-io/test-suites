/**
 * Persisted P1 acceptance walk for comment images, User Story 3 —
 * "Only images, only for people who may comment".
 *
 * Authored by forge-verify from a green pseudo-manual walk driven headless
 * against the live stack at http://localhost:3000 (the gateway; NEVER :3001).
 *
 * Preconditions (the walk does not seed; it reads a stack prepared as in
 * the comment-images feature quickstart, stack-preparation section). Everything is overridable by env:
 *   US3_SPACE_NAMEID        private space S                      (default us3-space)
 *   US3_CALLOUT_NAMEID      callout C, comments enabled          (default us3-callout-c)
 *   US3_POSTS_CALLOUT_NAMEID callout holding post P              (default us3-callout-posts)
 *   US3_POST_NAMEID         post P                               (default us3-post-p)
 *   US3_EVENT_NAMEID        calendar event E                     (default us3-event-e)
 *   US3_DISCUSSION_NAMEID   forum discussion D                   (default us3discussiond)
 *   US3_MEMBER_EMAIL / US3_OUTSIDER_EMAIL                        (us3m@ / us3x@example.com)
 *   US3_PERSONA_PASSWORD    password of the two personas
 *   ALKEMIO_ADMIN_EMAIL / AUTH_ADMIN_PASSWORD                    (admin@alkem.io / server .env.docker)
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
 * Run:
 *   cd client-web
 *   pnpm exec playwright test tests/comment-images-us3-access.spec.ts --grep @forge-acceptance
 */

import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { fillSecret } from '../src/functional-e2e/helpers/login.helper';

const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const SPACE = process.env.US3_SPACE_NAMEID || 'us3-space';
const CALLOUT = process.env.US3_CALLOUT_NAMEID || 'us3-callout-c';
const POSTS_CALLOUT = process.env.US3_POSTS_CALLOUT_NAMEID || 'us3-callout-posts';
const POST = process.env.US3_POST_NAMEID || 'us3-post-p';
const EVENT = process.env.US3_EVENT_NAMEID || 'us3-event-e';
const DISCUSSION = process.env.US3_DISCUSSION_NAMEID || 'us3discussiond';

const MEMBER_EMAIL = process.env.US3_MEMBER_EMAIL || 'us3m@example.com';
const OUTSIDER_EMAIL = process.env.US3_OUTSIDER_EMAIL || 'us3x@example.com';
const PERSONA_PASSWORD = process.env.US3_PERSONA_PASSWORD || '';
const ADMIN_EMAIL = process.env.ALKEMIO_ADMIN_EMAIL || 'admin@alkem.io';
const ADMIN_PASSWORD = process.env.AUTH_ADMIN_PASSWORD || '';

const CALLOUT_URL = `${BASE_URL}/${SPACE}/collaboration/${CALLOUT}`;
const POST_URL = `${BASE_URL}/${SPACE}/collaboration/${POSTS_CALLOUT}/posts/${POST}`;
const EVENT_URL = `${BASE_URL}/${SPACE}/calendar/${EVENT}`;
const DISCUSSION_URL = `${BASE_URL}/forum/discussion/${DISCUSSION}`;

// Smallest valid 1x1 PNG.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
// Larger than any comment-room bucket limit used by the local stack (15 MB).
const BIG_PNG = Buffer.concat([PNG_1X1, Buffer.alloc(20 * 1024 * 1024)]);

async function signIn(browser: Browser, email: string, password: string): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);
  const cookies = page.getByRole('button', { name: /accept all/i });
  if (await cookies.isVisible().catch(() => false)) await cookies.click();
  await page.getByRole('textbox', { name: 'E-Mail' }).fill(email);
  await fillSecret(page.getByRole('textbox', { name: 'Password' }), password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 60_000 });
  return page;
}

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

/** Dispatches a synthetic drop or paste carrying the given clipboard/drag payload on the comment field. */
async function dispatchTransfer(
  box: Locator,
  kind: 'drop' | 'paste',
  payload: { file?: { name: string; mime: string; base64: string }; data?: Record<string, string> }
): Promise<void> {
  await box.evaluate(
    (el, { kind, payload }) => {
      const dt = new DataTransfer();
      if (payload.file) {
        const bytes = Uint8Array.from(atob(payload.file.base64), c => c.charCodeAt(0));
        dt.items.add(new File([bytes], payload.file.name, { type: payload.file.mime }));
      }
      for (const [type, value] of Object.entries(payload.data ?? {})) dt.setData(type, value);
      const event =
        kind === 'drop'
          ? new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })
          : new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      el.dispatchEvent(event);
    },
    { kind, payload }
  );
}

test.describe.configure({ mode: 'serial' });

test.describe('Comment images — US3 P1 access and validation walk', { tag: ['@forge-acceptance'] }, () => {
  test.skip(!PERSONA_PASSWORD || !ADMIN_PASSWORD, 'US3_PERSONA_PASSWORD and AUTH_ADMIN_PASSWORD are required');

  test('US3-AS1: a signed-in non-member sees no comment field and no image button', async ({ browser }) => {
    const page = await signIn(browser, OUTSIDER_EMAIL, PERSONA_PASSWORD);
    for (const url of [CALLOUT_URL, POST_URL]) {
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
          ? await signIn(browser, MEMBER_EMAIL, PERSONA_PASSWORD)
          : await signIn(browser, ADMIN_EMAIL, ADMIN_PASSWORD);
      for (const url of [CALLOUT_URL, POST_URL]) {
        const { dlg, stagedList } = await openComposer(page, url);
        await expect(dlg.getByRole('button', { name: 'Add image' })).toBeVisible();
        await dlg.locator('input[type=file]').first().setInputFiles({
          name: 'a.png',
          mimeType: 'image/png',
          buffer: PNG_1X1,
        });
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
      page = await signIn(browser, ADMIN_EMAIL, ADMIN_PASSWORD);
    });

    test('US3-AS3: a PDF dropped or pasted is refused and nothing is staged', async () => {
      for (const kind of ['drop', 'paste'] as const) {
        const { dlg, box, stagedList } = await openComposer(page, CALLOUT_URL);
        await expect(dlg.getByRole('button', { name: 'Add image' })).toBeVisible();
        await dispatchTransfer(box, kind, {
          file: { name: 'doc.pdf', mime: 'application/pdf', base64: PDF.toString('base64') },
        });
        await expect(dlg.getByText('doc.pdf has an unsupported file type.')).toBeVisible();
        await expect(stagedList).toHaveCount(0);
      }
    });

    test('US3-AS4: an SVG picked is refused as unsupported', async () => {
      const { dlg, stagedList } = await openComposer(page, CALLOUT_URL);
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
      const { dlg, stagedList } = await openComposer(page, CALLOUT_URL);
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
      const { dlg, box, stagedList } = await openComposer(page, CALLOUT_URL);
      await expect(dlg.getByRole('button', { name: 'Add image' })).toBeVisible();
      // Plain text: no files on the clipboard, so the field's default paste applies.
      await box.click();
      await box.pressSequentially('plain text');
      await expect(box).toHaveValue('plain text');
      await expect(stagedList).toHaveCount(0);
      // Office rich text: RTF + HTML + text flavours alongside a rendered bitmap.
      await dispatchTransfer(box, 'paste', {
        file: { name: 'image.png', mime: 'image/png', base64: PNG_1X1.toString('base64') },
        data: { 'text/rtf': '{\\rtf1 office text}', 'text/plain': 'office text', 'text/html': '<p>office text</p>' },
      });
      await expect(stagedList).toHaveCount(0);
      // Control: a bare bitmap on the clipboard is still staged.
      await dispatchTransfer(box, 'paste', {
        file: { name: 'image.png', mime: 'image/png', base64: PNG_1X1.toString('base64') },
      });
      await expect(stagedList).toHaveCount(1);
    });
  });

  test('US3-AS6: calendar event and forum discussion have no image button and still post text', async ({
    browser,
  }) => {
    const page = await signIn(browser, MEMBER_EMAIL, PERSONA_PASSWORD);
    for (const url of [EVENT_URL, DISCUSSION_URL]) {
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
