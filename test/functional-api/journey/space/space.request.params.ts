import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
  SpaceVisibility as SpaceVisibilityCodegen,
} from '../../../generated/alkemio-schema';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { TestUser } from '../../../utils/token.helper';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { delay } from '@test/utils';
import { error } from 'console';

export enum SpaceVisibility {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DEMO = 'DEMO',
}

const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const spaceName = `testEcoName${uniqueId}`;
export const spaceNameId = `testecoeid${uniqueId}`;

export const createSpaceBasicDataCodegen = async (
  spaceName: string,
  spaceNameId: string,
  hostId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateAccount(
      {
        accountData: {
          spaceData: {
            nameID: spaceNameId,
            profileData: {
              displayName: spaceName,
            },
          },
          hostID: hostId,
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
  hostId: string
  // userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const response = await createSpaceBasicDataCodegen(
    spaceName,
    spaceNameId,
    hostId
  );
  //throw new Error('response');
  console.log('response', response.error);
  //await delay(10000);
  const spaceId = response?.data?.createAccount.spaceID ?? '';
  await updateSpaceSettingsCodegen(spaceId, {
    privacy: { allowPlatformSupportAsAdmin: true },
  });

  const spaceData = await getSpaceDataCodegen(spaceId);

  return spaceData;
};

export const getSpacesCount = async () => {
  const res = await getSpacesDataCodegen();
  const spacesData = res?.data?.spaces ?? [];
  const count = Object.keys(spacesData[0]).length;
  return count;
};

export const getSpaceDataCodegen = async (
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

export const getSpacesDataCodegen = async (role = TestUser.GLOBAL_ADMIN) => {
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

export const getUserCommunityPrivilegeToSpaceCodegen = async (
  spaceNameId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CommunityUserPrivilegesToSpace(
      { spaceNameId },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getPrivateSpaceDataCodegen = async (
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
  const responseQuery = await getSpaceDataCodegen();

  const response = responseQuery?.data?.space.id;
  return response;
};

export const deleteSpaceCodegen = async (spaceId: string) => {
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

export const updateSpacePlatformCodegen = async (
  spaceID: string,
  nameID?: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSpacePlatformSettings(
      {
        nameID,
        spaceID,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateSpaceSettingsCodegen = async (
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
        settingsData: {
          spaceID,
          settings: {
            privacy: {
              mode: settings?.privacy?.mode || SpacePrivacyMode.Private,
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
                settings?.collaboration?.inheritMembershipRights || true,
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

export const updateSpaceContextCodegen = async (
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
    graphqlClient.updateSpace(
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

export const getSpacesFilteredByVisibilityWithAccessCodegen = async (
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
            SpaceVisibilityCodegen.Archived,
            SpaceVisibilityCodegen.Active,
            SpaceVisibilityCodegen.Demo,
          ],
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSpacesFilteredByVisibilityNoAccessCodegen = async (
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
            SpaceVisibilityCodegen.Archived,
            SpaceVisibilityCodegen.Active,
            SpaceVisibilityCodegen.Demo,
          ],
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getUserRoleSpacesVisibilityCodegen = async (
  userID: string,
  visibility: SpaceVisibilityCodegen,
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
