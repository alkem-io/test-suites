// updateVisual stores only an address the platform's own file storage
// produced (or the empty address, meaning "no picture"), for every visual
// type and every caller. Anything else is refused with VISUAL_URI_NOT_ALLOWED
// and the stored row is left alone.
//
// Every assertion on what is stored reads the row back through
// `getProfileVisuals`; the mutation's echo is never the proof.
//
// Only `extensions.code` is asserted on refusals: a production-mode server
// strips `numericCode` and `userMessage`, so those are proven by the server's
// own unit test, not here.

import {
  createPngFixture,
  getUserToken,
  GraphqlActor,
  provisionTestIdentities,
  readMyUser,
  registerInAlkemioOrFail,
  registerTestUser,
  testConfiguration,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { deleteUser } from '@functional-api/contributor-management/user/user.request.params';
import {
  getProfileVisuals,
  StoredVisual,
  updateVisualUri,
  uploadPngOnVisual,
} from './visual.request.params';

const REFUSED = 'VISUAL_URI_NOT_ALLOWED';
const OUTSIDE_HOST = 'https://host-you-control.example';

let baseScenario: OrganizationWithSpaceModel;
// The avatar under test is a member's own: a user created for this run alone,
// acting as itself, so no other suite or concurrent run writes the avatar
// between an upload and its readback.
let ownerId = '';
let owner: GraphqlActor;
let ownerProfileId = '';
let avatarId = '';
let uploadedUri = '';
let spaceProfileId = '';
let bannerId = '';
let bannerUriBefore = '';

const errorCode = (res: {
  body: { errors?: Array<Record<string, unknown>> };
}) => (res.body.errors?.[0]?.extensions as { code?: string } | undefined)?.code;

const readVisuals = async (
  profileId: string,
  actor: GraphqlActor
): Promise<StoredVisual[]> => {
  const res = await getProfileVisuals(profileId, actor);
  expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
  return res.body.data?.lookup?.profile?.visuals ?? [];
};

const readVisual = async (
  profileId: string,
  visualId: string,
  actor: GraphqlActor
): Promise<StoredVisual> => {
  const visual = (await readVisuals(profileId, actor)).find(
    v => v.id === visualId
  );
  expect(visual, `visual ${visualId} not found on profile`).toBeDefined();
  return visual as StoredVisual;
};

beforeAll(async () => {
  // The factory fills TestUserManager.users, so it runs before any persona
  // is used. Its space is the BANNER source.
  baseScenario = await TestScenarioFactory.createBaseScenario({
    name: 'visual-uri-rule',
    space: {},
  });

  // The harness's two identity paths: the Kratos admin API where it is
  // reachable (CI), which sends no verification mail; self-service sign-up
  // otherwise. The server creates the user on its first authenticated call.
  const userName = `visualuri.${UniqueIDGenerator.getID()}`;
  const email = `${userName}@alkem.io`;
  if (testConfiguration.endPoints.kratos.admin) {
    await provisionTestIdentities([userName]);
  } else {
    await registerTestUser(userName);
  }
  ownerId = await registerInAlkemioOrFail(userName, userName, email);
  owner = { bearerToken: await getUserToken(email) };
  const me = await readMyUser(owner);
  ownerProfileId = me.data?.me.user?.profile?.id ?? '';
  expect(ownerProfileId, JSON.stringify(me.error)).not.toEqual('');

  const avatar = (await readVisuals(ownerProfileId, owner)).find(
    v => v.name === 'AVATAR'
  );
  avatarId = avatar?.id ?? '';
  expect(avatarId, 'the new user has no AVATAR visual').not.toEqual('');

  // A fresh upload, never the registration-time picture: the accepted address
  // is whatever the platform's storage produces on this stack.
  const upload = await uploadPngOnVisual(
    avatarId,
    createPngFixture({ width: 200, height: 200 }),
    owner
  );
  expect(upload.body.errors, upload.raw).toBeUndefined();
  uploadedUri = upload.body.data?.uploadImageOnVisual?.uri ?? '';
  expect(uploadedUri, 'upload returned no uri').not.toEqual('');

  spaceProfileId = baseScenario.space.about.profile.id;
  const banner = (
    await readVisuals(spaceProfileId, TestUser.GLOBAL_ADMIN)
  ).find(v => v.name === 'BANNER');
  bannerId = banner?.id ?? '';
  bannerUriBefore = banner?.uri ?? '';
  expect(bannerId, 'space has no BANNER visual').not.toEqual('');
});

afterAll(async () => {
  if (ownerId) await deleteUser(ownerId);
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('updateVisual address rule — refused addresses on an avatar', () => {
  // Factories, not values: the upload-derived addresses only exist once
  // beforeAll has run, after the table is collected.
  test.each<[string, (uploaded: string) => string]>([
    ['US1-AS1 — an outside host', () => `${OUTSIDE_HOST}/a.png`],
    ['US1-AS3 — a value that is not a URL', () => 'not a url'],
    [
      'US1-AS3 — a non-web scheme',
      () => 'ftp://host-you-control.example/a.png',
    ],
    [
      'US1-AS1 — the storage path on another host',
      uploaded => `https://other.example${new URL(uploaded).pathname}`,
    ],
    [
      'US1-AS1 — the storage base continued with ../ to another platform route',
      uploaded =>
        `${uploaded.slice(0, uploaded.lastIndexOf('/') + 1)}` +
        `../../../../auth/oidc/logout?post_logout_redirect_uri=${OUTSIDE_HOST}/x.png`,
    ],
    [
      'US1-AS1 — the uploaded address with a query appended',
      uploaded => `${uploaded}?x=1`,
    ],
  ])('%s is refused and the avatar is unchanged', async (_label, toUri) => {
    const uri = toUri(uploadedUri);

    const res = await updateVisualUri(avatarId, uri, 'refused', owner);

    expect(errorCode(res), res.raw).toBe(REFUSED);
    expect(res.body.data).toBeNull();
    const stored = await readVisual(ownerProfileId, avatarId, owner);
    expect(stored.uri).toBe(uploadedUri);
  });
});

describe('updateVisual address rule — accepted addresses', () => {
  test('US2-AS2 — the uploaded storage address is accepted with a new alternative text', async () => {
    const altText = `avatar-alt-${UniqueIDGenerator.getID()}`;

    const res = await updateVisualUri(avatarId, uploadedUri, altText, owner);

    expect(res.body.errors, res.raw).toBeUndefined();
    const stored = await readVisual(ownerProfileId, avatarId, owner);
    expect(stored.uri).toBe(uploadedUri);
    expect(stored.alternativeText).toBe(altText);
  });
});

describe('updateVisual address rule — no visual type is exempt', () => {
  // Order matters: (a) compares against the banner as it was before any
  // write in this file, (b) then changes it.
  test('US1-AS4 — a BANNER outside address is refused for an administrator', async () => {
    const res = await updateVisualUri(
      bannerId,
      `${OUTSIDE_HOST}/b.png`,
      'banner',
      TestUser.GLOBAL_ADMIN
    );

    expect(errorCode(res), res.raw).toBe(REFUSED);
    expect(res.body.data).toBeNull();
    const stored = await readVisual(
      spaceProfileId,
      bannerId,
      TestUser.GLOBAL_ADMIN
    );
    expect(stored.uri).toBe(bannerUriBefore);
  });

  test('US2-AS5 — the empty address is accepted as no picture', async () => {
    const altText = `banner-alt-${UniqueIDGenerator.getID()}`;

    const res = await updateVisualUri(
      bannerId,
      '',
      altText,
      TestUser.GLOBAL_ADMIN
    );

    expect(res.body.errors, res.raw).toBeUndefined();
    const stored = await readVisual(
      spaceProfileId,
      bannerId,
      TestUser.GLOBAL_ADMIN
    );
    expect(stored.uri).toBe('');
    expect(stored.alternativeText).toBe(altText);
  });
});

describe('updateVisual address rule — rights are checked before the address', () => {
  test('US3-AS3 — a caller without UPDATE gets the existing permission error, not the new code', async () => {
    const res = await updateVisualUri(
      avatarId,
      `${OUTSIDE_HOST}/a.png`,
      'x',
      TestUser.NON_SPACE_MEMBER
    );

    const code = errorCode(res);
    expect(code, res.raw).not.toBe(REFUSED);
    // The code updateVisual's UPDATE check (grantAccessOrFail) throws today;
    // the same check's refusal is pinned as FORBIDDEN_POLICY by the
    // subspace sorting/pinning and sidebar-positional suites.
    expect(code).toBe('FORBIDDEN_POLICY');
    const stored = await readVisual(ownerProfileId, avatarId, owner);
    expect(stored.uri).toBe(uploadedUri);
  });
});
