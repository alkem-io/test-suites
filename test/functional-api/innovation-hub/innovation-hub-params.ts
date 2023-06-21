import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const createInnovationHub = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createInnovationHub($input: CreateInnovationHubInput!){
      createInnovationHub(createData: $input){
        id
        nameID
        profile {
          displayName
          visuals {
            id
          }
        }
        type
        hubListFilter {
          id
          nameID
          profile {
            displayName
          }
        }
        hubVisibilityFilter
      }
    }`,
    variables: {
      input: {
        subdomain: 'demo',
        type: 'VISIBILITY',
        nameID: 'demo',
        profileData: {
          displayName: 'demo space',
        },
        hubVisibilityFilter: 'DEMO',
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const removeInnovationHub = async (ID: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteInnovationHub($input: DeleteInnovationHubInput!) {
      deleteInnovationHub(deleteData: $input){
        id
      }
    }`,
    variables: {
      input: {
        ID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
