import {
  getUserToken,
  provisionTestIdentities,
  registerTestUser,
  testConfiguration,
} from '@alkemio/tests-lib';
import { rawRead, rawRequest } from '../raw-request';
import type { RunContext } from '../types';

/**
 * An organization whose ACCOUNT owns content — shared by A7 and A8.
 *
 * Who does what, and why:
 *  - Platform Support creates (and finally deletes) the organization: it owns
 *    the organization lifecycle.
 *  - The server makes the CREATOR an admin of the organization, which hands it
 *    ordinary owner CRUD over everything in the account. Left in place, Support
 *    would pass every A8 negative through the owner branch. So Support hands the
 *    organization to a plain registered user — the organization's own admin —
 *    and resigns; from then on it holds nothing here but its platform role.
 *  - Platform License Manager assigns the account plan that entitles the
 *    organization to spaces and innovation packs.
 *  - The organization admin creates the content, as an owner would.
 *  - Platform Content Full Access deletes the content at teardown.
 */
type Ctx = Omit<RunContext, 'fixtures'>;

export type OwnedOrganization = { organizationId: string; accountId: string };

/** Holds no platform role — it only ever acts as the admin of these organizations. */
const ORGANIZATION_ADMIN_USER = 'platformroles.orgadmin';
const ACCOUNT_PLAN = 'ACCOUNT_LICENSE_PLUS';

let organizationAdmin: Promise<{ token: string; id: string }> | undefined;

export const organizationAdminOf = (): Promise<{ token: string; id: string }> =>
  (organizationAdmin ??= (async () => {
    // Same two paths as `seedPlatformRoleUsers`: the Kratos ADMIN API where it
    // is reachable (CI), self-service registration otherwise.
    if (testConfiguration.endPoints.kratos.admin) {
      await provisionTestIdentities([ORGANIZATION_ADMIN_USER]);
    } else if (testConfiguration.registerUsers) {
      await registerTestUser(ORGANIZATION_ADMIN_USER);
    }
    const token = await getUserToken(`${ORGANIZATION_ADMIN_USER}@alkem.io`);
    const me = await rawRead<{
      me: { user: { id: string } };
      platform: { roleSet: { myRoles: string[] } };
    }>(token, 'query { me { user { id } } platform { roleSet { myRoles } } }');
    const extra = me.platform.roleSet.myRoles.filter(r => r !== 'REGISTERED');
    if (extra.length > 0) {
      throw new Error(
        `${ORGANIZATION_ADMIN_USER} must hold no platform role, but holds [${extra.join(', ')}]`
      );
    }
    return { token, id: me.me.user.id };
  })());

/** lowercase a-z0-9-, max 25 */
export const nameId = (...parts: string[]): string =>
  parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 25);

const ROLE = '($roleSet: UUID!, $user: UUID!, $role: RoleName!)';
const ROLE_DATA =
  '(roleData: { roleSetID: $roleSet, actorID: $user, role: $role }) { id }';

export const createOwnedOrganization = async (
  ctx: Ctx,
  tag: string,
  options: { license: boolean } = { license: true }
): Promise<OwnedOrganization> => {
  const support = ctx.tokens.PLATFORM_SUPPORT;
  const admin = await organizationAdminOf();

  const created = await rawRead<{
    createOrganization: { id: string; roleSet: { id: string } };
  }>(
    support,
    'mutation($data: CreateOrganizationInput!) { createOrganization(organizationData: $data) { id roleSet { id } } }',
    {
      data: {
        nameID: nameId('pr', tag, ctx.runId),
        profileData: { displayName: `platform-roles ${tag} ${ctx.runId}` },
      },
    }
  );
  const organizationId = created.createOrganization.id;
  try {
    return await handOver(
      ctx,
      options,
      admin,
      organizationId,
      created.createOrganization.roleSet.id
    );
  } catch (e) {
    // Never leave a half-prepared organization behind: it would be owned by
    // Platform Support and outlive the run.
    await rawRequest(
      support,
      'mutation($id: UUID!) { deleteOrganization(deleteData: { ID: $id }) { id } }',
      { id: organizationId }
    );
    throw e;
  }
};

const handOver = async (
  ctx: Ctx,
  options: { license: boolean },
  admin: { token: string; id: string },
  organizationId: string,
  roleSet: string
): Promise<OwnedOrganization> => {
  const support = ctx.tokens.PLATFORM_SUPPORT;

  await rawRead(support, `mutation${ROLE} { assignRoleToUser${ROLE_DATA} }`, {
    roleSet,
    user: admin.id,
    role: 'ADMIN',
  });
  for (const role of ['ADMIN', 'ASSOCIATE']) {
    await rawRead(
      support,
      `mutation${ROLE} { removeRoleFromUser${ROLE_DATA} }`,
      {
        roleSet,
        user: ctx.userIds.PLATFORM_SUPPORT,
        role,
      }
    );
  }

  const { lookup } = await rawRead<{
    lookup: { organization: { account: { id: string } } };
  }>(
    admin.token,
    'query($id: UUID!) { lookup { organization(ID: $id) { account { id } } } }',
    { id: organizationId }
  );
  const accountId = lookup.organization.account.id;
  // A bare organization (nothing will be hosted on it) needs no plan.
  if (!options.license) return { organizationId, accountId };

  const licenseManager = ctx.tokens.PLATFORM_LICENSE_MANAGER;
  const { platform } = await rawRead<{
    platform: {
      licensingFramework: {
        id: string;
        plans: { id: string; licenseCredential: string }[];
      };
    };
  }>(
    licenseManager,
    'query { platform { licensingFramework { id plans { id licenseCredential } } } }'
  );
  const plan = platform.licensingFramework.plans.find(
    p => p.licenseCredential === ACCOUNT_PLAN
  );
  if (!plan) {
    throw new Error(`organization content: no ${ACCOUNT_PLAN} license plan`);
  }
  await rawRead(
    licenseManager,
    'mutation($data: AssignLicensePlanToAccount!) { assignLicensePlanToAccount(planData: $data) { id } }',
    {
      data: {
        accountID: accountId,
        licensePlanID: plan.id,
        licensingID: platform.licensingFramework.id,
      },
    }
  );

  return { organizationId, accountId };
};

export const createPack = async (
  accountId: string,
  name: string
): Promise<{ packId: string; templatesSetId: string }> => {
  const { createInnovationPack: pack } = await rawRead<{
    createInnovationPack: { id: string; templatesSet: { id: string } };
  }>(
    (await organizationAdminOf()).token,
    'mutation($data: CreateInnovationPackOnAccountInput!) { createInnovationPack(innovationPackData: $data) { id templatesSet { id } } }',
    {
      data: {
        accountID: accountId,
        nameID: nameId(name),
        profileData: { displayName: name },
      },
    }
  );
  return { packId: pack.id, templatesSetId: pack.templatesSet.id };
};

/**
 * THE ONE EXCEPTION to "setup actors are target roles". `createInnovationHub`
 * is gated on CREATE_INNOVATION_HUB, which the account policy grants to the
 * legacy global admin / support / license-manager credentials only — no target
 * role and no organization admin holds it, so nobody else CAN create a hub.
 * The bootstrap account still carries the legacy credential at Slice A.
 */
export const createHubAsLegacyAdmin = async (
  ctx: Ctx,
  accountId: string,
  name: string
): Promise<string> =>
  (
    await rawRead<{ createInnovationHub: { id: string } }>(
      ctx.bootstrapToken,
      'mutation($data: CreateInnovationHubOnAccountInput!) { createInnovationHub(createData: $data) { id } }',
      {
        data: {
          accountID: accountId,
          type: 'LIST',
          spaceListFilter: [],
          nameID: nameId(name),
          subdomain: nameId(name),
          profileData: { displayName: name },
        },
      }
    )
  ).createInnovationHub.id;

/** A minimal L0 space: no tutorial callouts, nothing beneath it. */
export const createSpace = async (
  accountId: string,
  name: string
): Promise<{ spaceId: string; calloutsSetId: string }> => {
  const { token } = await organizationAdminOf();
  // `{ id }` only: the new space's policy is not applied yet while the
  // mutation's own response is resolved.
  const { createSpace: space } = await rawRead<{ createSpace: { id: string } }>(
    token,
    'mutation($data: CreateSpaceOnAccountInput!) { createSpace(spaceData: $data) { id } }',
    {
      data: {
        accountID: accountId,
        nameID: nameId(name),
        about: { profileData: { displayName: name } },
        collaborationData: { addTutorialCallouts: false, calloutsSetData: {} },
      },
    }
  );
  const { lookup } = await rawRead<{
    lookup: { space: { collaboration: { calloutsSet: { id: string } } } };
  }>(
    token,
    'query($id: UUID!) { lookup { space(ID: $id) { collaboration { calloutsSet { id } } } } }',
    { id: space.id }
  );
  return {
    spaceId: space.id,
    calloutsSetId: lookup.space.collaboration.calloutsSet.id,
  };
};

export const createCallout = async (
  calloutsSetId: string,
  displayName: string
): Promise<string> =>
  (
    await rawRead<{ createCalloutOnCalloutsSet: { id: string } }>(
      (await organizationAdminOf()).token,
      'mutation($data: CreateCalloutOnCalloutsSetInput!) { createCalloutOnCalloutsSet(calloutData: $data) { id } }',
      {
        data: {
          calloutsSetID: calloutsSetId,
          framing: { profile: { displayName } },
          settings: {
            visibility: 'PUBLISHED',
            contribution: {
              enabled: true,
              allowedTypes: ['POST'],
              canAddContributions: 'MEMBERS',
            },
          },
        },
      }
    )
  ).createCalloutOnCalloutsSet.id;

const REMOVE = {
  pack: 'mutation($id: UUID!) { deleteInnovationPack(deleteData: { ID: $id }) { id } }',
  hub: 'mutation($id: UUID!) { deleteInnovationHub(deleteData: { ID: $id }) { id } }',
  space: 'mutation($id: UUID!) { deleteSpace(deleteData: { ID: $id }) { id } }',
  organization:
    'mutation($id: UUID!) { deleteOrganization(deleteData: { ID: $id }) { id } }',
} as const;

/**
 * Removes the content, then the organization (the server refuses to delete an
 * organization whose account still holds resources). Something a positive
 * already deleted answers ENTITY_NOT_FOUND — expected; anything else is
 * collected and thrown, so residue is reported.
 */
export const removeOwnedOrganization = async (
  ctx: Ctx,
  organizationId: string,
  content: { packs: string[]; hubs: string[]; spaces: string[] }
): Promise<void> => {
  const contentAdmin = ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS;
  const steps: [keyof typeof REMOVE, string, string][] = [
    ...content.packs.map(
      id => ['pack', contentAdmin, id] as [keyof typeof REMOVE, string, string]
    ),
    ...content.hubs.map(
      id => ['hub', contentAdmin, id] as [keyof typeof REMOVE, string, string]
    ),
    ...content.spaces.map(
      id => ['space', contentAdmin, id] as [keyof typeof REMOVE, string, string]
    ),
    ['organization', ctx.tokens.PLATFORM_SUPPORT, organizationId],
  ];
  const residue: string[] = [];
  for (const [kind, token, id] of steps) {
    const { errors } = await rawRequest(token, REMOVE[kind], { id });
    const real = errors.filter(e => e.extensions?.code !== 'ENTITY_NOT_FOUND');
    if (real.length > 0) residue.push(`${kind} ${id}: ${real[0].message}`);
  }
  if (residue.length > 0) throw new Error(residue.join(' | '));
};

/**
 * The creator of an organization becomes its ADMIN and ASSOCIATE, and the server
 * does NOT revoke those credentials when the organization is deleted — they pile
 * up on the creator forever. So a creator steps down before its organization is
 * removed.
 */
export const resignFromOrganization = async (
  token: string,
  userId: string,
  organizationId: string
): Promise<void> => {
  const { lookup } = await rawRead<{
    lookup: { organization: { roleSet: { id: string } } };
  }>(
    token,
    'query($id: UUID!) { lookup { organization(ID: $id) { roleSet { id } } } }',
    { id: organizationId }
  );
  for (const role of ['ADMIN', 'ASSOCIATE']) {
    await rawRead(token, `mutation${ROLE} { removeRoleFromUser${ROLE_DATA} }`, {
      roleSet: lookup.organization.roleSet.id,
      user: userId,
      role,
    });
  }
};
