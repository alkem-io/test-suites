/**
 * Who receives the enriched contributor cards (workspace feature
 * 077-richer-contributor-cards, client-web#10316) — FR-032 / SC-009 /
 * US2-AS2, pinned at API level.
 *
 * FR-032: "The new values are subject to exactly the visibility rules the card
 * list already has — … under 'members only' visibility, non-members and
 * anonymous visitors receive no People cards at all." Organizations and
 * virtual contributors stay visible and enriched (US2-AS2; feature 008
 * US4-AS2). A PRIVATE space keeps its existing read rule: outsiders cannot
 * read the callout at all.
 *
 * Viewers: anonymous (no bearer), a signed-in non-member (`non.space`) and a
 * member (`space.member`). The space's settings are switched between cases;
 * each case asserts the member's view as the positive control for the
 * outsiders' empty People list.
 */

import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  assignRoleToOrganization,
  assignRoleToUser,
  assignRoleToVirtualContributor,
  createOrganization,
  deleteOrganization,
} from '@alkemio/tests-lib/scenario/baseFunctions';

import {
  createUserDataOrFail,
  deleteUser,
} from '../../contributor-management/user/user.request.params';
import { getTokenForTestUser } from '../../graphql-guard/me-degradation.request.params';
import {
  ContributorCardActorType,
  createContributorCardsCallout,
  getContributorCardsAs,
  setOrganizationProfileOrFail,
  setSpacePrivacyOrFail,
  setUserProfileOrFail,
  setVirtualContributorProfileOrFail,
} from './contributor-cards.request.params';

const uniqueId = UniqueIDGenerator.getID();

const scenarioConfig: TestScenarioConfig = {
  name: `contributor-cards-visibility-${uniqueId}`,
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER],
    },
  },
  virtualContributors: {
    useBaseOrganization: true,
    virtualContributors: [
      { profileDisplayName: `contributor-cards-visibility-vc-${uniqueId}` },
    ],
  },
};

const USER_TAGLINE = 'A member with a public tagline.';
const ORG_TAGLINE = 'An organization with a tagline.';
const VC_TAGLINE = 'A virtual contributor with a tagline.';

let baseScenario: OrganizationWithSpaceModel;
let calloutID = '';
let memberUserId = '';
let organizationId = '';
let vcId = '';

type Viewer = { name: string; token: () => string | undefined };
const ANONYMOUS: Viewer = { name: 'anonymous', token: () => undefined };
const NON_MEMBER: Viewer = {
  name: 'signed-in non-member',
  token: () => getTokenForTestUser(TestUser.NON_SPACE_MEMBER),
};
const MEMBER: Viewer = {
  name: 'member',
  token: () => getTokenForTestUser(TestUser.SPACE_MEMBER),
};

const read = async (viewer: Viewer, type: ContributorCardActorType) =>
  getContributorCardsAs(calloutID, type, viewer.token());

/** The card list and counts, failing the test on any GraphQL error. */
const readOk = async (viewer: Viewer, type: ContributorCardActorType) => {
  const res = await read(viewer, type);
  expect(res.body.errors, `${viewer.name}: ${res.raw}`).toBeUndefined();
  return res.body.data!.lookup.callout.framing;
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  const roleSetId = baseScenario.space.community.roleSetId;

  const calloutRes = await createContributorCardsCallout(
    baseScenario.space.collaboration.calloutsSetId,
    `contributor-cards-visibility-${uniqueId}`
  );
  expect(
    calloutRes.body.errors,
    JSON.stringify(calloutRes.body.errors)
  ).toBeUndefined();
  calloutID = calloutRes.body.data.createCalloutOnCalloutsSet.id;

  memberUserId = (
    await createUserDataOrFail({
      nameID: `ccv-member-${uniqueId}`,
      email: `ccv-member-${uniqueId}@alkem.io`,
      profileData: { displayName: `CCV Member ${uniqueId}` },
    })
  ).id;
  const assigned = await assignRoleToUser(
    memberUserId,
    roleSetId,
    RoleName.Member
  );
  expect(assigned.error, JSON.stringify(assigned.error)).toBeUndefined();
  await setUserProfileOrFail(memberUserId, {
    tagline: USER_TAGLINE,
    tags: { skills: ['Facilitation'] },
  });

  const org = await createOrganization(
    `ccv-org-${uniqueId}`,
    `ccv-org-${uniqueId}`.slice(0, 24),
    undefined,
    undefined,
    'https://visibility.example'
  );
  if (org.error || !org.data?.createOrganization) {
    throw new Error(
      `Unable to create the fixture organization: ${JSON.stringify(org.error)}`
    );
  }
  organizationId = org.data.createOrganization.id;
  await assignRoleToOrganization(organizationId, roleSetId, RoleName.Member);
  await setOrganizationProfileOrFail(organizationId, {
    tagline: ORG_TAGLINE,
    tags: { keywords: ['Grid'] },
  });

  vcId = baseScenario.virtualContributors![0].id;
  const vcAssigned = await assignRoleToVirtualContributor(
    vcId,
    roleSetId,
    RoleName.Member
  );
  expect(vcAssigned.error, JSON.stringify(vcAssigned.error)).toBeUndefined();
  await setVirtualContributorProfileOrFail(vcId, {
    tagline: VC_TAGLINE,
    tags: { keywords: ['Assistant'] },
  });
}, 300_000);

afterAll(async () => {
  const failures: string[] = [];
  const org = await deleteOrganization(organizationId);
  if (org.error)
    failures.push(`delete organization: ${JSON.stringify(org.error)}`);
  const user = await deleteUser(memberUserId);
  if (user.error) failures.push(`delete user: ${JSON.stringify(user.error)}`);
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  expect(failures, failures.join('\n')).toEqual([]);
}, 300_000);

describe('FR-032 — PUBLIC space, user information "members only"', () => {
  beforeAll(async () => {
    await setSpacePrivacyOrFail(baseScenario.space.id, {
      mode: 'PUBLIC',
      userInformationVisibility: 'MEMBERS_ONLY',
    });
  });

  test('US2-AS2 — a member sees People as normal, enriched (positive control)', async () => {
    const view = await readOk(MEMBER, 'USER');
    const card = view.contributors.find(c => c.id === memberUserId);
    expect(card?.tagline).toBe(USER_TAGLINE);
    expect(card?.tags).toEqual(['Facilitation']);
    expect(card?.joinedDate).toMatch(/^\d{4}-\d{2}-01T00:00:00\.000Z$/);
    expect(view.contributorCounts.users).toBe(view.contributors.length);
  });

  for (const viewer of [ANONYMOUS, NON_MEMBER]) {
    test(`SC-009 — ${viewer.name}: zero People cards and a People count of 0`, async () => {
      const view = await readOk(viewer, 'USER');
      expect(view.contributors).toEqual([]);
      expect(view.contributorCounts.users).toBe(0);
    });

    test(`US2-AS2 — ${viewer.name}: Organizations and Virtual Contributors stay visible and enriched`, async () => {
      const organizations = await readOk(viewer, 'ORGANIZATION');
      const org = organizations.contributors.find(c => c.id === organizationId);
      expect(org?.tagline).toBe(ORG_TAGLINE);
      expect(org?.tags).toEqual(['Grid']);
      expect(org?.website).toBe('https://visibility.example');
      expect(typeof org?.associatesCount).toBe('number');

      const vcs = await readOk(viewer, 'VIRTUAL_CONTRIBUTOR');
      const vc = vcs.contributors.find(c => c.id === vcId);
      expect(vc?.tagline).toBe(VC_TAGLINE);
      expect(vc?.tags).toEqual(['Assistant']);
    });
  }
});

describe('FR-032 — PUBLIC space, user information follows space visibility', () => {
  beforeAll(async () => {
    await setSpacePrivacyOrFail(baseScenario.space.id, {
      mode: 'PUBLIC',
      userInformationVisibility: 'FOLLOW_SPACE_VISIBILITY',
    });
  });

  for (const viewer of [ANONYMOUS, NON_MEMBER]) {
    test(`Edge case "Anonymous visitors of a public space" — ${viewer.name} sees the member's enriched card`, async () => {
      const view = await readOk(viewer, 'USER');
      const card = view.contributors.find(c => c.id === memberUserId);
      expect(card?.tagline).toBe(USER_TAGLINE);
      expect(card?.joinedDate).toMatch(/^\d{4}-\d{2}-01T00:00:00\.000Z$/);
      expect(view.contributorCounts.users).toBe(view.contributors.length);
    });
  }
});

describe('FR-032 — PRIVATE space keeps its existing read rule', () => {
  beforeAll(async () => {
    await setSpacePrivacyOrFail(baseScenario.space.id, {
      mode: 'PRIVATE',
      userInformationVisibility: 'FOLLOW_SPACE_VISIBILITY',
    });
  });

  test('a member still reads every segment (positive control)', async () => {
    for (const type of [
      'USER',
      'ORGANIZATION',
      'VIRTUAL_CONTRIBUTOR',
    ] as const) {
      const view = await readOk(MEMBER, type);
      expect(view.contributors.length, type).toBeGreaterThan(0);
    }
  });

  for (const viewer of [ANONYMOUS, NON_MEMBER]) {
    test(`${viewer.name} is denied the callout with FORBIDDEN_POLICY for every segment`, async () => {
      for (const type of [
        'USER',
        'ORGANIZATION',
        'VIRTUAL_CONTRIBUTOR',
      ] as const) {
        const res = await read(viewer, type);
        const codes = (res.body.errors ?? []).map(
          (e: { extensions?: { code?: string } }) => e.extensions?.code
        );
        expect(codes, `${type}: ${res.raw}`).toContain('FORBIDDEN_POLICY');
        expect(res.body.data?.lookup?.callout ?? null).toBeNull();
      }
    });
  }
});
