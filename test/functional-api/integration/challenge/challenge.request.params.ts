import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
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

export const createChildChallenge = async (
  challengeID: string,
  displayName: string,
  nameID: string,
  contextTagline?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createChildChallenge($childChallengeData: CreateChallengeOnChallengeInput!) {
      createChildChallenge(challengeData: $childChallengeData) {
        ${challengeDataTest}
      }
    }`,
    variables: {
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
        innovationFlowTemplateID: entitiesId.spaceInnovationFlowTemplateChId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const createChallengePredefinedData = async (
  displayName: string,
  nameID: string,
  spaceID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createChallenge($challengeData: CreateChallengeOnSpaceInput!) {
      createChallenge(challengeData: $challengeData) {
        ${challengeDataTest}
      }
    }`,
    variables: {
      challengeData: {
        spaceID,
        nameID,
        profileData: {
          displayName,
          description: 'test description',
          tagline: 'test',
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
        innovationFlowTemplateID: entitiesId.spaceInnovationFlowTemplateChId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const createChallengeNoTemplate = async (
  displayName: string,
  nameID: string,
  spaceID: string,
  innovationFlowTemplateID: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createChallenge($challengeData: CreateChallengeOnSpaceInput!) {
      createChallenge(challengeData: $challengeData) {
        ${challengeDataTest}
      }
    }`,
    variables: {
      challengeData: {
        spaceID,
        nameID,
        profileData: {
          displayName,
          description: 'test description',
          tagline: 'test',
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
        innovationFlowTemplateID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

// To be extended
export const updateChallengeWithReferences = async (
  challengeId: string,
  displayName: string,
  tagline?: string,
  description?: string,
  vision?: string,
  impact?: string,
  who?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation UpdateChallenge($challengeData: UpdateChallengeInput!) {
      updateChallenge(challengeData: $challengeData)  {
        ${challengeDataTest}
      }
    }`,
    variables: {
      challengeData: {
        ID: challengeId,
        profileData: {
          displayName,
          description,
          tagline,
          references: [
            {
              ID: '',
              name: 'test video' + uniqueId,
              uri: 'https://youtu.be/-wGlzcjs',
              description: 'dest description' + uniqueId,
            },
          ],
        },
        context: {
          vision: vision,
          impact: impact,
          who: who,
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateChallenge = async (
  challengeId: string,
  displayName: string,
  tagline?: string,
  description?: string,
  vision?: string,
  impact?: string,
  who?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation UpdateChallenge($challengeData: UpdateChallengeInput!) {
      updateChallenge(challengeData: $challengeData)  {
        ${challengeDataTest}
      }
    }`,
    variables: {
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
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeChallenge = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteChallenge($deleteData: DeleteChallengeInput!) {
      deleteChallenge(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: challengeId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeChallengeCodegen = async (challengeId: string) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
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

export const addChallengeLeadToOrganization = async (
  organizationId: string,
  challengeId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignChallengeLead($assignInput: AssignChallengeLeadInput!) {
      assignChallengeLead(assignInput: $assignInput){id}
    }`,
    variables: {
      assignInput: {
        organizationID: organizationId,
        challengeID: challengeId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeChallengeLeadFromOrganization = async (
  organizationId: any,
  challengeId: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeChallengeLead($removeData: RemoveChallengeLeadInput!) {
      removeChallengeLead(removeData: $removeData) {
        id
      }}`,
    variables: {
      removeData: {
        organizationID: organizationId,
        challengeID: challengeId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
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
  const callback = (authToken: string) =>
    graphqlClient.challengeData(
      {
        challengeId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getChallengeDataFromAllSpaces = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{spaces {challenge (ID: "${challengeId}") {
      ${challengeDataTest}
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengesData = async (spaceId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{space (ID: "${spaceId}"){ challenges{
        ${challengeDataTest}
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateChallengeLocation = async (
  challengeId: string,
  country?: string,
  city?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.updateChallenge(
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

export const getChallengeOpportunity = async (
  spaceId: string,
  challengeId: string
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query { space (ID: "${spaceId}"){
      challenge(ID: "${challengeId}") {
         ${challengeDataTest}}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeCommunityAvailableMemberUsersData = async (
  spaceId: string,
  challengeId: string
) => {
  const requestParams = {
    operationName: null,
    query: `query{space(ID: "${spaceId}") {challenge(ID: "${challengeId}") {${communityAvailableMemberUsersData}}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeCommunityAvailableLeadUsersData = async (
  spaceId: string,
  challengeId: string
) => {
  const requestParams = {
    operationName: null,
    query: `query{space(ID: "${spaceId}") {challenge(ID: "${challengeId}") {${communityAvailableLeadUsersData}}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
