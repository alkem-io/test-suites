import {
  CalloutVisibility,
  CommunityMembershipPolicy,
  CreateOrganizationInput,
  SpacePrivacyMode,
} from "@alkemio/client-lib";
import {
  ensureSpaceMembers,
  resolveSpaceOfRoleSet,
} from "./membership/space-membership";
import {
  assignUserRoleAsOrganizationAdmin,
  ensureSpaceOrganizationMember,
  removeUserRoleAsOrganizationAdmin,
} from "./membership/space-organization-membership";
import { TestUser } from "../common/enums/test.user";
import {
  CreateSpaceOnAccountInput,
  RoleName,
  TagsetReservedName,
  CalloutAllowedActors,
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
  sendNotification?: boolean,
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
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

const assignRoleToUserDirect = async (
  userID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

const ENTRY_ASSIGN_GAP = [
  "roleset-entry-role-assign",
  "not a member of parent roleSet",
];
// Slice B: the harness admin holds no GRANT on an organisation it is not an
// admin of, so ADMIN / OWNER assignments there are refused on 'grant'.
const ORGANISATION_GRANT_GAP =
  /unable to grant 'grant' privilege: assign role to User: .* on roleSet of type: organization/;
const ORGANISATION_REMOVE_GAP =
  /unable to grant 'grant' privilege: remove role from User: .* on roleSet of type organization/;

/**
 * Assign a role on a role set. workspace#027 Slice B: no actor can put a user
 * directly into a SPACE as MEMBER any more (`ROLESET_ENTRY_ROLE_ASSIGN` is
 * granted to nobody at L0), so when the harness admin is refused at that gate
 * the user JOINS the space as themself instead (`ensureSpaceMembers`: open
 * membership, join, restore), and a non-entry role is then granted on top.
 * Calls made as any other persona are returned untouched — their refusals are
 * what the authorization specs assert.
 */
export const assignRoleToUser = async (
  userID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const result = await assignRoleToUserDirect(userID, roleSetID, role, userRole);
  const message = String(result?.error?.errors?.[0]?.message ?? "");
  if (userRole !== TestUser.GLOBAL_ADMIN || !result?.error) {
    return result;
  }
  // Organisation role sets: ASSOCIATE / OWNER exist only there, and an
  // organisation's own admins still hold the direct assign (entry role) and
  // GRANT (ADMIN / OWNER) — retry as one. ADMIN is shared with spaces, so it
  // goes the space way first and lands here only when the role set has no
  // space behind it.
  const organisationRole =
    role === RoleName.Associate ||
    role === RoleName.Owner ||
    (role === RoleName.Admin && !(await resolveSpaceOfRoleSet(roleSetID)));
  const organisationGap =
    organisationRole &&
    (ENTRY_ASSIGN_GAP.some((gap) => message.includes(gap)) ||
      ORGANISATION_GRANT_GAP.test(message));
  if (!organisationGap && !ENTRY_ASSIGN_GAP.some((gap) => message.includes(gap))) {
    return result;
  }
  if (organisationRole) {
    const retried = await assignUserRoleAsOrganizationAdmin(
      roleSetID,
      userID,
      role,
    );
    if (!retried || retried.errors) {
      LogManager.getLogger().error(
        `assignRoleToUser: organisation-admin fallback failed for ${userID} (${role}) on ${roleSetID}: ${retried?.errors?.[0]?.message ?? "no admin available"}`,
      );
      return result;
    }
    return {
      data: { assignRoleToUser: { id: userID } },
      error: undefined,
    } as unknown as typeof result;
  }
  try {
    await ensureSpaceMembers(roleSetID, [userID]);
  } catch (e) {
    LogManager.getLogger().error(
      `assignRoleToUser: join fallback failed for ${userID} on ${roleSetID}: ${e instanceof Error ? e.message : e}`,
    );
    return result;
  }
  if (role === RoleName.Member) {
    return {
      data: { assignRoleToUser: { id: userID } },
      error: undefined,
    } as unknown as typeof result;
  }
  return assignRoleToUserDirect(userID, roleSetID, role, userRole);
};

/**
 * Assign a role on a role set to a Virtual Contributor (e.g. make a scenario VC
 * a MEMBER of the scenario space). Same input shape as assignRoleToUser; the
 * actorID is the VC id.
 */
export const assignRoleToVirtualContributor = async (
  virtualContributorID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignRoleToVirtualContributor(
      {
        roleData: {
          actorID: virtualContributorID,
          roleSetID,
          role,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

/** `prepareMemoSigning` — starts a signing attempt for a memo (server#6468). */
/**
 * Assign a role on a role set to an Organization (e.g. make an organization a
 * MEMBER of a space). Same input shape as assignRoleToUser; the actorID is the
 * organization id. Throws on a GraphQL error so a fixture never continues on a
 * missing role.
 */
const assignRoleToOrganizationDirect = async (
  organizationID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignRoleToOrganization(
      { roleData: { actorID: organizationID, roleSetID, role } },
      { authorization: `Bearer ${authToken}` },
    );
  const result = await graphqlErrorWrapper(callback, userRole);
  if (result.error) {
    throw new Error(
      `assignRoleToOrganization(${role}) failed for ${organizationID} on ${roleSetID}: ${JSON.stringify(result.error)}`,
    );
  }
  return result;
};

/**
 * Remove a role on a role set from a User (e.g. drop the creating admin's
 * automatic ASSOCIATE role on a fixture organization).
 */
export const removeRoleFromUser = async (
  userID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.removeRoleFromUser(
      { roleData: { actorID: userID, roleSetID, role } },
      { authorization: `Bearer ${authToken}` },
    );
  const result = await graphqlErrorWrapper(callback, userRole);
  const message = String(result?.error?.errors?.[0]?.message ?? "");
  // Slice B: same organisation gap as assignRoleToUser — the harness admin
  // holds no GRANT on an organisation it is not an admin of, so a cleanup
  // removal there is retried as one of the organisation's admins.
  if (
    userRole !== TestUser.GLOBAL_ADMIN ||
    !result?.error ||
    !ORGANISATION_REMOVE_GAP.test(message)
  ) {
    return result;
  }
  const retried = await removeUserRoleAsOrganizationAdmin(roleSetID, userID, role);
  if (!retried || retried.errors) {
    LogManager.getLogger().error(
      `removeRoleFromUser: organisation-admin fallback failed for ${userID} (${role}) on ${roleSetID}: ${retried?.errors?.[0]?.message ?? "no admin available"}`,
    );
    return result;
  }
  return {
    data: { removeRoleFromUser: { id: userID } },
    error: undefined,
  } as unknown as typeof result;
};

/**
 * Assign a role on a space role set to an organisation. workspace#027 Slice B:
 * nobody holds ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION any more, so when the
 * harness admin is refused at that gate the organisation is INVITED and the
 * invitation ACCEPTED by one of its admins (`ensureSpaceOrganizationMember`);
 * a non-entry role is then granted on top. Other personas' refusals are
 * returned untouched.
 */
export const assignRoleToOrganization = async (
  organizationID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  // The direct helper THROWS on a GraphQL error (it always did); catch the
  // one refusal Slice B introduced and fall back, rethrow everything else.
  let result: Awaited<ReturnType<typeof assignRoleToOrganizationDirect>>;
  try {
    result = await assignRoleToOrganizationDirect(
      organizationID,
      roleSetID,
      role,
      userRole,
    );
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (
      userRole !== TestUser.GLOBAL_ADMIN ||
      !message.includes("roleset-entry-role-assign-organization")
    ) {
      throw e;
    }
  }
  await ensureSpaceOrganizationMember(roleSetID, organizationID);
  if (role === RoleName.Member) {
    return {
      data: { assignRoleToOrganization: { id: organizationID } },
      error: undefined,
    } as unknown as Awaited<ReturnType<typeof assignRoleToOrganizationDirect>>;
  }
  return assignRoleToOrganizationDirect(organizationID, roleSetID, role, userRole);
};

export const prepareMemoSigning = async (
  memoID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.PrepareMemoSigning(
      { signingData: { memoID } },
      { authorization: `Bearer ${authToken}` },
    );
  return graphqlErrorWrapper(callback, userRole);
};

/** The framing memo (id + profile) of a callout, via `lookup.callout`. */
export const getCalloutFramingMemo = async (
  calloutID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetCalloutFramingMemo(
      { calloutID },
      { authorization: `Bearer ${authToken}` },
    );
  return graphqlErrorWrapper(callback, userRole);
};

/** A space's license entitlements (`type`, `enabled`, `limit`), via `lookup.space`. */
export const getSpaceLicenseEntitlements = async (
  spaceID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpaceLicenseEntitlements(
      { spaceID },
      { authorization: `Bearer ${authToken}` },
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
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
      },
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
      canAddContributions: CalloutAllowedActors.Members,
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
      canAddContributions: CalloutAllowedActors.Members,
      commentsEnabled: true,
    },
    framing: { commentsEnabled: true },
  },
  // Since server#6399 whiteboardContent is server-internal: contribution
  // defaults can only be seeded via sourceWhiteboardID / sourceCalloutID,
  // omission gives an empty default whiteboard.
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
        canAddContributions?: CalloutAllowedActors;
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
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
      },
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
        canAddContributions?: CalloutAllowedActors;
        commentsEnabled?: true;
      };
      framing?: { commentsEnabled: true };
    };
    contributionDefaults?: {
      sourceWhiteboardID?: string;
      sourceCalloutID?: string;
    };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignPlatformRole = async (
  actorID: string,
  roleName: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignPlatformRoleToUser(
      {
        roleData: { actorID, role: roleName },
      },
      {
        authorization: `Bearer ${authToken}`,
      },
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
  options?: { tags?: string[] },
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
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deleteOrganization = async (
  organizationId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const createSubspace = async (
  subspaceName: string,
  subspaceNameId: string,
  parentId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  tagline?: string,
  addTutorialCallouts = false,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSubspace(
      {
        subspaceData: subspaceVariablesData(
          subspaceName,
          subspaceNameId,
          parentId,
          tagline,
          addTutorialCallouts,
        ),
      },
      {
        authorization: `Bearer ${authToken}`,
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const subspaceVariablesData = (
  displayName: string,
  nameId: string,
  spaceId: string,
  tagline?: string,
  addTutorialCallouts = false,
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
      addTutorialCallouts,
      calloutsSetData: {},
    },
  };

  return variables;
};

export const getCalloutsData = async (
  calloutsSetId: string,
  tags?: string[] | undefined,
  role = TestUser.GLOBAL_ADMIN,
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
      },
    );

  return graphqlErrorWrapper(callback, role);
};

export const getCalloutDetails = async (
  calloutId: string,
  role = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CalloutDetails(
      {
        calloutId,
      },
      {
        authorization: `Bearer ${authToken}`,
      },
    );

  return graphqlErrorWrapper(callback, role);
};

export const createSpaceBasicData = async (
  spaceName: string,
  spaceNameId: string,
  accountID: string,
  addTutorialCallouts = false,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
      },
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

  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
                settings?.privacy?.allowPlatformSupportAsAdmin ?? true,
            },
            membership: {
              allowSubspaceAdminsToInviteMembers:
                settings?.membership?.allowSubspaceAdminsToInviteMembers ??
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
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const spaceNameId = `testecoeid${getUniqueId()}`;

export const getSpaceData = async (
  spaceId = spaceNameId,
  role = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpaceData(
      {
        spaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      },
    );

  return graphqlErrorWrapper(callback, role);
};

export const deleteSpace = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getLicensePlans = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetPlatformLicensePlans(
      {},
      {
        authorization: `Bearer ${authToken}`,
      },
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
      plan.id === licenseCredential,
  );
  const licensePlan = filteredLicensePlan;

  return licensePlan;
};

export const assignLicensePlanToAccount = async (
  accountId: string,
  licensePlanId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

// ---------------- Innovation Pack & Templates helpers ----------------

export const createInnovationPack = async (
  accountID: string,
  displayName: string,
  nameID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  options?: { tags?: string[] },
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
      },
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
    /** For TemplateType.Whiteboard: seed content from an existing whiteboard (server#6399 removed inline content). */
    sourceWhiteboardID?: string;
    // Callout-specific options
    calloutFramingType?: "NONE" | "WHITEBOARD" | "MEMO" | "LINK";
    calloutResponseTypes?: Array<"POST" | "WHITEBOARD" | "MEMO" | "LINK">;
    calloutAllowedContributors?: "MEMBERS" | "ADMINS" | "NONE";
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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

  // Map string literals to CalloutAllowedActors enum
  const allowedContributorsMap: Record<string, CalloutAllowedActors> = {
    MEMBERS: CalloutAllowedActors.Members,
    ADMINS: CalloutAllowedActors.Admins,
    NONE: CalloutAllowedActors.None,
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
        ", ",
      )}], contributors: ${allowedContributors} (${allowedContributorsEnumValue})`,
    );

    // Build framing data with optional whiteboard/memo/link based on type
    const framingData: any = {
      profile: { displayName: options.profileDisplayName },
      type: framingEnumValue,
    };

    // Add type-specific framing data if needed
    if (framingType === "WHITEBOARD") {
      // Since server#6399 CreateWhiteboardInput has no inline content;
      // omission creates an empty whiteboard (seed via sourceWhiteboardID).
      framingData.whiteboard = {};
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
    // Since server#6399 CreateWhiteboardInput has no inline content — an
    // empty input creates an empty whiteboard (seed via sourceWhiteboardID).
    whiteboard:
      options.type === TemplateType.Whiteboard
        ? { sourceWhiteboardID: options.sourceWhiteboardID }
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
        2,
      )}`,
    );
    LogManager.getLogger().info(
      `Full templateInput being sent: ${JSON.stringify(templateInput, null, 2)}`,
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
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
    }, BoK type: ${options.bodyOfKnowledgeType || "NONE"}`,
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
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deleteVirtualContributor = async (
  virtualContributorId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
      },
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
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
          // HELP is a permanent target category (060 forum reorganisation);
          // PLATFORM_FUNCTIONALITIES is a legacy retirement candidate and
          // must not be the harness's silent default (U-4).
          category: options?.category || ForumDiscussionCategory.Help,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deletePlatformDiscussion = async (
  discussionId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteDiscussion(
      {
        deleteData: { ID: discussionId },
      },
      {
        authorization: `Bearer ${authToken}`,
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getPlatformForumId = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
): Promise<string> => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetPlatformForumData(
      {},
      authToken ? { authorization: `Bearer ${authToken}` } : undefined,
    );

  const res = await graphqlErrorWrapper(callback, userRole);
  return res.data?.platform?.forum?.id ?? "";
};

export const deleteInnovationPack = async (
  innovationPackId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteInnovationPack(
      {
        innovationPackId,
      },
      {
        authorization: `Bearer ${authToken}`,
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateVirtualContributorVisibility = async (
  ID: string,
  visibility: { searchVisibility?: SearchVisibility; listedInStore?: boolean },
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateInnovationPackVisibility = async (
  ID: string,
  visibility: { searchVisibility?: SearchVisibility; listedInStore?: boolean },
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = new GraphQLClient(
    testConfiguration.endPoints.graphql.private,
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
      authToken ? { authorization: `Bearer ${authToken}` } : undefined,
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const triggerOrganizationVerification = async (
  organizationVerificationID: string,
  eventName = "MANUALLY_VERIFY",
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
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
      },
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const applyOrganizationVerificationSequence = async (
  organizationVerificationID: string,
  events: string[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  for (const eventName of events) {
    await triggerOrganizationVerification(
      organizationVerificationID,
      eventName,
      userRole,
    );
  }
};
