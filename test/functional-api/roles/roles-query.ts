import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';

export const getOrganizationRole = async (
  organizationID: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query {
      rolesOrganization(rolesData: {organizationID: "${organizationID}"}) {
         spaces {
          id
          nameID
          roles
          challenges {
            displayName
            nameID
            id
            roles
          }
          opportunities {
            displayName
            nameID
            id
            roles
          }
          userGroups {
            nameID
            id
          }
        }
        organizations {
          nameID
          id
          roles
        }
      }
    } `,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, role);
};

export const getUserRole = async (
  userID: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query {
      rolesUser(rolesData: {userID: "${userID}"}) {
        spaces {
          nameID
          id
          roles
          challenges {
            nameID
            id
            roles
          }
          opportunities {
            nameID
            id
            roles
          }
          userGroups {
            nameID
            id
          }
        }
        organizations {
          nameID
          id
          roles
        }
      }
    } `,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, role);
};
