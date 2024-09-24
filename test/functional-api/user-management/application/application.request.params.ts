import { getGraphqlClient } from '@test/utils/graphqlClient';
import { TestUser } from '../../../utils/token.helper';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

export const createApplicationCodegen = async (
  roleSetID: string,
  userRole: TestUser = TestUser.NON_HUB_MEMBER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.applyForEntryRole(
      {
        applicationData: {
          roleSetID,
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

export const getRoleSetInvitationsApplications = async (
  roleSetId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RoleSetApplicationsInvitations(
      {
        roleSetId,
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
    graphqlClient.MeQuery(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
