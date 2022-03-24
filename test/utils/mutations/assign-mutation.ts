import { communityData } from '../common-params';

export const assignUserToCommunity = `
mutation assignUserToCommunity($membershipData: AssignCommunityMemberInput!) {
  assignUserToCommunity(membershipData: $membershipData) {
      ${communityData}
    }
  }`;

export const assignUserToCommunityVariablesData = (
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
mutation assignUserToOrganization($input: AssignOrganizationMemberInput!) {
  assignUserToOrganization(membershipData: $input) {
    id
    displayName
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
