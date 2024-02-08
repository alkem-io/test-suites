import { getGraphqlClient } from '@test/utils/graphqlClient';
import { applicationData } from '../../../utils/common-params';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
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

export const getApplications = async (
  ecoId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{space(ID: "${ecoId}" ) {
        community{applications{${applicationData}}}
        challenges{
          community{applications{${applicationData}}}
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getSpaceApplicationsCodegen = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.getSpaceApplications(
      {
        ID: spaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getChallengeApplicationsCodegen = async (
  spaceId: string,
  challengeId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.getChallengeApplications(
      {
        spaceId,
        challengeId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const joinCommunity = async (
  communityID: string,
  userRole: TestUser = TestUser.NON_HUB_MEMBER
) => {
  const requestParams = {
    operationName: null,
    query: `mutation joinCommunity($joinCommunityData: CommunityJoinInput!) {
      joinCommunity(joinCommunityData: $joinCommunityData) {
        id
      }
    }`,
    variables: {
      joinCommunityData: {
        communityID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
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
