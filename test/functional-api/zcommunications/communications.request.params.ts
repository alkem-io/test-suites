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
        title,
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
    title?: string;
    description?: string;
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
  const filteredDiscussion = allDiscussions.filter((obj: { title: string }) => {
    return obj.title === title;
  });
  return filteredDiscussion;
};

export const postDiscussionComment = async (
  discussionID: string,
  message = 'This is my message. :)',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation postDiscussionComment($messageData: DiscussionSendMessageInput!) {
      sendMessageToDiscussion(messageData: $messageData) {
          ${messagesData}
        }
      }`,
    variables: {
      messageData: {
        discussionID,
        message,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const removeMessageFromDiscussion = async (
  discussionID: string,
  messageID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeMessageFromDiscussion($messageData: DiscussionRemoveMessageInput!) {
      removeMessageFromDiscussion(messageData: $messageData)
      }`,
    variables: {
      messageData: {
        discussionID,
        messageID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const sendMessageToUser = async (
  receiverId: string,
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
        receiverId,
        message,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const sendMessageToOrganization = async (
  receiverId: string,
  message = 'This is my message. :)',
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation sendMessageToOrganization($messageData: CommunicationSendMessageToOrganizationInput!){
      sendMessageToOrganization(messageData: $messageData){
        ${messagesData}
      }
    }`,
    variables: {
      messageData: {
        receiverId,
        message,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
