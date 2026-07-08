/**
 * Shared fixture for the public/private ancestry parity matrix (FR-019 /
 * SC-009 — workspace feature 017-combined-subspace-application).
 *
 * Builds a Root (L0) -> Sub (L1) -> SubSub (L2) hierarchy via
 * `TestScenarioFactory.createBaseScenario`'s recursive `space.subspace.subspace`
 * config, each level carrying its own `settings.privacy.mode` +
 * `settings.membership.policy`. Consumed by both
 * `application-hierarchy-parity.it-spec.ts` and
 * `invitation-hierarchy-parity.it-spec.ts` so the two flows are exercised
 * against an identical hierarchy shape.
 *
 * Hooks that build a hierarchy are heavy (org + 3 spaces via the real API),
 * so each test.each row builds and tears down its own scenario inside the
 * test body rather than relying on a single shared `beforeAll` — this keeps
 * every cell independent (no cross-cell contamination) at the cost of one
 * scenario per cell. Callers should pass a generous per-test timeout (see
 * `HIERARCHY_TEST_TIMEOUT_MS`).
 */
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { TestScenarioConfig, TestScenarioFactory } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { getRoleSetUsersInMemberRole } from '@functional-api/roleset/roleset.request.params';

/**
 * Per-test budget. Each cell builds an org + 3 spaces via the real API, so it
 * needs the same generous budget the rest of the integration suite gets —
 * match the global 30-minute testTimeout (a per-test timeout OVERRIDES the
 * global one, so a smaller value here would LOWER the budget, not raise it).
 */
export const HIERARCHY_TEST_TIMEOUT_MS = 1_800_000; // 30 minutes, = global testTimeout

/**
 * The combined application flow's rejection for a non-eligible
 * non-parent-member applicant. Two legitimate rejection layers exist —
 * negative cells assert one of THESE (not merely that some error occurred,
 * so a scenario-setup failure or an unrelated 500 cannot green-light a cell):
 * - authorization: the APPLY privilege is not exposed on the subspace
 *   role-set (the privilege is the client's single trusted signal, so
 *   ineligible applicants are stopped here first);
 * - precondition: today's "join the parent first" rule inside the mutation
 *   (defence in depth, e.g. authorisation revoked between exposure and call).
 */
export const COMBINED_FLOW_REJECTION =
  /not a member of the parent Community|Authorization: unable to grant 'roleset-entry-role-apply'/i;

/**
 * Tear down a scenario without masking an in-flight test failure: a throw
 * inside `finally` REPLACES the original assertion error (JS semantics), so a
 * flaky teardown would otherwise hide the real reason a cell failed.
 */
export const cleanupScenarioSafely = async (
  scenario: OrganizationWithSpaceModel
): Promise<void> => {
  try {
    await TestScenarioFactory.cleanUpBaseScenario(scenario);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      `hierarchy-parity: scenario cleanup failed (original test outcome preserved): ${e}`
    );
  }
};

export interface PrivacyCombo {
  /** Root (L0) Space privacy mode. */
  spacePrivacy: SpacePrivacyMode;
  /** Sub (L1) Subspace privacy mode — the immediate ancestor of SubSub. */
  subspacePrivacy: SpacePrivacyMode;
  /** SubSub (L2) Sub-subspace privacy mode — the application/invitation target. */
  subsubspacePrivacy: SpacePrivacyMode;
}

const { Public, Private } = SpacePrivacyMode;

/**
 * The full 2x2x2 public/private matrix across Root -> Sub -> SubSub
 * (FR-019 / SC-009 / research R5).
 */
export const PRIVACY_COMBOS: PrivacyCombo[] = [
  { spacePrivacy: Public, subspacePrivacy: Public, subsubspacePrivacy: Public },
  // (ALL_PUBLIC_COMBO below aliases this first entry — keep it first.)
  {
    spacePrivacy: Public,
    subspacePrivacy: Public,
    subsubspacePrivacy: Private,
  },
  {
    spacePrivacy: Public,
    subspacePrivacy: Private,
    subsubspacePrivacy: Public,
  },
  {
    spacePrivacy: Public,
    subspacePrivacy: Private,
    subsubspacePrivacy: Private,
  },
  {
    spacePrivacy: Private,
    subspacePrivacy: Public,
    subsubspacePrivacy: Public,
  },
  {
    spacePrivacy: Private,
    subspacePrivacy: Public,
    subsubspacePrivacy: Private,
  },
  {
    spacePrivacy: Private,
    subspacePrivacy: Private,
    subsubspacePrivacy: Public,
  },
  {
    spacePrivacy: Private,
    subspacePrivacy: Private,
    subsubspacePrivacy: Private,
  },
];

/**
 * Canonical baseline for non-matrix guard tests (setting-off, reject,
 * removal-cascade, single-hop): the all-public cell, named explicitly so the
 * guards do not depend on PRIVACY_COMBOS array ordering.
 */
export const ALL_PUBLIC_COMBO: PrivacyCombo = PRIVACY_COMBOS[0];

/**
 * Membership check shared by every parity assertion: is the given user a
 * MEMBER of the role-set? (Centralised here — the specs previously duplicated
 * this helper four times.)
 */
export const isUserMemberOfRoleSet = async (
  roleSetId: string,
  userId: string
): Promise<boolean> => {
  const members = await getRoleSetUsersInMemberRole(roleSetId);
  return members.some(m => m.id === userId);
};

/**
 * FR-002 reachability precondition for the combined (application) flow: the
 * ancestor chain — Root and Sub, i.e. every ancestor of the SubSub target up
 * to the reachable root — must be public. Per the cross-repo contract (plan.md
 * "Cross-repo overview": `parent(+ancestors) PUBLIC`), the SubSub's *own*
 * privacy is not part of this gate — it is varied independently in the matrix
 * precisely to prove it has no bearing on the ancestor-grant outcome.
 */
export const isAncestorChainPublic = (combo: PrivacyCombo): boolean =>
  combo.spacePrivacy === Public && combo.subspacePrivacy === Public;

/**
 * Type-correct expected outcome for the application (combined) flow per
 * FR-002/FR-003: the full ancestor grant (Sub + Root, in addition to SubSub
 * itself) fires only when the whole ancestor chain is public AND the
 * `allowSubspaceAdminsToInviteMembers` setting is enabled on that chain.
 */
export const expectCombinedAncestryGrant = (
  combo: PrivacyCombo,
  settingEnabled: boolean
): boolean => isAncestorChainPublic(combo) && settingEnabled;

export const comboLabel = (combo: PrivacyCombo): string =>
  `space=${combo.spacePrivacy}/subspace=${combo.subspacePrivacy}/subsubspace=${combo.subsubspacePrivacy}`;

/**
 * Builds the `TestScenarioConfig` for one matrix cell: Root -> Sub -> SubSub,
 * each with its own privacy mode; SubSub carries `membershipPolicy` (the
 * application suite uses `Applications`, the invitation suite doesn't need a
 * particular policy since invitations are admin-authorised directly). The
 * `allowSubspaceAdminsToInviteMembers` setting is applied uniformly to Root
 * and Sub — the two ancestors whose setting gates the combined grant per the
 * spec's single-scalar `settingEnabled` axis.
 */
export const buildHierarchyScenarioConfig = (
  name: string,
  combo: PrivacyCombo,
  opts: {
    subsubspaceMembershipPolicy?: CommunityMembershipPolicy;
    settingEnabled: boolean;
  }
): TestScenarioConfig => ({
  name,
  space: {
    collaboration: { addTutorialCallouts: false },
    settings: {
      privacy: { mode: combo.spacePrivacy },
      membership: {
        allowSubspaceAdminsToInviteMembers: opts.settingEnabled,
      },
    },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      settings: {
        privacy: { mode: combo.subspacePrivacy },
        membership: {
          allowSubspaceAdminsToInviteMembers: opts.settingEnabled,
        },
      },
      subspace: {
        collaboration: { addTutorialCallouts: false },
        settings: {
          privacy: { mode: combo.subsubspacePrivacy },
          membership: opts.subsubspaceMembershipPolicy
            ? { policy: opts.subsubspaceMembershipPolicy }
            : undefined,
        },
      },
    },
  },
});
