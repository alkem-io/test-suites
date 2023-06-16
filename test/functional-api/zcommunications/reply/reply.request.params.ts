import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const replyMessage = async (
  threadID: string,
  roomID: string,
  message: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation sendMessageReplyToRoom($messageData: RoomSendMessageReplyInput!){
      sendMessageReplyToRoom(messageData: $messageData){
        id
        message
        threadID
        reactions {
          id
          emoji
          sender {
            email
          }
        }
      }
    }
    `,
    variables: {
      messageData: {
        threadID,
        roomID,
        message,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
