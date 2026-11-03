// spec: workspace#098-bug-updatevisual-accepts-any-avatar-uri
// story: server#6745
//
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
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { uploadImageOnVisual } from '@functional-api/storage/upload.params';
import { getProfileVisuals, updateVisualUri } from './visual.request.params';

const REFUSED = 'VISUAL_URI_NOT_ALLOWED';
const OUTSIDE_HOST = 'https://host-you-control.example';

type StoredVisual = {
  id: string;
  name: string;
  uri: string;
  alternativeText?: string | null;
};

let baseScenario: OrganizationWithSpaceModel;
let qaProfileId = '';
let avatarId = '';
let uploadedUri = '';
let spaceProfileId = '';
let bannerId = '';
let bannerUriBefore = '';

const readVisuals = async (
  profileId: string,
  userRole: TestUser
): Promise<StoredVisual[]> => {
  const res = await getProfileVisuals(profileId, userRole);
  expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
  return res.body.data?.lookup?.profile?.visuals ?? [];
};

const readVisual = async (
  profileId: string,
  visualId: string,
  userRole: TestUser
): Promise<StoredVisual> => {
  const visual = (await readVisuals(profileId, userRole)).find(
    v => v.id === visualId
  );
  expect(visual, `visual ${visualId} not found on profile`).toBeDefined();
  return visual as StoredVisual;
};

beforeAll(async () => {
  // The factory fills TestUserManager.users, so it runs before any user
  // lookup. Its space is the BANNER source.
  baseScenario = await TestScenarioFactory.createBaseScenario({
    name: 'visual-uri-rule',
    space: {},
  });

  qaProfileId = TestUserManager.users.qaUser.profileId;
  const avatar = (await readVisuals(qaProfileId, TestUser.QA_USER)).find(
    v => v.name === 'AVATAR'
  );
  avatarId = avatar?.id ?? '';
  expect(avatarId, 'QA user has no AVATAR visual').not.toEqual('');

  // A fresh upload, never the registration-time picture: the accepted address
  // is whatever the platform's storage produces on this stack.
  const upload = await uploadImageOnVisual(
    createPngFixture({ width: 200, height: 200 }),
    avatarId,
    TestUser.QA_USER
  );
  expect(upload.errors, JSON.stringify(upload.errors)).toBeUndefined();
  uploadedUri = upload.data?.uploadImageOnVisual?.uri ?? '';
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

    const res = await updateVisualUri(
      avatarId,
      uri,
      'refused',
      TestUser.QA_USER
    );

    expect(
      res.body.errors?.[0]?.extensions?.code,
      JSON.stringify(res.body)
    ).toBe(REFUSED);
    expect(res.body.data).toBeNull();
    const stored = await readVisual(qaProfileId, avatarId, TestUser.QA_USER);
    expect(stored.uri).toBe(uploadedUri);
  });
});

describe('updateVisual address rule — accepted addresses', () => {
  test('US2-AS2 — the uploaded storage address is accepted with a new alternative text', async () => {
    const altText = `avatar-alt-${UniqueIDGenerator.getID()}`;

    const res = await updateVisualUri(
      avatarId,
      uploadedUri,
      altText,
      TestUser.QA_USER
    );

    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    const stored = await readVisual(qaProfileId, avatarId, TestUser.QA_USER);
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

    expect(
      res.body.errors?.[0]?.extensions?.code,
      JSON.stringify(res.body)
    ).toBe(REFUSED);
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

    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
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

    const code = res.body.errors?.[0]?.extensions?.code;
    expect(code, JSON.stringify(res.body)).not.toBe(REFUSED);
    // The code updateVisual's UPDATE check (grantAccessOrFail) throws today;
    // the same check's refusal is pinned as FORBIDDEN_POLICY by the
    // subspace sorting/pinning and sidebar-positional suites.
    expect(code).toBe('FORBIDDEN_POLICY');
    const stored = await readVisual(qaProfileId, avatarId, TestUser.QA_USER);
    expect(stored.uri).toBe(uploadedUri);
  });
});
