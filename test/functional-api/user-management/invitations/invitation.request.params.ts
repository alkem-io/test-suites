import { getGraphqlClient } from '@test/utils/graphqlClient';
import { lifecycleData } from '../../../utils/common-params';
import { TestUser } from '../../../utils/token.helper';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

export const appData = `{
      id
      lifecycle {
        ${lifecycleData}
      }
      createdBy {
        id
      }
      user {
        id
      }
    }`;

export const inviteExistingUserCodegen = async (
  communityID: string,
  invitedUsers: string[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.inviteExistingUserForCommunityMembership(
      {
        invitationData: {
          communityID,
          invitedUsers,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const inviteExternalUserCodegen = async (
  communityID: string,
  email: string,
  welcomeMessage: string,
  firstName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.InviteExternalUserForCommunityMembership(
      {
        invitationData: {
          communityID,
          email,
          welcomeMessage,
          firstName,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const deleteInvitationCodegen = async (
  invitationId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteInvitation(
      {
        deleteData: {
          ID: invitationId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const deleteExternalInvitationCodegen = async (
  invitationId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteExternalInvitation(
      {
        deleteData: {
          ID: invitationId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getSpaceInvitationCodegen = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.getSpaceInvitations(
      {
        spaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
