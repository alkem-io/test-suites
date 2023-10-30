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
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
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
        innovationFlowTemplateID: entitiesId.spaceInnovationFlowTemplateChId,
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
        innovationFlowTemplateID: entitiesId.spaceInnovationFlowTemplateOppId,
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
        innovationFlowTemplateID: entitiesId.spaceInnovationFlowTemplateOppId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const createOpportunityCodegen = async (
  opportunityName: string,
  opportunityNameId: string,
  challengeID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.createOpportunity(
      {
        opportunityData: {
          challengeID,
          nameID: opportunityNameId,
          profileData: {
            displayName: opportunityName,
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
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

export const updateOpportunityCodegen = async (
  opportunityId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.updateOpportunity(
      {
        opportunityData: opportunityVariablesDataCodegen(opportunityId),
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const opportunityVariablesDataCodegen = (opportunityId: string) => {
  const variables = {
    ID: opportunityId,
    profileData: {
      displayName: 'Updated displayName',
      tagline: 'updated tagline' + uniqueId,
      description: 'updated description' + uniqueId,
    },
    context: {
      vision: 'updated vision' + uniqueId,
      impact: 'updated impact' + uniqueId,
      who: 'updated who' + uniqueId,
    },
  };

  return variables;
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

export const removeOpportunityCodegen = async (opportunityId: string) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.deleteOpportunity(
      {
        deleteData: {
          ID: opportunityId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
};

export const getOpportunityData = async (
  spaceId: string,
  opportunityId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query {space(ID: "${spaceId}") {
      opportunity(ID: "${opportunityId}") {
        ${opportunityData}
      }
    }}`,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getOpportunityDataCodegen = async (
  opportunityId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.opportunityData(
      {
        opportunityId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getOpportunitiesDataCodegen = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.GetOpportunitiesFromSpace(
      {
        ID: spaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getOpportunitiesData = async (spaceId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {
      space(ID: "${spaceId}") {
      opportunities {
        ${opportunityData}
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getOpportunityCommunityAvailableMemberUsersData = async (
  spaceId: string,
  opportunityId: string
) => {
  const requestParams = {
    operationName: null,
    query: `query{space(ID: "${spaceId}") {opportunity(ID: "${opportunityId}") {${communityAvailableMemberUsersData}}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getOpportunityCommunityAvailableLeadUsersData = async (
  spaceId: string,
  opportunityId: string
) => {
  const requestParams = {
    operationName: null,
    query: `query{space(ID: "${spaceId}") {opportunity(ID: "${opportunityId}") {${communityAvailableLeadUsersData}}}}`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateOpportunityLocation = async (
  opportunityId: string,
  country?: string,
  city?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.updateOpportunity(
      {
        opportunityData: {
          ID: opportunityId,
          profileData: { location: { country, city } },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
