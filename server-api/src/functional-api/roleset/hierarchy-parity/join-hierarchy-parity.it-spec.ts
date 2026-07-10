/**
 * API/integration parity suite — direct-join (combined) flow.
 *
 * Workspace feature `017-combined-subspace-application` round 2 (US4 /
 * FR-022..FR-029 / SC-015). Exercises the same public/private ancestry matrix
 * as the application suite across a Root -> Sub -> SubSub hierarchy, but the
 * SubSub uses the `OPEN` membership policy: a non-member directly JOINS the
 * SubSub (no application, no approval step) and — only when the whole ancestor
 * chain (Root + Sub) is public AND the `allowSubspaceAdminsToInviteMembers`
 * setting is enabled — is granted membership of SubSub *and* every ancestor,
 * in one action (FR-023). The join is both the entry point and the grant
 * point, so the combined-flow authorisation is evaluated once, at join time.
 *
 * IMPORTANT — rollout ordering: these specs assert NEW server behaviour (JOIN
 * privilege exposure on eligible open-join subspaces + join routed through the
 * shared ancestor-chain grant). They only go green once the round-2 `server`
 * slice of workspace#017 has merged; until then they are expected to fail
 * end-to-end (this file is authored so it typechecks/collects cleanly now —
 * see plan.md "Round 2 rollout").
 */
import {
  CommunityMembershipPolicy,
  RoleName,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  assignRoleToUser,
  joinRoleSet,
} from '@functional-api/roleset/roles-request.params';
import {
  ALL_PUBLIC_COMBO,
  buildHierarchyScenarioConfig,
  cleanupScenarioSafely,
  comboLabel,
  expectCombinedAncestryGrant,
  HIERARCHY_TEST_TIMEOUT_MS,
  isUserMemberOfRoleSet,
  JOIN_COMBINED_FLOW_REJECTION,
  PRIVACY_COMBOS,
  PrivacyCombo,
} from './hierarchy-parity.fixture';

const JOINER = TestUser.NON_SPACE_MEMBER;
const joinerId = () => TestUserManager.users.nonSpaceMember.id;

const isMemberOf = (roleSetId: string): Promise<boolean> =>
  isUserMemberOfRoleSet(roleSetId, joinerId());

const buildOpenJoinScenario = async (
  name: string,
  combo: PrivacyCombo,
  settingEnabled: boolean
): Promise<OrganizationWithSpaceModel> => {
  const scenarioConfig = buildHierarchyScenarioConfig(name, combo, {
    subsubspaceMembershipPolicy: CommunityMembershipPolicy.Open,
    settingEnabled,
  });
  return TestScenarioFactory.createBaseScenario(scenarioConfig);
};

describe('Join hierarchy parity — direct-join combined flow (US4 / SC-015)', () => {
  describe.each(PRIVACY_COMBOS)(
    'privacy combo: $spacePrivacy/$subspacePrivacy/$subsubspacePrivacy (setting enabled)',
    combo => {
      const expectFullAncestry = expectCombinedAncestryGrant(combo, true);

      test(
        `${
          expectFullAncestry ? 'grants' : 'does not grant'
        } full ancestry on direct join — ${comboLabel(combo)}`,
        async () => {
          const scenario = await buildOpenJoinScenario(
            'join-hierarchy-parity',
            combo,
            true
          );

          try {
            const joinResult = await joinRoleSet(
              scenario.subsubspace.community.roleSetId,
              JOINER
            );

            if (expectFullAncestry) {
              // US4 AS-2/3: whole chain public + setting enabled -> the direct
              // join succeeds and grants SubSub + every ancestor in one action,
              // with no approval step.
              expect(joinResult?.error).toBeUndefined();
              expect(joinResult?.data?.joinRoleSet?.id).toBeTruthy();

              expect(
                await isMemberOf(scenario.subsubspace.community.roleSetId)
              ).toBe(true);
              expect(
                await isMemberOf(scenario.subspace.community.roleSetId)
              ).toBe(true);
              expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(
                true
              );
            } else {
              // US4 AS-4: a private ancestor the joiner would be granted into ->
              // the combined direct-join entry point is not offered; the
              // non-parent-member's join attempt is rejected and grants nothing.
              expect(joinResult?.error?.errors?.[0]?.message).toMatch(
                JOIN_COMBINED_FLOW_REJECTION
              );
              expect(joinResult?.data?.joinRoleSet?.id).toBeFalsy();

              expect(
                await isMemberOf(scenario.subsubspace.community.roleSetId)
              ).toBe(false);
              expect(
                await isMemberOf(scenario.subspace.community.roleSetId)
              ).toBe(false);
              expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(
                false
              );
            }
          } finally {
            await cleanupScenarioSafely(scenario);
          }
        },
        HIERARCHY_TEST_TIMEOUT_MS
      );
    }
  );

  describe('setting-disabled guard (SC-012)', () => {
    test(
      'whole chain public but allowSubspaceAdminsToInviteMembers disabled -> combined direct-join unavailable',
      async () => {
        const scenario = await buildOpenJoinScenario(
          'join-hierarchy-parity-setting-off',
          ALL_PUBLIC_COMBO,
          false
        );

        try {
          const joinResult = await joinRoleSet(
            scenario.subsubspace.community.roleSetId,
            JOINER
          );

          expect(joinResult?.error?.errors?.[0]?.message).toMatch(
            JOIN_COMBINED_FLOW_REJECTION
          );
          expect(joinResult?.data?.joinRoleSet?.id).toBeFalsy();

          expect(
            await isMemberOf(scenario.subsubspace.community.roleSetId)
          ).toBe(false);
          expect(await isMemberOf(scenario.subspace.community.roleSetId)).toBe(
            false
          );
          expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(
            false
          );
        } finally {
          await cleanupScenarioSafely(scenario);
        }
      },
      HIERARCHY_TEST_TIMEOUT_MS
    );
  });

  describe('behaviour preservation — parent member (SC-014 / FR-028)', () => {
    test(
      'a parent-member joining the open SubSub is granted ONLY the SubSub (single-target, today’s rule)',
      async () => {
        const scenario = await buildOpenJoinScenario(
          'join-hierarchy-parity-parent-member',
          ALL_PUBLIC_COMBO,
          true
        );

        try {
          // Precondition: the joiner is already a member of the immediate
          // parent (Sub) — and therefore, by member(Space) => member(parent),
          // of Root too. A direct join must behave exactly as today: grant the
          // SubSub only, no combined ancestor walk.
          await assignRoleToUser(
            joinerId(),
            scenario.subspace.community.roleSetId,
            RoleName.Member
          );
          expect(await isMemberOf(scenario.subspace.community.roleSetId)).toBe(
            true
          );

          const joinResult = await joinRoleSet(
            scenario.subsubspace.community.roleSetId,
            JOINER
          );
          expect(joinResult?.error).toBeUndefined();

          expect(
            await isMemberOf(scenario.subsubspace.community.roleSetId)
          ).toBe(true);
          // Already a member of the parent; the flow adds nothing new there.
          expect(await isMemberOf(scenario.subspace.community.roleSetId)).toBe(
            true
          );
        } finally {
          await cleanupScenarioSafely(scenario);
        }
      },
      HIERARCHY_TEST_TIMEOUT_MS
    );
  });

  describe('actor-relative reachability (ADR 0001 §7-8, join verb)', () => {
    const privateRootCombo: PrivacyCombo = {
      spacePrivacy: SpacePrivacyMode.Private,
      subspacePrivacy: SpacePrivacyMode.Public,
      subsubspacePrivacy: SpacePrivacyMode.Public,
    };

    test(
      'a member of the PRIVATE root can directly join the public open SubSub; the join grants the missing ancestry',
      async () => {
        const scenario = await buildOpenJoinScenario(
          'join-actor-reachability',
          privateRootCombo,
          true
        );

        try {
          // The joiner owns the PRIVATE root only; it imposes no requirement
          // (missing-only), and L1 is public + opted in.
          await assignRoleToUser(
            joinerId(),
            scenario.space.community.roleSetId,
            RoleName.Member
          );
          expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(
            true
          );
          expect(await isMemberOf(scenario.subspace.community.roleSetId)).toBe(
            false
          );

          const joinResult = await joinRoleSet(
            scenario.subsubspace.community.roleSetId,
            JOINER
          );
          expect(joinResult?.error).toBeUndefined();

          // The join grants the MISSING ancestry (L1 + L2); L0 already held.
          expect(
            await isMemberOf(scenario.subsubspace.community.roleSetId)
          ).toBe(true);
          expect(await isMemberOf(scenario.subspace.community.roleSetId)).toBe(
            true
          );
          expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(
            true
          );
        } finally {
          await cleanupScenarioSafely(scenario);
        }
      },
      HIERARCHY_TEST_TIMEOUT_MS
    );

    test(
      'a stranger to the same PRIVATE-root hierarchy cannot directly join (generic negative cell)',
      async () => {
        const scenario = await buildOpenJoinScenario(
          'join-actor-reachability-stranger',
          privateRootCombo,
          true
        );

        try {
          const joinResult = await joinRoleSet(
            scenario.subsubspace.community.roleSetId,
            JOINER
          );
          expect(joinResult?.error?.errors?.[0]?.message).toMatch(
            JOIN_COMBINED_FLOW_REJECTION
          );
          expect(joinResult?.data?.joinRoleSet?.id).toBeFalsy();

          expect(
            await isMemberOf(scenario.subsubspace.community.roleSetId)
          ).toBe(false);
          expect(await isMemberOf(scenario.subspace.community.roleSetId)).toBe(
            false
          );
          expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(
            false
          );
        } finally {
          await cleanupScenarioSafely(scenario);
        }
      },
      HIERARCHY_TEST_TIMEOUT_MS
    );
  });
});
