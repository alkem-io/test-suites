import { TestUser } from '../../../utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@test/generated/alkemio-schema';

const uniqueId = (Date.now() + Math.random()).toString();
export const challengeNameId = `chalNaId${uniqueId}`;

export const getSubspaceDataCodegen = async (
  spaceId: string,
  subspaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSubspacePage(
      {
        spaceId,
        subspaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSubspacesDataCodegen = async (spaceId: string) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSubspacesData(
      {
        spaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
};

export const createSubspaceCodegen = async (
  challengeName: string,
  challengeNameId: string,
  parentId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  innovationFlowTemplateID?: string
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSubspace(
      {
        subspaceData: challengeVariablesDataCodegen(
          challengeName,
          challengeNameId,
          parentId,
          innovationFlowTemplateID
        ),
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const challengeVariablesDataCodegen = (
  displayName: string,
  nameId: string,
  spaceId: string,
  innovationFlowTemplateID = entitiesId.spaceInnovationFlowTemplateChId
) => {
  const variables = {
    nameID: nameId,
    spaceID: spaceId,
    profileData: {
      displayName,
      tagline: 'test tagline' + uniqueId,
      description: 'test description' + uniqueId,
      referencesData: [
        {
          name: 'test video' + uniqueId,
          uri: 'https://youtu.be/-wGlzcjs',
          description: 'dest description' + uniqueId,
        },
      ],
    },
    context: {
      vision: 'test vision' + uniqueId,
      impact: 'test impact' + uniqueId,
      who: 'test who' + uniqueId,
    },
    collaborationData: {
      innovationFlowTemplateID,
    },
  };

  return variables;
};

// export const updateSubspaceSettingsCodegen = async (
//   subspaceID: string,
//   settings?: {
//     privacy?: {
//       mode?: SpacePrivacyMode;
//     };
//     membership?: {
//       policy?: CommunityMembershipPolicy;
//       trustedOrganizations?: string[];
//     };
//     collaboration?: {
//       allowMembersToCreateCallouts?: boolean;
//       allowMembersToCreateSubspaces?: boolean;
//       inheritMembershipRights?: boolean;
//     };
//   },
//   userRole: TestUser = TestUser.GLOBAL_ADMIN
// ) => {
//   const graphqlClient = getGraphqlClient();
//   const callback = (authToken: string | undefined) =>
//     graphqlClient.UpdateSubspaceSettings(
//       {
//         settingsData: {
//           subspaceID,
//           settings: {
//             privacy: {
//               mode: settings?.privacy?.mode || SpacePrivacyMode.Private,
//             },
//             membership: {
//               policy:
//                 settings?.membership?.policy || CommunityMembershipPolicy.Open,
//               trustedOrganizations: [],
//             },
//             collaboration: {
//               allowMembersToCreateCallouts:
//                 settings?.collaboration?.allowMembersToCreateCallouts || false,
//               allowMembersToCreateSubspaces:
//                 settings?.collaboration?.allowMembersToCreateSubspaces || false,
//               inheritMembershipRights:
//                 settings?.collaboration?.inheritMembershipRights || true,
//             },
//           }, // Add an empty object for the settings property
//         },
//       },
//       {
//         authorization: `Bearer ${authToken}`,
//       }
//     );

//   return graphqlErrorWrapper(callback, userRole);
// };
