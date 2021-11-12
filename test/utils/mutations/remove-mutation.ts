import { communityData } from '../common-params';
import { mutation } from '../graphql.request';
import { TestUser } from '../token.helper';

export const removeUserFromCommunity = `
mutation removeUserFromCommunity($membershipData: RemoveCommunityMemberInput!) {
  removeUserFromCommunity(membershipData: $membershipData) {
      ${communityData}
    }
  }`;

export const removeUserFromCommunityVariablesData = (
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

export const removeUserFromGroup = `
mutation removeUserFromGroup($membershipData: RemoveUserGroupMemberInput!) {
  removeUserFromGroup(membershipData: $membershipData) {
    name,
    id,
    members {
      id,
      nameID
    }
  }
}`;

export const removeUserFromGroupVariablesData = (
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

export const removeUpdateCommunity = `
mutation removeUpdateCommunity($msgData: UpdatesRemoveMessageInput!) {
  removeUpdate(messageData: $msgData)
}`;

export const removeUpdateCommunityVariablesData = (
  updatesID: string,
  messageID: string
) => {
  const variables = {
    msgData: {
      updatesID,
      messageID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
