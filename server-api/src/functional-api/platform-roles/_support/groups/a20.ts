import { expect } from 'vitest';
import {
  AuthorizationCredential,
  CredentialType,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import type { PlatformRole } from '../../capabilities.data';
import { bearer } from '../types';
import type { GroupModule, Invocation } from '../types';
import { buildWithProbes, deleteProbeOrganizations } from './probes';

/**
 * A20 / A20b — read the holder lists. The same six surfaces, gated by the
 * PAYLOAD: a Platform role needs Platform Roles Admin or Platform Audit Reader;
 * a Feature role also admits Platform Users Admin.
 *
 * Every positive must find a KNOWN holder, so a resolver that always answers
 * `[]` fails. Known users are the single-role fixtures. The known organization
 * is built here; organizations can only ever hold a Feature role.
 */
type HolderLists = { organizationId: string };

type Payload = {
  group: 'A20' | 'A20b';
  userRole: PlatformRole;
  /** The role the four role-set fields are asked about. */
  role: RoleName;
  credential: CredentialType;
  authorizationCredential: AuthorizationCredential;
};

const ORGANIZATION_ROLE = RoleName.FeatureOrganizationCreator;

const ids = (rows: { id: string }[]): string[] => rows.map(row => row.id);

const holderLists = ({
  group,
  userRole,
  role,
  credential,
  authorizationCredential,
}: Payload): GroupModule<HolderLists> => {
  const isPlatformPayload = group === 'A20';
  // Asking about a Platform role keeps the call behind the Platform gate; the
  // Feature role alongside it is what returns the known organization.
  const organizationRoles = isPlatformPayload
    ? [role, ORGANIZATION_ROLE]
    : [ORGANIZATION_ROLE];

  const invocations: Record<string, Invocation<HolderLists>> = {
    usersInRole: {
      gate: ['platform', 'roleSet', 'usersInRole'],
      call: (sdk, headers) => sdk.platformRoleSetUsersInRole({ role }, headers),
      verify: async ({ ctx, data }) =>
        expect(
          ids(
            (
              data as {
                platform: { roleSet: { usersInRole: { id: string }[] } };
              }
            ).platform.roleSet.usersInRole
          )
        ).toContain(ctx.userIds[userRole]),
    },
    usersInRoles: {
      gate: ['platform', 'roleSet', 'usersInRoles'],
      call: (sdk, headers) =>
        sdk.platformRoleSetUsersInRoles({ roles: [role] }, headers),
      verify: async ({ ctx, data }) => {
        const rows = (
          data as {
            platform: {
              roleSet: {
                usersInRoles: { role: RoleName; users: { id: string }[] }[];
              };
            };
          }
        ).platform.roleSet.usersInRoles;
        expect(rows.map(row => row.role)).toEqual([role]);
        expect(ids(rows[0].users)).toContain(ctx.userIds[userRole]);
      },
    },
    organizationsInRole: {
      gate: ['platform', 'roleSet', 'organizationsInRole'],
      call: (sdk, headers) =>
        sdk.platformRoleSetOrganizationsInRole(
          { role: isPlatformPayload ? role : ORGANIZATION_ROLE },
          headers
        ),
      verify: async ({ fx, data }) => {
        const organizations = ids(
          (
            data as {
              platform: { roleSet: { organizationsInRole: { id: string }[] } };
            }
          ).platform.roleSet.organizationsInRole
        );
        // No organization can hold a Platform role, so the only honest
        // expectation for that payload is the empty list.
        if (isPlatformPayload) expect(organizations).toEqual([]);
        else expect(organizations).toContain(fx.organizationId);
      },
    },
    organizationsInRoles: {
      gate: ['platform', 'roleSet', 'organizationsInRoles'],
      call: (sdk, headers) =>
        sdk.platformRoleSetOrganizationsInRoles(
          { roles: organizationRoles },
          headers
        ),
      verify: async ({ fx, data }) => {
        const rows = (
          data as {
            platform: {
              roleSet: {
                organizationsInRoles: {
                  role: RoleName;
                  organizations: { id: string }[];
                }[];
              };
            };
          }
        ).platform.roleSet.organizationsInRoles;
        expect(rows.map(row => row.role)).toEqual(organizationRoles);
        expect(ids(rows[rows.length - 1].organizations)).toContain(
          fx.organizationId
        );
      },
    },
    actorsWithCredential: {
      gate: ['actorsWithCredential'],
      call: (sdk, headers) =>
        sdk.actorsWithCredential({ credentialType: credential }, headers),
      verify: async ({ ctx, data }) =>
        expect(
          ids(
            (data as { actorsWithCredential: { id: string }[] })
              .actorsWithCredential
          )
        ).toContain(ctx.userIds[userRole]),
    },
    usersWithAuthorizationCredential: {
      gate: ['usersWithAuthorizationCredential'],
      call: (sdk, headers) =>
        sdk.usersWithAuthorizationCredential(
          { credentialsCriteriaData: { type: authorizationCredential } },
          headers
        ),
      verify: async ({ ctx, data }) =>
        expect(
          ids(
            (data as { usersWithAuthorizationCredential: { id: string }[] })
              .usersWithAuthorizationCredential
          )
        ).toContain(ctx.userIds[userRole]),
    },
  };

  return {
    group,

    build: (ctx, sdk) =>
      buildWithProbes(ctx, sdk, async probes => {
        const organizationId = await probes.organization(group.toLowerCase());
        await sdk.assignPlatformRoleToOrganization(
          { roleData: { actorID: organizationId, role: ORGANIZATION_ROLE } },
          bearer(ctx.tokens.PLATFORM_ROLES_ADMIN)
        );
        return { organizationId };
      }),

    teardown: (ctx, sdk, fx) =>
      deleteProbeOrganizations(ctx, sdk, [fx.organizationId]),

    invocations: Object.fromEntries(
      Object.entries(invocations).map(([surface, invocation]) => [
        `${group}.${surface}`,
        invocation,
      ])
    ),
  };
};

export const A20_GROUP = holderLists({
  group: 'A20',
  userRole: 'PLATFORM_ROLES_ADMIN',
  role: RoleName.PlatformRolesAdmin,
  credential: CredentialType.PlatformRolesAdmin,
  authorizationCredential: AuthorizationCredential.PlatformRolesAdmin,
});

export const A20B_GROUP = holderLists({
  group: 'A20b',
  userRole: 'FEATURE_BETA_TESTER',
  role: RoleName.FeatureBetaTester,
  credential: CredentialType.FeatureBetaTester,
  authorizationCredential: AuthorizationCredential.FeatureBetaTester,
});
