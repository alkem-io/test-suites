import { RoleType } from '@test/functional-api/integration/community/community.request.params';
import { userData } from '../common-params';
import { graphqlRequestAuth } from '../graphql.request';
import { TestUser } from '../token.helper';

export const assignUserAsCommunityMember = `
mutation assignUserAsCommunityMember($roleData: AssignCommunityRoleToUserInput!) {
  assignCommunityRoleToUser(roleData: $roleData) {
      ${userData}
    }
  }`;

export const assignUserAsCommunityMemberVariablesData = (
  communityID: string,
  userID: string
) => {
  const variables = {
    roleData: {
      communityID,
      userID,
      role: RoleType.MEMBER,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignUserAsCommunityMemberFunc = async (
  communityID: string,
  userID: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignCommunityRoleToUser($roleData: AssignCommunityRoleToUserInput!) {
      assignCommunityRoleToUser(roleData: $roleData) {
          ${userData}
        }
      }`,
    variables: {
      roleData: {
        communityID,
        userID,
        role: RoleType.MEMBER,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const assignUserAsCommunityLeadFunc = async (
  communityID: string,
  userID: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignUserAsCommunityLead($roleData: AssignCommunityRoleToUserInput!) {
      assignCommunityRoleToUser(roleData: $roleData)  {
            ${userData}
          }
        }`,
    variables: {
      roleData: {
        communityID,
        userID,
        role: RoleType.LEAD,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

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

export const assignUserAsCommunityLead = `
mutation assignUserAsCommunityLead($roleData: AssignCommunityRoleToUserInput!) {
  assignCommunityRoleToUser(roleData: $roleData)  {
        ${userData}
      }
    }`;

export const assignUserAsCommunityLeadVariablesData = (
  communityID: string,
  userID: string
) => {
  const variables = {
    roleData: {
      communityID,
      userID,
      role: RoleType.LEAD,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignOrganizationAsCommunityMember = `
mutation assignOrganizationAsCommunityMember($roleData: AssignCommunityRoleToOrganizationInput!) {
  assignCommunityRoleToOrganization(roleData: $roleData)  {
        ${userData}
      }
    }`;

export const assignOrganizationAsCommunityMemberVariablesData = (
  communityID: string,
  organizationID: string
) => {
  const variables = {
    roleData: {
      communityID,
      organizationID,
      role: RoleType.MEMBER,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignOrganizationAsCommunityLead = `
    mutation assignOrganizationAsCommunityLead($roleData: AssignCommunityRoleToOrganizationInput!) {
      assignCommunityRoleToOrganization(roleData: $roleData){
          ${userData}
        }
      }`;

export const assignOrganizationAsCommunityLeadVariablesData = (
  communityID: string,
  organizationID: string
) => {
  const variables = {
    roleData: {
      communityID,
      organizationID,
      role: RoleType.LEAD,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignUserToGroup = `
mutation assignUserToGroup($roleData: AssignUserGroupMemberInput!) {
  assignUserToGroup(roleData: $roleData){id displayName}
}`;

export const assignUserToGroupVariablesData = (
  groupID: string,
  userID: string
) => {
  const variables = {
    roleData: {
      groupID,
      userID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
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
