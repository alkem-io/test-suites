/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SpaceVisibility,
  SpacePrivacyMode,
  CommunityMembershipPolicy,
} from '@alkemio/client-lib';
import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { CreateSpaceOnAccountInput } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
const uniqueId = UniqueIDGenerator.getID();

export const spaceName = `testEcoName${uniqueId}`;
export const spaceNameId = `testecoeid${uniqueId}`;

export const createSpaceBasicData = async (
  spaceName: string,
  spaceNameId: string,
  accountID: string,
  addTutorialCallouts = true,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const spaceData: CreateSpaceOnAccountInput = {
    nameID: spaceNameId,
    about: {
      profileData: {
        displayName: spaceName,
      },
    },
    collaborationData: {
      addTutorialCallouts,
      calloutsSetData: {},
    },
    accountID,
  };
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSpaceBasicData(
      {
        spaceData,
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
    false,
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

export const getSpaceCommunication = async (
  spaceId = spaceNameId,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpaceCommunication(
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

  const response = responseQuery?.data?.lookup?.space?.id;
  return response;
};

export const deleteSpace = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
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

  return graphqlErrorWrapper(callback, userRole);
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
      allowEventsFromSubspaces?: boolean;
      allowMembersToVideoCall?: boolean;
      allowGuestContributions?: boolean;
    };
  },

  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  if (!spaceID) {
    throw new Error('Space ID is required');
  }
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
              allowEventsFromSubspaces:
                settings?.collaboration?.allowEventsFromSubspaces || true,
              allowMembersToVideoCall:
                settings?.collaboration?.allowMembersToVideoCall ?? true,
              allowGuestContributions:
                settings?.collaboration?.allowGuestContributions ?? false,
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
          about: {
            profile: { location: { country, city } },
          },
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
    why?: string | 'Updated Why';
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
          about: {
            profile: { displayName },
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
  if (userID.length !== 36) {
    throw new Error(`Invalid user ID: ${userID}`);
  }
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
