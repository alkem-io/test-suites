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
mutation removeUpdateCommunity($msgData: CommunityRemoveMessageInput!) {
  removeMessageFromCommunityUpdates(messageData: $msgData)
}`;

export const removeUpdateCommunityVariablesData = (
  communityID: string,
  messageId: string
) => {
  const variables = {
    msgData: {
      communityID,
      messageId,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
