import {
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

export const createOpportunityCodegen = async (
  opportunityName: string,
  opportunityNameId: string,
  challengeID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
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

export const updateOpportunityCodegen = async (
  opportunityId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
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

export const deleteOpportunityCodegen = async (opportunityId: string) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
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

export const getOpportunityDataCodegen = async (
  opportunityId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
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
  const callback = (authToken: string | undefined) =>
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
  const callback = (authToken: string | undefined) =>
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
