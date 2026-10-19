// spec: client-web/src/functional-e2e/user-profile-test-plan.md (client-web#10179)
//
// Public profile resource tabs (`/user/<nameID>`, `/organization/<nameID>`):
// order (Leading first), the landing tab, tabs hidden when they would be empty,
// the "Other Resources" rename, and no Spaces under Other Resources.
//
// The tablist is asserted with ONE exact-array `toHaveText` per case. On a
// multi-element locator that retries until the count AND each text match in DOM
// order, so it proves the order, the presence of every expected tab and the
// absence of every hidden one (including the old "Resources Hosted") together.
//
// Everything is seeded per run through the API and removed again in afterAll.
// Two viewers, never a platform admin (who reads more than either and would
// hide the viewer-dependent filters this feature rests on):
//   - the registered, non-privileged `non.space` persona for the VISITOR cases
//     (PT-1 … PT-6; three of them skipped on server#6670, see below);
//   - the profile's OWNER for the Other Resources cases (PT-1o, PT-4o, PT-6o):
//     the user on their own page, and a plain user who administers the
//     organisation on its page. These are the viewers the server resolves
//     `User.account` / `Organization.account` for today, so they are the only
//     non-admin viewers who can see Other Resources at all (QA lead ruling,
//     2026-10-19). They sign in through the shared persona session cache.
// All Spaces are PUBLIC for the same reason: the server drops Spaces the viewer
// cannot read from `rolesUser` / `rolesOrganization`.

import { type Browser, expect, type Locator, type Page } from '@playwright/test';
import {
  assignLicensePlanToAccount,
  assignRoleToUser,
  createInnovationPack,
  createOrganizationOrAdopt,
  createVirtualContributor,
  deleteInnovationPack,
  deleteOrganization,
  deleteSpace,
  deleteVirtualContributor,
  getGraphqlClient,
  getLicensePlanByName,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  InnovationHubType,
  RoleName,
  SpacePrivacyMode,
  SpaceVisibility,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  adminGql,
  deleteFixtureUser,
  registerFixtureUser,
} from '../contributors-callout/cards-fixture';
import { deleteFixtureTree, newFixtureTree } from '../subspaces-callout/subspaces-callout.helpers';
import {
  clearHostLead,
  orgIsLeadOf,
  orgIsMemberOf,
} from '../organization-space-membership/organization-space-membership.helpers';
import {
  createPersonaTest,
  ensurePersonaState,
} from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
// Registered, non-privileged visitor (platform READ_USERS via GLOBAL_REGISTERED); never mutated.
const test = createPersonaTest('non.space@alkem.io');
const RUN = UniqueIDGenerator.getID();

// ---------------------------------------------------------------------------
// Copy (bundle `crd-profilePages`, en)
// ---------------------------------------------------------------------------
const TAB = {
  user: {
    leading: 'Leading',
    memberOf: 'Member Of',
    other: 'Other Resources',
  },
  org: {
    leading: 'Lead Spaces',
    memberOf: 'All Memberships',
    other: 'Other Resources',
  },
  oldName: 'Resources Hosted',
} as const;
const EMPTY_USER_MEMBERSHIP = 'No memberships yet.';
const EMPTY_ORG_MEMBERSHIP = 'Not a member of any Space or Subspace yet.';

// KNOWN DEFECT, product (client-web#10179 / server): Other Resources never
// appears for an ordinary signed-in visitor. The client learns the account id
// from `User.account` / `Organization.account`, and the server resolves both
// to null unless the viewer is the user, holds READ_USER_PII, or holds UPDATE
// on the organisation (server `user.resolver.fields.ts` and
// `organization.resolver.fields.ts`, the 027 R-F.3 comment). The client then
// skips the account-resources query, `hasOtherResources` stays false and the
// tab is hidden even though the profile owns a pack, hub or VC. Verified live
// (the same fixtures, same assertions): `non.space` sees ['Leading', 'Member
// Of'] only, `admin` sees all three tabs and every assertion below passes.
// PT-1, PT-4 and PT-6 assert the designed behaviour for the plan's visitor and
// are skipped until alkem-io/server#6670 is fixed (plan Q4): drop the skip when
// it lands. The assertions are unchanged, and the SAME assertions run live as
// PT-1o / PT-4o / PT-6o with the profile's owner as the viewer.
const OTHER_RESOURCES_HIDDEN_FROM_VISITOR =
  'alkem-io/server#6670: User.account and Organization.account are null for an ordinary visitor, so Other Resources is hidden (client-web#10179, plan Q4)';

// ---------------------------------------------------------------------------
// Locators
// ---------------------------------------------------------------------------
const tablist = (page: Page): Locator =>
  page.getByRole('tablist', { name: 'Resource sections', exact: true });
const tabs = (page: Page): Locator => tablist(page).getByRole('tab');
const tab = (page: Page, name: string): Locator =>
  tablist(page).getByRole('tab', { name, exact: true });
const h1 = (page: Page, name: string): Locator =>
  page.getByRole('heading', { level: 1, name, exact: true });
const h3 = (page: Page, name: string): Locator =>
  page.getByRole('heading', { level: 3, name, exact: true });
const h4 = (page: Page, name: string): Locator =>
  page.getByRole('heading', { level: 4, name, exact: true });
const text = (page: Page, value: string): Locator =>
  page.getByText(value, { exact: true });

/** Opens a profile and waits for the heading: the positive control that the page rendered. */
const openProfile = async (
  page: Page,
  path: string,
  displayName: string
): Promise<void> => {
  await page.goto(`${baseUrl}${path}`);
  await expect(h1(page, displayName)).toBeVisible({ timeout: 30_000 });
};

/** Asserts exactly one tab is selected: `selected`; every other expected tab is not. */
const expectSelected = async (
  page: Page,
  labels: readonly string[],
  selected: string
): Promise<void> => {
  for (const label of labels) {
    await expect(tab(page, label)).toHaveAttribute(
      'aria-selected',
      label === selected ? 'true' : 'false'
    );
  }
};

/**
 * Runs `walk` on a page signed in as `email` (a seeded user, registered with the
 * harness password) in its own context, which is closed afterwards.
 */
const asViewer = async (
  browser: Browser,
  email: string,
  walk: (page: Page) => Promise<void>
): Promise<void> => {
  const context = await browser.newContext({
    storageState: await ensurePersonaState(browser, email),
    locale: 'en-US',
  });
  try {
    await walk(await context.newPage());
  } finally {
    await context.close();
  }
};

// ---------------------------------------------------------------------------
// Seeding helpers
// ---------------------------------------------------------------------------
type SeededUser = {
  id: string;
  email: string;
  displayName: string;
  nameID: string;
  accountId: string;
};

const seedUser = async (displayName: string): Promise<SeededUser> => {
  const { id, email } = await registerFixtureUser(displayName);
  const data = await adminGql<{
    lookup: { user: { nameID: string; account: { id: string } } };
  }>(
    'query($id: UUID!){ lookup { user(ID: $id) { nameID account { id } } } }',
    { id }
  );
  return {
    id,
    email,
    displayName,
    nameID: data.lookup.user.nameID,
    accountId: data.lookup.user.account.id,
  };
};

type SpaceRoles = {
  spaceID: string;
  displayName: string;
  roles: string[];
  subspaces: { displayName: string; roles: string[] }[];
};

const rolesOf = async (
  kind: 'rolesUser' | 'rolesOrganization',
  actorID: string
): Promise<SpaceRoles[]> => {
  const data = await adminGql<Record<string, { spaces: SpaceRoles[] }>>(
    `query($id: UUID!){ ${kind}(rolesData: { actorID: $id }) { spaces { spaceID displayName roles subspaces { displayName roles } } } }`,
    { id: actorID }
  );
  return data[kind].spaces;
};

const hasRole = (roles: string[], role: string): boolean =>
  roles.some(r => r.toLowerCase() === role);

const accountResources = async (
  accountId: string
): Promise<{ vcs: number; packs: number; hubs: number }> => {
  const data = await adminGql<{
    lookup: {
      account: {
        virtualContributors: unknown[];
        innovationPacks: unknown[];
        innovationHubs: unknown[];
      };
    };
  }>(
    'query($id: UUID!){ lookup { account(ID: $id) { virtualContributors { id } innovationPacks { id } innovationHubs { id } } } }',
    { id: accountId }
  );
  const a = data.lookup.account;
  return {
    vcs: a.virtualContributors.length,
    packs: a.innovationPacks.length,
    hubs: a.innovationHubs.length,
  };
};

const spaceStillResolves = async (spaceId: string): Promise<boolean> => {
  try {
    const data = await adminGql<{ lookup: { space: { id: string } | null } }>(
      'query($id: UUID!){ lookup { space(ID: $id) { id } } }',
      { id: spaceId }
    );
    return !!data.lookup.space;
  } catch (error) {
    // Only "not found" means the Space is gone; any other failure is unknown.
    if (error instanceof Error && error.message.includes('ENTITY_NOT_FOUND')) {
      return false;
    }
    throw error;
  }
};

const orgAccountId = async (orgId: string): Promise<string> => {
  const data = await adminGql<{
    lookup: { organization: { account: { id: string } } };
  }>(
    'query($id: UUID!){ lookup { organization(ID: $id) { account { id } } } }',
    { id: orgId }
  );
  return data.lookup.organization.account.id;
};

const spaceInput = {
  collaboration: { addTutorialCallouts: false },
  settings: { privacy: { mode: SpacePrivacyMode.Public } },
};

/**
 * Removes a scenario's Spaces (leaves first), proves they are gone, then its
 * organisation. `cleanUpBaseScenario` logs and swallows every failure, which
 * left organisations behind on the shared stack when a Space delete did not go
 * through; here each failure surfaces.
 */
const removeScenario = async (
  scenario: OrganizationWithSpaceModel | undefined
): Promise<void> => {
  if (!scenario) return;
  const tree = newFixtureTree();
  tree.spaceId = scenario.space?.id || undefined;
  tree.subspaceIds = scenario.subspace?.id ? [scenario.subspace.id] : [];
  await deleteFixtureTree(tree, async id =>
    failOnError(`delete Space ${id}`, await deleteSpace(id))
  );
  for (const id of [...tree.subspaceIds, tree.spaceId]) {
    if (id && (await spaceStillResolves(id))) {
      throw new Error(`Space ${id} still exists after deleteSpace`);
    }
  }
  if (scenario.organization?.id) {
    failOnError(
      'delete organisation',
      await deleteOrganization(scenario.organization.id)
    );
  }
};

/** Runs every teardown step, then fails once listing what could not be removed. */
const runTeardown = async (
  steps: [string, () => Promise<unknown>][]
): Promise<void> => {
  const failures: string[] = [];
  for (const [label, step] of steps) {
    try {
      await step();
    } catch (error) {
      failures.push(
        `${label}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  if (failures.length > 0) {
    throw new Error(`fixture teardown left entities behind:\n${failures.join('\n')}`);
  }
};

const failOnError = (label: string, res: { error?: unknown } | undefined) => {
  if (res?.error) {
    throw new Error(`${label} failed: ${JSON.stringify(res.error)}`);
  }
};

// ===========================================================================
// Block U — user profile
// ===========================================================================
test.describe('Public profile resource tabs — user (client-web#10179)', () => {
  let scenarioA: OrganizationWithSpaceModel | undefined;
  let u1: SeededUser | undefined; // leads the L0, owns a Template Pack
  let u2: SeededUser | undefined; // leads the L1 only, owns nothing
  let u3: SeededUser | undefined; // bare
  let packId: string | undefined;

  test.beforeAll(async () => {
    test.setTimeout(240_000);

    scenarioA = await TestScenarioFactory.createBaseScenario({
      name: `pt-user-${RUN}`,
      space: { ...spaceInput, subspace: { settings: spaceInput.settings } },
    });
    const l0RoleSet = scenarioA.space.community.roleSetId;
    const l1RoleSet = scenarioA.subspace.community.roleSetId;

    u1 = await seedUser(`PT Lead ${RUN}`);
    u2 = await seedUser(`PT Sublead ${RUN}`);
    u3 = await seedUser(`PT Bare ${RUN}`);

    // U1 leads the L0.
    failOnError(
      'U1 member of L0',
      await assignRoleToUser(u1.id, l0RoleSet, RoleName.Member)
    );
    failOnError(
      'U1 lead of L0',
      await assignRoleToUser(u1.id, l0RoleSet, RoleName.Lead)
    );
    // U2 leads the L1 (and is a plain member of the L0 through the join).
    failOnError(
      'U2 member of L1',
      await assignRoleToUser(u2.id, l1RoleSet, RoleName.Member)
    );
    failOnError(
      'U2 lead of L1',
      await assignRoleToUser(u2.id, l1RoleSet, RoleName.Lead)
    );

    // U1 gets a Template Pack. A fresh account has a pack limit of 0.
    const plan = await getLicensePlanByName('ACCOUNT_LICENSE_PLUS');
    if (!plan[0]) throw new Error('ACCOUNT_LICENSE_PLUS plan not found');
    failOnError(
      'license plan on U1 account',
      await assignLicensePlanToAccount(u1.accountId, plan[0].id)
    );
    const pack = await createInnovationPack(
      u1.accountId,
      `PT pack ${RUN}`,
      `pt-pack-${RUN}`
    );
    failOnError('create pack on U1 account', pack);
    packId = pack.data?.createInnovationPack.id;
    if (!packId) throw new Error('pack id missing from createInnovationPack');

    // Precondition read-backs: fail fast and clearly.
    const u3Spaces = await rolesOf('rolesUser', u3.id);
    expect(u3Spaces, 'U3 must hold no Space role (no welcome-Space auto-enrol)').toEqual([]);
    expect(
      await accountResources(u3.accountId),
      'U3 account must own no VC, pack or hub'
    ).toEqual({ vcs: 0, packs: 0, hubs: 0 });
    expect(await accountResources(u2.accountId)).toEqual({ vcs: 0, packs: 0, hubs: 0 });
    const u1L0 = (await rolesOf('rolesUser', u1.id)).find(
      s => s.spaceID === scenarioA!.space.id
    );
    expect(u1L0 && hasRole(u1L0.roles, 'lead'), 'U1 must lead the L0').toBe(true);
    const u2L0 = (await rolesOf('rolesUser', u2.id)).find(
      s => s.spaceID === scenarioA!.space.id
    );
    expect(u2L0 && hasRole(u2L0.roles, 'lead'), 'U2 must NOT lead the L0').toBe(false);
    expect(
      u2L0?.subspaces.some(
        s =>
          s.displayName === scenarioA!.subspace.about.profile.displayName &&
          hasRole(s.roles, 'lead')
      ),
      'U2 must lead the L1'
    ).toBe(true);
  });

  test.afterAll(async () => {
    test.setTimeout(180_000);
    await runTeardown([
      // An account with a pack blocks user deletion: the pack goes first.
      ['pack', async () => packId && failOnError('delete pack', await deleteInnovationPack(packId))],
      ...[u1, u2, u3].map(
        (u): [string, () => Promise<unknown>] => [
          `user ${u?.displayName}`,
          async () => u && deleteFixtureUser(u.id),
        ]
      ),
      ['scenario A', () => removeScenario(scenarioA)],
    ]);
  });

  /** S1 on U1's profile, for any viewer who can see Other Resources. */
  const walkLeadWithPack = async (page: Page): Promise<void> => {
    const user = u1!;
    const l0Name = scenarioA!.space.about.profile.displayName;
    const labels = [TAB.user.leading, TAB.user.memberOf, TAB.user.other];

    await openProfile(page, `/user/${user.nameID}`, user.displayName);

    // Order + presence + absence (incl. the old "Resources Hosted") in one oracle.
    await expect(tabs(page)).toHaveText(labels);
    await expect(tab(page, TAB.oldName)).toHaveCount(0);
    await expectSelected(page, labels, TAB.user.leading);
    await expect(text(page, l0Name)).toBeVisible();

    // Member Of is present although empty: a Space the user leads is listed only under Leading.
    await tab(page, TAB.user.memberOf).click();
    await expect(tab(page, TAB.user.memberOf)).toHaveAttribute('aria-selected', 'true');
    await expect(text(page, EMPTY_USER_MEMBERSHIP)).toBeVisible();

    await tab(page, TAB.user.other).click();
    await expect(tab(page, TAB.user.other)).toHaveAttribute('aria-selected', 'true');
    await expect(h3(page, 'Template Packs')).toBeVisible();
    await expect(h4(page, `PT pack ${RUN}`)).toBeVisible();
    // Regression guard (R5): the pack is listed under its own heading, never as a Space.
    await expect(h3(page, 'Spaces')).toHaveCount(0);
  };

  test('PT-1 — a user who leads and owns a pack sees Leading, Member Of, Other Resources; lands on Leading', async ({
    page,
  }) => {
    test.skip(true, OTHER_RESOURCES_HIDDEN_FROM_VISITOR);
    await walkLeadWithPack(page);
  });

  test('PT-1o — the same user on their OWN profile sees Leading, Member Of, Other Resources; lands on Leading', async ({
    browser,
  }) => {
    await asViewer(browser, u1!.email, walkLeadWithPack);
  });

  test('PT-2 — a user who leads nothing and owns nothing sees only Member Of, selected and empty', async ({
    page,
  }) => {
    const user = u3!;

    await openProfile(page, `/user/${user.nameID}`, user.displayName);

    // Leading and Other Resources are hidden, not shown empty. The tablist itself
    // rendering with exactly one tab is the positive control.
    // Limit: while Q4 stands this viewer never sees Other Resources, so the
    // "hidden when there are no resources" half cannot fail here (shown green
    // with a pack on U3, 2026-10-15). Its positive twins are PT-1/PT-4/PT-6.
    await expect(tabs(page)).toHaveText([TAB.user.memberOf]);
    await expect(tab(page, TAB.user.memberOf)).toHaveAttribute('aria-selected', 'true');
    await expect(text(page, EMPTY_USER_MEMBERSHIP)).toBeVisible();
  });

  test('PT-3 — a user who leads only a subspace sees Leading and Member Of; the L1 under Leading, the L0 under Member Of', async ({
    page,
  }) => {
    const user = u2!;
    const l0Name = scenarioA!.space.about.profile.displayName;
    const l1Name = scenarioA!.subspace.about.profile.displayName;
    const labels = [TAB.user.leading, TAB.user.memberOf];

    await openProfile(page, `/user/${user.nameID}`, user.displayName);

    await expect(tabs(page)).toHaveText(labels);
    await expectSelected(page, labels, TAB.user.leading);
    await expect(text(page, l1Name)).toBeVisible();

    await tab(page, TAB.user.memberOf).click();
    await expect(tab(page, TAB.user.memberOf)).toHaveAttribute('aria-selected', 'true');
    await expect(text(page, l0Name)).toBeVisible();
    await expect(text(page, EMPTY_USER_MEMBERSHIP)).toHaveCount(0);
  });
});

// ===========================================================================
// Block O — organisation profile
// ===========================================================================
test.describe('Public profile resource tabs — organisation (client-web#10179)', () => {
  let scenarioB: OrganizationWithSpaceModel | undefined; // leads (host), pack + hub
  let scenarioC: OrganizationWithSpaceModel | undefined; // member only, VC
  let orgDId: string | undefined;
  let orgD: { nameID: string; displayName: string } | undefined;
  let orgAdmin: SeededUser | undefined; // plain user, Admin of orgs B and C
  let packId: string | undefined;
  let hubId: string | undefined;
  let vcId: string | undefined;

  test.beforeAll(async () => {
    test.setTimeout(240_000);

    // Org B: full.
    scenarioB = await TestScenarioFactory.createBaseScenario({
      name: `pt-orgfull-${RUN}`,
      space: spaceInput,
    });
    const orgB = scenarioB.organization;
    expect(
      await orgIsLeadOf(scenarioB.space.community.roleSetId, orgB.id),
      'org B (host) must lead its L0'
    ).toBe(true);

    const pack = await createInnovationPack(
      orgB.accountId,
      `PT org pack ${RUN}`,
      `pt-opack-${RUN}`
    );
    failOnError('create pack on org B account', pack);
    packId = pack.data?.createInnovationPack.id;
    if (!packId) throw new Error('pack id missing from createInnovationPack');

    // The lib has no wrapper for hubs; use the generated SDK directly.
    const hub = await graphqlErrorWrapper(
      authToken =>
        getGraphqlClient().CreateInnovationHub(
          {
            input: {
              accountID: orgB.accountId,
              subdomain: `pt-${RUN}`.toLowerCase(),
              type: InnovationHubType.Visibility,
              nameID: `pt-hub-${RUN}`,
              profileData: { displayName: `PT hub ${RUN}` },
              spaceVisibilityFilter: SpaceVisibility.Active,
            },
          },
          { authorization: `Bearer ${authToken}` }
        ),
      TestUser.GLOBAL_ADMIN
    );
    failOnError('create hub on org B account', hub);
    hubId = hub.data?.createInnovationHub.id;
    if (!hubId) throw new Error('hub id missing from CreateInnovationHub');

    // Org C: member, not lead, owns a VC.
    scenarioC = await TestScenarioFactory.createBaseScenario({
      name: `pt-orgvc-${RUN}`,
      space: spaceInput,
    });
    const orgC = scenarioC.organization;
    await clearHostLead(scenarioC);
    expect(
      await orgIsLeadOf(scenarioC.space.community.roleSetId, orgC.id),
      'org C must NOT lead its L0 after clearHostLead'
    ).toBe(false);
    expect(
      await orgIsMemberOf(scenarioC.space.community.roleSetId, orgC.id),
      'org C must still be a member of its L0'
    ).toBe(true);
    const vc = await createVirtualContributor(orgC.accountId, {
      profileDisplayName: `PT VC ${RUN}`,
      nameID: `pt-vc-${RUN}`,
      aiPersona: { engine: 'EXPERT' },
      bodyOfKnowledgeType: 'ALKEMIO_SPACE',
      bodyOfKnowledgeID: scenarioC.space.id,
    });
    failOnError('create VC on org C account', vc);
    vcId = vc.data?.createVirtualContributor.id;
    if (!vcId) throw new Error('VC id missing from createVirtualContributor');

    // A plain user who administers orgs B and C: holds UPDATE on each, which is
    // what lets the server resolve `Organization.account` for them. No
    // platform privilege, no Space role (read back below).
    orgAdmin = await seedUser(`PT Orgadmin ${RUN}`);
    for (const org of [orgB, orgC]) {
      failOnError(
        `org admin associate of ${org.nameId}`,
        await assignRoleToUser(orgAdmin.id, org.roleSetId, RoleName.Associate)
      );
      failOnError(
        `org admin admin of ${org.nameId}`,
        await assignRoleToUser(orgAdmin.id, org.roleSetId, RoleName.Admin)
      );
    }
    expect(
      await rolesOf('rolesUser', orgAdmin.id),
      'the org admin must hold no Space role of their own'
    ).toEqual([]);

    // Org D: bare.
    const displayName = `PT bare org ${RUN}`;
    const d = await createOrganizationOrAdopt(displayName, `pt-bare-${RUN}`);
    failOnError('create org D', d);
    orgDId = d.data?.createOrganization.id;
    if (!orgDId) throw new Error('org D id missing from createOrganization');
    orgD = { nameID: d.data!.createOrganization.nameID, displayName };
    expect(
      await rolesOf('rolesOrganization', orgDId),
      'org D must hold no Space role'
    ).toEqual([]);
    expect(
      await accountResources(await orgAccountId(orgDId)),
      'org D account must own no VC, pack or hub'
    ).toEqual({ vcs: 0, packs: 0, hubs: 0 });
  });

  test.afterAll(async () => {
    test.setTimeout(180_000);
    await runTeardown([
      [
        'hub',
        async () =>
          hubId &&
          failOnError(
            'delete hub',
            await graphqlErrorWrapper(
              authToken =>
                getGraphqlClient().DeleteInnovationHub(
                  { input: { ID: hubId! } },
                  { authorization: `Bearer ${authToken}` }
                ),
              TestUser.GLOBAL_ADMIN
            )
          ),
      ],
      ['pack', async () => packId && failOnError('delete pack', await deleteInnovationPack(packId))],
      // The VC goes before its body-of-knowledge Space.
      ['VC', async () => vcId && failOnError('delete VC', await deleteVirtualContributor(vcId))],
      ['org admin user', async () => orgAdmin && deleteFixtureUser(orgAdmin.id)],
      ['scenario B', () => removeScenario(scenarioB)],
      ['scenario C', () => removeScenario(scenarioC)],
      ['org D', async () => orgDId && failOnError('delete org D', await deleteOrganization(orgDId))],
    ]);
  });

  /** S4 on org B's profile, for any viewer who can see Other Resources. */
  const walkOrgFull = async (page: Page): Promise<void> => {
    const org = scenarioB!.organization;
    const l0Name = scenarioB!.space.about.profile.displayName;
    const labels = [TAB.org.leading, TAB.org.memberOf, TAB.org.other];

    await openProfile(page, `/organization/${org.nameId}`, org.profile.displayName);

    await expect(tabs(page)).toHaveText(labels);
    await expect(tab(page, TAB.oldName)).toHaveCount(0);
    await expectSelected(page, labels, TAB.org.leading);
    await expect(text(page, l0Name)).toBeVisible();

    // All Memberships is present although empty.
    await tab(page, TAB.org.memberOf).click();
    await expect(tab(page, TAB.org.memberOf)).toHaveAttribute('aria-selected', 'true');
    await expect(text(page, EMPTY_ORG_MEMBERSHIP)).toBeVisible();

    await tab(page, TAB.org.other).click();
    await expect(tab(page, TAB.org.other)).toHaveAttribute('aria-selected', 'true');
    // Positive controls first, then the absences they make meaningful.
    await expect(h3(page, 'Template Packs')).toBeVisible();
    await expect(h3(page, 'Custom Homepages')).toBeVisible();
    await expect(h4(page, `PT org pack ${RUN}`)).toBeVisible();
    await expect(h4(page, `PT hub ${RUN}`)).toBeVisible();
    // Regression guard: B's account HOSTS this Space, and before #10424 it was
    // listed here under "Spaces".
    await expect(h3(page, 'Spaces')).toHaveCount(0);
    await expect(text(page, l0Name)).toHaveCount(0);
    // Sub-sections are conditional: no VC was seeded for B.
    await expect(h3(page, 'Virtual Contributors')).toHaveCount(0);
  };

  test('PT-4 — an organisation that leads and owns a pack and a hub sees three tabs; Other Resources holds no Spaces', async ({
    page,
  }) => {
    test.skip(true, OTHER_RESOURCES_HIDDEN_FROM_VISITOR);
    await walkOrgFull(page);
  });

  test('PT-4o — the organisation\'s own admin sees three tabs on its profile; Other Resources holds no Spaces', async ({
    browser,
  }) => {
    await asViewer(browser, orgAdmin!.email, walkOrgFull);
  });

  test('PT-5 — an organisation with nothing sees only All Memberships, selected and empty', async ({
    page,
  }) => {
    await openProfile(page, `/organization/${orgD!.nameID}`, orgD!.displayName);

    // Same Q4 limit as PT-2: the Other Resources absence cannot fail for this viewer.
    await expect(tabs(page)).toHaveText([TAB.org.memberOf]);
    await expect(tab(page, TAB.org.memberOf)).toHaveAttribute('aria-selected', 'true');
    await expect(text(page, EMPTY_ORG_MEMBERSHIP)).toBeVisible();
  });

  /** S6 on org C's profile, for any viewer who can see Other Resources. */
  const walkOrgMemberWithVc = async (page: Page): Promise<void> => {
    const org = scenarioC!.organization;
    const l0Name = scenarioC!.space.about.profile.displayName;
    const labels = [TAB.org.memberOf, TAB.org.other];

    await openProfile(page, `/organization/${org.nameId}`, org.profile.displayName);

    await expect(tabs(page)).toHaveText(labels);
    await expectSelected(page, labels, TAB.org.memberOf);
    await expect(text(page, l0Name)).toBeVisible();

    await tab(page, TAB.org.other).click();
    await expect(tab(page, TAB.org.other)).toHaveAttribute('aria-selected', 'true');
    await expect(h3(page, 'Virtual Contributors')).toBeVisible();
    await expect(text(page, `PT VC ${RUN}`)).toBeVisible();
    // Regression guard: C's account hosts this Space but does not lead it.
    await expect(h3(page, 'Spaces')).toHaveCount(0);
    await expect(text(page, l0Name)).toHaveCount(0);
  };

  test('PT-6 — an organisation that is a member, not a lead, and owns a VC lands on All Memberships; Other Resources shows the VC and not the hosted Space', async ({
    page,
  }) => {
    test.skip(true, OTHER_RESOURCES_HIDDEN_FROM_VISITOR);
    await walkOrgMemberWithVc(page);
  });

  test('PT-6o — the organisation\'s own admin lands on All Memberships; Other Resources shows the VC and not the hosted Space', async ({
    browser,
  }) => {
    await asViewer(browser, orgAdmin!.email, walkOrgMemberWithVc);
  });
});
