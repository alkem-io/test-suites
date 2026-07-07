/**
 * API/integration guard — removal cascade + re-application.
 *
 * Workspace feature `017-combined-subspace-application` (regression guard).
 * After the combined apply→approve flow grants an actor membership of a
 * Subspace and its ancestors, removing that actor from an ANCESTOR Space
 * must cascade: the descendant memberships are revoked as well, and the
 * actor can immediately apply to the Subspace again.
 *
 * Regression: server#`revokeSpaceTreeCredentials` revoked the descendant
 * credentials but never invalidated the descendants' role-set membership
 * caches, so a re-application was rejected with ROLE_SET_ALREADY_MEMBER
 * even though the membership credential was gone (stale cache-first
 * `isMember` read in `validateApplicationFromActor`).
 */
import { CommunityMembershipPolicy } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createApplication } from '@functional-api/roleset/application/application.request.params';
import { removeRoleFromUser } from '@functional-api/roleset/roles-request.params';
import { eventOnRoleSetApplication } from '@functional-api/roleset/roleset-events.request.params';
import { getRoleSetUsersInMemberRole } from '@functional-api/roleset/roleset.request.params';
import {
  buildHierarchyScenarioConfig,
  HIERARCHY_TEST_TIMEOUT_MS,
  PRIVACY_COMBOS,
} from './hierarchy-parity.fixture';

const APPLICANT = TestUser.NON_SPACE_MEMBER;
const applicantId = () => TestUserManager.users.nonSpaceMember.id;

const isMemberOf = async (roleSetId: string): Promise<boolean> => {
  const members = await getRoleSetUsersInMemberRole(roleSetId);
  return members.some(m => m.id === applicantId());
};

const applyAndApprove = async (roleSetId: string): Promise<void> => {
  const applicationResult = await createApplication(roleSetId, APPLICANT);
  expect(applicationResult?.error).toBeUndefined();
  const applicationId = applicationResult?.data?.applyForEntryRoleOnRoleSet?.id;
  expect(applicationId?.length).toEqual(36);
  await eventOnRoleSetApplication(applicationId as string, 'APPROVE');
};

describe('Removal cascade + re-application (workspace#017 regression guard)', () => {
  // All-public chain with the setting enabled — the positive combined cell.
  const allPublicCombo = PRIVACY_COMBOS[0];

  test(
    'removing the actor from an ancestor cascades to descendants and a fresh application succeeds',
    async () => {
      const scenarioConfig = buildHierarchyScenarioConfig(
        'removal-cascade',
        allPublicCombo,
        {
          subsubspaceMembershipPolicy: CommunityMembershipPolicy.Applications,
          settingEnabled: true,
        }
      );
      const scenario: OrganizationWithSpaceModel =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);

      try {
        // 1. Combined flow: apply to the SubSub, approve, full ancestry granted.
        await applyAndApprove(scenario.subsubspace.community.roleSetId);
        expect(await isMemberOf(scenario.subsubspace.community.roleSetId)).toBe(
          true
        );
        expect(await isMemberOf(scenario.subspace.community.roleSetId)).toBe(
          true
        );
        expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(true);

        // 2. Remove the actor from the ROOT Space (the ancestor).
        await removeRoleFromUser(
          applicantId(),
          scenario.space.community.roleSetId,
          RoleName.Member
        );

        // 3. Cascade: the descendant memberships are revoked too.
        expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(
          false
        );
        expect(await isMemberOf(scenario.subspace.community.roleSetId)).toBe(
          false
        );
        expect(await isMemberOf(scenario.subsubspace.community.roleSetId)).toBe(
          false
        );

        // 4. Regression guard: a fresh application to the SubSub succeeds —
        // no ROLE_SET_ALREADY_MEMBER from a stale membership cache.
        const reapplication = await createApplication(
          scenario.subsubspace.community.roleSetId,
          APPLICANT
        );
        expect(reapplication?.error).toBeUndefined();
        const reapplicationId =
          reapplication?.data?.applyForEntryRoleOnRoleSet?.id;
        expect(reapplicationId?.length).toEqual(36);

        // 5. And the combined grant works again end to end.
        await eventOnRoleSetApplication(reapplicationId as string, 'APPROVE');
        expect(await isMemberOf(scenario.subsubspace.community.roleSetId)).toBe(
          true
        );
        expect(await isMemberOf(scenario.subspace.community.roleSetId)).toBe(
          true
        );
        expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(true);
      } finally {
        await TestScenarioFactory.cleanUpBaseScenario(scenario);
      }
    },
    HIERARCHY_TEST_TIMEOUT_MS
  );
});
