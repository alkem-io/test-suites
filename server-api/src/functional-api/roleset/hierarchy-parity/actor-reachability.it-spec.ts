/**
 * API/integration guard — actor-relative reachability (workspace#017).
 *
 * Explicit scope decision (2026-07-07, recorded in ADR 0001): reachability
 * for the combined Subspace-application flow is evaluated PER APPLICANT, not
 * for a generic non-member. Ancestors the applicant already belongs to impose
 * no requirements (the missing-only grant skips them); every ancestor the
 * applicant would actually be granted into must be PUBLIC with
 * `allowSubspaceAdminsToInviteMembers` enabled.
 *
 * Canonical case: PRIVATE L0 -> PUBLIC L1 -> PUBLIC L2 target. An applicant
 * who IS a member of the private L0 (but of nothing below) applies directly
 * to L2; approval grants L1 + L2 (L0 already held). A stranger to the same
 * hierarchy is still rejected (the generic negative cell is unchanged).
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
import { createApplication } from '@functional-api/roleset/application/application.request.params';
import { assignRoleToUser } from '@functional-api/roleset/roles-request.params';
import { eventOnRoleSetApplication } from '@functional-api/roleset/roleset-events.request.params';
import {
  buildHierarchyScenarioConfig,
  cleanupScenarioSafely,
  COMBINED_FLOW_REJECTION,
  HIERARCHY_TEST_TIMEOUT_MS,
  isUserMemberOfRoleSet,
} from './hierarchy-parity.fixture';

const APPLICANT = TestUser.NON_SPACE_MEMBER;
const applicantId = () => TestUserManager.users.nonSpaceMember.id;

const isMemberOf = (roleSetId: string): Promise<boolean> =>
  isUserMemberOfRoleSet(roleSetId, applicantId());

const privateRootCombo = {
  spacePrivacy: SpacePrivacyMode.Private,
  subspacePrivacy: SpacePrivacyMode.Public,
  subsubspacePrivacy: SpacePrivacyMode.Public,
};

describe('Actor-relative reachability — combined flow (workspace#017 / ADR 0001)', () => {
  test(
    'a member of the PRIVATE root can apply directly to the public SubSub; approval grants the missing ancestry',
    async () => {
      const scenarioConfig = buildHierarchyScenarioConfig(
        'actor-reachability',
        privateRootCombo,
        {
          subsubspaceMembershipPolicy: CommunityMembershipPolicy.Applications,
          settingEnabled: true,
        }
      );
      const scenario: OrganizationWithSpaceModel =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);

      try {
        // Precondition: make the applicant a member of the PRIVATE root only.
        await assignRoleToUser(
          applicantId(),
          scenario.space.community.roleSetId,
          RoleName.Member
        );
        expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(true);
        expect(await isMemberOf(scenario.subspace.community.roleSetId)).toBe(
          false
        );

        // Actor-relative reachability: the private root is OWNED by this
        // applicant, so it imposes no requirement; L1 is public + opted in.
        const applicationResult = await createApplication(
          scenario.subsubspace.community.roleSetId,
          APPLICANT
        );
        expect(applicationResult?.error).toBeUndefined();
        const applicationId =
          applicationResult?.data?.applyForEntryRoleOnRoleSet?.id;
        expect(applicationId?.length).toEqual(36);

        await eventOnRoleSetApplication(applicationId as string, 'APPROVE');

        // Approval grants the MISSING ancestry (L1 + L2); L0 already held.
        expect(await isMemberOf(scenario.subsubspace.community.roleSetId)).toBe(
          true
        );
        expect(await isMemberOf(scenario.subspace.community.roleSetId)).toBe(
          true
        );
        expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(true);
      } finally {
        await cleanupScenarioSafely(scenario);
      }
    },
    HIERARCHY_TEST_TIMEOUT_MS
  );

  test(
    'a stranger to the same PRIVATE-root hierarchy is still rejected (generic negative cell unchanged)',
    async () => {
      const scenarioConfig = buildHierarchyScenarioConfig(
        'actor-reachability-stranger',
        privateRootCombo,
        {
          subsubspaceMembershipPolicy: CommunityMembershipPolicy.Applications,
          settingEnabled: true,
        }
      );
      const scenario: OrganizationWithSpaceModel =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);

      try {
        const applicationResult = await createApplication(
          scenario.subsubspace.community.roleSetId,
          APPLICANT
        );
        expect(applicationResult?.error?.errors?.[0]?.message).toMatch(
          COMBINED_FLOW_REJECTION
        );
        expect(
          applicationResult?.data?.applyForEntryRoleOnRoleSet?.id
        ).toBeFalsy();

        expect(await isMemberOf(scenario.subsubspace.community.roleSetId)).toBe(
          false
        );
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
