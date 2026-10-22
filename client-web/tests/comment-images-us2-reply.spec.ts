/**
 * Persisted P1 acceptance walk for images in comment replies (User Story 2).
 *
 * Authored from a green pseudo-manual walk driven headless against the live
 * stack at http://localhost:3000 (the gateway; NEVER :3001 — the raw vite
 * origin is CORS-blocked and yields false failures).
 *
 * Covers User Story 2 — "Reply to a comment with an image", as an ORDINARY
 * space member (M holds only the member role; the image button in a reply box
 * follows the right to reply in the room, not upload rights on the bucket):
 *   US2-AS1  paste one image, Send → the reply box stays open (controls
 *            disabled) while the send is in flight, then closes; the reply is
 *            the last one in the thread, with the picture inline.
 *   US2-AS2  text + one image → two rows, oldest first: the text reply, then
 *            the image.
 *   US2-AS3  upload route blocked → the box stays open, the chip is marked
 *            failed, a message explains, nothing is posted; after unblocking,
 *            Send again succeeds; the chip can also be removed.
 *   US2-AS4  an image staged on comment A's reply box is not carried over to
 *            comment B's reply box.
 *
 * Self-seeding: org + space, a published callout with comments, a fresh member
 * M and a fresh member O who writes two top-level comments. Everything is
 * deleted in afterAll.
 *
 * Run standalone:
 *   cd client-web
 *   pnpm exec playwright test tests/comment-images-us2-reply.spec.ts
 */

import { deflateSync } from 'node:zlib';
import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import {
  TestScenarioFactory,
  assignRoleToUser,
  createCalloutOnCalloutsSet,
  getGraphqlClient,
  getUserToken,
  registerInAlkemioOrFail,
  registerInKratosOrFail,
  verifyInKratosOrFail,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { CalloutVisibility, RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { loginViaCrd } from '../src/functional-e2e/helpers/login.helper';

const ADMIN_EMAIL = 'admin@alkem.io';
const UPLOAD_ROUTE = '**/api/private/rest/messaging/media/upload*';

/** A valid, tiny, solid-colour RGB PNG generated in-process (no fixture files). */
function makePng(r: number, g: number, b: number): string {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const size = 8;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return png.toString('base64');
}

const PNG_ONE = makePng(200, 30, 30);
const PNG_A = makePng(30, 30, 200);
const PNG_B = makePng(30, 160, 60);

async function registerVerifiedMember(email: string, firstName: string, lastName: string): Promise<string> {
  const { verificationFlowId } = await registerInKratosOrFail(firstName, lastName, email);
  await verifyInKratosOrFail(email, verificationFlowId);
  return registerInAlkemioOrFail(firstName, lastName, email);
}

/** Dispatches a paste of one image file into the given textbox (what Ctrl+V of a screenshot does). */
async function pasteImage(textbox: Locator, base64: string, fileName: string): Promise<void> {
  await textbox.evaluate(
    (el, { base64, fileName }) => {
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const data = new DataTransfer();
      data.items.add(new File([bytes], fileName, { type: 'image/png' }));
      (el as HTMLElement).focus();
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    },
    { base64, fileName }
  );
}

test.describe.configure({ mode: 'serial' });

test.describe('Comment images — US2 P1 acceptance walk (replies)', { tag: ['@forge-acceptance', '@comment-images'] }, () => {
  let scenario: OrganizationWithSpaceModel;
  let adminToken: string;
  let calloutUrl: string;
  let calloutName: string;
  let ownerId: string;
  let memberId: string;
  let memberContext: BrowserContext;
  let memberPage: Page;
  let commentA: string;
  let commentB: string;

  const dialog = (page: Page): Locator => page.getByRole('dialog', { name: calloutName });
  /** The top-level comment (list item) carrying exactly this text. */
  const comment = (page: Page, text: string): Locator =>
    dialog(page)
      .getByRole('listitem')
      .filter({ has: page.getByText(text, { exact: true }) })
      .first();
  const replyBox = (item: Locator): Locator => item.locator('[id^="comment-reply-input-"]');
  const openReply = async (item: Locator): Promise<Locator> => {
    await item.getByRole('button', { name: 'Reply', exact: true }).click();
    const box = replyBox(item);
    await expect(box).toBeVisible();
    return box;
  };
  const stagedList = (box: Locator): Locator => box.getByRole('list', { name: 'Files to send' });
  /** One entry per reply to the comment, oldest first: its text and its picture count. */
  const replyRows = async (item: Locator): Promise<string[]> => {
    const rows = item.locator('xpath=.//ul[not(@aria-label)]/li');
    const out: string[] = [];
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const text = (await row.locator('p').allInnerTexts()).join('/');
      const images = await row.getByRole('img', { name: /^Attached image/ }).count();
      out.push(`${text}|images=${images}`);
    }
    return out;
  };
  const openCallout = async (page: Page): Promise<void> => {
    await page.goto(calloutUrl);
    await expect(dialog(page)).toBeVisible({ timeout: 30_000 });
    await expect(dialog(page).getByRole('textbox', { name: 'Add a comment...' }).first()).toBeVisible();
  };

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);

    scenario = await TestScenarioFactory.createBaseScenario({
      name: `comment-images-us2-${Date.now()}`,
      space: { collaboration: { addTutorialCallouts: false } },
    });

    calloutName = `Comment images US2 ${Date.now()}`;
    const created = await createCalloutOnCalloutsSet(scenario.space.collaboration.calloutsSetId, {
      framing: { profile: { displayName: calloutName } },
      settings: {
        framing: { commentsEnabled: true },
        contribution: { enabled: false },
        visibility: CalloutVisibility.Published,
      },
    });
    expect(created.data?.createCalloutOnCalloutsSet?.id, 'seed: callout with comments').toBeTruthy();
    calloutUrl = created.data?.createCalloutOnCalloutsSet?.framing?.profile?.url as string;
    expect(calloutUrl, 'seed: callout url').toBeTruthy();

    // M and O are ORDINARY members — the premise of the story (access follows
    // space participation, no admin rights).
    const uid = UniqueIDGenerator.getID();
    const ownerEmail = `ci-us2-owner-${uid}@alkem.io`;
    const memberEmail = `ci-us2-member-${uid}@alkem.io`;
    ownerId = await registerVerifiedMember(ownerEmail, `Owner${uid}`, 'O');
    memberId = await registerVerifiedMember(memberEmail, `Member${uid}`, 'M');
    await assignRoleToUser(ownerId, scenario.space.community.roleSetId, RoleName.Member);
    await assignRoleToUser(memberId, scenario.space.community.roleSetId, RoleName.Member);
    adminToken = await getUserToken(ADMIN_EMAIL);

    // O writes two top-level comments, A then B.
    commentA = `US2 comment A ${uid}`;
    commentB = `US2 comment B ${uid}`;
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await loginViaCrd(ownerPage, ownerEmail);
    await openCallout(ownerPage);
    for (const text of [commentA, commentB]) {
      const input = dialog(ownerPage).getByRole('textbox', { name: 'Add a comment...' }).first();
      await input.fill(text);
      await dialog(ownerPage).getByRole('button', { name: 'Send' }).first().click();
      await expect(comment(ownerPage, text)).toBeVisible();
      await expect(input).toHaveValue('');
    }
    await ownerContext.close();

    memberContext = await browser.newContext();
    memberPage = await memberContext.newPage();
    await loginViaCrd(memberPage, memberEmail);
  });

  test.afterAll(async () => {
    await memberContext?.close().catch(() => undefined);
    try {
      const sdk = getGraphqlClient() as unknown as {
        deleteUser: (
          v: { deleteData: { ID: string; deleteIdentity: boolean } },
          h: { authorization: string }
        ) => Promise<unknown>;
      };
      for (const id of [ownerId, memberId]) {
        if (id) {
          await sdk
            .deleteUser({ deleteData: { ID: id, deleteIdentity: true } }, { authorization: `Bearer ${adminToken}` })
            .catch(() => undefined);
        }
      }
    } finally {
      if (scenario) {
        await TestScenarioFactory.cleanUpBaseScenario(scenario);
      }
    }
  });

  test('US2-AS1: a pasted image reply keeps the box open until the send completes, then shows the picture last in the thread', async () => {
    await openCallout(memberPage);
    const item = comment(memberPage, commentA);
    const box = await openReply(item);

    // The image button is offered to the ordinary member in the reply box.
    await expect(box.getByRole('button', { name: 'Add image' })).toBeVisible();

    // Hold the upload so the in-flight state is observable deterministically.
    let releaseUpload: () => void = () => undefined;
    const uploadGate = new Promise<void>(resolve => {
      releaseUpload = resolve;
    });
    await memberPage.route(UPLOAD_ROUTE, async route => {
      await uploadGate;
      await route.continue();
    });

    await pasteImage(box.getByRole('textbox'), PNG_ONE, 'one.png');
    await expect(stagedList(box)).toContainText('one.png');
    await box.getByRole('button', { name: 'Send' }).click();

    // In flight: the box is still open and its controls are disabled.
    await expect(box.getByRole('status', { name: 'Uploading…' })).toBeVisible();
    await expect(box).toBeVisible();
    await expect(box.getByRole('textbox')).toBeDisabled();
    await expect(box.getByRole('button', { name: 'Send' })).toBeDisabled();
    await expect(box.getByRole('button', { name: 'Add image' })).toBeDisabled();

    releaseUpload();
    await expect(box).toHaveCount(0);
    await memberPage.unroute(UPLOAD_ROUTE);

    // The reply is the last one in the thread, with the picture rendered.
    const picture = item.getByRole('img', { name: 'Attached image: one.png' });
    await expect(picture).toBeVisible();
    await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(await replyRows(item)).toEqual(['|images=1']);

    await memberPage.reload();
    await expect(dialog(memberPage)).toBeVisible();
    await expect(comment(memberPage, commentA).getByRole('img', { name: 'Attached image: one.png' })).toHaveCount(1);
  });

  test('US2-AS2: text plus an image in a reply produces two rows, the text first and then the image', async () => {
    await openCallout(memberPage);
    const item = comment(memberPage, commentB);
    const box = await openReply(item);

    await box.getByRole('textbox').fill('US2 text reply');
    await pasteImage(box.getByRole('textbox'), PNG_A, 'a.png');
    await expect(stagedList(box)).toContainText('a.png');
    await box.getByRole('button', { name: 'Send' }).click();
    await expect(box).toHaveCount(0);

    await expect(item.getByRole('img', { name: 'Attached image: a.png' })).toBeVisible();
    expect(await replyRows(item)).toEqual(['US2 text reply|images=0', '|images=1']);

    await memberPage.reload();
    await expect(dialog(memberPage)).toBeVisible();
    await expect(comment(memberPage, commentB).getByRole('img', { name: 'Attached image: a.png' })).toHaveCount(1);
    expect(await replyRows(comment(memberPage, commentB))).toEqual(['US2 text reply|images=0', '|images=1']);
  });

  test('US2-AS3: a failed upload keeps the box open with a marked chip and a message; retry succeeds; the chip can be removed', async () => {
    await openCallout(memberPage);
    const item = comment(memberPage, commentB);
    const rowsBefore = await replyRows(item);
    expect(rowsBefore).toHaveLength(2);

    const box = await openReply(item);
    await memberPage.route(UPLOAD_ROUTE, route => route.abort('failed'));
    await pasteImage(box.getByRole('textbox'), PNG_B, 'b.png');
    await expect(stagedList(box)).toContainText('b.png');
    await box.getByRole('button', { name: 'Send' }).click();

    // Box stays open, chip is marked failed, the message explains, nothing was posted.
    await expect(box.getByRole('alert')).toHaveText('Upload failed. Send again to retry, or remove the file.');
    await expect(box).toBeVisible();
    await expect(stagedList(box).getByRole('listitem')).toHaveClass(/border-destructive/);
    await expect(box.getByRole('textbox')).toBeEnabled();
    await expect(box.getByRole('button', { name: 'Send' })).toBeEnabled();
    expect(await replyRows(item)).toEqual(rowsBefore);

    // Unblock and send again: the same chip uploads and the reply lands.
    await memberPage.unroute(UPLOAD_ROUTE);
    await box.getByRole('button', { name: 'Send' }).click();
    await expect(box).toHaveCount(0);
    await expect(item.getByRole('img', { name: 'Attached image: b.png' })).toBeVisible();
    expect(await replyRows(item)).toEqual([...rowsBefore, '|images=1']);

    // Remove path: fail again, then drop the chip instead of retrying.
    const box2 = await openReply(item);
    await memberPage.route(UPLOAD_ROUTE, route => route.abort('failed'));
    await pasteImage(box2.getByRole('textbox'), PNG_A, 'a.png');
    await box2.getByRole('button', { name: 'Send' }).click();
    await expect(box2.getByRole('alert')).toBeVisible();
    await box2.getByRole('button', { name: 'Remove a.png' }).click();
    await expect(stagedList(box2)).toHaveCount(0);
    await expect(box2.getByRole('alert')).toHaveCount(0);
    await expect(box2).toBeVisible();
    await memberPage.unroute(UPLOAD_ROUTE);
    expect(await replyRows(item)).toEqual([...rowsBefore, '|images=1']);
  });

  test("US2-AS4: an image staged on comment A's reply box is not carried over to comment B's", async () => {
    await openCallout(memberPage);
    const itemA = comment(memberPage, commentA);
    const itemB = comment(memberPage, commentB);

    const boxA = await openReply(itemA);
    await pasteImage(boxA.getByRole('textbox'), PNG_A, 'a.png');
    await expect(stagedList(boxA)).toContainText('a.png');

    const boxB = await openReply(itemB);
    await expect(boxA).toHaveCount(0);
    await expect(stagedList(boxB)).toHaveCount(0);
    await expect(boxB.getByRole('button', { name: /^Remove / })).toHaveCount(0);
    await expect(dialog(memberPage).getByRole('list', { name: 'Files to send' })).toHaveCount(0);
  });
});
