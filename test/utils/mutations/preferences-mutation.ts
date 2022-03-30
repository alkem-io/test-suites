import { preferenceData } from '../common-params';
import { graphqlRequestAuth } from '../graphql.request';
import { TestUser } from '../token.helper';

export enum UserPreferenceType {
  USER_SIGN_UP = 'NOTIFICATION_USER_SIGN_UP',
  APPLICATION_RECEIVED = 'NOTIFICATION_APPLICATION_RECEIVED',
  APPLICATION_SUBMITTED = 'NOTIFICATION_APPLICATION_SUBMITTED',
  DISCUSSION_CREATED = 'NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED',
  DISCUSSION_CREATED_ADMIN = 'NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED_ADMIN',
  DISCUSSION_RESPONSE = 'NOTIFICATION_COMMUNICATION_DISCUSSION_RESPONSE',
  UPDATES = 'NOTIFICATION_COMMUNICATION_UPDATES',
  UPDATE_SENT_ADMIN = 'NOTIFICATION_COMMUNICATION_UPDATE_SENT_ADMIN',
  SHARING = 'SHARING',
  REVIEW_SUBMITTED_ADMIN = 'NOTIFICATION_COMMUNITY_REVIEW_SUBMITTED_ADMIN',
  REVIEW_SUBMITTED = 'NOTIFICATION_COMMUNITY_REVIEW_SUBMITTED',
}

export enum HubPreferenceType {
  ANONYMOUS_READ_ACCESS = 'AUTHORIZATION_ANONYMOUS_READ_ACCESS',
  APPLICATIONS_FROM_ANYONE = 'MEMBERSHIP_APPLICATIONS_FROM_ANYONE',
  JOIN_HUB_FROM_ANYONE = 'MEMBERSHIP_JOIN_HUB_FROM_ANYONE',
  JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS = 'MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS',
}

export const updateUserPreference = `
mutation updatePreferenceOnUser($userPreferenceData: UpdateUserPreferenceInput!) {
  updateUserPreference(userPreferenceData: $userPreferenceData) {
    ${preferenceData}
  }
}`;

export const updateUserPreferenceVariablesData = (
  userID: string,
  type: UserPreferenceType = UserPreferenceType.USER_SIGN_UP,
  value: string
) => {
  const variables = {
    userPreferenceData: {
      userID,
      type,
      value,
    },
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const changePreferenceUser = async (
  userID: string,
  type: UserPreferenceType = UserPreferenceType.USER_SIGN_UP,
  value: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updatePreferenceOnUser($preferenceData: UpdateUserPreferenceInput!) {
      updatePreferenceOnUser(preferenceData: $preferenceData) {
        ${preferenceData}
      }
    }`,
    variables: {
      preferenceData: {
        userID,
        type,
        value,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const changePreferenceHub = async (
  hubID: string,
  type: HubPreferenceType = HubPreferenceType.ANONYMOUS_READ_ACCESS,
  value: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updatePreferenceOnHub($preferenceData: UpdateHubPreferenceInput!) {
      updatePreferenceOnHub(preferenceData: $preferenceData)  {
        ${preferenceData}
      }
    }`,
    variables: {
      preferenceData: {
        hubID,
        type,
        value,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const createFeedback = async (
  communityID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createFeedbackOnCommunityContext(
      $feedbackData: CreateFeedbackOnCommunityContextInput!
    ) {
      createFeedbackOnCommunityContext(feedbackData: $feedbackData)
    }`,
    variables: {
      feedbackData: {
        communityID,
        questions: [
          { name: 'Q1', value: 'No', sortOrder: 1 },
          { name: 'Q2', value: 'Yes', sortOrder: 2 },
        ],
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
