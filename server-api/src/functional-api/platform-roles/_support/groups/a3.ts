import { expect } from 'vitest';
import { rawRead, rawRequest } from '../raw-request';
import { bearer } from '../types';
import type { GroupModule } from '../types';
import {
  deleteDisposableUsers,
  registerDisposableUser,
} from './disposable-user';
import type { DisposableUser } from './disposable-user';

/**
 * A3 — authorization reset & license-entitlement reset.
 * Owner: Platform Operations Admin.
 *
 * Every entity-scoped reset aims at a throwaway entity built for this group
 * alone: one user, and two organizations. `wipedOrganization` exists only for
 * `authorizationPolicyResetToGlobalAdminsAccess`, which strips a policy down to
 * admin-only access — pointed at anything shared, it breaks whoever shares it.
 *
 * `authorizationPolicyResetAll` and `resetLicenseOnAccounts` are platform-wide:
 * their positives live in the exclusive project. Their negatives run here.
 */
type A3 = {
  user: DisposableUser;
  organizationId: string;
  accountId: string;
  wipedOrganization: { id: string; authorizationId: string };
  platformId: string;
  aiServerId: string;
};

const ORGANIZATION =
  'query($id: UUID!) { lookup { organization(ID: $id) { id account { id } authorization { id } } } }';
type OrganizationRead = {
  lookup: {
    organization: {
      id: string;
      account: { id: string } | null;
      authorization: { id: string } | null;
    } | null;
  };
};

const SINGLETONS = 'query { platform { id } aiServer { id } }';
type SingletonsRead = { platform: { id: string }; aiServer: { id: string } };

const organizationName = (runId: string, tag: string) => ({
  profileData: { displayName: `platform-roles a3 ${tag} ${runId}` },
  nameID: `pr-a3-${tag}-${runId}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 25),
});

const idOf = (data: unknown, field: string): string =>
  (data as Record<string, { id: string }>)[field].id;

export const A3_GROUP: GroupModule<A3> = {
  group: 'A3',

  // Platform Support creates the organizations; Platform Content Full Access is
  // the one role that may read an organization's account.
  build: async (ctx, sdk) => {
    const support = bearer(ctx.tokens.PLATFORM_SUPPORT);
    const make = async (tag: string) => {
      const id = (
        await sdk.PlatformRolesCreateOrganization(
          { organizationData: organizationName(ctx.runId, tag) },
          support
        )
      ).data.createOrganization.id;
      const organization = (
        await rawRead<OrganizationRead>(
          ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS,
          ORGANIZATION,
          { id }
        )
      ).lookup.organization;
      if (!organization?.account?.id || !organization.authorization?.id) {
        throw new Error(
          `A3: Platform Content Full Access could not read the account / authorization id of organization ${id}`
        );
      }
      return {
        id,
        accountId: organization.account.id,
        authorizationId: organization.authorization.id,
      };
    };

    const target = await make('reset');
    const wiped = await make('wiped');
    const singletons = await rawRead<SingletonsRead>(
      ctx.tokens.PLATFORM_OPERATIONS_ADMIN,
      SINGLETONS
    );
    return {
      platformId: singletons.platform.id,
      aiServerId: singletons.aiServer.id,
      user: await registerDisposableUser(ctx.runId, 'a3reset'),
      organizationId: target.id,
      accountId: target.accountId,
      wipedOrganization: {
        id: wiped.id,
        authorizationId: wiped.authorizationId,
      },
    };
  },

  teardown: async (ctx, sdk, fx) => {
    // Put the wiped policy back first: until then nobody but a legacy admin
    // holds DELETE on that organization.
    await sdk.AuthorizationPolicyResetOnOrganization(
      { organizationID: fx.wipedOrganization.id },
      bearer(ctx.tokens.PLATFORM_OPERATIONS_ADMIN)
    );
    const failures: string[] = [];
    for (const id of [fx.organizationId, fx.wipedOrganization.id]) {
      const { errors } = await rawRequest(
        ctx.tokens.PLATFORM_SUPPORT,
        'mutation($id: UUID!) { deleteOrganization(deleteData: { ID: $id }) { id } }',
        { id }
      );
      if (errors.length > 0) failures.push(`${id}: ${errors[0].message}`);
    }
    await deleteDisposableUsers(ctx.tokens.PLATFORM_USERS_ADMIN, [fx.user]);
    if (failures.length > 0) {
      throw new Error(`A3: organizations not deleted — ${failures.join('; ')}`);
    }
  },

  invocations: {
    'A3.authorizationPolicyResetOnPlatform': {
      gate: ['authorizationPolicyResetOnPlatform'],
      call: (sdk, headers) =>
        sdk.authorizationPolicyResetOnPlatform({}, headers),
      verify: async ({ data, fx }) =>
        expect(idOf(data, 'authorizationPolicyResetOnPlatform')).toBe(
          fx.platformId
        ),
    },
    'A3.aiServerAuthorizationPolicyReset': {
      gate: ['aiServerAuthorizationPolicyReset'],
      call: (sdk, headers) => sdk.aiServerAuthorizationPolicyReset({}, headers),
      verify: async ({ data, fx }) =>
        expect(idOf(data, 'aiServerAuthorizationPolicyReset')).toBe(
          fx.aiServerId
        ),
    },
    'A3.authorizationPolicyResetOnUser': {
      gate: ['authorizationPolicyResetOnUser'],
      call: (sdk, headers, fx) =>
        sdk.authorizationPolicyResetOnUser(
          { authorizationResetData: { userID: fx.user.id } },
          headers
        ),
      verify: async ({ data, fx }) =>
        expect(idOf(data, 'authorizationPolicyResetOnUser')).toBe(fx.user.id),
    },
    'A3.authorizationPolicyResetOnOrganization': {
      gate: ['authorizationPolicyResetOnOrganization'],
      call: (sdk, headers, fx) =>
        sdk.AuthorizationPolicyResetOnOrganization(
          { organizationID: fx.organizationId },
          headers
        ),
      verify: async ({ data, fx }) =>
        expect(idOf(data, 'authorizationPolicyResetOnOrganization')).toBe(
          fx.organizationId
        ),
    },
    'A3.authorizationPolicyResetOnAccount': {
      gate: ['authorizationPolicyResetOnAccount'],
      call: (sdk, headers, fx) =>
        sdk.authorizationPolicyResetOnAccount(
          { authorizationResetData: { accountID: fx.accountId } },
          headers
        ),
      verify: async ({ data, fx }) =>
        expect(idOf(data, 'authorizationPolicyResetOnAccount')).toBe(
          fx.accountId
        ),
    },
    'A3.licenseResetOnAccount': {
      gate: ['licenseResetOnAccount'],
      call: (sdk, headers, fx) =>
        sdk.licenseResetOnAccount(
          { resetData: { accountID: fx.accountId } },
          headers
        ),
      verify: async ({ data, fx }) =>
        expect(idOf(data, 'licenseResetOnAccount')).toBe(fx.accountId),
    },
    'A3.authorizationPolicyResetAll': {
      gate: ['authorizationPolicyResetAll'],
      call: (sdk, headers) => sdk.authorizationPolicyResetAll({}, headers),
      // The server answers with the id of the reset task it published.
      verify: async ({ data }) =>
        expect(
          (data as { authorizationPolicyResetAll: string })
            .authorizationPolicyResetAll
        ).toMatch(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/),
    },
    'A3.authorizationPlatformRolesAccessReset': {
      gate: ['authorizationPlatformRolesAccessReset'],
      call: (sdk, headers) =>
        sdk.authorizationPlatformRolesAccessReset({}, headers),
      verify: async ({ data }) =>
        expect(data).toEqual({ authorizationPlatformRolesAccessReset: true }),
    },
    'A3.authorizationPolicyResetToGlobalAdminsAccess': {
      gate: ['authorizationPolicyResetToGlobalAdminsAccess'],
      call: (sdk, headers, fx) =>
        sdk.authorizationPolicyResetToGlobalAdminsAccess(
          { authorizationID: fx.wipedOrganization.authorizationId },
          headers
        ),
      verify: async ({ data, fx }) =>
        expect(idOf(data, 'authorizationPolicyResetToGlobalAdminsAccess')).toBe(
          fx.wipedOrganization.authorizationId
        ),
    },
    'A3.resetLicenseOnAccounts': {
      gate: ['resetLicenseOnAccounts'],
      call: (sdk, headers) => sdk.resetLicenseOnAccounts({}, headers),
      verify: async ({ data }) =>
        expect(data).toEqual({ resetLicenseOnAccounts: true }),
    },
  },
};
