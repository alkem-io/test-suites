import { TestUser } from '@alkemio/tests-lib';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Inline fragment that includes push (the generated SDK fragment doesn't include it yet)
const USER_SETTINGS_WITH_PUSH_FRAGMENT = `
  fragment userSettingsWithPush on UserSettings {
    id
    notification {
      platform {
        admin {
          userProfileRemoved { email inApp push }
          userProfileCreated { email inApp push }
          spaceCreated { email inApp push }
          userGlobalRoleChanged { email inApp push }
        }
        forumDiscussionComment { email inApp push }
        forumDiscussionCreated { email inApp push }
      }
      organization {
        adminMentioned { email inApp push }
        adminMessageReceived { email inApp push }
      }
      space {
        admin {
          communityApplicationReceived { email inApp push }
          collaborationCalloutContributionCreated { email inApp push }
          communityNewMember { email inApp push }
          communicationMessageReceived { email inApp push }
        }
        collaborationCalloutContributionCreated { email inApp push }
        communicationUpdates { email inApp push }
        collaborationCalloutPublished { email inApp push }
        collaborationCalloutComment { email inApp push }
        collaborationCalloutPostContributionComment { email inApp push }
        communityCalendarEvents { email inApp push }
        collaborationPollVoteCastOnOwnPoll { email inApp push }
        collaborationPollVoteCastOnPollIVotedOn { email inApp push }
        collaborationPollModifiedOnPollIVotedOn { email inApp push }
        collaborationPollVoteAffectedByOptionChange { email inApp push }
      }
      user {
        membership {
          spaceCommunityInvitationReceived { email inApp push }
          spaceCommunityJoined { email inApp push }
        }
        mentioned { email inApp push }
        commentReply { email inApp push }
        messageReceived { email inApp push }
      }
      virtualContributor {
        adminSpaceCommunityInvitation { email inApp push }
      }
    }
  }
`;

export const updateUserSettingsWithPush = async (
  userID: string,
  settings: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: 'UpdateUserSettingsWithPush',
    query: `
      ${USER_SETTINGS_WITH_PUSH_FRAGMENT}
      mutation UpdateUserSettingsWithPush($settingsData: UpdateUserSettingsInput!) {
        updateUserSettings(settingsData: $settingsData) {
          id
          settings {
            ...userSettingsWithPush
          }
        }
      }
    `,
    variables: {
      settingsData: {
        userID,
        settings,
      },
    },
  };
  return graphqlRequestAuth(requestParams, userRole);
};

export const subscribeToPushNotifications = async (
  endpoint: string,
  p256dh: string,
  auth: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  userAgent?: string
) => {
  const requestParams = {
    operationName: 'SubscribeToPushNotifications',
    query: `
      mutation SubscribeToPushNotifications($subscriptionData: SubscribeToPushNotificationsInput!) {
        subscribeToPushNotifications(subscriptionData: $subscriptionData) {
          id
          createdDate
          status
          userAgent
          lastActiveDate
        }
      }
    `,
    variables: {
      subscriptionData: {
        endpoint,
        p256dh,
        auth,
        ...(userAgent && { userAgent }),
      },
    },
  };
  return graphqlRequestAuth(requestParams, userRole);
};

export const unsubscribeFromPushNotifications = async (
  subscriptionID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: 'UnsubscribeFromPushNotifications',
    query: `
      mutation UnsubscribeFromPushNotifications($subscriptionData: UnsubscribeFromPushNotificationsInput!) {
        unsubscribeFromPushNotifications(subscriptionData: $subscriptionData) {
          id
          status
        }
      }
    `,
    variables: {
      subscriptionData: {
        subscriptionID,
      },
    },
  };
  return graphqlRequestAuth(requestParams, userRole);
};

export const getVapidPublicKey = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: 'VapidPublicKey',
    query: `
      query VapidPublicKey {
        vapidPublicKey
      }
    `,
    variables: {},
  };
  return graphqlRequestAuth(requestParams, userRole);
};

export const getMyPushSubscriptions = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: 'MyPushSubscriptions',
    query: `
      query MyPushSubscriptions {
        myPushSubscriptions {
          id
          createdDate
          status
          userAgent
          lastActiveDate
        }
      }
    `,
    variables: {},
  };
  return graphqlRequestAuth(requestParams, userRole);
};

// Helper to generate unique fake push subscription data for tests
let pushEndpointCounter = 0;
export const generateFakePushSubscription = (prefix = 'test') => {
  pushEndpointCounter++;
  const uniqueId = `${prefix}-${Date.now()}-${pushEndpointCounter}`;
  return {
    endpoint: `https://fcm.googleapis.com/fcm/send/${uniqueId}`,
    p256dh: `BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfXPQ-${uniqueId}`,
    auth: `tBHItJI5svbpC7htN-${uniqueId.slice(0, 8)}`,
  };
};
