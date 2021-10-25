import { applicationData, lifecycleData } from '../../../utils/common-params';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { TestUser } from '../../../utils/token.helper';
import { ecoverseNameId } from '../../integration/ecoverse/ecoverse.request.params';

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
  communityId: string,
  userid: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createApplication($applicationData: CreateApplicationInput!) {
      createApplication(applicationData:$applicationData) {${applicationData}}
      }`,
    variables: {
      applicationData: {
        parentID: communityId,
        userID: userid,
        questions: [
          { name: 'Test Question 1', value: 'Test answer', sortOrder: 0 },
        ],
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.NON_ECOVERSE_MEMBER);
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
  ecoNameId = ecoverseNameId,
  appId: string
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverse(ID: "${ecoNameId}" ) {
      application(ID: "${appId}"){${applicationData}}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getApplications = async (ecoId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverse(ID: "${ecoId}" ) {
        community{applications{${applicationData}}}
        challenges{
          community{applications{${applicationData}}}
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
