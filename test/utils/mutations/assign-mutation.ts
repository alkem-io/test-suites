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
  assignUserToGroup(membershipData: $membershipData){id name}
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
