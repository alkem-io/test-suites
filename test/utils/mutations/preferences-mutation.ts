import {
  OrganizationPreferenceType,
  UserPreferenceType,
  SpacePrivacyMode,
  CommunityMembershipPolicy,
} from '@test/generated/alkemio-schema';
import { graphqlRequestAuth } from '../graphql.request';
import { graphqlErrorWrapper } from '../graphql.wrapper';
import { getGraphqlClient } from '../graphqlClient';
import { TestUser } from '../token.helper';

// export const changePreferenceSpaceCodegen = async (
//   spaceID: string,
//   type: SpacePreferenceTypeCodegen = SpacePreferenceTypeCodegen.AuthorizationAnonymousReadAccess,
//   value: string,
//   userRole: TestUser = TestUser.GLOBAL_ADMIN
// ) => {
//   const graphqlClient = getGraphqlClient();
//   const callback = (authToken: string | undefined) =>
//     graphqlClient.updatePreferenceOnSpace(
//       {
//         preferenceData: {
//           spaceID,
//           type,
//           value,
//         },
//       },
//       {
//         authorization: `Bearer ${authToken}`,
//       }
//     );

//   return graphqlErrorWrapper(callback, userRole);
// };

export const updateSpaceSettingsCodegen = async (
  spaceID: string,
  options?: {
    settings?: {
      privacy?: {
        mode?: SpacePrivacyMode.Private;
      };
      membership?: {
        policy?:
          | CommunityMembershipPolicy
          | CommunityMembershipPolicy.Applications;
        trustedOrganizations?: string[];
      };
      collaboration?: {
        allowMembersToCreateCallouts?: boolean;
        allowMembersToCreateSubspaces?: boolean;
        inheritMembershipRights?: boolean;
      };
    };
  },

  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSpaceSettings(
      {
        settingsData: {
          spaceID,
          settings: {
            privacy: {
              mode: SpacePrivacyMode.Private,
            },
            membership: {
              policy: CommunityMembershipPolicy.Applications,
              trustedOrganizations: [],
            },
            collaboration: {
              allowMembersToCreateCallouts: false,
              allowMembersToCreateSubspaces: false,
              inheritMembershipRights: false,
            },
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const changePreferenceOrganizationCodegen = async (
  organizationID: string,
  type: OrganizationPreferenceType = OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
  value: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.updatePreferenceOnOrganization(
      {
        preferenceData: {
          organizationID,
          type,
          value,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

// export const changePreferenceChallengeCodegen = async (
//   challengeID: string,
//   type: ChallengePreferenceTypeCodegen = ChallengePreferenceTypeCodegen.MembershipApplyChallengeFromSpaceMembers,
//   value: string,
//   userRole: TestUser = TestUser.GLOBAL_ADMIN
// ) => {
//   const graphqlClient = getGraphqlClient();
//   const callback = (authToken: string | undefined) =>
//     graphqlClient.updatePreferenceOnChallenge(
//       {
//         preferenceData: {
//           challengeID,
//           type,
//           value,
//         },
//       },
//       {
//         authorization: `Bearer ${authToken}`,
//       }
//     );

//   return graphqlErrorWrapper(callback, userRole);
// };

export const changePreferenceUserCodegen = async (
  userID: string,
  type: UserPreferenceType = UserPreferenceType.NotificationUserSignUp,
  value: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdatePreferenceOnUser(
      {
        preferenceData: {
          userID,
          type,
          value,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
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
