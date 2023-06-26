import { applicationData, lifecycleData } from '../../../utils/common-params';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { TestUser } from '../../../utils/token.helper';
import { spaceNameId } from '../../integration/space/space.request.params';

export const appData = `{
      id
      questions {
        name
        value
      }
      lifecycle {
        ${lifecycleData}
      }
      user {
        id
      }
    }`;

export const createApplication = async (
  communityID: string,
  userRole: TestUser = TestUser.NON_HUB_MEMBER
) => {
  const requestParams = {
    operationName: null,
    query: `mutation applyForCommunityMembership($applicationData: CommunityApplyInput!) {
      applyForCommunityMembership(applicationData:$applicationData) {${applicationData}}
      }`,
    variables: {
      applicationData: {
        communityID,
        questions: [
          { name: 'Test Question 1', value: 'Test answer', sortOrder: 0 },
        ],
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const removeApplication = async (appId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteUserApplication($deleteData: DeleteApplicationInput!) {
      deleteUserApplication(deleteData: $deleteData) {
        ${applicationData}}}`,
    variables: {
      deleteData: {
        ID: appId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getApplication = async (
  ecoNameId = spaceNameId,
  appId: string,
  userRole: TestUser = TestUser.NON_HUB_MEMBER
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{space(ID: "${ecoNameId}" ) {
      application(ID: "${appId}"){${applicationData}}}}`,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getChallengeApplications = async (
  ecoNameId: string,
  challengeNameId: string,
  userRole: TestUser = TestUser.NON_HUB_MEMBER
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{space(ID: "${ecoNameId}" ) {challenge(ID: "${challengeNameId}"){community{
      applications{${applicationData}}}}}}`,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getApplications = async (ecoId: string) => {
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

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
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
