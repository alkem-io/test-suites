import {
  challengeDataTest,
  communityAvailableMemberUsersData,
  communityAvailableLeadUsersData,
} from '../../../utils/common-params';
import { mutation, graphqlRequestAuth } from '../../../utils/graphql.request';
import {
  challengeVariablesData,
  createChallenge,
} from '../../../utils/mutations/create-mutation';
import { TestUser } from '../../../utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';

const uniqueId = (Date.now() + Math.random()).toString();
export const challengeNameId = `chalNaId${uniqueId}`;

export const createChallengeMutation = async (
  challengeName: string,
  challengeNameId: string,
  parentId: string
) => {
  return await mutation(
    createChallenge,
    challengeVariablesData(challengeName, challengeNameId, parentId)
  );
};

export const createChildChallengeCodegen = async (
  challengeID: string,
  displayName: string,
  nameID: string,
  contextTagline?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateChildChallenge(
      {
        childChallengeData: {
          challengeID,
          nameID,
          profileData: {
            displayName,
            description: 'test description',
            tagline: `${contextTagline}`,
            referencesData: [
              {
                name: 'test video' + uniqueId,
                uri: 'https://youtu.be/-wGlzcjs',
                description: 'dest description' + uniqueId,
              },
            ],
          },
          context: {
            vision: 'test vision',
            who: 'test who',
            impact: 'test impact',
          },
          // collaborationData: {
          //   innovationFlowTemplateID:
          //     entitiesId.spaceInnovationFlowTemplateChId,
          // },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
};

export const updateChallengeCodegen = async (
  challengeId: string,
  displayName: string,
  tagline?: string,
  description?: string,
  vision?: string,
  impact?: string,
  who?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateChallenge(
      {
        challengeData: {
          ID: challengeId,
          profileData: {
            displayName,
            description,
            tagline,
          },
          context: {
            vision: vision,
            impact: impact,
            who: who,
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
};

export const deleteChallengeCodegen = async (challengeId: string) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteChallenge(
      {
        deleteData: {
          ID: challengeId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
};

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

export const getChallengeDataCodegen = async (
  challengeId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.ChallengeData(
      {
        challengeId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getChallengesDataCodegen = async (spaceId: string) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.ChallengesData(
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
