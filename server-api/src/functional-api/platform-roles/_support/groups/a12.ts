import { expect } from 'vitest';
import {
  createHostedSpace,
  planIdByName,
  spaceHost,
  removeDisposableUser,
} from '../disposable-user';
import type { DisposableUser } from '../disposable-user';
import { rawRead, rawRequest } from '../raw-request';
import type { GroupModule } from '../types';
import { undoOnFailure } from '../undo-on-failure';

/**
 * A12 — license usage. Owner: Platform License Manager.
 *
 * Assign and revoke never share a target, so neither positive depends on the
 * other having run: the ASSIGN targets start without the plan, the REVOKE
 * targets were given theirs in `build()`.
 *   account plan  assign → the organization's account · revoke → the host's account
 *   space plan    assign → SPACE_LICENSE_PREMIUM       · revoke → SPACE_LICENSE_PLUS
 */
type A12 = {
  host: DisposableUser;
  spaceId: string;
  organizationId: string;
  organizationAccountId: string;
  accountPlanId: string;
  spacePlanToAssignId: string;
  spacePlanToRevokeId: string;
  baselineInnovationPacks: number;
};

const ACCOUNT_PLAN = 'ACCOUNT_LICENSE_PLUS';
const SPACE_PLAN_TO_ASSIGN = 'SPACE_LICENSE_PREMIUM';
const SPACE_PLAN_TO_REVOKE = 'SPACE_LICENSE_PLUS';

const ACCOUNT =
  'query($id: UUID!) { lookup { account(ID: $id) { subscriptions { name } baselineLicensePlan { innovationPacks } } } }';
const SPACE =
  'query($id: UUID!) { lookup { space(ID: $id) { subscriptions { name } } } }';
const CREATE_ORGANIZATION =
  'mutation($organizationData: CreateOrganizationInput!) { createOrganization(organizationData: $organizationData) { id } }';
const ORGANIZATION =
  'query($id: UUID!) { lookup { organization(ID: $id) { id account { id } } } }';
const DELETE_ORGANIZATION =
  'mutation($id: UUID!) { deleteOrganization(deleteData: { ID: $id }) { id } }';
const ASSIGN_ACCOUNT_PLAN =
  'mutation($planData: AssignLicensePlanToAccount!) { assignLicensePlanToAccount(planData: $planData) { id } }';
const ASSIGN_SPACE_PLAN =
  'mutation($planData: AssignLicensePlanToSpace!) { assignLicensePlanToSpace(planData: $planData) { id } }';

type AccountRead = {
  lookup: {
    account: {
      subscriptions: { name: string }[];
      baselineLicensePlan: { innovationPacks: number };
    };
  };
};

const account = async (token: string, id: string) =>
  (await rawRead<AccountRead>(token, ACCOUNT, { id })).lookup.account;

const accountPlans = async (token: string, id: string) =>
  (await account(token, id)).subscriptions.map(s => s.name);

const spacePlans = async (token: string, id: string) =>
  (
    await rawRead<{ lookup: { space: { subscriptions: { name: string }[] } } }>(
      token,
      SPACE,
      { id }
    )
  ).lookup.space.subscriptions.map(s => s.name);

const organization = async (token: string, id: string) =>
  (
    await rawRequest<{
      lookup: { organization: { id: string; account: { id: string } } | null };
    }>(token, ORGANIZATION, { id })
  ).data?.lookup?.organization;

const removeOrganization = async (token: string, id: string) => {
  if (await organization(token, id)) {
    await rawRead(token, DELETE_ORGANIZATION, { id });
  }
};

export const A12_GROUP: GroupModule<A12> = {
  group: 'A12',

  build: ctx =>
    undoOnFailure(async undo => {
      const licenseManager = ctx.tokens.PLATFORM_LICENSE_MANAGER;
      const support = ctx.tokens.PLATFORM_SUPPORT;

      const host = await spaceHost(ctx);
      undo(() => removeDisposableUser(ctx, host));
      const spaceId = await createHostedSpace(ctx, host, 'license');

      // Platform Support owns the organization lifecycle.
      const { createOrganization } = await rawRead<{
        createOrganization: { id: string };
      }>(support, CREATE_ORGANIZATION, {
        organizationData: {
          nameID: `pr-license-${ctx.runId}`.slice(0, 25),
          profileData: { displayName: `platform-roles license ${ctx.runId}` },
        },
      });
      const organizationId = createOrganization.id;
      undo(() => removeOrganization(support, organizationId));
      const organizationAccountId = (
        await organization(support, organizationId)
      )?.account.id;
      if (!organizationAccountId) {
        throw new Error(
          `A12: organization ${organizationId} exposes no account`
        );
      }

      // The REVOKE targets get their plans here.
      const accountPlanId = await planIdByName(licenseManager, ACCOUNT_PLAN);
      await rawRead(licenseManager, ASSIGN_ACCOUNT_PLAN, {
        planData: { accountID: host.accountId, licensePlanID: accountPlanId },
      });
      const spacePlanToRevokeId = await planIdByName(
        licenseManager,
        SPACE_PLAN_TO_REVOKE
      );
      await rawRead(licenseManager, ASSIGN_SPACE_PLAN, {
        planData: { spaceID: spaceId, licensePlanID: spacePlanToRevokeId },
      });

      return {
        host,
        spaceId,
        organizationId,
        organizationAccountId,
        accountPlanId,
        spacePlanToAssignId: await planIdByName(
          licenseManager,
          SPACE_PLAN_TO_ASSIGN
        ),
        spacePlanToRevokeId,
        baselineInnovationPacks:
          (await account(licenseManager, organizationAccountId))
            .baselineLicensePlan.innovationPacks + 1,
      };
    }),

  teardown: async (ctx, _sdk, fx) => {
    await removeOrganization(ctx.tokens.PLATFORM_SUPPORT, fx.organizationId);
    await removeDisposableUser(ctx, fx.host);
  },

  invocations: {
    'A12.createWingbackAccount': {
      gate: ['createWingbackAccount'],
      call: (sdk, headers, fx) =>
        sdk.createWingbackAccount({ accountID: fx.host.accountId }, headers),
      // Past the gate the resolver talks to Wingback: switched off it answers
      // "not enabled", switched on without a reachable tenant it answers that
      // the customer could not be created.
      acceptFailure:
        /^[A-Z_]+: (Wingback is not enabled|Error while creating Wingback customer)$/,
    },
    'A12.assignLicensePlanToAccount': {
      gate: ['assignLicensePlanToAccount'],
      call: (sdk, headers, fx) =>
        sdk.PlatformRolesAssignLicensePlanToAccount(
          {
            planData: {
              accountID: fx.organizationAccountId,
              licensePlanID: fx.accountPlanId,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx }) =>
        expect(
          await accountPlans(
            ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS,
            fx.organizationAccountId
          )
        ).toContain(ACCOUNT_PLAN),
    },
    'A12.assignLicensePlanToSpace': {
      gate: ['assignLicensePlanToSpace'],
      call: (sdk, headers, fx) =>
        sdk.PlatformRolesAssignLicensePlanToSpace(
          {
            planData: {
              spaceID: fx.spaceId,
              licensePlanID: fx.spacePlanToAssignId,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx }) =>
        expect(
          await spacePlans(ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS, fx.spaceId)
        ).toContain(SPACE_PLAN_TO_ASSIGN),
    },
    'A12.revokeLicensePlanFromAccount': {
      gate: ['revokeLicensePlanFromAccount'],
      call: (sdk, headers, fx) =>
        sdk.PlatformRolesRevokeLicensePlanFromAccount(
          {
            planData: {
              accountID: fx.host.accountId,
              licensePlanID: fx.accountPlanId,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx }) =>
        expect(
          await accountPlans(
            ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS,
            fx.host.accountId
          )
        ).not.toContain(ACCOUNT_PLAN),
    },
    'A12.revokeLicensePlanFromSpace': {
      gate: ['revokeLicensePlanFromSpace'],
      call: (sdk, headers, fx) =>
        sdk.PlatformRolesRevokeLicensePlanFromSpace(
          {
            planData: {
              spaceID: fx.spaceId,
              licensePlanID: fx.spacePlanToRevokeId,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx }) =>
        expect(
          await spacePlans(ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS, fx.spaceId)
        ).not.toContain(SPACE_PLAN_TO_REVOKE),
    },
    'A12.updateBaselineLicensePlanOnAccount': {
      gate: ['updateBaselineLicensePlanOnAccount'],
      call: (sdk, headers, fx) =>
        sdk.updateBaselineLicensePlanOnAccount(
          {
            updateData: {
              accountID: fx.organizationAccountId,
              innovationPacks: fx.baselineInnovationPacks,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx }) =>
        expect(
          (
            await account(
              ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS,
              fx.organizationAccountId
            )
          ).baselineLicensePlan.innovationPacks
        ).toBe(fx.baselineInnovationPacks),
    },
  },
};
