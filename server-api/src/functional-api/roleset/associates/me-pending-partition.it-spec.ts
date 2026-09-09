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
  // orgToDelete is torn down by its own test.
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

      await deleteInvitation(spaceInvitationId).catch(() => undefined);
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

      await callAsEmail(email, (client, auth) =>
        client.InvitationStateEvent(
          { input: { invitationID: invitationId, eventName: 'ACCEPT' } },
          auth
        )
      );

      const before = await callAsEmail(email, (client, auth) =>
        client.MeInAppNotifications(
          { types: [NotificationEvent.UserOrganizationAssociateInvitation] },
          auth
        )
      );
      expect(
        (before?.data?.me.notifications.inAppNotifications ?? []).length
      ).toBeGreaterThan(0);

      await removeRoleFromUser(
        userId,
        orgForInvitation.organization.roleSetId,
        RoleName.Associate
      );

      const after = await callAsEmail(email, (client, auth) =>
        client.MeInAppNotifications(
          { types: [NotificationEvent.UserOrganizationAssociateInvitation] },
          auth
        )
      );
      expect(after?.data?.me.notifications.inAppNotifications ?? []).toEqual(
        []
      );
    } finally {
      await deleteUser(userId).catch(() => undefined);
    }
  });
});
