// import { SpacePrivacyMode, CommunityMembershipPolicy } from "@src/core/generated/alkemio-schema";
import { SpacePrivacyMode, CommunityMembershipPolicy } from "../../../../lib/src/core/generated/alkemio-schema";
import { TemplateType } from "@alkemio/client-lib";
import { TestUser } from "../../common/enums/test.user";

export interface TestScenarioConfig {
  name: string;
  organization?: TestScenarioOrganizationConfig;
  space?: TestScenarioSpaceConfig;
  /** Optional: create an Innovation Pack with templates prior to tests */
  innovationPack?: TestScenarioInnovationPackConfig;
  /** Optional: create Virtual Contributors prior to tests */
  virtualContributors?: TestScenarioVirtualContributorsConfig;
  /** Optional: create a platform discussion before tests */
  platformDiscussion?: TestScenarioPlatformDiscussionConfig;
}

export interface TestScenarioWithOrganizationConfig {
  name: string;
  organization?: TestScenarioOrganizationConfig;
}

export interface TestScenarioNoPreCreationConfig {
  name: string;
}

export interface TestScenarioSpaceConfig {
  about?: {
    profile?: {
      displayName?: string;
      tagline?: string;
    };
  };
  community?: {
    members?: TestUser[];
    admins?: TestUser[];
    leads?: TestUser[];
  };
  collaboration?: {
    addTutorialCallouts?: boolean; // Only applicable on L0
    addPostCallout?: boolean;
    addPostCollectionCallout?: boolean;
    addLinkCollectionCallout?: boolean;
    addWhiteboardCollectionCallout?: boolean;
    addWhiteboardCallout?: boolean;
  };
  subspace?: TestScenarioSpaceConfig;
  settings?: {
    privacy?: {
      mode?: SpacePrivacyMode;
      allowPlatformSupportAsAdmin?: boolean;
    };
    membership?: {
      policy?: CommunityMembershipPolicy;
      allowSubspaceAdminsToInviteMembers?: boolean;
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
  };
}

export interface TestScenarioPlatformDiscussionConfig {
  /** Target forum ID where the discussion will be created. If omitted, will try forumIDEnvVarName then PLATFORM_DISCUSSION_FORUM_ID env var. */
  forumID?: string;
  /** Environment variable name holding the forum ID; defaults to PLATFORM_DISCUSSION_FORUM_ID. */
  forumIDEnvVarName?: string;
  /** Optional display name for the discussion */
  title?: string;
  /** Optional description/markdown for the discussion */
  description?: string;
  /** Optional category; defaults to PLATFORM_FUNCTIONALITIES */
  category?:
    | "CHALLENGE_CENTRIC"
    | "COMMUNITY_BUILDING"
    | "HELP"
    | "OTHER"
    | "PLATFORM_FUNCTIONALITIES"
    | "RELEASES";
  /** Optional user role to perform the mutation; defaults to GLOBAL_ADMIN */
  userRole?: TestUser;
}

export interface TestScenarioOrganizationConfig {
  community?: {
    addMembers: boolean;
    addAdmin: boolean;
  };
  /** Optional tags for the organization profile (default includes organization.admin@alkem.io) */
  tags?: string[];
  /** Optional: verify the organization after creation */
  verification?: {
    setVerified?: boolean;
    /** Optional single event; if omitted and setVerified is true, defaults to VERIFICATION_REQUEST + MANUALLY_VERIFY sequence */
    eventName?: string;
    /** Optional custom sequence of verification events to run; overrides eventName when provided */
    events?: string[];
  };
}

// --- Innovation Pack support (optional, non-breaking) ---

export interface TestScenarioInnovationPackConfig {
  /** Use the base scenario organization as the provider for the Innovation Pack */
  useBaseOrganization?: boolean;
  /**
   * Provider Organization for the Innovation Pack. If not provided, a new org
   * will be created with an auto-generated name. The org admin user is
   * organization.admin@alkem.io (as per TestUserManager mapping).
   */
  providerOrganization?: {
    about?: {
      profile?: {
        displayName?: string;
        tagline?: string;
      };
    };
    tags?: string[];
    verification?: {
      setVerified?: boolean;
      eventName?: string;
    };
  };

  /** Pack profile and optional nameID override */
  pack?: {
    displayName?: string;
    nameID?: string;
    tags?: string[];
  };

  /** Visibility controls for the Innovation Pack */
  visibility?: {
    listedInStore?: boolean;
    searchVisibility?: "PUBLIC" | "ACCOUNT" | "HIDDEN";
  };

  /**
   * Templates to create inside the Innovation Pack's TemplatesSet.
   * Each entry defines a TemplateType and minimal optional fields.
   */
  templates?: Array<
    | {
        type:
          | TemplateType.Whiteboard
          | TemplateType.Post
          | TemplateType.Space
          | TemplateType.CommunityGuidelines;
        profileDisplayName?: string;
        tags?: string[];
        /** For TemplateType.Post */
        postDefaultDescription?: string;
        /** For TemplateType.Whiteboard */
        whiteboardContent?: string;
      }
    | {
        type: TemplateType.Callout;
        profileDisplayName?: string;
        tags?: string[];
        /** Callout framing type: None (default), Whiteboard, Memo, or Link */
        calloutFramingType?: "NONE" | "WHITEBOARD" | "MEMO" | "LINK";
        /** Response (contribution) types allowed in this callout */
        calloutResponseTypes?: Array<"POST" | "WHITEBOARD" | "MEMO" | "LINK">;
        /** Who can add contributions: MEMBERS (default), ADMINS, or NONE */
        calloutAllowedContributors?: "MEMBERS" | "ADMINS" | "NONE";
        /** For WHITEBOARD framing: whiteboard content in Excalidraw JSON format */
        calloutWhiteboardFramingContent?: string;
        /** For MEMO framing: markdown content */
        calloutMemoFramingMarkdown?: string;
        /** For LINK framing: URI to link to */
        calloutLinkFramingUri?: string;
      }
  >;
}

// --- Virtual Contributors support (optional, non-breaking) ---

export interface TestScenarioVirtualContributorsConfig {
  /** Use the base scenario organization as the host for the VCs */
  useBaseOrganization?: boolean;
  /**
   * Host Organization for the Virtual Contributors. If not provided, a new org
   * will be created with an auto-generated name. The org admin user is
   * organization.admin@alkem.io (as per TestUserManager mapping).
   */
  hostOrganization?: {
    about?: {
      profile?: {
        displayName?: string;
        tagline?: string;
      };
    };
    tags?: string[];
    verification?: {
      setVerified?: boolean;
      eventName?: string;
    };
  };

  /** Visibility controls for Virtual Contributors */
  visibility?: {
    listedInStore?: boolean;
    searchVisibility?: "PUBLIC" | "ACCOUNT" | "HIDDEN";
  };

  /**
   * Virtual Contributors to create. Each VC will be hosted by the hostOrganization account.
   */
  virtualContributors?: Array<{
    profileDisplayName: string;
    profileDescription?: string;
    nameID?: string;

    /** AI Persona configuration */
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

    /** Body of Knowledge configuration */
    bodyOfKnowledgeType?:
      | "NONE"
      | "WEBSITE"
      | "ALKEMIO_KNOWLEDGE_BASE"
      | "ALKEMIO_SPACE"
      | "OTHER";
    bodyOfKnowledgeDescription?: string;
    bodyOfKnowledgeID?: string;

    /** Data Access Mode */
    dataAccessMode?: "NONE" | "SPACE_PROFILE" | "SPACE_PROFILE_AND_CONTENTS";

    /** Interaction Modes */
    interactionModes?: "DISCUSSION_TAGGING"[];

    /** Knowledge Base data for ALKEMIO_KNOWLEDGE_BASE type */
    knowledgeBaseProfile?: {
      displayName?: string;
      description?: string;
    };
  }>;
}
