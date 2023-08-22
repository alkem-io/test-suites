import {
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig,
} from 'graphql';
export type Maybe<T> = T | undefined;
export type InputMaybe<T> = T | undefined;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> &
  { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> &
  { [SubKey in K]: Maybe<T[SubKey]> };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> &
  { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  CID: any;
  DID: string;
  DateTime: Date;
  Emoji: any;
  JSON: string;
  LifecycleDefinition: any;
  Markdown: any;
  MessageID: any;
  NameID: string;
  UUID: string;
  UUID_NAMEID: string;
  UUID_NAMEID_EMAIL: string;
  Upload: import('graphql-upload').FileUpload;
};

export type Apm = {
  /** Endpoint where events are sent. */
  endpoint: Scalars['String'];
  /** Flag indicating if real user monitoring is enabled. */
  rumEnabled: Scalars['Boolean'];
};

export type ActivityCreatedSubscriptionInput = {
  /** The collaboration on which to subscribe for new activity */
  collaborationID: Scalars['UUID'];
  /** Include activities happened on child Collaborations. */
  includeChild?: InputMaybe<Scalars['Boolean']>;
  /** Which activity types to include in the results. Returns all by default. */
  types?: InputMaybe<Array<ActivityEventType>>;
};

export type ActivityCreatedSubscriptionResult = {
  /** The newly created activity */
  activity: ActivityLogEntry;
};

export enum ActivityEventType {
  CalendarEventCreated = 'CALENDAR_EVENT_CREATED',
  CalloutLinkCreated = 'CALLOUT_LINK_CREATED',
  CalloutPostComment = 'CALLOUT_POST_COMMENT',
  CalloutPostCreated = 'CALLOUT_POST_CREATED',
  CalloutPublished = 'CALLOUT_PUBLISHED',
  CalloutWhiteboardCreated = 'CALLOUT_WHITEBOARD_CREATED',
  ChallengeCreated = 'CHALLENGE_CREATED',
  DiscussionComment = 'DISCUSSION_COMMENT',
  MemberJoined = 'MEMBER_JOINED',
  OpportunityCreated = 'OPPORTUNITY_CREATED',
  UpdateSent = 'UPDATE_SENT',
}

export type ActivityLogEntry = {
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime'];
  /** The text details for this Activity. */
  description: Scalars['String'];
  id: Scalars['UUID'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID'];
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalendarEventCreated = ActivityLogEntry & {
  /** The Calendar in which the CalendarEvent was created. */
  calendar: Calendar;
  /** The CalendarEvent that was created. */
  calendarEvent: CalendarEvent;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime'];
  /** The text details for this Activity. */
  description: Scalars['String'];
  id: Scalars['UUID'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID'];
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalloutDiscussionComment = ActivityLogEntry & {
  /** The Callout in which the comment was added. */
  callout: Callout;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime'];
  /** The text details for this Activity. */
  description: Scalars['String'];
  id: Scalars['UUID'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID'];
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalloutLinkCreated = ActivityLogEntry & {
  /** The Callout in which the Link was created. */
  callout: Callout;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime'];
  /** The text details for this Activity. */
  description: Scalars['String'];
  id: Scalars['UUID'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID'];
  /** The Reference that was created. */
  reference: Reference;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalloutPostComment = ActivityLogEntry & {
  /** The Callout in which the Post was commented. */
  callout: Callout;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime'];
  /** The text details for this Activity. */
  description: Scalars['String'];
  id: Scalars['UUID'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID'];
  /** The Post that was commented on. */
  post: Post;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalloutPostCreated = ActivityLogEntry & {
  /** The Callout in which the Post was created. */
  callout: Callout;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime'];
  /** The text details for this Activity. */
  description: Scalars['String'];
  id: Scalars['UUID'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID'];
  /** The Post that was created. */
  post: Post;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalloutPublished = ActivityLogEntry & {
  /** The Callout that was published. */
  callout: Callout;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime'];
  /** The text details for this Activity. */
  description: Scalars['String'];
  id: Scalars['UUID'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID'];
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalloutWhiteboardCreated = ActivityLogEntry & {
  /** The Callout in which the Whiteboard was created. */
  callout: Callout;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime'];
  /** The text details for this Activity. */
  description: Scalars['String'];
  id: Scalars['UUID'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID'];
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
  /** The Whiteboard that was created. */
  whiteboard: Whiteboard;
};

export type ActivityLogEntryChallengeCreated = ActivityLogEntry & {
  /** The Challenge that was created. */
  challenge: Challenge;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime'];
  /** The text details for this Activity. */
  description: Scalars['String'];
  id: Scalars['UUID'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID'];
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryMemberJoined = ActivityLogEntry & {
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID'];
  /** The community that was joined. */
  community: Community;
  /** The type of the the Community. */
  communityType: Scalars['String'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime'];
  /** The text details for this Activity. */
  description: Scalars['String'];
  id: Scalars['UUID'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID'];
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
  /** The User that joined the Community. */
  user: User;
};

export type ActivityLogEntryOpportunityCreated = ActivityLogEntry & {
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime'];
  /** The text details for this Activity. */
  description: Scalars['String'];
  id: Scalars['UUID'];
  /** The Opportunity that was created. */
  opportunity: Opportunity;
  /** The display name of the parent */
  parentDisplayName: Scalars['String'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID'];
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryUpdateSent = ActivityLogEntry & {
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime'];
  /** The text details for this Activity. */
  description: Scalars['String'];
  id: Scalars['UUID'];
  /** The Message that been sent to this Community. */
  message: Scalars['String'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID'];
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
  /** The Updates for this Community. */
  updates: Room;
};

export type ActivityLogInput = {
  /** Display the activityLog results for the specified Collaboration. */
  collaborationID: Scalars['UUID'];
  /** Include entries happened on child Collaborations. */
  includeChild?: InputMaybe<Scalars['Boolean']>;
  /** The number of ActivityLog entries to return; if omitted return all. */
  limit?: InputMaybe<Scalars['Float']>;
  /** Which activity types to include in the results. Returns all by default. */
  types?: InputMaybe<Array<ActivityEventType>>;
};

export type Actor = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** A description of this actor */
  description?: Maybe<Scalars['String']>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The change / effort required of this actor */
  impact?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  /** A value derived by this actor */
  value?: Maybe<Scalars['String']>;
};

export type ActorGroup = {
  /** The set of actors in this actor group */
  actors?: Maybe<Array<Actor>>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** A description of this group of actors */
  description?: Maybe<Scalars['String']>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  name: Scalars['String'];
};

export type AdminInnovationFlowSynchronizeStatesInput = {
  /** ID of the Innovation Flow */
  innovationFlowID: Scalars['UUID'];
};

export type Agent = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The Credentials held by this Agent. */
  credentials?: Maybe<Array<Credential>>;
  /** The Decentralized Identifier (DID) for this Agent. */
  did?: Maybe<Scalars['DID']>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The Verfied Credentials for this Agent. */
  verifiedCredentials?: Maybe<Array<VerifiedCredential>>;
};

export type AgentBeginVerifiedCredentialOfferOutput = {
  /** The token containing the information about issuer, callback endpoint and the credentials offered */
  jwt: Scalars['String'];
  /** The QR Code Image to be offered on the client for scanning by a mobile wallet */
  qrCodeImg: Scalars['String'];
};

export type AgentBeginVerifiedCredentialRequestOutput = {
  /** The token containing the information about issuer, callback endpoint and the credentials offered */
  jwt: Scalars['String'];
  /** The QR Code Image to be offered on the client for scanning by a mobile wallet */
  qrCodeImg: Scalars['String'];
};

export type Application = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  createdDate: Scalars['DateTime'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  lifecycle: Lifecycle;
  /** The Questions for this application. */
  questions: Array<Question>;
  updatedDate: Scalars['DateTime'];
  /** The User for this Application. */
  user: User;
};

export type ApplicationEventInput = {
  applicationID: Scalars['UUID'];
  eventName: Scalars['String'];
};

export type ApplicationForRoleResult = {
  /** ID for the Challenge being applied to, if any. Or the Challenge containing the Opportunity being applied to. */
  challengeID?: Maybe<Scalars['UUID']>;
  /** ID for the community */
  communityID: Scalars['UUID'];
  /** Date of creation */
  createdDate: Scalars['DateTime'];
  /** Display name of the community */
  displayName: Scalars['String'];
  /** ID for the application */
  id: Scalars['UUID'];
  /** ID for the Opportunity being applied to, if any. */
  opportunityID?: Maybe<Scalars['UUID']>;
  /** ID for the ultimate containing Space */
  spaceID: Scalars['UUID'];
  /** The current state of the application. */
  state: Scalars['String'];
  /** Date of last update */
  updatedDate: Scalars['DateTime'];
};

export type AssignCommunityRoleToOrganizationInput = {
  communityID: Scalars['UUID'];
  organizationID: Scalars['UUID_NAMEID'];
  role: CommunityRole;
};

export type AssignCommunityRoleToUserInput = {
  communityID: Scalars['UUID'];
  role: CommunityRole;
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type AssignGlobalAdminInput = {
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type AssignGlobalCommunityAdminInput = {
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type AssignGlobalSpacesAdminInput = {
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type AssignOrganizationAdminInput = {
  organizationID: Scalars['UUID_NAMEID'];
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type AssignOrganizationAssociateInput = {
  organizationID: Scalars['UUID_NAMEID'];
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type AssignOrganizationOwnerInput = {
  organizationID: Scalars['UUID_NAMEID'];
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type AssignUserGroupMemberInput = {
  groupID: Scalars['UUID'];
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type AuthenticationConfig = {
  /** Alkemio Authentication Providers Config. */
  providers: Array<AuthenticationProviderConfig>;
};

export type AuthenticationProviderConfig = {
  /** Configuration of the authenticaiton provider */
  config: AuthenticationProviderConfigUnion;
  /** Is the authentication provider enabled? */
  enabled: Scalars['Boolean'];
  /** CDN location of an icon of the authentication provider login button. */
  icon: Scalars['String'];
  /** Label of the authentication provider. */
  label: Scalars['String'];
  /** Name of the authentication provider. */
  name: Scalars['String'];
};

export type AuthenticationProviderConfigUnion = OryConfig;

export type Authorization = {
  anonymousReadAccess: Scalars['Boolean'];
  /** The set of credential rules that are contained by this Authorization Policy. */
  credentialRules?: Maybe<Array<AuthorizationPolicyRuleCredential>>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The privileges granted to the current user based on this Authorization Policy. */
  myPrivileges?: Maybe<Array<AuthorizationPrivilege>>;
  /** The set of privilege rules that are contained by this Authorization Policy. */
  privilegeRules?: Maybe<Array<AuthorizationPolicyRulePrivilege>>;
  /** The set of verified credential rules that are contained by this Authorization Policy. */
  verifiedCredentialRules?: Maybe<
    Array<AuthorizationPolicyRuleVerifiedCredential>
  >;
};

export enum AuthorizationCredential {
  BetaTester = 'BETA_TESTER',
  ChallengeAdmin = 'CHALLENGE_ADMIN',
  ChallengeHost = 'CHALLENGE_HOST',
  ChallengeLead = 'CHALLENGE_LEAD',
  ChallengeMember = 'CHALLENGE_MEMBER',
  GlobalAdmin = 'GLOBAL_ADMIN',
  GlobalAdminCommunity = 'GLOBAL_ADMIN_COMMUNITY',
  GlobalAdminSpaces = 'GLOBAL_ADMIN_SPACES',
  GlobalRegistered = 'GLOBAL_REGISTERED',
  InnovationPackProvider = 'INNOVATION_PACK_PROVIDER',
  OpportunityAdmin = 'OPPORTUNITY_ADMIN',
  OpportunityHost = 'OPPORTUNITY_HOST',
  OpportunityLead = 'OPPORTUNITY_LEAD',
  OpportunityMember = 'OPPORTUNITY_MEMBER',
  OrganizationAdmin = 'ORGANIZATION_ADMIN',
  OrganizationAssociate = 'ORGANIZATION_ASSOCIATE',
  OrganizationOwner = 'ORGANIZATION_OWNER',
  SpaceAdmin = 'SPACE_ADMIN',
  SpaceHost = 'SPACE_HOST',
  SpaceLead = 'SPACE_LEAD',
  SpaceMember = 'SPACE_MEMBER',
  UserGroupMember = 'USER_GROUP_MEMBER',
  UserSelfManagement = 'USER_SELF_MANAGEMENT',
}

export type AuthorizationPolicyRuleCredential = {
  cascade: Scalars['Boolean'];
  criterias: Array<CredentialDefinition>;
  grantedPrivileges: Array<AuthorizationPrivilege>;
  name?: Maybe<Scalars['String']>;
};

export type AuthorizationPolicyRulePrivilege = {
  grantedPrivileges: Array<AuthorizationPrivilege>;
  name?: Maybe<Scalars['String']>;
  sourcePrivilege: AuthorizationPrivilege;
};

export type AuthorizationPolicyRuleVerifiedCredential = {
  claimRule: Scalars['String'];
  credentialName: Scalars['String'];
  grantedPrivileges: Array<AuthorizationPrivilege>;
};

export enum AuthorizationPrivilege {
  AccessInteractiveGuidance = 'ACCESS_INTERACTIVE_GUIDANCE',
  Admin = 'ADMIN',
  AuthorizationReset = 'AUTHORIZATION_RESET',
  CommunityAddMember = 'COMMUNITY_ADD_MEMBER',
  CommunityApply = 'COMMUNITY_APPLY',
  CommunityContextReview = 'COMMUNITY_CONTEXT_REVIEW',
  CommunityInvite = 'COMMUNITY_INVITE',
  CommunityInviteAccept = 'COMMUNITY_INVITE_ACCEPT',
  CommunityJoin = 'COMMUNITY_JOIN',
  Contribute = 'CONTRIBUTE',
  Create = 'CREATE',
  CreateCallout = 'CREATE_CALLOUT',
  CreateChallenge = 'CREATE_CHALLENGE',
  CreateDiscussion = 'CREATE_DISCUSSION',
  CreateMessage = 'CREATE_MESSAGE',
  CreateMessageReaction = 'CREATE_MESSAGE_REACTION',
  CreateMessageReply = 'CREATE_MESSAGE_REPLY',
  CreateOpportunity = 'CREATE_OPPORTUNITY',
  CreateOrganization = 'CREATE_ORGANIZATION',
  CreatePost = 'CREATE_POST',
  CreateRelation = 'CREATE_RELATION',
  CreateSpace = 'CREATE_SPACE',
  CreateWhiteboard = 'CREATE_WHITEBOARD',
  Delete = 'DELETE',
  FileDelete = 'FILE_DELETE',
  FileUpload = 'FILE_UPLOAD',
  Grant = 'GRANT',
  GrantGlobalAdmins = 'GRANT_GLOBAL_ADMINS',
  MovePost = 'MOVE_POST',
  PlatformAdmin = 'PLATFORM_ADMIN',
  Read = 'READ',
  ReadUsers = 'READ_USERS',
  Update = 'UPDATE',
  UpdateCalloutPublisher = 'UPDATE_CALLOUT_PUBLISHER',
  UpdateInnovationFlow = 'UPDATE_INNOVATION_FLOW',
  UpdateWhiteboard = 'UPDATE_WHITEBOARD',
}

export type Calendar = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** A single CalendarEvent */
  event?: Maybe<CalendarEvent>;
  /** The list of CalendarEvents for this Calendar. */
  events?: Maybe<Array<CalendarEvent>>;
  /** The ID of the entity */
  id: Scalars['UUID'];
};

export type CalendarEventArgs = {
  ID: Scalars['UUID_NAMEID'];
};

export type CalendarEventsArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID_NAMEID']>>;
  limit?: InputMaybe<Scalars['Float']>;
};

export type CalendarEvent = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The comments for this CalendarEvent */
  comments: Room;
  /** The user that created this CalendarEvent */
  createdBy?: Maybe<User>;
  createdDate: Scalars['DateTime'];
  /** The length of the event in days. */
  durationDays?: Maybe<Scalars['Float']>;
  /** The length of the event in minutes. */
  durationMinutes: Scalars['Float'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Flag to indicate if this event is for multiple days. */
  multipleDays: Scalars['Boolean'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** The Profile for this Post. */
  profile: Profile;
  /** The start time for this CalendarEvent. */
  startDate?: Maybe<Scalars['DateTime']>;
  /** The event type, e.g. webinar, meetup etc. */
  type: CalendarEventType;
  /** Flag to indicate if this event is for a whole day. */
  wholeDay: Scalars['Boolean'];
};

export enum CalendarEventType {
  Event = 'EVENT',
  Milestone = 'MILESTONE',
  Other = 'OTHER',
  Training = 'TRAINING',
}

export type Callout = {
  /** The activity for this Callout. */
  activity: Scalars['Float'];
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The comments for this Callout. */
  comments?: Maybe<Room>;
  /** The user that created this Callout */
  createdBy?: Maybe<User>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** The Post template associated with this Callout. */
  postTemplate?: Maybe<PostTemplate>;
  /** The Posts associated with this Callout. */
  posts?: Maybe<Array<Post>>;
  /** The Profile for this Callout. */
  profile: Profile;
  /** The user that published this Callout */
  publishedBy?: Maybe<User>;
  /** The timestamp for the publishing of this Callout. */
  publishedDate?: Maybe<Scalars['Float']>;
  /** The sorting order for this Callout. */
  sortOrder: Scalars['Float'];
  /** State of the Callout. */
  state: CalloutState;
  /** The Callout type, e.g. Post, Whiteboard, Discussion */
  type: CalloutType;
  /** Visibility of the Callout. */
  visibility: CalloutVisibility;
  /** The whiteboard template associated with this Callout. */
  whiteboardTemplate?: Maybe<WhiteboardTemplate>;
  /** The Whiteboards associated with this Callout. */
  whiteboards?: Maybe<Array<Whiteboard>>;
};

export type CalloutPostsArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID_NAMEID']>>;
  limit?: InputMaybe<Scalars['Float']>;
  shuffle?: InputMaybe<Scalars['Boolean']>;
};

export type CalloutWhiteboardsArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID_NAMEID']>>;
  limit?: InputMaybe<Scalars['Float']>;
  shuffle?: InputMaybe<Scalars['Boolean']>;
};

export enum CalloutDisplayLocation {
  ChallengesLeft = 'CHALLENGES_LEFT',
  ChallengesRight = 'CHALLENGES_RIGHT',
  CommunityLeft = 'COMMUNITY_LEFT',
  CommunityRight = 'COMMUNITY_RIGHT',
  ContributeLeft = 'CONTRIBUTE_LEFT',
  ContributeRight = 'CONTRIBUTE_RIGHT',
  HomeLeft = 'HOME_LEFT',
  HomeRight = 'HOME_RIGHT',
  HomeTop = 'HOME_TOP',
  Knowledge = 'KNOWLEDGE',
  OpportunitiesLeft = 'OPPORTUNITIES_LEFT',
  OpportunitiesRight = 'OPPORTUNITIES_RIGHT',
}

export type CalloutPostCreated = {
  /** The identifier for the Callout on which the post was created. */
  calloutID: Scalars['String'];
  /** The post that has been created. */
  post: Post;
};

export enum CalloutState {
  Archived = 'ARCHIVED',
  Closed = 'CLOSED',
  Open = 'OPEN',
}

export enum CalloutType {
  LinkCollection = 'LINK_COLLECTION',
  Post = 'POST',
  PostCollection = 'POST_COLLECTION',
  Whiteboard = 'WHITEBOARD',
  WhiteboardCollection = 'WHITEBOARD_COLLECTION',
}

export enum CalloutVisibility {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
}

export type Challenge = {
  /** The Agent representing this Challenge. */
  agent?: Maybe<Agent>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The set of child Challenges within this challenge. */
  challenges?: Maybe<Array<Challenge>>;
  /** Collaboration object for the base challenge */
  collaboration?: Maybe<Collaboration>;
  /** The community for the challenge. */
  community?: Maybe<Community>;
  /** The context for the challenge. */
  context?: Maybe<Context>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The InnovationFlow for the Challenge. */
  innovationFlow?: Maybe<InnovationFlow>;
  /** Metrics about activity within this Challenge. */
  metrics?: Maybe<Array<Nvp>>;
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** The Opportunities for the challenge. */
  opportunities?: Maybe<Array<Opportunity>>;
  /** The preferences for this Challenge */
  preferences: Array<Preference>;
  /** The Profile for the  Challenge. */
  profile: Profile;
  /** The ID of the containing Space. */
  spaceID: Scalars['String'];
  /** The StorageBucket with documents in use by this Challenge */
  storageBucket?: Maybe<StorageBucket>;
};

export type ChallengeOpportunitiesArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID']>>;
  limit?: InputMaybe<Scalars['Float']>;
  shuffle?: InputMaybe<Scalars['Boolean']>;
};

export type ChallengeCreated = {
  /** The Challenge that has been created. */
  challenge: Challenge;
  /** The identifier for the Space on which the Challenge was created. */
  spaceID: Scalars['UUID_NAMEID'];
};

export enum ChallengePreferenceType {
  AllowContributorsToCreateCallouts = 'ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS',
  AllowContributorsToCreateOpportunities = 'ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES',
  AllowNonMembersReadAccess = 'ALLOW_NON_MEMBERS_READ_ACCESS',
  AllowSpaceMembersToContribute = 'ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE',
  MembershipApplyChallengeFromSpaceMembers = 'MEMBERSHIP_APPLY_CHALLENGE_FROM_SPACE_MEMBERS',
  MembershipFeedbackOnChallengeContext = 'MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT',
  MembershipJoinChallengeFromSpaceMembers = 'MEMBERSHIP_JOIN_CHALLENGE_FROM_SPACE_MEMBERS',
}

export type ChallengeTemplate = {
  /** Feedback templates. */
  feedback?: Maybe<Array<FeedbackTemplate>>;
  /** Challenge template name. */
  name: Scalars['String'];
};

export type ChatGuidanceInput = {
  /** The question that is being asked. */
  question: Scalars['String'];
};

export type ChatGuidanceResult = {
  /** The answer to the question */
  answer: Scalars['String'];
  /** The original question */
  question: Scalars['String'];
  /** The sources used to answer the question */
  sources: Scalars['String'];
};

export type Collaboration = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** List of callouts */
  callouts?: Maybe<Array<Callout>>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** List of relations */
  relations?: Maybe<Array<Relation>>;
  /** The tagset templates on this Collaboration. */
  tagsetTemplates?: Maybe<Array<TagsetTemplate>>;
  /** The timeline with events in use by this Space */
  timeline?: Maybe<Timeline>;
};

export type CollaborationCalloutsArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID_NAMEID']>>;
  displayLocations?: InputMaybe<Array<CalloutDisplayLocation>>;
  limit?: InputMaybe<Scalars['Float']>;
  shuffle?: InputMaybe<Scalars['Boolean']>;
  sortByActivity?: InputMaybe<Scalars['Boolean']>;
  tagsets?: InputMaybe<Array<TagsetArgs>>;
};

export type Communication = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** A particular Discussions active in this Communication. */
  discussion?: Maybe<Discussion>;
  discussionCategories: Array<DiscussionCategory>;
  /** The Discussions active in this Communication. */
  discussions?: Maybe<Array<Discussion>>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The updates on this Communication. */
  updates: Room;
};

export type CommunicationDiscussionArgs = {
  ID: Scalars['String'];
};

export type CommunicationAdminEnsureAccessInput = {
  communityID: Scalars['UUID'];
};

export type CommunicationAdminMembershipInput = {
  communityID: Scalars['UUID'];
};

export type CommunicationAdminMembershipResult = {
  /** Display name of the result */
  displayName: Scalars['String'];
  /** A unique identifier for this comunication room membership result. */
  id: Scalars['String'];
  /** Rooms in this Communication */
  rooms: Array<CommunicationAdminRoomMembershipResult>;
};

export type CommunicationAdminOrphanedUsageResult = {
  /** Rooms in the Communication platform that are not used */
  rooms: Array<CommunicationAdminRoomResult>;
};

export type CommunicationAdminRemoveOrphanedRoomInput = {
  roomID: Scalars['String'];
};

export type CommunicationAdminRoomMembershipResult = {
  /** Display name of the entity */
  displayName: Scalars['String'];
  /** Members of the room that are not members of the Community. */
  extraMembers: Array<Scalars['String']>;
  /** A unique identifier for this membership result. */
  id: Scalars['String'];
  /** The access mode for the room. */
  joinRule: Scalars['String'];
  /** Name of the room */
  members: Array<Scalars['String']>;
  /** Members of the community that are missing from the room */
  missingMembers: Array<Scalars['String']>;
  /** The matrix room ID */
  roomID: Scalars['String'];
};

export type CommunicationAdminRoomResult = {
  /** Display name of the result */
  displayName: Scalars['String'];
  /** The identifier for the orphaned room. */
  id: Scalars['String'];
  /** The members of the orphaned room */
  members: Array<Scalars['String']>;
};

export type CommunicationAdminUpdateRoomsJoinRuleInput = {
  isPublic: Scalars['Boolean'];
};

export type CommunicationCreateDiscussionInput = {
  /** The category for the Discussion */
  category: DiscussionCategory;
  /** The identifier for the Communication entity the Discussion is being created on. */
  communicationID: Scalars['UUID'];
  profile: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']>>;
};

export type CommunicationRoom = {
  /** The display name of the room */
  displayName: Scalars['String'];
  /** The identifier of the room */
  id: Scalars['String'];
  /** The messages that have been sent to the Room. */
  messages: Array<Message>;
};

export type CommunicationSendMessageToCommunityLeadsInput = {
  /** The Community the message is being sent to */
  communityId: Scalars['UUID'];
  /** The message being sent */
  message: Scalars['String'];
};

export type CommunicationSendMessageToOrganizationInput = {
  /** The message being sent */
  message: Scalars['String'];
  /** The Organization the message is being sent to */
  organizationId: Scalars['UUID'];
};

export type CommunicationSendMessageToUserInput = {
  /** The message being sent */
  message: Scalars['String'];
  /** All Users the message is being sent to */
  receiverIds: Array<Scalars['UUID']>;
};

export type Community = Groupable & {
  /** The Form used for Applications to this community. */
  applicationForm?: Maybe<Form>;
  /** Applications available for this community. */
  applications?: Maybe<Array<Application>>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** All member users excluding the current lead users in this Community. */
  availableLeadUsers?: Maybe<PaginatedUsers>;
  /** All available users that are potential Community members. */
  availableMemberUsers?: Maybe<PaginatedUsers>;
  /** The Communications for this Community. */
  communication?: Maybe<Communication>;
  /** The displayName for this Community. */
  displayName?: Maybe<Scalars['String']>;
  /** Groups of users related to a Community. */
  groups?: Maybe<Array<UserGroup>>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Invitations for this community. */
  invitations?: Maybe<Array<Invitation>>;
  /** Invitations to join this Community for users not yet on the Alkemio platform. */
  invitationsExternal?: Maybe<Array<InvitationExternal>>;
  /** All users that are contributing to this Community. */
  memberUsers?: Maybe<Array<User>>;
  /** The membership status of the currently logged in user. */
  myMembershipStatus?: Maybe<CommunityMembershipStatus>;
  /** All Organizations that have the specified Role in this Community. */
  organizationsInRole?: Maybe<Array<Organization>>;
  /** The policy that defines the roles for this Community. */
  policy?: Maybe<CommunityPolicy>;
  /** All users that have the specified Role in this Community. */
  usersInRole?: Maybe<Array<User>>;
};

export type CommunityAvailableLeadUsersArgs = {
  after?: InputMaybe<Scalars['UUID']>;
  before?: InputMaybe<Scalars['UUID']>;
  filter?: InputMaybe<UserFilterInput>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

export type CommunityAvailableMemberUsersArgs = {
  after?: InputMaybe<Scalars['UUID']>;
  before?: InputMaybe<Scalars['UUID']>;
  filter?: InputMaybe<UserFilterInput>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

export type CommunityMemberUsersArgs = {
  limit?: InputMaybe<Scalars['Float']>;
};

export type CommunityOrganizationsInRoleArgs = {
  role: CommunityRole;
};

export type CommunityUsersInRoleArgs = {
  role: CommunityRole;
};

export type CommunityApplyInput = {
  communityID: Scalars['UUID'];
  questions: Array<CreateNvpInput>;
};

export type CommunityJoinInput = {
  communityID: Scalars['UUID'];
};

export enum CommunityMembershipStatus {
  ApplicationPending = 'APPLICATION_PENDING',
  InvitationPending = 'INVITATION_PENDING',
  Member = 'MEMBER',
  NotMember = 'NOT_MEMBER',
}

export type CommunityPolicy = {
  /** The role policy that defines the Admins for this Community. */
  admin: CommunityRolePolicy;
  /** The role policy that defines the hosts for this Community. */
  host: CommunityRolePolicy;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The role policy that defines the leads for this Community. */
  lead: CommunityRolePolicy;
  /** The role policy that defines the members for this Community. */
  member: CommunityRolePolicy;
};

export enum CommunityRole {
  Admin = 'ADMIN',
  Host = 'HOST',
  Lead = 'LEAD',
  Member = 'MEMBER',
}

export type CommunityRolePolicy = {
  /** The CredentialDefinition that is associated with this role */
  credential: CredentialDefinition;
  /** Is this role enabled for this Community */
  enabled: Scalars['Boolean'];
  /** Maximum number of Organizations in this role */
  maxOrg: Scalars['Float'];
  /** Maximum number of Users in this role */
  maxUser: Scalars['Float'];
  /** Minimun number of Organizations in this role */
  minOrg: Scalars['Float'];
  /** Minimum number of Users in this role */
  minUser: Scalars['Float'];
  /** The CredentialDefinitions associated with this role in parent communities */
  parentCredentials: Array<CredentialDefinition>;
};

export type Config = {
  /** Elastic APM (RUM & performance monitoring) related configuration. */
  apm: Apm;
  /** Authentication configuration. */
  authentication: AuthenticationConfig;
  /** Integration with a 3rd party Geo information service */
  geo: Geo;
  /** Platform related resources. */
  platform: PlatformLocations;
  /** Sentry (client monitoring) related configuration. */
  sentry: Sentry;
  /** Configuration for storage providers, e.g. file */
  storage: StorageConfig;
  /** Alkemio template configuration. */
  template: Template;
};

export type Context = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The EcosystemModel for this Context. */
  ecosystemModel?: Maybe<EcosystemModel>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** What is the potential impact? */
  impact?: Maybe<Scalars['Markdown']>;
  /** The goal that is being pursued */
  vision?: Maybe<Scalars['Markdown']>;
  /** Who should get involved in this challenge */
  who?: Maybe<Scalars['Markdown']>;
};

export type ContributorFilterInput = {
  /** Return contributors with credentials in the provided list */
  credentials?: InputMaybe<Array<AuthorizationCredential>>;
};

export type ContributorRoles = {
  /** The applications for the specified user; only accessible for platform admins */
  applications: Array<ApplicationForRoleResult>;
  id: Scalars['UUID'];
  /** The invitations for the specified user; only accessible for platform admins */
  invitations: Array<InvitationForRoleResult>;
  /** Details of the Organizations the User is a member of, with child memberships. */
  organizations: Array<RolesResultOrganization>;
  /** Details of Spaces the User or Organization is a member of, with child memberships */
  spaces: Array<RolesResultSpace>;
};

export type ContributorRolesApplicationsArgs = {
  states?: InputMaybe<Array<Scalars['String']>>;
};

export type ContributorRolesInvitationsArgs = {
  states?: InputMaybe<Array<Scalars['String']>>;
};

export type ConvertChallengeToSpaceInput = {
  /** The Challenge to be promoted to be a new Space. Note: the original Challenge will no longer exist after the conversion.  */
  challengeID: Scalars['UUID_NAMEID'];
};

export type ConvertOpportunityToChallengeInput = {
  /** The Opportunity to be promoted to be a new Challenge. Note: the original Opportunity will no longer exist after the conversion.  */
  opportunityID: Scalars['UUID_NAMEID'];
};

export type CreateActorGroupInput = {
  description?: InputMaybe<Scalars['String']>;
  ecosystemModelID: Scalars['UUID'];
  name: Scalars['String'];
};

export type CreateActorInput = {
  actorGroupID: Scalars['UUID'];
  description?: InputMaybe<Scalars['String']>;
  impact?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  value?: InputMaybe<Scalars['String']>;
};

export type CreateCalendarEventOnCalendarInput = {
  calendarID: Scalars['UUID'];
  /** The length of the event in days. */
  durationDays?: InputMaybe<Scalars['Float']>;
  /** The length of the event in minutes. */
  durationMinutes: Scalars['Float'];
  /** Flag to indicate if this event is for multiple days. */
  multipleDays: Scalars['Boolean'];
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']>;
  profileData: CreateProfileInput;
  /** The start date for the event. */
  startDate: Scalars['DateTime'];
  tags?: InputMaybe<Array<Scalars['String']>>;
  type: CalendarEventType;
  /** Flag to indicate if this event is for a whole day. */
  wholeDay: Scalars['Boolean'];
};

export type CreateCalloutOnCollaborationInput = {
  collaborationID: Scalars['UUID'];
  /** Set callout display location for this Callout. */
  displayLocation?: InputMaybe<CalloutDisplayLocation>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** PostTemplate data for Post Callouts. */
  postTemplate?: InputMaybe<CreatePostTemplateInput>;
  profile: CreateProfileInput;
  /** The sort order to assign to this Callout. */
  sortOrder?: InputMaybe<Scalars['Float']>;
  /** State of the callout. */
  state?: InputMaybe<CalloutState>;
  tags?: InputMaybe<Array<Scalars['String']>>;
  /** Callout type. */
  type: CalloutType;
  /** Whiteboard data for whiteboard Callouts. */
  whiteboard?: InputMaybe<CreateWhiteboardInput>;
  /** WhiteboardTemplate data for whiteboard Callouts. */
  whiteboardTemplate?: InputMaybe<CreateWhiteboardTemplateInput>;
};

export type CreateChallengeOnChallengeInput = {
  challengeID: Scalars['UUID'];
  context?: InputMaybe<CreateContextInput>;
  /** The Innovation Flow template to use for the Challenge. */
  innovationFlowTemplateID?: InputMaybe<Scalars['UUID']>;
  /** Set lead Organizations for the Challenge. */
  leadOrganizations?: InputMaybe<Array<Scalars['UUID_NAMEID']>>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']>;
  profileData: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']>>;
};

export type CreateChallengeOnSpaceInput = {
  context?: InputMaybe<CreateContextInput>;
  /** The Innovation Flow template to use for the Challenge. */
  innovationFlowTemplateID?: InputMaybe<Scalars['UUID']>;
  /** Set lead Organizations for the Challenge. */
  leadOrganizations?: InputMaybe<Array<Scalars['UUID_NAMEID']>>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']>;
  profileData: CreateProfileInput;
  spaceID: Scalars['UUID_NAMEID'];
  tags?: InputMaybe<Array<Scalars['String']>>;
};

export type CreateContextInput = {
  impact?: InputMaybe<Scalars['Markdown']>;
  vision?: InputMaybe<Scalars['Markdown']>;
  who?: InputMaybe<Scalars['Markdown']>;
};

export type CreateFeedbackOnCommunityContextInput = {
  communityID: Scalars['UUID'];
  questions: Array<CreateNvpInput>;
};

export type CreateInnovationFlowTemplateOnTemplatesSetInput = {
  /** The XState definition for this InnovationFlowTemplate. */
  definition: Scalars['LifecycleDefinition'];
  profile: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']>>;
  templatesSetID: Scalars['UUID'];
  /** The type of the InnovationFlows that this Template supports. */
  type: InnovationFlowType;
  visualUri?: InputMaybe<Scalars['String']>;
};

export type CreateInnovationHubInput = {
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']>;
  profileData: CreateProfileInput;
  /** A list of Spaces to include in this Innovation Hub. Only valid when type 'list' is used. */
  spaceListFilter?: InputMaybe<Array<Scalars['UUID']>>;
  /** Spaces with which visibility this Innovation Hub will display. Only valid when type 'visibility' is used. */
  spaceVisibilityFilter?: InputMaybe<SpaceVisibility>;
  /** The subdomain to associate the Innovation Hub with. */
  subdomain: Scalars['String'];
  /** The type of Innovation Hub. */
  type: InnovationHubType;
};

export type CreateInnovationPackOnLibraryInput = {
  /** A readable identifier, unique within the containing scope. */
  nameID: Scalars['NameID'];
  profileData: CreateProfileInput;
  /** The provider Organization for the InnovationPack */
  providerID: Scalars['UUID_NAMEID'];
  tags?: InputMaybe<Array<Scalars['String']>>;
};

export type CreateInvitationExistingUserOnCommunityInput = {
  communityID: Scalars['UUID'];
  /** The identifier for the user being invited. */
  invitedUsers: Array<Scalars['UUID']>;
  welcomeMessage?: InputMaybe<Scalars['String']>;
};

export type CreateInvitationExternalUserOnCommunityInput = {
  communityID: Scalars['UUID'];
  email: Scalars['String'];
  firstName?: InputMaybe<Scalars['String']>;
  lastName?: InputMaybe<Scalars['String']>;
  welcomeMessage?: InputMaybe<Scalars['String']>;
};

export type CreateLinkOnCalloutInput = {
  calloutID: Scalars['UUID'];
  description?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  uri?: InputMaybe<Scalars['String']>;
};

export type CreateLocationInput = {
  addressLine1?: InputMaybe<Scalars['String']>;
  addressLine2?: InputMaybe<Scalars['String']>;
  city?: InputMaybe<Scalars['String']>;
  country?: InputMaybe<Scalars['String']>;
  postalCode?: InputMaybe<Scalars['String']>;
  stateOrProvince?: InputMaybe<Scalars['String']>;
};

export type CreateNvpInput = {
  name: Scalars['String'];
  sortOrder: Scalars['Float'];
  value: Scalars['String'];
};

export type CreateOpportunityInput = {
  challengeID: Scalars['UUID'];
  context?: InputMaybe<CreateContextInput>;
  /** The Innovation Flow template to use for the Opportunity. */
  innovationFlowTemplateID?: InputMaybe<Scalars['UUID']>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']>;
  profileData: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']>>;
};

export type CreateOrganizationInput = {
  contactEmail?: InputMaybe<Scalars['String']>;
  domain?: InputMaybe<Scalars['String']>;
  legalEntityName?: InputMaybe<Scalars['String']>;
  /** A readable identifier, unique within the containing scope. */
  nameID: Scalars['NameID'];
  profileData: CreateProfileInput;
  website?: InputMaybe<Scalars['String']>;
};

export type CreatePostOnCalloutInput = {
  calloutID: Scalars['UUID'];
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']>;
  profileData: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']>>;
  type: Scalars['String'];
  visualUri?: InputMaybe<Scalars['String']>;
};

export type CreatePostTemplateInput = {
  /** The default description to be pre-filled when users create Posts based on this template. */
  defaultDescription: Scalars['Markdown'];
  profile: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']>>;
  /** The type of Posts created from this Template. */
  type: Scalars['String'];
  visualUri?: InputMaybe<Scalars['String']>;
};

export type CreatePostTemplateOnTemplatesSetInput = {
  /** The default description to be pre-filled when users create Posts based on this template. */
  defaultDescription: Scalars['Markdown'];
  profile: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']>>;
  templatesSetID: Scalars['UUID'];
  /** The type of Posts created from this Template. */
  type: Scalars['String'];
  visualUri?: InputMaybe<Scalars['String']>;
};

export type CreateProfileInput = {
  /** The URL of the avatar of the user */
  avatarURL?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['Markdown']>;
  /** The display name for the entity. */
  displayName: Scalars['String'];
  location?: InputMaybe<CreateLocationInput>;
  referencesData?: InputMaybe<Array<CreateReferenceInput>>;
  /** A memorable short description for this entity. */
  tagline?: InputMaybe<Scalars['String']>;
  tagsets?: InputMaybe<Array<CreateTagsetInput>>;
};

export type CreateProjectInput = {
  /** A readable identifier, unique within the containing scope. */
  nameID: Scalars['NameID'];
  opportunityID: Scalars['UUID_NAMEID'];
  profileData: CreateProfileInput;
};

export type CreateReferenceInput = {
  description?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  uri?: InputMaybe<Scalars['String']>;
};

export type CreateReferenceOnProfileInput = {
  description?: InputMaybe<Scalars['String']>;
  name: Scalars['String'];
  profileID: Scalars['UUID'];
  uri?: InputMaybe<Scalars['String']>;
};

export type CreateRelationOnCollaborationInput = {
  actorName: Scalars['String'];
  actorRole?: InputMaybe<Scalars['String']>;
  actorType?: InputMaybe<Scalars['String']>;
  collaborationID: Scalars['UUID'];
  description?: InputMaybe<Scalars['String']>;
  type: Scalars['String'];
};

export type CreateSpaceInput = {
  context?: InputMaybe<CreateContextInput>;
  /** The host Organization for the space */
  hostID: Scalars['UUID_NAMEID'];
  /** A readable identifier, unique within the containing scope. */
  nameID: Scalars['NameID'];
  profileData: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']>>;
};

export type CreateTagsetInput = {
  name: Scalars['String'];
  tags?: InputMaybe<Array<Scalars['String']>>;
  type?: InputMaybe<TagsetType>;
};

export type CreateTagsetOnProfileInput = {
  name: Scalars['String'];
  profileID?: InputMaybe<Scalars['UUID']>;
  tags?: InputMaybe<Array<Scalars['String']>>;
  type?: InputMaybe<TagsetType>;
};

export type CreateUserGroupInput = {
  /** The name of the UserGroup. Minimum length 2. */
  name: Scalars['String'];
  parentID: Scalars['UUID'];
  profileData?: InputMaybe<CreateProfileInput>;
};

export type CreateUserInput = {
  accountUpn?: InputMaybe<Scalars['String']>;
  email: Scalars['String'];
  firstName?: InputMaybe<Scalars['String']>;
  gender?: InputMaybe<Scalars['String']>;
  lastName?: InputMaybe<Scalars['String']>;
  /** A readable identifier, unique within the containing scope. */
  nameID: Scalars['NameID'];
  phone?: InputMaybe<Scalars['String']>;
  profileData: CreateProfileInput;
};

export type CreateWhiteboardInput = {
  /** A readable identifier, unique within the containing scope. If not provided it will be generated based on the displayName. */
  nameID?: InputMaybe<Scalars['NameID']>;
  profileData: CreateProfileInput;
  value?: InputMaybe<Scalars['String']>;
};

export type CreateWhiteboardOnCalloutInput = {
  calloutID: Scalars['UUID'];
  /** A readable identifier, unique within the containing scope. If not provided it will be generated based on the displayName. */
  nameID?: InputMaybe<Scalars['NameID']>;
  profileData: CreateProfileInput;
  value?: InputMaybe<Scalars['String']>;
};

export type CreateWhiteboardTemplateInput = {
  profile: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']>>;
  value?: InputMaybe<Scalars['JSON']>;
  visualUri?: InputMaybe<Scalars['String']>;
  /** Use the specified Whiteboard as the initial value for this WhiteboardTemplate */
  whiteboardID?: InputMaybe<Scalars['UUID']>;
};

export type CreateWhiteboardTemplateOnTemplatesSetInput = {
  profile: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']>>;
  templatesSetID: Scalars['UUID'];
  value?: InputMaybe<Scalars['JSON']>;
  visualUri?: InputMaybe<Scalars['String']>;
  /** Use the specified Whiteboard as the initial value for this WhiteboardTemplate */
  whiteboardID?: InputMaybe<Scalars['UUID']>;
};

export type Credential = {
  /** The ID of the entity */
  id: Scalars['UUID'];
  resourceID: Scalars['String'];
  type: AuthorizationCredential;
};

export type CredentialDefinition = {
  /** The resourceID for this CredentialDefinition */
  resourceID: Scalars['String'];
  /** The type for this CredentialDefinition */
  type: Scalars['String'];
};

export type CredentialMetadataOutput = {
  /** A json description of what the claim contains and schema validation definition */
  context: Scalars['String'];
  /** The purpose of the credential */
  description: Scalars['String'];
  /** The display name of the credential */
  name: Scalars['String'];
  /** The schema that the credential will be validated against */
  schema: Scalars['String'];
  /** The credential types that are associated with this credential */
  types: Array<Scalars['String']>;
  /** System recognized unique type for the credential */
  uniqueType: Scalars['String'];
};

export type DeleteActorGroupInput = {
  ID: Scalars['UUID'];
};

export type DeleteActorInput = {
  ID: Scalars['UUID'];
};

export type DeleteApplicationInput = {
  ID: Scalars['UUID'];
};

export type DeleteCalendarEventInput = {
  ID: Scalars['UUID'];
};

export type DeleteCalloutInput = {
  ID: Scalars['UUID'];
};

export type DeleteChallengeInput = {
  ID: Scalars['UUID'];
};

export type DeleteCollaborationInput = {
  ID: Scalars['UUID'];
};

export type DeleteDiscussionInput = {
  ID: Scalars['UUID'];
};

export type DeleteDocumentInput = {
  ID: Scalars['UUID'];
};

export type DeleteInnovationFlowTemplateInput = {
  ID: Scalars['UUID'];
};

export type DeleteInnovationHubInput = {
  ID: Scalars['UUID'];
};

export type DeleteInnovationPackInput = {
  ID: Scalars['UUID_NAMEID'];
};

export type DeleteInvitationExternalInput = {
  ID: Scalars['UUID'];
};

export type DeleteInvitationInput = {
  ID: Scalars['UUID'];
};

export type DeleteOpportunityInput = {
  ID: Scalars['UUID'];
};

export type DeleteOrganizationInput = {
  ID: Scalars['UUID_NAMEID'];
};

export type DeletePostInput = {
  ID: Scalars['UUID'];
};

export type DeletePostTemplateInput = {
  ID: Scalars['UUID'];
};

export type DeleteProjectInput = {
  ID: Scalars['UUID'];
};

export type DeleteReferenceInput = {
  ID: Scalars['UUID'];
};

export type DeleteRelationInput = {
  ID: Scalars['String'];
};

export type DeleteSpaceInput = {
  ID: Scalars['UUID_NAMEID'];
};

export type DeleteUserGroupInput = {
  ID: Scalars['UUID'];
};

export type DeleteUserInput = {
  ID: Scalars['UUID_NAMEID_EMAIL'];
};

export type DeleteWhiteboardInput = {
  ID: Scalars['UUID'];
};

export type DeleteWhiteboardTemplateInput = {
  ID: Scalars['UUID'];
};

export type DirectRoom = {
  /** The display name of the room */
  displayName: Scalars['String'];
  /** The identifier of the direct room */
  id: Scalars['String'];
  /** The messages that have been sent to the Direct Room. */
  messages: Array<Message>;
  /** The recepient userID */
  receiverID?: Maybe<Scalars['String']>;
};

export type Discussion = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The category assigned to this Discussion. */
  category: DiscussionCategory;
  /** The comments for this Discussion. */
  comments: Room;
  /** The id of the user that created this discussion */
  createdBy?: Maybe<Scalars['UUID']>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** The Profile for this Discussion. */
  profile: Profile;
  /** The timestamp for the creation of this Discussion. */
  timestamp?: Maybe<Scalars['Float']>;
};

export enum DiscussionCategory {
  ChallengeCentric = 'CHALLENGE_CENTRIC',
  CommunityBuilding = 'COMMUNITY_BUILDING',
  General = 'GENERAL',
  Help = 'HELP',
  Ideas = 'IDEAS',
  Other = 'OTHER',
  PlatformFunctionalities = 'PLATFORM_FUNCTIONALITIES',
  Questions = 'QUESTIONS',
  Sharing = 'SHARING',
}

export type Document = {
  /** Do we allow anonymous read access for this document? */
  anonymousReadAccess: Scalars['Boolean'];
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The user that created this Document */
  createdBy?: Maybe<User>;
  /** The display name. */
  displayName: Scalars['String'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Mime type for this Document. */
  mimeType: MimeType;
  /** Size of the Document. */
  size: Scalars['Float'];
  /** The tagset in use on this Document. */
  tagset: Tagset;
  /** The uploaded date of this Document */
  uploadedDate: Scalars['DateTime'];
};

export type EcosystemModel = {
  /** A list of ActorGroups */
  actorGroups?: Maybe<Array<ActorGroup>>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** Overview of this ecosystem model. */
  description?: Maybe<Scalars['String']>;
  /** The ID of the entity */
  id: Scalars['UUID'];
};

export type FeatureFlag = {
  /** Whether the feature flag is enabled / disabled. */
  enabled: Scalars['Boolean'];
  /** The name of the feature flag */
  name: Scalars['String'];
};

export type FeedbackTemplate = {
  /** Feedback template name. */
  name: Scalars['String'];
  /** Template questions. */
  questions: Array<QuestionTemplate>;
};

export type FileStorageConfig = {
  /** Max file size, in bytes. */
  maxFileSize: Scalars['Float'];
  /** Allowed mime types for file upload, separated by a coma. */
  mimeTypes: Array<Scalars['String']>;
};

export type Form = {
  /** A description of the purpose of this Form. */
  description?: Maybe<Scalars['Markdown']>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The set of Questions in this Form. */
  questions: Array<FormQuestion>;
};

export type FormQuestion = {
  /** The explation text to clarify the question. */
  explanation: Scalars['String'];
  /** The maxiumum length of the answer, in characters, up to a limit of 512. */
  maxLength: Scalars['Float'];
  /** The question to be answered */
  question: Scalars['String'];
  /** Whether this Question requires an answer or not. */
  required: Scalars['Boolean'];
  /** The sort order of this question in a wider set of questions. */
  sortOrder: Scalars['Float'];
};

export type Geo = {
  /** Endpoint where geo information is consumed from. */
  endpoint: Scalars['String'];
};

export type GrantAuthorizationCredentialInput = {
  /** The resource to which this credential is tied. */
  resourceID?: InputMaybe<Scalars['UUID']>;
  type: AuthorizationCredential;
  /** The user to whom the credential is being granted. */
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type Groupable = {
  /** The groups contained by this entity. */
  groups?: Maybe<Array<UserGroup>>;
};

export type ISearchResults = {
  /** The search results for contributions (Posts, Whiteboards etc). */
  contributionResults: Array<SearchResult>;
  /** The total number of search results for contributions (Posts, Whiteboards etc). */
  contributionResultsCount: Scalars['Float'];
  /** The search results for contributors (Users, Organizations). */
  contributorResults: Array<SearchResult>;
  /** The total number of search results for contributors (Users, Organizations). */
  contributorResultsCount: Scalars['Float'];
  /** The search results for Groups. */
  groupResults: Array<SearchResult>;
  /** The search results for Spaces / Challenges / Opportunities. */
  journeyResults: Array<SearchResult>;
  /** The total number of results for Spaces / Challenges / Opportunities. */
  journeyResultsCount: Scalars['Float'];
};

export type InnovationFlow = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The Lifecycle being used by this InnovationFlow */
  lifecycle?: Maybe<Lifecycle>;
  /** The Profile for this InnovationFlow. */
  profile: Profile;
  /** The InnovationFlow type, e.g. Challenge, Opportunity */
  type: InnovationFlowType;
};

export type InnovationFlowEvent = {
  eventName: Scalars['String'];
  innovationFlowID: Scalars['UUID'];
};

export type InnovationFlowTemplate = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The XState definition for this InnovationFlowTemplate. */
  definition: Scalars['LifecycleDefinition'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The Profile for this template. */
  profile: Profile;
  /** The type for this InnovationFlowTemplate. */
  type: InnovationFlowType;
};

export enum InnovationFlowType {
  Challenge = 'CHALLENGE',
  Opportunity = 'OPPORTUNITY',
}

export type InnovationHub = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** The Innovation Hub profile. */
  profile: Profile;
  spaceListFilter?: Maybe<Array<Space>>;
  /** If defined, what type of visibility to filter the Spaces on. You can have only one type of filter active at any given time. */
  spaceVisibilityFilter?: Maybe<SpaceVisibility>;
  /** The subdomain associated with this Innovation Hub. */
  subdomain: Scalars['String'];
  /** Type of Innovation Hub */
  type: InnovationHubType;
};

export enum InnovationHubType {
  List = 'LIST',
  Visibility = 'VISIBILITY',
}

export type InnovationPack = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** The Profile for this InnovationPack. */
  profile: Profile;
  /** The InnovationPack provider. */
  provider?: Maybe<Organization>;
  /** The templates in use by this InnovationPack */
  templates?: Maybe<TemplatesSet>;
};

export type Invitation = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The User who triggered the invitation. */
  createdBy: User;
  createdDate: Scalars['DateTime'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  lifecycle: Lifecycle;
  updatedDate: Scalars['DateTime'];
  /** The User who is invited. */
  user: User;
  welcomeMessage?: Maybe<Scalars['String']>;
};

export type InvitationEventInput = {
  eventName: Scalars['String'];
  invitationID: Scalars['UUID'];
};

export type InvitationExternal = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The User who triggered the invitationExternal. */
  createdBy: User;
  createdDate: Scalars['DateTime'];
  /** The email address of the external user being invited */
  email: Scalars['String'];
  firstName: Scalars['String'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  lastName: Scalars['String'];
  /** Whether a new user profile has been created. */
  profileCreated: Scalars['Boolean'];
  welcomeMessage?: Maybe<Scalars['String']>;
};

export type InvitationForRoleResult = {
  /** ID for the Challenge being invited to, if any. Or the Challenge containing the Opportunity being invited to. */
  challengeID?: Maybe<Scalars['UUID']>;
  /** ID for the community */
  communityID: Scalars['UUID'];
  /** ID for the user that created the invitation. */
  createdBy: Scalars['UUID'];
  /** Date of creation */
  createdDate: Scalars['DateTime'];
  /** Display name of the community */
  displayName: Scalars['String'];
  /** ID for the application */
  id: Scalars['UUID'];
  /** ID for the Opportunity being invited to, if any. */
  opportunityID?: Maybe<Scalars['UUID']>;
  /** ID for the ultimate containing Space */
  spaceID: Scalars['UUID'];
  /** The current state of the invitation. */
  state: Scalars['String'];
  /** Date of last update */
  updatedDate: Scalars['DateTime'];
  /** The welcome message of the invitation */
  welcomeMessage?: Maybe<Scalars['UUID']>;
};

export type Library = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** A single Innovation Pack */
  innovationPack?: Maybe<InnovationPack>;
  /** The Innovation Packs in the platform Innovation Library. */
  innovationPacks: Array<InnovationPack>;
  /** The StorageBucket with documents in use by this User */
  storageBucket?: Maybe<StorageBucket>;
};

export type LibraryInnovationPackArgs = {
  ID: Scalars['UUID_NAMEID'];
};

export type Lifecycle = {
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The machine definition, describing the states, transitions etc for this Lifeycle. */
  machineDef: Scalars['LifecycleDefinition'];
  /** The next events of this Lifecycle. */
  nextEvents?: Maybe<Array<Scalars['String']>>;
  /** The current state of this Lifecycle. */
  state?: Maybe<Scalars['String']>;
  /** Is this lifecycle in a final state (done). */
  stateIsFinal: Scalars['Boolean'];
  /** The Lifecycle template name. */
  templateName?: Maybe<Scalars['String']>;
};

export type Location = {
  addressLine1: Scalars['String'];
  addressLine2: Scalars['String'];
  city: Scalars['String'];
  country: Scalars['String'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  postalCode: Scalars['String'];
  stateOrProvince: Scalars['String'];
};

export type LookupQueryResults = {
  /** Lookup the specified Application */
  application?: Maybe<Application>;
  /** Lookup the specified Calendar */
  calendar?: Maybe<Calendar>;
  /** Lookup the specified CalendarEvent */
  calendarEvent?: Maybe<CalendarEvent>;
  /** Lookup the specified Callout */
  callout?: Maybe<Callout>;
  /** Lookup the specified Challenge */
  challenge?: Maybe<Challenge>;
  /** Lookup the specified Collaboration */
  collaboration?: Maybe<Collaboration>;
  /** Lookup the specified Community */
  community?: Maybe<Community>;
  /** Lookup the specified Context */
  context?: Maybe<Context>;
  /** Lookup the specified InnovationFlow */
  innovationFlow?: Maybe<InnovationFlow>;
  /** Lookup the specified InnovationFlow Template */
  innovationFlowTemplate?: Maybe<InnovationFlowTemplate>;
  /** Lookup the specified Invitation */
  invitation?: Maybe<Invitation>;
  /** Lookup the specified Opportunity */
  opportunity?: Maybe<Opportunity>;
  /** Lookup the specified Post */
  post?: Maybe<Post>;
  /** Lookup the specified Profile */
  profile?: Maybe<Profile>;
  /** Lookup the specified Room */
  room?: Maybe<Room>;
  /** Lookup the specified Whiteboard */
  whiteboard?: Maybe<Whiteboard>;
  /** Lookup the specified Whiteboard Template */
  whiteboardTemplate?: Maybe<WhiteboardTemplate>;
};

export type LookupQueryResultsApplicationArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsCalendarArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsCalendarEventArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsCalloutArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsChallengeArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsCollaborationArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsCommunityArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsContextArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsInnovationFlowArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsInnovationFlowTemplateArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsInvitationArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsOpportunityArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsPostArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsProfileArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsRoomArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsWhiteboardArgs = {
  ID: Scalars['UUID'];
};

export type LookupQueryResultsWhiteboardTemplateArgs = {
  ID: Scalars['UUID'];
};

export type MeQueryResults = {
  /** The applications of the current authenticated user */
  applications: Array<ApplicationForRoleResult>;
  /** The invitations of the current authenticated user */
  invitations: Array<InvitationForRoleResult>;
  /** The applications of the current authenticated user */
  spaceMemberships: Array<Space>;
  /** The current authenticated User;  null if not yet registered on the platform */
  user?: Maybe<User>;
};

export type MeQueryResultsApplicationsArgs = {
  states?: InputMaybe<Array<Scalars['String']>>;
};

export type MeQueryResultsInvitationsArgs = {
  states?: InputMaybe<Array<Scalars['String']>>;
};

export type MeQueryResultsSpaceMembershipsArgs = {
  visibilities?: InputMaybe<Array<SpaceVisibility>>;
};

/** A message that was sent either as an Update or as part of a Discussion. */
export type Message = {
  /** The id for the message event. */
  id: Scalars['MessageID'];
  /** The message being sent */
  message: Scalars['Markdown'];
  /** Reactions on this message */
  reactions: Array<Reaction>;
  /** The user that created this Post */
  sender?: Maybe<User>;
  /** The message being replied to */
  threadID?: Maybe<Scalars['String']>;
  /** The server timestamp in UTC */
  timestamp: Scalars['Float'];
};

export type Metadata = {
  /** Metrics about the activity on the platform */
  metrics: Array<Nvp>;
  /** Collection of metadata about Alkemio services. */
  services: Array<ServiceMetadata>;
};

export enum MimeType {
  Avif = 'AVIF',
  Bmp = 'BMP',
  Gif = 'GIF',
  Jpeg = 'JPEG',
  Jpg = 'JPG',
  Pdf = 'PDF',
  Png = 'PNG',
  Svg = 'SVG',
  Webp = 'WEBP',
  Xpng = 'XPNG',
}

export type MovePostInput = {
  /** ID of the Callout to move the Post to. */
  calloutID: Scalars['UUID'];
  /** ID of the Post to move. */
  postID: Scalars['UUID'];
};

export type Mutation = {
  /** Add a reaction to a message from the specified Room. */
  addReactionToMessageInRoom: Reaction;
  /** Ensure all community members are registered for communications. */
  adminCommunicationEnsureAccessToCommunications: Scalars['Boolean'];
  /** Remove an orphaned room from messaging platform. */
  adminCommunicationRemoveOrphanedRoom: Scalars['Boolean'];
  /** Allow updating the rule for joining rooms: public or invite. */
  adminCommunicationUpdateRoomsJoinRule: Scalars['Boolean'];
  /** Updates the States tagset to be synchronized with the Lifecycle states. */
  adminInnovationFlowSynchronizeStates: Tagset;
  /** Migrate all ipfs links to use new storage access api */
  adminStorageMigrateIpfsUrls: Scalars['Boolean'];
  /** Apply to join the specified Community as a member. */
  applyForCommunityMembership: Application;
  /** Assigns an Organization a Role in the specified Community. */
  assignCommunityRoleToOrganization: Organization;
  /** Assigns a User to a role in the specified Community. */
  assignCommunityRoleToUser: User;
  /** Assigns a User as a Global Admin. */
  assignUserAsGlobalAdmin: User;
  /** Assigns a User as a Global Community Admin. */
  assignUserAsGlobalCommunityAdmin: User;
  /** Assigns a User as a Global Spaces Admin. */
  assignUserAsGlobalSpacesAdmin: User;
  /** Assigns a User as an Organization Admin. */
  assignUserAsOrganizationAdmin: User;
  /** Assigns a User as an Organization Owner. */
  assignUserAsOrganizationOwner: User;
  /** Assigns a User as a member of the specified User Group. */
  assignUserToGroup: UserGroup;
  /** Assigns a User as an associate of the specified Organization. */
  assignUserToOrganization: Organization;
  /** Reset the Authorization Policy on all entities */
  authorizationPolicyResetAll: Scalars['Boolean'];
  /** Reset the Authorization Policy on the specified Organization. */
  authorizationPolicyResetOnOrganization: Organization;
  /** Reset the Authorization Policy on the specified Platform. */
  authorizationPolicyResetOnPlatform: Platform;
  /** Reset the Authorization Policy on the specified Space. */
  authorizationPolicyResetOnSpace: Space;
  /** Reset the Authorization policy on the specified User. */
  authorizationPolicyResetOnUser: User;
  /** Generate Alkemio user credential offer */
  beginAlkemioUserVerifiedCredentialOfferInteraction: AgentBeginVerifiedCredentialOfferOutput;
  /** Generate community member credential offer */
  beginCommunityMemberVerifiedCredentialOfferInteraction: AgentBeginVerifiedCredentialOfferOutput;
  /** Generate verified credential share request */
  beginVerifiedCredentialRequestInteraction: AgentBeginVerifiedCredentialRequestOutput;
  /** Creates a new Space by converting an existing Challenge. */
  convertChallengeToSpace: Space;
  /** Creates a new Challenge by converting an existing Opportunity. */
  convertOpportunityToChallenge: Challenge;
  /** Creates a new Actor in the specified ActorGroup. */
  createActor: Actor;
  /** Create a new Actor Group on the EcosystemModel. */
  createActorGroup: ActorGroup;
  /** Create a new Callout on the Collaboration. */
  createCalloutOnCollaboration: Callout;
  /** Creates a new Challenge within the specified Space. */
  createChallenge: Challenge;
  /** Creates a new child challenge within the parent Challenge. */
  createChildChallenge: Challenge;
  /** Creates a new Discussion as part of this Communication. */
  createDiscussion: Discussion;
  /** Create a new CalendarEvent on the Calendar. */
  createEventOnCalendar: CalendarEvent;
  /** Creates feedback on community context from users having COMMUNITY_CONTEXT_REVIEW privilege */
  createFeedbackOnCommunityContext: Scalars['Boolean'];
  /** Creates a new User Group in the specified Community. */
  createGroupOnCommunity: UserGroup;
  /** Creates a new User Group for the specified Organization. */
  createGroupOnOrganization: UserGroup;
  /** Creates a new InnovationFlowTemplate on the specified TemplatesSet. */
  createInnovationFlowTemplate: InnovationFlowTemplate;
  /** Create Innovation Hub. */
  createInnovationHub: InnovationHub;
  /** Create a new InnovatonPack on the Library. */
  createInnovationPackOnLibrary: InnovationPack;
  /** Create a new Link on the Callout. */
  createLinkOnCallout: Reference;
  /** Creates a new Opportunity within the parent Challenge. */
  createOpportunity: Opportunity;
  /** Creates a new Organization on the platform. */
  createOrganization: Organization;
  /** Create a new Post on the Callout. */
  createPostOnCallout: Post;
  /** Creates a new PostTemplate on the specified TemplatesSet. */
  createPostTemplate: PostTemplate;
  /** Create a new Project on the Opportunity */
  createProject: Project;
  /** Creates a new Reference on the specified Profile. */
  createReferenceOnProfile: Reference;
  /** Create a new Relation on the Collaboration. */
  createRelationOnCollaboration: Relation;
  /** Creates a new Space. */
  createSpace: Space;
  /** Creates a new Tagset on the specified Profile */
  createTagsetOnProfile: Tagset;
  /** Creates a new User on the platform. */
  createUser: User;
  /** Creates a new User profile on the platform for a user that has a valid Authentication session. */
  createUserNewRegistration: User;
  /** Create a new Whiteboard on the Callout. */
  createWhiteboardOnCallout: Whiteboard;
  /** Creates a new WhiteboardTemplate on the specified TemplatesSet. */
  createWhiteboardTemplate: WhiteboardTemplate;
  /** Deletes the specified Actor. */
  deleteActor: Actor;
  /** Deletes the specified Actor Group, including contained Actors. */
  deleteActorGroup: ActorGroup;
  /** Deletes the specified CalendarEvent. */
  deleteCalendarEvent: CalendarEvent;
  /** Delete a Callout. */
  deleteCallout: Callout;
  /** Deletes the specified Challenge. */
  deleteChallenge: Challenge;
  /** Delete Collaboration. */
  deleteCollaboration: Collaboration;
  /** Deletes the specified Discussion. */
  deleteDiscussion: Discussion;
  /** Deletes the specified Document. */
  deleteDocument: Document;
  /** Deletes the specified InnovationFlowTemplate. */
  deleteInnovationFlowTemplate: InnovationFlowTemplate;
  /** Delete Innovation Hub. */
  deleteInnovationHub: InnovationHub;
  /** Deletes the specified InnovationPack. */
  deleteInnovationPack: InnovationPack;
  /** Removes the specified User invitation. */
  deleteInvitation: Invitation;
  /** Removes the specified User invitationExternal. */
  deleteInvitationExternal: InvitationExternal;
  /** Deletes the specified Opportunity. */
  deleteOpportunity: Opportunity;
  /** Deletes the specified Organization. */
  deleteOrganization: Organization;
  /** Deletes the specified Post. */
  deletePost: Post;
  /** Deletes the specified PostTemplate. */
  deletePostTemplate: PostTemplate;
  /** Deletes the specified Project. */
  deleteProject: Project;
  /** Deletes the specified Reference. */
  deleteReference: Reference;
  /** Deletes the specified Relation. */
  deleteRelation: Relation;
  /** Deletes the specified Space. */
  deleteSpace: Space;
  /** Deletes the specified User. */
  deleteUser: User;
  /** Removes the specified User Application. */
  deleteUserApplication: Application;
  /** Deletes the specified User Group. */
  deleteUserGroup: UserGroup;
  /** Updates the specified Whiteboard. */
  deleteWhiteboard: Whiteboard;
  /** Deletes the specified WhiteboardTemplate. */
  deleteWhiteboardTemplate: WhiteboardTemplate;
  /** Trigger an event on the Application. */
  eventOnApplication: Application;
  /** Trigger an event on the InnovationFlow for a Challenge. */
  eventOnChallenge: InnovationFlow;
  /** Trigger an event on the Invitation. */
  eventOnCommunityInvitation: Application;
  /** Trigger an event on the InnovationFlow for an Opportunity. */
  eventOnOpportunity: InnovationFlow;
  /** Trigger an event on the Organization Verification. */
  eventOnOrganizationVerification: OrganizationVerification;
  /** Trigger an event on the Project. */
  eventOnProject: Project;
  /** Trigger an event on the Organization Verification. */
  eventOnWhiteboardCheckout: WhiteboardCheckout;
  /** Grants an authorization credential to a User. */
  grantCredentialToUser: User;
  /** Resets the interaction with the chat engine. */
  ingest: Scalars['Boolean'];
  /** Invite an existing User to join the specified Community as a member. */
  inviteExistingUserForCommunityMembership: Array<Invitation>;
  /** Invite an external User to join the specified Community as a member. */
  inviteExternalUserForCommunityMembership: InvitationExternal;
  /** Join the specified Community as a member, without going through an approval process. */
  joinCommunity: Community;
  /** Sends a message on the specified User`s behalf and returns the room id */
  messageUser: Scalars['String'];
  /** Moves the specified Post to another Callout. */
  movePostToCallout: Post;
  /** Removes an Organization from a Role in the specified Community. */
  removeCommunityRoleFromOrganization: Organization;
  /** Removes a User from a Role in the specified Community. */
  removeCommunityRoleFromUser: User;
  /** Removes a message. */
  removeMessageOnRoom: Scalars['MessageID'];
  /** Remove a reaction on a message from the specified Room. */
  removeReactionToMessageInRoom: Scalars['Boolean'];
  /** Removes a User from being a Global Admin. */
  removeUserAsGlobalAdmin: User;
  /** Removes a User from being a Global Community Admin. */
  removeUserAsGlobalCommunityAdmin: User;
  /** Removes a User from being a Global Spaces Admin. */
  removeUserAsGlobalSpacesAdmin: User;
  /** Removes a User from being an Organization Admin. */
  removeUserAsOrganizationAdmin: User;
  /** Removes a User from being an Organization Owner. */
  removeUserAsOrganizationOwner: User;
  /** Removes the specified User from specified user group */
  removeUserFromGroup: UserGroup;
  /** Removes a User as a member of the specified Organization. */
  removeUserFromOrganization: Organization;
  /** Resets the interaction with the chat engine. */
  resetChatGuidance: Scalars['Boolean'];
  /** Removes an authorization credential from a User. */
  revokeCredentialFromUser: User;
  /** Sends a reply to a message from the specified Room. */
  sendMessageReplyToRoom: Message;
  /** Send message to Community Leads. */
  sendMessageToCommunityLeads: Scalars['Boolean'];
  /** Send message to an Organization. */
  sendMessageToOrganization: Scalars['Boolean'];
  /** Sends an comment message. Returns the id of the new Update message. */
  sendMessageToRoom: Message;
  /** Send message to a User. */
  sendMessageToUser: Scalars['Boolean'];
  /** Updates the specified Actor. */
  updateActor: Actor;
  /** Updates the specified CalendarEvent. */
  updateCalendarEvent: CalendarEvent;
  /** Update a Callout. */
  updateCallout: Callout;
  /** Update the information describing the publishing of the specified Callout. */
  updateCalloutPublishInfo: Callout;
  /** Update the visibility of the specified Callout. */
  updateCalloutVisibility: Callout;
  /** Update the sortOrder field of the supplied Callouts to increase as per the order that they are provided in. */
  updateCalloutsSortOrder: Array<Callout>;
  /** Updates the specified Challenge. */
  updateChallenge: Challenge;
  /** Update the Application Form used by this Community. */
  updateCommunityApplicationForm: Community;
  /** Updates the specified Discussion. */
  updateDiscussion: Discussion;
  /** Updates the specified Document. */
  updateDocument: Document;
  /** Updates the specified EcosystemModel. */
  updateEcosystemModel: EcosystemModel;
  /** Updates the InnovationFlow. */
  updateInnovationFlow: InnovationFlow;
  /** Updates the template for the specified Innovation Flow. */
  updateInnovationFlowLifecycleTemplate: InnovationFlow;
  /** Updates the specified InnovationFlowTemplate. */
  updateInnovationFlowTemplate: InnovationFlowTemplate;
  /** Update Innovation Hub. */
  updateInnovationHub: InnovationHub;
  /** Updates the InnovationPack. */
  updateInnovationPack: InnovationPack;
  /** Updates the specified Opportunity. */
  updateOpportunity: Opportunity;
  /** Updates the specified Organization. */
  updateOrganization: Organization;
  /** Updates the specified Post. */
  updatePost: Post;
  /** Updates the specified PostTemplate. */
  updatePostTemplate: PostTemplate;
  /** Updates one of the Preferences on a Challenge */
  updatePreferenceOnChallenge: Preference;
  /** Updates one of the Preferences on an Organization */
  updatePreferenceOnOrganization: Preference;
  /** Updates one of the Preferences on a Space */
  updatePreferenceOnSpace: Preference;
  /** Updates one of the Preferences on a Space */
  updatePreferenceOnUser: Preference;
  /** Updates the specified Profile. */
  updateProfile: Profile;
  /** Updates the specified Project. */
  updateProject: Project;
  /** Updates the Space. */
  updateSpace: Space;
  /** Update the platform settings, such as visibility, of the specified Space. */
  updateSpacePlatformSettings: Space;
  /** Updates the specified Tagset. */
  updateTagset: Tagset;
  /** Updates the User. */
  updateUser: User;
  /** Updates the specified User Group. */
  updateUserGroup: UserGroup;
  /** Updates the image URI for the specified Visual. */
  updateVisual: Visual;
  /** Updates the specified Whiteboard. */
  updateWhiteboard: Whiteboard;
  /** Updates the specified WhiteboardTemplate. */
  updateWhiteboardTemplate: WhiteboardTemplate;
  /** Create a new Document on the Storage and return the value as part of the returned Reference. */
  uploadFileOnReference: Reference;
  /** Create a new Document on the Storage and return the public Url. */
  uploadFileOnStorageBucket: Scalars['String'];
  /** Uploads and sets an image for the specified Visual. */
  uploadImageOnVisual: Visual;
};

export type MutationAddReactionToMessageInRoomArgs = {
  reactionData: RoomAddReactionToMessageInput;
};

export type MutationAdminCommunicationEnsureAccessToCommunicationsArgs = {
  communicationData: CommunicationAdminEnsureAccessInput;
};

export type MutationAdminCommunicationRemoveOrphanedRoomArgs = {
  orphanedRoomData: CommunicationAdminRemoveOrphanedRoomInput;
};

export type MutationAdminCommunicationUpdateRoomsJoinRuleArgs = {
  changeRoomAccessData: CommunicationAdminUpdateRoomsJoinRuleInput;
};

export type MutationAdminInnovationFlowSynchronizeStatesArgs = {
  innovationFlowData: AdminInnovationFlowSynchronizeStatesInput;
};

export type MutationApplyForCommunityMembershipArgs = {
  applicationData: CommunityApplyInput;
};

export type MutationAssignCommunityRoleToOrganizationArgs = {
  roleData: AssignCommunityRoleToOrganizationInput;
};

export type MutationAssignCommunityRoleToUserArgs = {
  roleData: AssignCommunityRoleToUserInput;
};

export type MutationAssignUserAsGlobalAdminArgs = {
  membershipData: AssignGlobalAdminInput;
};

export type MutationAssignUserAsGlobalCommunityAdminArgs = {
  membershipData: AssignGlobalCommunityAdminInput;
};

export type MutationAssignUserAsGlobalSpacesAdminArgs = {
  membershipData: AssignGlobalSpacesAdminInput;
};

export type MutationAssignUserAsOrganizationAdminArgs = {
  membershipData: AssignOrganizationAdminInput;
};

export type MutationAssignUserAsOrganizationOwnerArgs = {
  membershipData: AssignOrganizationOwnerInput;
};

export type MutationAssignUserToGroupArgs = {
  membershipData: AssignUserGroupMemberInput;
};

export type MutationAssignUserToOrganizationArgs = {
  membershipData: AssignOrganizationAssociateInput;
};

export type MutationAuthorizationPolicyResetOnOrganizationArgs = {
  authorizationResetData: OrganizationAuthorizationResetInput;
};

export type MutationAuthorizationPolicyResetOnSpaceArgs = {
  authorizationResetData: SpaceAuthorizationResetInput;
};

export type MutationAuthorizationPolicyResetOnUserArgs = {
  authorizationResetData: UserAuthorizationResetInput;
};

export type MutationBeginCommunityMemberVerifiedCredentialOfferInteractionArgs = {
  communityID: Scalars['String'];
};

export type MutationBeginVerifiedCredentialRequestInteractionArgs = {
  types: Array<Scalars['String']>;
};

export type MutationConvertChallengeToSpaceArgs = {
  convertData: ConvertChallengeToSpaceInput;
};

export type MutationConvertOpportunityToChallengeArgs = {
  convertData: ConvertOpportunityToChallengeInput;
};

export type MutationCreateActorArgs = {
  actorData: CreateActorInput;
};

export type MutationCreateActorGroupArgs = {
  actorGroupData: CreateActorGroupInput;
};

export type MutationCreateCalloutOnCollaborationArgs = {
  calloutData: CreateCalloutOnCollaborationInput;
};

export type MutationCreateChallengeArgs = {
  challengeData: CreateChallengeOnSpaceInput;
};

export type MutationCreateChildChallengeArgs = {
  challengeData: CreateChallengeOnChallengeInput;
};

export type MutationCreateDiscussionArgs = {
  createData: CommunicationCreateDiscussionInput;
};

export type MutationCreateEventOnCalendarArgs = {
  eventData: CreateCalendarEventOnCalendarInput;
};

export type MutationCreateFeedbackOnCommunityContextArgs = {
  feedbackData: CreateFeedbackOnCommunityContextInput;
};

export type MutationCreateGroupOnCommunityArgs = {
  groupData: CreateUserGroupInput;
};

export type MutationCreateGroupOnOrganizationArgs = {
  groupData: CreateUserGroupInput;
};

export type MutationCreateInnovationFlowTemplateArgs = {
  innovationFlowTemplateInput: CreateInnovationFlowTemplateOnTemplatesSetInput;
};

export type MutationCreateInnovationHubArgs = {
  createData: CreateInnovationHubInput;
};

export type MutationCreateInnovationPackOnLibraryArgs = {
  packData: CreateInnovationPackOnLibraryInput;
};

export type MutationCreateLinkOnCalloutArgs = {
  linkData: CreateLinkOnCalloutInput;
};

export type MutationCreateOpportunityArgs = {
  opportunityData: CreateOpportunityInput;
};

export type MutationCreateOrganizationArgs = {
  organizationData: CreateOrganizationInput;
};

export type MutationCreatePostOnCalloutArgs = {
  postData: CreatePostOnCalloutInput;
};

export type MutationCreatePostTemplateArgs = {
  postTemplateInput: CreatePostTemplateOnTemplatesSetInput;
};

export type MutationCreateProjectArgs = {
  projectData: CreateProjectInput;
};

export type MutationCreateReferenceOnProfileArgs = {
  referenceInput: CreateReferenceOnProfileInput;
};

export type MutationCreateRelationOnCollaborationArgs = {
  relationData: CreateRelationOnCollaborationInput;
};

export type MutationCreateSpaceArgs = {
  spaceData: CreateSpaceInput;
};

export type MutationCreateTagsetOnProfileArgs = {
  tagsetData: CreateTagsetOnProfileInput;
};

export type MutationCreateUserArgs = {
  userData: CreateUserInput;
};

export type MutationCreateWhiteboardOnCalloutArgs = {
  whiteboardData: CreateWhiteboardOnCalloutInput;
};

export type MutationCreateWhiteboardTemplateArgs = {
  whiteboardTemplateInput: CreateWhiteboardTemplateOnTemplatesSetInput;
};

export type MutationDeleteActorArgs = {
  deleteData: DeleteActorInput;
};

export type MutationDeleteActorGroupArgs = {
  deleteData: DeleteActorGroupInput;
};

export type MutationDeleteCalendarEventArgs = {
  deleteData: DeleteCalendarEventInput;
};

export type MutationDeleteCalloutArgs = {
  deleteData: DeleteCalloutInput;
};

export type MutationDeleteChallengeArgs = {
  deleteData: DeleteChallengeInput;
};

export type MutationDeleteCollaborationArgs = {
  deleteData: DeleteCollaborationInput;
};

export type MutationDeleteDiscussionArgs = {
  deleteData: DeleteDiscussionInput;
};

export type MutationDeleteDocumentArgs = {
  deleteData: DeleteDocumentInput;
};

export type MutationDeleteInnovationFlowTemplateArgs = {
  deleteData: DeleteInnovationFlowTemplateInput;
};

export type MutationDeleteInnovationHubArgs = {
  deleteData: DeleteInnovationHubInput;
};

export type MutationDeleteInnovationPackArgs = {
  deleteData: DeleteInnovationPackInput;
};

export type MutationDeleteInvitationArgs = {
  deleteData: DeleteInvitationInput;
};

export type MutationDeleteInvitationExternalArgs = {
  deleteData: DeleteInvitationExternalInput;
};

export type MutationDeleteOpportunityArgs = {
  deleteData: DeleteOpportunityInput;
};

export type MutationDeleteOrganizationArgs = {
  deleteData: DeleteOrganizationInput;
};

export type MutationDeletePostArgs = {
  deleteData: DeletePostInput;
};

export type MutationDeletePostTemplateArgs = {
  deleteData: DeletePostTemplateInput;
};

export type MutationDeleteProjectArgs = {
  deleteData: DeleteProjectInput;
};

export type MutationDeleteReferenceArgs = {
  deleteData: DeleteReferenceInput;
};

export type MutationDeleteRelationArgs = {
  deleteData: DeleteRelationInput;
};

export type MutationDeleteSpaceArgs = {
  deleteData: DeleteSpaceInput;
};

export type MutationDeleteUserArgs = {
  deleteData: DeleteUserInput;
};

export type MutationDeleteUserApplicationArgs = {
  deleteData: DeleteApplicationInput;
};

export type MutationDeleteUserGroupArgs = {
  deleteData: DeleteUserGroupInput;
};

export type MutationDeleteWhiteboardArgs = {
  whiteboardData: DeleteWhiteboardInput;
};

export type MutationDeleteWhiteboardTemplateArgs = {
  deleteData: DeleteWhiteboardTemplateInput;
};

export type MutationEventOnApplicationArgs = {
  applicationEventData: ApplicationEventInput;
};

export type MutationEventOnChallengeArgs = {
  innovationFlowEventData: InnovationFlowEvent;
};

export type MutationEventOnCommunityInvitationArgs = {
  invitationEventData: InvitationEventInput;
};

export type MutationEventOnOpportunityArgs = {
  innovationFlowEventData: InnovationFlowEvent;
};

export type MutationEventOnOrganizationVerificationArgs = {
  organizationVerificationEventData: OrganizationVerificationEventInput;
};

export type MutationEventOnProjectArgs = {
  projectEventData: ProjectEventInput;
};

export type MutationEventOnWhiteboardCheckoutArgs = {
  whiteboardCheckoutEventData: WhiteboardCheckoutEventInput;
};

export type MutationGrantCredentialToUserArgs = {
  grantCredentialData: GrantAuthorizationCredentialInput;
};

export type MutationInviteExistingUserForCommunityMembershipArgs = {
  invitationData: CreateInvitationExistingUserOnCommunityInput;
};

export type MutationInviteExternalUserForCommunityMembershipArgs = {
  invitationData: CreateInvitationExternalUserOnCommunityInput;
};

export type MutationJoinCommunityArgs = {
  joinCommunityData: CommunityJoinInput;
};

export type MutationMessageUserArgs = {
  messageData: UserSendMessageInput;
};

export type MutationMovePostToCalloutArgs = {
  movePostData: MovePostInput;
};

export type MutationRemoveCommunityRoleFromOrganizationArgs = {
  roleData: RemoveCommunityRoleFromOrganizationInput;
};

export type MutationRemoveCommunityRoleFromUserArgs = {
  roleData: RemoveCommunityRoleFromUserInput;
};

export type MutationRemoveMessageOnRoomArgs = {
  messageData: RoomRemoveMessageInput;
};

export type MutationRemoveReactionToMessageInRoomArgs = {
  reactionData: RoomRemoveReactionToMessageInput;
};

export type MutationRemoveUserAsGlobalAdminArgs = {
  membershipData: RemoveGlobalAdminInput;
};

export type MutationRemoveUserAsGlobalCommunityAdminArgs = {
  membershipData: RemoveGlobalCommunityAdminInput;
};

export type MutationRemoveUserAsGlobalSpacesAdminArgs = {
  membershipData: RemoveGlobalSpacesAdminInput;
};

export type MutationRemoveUserAsOrganizationAdminArgs = {
  membershipData: RemoveOrganizationAdminInput;
};

export type MutationRemoveUserAsOrganizationOwnerArgs = {
  membershipData: RemoveOrganizationOwnerInput;
};

export type MutationRemoveUserFromGroupArgs = {
  membershipData: RemoveUserGroupMemberInput;
};

export type MutationRemoveUserFromOrganizationArgs = {
  membershipData: RemoveOrganizationAssociateInput;
};

export type MutationRevokeCredentialFromUserArgs = {
  revokeCredentialData: RevokeAuthorizationCredentialInput;
};

export type MutationSendMessageReplyToRoomArgs = {
  messageData: RoomSendMessageReplyInput;
};

export type MutationSendMessageToCommunityLeadsArgs = {
  messageData: CommunicationSendMessageToCommunityLeadsInput;
};

export type MutationSendMessageToOrganizationArgs = {
  messageData: CommunicationSendMessageToOrganizationInput;
};

export type MutationSendMessageToRoomArgs = {
  messageData: RoomSendMessageInput;
};

export type MutationSendMessageToUserArgs = {
  messageData: CommunicationSendMessageToUserInput;
};

export type MutationUpdateActorArgs = {
  actorData: UpdateActorInput;
};

export type MutationUpdateCalendarEventArgs = {
  eventData: UpdateCalendarEventInput;
};

export type MutationUpdateCalloutArgs = {
  calloutData: UpdateCalloutInput;
};

export type MutationUpdateCalloutPublishInfoArgs = {
  calloutData: UpdateCalloutPublishInfoInput;
};

export type MutationUpdateCalloutVisibilityArgs = {
  calloutData: UpdateCalloutVisibilityInput;
};

export type MutationUpdateCalloutsSortOrderArgs = {
  sortOrderData: UpdateCollaborationCalloutsSortOrderInput;
};

export type MutationUpdateChallengeArgs = {
  challengeData: UpdateChallengeInput;
};

export type MutationUpdateCommunityApplicationFormArgs = {
  applicationFormData: UpdateCommunityApplicationFormInput;
};

export type MutationUpdateDiscussionArgs = {
  updateData: UpdateDiscussionInput;
};

export type MutationUpdateDocumentArgs = {
  documentData: UpdateDocumentInput;
};

export type MutationUpdateEcosystemModelArgs = {
  ecosystemModelData: UpdateEcosystemModelInput;
};

export type MutationUpdateInnovationFlowArgs = {
  innovationFlowData: UpdateInnovationFlowInput;
};

export type MutationUpdateInnovationFlowLifecycleTemplateArgs = {
  innovationFlowData: UpdateInnovationFlowLifecycleTemplateInput;
};

export type MutationUpdateInnovationFlowTemplateArgs = {
  innovationFlowTemplateInput: UpdateInnovationFlowTemplateInput;
};

export type MutationUpdateInnovationHubArgs = {
  updateData: UpdateInnovationHubInput;
};

export type MutationUpdateInnovationPackArgs = {
  innovationPackData: UpdateInnovationPackInput;
};

export type MutationUpdateOpportunityArgs = {
  opportunityData: UpdateOpportunityInput;
};

export type MutationUpdateOrganizationArgs = {
  organizationData: UpdateOrganizationInput;
};

export type MutationUpdatePostArgs = {
  postData: UpdatePostInput;
};

export type MutationUpdatePostTemplateArgs = {
  postTemplateInput: UpdatePostTemplateInput;
};

export type MutationUpdatePreferenceOnChallengeArgs = {
  preferenceData: UpdateChallengePreferenceInput;
};

export type MutationUpdatePreferenceOnOrganizationArgs = {
  preferenceData: UpdateOrganizationPreferenceInput;
};

export type MutationUpdatePreferenceOnSpaceArgs = {
  preferenceData: UpdateSpacePreferenceInput;
};

export type MutationUpdatePreferenceOnUserArgs = {
  preferenceData: UpdateUserPreferenceInput;
};

export type MutationUpdateProfileArgs = {
  profileData: UpdateProfileDirectInput;
};

export type MutationUpdateProjectArgs = {
  projectData: UpdateProjectInput;
};

export type MutationUpdateSpaceArgs = {
  spaceData: UpdateSpaceInput;
};

export type MutationUpdateSpacePlatformSettingsArgs = {
  updateData: UpdateSpacePlatformSettingsInput;
};

export type MutationUpdateTagsetArgs = {
  updateData: UpdateTagsetInput;
};

export type MutationUpdateUserArgs = {
  userData: UpdateUserInput;
};

export type MutationUpdateUserGroupArgs = {
  userGroupData: UpdateUserGroupInput;
};

export type MutationUpdateVisualArgs = {
  updateData: UpdateVisualInput;
};

export type MutationUpdateWhiteboardArgs = {
  whiteboardData: UpdateWhiteboardDirectInput;
};

export type MutationUpdateWhiteboardTemplateArgs = {
  whiteboardTemplateInput: UpdateWhiteboardTemplateInput;
};

export type MutationUploadFileOnReferenceArgs = {
  file: Scalars['Upload'];
  uploadData: StorageBucketUploadFileOnReferenceInput;
};

export type MutationUploadFileOnStorageBucketArgs = {
  file: Scalars['Upload'];
  uploadData: StorageBucketUploadFileInput;
};

export type MutationUploadImageOnVisualArgs = {
  file: Scalars['Upload'];
  uploadData: VisualUploadImageInput;
};

export enum MutationType {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE',
}

export type Nvp = {
  /** The ID of the entity */
  id: Scalars['UUID'];
  name: Scalars['String'];
  value: Scalars['String'];
};

export type Opportunity = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** Collaboration object for the base challenge */
  collaboration?: Maybe<Collaboration>;
  /** The community for the Opportunity. */
  community?: Maybe<Community>;
  /** The context for the Opportunity. */
  context?: Maybe<Context>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The InnovationFlow for the Opportunity. */
  innovationFlow?: Maybe<InnovationFlow>;
  /** Metrics about the activity within this Opportunity. */
  metrics?: Maybe<Array<Nvp>>;
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** The parent entity name (challenge) ID. */
  parentNameID?: Maybe<Scalars['String']>;
  /** The Profile for the Opportunity. */
  profile: Profile;
  /** The set of projects within the context of this Opportunity */
  projects?: Maybe<Array<Project>>;
};

export type OpportunityCreated = {
  /** The identifier for the Challenge on which the Opportunity was created. */
  challengeID: Scalars['UUID'];
  /** The Opportunity that has been created. */
  opportunity: Opportunity;
};

export type Organization = Groupable & {
  /** All Users that are admins of this Organization. */
  admins?: Maybe<Array<User>>;
  /** The Agent representing this User. */
  agent?: Maybe<Agent>;
  /** All Users that are associated with this Organization. */
  associates?: Maybe<Array<User>>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** Organization contact email */
  contactEmail?: Maybe<Scalars['String']>;
  /** Domain name; what is verified, eg. alkem.io */
  domain?: Maybe<Scalars['String']>;
  /** Group defined on this organization. */
  group?: Maybe<UserGroup>;
  /** Groups defined on this organization. */
  groups?: Maybe<Array<UserGroup>>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Legal name - required if hosting an Space */
  legalEntityName?: Maybe<Scalars['String']>;
  /** Metrics about the activity within this Organization. */
  metrics?: Maybe<Array<Nvp>>;
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** All Users that are owners of this Organization. */
  owners?: Maybe<Array<User>>;
  /** The preferences for this Organization */
  preferences: Array<Preference>;
  /** The profile for this organization. */
  profile: Profile;
  /** The StorageBucket with documents in use by this Organization */
  storageBucket?: Maybe<StorageBucket>;
  verification: OrganizationVerification;
  /** Organization website */
  website?: Maybe<Scalars['String']>;
};

export type OrganizationGroupArgs = {
  ID: Scalars['UUID'];
};

export type OrganizationAuthorizationResetInput = {
  /** The identifier of the Organization whose Authorization Policy should be reset. */
  organizationID: Scalars['UUID_NAMEID_EMAIL'];
};

export type OrganizationFilterInput = {
  contactEmail?: InputMaybe<Scalars['String']>;
  displayName?: InputMaybe<Scalars['String']>;
  domain?: InputMaybe<Scalars['String']>;
  nameID?: InputMaybe<Scalars['String']>;
  website?: InputMaybe<Scalars['String']>;
};

export enum OrganizationPreferenceType {
  AuthorizationOrganizationMatchDomain = 'AUTHORIZATION_ORGANIZATION_MATCH_DOMAIN',
}

export type OrganizationVerification = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  lifecycle: Lifecycle;
  /** Organization verification type */
  status: OrganizationVerificationEnum;
};

export enum OrganizationVerificationEnum {
  NotVerified = 'NOT_VERIFIED',
  VerifiedManualAttestation = 'VERIFIED_MANUAL_ATTESTATION',
}

export type OrganizationVerificationEventInput = {
  eventName: Scalars['String'];
  organizationVerificationID: Scalars['UUID'];
};

export type OryConfig = {
  /** Ory Issuer. */
  issuer: Scalars['String'];
  /** Ory Kratos Public Base URL. Used by all Kratos Public Clients. */
  kratosPublicBaseURL: Scalars['String'];
};

export type PageInfo = {
  /** The last cursor of the page result */
  endCursor?: Maybe<Scalars['String']>;
  /** Indicate whether more items exist after the returned ones */
  hasNextPage: Scalars['Boolean'];
  /** Indicate whether more items exist before the returned ones */
  hasPreviousPage: Scalars['Boolean'];
  /** The first cursor of the page result */
  startCursor?: Maybe<Scalars['String']>;
};

export type PaginatedOrganization = {
  organization: Array<Organization>;
  pageInfo: PageInfo;
};

export type PaginatedUsers = {
  pageInfo: PageInfo;
  users: Array<User>;
};

export type Platform = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The Communications for the platform */
  communication: Communication;
  /** Alkemio configuration. Provides configuration to external services in the Alkemio ecosystem. */
  configuration: Config;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Details about an Innovation Hubs on the platform. If the arguments are omitted, the current Innovation Hub you are in will be returned. */
  innovationHub?: Maybe<InnovationHub>;
  /** List of Innovation Hubs on the platform */
  innovationHubs: Array<InnovationHub>;
  /** The Innovation Library for the platform */
  library: Library;
  /** Alkemio Services Metadata. */
  metadata: Metadata;
  /** The StorageBucket with documents in use by Users + Organizations on the Platform. */
  storageBucket: StorageBucket;
};

export type PlatformInnovationHubArgs = {
  id?: InputMaybe<Scalars['UUID_NAMEID']>;
  subdomain?: InputMaybe<Scalars['String']>;
};

export type PlatformLocations = {
  /** URL to a page about the platform */
  about: Scalars['String'];
  /** URL where users can get tips and tricks */
  aup: Scalars['String'];
  /** URL where users can see the community forum */
  community: Scalars['String'];
  /** Main domain of the environment */
  domain: Scalars['String'];
  /** Name of the environment */
  environment: Scalars['String'];
  /** The feature flags for the platform */
  featureFlags: Array<FeatureFlag>;
  /** URL to a form for providing feedback */
  feedback: Scalars['String'];
  /** URL for the link Foundation in the HomePage of the application */
  foundation: Scalars['String'];
  /** URL where users can get help */
  help: Scalars['String'];
  /** URL for the link Impact in the HomePage of the application */
  impact: Scalars['String'];
  /** URL to a page about the innovation library */
  innovationLibrary: Scalars['String'];
  /** URL to a page about the collaboration tools */
  inspiration: Scalars['String'];
  /** URL where new users can get onboarding help */
  newuser: Scalars['String'];
  /** URL for the link Opensource in the HomePage of the application */
  opensource: Scalars['String'];
  /** URL to the privacy policy for the platform */
  privacy: Scalars['String'];
  /** URL where users can get information about previous releases */
  releases: Scalars['String'];
  /** URL to the security policy for the platform */
  security: Scalars['String'];
  /** URL where users can get support for the platform */
  support: Scalars['String'];
  /** URL to the terms of usage for the platform */
  terms: Scalars['String'];
  /** URL where users can get tips and tricks */
  tips: Scalars['String'];
};

export type Post = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The parent Callout of the Post */
  callout?: Maybe<Callout>;
  /** The comments on this Post. */
  comments: Room;
  /** The user that created this Post */
  createdBy?: Maybe<User>;
  createdDate: Scalars['DateTime'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** The Profile for this Post. */
  profile: Profile;
  /** The Post type, e.g. knowledge, idea, stakeholder persona etc. */
  type: Scalars['String'];
};

export type PostTemplate = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The default description to show to users filling our a new instance. */
  defaultDescription: Scalars['Markdown'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The Profile for this template. */
  profile: Profile;
  /** The type for this Post. */
  type: Scalars['String'];
};

export type Preference = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The definition for the Preference */
  definition: PreferenceDefinition;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Value of the preference */
  value: Scalars['String'];
};

export type PreferenceDefinition = {
  /** Preference description */
  description: Scalars['String'];
  /** The name */
  displayName: Scalars['String'];
  /** The group for the preference within the containing entity type. */
  group: Scalars['String'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The type of the Preference, specific to the Entity it is on. */
  type: PreferenceType;
  /** Preference value type */
  valueType: PreferenceValueType;
};

export enum PreferenceType {
  AllowContributorsToCreateCallouts = 'ALLOW_CONTRIBUTORS_TO_CREATE_CALLOUTS',
  AllowContributorsToCreateOpportunities = 'ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES',
  AllowMembersToCreateCallouts = 'ALLOW_MEMBERS_TO_CREATE_CALLOUTS',
  AllowMembersToCreateChallenges = 'ALLOW_MEMBERS_TO_CREATE_CHALLENGES',
  AllowNonMembersReadAccess = 'ALLOW_NON_MEMBERS_READ_ACCESS',
  AllowSpaceMembersToContribute = 'ALLOW_SPACE_MEMBERS_TO_CONTRIBUTE',
  AuthorizationAnonymousReadAccess = 'AUTHORIZATION_ANONYMOUS_READ_ACCESS',
  AuthorizationOrganizationMatchDomain = 'AUTHORIZATION_ORGANIZATION_MATCH_DOMAIN',
  MembershipApplicationsFromAnyone = 'MEMBERSHIP_APPLICATIONS_FROM_ANYONE',
  MembershipApplyChallengeFromSpaceMembers = 'MEMBERSHIP_APPLY_CHALLENGE_FROM_SPACE_MEMBERS',
  MembershipFeedbackOnChallengeContext = 'MEMBERSHIP_FEEDBACK_ON_CHALLENGE_CONTEXT',
  MembershipJoinChallengeFromSpaceMembers = 'MEMBERSHIP_JOIN_CHALLENGE_FROM_SPACE_MEMBERS',
  MembershipJoinSpaceFromAnyone = 'MEMBERSHIP_JOIN_SPACE_FROM_ANYONE',
  MembershipJoinSpaceFromHostOrganizationMembers = 'MEMBERSHIP_JOIN_SPACE_FROM_HOST_ORGANIZATION_MEMBERS',
  NotificationApplicationReceived = 'NOTIFICATION_APPLICATION_RECEIVED',
  NotificationApplicationSubmitted = 'NOTIFICATION_APPLICATION_SUBMITTED',
  NotificationCalloutPublished = 'NOTIFICATION_CALLOUT_PUBLISHED',
  NotificationCommentReply = 'NOTIFICATION_COMMENT_REPLY',
  NotificationCommunicationDiscussionCreated = 'NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED',
  NotificationCommunicationDiscussionCreatedAdmin = 'NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED_ADMIN',
  NotificationCommunicationMention = 'NOTIFICATION_COMMUNICATION_MENTION',
  NotificationCommunicationMessage = 'NOTIFICATION_COMMUNICATION_MESSAGE',
  NotificationCommunicationUpdates = 'NOTIFICATION_COMMUNICATION_UPDATES',
  NotificationCommunicationUpdateSentAdmin = 'NOTIFICATION_COMMUNICATION_UPDATE_SENT_ADMIN',
  NotificationCommunityCollaborationInterestAdmin = 'NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_ADMIN',
  NotificationCommunityCollaborationInterestUser = 'NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_USER',
  NotificationCommunityInvitationUser = 'NOTIFICATION_COMMUNITY_INVITATION_USER',
  NotificationCommunityNewMember = 'NOTIFICATION_COMMUNITY_NEW_MEMBER',
  NotificationCommunityNewMemberAdmin = 'NOTIFICATION_COMMUNITY_NEW_MEMBER_ADMIN',
  NotificationCommunityReviewSubmitted = 'NOTIFICATION_COMMUNITY_REVIEW_SUBMITTED',
  NotificationCommunityReviewSubmittedAdmin = 'NOTIFICATION_COMMUNITY_REVIEW_SUBMITTED_ADMIN',
  NotificationDiscussionCommentCreated = 'NOTIFICATION_DISCUSSION_COMMENT_CREATED',
  NotificationForumDiscussionComment = 'NOTIFICATION_FORUM_DISCUSSION_COMMENT',
  NotificationForumDiscussionCreated = 'NOTIFICATION_FORUM_DISCUSSION_CREATED',
  NotificationOrganizationMention = 'NOTIFICATION_ORGANIZATION_MENTION',
  NotificationOrganizationMessage = 'NOTIFICATION_ORGANIZATION_MESSAGE',
  NotificationPostCommentCreated = 'NOTIFICATION_POST_COMMENT_CREATED',
  NotificationPostCreated = 'NOTIFICATION_POST_CREATED',
  NotificationPostCreatedAdmin = 'NOTIFICATION_POST_CREATED_ADMIN',
  NotificationUserRemoved = 'NOTIFICATION_USER_REMOVED',
  NotificationUserSignUp = 'NOTIFICATION_USER_SIGN_UP',
  NotificationWhiteboardCreated = 'NOTIFICATION_WHITEBOARD_CREATED',
}

export enum PreferenceValueType {
  Boolean = 'BOOLEAN',
  Float = 'FLOAT',
  Int = 'INT',
  String = 'STRING',
}

export type Profile = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** A description of the entity associated with this profile. */
  description?: Maybe<Scalars['Markdown']>;
  /** The display name. */
  displayName: Scalars['String'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The location for this Profile. */
  location?: Maybe<Location>;
  /** A list of URLs to relevant information. */
  references?: Maybe<Array<Reference>>;
  /** The storage bucket for this Profile. */
  storageBucket?: Maybe<StorageBucket>;
  /** The taglie for this entity. */
  tagline: Scalars['String'];
  /** The default or named tagset. */
  tagset?: Maybe<Tagset>;
  /** A list of named tagsets, each of which has a list of tags. */
  tagsets?: Maybe<Array<Tagset>>;
  /** A particular type of visual for this Profile. */
  visual?: Maybe<Visual>;
  /** A list of visuals for this Profile. */
  visuals: Array<Visual>;
};

export type ProfileTagsetArgs = {
  tagsetName?: InputMaybe<TagsetReservedName>;
};

export type ProfileVisualArgs = {
  type: VisualType;
};

export type ProfileCredentialVerified = {
  /** The email */
  userEmail: Scalars['String'];
  /** The vc. */
  vc: Scalars['String'];
};

export type Project = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The maturity phase of the project i.e. new, being refined, committed, in-progress, closed etc */
  lifecycle?: Maybe<Lifecycle>;
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** The Profile for this Project. */
  profile: Profile;
};

export type ProjectEventInput = {
  /** The ID of the entity to which the event is sent */
  ID: Scalars['String'];
  /** The name of the event. Simple text and matching an event in the Lifecycle definition. */
  eventName: Scalars['String'];
};

export type Query = {
  /** Retrieve the ActivityLog for the specified Collaboration */
  activityLogOnCollaboration: Array<ActivityLogEntry>;
  /** All Users that are members of a given room */
  adminCommunicationMembership: CommunicationAdminMembershipResult;
  /** Usage of the messaging platform that are not tied to the domain model. */
  adminCommunicationOrphanedUsage: CommunicationAdminOrphanedUsageResult;
  /** Ask the chat engine for guidance. */
  askChatGuidanceQuestion: ChatGuidanceResult;
  /** Get supported credential metadata */
  getSupportedVerifiedCredentialMetadata: Array<CredentialMetadataOutput>;
  /** Allow direct lookup of entities from the domain model */
  lookup: LookupQueryResults;
  /** Information about the current authenticated user */
  me: MeQueryResults;
  /** A particular Organization */
  organization: Organization;
  /** The Organizations on this platform */
  organizations: Array<Organization>;
  /** The Organizations on this platform in paginated format */
  organizationsPaginated: PaginatedOrganization;
  /** Alkemio Platform */
  platform: Platform;
  /** The roles that the specified Organization has. */
  rolesOrganization: ContributorRoles;
  /** The roles that that the specified User has. */
  rolesUser: ContributorRoles;
  /** Search the platform for terms supplied */
  search: ISearchResults;
  /** An space. If no ID is specified then the first Space is returned. */
  space: Space;
  /** The Spaces on this platform */
  spaces: Array<Space>;
  /** A particular user, identified by the ID or by email */
  user: User;
  /** Privileges assigned to a User (based on held credentials) given an Authorization defnition. */
  userAuthorizationPrivileges: Array<AuthorizationPrivilege>;
  /** The users who have profiles on this platform */
  users: Array<User>;
  /** The users who have profiles on this platform */
  usersPaginated: PaginatedUsers;
  /** All Users that hold credentials matching the supplied criteria. */
  usersWithAuthorizationCredential: Array<User>;
};

export type QueryActivityLogOnCollaborationArgs = {
  queryData: ActivityLogInput;
};

export type QueryAdminCommunicationMembershipArgs = {
  communicationData: CommunicationAdminMembershipInput;
};

export type QueryAskChatGuidanceQuestionArgs = {
  chatData: ChatGuidanceInput;
};

export type QueryOrganizationArgs = {
  ID: Scalars['UUID_NAMEID'];
};

export type QueryOrganizationsArgs = {
  filter?: InputMaybe<ContributorFilterInput>;
  limit?: InputMaybe<Scalars['Float']>;
  shuffle?: InputMaybe<Scalars['Boolean']>;
};

export type QueryOrganizationsPaginatedArgs = {
  after?: InputMaybe<Scalars['UUID']>;
  before?: InputMaybe<Scalars['UUID']>;
  filter?: InputMaybe<OrganizationFilterInput>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

export type QueryRolesOrganizationArgs = {
  rolesData: RolesOrganizationInput;
};

export type QueryRolesUserArgs = {
  rolesData: RolesUserInput;
};

export type QuerySearchArgs = {
  searchData: SearchInput;
};

export type QuerySpaceArgs = {
  ID: Scalars['UUID_NAMEID'];
};

export type QuerySpacesArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID']>>;
  filter?: InputMaybe<SpaceFilterInput>;
};

export type QueryUserArgs = {
  ID: Scalars['UUID_NAMEID_EMAIL'];
};

export type QueryUserAuthorizationPrivilegesArgs = {
  userAuthorizationPrivilegesData: UserAuthorizationPrivilegesInput;
};

export type QueryUsersArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID']>>;
  filter?: InputMaybe<ContributorFilterInput>;
  limit?: InputMaybe<Scalars['Float']>;
  shuffle?: InputMaybe<Scalars['Boolean']>;
};

export type QueryUsersPaginatedArgs = {
  after?: InputMaybe<Scalars['UUID']>;
  before?: InputMaybe<Scalars['UUID']>;
  filter?: InputMaybe<UserFilterInput>;
  first?: InputMaybe<Scalars['Int']>;
  last?: InputMaybe<Scalars['Int']>;
};

export type QueryUsersWithAuthorizationCredentialArgs = {
  credentialsCriteriaData: UsersWithAuthorizationCredentialInput;
};

export type Question = {
  /** The ID of the entity */
  id: Scalars['UUID'];
  name: Scalars['String'];
  value: Scalars['String'];
};

export type QuestionTemplate = {
  /** Question template. */
  question: Scalars['String'];
  /** Is question required? */
  required: Scalars['Boolean'];
  /** Sorting order for the question. Lower is first. */
  sortOrder?: Maybe<Scalars['Float']>;
};

/** A reaction to a message. */
export type Reaction = {
  /** The reaction Emoji */
  emoji: Scalars['Emoji'];
  /** The id for the reaction. */
  id: Scalars['MessageID'];
  /** The user that reacted */
  sender?: Maybe<User>;
  /** The server timestamp in UTC */
  timestamp: Scalars['Float'];
};

export type Reference = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** Description of this reference */
  description?: Maybe<Scalars['String']>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Name of the reference, e.g. Linkedin, Twitter etc. */
  name: Scalars['String'];
  /** URI of the reference */
  uri: Scalars['String'];
};

export type Relation = {
  actorName: Scalars['String'];
  actorRole: Scalars['String'];
  actorType: Scalars['String'];
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  description: Scalars['String'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  type: Scalars['String'];
};

export type RelayPaginatedUser = {
  /** The unique personal identifier (upn) for the account associated with this user profile */
  accountUpn: Scalars['String'];
  /** The Agent representing this User. */
  agent?: Maybe<Agent>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The Community rooms this user is a member of */
  communityRooms?: Maybe<Array<CommunicationRoom>>;
  /** The direct rooms this user is a member of */
  directRooms?: Maybe<Array<DirectRoom>>;
  /** The email address for this User. */
  email: Scalars['String'];
  firstName: Scalars['String'];
  gender: Scalars['String'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Can a message be sent to this User. */
  isContactable: Scalars['Boolean'];
  lastName: Scalars['String'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** The phone number for this User. */
  phone: Scalars['String'];
  /** The preferences for this user */
  preferences: Array<Preference>;
  /** The Profile for this User. */
  profile: Profile;
};

export type RelayPaginatedUserEdge = {
  node: RelayPaginatedUser;
};

export type RelayPaginatedUserPageInfo = {
  /** The last cursor of the page result */
  endCursor?: Maybe<Scalars['String']>;
  /** Indicate whether more items exist after the returned ones */
  hasNextPage: Scalars['Boolean'];
  /** Indicate whether more items exist before the returned ones */
  hasPreviousPage: Scalars['Boolean'];
  /** The first cursor of the page result */
  startCursor?: Maybe<Scalars['String']>;
};

export type RemoveCommunityRoleFromOrganizationInput = {
  communityID: Scalars['UUID'];
  organizationID: Scalars['UUID_NAMEID'];
  role: CommunityRole;
};

export type RemoveCommunityRoleFromUserInput = {
  communityID: Scalars['UUID'];
  role: CommunityRole;
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type RemoveGlobalAdminInput = {
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type RemoveGlobalCommunityAdminInput = {
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type RemoveGlobalSpacesAdminInput = {
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type RemoveOrganizationAdminInput = {
  organizationID: Scalars['UUID_NAMEID'];
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type RemoveOrganizationAssociateInput = {
  organizationID: Scalars['UUID_NAMEID'];
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type RemoveOrganizationOwnerInput = {
  organizationID: Scalars['UUID_NAMEID'];
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type RemoveUserGroupMemberInput = {
  groupID: Scalars['UUID'];
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type RevokeAuthorizationCredentialInput = {
  /** The resource to which access is being removed. */
  resourceID: Scalars['String'];
  type: AuthorizationCredential;
  /** The user from whom the credential is being removed. */
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type RolesOrganizationInput = {
  /** Return membership in Spaces matching the provided filter. */
  filter?: InputMaybe<SpaceFilterInput>;
  /** The ID of the organization to retrieve the roles of. */
  organizationID: Scalars['UUID_NAMEID'];
};

export type RolesResult = {
  /** Display name of the entity */
  displayName: Scalars['String'];
  /** A unique identifier for this membership result. */
  id: Scalars['String'];
  /** Name Identifier of the entity */
  nameID: Scalars['NameID'];
  /** The roles held by the contributor */
  roles: Array<Scalars['String']>;
};

export type RolesResultCommunity = {
  /** Display name of the entity */
  displayName: Scalars['String'];
  /** A unique identifier for this membership result. */
  id: Scalars['String'];
  /** Name Identifier of the entity */
  nameID: Scalars['NameID'];
  /** The roles held by the contributor */
  roles: Array<Scalars['String']>;
  /** Details of the Groups in the Organizations the user is a member of */
  userGroups: Array<RolesResult>;
};

export type RolesResultOrganization = {
  /** Display name of the entity */
  displayName: Scalars['String'];
  /** A unique identifier for this membership result. */
  id: Scalars['String'];
  /** Name Identifier of the entity */
  nameID: Scalars['NameID'];
  /** The Organization ID. */
  organizationID: Scalars['String'];
  /** The roles held by the contributor */
  roles: Array<Scalars['String']>;
  /** Details of the Groups in the Organizations the user is a member of */
  userGroups: Array<RolesResult>;
};

export type RolesResultSpace = {
  /** Details of the Challenges the user is a member of */
  challenges: Array<RolesResultCommunity>;
  /** Display name of the entity */
  displayName: Scalars['String'];
  /** A unique identifier for this membership result. */
  id: Scalars['String'];
  /** Name Identifier of the entity */
  nameID: Scalars['NameID'];
  /** Details of the Opportunities the Contributor is a member of */
  opportunities: Array<RolesResultCommunity>;
  /** The roles held by the contributor */
  roles: Array<Scalars['String']>;
  /** The Space ID */
  spaceID: Scalars['String'];
  /** Details of the Groups in the Organizations the user is a member of */
  userGroups: Array<RolesResult>;
  /** Visibility of the Space. */
  visibility: SpaceVisibility;
};

export type RolesUserInput = {
  /** Return membership in Spaces matching the provided filter. */
  filter?: InputMaybe<SpaceFilterInput>;
  /** The ID of the user to retrieve the roles of. */
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type Room = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Messages in this Room. */
  messages: Array<Message>;
  /** The number of messages in the Room. */
  messagesCount: Scalars['Float'];
};

export type RoomAddReactionToMessageInput = {
  /** The reaction to the message. */
  emoji: Scalars['Emoji'];
  /** The message id that is being reacted to */
  messageID: Scalars['MessageID'];
  /** The Room to remove a message from. */
  roomID: Scalars['UUID'];
};

/** The event happened in the subscribed room */
export type RoomEventSubscriptionResult = {
  /** A message related event. */
  message?: Maybe<RoomMessageEventSubscriptionResult>;
  /** A message reaction related event. */
  reaction?: Maybe<RoomMessageReactionEventSubscriptionResult>;
  /** The identifier for the Room on which the event happened. */
  roomID: Scalars['String'];
};

/** A message event happened in the subscribed room */
export type RoomMessageEventSubscriptionResult = {
  /** A message related event. */
  data: Message;
  /** The type of event. */
  type: MutationType;
};

/** A message reaction event happened in the subscribed room */
export type RoomMessageReactionEventSubscriptionResult = {
  /** A message related event. */
  data: Reaction;
  /** The message on which the reaction event happened. */
  messageID?: Maybe<Scalars['String']>;
  /** The type of event. */
  type: MutationType;
};

export type RoomRemoveMessageInput = {
  /** The message id that should be removed */
  messageID: Scalars['MessageID'];
  /** The Room to remove a message from. */
  roomID: Scalars['UUID'];
};

export type RoomRemoveReactionToMessageInput = {
  /** The reaction that is being removed */
  reactionID: Scalars['MessageID'];
  /** The Room to remove a message from. */
  roomID: Scalars['UUID'];
};

export type RoomSendMessageInput = {
  /** The message being sent */
  message: Scalars['String'];
  /** The Room the message is being sent to */
  roomID: Scalars['UUID'];
};

export type RoomSendMessageReplyInput = {
  /** The message being sent */
  message: Scalars['String'];
  /** The Room the message is being sent to */
  roomID: Scalars['UUID'];
  /** The message starting the thread being replied to */
  threadID: Scalars['MessageID'];
};

export type SearchInput = {
  /** Restrict the search to only the specified Space. Default is all Spaces. */
  searchInSpaceFilter?: InputMaybe<Scalars['UUID_NAMEID']>;
  /** Expand the search to includes Tagsets with the provided names. Max 2. */
  tagsetNames?: InputMaybe<Array<Scalars['String']>>;
  /** The terms to be searched for within this Space. Max 5. */
  terms: Array<Scalars['String']>;
  /** Restrict the search to only the specified entity types. Values allowed: user, group, organization, Default is all. */
  typesFilter?: InputMaybe<Array<Scalars['String']>>;
};

export type SearchResult = {
  id: Scalars['UUID'];
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float'];
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']>;
  /** The event type for this Activity. */
  type: SearchResultType;
};

export type SearchResultChallenge = SearchResult & {
  /** The Challenge that was found. */
  challenge: Challenge;
  id: Scalars['UUID'];
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float'];
  /** The Space that the Challenge is in. */
  space: Space;
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']>;
  /** The event type for this Activity. */
  type: SearchResultType;
};

export type SearchResultOpportunity = SearchResult & {
  /** The Challenge that the Opportunity is in. */
  challenge: Challenge;
  id: Scalars['UUID'];
  /** The Opportunity that was found. */
  opportunity: Opportunity;
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float'];
  /** The Space that the Opportunity is in. */
  space: Space;
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']>;
  /** The event type for this Activity. */
  type: SearchResultType;
};

export type SearchResultOrganization = SearchResult & {
  id: Scalars['UUID'];
  /** The Organization that was found. */
  organization: Organization;
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float'];
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']>;
  /** The event type for this Activity. */
  type: SearchResultType;
};

export type SearchResultPost = SearchResult & {
  /** The Callout of the Post. */
  callout: Callout;
  /** The Challenge of the Post. Applicable for Callouts on Opportunities and Challenges. */
  challenge?: Maybe<Challenge>;
  id: Scalars['UUID'];
  /** The Opportunity of the Post. Applicable only for Callouts on Opportunities. */
  opportunity?: Maybe<Opportunity>;
  /** The Post that was found. */
  post: Post;
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float'];
  /** The Space of the Post. */
  space: Space;
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']>;
  /** The event type for this Activity. */
  type: SearchResultType;
};

export type SearchResultSpace = SearchResult & {
  id: Scalars['UUID'];
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float'];
  /** The Space that was found. */
  space: Space;
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']>;
  /** The event type for this Activity. */
  type: SearchResultType;
};

export enum SearchResultType {
  Challenge = 'CHALLENGE',
  Opportunity = 'OPPORTUNITY',
  Organization = 'ORGANIZATION',
  Post = 'POST',
  Space = 'SPACE',
  User = 'USER',
  Usergroup = 'USERGROUP',
}

export type SearchResultUser = SearchResult & {
  id: Scalars['UUID'];
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float'];
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']>;
  /** The event type for this Activity. */
  type: SearchResultType;
  /** The User that was found. */
  user: User;
};

export type SearchResultUserGroup = SearchResult & {
  id: Scalars['UUID'];
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float'];
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']>;
  /** The event type for this Activity. */
  type: SearchResultType;
  /** The User Group that was found. */
  userGroup: UserGroup;
};

export type Sentry = {
  /** Flag indicating if the client should use Sentry for monitoring. */
  enabled: Scalars['Boolean'];
  /** URL to the Sentry endpoint. */
  endpoint: Scalars['String'];
  /** Flag indicating if PII should be submitted on Sentry events. */
  submitPII: Scalars['Boolean'];
};

export type ServiceMetadata = {
  /** Service name e.g. CT Server */
  name?: Maybe<Scalars['String']>;
  /** Version in the format {major.minor.patch} - using SemVer. */
  version?: Maybe<Scalars['String']>;
};

export type Space = {
  /** The Agent representing this Space. */
  agent?: Maybe<Agent>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** A particular Challenge, either by its ID or nameID */
  challenge: Challenge;
  /** The challenges for the space. */
  challenges?: Maybe<Array<Challenge>>;
  /** Collaboration object for the base challenge */
  collaboration?: Maybe<Collaboration>;
  /** Get a Community within the Space. Defaults to the Community for the Space itself. */
  community?: Maybe<Community>;
  /** The context for the space. */
  context?: Maybe<Context>;
  /** The user group with the specified id anywhere in the space */
  group: UserGroup;
  /** The User Groups on this Space */
  groups: Array<UserGroup>;
  /** The Space host. */
  host?: Maybe<Organization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Metrics about activity within this Space. */
  metrics?: Maybe<Array<Nvp>>;
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** All opportunities within the space */
  opportunities?: Maybe<Array<Opportunity>>;
  /** A particular Opportunity, either by its ID or nameID */
  opportunity: Opportunity;
  /** The preferences for this Space */
  preferences?: Maybe<Array<Preference>>;
  /** The Profile for the Space. */
  profile: Profile;
  /** A particular Project, identified by the ID */
  project: Project;
  /** All projects within this space */
  projects: Array<Project>;
  /** The StorageBucket with documents in use by this Space */
  storageBucket?: Maybe<StorageBucket>;
  /** The templates in use by this Space */
  templates?: Maybe<TemplatesSet>;
  /** Visibility of the Space. */
  visibility: SpaceVisibility;
};

export type SpaceChallengeArgs = {
  ID: Scalars['UUID_NAMEID'];
};

export type SpaceChallengesArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID']>>;
  limit?: InputMaybe<Scalars['Float']>;
  shuffle?: InputMaybe<Scalars['Boolean']>;
};

export type SpaceCommunityArgs = {
  ID?: InputMaybe<Scalars['UUID']>;
};

export type SpaceGroupArgs = {
  ID: Scalars['UUID'];
};

export type SpaceOpportunitiesArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID']>>;
};

export type SpaceOpportunityArgs = {
  ID: Scalars['UUID_NAMEID'];
};

export type SpaceProjectArgs = {
  ID: Scalars['UUID_NAMEID'];
};

export type SpaceAuthorizationResetInput = {
  /** The identifier of the Space whose Authorization Policy should be reset. */
  spaceID: Scalars['UUID_NAMEID'];
};

export type SpaceFilterInput = {
  /** Return Spaces with a Visibility matching one of the provided types. */
  visibilities?: InputMaybe<Array<SpaceVisibility>>;
};

export enum SpacePreferenceType {
  AllowMembersToCreateCallouts = 'ALLOW_MEMBERS_TO_CREATE_CALLOUTS',
  AllowMembersToCreateChallenges = 'ALLOW_MEMBERS_TO_CREATE_CHALLENGES',
  AuthorizationAnonymousReadAccess = 'AUTHORIZATION_ANONYMOUS_READ_ACCESS',
  MembershipApplicationsFromAnyone = 'MEMBERSHIP_APPLICATIONS_FROM_ANYONE',
  MembershipJoinSpaceFromAnyone = 'MEMBERSHIP_JOIN_SPACE_FROM_ANYONE',
  MembershipJoinSpaceFromHostOrganizationMembers = 'MEMBERSHIP_JOIN_SPACE_FROM_HOST_ORGANIZATION_MEMBERS',
}

export enum SpaceVisibility {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Demo = 'DEMO',
}

export type StorageBucket = {
  /** Mime types allowed to be stored on this StorageBucket. */
  allowedMimeTypes: Array<Scalars['String']>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** A single Document */
  document?: Maybe<Document>;
  /** The list of Documents for this StorageBucket. */
  documents: Array<Document>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Maximum allowed file size on this StorageBucket. */
  maxFileSize: Scalars['Float'];
  /** The aggregate size of all Documents for this StorageBucket. */
  size: Scalars['Float'];
};

export type StorageBucketDocumentArgs = {
  ID: Scalars['UUID_NAMEID'];
};

export type StorageBucketDocumentsArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID_NAMEID']>>;
  limit?: InputMaybe<Scalars['Float']>;
};

export type StorageBucketUploadFileInput = {
  storageBucketId: Scalars['String'];
};

export type StorageBucketUploadFileOnReferenceInput = {
  referenceID: Scalars['String'];
};

export type StorageConfig = {
  /** Config for uploading files to Alkemio. */
  file: FileStorageConfig;
};

export type Subscription = {
  activityCreated: ActivityCreatedSubscriptionResult;
  /** Receive new Update messages on Communities the currently authenticated User is a member of. */
  calloutPostCreated: CalloutPostCreated;
  /** Receive new Challenges created on the Space. */
  challengeCreated: ChallengeCreated;
  /** Receive updates on Discussions */
  communicationDiscussionUpdated: Discussion;
  /** Receive new Opportunities created on the Challenge. */
  opportunityCreated: OpportunityCreated;
  /** Received on verified credentials change */
  profileVerifiedCredential: ProfileCredentialVerified;
  /** Receive Room event */
  roomEvents: RoomEventSubscriptionResult;
  /** Receive updated content of a whiteboard */
  whiteboardContentUpdated: WhiteboardContentUpdated;
};

export type SubscriptionActivityCreatedArgs = {
  input: ActivityCreatedSubscriptionInput;
};

export type SubscriptionCalloutPostCreatedArgs = {
  calloutID: Scalars['UUID'];
};

export type SubscriptionChallengeCreatedArgs = {
  spaceID: Scalars['UUID_NAMEID'];
};

export type SubscriptionCommunicationDiscussionUpdatedArgs = {
  communicationID: Scalars['UUID'];
};

export type SubscriptionOpportunityCreatedArgs = {
  challengeID: Scalars['UUID'];
};

export type SubscriptionRoomEventsArgs = {
  roomID: Scalars['UUID'];
};

export type SubscriptionWhiteboardContentUpdatedArgs = {
  whiteboardIDs: Array<Scalars['UUID']>;
};

export type Tagset = {
  /** The allowed values for this Tagset. */
  allowedValues: Array<Scalars['String']>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  name: Scalars['String'];
  tags: Array<Scalars['String']>;
  type: TagsetType;
};

export type TagsetArgs = {
  /** Return only Callouts that match one of the tagsets and any of the tags in them. */
  name: Scalars['String'];
  /** A list of tags to include. */
  tags: Array<Scalars['String']>;
};

export enum TagsetReservedName {
  CalloutDisplayLocation = 'CALLOUT_DISPLAY_LOCATION',
  Capabilities = 'CAPABILITIES',
  Default = 'DEFAULT',
  FlowState = 'FLOW_STATE',
  Keywords = 'KEYWORDS',
  Skills = 'SKILLS',
}

export type TagsetTemplate = {
  allowedValues: Array<Scalars['String']>;
  /** For Tagsets of type SELECT_ONE, the default selected value. */
  defaultSelectedValue?: Maybe<Scalars['String']>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  name: Scalars['String'];
  type: TagsetType;
};

export enum TagsetType {
  Freeform = 'FREEFORM',
  SelectMany = 'SELECT_MANY',
  SelectOne = 'SELECT_ONE',
}

export type Template = {
  /** Challenge templates. */
  challenges: Array<ChallengeTemplate>;
  /** Template description. */
  description: Scalars['String'];
  /** Template name. */
  name: Scalars['String'];
};

export type TemplatesSet = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** A single InnovationFlowTemplate */
  innovationFlowTemplate?: Maybe<InnovationFlowTemplate>;
  /** The InnovationFlowTemplates in this TemplatesSet. */
  innovationFlowTemplates: Array<InnovationFlowTemplate>;
  /** The policy for this TemplatesSet. */
  policy?: Maybe<TemplatesSetPolicy>;
  /** A single PostTemplate */
  postTemplate?: Maybe<PostTemplate>;
  /** The PostTemplates in this TemplatesSet. */
  postTemplates: Array<PostTemplate>;
  /** A single WhiteboardTemplate */
  whiteboardTemplate?: Maybe<WhiteboardTemplate>;
  /** The WhiteboardTemplates in this TemplatesSet. */
  whiteboardTemplates: Array<WhiteboardTemplate>;
};

export type TemplatesSetInnovationFlowTemplateArgs = {
  ID: Scalars['UUID'];
};

export type TemplatesSetPostTemplateArgs = {
  ID: Scalars['UUID'];
};

export type TemplatesSetWhiteboardTemplateArgs = {
  ID: Scalars['UUID'];
};

export type TemplatesSetPolicy = {
  minInnovationFlow: Scalars['Float'];
};

export type Timeline = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The Innovation Library for the timeline */
  calendar: Calendar;
  /** The ID of the entity */
  id: Scalars['UUID'];
};

export type UpdateActorInput = {
  ID: Scalars['UUID'];
  description?: InputMaybe<Scalars['String']>;
  impact?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  value?: InputMaybe<Scalars['String']>;
};

export type UpdateCalendarEventInput = {
  ID: Scalars['UUID'];
  /** The length of the event in days. */
  durationDays?: InputMaybe<Scalars['Float']>;
  /** The length of the event in minutes. */
  durationMinutes: Scalars['Float'];
  /** Flag to indicate if this event is for multiple days. */
  multipleDays: Scalars['Boolean'];
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  /** The state date for the event. */
  startDate: Scalars['DateTime'];
  type?: InputMaybe<CalendarEventType>;
  /** Flag to indicate if this event is for a whole day. */
  wholeDay: Scalars['Boolean'];
};

export type UpdateCalloutInput = {
  ID: Scalars['UUID'];
  /** Set display location for this Callout. */
  displayLocation?: InputMaybe<CalloutDisplayLocation>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** PostTemplate data for this Callout. */
  postTemplate?: InputMaybe<UpdateCalloutPostTemplateInput>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  /** The sort order to assign to this Callout. */
  sortOrder?: InputMaybe<Scalars['Float']>;
  /** State of the callout. */
  state?: InputMaybe<CalloutState>;
  /** WhiteboardTemplate data for this Callout. */
  whiteboardTemplate?: InputMaybe<UpdateCalloutWhiteboardTemplateInput>;
};

export type UpdateCalloutPostTemplateInput = {
  /** The default description to be pre-filled when users create Posts based on this template. */
  defaultDescription?: InputMaybe<Scalars['Markdown']>;
  /** The Profile of the Template. */
  profileData?: InputMaybe<UpdateProfileInput>;
  /** The type of Posts created from this Template. */
  type?: InputMaybe<Scalars['String']>;
};

export type UpdateCalloutPublishInfoInput = {
  /** The identifier for the Callout whose publisher is to be updated. */
  calloutID: Scalars['String'];
  /** The timestamp to set for the publishing of the Callout. */
  publishDate?: InputMaybe<Scalars['Float']>;
  /** The identifier of the publisher of the Callout. */
  publisherID?: InputMaybe<Scalars['UUID_NAMEID_EMAIL']>;
};

export type UpdateCalloutVisibilityInput = {
  /** The identifier for the Callout whose visibility is to be updated. */
  calloutID: Scalars['String'];
  /** Send a notification on publishing. */
  sendNotification?: InputMaybe<Scalars['Boolean']>;
  /** Visibility of the Callout. */
  visibility: CalloutVisibility;
};

export type UpdateCalloutWhiteboardTemplateInput = {
  /** The Profile of the Template. */
  profileData?: InputMaybe<UpdateProfileInput>;
  value?: InputMaybe<Scalars['JSON']>;
};

export type UpdateChallengeInput = {
  ID: Scalars['UUID'];
  /** Update the contained Context entity. */
  context?: InputMaybe<UpdateContextInput>;
  /** The Profile of the InnovationFlow of this entity. */
  innovationFlowData?: InputMaybe<UpdateInnovationFlowInput>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
};

export type UpdateChallengePreferenceInput = {
  /** ID of the Challenge */
  challengeID: Scalars['UUID'];
  /** Type of the challenge preference */
  type: ChallengePreferenceType;
  value: Scalars['String'];
};

export type UpdateCollaborationCalloutsSortOrderInput = {
  /** The IDs of the callouts to update the sort order on */
  calloutIDs: Array<Scalars['UUID_NAMEID']>;
  collaborationID: Scalars['UUID'];
};

export type UpdateCommunityApplicationFormInput = {
  communityID: Scalars['UUID'];
  formData: UpdateFormInput;
};

export type UpdateContextInput = {
  impact?: InputMaybe<Scalars['Markdown']>;
  vision?: InputMaybe<Scalars['Markdown']>;
  who?: InputMaybe<Scalars['Markdown']>;
};

export type UpdateDiscussionInput = {
  ID: Scalars['UUID'];
  /** The category for the Discussion */
  category?: InputMaybe<DiscussionCategory>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
};

export type UpdateDocumentInput = {
  ID: Scalars['UUID'];
  /** The display name for the Document. */
  displayName: Scalars['String'];
  tagset?: InputMaybe<UpdateTagsetInput>;
};

export type UpdateEcosystemModelInput = {
  ID: Scalars['UUID'];
  description?: InputMaybe<Scalars['String']>;
};

export type UpdateFormInput = {
  description: Scalars['Markdown'];
  questions: Array<UpdateFormQuestionInput>;
};

export type UpdateFormQuestionInput = {
  /** The explation text to clarify the question. */
  explanation: Scalars['String'];
  /** The maxiumum length of the answer, in characters, up to a limit of 512. */
  maxLength: Scalars['Float'];
  /** The question to be answered */
  question: Scalars['String'];
  /** Whether an answer is required for this Question. */
  required: Scalars['Boolean'];
  /** The sort order of this question in a wider set of questions. */
  sortOrder: Scalars['Float'];
};

export type UpdateInnovationFlowInput = {
  /** ID of the Innovation Flow */
  innovationFlowID: Scalars['UUID'];
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  /** The states on this InnovationFlow that should be selectable. */
  visibleStates?: InputMaybe<Array<Scalars['String']>>;
};

export type UpdateInnovationFlowLifecycleTemplateInput = {
  /** ID of the Innovation Flow */
  innovationFlowID: Scalars['UUID'];
  /** The Innovation Flow Template to use for updating the lifecycle used in this Innovation Flow. */
  innovationFlowTemplateID: Scalars['UUID'];
};

export type UpdateInnovationFlowTemplateInput = {
  ID: Scalars['UUID'];
  /** The XState definition for this InnovationFlowTemplate. */
  definition?: InputMaybe<Scalars['LifecycleDefinition']>;
  /** The Profile of the Template. */
  profile?: InputMaybe<UpdateProfileInput>;
};

export type UpdateInnovationHubInput = {
  ID: Scalars['UUID'];
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  /** A list of Spaces to include in this Innovation Hub. Only valid when type 'list' is used. */
  spaceListFilter?: InputMaybe<Array<Scalars['UUID_NAMEID']>>;
  /** Spaces with which visibility this Innovation Hub will display. Only valid when type 'visibility' is used. */
  spaceVisibilityFilter?: InputMaybe<SpaceVisibility>;
};

export type UpdateInnovationPackInput = {
  /** The ID or NameID of the InnovationPack. */
  ID: Scalars['UUID_NAMEID'];
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  /** Update the provider Organization for the InnovationPack. */
  providerOrgID?: InputMaybe<Scalars['UUID_NAMEID']>;
};

export type UpdateLocationInput = {
  addressLine1?: InputMaybe<Scalars['String']>;
  addressLine2?: InputMaybe<Scalars['String']>;
  city?: InputMaybe<Scalars['String']>;
  country?: InputMaybe<Scalars['String']>;
  postalCode?: InputMaybe<Scalars['String']>;
  stateOrProvince?: InputMaybe<Scalars['String']>;
};

export type UpdateOpportunityInput = {
  ID: Scalars['UUID'];
  /** Update the contained Context entity. */
  context?: InputMaybe<UpdateContextInput>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
};

export type UpdateOrganizationInput = {
  /** The ID or NameID of the Organization to update. */
  ID: Scalars['UUID_NAMEID'];
  contactEmail?: InputMaybe<Scalars['String']>;
  domain?: InputMaybe<Scalars['String']>;
  legalEntityName?: InputMaybe<Scalars['String']>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  website?: InputMaybe<Scalars['String']>;
};

export type UpdateOrganizationPreferenceInput = {
  /** ID of the Organization */
  organizationID: Scalars['UUID_NAMEID'];
  /** Type of the organization preference */
  type: OrganizationPreferenceType;
  value: Scalars['String'];
};

export type UpdatePostInput = {
  ID: Scalars['UUID'];
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  type?: InputMaybe<Scalars['String']>;
};

export type UpdatePostTemplateInput = {
  ID: Scalars['UUID'];
  /** The default description to be pre-filled when users create Posts based on this template. */
  defaultDescription?: InputMaybe<Scalars['Markdown']>;
  /** The Profile of the Template. */
  profile?: InputMaybe<UpdateProfileInput>;
  /** The type of Posts created from this Template. */
  type?: InputMaybe<Scalars['String']>;
};

export type UpdateProfileDirectInput = {
  description?: InputMaybe<Scalars['Markdown']>;
  /** The display name for the entity. */
  displayName?: InputMaybe<Scalars['String']>;
  location?: InputMaybe<UpdateLocationInput>;
  profileID: Scalars['UUID'];
  references?: InputMaybe<Array<UpdateReferenceInput>>;
  /** A memorable short description for this entity. */
  tagline?: InputMaybe<Scalars['String']>;
  tagsets?: InputMaybe<Array<UpdateTagsetInput>>;
};

export type UpdateProfileInput = {
  description?: InputMaybe<Scalars['Markdown']>;
  /** The display name for the entity. */
  displayName?: InputMaybe<Scalars['String']>;
  location?: InputMaybe<UpdateLocationInput>;
  references?: InputMaybe<Array<UpdateReferenceInput>>;
  /** A memorable short description for this entity. */
  tagline?: InputMaybe<Scalars['String']>;
  tagsets?: InputMaybe<Array<UpdateTagsetInput>>;
};

export type UpdateProjectInput = {
  ID: Scalars['UUID'];
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
};

export type UpdateReferenceInput = {
  ID: Scalars['UUID'];
  description?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  uri?: InputMaybe<Scalars['String']>;
};

export type UpdateSpaceInput = {
  /** The ID or NameID of the Space. */
  ID: Scalars['UUID_NAMEID'];
  /** Update the contained Context entity. */
  context?: InputMaybe<UpdateContextInput>;
  /** Update the host Organization for the Space. */
  hostID?: InputMaybe<Scalars['UUID_NAMEID']>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
};

export type UpdateSpacePlatformSettingsInput = {
  /** Update the host Organization for the Space. */
  hostID?: InputMaybe<Scalars['UUID_NAMEID']>;
  /** Upate the URL path for the Space. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** The identifier for the Space whose visibility is to be updated. */
  spaceID: Scalars['String'];
  /** Visibility of the Space. */
  visibility?: InputMaybe<SpaceVisibility>;
};

export type UpdateSpacePreferenceInput = {
  /** ID of the Space */
  spaceID: Scalars['UUID_NAMEID'];
  /** Type of the user preference */
  type: SpacePreferenceType;
  value: Scalars['String'];
};

export type UpdateTagsetInput = {
  ID: Scalars['UUID'];
  name?: InputMaybe<Scalars['String']>;
  tags: Array<Scalars['String']>;
};

export type UpdateUserGroupInput = {
  ID: Scalars['UUID'];
  name?: InputMaybe<Scalars['String']>;
  profileData?: InputMaybe<UpdateProfileInput>;
};

export type UpdateUserInput = {
  ID: Scalars['UUID_NAMEID_EMAIL'];
  accountUpn?: InputMaybe<Scalars['String']>;
  firstName?: InputMaybe<Scalars['String']>;
  gender?: InputMaybe<Scalars['String']>;
  lastName?: InputMaybe<Scalars['String']>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  phone?: InputMaybe<Scalars['String']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  /** Set this user profile as being used as a service account or not. */
  serviceProfile?: InputMaybe<Scalars['Boolean']>;
};

export type UpdateUserPreferenceInput = {
  /** Type of the user preference */
  type: UserPreferenceType;
  /** ID of the User */
  userID: Scalars['UUID_NAMEID_EMAIL'];
  value: Scalars['String'];
};

export type UpdateVisualInput = {
  alternativeText?: InputMaybe<Scalars['String']>;
  uri: Scalars['String'];
  visualID: Scalars['String'];
};

export type UpdateWhiteboardDirectInput = {
  ID: Scalars['UUID'];
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  value?: InputMaybe<Scalars['String']>;
};

export type UpdateWhiteboardTemplateInput = {
  ID: Scalars['UUID'];
  /** The Profile of the Template. */
  profile?: InputMaybe<UpdateProfileInput>;
  value?: InputMaybe<Scalars['JSON']>;
};

export type User = {
  /** The unique personal identifier (upn) for the account associated with this user profile */
  accountUpn: Scalars['String'];
  /** The Agent representing this User. */
  agent?: Maybe<Agent>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The Community rooms this user is a member of */
  communityRooms?: Maybe<Array<CommunicationRoom>>;
  /** The direct rooms this user is a member of */
  directRooms?: Maybe<Array<DirectRoom>>;
  /** The email address for this User. */
  email: Scalars['String'];
  firstName: Scalars['String'];
  gender: Scalars['String'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Can a message be sent to this User. */
  isContactable: Scalars['Boolean'];
  lastName: Scalars['String'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** The phone number for this User. */
  phone: Scalars['String'];
  /** The preferences for this user */
  preferences: Array<Preference>;
  /** The Profile for this User. */
  profile: Profile;
};

export type UserAuthorizationPrivilegesInput = {
  /** The authorization definition to evaluate the user credentials against. */
  authorizationID: Scalars['UUID'];
  /** The user to evaluate privileges granted based on held credentials. */
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type UserAuthorizationResetInput = {
  /** The identifier of the User whose Authorization Policy should be reset. */
  userID: Scalars['UUID_NAMEID_EMAIL'];
};

export type UserFilterInput = {
  displayName?: InputMaybe<Scalars['String']>;
  email?: InputMaybe<Scalars['String']>;
  firstName?: InputMaybe<Scalars['String']>;
  lastName?: InputMaybe<Scalars['String']>;
};

export type UserGroup = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The Users that are members of this User Group. */
  members?: Maybe<Array<User>>;
  name: Scalars['String'];
  /** Containing entity for this UserGroup. */
  parent?: Maybe<Groupable>;
  /** The profile for the user group */
  profile?: Maybe<Profile>;
};

export enum UserPreferenceType {
  NotificationApplicationReceived = 'NOTIFICATION_APPLICATION_RECEIVED',
  NotificationApplicationSubmitted = 'NOTIFICATION_APPLICATION_SUBMITTED',
  NotificationCalloutPublished = 'NOTIFICATION_CALLOUT_PUBLISHED',
  NotificationCommentReply = 'NOTIFICATION_COMMENT_REPLY',
  NotificationCommunicationDiscussionCreated = 'NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED',
  NotificationCommunicationDiscussionCreatedAdmin = 'NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED_ADMIN',
  NotificationCommunicationMention = 'NOTIFICATION_COMMUNICATION_MENTION',
  NotificationCommunicationMessage = 'NOTIFICATION_COMMUNICATION_MESSAGE',
  NotificationCommunicationUpdates = 'NOTIFICATION_COMMUNICATION_UPDATES',
  NotificationCommunicationUpdateSentAdmin = 'NOTIFICATION_COMMUNICATION_UPDATE_SENT_ADMIN',
  NotificationCommunityCollaborationInterestAdmin = 'NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_ADMIN',
  NotificationCommunityCollaborationInterestUser = 'NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_USER',
  NotificationCommunityInvitationUser = 'NOTIFICATION_COMMUNITY_INVITATION_USER',
  NotificationCommunityNewMember = 'NOTIFICATION_COMMUNITY_NEW_MEMBER',
  NotificationCommunityNewMemberAdmin = 'NOTIFICATION_COMMUNITY_NEW_MEMBER_ADMIN',
  NotificationCommunityReviewSubmitted = 'NOTIFICATION_COMMUNITY_REVIEW_SUBMITTED',
  NotificationCommunityReviewSubmittedAdmin = 'NOTIFICATION_COMMUNITY_REVIEW_SUBMITTED_ADMIN',
  NotificationDiscussionCommentCreated = 'NOTIFICATION_DISCUSSION_COMMENT_CREATED',
  NotificationForumDiscussionComment = 'NOTIFICATION_FORUM_DISCUSSION_COMMENT',
  NotificationForumDiscussionCreated = 'NOTIFICATION_FORUM_DISCUSSION_CREATED',
  NotificationOrganizationMention = 'NOTIFICATION_ORGANIZATION_MENTION',
  NotificationOrganizationMessage = 'NOTIFICATION_ORGANIZATION_MESSAGE',
  NotificationPostCommentCreated = 'NOTIFICATION_POST_COMMENT_CREATED',
  NotificationPostCreated = 'NOTIFICATION_POST_CREATED',
  NotificationPostCreatedAdmin = 'NOTIFICATION_POST_CREATED_ADMIN',
  NotificationUserRemoved = 'NOTIFICATION_USER_REMOVED',
  NotificationUserSignUp = 'NOTIFICATION_USER_SIGN_UP',
  NotificationWhiteboardCreated = 'NOTIFICATION_WHITEBOARD_CREATED',
}

export type UserSendMessageInput = {
  /** The message being sent */
  message: Scalars['String'];
  /** The user a message is being sent to */
  receivingUserID: Scalars['String'];
};

export type UsersWithAuthorizationCredentialInput = {
  /** The resource to which a credential needs to be bound. */
  resourceID?: InputMaybe<Scalars['UUID']>;
  /** The type of credential. */
  type: AuthorizationCredential;
};

export type VerifiedCredential = {
  /** The time at which the credential is no longer valid */
  claims: Array<VerifiedCredentialClaim>;
  /** JSON for the context in the credential */
  context: Scalars['JSON'];
  /** The time at which the credential is no longer valid */
  expires: Scalars['String'];
  /** The time at which the credential was issued */
  issued: Scalars['String'];
  /** The party issuing the VC */
  issuer: Scalars['String'];
  /** The name of the VC */
  name: Scalars['String'];
  /** The type of VC */
  type: Scalars['String'];
};

export type VerifiedCredentialClaim = {
  /** The name of the claim */
  name: Scalars['JSON'];
  /** The value for the claim */
  value: Scalars['JSON'];
};

export type Visual = {
  allowedTypes: Array<Scalars['String']>;
  alternativeText?: Maybe<Scalars['String']>;
  /** Post ratio width / height. */
  aspectRatio: Scalars['Float'];
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** Maximum height resolution. */
  maxHeight: Scalars['Float'];
  /** Maximum width resolution. */
  maxWidth: Scalars['Float'];
  /** Minimum height resolution. */
  minHeight: Scalars['Float'];
  /** Minimum width resolution. */
  minWidth: Scalars['Float'];
  name: Scalars['String'];
  uri: Scalars['String'];
};

export enum VisualType {
  Avatar = 'AVATAR',
  Banner = 'BANNER',
  Card = 'CARD',
}

export type VisualUploadImageInput = {
  alternativeText?: InputMaybe<Scalars['String']>;
  visualID: Scalars['String'];
};

export type Whiteboard = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The checkout out state of this Whiteboard. */
  checkout?: Maybe<WhiteboardCheckout>;
  /** The user that created this Whiteboard */
  createdBy?: Maybe<User>;
  createdDate: Scalars['DateTime'];
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID'];
  /** The Profile for this Whiteboard. */
  profile: Profile;
  /** The JSON representation of the Whiteboard. */
  value: Scalars['JSON'];
};

export type WhiteboardCheckout = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  lifecycle: Lifecycle;
  /** The id of the user that has checked the entity out. */
  lockedBy: Scalars['UUID'];
  /** The checkout out state of this Whiteboard. */
  status: WhiteboardCheckoutStateEnum;
};

export type WhiteboardCheckoutEventInput = {
  /** Report an error if this event fails to trigger a transition. */
  errorOnFailedTransition?: InputMaybe<Scalars['Boolean']>;
  eventName: Scalars['String'];
  whiteboardCheckoutID: Scalars['UUID'];
};

export enum WhiteboardCheckoutStateEnum {
  Available = 'AVAILABLE',
  CheckedOut = 'CHECKED_OUT',
}

export type WhiteboardContentUpdated = {
  /** The updated content. */
  value: Scalars['String'];
  /** The identifier for the Whiteboard. */
  whiteboardID: Scalars['String'];
};

export type WhiteboardTemplate = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The ID of the entity */
  id: Scalars['UUID'];
  /** The Profile for this template. */
  profile: Profile;
  /** The JSON representation of the Whiteboard. */
  value: Scalars['JSON'];
};

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs
> {
  subscribe: SubscriptionSubscribeFn<
    { [key in TKey]: TResult },
    TParent,
    TContext,
    TArgs
  >;
  resolve?: SubscriptionResolveFn<
    TResult,
    { [key in TKey]: TResult },
    TContext,
    TArgs
  >;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs
> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {}
> =
  | ((
      ...args: any[]
    ) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<
  TResult = {},
  TParent = {},
  TContext = {},
  TArgs = {}
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  APM: ResolverTypeWrapper<Apm>;
  ActivityCreatedSubscriptionInput: ActivityCreatedSubscriptionInput;
  ActivityCreatedSubscriptionResult: ResolverTypeWrapper<
    ActivityCreatedSubscriptionResult
  >;
  ActivityEventType: ActivityEventType;
  ActivityLogEntry:
    | ResolversTypes['ActivityLogEntryCalendarEventCreated']
    | ResolversTypes['ActivityLogEntryCalloutDiscussionComment']
    | ResolversTypes['ActivityLogEntryCalloutLinkCreated']
    | ResolversTypes['ActivityLogEntryCalloutPostComment']
    | ResolversTypes['ActivityLogEntryCalloutPostCreated']
    | ResolversTypes['ActivityLogEntryCalloutPublished']
    | ResolversTypes['ActivityLogEntryCalloutWhiteboardCreated']
    | ResolversTypes['ActivityLogEntryChallengeCreated']
    | ResolversTypes['ActivityLogEntryMemberJoined']
    | ResolversTypes['ActivityLogEntryOpportunityCreated']
    | ResolversTypes['ActivityLogEntryUpdateSent'];
  ActivityLogEntryCalendarEventCreated: ResolverTypeWrapper<
    ActivityLogEntryCalendarEventCreated
  >;
  ActivityLogEntryCalloutDiscussionComment: ResolverTypeWrapper<
    ActivityLogEntryCalloutDiscussionComment
  >;
  ActivityLogEntryCalloutLinkCreated: ResolverTypeWrapper<
    ActivityLogEntryCalloutLinkCreated
  >;
  ActivityLogEntryCalloutPostComment: ResolverTypeWrapper<
    ActivityLogEntryCalloutPostComment
  >;
  ActivityLogEntryCalloutPostCreated: ResolverTypeWrapper<
    ActivityLogEntryCalloutPostCreated
  >;
  ActivityLogEntryCalloutPublished: ResolverTypeWrapper<
    ActivityLogEntryCalloutPublished
  >;
  ActivityLogEntryCalloutWhiteboardCreated: ResolverTypeWrapper<
    ActivityLogEntryCalloutWhiteboardCreated
  >;
  ActivityLogEntryChallengeCreated: ResolverTypeWrapper<
    ActivityLogEntryChallengeCreated
  >;
  ActivityLogEntryMemberJoined: ResolverTypeWrapper<
    ActivityLogEntryMemberJoined
  >;
  ActivityLogEntryOpportunityCreated: ResolverTypeWrapper<
    ActivityLogEntryOpportunityCreated
  >;
  ActivityLogEntryUpdateSent: ResolverTypeWrapper<ActivityLogEntryUpdateSent>;
  ActivityLogInput: ActivityLogInput;
  Actor: ResolverTypeWrapper<Actor>;
  ActorGroup: ResolverTypeWrapper<ActorGroup>;
  AdminInnovationFlowSynchronizeStatesInput: AdminInnovationFlowSynchronizeStatesInput;
  Agent: ResolverTypeWrapper<Agent>;
  AgentBeginVerifiedCredentialOfferOutput: ResolverTypeWrapper<
    AgentBeginVerifiedCredentialOfferOutput
  >;
  AgentBeginVerifiedCredentialRequestOutput: ResolverTypeWrapper<
    AgentBeginVerifiedCredentialRequestOutput
  >;
  Application: ResolverTypeWrapper<Application>;
  ApplicationEventInput: ApplicationEventInput;
  ApplicationForRoleResult: ResolverTypeWrapper<ApplicationForRoleResult>;
  AssignCommunityRoleToOrganizationInput: AssignCommunityRoleToOrganizationInput;
  AssignCommunityRoleToUserInput: AssignCommunityRoleToUserInput;
  AssignGlobalAdminInput: AssignGlobalAdminInput;
  AssignGlobalCommunityAdminInput: AssignGlobalCommunityAdminInput;
  AssignGlobalSpacesAdminInput: AssignGlobalSpacesAdminInput;
  AssignOrganizationAdminInput: AssignOrganizationAdminInput;
  AssignOrganizationAssociateInput: AssignOrganizationAssociateInput;
  AssignOrganizationOwnerInput: AssignOrganizationOwnerInput;
  AssignUserGroupMemberInput: AssignUserGroupMemberInput;
  AuthenticationConfig: ResolverTypeWrapper<AuthenticationConfig>;
  AuthenticationProviderConfig: ResolverTypeWrapper<
    Omit<AuthenticationProviderConfig, 'config'> & {
      config: ResolversTypes['AuthenticationProviderConfigUnion'];
    }
  >;
  AuthenticationProviderConfigUnion: ResolversTypes['OryConfig'];
  Authorization: ResolverTypeWrapper<Authorization>;
  AuthorizationCredential: AuthorizationCredential;
  AuthorizationPolicyRuleCredential: ResolverTypeWrapper<
    AuthorizationPolicyRuleCredential
  >;
  AuthorizationPolicyRulePrivilege: ResolverTypeWrapper<
    AuthorizationPolicyRulePrivilege
  >;
  AuthorizationPolicyRuleVerifiedCredential: ResolverTypeWrapper<
    AuthorizationPolicyRuleVerifiedCredential
  >;
  AuthorizationPrivilege: AuthorizationPrivilege;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
  CID: ResolverTypeWrapper<Scalars['CID']>;
  Calendar: ResolverTypeWrapper<Calendar>;
  CalendarEvent: ResolverTypeWrapper<CalendarEvent>;
  CalendarEventType: CalendarEventType;
  Callout: ResolverTypeWrapper<Callout>;
  CalloutDisplayLocation: CalloutDisplayLocation;
  CalloutPostCreated: ResolverTypeWrapper<CalloutPostCreated>;
  CalloutState: CalloutState;
  CalloutType: CalloutType;
  CalloutVisibility: CalloutVisibility;
  Challenge: ResolverTypeWrapper<Challenge>;
  ChallengeCreated: ResolverTypeWrapper<ChallengeCreated>;
  ChallengePreferenceType: ChallengePreferenceType;
  ChallengeTemplate: ResolverTypeWrapper<ChallengeTemplate>;
  ChatGuidanceInput: ChatGuidanceInput;
  ChatGuidanceResult: ResolverTypeWrapper<ChatGuidanceResult>;
  Collaboration: ResolverTypeWrapper<Collaboration>;
  Communication: ResolverTypeWrapper<Communication>;
  CommunicationAdminEnsureAccessInput: CommunicationAdminEnsureAccessInput;
  CommunicationAdminMembershipInput: CommunicationAdminMembershipInput;
  CommunicationAdminMembershipResult: ResolverTypeWrapper<
    CommunicationAdminMembershipResult
  >;
  CommunicationAdminOrphanedUsageResult: ResolverTypeWrapper<
    CommunicationAdminOrphanedUsageResult
  >;
  CommunicationAdminRemoveOrphanedRoomInput: CommunicationAdminRemoveOrphanedRoomInput;
  CommunicationAdminRoomMembershipResult: ResolverTypeWrapper<
    CommunicationAdminRoomMembershipResult
  >;
  CommunicationAdminRoomResult: ResolverTypeWrapper<
    CommunicationAdminRoomResult
  >;
  CommunicationAdminUpdateRoomsJoinRuleInput: CommunicationAdminUpdateRoomsJoinRuleInput;
  CommunicationCreateDiscussionInput: CommunicationCreateDiscussionInput;
  CommunicationRoom: ResolverTypeWrapper<CommunicationRoom>;
  CommunicationSendMessageToCommunityLeadsInput: CommunicationSendMessageToCommunityLeadsInput;
  CommunicationSendMessageToOrganizationInput: CommunicationSendMessageToOrganizationInput;
  CommunicationSendMessageToUserInput: CommunicationSendMessageToUserInput;
  Community: ResolverTypeWrapper<Community>;
  CommunityApplyInput: CommunityApplyInput;
  CommunityJoinInput: CommunityJoinInput;
  CommunityMembershipStatus: CommunityMembershipStatus;
  CommunityPolicy: ResolverTypeWrapper<CommunityPolicy>;
  CommunityRole: CommunityRole;
  CommunityRolePolicy: ResolverTypeWrapper<CommunityRolePolicy>;
  Config: ResolverTypeWrapper<Config>;
  Context: ResolverTypeWrapper<Context>;
  ContributorFilterInput: ContributorFilterInput;
  ContributorRoles: ResolverTypeWrapper<ContributorRoles>;
  ConvertChallengeToSpaceInput: ConvertChallengeToSpaceInput;
  ConvertOpportunityToChallengeInput: ConvertOpportunityToChallengeInput;
  CreateActorGroupInput: CreateActorGroupInput;
  CreateActorInput: CreateActorInput;
  CreateCalendarEventOnCalendarInput: CreateCalendarEventOnCalendarInput;
  CreateCalloutOnCollaborationInput: CreateCalloutOnCollaborationInput;
  CreateChallengeOnChallengeInput: CreateChallengeOnChallengeInput;
  CreateChallengeOnSpaceInput: CreateChallengeOnSpaceInput;
  CreateContextInput: CreateContextInput;
  CreateFeedbackOnCommunityContextInput: CreateFeedbackOnCommunityContextInput;
  CreateInnovationFlowTemplateOnTemplatesSetInput: CreateInnovationFlowTemplateOnTemplatesSetInput;
  CreateInnovationHubInput: CreateInnovationHubInput;
  CreateInnovationPackOnLibraryInput: CreateInnovationPackOnLibraryInput;
  CreateInvitationExistingUserOnCommunityInput: CreateInvitationExistingUserOnCommunityInput;
  CreateInvitationExternalUserOnCommunityInput: CreateInvitationExternalUserOnCommunityInput;
  CreateLinkOnCalloutInput: CreateLinkOnCalloutInput;
  CreateLocationInput: CreateLocationInput;
  CreateNVPInput: CreateNvpInput;
  CreateOpportunityInput: CreateOpportunityInput;
  CreateOrganizationInput: CreateOrganizationInput;
  CreatePostOnCalloutInput: CreatePostOnCalloutInput;
  CreatePostTemplateInput: CreatePostTemplateInput;
  CreatePostTemplateOnTemplatesSetInput: CreatePostTemplateOnTemplatesSetInput;
  CreateProfileInput: CreateProfileInput;
  CreateProjectInput: CreateProjectInput;
  CreateReferenceInput: CreateReferenceInput;
  CreateReferenceOnProfileInput: CreateReferenceOnProfileInput;
  CreateRelationOnCollaborationInput: CreateRelationOnCollaborationInput;
  CreateSpaceInput: CreateSpaceInput;
  CreateTagsetInput: CreateTagsetInput;
  CreateTagsetOnProfileInput: CreateTagsetOnProfileInput;
  CreateUserGroupInput: CreateUserGroupInput;
  CreateUserInput: CreateUserInput;
  CreateWhiteboardInput: CreateWhiteboardInput;
  CreateWhiteboardOnCalloutInput: CreateWhiteboardOnCalloutInput;
  CreateWhiteboardTemplateInput: CreateWhiteboardTemplateInput;
  CreateWhiteboardTemplateOnTemplatesSetInput: CreateWhiteboardTemplateOnTemplatesSetInput;
  Credential: ResolverTypeWrapper<Credential>;
  CredentialDefinition: ResolverTypeWrapper<CredentialDefinition>;
  CredentialMetadataOutput: ResolverTypeWrapper<CredentialMetadataOutput>;
  DID: ResolverTypeWrapper<Scalars['DID']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']>;
  DeleteActorGroupInput: DeleteActorGroupInput;
  DeleteActorInput: DeleteActorInput;
  DeleteApplicationInput: DeleteApplicationInput;
  DeleteCalendarEventInput: DeleteCalendarEventInput;
  DeleteCalloutInput: DeleteCalloutInput;
  DeleteChallengeInput: DeleteChallengeInput;
  DeleteCollaborationInput: DeleteCollaborationInput;
  DeleteDiscussionInput: DeleteDiscussionInput;
  DeleteDocumentInput: DeleteDocumentInput;
  DeleteInnovationFlowTemplateInput: DeleteInnovationFlowTemplateInput;
  DeleteInnovationHubInput: DeleteInnovationHubInput;
  DeleteInnovationPackInput: DeleteInnovationPackInput;
  DeleteInvitationExternalInput: DeleteInvitationExternalInput;
  DeleteInvitationInput: DeleteInvitationInput;
  DeleteOpportunityInput: DeleteOpportunityInput;
  DeleteOrganizationInput: DeleteOrganizationInput;
  DeletePostInput: DeletePostInput;
  DeletePostTemplateInput: DeletePostTemplateInput;
  DeleteProjectInput: DeleteProjectInput;
  DeleteReferenceInput: DeleteReferenceInput;
  DeleteRelationInput: DeleteRelationInput;
  DeleteSpaceInput: DeleteSpaceInput;
  DeleteUserGroupInput: DeleteUserGroupInput;
  DeleteUserInput: DeleteUserInput;
  DeleteWhiteboardInput: DeleteWhiteboardInput;
  DeleteWhiteboardTemplateInput: DeleteWhiteboardTemplateInput;
  DirectRoom: ResolverTypeWrapper<DirectRoom>;
  Discussion: ResolverTypeWrapper<Discussion>;
  DiscussionCategory: DiscussionCategory;
  Document: ResolverTypeWrapper<Document>;
  EcosystemModel: ResolverTypeWrapper<EcosystemModel>;
  Emoji: ResolverTypeWrapper<Scalars['Emoji']>;
  FeatureFlag: ResolverTypeWrapper<FeatureFlag>;
  FeedbackTemplate: ResolverTypeWrapper<FeedbackTemplate>;
  FileStorageConfig: ResolverTypeWrapper<FileStorageConfig>;
  Float: ResolverTypeWrapper<Scalars['Float']>;
  Form: ResolverTypeWrapper<Form>;
  FormQuestion: ResolverTypeWrapper<FormQuestion>;
  Geo: ResolverTypeWrapper<Geo>;
  GrantAuthorizationCredentialInput: GrantAuthorizationCredentialInput;
  Groupable: ResolversTypes['Community'] | ResolversTypes['Organization'];
  ISearchResults: ResolverTypeWrapper<ISearchResults>;
  InnovationFlow: ResolverTypeWrapper<InnovationFlow>;
  InnovationFlowEvent: InnovationFlowEvent;
  InnovationFlowTemplate: ResolverTypeWrapper<InnovationFlowTemplate>;
  InnovationFlowType: InnovationFlowType;
  InnovationHub: ResolverTypeWrapper<InnovationHub>;
  InnovationHubType: InnovationHubType;
  InnovationPack: ResolverTypeWrapper<InnovationPack>;
  Int: ResolverTypeWrapper<Scalars['Int']>;
  Invitation: ResolverTypeWrapper<Invitation>;
  InvitationEventInput: InvitationEventInput;
  InvitationExternal: ResolverTypeWrapper<InvitationExternal>;
  InvitationForRoleResult: ResolverTypeWrapper<InvitationForRoleResult>;
  JSON: ResolverTypeWrapper<Scalars['JSON']>;
  Library: ResolverTypeWrapper<Library>;
  Lifecycle: ResolverTypeWrapper<Lifecycle>;
  LifecycleDefinition: ResolverTypeWrapper<Scalars['LifecycleDefinition']>;
  Location: ResolverTypeWrapper<Location>;
  LookupQueryResults: ResolverTypeWrapper<LookupQueryResults>;
  Markdown: ResolverTypeWrapper<Scalars['Markdown']>;
  MeQueryResults: ResolverTypeWrapper<MeQueryResults>;
  Message: ResolverTypeWrapper<Message>;
  MessageID: ResolverTypeWrapper<Scalars['MessageID']>;
  Metadata: ResolverTypeWrapper<Metadata>;
  MimeType: MimeType;
  MovePostInput: MovePostInput;
  Mutation: ResolverTypeWrapper<{}>;
  MutationType: MutationType;
  NVP: ResolverTypeWrapper<Nvp>;
  NameID: ResolverTypeWrapper<Scalars['NameID']>;
  Opportunity: ResolverTypeWrapper<Opportunity>;
  OpportunityCreated: ResolverTypeWrapper<OpportunityCreated>;
  Organization: ResolverTypeWrapper<Organization>;
  OrganizationAuthorizationResetInput: OrganizationAuthorizationResetInput;
  OrganizationFilterInput: OrganizationFilterInput;
  OrganizationPreferenceType: OrganizationPreferenceType;
  OrganizationVerification: ResolverTypeWrapper<OrganizationVerification>;
  OrganizationVerificationEnum: OrganizationVerificationEnum;
  OrganizationVerificationEventInput: OrganizationVerificationEventInput;
  OryConfig: ResolverTypeWrapper<OryConfig>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PaginatedOrganization: ResolverTypeWrapper<PaginatedOrganization>;
  PaginatedUsers: ResolverTypeWrapper<PaginatedUsers>;
  Platform: ResolverTypeWrapper<Platform>;
  PlatformLocations: ResolverTypeWrapper<PlatformLocations>;
  Post: ResolverTypeWrapper<Post>;
  PostTemplate: ResolverTypeWrapper<PostTemplate>;
  Preference: ResolverTypeWrapper<Preference>;
  PreferenceDefinition: ResolverTypeWrapper<PreferenceDefinition>;
  PreferenceType: PreferenceType;
  PreferenceValueType: PreferenceValueType;
  Profile: ResolverTypeWrapper<Profile>;
  ProfileCredentialVerified: ResolverTypeWrapper<ProfileCredentialVerified>;
  Project: ResolverTypeWrapper<Project>;
  ProjectEventInput: ProjectEventInput;
  Query: ResolverTypeWrapper<{}>;
  Question: ResolverTypeWrapper<Question>;
  QuestionTemplate: ResolverTypeWrapper<QuestionTemplate>;
  Reaction: ResolverTypeWrapper<Reaction>;
  Reference: ResolverTypeWrapper<Reference>;
  Relation: ResolverTypeWrapper<Relation>;
  RelayPaginatedUser: ResolverTypeWrapper<RelayPaginatedUser>;
  RelayPaginatedUserEdge: ResolverTypeWrapper<RelayPaginatedUserEdge>;
  RelayPaginatedUserPageInfo: ResolverTypeWrapper<RelayPaginatedUserPageInfo>;
  RemoveCommunityRoleFromOrganizationInput: RemoveCommunityRoleFromOrganizationInput;
  RemoveCommunityRoleFromUserInput: RemoveCommunityRoleFromUserInput;
  RemoveGlobalAdminInput: RemoveGlobalAdminInput;
  RemoveGlobalCommunityAdminInput: RemoveGlobalCommunityAdminInput;
  RemoveGlobalSpacesAdminInput: RemoveGlobalSpacesAdminInput;
  RemoveOrganizationAdminInput: RemoveOrganizationAdminInput;
  RemoveOrganizationAssociateInput: RemoveOrganizationAssociateInput;
  RemoveOrganizationOwnerInput: RemoveOrganizationOwnerInput;
  RemoveUserGroupMemberInput: RemoveUserGroupMemberInput;
  RevokeAuthorizationCredentialInput: RevokeAuthorizationCredentialInput;
  RolesOrganizationInput: RolesOrganizationInput;
  RolesResult: ResolverTypeWrapper<RolesResult>;
  RolesResultCommunity: ResolverTypeWrapper<RolesResultCommunity>;
  RolesResultOrganization: ResolverTypeWrapper<RolesResultOrganization>;
  RolesResultSpace: ResolverTypeWrapper<RolesResultSpace>;
  RolesUserInput: RolesUserInput;
  Room: ResolverTypeWrapper<Room>;
  RoomAddReactionToMessageInput: RoomAddReactionToMessageInput;
  RoomEventSubscriptionResult: ResolverTypeWrapper<RoomEventSubscriptionResult>;
  RoomMessageEventSubscriptionResult: ResolverTypeWrapper<
    RoomMessageEventSubscriptionResult
  >;
  RoomMessageReactionEventSubscriptionResult: ResolverTypeWrapper<
    RoomMessageReactionEventSubscriptionResult
  >;
  RoomRemoveMessageInput: RoomRemoveMessageInput;
  RoomRemoveReactionToMessageInput: RoomRemoveReactionToMessageInput;
  RoomSendMessageInput: RoomSendMessageInput;
  RoomSendMessageReplyInput: RoomSendMessageReplyInput;
  SearchInput: SearchInput;
  SearchResult:
    | ResolversTypes['SearchResultChallenge']
    | ResolversTypes['SearchResultOpportunity']
    | ResolversTypes['SearchResultOrganization']
    | ResolversTypes['SearchResultPost']
    | ResolversTypes['SearchResultSpace']
    | ResolversTypes['SearchResultUser']
    | ResolversTypes['SearchResultUserGroup'];
  SearchResultChallenge: ResolverTypeWrapper<SearchResultChallenge>;
  SearchResultOpportunity: ResolverTypeWrapper<SearchResultOpportunity>;
  SearchResultOrganization: ResolverTypeWrapper<SearchResultOrganization>;
  SearchResultPost: ResolverTypeWrapper<SearchResultPost>;
  SearchResultSpace: ResolverTypeWrapper<SearchResultSpace>;
  SearchResultType: SearchResultType;
  SearchResultUser: ResolverTypeWrapper<SearchResultUser>;
  SearchResultUserGroup: ResolverTypeWrapper<SearchResultUserGroup>;
  Sentry: ResolverTypeWrapper<Sentry>;
  ServiceMetadata: ResolverTypeWrapper<ServiceMetadata>;
  Space: ResolverTypeWrapper<Space>;
  SpaceAuthorizationResetInput: SpaceAuthorizationResetInput;
  SpaceFilterInput: SpaceFilterInput;
  SpacePreferenceType: SpacePreferenceType;
  SpaceVisibility: SpaceVisibility;
  StorageBucket: ResolverTypeWrapper<StorageBucket>;
  StorageBucketUploadFileInput: StorageBucketUploadFileInput;
  StorageBucketUploadFileOnReferenceInput: StorageBucketUploadFileOnReferenceInput;
  StorageConfig: ResolverTypeWrapper<StorageConfig>;
  String: ResolverTypeWrapper<Scalars['String']>;
  Subscription: ResolverTypeWrapper<{}>;
  Tagset: ResolverTypeWrapper<Tagset>;
  TagsetArgs: TagsetArgs;
  TagsetReservedName: TagsetReservedName;
  TagsetTemplate: ResolverTypeWrapper<TagsetTemplate>;
  TagsetType: TagsetType;
  Template: ResolverTypeWrapper<Template>;
  TemplatesSet: ResolverTypeWrapper<TemplatesSet>;
  TemplatesSetPolicy: ResolverTypeWrapper<TemplatesSetPolicy>;
  Timeline: ResolverTypeWrapper<Timeline>;
  UUID: ResolverTypeWrapper<Scalars['UUID']>;
  UUID_NAMEID: ResolverTypeWrapper<Scalars['UUID_NAMEID']>;
  UUID_NAMEID_EMAIL: ResolverTypeWrapper<Scalars['UUID_NAMEID_EMAIL']>;
  UpdateActorInput: UpdateActorInput;
  UpdateCalendarEventInput: UpdateCalendarEventInput;
  UpdateCalloutInput: UpdateCalloutInput;
  UpdateCalloutPostTemplateInput: UpdateCalloutPostTemplateInput;
  UpdateCalloutPublishInfoInput: UpdateCalloutPublishInfoInput;
  UpdateCalloutVisibilityInput: UpdateCalloutVisibilityInput;
  UpdateCalloutWhiteboardTemplateInput: UpdateCalloutWhiteboardTemplateInput;
  UpdateChallengeInput: UpdateChallengeInput;
  UpdateChallengePreferenceInput: UpdateChallengePreferenceInput;
  UpdateCollaborationCalloutsSortOrderInput: UpdateCollaborationCalloutsSortOrderInput;
  UpdateCommunityApplicationFormInput: UpdateCommunityApplicationFormInput;
  UpdateContextInput: UpdateContextInput;
  UpdateDiscussionInput: UpdateDiscussionInput;
  UpdateDocumentInput: UpdateDocumentInput;
  UpdateEcosystemModelInput: UpdateEcosystemModelInput;
  UpdateFormInput: UpdateFormInput;
  UpdateFormQuestionInput: UpdateFormQuestionInput;
  UpdateInnovationFlowInput: UpdateInnovationFlowInput;
  UpdateInnovationFlowLifecycleTemplateInput: UpdateInnovationFlowLifecycleTemplateInput;
  UpdateInnovationFlowTemplateInput: UpdateInnovationFlowTemplateInput;
  UpdateInnovationHubInput: UpdateInnovationHubInput;
  UpdateInnovationPackInput: UpdateInnovationPackInput;
  UpdateLocationInput: UpdateLocationInput;
  UpdateOpportunityInput: UpdateOpportunityInput;
  UpdateOrganizationInput: UpdateOrganizationInput;
  UpdateOrganizationPreferenceInput: UpdateOrganizationPreferenceInput;
  UpdatePostInput: UpdatePostInput;
  UpdatePostTemplateInput: UpdatePostTemplateInput;
  UpdateProfileDirectInput: UpdateProfileDirectInput;
  UpdateProfileInput: UpdateProfileInput;
  UpdateProjectInput: UpdateProjectInput;
  UpdateReferenceInput: UpdateReferenceInput;
  UpdateSpaceInput: UpdateSpaceInput;
  UpdateSpacePlatformSettingsInput: UpdateSpacePlatformSettingsInput;
  UpdateSpacePreferenceInput: UpdateSpacePreferenceInput;
  UpdateTagsetInput: UpdateTagsetInput;
  UpdateUserGroupInput: UpdateUserGroupInput;
  UpdateUserInput: UpdateUserInput;
  UpdateUserPreferenceInput: UpdateUserPreferenceInput;
  UpdateVisualInput: UpdateVisualInput;
  UpdateWhiteboardDirectInput: UpdateWhiteboardDirectInput;
  UpdateWhiteboardTemplateInput: UpdateWhiteboardTemplateInput;
  Upload: ResolverTypeWrapper<Scalars['Upload']>;
  User: ResolverTypeWrapper<User>;
  UserAuthorizationPrivilegesInput: UserAuthorizationPrivilegesInput;
  UserAuthorizationResetInput: UserAuthorizationResetInput;
  UserFilterInput: UserFilterInput;
  UserGroup: ResolverTypeWrapper<UserGroup>;
  UserPreferenceType: UserPreferenceType;
  UserSendMessageInput: UserSendMessageInput;
  UsersWithAuthorizationCredentialInput: UsersWithAuthorizationCredentialInput;
  VerifiedCredential: ResolverTypeWrapper<VerifiedCredential>;
  VerifiedCredentialClaim: ResolverTypeWrapper<VerifiedCredentialClaim>;
  Visual: ResolverTypeWrapper<Visual>;
  VisualType: VisualType;
  VisualUploadImageInput: VisualUploadImageInput;
  Whiteboard: ResolverTypeWrapper<Whiteboard>;
  WhiteboardCheckout: ResolverTypeWrapper<WhiteboardCheckout>;
  WhiteboardCheckoutEventInput: WhiteboardCheckoutEventInput;
  WhiteboardCheckoutStateEnum: WhiteboardCheckoutStateEnum;
  WhiteboardContentUpdated: ResolverTypeWrapper<WhiteboardContentUpdated>;
  WhiteboardTemplate: ResolverTypeWrapper<WhiteboardTemplate>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  APM: Apm;
  ActivityCreatedSubscriptionInput: ActivityCreatedSubscriptionInput;
  ActivityCreatedSubscriptionResult: ActivityCreatedSubscriptionResult;
  ActivityLogEntry:
    | ResolversParentTypes['ActivityLogEntryCalendarEventCreated']
    | ResolversParentTypes['ActivityLogEntryCalloutDiscussionComment']
    | ResolversParentTypes['ActivityLogEntryCalloutLinkCreated']
    | ResolversParentTypes['ActivityLogEntryCalloutPostComment']
    | ResolversParentTypes['ActivityLogEntryCalloutPostCreated']
    | ResolversParentTypes['ActivityLogEntryCalloutPublished']
    | ResolversParentTypes['ActivityLogEntryCalloutWhiteboardCreated']
    | ResolversParentTypes['ActivityLogEntryChallengeCreated']
    | ResolversParentTypes['ActivityLogEntryMemberJoined']
    | ResolversParentTypes['ActivityLogEntryOpportunityCreated']
    | ResolversParentTypes['ActivityLogEntryUpdateSent'];
  ActivityLogEntryCalendarEventCreated: ActivityLogEntryCalendarEventCreated;
  ActivityLogEntryCalloutDiscussionComment: ActivityLogEntryCalloutDiscussionComment;
  ActivityLogEntryCalloutLinkCreated: ActivityLogEntryCalloutLinkCreated;
  ActivityLogEntryCalloutPostComment: ActivityLogEntryCalloutPostComment;
  ActivityLogEntryCalloutPostCreated: ActivityLogEntryCalloutPostCreated;
  ActivityLogEntryCalloutPublished: ActivityLogEntryCalloutPublished;
  ActivityLogEntryCalloutWhiteboardCreated: ActivityLogEntryCalloutWhiteboardCreated;
  ActivityLogEntryChallengeCreated: ActivityLogEntryChallengeCreated;
  ActivityLogEntryMemberJoined: ActivityLogEntryMemberJoined;
  ActivityLogEntryOpportunityCreated: ActivityLogEntryOpportunityCreated;
  ActivityLogEntryUpdateSent: ActivityLogEntryUpdateSent;
  ActivityLogInput: ActivityLogInput;
  Actor: Actor;
  ActorGroup: ActorGroup;
  AdminInnovationFlowSynchronizeStatesInput: AdminInnovationFlowSynchronizeStatesInput;
  Agent: Agent;
  AgentBeginVerifiedCredentialOfferOutput: AgentBeginVerifiedCredentialOfferOutput;
  AgentBeginVerifiedCredentialRequestOutput: AgentBeginVerifiedCredentialRequestOutput;
  Application: Application;
  ApplicationEventInput: ApplicationEventInput;
  ApplicationForRoleResult: ApplicationForRoleResult;
  AssignCommunityRoleToOrganizationInput: AssignCommunityRoleToOrganizationInput;
  AssignCommunityRoleToUserInput: AssignCommunityRoleToUserInput;
  AssignGlobalAdminInput: AssignGlobalAdminInput;
  AssignGlobalCommunityAdminInput: AssignGlobalCommunityAdminInput;
  AssignGlobalSpacesAdminInput: AssignGlobalSpacesAdminInput;
  AssignOrganizationAdminInput: AssignOrganizationAdminInput;
  AssignOrganizationAssociateInput: AssignOrganizationAssociateInput;
  AssignOrganizationOwnerInput: AssignOrganizationOwnerInput;
  AssignUserGroupMemberInput: AssignUserGroupMemberInput;
  AuthenticationConfig: AuthenticationConfig;
  AuthenticationProviderConfig: Omit<AuthenticationProviderConfig, 'config'> & {
    config: ResolversParentTypes['AuthenticationProviderConfigUnion'];
  };
  AuthenticationProviderConfigUnion: ResolversParentTypes['OryConfig'];
  Authorization: Authorization;
  AuthorizationPolicyRuleCredential: AuthorizationPolicyRuleCredential;
  AuthorizationPolicyRulePrivilege: AuthorizationPolicyRulePrivilege;
  AuthorizationPolicyRuleVerifiedCredential: AuthorizationPolicyRuleVerifiedCredential;
  Boolean: Scalars['Boolean'];
  CID: Scalars['CID'];
  Calendar: Calendar;
  CalendarEvent: CalendarEvent;
  Callout: Callout;
  CalloutPostCreated: CalloutPostCreated;
  Challenge: Challenge;
  ChallengeCreated: ChallengeCreated;
  ChallengeTemplate: ChallengeTemplate;
  ChatGuidanceInput: ChatGuidanceInput;
  ChatGuidanceResult: ChatGuidanceResult;
  Collaboration: Collaboration;
  Communication: Communication;
  CommunicationAdminEnsureAccessInput: CommunicationAdminEnsureAccessInput;
  CommunicationAdminMembershipInput: CommunicationAdminMembershipInput;
  CommunicationAdminMembershipResult: CommunicationAdminMembershipResult;
  CommunicationAdminOrphanedUsageResult: CommunicationAdminOrphanedUsageResult;
  CommunicationAdminRemoveOrphanedRoomInput: CommunicationAdminRemoveOrphanedRoomInput;
  CommunicationAdminRoomMembershipResult: CommunicationAdminRoomMembershipResult;
  CommunicationAdminRoomResult: CommunicationAdminRoomResult;
  CommunicationAdminUpdateRoomsJoinRuleInput: CommunicationAdminUpdateRoomsJoinRuleInput;
  CommunicationCreateDiscussionInput: CommunicationCreateDiscussionInput;
  CommunicationRoom: CommunicationRoom;
  CommunicationSendMessageToCommunityLeadsInput: CommunicationSendMessageToCommunityLeadsInput;
  CommunicationSendMessageToOrganizationInput: CommunicationSendMessageToOrganizationInput;
  CommunicationSendMessageToUserInput: CommunicationSendMessageToUserInput;
  Community: Community;
  CommunityApplyInput: CommunityApplyInput;
  CommunityJoinInput: CommunityJoinInput;
  CommunityPolicy: CommunityPolicy;
  CommunityRolePolicy: CommunityRolePolicy;
  Config: Config;
  Context: Context;
  ContributorFilterInput: ContributorFilterInput;
  ContributorRoles: ContributorRoles;
  ConvertChallengeToSpaceInput: ConvertChallengeToSpaceInput;
  ConvertOpportunityToChallengeInput: ConvertOpportunityToChallengeInput;
  CreateActorGroupInput: CreateActorGroupInput;
  CreateActorInput: CreateActorInput;
  CreateCalendarEventOnCalendarInput: CreateCalendarEventOnCalendarInput;
  CreateCalloutOnCollaborationInput: CreateCalloutOnCollaborationInput;
  CreateChallengeOnChallengeInput: CreateChallengeOnChallengeInput;
  CreateChallengeOnSpaceInput: CreateChallengeOnSpaceInput;
  CreateContextInput: CreateContextInput;
  CreateFeedbackOnCommunityContextInput: CreateFeedbackOnCommunityContextInput;
  CreateInnovationFlowTemplateOnTemplatesSetInput: CreateInnovationFlowTemplateOnTemplatesSetInput;
  CreateInnovationHubInput: CreateInnovationHubInput;
  CreateInnovationPackOnLibraryInput: CreateInnovationPackOnLibraryInput;
  CreateInvitationExistingUserOnCommunityInput: CreateInvitationExistingUserOnCommunityInput;
  CreateInvitationExternalUserOnCommunityInput: CreateInvitationExternalUserOnCommunityInput;
  CreateLinkOnCalloutInput: CreateLinkOnCalloutInput;
  CreateLocationInput: CreateLocationInput;
  CreateNVPInput: CreateNvpInput;
  CreateOpportunityInput: CreateOpportunityInput;
  CreateOrganizationInput: CreateOrganizationInput;
  CreatePostOnCalloutInput: CreatePostOnCalloutInput;
  CreatePostTemplateInput: CreatePostTemplateInput;
  CreatePostTemplateOnTemplatesSetInput: CreatePostTemplateOnTemplatesSetInput;
  CreateProfileInput: CreateProfileInput;
  CreateProjectInput: CreateProjectInput;
  CreateReferenceInput: CreateReferenceInput;
  CreateReferenceOnProfileInput: CreateReferenceOnProfileInput;
  CreateRelationOnCollaborationInput: CreateRelationOnCollaborationInput;
  CreateSpaceInput: CreateSpaceInput;
  CreateTagsetInput: CreateTagsetInput;
  CreateTagsetOnProfileInput: CreateTagsetOnProfileInput;
  CreateUserGroupInput: CreateUserGroupInput;
  CreateUserInput: CreateUserInput;
  CreateWhiteboardInput: CreateWhiteboardInput;
  CreateWhiteboardOnCalloutInput: CreateWhiteboardOnCalloutInput;
  CreateWhiteboardTemplateInput: CreateWhiteboardTemplateInput;
  CreateWhiteboardTemplateOnTemplatesSetInput: CreateWhiteboardTemplateOnTemplatesSetInput;
  Credential: Credential;
  CredentialDefinition: CredentialDefinition;
  CredentialMetadataOutput: CredentialMetadataOutput;
  DID: Scalars['DID'];
  DateTime: Scalars['DateTime'];
  DeleteActorGroupInput: DeleteActorGroupInput;
  DeleteActorInput: DeleteActorInput;
  DeleteApplicationInput: DeleteApplicationInput;
  DeleteCalendarEventInput: DeleteCalendarEventInput;
  DeleteCalloutInput: DeleteCalloutInput;
  DeleteChallengeInput: DeleteChallengeInput;
  DeleteCollaborationInput: DeleteCollaborationInput;
  DeleteDiscussionInput: DeleteDiscussionInput;
  DeleteDocumentInput: DeleteDocumentInput;
  DeleteInnovationFlowTemplateInput: DeleteInnovationFlowTemplateInput;
  DeleteInnovationHubInput: DeleteInnovationHubInput;
  DeleteInnovationPackInput: DeleteInnovationPackInput;
  DeleteInvitationExternalInput: DeleteInvitationExternalInput;
  DeleteInvitationInput: DeleteInvitationInput;
  DeleteOpportunityInput: DeleteOpportunityInput;
  DeleteOrganizationInput: DeleteOrganizationInput;
  DeletePostInput: DeletePostInput;
  DeletePostTemplateInput: DeletePostTemplateInput;
  DeleteProjectInput: DeleteProjectInput;
  DeleteReferenceInput: DeleteReferenceInput;
  DeleteRelationInput: DeleteRelationInput;
  DeleteSpaceInput: DeleteSpaceInput;
  DeleteUserGroupInput: DeleteUserGroupInput;
  DeleteUserInput: DeleteUserInput;
  DeleteWhiteboardInput: DeleteWhiteboardInput;
  DeleteWhiteboardTemplateInput: DeleteWhiteboardTemplateInput;
  DirectRoom: DirectRoom;
  Discussion: Discussion;
  Document: Document;
  EcosystemModel: EcosystemModel;
  Emoji: Scalars['Emoji'];
  FeatureFlag: FeatureFlag;
  FeedbackTemplate: FeedbackTemplate;
  FileStorageConfig: FileStorageConfig;
  Float: Scalars['Float'];
  Form: Form;
  FormQuestion: FormQuestion;
  Geo: Geo;
  GrantAuthorizationCredentialInput: GrantAuthorizationCredentialInput;
  Groupable:
    | ResolversParentTypes['Community']
    | ResolversParentTypes['Organization'];
  ISearchResults: ISearchResults;
  InnovationFlow: InnovationFlow;
  InnovationFlowEvent: InnovationFlowEvent;
  InnovationFlowTemplate: InnovationFlowTemplate;
  InnovationHub: InnovationHub;
  InnovationPack: InnovationPack;
  Int: Scalars['Int'];
  Invitation: Invitation;
  InvitationEventInput: InvitationEventInput;
  InvitationExternal: InvitationExternal;
  InvitationForRoleResult: InvitationForRoleResult;
  JSON: Scalars['JSON'];
  Library: Library;
  Lifecycle: Lifecycle;
  LifecycleDefinition: Scalars['LifecycleDefinition'];
  Location: Location;
  LookupQueryResults: LookupQueryResults;
  Markdown: Scalars['Markdown'];
  MeQueryResults: MeQueryResults;
  Message: Message;
  MessageID: Scalars['MessageID'];
  Metadata: Metadata;
  MovePostInput: MovePostInput;
  Mutation: {};
  NVP: Nvp;
  NameID: Scalars['NameID'];
  Opportunity: Opportunity;
  OpportunityCreated: OpportunityCreated;
  Organization: Organization;
  OrganizationAuthorizationResetInput: OrganizationAuthorizationResetInput;
  OrganizationFilterInput: OrganizationFilterInput;
  OrganizationVerification: OrganizationVerification;
  OrganizationVerificationEventInput: OrganizationVerificationEventInput;
  OryConfig: OryConfig;
  PageInfo: PageInfo;
  PaginatedOrganization: PaginatedOrganization;
  PaginatedUsers: PaginatedUsers;
  Platform: Platform;
  PlatformLocations: PlatformLocations;
  Post: Post;
  PostTemplate: PostTemplate;
  Preference: Preference;
  PreferenceDefinition: PreferenceDefinition;
  Profile: Profile;
  ProfileCredentialVerified: ProfileCredentialVerified;
  Project: Project;
  ProjectEventInput: ProjectEventInput;
  Query: {};
  Question: Question;
  QuestionTemplate: QuestionTemplate;
  Reaction: Reaction;
  Reference: Reference;
  Relation: Relation;
  RelayPaginatedUser: RelayPaginatedUser;
  RelayPaginatedUserEdge: RelayPaginatedUserEdge;
  RelayPaginatedUserPageInfo: RelayPaginatedUserPageInfo;
  RemoveCommunityRoleFromOrganizationInput: RemoveCommunityRoleFromOrganizationInput;
  RemoveCommunityRoleFromUserInput: RemoveCommunityRoleFromUserInput;
  RemoveGlobalAdminInput: RemoveGlobalAdminInput;
  RemoveGlobalCommunityAdminInput: RemoveGlobalCommunityAdminInput;
  RemoveGlobalSpacesAdminInput: RemoveGlobalSpacesAdminInput;
  RemoveOrganizationAdminInput: RemoveOrganizationAdminInput;
  RemoveOrganizationAssociateInput: RemoveOrganizationAssociateInput;
  RemoveOrganizationOwnerInput: RemoveOrganizationOwnerInput;
  RemoveUserGroupMemberInput: RemoveUserGroupMemberInput;
  RevokeAuthorizationCredentialInput: RevokeAuthorizationCredentialInput;
  RolesOrganizationInput: RolesOrganizationInput;
  RolesResult: RolesResult;
  RolesResultCommunity: RolesResultCommunity;
  RolesResultOrganization: RolesResultOrganization;
  RolesResultSpace: RolesResultSpace;
  RolesUserInput: RolesUserInput;
  Room: Room;
  RoomAddReactionToMessageInput: RoomAddReactionToMessageInput;
  RoomEventSubscriptionResult: RoomEventSubscriptionResult;
  RoomMessageEventSubscriptionResult: RoomMessageEventSubscriptionResult;
  RoomMessageReactionEventSubscriptionResult: RoomMessageReactionEventSubscriptionResult;
  RoomRemoveMessageInput: RoomRemoveMessageInput;
  RoomRemoveReactionToMessageInput: RoomRemoveReactionToMessageInput;
  RoomSendMessageInput: RoomSendMessageInput;
  RoomSendMessageReplyInput: RoomSendMessageReplyInput;
  SearchInput: SearchInput;
  SearchResult:
    | ResolversParentTypes['SearchResultChallenge']
    | ResolversParentTypes['SearchResultOpportunity']
    | ResolversParentTypes['SearchResultOrganization']
    | ResolversParentTypes['SearchResultPost']
    | ResolversParentTypes['SearchResultSpace']
    | ResolversParentTypes['SearchResultUser']
    | ResolversParentTypes['SearchResultUserGroup'];
  SearchResultChallenge: SearchResultChallenge;
  SearchResultOpportunity: SearchResultOpportunity;
  SearchResultOrganization: SearchResultOrganization;
  SearchResultPost: SearchResultPost;
  SearchResultSpace: SearchResultSpace;
  SearchResultUser: SearchResultUser;
  SearchResultUserGroup: SearchResultUserGroup;
  Sentry: Sentry;
  ServiceMetadata: ServiceMetadata;
  Space: Space;
  SpaceAuthorizationResetInput: SpaceAuthorizationResetInput;
  SpaceFilterInput: SpaceFilterInput;
  StorageBucket: StorageBucket;
  StorageBucketUploadFileInput: StorageBucketUploadFileInput;
  StorageBucketUploadFileOnReferenceInput: StorageBucketUploadFileOnReferenceInput;
  StorageConfig: StorageConfig;
  String: Scalars['String'];
  Subscription: {};
  Tagset: Tagset;
  TagsetArgs: TagsetArgs;
  TagsetTemplate: TagsetTemplate;
  Template: Template;
  TemplatesSet: TemplatesSet;
  TemplatesSetPolicy: TemplatesSetPolicy;
  Timeline: Timeline;
  UUID: Scalars['UUID'];
  UUID_NAMEID: Scalars['UUID_NAMEID'];
  UUID_NAMEID_EMAIL: Scalars['UUID_NAMEID_EMAIL'];
  UpdateActorInput: UpdateActorInput;
  UpdateCalendarEventInput: UpdateCalendarEventInput;
  UpdateCalloutInput: UpdateCalloutInput;
  UpdateCalloutPostTemplateInput: UpdateCalloutPostTemplateInput;
  UpdateCalloutPublishInfoInput: UpdateCalloutPublishInfoInput;
  UpdateCalloutVisibilityInput: UpdateCalloutVisibilityInput;
  UpdateCalloutWhiteboardTemplateInput: UpdateCalloutWhiteboardTemplateInput;
  UpdateChallengeInput: UpdateChallengeInput;
  UpdateChallengePreferenceInput: UpdateChallengePreferenceInput;
  UpdateCollaborationCalloutsSortOrderInput: UpdateCollaborationCalloutsSortOrderInput;
  UpdateCommunityApplicationFormInput: UpdateCommunityApplicationFormInput;
  UpdateContextInput: UpdateContextInput;
  UpdateDiscussionInput: UpdateDiscussionInput;
  UpdateDocumentInput: UpdateDocumentInput;
  UpdateEcosystemModelInput: UpdateEcosystemModelInput;
  UpdateFormInput: UpdateFormInput;
  UpdateFormQuestionInput: UpdateFormQuestionInput;
  UpdateInnovationFlowInput: UpdateInnovationFlowInput;
  UpdateInnovationFlowLifecycleTemplateInput: UpdateInnovationFlowLifecycleTemplateInput;
  UpdateInnovationFlowTemplateInput: UpdateInnovationFlowTemplateInput;
  UpdateInnovationHubInput: UpdateInnovationHubInput;
  UpdateInnovationPackInput: UpdateInnovationPackInput;
  UpdateLocationInput: UpdateLocationInput;
  UpdateOpportunityInput: UpdateOpportunityInput;
  UpdateOrganizationInput: UpdateOrganizationInput;
  UpdateOrganizationPreferenceInput: UpdateOrganizationPreferenceInput;
  UpdatePostInput: UpdatePostInput;
  UpdatePostTemplateInput: UpdatePostTemplateInput;
  UpdateProfileDirectInput: UpdateProfileDirectInput;
  UpdateProfileInput: UpdateProfileInput;
  UpdateProjectInput: UpdateProjectInput;
  UpdateReferenceInput: UpdateReferenceInput;
  UpdateSpaceInput: UpdateSpaceInput;
  UpdateSpacePlatformSettingsInput: UpdateSpacePlatformSettingsInput;
  UpdateSpacePreferenceInput: UpdateSpacePreferenceInput;
  UpdateTagsetInput: UpdateTagsetInput;
  UpdateUserGroupInput: UpdateUserGroupInput;
  UpdateUserInput: UpdateUserInput;
  UpdateUserPreferenceInput: UpdateUserPreferenceInput;
  UpdateVisualInput: UpdateVisualInput;
  UpdateWhiteboardDirectInput: UpdateWhiteboardDirectInput;
  UpdateWhiteboardTemplateInput: UpdateWhiteboardTemplateInput;
  Upload: Scalars['Upload'];
  User: User;
  UserAuthorizationPrivilegesInput: UserAuthorizationPrivilegesInput;
  UserAuthorizationResetInput: UserAuthorizationResetInput;
  UserFilterInput: UserFilterInput;
  UserGroup: UserGroup;
  UserSendMessageInput: UserSendMessageInput;
  UsersWithAuthorizationCredentialInput: UsersWithAuthorizationCredentialInput;
  VerifiedCredential: VerifiedCredential;
  VerifiedCredentialClaim: VerifiedCredentialClaim;
  Visual: Visual;
  VisualUploadImageInput: VisualUploadImageInput;
  Whiteboard: Whiteboard;
  WhiteboardCheckout: WhiteboardCheckout;
  WhiteboardCheckoutEventInput: WhiteboardCheckoutEventInput;
  WhiteboardContentUpdated: WhiteboardContentUpdated;
  WhiteboardTemplate: WhiteboardTemplate;
};

export type ApmResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['APM'] = ResolversParentTypes['APM']
> = {
  endpoint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rumEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityCreatedSubscriptionResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityCreatedSubscriptionResult'] = ResolversParentTypes['ActivityCreatedSubscriptionResult']
> = {
  activity?: Resolver<
    ResolversTypes['ActivityLogEntry'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityLogEntry'] = ResolversParentTypes['ActivityLogEntry']
> = {
  __resolveType: TypeResolveFn<
    | 'ActivityLogEntryCalendarEventCreated'
    | 'ActivityLogEntryCalloutDiscussionComment'
    | 'ActivityLogEntryCalloutLinkCreated'
    | 'ActivityLogEntryCalloutPostComment'
    | 'ActivityLogEntryCalloutPostCreated'
    | 'ActivityLogEntryCalloutPublished'
    | 'ActivityLogEntryCalloutWhiteboardCreated'
    | 'ActivityLogEntryChallengeCreated'
    | 'ActivityLogEntryMemberJoined'
    | 'ActivityLogEntryOpportunityCreated'
    | 'ActivityLogEntryUpdateSent',
    ParentType,
    ContextType
  >;
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
};

export type ActivityLogEntryCalendarEventCreatedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityLogEntryCalendarEventCreated'] = ResolversParentTypes['ActivityLogEntryCalendarEventCreated']
> = {
  calendar?: Resolver<ResolversTypes['Calendar'], ParentType, ContextType>;
  calendarEvent?: Resolver<
    ResolversTypes['CalendarEvent'],
    ParentType,
    ContextType
  >;
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutDiscussionCommentResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityLogEntryCalloutDiscussionComment'] = ResolversParentTypes['ActivityLogEntryCalloutDiscussionComment']
> = {
  callout?: Resolver<ResolversTypes['Callout'], ParentType, ContextType>;
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutLinkCreatedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityLogEntryCalloutLinkCreated'] = ResolversParentTypes['ActivityLogEntryCalloutLinkCreated']
> = {
  callout?: Resolver<ResolversTypes['Callout'], ParentType, ContextType>;
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  reference?: Resolver<ResolversTypes['Reference'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutPostCommentResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityLogEntryCalloutPostComment'] = ResolversParentTypes['ActivityLogEntryCalloutPostComment']
> = {
  callout?: Resolver<ResolversTypes['Callout'], ParentType, ContextType>;
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  post?: Resolver<ResolversTypes['Post'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutPostCreatedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityLogEntryCalloutPostCreated'] = ResolversParentTypes['ActivityLogEntryCalloutPostCreated']
> = {
  callout?: Resolver<ResolversTypes['Callout'], ParentType, ContextType>;
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  post?: Resolver<ResolversTypes['Post'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutPublishedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityLogEntryCalloutPublished'] = ResolversParentTypes['ActivityLogEntryCalloutPublished']
> = {
  callout?: Resolver<ResolversTypes['Callout'], ParentType, ContextType>;
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutWhiteboardCreatedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityLogEntryCalloutWhiteboardCreated'] = ResolversParentTypes['ActivityLogEntryCalloutWhiteboardCreated']
> = {
  callout?: Resolver<ResolversTypes['Callout'], ParentType, ContextType>;
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  whiteboard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryChallengeCreatedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityLogEntryChallengeCreated'] = ResolversParentTypes['ActivityLogEntryChallengeCreated']
> = {
  challenge?: Resolver<ResolversTypes['Challenge'], ParentType, ContextType>;
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryMemberJoinedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityLogEntryMemberJoined'] = ResolversParentTypes['ActivityLogEntryMemberJoined']
> = {
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  community?: Resolver<ResolversTypes['Community'], ParentType, ContextType>;
  communityType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryOpportunityCreatedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityLogEntryOpportunityCreated'] = ResolversParentTypes['ActivityLogEntryOpportunityCreated']
> = {
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  opportunity?: Resolver<
    ResolversTypes['Opportunity'],
    ParentType,
    ContextType
  >;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryUpdateSentResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActivityLogEntryUpdateSent'] = ResolversParentTypes['ActivityLogEntryUpdateSent']
> = {
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  updates?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActorResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Actor'] = ResolversParentTypes['Actor']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  impact?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActorGroupResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ActorGroup'] = ResolversParentTypes['ActorGroup']
> = {
  actors?: Resolver<
    Maybe<Array<ResolversTypes['Actor']>>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AgentResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Agent'] = ResolversParentTypes['Agent']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  credentials?: Resolver<
    Maybe<Array<ResolversTypes['Credential']>>,
    ParentType,
    ContextType
  >;
  did?: Resolver<Maybe<ResolversTypes['DID']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  verifiedCredentials?: Resolver<
    Maybe<Array<ResolversTypes['VerifiedCredential']>>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AgentBeginVerifiedCredentialOfferOutputResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AgentBeginVerifiedCredentialOfferOutput'] = ResolversParentTypes['AgentBeginVerifiedCredentialOfferOutput']
> = {
  jwt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  qrCodeImg?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AgentBeginVerifiedCredentialRequestOutputResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AgentBeginVerifiedCredentialRequestOutput'] = ResolversParentTypes['AgentBeginVerifiedCredentialRequestOutput']
> = {
  jwt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  qrCodeImg?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApplicationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Application'] = ResolversParentTypes['Application']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  lifecycle?: Resolver<ResolversTypes['Lifecycle'], ParentType, ContextType>;
  questions?: Resolver<
    Array<ResolversTypes['Question']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApplicationForRoleResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ApplicationForRoleResult'] = ResolversParentTypes['ApplicationForRoleResult']
> = {
  challengeID?: Resolver<
    Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  communityID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  opportunityID?: Resolver<
    Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  spaceID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuthenticationConfigResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AuthenticationConfig'] = ResolversParentTypes['AuthenticationConfig']
> = {
  providers?: Resolver<
    Array<ResolversTypes['AuthenticationProviderConfig']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuthenticationProviderConfigResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AuthenticationProviderConfig'] = ResolversParentTypes['AuthenticationProviderConfig']
> = {
  config?: Resolver<
    ResolversTypes['AuthenticationProviderConfigUnion'],
    ParentType,
    ContextType
  >;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  icon?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuthenticationProviderConfigUnionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AuthenticationProviderConfigUnion'] = ResolversParentTypes['AuthenticationProviderConfigUnion']
> = {
  __resolveType: TypeResolveFn<'OryConfig', ParentType, ContextType>;
};

export type AuthorizationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Authorization'] = ResolversParentTypes['Authorization']
> = {
  anonymousReadAccess?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  credentialRules?: Resolver<
    Maybe<Array<ResolversTypes['AuthorizationPolicyRuleCredential']>>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  myPrivileges?: Resolver<
    Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType
  >;
  privilegeRules?: Resolver<
    Maybe<Array<ResolversTypes['AuthorizationPolicyRulePrivilege']>>,
    ParentType,
    ContextType
  >;
  verifiedCredentialRules?: Resolver<
    Maybe<Array<ResolversTypes['AuthorizationPolicyRuleVerifiedCredential']>>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuthorizationPolicyRuleCredentialResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AuthorizationPolicyRuleCredential'] = ResolversParentTypes['AuthorizationPolicyRuleCredential']
> = {
  cascade?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  criterias?: Resolver<
    Array<ResolversTypes['CredentialDefinition']>,
    ParentType,
    ContextType
  >;
  grantedPrivileges?: Resolver<
    Array<ResolversTypes['AuthorizationPrivilege']>,
    ParentType,
    ContextType
  >;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuthorizationPolicyRulePrivilegeResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AuthorizationPolicyRulePrivilege'] = ResolversParentTypes['AuthorizationPolicyRulePrivilege']
> = {
  grantedPrivileges?: Resolver<
    Array<ResolversTypes['AuthorizationPrivilege']>,
    ParentType,
    ContextType
  >;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  sourcePrivilege?: Resolver<
    ResolversTypes['AuthorizationPrivilege'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuthorizationPolicyRuleVerifiedCredentialResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['AuthorizationPolicyRuleVerifiedCredential'] = ResolversParentTypes['AuthorizationPolicyRuleVerifiedCredential']
> = {
  claimRule?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  credentialName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  grantedPrivileges?: Resolver<
    Array<ResolversTypes['AuthorizationPrivilege']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface CidScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['CID'], any> {
  name: 'CID';
}

export type CalendarResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Calendar'] = ResolversParentTypes['Calendar']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  event?: Resolver<
    Maybe<ResolversTypes['CalendarEvent']>,
    ParentType,
    ContextType,
    RequireFields<CalendarEventArgs, 'ID'>
  >;
  events?: Resolver<
    Maybe<Array<ResolversTypes['CalendarEvent']>>,
    ParentType,
    ContextType,
    Partial<CalendarEventsArgs>
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CalendarEventResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CalendarEvent'] = ResolversParentTypes['CalendarEvent']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  comments?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  createdBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  durationDays?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  durationMinutes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  multipleDays?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  startDate?: Resolver<
    Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<ResolversTypes['CalendarEventType'], ParentType, ContextType>;
  wholeDay?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CalloutResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Callout'] = ResolversParentTypes['Callout']
> = {
  activity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  comments?: Resolver<Maybe<ResolversTypes['Room']>, ParentType, ContextType>;
  createdBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  postTemplate?: Resolver<
    Maybe<ResolversTypes['PostTemplate']>,
    ParentType,
    ContextType
  >;
  posts?: Resolver<
    Maybe<Array<ResolversTypes['Post']>>,
    ParentType,
    ContextType,
    Partial<CalloutPostsArgs>
  >;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  publishedBy?: Resolver<
    Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType
  >;
  publishedDate?: Resolver<
    Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  sortOrder?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['CalloutState'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CalloutType'], ParentType, ContextType>;
  visibility?: Resolver<
    ResolversTypes['CalloutVisibility'],
    ParentType,
    ContextType
  >;
  whiteboardTemplate?: Resolver<
    Maybe<ResolversTypes['WhiteboardTemplate']>,
    ParentType,
    ContextType
  >;
  whiteboards?: Resolver<
    Maybe<Array<ResolversTypes['Whiteboard']>>,
    ParentType,
    ContextType,
    Partial<CalloutWhiteboardsArgs>
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CalloutPostCreatedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CalloutPostCreated'] = ResolversParentTypes['CalloutPostCreated']
> = {
  calloutID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  post?: Resolver<ResolversTypes['Post'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ChallengeResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Challenge'] = ResolversParentTypes['Challenge']
> = {
  agent?: Resolver<Maybe<ResolversTypes['Agent']>, ParentType, ContextType>;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  challenges?: Resolver<
    Maybe<Array<ResolversTypes['Challenge']>>,
    ParentType,
    ContextType
  >;
  collaboration?: Resolver<
    Maybe<ResolversTypes['Collaboration']>,
    ParentType,
    ContextType
  >;
  community?: Resolver<
    Maybe<ResolversTypes['Community']>,
    ParentType,
    ContextType
  >;
  context?: Resolver<Maybe<ResolversTypes['Context']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  innovationFlow?: Resolver<
    Maybe<ResolversTypes['InnovationFlow']>,
    ParentType,
    ContextType
  >;
  metrics?: Resolver<
    Maybe<Array<ResolversTypes['NVP']>>,
    ParentType,
    ContextType
  >;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  opportunities?: Resolver<
    Maybe<Array<ResolversTypes['Opportunity']>>,
    ParentType,
    ContextType,
    Partial<ChallengeOpportunitiesArgs>
  >;
  preferences?: Resolver<
    Array<ResolversTypes['Preference']>,
    ParentType,
    ContextType
  >;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  spaceID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  storageBucket?: Resolver<
    Maybe<ResolversTypes['StorageBucket']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ChallengeCreatedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ChallengeCreated'] = ResolversParentTypes['ChallengeCreated']
> = {
  challenge?: Resolver<ResolversTypes['Challenge'], ParentType, ContextType>;
  spaceID?: Resolver<ResolversTypes['UUID_NAMEID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ChallengeTemplateResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ChallengeTemplate'] = ResolversParentTypes['ChallengeTemplate']
> = {
  feedback?: Resolver<
    Maybe<Array<ResolversTypes['FeedbackTemplate']>>,
    ParentType,
    ContextType
  >;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ChatGuidanceResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ChatGuidanceResult'] = ResolversParentTypes['ChatGuidanceResult']
> = {
  answer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  question?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sources?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CollaborationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Collaboration'] = ResolversParentTypes['Collaboration']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  callouts?: Resolver<
    Maybe<Array<ResolversTypes['Callout']>>,
    ParentType,
    ContextType,
    Partial<CollaborationCalloutsArgs>
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  relations?: Resolver<
    Maybe<Array<ResolversTypes['Relation']>>,
    ParentType,
    ContextType
  >;
  tagsetTemplates?: Resolver<
    Maybe<Array<ResolversTypes['TagsetTemplate']>>,
    ParentType,
    ContextType
  >;
  timeline?: Resolver<
    Maybe<ResolversTypes['Timeline']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunicationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Communication'] = ResolversParentTypes['Communication']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  discussion?: Resolver<
    Maybe<ResolversTypes['Discussion']>,
    ParentType,
    ContextType,
    RequireFields<CommunicationDiscussionArgs, 'ID'>
  >;
  discussionCategories?: Resolver<
    Array<ResolversTypes['DiscussionCategory']>,
    ParentType,
    ContextType
  >;
  discussions?: Resolver<
    Maybe<Array<ResolversTypes['Discussion']>>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  updates?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunicationAdminMembershipResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CommunicationAdminMembershipResult'] = ResolversParentTypes['CommunicationAdminMembershipResult']
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rooms?: Resolver<
    Array<ResolversTypes['CommunicationAdminRoomMembershipResult']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunicationAdminOrphanedUsageResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CommunicationAdminOrphanedUsageResult'] = ResolversParentTypes['CommunicationAdminOrphanedUsageResult']
> = {
  rooms?: Resolver<
    Array<ResolversTypes['CommunicationAdminRoomResult']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunicationAdminRoomMembershipResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CommunicationAdminRoomMembershipResult'] = ResolversParentTypes['CommunicationAdminRoomMembershipResult']
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  extraMembers?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  joinRule?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  missingMembers?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  roomID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunicationAdminRoomResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CommunicationAdminRoomResult'] = ResolversParentTypes['CommunicationAdminRoomResult']
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunicationRoomResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CommunicationRoom'] = ResolversParentTypes['CommunicationRoom']
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messages?: Resolver<
    Array<ResolversTypes['Message']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunityResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Community'] = ResolversParentTypes['Community']
> = {
  applicationForm?: Resolver<
    Maybe<ResolversTypes['Form']>,
    ParentType,
    ContextType
  >;
  applications?: Resolver<
    Maybe<Array<ResolversTypes['Application']>>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  availableLeadUsers?: Resolver<
    Maybe<ResolversTypes['PaginatedUsers']>,
    ParentType,
    ContextType,
    Partial<CommunityAvailableLeadUsersArgs>
  >;
  availableMemberUsers?: Resolver<
    Maybe<ResolversTypes['PaginatedUsers']>,
    ParentType,
    ContextType,
    Partial<CommunityAvailableMemberUsersArgs>
  >;
  communication?: Resolver<
    Maybe<ResolversTypes['Communication']>,
    ParentType,
    ContextType
  >;
  displayName?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  groups?: Resolver<
    Maybe<Array<ResolversTypes['UserGroup']>>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  invitations?: Resolver<
    Maybe<Array<ResolversTypes['Invitation']>>,
    ParentType,
    ContextType
  >;
  invitationsExternal?: Resolver<
    Maybe<Array<ResolversTypes['InvitationExternal']>>,
    ParentType,
    ContextType
  >;
  memberUsers?: Resolver<
    Maybe<Array<ResolversTypes['User']>>,
    ParentType,
    ContextType,
    Partial<CommunityMemberUsersArgs>
  >;
  myMembershipStatus?: Resolver<
    Maybe<ResolversTypes['CommunityMembershipStatus']>,
    ParentType,
    ContextType
  >;
  organizationsInRole?: Resolver<
    Maybe<Array<ResolversTypes['Organization']>>,
    ParentType,
    ContextType,
    RequireFields<CommunityOrganizationsInRoleArgs, 'role'>
  >;
  policy?: Resolver<
    Maybe<ResolversTypes['CommunityPolicy']>,
    ParentType,
    ContextType
  >;
  usersInRole?: Resolver<
    Maybe<Array<ResolversTypes['User']>>,
    ParentType,
    ContextType,
    RequireFields<CommunityUsersInRoleArgs, 'role'>
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunityPolicyResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CommunityPolicy'] = ResolversParentTypes['CommunityPolicy']
> = {
  admin?: Resolver<
    ResolversTypes['CommunityRolePolicy'],
    ParentType,
    ContextType
  >;
  host?: Resolver<
    ResolversTypes['CommunityRolePolicy'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  lead?: Resolver<
    ResolversTypes['CommunityRolePolicy'],
    ParentType,
    ContextType
  >;
  member?: Resolver<
    ResolversTypes['CommunityRolePolicy'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunityRolePolicyResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CommunityRolePolicy'] = ResolversParentTypes['CommunityRolePolicy']
> = {
  credential?: Resolver<
    ResolversTypes['CredentialDefinition'],
    ParentType,
    ContextType
  >;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  maxOrg?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  maxUser?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  minOrg?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  minUser?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  parentCredentials?: Resolver<
    Array<ResolversTypes['CredentialDefinition']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ConfigResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Config'] = ResolversParentTypes['Config']
> = {
  apm?: Resolver<ResolversTypes['APM'], ParentType, ContextType>;
  authentication?: Resolver<
    ResolversTypes['AuthenticationConfig'],
    ParentType,
    ContextType
  >;
  geo?: Resolver<ResolversTypes['Geo'], ParentType, ContextType>;
  platform?: Resolver<
    ResolversTypes['PlatformLocations'],
    ParentType,
    ContextType
  >;
  sentry?: Resolver<ResolversTypes['Sentry'], ParentType, ContextType>;
  storage?: Resolver<ResolversTypes['StorageConfig'], ParentType, ContextType>;
  template?: Resolver<ResolversTypes['Template'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ContextResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Context'] = ResolversParentTypes['Context']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  ecosystemModel?: Resolver<
    Maybe<ResolversTypes['EcosystemModel']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  impact?: Resolver<Maybe<ResolversTypes['Markdown']>, ParentType, ContextType>;
  vision?: Resolver<Maybe<ResolversTypes['Markdown']>, ParentType, ContextType>;
  who?: Resolver<Maybe<ResolversTypes['Markdown']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ContributorRolesResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ContributorRoles'] = ResolversParentTypes['ContributorRoles']
> = {
  applications?: Resolver<
    Array<ResolversTypes['ApplicationForRoleResult']>,
    ParentType,
    ContextType,
    Partial<ContributorRolesApplicationsArgs>
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  invitations?: Resolver<
    Array<ResolversTypes['InvitationForRoleResult']>,
    ParentType,
    ContextType,
    Partial<ContributorRolesInvitationsArgs>
  >;
  organizations?: Resolver<
    Array<ResolversTypes['RolesResultOrganization']>,
    ParentType,
    ContextType
  >;
  spaces?: Resolver<
    Array<ResolversTypes['RolesResultSpace']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CredentialResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Credential'] = ResolversParentTypes['Credential']
> = {
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  resourceID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<
    ResolversTypes['AuthorizationCredential'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CredentialDefinitionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CredentialDefinition'] = ResolversParentTypes['CredentialDefinition']
> = {
  resourceID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CredentialMetadataOutputResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['CredentialMetadataOutput'] = ResolversParentTypes['CredentialMetadataOutput']
> = {
  context?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  schema?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  types?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  uniqueType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface DidScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['DID'], any> {
  name: 'DID';
}

export interface DateTimeScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DirectRoomResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['DirectRoom'] = ResolversParentTypes['DirectRoom']
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messages?: Resolver<
    Array<ResolversTypes['Message']>,
    ParentType,
    ContextType
  >;
  receiverID?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DiscussionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Discussion'] = ResolversParentTypes['Discussion']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  category?: Resolver<
    ResolversTypes['DiscussionCategory'],
    ParentType,
    ContextType
  >;
  comments?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  createdBy?: Resolver<Maybe<ResolversTypes['UUID']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DocumentResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Document'] = ResolversParentTypes['Document']
> = {
  anonymousReadAccess?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  mimeType?: Resolver<ResolversTypes['MimeType'], ParentType, ContextType>;
  size?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  tagset?: Resolver<ResolversTypes['Tagset'], ParentType, ContextType>;
  uploadedDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type EcosystemModelResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['EcosystemModel'] = ResolversParentTypes['EcosystemModel']
> = {
  actorGroups?: Resolver<
    Maybe<Array<ResolversTypes['ActorGroup']>>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface EmojiScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['Emoji'], any> {
  name: 'Emoji';
}

export type FeatureFlagResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['FeatureFlag'] = ResolversParentTypes['FeatureFlag']
> = {
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FeedbackTemplateResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['FeedbackTemplate'] = ResolversParentTypes['FeedbackTemplate']
> = {
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questions?: Resolver<
    Array<ResolversTypes['QuestionTemplate']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FileStorageConfigResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['FileStorageConfig'] = ResolversParentTypes['FileStorageConfig']
> = {
  maxFileSize?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  mimeTypes?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FormResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Form'] = ResolversParentTypes['Form']
> = {
  description?: Resolver<
    Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  questions?: Resolver<
    Array<ResolversTypes['FormQuestion']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FormQuestionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['FormQuestion'] = ResolversParentTypes['FormQuestion']
> = {
  explanation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  maxLength?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  question?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  required?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sortOrder?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type GeoResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Geo'] = ResolversParentTypes['Geo']
> = {
  endpoint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type GroupableResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Groupable'] = ResolversParentTypes['Groupable']
> = {
  __resolveType: TypeResolveFn<
    'Community' | 'Organization',
    ParentType,
    ContextType
  >;
  groups?: Resolver<
    Maybe<Array<ResolversTypes['UserGroup']>>,
    ParentType,
    ContextType
  >;
};

export type ISearchResultsResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ISearchResults'] = ResolversParentTypes['ISearchResults']
> = {
  contributionResults?: Resolver<
    Array<ResolversTypes['SearchResult']>,
    ParentType,
    ContextType
  >;
  contributionResultsCount?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  contributorResults?: Resolver<
    Array<ResolversTypes['SearchResult']>,
    ParentType,
    ContextType
  >;
  contributorResultsCount?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  groupResults?: Resolver<
    Array<ResolversTypes['SearchResult']>,
    ParentType,
    ContextType
  >;
  journeyResults?: Resolver<
    Array<ResolversTypes['SearchResult']>,
    ParentType,
    ContextType
  >;
  journeyResultsCount?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InnovationFlowResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['InnovationFlow'] = ResolversParentTypes['InnovationFlow']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  lifecycle?: Resolver<
    Maybe<ResolversTypes['Lifecycle']>,
    ParentType,
    ContextType
  >;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  type?: Resolver<
    ResolversTypes['InnovationFlowType'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InnovationFlowTemplateResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['InnovationFlowTemplate'] = ResolversParentTypes['InnovationFlowTemplate']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  definition?: Resolver<
    ResolversTypes['LifecycleDefinition'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  type?: Resolver<
    ResolversTypes['InnovationFlowType'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InnovationHubResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['InnovationHub'] = ResolversParentTypes['InnovationHub']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  spaceListFilter?: Resolver<
    Maybe<Array<ResolversTypes['Space']>>,
    ParentType,
    ContextType
  >;
  spaceVisibilityFilter?: Resolver<
    Maybe<ResolversTypes['SpaceVisibility']>,
    ParentType,
    ContextType
  >;
  subdomain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['InnovationHubType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InnovationPackResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['InnovationPack'] = ResolversParentTypes['InnovationPack']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  provider?: Resolver<
    Maybe<ResolversTypes['Organization']>,
    ParentType,
    ContextType
  >;
  templates?: Resolver<
    Maybe<ResolversTypes['TemplatesSet']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InvitationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Invitation'] = ResolversParentTypes['Invitation']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  lifecycle?: Resolver<ResolversTypes['Lifecycle'], ParentType, ContextType>;
  updatedDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  welcomeMessage?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InvitationExternalResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['InvitationExternal'] = ResolversParentTypes['InvitationExternal']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  profileCreated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  welcomeMessage?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InvitationForRoleResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['InvitationForRoleResult'] = ResolversParentTypes['InvitationForRoleResult']
> = {
  challengeID?: Resolver<
    Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  communityID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  opportunityID?: Resolver<
    Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  spaceID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  welcomeMessage?: Resolver<
    Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface JsonScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type LibraryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Library'] = ResolversParentTypes['Library']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  innovationPack?: Resolver<
    Maybe<ResolversTypes['InnovationPack']>,
    ParentType,
    ContextType,
    RequireFields<LibraryInnovationPackArgs, 'ID'>
  >;
  innovationPacks?: Resolver<
    Array<ResolversTypes['InnovationPack']>,
    ParentType,
    ContextType
  >;
  storageBucket?: Resolver<
    Maybe<ResolversTypes['StorageBucket']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LifecycleResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Lifecycle'] = ResolversParentTypes['Lifecycle']
> = {
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  machineDef?: Resolver<
    ResolversTypes['LifecycleDefinition'],
    ParentType,
    ContextType
  >;
  nextEvents?: Resolver<
    Maybe<Array<ResolversTypes['String']>>,
    ParentType,
    ContextType
  >;
  state?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  stateIsFinal?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  templateName?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface LifecycleDefinitionScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['LifecycleDefinition'], any> {
  name: 'LifecycleDefinition';
}

export type LocationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']
> = {
  addressLine1?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  addressLine2?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  city?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  country?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  postalCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stateOrProvince?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LookupQueryResultsResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['LookupQueryResults'] = ResolversParentTypes['LookupQueryResults']
> = {
  application?: Resolver<
    Maybe<ResolversTypes['Application']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsApplicationArgs, 'ID'>
  >;
  calendar?: Resolver<
    Maybe<ResolversTypes['Calendar']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsCalendarArgs, 'ID'>
  >;
  calendarEvent?: Resolver<
    Maybe<ResolversTypes['CalendarEvent']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsCalendarEventArgs, 'ID'>
  >;
  callout?: Resolver<
    Maybe<ResolversTypes['Callout']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsCalloutArgs, 'ID'>
  >;
  challenge?: Resolver<
    Maybe<ResolversTypes['Challenge']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsChallengeArgs, 'ID'>
  >;
  collaboration?: Resolver<
    Maybe<ResolversTypes['Collaboration']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsCollaborationArgs, 'ID'>
  >;
  community?: Resolver<
    Maybe<ResolversTypes['Community']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsCommunityArgs, 'ID'>
  >;
  context?: Resolver<
    Maybe<ResolversTypes['Context']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsContextArgs, 'ID'>
  >;
  innovationFlow?: Resolver<
    Maybe<ResolversTypes['InnovationFlow']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsInnovationFlowArgs, 'ID'>
  >;
  innovationFlowTemplate?: Resolver<
    Maybe<ResolversTypes['InnovationFlowTemplate']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsInnovationFlowTemplateArgs, 'ID'>
  >;
  invitation?: Resolver<
    Maybe<ResolversTypes['Invitation']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsInvitationArgs, 'ID'>
  >;
  opportunity?: Resolver<
    Maybe<ResolversTypes['Opportunity']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsOpportunityArgs, 'ID'>
  >;
  post?: Resolver<
    Maybe<ResolversTypes['Post']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsPostArgs, 'ID'>
  >;
  profile?: Resolver<
    Maybe<ResolversTypes['Profile']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsProfileArgs, 'ID'>
  >;
  room?: Resolver<
    Maybe<ResolversTypes['Room']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsRoomArgs, 'ID'>
  >;
  whiteboard?: Resolver<
    Maybe<ResolversTypes['Whiteboard']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsWhiteboardArgs, 'ID'>
  >;
  whiteboardTemplate?: Resolver<
    Maybe<ResolversTypes['WhiteboardTemplate']>,
    ParentType,
    ContextType,
    RequireFields<LookupQueryResultsWhiteboardTemplateArgs, 'ID'>
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface MarkdownScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['Markdown'], any> {
  name: 'Markdown';
}

export type MeQueryResultsResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['MeQueryResults'] = ResolversParentTypes['MeQueryResults']
> = {
  applications?: Resolver<
    Array<ResolversTypes['ApplicationForRoleResult']>,
    ParentType,
    ContextType,
    Partial<MeQueryResultsApplicationsArgs>
  >;
  invitations?: Resolver<
    Array<ResolversTypes['InvitationForRoleResult']>,
    ParentType,
    ContextType,
    Partial<MeQueryResultsInvitationsArgs>
  >;
  spaceMemberships?: Resolver<
    Array<ResolversTypes['Space']>,
    ParentType,
    ContextType,
    Partial<MeQueryResultsSpaceMembershipsArgs>
  >;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MessageResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Message'] = ResolversParentTypes['Message']
> = {
  id?: Resolver<ResolversTypes['MessageID'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['Markdown'], ParentType, ContextType>;
  reactions?: Resolver<
    Array<ResolversTypes['Reaction']>,
    ParentType,
    ContextType
  >;
  sender?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  threadID?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface MessageIdScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['MessageID'], any> {
  name: 'MessageID';
}

export type MetadataResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Metadata'] = ResolversParentTypes['Metadata']
> = {
  metrics?: Resolver<Array<ResolversTypes['NVP']>, ParentType, ContextType>;
  services?: Resolver<
    Array<ResolversTypes['ServiceMetadata']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']
> = {
  addReactionToMessageInRoom?: Resolver<
    ResolversTypes['Reaction'],
    ParentType,
    ContextType,
    RequireFields<MutationAddReactionToMessageInRoomArgs, 'reactionData'>
  >;
  adminCommunicationEnsureAccessToCommunications?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      MutationAdminCommunicationEnsureAccessToCommunicationsArgs,
      'communicationData'
    >
  >;
  adminCommunicationRemoveOrphanedRoom?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      MutationAdminCommunicationRemoveOrphanedRoomArgs,
      'orphanedRoomData'
    >
  >;
  adminCommunicationUpdateRoomsJoinRule?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      MutationAdminCommunicationUpdateRoomsJoinRuleArgs,
      'changeRoomAccessData'
    >
  >;
  adminInnovationFlowSynchronizeStates?: Resolver<
    ResolversTypes['Tagset'],
    ParentType,
    ContextType,
    RequireFields<
      MutationAdminInnovationFlowSynchronizeStatesArgs,
      'innovationFlowData'
    >
  >;
  adminStorageMigrateIpfsUrls?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  applyForCommunityMembership?: Resolver<
    ResolversTypes['Application'],
    ParentType,
    ContextType,
    RequireFields<MutationApplyForCommunityMembershipArgs, 'applicationData'>
  >;
  assignCommunityRoleToOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<MutationAssignCommunityRoleToOrganizationArgs, 'roleData'>
  >;
  assignCommunityRoleToUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationAssignCommunityRoleToUserArgs, 'roleData'>
  >;
  assignUserAsGlobalAdmin?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationAssignUserAsGlobalAdminArgs, 'membershipData'>
  >;
  assignUserAsGlobalCommunityAdmin?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<
      MutationAssignUserAsGlobalCommunityAdminArgs,
      'membershipData'
    >
  >;
  assignUserAsGlobalSpacesAdmin?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationAssignUserAsGlobalSpacesAdminArgs, 'membershipData'>
  >;
  assignUserAsOrganizationAdmin?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationAssignUserAsOrganizationAdminArgs, 'membershipData'>
  >;
  assignUserAsOrganizationOwner?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationAssignUserAsOrganizationOwnerArgs, 'membershipData'>
  >;
  assignUserToGroup?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<MutationAssignUserToGroupArgs, 'membershipData'>
  >;
  assignUserToOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<MutationAssignUserToOrganizationArgs, 'membershipData'>
  >;
  authorizationPolicyResetAll?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  authorizationPolicyResetOnOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<
      MutationAuthorizationPolicyResetOnOrganizationArgs,
      'authorizationResetData'
    >
  >;
  authorizationPolicyResetOnPlatform?: Resolver<
    ResolversTypes['Platform'],
    ParentType,
    ContextType
  >;
  authorizationPolicyResetOnSpace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<
      MutationAuthorizationPolicyResetOnSpaceArgs,
      'authorizationResetData'
    >
  >;
  authorizationPolicyResetOnUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<
      MutationAuthorizationPolicyResetOnUserArgs,
      'authorizationResetData'
    >
  >;
  beginAlkemioUserVerifiedCredentialOfferInteraction?: Resolver<
    ResolversTypes['AgentBeginVerifiedCredentialOfferOutput'],
    ParentType,
    ContextType
  >;
  beginCommunityMemberVerifiedCredentialOfferInteraction?: Resolver<
    ResolversTypes['AgentBeginVerifiedCredentialOfferOutput'],
    ParentType,
    ContextType,
    RequireFields<
      MutationBeginCommunityMemberVerifiedCredentialOfferInteractionArgs,
      'communityID'
    >
  >;
  beginVerifiedCredentialRequestInteraction?: Resolver<
    ResolversTypes['AgentBeginVerifiedCredentialRequestOutput'],
    ParentType,
    ContextType,
    RequireFields<
      MutationBeginVerifiedCredentialRequestInteractionArgs,
      'types'
    >
  >;
  convertChallengeToSpace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<MutationConvertChallengeToSpaceArgs, 'convertData'>
  >;
  convertOpportunityToChallenge?: Resolver<
    ResolversTypes['Challenge'],
    ParentType,
    ContextType,
    RequireFields<MutationConvertOpportunityToChallengeArgs, 'convertData'>
  >;
  createActor?: Resolver<
    ResolversTypes['Actor'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateActorArgs, 'actorData'>
  >;
  createActorGroup?: Resolver<
    ResolversTypes['ActorGroup'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateActorGroupArgs, 'actorGroupData'>
  >;
  createCalloutOnCollaboration?: Resolver<
    ResolversTypes['Callout'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateCalloutOnCollaborationArgs, 'calloutData'>
  >;
  createChallenge?: Resolver<
    ResolversTypes['Challenge'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateChallengeArgs, 'challengeData'>
  >;
  createChildChallenge?: Resolver<
    ResolversTypes['Challenge'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateChildChallengeArgs, 'challengeData'>
  >;
  createDiscussion?: Resolver<
    ResolversTypes['Discussion'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateDiscussionArgs, 'createData'>
  >;
  createEventOnCalendar?: Resolver<
    ResolversTypes['CalendarEvent'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateEventOnCalendarArgs, 'eventData'>
  >;
  createFeedbackOnCommunityContext?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateFeedbackOnCommunityContextArgs, 'feedbackData'>
  >;
  createGroupOnCommunity?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateGroupOnCommunityArgs, 'groupData'>
  >;
  createGroupOnOrganization?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateGroupOnOrganizationArgs, 'groupData'>
  >;
  createInnovationFlowTemplate?: Resolver<
    ResolversTypes['InnovationFlowTemplate'],
    ParentType,
    ContextType,
    RequireFields<
      MutationCreateInnovationFlowTemplateArgs,
      'innovationFlowTemplateInput'
    >
  >;
  createInnovationHub?: Resolver<
    ResolversTypes['InnovationHub'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateInnovationHubArgs, 'createData'>
  >;
  createInnovationPackOnLibrary?: Resolver<
    ResolversTypes['InnovationPack'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateInnovationPackOnLibraryArgs, 'packData'>
  >;
  createLinkOnCallout?: Resolver<
    ResolversTypes['Reference'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateLinkOnCalloutArgs, 'linkData'>
  >;
  createOpportunity?: Resolver<
    ResolversTypes['Opportunity'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateOpportunityArgs, 'opportunityData'>
  >;
  createOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateOrganizationArgs, 'organizationData'>
  >;
  createPostOnCallout?: Resolver<
    ResolversTypes['Post'],
    ParentType,
    ContextType,
    RequireFields<MutationCreatePostOnCalloutArgs, 'postData'>
  >;
  createPostTemplate?: Resolver<
    ResolversTypes['PostTemplate'],
    ParentType,
    ContextType,
    RequireFields<MutationCreatePostTemplateArgs, 'postTemplateInput'>
  >;
  createProject?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateProjectArgs, 'projectData'>
  >;
  createReferenceOnProfile?: Resolver<
    ResolversTypes['Reference'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateReferenceOnProfileArgs, 'referenceInput'>
  >;
  createRelationOnCollaboration?: Resolver<
    ResolversTypes['Relation'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateRelationOnCollaborationArgs, 'relationData'>
  >;
  createSpace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateSpaceArgs, 'spaceData'>
  >;
  createTagsetOnProfile?: Resolver<
    ResolversTypes['Tagset'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateTagsetOnProfileArgs, 'tagsetData'>
  >;
  createUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateUserArgs, 'userData'>
  >;
  createUserNewRegistration?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType
  >;
  createWhiteboardOnCallout?: Resolver<
    ResolversTypes['Whiteboard'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateWhiteboardOnCalloutArgs, 'whiteboardData'>
  >;
  createWhiteboardTemplate?: Resolver<
    ResolversTypes['WhiteboardTemplate'],
    ParentType,
    ContextType,
    RequireFields<
      MutationCreateWhiteboardTemplateArgs,
      'whiteboardTemplateInput'
    >
  >;
  deleteActor?: Resolver<
    ResolversTypes['Actor'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteActorArgs, 'deleteData'>
  >;
  deleteActorGroup?: Resolver<
    ResolversTypes['ActorGroup'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteActorGroupArgs, 'deleteData'>
  >;
  deleteCalendarEvent?: Resolver<
    ResolversTypes['CalendarEvent'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteCalendarEventArgs, 'deleteData'>
  >;
  deleteCallout?: Resolver<
    ResolversTypes['Callout'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteCalloutArgs, 'deleteData'>
  >;
  deleteChallenge?: Resolver<
    ResolversTypes['Challenge'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteChallengeArgs, 'deleteData'>
  >;
  deleteCollaboration?: Resolver<
    ResolversTypes['Collaboration'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteCollaborationArgs, 'deleteData'>
  >;
  deleteDiscussion?: Resolver<
    ResolversTypes['Discussion'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteDiscussionArgs, 'deleteData'>
  >;
  deleteDocument?: Resolver<
    ResolversTypes['Document'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteDocumentArgs, 'deleteData'>
  >;
  deleteInnovationFlowTemplate?: Resolver<
    ResolversTypes['InnovationFlowTemplate'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteInnovationFlowTemplateArgs, 'deleteData'>
  >;
  deleteInnovationHub?: Resolver<
    ResolversTypes['InnovationHub'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteInnovationHubArgs, 'deleteData'>
  >;
  deleteInnovationPack?: Resolver<
    ResolversTypes['InnovationPack'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteInnovationPackArgs, 'deleteData'>
  >;
  deleteInvitation?: Resolver<
    ResolversTypes['Invitation'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteInvitationArgs, 'deleteData'>
  >;
  deleteInvitationExternal?: Resolver<
    ResolversTypes['InvitationExternal'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteInvitationExternalArgs, 'deleteData'>
  >;
  deleteOpportunity?: Resolver<
    ResolversTypes['Opportunity'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteOpportunityArgs, 'deleteData'>
  >;
  deleteOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteOrganizationArgs, 'deleteData'>
  >;
  deletePost?: Resolver<
    ResolversTypes['Post'],
    ParentType,
    ContextType,
    RequireFields<MutationDeletePostArgs, 'deleteData'>
  >;
  deletePostTemplate?: Resolver<
    ResolversTypes['PostTemplate'],
    ParentType,
    ContextType,
    RequireFields<MutationDeletePostTemplateArgs, 'deleteData'>
  >;
  deleteProject?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteProjectArgs, 'deleteData'>
  >;
  deleteReference?: Resolver<
    ResolversTypes['Reference'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteReferenceArgs, 'deleteData'>
  >;
  deleteRelation?: Resolver<
    ResolversTypes['Relation'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteRelationArgs, 'deleteData'>
  >;
  deleteSpace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteSpaceArgs, 'deleteData'>
  >;
  deleteUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteUserArgs, 'deleteData'>
  >;
  deleteUserApplication?: Resolver<
    ResolversTypes['Application'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteUserApplicationArgs, 'deleteData'>
  >;
  deleteUserGroup?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteUserGroupArgs, 'deleteData'>
  >;
  deleteWhiteboard?: Resolver<
    ResolversTypes['Whiteboard'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteWhiteboardArgs, 'whiteboardData'>
  >;
  deleteWhiteboardTemplate?: Resolver<
    ResolversTypes['WhiteboardTemplate'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteWhiteboardTemplateArgs, 'deleteData'>
  >;
  eventOnApplication?: Resolver<
    ResolversTypes['Application'],
    ParentType,
    ContextType,
    RequireFields<MutationEventOnApplicationArgs, 'applicationEventData'>
  >;
  eventOnChallenge?: Resolver<
    ResolversTypes['InnovationFlow'],
    ParentType,
    ContextType,
    RequireFields<MutationEventOnChallengeArgs, 'innovationFlowEventData'>
  >;
  eventOnCommunityInvitation?: Resolver<
    ResolversTypes['Application'],
    ParentType,
    ContextType,
    RequireFields<MutationEventOnCommunityInvitationArgs, 'invitationEventData'>
  >;
  eventOnOpportunity?: Resolver<
    ResolversTypes['InnovationFlow'],
    ParentType,
    ContextType,
    RequireFields<MutationEventOnOpportunityArgs, 'innovationFlowEventData'>
  >;
  eventOnOrganizationVerification?: Resolver<
    ResolversTypes['OrganizationVerification'],
    ParentType,
    ContextType,
    RequireFields<
      MutationEventOnOrganizationVerificationArgs,
      'organizationVerificationEventData'
    >
  >;
  eventOnProject?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<MutationEventOnProjectArgs, 'projectEventData'>
  >;
  eventOnWhiteboardCheckout?: Resolver<
    ResolversTypes['WhiteboardCheckout'],
    ParentType,
    ContextType,
    RequireFields<
      MutationEventOnWhiteboardCheckoutArgs,
      'whiteboardCheckoutEventData'
    >
  >;
  grantCredentialToUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationGrantCredentialToUserArgs, 'grantCredentialData'>
  >;
  ingest?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  inviteExistingUserForCommunityMembership?: Resolver<
    Array<ResolversTypes['Invitation']>,
    ParentType,
    ContextType,
    RequireFields<
      MutationInviteExistingUserForCommunityMembershipArgs,
      'invitationData'
    >
  >;
  inviteExternalUserForCommunityMembership?: Resolver<
    ResolversTypes['InvitationExternal'],
    ParentType,
    ContextType,
    RequireFields<
      MutationInviteExternalUserForCommunityMembershipArgs,
      'invitationData'
    >
  >;
  joinCommunity?: Resolver<
    ResolversTypes['Community'],
    ParentType,
    ContextType,
    RequireFields<MutationJoinCommunityArgs, 'joinCommunityData'>
  >;
  messageUser?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<MutationMessageUserArgs, 'messageData'>
  >;
  movePostToCallout?: Resolver<
    ResolversTypes['Post'],
    ParentType,
    ContextType,
    RequireFields<MutationMovePostToCalloutArgs, 'movePostData'>
  >;
  removeCommunityRoleFromOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveCommunityRoleFromOrganizationArgs, 'roleData'>
  >;
  removeCommunityRoleFromUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveCommunityRoleFromUserArgs, 'roleData'>
  >;
  removeMessageOnRoom?: Resolver<
    ResolversTypes['MessageID'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveMessageOnRoomArgs, 'messageData'>
  >;
  removeReactionToMessageInRoom?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveReactionToMessageInRoomArgs, 'reactionData'>
  >;
  removeUserAsGlobalAdmin?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveUserAsGlobalAdminArgs, 'membershipData'>
  >;
  removeUserAsGlobalCommunityAdmin?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<
      MutationRemoveUserAsGlobalCommunityAdminArgs,
      'membershipData'
    >
  >;
  removeUserAsGlobalSpacesAdmin?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveUserAsGlobalSpacesAdminArgs, 'membershipData'>
  >;
  removeUserAsOrganizationAdmin?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveUserAsOrganizationAdminArgs, 'membershipData'>
  >;
  removeUserAsOrganizationOwner?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveUserAsOrganizationOwnerArgs, 'membershipData'>
  >;
  removeUserFromGroup?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveUserFromGroupArgs, 'membershipData'>
  >;
  removeUserFromOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<MutationRemoveUserFromOrganizationArgs, 'membershipData'>
  >;
  resetChatGuidance?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  revokeCredentialFromUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationRevokeCredentialFromUserArgs, 'revokeCredentialData'>
  >;
  sendMessageReplyToRoom?: Resolver<
    ResolversTypes['Message'],
    ParentType,
    ContextType,
    RequireFields<MutationSendMessageReplyToRoomArgs, 'messageData'>
  >;
  sendMessageToCommunityLeads?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationSendMessageToCommunityLeadsArgs, 'messageData'>
  >;
  sendMessageToOrganization?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationSendMessageToOrganizationArgs, 'messageData'>
  >;
  sendMessageToRoom?: Resolver<
    ResolversTypes['Message'],
    ParentType,
    ContextType,
    RequireFields<MutationSendMessageToRoomArgs, 'messageData'>
  >;
  sendMessageToUser?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationSendMessageToUserArgs, 'messageData'>
  >;
  updateActor?: Resolver<
    ResolversTypes['Actor'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateActorArgs, 'actorData'>
  >;
  updateCalendarEvent?: Resolver<
    ResolversTypes['CalendarEvent'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateCalendarEventArgs, 'eventData'>
  >;
  updateCallout?: Resolver<
    ResolversTypes['Callout'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateCalloutArgs, 'calloutData'>
  >;
  updateCalloutPublishInfo?: Resolver<
    ResolversTypes['Callout'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateCalloutPublishInfoArgs, 'calloutData'>
  >;
  updateCalloutVisibility?: Resolver<
    ResolversTypes['Callout'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateCalloutVisibilityArgs, 'calloutData'>
  >;
  updateCalloutsSortOrder?: Resolver<
    Array<ResolversTypes['Callout']>,
    ParentType,
    ContextType,
    RequireFields<MutationUpdateCalloutsSortOrderArgs, 'sortOrderData'>
  >;
  updateChallenge?: Resolver<
    ResolversTypes['Challenge'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateChallengeArgs, 'challengeData'>
  >;
  updateCommunityApplicationForm?: Resolver<
    ResolversTypes['Community'],
    ParentType,
    ContextType,
    RequireFields<
      MutationUpdateCommunityApplicationFormArgs,
      'applicationFormData'
    >
  >;
  updateDiscussion?: Resolver<
    ResolversTypes['Discussion'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateDiscussionArgs, 'updateData'>
  >;
  updateDocument?: Resolver<
    ResolversTypes['Document'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateDocumentArgs, 'documentData'>
  >;
  updateEcosystemModel?: Resolver<
    ResolversTypes['EcosystemModel'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateEcosystemModelArgs, 'ecosystemModelData'>
  >;
  updateInnovationFlow?: Resolver<
    ResolversTypes['InnovationFlow'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateInnovationFlowArgs, 'innovationFlowData'>
  >;
  updateInnovationFlowLifecycleTemplate?: Resolver<
    ResolversTypes['InnovationFlow'],
    ParentType,
    ContextType,
    RequireFields<
      MutationUpdateInnovationFlowLifecycleTemplateArgs,
      'innovationFlowData'
    >
  >;
  updateInnovationFlowTemplate?: Resolver<
    ResolversTypes['InnovationFlowTemplate'],
    ParentType,
    ContextType,
    RequireFields<
      MutationUpdateInnovationFlowTemplateArgs,
      'innovationFlowTemplateInput'
    >
  >;
  updateInnovationHub?: Resolver<
    ResolversTypes['InnovationHub'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateInnovationHubArgs, 'updateData'>
  >;
  updateInnovationPack?: Resolver<
    ResolversTypes['InnovationPack'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateInnovationPackArgs, 'innovationPackData'>
  >;
  updateOpportunity?: Resolver<
    ResolversTypes['Opportunity'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateOpportunityArgs, 'opportunityData'>
  >;
  updateOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateOrganizationArgs, 'organizationData'>
  >;
  updatePost?: Resolver<
    ResolversTypes['Post'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdatePostArgs, 'postData'>
  >;
  updatePostTemplate?: Resolver<
    ResolversTypes['PostTemplate'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdatePostTemplateArgs, 'postTemplateInput'>
  >;
  updatePreferenceOnChallenge?: Resolver<
    ResolversTypes['Preference'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdatePreferenceOnChallengeArgs, 'preferenceData'>
  >;
  updatePreferenceOnOrganization?: Resolver<
    ResolversTypes['Preference'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdatePreferenceOnOrganizationArgs, 'preferenceData'>
  >;
  updatePreferenceOnSpace?: Resolver<
    ResolversTypes['Preference'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdatePreferenceOnSpaceArgs, 'preferenceData'>
  >;
  updatePreferenceOnUser?: Resolver<
    ResolversTypes['Preference'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdatePreferenceOnUserArgs, 'preferenceData'>
  >;
  updateProfile?: Resolver<
    ResolversTypes['Profile'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateProfileArgs, 'profileData'>
  >;
  updateProject?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateProjectArgs, 'projectData'>
  >;
  updateSpace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateSpaceArgs, 'spaceData'>
  >;
  updateSpacePlatformSettings?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateSpacePlatformSettingsArgs, 'updateData'>
  >;
  updateTagset?: Resolver<
    ResolversTypes['Tagset'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateTagsetArgs, 'updateData'>
  >;
  updateUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateUserArgs, 'userData'>
  >;
  updateUserGroup?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateUserGroupArgs, 'userGroupData'>
  >;
  updateVisual?: Resolver<
    ResolversTypes['Visual'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateVisualArgs, 'updateData'>
  >;
  updateWhiteboard?: Resolver<
    ResolversTypes['Whiteboard'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateWhiteboardArgs, 'whiteboardData'>
  >;
  updateWhiteboardTemplate?: Resolver<
    ResolversTypes['WhiteboardTemplate'],
    ParentType,
    ContextType,
    RequireFields<
      MutationUpdateWhiteboardTemplateArgs,
      'whiteboardTemplateInput'
    >
  >;
  uploadFileOnReference?: Resolver<
    ResolversTypes['Reference'],
    ParentType,
    ContextType,
    RequireFields<MutationUploadFileOnReferenceArgs, 'file' | 'uploadData'>
  >;
  uploadFileOnStorageBucket?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<MutationUploadFileOnStorageBucketArgs, 'file' | 'uploadData'>
  >;
  uploadImageOnVisual?: Resolver<
    ResolversTypes['Visual'],
    ParentType,
    ContextType,
    RequireFields<MutationUploadImageOnVisualArgs, 'file' | 'uploadData'>
  >;
};

export type NvpResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['NVP'] = ResolversParentTypes['NVP']
> = {
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface NameIdScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['NameID'], any> {
  name: 'NameID';
}

export type OpportunityResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Opportunity'] = ResolversParentTypes['Opportunity']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  collaboration?: Resolver<
    Maybe<ResolversTypes['Collaboration']>,
    ParentType,
    ContextType
  >;
  community?: Resolver<
    Maybe<ResolversTypes['Community']>,
    ParentType,
    ContextType
  >;
  context?: Resolver<Maybe<ResolversTypes['Context']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  innovationFlow?: Resolver<
    Maybe<ResolversTypes['InnovationFlow']>,
    ParentType,
    ContextType
  >;
  metrics?: Resolver<
    Maybe<Array<ResolversTypes['NVP']>>,
    ParentType,
    ContextType
  >;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  parentNameID?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  projects?: Resolver<
    Maybe<Array<ResolversTypes['Project']>>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OpportunityCreatedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OpportunityCreated'] = ResolversParentTypes['OpportunityCreated']
> = {
  challengeID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  opportunity?: Resolver<
    ResolversTypes['Opportunity'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrganizationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']
> = {
  admins?: Resolver<
    Maybe<Array<ResolversTypes['User']>>,
    ParentType,
    ContextType
  >;
  agent?: Resolver<Maybe<ResolversTypes['Agent']>, ParentType, ContextType>;
  associates?: Resolver<
    Maybe<Array<ResolversTypes['User']>>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  contactEmail?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  domain?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  group?: Resolver<
    Maybe<ResolversTypes['UserGroup']>,
    ParentType,
    ContextType,
    RequireFields<OrganizationGroupArgs, 'ID'>
  >;
  groups?: Resolver<
    Maybe<Array<ResolversTypes['UserGroup']>>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  legalEntityName?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  metrics?: Resolver<
    Maybe<Array<ResolversTypes['NVP']>>,
    ParentType,
    ContextType
  >;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  owners?: Resolver<
    Maybe<Array<ResolversTypes['User']>>,
    ParentType,
    ContextType
  >;
  preferences?: Resolver<
    Array<ResolversTypes['Preference']>,
    ParentType,
    ContextType
  >;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  storageBucket?: Resolver<
    Maybe<ResolversTypes['StorageBucket']>,
    ParentType,
    ContextType
  >;
  verification?: Resolver<
    ResolversTypes['OrganizationVerification'],
    ParentType,
    ContextType
  >;
  website?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrganizationVerificationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OrganizationVerification'] = ResolversParentTypes['OrganizationVerification']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  lifecycle?: Resolver<ResolversTypes['Lifecycle'], ParentType, ContextType>;
  status?: Resolver<
    ResolversTypes['OrganizationVerificationEnum'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OryConfigResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['OryConfig'] = ResolversParentTypes['OryConfig']
> = {
  issuer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  kratosPublicBaseURL?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PageInfoResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']
> = {
  endCursor?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  startCursor?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PaginatedOrganizationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['PaginatedOrganization'] = ResolversParentTypes['PaginatedOrganization']
> = {
  organization?: Resolver<
    Array<ResolversTypes['Organization']>,
    ParentType,
    ContextType
  >;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PaginatedUsersResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['PaginatedUsers'] = ResolversParentTypes['PaginatedUsers']
> = {
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PlatformResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Platform'] = ResolversParentTypes['Platform']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  communication?: Resolver<
    ResolversTypes['Communication'],
    ParentType,
    ContextType
  >;
  configuration?: Resolver<ResolversTypes['Config'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  innovationHub?: Resolver<
    Maybe<ResolversTypes['InnovationHub']>,
    ParentType,
    ContextType,
    Partial<PlatformInnovationHubArgs>
  >;
  innovationHubs?: Resolver<
    Array<ResolversTypes['InnovationHub']>,
    ParentType,
    ContextType
  >;
  library?: Resolver<ResolversTypes['Library'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['Metadata'], ParentType, ContextType>;
  storageBucket?: Resolver<
    ResolversTypes['StorageBucket'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PlatformLocationsResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['PlatformLocations'] = ResolversParentTypes['PlatformLocations']
> = {
  about?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  aup?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  community?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  domain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  environment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  featureFlags?: Resolver<
    Array<ResolversTypes['FeatureFlag']>,
    ParentType,
    ContextType
  >;
  feedback?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  foundation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  help?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  impact?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  innovationLibrary?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  inspiration?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  newuser?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  opensource?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  privacy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  releases?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  security?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  support?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  terms?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tips?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PostResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Post'] = ResolversParentTypes['Post']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  callout?: Resolver<Maybe<ResolversTypes['Callout']>, ParentType, ContextType>;
  comments?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  createdBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PostTemplateResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['PostTemplate'] = ResolversParentTypes['PostTemplate']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  defaultDescription?: Resolver<
    ResolversTypes['Markdown'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PreferenceResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Preference'] = ResolversParentTypes['Preference']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  definition?: Resolver<
    ResolversTypes['PreferenceDefinition'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PreferenceDefinitionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['PreferenceDefinition'] = ResolversParentTypes['PreferenceDefinition']
> = {
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  group?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['PreferenceType'], ParentType, ContextType>;
  valueType?: Resolver<
    ResolversTypes['PreferenceValueType'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProfileResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Profile'] = ResolversParentTypes['Profile']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<
    Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  location?: Resolver<
    Maybe<ResolversTypes['Location']>,
    ParentType,
    ContextType
  >;
  references?: Resolver<
    Maybe<Array<ResolversTypes['Reference']>>,
    ParentType,
    ContextType
  >;
  storageBucket?: Resolver<
    Maybe<ResolversTypes['StorageBucket']>,
    ParentType,
    ContextType
  >;
  tagline?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tagset?: Resolver<
    Maybe<ResolversTypes['Tagset']>,
    ParentType,
    ContextType,
    Partial<ProfileTagsetArgs>
  >;
  tagsets?: Resolver<
    Maybe<Array<ResolversTypes['Tagset']>>,
    ParentType,
    ContextType
  >;
  visual?: Resolver<
    Maybe<ResolversTypes['Visual']>,
    ParentType,
    ContextType,
    RequireFields<ProfileVisualArgs, 'type'>
  >;
  visuals?: Resolver<Array<ResolversTypes['Visual']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProfileCredentialVerifiedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ProfileCredentialVerified'] = ResolversParentTypes['ProfileCredentialVerified']
> = {
  userEmail?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  vc?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProjectResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Project'] = ResolversParentTypes['Project']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  lifecycle?: Resolver<
    Maybe<ResolversTypes['Lifecycle']>,
    ParentType,
    ContextType
  >;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']
> = {
  activityLogOnCollaboration?: Resolver<
    Array<ResolversTypes['ActivityLogEntry']>,
    ParentType,
    ContextType,
    RequireFields<QueryActivityLogOnCollaborationArgs, 'queryData'>
  >;
  adminCommunicationMembership?: Resolver<
    ResolversTypes['CommunicationAdminMembershipResult'],
    ParentType,
    ContextType,
    RequireFields<QueryAdminCommunicationMembershipArgs, 'communicationData'>
  >;
  adminCommunicationOrphanedUsage?: Resolver<
    ResolversTypes['CommunicationAdminOrphanedUsageResult'],
    ParentType,
    ContextType
  >;
  askChatGuidanceQuestion?: Resolver<
    ResolversTypes['ChatGuidanceResult'],
    ParentType,
    ContextType,
    RequireFields<QueryAskChatGuidanceQuestionArgs, 'chatData'>
  >;
  getSupportedVerifiedCredentialMetadata?: Resolver<
    Array<ResolversTypes['CredentialMetadataOutput']>,
    ParentType,
    ContextType
  >;
  lookup?: Resolver<
    ResolversTypes['LookupQueryResults'],
    ParentType,
    ContextType
  >;
  me?: Resolver<ResolversTypes['MeQueryResults'], ParentType, ContextType>;
  organization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<QueryOrganizationArgs, 'ID'>
  >;
  organizations?: Resolver<
    Array<ResolversTypes['Organization']>,
    ParentType,
    ContextType,
    Partial<QueryOrganizationsArgs>
  >;
  organizationsPaginated?: Resolver<
    ResolversTypes['PaginatedOrganization'],
    ParentType,
    ContextType,
    Partial<QueryOrganizationsPaginatedArgs>
  >;
  platform?: Resolver<ResolversTypes['Platform'], ParentType, ContextType>;
  rolesOrganization?: Resolver<
    ResolversTypes['ContributorRoles'],
    ParentType,
    ContextType,
    RequireFields<QueryRolesOrganizationArgs, 'rolesData'>
  >;
  rolesUser?: Resolver<
    ResolversTypes['ContributorRoles'],
    ParentType,
    ContextType,
    RequireFields<QueryRolesUserArgs, 'rolesData'>
  >;
  search?: Resolver<
    ResolversTypes['ISearchResults'],
    ParentType,
    ContextType,
    RequireFields<QuerySearchArgs, 'searchData'>
  >;
  space?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<QuerySpaceArgs, 'ID'>
  >;
  spaces?: Resolver<
    Array<ResolversTypes['Space']>,
    ParentType,
    ContextType,
    Partial<QuerySpacesArgs>
  >;
  user?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<QueryUserArgs, 'ID'>
  >;
  userAuthorizationPrivileges?: Resolver<
    Array<ResolversTypes['AuthorizationPrivilege']>,
    ParentType,
    ContextType,
    RequireFields<
      QueryUserAuthorizationPrivilegesArgs,
      'userAuthorizationPrivilegesData'
    >
  >;
  users?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType,
    Partial<QueryUsersArgs>
  >;
  usersPaginated?: Resolver<
    ResolversTypes['PaginatedUsers'],
    ParentType,
    ContextType,
    Partial<QueryUsersPaginatedArgs>
  >;
  usersWithAuthorizationCredential?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<
      QueryUsersWithAuthorizationCredentialArgs,
      'credentialsCriteriaData'
    >
  >;
};

export type QuestionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Question'] = ResolversParentTypes['Question']
> = {
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QuestionTemplateResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['QuestionTemplate'] = ResolversParentTypes['QuestionTemplate']
> = {
  question?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  required?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sortOrder?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ReactionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Reaction'] = ResolversParentTypes['Reaction']
> = {
  emoji?: Resolver<ResolversTypes['Emoji'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['MessageID'], ParentType, ContextType>;
  sender?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ReferenceResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Reference'] = ResolversParentTypes['Reference']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  uri?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RelationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Relation'] = ResolversParentTypes['Relation']
> = {
  actorName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  actorRole?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  actorType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RelayPaginatedUserResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RelayPaginatedUser'] = ResolversParentTypes['RelayPaginatedUser']
> = {
  accountUpn?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  agent?: Resolver<Maybe<ResolversTypes['Agent']>, ParentType, ContextType>;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  communityRooms?: Resolver<
    Maybe<Array<ResolversTypes['CommunicationRoom']>>,
    ParentType,
    ContextType
  >;
  directRooms?: Resolver<
    Maybe<Array<ResolversTypes['DirectRoom']>>,
    ParentType,
    ContextType
  >;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  gender?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isContactable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  phone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  preferences?: Resolver<
    Array<ResolversTypes['Preference']>,
    ParentType,
    ContextType
  >;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RelayPaginatedUserEdgeResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RelayPaginatedUserEdge'] = ResolversParentTypes['RelayPaginatedUserEdge']
> = {
  node?: Resolver<
    ResolversTypes['RelayPaginatedUser'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RelayPaginatedUserPageInfoResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RelayPaginatedUserPageInfo'] = ResolversParentTypes['RelayPaginatedUserPageInfo']
> = {
  endCursor?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  startCursor?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RolesResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RolesResult'] = ResolversParentTypes['RolesResult']
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RolesResultCommunityResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RolesResultCommunity'] = ResolversParentTypes['RolesResultCommunity']
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  userGroups?: Resolver<
    Array<ResolversTypes['RolesResult']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RolesResultOrganizationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RolesResultOrganization'] = ResolversParentTypes['RolesResultOrganization']
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  organizationID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  userGroups?: Resolver<
    Array<ResolversTypes['RolesResult']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RolesResultSpaceResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RolesResultSpace'] = ResolversParentTypes['RolesResultSpace']
> = {
  challenges?: Resolver<
    Array<ResolversTypes['RolesResultCommunity']>,
    ParentType,
    ContextType
  >;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  opportunities?: Resolver<
    Array<ResolversTypes['RolesResultCommunity']>,
    ParentType,
    ContextType
  >;
  roles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  spaceID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userGroups?: Resolver<
    Array<ResolversTypes['RolesResult']>,
    ParentType,
    ContextType
  >;
  visibility?: Resolver<
    ResolversTypes['SpaceVisibility'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RoomResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Room'] = ResolversParentTypes['Room']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  messages?: Resolver<
    Array<ResolversTypes['Message']>,
    ParentType,
    ContextType
  >;
  messagesCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RoomEventSubscriptionResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RoomEventSubscriptionResult'] = ResolversParentTypes['RoomEventSubscriptionResult']
> = {
  message?: Resolver<
    Maybe<ResolversTypes['RoomMessageEventSubscriptionResult']>,
    ParentType,
    ContextType
  >;
  reaction?: Resolver<
    Maybe<ResolversTypes['RoomMessageReactionEventSubscriptionResult']>,
    ParentType,
    ContextType
  >;
  roomID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RoomMessageEventSubscriptionResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RoomMessageEventSubscriptionResult'] = ResolversParentTypes['RoomMessageEventSubscriptionResult']
> = {
  data?: Resolver<ResolversTypes['Message'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['MutationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RoomMessageReactionEventSubscriptionResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['RoomMessageReactionEventSubscriptionResult'] = ResolversParentTypes['RoomMessageReactionEventSubscriptionResult']
> = {
  data?: Resolver<ResolversTypes['Reaction'], ParentType, ContextType>;
  messageID?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<ResolversTypes['MutationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SearchResultResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SearchResult'] = ResolversParentTypes['SearchResult']
> = {
  __resolveType: TypeResolveFn<
    | 'SearchResultChallenge'
    | 'SearchResultOpportunity'
    | 'SearchResultOrganization'
    | 'SearchResultPost'
    | 'SearchResultSpace'
    | 'SearchResultUser'
    | 'SearchResultUserGroup',
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  terms?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchResultType'], ParentType, ContextType>;
};

export type SearchResultChallengeResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SearchResultChallenge'] = ResolversParentTypes['SearchResultChallenge']
> = {
  challenge?: Resolver<ResolversTypes['Challenge'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  space?: Resolver<ResolversTypes['Space'], ParentType, ContextType>;
  terms?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchResultType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SearchResultOpportunityResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SearchResultOpportunity'] = ResolversParentTypes['SearchResultOpportunity']
> = {
  challenge?: Resolver<ResolversTypes['Challenge'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  opportunity?: Resolver<
    ResolversTypes['Opportunity'],
    ParentType,
    ContextType
  >;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  space?: Resolver<ResolversTypes['Space'], ParentType, ContextType>;
  terms?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchResultType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SearchResultOrganizationResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SearchResultOrganization'] = ResolversParentTypes['SearchResultOrganization']
> = {
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  organization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType
  >;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  terms?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchResultType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SearchResultPostResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SearchResultPost'] = ResolversParentTypes['SearchResultPost']
> = {
  callout?: Resolver<ResolversTypes['Callout'], ParentType, ContextType>;
  challenge?: Resolver<
    Maybe<ResolversTypes['Challenge']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  opportunity?: Resolver<
    Maybe<ResolversTypes['Opportunity']>,
    ParentType,
    ContextType
  >;
  post?: Resolver<ResolversTypes['Post'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  space?: Resolver<ResolversTypes['Space'], ParentType, ContextType>;
  terms?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchResultType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SearchResultSpaceResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SearchResultSpace'] = ResolversParentTypes['SearchResultSpace']
> = {
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  space?: Resolver<ResolversTypes['Space'], ParentType, ContextType>;
  terms?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchResultType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SearchResultUserResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SearchResultUser'] = ResolversParentTypes['SearchResultUser']
> = {
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  terms?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchResultType'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SearchResultUserGroupResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['SearchResultUserGroup'] = ResolversParentTypes['SearchResultUserGroup']
> = {
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  terms?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchResultType'], ParentType, ContextType>;
  userGroup?: Resolver<ResolversTypes['UserGroup'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SentryResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Sentry'] = ResolversParentTypes['Sentry']
> = {
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  endpoint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  submitPII?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ServiceMetadataResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['ServiceMetadata'] = ResolversParentTypes['ServiceMetadata']
> = {
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  version?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SpaceResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Space'] = ResolversParentTypes['Space']
> = {
  agent?: Resolver<Maybe<ResolversTypes['Agent']>, ParentType, ContextType>;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  challenge?: Resolver<
    ResolversTypes['Challenge'],
    ParentType,
    ContextType,
    RequireFields<SpaceChallengeArgs, 'ID'>
  >;
  challenges?: Resolver<
    Maybe<Array<ResolversTypes['Challenge']>>,
    ParentType,
    ContextType,
    Partial<SpaceChallengesArgs>
  >;
  collaboration?: Resolver<
    Maybe<ResolversTypes['Collaboration']>,
    ParentType,
    ContextType
  >;
  community?: Resolver<
    Maybe<ResolversTypes['Community']>,
    ParentType,
    ContextType,
    Partial<SpaceCommunityArgs>
  >;
  context?: Resolver<Maybe<ResolversTypes['Context']>, ParentType, ContextType>;
  group?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<SpaceGroupArgs, 'ID'>
  >;
  groups?: Resolver<
    Array<ResolversTypes['UserGroup']>,
    ParentType,
    ContextType
  >;
  host?: Resolver<
    Maybe<ResolversTypes['Organization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  metrics?: Resolver<
    Maybe<Array<ResolversTypes['NVP']>>,
    ParentType,
    ContextType
  >;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  opportunities?: Resolver<
    Maybe<Array<ResolversTypes['Opportunity']>>,
    ParentType,
    ContextType,
    Partial<SpaceOpportunitiesArgs>
  >;
  opportunity?: Resolver<
    ResolversTypes['Opportunity'],
    ParentType,
    ContextType,
    RequireFields<SpaceOpportunityArgs, 'ID'>
  >;
  preferences?: Resolver<
    Maybe<Array<ResolversTypes['Preference']>>,
    ParentType,
    ContextType
  >;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  project?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<SpaceProjectArgs, 'ID'>
  >;
  projects?: Resolver<
    Array<ResolversTypes['Project']>,
    ParentType,
    ContextType
  >;
  storageBucket?: Resolver<
    Maybe<ResolversTypes['StorageBucket']>,
    ParentType,
    ContextType
  >;
  templates?: Resolver<
    Maybe<ResolversTypes['TemplatesSet']>,
    ParentType,
    ContextType
  >;
  visibility?: Resolver<
    ResolversTypes['SpaceVisibility'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type StorageBucketResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['StorageBucket'] = ResolversParentTypes['StorageBucket']
> = {
  allowedMimeTypes?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  document?: Resolver<
    Maybe<ResolversTypes['Document']>,
    ParentType,
    ContextType,
    RequireFields<StorageBucketDocumentArgs, 'ID'>
  >;
  documents?: Resolver<
    Array<ResolversTypes['Document']>,
    ParentType,
    ContextType,
    Partial<StorageBucketDocumentsArgs>
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  maxFileSize?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  size?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type StorageConfigResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['StorageConfig'] = ResolversParentTypes['StorageConfig']
> = {
  file?: Resolver<ResolversTypes['FileStorageConfig'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']
> = {
  activityCreated?: SubscriptionResolver<
    ResolversTypes['ActivityCreatedSubscriptionResult'],
    'activityCreated',
    ParentType,
    ContextType,
    RequireFields<SubscriptionActivityCreatedArgs, 'input'>
  >;
  calloutPostCreated?: SubscriptionResolver<
    ResolversTypes['CalloutPostCreated'],
    'calloutPostCreated',
    ParentType,
    ContextType,
    RequireFields<SubscriptionCalloutPostCreatedArgs, 'calloutID'>
  >;
  challengeCreated?: SubscriptionResolver<
    ResolversTypes['ChallengeCreated'],
    'challengeCreated',
    ParentType,
    ContextType,
    RequireFields<SubscriptionChallengeCreatedArgs, 'spaceID'>
  >;
  communicationDiscussionUpdated?: SubscriptionResolver<
    ResolversTypes['Discussion'],
    'communicationDiscussionUpdated',
    ParentType,
    ContextType,
    RequireFields<
      SubscriptionCommunicationDiscussionUpdatedArgs,
      'communicationID'
    >
  >;
  opportunityCreated?: SubscriptionResolver<
    ResolversTypes['OpportunityCreated'],
    'opportunityCreated',
    ParentType,
    ContextType,
    RequireFields<SubscriptionOpportunityCreatedArgs, 'challengeID'>
  >;
  profileVerifiedCredential?: SubscriptionResolver<
    ResolversTypes['ProfileCredentialVerified'],
    'profileVerifiedCredential',
    ParentType,
    ContextType
  >;
  roomEvents?: SubscriptionResolver<
    ResolversTypes['RoomEventSubscriptionResult'],
    'roomEvents',
    ParentType,
    ContextType,
    RequireFields<SubscriptionRoomEventsArgs, 'roomID'>
  >;
  whiteboardContentUpdated?: SubscriptionResolver<
    ResolversTypes['WhiteboardContentUpdated'],
    'whiteboardContentUpdated',
    ParentType,
    ContextType,
    RequireFields<SubscriptionWhiteboardContentUpdatedArgs, 'whiteboardIDs'>
  >;
};

export type TagsetResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Tagset'] = ResolversParentTypes['Tagset']
> = {
  allowedValues?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['TagsetType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TagsetTemplateResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['TagsetTemplate'] = ResolversParentTypes['TagsetTemplate']
> = {
  allowedValues?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  defaultSelectedValue?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['TagsetType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TemplateResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Template'] = ResolversParentTypes['Template']
> = {
  challenges?: Resolver<
    Array<ResolversTypes['ChallengeTemplate']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TemplatesSetResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['TemplatesSet'] = ResolversParentTypes['TemplatesSet']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  innovationFlowTemplate?: Resolver<
    Maybe<ResolversTypes['InnovationFlowTemplate']>,
    ParentType,
    ContextType,
    RequireFields<TemplatesSetInnovationFlowTemplateArgs, 'ID'>
  >;
  innovationFlowTemplates?: Resolver<
    Array<ResolversTypes['InnovationFlowTemplate']>,
    ParentType,
    ContextType
  >;
  policy?: Resolver<
    Maybe<ResolversTypes['TemplatesSetPolicy']>,
    ParentType,
    ContextType
  >;
  postTemplate?: Resolver<
    Maybe<ResolversTypes['PostTemplate']>,
    ParentType,
    ContextType,
    RequireFields<TemplatesSetPostTemplateArgs, 'ID'>
  >;
  postTemplates?: Resolver<
    Array<ResolversTypes['PostTemplate']>,
    ParentType,
    ContextType
  >;
  whiteboardTemplate?: Resolver<
    Maybe<ResolversTypes['WhiteboardTemplate']>,
    ParentType,
    ContextType,
    RequireFields<TemplatesSetWhiteboardTemplateArgs, 'ID'>
  >;
  whiteboardTemplates?: Resolver<
    Array<ResolversTypes['WhiteboardTemplate']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TemplatesSetPolicyResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['TemplatesSetPolicy'] = ResolversParentTypes['TemplatesSetPolicy']
> = {
  minInnovationFlow?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TimelineResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Timeline'] = ResolversParentTypes['Timeline']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  calendar?: Resolver<ResolversTypes['Calendar'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface UuidScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['UUID'], any> {
  name: 'UUID';
}

export interface Uuid_NameidScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['UUID_NAMEID'], any> {
  name: 'UUID_NAMEID';
}

export interface Uuid_Nameid_EmailScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['UUID_NAMEID_EMAIL'], any> {
  name: 'UUID_NAMEID_EMAIL';
}

export interface UploadScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['Upload'], any> {
  name: 'Upload';
}

export type UserResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']
> = {
  accountUpn?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  agent?: Resolver<Maybe<ResolversTypes['Agent']>, ParentType, ContextType>;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  communityRooms?: Resolver<
    Maybe<Array<ResolversTypes['CommunicationRoom']>>,
    ParentType,
    ContextType
  >;
  directRooms?: Resolver<
    Maybe<Array<ResolversTypes['DirectRoom']>>,
    ParentType,
    ContextType
  >;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  gender?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isContactable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  phone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  preferences?: Resolver<
    Array<ResolversTypes['Preference']>,
    ParentType,
    ContextType
  >;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserGroupResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['UserGroup'] = ResolversParentTypes['UserGroup']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  members?: Resolver<
    Maybe<Array<ResolversTypes['User']>>,
    ParentType,
    ContextType
  >;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent?: Resolver<
    Maybe<ResolversTypes['Groupable']>,
    ParentType,
    ContextType
  >;
  profile?: Resolver<Maybe<ResolversTypes['Profile']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type VerifiedCredentialResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['VerifiedCredential'] = ResolversParentTypes['VerifiedCredential']
> = {
  claims?: Resolver<
    Array<ResolversTypes['VerifiedCredentialClaim']>,
    ParentType,
    ContextType
  >;
  context?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  expires?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  issued?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  issuer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type VerifiedCredentialClaimResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['VerifiedCredentialClaim'] = ResolversParentTypes['VerifiedCredentialClaim']
> = {
  name?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type VisualResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Visual'] = ResolversParentTypes['Visual']
> = {
  allowedTypes?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  alternativeText?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  aspectRatio?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  maxHeight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  maxWidth?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  minHeight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  minWidth?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  uri?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type WhiteboardResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Whiteboard'] = ResolversParentTypes['Whiteboard']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  checkout?: Resolver<
    Maybe<ResolversTypes['WhiteboardCheckout']>,
    ParentType,
    ContextType
  >;
  createdBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type WhiteboardCheckoutResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['WhiteboardCheckout'] = ResolversParentTypes['WhiteboardCheckout']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  lifecycle?: Resolver<ResolversTypes['Lifecycle'], ParentType, ContextType>;
  lockedBy?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  status?: Resolver<
    ResolversTypes['WhiteboardCheckoutStateEnum'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type WhiteboardContentUpdatedResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['WhiteboardContentUpdated'] = ResolversParentTypes['WhiteboardContentUpdated']
> = {
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  whiteboardID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type WhiteboardTemplateResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['WhiteboardTemplate'] = ResolversParentTypes['WhiteboardTemplate']
> = {
  authorization?: Resolver<
    Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  APM?: ApmResolvers<ContextType>;
  ActivityCreatedSubscriptionResult?: ActivityCreatedSubscriptionResultResolvers<
    ContextType
  >;
  ActivityLogEntry?: ActivityLogEntryResolvers<ContextType>;
  ActivityLogEntryCalendarEventCreated?: ActivityLogEntryCalendarEventCreatedResolvers<
    ContextType
  >;
  ActivityLogEntryCalloutDiscussionComment?: ActivityLogEntryCalloutDiscussionCommentResolvers<
    ContextType
  >;
  ActivityLogEntryCalloutLinkCreated?: ActivityLogEntryCalloutLinkCreatedResolvers<
    ContextType
  >;
  ActivityLogEntryCalloutPostComment?: ActivityLogEntryCalloutPostCommentResolvers<
    ContextType
  >;
  ActivityLogEntryCalloutPostCreated?: ActivityLogEntryCalloutPostCreatedResolvers<
    ContextType
  >;
  ActivityLogEntryCalloutPublished?: ActivityLogEntryCalloutPublishedResolvers<
    ContextType
  >;
  ActivityLogEntryCalloutWhiteboardCreated?: ActivityLogEntryCalloutWhiteboardCreatedResolvers<
    ContextType
  >;
  ActivityLogEntryChallengeCreated?: ActivityLogEntryChallengeCreatedResolvers<
    ContextType
  >;
  ActivityLogEntryMemberJoined?: ActivityLogEntryMemberJoinedResolvers<
    ContextType
  >;
  ActivityLogEntryOpportunityCreated?: ActivityLogEntryOpportunityCreatedResolvers<
    ContextType
  >;
  ActivityLogEntryUpdateSent?: ActivityLogEntryUpdateSentResolvers<ContextType>;
  Actor?: ActorResolvers<ContextType>;
  ActorGroup?: ActorGroupResolvers<ContextType>;
  Agent?: AgentResolvers<ContextType>;
  AgentBeginVerifiedCredentialOfferOutput?: AgentBeginVerifiedCredentialOfferOutputResolvers<
    ContextType
  >;
  AgentBeginVerifiedCredentialRequestOutput?: AgentBeginVerifiedCredentialRequestOutputResolvers<
    ContextType
  >;
  Application?: ApplicationResolvers<ContextType>;
  ApplicationForRoleResult?: ApplicationForRoleResultResolvers<ContextType>;
  AuthenticationConfig?: AuthenticationConfigResolvers<ContextType>;
  AuthenticationProviderConfig?: AuthenticationProviderConfigResolvers<
    ContextType
  >;
  AuthenticationProviderConfigUnion?: AuthenticationProviderConfigUnionResolvers<
    ContextType
  >;
  Authorization?: AuthorizationResolvers<ContextType>;
  AuthorizationPolicyRuleCredential?: AuthorizationPolicyRuleCredentialResolvers<
    ContextType
  >;
  AuthorizationPolicyRulePrivilege?: AuthorizationPolicyRulePrivilegeResolvers<
    ContextType
  >;
  AuthorizationPolicyRuleVerifiedCredential?: AuthorizationPolicyRuleVerifiedCredentialResolvers<
    ContextType
  >;
  CID?: GraphQLScalarType;
  Calendar?: CalendarResolvers<ContextType>;
  CalendarEvent?: CalendarEventResolvers<ContextType>;
  Callout?: CalloutResolvers<ContextType>;
  CalloutPostCreated?: CalloutPostCreatedResolvers<ContextType>;
  Challenge?: ChallengeResolvers<ContextType>;
  ChallengeCreated?: ChallengeCreatedResolvers<ContextType>;
  ChallengeTemplate?: ChallengeTemplateResolvers<ContextType>;
  ChatGuidanceResult?: ChatGuidanceResultResolvers<ContextType>;
  Collaboration?: CollaborationResolvers<ContextType>;
  Communication?: CommunicationResolvers<ContextType>;
  CommunicationAdminMembershipResult?: CommunicationAdminMembershipResultResolvers<
    ContextType
  >;
  CommunicationAdminOrphanedUsageResult?: CommunicationAdminOrphanedUsageResultResolvers<
    ContextType
  >;
  CommunicationAdminRoomMembershipResult?: CommunicationAdminRoomMembershipResultResolvers<
    ContextType
  >;
  CommunicationAdminRoomResult?: CommunicationAdminRoomResultResolvers<
    ContextType
  >;
  CommunicationRoom?: CommunicationRoomResolvers<ContextType>;
  Community?: CommunityResolvers<ContextType>;
  CommunityPolicy?: CommunityPolicyResolvers<ContextType>;
  CommunityRolePolicy?: CommunityRolePolicyResolvers<ContextType>;
  Config?: ConfigResolvers<ContextType>;
  Context?: ContextResolvers<ContextType>;
  ContributorRoles?: ContributorRolesResolvers<ContextType>;
  Credential?: CredentialResolvers<ContextType>;
  CredentialDefinition?: CredentialDefinitionResolvers<ContextType>;
  CredentialMetadataOutput?: CredentialMetadataOutputResolvers<ContextType>;
  DID?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  DirectRoom?: DirectRoomResolvers<ContextType>;
  Discussion?: DiscussionResolvers<ContextType>;
  Document?: DocumentResolvers<ContextType>;
  EcosystemModel?: EcosystemModelResolvers<ContextType>;
  Emoji?: GraphQLScalarType;
  FeatureFlag?: FeatureFlagResolvers<ContextType>;
  FeedbackTemplate?: FeedbackTemplateResolvers<ContextType>;
  FileStorageConfig?: FileStorageConfigResolvers<ContextType>;
  Form?: FormResolvers<ContextType>;
  FormQuestion?: FormQuestionResolvers<ContextType>;
  Geo?: GeoResolvers<ContextType>;
  Groupable?: GroupableResolvers<ContextType>;
  ISearchResults?: ISearchResultsResolvers<ContextType>;
  InnovationFlow?: InnovationFlowResolvers<ContextType>;
  InnovationFlowTemplate?: InnovationFlowTemplateResolvers<ContextType>;
  InnovationHub?: InnovationHubResolvers<ContextType>;
  InnovationPack?: InnovationPackResolvers<ContextType>;
  Invitation?: InvitationResolvers<ContextType>;
  InvitationExternal?: InvitationExternalResolvers<ContextType>;
  InvitationForRoleResult?: InvitationForRoleResultResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Library?: LibraryResolvers<ContextType>;
  Lifecycle?: LifecycleResolvers<ContextType>;
  LifecycleDefinition?: GraphQLScalarType;
  Location?: LocationResolvers<ContextType>;
  LookupQueryResults?: LookupQueryResultsResolvers<ContextType>;
  Markdown?: GraphQLScalarType;
  MeQueryResults?: MeQueryResultsResolvers<ContextType>;
  Message?: MessageResolvers<ContextType>;
  MessageID?: GraphQLScalarType;
  Metadata?: MetadataResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  NVP?: NvpResolvers<ContextType>;
  NameID?: GraphQLScalarType;
  Opportunity?: OpportunityResolvers<ContextType>;
  OpportunityCreated?: OpportunityCreatedResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  OrganizationVerification?: OrganizationVerificationResolvers<ContextType>;
  OryConfig?: OryConfigResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  PaginatedOrganization?: PaginatedOrganizationResolvers<ContextType>;
  PaginatedUsers?: PaginatedUsersResolvers<ContextType>;
  Platform?: PlatformResolvers<ContextType>;
  PlatformLocations?: PlatformLocationsResolvers<ContextType>;
  Post?: PostResolvers<ContextType>;
  PostTemplate?: PostTemplateResolvers<ContextType>;
  Preference?: PreferenceResolvers<ContextType>;
  PreferenceDefinition?: PreferenceDefinitionResolvers<ContextType>;
  Profile?: ProfileResolvers<ContextType>;
  ProfileCredentialVerified?: ProfileCredentialVerifiedResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Question?: QuestionResolvers<ContextType>;
  QuestionTemplate?: QuestionTemplateResolvers<ContextType>;
  Reaction?: ReactionResolvers<ContextType>;
  Reference?: ReferenceResolvers<ContextType>;
  Relation?: RelationResolvers<ContextType>;
  RelayPaginatedUser?: RelayPaginatedUserResolvers<ContextType>;
  RelayPaginatedUserEdge?: RelayPaginatedUserEdgeResolvers<ContextType>;
  RelayPaginatedUserPageInfo?: RelayPaginatedUserPageInfoResolvers<ContextType>;
  RolesResult?: RolesResultResolvers<ContextType>;
  RolesResultCommunity?: RolesResultCommunityResolvers<ContextType>;
  RolesResultOrganization?: RolesResultOrganizationResolvers<ContextType>;
  RolesResultSpace?: RolesResultSpaceResolvers<ContextType>;
  Room?: RoomResolvers<ContextType>;
  RoomEventSubscriptionResult?: RoomEventSubscriptionResultResolvers<
    ContextType
  >;
  RoomMessageEventSubscriptionResult?: RoomMessageEventSubscriptionResultResolvers<
    ContextType
  >;
  RoomMessageReactionEventSubscriptionResult?: RoomMessageReactionEventSubscriptionResultResolvers<
    ContextType
  >;
  SearchResult?: SearchResultResolvers<ContextType>;
  SearchResultChallenge?: SearchResultChallengeResolvers<ContextType>;
  SearchResultOpportunity?: SearchResultOpportunityResolvers<ContextType>;
  SearchResultOrganization?: SearchResultOrganizationResolvers<ContextType>;
  SearchResultPost?: SearchResultPostResolvers<ContextType>;
  SearchResultSpace?: SearchResultSpaceResolvers<ContextType>;
  SearchResultUser?: SearchResultUserResolvers<ContextType>;
  SearchResultUserGroup?: SearchResultUserGroupResolvers<ContextType>;
  Sentry?: SentryResolvers<ContextType>;
  ServiceMetadata?: ServiceMetadataResolvers<ContextType>;
  Space?: SpaceResolvers<ContextType>;
  StorageBucket?: StorageBucketResolvers<ContextType>;
  StorageConfig?: StorageConfigResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  Tagset?: TagsetResolvers<ContextType>;
  TagsetTemplate?: TagsetTemplateResolvers<ContextType>;
  Template?: TemplateResolvers<ContextType>;
  TemplatesSet?: TemplatesSetResolvers<ContextType>;
  TemplatesSetPolicy?: TemplatesSetPolicyResolvers<ContextType>;
  Timeline?: TimelineResolvers<ContextType>;
  UUID?: GraphQLScalarType;
  UUID_NAMEID?: GraphQLScalarType;
  UUID_NAMEID_EMAIL?: GraphQLScalarType;
  Upload?: GraphQLScalarType;
  User?: UserResolvers<ContextType>;
  UserGroup?: UserGroupResolvers<ContextType>;
  VerifiedCredential?: VerifiedCredentialResolvers<ContextType>;
  VerifiedCredentialClaim?: VerifiedCredentialClaimResolvers<ContextType>;
  Visual?: VisualResolvers<ContextType>;
  Whiteboard?: WhiteboardResolvers<ContextType>;
  WhiteboardCheckout?: WhiteboardCheckoutResolvers<ContextType>;
  WhiteboardContentUpdated?: WhiteboardContentUpdatedResolvers<ContextType>;
  WhiteboardTemplate?: WhiteboardTemplateResolvers<ContextType>;
};

export type AssignUserAsOrganizationAdminMutationVariables = Exact<{
  membershipData: AssignOrganizationAdminInput;
}>;

export type AssignUserAsOrganizationAdminMutation = {
  assignUserAsOrganizationAdmin: { id: string };
};

export type AssignUserAsGlobalAdminMutationVariables = Exact<{
  input: AssignGlobalAdminInput;
}>;

export type AssignUserAsGlobalAdminMutation = {
  assignUserAsGlobalAdmin: { id: string; email: string };
};

export type AssignUserAsGlobalCommunityAdminMutationVariables = Exact<{
  input: AssignGlobalCommunityAdminInput;
}>;

export type AssignUserAsGlobalCommunityAdminMutation = {
  assignUserAsGlobalCommunityAdmin: { id: string; email: string };
};

export type RemoveUserAsGlobalAdminMutationVariables = Exact<{
  input: RemoveGlobalAdminInput;
}>;

export type RemoveUserAsGlobalAdminMutation = {
  removeUserAsGlobalAdmin: { id: string; email: string };
};

export type RemoveUserAsGlobalCommunityAdminMutationVariables = Exact<{
  input: RemoveGlobalCommunityAdminInput;
}>;

export type RemoveUserAsGlobalCommunityAdminMutation = {
  removeUserAsGlobalCommunityAdmin: { id: string; email: string };
};

export type ConfigurationQueryVariables = Exact<{ [key: string]: never }>;

export type ConfigurationQuery = {
  platform: {
    configuration: {
      authentication: {
        providers: Array<{
          name: string;
          label: string;
          icon: string;
          enabled: boolean;
          config: {
            __typename: 'OryConfig';
            issuer: string;
            kratosPublicBaseURL: string;
          };
        }>;
      };
    };
  };
};
