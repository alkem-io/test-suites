/**
 * API/integration parity suite — invitation flow (behaviour-preservation
 * guard).
 *
 * Workspace feature `017-combined-subspace-application` (FR-018/FR-019,
 * SC-008/SC-009, research R2/R5). Exercises the same Root -> Sub -> SubSub
 * public/private matrix as `application-hierarchy-parity.it-spec.ts`, but via
 * the invitation flow, to prove the refactor that extracts the shared
 * ancestor-chain grant service (R1) does not change invitation's observable
 * behaviour for the cases that already pass today, and that (unlike
 * applications) invitations are never gated by Space privacy or the
 * `allowSubspaceAdminsToInviteMembers` setting — an admin invitation is always
 * authorised directly.
 *
 * Nuance (research R2 — read before editing): today, `acceptInvitationToRoleSet`
 * only walks a single hop (the immediate parent) and `assignActorToRole`
 * requires the actor already be a member of *that* role-set's immediate
 * parent. So inviting a genuine non-member (member of nothing) directly into
 * the SubSub (2 hops from Root) THROWS on accept today — it is a latent bug,
 * not a passing case. Post-refactor, the shared service walks the full chain,
 * so this exact scenario starts succeeding (SubSub + Sub + Root all granted).
 * That is an intentional superset (FR-018/SC-008 only guarantees *currently
 * passing* invitation scenarios stay green) — the assertions below encode the
 * POST-refactor expected outcome, and — per the rollout ordering documented in
 * plan.md — only go green once the `server` slice has merged.
 *
 * The single-hop "regression guard" describe block at the bottom asserts the
 * pre-existing, already-working "invite to parent" mechanism (invitee invited
 * directly into Sub) is untouched — this is the true SC-008 baseline; it does
 * not depend on the new full-chain walk and should hold both before and after
 * the server change.
 */
import {
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  deleteInvitation,
  inviteForEntryRoleOnRoleSet,
} from '@functional-api/roleset/invitations/invitation.request.params';
import { eventOnRoleSetInvitation } from '@functional-api/roleset/roleset-events.request.params';
import { getSingleInvitationResult } from '@functional-api/roleset/roleset.request.params';
import {
  ALL_PUBLIC_COMBO,
  buildHierarchyScenarioConfig,
  cleanupScenarioSafely,
  comboLabel,
  HIERARCHY_TEST_TIMEOUT_MS,
  isUserMemberOfRoleSet,
  PRIVACY_COMBOS,
  PrivacyCombo,
} from './hierarchy-parity.fixture';

const INVITEE = TestUser.NON_SPACE_MEMBER;
const message = 'Hello, feel free to join our community!';

const inviteeId = () => TestUserManager.users.nonSpaceMember.id;

const isMemberOf = (roleSetId: string): Promise<boolean> =>
  isUserMemberOfRoleSet(roleSetId, inviteeId());

const inviteAndAccept = async (roleSetId: string) => {
  const invitationData = await inviteForEntryRoleOnRoleSet(
    roleSetId,
    [inviteeId()],
    [],
    message,
    [RoleName.Member],
    TestUser.GLOBAL_ADMIN
  );
  const invitationResult = getSingleInvitationResult(invitationData);
  const invitationId = invitationResult?.invitation?.id;

  if (invitationId) {
    await eventOnRoleSetInvitation(invitationId, 'ACCEPT', INVITEE);
    await deleteInvitation(invitationId);
  }

  return { invitationData, invitationId };
};

describe('Invitation hierarchy parity — behaviour preservation (SC-008)', () => {
  describe.each(PRIVACY_COMBOS)(
    'privacy combo: $spacePrivacy/$subspacePrivacy/$subsubspacePrivacy',
    (combo: PrivacyCombo) => {
      test(
        `invite+accept into SubSub grants full ancestry irrespective of privacy — ${comboLabel(
          combo
        )}`,
        async () => {
          const scenarioConfig = buildHierarchyScenarioConfig(
            'inv-hierarchy-parity',
            combo,
            { settingEnabled: true }
          );
          const scenario: OrganizationWithSpaceModel =
            await TestScenarioFactory.createBaseScenario(scenarioConfig);

          try {
            const { invitationId } = await inviteAndAccept(
              scenario.subsubspace.community.roleSetId
            );
            expect(invitationId?.length).toEqual(36);

            // Invitations are admin-authorised directly — unlike the
            // application flow, Space privacy never gates them. The
            // full-chain walk (R1) grants SubSub + every ancestor.
            expect(
              await isMemberOf(scenario.subsubspace.community.roleSetId)
            ).toBe(true);
            expect(
              await isMemberOf(scenario.subspace.community.roleSetId)
            ).toBe(true);
            expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(
              true
            );
          } finally {
            await cleanupScenarioSafely(scenario);
          }
        },
        HIERARCHY_TEST_TIMEOUT_MS
      );
    }
  );

  test(
    'setting disabled does not block the invitation ancestor grant (unlike applications, invitations are not setting-gated)',
    async () => {
      const allPublicCombo: PrivacyCombo = ALL_PUBLIC_COMBO;
      const scenarioConfig = buildHierarchyScenarioConfig(
        'inv-hierarchy-parity-setting-off',
        allPublicCombo,
        { settingEnabled: false }
      );
      const scenario: OrganizationWithSpaceModel =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);

      try {
        const { invitationId } = await inviteAndAccept(
          scenario.subsubspace.community.roleSetId
        );
        expect(invitationId?.length).toEqual(36);

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

  describe('single-hop regression guard — the proven, already-working invitation path', () => {
    test(
      'inviting directly into the immediate parent (Sub) still grants Root ancestor membership, unchanged',
      async () => {
        const allPublicCombo: PrivacyCombo = ALL_PUBLIC_COMBO;
        const scenarioConfig = buildHierarchyScenarioConfig(
          'inv-hierarchy-parity-single-hop',
          allPublicCombo,
          { settingEnabled: true }
        );
        const scenario: OrganizationWithSpaceModel =
          await TestScenarioFactory.createBaseScenario(scenarioConfig);

        try {
          const { invitationId } = await inviteAndAccept(
            scenario.subspace.community.roleSetId
          );
          expect(invitationId?.length).toEqual(36);

          expect(await isMemberOf(scenario.subspace.community.roleSetId)).toBe(
            true
          );
          expect(await isMemberOf(scenario.space.community.roleSetId)).toBe(
            true
          );
          // Never invited into SubSub — no membership grant there.
          expect(
            await isMemberOf(scenario.subsubspace.community.roleSetId)
          ).toBe(false);
        } finally {
          await cleanupScenarioSafely(scenario);
        }
      },
      HIERARCHY_TEST_TIMEOUT_MS
    );
  });
});
