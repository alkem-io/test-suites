/**
 * API/integration parity suite — application (combined) flow.
 *
 * Workspace feature `017-combined-subspace-application` (FR-019 / SC-009).
 * Exercises the public/private ancestry matrix across a Root -> Sub -> SubSub
 * hierarchy: a non-member applies directly to the SubSub, an admin approves,
 * and — only when the whole ancestor chain (Root + Sub) is public AND the
 * `allowSubspaceAdminsToInviteMembers` setting is enabled — the applicant is
 * granted membership of SubSub *and* every ancestor, in one action (FR-006).
 *
 * IMPORTANT — rollout ordering: these specs assert NEW server behaviour
 * (relaxed apply-time precondition + approval-time ancestor grant). They only
 * go green once the `server` slice of workspace#017 has merged; until then
 * they are expected to fail end-to-end (this file is authored so it
 * typechecks/collects cleanly now — see plan.md "Rollout ordering").
 */
import { CommunityMembershipPolicy } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  createApplication,
  getRoleSetInvitationsApplications,
} from '@functional-api/roleset/application/application.request.params';
import { eventOnRoleSetApplication } from '@functional-api/roleset/roleset-events.request.params';
import { getRoleSetUsersInMemberRole } from '@functional-api/roleset/roleset.request.params';
import {
  buildHierarchyScenarioConfig,
  cleanupScenarioSafely,
  COMBINED_FLOW_REJECTION,
  comboLabel,
  expectCombinedAncestryGrant,
  HIERARCHY_TEST_TIMEOUT_MS,
  PRIVACY_COMBOS,
  PrivacyCombo,
} from './hierarchy-parity.fixture';

const APPLICANT = TestUser.NON_SPACE_MEMBER;
const applicantId = () => TestUserManager.users.nonSpaceMember.id;

const isMemberOf = async (roleSetId: string): Promise<boolean> => {
  const members = await getRoleSetUsersInMemberRole(roleSetId);
  return members.some(m => m.id === applicantId());
};

const buildAndApply = async (
  name: string,
  combo: PrivacyCombo,
  settingEnabled: boolean
) => {
  const scenarioConfig = buildHierarchyScenarioConfig(name, combo, {
    subsubspaceMembershipPolicy: CommunityMembershipPolicy.Applications,
    settingEnabled,
  });
  const scenario: OrganizationWithSpaceModel =
    await TestScenarioFactory.createBaseScenario(scenarioConfig);

  const applicationResult = await createApplication(
    scenario.subsubspace.community.roleSetId,
    APPLICANT
  );

  return { scenario, applicationResult };
};

describe('Application hierarchy parity — combined flow (FR-019/SC-009)', () => {
  describe.each(PRIVACY_COMBOS)(
    'privacy combo: $spacePrivacy/$subspacePrivacy/$subsubspacePrivacy (setting enabled)',
    combo => {
      const expectFullAncestry = expectCombinedAncestryGrant(combo, true);

      test(
        `${
          expectFullAncestry ? 'grants' : 'does not grant'
        } full ancestry on approval — ${comboLabel(combo)}`,
        async () => {
          const { scenario, applicationResult } = await buildAndApply(
            'app-hierarchy-parity',
            combo,
            true
          );

          try {
            if (expectFullAncestry) {
              // US1 AS-4/5/6: whole chain public + setting enabled -> apply succeeds.
              expect(applicationResult?.error).toBeUndefined();
              const applicationId =
                applicationResult?.data?.applyForEntryRoleOnRoleSet?.id;
              expect(applicationId?.length).toEqual(36);

              await eventOnRoleSetApplication(
                applicationId as string,
                'APPROVE'
              );

              expect(
                await isMemberOf(scenario.subsubspace.community.roleSetId)
              ).toBe(true);
              expect(
                await isMemberOf(scenario.subspace.community.roleSetId)
              ).toBe(true);
              expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(
                true
              );

              // FR-004: the application lives only in the SubSub community
              // context — no application is ever created against an ancestor
              // role-set.
              const rootApplications = await getRoleSetInvitationsApplications(
                scenario.space.community.roleSetId
              );
              const subApplications = await getRoleSetInvitationsApplications(
                scenario.subspace.community.roleSetId
              );
              expect(
                rootApplications?.data?.lookup?.roleSet?.applications
              ).toHaveLength(0);
              expect(
                subApplications?.data?.lookup?.roleSet?.applications
              ).toHaveLength(0);
            } else {
              // US3 AS-1/3: a private ancestor -> the combined flow is
              // unavailable; the non-parent-member's apply attempt is
              // rejected the same way it is today ("join the parent first").
              expect(
                applicationResult?.error?.errors?.[0]?.message
              ).toBeDefined();
              expect(
                applicationResult?.data?.applyForEntryRoleOnRoleSet?.id
              ).toBeFalsy();

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

  describe('setting-disabled guard (US3 AS-2 / SC-005)', () => {
    const allPublicCombo: PrivacyCombo = {
      spacePrivacy: PRIVACY_COMBOS[0].spacePrivacy,
      subspacePrivacy: PRIVACY_COMBOS[0].subspacePrivacy,
      subsubspacePrivacy: PRIVACY_COMBOS[0].subsubspacePrivacy,
    };

    test(
      'whole chain public but allowSubspaceAdminsToInviteMembers disabled -> combined flow unavailable',
      async () => {
        const { scenario, applicationResult } = await buildAndApply(
          'app-hierarchy-parity-setting-off',
          allPublicCombo,
          false
        );

        try {
          expect(applicationResult?.error?.errors?.[0]?.message).toMatch(
            COMBINED_FLOW_REJECTION
          );
          expect(
            applicationResult?.data?.applyForEntryRoleOnRoleSet?.id
          ).toBeFalsy();

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

  describe('reject guard (FR-007 / SC-004 / US3 AS-4)', () => {
    const allPublicCombo: PrivacyCombo = {
      spacePrivacy: PRIVACY_COMBOS[0].spacePrivacy,
      subspacePrivacy: PRIVACY_COMBOS[0].subspacePrivacy,
      subsubspacePrivacy: PRIVACY_COMBOS[0].subsubspacePrivacy,
    };

    test(
      'REJECTed application on an all-public/setting-enabled hierarchy grants no membership at all',
      async () => {
        const { scenario, applicationResult } = await buildAndApply(
          'app-hierarchy-parity-reject',
          allPublicCombo,
          true
        );

        try {
          expect(applicationResult?.error).toBeUndefined();
          const applicationId =
            applicationResult?.data?.applyForEntryRoleOnRoleSet?.id;
          expect(applicationId?.length).toEqual(36);

          await eventOnRoleSetApplication(applicationId as string, 'REJECT');

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
