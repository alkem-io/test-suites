import { communicationsDiscussionData, messagesData } from '../common-params';

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
  title: string = 'Default title'
) => {
  const variables = {
    createData: {
      communicationID,
      category,
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
  title: string = 'Default title',
  description: string = 'Default description'
) => {
  const variables = {
    updateData: {
      ID: discussionID,
      category,
      title,
      description,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const postDiscussionComment = `
mutation postDiscussionComment($messageData: DiscussionSendMessageInput!) {
  sendMessageToDiscussion(messageData: $messageData) {
      ${messagesData}
    }
  }`;

export const postDiscussionCommentVariablesData = (
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
  removeMessageFromDiscussion(messageData: $messageData)      
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

export const sendComment = `
mutation sendComment($messageData: CommentsSendMessageInput!) {
  sendComment(messageData: $messageData){
      ${messagesData}
    }
  }`;

export const sendCommentVariablesData = (
  commentsID: string,
  message: string = 'New message'
) => {
  const variables = {
    messageData: {
      commentsID,
      message,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const removeComment = `
mutation removeComment($messageData: CommentsRemoveMessageInput!) {
  removeComment(messageData: $messageData)
}`;

export const removeCommentVariablesData = (
  commentsID: string,
  messageID: string
) => {
  const variables = {
    messageData: {
      commentsID,
      messageID,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};
