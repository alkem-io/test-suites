/**
 * Functional API specs pinning the contributor-card-enrichment contract
 * (workspace feature 077-richer-contributor-cards, client-web#10316): the five
 * additive `ContributorCollectionItem` fields — `tagline`, `tags`,
 * `joinedDate`, `website`, `associatesCount` — as delivered by
 * `contributors(type)` on a CONTRIBUTORS callout.
 *
 * Oracles come from the amended spec (FR-004, 2026-09-28: tag lists MERGED in
 * preference order, duplicates compared ignoring case keep the first
 * occurrence, blank tags dropped) and from contract
 * `graphql-contributor-card-enrichment` §2. Visibility (FR-032) lives in
 * `contributor-cards-visibility.it-spec.ts`.
 *
 * API only, no SQL: backdated or duplicated membership rows and irregular
 * association rows cannot be built from this repo (see the area test plan's
 * Not covered table).
 */

import {
  TestScenarioConfig,
  TestScenarioFactory,
  UniqueIDGenerator,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  assignRoleToOrganization,
  assignRoleToUser,
  assignRoleToVirtualContributor,
  createOrganization,
  deleteOrganization,
  removeRoleFromUser,
} from '@alkemio/tests-lib/scenario/baseFunctions';

import {
  createUserDataOrFail,
  deleteUser,
} from '../../contributor-management/user/user.request.params';

import {
  ContributorCard,
  ContributorCardActorType,
  createContributorCardsCallout,
  getContributorCards,
  getOrganizationAssociatesMetric,
  setOrganizationProfileOrFail,
  setUserProfileOrFail,
  setVirtualContributorProfileOrFail,
} from './contributor-cards.request.params';

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
      { profileDisplayName: `contributor-cards-helper-vc-${uniqueId}` },
      { profileDisplayName: `contributor-cards-quiet-vc-${uniqueId}` },
    ],
  },
};

// ---- Fixture profiles and the oracle each one implies ---------------------

/** Skills then keywords, merged; 'sustainability' and 'URBAN PLANNING' are
 * case-duplicates of skills (first spelling wins); ' ' and '' are blanks. */
const MERGED_SKILLS = ['Urban Planning', 'Sustainability', 'Facilitation'];
const MERGED_KEYWORDS = [
  'sustainability',
  ' ',
  '',
  'Mobility',
  'URBAN PLANNING',
  'Water',
];
const MERGED_EXPECTED = [
  'Urban Planning',
  'Sustainability',
  'Facilitation',
  'Mobility',
  'Water',
];
const TAGLINE = 'Building inclusive, well-run civic spaces.';

const KEYWORDS_ONLY = ['Policy', 'Energy'];

/** Organizations and VCs: keywords then capabilities, merged. */
const ORG_KEYWORDS = ['Renewable Energy', 'Grid'];
const ORG_CAPABILITIES = ['grid', 'Funding'];
const ORG_EXPECTED = ['Renewable Energy', 'Grid', 'Funding'];
const CAPABILITIES_ONLY = ['Funding'];
const VC_KEYWORDS = ['Assistant', 'research'];
const VC_CAPABILITIES = ['Research', 'Summaries'];
const VC_EXPECTED = ['Assistant', 'research', 'Summaries'];
const VC_TAGLINE = 'Answers questions about this space.';

const ORG_VALID = 'valid';
const ORG_BARE = 'bare';
const ORG_HOSTILE = 'hostile';
const ORG_SCHEMELESS = 'schemeless';
const ORG_SPACEY = 'spacey';
const ORG_KEYS = [
  ORG_VALID,
  ORG_BARE,
  ORG_HOSTILE,
  ORG_SCHEMELESS,
  ORG_SPACEY,
] as const;
type OrgKey = (typeof ORG_KEYS)[number];

const orgWebsites: Record<OrgKey, string | undefined> = {
  [ORG_VALID]: 'https://example.org',
  [ORG_BARE]: undefined,
  [ORG_HOSTILE]: 'javascript:alert(1)',
  [ORG_SCHEMELESS]: 'www.example.org',
  [ORG_SPACEY]: '  HTTPS://Spacey.example/about  ',
};

/** Associates added to ORG_VALID on top of its creator. */
const ASSOCIATE_COUNT = 3;

let baseScenario: OrganizationWithSpaceModel;
let calloutID = '';
const users = { merged: '', keywordsOnly: '', empty: '' };
const orgs = {} as Record<OrgKey, { id: string; roleSetId: string }>;
const associateUserIds: string[] = [];
/** ORG_VALID's `associates` metric right after creation (the creating admin
 * is auto-associated, so this is 1 on a correct server, not 0). */
let validAssociatesBaseline = 0;
/** The UTC wall-clock window in which the member roles were assigned — an
 * oracle independent of the server's own `joinedDate`. */
let memberAssignedFrom: Date;
let memberAssignedTo: Date;

const monthStartUtcIso = (d: Date): string =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();

const cardsByType = async (
  type: ContributorCardActorType
): Promise<ContributorCard[]> => {
  const res = await getContributorCards(calloutID, type);
  expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
  return res.body.data.lookup.callout.framing.contributors;
};

const cardFor = (cards: ContributorCard[], id: string): ContributorCard => {
  const card = cards.find(c => c.id === id);
  expect(card, `no card for ${id}`).toBeDefined();
  return card!;
};

const associatesMetric = async (organizationId: string): Promise<number> => {
  const res = await getOrganizationAssociatesMetric(organizationId);
  expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
  const metric = (
    res.body.data.organization.metrics as { name: string; value: string }[]
  ).find(m => m.name === 'associates');
  expect(metric, 'organization has no associates metric').toBeDefined();
  return Number(metric!.value);
};

const createUserOrFail = async (key: string) =>
  (
    await createUserDataOrFail({
      nameID: `cc-${key}-${uniqueId}`,
      email: `cc-${key}-${uniqueId}@alkem.io`,
      profileData: { displayName: `CC ${key} ${uniqueId}` },
    })
  ).id;

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  const spaceRoleSetID = baseScenario.space.community.roleSetId;

  const calloutRes = await createContributorCardsCallout(
    baseScenario.space.collaboration.calloutsSetId,
    `contributor-cards-${uniqueId}`,
    ['USER', 'ORGANIZATION', 'VIRTUAL_CONTRIBUTOR']
  );
  expect(
    calloutRes.body.errors,
    JSON.stringify(calloutRes.body.errors)
  ).toBeUndefined();
  calloutID = calloutRes.body.data.createCalloutOnCalloutsSet.id;

  // ---- Users -----------------------------------------------------------
  users.merged = await createUserOrFail('merged');
  users.keywordsOnly = await createUserOrFail('keywords-only');
  users.empty = await createUserOrFail('empty');
  memberAssignedFrom = new Date();
  for (const id of Object.values(users)) {
    const res = await assignRoleToUser(id, spaceRoleSetID, RoleName.Member);
    expect(res.error, JSON.stringify(res.error)).toBeUndefined();
  }
  memberAssignedTo = new Date();
  await setUserProfileOrFail(users.merged, {
    tagline: `  ${TAGLINE}  `,
    tags: { skills: MERGED_SKILLS, keywords: MERGED_KEYWORDS },
  });
  await setUserProfileOrFail(users.keywordsOnly, {
    tagline: '   ',
    tags: { skills: [], keywords: KEYWORDS_ONLY },
  });

  // ---- Organizations -------------------------------------------------------
  for (const key of ORG_KEYS) {
    const res = await createOrganization(
      `cc-org-${key}-${uniqueId}`,
      `cc-org-${key}-${uniqueId}`.toLowerCase().slice(0, 24),
      undefined,
      undefined,
      orgWebsites[key]
    );
    if (res.error || !res.data?.createOrganization) {
      throw new Error(
        `Unable to create fixture organization '${key}': ${JSON.stringify(res.error)}`
      );
    }
    orgs[key] = {
      id: res.data.createOrganization.id,
      roleSetId: res.data.createOrganization.roleSet.id,
    };
    await assignRoleToOrganization(
      orgs[key].id,
      spaceRoleSetID,
      RoleName.Member
    );
  }
  await setOrganizationProfileOrFail(orgs[ORG_VALID].id, {
    tags: { keywords: ORG_KEYWORDS, capabilities: ORG_CAPABILITIES },
  });
  await setOrganizationProfileOrFail(orgs[ORG_HOSTILE].id, {
    tags: { keywords: [], capabilities: CAPABILITIES_ONLY },
  });

  // ORG_BARE at a real zero: drop the creating admin's automatic ASSOCIATE.
  const removed = await removeRoleFromUser(
    TestUserManager.users.globalAdmin.id,
    orgs[ORG_BARE].roleSetId,
    RoleName.Associate
  );
  expect(removed.error, JSON.stringify(removed.error)).toBeUndefined();

  // ORG_VALID at N: three throwaway associates on top of its creator.
  validAssociatesBaseline = await associatesMetric(orgs[ORG_VALID].id);
  for (let i = 0; i < ASSOCIATE_COUNT; i++) {
    const id = await createUserOrFail(`associate-${i}`);
    associateUserIds.push(id);
    const res = await assignRoleToUser(
      id,
      orgs[ORG_VALID].roleSetId,
      RoleName.Associate
    );
    expect(res.error, JSON.stringify(res.error)).toBeUndefined();
  }

  // ---- Virtual Contributors -----------------------------------------------
  const [helperVc, quietVc] = baseScenario.virtualContributors ?? [];
  if (!helperVc || !quietVc) {
    throw new Error(
      'Scenario did not create the two fixture virtual contributors'
    );
  }
  for (const vc of [helperVc, quietVc]) {
    const res = await assignRoleToVirtualContributor(
      vc.id,
      spaceRoleSetID,
      RoleName.Member
    );
    expect(res.error, JSON.stringify(res.error)).toBeUndefined();
  }
  await setVirtualContributorProfileOrFail(helperVc.id, {
    tagline: VC_TAGLINE,
    tags: { keywords: VC_KEYWORDS, capabilities: VC_CAPABILITIES },
  });
}, 300_000);

afterAll(async () => {
  // Every deletion is attempted; any failure is reported, never swallowed.
  const failures: string[] = [];
  const attempt = async (
    label: string,
    run: () => Promise<{ error?: unknown }>
  ) => {
    try {
      const res = await run();
      if (res?.error) failures.push(`${label}: ${JSON.stringify(res.error)}`);
    } catch (e) {
      failures.push(`${label}: ${String(e)}`);
    }
  };
  for (const key of ORG_KEYS) {
    if (orgs[key]?.id) {
      await attempt(`delete org ${key}`, () =>
        deleteOrganization(orgs[key].id)
      );
    }
  }
  for (const id of [...associateUserIds, ...Object.values(users)]) {
    if (id) await attempt(`delete user ${id}`, () => deleteUser(id));
  }
  // `beforeAll` can fail before the scenario exists; a teardown error on an
  // undefined scenario would hide the real setup error.
  if (baseScenario) {
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  }
  expect(failures, failures.join('\n')).toEqual([]);
}, 300_000);

// ===========================================================================
// FR-027/FR-028 — which fields apply to which contributor type
// ===========================================================================

describe('Contributor card enrichment — null matrix', () => {
  test('FR-028 — USER has no website/associatesCount, ORGANIZATION has no joinedDate and a numeric associatesCount, VIRTUAL_CONTRIBUTOR has all three null', async () => {
    const users = await cardsByType('USER');
    const organizations = await cardsByType('ORGANIZATION');
    const vcs = await cardsByType('VIRTUAL_CONTRIBUTOR');

    expect(users.length).toBeGreaterThanOrEqual(3);
    for (const item of users) {
      expect(item.website).toBeNull();
      expect(item.associatesCount).toBeNull();
    }
    expect(
      organizations.filter(o => ORG_KEYS.some(k => orgs[k].id === o.id))
    ).toHaveLength(ORG_KEYS.length);
    for (const item of organizations) {
      expect(item.joinedDate).toBeNull();
      expect(typeof item.associatesCount).toBe('number');
    }
    expect(vcs.length).toBeGreaterThanOrEqual(2);
    for (const item of vcs) {
      expect(item.joinedDate).toBeNull();
      expect(item.website).toBeNull();
      expect(item.associatesCount).toBeNull();
    }
  });
});

// ===========================================================================
// FR-001/FR-002/FR-004/FR-005 — tagline and the merged tag list
// ===========================================================================

describe('Contributor card enrichment — tagline and tags (FR-004 as amended 2026-09-28)', () => {
  test('US1-AS3 — a user gets skills then keywords merged, case-duplicates kept once with the first spelling, blank tags dropped, no cap', async () => {
    const card = cardFor(await cardsByType('USER'), users.merged);
    expect(card.tags).toEqual(MERGED_EXPECTED);
  });

  test('US1-AS3 — a user with no skills gets the keywords', async () => {
    const card = cardFor(await cardsByType('USER'), users.keywordsOnly);
    expect(card.tags).toEqual(KEYWORDS_ONLY);
  });

  test('D-EMPTY — a user with no tags gets an empty list, not null', async () => {
    const card = cardFor(await cardsByType('USER'), users.empty);
    expect(card.tags).toEqual([]);
  });

  test('FR-001 — the tagline is trimmed; a whitespace-only or absent tagline is null', async () => {
    const userCards = await cardsByType('USER');
    expect(cardFor(userCards, users.merged).tagline).toBe(TAGLINE);
    expect(cardFor(userCards, users.keywordsOnly).tagline).toBeNull();
    expect(cardFor(userCards, users.empty).tagline).toBeNull();
  });

  test('US1-AS3 — an organization gets keywords then capabilities merged and deduplicated; capabilities alone are used when keywords are empty; none ⇒ []', async () => {
    const organizations = await cardsByType('ORGANIZATION');
    expect(cardFor(organizations, orgs[ORG_VALID].id).tags).toEqual(
      ORG_EXPECTED
    );
    expect(cardFor(organizations, orgs[ORG_HOSTILE].id).tags).toEqual(
      CAPABILITIES_ONLY
    );
    expect(cardFor(organizations, orgs[ORG_BARE].id).tags).toEqual([]);
  });

  test('US1-AS5 — a virtual contributor gets its tagline and keywords then capabilities merged (first spelling wins); an empty VC gets null and []', async () => {
    const [helperVc, quietVc] = baseScenario.virtualContributors!;
    const vcs = await cardsByType('VIRTUAL_CONTRIBUTOR');
    const helper = cardFor(vcs, helperVc.id);
    expect(helper.tagline).toBe(VC_TAGLINE);
    expect(helper.tags).toEqual(VC_EXPECTED);
    const quiet = cardFor(vcs, quietVc.id);
    expect(quiet.tagline).toBeNull();
    expect(quiet.tags).toEqual([]);
  });
});

// ===========================================================================
// FR-026 — website normalisation (US5)
// ===========================================================================

describe('Contributor card enrichment — website', () => {
  test('US5 — a valid absolute URL passes through, spaced/upper-case is trimmed and otherwise kept, empty/hostile/schemeless are null', async () => {
    const organizations = await cardsByType('ORGANIZATION');
    const website = (key: OrgKey) =>
      cardFor(organizations, orgs[key].id).website;

    expect(website(ORG_VALID)).toBe('https://example.org');
    expect(website(ORG_SPACEY)).toBe('HTTPS://Spacey.example/about');
    expect(website(ORG_BARE)).toBeNull();
    expect(website(ORG_HOSTILE)).toBeNull();
    expect(website(ORG_SCHEMELESS)).toBeNull();
  });
});

// ===========================================================================
// FR-010/FR-029 — join month (US4)
// ===========================================================================

describe('Contributor card enrichment — join month', () => {
  test('US4 — each member gets the first day (00:00 UTC) of the UTC month in which the member role was assigned', async () => {
    const userCards = await cardsByType('USER');
    // Independent oracle: the wall-clock window around the assignment, not a
    // value read back from the server. Accepts both ends so a run straddling a
    // month boundary still has one right answer.
    const expectedMonths = [
      monthStartUtcIso(memberAssignedFrom),
      monthStartUtcIso(memberAssignedTo),
    ];
    for (const id of Object.values(users)) {
      const joinedDate = cardFor(userCards, id).joinedDate;
      expect(joinedDate).toMatch(/^\d{4}-\d{2}-01T00:00:00\.000Z$/);
      expect(expectedMonths).toContain(joinedDate);
    }
  });
});

// ===========================================================================
// FR-009/FR-030 — associates count (US1-AS4)
// ===========================================================================

describe('Contributor card enrichment — associates count', () => {
  test('D-ZERO — an organization with no associates reports 0, and so does its profile metric', async () => {
    const card = cardFor(await cardsByType('ORGANIZATION'), orgs[ORG_BARE].id);
    expect(card.associatesCount).toBe(0);
    expect(await associatesMetric(orgs[ORG_BARE].id)).toBe(0);
  });

  test('US1-AS4 — adding N associates raises the count by exactly N', async () => {
    const card = cardFor(await cardsByType('ORGANIZATION'), orgs[ORG_VALID].id);
    expect(card.associatesCount).toBe(
      validAssociatesBaseline + ASSOCIATE_COUNT
    );
  });

  test('FR-030 — every fixture organization reports the same number as its profile associates metric', async () => {
    const organizations = await cardsByType('ORGANIZATION');
    for (const key of ORG_KEYS) {
      expect(
        cardFor(organizations, orgs[key].id).associatesCount,
        `organization '${key}'`
      ).toBe(await associatesMetric(orgs[key].id));
    }
  });
});
