import {
  CalloutVisibility,
  CommunityMembershipPolicy,
  CreateOrganizationInput,
  SpacePrivacyMode,
} from "@alkemio/client-lib";
import { TestUser } from "../common/enums/test.user";
import {
  CreateSpaceOnAccountInput,
  RoleName,
  TagsetReservedName,
} from "../core/generated/alkemio-schema";
import { graphqlErrorWrapper } from "../utils/graphql.wrapper";
import { getGraphqlClient } from "../utils/graphqlClient";
import { UniqueIDGenerator } from "../utils/uniqueId";
import { LogManager } from "./LogManager";
import {
  CalloutContributionType,
  TemplateType,
  SpaceLevel,
  CalloutFramingType,
  CalloutAllowedContributors,
  VirtualContributorBodyOfKnowledgeType,
  VirtualContributorDataAccessMode,
  VirtualContributorInteractionMode,
  AiPersonaEngine,
  SearchVisibility,
  ForumDiscussionCategory,
} from "@alkemio/client-lib/dist/generated/graphql";
import { GraphQLClient } from "graphql-request";
import { testConfiguration } from "../config/test.configuration";
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
          actorID: userID,
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
  actorID: string,
  roleName: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignPlatformRoleToUser(
      {
        roleData: { actorID, role: roleName },
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
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  options?: { tags?: string[] }
) => {
  const graphqlClient = getGraphqlClient();
  const defaultTag = "organization.admin@alkem.io";
  const tags = options?.tags
    ? Array.from(new Set([defaultTag, ...options.tags]))
    : [defaultTag];
  const organizationData: CreateOrganizationInput = {
    nameID,
    legalEntityName,
    domain,
    website,
    contactEmail,
    profileData: {
      displayName: organizationName,
      tags,
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
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  tagline?: string
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSubspace(
      {
        subspaceData: subspaceVariablesData(
          subspaceName,
          subspaceNameId,
          parentId,
          tagline
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
  spaceId: string,
  tagline?: string
) => {
  const variables = {
    nameID: nameId,
    spaceID: spaceId,
    about: {
      profileData: {
        displayName,
        tagline: tagline ?? "test tagline" + getUniqueId(),
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

// ---------------- Innovation Pack & Templates helpers ----------------

export const createInnovationPack = async (
  accountID: string,
  displayName: string,
  nameID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  options?: { tags?: string[] }
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.createInnovationPack(
      {
        data: {
          accountID,
          profileData: { displayName },
          tags: options?.tags,
          nameID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const createTemplateOnTemplatesSet = async (
  templatesSetId: string,
  options: {
    type: TemplateType;
    profileDisplayName: string;
    tags?: string[];
    postDefaultDescription?: string;
    whiteboardContent?: string;
    // Callout-specific options
    calloutFramingType?: "NONE" | "WHITEBOARD" | "MEMO" | "LINK";
    calloutResponseTypes?: Array<"POST" | "WHITEBOARD" | "MEMO" | "LINK">;
    calloutAllowedContributors?: "MEMBERS" | "ADMINS" | "NONE";
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();

  // Map string literals to CalloutFramingType enum
  const framingTypeMap: Record<string, CalloutFramingType> = {
    NONE: CalloutFramingType.None,
    WHITEBOARD: CalloutFramingType.Whiteboard,
    MEMO: CalloutFramingType.Memo,
    LINK: CalloutFramingType.Link,
  };

  // Map string literals to CalloutContributionType enum
  const contributionTypeMap: Record<string, CalloutContributionType> = {
    POST: CalloutContributionType.Post,
    WHITEBOARD: CalloutContributionType.Whiteboard,
    MEMO: CalloutContributionType.Memo,
    LINK: CalloutContributionType.Link,
  };

  // Map string literals to CalloutAllowedContributors enum
  const allowedContributorsMap: Record<string, CalloutAllowedContributors> = {
    MEMBERS: CalloutAllowedContributors.Members,
    ADMINS: CalloutAllowedContributors.Admins,
    NONE: CalloutAllowedContributors.None,
  };

  // Minimal defaults for Space template settings
  const spaceDefaults = {
    about: {
      profileData: {
        displayName: options.profileDisplayName,
      },
    },
    collaborationData: {
      calloutsSetData: {},
    },
    level: SpaceLevel.L0,
    settings: {
      membership: {
        allowSubspaceAdminsToInviteMembers: true,
        policy: CommunityMembershipPolicy.Open,
        trustedOrganizations: [],
      },
      collaboration: {
        allowMembersToCreateCallouts: false,
        allowMembersToCreateSubspaces: false,
        inheritMembershipRights: true,
        allowEventsFromSubspaces: true,
        allowMembersToVideoCall: true,
        allowGuestContributions: false,
      },
    },
  };

  // Build callout data if type is Callout
  let calloutDataValue: any = undefined;
  if (options.type === TemplateType.Callout) {
    const framingType = options.calloutFramingType || "NONE";
    const responseTypes = options.calloutResponseTypes || ["POST"];
    const allowedContributors = options.calloutAllowedContributors || "MEMBERS";

    // Get the actual enum values
    const framingEnumValue = framingTypeMap[framingType];
    const allowedContributorsEnumValue =
      allowedContributorsMap[allowedContributors];

    // Map response types to actual enum values
    const allowedTypes: CalloutContributionType[] = [];
    for (const rt of responseTypes) {
      const enumValue = contributionTypeMap[rt];
      if (enumValue) {
        allowedTypes.push(enumValue);
      }
    }

    LogManager.getLogger().info(
      `Creating callout template: "${
        options.profileDisplayName
      }" - framing: ${framingType} (${framingEnumValue}), responseTypes: [${responseTypes.join(
        ", "
      )}], contributors: ${allowedContributors} (${allowedContributorsEnumValue})`
    );

    // Build framing data with optional whiteboard/memo/link based on type
    const framingData: any = {
      profile: { displayName: options.profileDisplayName },
      type: framingEnumValue,
    };

    // Add type-specific framing data if needed
    if (framingType === "WHITEBOARD") {
      framingData.whiteboard = {
        content:
          (options as any).calloutWhiteboardFramingContent ||
          '{"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":[],"appState":{"gridSize":null,"viewBackgroundColor":"#ffffff"}}',
      };
    } else if (framingType === "MEMO") {
      framingData.memo = {
        profile: { displayName: options.profileDisplayName },
        markdown: (options as any).calloutMemoFramingMarkdown || "",
      };
    } else if (framingType === "LINK") {
      framingData.link = {
        profile: { displayName: options.profileDisplayName },
        uri: (options as any).calloutLinkFramingUri || "",
      };
    }

    // NOTE: The allowedTypes field is correctly set in settings.contribution.allowedTypes
    // If the server is not respecting this field and defaults to Post, there may be a
    // server-side issue. The client code here is correct and sends the proper values.
    calloutDataValue = {
      framing: framingData,
      settings: {
        visibility: CalloutVisibility.Published,
        contribution: {
          enabled: true,
          allowedTypes:
            allowedTypes.length > 0
              ? allowedTypes
              : [CalloutContributionType.Post],
          canAddContributions: allowedContributorsEnumValue,
          commentsEnabled: true,
        },
        framing: { commentsEnabled: true },
      },
      contributionDefaults: {
        postDescription: "Please describe the knowledge that is relevant.",
        whiteboardContent:
          '{"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":[],"appState":{"gridSize":null,"viewBackgroundColor":"#ffffff"}}',
      },
    };
  }

  const templateInput = {
    templatesSetId,
    profileData: {
      displayName: options.profileDisplayName,
    },
    tags: options.tags,
    type: options.type,
    postDefaultDescription:
      options.type === TemplateType.Post
        ? options.postDefaultDescription ||
          defaultPostTemplate.postTemplate.defaultDescription
        : undefined,
    whiteboard:
      options.type === TemplateType.Whiteboard
        ? {
            content:
              options.whiteboardContent ||
              '{"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":[],"appState":{"gridSize":null,"viewBackgroundColor":"#ffffff"}}',
          }
        : undefined,
    contentSpaceData:
      options.type === TemplateType.Space ? spaceDefaults : undefined,
    calloutData: calloutDataValue,
    communityGuidelinesData:
      options.type === TemplateType.CommunityGuidelines
        ? { profile: { displayName: options.profileDisplayName } }
        : undefined,
  };

  // Log the full template input for callout types to debug response type issues
  if (options.type === TemplateType.Callout) {
    LogManager.getLogger().info(
      `Full calloutData being sent to CreateTemplate: ${JSON.stringify(
        calloutDataValue,
        null,
        2
      )}`
    );
    LogManager.getLogger().info(
      `Full templateInput being sent: ${JSON.stringify(templateInput, null, 2)}`
    );
  }

  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateTemplate(templateInput, {
      authorization: `Bearer ${authToken}`,
    });

  return graphqlErrorWrapper(callback, userRole);
};

// --- Virtual Contributor Functions ---

export const createVirtualContributor = async (
  accountID: string,
  options: {
    profileDisplayName: string;
    profileDescription?: string;
    nameID?: string;
    aiPersona?: {
      engine?:
        | "OPENAI_ASSISTANT"
        | "GENERIC_OPENAI"
        | "EXPERT"
        | "COMMUNITY_MANAGER"
        | "GUIDANCE"
        | "LIBRA_FLOW";
      prompt?: string[];
      externalConfig?: Record<string, unknown>;
    };
    bodyOfKnowledgeType?:
      | "NONE"
      | "WEBSITE"
      | "ALKEMIO_KNOWLEDGE_BASE"
      | "ALKEMIO_SPACE"
      | "OTHER";
    bodyOfKnowledgeDescription?: string;
    bodyOfKnowledgeID?: string;
    dataAccessMode?: "NONE" | "SPACE_PROFILE" | "SPACE_PROFILE_AND_CONTENTS";
    interactionModes?: "DISCUSSION_TAGGING"[];
    knowledgeBaseProfile?: {
      displayName?: string;
      description?: string;
    };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();

  // Build interaction modes enum
  const interactionModesMap: Record<string, VirtualContributorInteractionMode> =
    {
      DISCUSSION_TAGGING: VirtualContributorInteractionMode.DiscussionTagging,
    };

  // Build data access mode enum
  const dataAccessModeMap: Record<string, VirtualContributorDataAccessMode> = {
    NONE: VirtualContributorDataAccessMode.None,
    SPACE_PROFILE: VirtualContributorDataAccessMode.SpaceProfile,
    SPACE_PROFILE_AND_CONTENTS:
      VirtualContributorDataAccessMode.SpaceProfileAndContents,
  };

  // Build body of knowledge type enum
  const bodyOfKnowledgeTypeMap: Record<
    string,
    VirtualContributorBodyOfKnowledgeType
  > = {
    NONE: VirtualContributorBodyOfKnowledgeType.None,
    WEBSITE: VirtualContributorBodyOfKnowledgeType.Website,
    ALKEMIO_KNOWLEDGE_BASE:
      VirtualContributorBodyOfKnowledgeType.AlkemioKnowledgeBase,
    ALKEMIO_SPACE: VirtualContributorBodyOfKnowledgeType.AlkemioSpace,
    OTHER: VirtualContributorBodyOfKnowledgeType.Other,
  };

  // Build AI persona engine enum
  const aiEngineMap: Record<string, AiPersonaEngine> = {
    OPENAI_ASSISTANT: AiPersonaEngine.OpenaiAssistant,
    GENERIC_OPENAI: AiPersonaEngine.GenericOpenai,
    EXPERT: AiPersonaEngine.Expert,
    COMMUNITY_MANAGER: AiPersonaEngine.CommunityManager,
    GUIDANCE: AiPersonaEngine.Guidance,
    LIBRA_FLOW: AiPersonaEngine.LibraFlow,
  };

  const aiPersona: any = {
    engine: options.aiPersona?.engine
      ? aiEngineMap[options.aiPersona.engine]
      : undefined,
    prompt: options.aiPersona?.prompt || [],
    externalConfig: options.aiPersona?.externalConfig,
  };

  let interactionModes: VirtualContributorInteractionMode[] = [];
  if (options.interactionModes && options.interactionModes.length > 0) {
    for (const mode of options.interactionModes) {
      const enumValue = interactionModesMap[mode];
      if (enumValue) {
        interactionModes.push(enumValue);
      }
    }
  }

  const knowledgeBaseData = options.knowledgeBaseProfile
    ? {
        profile: {
          displayName:
            options.knowledgeBaseProfile.displayName ||
            options.profileDisplayName,
          description: options.knowledgeBaseProfile.description || "",
        },
      }
    : undefined;

  LogManager.getLogger().info(
    `Creating virtual contributor: "${options.profileDisplayName}" - engine: ${
      options.aiPersona?.engine || "none"
    }, BoK type: ${options.bodyOfKnowledgeType || "NONE"}`
  );
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateVirtualContributorOnAccount(
      {
        virtualContributorData: {
          accountID,
          profileData: {
            displayName: options.profileDisplayName,
            description: options.profileDescription || "",
          },
          nameID: options.nameID,
          aiPersona,
          bodyOfKnowledgeType: options.bodyOfKnowledgeType
            ? bodyOfKnowledgeTypeMap[options.bodyOfKnowledgeType]
            : undefined,
          bodyOfKnowledgeDescription: options.bodyOfKnowledgeDescription,
          bodyOfKnowledgeID: options.bodyOfKnowledgeID,
          dataAccessMode: options.dataAccessMode
            ? dataAccessModeMap[options.dataAccessMode]
            : undefined,
          interactionModes:
            interactionModes.length > 0 ? interactionModes : undefined,
          knowledgeBaseData,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deleteVirtualContributor = async (
  virtualContributorId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteVirtualContributorOnAccount(
      {
        virtualContributorData: {
          ID: virtualContributorId,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const createPlatformDiscussion = async (
  forumID: string,
  options?: {
    title?: string;
    description?: string;
    category?: ForumDiscussionCategory;
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateDiscussion(
      {
        createData: {
          forumID,
          profile: {
            displayName: options?.title || "Discussion",
            description: options?.description,
          },
          category:
            options?.category ||
            ForumDiscussionCategory.PlatformFunctionalities,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deletePlatformDiscussion = async (
  discussionId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteDiscussion(
      {
        deleteData: { ID: discussionId },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getPlatformForumId = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<string> => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetPlatformForumData(
      {},
      authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );

  const res = await graphqlErrorWrapper(callback, userRole);
  return res.data?.platform?.forum?.id ?? "";
};

export const deleteInnovationPack = async (
  innovationPackId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteInnovationPack(
      {
        innovationPackId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateVirtualContributorVisibility = async (
  ID: string,
  visibility: { searchVisibility?: SearchVisibility; listedInStore?: boolean },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateVirtualContributor(
      {
        virtualContributorData: {
          ID,
          searchVisibility: visibility.searchVisibility,
          listedInStore: visibility.listedInStore,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateInnovationPackVisibility = async (
  ID: string,
  visibility: { searchVisibility?: SearchVisibility; listedInStore?: boolean },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = new GraphQLClient(
    testConfiguration.endPoints.graphql.private
  );
  const mutation = `
    mutation UpdateInnovationPack($data: UpdateInnovationPackInput!) {
      updateInnovationPack(innovationPackData: $data) { id }
    }
  `;
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest(
      mutation,
      {
        data: {
          ID,
          listedInStore: visibility.listedInStore,
          searchVisibility: visibility.searchVisibility,
        },
      },
      authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const triggerOrganizationVerification = async (
  organizationVerificationID: string,
  eventName = "MANUALLY_VERIFY",
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.eventOnOrganizationVerification(
      {
        eventData: {
          organizationVerificationID,
          eventName,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const applyOrganizationVerificationSequence = async (
  organizationVerificationID: string,
  events: string[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  for (const eventName of events) {
    await triggerOrganizationVerification(
      organizationVerificationID,
      eventName,
      userRole
    );
  }
};
