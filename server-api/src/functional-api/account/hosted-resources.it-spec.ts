// The viewer-scoped `hostedResources` field on User and Organization: which
// hosted Virtual Contributors, Innovation Packs and Innovation Hubs each kind
// of viewer gets back. Only the rows that depend on live authorization state
// are here (real credentials, real role assignments); the full tier matrix is
// covered by the server's unit tests.
//
//   viewer                       PUBLIC  ACCOUNT  HIDDEN   hubs
//   unrelated registered         yes     no       no       all
//   organization associate       yes     yes      no       all
//   organization admin / owner   yes     yes      yes      all
//   anonymous                    hostedResources is null
//
// On a user account, ACCOUNT and HIDDEN belong to the user alone: any other
// registered viewer gets PUBLIC only (US2-AS4), the user gets everything.
//
// `listedInStore` plays no part: an ACCOUNT VC that is listed in the store is
// still hidden from an unrelated visitor. Every query sends the exact card
// selection the client profile pages send, and reads the raw response so a
// GraphQL error on one card cannot hide behind a wrapper.
import {
  assignLicensePlanToAccount,
  assignRoleToUser,
  createInnovationPack,
  createVirtualContributor,
  deleteInnovationPack,
  deleteSpace,
  deleteVirtualContributor,
  getGraphqlClient,
  getLicensePlanByName,
  getUserToken,
  postGraphqlRaw,
  removeRoleFromUser,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
  updateInnovationPackVisibility,
  updateVirtualContributorVisibility,
} from '@alkemio/tests-lib';
import {
  InnovationHubType,
  RoleName,
  SearchVisibility,
  SpaceLevel,
  SpaceVisibility,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  deleteUser,
  registerVerifiedUser,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  assignPlatformRole,
  removePlatformRole,
} from '@functional-api/platform/authorization-platform-mutation';

const uniqueId = UniqueIDGenerator.getID();

// ---------------------------------------------------------------------------
// The query: the client card selection, verbatim
// ---------------------------------------------------------------------------
const HOSTED_SELECTION = `
  hostedResources {
    virtualContributors {
      __typename
      id
      profile {
        id
        displayName
        tagline
        url
        avatar: visual(type: AVATAR) { id uri }
      }
    }
    innovationPacks { id profile { id displayName } }
    innovationHubs { id nameID profile { id displayName } }
  }
`;

type Hosted = {
  virtualContributors: Array<{
    __typename: string;
    id: string;
    profile: {
      displayName: string;
      url: string;
      avatar: { uri: string } | null;
    };
  }>;
  innovationPacks: Array<{ id: string }>;
  innovationHubs: Array<{ id: string }>;
};

type HostedResult = {
  errors: Array<Record<string, unknown>> | undefined;
  hosted: Hosted | null | undefined;
};

const hosted = async (
  kind: 'organization' | 'user',
  id: string,
  token?: string
): Promise<HostedResult> => {
  const res = await postGraphqlRaw<{
    lookup: Record<string, { hostedResources: Hosted | null } | null>;
  }>(
    `query($id: UUID!) { lookup { ${kind}(ID: $id) { ${HOSTED_SELECTION} } } }`,
    { variables: { id }, bearerToken: token }
  );
  expect(res.status, `HTTP status of the ${kind} lookup`).toBe(200);
  return {
    errors: res.body.errors,
    hosted: res.body.data?.lookup?.[kind]?.hostedResources,
  };
};

const ids = (items: Array<{ id: string }> | undefined): string[] =>
  (items ?? []).map(item => item.id);

/** The account id the viewer resolves through the profile, or null. */
const accountIdOf = async (
  kind: 'organization' | 'user',
  id: string,
  token: string
): Promise<string | null | undefined> => {
  const res = await postGraphqlRaw<{
    lookup: Record<string, { account: { id: string } | null } | null>;
  }>(`query($id: UUID!) { lookup { ${kind}(ID: $id) { account { id } } } }`, {
    variables: { id },
    bearerToken: token,
  });
  expect(
    res.body.errors,
    `the ${kind} account lookup must not error`
  ).toBeUndefined();
  return res.body.data?.lookup?.[kind]?.account?.id;
};

/** Run a GraphQL document as the platform admin; throw on any error. */
const adminGql = async <T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> => {
  const res = await graphqlRequestAuth(
    { query, variables },
    TestUser.GLOBAL_ADMIN
  );
  if (res.status !== 200 || res.body?.errors || !res.body?.data) {
    throw new Error(
      `GraphQL request failed (HTTP ${res.status}): ${JSON.stringify(res.body?.errors)}`
    );
  }
  return res.body.data as T;
};

const organizationStillResolves = async (id: string): Promise<boolean> => {
  try {
    const data = await adminGql<{
      lookup: { organization: { id: string } | null };
    }>('query($id: UUID!){ lookup { organization(ID: $id) { id } } }', { id });
    return !!data.lookup.organization;
  } catch (error) {
    // Only "not found" means the organisation is gone; any other failure is unknown.
    if (error instanceof Error && error.message.includes('ENTITY_NOT_FOUND')) {
      return false;
    }
    throw error;
  }
};

const failOnError = (label: string, res: { error?: unknown } | undefined) => {
  if (res?.error) {
    throw new Error(`${label} failed: ${JSON.stringify(res.error)}`);
  }
};

type Viewer = { id: string; email: string };

const registerViewer = async (label: string): Promise<Viewer> => {
  const email = `hr-${label}-${uniqueId}@alkem.io`;
  const id = await registerVerifiedUser(email, `hr${label}`, `ln${uniqueId}`);
  return { id, email };
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
let scenario: OrganizationWithSpaceModel;
let orgId = '';
let orgRoleSetId = '';
let packPublicId = '';
let packAccountId = '';
let packHiddenId = '';
let vcAccountId = '';
let vcHiddenId = '';
let hubHiddenId = '';
let ownerAccountId = '';
let packPublicUId = '';
let packHiddenUId = '';
let packAccountUId = '';
let vcHiddenUId = '';
let vcAccountUId = '';
let vcPublicUId = '';
let vcPublicRId = ''; // a PUBLIC VC on the unrelated viewer's account: readable by everyone

let associate: Viewer;
let orgAdmin: Viewer;
let unrelated: Viewer;
let owner: Viewer; // owns a PUBLIC, an ACCOUNT and a HIDDEN pack and VC on their user account

const createPack = async (
  accountId: string,
  label: string,
  searchVisibility: SearchVisibility | undefined
): Promise<string> => {
  const res = await createInnovationPack(
    accountId,
    `HR pack ${label} ${uniqueId}`,
    `hr-p${label}-${uniqueId}`
  );
  failOnError(`create pack ${label}`, res);
  const id = res.data?.createInnovationPack.id;
  if (!id) throw new Error(`pack id missing for ${label}`);
  if (searchVisibility) {
    try {
      failOnError(
        `pack ${label} ${searchVisibility}`,
        await updateInnovationPackVisibility(id, { searchVisibility })
      );
    } catch (error) {
      // The id never reaches teardown, so the pack is removed here; left
      // behind it would block deleting its owning account.
      await deleteInnovationPack(id).catch(() => undefined);
      throw error;
    }
  }
  return id;
};

const createVc = async (
  accountId: string,
  label: string,
  visibility: { searchVisibility: SearchVisibility; listedInStore?: boolean }
): Promise<string> => {
  const res = await createVirtualContributor(accountId, {
    profileDisplayName: `HR VC ${label} ${uniqueId}`,
    nameID: `hr-vc${label}-${uniqueId}`,
    aiPersona: { engine: 'EXPERT' },
    bodyOfKnowledgeType: 'ALKEMIO_SPACE',
    bodyOfKnowledgeID: scenario.space.id,
  });
  failOnError(`create VC ${label}`, res);
  const id = res.data?.createVirtualContributor.id;
  if (!id) throw new Error(`VC id missing for ${label}`);
  try {
    failOnError(
      `VC ${label} visibility`,
      await updateVirtualContributorVisibility(id, visibility)
    );
  } catch (error) {
    // The id never reaches teardown, so the VC is removed here; left behind
    // it would block deleting its body-of-knowledge Space.
    await deleteVirtualContributor(id).catch(() => undefined);
    throw error;
  }
  return id;
};

beforeAll(async () => {
  scenario = await TestScenarioFactory.createBaseScenario({
    name: `hosted-resources-${uniqueId}`,
    space: { collaboration: { addTutorialCallouts: false } },
  });
  const org = scenario.organization;
  orgId = org.id;
  orgRoleSetId = org.roleSetId;

  packPublicId = await createPack(
    org.accountId,
    'public',
    SearchVisibility.Public
  );
  packAccountId = await createPack(org.accountId, 'account', undefined);
  packHiddenId = await createPack(
    org.accountId,
    'hidden',
    SearchVisibility.Hidden
  );
  vcAccountId = await createVc(org.accountId, 'account', {
    searchVisibility: SearchVisibility.Account,
    listedInStore: true,
  });
  vcHiddenId = await createVc(org.accountId, 'hidden', {
    searchVisibility: SearchVisibility.Hidden,
  });

  // The lib has no wrapper for hubs; use the generated SDK directly.
  const hub = await graphqlErrorWrapper(
    authToken =>
      getGraphqlClient().CreateInnovationHub(
        {
          input: {
            accountID: org.accountId,
            subdomain: `hr-${uniqueId}`.toLowerCase(),
            type: InnovationHubType.Visibility,
            nameID: `hr-hub-${uniqueId}`,
            profileData: { displayName: `HR hub ${uniqueId}` },
            spaceVisibilityFilter: SpaceVisibility.Active,
          },
        },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  failOnError('create hub', hub);
  hubHiddenId = hub.data?.createInnovationHub.id ?? '';
  if (!hubHiddenId) throw new Error('hub id missing from CreateInnovationHub');
  failOnError(
    'hub HIDDEN',
    await graphqlErrorWrapper(
      authToken =>
        getGraphqlClient().updateInnovationHub(
          {
            updateData: {
              ID: hubHiddenId,
              searchVisibility: SearchVisibility.Hidden,
            },
          },
          { authorization: `Bearer ${authToken}` }
        ),
      TestUser.GLOBAL_ADMIN
    )
  );

  associate = await registerViewer('assoc');
  failOnError(
    'associate role',
    await assignRoleToUser(associate.id, orgRoleSetId, RoleName.Associate)
  );
  orgAdmin = await registerViewer('admin');
  for (const role of [RoleName.Associate, RoleName.Admin]) {
    failOnError(
      `org admin ${role}`,
      await assignRoleToUser(orgAdmin.id, orgRoleSetId, role)
    );
  }
  unrelated = await registerViewer('unrel');

  // The owner gets one pack and one VC per tier (ACCOUNT_LICENSE_PLUS allows
  // three of each). A fresh account has a pack limit of 0.
  owner = await registerViewer('owner');
  ownerAccountId = (
    await adminGql<{ lookup: { user: { account: { id: string } } } }>(
      'query($id: UUID!){ lookup { user(ID: $id) { account { id } } } }',
      { id: owner.id }
    )
  ).lookup.user.account.id;
  const plan = await getLicensePlanByName('ACCOUNT_LICENSE_PLUS');
  if (!plan[0]) throw new Error('ACCOUNT_LICENSE_PLUS plan not found');
  failOnError(
    'license plan on owner account',
    await assignLicensePlanToAccount(ownerAccountId, plan[0].id)
  );
  packPublicUId = await createPack(
    ownerAccountId,
    'publicu',
    SearchVisibility.Public
  );
  packHiddenUId = await createPack(
    ownerAccountId,
    'hiddenu',
    SearchVisibility.Hidden
  );
  // Left at the ACCOUNT default; read back below.
  packAccountUId = await createPack(ownerAccountId, 'accountu', undefined);
  vcHiddenUId = await createVc(ownerAccountId, 'hiddenu', {
    searchVisibility: SearchVisibility.Hidden,
  });
  vcAccountUId = await createVc(ownerAccountId, 'accountu', {
    searchVisibility: SearchVisibility.Account,
  });
  vcPublicUId = await createVc(ownerAccountId, 'publicu', {
    searchVisibility: SearchVisibility.Public,
  });

  // A VC every registered viewer can READ, hosted on an account no row asserts
  // on, so one operation can resolve VirtualContributor.profile next to the
  // hosted cards.
  const unrelatedAccountId = (
    await adminGql<{ lookup: { user: { account: { id: string } } } }>(
      'query($id: UUID!){ lookup { user(ID: $id) { account { id } } } }',
      { id: unrelated.id }
    )
  ).lookup.user.account.id;
  failOnError(
    'license plan on unrelated account',
    await assignLicensePlanToAccount(unrelatedAccountId, plan[0].id)
  );
  vcPublicRId = await createVc(unrelatedAccountId, 'publicr', {
    searchVisibility: SearchVisibility.Public,
  });

  // Precondition read-backs: the stored settings are what the rows assume.
  const stored = await adminGql<{
    lookup: Record<
      string,
      { searchVisibility: string; listedInStore: boolean }
    >;
  }>(
    `query($pp: UUID!, $pa: UUID!, $ph: UUID!, $va: UUID!, $vh: UUID!, $hh: UUID!, $pv: UUID!, $pu: UUID!, $vu: UUID!, $pau: UUID!, $vau: UUID!, $vpu: UUID!) {
      lookup {
        pp: innovationPack(ID: $pp) { searchVisibility listedInStore }
        pa: innovationPack(ID: $pa) { searchVisibility listedInStore }
        ph: innovationPack(ID: $ph) { searchVisibility listedInStore }
        va: virtualContributor(ID: $va) { searchVisibility listedInStore }
        vh: virtualContributor(ID: $vh) { searchVisibility listedInStore }
        hh: innovationHub(ID: $hh) { searchVisibility listedInStore }
        pv: innovationPack(ID: $pv) { searchVisibility listedInStore }
        pu: innovationPack(ID: $pu) { searchVisibility listedInStore }
        vu: virtualContributor(ID: $vu) { searchVisibility listedInStore }
        pau: innovationPack(ID: $pau) { searchVisibility listedInStore }
        vau: virtualContributor(ID: $vau) { searchVisibility listedInStore }
        vpu: virtualContributor(ID: $vpu) { searchVisibility listedInStore }
      }
    }`,
    {
      pp: packPublicId,
      pa: packAccountId,
      ph: packHiddenId,
      va: vcAccountId,
      vh: vcHiddenId,
      hh: hubHiddenId,
      pv: packPublicUId,
      pu: packHiddenUId,
      vu: vcHiddenUId,
      pau: packAccountUId,
      vau: vcAccountUId,
      vpu: vcPublicUId,
    }
  );
  const vis = (key: string) => stored.lookup[key].searchVisibility;
  expect(vis('pp')).toBe(SearchVisibility.Public);
  expect(vis('pa'), 'a new pack must default to ACCOUNT').toBe(
    SearchVisibility.Account
  );
  expect(vis('ph')).toBe(SearchVisibility.Hidden);
  expect(stored.lookup.va).toEqual({
    searchVisibility: SearchVisibility.Account,
    listedInStore: true,
  });
  expect(vis('vh')).toBe(SearchVisibility.Hidden);
  expect(vis('hh')).toBe(SearchVisibility.Hidden);
  expect(vis('pv')).toBe(SearchVisibility.Public);
  expect(vis('pu')).toBe(SearchVisibility.Hidden);
  expect(vis('vu')).toBe(SearchVisibility.Hidden);
  expect(vis('pau'), 'a new pack must default to ACCOUNT').toBe(
    SearchVisibility.Account
  );
  expect(vis('vau')).toBe(SearchVisibility.Account);
  expect(vis('vpu')).toBe(SearchVisibility.Public);

  for (const viewer of [associate, orgAdmin]) {
    const roles = await adminGql<{ rolesUser: { spaces: unknown[] } }>(
      'query($id: UUID!){ rolesUser(rolesData: { actorID: $id }) { spaces { id } } }',
      { id: viewer.id }
    );
    expect(
      roles.rolesUser.spaces,
      `${viewer.email} must hold no Space role`
    ).toEqual([]);
  }
});

afterAll(async () => {
  const failures: string[] = [];
  const step = async (label: string, run: () => Promise<unknown>) => {
    try {
      await run();
    } catch (error) {
      failures.push(
        `${label}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };
  // An account with a pack blocks user deletion: the packs go first.
  for (const id of [
    packPublicId,
    packAccountId,
    packHiddenId,
    packPublicUId,
    packHiddenUId,
    packAccountUId,
  ]) {
    if (id)
      await step(`pack ${id}`, async () =>
        failOnError('delete pack', await deleteInnovationPack(id))
      );
  }
  // The VCs go before their body-of-knowledge Space.
  for (const id of [
    vcAccountId,
    vcHiddenId,
    vcHiddenUId,
    vcAccountUId,
    vcPublicUId,
    vcPublicRId,
  ]) {
    if (id)
      await step(`VC ${id}`, async () =>
        failOnError('delete VC', await deleteVirtualContributor(id))
      );
  }
  if (hubHiddenId) {
    await step('hub', async () =>
      failOnError(
        'delete hub',
        await graphqlErrorWrapper(
          authToken =>
            getGraphqlClient().DeleteInnovationHub(
              { input: { ID: hubHiddenId } },
              { authorization: `Bearer ${authToken}` }
            ),
          TestUser.GLOBAL_ADMIN
        )
      )
    );
  }
  for (const viewer of [associate, orgAdmin, unrelated, owner]) {
    if (viewer)
      await step(`user ${viewer.email}`, async () =>
        failOnError('delete user', await deleteUser(viewer.id))
      );
  }
  // When a slow createSpace outlives the client's connection, the harness
  // retries it although the server already committed the first one, so the
  // account can host a second level-zero Space the scenario model never learns
  // of. It would block deleting the organisation, so it goes first.
  const accountId = scenario?.organization?.accountId;
  if (accountId) {
    await step('untracked Spaces', async () => {
      const data = await adminGql<{
        lookup: { account: { spaces: Array<{ id: string; level: string }> } };
      }>(
        'query($id: UUID!){ lookup { account(ID: $id) { spaces { id level } } } }',
        { id: accountId }
      );
      for (const space of data.lookup.account.spaces) {
        if (space.level === SpaceLevel.L0 && space.id !== scenario.space?.id) {
          failOnError(`delete Space ${space.id}`, await deleteSpace(space.id));
        }
      }
    });
  }
  await TestScenarioFactory.cleanUpBaseScenario(scenario);
  // cleanUpBaseScenario logs and swallows its failures; prove the organisation
  // is gone so a refused delete surfaces here.
  if (orgId) {
    await step('organisation', async () => {
      if (await organizationStillResolves(orgId)) {
        throw new Error(
          `organisation ${orgId} still exists after cleanUpBaseScenario`
        );
      }
    });
  }
  if (failures.length > 0) {
    throw new Error(
      `fixture teardown left entities behind:\n${failures.join('\n')}`
    );
  }
});

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------
describe('hostedResources — viewer-scoped hosted resources', () => {
  const collect = (result: HostedResult): Hosted => {
    expect(result.errors, 'the query must not error').toBeUndefined();
    expect(
      result.hosted,
      'a registered viewer gets hostedResources'
    ).toBeTruthy();
    return result.hosted!;
  };

  test('an associate who holds no Space role sees the ACCOUNT VC card and pack, not the HIDDEN ones, and the HIDDEN hub', async () => {
    const result = collect(
      await hosted('organization', orgId, await getUserToken(associate.email))
    );

    expect(ids(result.virtualContributors)).toEqual([vcAccountId]);
    // The card renders for a viewer who cannot read the VC itself.
    expect(result.virtualContributors[0].profile.displayName).toBe(
      `HR VC account ${uniqueId}`
    );
    expect(ids(result.innovationPacks).sort()).toEqual(
      [packPublicId, packAccountId].sort()
    );
    expect(ids(result.innovationHubs)).toEqual([hubHiddenId]);
  });

  test('an organization admin gets the full view: the HIDDEN VC and pack are present and render', async () => {
    const result = collect(
      await hosted('organization', orgId, await getUserToken(orgAdmin.email))
    );

    expect(ids(result.virtualContributors).sort()).toEqual(
      [vcAccountId, vcHiddenId].sort()
    );
    expect(
      result.virtualContributors.every(vc => !!vc.profile?.displayName),
      'every VC card has its profile'
    ).toBe(true);
    expect(ids(result.innovationPacks).sort()).toEqual(
      [packPublicId, packAccountId, packHiddenId].sort()
    );
    expect(ids(result.innovationHubs)).toEqual([hubHiddenId]);
  });

  test('an unrelated registered user sees the PUBLIC pack and the HIDDEN hub only; the store-listed ACCOUNT VC stays hidden', async () => {
    const result = collect(
      await hosted('organization', orgId, await getUserToken(unrelated.email))
    );

    expect(ids(result.innovationPacks)).toEqual([packPublicId]);
    expect(ids(result.virtualContributors)).toEqual([]);
    expect(ids(result.innovationHubs)).toEqual([hubHiddenId]);
  });

  test('an anonymous request gets hostedResources null and no error', async () => {
    const result = await hosted('organization', orgId);

    expect(result.errors).toBeUndefined();
    expect(result.hosted).toBeNull();
  });

  test("an unrelated registered user sees only a user account's PUBLIC pack and PUBLIC VC card: not its ACCOUNT or HIDDEN ones", async () => {
    const result = collect(
      await hosted('user', owner.id, await getUserToken(unrelated.email))
    );

    // US2-AS4: on a user account the ACCOUNT tier belongs to the user alone.
    expect(ids(result.innovationPacks)).toEqual([packPublicUId]);
    expect(ids(result.virtualContributors)).toEqual([vcPublicUId]);
    // US1-AS7: the PUBLIC VC card renders its name and avatar and links to the VC.
    const card = result.virtualContributors[0].profile;
    expect(card.displayName).toBe(`HR VC publicu ${uniqueId}`);
    expect(card.url).toMatch(new RegExp(`/vc/hr-vcpublicu-${uniqueId}$`, 'i'));
    expect(card.avatar?.uri, 'the VC card has an avatar').toBeTruthy();
  });

  test('the owner of a user account sees their own PUBLIC, ACCOUNT and HIDDEN packs and VCs', async () => {
    const result = collect(
      await hosted('user', owner.id, await getUserToken(owner.email))
    );

    expect(ids(result.innovationPacks).sort()).toEqual(
      [packPublicUId, packAccountUId, packHiddenUId].sort()
    );
    expect(ids(result.virtualContributors).sort()).toEqual(
      [vcPublicUId, vcAccountUId, vcHiddenUId].sort()
    );
  });

  test('a hosted VC and a hosted hub are closed card types: id and profile, and id, nameID and profile', async () => {
    const vcs: Hosted['virtualContributors'] = [];
    for (const viewer of [associate, orgAdmin]) {
      vcs.push(
        ...collect(
          await hosted('organization', orgId, await getUserToken(viewer.email))
        ).virtualContributors
      );
    }
    // Positive control: the type check below ran over real VC objects.
    expect(vcs.length).toBeGreaterThan(0);
    for (const vc of vcs) {
      expect(vc.__typename).toBe('AccountHostedVirtualContributor');
    }

    const res = await postGraphqlRaw<{
      __type: { fields: Array<{ name: string }> } | null;
    }>(
      '{ __type(name: "AccountHostedVirtualContributor") { fields { name } } }',
      {
        bearerToken: await getUserToken(unrelated.email),
      }
    );
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.__type?.fields.map(f => f.name).sort()).toEqual([
      'id',
      'profile',
    ]);

    const hub = await postGraphqlRaw<{
      __type: { fields: Array<{ name: string }> } | null;
    }>('{ __type(name: "AccountHostedInnovationHub") { fields { name } } }', {
      bearerToken: await getUserToken(unrelated.email),
    });
    expect(hub.body.errors).toBeUndefined();
    expect(hub.body.data?.__type?.fields.map(f => f.name).sort()).toEqual([
      'id',
      'nameID',
      'profile',
    ]);
  });

  test("a hosted hub offers no way into its account: selecting the hub's account is a validation error that returns no data", async () => {
    // Positive control: the same viewer resolves the hub card itself.
    const control = collect(
      await hosted('organization', orgId, await getUserToken(unrelated.email))
    );
    expect(ids(control.innovationHubs)).toEqual([hubHiddenId]);

    const res = await postGraphqlRaw<unknown>(
      'query($id: UUID!) { lookup { organization(ID: $id) { hostedResources { innovationHubs { account { innovationPacks { id } } } } } } }',
      {
        variables: { id: orgId },
        bearerToken: await getUserToken(unrelated.email),
      }
    );

    const messages = (res.body.errors ?? []).map(e => String(e.message));
    expect(
      messages.some(
        m =>
          m.includes('"account"') && m.includes('"AccountHostedInnovationHub"')
      ),
      `a validation error on field "account" of AccountHostedInnovationHub, got ${JSON.stringify(messages)}`
    ).toBe(true);
    expect(
      res.body.data ?? null,
      'a rejected query carries no data'
    ).toBeNull();
    for (const id of [packAccountId, packHiddenId, vcAccountId, vcHiddenId]) {
      expect(res.raw, 'no non-PUBLIC resource id leaks').not.toContain(id);
    }
  });

  test('the full account stays closed to an unrelated registered user', async () => {
    const res = await postGraphqlRaw<{
      lookup: { organization: { account: { id: string } | null } };
    }>(
      'query($id: UUID!){ lookup { organization(ID: $id) { account { id } } } }',
      {
        variables: { id: orgId },
        bearerToken: await getUserToken(unrelated.email),
      }
    );

    expect(res.status).toBe(200);
    // Positive control: the organization itself resolved.
    expect(res.body.data?.lookup.organization).toBeTruthy();
    expect(res.body.data?.lookup.organization.account).toBeNull();
  });

  test('a Platform Users Admin gets the full view of a user account, HIDDEN VC included, and still resolves the account', async () => {
    failOnError(
      'assign Platform Users Admin',
      await assignPlatformRole(unrelated.id, RoleName.PlatformUsersAdmin)
    );
    try {
      const token = await getUserToken(unrelated.email);
      // collect() asserts no GraphQL error, so the HIDDEN VC card resolved.
      const result = collect(await hosted('user', owner.id, token));
      expect(ids(result.innovationPacks).sort()).toEqual(
        [packPublicUId, packAccountUId, packHiddenUId].sort()
      );
      expect(ids(result.virtualContributors)).toContain(vcHiddenUId);
      expect(ids(result.virtualContributors).sort()).toEqual(
        [vcPublicUId, vcAccountUId, vcHiddenUId].sort()
      );
      expect(await accountIdOf('user', owner.id, token)).toBe(ownerAccountId);
    } finally {
      failOnError(
        'remove Platform Users Admin',
        await removePlatformRole(unrelated.id, RoleName.PlatformUsersAdmin)
      );
    }
  });

  test.each([RoleName.PlatformLicenseManager, RoleName.PlatformResourceAdmin])(
    'a %s gets the full view of an organization account and still resolves the account',
    async role => {
      failOnError(
        `assign ${role}`,
        await assignPlatformRole(unrelated.id, role)
      );
      try {
        const token = await getUserToken(unrelated.email);
        const result = collect(await hosted('organization', orgId, token));
        expect(ids(result.innovationPacks).sort()).toEqual(
          [packPublicId, packAccountId, packHiddenId].sort()
        );
        expect(ids(result.virtualContributors).sort()).toEqual(
          [vcAccountId, vcHiddenId].sort()
        );
        expect(await accountIdOf('organization', orgId, token)).toBe(
          scenario.organization.accountId
        );
      } finally {
        failOnError(
          `remove ${role}`,
          await removePlatformRole(unrelated.id, role)
        );
      }
    }
  );

  test.each([
    ['direct VC profile first', true],
    ['hosted cards first', false],
  ])(
    "an associate's ACCOUNT VC card still renders when the same operation also reads a VC profile directly (%s)",
    async (_order, directFirst) => {
      const direct =
        'direct: lookup { virtualContributor(ID: $vc) { profile { displayName } } }';
      const cards =
        'cards: lookup { organization(ID: $org) { hostedResources { virtualContributors { id profile { displayName } } } } }';
      const res = await postGraphqlRaw<{
        direct: { virtualContributor: { profile: { displayName: string } } };
        cards: {
          organization: {
            hostedResources: Hosted | null;
          };
        };
      }>(
        `query($vc: UUID!, $org: UUID!) { ${directFirst ? `${direct} ${cards}` : `${cards} ${direct}`} }`,
        {
          variables: { vc: vcPublicRId, org: orgId },
          bearerToken: await getUserToken(associate.email),
        }
      );
      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data?.direct.virtualContributor.profile.displayName).toBe(
        `HR VC publicr ${uniqueId}`
      );
      const vcs =
        res.body.data?.cards.organization.hostedResources?.virtualContributors;
      expect(ids(vcs)).toEqual([vcAccountId]);
      expect(vcs?.[0].profile.displayName).toBe(`HR VC account ${uniqueId}`);
    }
  );

  // Mutates the associate's role: keep it last.
  test('once the associate role is removed, the former associate sees the PUBLIC pack and the hub only', async () => {
    failOnError(
      'remove associate role',
      await removeRoleFromUser(associate.id, orgRoleSetId, RoleName.Associate)
    );
    const result = collect(
      await hosted('organization', orgId, await getUserToken(associate.email))
    );

    expect(ids(result.innovationPacks)).toEqual([packPublicId]);
    expect(ids(result.virtualContributors)).toEqual([]);
    expect(ids(result.innovationHubs)).toEqual([hubHiddenId]);
  });
});
