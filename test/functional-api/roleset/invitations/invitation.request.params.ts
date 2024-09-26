import { getGraphqlClient } from '@test/utils/graphqlClient';
import { TestUser } from '../../../utils/token.helper';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

export const inviteContributors = async (
  roleSetId: string,
  contributorIds: string[],
  contributorRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.InviteContributors(
      {
        roleSetId,
        contributorIds: contributorIds,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, contributorRole);
};

export const inviteExternalUser = async (
  roleSetId: string,
  email: string,
  message: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.inviteUserToPlatformAndRoleSet(
      {
        roleSetId,
        email,
        message,
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
    graphqlClient.DeletePlatformInvitation(
      {
        invitationId,
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
