import { expect } from 'vitest';
import { rawRead, rawRequest } from '../raw-request';
import { allowedRoles, CAPABILITIES } from '../../capabilities.data';
import type { PlatformRole } from '../../capabilities.data';
import type { GroupModule, PerRole, RunContext } from '../types';

/**
 * A9 — move resources between accounts / space levels. Owner: Platform
 * Resource Admin, and nobody else.
 *
 * Every positive CONSUMES its target (a moved space cannot be moved the same
 * way twice), so each capability gets one target per allowed role plus a
 * surviving `deny` target that the negatives aim at.
 *
 * Everything lives in two ORGANIZATION accounts, and the setup actor that
 * hosted them resigns before the tests run: an account admin may transfer its
 * own resources and a space admin may move its own contributions, so a role
 * user left holding either would turn its negative into a legitimate `ok`.
 *
 *   source account                                       target account
 *   ├─ spaceA ─ L1 parentL1 ─ L2: move / convert targets     (empty)
 *   │        ├─ L1: move / convert targets
 *   │        └─ callouts: `from` (the contributions), `to`, transfer targets
 *   ├─ spaceB ─ L1 targetL1      (the OTHER L0 every cross-L0 move needs)
 *   │        └─ L1 per convert-VC: its body of knowledge, holding one callout
 *   ├─ one L0 per allowed role   (transferSpaceToAccount)
 *   └─ virtual contributors, innovation packs, innovation hubs
 */
type Target = { allow: PerRole; deny: string };

type A9 = {
  organizations: string[];
  sourceAccount: string;
  targetAccount: string;
  spaceA: string;
  spaceB: string;
  /** L1 under spaceA: parent of the L2s, and the convert-L1-to-L2 parent. */
  parentL1: string;
  /** L1 under spaceB: where the cross-L0 moves land. */
  targetL1: string;
  calloutsSetA: string;
  /** parentL1's callouts set: where transferred callouts land. */
  targetCalloutsSet: string;
  calloutFrom: string;
  calloutTo: string;
  /** The callout each convert-VC's body-of-knowledge space starts with. */
  knowledgeCallout: PerRole;
  moveL1ToL0: Target;
  moveL1ToL2: Target;
  moveL2ToL1: Target;
  convertL1ToL0: Target;
  convertL2ToL1: Target;
  convertL1ToL2: Target;
  convertVc: Target;
  contribution: Target;
  callout: Target;
  hub: Target;
  space: Target;
  pack: Target;
  vc: Target;
};

type Ctx = Omit<RunContext, 'fixtures'>;

const pick = (target: Target, role: PlatformRole): string =>
  target.allow[role] ?? target.deny;

/** Allowed roles of one A9 capability — today always [PLATFORM_RESOURCE_ADMIN]. */
const allowed = (surface: string): readonly PlatformRole[] => {
  const capability = CAPABILITIES.find(c => c.id === `A9.${surface}`);
  if (!capability) throw new Error(`A9: unknown capability ${surface}`);
  return allowedRoles(capability);
};

const CREATE_ORGANIZATION = `mutation($nameID: NameID!, $displayName: String!) {
  createOrganization(organizationData: { nameID: $nameID, profileData: { displayName: $displayName } }) { id } }`;
const CREATE_SPACE = `mutation($parent: UUID!, $nameID: NameID!, $displayName: String!) {
  createSpace(spaceData: { accountID: $parent, nameID: $nameID, about: { profileData: { displayName: $displayName } },
    collaborationData: { addTutorialCallouts: false, calloutsSetData: {} } }) { id } }`;
const CREATE_SUBSPACE = `mutation($parent: UUID!, $nameID: NameID!, $displayName: String!) {
  createSubspace(subspaceData: { spaceID: $parent, nameID: $nameID, about: { profileData: { displayName: $displayName } },
    collaborationData: { addTutorialCallouts: false, calloutsSetData: {} } }) { id } }`;
const CREATE_VC = `mutation($accountID: UUID!, $displayName: String!, $type: VirtualContributorBodyOfKnowledgeType!, $spaceID: String) {
  createVirtualContributor(virtualContributorData: { accountID: $accountID, profileData: { displayName: $displayName },
    bodyOfKnowledgeType: $type, bodyOfKnowledgeID: $spaceID, aiPersona: { engine: EXPERT } }) { id } }`;
const CREATE_PACK = `mutation($accountID: UUID!, $displayName: String!) {
  createInnovationPack(innovationPackData: { accountID: $accountID, profileData: { displayName: $displayName } }) { id } }`;
const CREATE_HUB = `mutation($accountID: UUID!, $displayName: String!, $subdomain: String!) {
  createInnovationHub(createData: { accountID: $accountID, subdomain: $subdomain, type: VISIBILITY,
    spaceVisibilityFilter: ACTIVE, profileData: { displayName: $displayName } }) { id } }`;
const CREATE_CALLOUT = `mutation($calloutsSetID: UUID!, $displayName: String!) {
  createCalloutOnCalloutsSet(calloutData: { calloutsSetID: $calloutsSetID, framing: { profile: { displayName: $displayName } },
    settings: { visibility: PUBLISHED, contribution: { enabled: true, allowedTypes: [POST] } } }) { id } }`;
const CREATE_POST = `mutation($calloutID: UUID!, $displayName: String!) {
  createContributionOnCallout(contributionData: { calloutID: $calloutID, type: POST,
    post: { profileData: { displayName: $displayName } } }) { id } }`;
const BASELINE_PLAN = `mutation($accountID: UUID!, $spaces: Int!, $vcs: Int!, $packs: Int!) {
  updateBaselineLicensePlanOnAccount(updateData: { accountID: $accountID, spaceFree: $spaces,
    virtualContributor: $vcs, innovationPacks: $packs }) { id } }`;
const RESIGN = `mutation($roleSetID: UUID!, $role: RoleName!, $actorID: UUID!) {
  removeRoleFromUser(roleData: { roleSetID: $roleSetID, role: $role, actorID: $actorID }) { id } }`;

const ORGANIZATION =
  'query($id: UUID!) { lookup { organization(ID: $id) { account { id } } } }';
const SPACE_SETS = `query($id: UUID!) { lookup { space(ID: $id) {
  collaboration { calloutsSet { id } } community { roleSet { id } } } } }`;

type OrganizationRead = {
  lookup: {
    organization: { account: { id: string } };
  };
};
type SpaceSetsRead = {
  lookup: {
    space: {
      collaboration: { calloutsSet: { id: string } };
      community: { roleSet: { id: string } };
    };
  };
};

const create = async (
  token: string,
  mutation: string,
  variables: Record<string, unknown>
): Promise<string> => {
  const data = await rawRead<Record<string, { id: string }>>(
    token,
    mutation,
    variables
  );
  return Object.values(data)[0].id;
};

/** `Promise.all` over a record — one rejection fails the wave, none is left unhandled. */
const all = async <T extends Record<string, Promise<unknown>>>(
  wave: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> =>
  Object.fromEntries(
    await Promise.all(
      Object.entries(wave).map(async ([key, value]) => [key, await value])
    )
  ) as { [K in keyof T]: Awaited<T[K]> };

/**
 * The ONE setup step no target role can perform: `create-innovation-hub` is
 * granted to the legacy global roles only, so the hubs are created by the
 * bootstrap account. Everything else in this fixture is built by role users.
 */
const createInnovationHubAsLegacyAdmin = (
  ctx: Ctx,
  accountID: string,
  tag: string
): Promise<string> =>
  create(ctx.bootstrapToken, CREATE_HUB, {
    accountID,
    displayName: `platform-roles a9 hub ${tag} ${ctx.runId}`,
    subdomain: `a9hub${tag}${ctx.runId}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ''),
  });

const build = async (ctx: Ctx, organizations: string[]): Promise<A9> => {
  const support = ctx.tokens.PLATFORM_SUPPORT;
  const content = ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS;

  // nameID: lowercase a-z0-9-, max 25 — sanitised HERE so no negative can die
  // on BAD_USER_INPUT.
  const named = (tag: string) => ({
    nameID: `a9-${tag}-${ctx.runId}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 25),
    displayName: `platform-roles a9 ${tag} ${ctx.runId}`,
  });
  /** One fresh target per role allowed to reach `surface`. */
  const perRole = async (
    surface: string,
    make: (role: PlatformRole, tag: string) => Promise<string>
  ): Promise<PerRole> =>
    Object.fromEntries(
      await Promise.all(
        allowed(surface).map(
          async (role, i) => [role, await make(role, String(i))] as const
        )
      )
    );

  // Read while Support still administers the organizations: once it resigned,
  // `account` resolves to null for it.
  const [source, target] = await Promise.all(
    organizations.map(
      async id =>
        (await rawRead<OrganizationRead>(support, ORGANIZATION, { id })).lookup
          .organization
    )
  );
  const sourceAccount = source.account.id;

  // A new organization account may host nothing until it is given a plan.
  await rawRead(ctx.tokens.PLATFORM_LICENSE_MANAGER, BASELINE_PLAN, {
    accountID: sourceAccount,
    spaces: 2 + allowed('transferSpaceToAccount').length,
    vcs:
      1 +
      allowed('transferVirtualContributorToAccount').length +
      allowed('convertVirtualContributorToUseKnowledgeBase').length,
    packs: 1 + allowed('transferInnovationPackToAccount').length,
  });

  // Account-level resources — Support, as the organization's admin.
  const l0 = (tag: string) =>
    create(support, CREATE_SPACE, { parent: sourceAccount, ...named(tag) });
  const vcOn = (tag: string, spaceID?: string) =>
    create(support, CREATE_VC, {
      accountID: sourceAccount,
      displayName: named(tag).displayName,
      type: spaceID ? 'ALKEMIO_SPACE' : 'ALKEMIO_KNOWLEDGE_BASE',
      spaceID,
    });
  const packOn = (tag: string) =>
    create(support, CREATE_PACK, {
      accountID: sourceAccount,
      displayName: named(tag).displayName,
    });
  // Content — Platform Content Full Access (cascaded CREATE).
  const sub = (parent: string, tag: string) =>
    create(content, CREATE_SUBSPACE, { parent, ...named(tag) });
  const calloutOn = (calloutsSetID: string, tag: string) =>
    create(content, CREATE_CALLOUT, {
      calloutsSetID,
      displayName: named(tag).displayName,
    });
  const setsOf = async (id: string) =>
    (await rawRead<SpaceSetsRead>(content, SPACE_SETS, { id })).lookup.space;

  // Three waves, each as wide as its dependencies allow: built one call at a
  // time this fixture costs the better part of a minute.
  const account = await all({
    spaceA: l0('l0-a'),
    spaceB: l0('l0-b'),
    spaces: perRole('transferSpaceToAccount', (_, i) => l0(`xfer-${i}`)),
    denyVc: vcOn('vc-deny'),
    vcs: perRole('transferVirtualContributorToAccount', (_, i) =>
      vcOn(`vc-xfer-${i}`)
    ),
    denyPack: packOn('pack-deny'),
    packs: perRole('transferInnovationPackToAccount', (_, i) =>
      packOn(`pack-${i}`)
    ),
    denyHub: createInnovationHubAsLegacyAdmin(ctx, sourceAccount, 'deny'),
    hubs: perRole('transferInnovationHubToAccount', (_, i) =>
      createInnovationHubAsLegacyAdmin(ctx, sourceAccount, i)
    ),
  });
  const { spaceA, spaceB } = account;

  const setsA = await setsOf(spaceA);
  const calloutsSetA = setsA.collaboration.calloutsSet.id;
  const underA = (tag: string) => (_: PlatformRole, i: string) =>
    sub(spaceA, `${tag}-${i}`);
  const level1 = await all({
    parentL1: sub(spaceA, 'parent-l1'),
    targetL1: sub(spaceB, 'target-l1'),
    denyL1: sub(spaceA, 'deny-l1'),
    moveL1ToL0: perRole('moveSpaceL1ToSpaceL0', underA('m10')),
    moveL1ToL2: perRole('moveSpaceL1ToSpaceL2', underA('m12')),
    convertL1ToL0: perRole('convertSpaceL1ToSpaceL0', underA('c10')),
    convertL1ToL2: perRole('convertSpaceL1ToSpaceL2', underA('c12')),
    calloutFrom: calloutOn(calloutsSetA, 'from'),
    calloutTo: calloutOn(calloutsSetA, 'to'),
    callouts: perRole('transferCallout', (_, i) =>
      calloutOn(calloutsSetA, `xfer-${i}`)
    ),
  });
  const { parentL1, targetL1, denyL1, calloutFrom, calloutTo } = level1;

  // A convert-VC draws on a space of its OWN: the conversion empties that
  // space's callouts set into the VC's knowledge base.
  const knowledgeCallout: PerRole = {};
  const convertVcOn = async (role: PlatformRole, i: string) => {
    const knowledgeSpace = await sub(spaceB, `bok-${i}`);
    knowledgeCallout[role] = await calloutOn(
      (await setsOf(knowledgeSpace)).collaboration.calloutsSet.id,
      `bok-${i}`
    );
    return vcOn(`vc-conv-${i}`, knowledgeSpace);
  };
  const underParentL1 = (tag: string) => (_: PlatformRole, i: string) =>
    sub(parentL1, `${tag}-${i}`);
  // Contributing needs membership: Support is a member of the space it created.
  const postOn = (tag: string) =>
    create(support, CREATE_POST, {
      calloutID: calloutFrom,
      displayName: named(tag).displayName,
    });
  const level2 = await all({
    denyL2: sub(parentL1, 'deny-l2'),
    moveL2ToL1: perRole('moveSpaceL2ToSpaceL1', underParentL1('m21')),
    convertL2ToL1: perRole('convertSpaceL2ToSpaceL1', underParentL1('c21')),
    convertVcs: perRole(
      'convertVirtualContributorToUseKnowledgeBase',
      convertVcOn
    ),
    denyPost: postOn('post-deny'),
    posts: perRole('moveContributionToCallout', (_, i) => postOn(`post-${i}`)),
    targetSets: setsOf(parentL1),
  });
  const { denyL2 } = level2;

  // Support steps down, so that it holds nothing but its platform role over
  // these fixtures: organization admin IS account admin (may transfer), and
  // the admin of spaceA may move the contributions in it.
  for (const id of organizations) await resign(ctx, id);
  await rawRead(support, RESIGN, {
    roleSetID: setsA.community.roleSet.id,
    role: 'ADMIN',
    actorID: ctx.userIds.PLATFORM_SUPPORT,
  });

  return {
    organizations,
    sourceAccount,
    targetAccount: target.account.id,
    spaceA,
    spaceB,
    parentL1,
    targetL1,
    calloutsSetA,
    targetCalloutsSet: level2.targetSets.collaboration.calloutsSet.id,
    calloutFrom,
    calloutTo,
    knowledgeCallout,
    moveL1ToL0: { allow: level1.moveL1ToL0, deny: denyL1 },
    moveL1ToL2: { allow: level1.moveL1ToL2, deny: denyL1 },
    moveL2ToL1: { allow: level2.moveL2ToL1, deny: denyL2 },
    convertL1ToL0: { allow: level1.convertL1ToL0, deny: denyL1 },
    convertL2ToL1: { allow: level2.convertL2ToL1, deny: denyL2 },
    convertL1ToL2: { allow: level1.convertL1ToL2, deny: denyL1 },
    convertVc: { allow: level2.convertVcs, deny: account.denyVc },
    contribution: { allow: level2.posts, deny: level2.denyPost },
    // spaceA and calloutFrom are never transferred, so they double as deny targets.
    callout: { allow: level1.callouts, deny: calloutFrom },
    space: { allow: account.spaces, deny: spaceA },
    hub: { allow: account.hubs, deny: account.denyHub },
    pack: { allow: account.packs, deny: account.denyPack },
    vc: { allow: account.vcs, deny: account.denyVc },
  };
};

type Listed = { id: string }[];
type AccountResources = {
  spaces: Listed;
  virtualContributors: Listed;
  innovationPacks: Listed;
  innovationHubs: Listed;
};

const ACCOUNT_TREE = `query($id: UUID!) { lookup { organization(ID: $id) { account {
  spaces { id subspaces { id subspaces { id } } }
  virtualContributors { id } innovationPacks { id } innovationHubs { id } } } } }`;
type AccountTreeRead = {
  lookup: {
    organization: {
      account: Omit<AccountResources, 'spaces'> & {
        spaces: {
          id: string;
          subspaces: { id: string; subspaces: Listed }[];
        }[];
      };
    };
  };
};

const MY_ORGANIZATION_ROLES =
  'query($id: UUID!) { lookup { organization(ID: $id) { roleSet { id myRoles } } } }';

/**
 * Support leaves the organization it created. Deleting an organization does
 * NOT revoke its members' credentials, so a role kept here would pile up on the
 * Support user run after run. ASSOCIATE first: dropping it takes the admin's GRANT.
 */
const resign = async (ctx: Ctx, organizationID: string): Promise<void> => {
  const support = ctx.tokens.PLATFORM_SUPPORT;
  const { roleSet } = (
    await rawRead<{
      lookup: { organization: { roleSet: { id: string; myRoles: string[] } } };
    }>(support, MY_ORGANIZATION_ROLES, { id: organizationID })
  ).lookup.organization;
  for (const role of ['ASSOCIATE', 'ADMIN']) {
    if (roleSet.myRoles.includes(role)) {
      await rawRead(support, RESIGN, {
        roleSetID: roleSet.id,
        role,
        actorID: ctx.userIds.PLATFORM_SUPPORT,
      });
    }
  }
};

/**
 * Removes whatever the two organizations' accounts hold NOW — the positives
 * moved things around, so the fixture ids no longer say where anything lives.
 * Content goes as Content Full Access, the organizations as Support.
 */
const removeAll = async (ctx: Ctx, organizations: string[]): Promise<void> => {
  const content = ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS;
  const failures: string[] = [];
  const remove = async (token: string, mutation: string, listed: Listed) => {
    const results = await Promise.all(
      listed.map(({ id }) =>
        rawRequest(
          token,
          `mutation($id: UUID!) { ${mutation}(deleteData: { ID: $id }) { id } }`,
          { id }
        )
      )
    );
    results.forEach(({ errors }, i) => {
      if (errors.length > 0) {
        failures.push(`${mutation} ${listed[i].id}: ${errors[0].message}`);
      }
    });
  };

  for (const id of organizations) {
    const { account } = (
      await rawRead<AccountTreeRead>(content, ACCOUNT_TREE, { id })
    ).lookup.organization;
    const l1 = account.spaces.flatMap(space => space.subspaces);
    const l2 = l1.flatMap(space => space.subspaces);
    await remove(
      content,
      'deleteVirtualContributor',
      account.virtualContributors
    );
    await remove(content, 'deleteInnovationHub', account.innovationHubs);
    await remove(content, 'deleteInnovationPack', account.innovationPacks);
    // A space cannot be deleted while it has subspaces: bottom-up.
    await remove(content, 'deleteSpace', l2);
    await remove(content, 'deleteSpace', l1);
    await remove(content, 'deleteSpace', account.spaces);
    await resign(ctx, id);
    await remove(ctx.tokens.PLATFORM_SUPPORT, 'deleteOrganization', [{ id }]);
  }

  if (failures.length > 0) {
    throw new Error(`A9 cleanup:\n  ${failures.join('\n  ')}`);
  }
};

const SPACE_PLACE =
  'query($id: UUID!) { lookup { space(ID: $id) { level levelZeroSpaceID } } }';
const SUBSPACES =
  'query($id: UUID!) { lookup { space(ID: $id) { subspaces { id } } } }';
const CALLOUTS =
  'query($id: UUID!) { lookup { calloutsSet(ID: $id) { callouts { id } } } }';
const CONTRIBUTIONS =
  'query($id: UUID!) { lookup { callout(ID: $id) { contributions { id } } } }';
const KNOWLEDGE_BASE = `query($id: UUID!) { lookup { virtualContributor(ID: $id) {
  knowledgeBase { calloutsSet { callouts { id } } } } } }`;
const ACCOUNT_RESOURCES = `query($id: UUID!) { lookup { account(ID: $id) {
  spaces { id } virtualContributors { id } innovationPacks { id } innovationHubs { id } } } }`;

const ids = (listed: Listed): string[] => listed.map(item => item.id);

/** The space sits at `level`, inside the tree of `levelZero`, under `parent`. */
const expectSpaceAt = async (
  token: string,
  id: string,
  place: { level: 'L0' | 'L1' | 'L2'; levelZero: string; parent?: string }
): Promise<void> => {
  const { space } = (
    await rawRead<{
      lookup: { space: { level: string; levelZeroSpaceID: string } };
    }>(token, SPACE_PLACE, { id })
  ).lookup;
  expect(space).toEqual({
    level: place.level,
    levelZeroSpaceID: place.levelZero,
  });
  if (place.parent) {
    const parent = await rawRead<{ lookup: { space: { subspaces: Listed } } }>(
      token,
      SUBSPACES,
      { id: place.parent }
    );
    expect(ids(parent.lookup.space.subspaces)).toContain(id);
  }
};

/** The resource is listed by the TARGET account and no longer by the source. */
const expectInTargetAccount = async (
  token: string,
  fx: A9,
  kind: keyof AccountResources,
  id: string
): Promise<void> => {
  const listedBy = async (accountID: string) =>
    ids(
      (
        await rawRead<{ lookup: { account: AccountResources } }>(
          token,
          ACCOUNT_RESOURCES,
          { id: accountID }
        )
      ).lookup.account[kind]
    );
  expect(await listedBy(fx.targetAccount)).toContain(id);
  expect(await listedBy(fx.sourceAccount)).not.toContain(id);
};

const calloutsIn = async (token: string, calloutsSetID: string) =>
  ids(
    (
      await rawRead<{ lookup: { calloutsSet: { callouts: Listed } } }>(
        token,
        CALLOUTS,
        { id: calloutsSetID }
      )
    ).lookup.calloutsSet.callouts
  );

const contributionsIn = async (token: string, calloutID: string) =>
  ids(
    (
      await rawRead<{ lookup: { callout: { contributions: Listed } } }>(
        token,
        CONTRIBUTIONS,
        { id: calloutID }
      )
    ).lookup.callout.contributions
  );

const readerOf = (ctx: RunContext): string =>
  ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS;

export const A9_GROUP: GroupModule<A9> = {
  group: 'A9',

  build: async ctx => {
    const organizations: string[] = [];
    try {
      for (const tag of ['source', 'target']) {
        organizations.push(
          await create(ctx.tokens.PLATFORM_SUPPORT, CREATE_ORGANIZATION, {
            nameID: `a9-${tag}-${ctx.runId}`,
            displayName: `platform-roles a9 ${tag} ${ctx.runId}`,
          })
        );
      }
      return await build(ctx, organizations);
    } catch (e) {
      // A half-built fixture is never handed to teardown — remove it here.
      await removeAll(ctx, organizations);
      throw e;
    }
  },

  teardown: (ctx, _sdk, fx) => removeAll(ctx, fx.organizations),

  invocations: {
    'A9.moveSpaceL1ToSpaceL0': {
      gate: ['moveSpaceL1ToSpaceL0'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesMoveSpaceL1ToSpaceL0(
          {
            moveData: {
              spaceL1ID: pick(fx.moveL1ToL0, role),
              targetSpaceL0ID: fx.spaceB,
            },
          },
          headers
        ),
      verify: ({ ctx, fx, role }) =>
        expectSpaceAt(readerOf(ctx), pick(fx.moveL1ToL0, role), {
          level: 'L1',
          levelZero: fx.spaceB,
          parent: fx.spaceB,
        }),
    },
    'A9.moveSpaceL1ToSpaceL2': {
      gate: ['moveSpaceL1ToSpaceL2'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesMoveSpaceL1ToSpaceL2(
          {
            moveData: {
              spaceL1ID: pick(fx.moveL1ToL2, role),
              targetSpaceL1ID: fx.targetL1,
            },
          },
          headers
        ),
      verify: ({ ctx, fx, role }) =>
        expectSpaceAt(readerOf(ctx), pick(fx.moveL1ToL2, role), {
          level: 'L2',
          levelZero: fx.spaceB,
          parent: fx.targetL1,
        }),
    },
    // Despite its name this keeps the space at L2: it re-parents an L2 under
    // an L1 of ANOTHER L0.
    'A9.moveSpaceL2ToSpaceL1': {
      gate: ['moveSpaceL2ToSpaceL1'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesMoveSpaceL2ToSpaceL1(
          {
            moveData: {
              spaceL2ID: pick(fx.moveL2ToL1, role),
              targetSpaceL1ID: fx.targetL1,
            },
          },
          headers
        ),
      verify: ({ ctx, fx, role }) =>
        expectSpaceAt(readerOf(ctx), pick(fx.moveL2ToL1, role), {
          level: 'L2',
          levelZero: fx.spaceB,
          parent: fx.targetL1,
        }),
    },
    'A9.convertSpaceL1ToSpaceL0': {
      gate: ['convertSpaceL1ToSpaceL0'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesConvertSpaceL1ToSpaceL0(
          { convertData: { spaceL1ID: pick(fx.convertL1ToL0, role) } },
          headers
        ),
      verify: ({ ctx, fx, role }) =>
        expectSpaceAt(readerOf(ctx), pick(fx.convertL1ToL0, role), {
          level: 'L0',
          levelZero: pick(fx.convertL1ToL0, role),
        }),
    },
    'A9.convertSpaceL2ToSpaceL1': {
      gate: ['convertSpaceL2ToSpaceL1'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesConvertSpaceL2ToSpaceL1(
          { convertData: { spaceL2ID: pick(fx.convertL2ToL1, role) } },
          headers
        ),
      verify: ({ ctx, fx, role }) =>
        expectSpaceAt(readerOf(ctx), pick(fx.convertL2ToL1, role), {
          level: 'L1',
          levelZero: fx.spaceA,
          parent: fx.spaceA,
        }),
    },
    'A9.convertSpaceL1ToSpaceL2': {
      gate: ['convertSpaceL1ToSpaceL2'],
      call: (sdk, headers, fx, role) =>
        sdk.ConvertSpaceL1ToSpaceL2(
          {
            convertData: {
              spaceL1ID: pick(fx.convertL1ToL2, role),
              parentSpaceL1ID: fx.parentL1,
            },
          },
          headers
        ),
      verify: ({ ctx, fx, role }) =>
        expectSpaceAt(readerOf(ctx), pick(fx.convertL1ToL2, role), {
          level: 'L2',
          levelZero: fx.spaceA,
          parent: fx.parentL1,
        }),
    },
    'A9.convertVirtualContributorToUseKnowledgeBase': {
      gate: ['convertVirtualContributorToUseKnowledgeBase'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesConvertVirtualContributorToUseKnowledgeBase(
          {
            conversionData: { virtualContributorID: pick(fx.convertVc, role) },
          },
          headers
        ),
      // The space's callout now lives in the VC's own knowledge base.
      verify: async ({ ctx, fx, role }) => {
        const read = await rawRead<{
          lookup: {
            virtualContributor: {
              knowledgeBase: { calloutsSet: { callouts: Listed } };
            };
          };
        }>(readerOf(ctx), KNOWLEDGE_BASE, { id: pick(fx.convertVc, role) });
        expect(
          ids(read.lookup.virtualContributor.knowledgeBase.calloutsSet.callouts)
        ).toContain(fx.knowledgeCallout[role]);
      },
    },
    'A9.moveContributionToCallout': {
      gate: ['moveContributionToCallout'],
      call: (sdk, headers, fx, role) =>
        sdk.moveContributionToCallout(
          {
            moveContributionData: {
              contributionID: pick(fx.contribution, role),
              calloutID: fx.calloutTo,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx, role }) => {
        const moved = pick(fx.contribution, role);
        expect(await contributionsIn(readerOf(ctx), fx.calloutTo)).toContain(
          moved
        );
        expect(
          await contributionsIn(readerOf(ctx), fx.calloutFrom)
        ).not.toContain(moved);
      },
    },
    'A9.transferCallout': {
      gate: ['transferCallout'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesTransferCallout(
          {
            transferData: {
              calloutID: pick(fx.callout, role),
              targetCalloutsSetID: fx.targetCalloutsSet,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx, role }) => {
        const moved = pick(fx.callout, role);
        expect(await calloutsIn(readerOf(ctx), fx.targetCalloutsSet)).toContain(
          moved
        );
        expect(await calloutsIn(readerOf(ctx), fx.calloutsSetA)).not.toContain(
          moved
        );
      },
    },
    'A9.transferInnovationHubToAccount': {
      gate: ['transferInnovationHubToAccount'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesTransferInnovationHubToAccount(
          {
            transferData: {
              innovationHubID: pick(fx.hub, role),
              targetAccountID: fx.targetAccount,
            },
          },
          headers
        ),
      verify: ({ ctx, fx, role }) =>
        expectInTargetAccount(
          readerOf(ctx),
          fx,
          'innovationHubs',
          pick(fx.hub, role)
        ),
    },
    'A9.transferSpaceToAccount': {
      gate: ['transferSpaceToAccount'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesTransferSpaceToAccount(
          {
            transferData: {
              spaceID: pick(fx.space, role),
              targetAccountID: fx.targetAccount,
            },
          },
          headers
        ),
      verify: ({ ctx, fx, role }) =>
        expectInTargetAccount(
          readerOf(ctx),
          fx,
          'spaces',
          pick(fx.space, role)
        ),
    },
    'A9.transferInnovationPackToAccount': {
      gate: ['transferInnovationPackToAccount'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesTransferInnovationPackToAccount(
          {
            transferData: {
              innovationPackID: pick(fx.pack, role),
              targetAccountID: fx.targetAccount,
            },
          },
          headers
        ),
      verify: ({ ctx, fx, role }) =>
        expectInTargetAccount(
          readerOf(ctx),
          fx,
          'innovationPacks',
          pick(fx.pack, role)
        ),
    },
    'A9.transferVirtualContributorToAccount': {
      gate: ['transferVirtualContributorToAccount'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesTransferVirtualContributorToAccount(
          {
            transferData: {
              virtualContributorID: pick(fx.vc, role),
              targetAccountID: fx.targetAccount,
            },
          },
          headers
        ),
      verify: ({ ctx, fx, role }) =>
        expectInTargetAccount(
          readerOf(ctx),
          fx,
          'virtualContributors',
          pick(fx.vc, role)
        ),
    },
  },
};
