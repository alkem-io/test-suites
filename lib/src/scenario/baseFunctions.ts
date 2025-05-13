import { CalloutState, CalloutType, CalloutVisibility, CommunityMembershipPolicy, CreateOrganizationInput, SpacePrivacyMode } from '@alkemio/client-lib';
// import {
//   createCalloutOnCalloutsSet,
//   createWhiteboardCalloutOnCalloutsSet,
//   updateCalloutVisibility,
// } from '@functional-api/callout/callouts.request.params';
import { TestUser } from '@src/common/enums/test.user';
import { CreateSpaceOnAccountInput, RoleName, TagsetReservedName } from '@src/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@src/utils/graphql.wrapper';
import { getGraphqlClient } from '@src/utils/graphqlClient';
import { UniqueIDGenerator } from '@src/utils/uniqueId';


export const updateCalloutVisibility = async (
  calloutID: string,
  visibility: CalloutVisibility = CalloutVisibility.Draft,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  sendNotification?: boolean
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateCalloutVisibility(
      {
        calloutData: {
          calloutID,
          visibility,
          sendNotification,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignRoleToUser = async (
  userID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignRoleToUser(
      {
        roleData: {
          contributorID: userID,
          roleSetID,
          role,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};


const uniqueId = UniqueIDGenerator.getID();

export const getDefaultUserData = () => {
  return {
    firstName: `fn${uniqueId}`,
    lastName: `ln${uniqueId}`,
    nameID: `user-nameid-${uniqueId}`,
    email: `user-email-${uniqueId}@alkem.io`,
    profileData: {
      displayName: `FNLN${uniqueId}`,
      description: 'User description',
    },
  };
};

export const createUser = async (
  options?: {
    firstName?: string;
    lastName?: string;
    nameID?: string;
    email?: string;
    phone?: string;
    profileData?: {
      displayName: string;
      description?: string;
    };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateUser(
      {
        userData: {
          ...getDefaultUserData(),
          ...options,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};


export const defaultPostTemplate = {
  postTemplate: {
    defaultDescription: 'Please describe the knowledge that is relevant.',
    type: 'knowledge',
    profile: {
      displayName: 'Post template display name',
      tagline: 'Post template tagline',
      description: 'To share relevant knowledge, building blocks etc.',
    },
  },
};

export const defaultCallout = {
  framing: {
    profile: {
      displayName: 'default callout display name',
      description: 'callout description',
    },
  },
  contributionPolicy: {
    state: CalloutState.Open,
  },
  type: CalloutType.Post,
  contributionDefaults: {
    postDescription: 'Please describe the knowledge that is relevant.',
  },
};

export const defaultWhiteboard = {
  framing: {
    profile: {
      displayName: `default Whiteboard callout display name ${uniqueId}`,
      description: 'callout Whiteboard description',
    },
  },
  contributionPolicy: {
    state: CalloutState.Open,
  },
  type: CalloutType.WhiteboardCollection,
  contributionDefaults: {
    whiteboardContent:
      '{"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":[],"appState":{"gridSize":null,"viewBackgroundColor":"#ffffff"}}',
  },
};


export const createCalloutOnCalloutsSet = async (
  calloutsSetID: string,
  options?: {
    framing?: {
      profile: {
        displayName: string;
        description?: string;
      };
    };
    contributionPolicy?: {
      state?: CalloutState;
    };
    type?: CalloutType;
    visibility?: CalloutVisibility;
    postTemplate?: {
      defaultDescription?: string;
      type?: string;
      profile?: {
        displayName?: string;
        description?: string;
        tagline?: string;
      };
    };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateCalloutOnCalloutsSet(
      {
        calloutData: {
          calloutsSetID,
          ...defaultCallout,
          ...options,
          enableComments:
            defaultCallout.type === CalloutType.Post ? true : false,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const createWhiteboardCalloutOnCalloutsSet = async (
  calloutsSetID: string,
  options?: {
    framing: {
      profile?: {
        displayName: string;
        description: string;
      };
    };
    contributionPolicy?: {
      state?: CalloutState;
    };
    type?: CalloutType;
    contributionDefaults?: {
      whiteboardContent?: string;
    };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateCalloutOnCalloutsSet(
      {
        calloutData: {
          calloutsSetID,
          ...defaultWhiteboard,
          ...options,
          framing: {
            profile: {
              displayName: 'default callout display name',
              description: 'callout description',
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

export const assignPlatformRole = async (
  contributorID: string,
  roleName: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignPlatformRoleToUser(
      {
        roleData: { contributorID, role: roleName },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const createOrganization = async (
  organizationName: string,
  nameID: string,
  legalEntityName?: string,
  domain?: string,
  website?: string,
  contactEmail?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const organizationData: CreateOrganizationInput = {
    nameID,
    legalEntityName,
    domain,
    website,
    contactEmail,
    profileData: {
      displayName: organizationName,
      referencesData: [
        {
          description: 'test ref',
          name: 'test ref neame',
          uri: 'https://testref.io',
        },
      ],
    },
  };
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateOrganization(
      {
        organizationData,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deleteOrganization = async (
  organizationId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteOrganization(
      {
        deleteData: {
          ID: organizationId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const createSubspace = async (
  subspaceName: string,
  subspaceNameId: string,
  parentId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSubspace(
      {
        subspaceData: subspaceVariablesData(
          subspaceName,
          subspaceNameId,
          parentId
        ),
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const subspaceVariablesData = (
  displayName: string,
  nameId: string,
  spaceId: string
) => {
  const variables = {
    nameID: nameId,
    spaceID: spaceId,
    about: {
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
    },
    collaborationData: {
      addTutorialCallouts: true,
      calloutsSetData: {},
    },
  };

  return variables;
};

export const getCalloutsData = async (
  calloutsSetId: string,
  tags?: string[] | undefined,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetCalloutsOnCalloutsSetUsingClassification(
      {
        calloutsSetId,
        classificationTagsets: [
          {
            name: TagsetReservedName.FlowState,
            tags,
          },
        ],
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getCalloutDetails = async (
  calloutId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CalloutDetails(
      {
        calloutId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

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
    };
    //},
    // },
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


export const spaceNameId = `testecoeid${uniqueId}`;

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