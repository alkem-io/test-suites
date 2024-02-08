import { RoleType } from '@test/functional-api/integration/community/community.request.params';
import { userData } from '../common-params';
import { graphqlRequestAuth } from '../graphql.request';
import { TestUser } from '../token.helper';

export const assignOrganizationAsCommunityMemberFunc = async (
  communityID: string,
  organizationID: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignOrganizationAsCommunityMember($roleData: AssignCommunityRoleToOrganizationInput!) {
      assignCommunityRoleToOrganization(roleData: $roleData)  {
            ${userData}
          }
        }`,
    variables: {
      roleData: {
        communityID,
        organizationID,
        role: RoleType.MEMBER,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const assignOrganizationAsCommunityLeadFunc = async (
  communityID: string,
  organizationID: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignOrganizationAsCommunityLead($roleData: AssignCommunityRoleToOrganizationInput!) {
      assignCommunityRoleToOrganization(roleData: $roleData){
          ${userData}
        }
      }`,
    variables: {
      roleData: {
        communityID,
        organizationID,
        role: RoleType.LEAD,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const assignUserToOrganization = `
mutation assignUserToOrganization($input: AssignOrganizationAssociateInput!) {
  assignUserToOrganization(membershipData: $input)  {
    id
  }
}`;

export const assignUserToOrganizationVariablesData = (
  organizationID: string,
  userID: string
) => {
  const variables = {
    input: {
      organizationID,
      userID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
