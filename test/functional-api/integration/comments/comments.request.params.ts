import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const postCommentInCallout = async (
  calloutID: string,
  message: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation PostCommentInCallout($data: SendMessageOnCalloutInput!) {
      sendMessageOnCallout(data: $data) {
        id
        message
        sender
        timestamp
      }
    }`,
    variables: {
      data: {
        calloutID,
        message,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
