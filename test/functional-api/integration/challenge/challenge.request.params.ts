import { challengeDataTest } from '../../../utils/common-params';
import { mutation, graphqlRequestAuth } from '../../../utils/graphql.request';
import {
  challengeVariablesData,
  createChallenge,
} from '../../../utils/mutations/create-mutation';
import { TestUser } from '../../../utils/token.helper';

const uniqueId = (Date.now() + Math.random()).toString();
export const challengeNameId = `chalNaId${uniqueId}`;

export const createChallengeMutation = async (
  challengeName: string,
  uniqueTextId: string,
  parentId: string
) => {
  return await mutation(
    createChallenge,
    await challengeVariablesData(challengeName, uniqueTextId, parentId)
  );
};

export const createChildChallenge = async (
  challengeId: string,
  oppName: string,
  oppTextId: string,
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
        challengeID: challengeId,
        displayName: oppName,
        nameID: oppTextId,
        context: {
          background: 'test background',
          vision: 'test vision',
          tagline: `${contextTagline}`,
          who: 'test who',
          impact: 'test impact',
          references: {
            name: 'test ref name',
            uri: 'https://test.com/',
            description: 'test description',
          },
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateChallenge = async (
  challengeId: string,
  challengeName: string,
  taglineText?: string,
  background?: string,
  vision?: string,
  impact?: string,
  who?: string,
  tagsArrey?: any
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
        displayName: challengeName,
        context: {
          tagline: taglineText,
          background: background,
          vision: vision,
          impact: impact,
          who: who,
        },
        tags: tagsArrey,
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

export const getChallengeData = async (hubId: string, challengeId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{hub (ID: "${hubId}") {challenge (ID: "${challengeId}") {
      ${challengeDataTest}
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeDataFromAllHubs = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{hubs {challenge (ID: "${challengeId}") {
      ${challengeDataTest}
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengesData = async (hubId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{hub (ID: "${hubId}"){ challenges{
        ${challengeDataTest}
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeOpportunity = async (
  hubId: string,
  challengeId: string
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query { hub (ID: "${hubId}"){
      challenge(ID: "${challengeId}") {
         ${challengeDataTest}}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
