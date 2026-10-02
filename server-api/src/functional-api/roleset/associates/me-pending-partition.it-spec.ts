// The `me` query partition. `getCommunityInvitationsForUser`/
// `getCommunityApplicationsForUser` filter by `RoleSetType.SPACE` at the
// service layer, so the first organization invitation or application no
// longer 500s the query behind the top bar — it reads Space rows only,
// exactly, and the organization rows surface on their own three fields.
// Also covers deleting a user or an organization with pending rows still
// open, and the in-app cleanup on removal.
import {
  getGraphqlClient,
  getUserToken,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { GraphqlReturnWithError } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  NotificationEvent,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  deleteUser,
  registerVerifiedUser,
} from '@functional-api/contributor-management/user/user.request.params';
import { deleteOrganization } from '@functional-api/contributor-management/organization/organization.request.params';
import {
  deleteInvitation,
  inviteForEntryRoleOnRoleSet,
} from '../invitations/invitation.request.params';
import {
  getErrorCode,
  getOrganizationRoleSetPending,
  getSingleInvitationResult,
} from '../roleset.request.params';
import { removeRoleFromUser } from '../roles-request.params';

const uniqueId = UniqueIDGenerator.getID();

let orgForInvitation: OrganizationWithSpaceModel;
let orgForApplication: OrganizationWithSpaceModel;
let orgToDelete: OrganizationWithSpaceModel;
let fullScenario: OrganizationWithSpaceModel; // carries a Space, for the Space invitation leg

beforeAll(async () => {
  // A bare `{ name }` config creates NO space, leaving
  // `fullScenario.space.community.roleSetId` undefined and the Space-invitation
  // leg failing with BAD_USER_INPUT rather than exercising the partition.
  fullScenario = await TestScenarioFactory.createBaseScenario({
    name: `me-partition-${uniqueId}`,
    space: {
      collaboration: {
        addTutorialCallouts: false,
      },
      community: {
        members: [],
      },
    },
  });
  orgForInvitation = await TestScenarioFactory.createBaseScenarioOrganization({
    name: `me-partition-inv-${uniqueId}`,
  });
  orgForApplication =
    await TestScenarioFactory.createBaseScenarioOrganization({
      name: `me-partition-app-${uniqueId}`,
    });
  orgToDelete = await TestScenarioFactory.createBaseScenarioOrganization({
    name: `me-partition-del-${uniqueId}`,
  });
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(fullScenario);
  await TestScenarioFactory.cleanUpBaseScenario(orgForInvitation);
  await TestScenarioFactory.cleanUpBaseScenario(orgForApplication);
  // orgToDelete is normally deleted by the US7-AS5 test itself, but that test
  // can be skipped, focused out or fail before it gets there — so the suite
  // owns the cleanup too. `deleteOrganization` resolves GraphQL failures as
  // `{ error }`; "not found" is the expected outcome after a green run and
  // anything else fails the hook.
  if (orgToDelete?.organization?.id) {
    const res = await deleteOrganization(orgToDelete.organization.id);
    const message = JSON.stringify(res?.error ?? '');
    if (res?.error && !/not.?found|unable to find|ENTITY_NOT_FOUND/i.test(message)) {
      throw new Error(`orgToDelete was not torn down: ${message}`);
    }
  }
});

const callAsEmail = async <TData>(
  email: string,
  invoke: (
    client: ReturnType<typeof getGraphqlClient>,
    auth: { authorization: string }
  ) => Promise<{ data: TData }>
): Promise<GraphqlReturnWithError<TData>> => {
  const token = await getUserToken(email);
  try {
    const result = await invoke(getGraphqlClient(), {
      authorization: `Bearer ${token}`,
    });
    return { data: result.data };
  } catch (error) {
    const err = error as {
      response?: { errors?: Array<Record<string, unknown>> };
    };
    return {
      error: {
        errors: err.response?.errors ?? [{ message: String(error) }],
      },
    };
  }
};

describe('me query partition (US7-AS1, contract §5)', () => {
  test('one Space invitation + one organization invitation + one organization application: the Space-shaped fields stay exact, the organization rows land only on the new fields', async () => {
    const testId = UniqueIDGenerator.getID();
    const email = `me-partition-${testId}@alkem.io`;
    const userId = await registerVerifiedUser(
      email,
      `fn${testId}`,
      `ln${testId}`
    );
    try {
      const spaceInvite = await inviteForEntryRoleOnRoleSet(
        fullScenario.space.community.roleSetId,
        [userId],
        [],
        'join our Space',
        [],
        TestUser.GLOBAL_ADMIN
      );
      const spaceInvitationId = getSingleInvitationResult(spaceInvite)!
        .invitation!.id;

      const orgInvite = await inviteForEntryRoleOnRoleSet(
        orgForInvitation.organization.roleSetId,
        [userId],
        [],
        'associate with us',
        [],
        TestUser.GLOBAL_ADMIN
      );
      const orgInvitationId = getSingleInvitationResult(orgInvite)!.invitation!
        .id;

      const orgApp = await callAsEmail(email, (client, auth) =>
        client.applyForEntryRole(
          {
            applicationData: {
              roleSetID: orgForApplication.organization.roleSetId,
              questions: [],
            },
          },
          auth
        )
      );
      const orgApplicationId = orgApp?.data?.applyForEntryRoleOnRoleSet?.id;
      expect(orgApplicationId?.length).toEqual(36);

      const me = await callAsEmail(email, (client, auth) =>
        client.MeOrganizationPending({}, auth)
      );
      expect(me?.error).toBeUndefined();
      const meData = me?.data?.me;

      // Space-shaped fields: Space rows only, exact count.
      expect(
        meData?.communityInvitations.map(i => i.invitation.id)
      ).toEqual([spaceInvitationId]);
      expect(meData?.communityApplications).toEqual([]);
      expect(meData?.communityInvitationsCount).toEqual(1);

      // Organization-shaped fields carry the organization rows.
      expect(
        meData?.organizationInvitations.map(i => i.invitation.id)
      ).toEqual([orgInvitationId]);
      expect(
        meData?.organizationApplications.map(a => a.application.id)
      ).toEqual([orgApplicationId]);
      expect(meData?.organizationInvitationsCount).toEqual(1);

      // Deletion: the user can be deleted with both rows open, and the rows
      // are gone from an admin read afterwards — the partition
      // lives above the repository, so the deletion flow still sees and
      // removes every pending row.
      await deleteUser(userId);

      const invPending = await getOrganizationRoleSetPending(
        orgForInvitation.organization.roleSetId
      );
      expect(
        (invPending?.data?.lookup?.roleSet?.invitations ?? []).map(
          i => i.id
        )
      ).not.toEqual(expect.arrayContaining([orgInvitationId]));

      const appPending = await getOrganizationRoleSetPending(
        orgForApplication.organization.roleSetId
      );
      expect(
        (appPending?.data?.lookup?.roleSet?.applications ?? []).map(
          a => a.id
        )
      ).not.toEqual(expect.arrayContaining([orgApplicationId]));

      // Deleting the user above already removed its pending rows (asserted
      // for the organization ones just above), so the Space invitation is
      // normally gone too: tolerate ENTITY_NOT_FOUND explicitly, and surface
      // any OTHER failure — the wrapper resolves errors, it never rejects.
      const deletion = await deleteInvitation(spaceInvitationId);
      if (deletion?.error && getErrorCode(deletion) !== 'ENTITY_NOT_FOUND') {
        throw new Error(
          `deleteInvitation(${spaceInvitationId}) failed: ${JSON.stringify(
            deletion.error.errors
          )}`
        );
      }
    } catch (e) {
      await deleteUser(userId).catch(() => undefined);
      throw e;
    }
  });

  test('US7-AS5 (organization side): deleting an organization with a pending application succeeds', async () => {
    const testId = UniqueIDGenerator.getID();
    const email = `me-partition-orgdel-${testId}@alkem.io`;
    const userId = await registerVerifiedUser(
      email,
      `fn${testId}`,
      `ln${testId}`
    );
    try {
      const app = await callAsEmail(email, (client, auth) =>
        client.applyForEntryRole(
          {
            applicationData: {
              roleSetID: orgToDelete.organization.roleSetId,
              questions: [],
            },
          },
          auth
        )
      );
      expect(app?.data?.applyForEntryRoleOnRoleSet?.id.length).toEqual(36);

      const deleted = await deleteOrganization(orgToDelete.organization.id);
      expect(deleted?.error).toBeUndefined();

      // "The pending rows are removed": the applicant's own pending list must
      // no longer carry an application for the deleted organization, and the
      // read itself must still succeed (no dangling reference).
      const after = await callAsEmail(email, (client, auth) =>
        client.MeOrganizationPending({}, auth)
      );
      expect(after?.error).toBeUndefined();
      expect(
        (after?.data?.me?.organizationApplications ?? []).filter(
          (a: { organization?: { id?: string } }) =>
            a.organization?.id === orgToDelete.organization.id
        )
      ).toEqual([]);
    } finally {
      await deleteUser(userId).catch(() => undefined);
    }
  });

  test('US7-AS4: removing an associate deletes their organization in-app notification rows', async () => {
    const testId = UniqueIDGenerator.getID();
    const email = `me-partition-inapp-${testId}@alkem.io`;
    const userId = await registerVerifiedUser(
      email,
      `fn${testId}`,
      `ln${testId}`
    );
    try {
      const invite = await inviteForEntryRoleOnRoleSet(
        orgForInvitation.organization.roleSetId,
        [userId],
        [],
        'associate with us',
        [],
        TestUser.GLOBAL_ADMIN
      );
      const invitationId = getSingleInvitationResult(invite)!.invitation!.id;

      const accepted = await callAsEmail(email, (client, auth) =>
        client.InvitationStateEvent(
          { input: { invitationID: invitationId, eventName: 'ACCEPT' } },
          auth
        )
      );
      expect(accepted?.error).toBeUndefined();

      const readInAppRows = async () => {
        const me = await callAsEmail(email, (client, auth) =>
          client.MeInAppNotifications(
            { types: [NotificationEvent.UserOrganizationAssociateInvitation] },
            auth
          )
        );
        expect(me?.error).toBeUndefined();
        return me?.data?.me.notifications.inAppNotifications ?? [];
      };

      // The in-app row is written by the notifications service off the
      // RabbitMQ event the invitation raised, not in the invite mutation's
      // own transaction — poll rather than read once.
      await expect
        .poll(async () => (await readInAppRows()).length, {
          timeout: 20_000,
          interval: 1_000,
        })
        .toBeGreaterThan(0);

      const removed = await removeRoleFromUser(
        userId,
        orgForInvitation.organization.roleSetId,
        RoleName.Associate
      );
      expect(removed?.error).toBeUndefined();

      // Same for the cleanup on removal: poll until the rows are gone.
      await expect
        .poll(readInAppRows, { timeout: 20_000, interval: 1_000 })
        .toEqual([]);
    } finally {
      await deleteUser(userId).catch(() => undefined);
    }
  });
});
