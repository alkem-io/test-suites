import { challengeDataTest } from '../../../utils/common-params';
import { mutation, graphqlRequestAuth } from '../../../utils/graphql.request';
import {
  challengeVariablesData,
  createChallenge,
} from '../../../utils/mutations/create-mutation';
import { TestUser } from '../../../utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

const uniqueId = (Date.now() + Math.random()).toString();
export const challengeNameId = `chalNaId${uniqueId}`;

export const getChallengeData = async (
  spaceId: string,
  challengeId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{space (ID: "${spaceId}") {challenge (ID: "${challengeId}") {
      ${challengeDataTest}
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getSubspaceDataCodegen = async (
  challengeId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpaceData(
      {
        challengeId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSubspacesDataCodegen = async (spaceId: string) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSubspacesData(
      {
        spaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
};

export const updateChallengeLocation = async (
  challengeId: string,
  country?: string,
  city?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateChallenge(
      {
        challengeData: {
          ID: challengeId,
          profileData: { location: { country, city } },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
