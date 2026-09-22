/**
 * Functional API specs pinning the contributor-card-enrichment contract
 * (workspace feature 077-richer-contributor-cards): the five additive
 * `ContributorCollectionItem` fields — `tagline`, `tags`, `joinedDate`,
 * `website`, `associatesCount` — as delivered by `contributors(type)` on a
 * CONTRIBUTORS callout.
 *
 * API-only, no SQL: irregular association rows and backdated membership rows
 * are proven live (`gql-live` probes 4 and 6), never here. This suite fixes
 * the *shape* of clean-data behaviour so a schema/behaviour regression fails
 * fast in the wave-2 verification track, before a live walk ever runs.
 *
 * Execution: pnpm --filter @alkemio/test-suite-server-api exec vitest run
 *   src/functional-api/callout/contributors-collection
 */

import {
  TestScenarioConfig,
  TestScenarioFactory,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  assignRoleToUser,
  assignRoleToVirtualContributor,
} from '@alkemio/tests-lib/scenario/baseFunctions';

import {
  createUserDataOrFail,
  deleteUser,
  getUserData,
  CreatedUserData,
} from '../../contributor-management/user/user.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../../contributor-management/organization/organization.request.params';
import { assignRoleToOrganization } from '../../roleset/roles-request.params';

import {
  createContributorCardsCallout,
  getContributorCards,
  getOrganizationAssociatesMetric,
  setUserTaglineAndTags,
} from './contributor-cards.request.params';

type ContributorCardItem = {
  id: string;
  type: string;
  displayName: string;
  roleLabel?: string | null;
  tagline: string | null;
  tags: string[] | null;
  joinedDate: string | null;
  website: string | null;
  associatesCount: number | null;
};

const uniqueId = UniqueIDGenerator.getID();

const scenarioConfig: TestScenarioConfig = {
  name: `contributor-cards-${uniqueId}`,
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
  },
  virtualContributors: {
    useBaseOrganization: true,
    virtualContributors: [
      { profileDisplayName: `contributor-cards-vc-${uniqueId}` },
    ],
  },
};

let baseScenario: OrganizationWithSpaceModel;
let calloutID = '';
// The UTC-month window a fresh member-role assignment made during this suite
// can land in — captured before any role is assigned, read again at
// assertion time, so a run that straddles a month boundary still passes
// (mirrors the contract's "accept the month of beforeAll start OR end").
let beforeAllStart: Date;

let userWithTags: CreatedUserData;
let userWithoutTags: CreatedUserData;

const SKILLS = ['Urban Planning', 'Sustainability', 'Facilitation'];
const KEYWORDS_FALLBACK = ['Policy', 'Energy'];
const TAGLINE = 'Building inclusive, well-run civic spaces.';

const ORG_VALID = 'valid';
const ORG_BARE = 'bare';
const ORG_HOSTILE = 'hostile';
const ORG_SCHEMELESS = 'schemeless';
const ORG_SPACEY = 'spacey';

const orgWebsites: Record<string, string | undefined> = {
  [ORG_VALID]: 'https://example.org',
  [ORG_BARE]: undefined,
  [ORG_HOSTILE]: 'javascript:alert(1)',
  [ORG_SCHEMELESS]: 'www.example.org',
  [ORG_SPACEY]: '  HTTPS://Spacey.example/about  ',
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const orgs: Record<string, any> = {};

const associateUserIds: string[] = [];
const ASSOCIATE_COUNT = 3;

const monthStartUtcIso = (d: Date): string =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();

const cardsByType = async (
  type: 'USER' | 'ORGANIZATION' | 'VIRTUAL_CONTRIBUTOR'
): Promise<ContributorCardItem[]> => {
  const res = await getContributorCards(calloutID, type);
  expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
  return res.body.data?.lookup?.callout?.framing?.contributors ?? [];
};

beforeAll(async () => {
  beforeAllStart = new Date();
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  const calloutsSetID = baseScenario.space.collaboration.calloutsSetId;
  const spaceRoleSetID = baseScenario.space.community.roleSetId;

  const calloutRes = await createContributorCardsCallout(
    calloutsSetID,
    `contributor-cards-${uniqueId}`,
    ['USER', 'ORGANIZATION', 'VIRTUAL_CONTRIBUTOR']
  );
  expect(
    calloutRes.body.errors,
    JSON.stringify(calloutRes.body.errors)
  ).toBeUndefined();
  calloutID = calloutRes.body.data.createCalloutOnCalloutsSet.id;

  // ---- Users ---------------------------------------------------------
  userWithTags = await createUserDataOrFail({
    nameID: `cc-user-tags-${uniqueId}`,
    email: `cc-user-tags-${uniqueId}@alkem.io`,
    profileData: { displayName: `CC User With Tags ${uniqueId}` },
  });
  userWithoutTags = await createUserDataOrFail({
    nameID: `cc-user-notags-${uniqueId}`,
    email: `cc-user-notags-${uniqueId}@alkem.io`,
    profileData: { displayName: `CC User Without Tags ${uniqueId}` },
  });

  await assignRoleToUser(userWithTags.id, spaceRoleSetID, RoleName.Member);
  await assignRoleToUser(userWithoutTags.id, spaceRoleSetID, RoleName.Member);

  const withTagsProfile = await getUserData(userWithTags.id);
  const withoutTagsProfile = await getUserData(userWithoutTags.id);
  await setUserTaglineAndTags(
    userWithTags.id,
    withTagsProfile.data?.user?.profile?.tagsets ?? [],
    { tagline: TAGLINE, skills: SKILLS, keywords: ['unused-keyword'] }
  );
  await setUserTaglineAndTags(
    userWithoutTags.id,
    withoutTagsProfile.data?.user?.profile?.tagsets ?? [],
    { tagline: '', skills: [], keywords: KEYWORDS_FALLBACK }
  );

  // ---- Organizations ---------------------------------------------------
  for (const key of [
    ORG_VALID,
    ORG_BARE,
    ORG_HOSTILE,
    ORG_SCHEMELESS,
    ORG_SPACEY,
  ]) {
    const website = orgWebsites[key];
    const res = await createOrganization(
      `cc-org-${key}-${uniqueId}`,
      `cc-org-${key}-${uniqueId}`.toLowerCase().slice(0, 24),
      undefined,
      undefined,
      website
    );
    if (res.error || !res.data?.createOrganization) {
      throw new Error(
        `Unable to create fixture organization '${key}': ${JSON.stringify(res.error)}`
      );
    }
    orgs[key] = res.data.createOrganization;
    await assignRoleToOrganization(
      orgs[key].id,
      spaceRoleSetID,
      RoleName.Member
    );
  }

  // Three throwaway associate users on the first organization (ruling R4 /
  // contract §2's associates parity) — platform-wide, unrelated to space
  // membership.
  for (let i = 0; i < ASSOCIATE_COUNT; i++) {
    const associate = await createUserDataOrFail({
      nameID: `cc-associate-${i}-${uniqueId}`,
      email: `cc-associate-${i}-${uniqueId}@alkem.io`,
      profileData: { displayName: `CC Associate ${i} ${uniqueId}` },
    });
    associateUserIds.push(associate.id);
    await assignRoleToUser(
      associate.id,
      orgs[ORG_VALID].roleSet.id,
      RoleName.Associate
    );
  }

  // ---- Virtual Contributor ---------------------------------------------
  const vcId = baseScenario.virtualContributors?.[0]?.id;
  if (!vcId) {
    throw new Error('Scenario did not create the fixture virtual contributor');
  }
  await assignRoleToVirtualContributor(vcId, spaceRoleSetID, RoleName.Member);
}, 120_000);

afterAll(async () => {
  for (const key of [
    ORG_VALID,
    ORG_BARE,
    ORG_HOSTILE,
    ORG_SCHEMELESS,
    ORG_SPACEY,
  ]) {
    if (orgs[key]?.id) {
      await deleteOrganization(orgs[key].id).catch(() => undefined);
    }
  }
  for (const id of associateUserIds) {
    await deleteUser(id).catch(() => undefined);
  }
  if (userWithTags?.id) {
    await deleteUser(userWithTags.id).catch(() => undefined);
  }
  if (userWithoutTags?.id) {
    await deleteUser(userWithoutTags.id).catch(() => undefined);
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
}, 120_000);

// ===========================================================================
// US1 / US5 — card content: null matrix, tags rule, website rule
// ===========================================================================

describe('Contributor card enrichment — content', () => {
  test('US1 — null matrix: USER has no website/associatesCount, ORGANIZATION has no joinedDate and a numeric associatesCount, VIRTUAL_CONTRIBUTOR has all three null', async () => {
    const users = await cardsByType('USER');
    const organizations = await cardsByType('ORGANIZATION');
    const vcs = await cardsByType('VIRTUAL_CONTRIBUTOR');

    expect(users.length).toBeGreaterThanOrEqual(2);
    for (const item of users) {
      expect(item.website).toBeNull();
      expect(item.associatesCount).toBeNull();
    }

    expect(organizations.length).toBe(5);
    for (const item of organizations) {
      expect(item.joinedDate).toBeNull();
      expect(typeof item.associatesCount).toBe('number');
    }

    expect(vcs.length).toBeGreaterThanOrEqual(1);
    for (const item of vcs) {
      expect(item.joinedDate).toBeNull();
      expect(item.website).toBeNull();
      expect(item.associatesCount).toBeNull();
    }
  });

  test('US1 — tags rule: skills win over keywords and are returned in full; empty skills fall back to keywords; no tags on the VC ⇒ []; tagline trims to null when empty', async () => {
    const users = await cardsByType('USER');
    const withTagsItem = users.find(u => u.id === userWithTags.id);
    const withoutTagsItem = users.find(u => u.id === userWithoutTags.id);
    expect(withTagsItem).toBeDefined();
    expect(withoutTagsItem).toBeDefined();

    // Skills win, full list, stored order — never clamped (ruling R9).
    expect(withTagsItem!.tags).toEqual(SKILLS);
    expect(withTagsItem!.tagline).toBe(TAGLINE);

    // Empty skills ⇒ keywords.
    expect(withoutTagsItem!.tags).toEqual(KEYWORDS_FALLBACK);
    expect(withoutTagsItem!.tagline).toBeNull();

    const vcs = await cardsByType('VIRTUAL_CONTRIBUTOR');
    const vc = vcs.find(v => v.id === baseScenario.virtualContributors?.[0]?.id);
    expect(vc).toBeDefined();
    expect(vc!.tags).toEqual([]);
    expect(vc!.tagline).toBeNull();
  });

  test('US5 — website rule: valid absolute URL passes through, spaced/upper-case is trimmed, empty/hostile/schemeless all normalise to null', async () => {
    const organizations = await cardsByType('ORGANIZATION');
    const byId = (key: string) =>
      organizations.find(o => o.id === orgs[key].id);

    expect(byId(ORG_VALID)!.website).toBe('https://example.org');
    expect(byId(ORG_SPACEY)!.website).toBe('HTTPS://Spacey.example/about');
    expect(byId(ORG_BARE)!.website).toBeNull();
    expect(byId(ORG_HOSTILE)!.website).toBeNull();
    expect(byId(ORG_SCHEMELESS)!.website).toBeNull();
  });
});

// ===========================================================================
// US4 — join month (users only, month precision, UTC)
// ===========================================================================

describe('Contributor card enrichment — join month', () => {
  test('US4 — every USER item carries a month-precision UTC joinedDate, matching the month the member role was assigned in', async () => {
    const users = await cardsByType('USER');
    const monthRegex = /^\d{4}-\d{2}-01T00:00:00\.000Z$/;
    const acceptableMonths = [
      monthStartUtcIso(beforeAllStart),
      monthStartUtcIso(new Date()),
    ];

    const withTagsItem = users.find(u => u.id === userWithTags.id);
    const withoutTagsItem = users.find(u => u.id === userWithoutTags.id);
    expect(withTagsItem).toBeDefined();
    expect(withoutTagsItem).toBeDefined();

    for (const item of [withTagsItem!, withoutTagsItem!]) {
      expect(item.joinedDate).toMatch(monthRegex);
      expect(acceptableMonths).toContain(item.joinedDate);
    }
  });
});

// ===========================================================================
// US1 — associates parity (ruling R4)
// ===========================================================================

describe('Contributor card enrichment — associates parity', () => {
  test('US1 — associatesCount equals the organization profile associates metric for every fixture organization, including one at N > 0 and one at 0', async () => {
    const organizations = await cardsByType('ORGANIZATION');
    const byId = (key: string) =>
      organizations.find(o => o.id === orgs[key].id)!;

    for (const key of [
      ORG_VALID,
      ORG_BARE,
      ORG_HOSTILE,
      ORG_SCHEMELESS,
      ORG_SPACEY,
    ]) {
      const metricRes = await getOrganizationAssociatesMetric(orgs[key].id);
      expect(
        metricRes.body.errors,
        JSON.stringify(metricRes.body.errors)
      ).toBeUndefined();
      const metrics = metricRes.body.data?.organization?.metrics ?? [];
      const associatesMetric = metrics.find(
        (m: { name: string; value: string }) => m.name === 'associates'
      );
      const expected = associatesMetric ? Number(associatesMetric.value) : 0;
      expect(byId(key).associatesCount).toBe(expected);
    }

    expect(byId(ORG_VALID).associatesCount).toBe(ASSOCIATE_COUNT);
    expect(byId(ORG_BARE).associatesCount).toBe(0);
  });
});
