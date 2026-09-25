import { expect } from 'vitest';
import {
  LicensingCredentialBasedCredentialType,
  LicensingCredentialBasedPlanType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { allowedRoles, CAPABILITIES } from '../../capabilities.data';
import type { PlatformRole } from '../../capabilities.data';
import { rawRead } from '../raw-request';
import type { GroupModule, PerRole, RunContext } from '../types';
import { undoOnFailure } from '../undo-on-failure';

/**
 * A13 — license plan definition. Owner: Platform Settings Admin, who is also
 * the setup actor and the reader.
 *
 * Every plan and rule here is created for the run and carries its runId; no
 * seeded plan or rule is ever touched. The rules grant NO entitlements, so
 * while they exist they change nobody's license.
 *
 * Deleting consumes its target, and `deleteLicensePlan` looks the plan up
 * BEFORE it authorizes — so the negatives aim at the plan / rule that the
 * update positives keep alive.
 */
type A13 = {
  plansToDelete: PerRole;
  rulesToDelete: PerRole;
  /** Never deleted: the update targets, and where every negative aims. */
  planToUpdate: string;
  ruleToUpdate: string;
  /** Marks everything this run created, for the teardown sweep. */
  prefix: string;
  updatedSortOrder: number;
  licensingFrameworkID: string;
};

const DELETE_PLAN_CAPABILITY = CAPABILITIES.find(
  c => c.id === 'A13.deleteLicensePlan'
)!;
const DELETE_RULE_CAPABILITY = CAPABILITIES.find(
  c => c.id === 'A13.adminLicensePolicyDeleteCredentialRule'
)!;

const SORT_ORDER = 9000;
const CREDENTIAL = LicensingCredentialBasedCredentialType.SpaceLicensePlus;

// `credentialType` is deliberately not selected: one seeded rule carries a value
// the GraphQL enum cannot represent, and selecting it fails the whole read.
const FRAMEWORK =
  'query { platform { licensingFramework { id plans { id name sortOrder } policy { credentialRules { id name } } } } }';
const DELETE_PLAN =
  'mutation($id: UUID!) { deleteLicensePlan(deleteData: { ID: $id }) { id } }';
const DELETE_RULE =
  'mutation($id: UUID!) { adminLicensePolicyDeleteCredentialRule(deleteData: { ID: $id }) { id } }';

type Framework = {
  id: string;
  plans: { id: string; name: string; sortOrder: number }[];
  policy: { credentialRules: { id: string; name: string }[] };
};

const settingsAdmin = (ctx: RunContext | Omit<RunContext, 'fixtures'>) =>
  ctx.tokens.PLATFORM_SETTINGS_ADMIN;

const framework = async (token: string): Promise<Framework> =>
  (
    await rawRead<{ platform: { licensingFramework: Framework } }>(
      token,
      FRAMEWORK
    )
  ).platform.licensingFramework;

/** By name, not by id: it also catches a rule that a create-positive made and
 * could not remove itself. */
const sweep = async (token: string, prefix: string): Promise<void> => {
  const { plans, policy } = await framework(token);
  for (const { id } of plans.filter(p => p.name.startsWith(prefix))) {
    await rawRead(token, DELETE_PLAN, { id });
  }
  for (const { id } of policy.credentialRules.filter(r =>
    r.name.startsWith(prefix)
  )) {
    await rawRead(token, DELETE_RULE, { id });
  }
};

const idOf = (data: unknown, field: string): string =>
  (data as Record<string, { id: string }>)[field].id;

export const A13_GROUP: GroupModule<A13> = {
  group: 'A13',

  build: (ctx, sdk) =>
    undoOnFailure(async undo => {
      const headers = { authorization: `Bearer ${settingsAdmin(ctx)}` };
      const prefix = `platform-roles-${ctx.runId}`;
      const licensingFrameworkID = (await framework(settingsAdmin(ctx))).id;
      undo(() => sweep(settingsAdmin(ctx), prefix));

      const plan = async (tag: string) =>
        (
          await sdk.PlatformRolesCreateLicensePlan(
            {
              planData: {
                licensingFrameworkID,
                name: `${prefix}-${tag}`,
                licenseCredential: CREDENTIAL,
                type: LicensingCredentialBasedPlanType.SpacePlan,
                enabled: false,
                isFree: true,
                assignToNewOrganizationAccounts: false,
                assignToNewUserAccounts: false,
                requiresContactSupport: false,
                requiresPaymentMethod: false,
                trialEnabled: false,
                sortOrder: SORT_ORDER,
              },
            },
            headers
          )
        ).data.createLicensePlan.id;

      const rule = async (tag: string) =>
        (
          await sdk.adminLicensePolicyCreateCredentialRule(
            {
              createData: {
                name: `${prefix}-${tag}`,
                credentialType: CREDENTIAL,
                grantedEntitlements: [],
              },
            },
            headers
          )
        ).data.adminLicensePolicyCreateCredentialRule.id;

      const plansToDelete: PerRole = {};
      for (const role of allowedRoles(DELETE_PLAN_CAPABILITY)) {
        plansToDelete[role] = await plan(`plan-delete-${role.slice(-7)}`);
      }
      const rulesToDelete: PerRole = {};
      for (const role of allowedRoles(DELETE_RULE_CAPABILITY)) {
        rulesToDelete[role] = await rule(`rule-delete-${role.slice(-7)}`);
      }

      return {
        plansToDelete,
        rulesToDelete,
        planToUpdate: await plan('plan-update'),
        ruleToUpdate: await rule('rule-update'),
        prefix,
        licensingFrameworkID,
        updatedSortOrder: SORT_ORDER + 1,
      };
    }),

  teardown: (ctx, _sdk, fx) => sweep(settingsAdmin(ctx), fx.prefix),

  invocations: {
    'A13.createLicensePlan': {
      gate: ['createLicensePlan'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesCreateLicensePlan(
          {
            planData: {
              licensingFrameworkID: fx.licensingFrameworkID,
              // Swept by prefix on teardown even if `verify` never runs.
              name: `${fx.prefix}-plan-created-${role.slice(-7)}`,
              licenseCredential: CREDENTIAL,
              type: LicensingCredentialBasedPlanType.SpacePlan,
              enabled: false,
              isFree: true,
              assignToNewOrganizationAccounts: false,
              assignToNewUserAccounts: false,
              requiresContactSupport: false,
              requiresPaymentMethod: false,
              trialEnabled: false,
              sortOrder: SORT_ORDER,
            },
          },
          headers
        ),
      verify: async ({ ctx, data }) => {
        const id = idOf(data, 'createLicensePlan');
        const token = settingsAdmin(ctx);
        expect((await framework(token)).plans.map(p => p.id)).toContain(id);
        await rawRead(token, DELETE_PLAN, { id });
      },
    },
    'A13.deleteLicensePlan': {
      gate: ['deleteLicensePlan'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesDeleteLicensePlan(
          { deleteData: { ID: planToDeleteFor(fx, role) } },
          headers
        ),
      verify: async ({ ctx, fx, role }) =>
        expect(
          (await framework(settingsAdmin(ctx))).plans.map(p => p.id)
        ).not.toContain(planToDeleteFor(fx, role)),
    },
    'A13.updateLicensePlan': {
      gate: ['updateLicensePlan'],
      call: (sdk, headers, fx) =>
        sdk.PlatformRolesUpdateLicensePlan(
          {
            updateData: { ID: fx.planToUpdate, sortOrder: fx.updatedSortOrder },
          },
          headers
        ),
      verify: async ({ ctx, fx }) =>
        expect(
          (await framework(settingsAdmin(ctx))).plans.find(
            p => p.id === fx.planToUpdate
          )?.sortOrder
        ).toBe(fx.updatedSortOrder),
    },
    'A13.adminLicensePolicyDeleteCredentialRule': {
      gate: ['adminLicensePolicyDeleteCredentialRule'],
      call: (sdk, headers, fx, role) =>
        sdk.adminLicensePolicyDeleteCredentialRule(
          { deleteData: { ID: ruleToDeleteFor(fx, role) } },
          headers
        ),
      verify: async ({ ctx, fx, role }) =>
        expect(
          (await framework(settingsAdmin(ctx))).policy.credentialRules.map(
            r => r.id
          )
        ).not.toContain(ruleToDeleteFor(fx, role)),
    },
    'A13.adminLicensePolicyUpdateCredentialRule': {
      gate: ['adminLicensePolicyUpdateCredentialRule'],
      call: (sdk, headers, fx) =>
        sdk.adminLicensePolicyUpdateCredentialRule(
          {
            updateData: {
              ID: fx.ruleToUpdate,
              name: `${fx.prefix}-rule-updated`,
              credentialType: CREDENTIAL,
              grantedEntitlements: [],
            },
          },
          headers
        ),
      verify: async ({ ctx, fx }) =>
        expect(
          (await framework(settingsAdmin(ctx))).policy.credentialRules.find(
            r => r.id === fx.ruleToUpdate
          )?.name
        ).toBe(`${fx.prefix}-rule-updated`),
    },
    'A13.adminLicensePolicyCreateCredentialRule': {
      gate: ['adminLicensePolicyCreateCredentialRule'],
      call: (sdk, headers, fx) =>
        sdk.adminLicensePolicyCreateCredentialRule(
          {
            createData: {
              name: `${fx.prefix}-rule-created`,
              credentialType: CREDENTIAL,
              grantedEntitlements: [],
            },
          },
          headers
        ),
      verify: async ({ ctx, data }) => {
        const id = idOf(data, 'adminLicensePolicyCreateCredentialRule');
        const token = settingsAdmin(ctx);
        expect(
          (await framework(token)).policy.credentialRules.map(r => r.id)
        ).toContain(id);
        await rawRead(token, DELETE_RULE, { id });
      },
    },
  },
};

const planToDeleteFor = (fx: A13, role: PlatformRole): string =>
  fx.plansToDelete[role] ?? fx.planToUpdate;

const ruleToDeleteFor = (fx: A13, role: PlatformRole): string =>
  fx.rulesToDelete[role] ?? fx.ruleToUpdate;
