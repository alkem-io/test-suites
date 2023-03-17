import { communityData } from '../common-params';
import { graphqlRequestAuth } from '../graphql.request';
import { TestUser } from '../token.helper';

export const assignUserAsCommunityMember = `
mutation assignUserAsCommunityMember($membershipData: AssignCommunityMemberUserInput!) {
  assignUserAsCommunityMember(membershipData: $membershipData) {
      ${communityData}
    }
  }`;

export const assignUserAsCommunityMemberVariablesData = (
  communityID: string,
  userID: string
) => {
  const variables = {
    membershipData: {
      communityID,
      userID,
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
    query: `mutation assignUserAsCommunityMember($membershipData: AssignCommunityMemberUserInput!) {
      assignUserAsCommunityMember(membershipData: $membershipData) {
          ${communityData}
        }
      }`,
    variables: {
      membershipData: {
        communityID,
        userID,
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
    query: `mutation assignUserAsCommunityLead($leadershipData: AssignCommunityLeadUserInput!) {
      assignUserAsCommunityLead(leadershipData: $leadershipData)  {
            ${communityData}
          }
        }`,
    variables: {
      leadershipData: {
        communityID,
        userID,
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
    query: `mutation assignOrganizationAsCommunityMember($membershipData: AssignCommunityMemberOrganizationInput!) {
      assignOrganizationAsCommunityMember(membershipData: $membershipData)  {
            ${communityData}
          }
        }`,
    variables: {
      membershipData: {
        communityID,
        organizationID,
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
    query: `mutation assignOrganizationAsCommunityLead($leadershipData: AssignCommunityLeadOrganizationInput!) {
      assignOrganizationAsCommunityLead(leadershipData: $leadershipData){
          ${communityData}
        }
      }`,
    variables: {
      leadershipData: {
        communityID,
        organizationID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const assignUserAsCommunityLead = `
mutation assignUserAsCommunityLead($leadershipData: AssignCommunityLeadUserInput!) {
  assignUserAsCommunityLead(leadershipData: $leadershipData)  {
        ${communityData}
      }
    }`;

export const assignUserAsCommunityLeadVariablesData = (
  communityID: string,
  userID: string
) => {
  const variables = {
    leadershipData: {
      communityID,
      userID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignOrganizationAsCommunityMember = `
mutation assignOrganizationAsCommunityMember($membershipData: AssignCommunityMemberOrganizationInput!) {
  assignOrganizationAsCommunityMember(membershipData: $membershipData)  {
        ${communityData}
      }
    }`;

export const assignOrganizationAsCommunityMemberVariablesData = (
  communityID: string,
  organizationID: string
) => {
  const variables = {
    membershipData: {
      communityID,
      organizationID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignOrganizationAsCommunityLead = `
    mutation assignOrganizationAsCommunityLead($leadershipData: AssignCommunityLeadOrganizationInput!) {
      assignOrganizationAsCommunityLead(leadershipData: $leadershipData){
          ${communityData}
        }
      }`;

export const assignOrganizationAsCommunityLeadVariablesData = (
  communityID: string,
  organizationID: string
) => {
  const variables = {
    leadershipData: {
      communityID,
      organizationID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignUserToGroup = `
mutation assignUserToGroup($membershipData: AssignUserGroupMemberInput!) {
  assignUserToGroup(membershipData: $membershipData){id displayName}
}`;

export const assignUserToGroupVariablesData = (
  groupID: string,
  userID: string
) => {
  const variables = {
    membershipData: {
      groupID,
      userID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const assignUserToOrganization = `
mutation assignUserToOrganization($input: AssignOrganizationAssociateInput!) {
  assignUserToOrganization(membershipData: $input) {
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
