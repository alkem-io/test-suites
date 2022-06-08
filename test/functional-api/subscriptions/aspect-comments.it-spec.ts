import { TestUser } from '@test/utils';
import { SubscriptionClient } from '@test/utils/subscriptions';
import {
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { mutation } from '@test/utils/graphql.request';

const COMMENTS_ID = '2dec41bf-3da7-4163-95c3-36e50f86b413';

const subscriptionQuery = `subscription CommentsMessageReceived($commentsId: UUID!) {
  communicationCommentsMessageReceived(commentsID: $commentsId) {
    commentsID
    message {
      id
      message
      sender
      timestamp
      __typename
    }
    __typename
  }
}`;

const subscriptionVariables = {
  commentsId: '2dec41bf-3da7-4163-95c3-36e50f86b413',
};

describe('Aspect comments subscription', () => {
  it('receives message after new comment is created', async () => {
    const subscription = new SubscriptionClient();
    // subscribe
    await subscription.subscribe(
      {
        operationName: 'CommentsMessageReceived',
        query: subscriptionQuery,
        variables: subscriptionVariables,
      },
      TestUser.GLOBAL_ADMIN
    );
    // create comment
    await mutation(
      sendComment,
      sendCommentVariablesData(COMMENTS_ID, 'test message on hub aspect'),
      TestUser.GLOBAL_ADMIN
    );
    // close subscription to prevent leaks
    subscription.terminate();
    // assert something is received
    expect(subscription.getMessages().length).toBe(1);
    // assert the latest is from the correct mutation and mutation result
    expect(subscription.getLatest()).toHaveProperty(
      'communicationCommentsMessageReceived'
    );
    // assert the latest message matches the expected
    expect(subscription.getLatest()).toMatchObject({
      communicationCommentsMessageReceived: {
        commentsID: COMMENTS_ID,
        message: {
          message: 'test message on hub aspect',
        },
      },
    });
  });
});
