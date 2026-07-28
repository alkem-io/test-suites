import { test, expect, type Browser, type BrowserContext, type Page, type Locator } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { getMails, UniqueIDGenerator } from '@alkemio/tests-lib';

/**
 * @forge-acceptance — workspace#033-chat-avatars, User Story 2 (P1)
 *
 * "Recognize the group conversation from the thread header": the thread
 * header shows the same visual identity the conversation list row shows for
 * that group — the custom photo when set, otherwise the composite of up to
 * four participant avatars — and it updates the same way the list does when
 * the photo changes.
 *
 * Mirrors specs/033-chat-avatars/spec.md User Story 2, scenario-for-scenario
 * (US2-AS1..AS4). Self-contained: registers fresh users through the real
 * sign-up + email-verification flow and builds group conversations through
 * the chat UI itself — no API seeding.
 */

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'ChatAvatars!Test2026';

test.describe.configure({ mode: 'serial' });

/** Fetches the most recent verification email for `email` (scoped by recipient
 * and sorted by send date, unlike the package's unscoped `getVerificationLink`,
 * which returns the first "verify"-subject email in the mailbox — a real hazard
 * when several registrations are in flight against a shared MailSlurper inbox). */
async function getVerificationLinkFor(email: string): Promise<string | undefined> {
  const response = await getMails();
  const items = response.body.mailItems as Array<{ subject: string; body: string; toAddresses?: string[]; dateSent: string }>;
  const matches = items
    .filter(
      item =>
        item.subject === '[Alkemio] Please verify your email address!' &&
        item.toAddresses?.some(addr => addr.toLowerCase() === email.toLowerCase())
    )
    .sort((a, b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime());
  const mail = matches[0];
  if (!mail) return undefined;
  const linkMatch = mail.body.match(/https?:\/\/[^\s"<]+self-service\/verification[^\s"<]*/);
  return linkMatch ? linkMatch[0].replace(/&amp;/g, '&') : undefined;
}

async function acceptCookiesIfPresent(page: Page): Promise<void> {
  const acceptButton = page.getByRole('button', { name: 'Accept All Cookies', exact: true });
  if (await acceptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptButton.click();
  }
}

/**
 * Registers a brand-new user through the real sign-up + email-verification
 * flow, then signs in.
 *
 * NOTE (defect, filed separately — not a re-implementation of app logic):
 * the accept-terms checkbox is only ticked ONCE, on the `/sign_up` step. The
 * `/registration` (password) step reuses the SAME Kratos flow id, so the
 * checkbox's `true` value already carries over via the
 * `crd-auth-accepted-terms-<flowId>` sessionStorage key
 * (`src/main/crdPages/auth/SignUpCrdRoute.tsx`). Ticking it again there
 * toggles it back to `false` and permanently disables "Next" (the two steps
 * no longer get independent flow ids, unlike the persistence comment on that
 * component still assumes) — a real, reproducible defect, filed in this
 * verification's report, distinct from the chat-avatars story under test.
 */
async function registerAndSignIn(
  browser: Browser,
  email: string,
  firstName: string,
  lastName: string
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseUrl}/sign_up`);
  await acceptCookiesIfPresent(page);
  await page.getByRole('checkbox').click();
  await page.getByLabel('E-Mail *').fill(email);
  await page.getByLabel('First Name *').fill(firstName);
  await page.getByLabel('Last Name *').fill(lastName);
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page).toHaveURL(/\/registration/, { timeout: 15000 });
  // Do NOT re-click the accept-terms checkbox here — see the defect note above.
  await page.getByLabel('Password *').fill(password);
  const passwordNextButton = page.getByRole('button', { name: 'Next', exact: true });
  await expect(passwordNextButton).toBeEnabled({ timeout: 10000 });
  await passwordNextButton.click();

  await expect(page).toHaveURL(/registration\/success/, { timeout: 15000 });

  let verificationLink: string | undefined;
  await expect
    .poll(
      async () => {
        verificationLink = await getVerificationLinkFor(email);
        return verificationLink;
      },
      { timeout: 30000, intervals: [1000, 1000, 2000] }
    )
    .toBeTruthy();

  await page.goto(verificationLink as string);
  await expect(page.getByText('You successfully verified your email address.')).toBeVisible({ timeout: 10000 });

  await page.goto(baseUrl);
  await acceptCookiesIfPresent(page);
  await page.getByRole('link', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  await page.getByLabel('E-Mail *').fill(email);
  await page.getByLabel('Password *').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(`${baseUrl}/home`, { timeout: 20000 });

  return { context, page };
}

/** Writes a small, distinctly-colored valid PNG fixture and returns its path.
 * `variant` shifts the color so two successive uploads are visually distinguishable. */
function createPngFixture(variant: 'a' | 'b' = 'a'): string {
  function chunk(tag: string, data: Buffer): Buffer {
    const tagBuf = Buffer.from(tag, 'ascii');
    const lengthBuf = Buffer.alloc(4);
    lengthBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(zlib.crc32(Buffer.concat([tagBuf, data])) >>> 0, 0);
    return Buffer.concat([lengthBuf, tagBuf, data, crcBuf]);
  }

  const width = 64;
  const height = 64;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(2, 9);
  const ihdr = chunk('IHDR', ihdrData);

  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const isStripe = (x + y) % 16 < 8;
      if (variant === 'a') {
        row[1 + x * 3] = isStripe ? 20 : 220;
        row[1 + x * 3 + 1] = isStripe ? 160 : 20;
        row[1 + x * 3 + 2] = isStripe ? 220 : 20;
      } else {
        row[1 + x * 3] = isStripe ? 240 : 10;
        row[1 + x * 3 + 1] = isStripe ? 200 : 90;
        row[1 + x * 3 + 2] = isStripe ? 10 : 240;
      }
    }
    rows.push(row);
  }
  const idat = chunk('IDAT', zlib.deflateSync(Buffer.concat(rows)));
  const iend = chunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdr, idat, iend]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-avatars-group-photo-'));
  const filePath = path.join(dir, `group-${variant}.png`);
  fs.writeFileSync(filePath, png);
  return filePath;
}

async function openChatPanel(page: Page): Promise<void> {
  await acceptCookiesIfPresent(page);
  await page.getByRole('button', { name: 'Open chat' }).click();
  await expect(page.getByRole('dialog', { name: 'Chat' })).toBeVisible();
}

/** Locates a group-thread list row by requiring ALL given participant names, order-independent. */
function groupRowByNames(page: Page, names: string[]): Locator {
  let locator = page.getByRole('button');
  for (const name of names) {
    locator = locator.filter({ hasText: name });
  }
  return locator;
}

async function createGroupChat(viewerPage: Page, names: string[]): Promise<void> {
  await viewerPage.getByRole('button', { name: 'New message' }).click();
  const search = viewerPage.getByPlaceholder(/Search people/);
  for (const name of names) {
    await search.fill(name);
    await viewerPage.getByRole('button', { name: new RegExp(name, 'i') }).click();
  }
  await viewerPage.getByRole('button', { name: 'Start group chat' }).click();
}

async function goBackToList(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Back to conversations' }).click();
}

/** Extracts the avatar composition (image srcs + fallback-initials texts, in DOM order)
 * from a scoped locator, using the CRD avatar primitives' stable `data-slot` markers. */
async function avatarComposite(scope: Locator): Promise<{ imgSrcs: string[]; fallbackTexts: string[] }> {
  const imgSrcs = await scope
    .locator('[data-slot="avatar-image"]')
    .evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).getAttribute('src') ?? ''));
  const fallbackTexts = await scope
    .locator('[data-slot="avatar-fallback"]')
    .evaluateAll(nodes => nodes.map(node => node.textContent?.trim() ?? ''));
  return { imgSrcs, fallbackTexts };
}

function headerAvatarScope(page: Page): Locator {
  // Scope to the ChatPanel's own header — `page.locator('header')` alone also
  // matches the app's global site-nav `<header>` (which has its own user-menu
  // avatar), double-counting avatars across both surfaces.
  return page.locator('[role="dialog"] > header');
}

test.describe('US2 — group thread header identity', { tag: ['@forge-acceptance'] }, () => {
  let browser: Browser;
  let viewerCtx: BrowserContext, bCtx: BrowserContext, cCtx: BrowserContext;
  let viewerPage: Page;
  let extraCtxs: BrowserContext[] = [];
  let bName: string, cName: string;
  let uid: string;

  test.beforeAll(async ({ browser: b }) => {
    test.setTimeout(240000);
    browser = b;
    uid = UniqueIDGenerator.getID();

    const viewer = await registerAndSignIn(browser, `chatavatars2-viewer-${uid}@alkem.io`, `Viewer2${uid}`, 'Reader');
    viewerCtx = viewer.context;
    viewerPage = viewer.page;

    const b1 = await registerAndSignIn(browser, `chatavatars2-b-${uid}@alkem.io`, `Bella2${uid}`, 'Sender');
    bCtx = b1.context;
    bName = `Bella2${uid} Sender`;

    const c1 = await registerAndSignIn(browser, `chatavatars2-c-${uid}@alkem.io`, `Charlie2${uid}`, 'NoAvatar');
    cCtx = c1.context;
    cName = `Charlie2${uid} NoAvatar`;

    // Viewer creates the group conversation with B and C via the chat UI (no API seeding).
    await openChatPanel(viewerPage);
    await createGroupChat(viewerPage, [bName, cName]);
    await expect(viewerPage.getByPlaceholder(/Add a comment/i)).toBeVisible({ timeout: 15000 });
  });

  test.afterAll(async () => {
    await viewerCtx?.close();
    await bCtx?.close();
    await cCtx?.close();
    for (const ctx of extraCtxs) {
      await ctx.close();
    }
  });

  test('US2-AS1: a group with no custom photo shows the same avatar composite in the header as in the list row', async () => {
    await goBackToList(viewerPage);
    const row = groupRowByNames(viewerPage, [bName, cName]);
    await expect(row).toBeVisible({ timeout: 10000 });

    const listComposite = await avatarComposite(row);
    // Two "other" participants (B, C) → a composite of exactly 2 avatar cells
    // (each rendered as either a real image or an initials fallback, depending
    // on whether the platform has assigned that account a profile picture —
    // either way, a composite, never the group's single-photo branch).
    expect(listComposite.imgSrcs.length + listComposite.fallbackTexts.length).toBe(2);
    await viewerPage.screenshot({ path: 'test-results/us2-manual-evidence/US2-AS1-list-row-reference.png' });

    await row.click();
    await expect(viewerPage.getByPlaceholder(/Add a comment/i)).toBeVisible({ timeout: 10000 });

    const headerComposite = await avatarComposite(headerAvatarScope(viewerPage));
    // Header ≡ list row: same avatars, same fallback texts, same order.
    expect(headerComposite.imgSrcs).toEqual(listComposite.imgSrcs);
    expect(headerComposite.fallbackTexts).toEqual(listComposite.fallbackTexts);
    expect(headerComposite.imgSrcs.length + headerComposite.fallbackTexts.length).toBe(2);

    await viewerPage.screenshot({ path: 'test-results/us2-manual-evidence/US2-AS1.png' });
  });

  test('US2-AS2: setting a group photo makes the header show the photo — not the composite — exactly as the list row', async () => {
    await viewerPage.getByRole('button', { name: 'Group settings' }).click();
    await expect(viewerPage.getByRole('heading', { name: 'Group settings' })).toBeVisible();

    const fixturePath = createPngFixture('a');
    await viewerPage.getByRole('button', { name: 'Change photo' }).click();
    await viewerPage.locator('input[type="file"]').setInputFiles(fixturePath);
    await expect(viewerPage.getByRole('heading', { name: 'Crop photo' })).toBeVisible({ timeout: 10000 });

    const cropImg = viewerPage.getByAltText('Crop preview');
    await expect(cropImg).toBeVisible({ timeout: 10000 });
    const box = await cropImg.boundingBox();
    if (!box) throw new Error('Crop preview image has no bounding box');
    await viewerPage.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.15);
    await viewerPage.mouse.down();
    await viewerPage.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.85, { steps: 10 });
    await viewerPage.mouse.up();

    await viewerPage.getByRole('button', { name: 'Save', exact: true }).click(); // crop dialog save (uploads eagerly)
    await expect(viewerPage.getByRole('heading', { name: 'Crop photo' })).toHaveCount(0, { timeout: 15000 });

    await viewerPage.getByRole('button', { name: 'Save', exact: true }).click(); // group settings save (persists avatarUrl)
    await expect(viewerPage.getByRole('heading', { name: 'Group settings' })).toHaveCount(0, { timeout: 15000 });

    // Header: single photo avatar, not the composite.
    const headerComposite = await avatarComposite(headerAvatarScope(viewerPage));
    await expect
      .poll(async () => (await avatarComposite(headerAvatarScope(viewerPage))).imgSrcs.length, { timeout: 15000 })
      .toBe(1);
    expect(headerComposite.fallbackTexts).toHaveLength(0);
    await viewerPage.screenshot({ path: 'test-results/us2-manual-evidence/US2-AS2.png' });

    const headerImgSrc = (await avatarComposite(headerAvatarScope(viewerPage))).imgSrcs[0];

    await goBackToList(viewerPage);
    const row = groupRowByNames(viewerPage, [bName, cName]);
    await expect(row).toBeVisible({ timeout: 10000 });
    const listComposite = await avatarComposite(row);
    expect(listComposite.imgSrcs).toEqual([headerImgSrc]);
    expect(listComposite.fallbackTexts).toHaveLength(0);
    await viewerPage.screenshot({ path: 'test-results/us2-manual-evidence/US2-AS2-list-row-reference.png' });

    await row.click();
    await expect(viewerPage.getByPlaceholder(/Add a comment/i)).toBeVisible({ timeout: 10000 });
  });

  test('US2-AS3: changing the group photo updates the header the same way it updates the list', async () => {
    const beforeImgSrc = (await avatarComposite(headerAvatarScope(viewerPage))).imgSrcs[0];

    await viewerPage.getByRole('button', { name: 'Group settings' }).click();
    await expect(viewerPage.getByRole('heading', { name: 'Group settings' })).toBeVisible();

    const fixturePath = createPngFixture('b');
    await viewerPage.getByRole('button', { name: 'Change photo' }).click();
    await viewerPage.locator('input[type="file"]').setInputFiles(fixturePath);
    await expect(viewerPage.getByRole('heading', { name: 'Crop photo' })).toBeVisible({ timeout: 10000 });

    const cropImg = viewerPage.getByAltText('Crop preview');
    await expect(cropImg).toBeVisible({ timeout: 10000 });
    const box = await cropImg.boundingBox();
    if (!box) throw new Error('Crop preview image has no bounding box');
    await viewerPage.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.3);
    await viewerPage.mouse.down();
    await viewerPage.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.9, { steps: 10 });
    await viewerPage.mouse.up();

    await viewerPage.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(viewerPage.getByRole('heading', { name: 'Crop photo' })).toHaveCount(0, { timeout: 15000 });
    await viewerPage.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(viewerPage.getByRole('heading', { name: 'Group settings' })).toHaveCount(0, { timeout: 15000 });

    await expect
      .poll(
        async () => {
          const composite = await avatarComposite(headerAvatarScope(viewerPage));
          return composite.imgSrcs[0];
        },
        { timeout: 15000 }
      )
      .not.toBe(beforeImgSrc);

    const headerImgSrc = (await avatarComposite(headerAvatarScope(viewerPage))).imgSrcs[0];
    await viewerPage.screenshot({ path: 'test-results/us2-manual-evidence/US2-AS3.png' });

    await goBackToList(viewerPage);
    const row = groupRowByNames(viewerPage, [bName, cName]);
    await expect(row).toBeVisible({ timeout: 10000 });
    const listComposite = await avatarComposite(row);
    expect(listComposite.imgSrcs).toEqual([headerImgSrc]);
    await viewerPage.screenshot({ path: 'test-results/us2-manual-evidence/US2-AS3-list-row-reference.png' });

    await row.click();
    await expect(viewerPage.getByPlaceholder(/Add a comment/i)).toBeVisible({ timeout: 10000 });
  });

  test('US2-AS4: a group with more than four other participants shows the same 4-avatar subset in the header as in the list row', async () => {
    test.setTimeout(300000);
    // Three more participants beyond B and C → 5 "other" participants total (> 4).
    const names: string[] = [bName, cName];
    for (const letter of ['d', 'e', 'f']) {
      const first = `${letter.toUpperCase()}${letter}${uid}`;
      const email = `chatavatars2-${letter}-${uid}@alkem.io`;
      const { context } = await registerAndSignIn(browser, email, first, 'Extra');
      extraCtxs.push(context);
      names.push(`${first} Extra`);
    }
    expect(names).toHaveLength(5);

    await goBackToList(viewerPage);
    await viewerPage.getByRole('button', { name: 'New message' }).click();
    const search = viewerPage.getByPlaceholder(/Search people/);
    for (const name of names) {
      await search.fill(name);
      await viewerPage.getByRole('button', { name: new RegExp(name, 'i') }).click();
    }
    await viewerPage.getByRole('button', { name: 'Start group chat' }).click();
    await expect(viewerPage.getByPlaceholder(/Add a comment/i)).toBeVisible({ timeout: 15000 });

    const headerComposite = await avatarComposite(headerAvatarScope(viewerPage));
    // GroupAvatar caps the composite at 4, regardless of the 5 other participants.
    expect(headerComposite.fallbackTexts.length + headerComposite.imgSrcs.length).toBe(4);
    await viewerPage.screenshot({ path: 'test-results/us2-manual-evidence/US2-AS4.png' });

    await goBackToList(viewerPage);
    const row = groupRowByNames(viewerPage, names);
    await expect(row).toBeVisible({ timeout: 10000 });
    const listComposite = await avatarComposite(row);
    await viewerPage.screenshot({ path: 'test-results/us2-manual-evidence/US2-AS4-list-row-reference.png' });

    // Same subset, same order, in both surfaces (header ≡ list by construction).
    expect(headerComposite.fallbackTexts).toEqual(listComposite.fallbackTexts);
    expect(headerComposite.imgSrcs).toEqual(listComposite.imgSrcs);
  });
});
