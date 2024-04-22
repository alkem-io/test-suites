import { uniqueId } from '@test/utils/mutations/create-mutation';
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
    graphqlClient.CreateSubspace(
      {
        subspaceData: {
          spaceID: challengeID,
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
    graphqlClient.updateSpace(
      {
        spaceData: opportunityVariablesDataCodegen(opportunityId),
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
    graphqlClient.deleteSpace(
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
    graphqlClient.GetSpaceData(
      {
        spaceId: opportunityId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateOpportunityLocation = async (
  opportunityId: string,
  country?: string,
  city?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.updateSpace(
      {
        spaceData: {
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
