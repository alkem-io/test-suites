import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
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
        innovationFlowTemplateID: entitiesId.hubInnovationFlowTemplateChId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const createOpportunityPredefinedData = async (
  challengeID: string,
  displayName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
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
        challengeID,
        profileData: {
          displayName,
          description: 'test description',
          tagline: 'test tagline',
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
        innovationFlowTemplateID: entitiesId.hubInnovationFlowTemplateOppId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const createOpportunity = async (
  challengeID: string,
  displayName: string,
  nameID: string,
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
        challengeID,
        nameID,
        profileData: {
          displayName,
          tagline: `${contextTagline}`,
          description: 'test description',
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
        innovationFlowTemplateID: entitiesId.hubInnovationFlowTemplateOppId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const createOpportunityNoTemplate = async (
  challengeID: string,
  displayName: string,
  nameID: string,
  innovationFlowTemplateID?: string
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
        challengeID,
        nameID,
        profileData: {
          displayName,
          description: 'test description',
          tagline: 'Test tagling',
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
        profileData: {
          displayName: 'updated',
          description: 'updated',
          tagline: 'updated',
        },
        context: {
          vision: 'updated',
          who: 'updated',
          impact: 'updated',
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateOpportunityReferences = async (opportunityId: string) => {
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
        profileData: {
          displayName: '1',
          description: '1',
          tagline: '1',
          references: [
            {
              name: 'test video' + uniqueId,
              uri: 'https://youtu.be/-wGlzcjs',
              description: 'dest description' + uniqueId,
            },
          ],
        },
        context: {
          vision: '1',
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
  opportunityId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query {hub(ID: "${hubId}") {
      opportunity(ID: "${opportunityId}") {
        ${opportunityData}
      }
    }}`,
  };

  return await graphqlRequestAuth(requestParams, userRole);
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
