import { randomUUID } from 'node:crypto';
import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
  test,
} from '@playwright/test';
import { grantCookieConsent } from '../helpers/cookies.helper';
import { loginViaCrd } from '../helpers/login.helper';

/**
 * workspace#087-memo-pdf-download — User Story 2 (P1):
 * "Access is enforced exactly like reading the memo".
 *
 * AS1  a signed-in user who is not a member of the private Space gets 403 from
 *      the download URL (and, in the UI, no Download PDF button).
 * AS2  an anonymous visitor on a public Space's memo sees no Download PDF
 *      button, and the direct call answers 401.
 * AS3  a signed-in reader gets 404 for an unknown memo id and 400 for a
 *      malformed one.
 * AS4  a memo the reader may read that embeds an image from another memo's
 *      bucket is refused as not exportable: 422 with the neutral message, the
 *      "too large / cannot be exported" toast, the memo stays open and
 *      readable, and no file is downloaded.
 *
 * "No render was started" for AS1/AS2/AS3 is a server-log observation (a
 * rejected request never logs a "Memo PDF render completed" line); it is not
 * assertable from a browser, so this file asserts the refusal statuses and the
 * absence of a download only.
 *
 * Self-contained: provisions its own Kratos identities (admin API), a PUBLIC
 * Space P and a PRIVATE Space S (holding the memo under test and a second memo
 * whose bucket owns the embedded image) through the non-interactive GraphQL
 * endpoint, then walks the real UI and the real REST endpoint through the
 * gateway. Everything it creates is deleted again in afterAll (Spaces supplied
 * through the env vars are left alone). An image READ denial (same bucket, no
 * READ) maps to the same 422 in MemoPdfDownloadService; it has unit coverage
 * and is not re-created here.
 *
 * Environment (defaults suit the local forge stack; the file self-skips without
 * KRATOS_ADMIN_URL):
 *   ALKEMIO_BASE_URL        http://localhost:3000
 *   KRATOS_ADMIN_URL        Kratos ADMIN base, e.g. http://localhost:34515
 *   ALKEMIO_ADMIN_EMAIL     admin@alkem.io
 *   ALKEMIO_ADMIN_PASSWORD  the platform admin's password
 *   US2_PUBLIC_SPACE_ID     (optional) existing PUBLIC Space to use as P
 *   US2_PRIVATE_SPACE_ID    (optional) existing PRIVATE Space to use as S
 */

const BASE = (process.env.ALKEMIO_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);
const KRATOS_ADMIN = (process.env.KRATOS_ADMIN_URL || '').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ALKEMIO_ADMIN_EMAIL || 'admin@alkem.io';
const ADMIN_PASSWORD =
  process.env.ALKEMIO_ADMIN_PASSWORD ||
  process.env.AUTH_ADMIN_PASSWORD ||
  'password';
// Optional: reuse existing Spaces instead of creating them (the platform
// admin's account has a small free-Space quota). The public one must allow
// anonymous reads; the private one must be PRIVATE and not list the personas.
const PUBLIC_SPACE_ID = process.env.US2_PUBLIC_SPACE_ID || '';
const PRIVATE_SPACE_ID = process.env.US2_PRIVATE_SPACE_ID || '';
const GRAPHQL = `${BASE}/api/private/non-interactive/graphql`;
const PDF = (memoId: string) => `${BASE}/api/private/rest/memo/${memoId}/pdf`;
// Per-run secret for the throwaway identities this walk provisions.
const USER_PASSWORD =
  process.env.FORGE_PERSONA_PASSWORD || `F087-${randomUUID()}-Aa1!`;

const RUN = Date.now().toString(36);
type Persona = 'reader' | 'outsider';
const personaEmail: Record<Persona, string> = {
  reader: `us2-reader-${RUN}@alkem.io`,
  outsider: `us2-outsider-${RUN}@alkem.io`,
};

// 1x1 transparent PNG.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const tokens = new Map<string, string>();

/**
 * Everything this run creates, recorded the moment it exists so the afterAll
 * can undo a half-failed beforeAll. Spaces supplied through the env vars are
 * never recorded here, so they are never deleted.
 */
const created = {
  spaceIds: [] as string[],
  calloutIds: [] as string[],
  identityIds: {} as Partial<Record<Persona, string>>,
  userIds: {} as Partial<Record<Persona, string>>,
};

async function mintToken(userEmail: string) {
  const password = userEmail === ADMIN_EMAIL ? ADMIN_PASSWORD : USER_PASSWORD;
  const cached = tokens.get(userEmail);
  if (cached) return cached;
  let token = '';
  // The endpoint is rate limited; retry with a bounded backoff instead of sleeping.
  await expect(async () => {
    const res = await fetch(`${BASE}/api/auth/non-interactive-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password }),
    });
    expect(res.status, `login ${userEmail}`).toBe(201);
    token = ((await res.json()) as { api_token: string }).api_token;
  }).toPass({ intervals: [1_000, 5_000, 15_000], timeout: 120_000 });
  tokens.set(userEmail, token);
  return token;
}

type GqlResult<T = any> = { data?: T; errors?: Array<any> };

async function gql<T = any>(
  userEmail: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<GqlResult<T>> {
  const token = await mintToken(userEmail);
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  return (await res.json()) as GqlResult<T>;
}

function must<T = any>(result: GqlResult<T>, what: string): T {
  expect(
    result.errors,
    `${what}: ${JSON.stringify(result.errors)}`
  ).toBeUndefined();
  return result.data as T;
}

async function createIdentity(persona: Persona, first: string, last: string) {
  const userEmail = personaEmail[persona];
  const res = await fetch(`${KRATOS_ADMIN}/identities`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      schema_id: 'default',
      state: 'active',
      traits: { email: userEmail, accepted_terms: true, name: { first, last } },
      credentials: { password: { config: { password: USER_PASSWORD } } },
      verifiable_addresses: [
        { value: userEmail, verified: true, via: 'email', status: 'completed' },
      ],
    }),
  });
  expect(res.status, `kratos identity ${userEmail}`).toBe(201);
  created.identityIds[persona] = ((await res.json()) as { id: string }).id;
}

/** Signs the persona in once over the API, which registers its Alkemio user. */
async function registerAlkemioUser(persona: Persona) {
  created.userIds[persona] = must(
    await gql(personaEmail[persona], '{ me { user { id } } }'),
    `${persona} me`
  ).me.user.id as string;
}

async function acceptCookies(page: Page) {
  const accept = page.getByRole('button', { name: /accept all cookies/i });
  await accept
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => accept.click())
    .catch(() => undefined);
}

/** Contexts opened by the walk; closed after every test, pass or fail. */
const openContexts: BrowserContext[] = [];

async function signIn(browser: Browser, userEmail: string): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  openContexts.push(context);
  // Consent is seeded, so the banner never renders over the signed-in pages.
  await grantCookieConsent(context);
  const page = await context.newPage();
  await loginViaCrd(page, userEmail, USER_PASSWORD, BASE);
  return page;
}

async function anonymousPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  openContexts.push(context);
  return context.newPage();
}

/** GET the download URL with the page's own session; waits out a 429 busy-actor. */
async function getPdf(page: Page, memoId: string) {
  let status = 0;
  let contentType = '';
  let body = '';
  await expect(async () => {
    const res = await page
      .context()
      .request.get(PDF(memoId), { failOnStatusCode: false });
    status = res.status();
    contentType = res.headers()['content-type'] ?? '';
    body = (await res.body()).toString('utf8').slice(0, 300);
    expect(status, 'download is not capacity-limited').not.toBe(429);
  }).toPass({ intervals: [500, 1_000, 2_000], timeout: 30_000 });
  return { status, contentType, body };
}

const MEMO_FRAMING = `{
  id
  framing { type profile { url } memo { id profile { storageBucket { id } } } }
}`;

type MemoFixture = {
  calloutUrl: string;
  memoId: string;
  bucketId: string;
  title?: string;
};

type Container = {
  id: string;
  community: { roleSet: { id: string } };
  collaboration: { calloutsSet: { id: string } };
};

const CONTAINER_FIELDS =
  'id community { roleSet { id } } collaboration { calloutsSet { id } }';

/** A Space of the given privacy: an existing one (env id) or a freshly created one. */
async function space(
  existingId: string,
  privacy: 'PUBLIC' | 'PRIVATE'
): Promise<Container> {
  const lookup = async (id: string) => {
    const r = await gql(
      ADMIN_EMAIL,
      `query ($id: UUID!) { lookup { space(ID: $id) { ${CONTAINER_FIELDS} } } }`,
      { id }
    );
    expect(r.errors, 'space lookup').toBeUndefined();
    return r.data.lookup.space as Container | null;
  };
  if (existingId) {
    const found = await lookup(existingId);
    expect(
      found,
      `existing ${privacy} Space ${existingId} resolves`
    ).not.toBeNull();
    return found!;
  }
  const account = must(
    await gql(ADMIN_EMAIL, '{ me { user { account { id } } } }'),
    'admin account'
  ).me.user.account.id as string;
  const nameId = `us2-${privacy.toLowerCase()}-${RUN}`;
  const newSpace = must(
    await gql(
      ADMIN_EMAIL,
      `mutation ($d: CreateSpaceOnAccountInput!) {
        createSpace(spaceData: $d) { id }
      }`,
      {
        d: {
          accountID: account,
          nameID: nameId,
          about: { profileData: { displayName: nameId } },
          collaborationData: { calloutsSetData: {} },
          settings: { privacy: { mode: privacy } },
        },
      }
    ),
    `create ${privacy} space`
  ).createSpace;
  created.spaceIds.push(newSpace.id);
  let found: Container | null = null;
  // Space creation finishes asynchronously; poll the lookup until it resolves.
  await expect(async () => {
    found = await lookup(newSpace.id);
    expect(found).not.toBeNull();
  }).toPass({ intervals: [1_000, 2_000], timeout: 90_000 });
  return found!;
}

async function createMemoCallout(
  calloutsSetId: string,
  title: string,
  markdown: string,
  publish = true
): Promise<MemoFixture> {
  const callout = must(
    await gql(
      ADMIN_EMAIL,
      `mutation ($d: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $d) ${MEMO_FRAMING}
      }`,
      {
        d: {
          calloutsSetID: calloutsSetId,
          framing: {
            type: 'MEMO',
            profile: { displayName: title, description: 'memo' },
            memo: { markdown, profile: { displayName: title } },
          },
          settings: {
            visibility: 'DRAFT',
            contribution: { enabled: false },
            framing: { commentsEnabled: false },
          },
        },
      }
    ),
    `create memo callout ${title}`
  ).createCalloutOnCalloutsSet;
  created.calloutIds.push(callout.id);
  if (publish) {
    must(
      await gql(
        ADMIN_EMAIL,
        `mutation ($d: UpdateCalloutVisibilityInput!) {
          updateCalloutVisibility(calloutData: $d) { id }
        }`,
        {
          d: {
            calloutID: callout.id,
            visibility: 'PUBLISHED',
            sendNotification: false,
          },
        }
      ),
      `publish ${title}`
    );
  }
  return {
    calloutUrl: callout.framing.profile.url,
    memoId: callout.framing.memo.id,
    bucketId: callout.framing.memo.profile.storageBucket.id,
  };
}

/**
 * A memo CONTRIBUTION, written by `contributor`, on a fresh contributions
 * callout. Creating a memo from markdown copies every referenced image the
 * author may READ into the new memo's own bucket; an image the author may not
 * read is left pointing where it was. The foreign image below is in a DRAFT
 * memo's bucket, which the reader cannot read, so the URL survives and still
 * points into another memo's bucket.
 */
async function createMemoContribution(
  calloutsSetId: string,
  title: string,
  markdown: string,
  contributor: string
): Promise<MemoFixture> {
  const callout = must(
    await gql(
      ADMIN_EMAIL,
      `mutation ($d: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $d) {
          id
          framing { profile { url } }
        }
      }`,
      {
        d: {
          calloutsSetID: calloutsSetId,
          framing: {
            type: 'NONE',
            profile: {
              displayName: `${title} contributions`,
              description: 'd',
            },
          },
          settings: {
            visibility: 'PUBLISHED',
            contribution: { enabled: true, allowedTypes: ['MEMO'] },
            framing: { commentsEnabled: false },
          },
          sendNotification: false,
        },
      }
    ),
    `create contributions callout ${title}`
  ).createCalloutOnCalloutsSet;
  created.calloutIds.push(callout.id);
  const contribution = must(
    await gql(
      contributor,
      `mutation ($d: CreateContributionOnCalloutInput!) {
        createContributionOnCallout(contributionData: $d) {
          memo { id profile { storageBucket { id } } }
        }
      }`,
      {
        d: {
          calloutID: callout.id,
          type: 'MEMO',
          memo: { markdown, profile: { displayName: title } },
        },
      }
    ),
    `create memo contribution ${title}`
  ).createContributionOnCallout;
  return {
    calloutUrl: callout.framing.profile.url,
    memoId: contribution.memo.id,
    bucketId: contribution.memo.profile.storageBucket.id,
    title,
  };
}

async function uploadToBucket(bucketId: string) {
  const token = await mintToken(ADMIN_EMAIL);
  const form = new FormData();
  form.append(
    'operations',
    JSON.stringify({
      query: `mutation ($f: Upload!, $d: StorageBucketUploadFileInput!) {
        uploadFileOnStorageBucket(file: $f, uploadData: $d) { id url }
      }`,
      variables: { f: null, d: { storageBucketId: bucketId } },
    })
  );
  form.append('map', JSON.stringify({ 0: ['variables.f'] }));
  form.append(
    '0',
    new Blob([new Uint8Array(PNG_1X1)], { type: 'image/png' }),
    'foreign.png'
  );
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'apollo-require-preflight': 'true',
    },
    body: form,
  });
  const json = (await res.json()) as GqlResult;
  return must(json, 'upload foreign image').uploadFileOnStorageBucket
    .url as string;
}

/** Opens the callout dialog, then the framing memo inside it. */
async function openMemo(page: Page, calloutUrl: string) {
  await page.goto(calloutUrl);
  await acceptCookies(page);
  const dialog = page.getByRole('dialog').first();
  await dialog.waitFor({ state: 'visible', timeout: 60_000 });
  await dialog
    .getByRole('button', { name: /open memo/i })
    .first()
    .click();
  await expect(page.locator('.ProseMirror').first()).toBeVisible({
    timeout: 45_000,
  });
}

/** Opens a contributions callout, then one memo card inside it. */
async function openContributionMemo(page: Page, memo: MemoFixture) {
  await page.goto(memo.calloutUrl);
  await acceptCookies(page);
  const dialog = page.getByRole('dialog').first();
  await dialog.waitFor({ state: 'visible', timeout: 60_000 });
  const card = dialog.getByRole('button', {
    name: `Open ${memo.title}`,
    exact: true,
  });
  const showMore = dialog.getByRole('button', { name: /show more/i });
  // The card sits behind "show more" when the contribution list is collapsed.
  await expect(card.or(showMore).first()).toBeVisible({ timeout: 30_000 });
  if (await showMore.isVisible()) await showMore.click();
  await card.click();
  await expect(page.locator('.ProseMirror').first()).toBeVisible({
    timeout: 45_000,
  });
}

async function adminMutation(
  query: string,
  variables: Record<string, unknown>,
  what: string
) {
  const result = await gql(ADMIN_EMAIL, query, variables);
  if (result.errors) {
    throw new Error(`${what}: ${JSON.stringify(result.errors)}`);
  }
}

async function deleteKratosIdentity(identityId: string) {
  const res = await fetch(`${KRATOS_ADMIN}/identities/${identityId}`, {
    method: 'DELETE',
  });
  // 404: already gone, which is the state teardown wants.
  if (res.status !== 204 && res.status !== 404) {
    throw new Error(`kratos DELETE answered ${res.status}`);
  }
}

/**
 * Undoes everything recorded in `created`, children first: callouts (with
 * their memos, the uploaded image and the contribution), then the Spaces this
 * run created (with the reader's membership and application), then the
 * throwaway users and their Kratos identities. Every step is attempted; any
 * failure fails the hook, because a leaked fixture breaks the next run.
 */
async function teardown() {
  const failures: string[] = [];
  const attempt = async (what: string, step: () => Promise<unknown>) => {
    try {
      await step();
    } catch (error) {
      failures.push(
        `${what}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };
  for (const id of created.calloutIds.splice(0).reverse()) {
    await attempt(`delete callout ${id}`, () =>
      adminMutation(
        'mutation ($d: DeleteCalloutInput!) { deleteCallout(deleteData: $d) { id } }',
        { d: { ID: id } },
        'deleteCallout'
      )
    );
  }
  for (const id of created.spaceIds.splice(0).reverse()) {
    await attempt(`delete space ${id}`, () =>
      adminMutation(
        'mutation ($d: DeleteSpaceInput!) { deleteSpace(deleteData: $d) { id } }',
        { d: { ID: id } },
        'deleteSpace'
      )
    );
  }
  for (const persona of Object.keys(personaEmail) as Persona[]) {
    const userId = created.userIds[persona];
    const identityId = created.identityIds[persona];
    delete created.userIds[persona];
    delete created.identityIds[persona];
    if (userId) {
      // deleteIdentity also removes the Kratos identity behind the user.
      await attempt(`delete user ${persona}`, () =>
        adminMutation(
          'mutation ($d: DeleteUserInput!) { deleteUser(deleteData: $d) { id } }',
          { d: { ID: userId, deleteIdentity: true } },
          'deleteUser'
        )
      );
    } else if (identityId) {
      // The identity exists but its Alkemio user was never registered.
      await attempt(`delete kratos identity ${persona}`, () =>
        deleteKratosIdentity(identityId)
      );
    }
  }
  expect(
    failures,
    'US2 teardown left fixtures behind; the next run may fail in beforeAll'
  ).toEqual([]);
}

const downloadButton = (page: Page) =>
  page.getByRole('button', { name: /download pdf/i });

const fixture = {
  privateMemo: null as unknown as MemoFixture,
  publicMemo: null as unknown as MemoFixture,
};

test.describe.configure({ mode: 'serial' });

test.describe(
  'US2 — memo PDF download access control',
  { tag: ['@forge-acceptance'] },
  () => {
    test.skip(
      KRATOS_ADMIN === '',
      'KRATOS_ADMIN_URL must point at the Kratos admin API (e.g. http://localhost:34515)'
    );
    // Provisioning and a PDF render per walk need more than the long tier's
    // 180 s. beforeAll/afterAll run on the project timeout, so they set it too.
    const WALK_TIMEOUT_MS = 300_000;
    test.setTimeout(WALK_TIMEOUT_MS);

    test.afterEach(async () => {
      await Promise.all(openContexts.splice(0).map(context => context.close()));
    });

    test.afterAll(async () => {
      test.setTimeout(WALK_TIMEOUT_MS);
      await teardown();
    });

    test.beforeAll(async () => {
      test.setTimeout(WALK_TIMEOUT_MS);
      await createIdentity('reader', 'Rita', 'Reader');
      await createIdentity('outsider', 'Otto', 'Outsider');
      // Both personas must exist as Alkemio users before they are used.
      await registerAlkemioUser('reader');
      // Registered, but never given a role anywhere.
      await registerAlkemioUser('outsider');

      // P is PUBLIC: an anonymous visitor may read its memo.
      const spaceP = await space(PUBLIC_SPACE_ID, 'PUBLIC');
      fixture.publicMemo = await createMemoCallout(
        spaceP.collaboration.calloutsSet.id,
        `Public memo ${RUN}`,
        'Public memo text.'
      );

      // S is PRIVATE; the reader is a member (application, approved by the
      // admin), the outsider is not.
      const spaceS = await space(PRIVATE_SPACE_ID, 'PRIVATE');
      const applied = must(
        await gql(
          personaEmail.reader,
          `mutation ($d: ApplyForEntryRoleOnRoleSetInput!) {
            applyForEntryRoleOnRoleSet(applicationData: $d) { id }
          }`,
          { d: { roleSetID: spaceS.community.roleSet.id, questions: [] } }
        ),
        'reader applies to S'
      ).applyForEntryRoleOnRoleSet;
      must(
        await gql(
          ADMIN_EMAIL,
          `mutation ($d: ApplicationEventInput!) {
            eventOnApplication(eventData: $d) { id state }
          }`,
          { d: { applicationID: applied.id, eventName: 'APPROVE' } }
        ),
        'admin approves the reader'
      );

      // Another memo of S owns the image the reader's memo points at: an image
      // from another memo's bucket.
      const memoF = await createMemoCallout(
        spaceS.collaboration.calloutsSet.id,
        `US2 foreign bucket ${RUN}`,
        'bucket owner',
        false
      );
      const foreignUrl = await uploadToBucket(memoF.bucketId);
      fixture.privateMemo = await createMemoContribution(
        spaceS.collaboration.calloutsSet.id,
        `Board decision ${RUN}`,
        `Decision text with a link.\n\n![foreign bucket image](${foreignUrl})\n`,
        personaEmail.reader
      );
    });

    test('AS1 — a signed-in non-member is refused with 403', async ({
      browser,
    }) => {
      const outsider = await signIn(browser, personaEmail.outsider);

      const res = await getPdf(outsider, fixture.privateMemo.memoId);
      expect(res.status).toBe(403);
      expect(res.contentType).not.toContain('application/pdf');

      // The private memo's page offers the outsider no Download PDF either.
      await outsider.goto(fixture.privateMemo.calloutUrl);
      // Wait for the refusal to render before asserting absences: the URL
      // resolver answers Forbidden for the callout, which the client shows as
      // the redirect-to-nearest-page dialog (or "Access Restricted" when no
      // ancestor is offered). Without this the zero counts pass on a blank page.
      await expect(
        outsider
          .getByText('We are redirecting you...', { exact: true })
          .or(
            outsider.getByRole('heading', {
              name: 'Access Restricted',
              exact: true,
            })
          )
          .first()
      ).toBeVisible({ timeout: 30_000 });
      await expect(outsider.locator('.ProseMirror')).toHaveCount(0);
      await expect(downloadButton(outsider)).toHaveCount(0);
    });

    test('AS2 — an anonymous visitor sees no Download PDF and gets 401', async ({
      browser,
    }) => {
      const anonymous = await anonymousPage(browser);
      await openMemo(anonymous, fixture.publicMemo.calloutUrl);
      // The memo is open and readable, yet no download is offered.
      await expect(anonymous.locator('.ProseMirror').first()).toContainText(
        'Public memo text.'
      );
      await expect(downloadButton(anonymous)).toHaveCount(0);

      const publicCall = await anonymous
        .context()
        .request.get(PDF(fixture.publicMemo.memoId), {
          failOnStatusCode: false,
        });
      expect(publicCall.status()).toBe(401);
      const privateCall = await anonymous
        .context()
        .request.get(PDF(fixture.privateMemo.memoId), {
          failOnStatusCode: false,
        });
      expect(privateCall.status()).toBe(401);
    });

    test('AS3 — an unknown id is 404 and a malformed id is 400', async ({
      browser,
    }) => {
      const reader = await signIn(browser, personaEmail.reader);

      const unknown = await getPdf(
        reader,
        '00000000-0000-4000-8000-000000000000'
      );
      expect(unknown.status).toBe(404);

      const malformed = await getPdf(reader, 'not-a-uuid');
      expect(malformed.status).toBe(400);
    });

    test('AS4 — an unreadable embedded image makes the memo not exportable (422)', async ({
      browser,
    }) => {
      const reader = await signIn(browser, personaEmail.reader);

      // REST: not 403 (the memo itself is readable), a neutral 422 message.
      const direct = await getPdf(reader, fixture.privateMemo.memoId);
      expect(direct.status).toBe(422);
      expect(direct.contentType).toContain('application/json');
      expect(JSON.parse(direct.body).message).toBeTruthy();

      // UI: Download PDF -> non-retryable toast; the memo stays open and readable.
      await openContributionMemo(reader, fixture.privateMemo);
      await expect(reader.locator('.ProseMirror').first()).toContainText(
        'Decision text with a link.'
      );
      let downloaded = false;
      reader.on('download', () => {
        downloaded = true;
      });
      const response = reader.waitForResponse(
        r =>
          r.url().includes(`/memo/${fixture.privateMemo.memoId}/pdf`) &&
          r.request().method() === 'GET'
      );
      await downloadButton(reader).click();
      expect((await response).status()).toBe(422);

      // The refusal is a typed Sonner toast carrying the neutral message.
      await expect(
        reader
          .locator(
            '[data-sonner-toast][data-type="error"], [data-sonner-toast][data-type="warning"]'
          )
          .filter({
            hasText: /too large or contains content that cannot be exported/i,
          })
      ).toBeVisible();
      await expect(reader.getByRole('dialog').first()).toBeVisible();
      await expect(reader.locator('.ProseMirror').first()).toContainText(
        'Decision text with a link.'
      );
      await expect(downloadButton(reader)).toBeEnabled();
      expect(downloaded).toBe(false);
    });
  }
);
