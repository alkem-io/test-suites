import {
  CalloutVisibility,
  CommunityMembershipPolicy,
  CreateOrganizationInput,
  SpacePrivacyMode,
} from "@alkemio/client-lib";
import { TestUser } from "../common/enums/test.user";
import {
  CalloutAllowedContributors,
  CalloutFramingType,
  CreateSpaceOnAccountInput,
  RoleName,
  TagsetReservedName,
} from "../core/generated/alkemio-schema";
import { graphqlErrorWrapper } from "../utils/graphql.wrapper";
import { getGraphqlClient } from "../utils/graphqlClient";
import { UniqueIDGenerator } from "../utils/uniqueId";
import { CalloutContributionType } from "@alkemio/client-lib/dist/generated/graphql";
const getUniqueId = () => UniqueIDGenerator.getID();

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
    firstName: `fn${getUniqueId()}`,
    lastName: `ln${getUniqueId()}`,
    nameID: `user-nameid-${getUniqueId()}`,
    email: `user-email-${getUniqueId()}@alkem.io`,
    profileData: {
      displayName: `FNLN${getUniqueId()}`,
      description: "User description",
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
    defaultDescription: "Please describe the knowledge that is relevant.",
    type: "knowledge",
    profile: {
      displayName: "Post template display name",
      tagline: "Post template tagline",
      description: "To share relevant knowledge, building blocks etc.",
    },
  },
};

export const defaultCallout = {
  framing: {
    profile: {
      displayName: "default callout display name",
      description: "callout description",
    },
    type: CalloutFramingType.None, // This is to allow for future extensions, e.g., whiteboard framing
  },

  settings: {
    visibility: CalloutVisibility.Published,
    contribution: {
      enabled: true,
      allowedTypes: [CalloutContributionType.Post],
      canAddContributions: CalloutAllowedContributors.Members,
      commentsEnabled: true,
    },
    framing: { commentsEnabled: true },
  },
  contributionDefaults: {
    postDescription: "Please describe the knowledge that is relevant.",
  },
};

export const defaultWhiteboard = {
  framing: {
    profile: {
      displayName: `default Whiteboard callout display name ${getUniqueId()}`,
      description: "callout Whiteboard description",
    },
  },

  settings: {
    visibility: CalloutVisibility.Published,
    contribution: {
      enabled: true,
      allowedTypes: [CalloutContributionType.Whiteboard],
      canAddContributions: CalloutAllowedContributors.Members,
      commentsEnabled: true,
    },
    framing: { commentsEnabled: true },
  },
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
      type?: CalloutFramingType; // This is to allow for future extensions, e.g., whiteboard framing
    };

    settings?: {
      visibility?: CalloutVisibility;
      contribution?: {
        enabled?: boolean;
        allowedTypes?: CalloutContributionType[];
        canAddContributions?: CalloutAllowedContributors;
        commentsEnabled?: boolean;
      };
      framing?: { commentsEnabled: boolean };
    };

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
      type?: CalloutFramingType.Whiteboard;
    };

    settings?: {
      visibility?: CalloutVisibility.Published;
      contribution?: {
        enabled?: true;
        allowedTypes?: CalloutContributionType[];
        canAddContributions?: CalloutAllowedContributors;
        commentsEnabled?: true;
      };
      framing?: { commentsEnabled: true };
    };
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
              displayName:
                options?.framing?.profile?.displayName ||
                "default callout display name",
              description:
                options?.framing?.profile?.description || "callout description",
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
          description: "test ref",
          name: "test ref neame",
          uri: "https://testref.io",
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
        tagline: "test tagline" + getUniqueId(),
        description: "test description" + getUniqueId(),
        referencesData: [
          {
            name: "test video" + getUniqueId(),
            uri: "https://youtu.be/-wGlzcjs",
            description: "dest description" + getUniqueId(),
          },
        ],
      },
    },
    collaborationData: {
      addTutorialCallouts: false,
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
  addTutorialCallouts = false,
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
    throw new Error("Space ID is required");
  }
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSpaceSettings(
      {
        settingsData: {
          spaceID,
          settings: {
            privacy: {
              mode: settings?.privacy?.mode,
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
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const spaceNameId = `testecoeid${getUniqueId()}`;

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

export const getLicensePlans = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetPlatformLicensePlans(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getLicensePlanByName = async (licenseCredential: string) => {
  const response = await getLicensePlans();
  const allLicensePlans =
    response.data?.platform.licensingFramework.plans ?? [];
  const filteredLicensePlan = allLicensePlans.filter(
    (plan: { licenseCredential: string; id: string }) =>
      plan.licenseCredential.includes(licenseCredential) ||
      plan.id === licenseCredential
  );
  const licensePlan = filteredLicensePlan;

  return licensePlan;
};

export const assignLicensePlanToAccount = async (
  accountId: string,
  licensePlanId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const res = await getLicensePlans();
  const licensingId = res.data?.platform.licensingFramework.id ?? "";
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignLicensePlanToAccount(
      {
        accountId: accountId,
        licensePlanId: licensePlanId,
        licensingId: licensingId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
