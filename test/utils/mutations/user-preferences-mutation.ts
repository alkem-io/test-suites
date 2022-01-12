import { preferenceData } from '../common-params';

export enum PreferenceType {
  USER_SIGN_UP = 'NOTIFICATION_USER_SIGN_UP',
  APPLICATION_RECEIVED = 'NOTIFICATION_APPLICATION_RECEIVED',
  APPLICATION_SUBMITTED = 'NOTIFICATION_APPLICATION_SUBMITTED',
  DISCUSSION_CREATED = 'NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED',
  DISCUSSION_CREATED_ADMIN = 'NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED_ADMIN',
  DISCUSSION_RESPONSE = 'NOTIFICATION_COMMUNICATION_DISCUSSION_RESPONSE',
  UPDATES = 'NOTIFICATION_COMMUNICATION_UPDATES',
  UPDATE_SENT_ADMIN = 'NOTIFICATION_COMMUNICATION_UPDATE_SENT_ADMIN',
  SHARING = 'SHARING',
}

export const updateUserPreference = `
mutation updateUserPreference($userPreferenceData: UpdateUserPreferenceInput!) {
  updateUserPreference(userPreferenceData: $userPreferenceData) {
    ${preferenceData}
  }
}`;

export const updateUserPreferenceVariablesData = (
  userID: string,
  type: PreferenceType = PreferenceType.USER_SIGN_UP,
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
