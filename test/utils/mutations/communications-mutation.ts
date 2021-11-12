import { communicationsDiscussionData } from '../common-params';

export enum DiscussionCategory {
  GENERAL = 'GENERAL',
  IDEAS = 'IDEAS',
  QUESTIONS = 'QUESTIONS',
  SHARING = 'SHARING',
}

export const createDiscussion = `
mutation createDiscussion($createData: CommunicationCreateDiscussionInput!) {
  createDiscussion(createData: $createData) {
      ${communicationsDiscussionData}
    }
  }`;

export const createDiscussionVariablesData = (
  communicationID: string,
  category: DiscussionCategory = DiscussionCategory.GENERAL,
  message: string = 'Default message',
  title: string = 'Default title'
) => {
  const variables = {
    createData: {
      communicationID,
      category,
      message,
      title,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const updateDiscussion = `
mutation updateDiscussion($updateData: UpdateDiscussionInput!) {
  updateDiscussion(updateData: $updateData) {
      ${communicationsDiscussionData}
    }
  }`;

export const updateDiscussionVariablesData = (
  discussionID: string,
  category: DiscussionCategory = DiscussionCategory.GENERAL,
  title: string = 'Default title'
) => {
  const variables = {
    updateData: {
      ID: discussionID,
      category,
      title,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const sendMessageToDiscussion = `
mutation sendMessageToDiscussion($messageData: DiscussionSendMessageInput!) {
  sendMessageToDiscussion(messageData: $messageData) {
      ${communicationsDiscussionData}
    }
  }`;

export const sendMessageToDiscussionVariablesData = (
  discussionID: string,
  message: string = 'New message'
) => {
  const variables = {
    messageData: {
      discussionID,
      message,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const removeMessageFromDiscussion = `
mutation removeMessageFromDiscussion($messageData: DiscussionRemoveMessageInput!) {
  removeMessageFromDiscussion(messageData: $messageData){
      ${communicationsDiscussionData}
    }
  }`;

export const removeMessageFromDiscussionVariablesData = (
  discussionID: string,
  messageID: string
) => {
  const variables = {
    messageData: {
      discussionID,
      messageID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
