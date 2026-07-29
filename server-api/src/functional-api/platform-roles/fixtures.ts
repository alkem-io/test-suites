import {
  getGraphqlClient,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { CalloutContributionType } from '@alkemio/client-lib';
import { TemplateType } from '@alkemio/client-lib';
import { TemplateType as GeneratedTemplateType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createOrganization } from '@functional-api/contributor-management/organization/organization.request.params';
import {
  createUser,
  deleteUser,
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
   * mid-test is inert to the rest of the suite. */
  readonly rolesProbeUserId: string;
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
    await getGraphqlClient().deleteOrganization(
      { deleteData: { ID: fixtures.secondOrganizationId } },
      { authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}` }
    );
  } catch {
    // best-effort cleanup
  }
}
