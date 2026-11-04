import { expect } from 'vitest';
import { rawRequest } from '../raw-request';
import { allowedRoles, CAPABILITIES } from '../../capabilities.data';
import type { PlatformRole } from '../../capabilities.data';
import type { GroupModule, PerRole } from '../types';
import {
  createOwnedOrganization,
  resignFromOrganization,
} from './organization-content';

/**
 * A6 — create / delete an organization.
 *   create: Platform Support, Feature Organization Creator
 *   delete: Platform Support, and Platform Content Full Access (SC-004 exception)
 *
 * One deletable organization PER ALLOWED ROLE, built up front: two roles never
 * race on one target, and a negative that (wrongly) succeeded cannot starve a
 * later positive of its target.
 */
type A6 = {
  deleteTargets: PerRole;
  /** Negatives aim here; it must still exist at teardown. */
  denyTarget: string;
};

const DELETE = CAPABILITIES.find(c => c.id === 'A6.deleteOrganization')!;
const ORG_EXISTS =
  'query($id: UUID!) { lookup { organization(ID: $id) { id } } }';

/** nameID: lowercase alphanumerics and hyphens only, max 25 — sanitised HERE so
 * no caller can turn a negative into a BAD_USER_INPUT by accident. */
const orgName = (runId: string, tag: string) => ({
  profileData: { displayName: `platform-roles ${tag} ${runId}` },
  nameID: `pr-${tag}-${runId}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 25),
});

const exists = async (token: string, id: string): Promise<boolean> => {
  const { data } = await rawRequest<{
    lookup: { organization: { id: string } | null };
  }>(token, ORG_EXISTS, { id });
  return Boolean(data?.lookup?.organization?.id);
};

/** Organizations created by the create-positives, so teardown can remove them. */
const created: string[] = [];

export const A6_GROUP: GroupModule<A6> = {
  group: 'A6',

  // Organizations are created by Platform Support, which owns their lifecycle —
  // and then handed to a neutral admin, with Support stepping down. Otherwise
  // Support would be the OWNER of every target and its delete-positive would
  // pass through ownership instead of through its own DELETE_ORGANIZATION
  // privilege (the thing under test).
  build: async ctx => {
    const make = async (tag: string) =>
      (await createOwnedOrganization(ctx, tag, { license: false }))
        .organizationId;

    const deleteTargets: PerRole = {};
    for (const role of allowedRoles(DELETE)) {
      deleteTargets[role] = await make(`a6del-${role.slice(-6)}`);
    }
    return { deleteTargets, denyTarget: await make('a6deny') };
  },

  teardown: async (ctx, sdk, fx) => {
    const support = { authorization: `Bearer ${ctx.tokens.PLATFORM_SUPPORT}` };
    const leftovers = [
      fx.denyTarget,
      ...Object.values(fx.deleteTargets),
      ...created,
    ].filter((id): id is string => Boolean(id));
    for (const id of leftovers) {
      if (await exists(ctx.tokens.PLATFORM_SUPPORT, id)) {
        await sdk.deleteOrganization({ deleteData: { ID: id } }, support);
      }
    }
  },

  invocations: {
    'A6.createOrganization': {
      gate: ['createOrganization'],
      call: (sdk, headers, _fx, role) =>
        sdk.PlatformRolesCreateOrganization(
          {
            organizationData: orgName(
              `${Date.now().toString(36)}`,
              `new-${role.slice(-6)}`
            ),
          },
          headers
        ),
      verify: async ({ ctx, data, caller }) => {
        const id = (data as { createOrganization: { id: string } })
          .createOrganization.id;
        created.push(id);
        expect(await exists(ctx.tokens.PLATFORM_SUPPORT, id)).toBe(true);
        await resignFromOrganization(caller.token, caller.id, id);
        // Clean up here rather than at teardown: role files run in separate
        // workers, and `created` is per-worker memory.
        await sdkDelete(ctx.tokens.PLATFORM_SUPPORT, id);
      },
    },
    'A6.deleteOrganization': {
      gate: ['deleteOrganization'],
      call: (sdk, headers, fx, role) =>
        sdk.deleteOrganization(
          { deleteData: { ID: targetFor(fx, role) } },
          headers
        ),
      verify: async ({ ctx, fx, role }) =>
        expect(
          await exists(ctx.tokens.PLATFORM_SUPPORT, targetFor(fx, role))
        ).toBe(false),
    },
  },
};

const targetFor = (fx: A6, role: PlatformRole): string =>
  fx.deleteTargets[role] ?? fx.denyTarget;

const sdkDelete = async (token: string, id: string): Promise<void> => {
  const { errors } = await rawRequest(
    token,
    'mutation($id: UUID!) { deleteOrganization(deleteData: { ID: $id }) { id } }',
    { id }
  );
  if (errors.length > 0) {
    throw new Error(
      `A6 cleanup: could not delete organization ${id}: ${errors[0].message}`
    );
  }
};
