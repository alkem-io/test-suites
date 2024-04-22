import { getGraphqlClient } from '@test/utils/graphqlClient';
import { TestUser } from '../../../utils/token.helper';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

export const createApplicationCodegen = async (
  communityID: string,
  userRole: TestUser = TestUser.NON_HUB_MEMBER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.applyForCommunityMembership(
      {
        applicationData: {
          communityID,
          questions: [
            { name: 'Test Question 1', value: 'Test answer', sortOrder: 0 },
          ],
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const deleteApplicationCodegen = async (
  applicationId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteUserApplication(
      {
        deleteData: {
          ID: applicationId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getCommunityInvitationsApplicationsCodegen = async (
  communityId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CommunityApplicationsInvitations(
      {
        communityId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getChallengeApplicationsCodegen = async (
  spaceId: string,
  subspaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.getChallengeApplications(
      {
        spaceId,
        subspaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const meQueryCodegen = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.me(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
