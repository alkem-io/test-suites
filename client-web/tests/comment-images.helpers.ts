/**
 * Shared fixtures for the comment-images acceptance walks
 * (`comment-images-us*.spec.ts`): API seeding and fail-loud teardown,
 * disposable Kratos identities, sign-in, image files generated in-process and
 * synthetic paste / drag events.
 *
 * Every walk owns its data: `seedCommentImages` creates a private Space (with
 * its organization) through the API under a run-unique name, a published
 * callout C with comments, and on request a post P with its own comments, a
 * calendar event E and a platform forum discussion D. People are disposable
 * Kratos identities registered per run (`addMember`, `addSpaceAdmin`,
 * `addOutsider`); the shared harness personas are never modified. Every id is
 * recorded on the seed the moment it exists, so `cleanUpCommentImages` can
 * undo a half-failed `beforeAll`.
 */

import { deflateSync } from 'node:zlib';
import axios from 'axios';
import {
  expect,
  type Browser,
  type Locator,
  type Page,
  type BrowserContext,
  type Request,
  type Response,
  type Route,
} from '@playwright/test';
import {
  TestScenarioFactory,
  UniqueIDGenerator,
  assignRoleToUser,
  createCalloutOnCalloutsSet,
  deleteOrganization,
  deleteSpace,
  getUserToken,
  postGraphqlRaw,
  registerInAlkemioOrFail,
  registerInKratosOrFail,
  testConfiguration,
  verifyInKratosOrFail,
} from '@alkemio/tests-lib';
// The callout helpers in tests-lib are typed against the client-lib enum.
import { CalloutContributionType } from '@alkemio/client-lib/dist/generated/graphql';
import {
  CalendarEventType,
  CalloutAllowedActors,
  CalloutVisibility,
  ForumDiscussionCategory,
  RoleName,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { grantCookieConsent } from '../src/functional-e2e/helpers/cookies.helper';
import { loginViaCrd } from '../src/functional-e2e/helpers/login.helper';

export const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
export const ADMIN_EMAIL = 'admin@alkem.io';
/** The messaging media upload every comment image goes through. */
export const UPLOAD_ROUTE = '**/rest/messaging/media/upload**';
/** Screen-reader text a failed chip carries, so it is not marked by colour alone. */
export const UPLOAD_FAILED_LABEL = 'Upload failed';

export const UPLOAD_FAILED_MESSAGE =
  'Upload failed. Send again to retry, or remove the file.';

// --- files ---------------------------------------------------------------------------------------

export type TransferFile = { name: string; mimeType: string; buffer: Buffer };

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

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * A real 32x32 RGB PNG whose colour derives from `seed`, so two names never
 * produce the same bytes (and are never served as one cached blob).
 */
export function makePng(seed: string): Buffer {
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
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export const image = (name: string): TransferFile => ({
  name,
  mimeType: 'image/png',
  buffer: makePng(name),
});

/**
 * Dispatches a synthetic paste, drop or drag-over on a comment field, carrying
 * at most one file plus any extra clipboard flavours (`text/plain`, `text/rtf`,
 * …). A paste focuses the field first, as a real Ctrl+V does. Resolves to
 * whether a handler cancelled the event's default action (for a drag-over,
 * the `dragover` event's).
 */
export async function transfer(
  box: Locator,
  kind: 'paste' | 'drop' | 'dragover',
  file: TransferFile | null,
  data: Record<string, string> = {}
): Promise<boolean> {
  return box.evaluate(
    (el, { kind, file, data }) => {
      const dt = new DataTransfer();
      if (file) {
        const bytes = Uint8Array.from(atob(file.base64), c => c.charCodeAt(0));
        dt.items.add(new File([bytes], file.name, { type: file.mimeType }));
      }
      for (const [type, value] of Object.entries(data)) dt.setData(type, value);
      const init = { bubbles: true, cancelable: true };
      // dispatchEvent returns false once any handler has called preventDefault.
      if (kind === 'paste') {
        (el as HTMLElement).focus();
        return !el.dispatchEvent(
          new ClipboardEvent('paste', { ...init, clipboardData: dt })
        );
      }
      if (kind === 'drop') {
        return !el.dispatchEvent(
          new DragEvent('drop', { ...init, dataTransfer: dt })
        );
      }
      el.dispatchEvent(
        new DragEvent('dragenter', { ...init, dataTransfer: dt })
      );
      return !el.dispatchEvent(
        new DragEvent('dragover', { ...init, dataTransfer: dt })
      );
    },
    {
      kind,
      file: file
        ? {
            name: file.name,
            mimeType: file.mimeType,
            base64: file.buffer.toString('base64'),
          }
        : null,
      data,
    }
  );
}

// --- seeding -------------------------------------------------------------------------------------

export type Identity = { id: string; email: string };

/**
 * A disposable person as teardown knows it: recorded the moment its Kratos
 * identity exists, before it has an Alkemio user id.
 */
type RecordedIdentity = { email: string; id?: string };

export type CommentImagesSeed = {
  uid: string;
  scenario?: OrganizationWithSpaceModel;
  /** Disposable identities, recorded as soon as each Kratos identity exists. */
  users: RecordedIdentity[];
  discussionId?: string;
  contexts: BrowserContext[];
  calloutId: string;
  calloutName: string;
  calloutUrl: string;
  postName: string;
  postUrl: string;
  eventUrl: string;
  discussionUrl: string;
};

export const newSeed = (): CommentImagesSeed => ({
  uid: UniqueIDGenerator.getID(),
  users: [],
  contexts: [],
  calloutId: '',
  calloutName: '',
  calloutUrl: '',
  postName: '',
  postUrl: '',
  eventUrl: '',
  discussionUrl: '',
});

let adminToken: string | undefined;

/** Runs a GraphQL document as the platform admin; throws on any error. */
async function adminGql<T>(
  query: string,
  variables: Record<string, unknown>,
  what: string
): Promise<T> {
  adminToken ??= await getUserToken(ADMIN_EMAIL);
  const res = await postGraphqlRaw<T>(query, {
    variables,
    bearerToken: adminToken,
  });
  if (res.status !== 200 || res.body?.errors || !res.body?.data) {
    throw new Error(
      `${what} failed (HTTP ${res.status}): ${JSON.stringify(res.body?.errors ?? res.raw.slice(0, 300))}`
    );
  }
  return res.body.data;
}

/** The app URL for a server-generated profile URL, rebased on the URL under test. */
function appUrl(profileUrl: string | undefined, what: string): string {
  if (!profileUrl) throw new Error(`seed: ${what} has no profile URL`);
  return `${BASE_URL}${new URL(profileUrl).pathname}`;
}

/**
 * Creates the private Space S with callout C, and on request post P (in its
 * own callout, comments on), calendar event E and platform forum discussion D.
 */
export async function seedCommentImages(
  seed: CommentImagesSeed,
  label: string,
  parts: { post?: boolean; event?: boolean; discussion?: boolean } = {}
): Promise<void> {
  const { uid } = seed;
  seed.scenario = await TestScenarioFactory.createBaseScenario({
    name: `comment-images-${label}-${uid}`,
    space: {
      collaboration: { addTutorialCallouts: false },
      settings: { privacy: { mode: SpacePrivacyMode.Private } },
    },
  });
  const calloutsSetId = seed.scenario.space.collaboration.calloutsSetId;

  seed.calloutName = `Comment images ${label} ${uid}`;
  const callout = await createCalloutOnCalloutsSet(calloutsSetId, {
    framing: { profile: { displayName: seed.calloutName } },
    settings: {
      framing: { commentsEnabled: true },
      contribution: { enabled: false },
      visibility: CalloutVisibility.Published,
    },
  });
  const calloutId = callout.data?.createCalloutOnCalloutsSet?.id;
  if (!calloutId) throw new Error('seed: callout C was not created');
  seed.calloutId = calloutId;
  seed.calloutUrl = appUrl(
    callout.data?.createCalloutOnCalloutsSet?.framing?.profile?.url,
    'callout C'
  );

  if (parts.post) {
    const posts = await createCalloutOnCalloutsSet(calloutsSetId, {
      framing: {
        profile: { displayName: `Comment images posts ${label} ${uid}` },
      },
      settings: {
        framing: { commentsEnabled: false },
        contribution: {
          enabled: true,
          allowedTypes: [CalloutContributionType.Post],
          canAddContributions: CalloutAllowedActors.Members,
          commentsEnabled: true,
        },
        visibility: CalloutVisibility.Published,
      },
    });
    const postsCalloutId = posts.data?.createCalloutOnCalloutsSet?.id;
    if (!postsCalloutId) throw new Error('seed: posts callout was not created');
    seed.postName = `Comment images post ${label} ${uid}`;
    const { createContributionOnCallout } = await adminGql<{
      createContributionOnCallout: { post: { profile: { url: string } } };
    }>(
      `mutation ($d: CreateContributionOnCalloutInput!) {
        createContributionOnCallout(contributionData: $d) { post { profile { url } } }
      }`,
      {
        d: {
          calloutID: postsCalloutId,
          type: CalloutContributionType.Post,
          post: {
            profileData: {
              displayName: seed.postName,
              description: 'A post with its own comments.',
            },
          },
          sendNotification: false,
        },
      },
      'seed: post P'
    );
    seed.postUrl = appUrl(
      createContributionOnCallout.post?.profile?.url,
      'post P'
    );
  }

  if (parts.event) {
    const { lookup } = await adminGql<{
      lookup: {
        space: { collaboration: { timeline: { calendar: { id: string } } } };
      };
    }>(
      `query ($id: UUID!) {
        lookup { space(ID: $id) { collaboration { timeline { calendar { id } } } } }
      }`,
      { id: seed.scenario.space.id },
      'seed: space calendar'
    );
    const { createEventOnCalendar } = await adminGql<{
      createEventOnCalendar: { profile: { url: string } };
    }>(
      `mutation ($e: CreateCalendarEventOnCalendarInput!) {
        createEventOnCalendar(eventData: $e) { profile { url } }
      }`,
      {
        e: {
          calendarID: lookup.space.collaboration.timeline.calendar.id,
          profileData: { displayName: `Comment images event ${label} ${uid}` },
          startDate: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          durationMinutes: 60,
          multipleDays: false,
          wholeDay: false,
          type: CalendarEventType.Meeting,
          visibleOnParentCalendar: true,
        },
      },
      'seed: calendar event E'
    );
    seed.eventUrl = appUrl(createEventOnCalendar.profile?.url, 'event E');
  }

  if (parts.discussion) {
    const { platform } = await adminGql<{
      platform: { forum: { id: string } };
    }>('query { platform { forum { id } } }', {}, 'seed: platform forum');
    const { createDiscussion } = await adminGql<{
      createDiscussion: { id: string; profile: { url: string } };
    }>(
      `mutation ($d: ForumCreateDiscussionInput!) {
        createDiscussion(createData: $d) { id profile { url } }
      }`,
      {
        d: {
          forumID: platform.forum.id,
          category: ForumDiscussionCategory.Help,
          profile: {
            displayName: `Comment images discussion ${label} ${uid}`,
            description: 'Text comments only.',
          },
        },
      },
      'seed: forum discussion D'
    );
    seed.discussionId = createDiscussion.id;
    seed.discussionUrl = appUrl(createDiscussion.profile?.url, 'discussion D');
  }
}

/**
 * The size limit the callout's comment room enforces on an attached image: the
 * `maxFileSize` of the room's attachment bucket, read as the platform admin.
 */
export async function commentRoomMaxFileSize(
  seed: CommentImagesSeed
): Promise<number> {
  const { lookup } = await adminGql<{
    lookup: { callout: { comments: { attachmentBucketId: string | null } } };
  }>(
    `query ($id: UUID!) {
      lookup { callout(ID: $id) { comments { attachmentBucketId } } }
    }`,
    { id: seed.calloutId },
    'seed: comment room bucket'
  );
  const bucketId = lookup.callout?.comments?.attachmentBucketId;
  if (!bucketId)
    throw new Error('seed: the comment room has no attachment bucket');
  const bucket = await adminGql<{
    lookup: { storageBucket: { maxFileSize: number } };
  }>(
    'query ($id: UUID!) { lookup { storageBucket(ID: $id) { maxFileSize } } }',
    { id: bucketId },
    'seed: comment room bucket size limit'
  );
  const maxFileSize = bucket.lookup.storageBucket?.maxFileSize;
  if (!maxFileSize || maxFileSize <= 0)
    throw new Error(`seed: bucket ${bucketId} reports no size limit`);
  return maxFileSize;
}

/** The profile display name the platform shows for a user. */
export async function displayNameOf(identity: Identity): Promise<string> {
  const { lookup } = await adminGql<{
    lookup: { user: { profile: { displayName: string } } };
  }>(
    'query ($id: UUID!) { lookup { user(ID: $id) { profile { displayName } } } }',
    { id: identity.id },
    `seed: display name of ${identity.id}`
  );
  const name = lookup.user?.profile?.displayName;
  if (!name) throw new Error(`seed: user ${identity.id} has no display name`);
  return name;
}

/**
 * Registers a disposable, verified Kratos identity with an Alkemio user (it
 * can sign in). The identity is recorded on the seed as soon as Kratos holds
 * it, so a later failed step still leaves teardown something to delete.
 */
async function registerIdentity(
  seed: CommentImagesSeed,
  role: string
): Promise<Identity> {
  const email = `ci-${role}-${seed.uid}@alkem.io`;
  const firstName = `${role[0].toUpperCase()}${role.slice(1)}${seed.uid}`;
  const { verificationFlowId } = await registerInKratosOrFail(
    firstName,
    'Walker',
    email
  );
  const recorded: RecordedIdentity = { email };
  seed.users.push(recorded);
  await verifyInKratosOrFail(email, verificationFlowId);
  const id = await registerInAlkemioOrFail(firstName, 'Walker', email);
  recorded.id = id;
  return { id, email };
}

/** A disposable ORDINARY member of the seeded Space (member role only, no admin rights). */
export async function addMember(
  seed: CommentImagesSeed,
  role: string
): Promise<Identity> {
  if (!seed.scenario)
    throw new Error('seed: seedCommentImages must run before addMember');
  const identity = await registerIdentity(seed, role);
  const assigned = await assignRoleToUser(
    identity.id,
    seed.scenario.space.community.roleSetId,
    RoleName.Member
  );
  expect(assigned?.error, `seed: ${role} joins the Space`).toBeFalsy();
  return identity;
}

/** A disposable member of the seeded Space who also holds its Admin role. */
export async function addSpaceAdmin(
  seed: CommentImagesSeed,
  role: string
): Promise<Identity> {
  const identity = await addMember(seed, role);
  const assigned = await assignRoleToUser(
    identity.id,
    seed.scenario!.space.community.roleSetId,
    RoleName.Admin
  );
  expect(assigned?.error, `seed: ${role} becomes a Space admin`).toBeFalsy();
  return identity;
}

/** A disposable signed-in user who is NOT a member of the seeded Space. */
export const addOutsider = (
  seed: CommentImagesSeed,
  role: string
): Promise<Identity> => registerIdentity(seed, role);

/**
 * Signs in in a fresh browser context; the context is closed by
 * `cleanUpCommentImages`. Cookie consent is granted up front, so the banner
 * never renders over a composer.
 */
export async function signIn(
  browser: Browser,
  seed: CommentImagesSeed,
  email: string,
  viewport = { width: 1280, height: 1100 }
): Promise<Page> {
  const context = await browser.newContext({ viewport });
  seed.contexts.push(context);
  await grantCookieConsent(context);
  const page = await context.newPage();
  await loginViaCrd(page, email);
  return page;
}

// --- composer ------------------------------------------------------------------------------------

export type Composer = {
  dlg: Locator;
  box: Locator;
  stagedList: Locator;
  addImage: Locator;
  send: Locator;
  fileInput: Locator;
};

/**
 * Opens the top-level comment composer of the dialog at `url`, waiting until
 * it accepts files.
 */
export async function openComposer(page: Page, url: string): Promise<Composer> {
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

export const inlineImage = (scope: Locator, name: string): Locator =>
  scope.getByRole('img', { name: `Attached image: ${name}` });

/**
 * The list items (comment and reply rows) inside `scope` that hold an element
 * whose text is exactly `text`.
 */
export function rowsWithText(scope: Page | Locator, text: string): Locator {
  // A `has` locator is resolved inside each row, so it starts from the page.
  const page = 'mainFrame' in scope ? scope : scope.page();
  return scope
    .getByRole('listitem')
    .filter({ has: page.getByText(text, { exact: true }) });
}

/** The open reply box inside `scope`. */
export const replyBox = (scope: Page | Locator): Locator =>
  scope.locator('[id^="comment-reply-input-"]');

/**
 * Holds every comment-image upload at the network until the returned function
 * is called; calling it lets the held uploads through and removes the hold.
 */
export async function holdUploads(page: Page): Promise<() => Promise<void>> {
  let open: () => void = () => undefined;
  const gate = new Promise<void>(resolve => {
    open = resolve;
  });
  const hold = async (route: Route) => {
    await gate;
    await route.continue();
  };
  await page.route(UPLOAD_ROUTE, hold);
  return async () => {
    open();
    await page.unroute(UPLOAD_ROUTE, hold);
  };
}

// --- sends ---------------------------------------------------------------------------------------

/** The GraphQL mutations a comment and a reply are posted with. */
export type SendOperation = 'sendMessageToRoom' | 'sendMessageReplyToRoom';

export const isSendOf =
  (operation: SendOperation) =>
  (request: Request): boolean =>
    request.url().includes('graphql') &&
    (request.postData() ?? '').includes(operation);

export type SendTracker = {
  requests: Request[];
  bodies: Array<{ data?: any; errors?: unknown }>;
  stop: () => void;
};

/**
 * Collects the page's calls of one send mutation. `requests` records each call
 * as it leaves the page, in the order the calls leave, so once a later send
 * has been seen every earlier one is counted. `bodies` fills in only as the
 * responses are read: use it to inspect a send already counted, never to
 * count.
 */
export function trackSends(
  page: Page,
  operation: SendOperation = 'sendMessageToRoom'
): SendTracker {
  const isSend = isSendOf(operation);
  const requests: Request[] = [];
  const bodies: Array<{ data?: any; errors?: unknown }> = [];
  const onRequest = (request: Request) => {
    if (isSend(request)) requests.push(request);
  };
  const onResponse = async (response: Response) => {
    if (isSend(response.request())) bodies.push(await response.json());
  };
  page.on('request', onRequest);
  page.on('response', onResponse);
  return {
    requests,
    bodies,
    stop: () => {
      page.off('request', onRequest);
      page.off('response', onResponse);
    },
  };
}

/** The variables a counted send carried. */
export const sentVariables = (request: Request): Record<string, any> =>
  JSON.parse(request.postData() ?? '{}').variables ?? {};

/**
 * Checks that exactly one `operation` call was made, carrying one image (and
 * `text` / of `mimeType` when given), and that it did not error. Call it once
 * the send has settled, so every call it made has left the page.
 */
export async function expectOneSend(
  sends: SendTracker,
  operation: SendOperation,
  expected: { text?: string; mimeType?: string } = {}
): Promise<void> {
  // Response bodies are read asynchronously; wait for this one to land.
  await expect.poll(() => sends.bodies.length).toBe(1);
  sends.stop();
  expect(sends.requests, `exactly one ${operation} call`).toHaveLength(1);
  const [body] = sends.bodies;
  expect(body.errors, `${operation} must not error`).toBeUndefined();
  const sent = body.data[operation];
  expect(sent.attachments).toHaveLength(1);
  if (expected.text !== undefined) expect(sent.message).toBe(expected.text);
  if (expected.mimeType)
    expect(sent.attachments[0].mimeType).toBe(expected.mimeType);
}

/**
 * Removes a disposable person: the Alkemio user together with its Kratos
 * identity when the user exists (looked up by email when its id was never
 * learned), otherwise the bare Kratos identity through the Kratos admin API —
 * the only way to remove one that never became a platform user.
 */
async function deleteIdentity(user: RecordedIdentity): Promise<void> {
  let userId = user.id;
  if (!userId) {
    const { usersPaginated } = await adminGql<{
      usersPaginated: { users: Array<{ id: string; email: string }> };
    }>(
      `query ($email: String!) {
        usersPaginated(first: 10, filter: { email: $email }) { users { id email } }
      }`,
      { email: user.email },
      `teardown: user lookup for ${user.email}`
    );
    userId = usersPaginated.users.find(u => u.email === user.email)?.id;
  }
  if (userId) {
    await adminGql(
      'mutation ($d: DeleteUserInput!) { deleteUser(deleteData: $d) { id } }',
      { d: { ID: userId, deleteIdentity: true } },
      `teardown: user ${userId}`
    );
    return;
  }
  const admin = testConfiguration.endPoints.kratos.admin;
  if (!admin)
    throw new Error(
      `teardown: ${user.email} never became a platform user, and without KRATOS_ADMIN_URL its Kratos identity cannot be removed`
    );
  const identities = `${admin.replace(/\/$/, '')}/admin/identities`;
  const { data } = await axios.get<
    Array<{ id: string; traits?: { email?: string } }>
  >(identities, { params: { credentials_identifier: user.email } });
  for (const identity of data.filter(i => i.traits?.email === user.email))
    await axios.delete(`${identities}/${identity.id}`);
}

/**
 * Undoes everything `seedCommentImages`, `addMember`, `addSpaceAdmin` and
 * `addOutsider` recorded: the discussion, the identities, then the Space and
 * its organization. Every step is attempted; any failure fails the hook,
 * because a leaked fixture breaks the next run.
 */
export async function cleanUpCommentImages(
  seed: CommentImagesSeed
): Promise<void> {
  const failures: string[] = [];
  for (const context of seed.contexts)
    await context.close().catch(() => undefined);
  if (seed.discussionId) {
    await adminGql(
      'mutation ($d: DeleteDiscussionInput!) { deleteDiscussion(deleteData: $d) { id } }',
      { d: { ID: seed.discussionId } },
      `teardown: discussion ${seed.discussionId}`
    ).catch((e: Error) => failures.push(e.message));
  }
  for (const user of seed.users) {
    await deleteIdentity(user).catch((e: Error) =>
      failures.push(`${user.email}: ${e.message}`)
    );
  }
  // The Space first: its organization cannot be deleted while it hosts one.
  if (seed.scenario) {
    const { space, organization } = seed.scenario;
    const attempt = async (
      what: string,
      remove: () => Promise<{ error?: unknown }>
    ) => {
      try {
        const res = await remove();
        if (res.error) failures.push(`${what}: ${JSON.stringify(res.error)}`);
      } catch (e) {
        failures.push(`${what}: ${String(e)}`);
      }
    };
    await attempt(`space ${space.id}`, () => deleteSpace(space.id));
    await attempt(`organization ${organization.id}`, () =>
      deleteOrganization(organization.id)
    );
  }
  if (failures.length > 0)
    throw new Error(
      `comment-images teardown leaked fixtures: ${failures.join('; ')}`
    );
}
