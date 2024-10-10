import { GraphQLClient } from 'graphql-request';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
  SpaceVisibility,
} from '../../../generated/alkemio-schema';
import { TestUser } from '../../../utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';


const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const spaceName = `testEcoName${uniqueId}`;
export const spaceNameId = `testecoeid${uniqueId}`;

export const createSpaceBasicData = async (
  spaceName: string,
  spaceNameId: string,
  accountID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSpaceBasicData(
      {
        spaceData: {
          nameID: spaceNameId,
          profileData: {
            displayName: spaceName,
          },
          collaborationData: {
            addTutorialCallouts: true,
          },
          accountID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const createSpaceAndGetData = async (
  spaceName: string,
  spaceNameId: string,
  accountID: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const response = await createSpaceBasicData(
    spaceName,
    spaceNameId,
    accountID,
    role
  );
  const spaceId = response?.data?.createSpace.id ?? '';
  await updateSpaceSettings(spaceId, {
    privacy: { allowPlatformSupportAsAdmin: true },
  });

  const spaceData = await getSpaceData(spaceId);

  return spaceData;
};

export const getSpacesCount = async () => {
  const res = await getSpacesData();
  const spacesData = res?.data?.spaces ?? [];
  const count = Object.keys(spacesData[0]).length;
  return count;
};

export const getSpaceData = async (
  spaceId = spaceNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpaceData(
      {
        spaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getSpacesData = async (role = TestUser.GLOBAL_ADMIN) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpacesData(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getRoleSetUserPrivilege = async (
  roleSetId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RoleSetUserPrivileges(
      { roleSetId: roleSetId },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getPrivateSpaceData = async (
  nameId = spaceNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.PrivateSpaceData(
      {
        nameId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const spaceId = async (): Promise<any> => {
  const responseQuery = await getSpaceData();

  const response = responseQuery?.data?.space.id;
  return response;
};

export const deleteSpace = async (spaceId: string) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteSpace(
      {
        deleteData: {
          ID: spaceId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
};

export const updateSpacePlatformSettings = async (
  spaceId: string,
  nameId: any,
  visibility: SpaceVisibility,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSpacePlatformSettings(
      {
        spaceId,
        nameId,
        visibility,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateSpaceSettings = async (
  spaceID: string,
  // options?: {
  settings?: {
    privacy?: {
      mode?: SpacePrivacyMode;
      allowPlatformSupportAsAdmin?: boolean;
    };
    membership?: {
      allowSubspaceAdminsToInviteMembers?: boolean;
      policy?: CommunityMembershipPolicy;
      trustedOrganizations?: string[];
    };
    collaboration?: {
      allowMembersToCreateCallouts?: boolean;
      allowMembersToCreateSubspaces?: boolean;
      inheritMembershipRights?: boolean;
    };
    //},
    // },
  },

  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSpaceSettings(
      {
        // todo: defaults?
        settingsData: {
          spaceID,
          settings: {
            privacy: {
              // mode: settings?.privacy?.mode || SpacePrivacyMode.Private, // todo
              mode: settings?.privacy?.mode, // todo
              allowPlatformSupportAsAdmin:
                settings?.privacy?.allowPlatformSupportAsAdmin || true,
            },
            membership: {
              allowSubspaceAdminsToInviteMembers:
                settings?.membership?.allowSubspaceAdminsToInviteMembers ||
                true,
              policy:
                settings?.membership?.policy || CommunityMembershipPolicy.Open,
              trustedOrganizations: [],
            },
            collaboration: {
              allowMembersToCreateCallouts:
                settings?.collaboration?.allowMembersToCreateCallouts || false,
              allowMembersToCreateSubspaces:
                settings?.collaboration?.allowMembersToCreateSubspaces || false,
              inheritMembershipRights:
                settings?.collaboration?.inheritMembershipRights ?? true,
            },
          }, // Add an empty object for the settings property
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateSpaceLocation = async (
  spaceId: string,
  country?: string,
  city?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.updateSpace(
      {
        spaceData: {
          ID: spaceId,
          profileData: { location: { country, city } },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateSpaceContext = async (
  spaceId: string,
  displayName?: string,
  options?: {
    impact?: string | 'Updated Impact';
    vision?: string | 'Updated Vision';
    who?: string | 'Updated Who';
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.updateSubspace(
      {
        spaceData: {
          ID: spaceId,
          profileData: { displayName },
          context: {
            ...options,
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSpacesFilteredByVisibilityWithAccess = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpacesFilteredByVisibilityWithAccess(
      {
        spaceIDs: spaceId,
        spaceFilter: {
          visibilities: [
            SpaceVisibility.Archived,
            SpaceVisibility.Active,
            SpaceVisibility.Demo,
          ],
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSpacesFilteredByVisibilityNoAccess = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpacesFilteredByVisibilityWithAccess(
      {
        spaceIDs: spaceId,
        spaceFilter: {
          visibilities: [
            SpaceVisibility.Archived,
            SpaceVisibility.Active,
            SpaceVisibility.Demo,
          ],
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getUserRoleSpacesVisibility = async (
  userID: string,
  visibility: SpaceVisibility,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetUserRoles(
      {
        rolesData: {
          userID,
          filter: { visibilities: [visibility] },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
