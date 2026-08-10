// Shared helpers for the 033-chat-avatars acceptance walks (client-web#9949).
//
// ENVIRONMENT NOTES (verified 2026-08-07 against https://test-alkem.io):
//   - The chat popup is a plain `div[role="dialog"] aria-label="Chat"` — its
//     title is a <span>, NOT a heading. `getByRole('heading', {name: 'Chat'})`
//     never matches; always locate the panel by its dialog role.
//   - The "New message" recipient picker and the group-settings dialog are
//     Radix modals rendered OUTSIDE the panel. While one is open Radix marks
//     the rest of the page `aria-hidden`, so the panel locator stops matching.
//     Interactions with those dialogs are therefore scoped to `page`, not to
//     the panel.
//   - The lib's Kratos registration helpers cannot be used here: KRATOS_ENDPOINT
//     is not routed to Kratos on this environment (every self-service path
//     answers with the SPA's HTML), so the sign-up FORM is driven instead. See
//     `completeSignUp`. Only the users a walk actually drives are then signed
//     in — see `registerAccount` vs `registerAndSignIn`.
//   - Node 20.9.0 (the Volta-pinned runtime) has no `zlib.crc32`, so the PNG
//     fixture below carries its own CRC-32 implementation.

import { expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { getGraphqlClient, getMails, getUserToken, registerInAlkemioOrFail } from '@alkemio/tests-lib';

export const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
export const PASSWORD = process.env.AUTH_TEST_HARNESS_PASSWORD || 'ChatAvatars!Test2026';

/** Platform admin used only for post-run cleanup (never for the walks themselves). */
const ADMIN_EMAIL = 'admin@alkem.io';

// ─────────────────────── accounts and sessions ───────────────────────

/**
 * An account this suite created. Enough for a walk that only needs the person
 * to EXIST — to be findable in the people picker and to appear in a group's
 * avatar composite. No browser session is kept for these.
 */
export type TestAccount = {
  email: string;
  /** "First Last", exactly as the chat surfaces render it. */
  displayName: string;
  /** Alkemio user id, captured at creation so cleanup deletes by id, not by search. */
  id: string;
};

/** An account plus the signed-in browser session a walk drives. */
export type TestPerson = TestAccount & {
  context: BrowserContext;
  page: Page;
  /** URL slug for this user's own settings pages (read from the app, not derived). */
  slug: string;
};

export type PersonSpec = { email: string; firstName: string; lastName: string };

const VERIFICATION_SUBJECT = '[Alkemio] Please verify your email address!';

/**
 * The newest verification mail addressed to `email`.
 *
 * Scoped by recipient and sorted by send date because the package's
 * `getVerificationLink()` takes no address — it returns the first
 * "verify"-subject mail in the whole mailbox, which is wrong the moment two
 * registrations are in flight, and this suite registers concurrently. Nothing
 * here deletes mail: MailSlurper is shared with every other suite on the
 * environment, so wiping it (as `deleteMailSlurperMails()` does) would break
 * anything running alongside.
 */
export async function getVerificationLinkFor(email: string): Promise<string | undefined> {
  const response = await getMails();
  const items = (response.body.mailItems ?? []) as Array<{
    subject: string;
    body: string;
    toAddresses?: string[];
    dateSent: string;
  }>;
  const mail = items
    .filter(
      item =>
        item.subject === VERIFICATION_SUBJECT &&
        item.toAddresses?.some(address => address.toLowerCase() === email.toLowerCase())
    )
    .sort((a, b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime())[0];

  if (!mail) return undefined;
  const link = mail.body.match(/https?:\/\/[^\s"<]+self-service\/verification[^\s"<]*/);
  return link ? link[0].replace(/&amp;/g, '&') : undefined;
}

const CONSENT_COOKIE_NAME = 'accepted_cookies';

/**
 * Answers the cookie banner, waiting for it to appear the first time.
 *
 * `locator.isVisible({ timeout })` does NOT wait — the option is inert, so the
 * old form was an immediate check that silently no-ops if the SPA has not
 * rendered the banner yet, leaving it to intercept a later click. This waits
 * explicitly, but only while the consent cookie is absent, so contexts that
 * already answered pay nothing.
 */
export async function acceptCookiesIfPresent(page: Page): Promise<void> {
  const answered = (await page.context().cookies()).some(cookie => cookie.name === CONSENT_COOKIE_NAME);
  if (answered) return;

  const accept = page.getByRole('button', { name: 'Accept All Cookies', exact: true });
  await accept.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  if (await accept.isVisible()) {
    await accept.click();
    await expect(accept).toHaveCount(0, { timeout: 10000 });
  }
}

/**
 * Drives the real two-step sign-up form and follows the verification link.
 *
 * WHY THE FORM and not `@alkemio/tests-lib`'s `registerInKratosOrFail` /
 * `verifyInKratosOrFail`: those talk to Kratos directly at
 * `KRATOS_ENDPOINT` (`/ory/kratos/public`), and on this environment that path
 * is not routed to Kratos at all — every self-service endpoint returns the
 * SPA's HTML, so `createNativeRegistrationFlow()` yields no flow id. (Verified
 * 2026-08-07: both `/self-service/registration/api` and `.../browser` answer
 * `200 text/html`.) The harness's own persona seeding does not hit this because
 * `SKIP_USER_REGISTRATION=true` on this environment. If Kratos is ever exposed
 * here, swap this function for the lib's pair and delete the form driving.
 *
 * Note the accept-terms checkbox is ticked on BOTH steps — the second one gates
 * the submit button and does not inherit the first.
 */
async function completeSignUp(page: Page, { email, firstName, lastName }: PersonSpec): Promise<void> {
  await page.goto(`${BASE_URL}/sign_up`);
  await acceptCookiesIfPresent(page);
  await page.getByRole('checkbox').click();
  await page.getByLabel('E-Mail *').fill(email);
  await page.getByLabel('First Name *').fill(firstName);
  await page.getByLabel('Last Name *').fill(lastName);
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page).toHaveURL(/\/registration/, { timeout: 30000 });
  await page.getByRole('checkbox').click();
  await page.getByLabel('Password *').fill(PASSWORD);
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await expect(next).toBeEnabled({ timeout: 15000 });
  await next.click();
  await expect(page).toHaveURL(/registration\/success/, { timeout: 30000 });

  let verificationLink: string | undefined;
  await expect
    .poll(
      async () => {
        verificationLink = await getVerificationLinkFor(email);
        return verificationLink;
      },
      { timeout: 60000, intervals: [1000, 1000, 2000] }
    )
    .toBeTruthy();

  await page.goto(verificationLink as string);
  await expect(page.getByText('You successfully verified your email address.')).toBeVisible({ timeout: 20000 });
}

/** Signs in through the login form. */
async function signInThroughUi(page: Page, email: string): Promise<void> {
  await page.goto(BASE_URL);
  await acceptCookiesIfPresent(page);
  await page.getByRole('link', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
  await page.getByLabel('E-Mail *').fill(email);
  await page.getByLabel('Password *').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(`${BASE_URL}/home`, { timeout: 40000 });
}

/** Reads the signed-in user's URL slug from the dashboard's "My Account" link. */
async function readSettingsSlug(page: Page): Promise<string> {
  const accountLink = page.getByRole('link', { name: 'My Account' });
  await expect(accountLink).toBeVisible({ timeout: 30000 });
  const href = (await accountLink.getAttribute('href')) ?? '';
  const slug = href.match(/\/user\/([^/]+)\//)?.[1];
  expect(slug, `could not read the settings slug from "My Account" href: ${href}`).toBeTruthy();
  return slug as string;
}

/**
 * Everything this file creates is recorded the moment it exists.
 *
 * Setup failures are exactly when leaks happen: a batch registration that
 * rejects part-way leaves the caller with no reference to the accounts that DID
 * get created, so a teardown driven by the caller's variables silently skips
 * them. The registry makes teardown independent of what the caller managed to
 * receive.
 */
const createdAccounts: TestAccount[] = [];
const openContexts = new Set<BrowserContext>();

async function trackedContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext();
  openContexts.add(context);
  return context;
}

async function closeTracked(context: BrowserContext): Promise<void> {
  openContexts.delete(context);
  await context.close().catch(() => undefined);
}

/**
 * Creates a verified account and throws its browser away again.
 *
 * For participants a walk never drives — people who only need to be findable in
 * the picker and to appear in an avatar composite. Skipping the sign-in leaves
 * no long-lived context and no session round trip per such user.
 */
export async function registerAccount(browser: Browser, spec: PersonSpec): Promise<TestAccount> {
  const context = await trackedContext(browser);
  try {
    await completeSignUp(await context.newPage(), spec);
    const account: TestAccount = {
      email: spec.email,
      displayName: `${spec.firstName} ${spec.lastName}`,
      // Authenticating once materialises the Alkemio user server-side and hands
      // back the id, so cleanup can delete by id instead of searching.
      id: await registerInAlkemioOrFail(spec.firstName, spec.lastName, spec.email),
    };
    createdAccounts.push(account);
    return account;
  } finally {
    await closeTracked(context);
  }
}

/** Creates a verified account and keeps it signed in, for a walk that drives it. */
export async function registerAndSignIn(browser: Browser, spec: PersonSpec): Promise<TestPerson> {
  const context = await trackedContext(browser);
  try {
    const page = await context.newPage();
    await completeSignUp(page, spec);
    await signInThroughUi(page, spec.email);

    // Record the account BEFORE the last fallible step: once the server has
    // materialised the user it must be deletable even if reading the slug fails.
    const account: TestAccount = {
      email: spec.email,
      displayName: `${spec.firstName} ${spec.lastName}`,
      id: await registerInAlkemioOrFail(spec.firstName, spec.lastName, spec.email),
    };
    createdAccounts.push(account);

    return { ...account, context, page, slug: await readSettingsSlug(page) };
  } catch (error) {
    await closeTracked(context);
    throw error;
  }
}

/**
 * Creates accounts concurrently — nothing in setup depends on their order, and
 * each registration is an independent browser context with its own mailbox
 * lookup (scoped by recipient, so concurrent flows cannot steal each other's
 * verification link).
 */
export async function registerAccounts(browser: Browser, specs: PersonSpec[]): Promise<TestAccount[]> {
  return Promise.all(specs.map(spec => registerAccount(browser, spec)));
}

/** Creates accounts AND signs each one in, all concurrently. */
export async function registerAndSignInAll(browser: Browser, specs: PersonSpec[]): Promise<TestPerson[]> {
  return Promise.all(specs.map(spec => registerAndSignIn(browser, spec)));
}

// ─────────────────────────── image fixtures ───────────────────────────

// Node 20.9.0 has no zlib.crc32; PNG chunks need one, so here it is.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Writes a small, valid, distinctly-striped PNG and returns its path.
 * `variant` shifts the palette so two successive uploads are distinguishable.
 */
export function createPngFixture(variant: 'a' | 'b' = 'a'): string {
  const chunk = (tag: string, data: Buffer): Buffer => {
    const tagBuffer = Buffer.from(tag, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([tagBuffer, data])), 0);
    return Buffer.concat([length, tagBuffer, data, crc]);
  };

  const size = 64;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // colour type: RGB

  const rows: Buffer[] = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const stripe = (x + y) % 16 < 8;
      const [r, g, b] =
        variant === 'a'
          ? stripe
            ? [20, 160, 220]
            : [220, 20, 20]
          : stripe
            ? [240, 200, 10]
            : [10, 90, 240];
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }

  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdrData),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-avatars-fixture-'));
  const file = path.join(dir, `avatar-${variant}.png`);
  fs.writeFileSync(file, png);
  return file;
}

/**
 * Drags across the crop preview so ReactCrop reports a completed crop — the
 * crop dialog's Save button stays disabled until it does.
 */
async function completeCrop(page: Page, from = 0.15, to = 0.85): Promise<void> {
  const preview = page.getByAltText('Crop preview');
  await expect(preview).toBeVisible({ timeout: 15000 });
  const box = await preview.boundingBox();
  expect(box, 'crop preview has no bounding box').toBeTruthy();
  const { x, y, width, height } = box as { x: number; y: number; width: number; height: number };
  await page.mouse.move(x + width * from, y + height * from);
  await page.mouse.down();
  await page.mouse.move(x + width * to, y + height * to, { steps: 10 });
  await page.mouse.up();
}

/**
 * Uploads a profile picture for the signed-in user through the real settings UI
 * and returns the resulting image `src`, so callers can assert that exactly this
 * picture is the one the chat surfaces render.
 */
export async function uploadProfileAvatar(person: TestPerson, variant: 'a' | 'b' = 'a'): Promise<string> {
  const { page } = person;
  await page.goto(`${BASE_URL}/user/${person.slug}/settings/profile`);
  await acceptCookiesIfPresent(page);

  // The file input is hidden and click-forwarded from the button, so drive it
  // through the file chooser rather than guessing which input[type=file] it is.
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Change Avatar' }).click(),
  ]);
  await chooser.setFiles(createPngFixture(variant));

  const cropTitle = page.getByRole('heading', { name: 'Crop avatar' });
  await expect(cropTitle).toBeVisible({ timeout: 15000 });
  await completeCrop(page);

  const save = page.getByRole('button', { name: 'Save', exact: true });
  await expect(save).toBeEnabled({ timeout: 10000 });
  await save.click();
  await expect(cropTitle).toHaveCount(0, { timeout: 30000 });

  // The 128px avatar in the "Profile Picture" card now shows the uploaded image.
  const settingsAvatar = page.locator('[data-slot="avatar"].size-32 [data-slot="avatar-image"]');
  await expect(settingsAvatar).toBeVisible({ timeout: 30000 });
  const src = await settingsAvatar.getAttribute('src');
  expect(src, 'the uploaded profile picture should have a src').toBeTruthy();

  await page.goto(`${BASE_URL}/home`);
  return src as string;
}

/** Sets (or replaces) the open group conversation's custom photo via Group settings. */
export async function setGroupPhoto(page: Page, variant: 'a' | 'b' = 'a'): Promise<void> {
  await chatPanel(page).getByRole('button', { name: 'Group settings' }).click();
  const settingsTitle = page.getByRole('heading', { name: 'Group settings' });
  await expect(settingsTitle).toBeVisible({ timeout: 15000 });

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Change photo' }).click(),
  ]);
  await chooser.setFiles(createPngFixture(variant));

  const cropTitle = page.getByRole('heading', { name: 'Crop photo' });
  await expect(cropTitle).toBeVisible({ timeout: 15000 });
  await completeCrop(page, variant === 'a' ? 0.15 : 0.1, variant === 'a' ? 0.85 : 0.9);

  const cropSave = page.getByRole('button', { name: 'Save', exact: true });
  await expect(cropSave).toBeEnabled({ timeout: 10000 });
  await cropSave.click(); // uploads the photo eagerly
  await expect(cropTitle).toHaveCount(0, { timeout: 30000 });

  // ...then persist the conversation change and close the settings dialog.
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(settingsTitle).toHaveCount(0, { timeout: 30000 });
}

// ───────────────────────────── chat panel ─────────────────────────────

/**
 * The chat popup itself.
 *
 * Located by the close button it always carries rather than by accessible name:
 * `ChatPanel` sets `aria-label={title}`, and the title is "Chat" only in the
 * conversation-list view — once a thread is open the dialog is named after the
 * conversation. Matching on a CSS attribute (not the ARIA tree) also keeps this
 * working while a Radix modal above it marks the rest of the page aria-hidden.
 */
export function chatPanel(page: Page): Locator {
  return page.locator('[role="dialog"]').filter({ has: page.locator('button[aria-label="Close chat"]') });
}

/**
 * Opens the chat popup if it is not already open.
 *
 * Idempotent: once the panel is open the launcher relabels itself to "Close
 * chat", so an unconditional click would hang waiting for a button that no
 * longer exists.
 */
export async function openChatPanel(page: Page): Promise<void> {
  await acceptCookiesIfPresent(page);
  // Instantaneous by design — this asks whether the panel is open right now,
  // so no wait is wanted (and `isVisible`'s timeout option would not wait anyway).
  if (await chatPanel(page).isVisible().catch(() => false)) {
    return;
  }
  await page.getByRole('button', { name: 'Open chat' }).click();
  await expect(chatPanel(page)).toBeVisible({ timeout: 20000 });
}

export function composer(page: Page): Locator {
  return chatPanel(page).getByPlaceholder(/Add a comment/i);
}

/** The panel's own header — where the conversation identity avatar lives. */
export function panelHeader(page: Page): Locator {
  return chatPanel(page).locator('header');
}

/**
 * Puts the panel in the conversation-list view, from either view.
 *
 * Idempotent on purpose: the back affordance only exists in the thread view, so
 * an unconditional click makes a test depend on which view the PREVIOUS test
 * happened to leave behind — and that breaks under `--grep`, shards and retries.
 */
export async function ensureConversationList(page: Page): Promise<void> {
  const back = chatPanel(page).getByRole('button', { name: 'Back to conversations' });
  // Instantaneous by design — which view are we in right now?
  if (await back.isVisible().catch(() => false)) {
    await back.click();
  }
  await expect(conversationRows(page).first()).toBeVisible({ timeout: 15000 });
}

/** Every conversation row in the list view. */
export function conversationRows(page: Page): Locator {
  return chatPanel(page).locator('ul[role="list"] > li > button');
}

/** The single list row carrying all of `names` (order-independent). */
export function conversationRow(page: Page, names: string[]): Locator {
  let rows = conversationRows(page);
  for (const name of names) rows = rows.filter({ hasText: name });
  return rows;
}

export async function openConversation(page: Page, names: string[]): Promise<void> {
  await ensureConversationList(page);
  const row = conversationRow(page, names);
  await expect(row).toHaveCount(1, { timeout: 20000 });
  await row.click();
  await expect(composer(page)).toBeVisible({ timeout: 20000 });
}

/** Creates a conversation with `names` through the real "New message" picker. */
export async function createConversation(page: Page, names: string[]): Promise<void> {
  await ensureConversationList(page);
  await chatPanel(page).getByRole('button', { name: 'New message' }).click();
  const picker = page.getByRole('dialog', { name: 'New message' });
  await expect(picker).toBeVisible({ timeout: 15000 });

  for (const name of names) {
    await picker.getByPlaceholder(/Search people/).fill(name);
    // Only the result button carries the name as text; the selected-chip's
    // remove button is icon-only, so this never matches an already-picked user.
    const result = picker.locator('li button').filter({ hasText: name });
    await expect(result).toHaveCount(1, { timeout: 20000 });
    await result.click();
  }

  await picker.getByRole('button', { name: names.length > 1 ? 'Start group chat' : 'Start chat' }).click();
  await expect(picker).toHaveCount(0, { timeout: 20000 });
  await expect(composer(page)).toBeVisible({ timeout: 20000 });
}

export async function sendMessage(page: Page, text: string): Promise<void> {
  const input = composer(page);
  await input.fill(text);
  await input.press('Enter');
  await expect(messageColumn(page, text)).toHaveCount(1, { timeout: 20000 });
}

/** Waits for a message sent by someone else to arrive over the room subscription. */
export async function expectMessageReceived(page: Page, text: string): Promise<void> {
  await expect(messageColumn(page, text)).toHaveCount(1, { timeout: 30000 });
}

// ─────────────────────── message-bubble selectors ───────────────────────
// These map 1:1 onto ChatMessageBubble.tsx:
//   <div class="flex items-start gap-2">           ← gutter row (group, incoming)
//     <div class="flex w-8 ...">[Avatar?]</div>    ← avatar gutter cell
//     <div class="group flex flex-col ...">        ← message column
//       <span ...><span class="truncate">name</span></span>   ← run-head name
//       <span class="sr-only">name</span>                     ← continuation attribution
//       ...bubble, reactions, timestamp

/** The message column for `text`. One per message. */
export function messageColumn(page: Page, text: string): Locator {
  return chatPanel(page).locator('div.group').filter({ hasText: text });
}

/**
 * The gutter row wrapping the message — absent for own messages and non-group
 * threads, which `ChatMessageBubble` renders as a bare column.
 *
 * Filtered by the message text rather than `has: messageColumn(...)`: a
 * `has:` locator is matched RELATIVE to each candidate row, so passing a
 * panel-rooted column locator (which starts at `[role="dialog"]`) can never
 * match and silently yields zero rows.
 */
export function gutterRow(page: Page, messageText: string): Locator {
  return chatPanel(page).locator('div.flex.items-start.gap-2').filter({ hasText: messageText });
}

/** The sender avatar in the gutter — present only on the first message of a run. */
export function gutterAvatar(row: Locator): Locator {
  return row.locator('div.w-8 [data-slot="avatar"]');
}

/** The visible sender name — present only on the first message of a run. */
export function visibleAuthorName(column: Locator): Locator {
  return column.locator('span.truncate');
}

/** The screen-reader-only sender attribution carried by run continuations. */
export function srOnlyAuthorName(column: Locator): Locator {
  return column.locator('span.sr-only');
}

/** A reaction count pill inside this message's own column. */
export function reactionPills(column: Locator): Locator {
  return column.locator('button[aria-pressed]');
}

/**
 * Asserts `locator` is in the DOM but visually hidden.
 *
 * NOT `expect(...).not.toBeVisible()`: Tailwind's `sr-only` clips the element
 * to 1×1 rather than removing it from layout, and Playwright counts anything
 * with a non-empty box as visible. The clipped box is the actual contract.
 */
export async function expectVisuallyHidden(locator: Locator): Promise<void> {
  await expect(locator).toHaveCount(1);
  const box = await locator.boundingBox();
  expect(box, 'expected the element to be laid out (sr-only, not display:none)').toBeTruthy();
  expect((box as { width: number }).width).toBeLessThanOrEqual(1);
  expect((box as { height: number }).height).toBeLessThanOrEqual(1);
}

/** Adds the first emoji from the picker as a reaction to `column`'s message. */
export async function addReaction(page: Page, column: Locator): Promise<void> {
  await column.hover();
  await column.getByRole('button', { name: 'Add reaction' }).click();
  // The picker is portaled to the body, outside the chat panel.
  const picker = page.locator('.epr-main');
  await expect(picker).toBeVisible({ timeout: 15000 });
  // emojiStyle=NATIVE renders text emoji in `button.epr-emoji` — there is no
  // `.epr-emoji-img` in this configuration.
  const emoji = picker.locator('button.epr-emoji').first();
  await expect(emoji).toBeVisible({ timeout: 15000 });
  await emoji.click();
  await expect(picker).toHaveCount(0, { timeout: 15000 });
}

// ───────────────────── conversation-identity avatars ─────────────────────

/**
 * The avatar composition inside `scope`: image sources and fallback-initials
 * texts in DOM order, read off the CRD avatar primitives' stable `data-slot`
 * markers. Comparing the header's composition with the list row's is what
 * "the header shows the same identity as the list" means concretely.
 */
export async function avatarComposite(scope: Locator): Promise<{ imgSrcs: string[]; fallbackTexts: string[] }> {
  const imgSrcs = await scope
    .locator('[data-slot="avatar-image"]')
    .evaluateAll(nodes => nodes.map(node => node.getAttribute('src') ?? ''));
  const fallbackTexts = await scope
    .locator('[data-slot="avatar-fallback"]')
    .evaluateAll(nodes => nodes.map(node => node.textContent?.trim() ?? ''));
  return { imgSrcs, fallbackTexts };
}

/**
 * `avatarComposite`, read once the composition has stopped changing.
 *
 * Radix swaps `AvatarFallback` for `AvatarImage` only once the image loads, so a
 * composite read too early reports an initials tile where the settled DOM shows
 * a picture. Comparing a list row captured before a click with a header captured
 * after it can therefore differ for timing reasons alone. Two identical
 * consecutive reads mean the swap is done.
 */
export async function settledAvatarComposite(scope: Locator): Promise<{ imgSrcs: string[]; fallbackTexts: string[] }> {
  let previous = JSON.stringify(await avatarComposite(scope));
  await expect
    .poll(
      async () => {
        const current = JSON.stringify(await avatarComposite(scope));
        const stable = current === previous;
        previous = current;
        return stable;
      },
      { timeout: 20000, intervals: [250, 250, 500] }
    )
    .toBe(true);
  return JSON.parse(previous);
}

/** Total avatar cells (image or initials) rendered inside `scope`. */
export async function avatarCellCount(scope: Locator): Promise<number> {
  const { imgSrcs, fallbackTexts } = await avatarComposite(scope);
  return imgSrcs.length + fallbackTexts.length;
}

// ────────────────────────────── cleanup ──────────────────────────────

/**
 * Removes every account this suite created, as platform admin.
 *
 * Deletes by the id captured at registration — no lookup, so cleanup cannot
 * miss a user because a search filter behaved unexpectedly. `deleteIdentity`
 * takes the Kratos identity with it.
 *
 * Failures are NOT swallowed: an account left behind is environment drift the
 * next run inherits, so the suite fails loudly instead (same policy as the 029
 * language walks).
 */
export async function deleteTestUsers(accounts: TestAccount[]): Promise<void> {
  const targets = accounts.filter(account => account?.id);
  if (targets.length === 0) return;

  const token = await getUserToken(ADMIN_EMAIL);
  const auth = { authorization: `Bearer ${token}` };
  const sdk = getGraphqlClient() as unknown as {
    deleteUser: (variables: unknown, headers: unknown) => Promise<unknown>;
  };

  const results = await Promise.allSettled(
    targets.map(account => sdk.deleteUser({ deleteData: { ID: account.id, deleteIdentity: true } }, auth))
  );

  const failures = results
    .map((result, index) => ({ result, account: targets[index] }))
    .filter(entry => entry.result.status === 'rejected')
    .map(entry => `${entry.account.email}: ${(entry.result as PromiseRejectedResult).reason?.message}`);

  if (failures.length > 0) {
    throw new Error(`chat-avatars cleanup failed for ${failures.length} account(s):\n${failures.join('\n')}`);
  }
}

/**
 * Closes every browser session this file opened and deletes every account it
 * created.
 *
 * Takes no arguments on purpose — see the registry above: cleanup must not
 * depend on which objects the caller managed to receive. Contexts are closed
 * with `allSettled` so one failing close cannot skip the deletion that follows;
 * a leftover account is environment drift, a leftover context is not.
 */
export async function teardownAccounts(): Promise<void> {
  const contexts = [...openContexts];
  openContexts.clear();
  await Promise.allSettled(contexts.map(context => context.close()));

  await deleteTestUsers(createdAccounts.splice(0));
}
