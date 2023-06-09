import { TestUser } from '@test/utils';
import {
  communicationsDiscussionData,
  messagesData,
} from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { DiscussionCategory } from '@test/utils/mutations/communications-mutation';

export const createDiscussion = async (
  communicationID: string,
  title = 'Default title',
  category: DiscussionCategory = DiscussionCategory.PLATFORM_FUNCTIONALITIES,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createDiscussion($createData: CommunicationCreateDiscussionInput!) {
      createDiscussion(createData: $createData) {
        ${communicationsDiscussionData}
      }
    }`,
    variables: {
      createData: {
        communicationID,
        profile: {
          displayName: title,
        },
        category,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const updateDiscussion = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  options?: {
    profileData?: {
      displayName?: string;
      description?: string;
    };
    category?: DiscussionCategory;
  }
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateDiscussion($updateData: UpdateDiscussionInput!) {
      updateDiscussion(updateData: $updateData) {
          ${communicationsDiscussionData}
        }
      }`,
    variables: {
      updateData: {
        ID,
        ...options,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const deleteDiscussion = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteDiscussion($deleteData: DeleteDiscussionInput!) {
      deleteDiscussion(deleteData: $deleteData) {
        id
      }
    }`,
    variables: {
      deleteData: {
        ID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getPlatformCommunicationId = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: 'query{platform{communication{id }}}',
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getPlatformId = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: 'query{platform{id }}',
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getPlatformDiscussionsData = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query {
      platform {
        communication {
          id
          discussions {
            ${communicationsDiscussionData}
          }
        }
      }
    }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getPlatformDiscussionsDataById = async (
  discussionId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query {
      platform {
        communication {
          id
          discussion(ID: "${discussionId}") {
            ${communicationsDiscussionData}
          }
        }
      }
    }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getPlatformDiscussionsDataByTitle = async (title: string) => {
  const platformDiscussions = await getPlatformDiscussionsData();
  const allDiscussions =
    platformDiscussions.body.data.platform.communication.discussions;
  const filteredDiscussion = allDiscussions.filter(
    (obj: { profile: { displayName: string } }) => {
      return obj.profile.displayName === title;
    }
  );
  return filteredDiscussion;
};

export const postDiscussionComment = async (
  roomID: string,
  message = 'This is my message. :)',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation sendMessageToRoom($messageData: RoomSendMessageInput!) {
      sendMessageToRoom(messageData: $messageData) {
          ${messagesData}
        }
      }`,
    variables: {
      messageData: {
        roomID,
        message,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const removeMessageFromDiscussion = async (
  roomID: string,
  messageID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeMessageOnRoom($messageData: RoomRemoveMessageInput!) {
      removeMessageOnRoom(messageData: $messageData)
    }`,
    variables: {
      messageData: {
        roomID,
        messageID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const sendMessageToUser = async (
  receiverIds: string[],
  message = 'This is my message. :)',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation sendMessageToUser($messageData: CommunicationSendMessageToUserInput!){
      sendMessageToUser(messageData: $messageData)
    }`,
    variables: {
      messageData: {
        receiverIds,
        message,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const sendMessageToOrganization = async (
  organizationId: string,
  message = 'This is my message. :)',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation sendMessageToOrganization($messageData: CommunicationSendMessageToOrganizationInput!){
      sendMessageToOrganization(messageData: $messageData)
    }`,
    variables: {
      messageData: {
        organizationId,
        message,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const sendMessageToCommunityLeads = async (
  communityId: string,
  message = 'This is my message. :)',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation sendMessageToCommunityLeads($messageData: CommunicationSendMessageToCommunityLeadsInput!){
      sendMessageToCommunityLeads(messageData: $messageData)
    }`,
    variables: {
      messageData: {
        communityId,
        message,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
