import {
  challengeDataTest,
  opportunityData,
  communityAvailableMemberUsersData,
  communityAvailableLeadUsersData,
} from '@test/utils/common-params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { TestUser } from '../../../utils/token.helper';
export const opportunityNameId = `oppNaId${uniqueId}`;

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

export const createOpportunity = async (
  challengeId: string,
  oppName: string,
  oppTextId: string,
  contextTagline?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createOpportunity($opportunityData: CreateOpportunityInput!) {
      createOpportunity(opportunityData: $opportunityData) {
        ${opportunityData}
      }
    }`,
    variables: {
      opportunityData: {
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

export const updateOpportunity = async (opportunityId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateOpportunity($opportunityData: UpdateOpportunityInput!) {
      updateOpportunity(opportunityData: $opportunityData) {
        ${opportunityData}
      }
    }`,
    variables: {
      opportunityData: {
        ID: opportunityId,
        displayName: '1',
        context: {
          background: '1',
          vision: '1',
          tagline: '1',
          who: '1',
          impact: '1',
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeOpportunity = async (opportunityId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteOpportunity($deleteData: DeleteOpportunityInput!) {
      deleteOpportunity(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: opportunityId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getOpportunityData = async (
  hubId: string,
  opportunityId: string
) => {
  const requestParams = {
    operationName: null,
    query: `query {hub(ID: "${hubId}") {
      opportunity(ID: "${opportunityId}") {
        ${opportunityData}
      }
    }}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getOpportunitiesData = async (hubId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {
      hub(ID: "${hubId}") {
      opportunities {
        ${opportunityData}
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getOpportunityCommunityAvailableMemberUsersData = async (
  hubId: string,
  opportunityId: string
) => {
  const requestParams = {
    operationName: null,
    query: `query{hub(ID: "${hubId}") {opportunity(ID: "${opportunityId}") {${communityAvailableMemberUsersData}}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getOpportunityCommunityAvailableLeadUsersData = async (
  hubId: string,
  opportunityId: string
) => {
  const requestParams = {
    operationName: null,
    query: `query{hub(ID: "${hubId}") {opportunity(ID: "${opportunityId}") {${communityAvailableLeadUsersData}}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
