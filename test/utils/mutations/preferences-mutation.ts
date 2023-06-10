import { preferenceData } from '../common-params';
import { graphqlRequestAuth } from '../graphql.request';
import { TestUser } from '../token.helper';

export enum UserPreferenceType {
  USER_SIGN_UP = 'NOTIFICATION_USER_SIGN_UP',
  USER_REMOVED = 'NOTIFICATION_USER_REMOVED',
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
  USER_JOIN_COMMUNITY = 'NOTIFICATION_COMMUNITY_NEW_MEMBER',
  USER_JOIN_COMMUNITY_ADMIN = 'NOTIFICATION_COMMUNITY_NEW_MEMBER_ADMIN',
  POST_CREATED = 'NOTIFICATION_POST_CREATED',
  POST_CREATED_ADMIN = 'NOTIFICATION_POST_CREATED_ADMIN',
  POST_COMMENT_CREATED = 'NOTIFICATION_POST_COMMENT_CREATED',
  INTERESTED_IN_COLLABORATION_USER = 'NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_USER',
  INTERESTED_IN_COLLABORATION_ADMIN = 'NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_ADMIN',
  CALLOUT_PUBLISHED = 'NOTIFICATION_CALLOUT_PUBLISHED',
  WHITEBOARD_CREATED = 'NOTIFICATION_WHITEBOARD_CREATED',
  DISCUSSION_COMMENT_CREATED = 'NOTIFICATION_DISCUSSION_COMMENT_CREATED',
  ORGANIZATION_MESSAGE = 'NOTIFICATION_ORGANIZATION_MESSAGE',
  COMMUNICATION_MESSAGE = 'NOTIFICATION_COMMUNICATION_MESSAGE',
  ORGANIZATION_MENTION = 'NOTIFICATION_ORGANIZATION_MENTION',
  COMMUNICATION_MENTION = 'NOTIFICATION_COMMUNICATION_MENTION',
  FORUM_DISCUSSION_CREATED = 'NOTIFICATION_FORUM_DISCUSSION_CREATED',
  FORUM_DISCUSSION_COMMENT = 'NOTIFICATION_FORUM_DISCUSSION_COMMENT',
  INVITATION_USER = 'NOTIFICATION_COMMUNITY_INVITATION_USER',
}

export enum HubPreferenceType {
  ANONYMOUS_READ_ACCESS = 'AUTHORIZATION_ANONYMOUS_READ_ACCESS',
  APPLICATIONS_FROM_ANYONE = 'MEMBERSHIP_APPLICATIONS_FROM_ANYONE',
  JOIN_HUB_FROM_ANYONE = 'MEMBERSHIP_JOIN_HUB_FROM_ANYONE',
  JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS = 'MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS',
  ALLOW_MEMBERS_TO_CREATE_CHALLENGES = 'ALLOW_MEMBERS_TO_CREATE_CHALLENGES',
}

export enum ChallengePreferenceType {
  ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES = 'ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES',
  ALLOW_HUB_MEMBERS_TO_CONTRIBUTE = 'ALLOW_HUB_MEMBERS_TO_CONTRIBUTE',
  ALLOW_NON_MEMBERS_READ_ACCESS = 'ALLOW_NON_MEMBERS_READ_ACCESS',
  APPLY_CHALLENGE_FROM_HUB_MEMBERS = 'MEMBERSHIP_APPLY_CHALLENGE_FROM_HUB_MEMBERS',
  FEEDBACK_ON_CHALLENGE_CONTEXT = 'MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT',
  JOIN_CHALLENGE_FROM_HUB_MEMBERS = 'MEMBERSHIP_JOIN_CHALLENGE_FROM_HUB_MEMBERS',
}

export enum OrganizationPreferenceType {
  MATCH_DOMAIN = 'AUTHORIZATION_ORGANIZATION_MATCH_DOMAIN',
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

export const changePreferenceChallenge = async (
  challengeID: string,
  type: ChallengePreferenceType = ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS,
  value: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updatePreferenceOnChallenge($preferenceData: UpdateChallengePreferenceInput!) {
      updatePreferenceOnChallenge(preferenceData: $preferenceData) {
        ${preferenceData}
      }
    }`,
    variables: {
      preferenceData: {
        challengeID,
        type,
        value,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const changePreferenceOrganization = async (
  organizationID: string,
  type: OrganizationPreferenceType = OrganizationPreferenceType.MATCH_DOMAIN,
  value: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updatePreferenceOnOrganization($preferenceData: UpdateOrganizationPreferenceInput!) {
      updatePreferenceOnOrganization(preferenceData: $preferenceData)  {
        ${preferenceData}
      }
    }`,
    variables: {
      preferenceData: {
        organizationID,
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
