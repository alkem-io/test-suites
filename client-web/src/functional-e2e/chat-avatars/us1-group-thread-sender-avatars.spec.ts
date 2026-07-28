import { test, expect, type Browser, type BrowserContext, type Page, type Locator } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { deleteMailSlurperMails, getVerificationLink, UniqueIDGenerator } from '@alkemio/tests-lib';

/**
 * @forge-acceptance — workspace#033-chat-avatars, User Story 1 (P1)
 *
 * "Identify who sent each message in a group chat": in a group conversation,
 * every message from another participant shows that participant's avatar +
 * name on the first message of a consecutive-sender run; run continuations
 * are indented, avatar/name-free, but keep the sender exposed to assistive
 * technology. Own messages are unaffected.
 *
 * Mirrors specs/033-chat-avatars/spec.md User Story 1, scenario-for-scenario
 * (US1-AS1..AS8). Self-contained: registers three fresh users (viewer, B, C)
 * through the real sign-up + email-verification flow and builds the group
 * conversation through the chat UI itself — no API seeding.
 */

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'ChatAvatars!Test2026';

test.describe.configure({ mode: 'serial' });

async function acceptCookiesIfPresent(page: Page): Promise<void> {
  const acceptButton = page.getByRole('button', { name: 'Accept All Cookies', exact: true });
  if (await acceptButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptButton.click();
  }
}

/** Registers a brand-new user through the real sign-up + email-verification flow, then signs in. */
async function registerAndSignIn(
  browser: Browser,
  email: string,
  firstName: string,
  lastName: string
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await deleteMailSlurperMails();

  await page.goto(`${baseUrl}/sign_up`);
  await acceptCookiesIfPresent(page);
  await page.getByRole('checkbox').click();
  await page.getByLabel('E-Mail *').fill(email);
  await page.getByLabel('First Name *').fill(firstName);
  await page.getByLabel('Last Name *').fill(lastName);
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page).toHaveURL(/\/registration/, { timeout: 15000 });
  await page.getByRole('checkbox').click();
  await page.getByLabel('Password *').fill(password);
  const passwordNextButton = page.getByRole('button', { name: 'Next', exact: true });
  await expect(passwordNextButton).toBeEnabled({ timeout: 10000 });
  await passwordNextButton.click();

  await expect(page).toHaveURL(/registration\/success/, { timeout: 15000 });

  let verificationLink: string | undefined;
  await expect
    .poll(
      async () => {
        verificationLink = await getVerificationLink();
        return verificationLink;
      },
      { timeout: 30000, intervals: [1000, 1000, 2000] }
    )
    .toBeTruthy();

  await page.goto(verificationLink as string);
  await expect(page.getByText('You successfully verified your email address.')).toBeVisible({ timeout: 10000 });

  // Sign in explicitly rather than relying on the "Continue" affordance, which
  // completes an OIDC hop whose target is environment-dependent.
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

/** Writes a tiny valid PNG fixture to a temp file and returns its path. */
function createPngFixture(): string {
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
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // color type: RGB
  const ihdr = chunk('IHDR', ihdrData);

  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const isStripe = (x + y) % 16 < 8;
      row[1 + x * 3] = isStripe ? 255 : 30;
      row[1 + x * 3 + 1] = isStripe ? 120 : 30;
      row[1 + x * 3 + 2] = isStripe ? 30 : 255;
    }
    rows.push(row);
  }
  const idat = chunk('IDAT', zlib.deflateSync(Buffer.concat(rows)));
  const iend = chunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdr, idat, iend]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-avatars-fixture-'));
  const filePath = path.join(dir, 'avatar.png');
  fs.writeFileSync(filePath, png);
  return filePath;
}

/** Uploads and saves a profile avatar for the currently signed-in user (must be on /user/<id>/settings/profile or reachable via My Account). */
async function uploadProfileAvatar(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'My Account' }).click();
  const profileTab = page.getByRole('tab', { name: 'Profile' }).or(page.getByRole('link', { name: 'Profile', exact: true }));
  if (await profileTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await profileTab.click();
  }
  await page.getByRole('button', { name: 'Change Avatar' }).click();
  const fixturePath = createPngFixture();
  await page.locator('input[type="file"]').setInputFiles(fixturePath);
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  // The dialog closes and the avatar image replaces the initials fallback.
  await expect(page.getByRole('button', { name: 'Change Avatar' })).toBeVisible({ timeout: 15000 });
}

async function openChatPanel(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open chat' }).click();
  await expect(page.getByRole('heading', { name: 'Chat' })).toBeVisible();
}

/** Locates the group-thread row by requiring BOTH participant display names, order-independent. */
function groupThreadRow(page: Page, nameA: string, nameB: string): Locator {
  return page.getByRole('button').filter({ hasText: nameA }).filter({ hasText: nameB });
}

async function sendMessage(page: Page, text: string): Promise<void> {
  const input = page.getByPlaceholder(/Add a comment/i);
  await input.fill(text);
  await page.keyboard.press('Enter');
  await expect(page.getByText(text, { exact: true })).toBeVisible({ timeout: 10000 });
}

/** Scopes to the single message bubble's column (the `showAuthor`/sr-only siblings live here) by its unique text. */
function messageColumn(page: Page, messageText: string): Locator {
  return page.locator('div.group').filter({ hasText: messageText });
}

test.describe('US1 — group thread sender avatars', { tag: ['@forge-acceptance'] }, () => {
  let browser: Browser;
  let viewerCtx: BrowserContext, bCtx: BrowserContext, cCtx: BrowserContext;
  let viewerPage: Page, bPage: Page, cPage: Page;
  let bName: string, cName: string;

  test.beforeAll(async ({ browser: b }) => {
    test.setTimeout(180000);
    browser = b;
    const uid = UniqueIDGenerator.getID();

    const viewer = await registerAndSignIn(browser, `chatavatars-viewer-${uid}@alkem.io`, `Viewer${uid}`, 'Reader');
    viewerCtx = viewer.context;
    viewerPage = viewer.page;

    const b1 = await registerAndSignIn(browser, `chatavatars-b-${uid}@alkem.io`, `Bella${uid}`, 'Sender');
    bCtx = b1.context;
    bPage = b1.page;
    bName = `Bella${uid} Sender`;
    await uploadProfileAvatar(bPage);
    await bPage.goto(`${baseUrl}/home`);

    const c1 = await registerAndSignIn(browser, `chatavatars-c-${uid}@alkem.io`, `Charlie${uid}`, 'NoAvatar');
    cCtx = c1.context;
    cPage = c1.page;
    cName = `Charlie${uid} NoAvatar`;

    // Viewer creates the group conversation with B and C via the chat UI (no API seeding).
    await openChatPanel(viewerPage);
    await viewerPage.getByRole('button', { name: 'New message' }).click();
    const search = viewerPage.getByPlaceholder(/Search people/);
    await search.fill(bName);
    await viewerPage.getByRole('button', { name: new RegExp(bName, 'i') }).click();
    await search.fill(cName);
    await viewerPage.getByRole('button', { name: new RegExp(cName, 'i') }).click();
    await viewerPage.getByRole('button', { name: 'Start group chat' }).click();
    await expect(groupThreadRow(viewerPage, bName, cName)).toHaveCount(0); // panel switched to the thread view, list row not present here
    await expect(viewerPage.getByPlaceholder(/Add a comment/i)).toBeVisible({ timeout: 15000 });

    // B and C open the panel too (needed so the thread appears in their lists for later sends).
    await openChatPanel(bPage);
    await openChatPanel(cPage);
  });

  test.afterAll(async () => {
    await viewerCtx?.close();
    await bCtx?.close();
    await cCtx?.close();
  });

  test('US1-AS1: a single message from another participant shows their avatar and name', async () => {
    await bPage.getByRole('button').filter({ hasText: bName }).filter({ hasText: cName }).click();
    await sendMessage(bPage, 'US1-AS1 hello from Bella');

    await viewerPage.bringToFront();
    await expect(viewerPage.getByText('US1-AS1 hello from Bella', { exact: true })).toBeVisible({ timeout: 15000 });

    const column = messageColumn(viewerPage, 'US1-AS1 hello from Bella');
    await expect(column.locator('span:not(.sr-only)', { hasText: bName })).toBeVisible();
    // Avatar renders in the sibling gutter, immediately preceding the message column.
    const row = viewerPage.locator('div.flex.items-start.gap-2').filter({ has: column });
    await expect(row.locator('img, [class*="Fallback"], span').first()).toBeVisible();
  });

  test('US1-AS2: three consecutive messages from the same sender show avatar/name once', async () => {
    for (const text of ['US1-AS2 run message A', 'US1-AS2 run message B', 'US1-AS2 run message C']) {
      await sendMessage(bPage, text);
    }

    await viewerPage.bringToFront();
    for (const text of ['US1-AS2 run message A', 'US1-AS2 run message B', 'US1-AS2 run message C']) {
      await expect(viewerPage.getByText(text, { exact: true })).toBeVisible({ timeout: 15000 });
    }

    // Continuations: no visible (non-sr-only) author name in their own column.
    for (const text of ['US1-AS2 run message A', 'US1-AS2 run message B', 'US1-AS2 run message C']) {
      const column = messageColumn(viewerPage, text);
      await expect(column.locator('span:not(.sr-only)', { hasText: bName })).toHaveCount(0);
    }
  });

  test('US1-AS3: alternating senders (B, C, B) each restart a run', async () => {
    await cPage.bringToFront();
    await cPage.getByRole('button').filter({ hasText: bName }).filter({ hasText: cName }).click();
    await sendMessage(cPage, 'US1-AS3 charlie alternates');

    await bPage.bringToFront();
    await sendMessage(bPage, 'US1-AS3 bella alternates back');

    await viewerPage.bringToFront();
    await expect(viewerPage.getByText('US1-AS3 charlie alternates', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(viewerPage.getByText('US1-AS3 bella alternates back', { exact: true })).toBeVisible({ timeout: 15000 });

    const charlieColumn = messageColumn(viewerPage, 'US1-AS3 charlie alternates');
    await expect(charlieColumn.locator('span:not(.sr-only)', { hasText: cName })).toBeVisible();

    const bellaColumn = messageColumn(viewerPage, 'US1-AS3 bella alternates back');
    await expect(bellaColumn.locator('span:not(.sr-only)', { hasText: bName })).toBeVisible();
  });

  test('US1-AS4: the viewer\'s own messages remain unchanged (no avatar, no name)', async () => {
    await sendMessage(viewerPage, 'US1-AS4 my own message');

    const column = messageColumn(viewerPage, 'US1-AS4 my own message');
    // No sr-only or visible author name at all for own messages.
    await expect(column.locator('.sr-only')).toHaveCount(0);
    // Own messages render without the avatar-gutter wrapper.
    await expect(viewerPage.locator('div.flex.items-start.gap-2').filter({ has: column })).toHaveCount(0);
  });

  test('US1-AS5: a participant without a profile picture gets the initials fallback', async () => {
    await sendMessage(cPage, 'US1-AS5 charlie no avatar message');

    await viewerPage.bringToFront();
    await expect(viewerPage.getByText('US1-AS5 charlie no avatar message', { exact: true })).toBeVisible({
      timeout: 15000,
    });
    const column = messageColumn(viewerPage, 'US1-AS5 charlie no avatar message');
    const row = viewerPage.locator('div.flex.items-start.gap-2').filter({ has: column });
    // Charlie has no avatarUrl — the fallback renders initials text, not an <img>.
    await expect(row.locator('img')).toHaveCount(0);
  });

  test('US1-AS6: a run continuation still exposes the sender name to assistive technology', async () => {
    await sendMessage(cPage, 'US1-AS6 charlie continuation');

    await viewerPage.bringToFront();
    await expect(viewerPage.getByText('US1-AS6 charlie continuation', { exact: true })).toBeVisible({
      timeout: 15000,
    });
    const column = messageColumn(viewerPage, 'US1-AS6 charlie continuation');
    // Visually omitted (continuation of Charlie's AS5 message)...
    await expect(column.locator('span:not(.sr-only)', { hasText: cName })).toHaveCount(0);
    // ...but still present, sr-only, for screen readers (FR-008).
    const srOnly = column.locator('span.sr-only', { hasText: cName });
    await expect(srOnly).toHaveCount(1);
    await expect(srOnly).not.toBeVisible(); // present in DOM, not on screen
  });

  test('US1-AS7: reactions and timestamps stay attached to their own bubble in an indented run', async () => {
    // React to "US1-AS2 run message C" — a continuation bubble (no avatar/name of its own).
    const column = messageColumn(viewerPage, 'US1-AS2 run message C');
    await column.hover();
    await column.getByRole('button', { name: 'Add reaction' }).click();
    const picker = viewerPage.locator('.EmojiPickerReact, aside.epr-main').first();
    await expect(picker).toBeVisible({ timeout: 5000 });
    await viewerPage.locator('.epr-emoji-img').first().click();

    // The reaction pill renders inside this exact message's column, not on any neighboring bubble.
    await expect(column.locator('[aria-label*="reaction" i], button', { hasText: '1' }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('US1-AS8: a real-time message joins the current run; a different sender starts a new one', async () => {
    // No reload/navigation on viewerPage — the thread is already open; the
    // assertions below wait only on the room subscription push.
    await sendMessage(bPage, 'US1-AS8 bella realtime continuation');
    await viewerPage.bringToFront();
    await expect(viewerPage.getByText('US1-AS8 bella realtime continuation', { exact: true })).toBeVisible({
      timeout: 15000,
    });
    let column = messageColumn(viewerPage, 'US1-AS8 bella realtime continuation');
    // Joins Bella's still-open run from AS3 (no repeated name/avatar) — the
    // last incoming sender before this message was Bella herself.
    await expect(column.locator('span:not(.sr-only)', { hasText: bName })).toHaveCount(0);

    await sendMessage(cPage, 'US1-AS8 charlie starts new run');
    await viewerPage.bringToFront();
    await expect(viewerPage.getByText('US1-AS8 charlie starts new run', { exact: true })).toBeVisible({
      timeout: 15000,
    });
    column = messageColumn(viewerPage, 'US1-AS8 charlie starts new run');
    await expect(column.locator('span:not(.sr-only)', { hasText: cName })).toBeVisible();
  });
});
