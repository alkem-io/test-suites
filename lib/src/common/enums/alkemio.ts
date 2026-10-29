/**
 * Lib-owned enums.
 *
 * Every enum a spec needs comes from here, never from the generated schema.
 * Today each one re-exports the generated value one-to-one, so values are
 * identical to the server's; when the schema changes, this is the one file
 * that maps the new values and the specs do not move. The client-web ESLint
 * boundary (`no-restricted-imports` on `core/generated/*`) enforces it.
 */
export {
  ActorType,
  AiPersonaEngine,
  AuthorizationPrivilege,
  CalendarEventType,
  CalloutAllowedActors,
  CalloutContributionType,
  CalloutFormQuestionType,
  CalloutFormResponseMode,
  CalloutFormResponseVisibility,
  CalloutFormState,
  CalloutFramingType,
  CalloutSelectionMode,
  CalloutVisibility,
  ClassificationCardinality,
  CollaboraDocumentType,
  CommunityMembershipPolicy,
  CommunityMembershipStatus,
  ContributorCollectionView,
  ConversationCreationType,
  ForumDiscussionCategory,
  InnovationHubType,
  LicenseEntitlementType,
  McpApiKeyStatus,
  NotificationEvent,
  NotificationEventInAppState,
  OrganizationVerificationEnum,
  PollStatus,
  RoleName,
  RoleSetInvitationResultType,
  RoomType,
  SearchVisibility,
  SidebarWidget,
  SpaceCollectionCardVariant,
  SpaceLevel,
  SpacePrivacyMode,
  SpaceVisibility,
  TemplateType,
  UserInformationVisibility,
  VirtualContributorBodyOfKnowledgeType,
  VisualType,
} from "../../core/generated/alkemio-schema";
