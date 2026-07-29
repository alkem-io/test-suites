import {
  createInnovationPack,
  getGraphqlClient,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { CalloutContributionType, SpacePrivacyMode } from '@alkemio/client-lib';
import { TemplateType } from '@alkemio/client-lib';
import {
  LicensingCredentialBasedCredentialType,
  LicensingCredentialBasedPlanType,
  TemplateType as GeneratedTemplateType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createOrganization } from '@functional-api/contributor-management/organization/organization.request.params';
import {
  createUser,
  deleteUser,
  registerVerifiedUser,
} from '@functional-api/contributor-management/user/user.request.params';
import { createInnovationHub } from '@functional-api/innovation-hub/innovation-hub-params';
import { getLicensePlans } from '@functional-api/license/license.params.request';
import {
  createDiscussion,
  getPlatformForumData,
} from '@functional-api/communications/communication.params';
import { createCalloutOnCalloutsSet } from '@functional-api/callout/callouts.request.params';
import { createSubspaceOrFail } from '@functional-api/journey/subspace/subspace.request.params';
import {
  createSpaceBasicDataOrFail,
  deleteSpace,
  updateSpaceSettings,
} from '@functional-api/journey/space/space.request.params';
import { TARGET_ROLES } from './role-action-matrix.data';

/**
 * workspace#027-platform-role-redesign (T007b). The fixture set every
 * surface-invocation helper closes over — built ONCE per vitest project run
 * (T009's `beforeAll`), never per cell. Cheap resources (an org, a space, an
 * innovation pack + one template, one virtual contributor, one platform
 * discussion, one license plan lookup, one callout contribution) — enough
 * for every helper to reach its resolver's AUTHORIZATION gate with a
 * well-formed input, which is the one thing T007b requires ("a helper whose
 * input fails validation before the gate produces a green denial for the
 * wrong reason").
 *
 * **This has not been exercised against a live stack** — Phase V's job, not
 * this wave's (gates here are lint + build only, and booting a stack is out
 * of scope per the standing rules). Built from this repo's existing scenario
 * factory + already-established request-param helpers, matching their
 * conventions exactly, so it has a real chance of working unmodified; any
 * live-run adjustment is expected to be small and local to this file.
 */
export interface MatrixFixtures {
  /** The base scenario — organization + account + L0 space + one Post
   * callout, built via `TestScenarioFactory`. */
  readonly base: OrganizationWithSpaceModel;
  readonly organizationId: string;
  readonly organizationAccountId: string;
  /** A second, otherwise-unrelated organization — the A2/A9 "another
   * account" target (transfer destination, org-target role assignment). */
  readonly secondOrganizationId: string;
  readonly secondOrganizationAccountId: string;
  /** The second organization's OWN role-set — `immediacy.it-spec.ts`
   * (T013) and `flows/org-inheritance-demotion.it-spec.ts` (T019b) assign
   * ADMIN/ASSOCIATE on it directly (`AssignRoleToUser`/`RemoveRoleFromUser`)
   * to exercise organization-standing inheritance, distinct from the
   * PLATFORM role-set A1/A2 target. */
  readonly secondOrganizationRoleSetId: string;
  readonly spaceId: string;
  readonly spaceCollaborationId: string;
  readonly calloutId: string;
  /** A throwaway Post contribution inside `calloutId` — A8's
   * `deleteContribution` / A9's `moveContributionToCallout` target. */
  readonly contributionId: string;
  /** A second callout in the same space — `moveContributionToCallout`'s
   * destination. */
  readonly secondCalloutId: string;
  readonly innovationPackId: string;
  readonly templatesSetId: string;
  /** A throwaway template inside `templatesSetId` — A7's
   * `updateTemplate`/`deleteTemplate` target. */
  readonly templateId: string;
  readonly innovationHubId: string;
  readonly virtualContributorId: string;
  /** The singleton virtual-assistant actor — A11's
   * `updateAssistantActorCapabilities` target. */
  readonly virtualAssistantId: string;
  /** The base space's community — `adminCommunicationEnsureAccessToCommunications`'s target. */
  readonly communityId: string;
  /** A licensing-framework plan already on the platform (looked up, not
   * created — A12/A13's target). */
  readonly licensePlanId: string;
  /** The platform forum + one throwaway discussion — A15's target. */
  readonly forumId: string;
  readonly discussionId: string;
  /** An ordinary registered user, distinct from every single-role fixture —
   * the generic "target user" for A1/A2/A4/A5/A21's user-directed mutations.
   * Never granted a `Platform …`/`Feature …` role itself. */
  readonly targetUserId: string;
  readonly targetUserEmail: string;
  /** A syntactically well-formed UUID standing in for a Kratos identity ID —
   * A5's `adminIdentityDeleteKratosIdentity` only needs to REACH its
   * authorization gate (`PLATFORM_USERS_ADMIN`), which is checked before any
   * Kratos-side lookup; a non-existent-but-well-formed ID cannot produce a
   * false "denial" the way a malformed one could. */
  readonly kratosIdentityIdPlaceholder: string;
  /** Same reasoning for the two admin-communication room-ID surfaces. */
  readonly roomIdPlaceholder: string;
  /** A9's `moveSpaceL1ToSpaceL0` cross-L0 target — the FR-024/A9 census
   * entry's authorization gate is only reachable with a genuine L1 space
   * (see `subspaceId` below) AND a genuinely DIFFERENT L0 to move it under;
   * passing the base scenario's own top-level space for both parameters
   * fails `ValidationException: Only L1 spaces can be moved cross-L0`
   * before authorization is exercised at all (live-verification finding,
   * 2026-07-29). Built once, cheaply, with no community/collaboration —
   * a move target only needs to exist and be a real L0. */
  readonly a9TargetSpaceL0Id: string;
  /** A real L1 subspace under `spaceId` — the actual MOVE SOURCE for
   * `moveSpaceL1ToSpaceL0` (same finding as above). */
  readonly subspaceId: string;
  /** A5's `deleteUser` disposable target.
   * Deliberately NOT `targetUserId`: A5's `deleteUser` surface invocation is
   * genuinely destructive (unlike the read/update surfaces that also target
   * `targetUserId`), so once an ALLOWED caller exercises it for real, every
   * OTHER cell/file that still expects `targetUserId` to exist (A1/A2/A4/
   * A21, `audit-coverage.it-spec.ts`) would start failing with
   * `EntityNotFoundException` instead of a real authorization signal — the
   * exact cascade the 2026-07-29 live-verification run hit. This user is
   * referenced NOWHERE else, so deleting it is inert to the rest of the
   * suite. */
  readonly deletableUserId: string;
  /** A second disposable, freshly-created user — the target for any
   * Platform-role-exclusivity / negative-assignment probe that only needs
   * an actor ID (checked via the caller's own admin token), never a login
   * as the target itself. Deliberately NOT `targetUserId`
   * (`TestUser.NON_SPACE_MEMBER`): that identity is a long-lived, shared
   * TestUser fixture reused across every file in this project run (and
   * every future run), so a probe that grants it a role and then throws
   * before revoking (or races a concurrently-running file doing the same)
   * leaves it permanently contaminated — exactly the 2026-07-29
   * live-verification finding that broke `immediacy.it-spec.ts` and
   * `flows/rejection-audited.it-spec.ts` (both found `non.space@alkem.io`
   * already holding an unrelated Platform role from residue). This field
   * is built fresh per `buildMatrixFixtures()` call — i.e. fresh per FILE
   * — and referenced by nothing else, so contaminating or even deleting it
   * mid-test is inert to the rest of the suite. Also A21's target
   * (corr-ts-8/sec-test-suites-2, 2026-07-29 corrective wave): A21's
   * `updateUser({serviceProfile: true})` ALLOW cell is a real, permanent
   * mutation, and setting that marker on the SHARED `targetUserId` would
   * silently flip `assignment-rules.it-spec.ts`'s rule-3 denial (which
   * relies on that identity NOT being a service account) for every run
   * afterwards. */
  readonly rolesProbeUserId: string;
  /** A5's `deleteUser` target already has its own `deletableUserId` above;
   * these two cover the REMAINING two A4/A5 surfaces that mutate a user's
   * login identity for real and were still pointed at the shared
   * `targetUserId` (sec-test-suites-2, 2026-07-29 corrective wave):
   * `adminUserEmailChange` (A4) permanently rewrites the login email of
   * whatever it targets, and `adminUserAccountDelete` (A5) deletes the
   * Kratos identity outright. Both would otherwise corrupt the shared
   * `NON_SPACE_MEMBER` fixture 67 other test files depend on. */
  readonly emailChangeTargetUserId: string;
  /** The canonical (as-created) email of `emailChangeTargetUserId` — the
   * `adminUserEmailChangeDriftResolve` pair's `canonicalEmail` argument, so
   * that helper resolves drift back to a real, known address rather than a
   * guess. */
  readonly emailChangeTargetUserEmail: string;
  readonly accountDeleteTargetUserId: string;
  /** A8's five disposable delete targets — distinct from every resource
   * A7/A9/A12/A13 depend on, so an A8 ALLOW cell's REAL deletion cannot
   * corrupt the A-rows that run after it in the same file (corr-ts-1,
   * 2026-07-29 corrective wave). `deleteCallout`/`deleteContribution` live
   * in DIFFERENT callouts from each other (mirroring the
   * `secondCalloutId`/`contributionId`-in-`calloutId` split this file
   * already used, so deleting one never takes the other's container with
   * it) and neither is `spaceId`, `calloutId`, `secondCalloutId`,
   * `contributionId`, `innovationPackId` or `innovationHubId` — all of
   * which A9's transfer/move surfaces (and A7's updates) still need intact
   * afterwards. */
  readonly a8DeletableSpaceId: string;
  readonly a8DeletableCalloutId: string;
  readonly a8DeletableContributionId: string;
  readonly a8DeletableInnovationPackId: string;
  readonly a8DeletableInnovationHubId: string;
  /** A13's `DeleteLicensePlan` target — a plan created BY this fixture set,
   * never the platform-seeded `licensePlanId` A12's assign/revoke helpers
   * read (corr-ts-7, 2026-07-29 corrective wave): the original code deleted
   * a REAL seeded plan with no recreation, corrupting shared stack state and
   * A13's own later `UpdateLicensePlan` cell in the same run. */
  readonly a13DeletableLicensePlanId: string;
  /** A13's `UpdateLicensePlan` target — a SECOND, separate disposable plan,
   * distinct from `a13DeletableLicensePlanId`: within one matrix run every
   * cell of `DeleteLicensePlan` (all 13 roles) executes before any cell of
   * `UpdateLicensePlan` (census/array order), so if the two rows shared one
   * plan, the real ALLOW-caller deletion in the first pass would leave
   * nothing for the second pass's ALLOW caller to update. */
  readonly a13UpdatableLicensePlanId: string;
  /** A15's condition-gated in-space-support probe target — a PRIVATE space
   * with `settings.privacy.allowPlatformSupportAsAdmin` explicitly set,
   * distinct from A16's (corr-ts-4, 2026-07-29 corrective wave). Both rows
   * used to share `spaceId` and the SAME `spaceReadProbe` query, which is
   * gated on `READ_ABOUT` — a privilege `platform-content-full-access`
   * reaches through the ordinary READ->READ_ABOUT mapping regardless of
   * this condition, so the two rows could not be told apart. This space
   * isolates the condition: only a caller reaching it via
   * `allowPlatformSupportAsAdmin` (or genuine plain READ) passes. */
  readonly a15ConditionSpaceId: string;
  /** A16's cross-space-read probe target — a PRIVATE space with NO
   * membership grants, so an ordinary caller has neither READ nor
   * READ_ABOUT on it and only a role reaching it through a GLOBAL
   * mechanism (the root cascade's plain READ, `platform-spaces-reader`'s
   * own grant) can pass (corr-ts-4). Queried via
   * `spaceCollaborationReadProbe`, which selects `collaboration.id` — a
   * field gated on plain `READ` (`space.resolver.fields.ts`), unlike
   * `lookup.space` itself, which is gated on `READ_ABOUT` and would let a
   * READ_ABOUT-only holder (e.g. A15's condition) through by mistake. */
  readonly a16PrivateSpaceId: string;
  /** A6's `deleteOrganization` disposable target — an organization whose
   * account hosts NOTHING (corr-ts-12): `secondOrganizationId`'s account
   * hosts `a9TargetSpaceL0Id`, so `deleteOrganization` against it always
   * fails the server's account-has-resources guard
   * (`organization.service.ts`), and if that guard were ever relaxed it
   * would destroy A9's own cross-account transfer/move targets. This
   * organization is created fresh, never populated with a space, and
   * referenced nowhere else. */
  readonly a6DeletableOrganizationId: string;
  /** The platform's default licensing framework id (corr-ts-13) — A12's
   * `assignLicensePlanToAccount` / `revokeLicensePlanFromAccount` /
   * `revokeLicensePlanFromSpace` helpers need the FRAMEWORK id, not a PLAN
   * id (`fx.licensePlanId`), for their `licensingID` argument. Looked up
   * once here (already computed for the A13 plan-creation calls above) so
   * every consumer resolves it the same way. */
  readonly licensingFrameworkId: string;
  /** A9's `moveSpaceL1ToSpaceL2` source — a SECOND, fresh L1 under the base
   * scenario's L0, distinct from `subspaceId` (corr-ts-18): `subspaceId` is
   * the real move SOURCE for the ALLOW cell of `moveSpaceL1ToSpaceL0`, which
   * actually promotes it out from under `spaceId` when that cell runs — a
   * shared target would leave `moveSpaceL1ToSpaceL2` moving a space that is
   * no longer where this fixture set thinks it is. */
  readonly a9SecondSubspaceId: string;
  /** A9's `moveSpaceL1ToSpaceL2` destination — a second L1 sibling, distinct
   * from every other L1 this fixture set builds, so the move has a genuine,
   * unrelated target parent. */
  readonly a9L1MoveTargetId: string;
  /** A9's `moveSpaceL2ToSpaceL1` source — a real L2 created under
   * `a9SecondSubspaceId`, so the mutation's own level-check
   * (`Only L2 spaces can be moved to L1`) is satisfied before authorization
   * is exercised. */
  readonly a9L2Id: string;
}

const uid = () => UniqueIDGenerator.getID();

export async function buildMatrixFixtures(): Promise<MatrixFixtures> {
  const runId = uid();

  const base = await TestScenarioFactory.createBaseScenario({
    name: `platform-roles-matrix-${runId}`,
    organization: {},
    space: {
      collaboration: {
        addPostCallout: true,
      },
    },
    innovationPack: {
      useBaseOrganization: true,
      pack: { displayName: `matrix-pack-${runId}` },
      templates: [
        {
          type: TemplateType.Post,
          profileDisplayName: `matrix-post-template-${runId}`,
          postDefaultDescription: 'matrix fixture template',
        },
      ],
    },
    virtualContributors: {
      useBaseOrganization: true,
      virtualContributors: [
        {
          profileDisplayName: `matrix-vc-${runId}`,
          bodyOfKnowledgeType: 'NONE',
        },
      ],
    },
  });

  const secondOrgResult = await createOrganization(
    `matrix-org-2-${runId}`,
    `matrix-org2-${runId}`
  );
  const secondOrg = secondOrgResult.data?.createOrganization;

  // A9's `moveSpaceL1ToSpaceL0` needs a real two-level tree AND a genuinely
  // different L0 to move into (live-verification finding, 2026-07-29): a
  // real L1 subspace under the base scenario's own L0, plus a second,
  // unrelated L0 space (hosted on the second organization's account, which
  // this fixture set already builds) as the cross-L0 move target.
  const subspaceId = await createSubspaceOrFail(
    `matrix-l1-${runId}`,
    `matrixl1${runId}`,
    base.space.id
  );
  const a9TargetSpaceL0Id = await createSpaceBasicDataOrFail(
    `matrix a9 target ${runId}`,
    `matrixa9t${runId}`,
    secondOrg?.account?.id ?? ''
  );

  // corr-ts-18: `moveSpaceL1ToSpaceL2`/`moveSpaceL2ToSpaceL1` each need their
  // OWN genuine, level-correct source/target — `subspaceId` above is the
  // real move SOURCE for `moveSpaceL1ToSpaceL0`'s ALLOW cell, which promotes
  // it out from under `spaceId` for real when that cell runs, so it cannot
  // be shared with these two siblings.
  const a9SecondSubspaceId = await createSubspaceOrFail(
    `matrix-a9-l1-${runId}`,
    `matrixa9l1${runId}`,
    base.space.id
  );
  const a9L1MoveTargetId = await createSubspaceOrFail(
    `matrix-a9-l1-target-${runId}`,
    `matrixa9l1t${runId}`,
    base.space.id
  );
  const a9L2Id = await createSubspaceOrFail(
    `matrix-a9-l2-${runId}`,
    `matrixa9l2${runId}`,
    a9SecondSubspaceId
  );

  // corr-ts-12: A6's `deleteOrganization` needs its OWN disposable
  // organization whose account hosts NOTHING — `secondOrganizationId`'s
  // account hosts `a9TargetSpaceL0Id` above, so the server's
  // account-has-resources guard (`organization.service.ts`) always rejects
  // deleting it, and if that guard were ever relaxed the delete would take
  // A9's own transfer/move targets down with it.
  const a6OrgResult = await createOrganization(
    `matrix-a6-deletable-${runId}`,
    `matrixa6del${runId}`
  );
  const a6DeletableOrganizationId = a6OrgResult.data?.createOrganization?.id ?? '';

  // A5's `deleteUser` disposable target — a throwaway Alkemio user (no
  // Kratos flow needed for a `createUser`-created account), never
  // referenced by any other row or file, so the one surface invocation
  // that actually deletes it cannot take any other cell down with it
  // (live-verification finding, 2026-07-29: the shared `targetUserId`
  // fixture was being deleted here, corrupting A1/A2/A4/A21 and
  // `audit-coverage.it-spec.ts`).
  const deletableUserResult = await createUser({
    nameID: `matrixdel${runId}`,
    email: `matrix-deletable-${runId}@alkem.io`,
    profileData: { displayName: `matrix deletable user ${runId}` },
  });
  const deletableUserId = deletableUserResult.data?.createUser?.id ?? '';

  // A fresh, single-use target for Platform-role-exclusivity/negative probes
  // (see the `rolesProbeUserId` doc comment above — 2026-07-29
  // live-verification finding).
  const rolesProbeUserResult = await createUser({
    nameID: `matrixprobe${runId}`,
    email: `matrix-roles-probe-${runId}@alkem.io`,
    profileData: { displayName: `matrix roles probe user ${runId}` },
  });
  const rolesProbeUserId = rolesProbeUserResult.data?.createUser?.id ?? '';

  // A4's `adminUserEmailChange` disposable target — a real, permanent login
  // email rewrite; never the shared `targetUserId` (sec-test-suites-2).
  // MUST be a genuinely Kratos-registered identity (`registerVerifiedUser`),
  // NOT a bare `createUser()` account (live-verification finding,
  // 2026-07-30): `adminUserEmailChange` loads the subject through the
  // identity-provider link and throws `EMAIL_CHANGE_SUBJECT_NOT_FOUND` for a
  // user with no Kratos identity, which the ALLOW cell's caller-succeeded
  // assertion cannot distinguish from a real authorization failure.
  const emailChangeTargetUserEmail = `matrix-email-change-${runId}@alkem.io`;
  const emailChangeTargetUserId = await registerVerifiedUser(
    emailChangeTargetUserEmail,
    `matrixemail${runId}`,
    `target${runId}`
  );

  // A5's `adminUserAccountDelete` disposable target — deletes the Kratos
  // identity outright; never the shared `targetUserId` (sec-test-suites-2).
  // Genuinely Kratos-registered (`registerVerifiedUser`), not a bare
  // `createUser()` account — same reasoning as `emailChangeTargetUserId`
  // above: a target with no Kratos identity to delete is not a
  // representative exercise of this surface's gate (only reachable via the
  // `platform-roles` full project, canonical picks `deleteUser` for A5, but
  // fixed proactively for when it runs).
  const accountDeleteTargetUserId = await registerVerifiedUser(
    `matrix-account-delete-${runId}@alkem.io`,
    `matrixacctdel${runId}`,
    `target${runId}`
  );

  const innovationHubResult = await createInnovationHub(
    base.organization.accountId
  );
  const innovationHubId = innovationHubResult.data?.createInnovationHub.id;

  const calloutId = base.space.collaboration.calloutPostId;
  // Uses a dedicated document (createContributionOnCalloutId.graphql) that
  // selects the CONTRIBUTION's own `id` — the shared `ContributionsData`
  // fragment `createPostOnCallout` otherwise uses selects the wrapped
  // Post's `id`, not the CalloutContribution's, and A8/A9 need the latter.
  const contributionResult = await getGraphqlClient().createContributionOnCalloutId(
    {
      contributionData: {
        calloutID: calloutId,
        type: CalloutContributionType.Post,
        post: {
          profileData: { displayName: `matrix-post-${runId}` },
        },
      },
    },
    { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
  );
  const contributionId = contributionResult.data?.createContributionOnCallout.id;

  // A second callout in the same space — the move destination.
  const secondCalloutResult = await createCalloutOnCalloutsSet(
    base.space.collaboration.calloutsSetId,
    {
      framing: {
        profile: { displayName: `matrix-callout-2-${runId}` },
      },
    }
  );
  const secondCalloutId = secondCalloutResult.data?.createCalloutOnCalloutsSet?.id;

  const templateResult = await getGraphqlClient().CreateTemplate(
    {
      templatesSetId: base.innovationPack!.templatesSetId,
      profileData: { displayName: `matrix-template-${runId}` },
      type: GeneratedTemplateType.Post,
      postDefaultDescription: 'matrix fixture template body',
    },
    { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
  );
  const templateId = templateResult.data?.createTemplate.id;

  const licensePlansResult = await getLicensePlans();
  const licensePlanId =
    licensePlansResult.data?.platform.licensingFramework.plans[0]?.id;
  const licensingFrameworkId =
    licensePlansResult.data?.platform.licensingFramework.id;

  // A13's disposable delete/update target — a plan CREATED by this fixture
  // set, never the platform-seeded `licensePlanId` above (corr-ts-7). A12's
  // assign/revoke helpers keep using the seeded plan; only A13's
  // Delete/UpdateLicensePlan helpers use this one.
  const a13LicensePlanResult = await getGraphqlClient().CreateLicensePlan(
    {
      LicensePlan: {
        licensingFrameworkID: licensingFrameworkId ?? '',
        name: `matrix-a13-plan-${runId}`,
        licenseCredential: LicensingCredentialBasedCredentialType.SpaceLicensePlus,
        type: LicensingCredentialBasedPlanType.SpacePlan,
        enabled: true,
        isFree: true,
        assignToNewOrganizationAccounts: false,
        assignToNewUserAccounts: false,
        requiresContactSupport: false,
        requiresPaymentMethod: false,
        sortOrder: 999,
        trialEnabled: false,
      },
    },
    { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
  );
  const a13DeletableLicensePlanId =
    a13LicensePlanResult.data?.createLicensePlan?.id ?? '';

  const a13UpdatablePlanResult = await getGraphqlClient().CreateLicensePlan(
    {
      LicensePlan: {
        licensingFrameworkID: licensingFrameworkId ?? '',
        name: `matrix-a13-updatable-plan-${runId}`,
        licenseCredential: LicensingCredentialBasedCredentialType.SpaceLicensePlus,
        type: LicensingCredentialBasedPlanType.SpacePlan,
        enabled: true,
        isFree: true,
        assignToNewOrganizationAccounts: false,
        assignToNewUserAccounts: false,
        requiresContactSupport: false,
        requiresPaymentMethod: false,
        sortOrder: 999,
        trialEnabled: false,
      },
    },
    { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
  );
  const a13UpdatableLicensePlanId =
    a13UpdatablePlanResult.data?.createLicensePlan?.id ?? '';

  // ===== A8's five disposable delete targets (corr-ts-1) =====
  // A separate callout in the SAME collaboration for `deleteCallout` — never
  // `secondCalloutId` (A9's move destination) or `calloutId` (A9's
  // `transferCallout` source, A8's OWN `updateCalloutPublishInfo` target).
  const a8CalloutResult = await createCalloutOnCalloutsSet(
    base.space.collaboration.calloutsSetId,
    {
      framing: {
        profile: { displayName: `matrix-a8-callout-${runId}` },
      },
    }
  );
  const a8DeletableCalloutId =
    a8CalloutResult.data?.createCalloutOnCalloutsSet?.id ?? '';

  // A separate contribution inside `calloutId` — a DIFFERENT callout from
  // the one `a8DeletableCalloutId` above deletes, so `deleteCallout` cannot
  // take this contribution's container down with it, and never
  // `contributionId` (A9's `moveContributionToCallout` source).
  const a8ContributionResult = await getGraphqlClient().createContributionOnCalloutId(
    {
      contributionData: {
        calloutID: calloutId,
        type: CalloutContributionType.Post,
        post: {
          profileData: { displayName: `matrix-a8-post-${runId}` },
        },
      },
    },
    { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
  );
  const a8DeletableContributionId =
    a8ContributionResult.data?.createContributionOnCallout.id ?? '';

  // A separate space — never `spaceId` (every other A-row's shared target).
  const a8DeletableSpaceId = await createSpaceBasicDataOrFail(
    `matrix a8 space ${runId}`,
    `matrixa8sp${runId}`,
    base.organization.accountId
  );

  // A separate innovation pack — never `innovationPackId` (A7's
  // update target, A9's `TransferInnovationPackToAccount` target).
  const a8PackResult = await createInnovationPack(
    base.organization.accountId,
    `matrix a8 pack ${runId}`,
    `matrixa8pk${runId}`
  );
  const a8DeletableInnovationPackId =
    a8PackResult.data?.createInnovationPack?.id ?? '';

  // A separate innovation hub — never `innovationHubId` (A7's update
  // target, A9's `transferInnovationHubToAccount` target).
  const a8HubResult = await createInnovationHub(base.organization.accountId);
  const a8DeletableInnovationHubId =
    a8HubResult.data?.createInnovationHub.id ?? '';

  // ===== A15/A16's dedicated probe spaces (corr-ts-4) =====
  // A15: PRIVATE + `allowPlatformSupportAsAdmin: true` — isolates the
  // condition-gated READ_ABOUT grant from plain READ.
  const a15ConditionSpaceId = await createSpaceBasicDataOrFail(
    `matrix a15 condition ${runId}`,
    `matrixa15c${runId}`,
    base.organization.accountId
  );
  await updateSpaceSettings(
    a15ConditionSpaceId,
    { privacy: { mode: SpacePrivacyMode.Private, allowPlatformSupportAsAdmin: true } },
    TestUser.GLOBAL_ADMIN
  );

  // A16: PRIVATE, no condition set — isolates plain READ reached only
  // through a GLOBAL mechanism (root cascade / platform-spaces-reader's
  // own grant), never through space membership or the A15 condition.
  const a16PrivateSpaceId = await createSpaceBasicDataOrFail(
    `matrix a16 private ${runId}`,
    `matrixa16p${runId}`,
    base.organization.accountId
  );
  await updateSpaceSettings(
    a16PrivateSpaceId,
    { privacy: { mode: SpacePrivacyMode.Private, allowPlatformSupportAsAdmin: false } },
    TestUser.GLOBAL_ADMIN
  );

  // A16's `platform-spaces-reader` READ grant is computed into each space's
  // OWN authorization policy (`createPlatformRolesAccess`,
  // `space.service.platform.roles.access.ts`) — recompute it platform-wide
  // right after creating these two fresh spaces so their policies reflect
  // that grant before the matrix reads them (live-verification finding,
  // 2026-07-30: a freshly-created space's `platformRolesAccess` grants were
  // observed not yet reflected in its authorization policy at read time).
  await getGraphqlClient().authorizationPlatformRolesAccessReset(
    {},
    { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
  );

  const forumResult = await getPlatformForumData();
  const forumId = forumResult.data?.platform.forum.id;
  const discussionResult = await createDiscussion(
    forumId ?? '',
    `matrix-discussion-${runId}`
  );
  const discussionId = discussionResult.data?.createDiscussion.id;

  // The generic target user — nonSpaceMember never holds any
  // `Platform …`/`Feature …` role, so it is safe as the object of every
  // user-directed admin mutation without perturbing the matrix's own
  // fixtures (test.user.ts, T003).
  const targetUser = TestUserManager.getUserModelByType(
    TestUser.NON_SPACE_MEMBER
  );

  // HARDENING (2026-07-29 live-verification finding): `targetUser` is a
  // long-lived, shared TestUser fixture — a probe elsewhere in this run (or
  // an earlier run against this same environment) can leave it holding a
  // stray Platform-family role if it granted one and threw before revoking.
  // `immediacy.it-spec.ts`'s grant/revoke round trip needs the target to
  // start role-free to prove FR-031 (a real residual role there produces an
  // exclusivity rejection that looks like — but is not — the property under
  // test). Best-effort, one call per target role: a revoke of a role never
  // held is expected to no-op or error harmlessly either way.
  const rolesAdminTokenForCleanup = TestUserManager.getUserModelByType(
    TestUser.PLATFORM_ROLES_ADMIN
  ).authToken;
  for (const role of TARGET_ROLES) {
    try {
      await getGraphqlClient().removePlatformRoleFromUser(
        { roleData: { actorID: targetUser.id, role } },
        { authorization: `Bearer ${rolesAdminTokenForCleanup}` }
      );
    } catch {
      // best-effort — the role was most likely never held
    }
  }

  const virtualAssistantResult = await getGraphqlClient().platformAdminVirtualAssistant(
    {},
    { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
  );
  const virtualAssistantId =
    virtualAssistantResult.data?.platformAdmin.virtualAssistant.id;

  return {
    base,
    organizationId: base.organization.id,
    organizationAccountId: base.organization.accountId,
    secondOrganizationId: secondOrg?.id ?? '',
    secondOrganizationAccountId: secondOrg?.account?.id ?? '',
    secondOrganizationRoleSetId: secondOrg?.roleSet?.id ?? '',
    spaceId: base.space.id,
    spaceCollaborationId: base.space.collaboration.id,
    calloutId,
    contributionId: contributionId ?? '',
    secondCalloutId: secondCalloutId ?? '',
    innovationPackId: base.innovationPack?.id ?? '',
    templatesSetId: base.innovationPack?.templatesSetId ?? '',
    templateId: templateId ?? '',
    innovationHubId: innovationHubId ?? '',
    virtualContributorId: base.virtualContributors?.[0]?.id ?? '',
    virtualAssistantId: virtualAssistantId ?? '',
    communityId: base.space.community.id,
    licensePlanId: licensePlanId ?? '',
    forumId: forumId ?? '',
    discussionId: discussionId ?? '',
    targetUserId: targetUser.id,
    targetUserEmail: targetUser.email,
    kratosIdentityIdPlaceholder: '00000000-0000-4000-8000-000000000000',
    roomIdPlaceholder: '00000000-0000-4000-8000-000000000001',
    a9TargetSpaceL0Id,
    subspaceId,
    deletableUserId,
    rolesProbeUserId,
    emailChangeTargetUserId,
    emailChangeTargetUserEmail,
    accountDeleteTargetUserId,
    a8DeletableSpaceId,
    a8DeletableCalloutId,
    a8DeletableContributionId,
    a8DeletableInnovationPackId,
    a8DeletableInnovationHubId,
    a13DeletableLicensePlanId,
    a13UpdatableLicensePlanId,
    a15ConditionSpaceId,
    a16PrivateSpaceId,
    a6DeletableOrganizationId,
    licensingFrameworkId: licensingFrameworkId ?? '',
    a9SecondSubspaceId,
    a9L1MoveTargetId,
    a9L2Id,
  };
}

export async function teardownMatrixFixtures(
  fixtures: MatrixFixtures
): Promise<void> {
  // `subspaceId` is not tracked on `fixtures.base` (it was created ad hoc,
  // outside `TestScenarioFactory`'s own subspace bookkeeping), so it must be
  // torn down explicitly and BEFORE the parent space below — deletion here
  // does not cascade to children. Best-effort: an ALLOW-cell run may have
  // already moved it out from under `spaceId` (that is the point of the A9
  // fixture), but `deleteSpace` takes it by ID regardless of current parent.
  try {
    await deleteSpace(fixtures.subspaceId);
  } catch {
    // best-effort cleanup
  }

  // corr-ts-18's dedicated A9 L1/L2 tree — same reasoning as `subspaceId`
  // above (not tracked by `TestScenarioFactory`, best-effort, order-
  // independent of current parent). The L2 first, then its two L1s.
  try {
    await deleteSpace(fixtures.a9L2Id);
  } catch {
    // best-effort cleanup
  }
  try {
    await deleteSpace(fixtures.a9SecondSubspaceId);
  } catch {
    // best-effort cleanup
  }
  try {
    await deleteSpace(fixtures.a9L1MoveTargetId);
  } catch {
    // best-effort cleanup
  }

  await TestScenarioFactory.cleanUpBaseScenario(fixtures.base);

  // best-effort — a denial-only run may not have created every optional
  // resource; failures here must never fail the suite (T017's completeness
  // check, not fixture teardown, is what must be trustworthy).
  try {
    await deleteSpace(fixtures.a9TargetSpaceL0Id);
  } catch {
    // best-effort cleanup
  }
  try {
    await deleteUser(fixtures.deletableUserId);
  } catch {
    // best-effort — the ALLOW cell (platform-users-admin's deleteUser) may
    // already have deleted it for real; that is the intended, single use.
  }
  try {
    await deleteUser(fixtures.rolesProbeUserId);
  } catch {
    // best-effort cleanup
  }
  try {
    await deleteUser(fixtures.emailChangeTargetUserId);
  } catch {
    // best-effort cleanup
  }
  try {
    await deleteUser(fixtures.accountDeleteTargetUserId);
  } catch {
    // best-effort — the ALLOW cell (A5's adminUserAccountDelete) may
    // already have deleted it for real; that is the intended, single use.
  }
  try {
    await getGraphqlClient().deleteOrganization(
      { deleteData: { ID: fixtures.secondOrganizationId } },
      { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
    );
  } catch {
    // best-effort cleanup
  }
  // corr-ts-12's dedicated A6 delete target — best-effort: the whole point
  // of this fixture is that the ALLOW cell (platform-support's
  // `deleteOrganization`) may already have deleted it for real.
  try {
    await getGraphqlClient().deleteOrganization(
      { deleteData: { ID: fixtures.a6DeletableOrganizationId } },
      { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
    );
  } catch {
    // best-effort cleanup
  }

  // A8's disposable delete targets (corr-ts-1) — best-effort: the whole
  // point of these fixtures is that an ALLOW cell may already have deleted
  // one of them for real.
  try {
    await deleteSpace(fixtures.a8DeletableSpaceId);
  } catch {
    // best-effort cleanup
  }
  try {
    await getGraphqlClient().deleteCallout(
      { calloutId: fixtures.a8DeletableCalloutId },
      { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
    );
  } catch {
    // best-effort cleanup
  }
  try {
    await getGraphqlClient().deleteInnovationPack(
      { innovationPackId: fixtures.a8DeletableInnovationPackId },
      { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
    );
  } catch {
    // best-effort cleanup
  }
  try {
    await getGraphqlClient().DeleteInnovationHub(
      { input: { ID: fixtures.a8DeletableInnovationHubId } },
      { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
    );
  } catch {
    // best-effort cleanup
  }

  // A13's disposable license plans (corr-ts-7).
  try {
    await getGraphqlClient().DeleteLicensePlan(
      { LicensePlan: { ID: fixtures.a13DeletableLicensePlanId } },
      { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
    );
  } catch {
    // best-effort — the ALLOW cell (A13's DeleteLicensePlan) may already
    // have deleted it for real; that is the intended, single use.
  }
  try {
    await getGraphqlClient().DeleteLicensePlan(
      { LicensePlan: { ID: fixtures.a13UpdatableLicensePlanId } },
      { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
    );
  } catch {
    // best-effort cleanup
  }

  // A15/A16's dedicated probe spaces (corr-ts-4).
  try {
    await deleteSpace(fixtures.a15ConditionSpaceId);
  } catch {
    // best-effort cleanup
  }
  try {
    await deleteSpace(fixtures.a16PrivateSpaceId);
  } catch {
    // best-effort cleanup
  }
}
