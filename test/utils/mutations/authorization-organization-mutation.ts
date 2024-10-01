import { TestUser } from '../token.helper';
import { getGraphqlClient } from '../graphqlClient';
import { graphqlErrorWrapper } from '../graphql.wrapper';
import { OrganizationRole } from '@test/generated/alkemio-schema';

export const grantCredentialToUserVariablesData = (
  userID: string,
  type: string,
  resourceID?: string
) => {
  const variables = {
    grantCredentialData: {
      userID,
      type,
      resourceID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const revokeCredentialFromUserVariablesData = (
  userID: string,
  type: string,
  resourceID?: string
) => {
  const variables = {
    revokeCredentialData: {
      userID,
      type,
      resourceID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignUserAsOrganizationOwner = async (
  userID: string,
  organizationID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignOrganizationRoleToUser(
      {
        membershipData: {
          userID,
          organizationID,
          role: OrganizationRole.Owner,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const setSpaceVisibilityVariableData = (ID: string, state: boolean) => {
  const variables = {
    spaceData: {
      ID,
      authorizationPolicy: {
        anonymousReadAccess: state,
      },
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignUserAsOrganizationAdmin = async (
  userID: string,
  organizationID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignOrganizationRoleToUser(
      {
        membershipData: {
          userID,
          organizationID,
          role: OrganizationRole.Admin,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removeUserAsOrganizationOwner = async (
  userID: string,
  organizationID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.removeOrganizationRoleFromUser(
      {
        membershipData: {
          userID,
          organizationID,
          role: OrganizationRole.Owner,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
