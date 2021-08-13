import { challengeDataTest } from '../../../utils/common-params';
import { mutation, graphqlRequestAuth } from '../../../utils/graphql.request';
import {
  challengeVariablesData,
  createChallengeMut,
} from '../../../utils/mutations/create-mutation';
import { TestUser } from '../../../utils/token.helper';
import { ecoverseId } from '../ecoverse/ecoverse.request.params';

const uniqueId = (Date.now() + Math.random()).toString();
export const challengeNameId = `chalNaId${uniqueId}`;

// export const challengeVariablesData = async (
//   challengeName: string,
//   uniqueTextId: string
// ) => {
//   const variables = {
//     challengeData: {
//       parentID: await ecoverseId(), //'TestEco', //
//       displayName: challengeName,
//       nameID: uniqueTextId,
//       tags: 'testTags',
//       context: {
//         tagline: 'test tagline' + uniqueId,
//         background: 'test background' + uniqueId,
//         vision: 'test vision' + uniqueId,
//         impact: 'test impact' + uniqueId,
//         who: 'test who' + uniqueId,
//         references: [
//           {
//             name: 'test video' + uniqueId,
//             uri: 'https://youtu.be/-wGlzcjs',
//             description: 'dest description' + uniqueId,
//           },
//         ],
//       },
//     },
//   };
//   const responseData = JSON.stringify(variables);
//   return responseData;
// };

export const createChallangeMutation = async (
  challengeName: string,
  uniqueTextId: string,
  parentId: string
) => {
  return await mutation(
    createChallengeMut,
    await challengeVariablesData(challengeName, uniqueTextId, parentId)
  );
};

export const createChildChallengeMutation = async (
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

export const updateChallangeMutation = async (
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

export const removeChallangeMutation = async (challengeId: string) => {
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

export const addChallengeLeadToOrganisationMutation = async (
  organisationId: string,
  challengeId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignChallengeLead($assignInput: AssignChallengeLeadInput!) {
      assignChallengeLead(assignInput: $assignInput){id}
    }`,
    variables: {
      assignInput: {
        organisationID: organisationId,
        challengeID: challengeId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeChallengeLeadFromOrganisationMutation = async (
  organisationId: any,
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
        organisationID: organisationId,
        challengeID: challengeId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeData = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverse (ID: "${await ecoverseId()}") {challenge (ID: "${challengeId}") {
      ${challengeDataTest}
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeDataFromAllEcoverses = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverses {challenge (ID: "${challengeId}") {
      ${challengeDataTest}
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengesData = async () => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverse (ID: "${await ecoverseId()}"){ challenges{
        ${challengeDataTest}
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeOpportunity = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query { ecoverse (ID: "${await ecoverseId()}"){
      challenge(ID: "${challengeId}") {
         ${challengeDataTest}}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
