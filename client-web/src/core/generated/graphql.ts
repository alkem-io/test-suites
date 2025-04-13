/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SchemaTypes from './alkemio-schema';

import {
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig,
} from 'graphql';
import { GraphQLClient, RequestOptions } from 'graphql-request';
import { GraphQLError, print } from 'graphql';
import gql from 'graphql-tag';
export type Maybe<T> = T | undefined;
export type InputMaybe<T> = T | undefined;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>;
};
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DID: { input: string; output: string };
  DateTime: { input: Date; output: Date };
  Emoji: { input: any; output: any };
  JSON: { input: string; output: string };
  LifecycleDefinition: { input: any; output: any };
  Markdown: { input: any; output: any };
  MessageID: { input: any; output: any };
  NameID: { input: string; output: string };
  UUID: { input: string; output: string };
  UUID_NAMEID: { input: string; output: string };
  UUID_NAMEID_EMAIL: { input: string; output: string };
  Upload: {
    input: import('graphql-upload').FileUpload;
    output: import('graphql-upload').FileUpload;
  };
  WhiteboardContent: { input: any; output: any };
};

export type Apm = {
  /** Endpoint where events are sent. */
  endpoint: Scalars['String']['output'];
  /** Flag indicating if real user monitoring is enabled. */
  rumEnabled: Scalars['Boolean']['output'];
};

export type Account = {
  /** The Agent representing this Account. */
  agent: Agent;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The Account host. */
  host?: Maybe<Contributor>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The InnovationHubs for this Account. */
  innovationHubs: Array<InnovationHub>;
  /** The InnovationPacks for this Account. */
  innovationPacks: Array<InnovationPack>;
  /** The License operating on this Account. */
  license: License;
  /** The Spaces within this Account. */
  spaces: Array<Space>;
  /** The StorageAggregator in use by this Account */
  storageAggregator: StorageAggregator;
  /** The subscriptions active for this Account. */
  subscriptions: Array<AccountSubscription>;
  /** A type of entity that this Account is being used with. */
  type?: Maybe<AccountType>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The virtual contributors for this Account. */
  virtualContributors: Array<VirtualContributor>;
};

export type AccountAuthorizationResetInput = {
  /** The identifier of the Account whose Authorization Policy should be reset. */
  accountID: Scalars['UUID']['input'];
};

export type AccountLicenseResetInput = {
  /** The identifier of the Account whose License and Entitlements should be reset. */
  accountID: Scalars['UUID']['input'];
};

export type AccountSubscription = {
  /** The expiry date of this subscription, null if it does never expire. */
  expires?: Maybe<Scalars['DateTime']['output']>;
  /** The name of the Subscription. */
  name: LicensingCredentialBasedCredentialType;
};

export enum AccountType {
  Organization = 'ORGANIZATION',
  User = 'USER',
}

export type ActivityCreatedSubscriptionInput = {
  /** The collaboration on which to subscribe for new activity */
  collaborationID: Scalars['UUID']['input'];
  /** Include activities happened on child Collaborations. */
  includeChild?: InputMaybe<Scalars['Boolean']['input']>;
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
  CalloutWhiteboardContentModified = 'CALLOUT_WHITEBOARD_CONTENT_MODIFIED',
  CalloutWhiteboardCreated = 'CALLOUT_WHITEBOARD_CREATED',
  ChallengeCreated = 'CHALLENGE_CREATED',
  DiscussionComment = 'DISCUSSION_COMMENT',
  MemberJoined = 'MEMBER_JOINED',
  OpportunityCreated = 'OPPORTUNITY_CREATED',
  UpdateSent = 'UPDATE_SENT',
}

export type ActivityFeed = {
  activityFeed: Array<ActivityLogEntry>;
  pageInfo: PageInfo;
  total: Scalars['Float']['output'];
};

export type ActivityFeedGroupedQueryArgs = {
  /** What events to exclude. */
  excludeTypes?: InputMaybe<Array<ActivityEventType>>;
  /** Number of activities to return. */
  limit?: InputMaybe<Scalars['Float']['input']>;
  /** Returns only events that the current user triggered; Includes all by default. */
  myActivity?: InputMaybe<Scalars['Boolean']['input']>;
  /** Activity from which Spaces to include; Includes all by default. */
  roles?: InputMaybe<Array<ActivityFeedRoles>>;
  /** Activity from which Spaces to include; Includes all by default. */
  spaceIds?: InputMaybe<Array<Scalars['UUID']['input']>>;
  /** What events to include; Includes all by default. */
  types?: InputMaybe<Array<ActivityEventType>>;
};

export type ActivityFeedQueryArgs = {
  /** What events to exclude. */
  excludeTypes?: InputMaybe<Array<ActivityEventType>>;
  /** Returns only events that the current user triggered; Includes all by default. */
  myActivity?: InputMaybe<Scalars['Boolean']['input']>;
  /** Activity from which Spaces to include; Includes all by default. */
  roles?: InputMaybe<Array<ActivityFeedRoles>>;
  /** Activity from which Spaces to include; Includes all by default. */
  spaceIds?: InputMaybe<Array<Scalars['UUID']['input']>>;
  /** What events to include; Includes all by default. */
  types?: InputMaybe<Array<ActivityEventType>>;
};

export enum ActivityFeedRoles {
  Admin = 'ADMIN',
  Lead = 'LEAD',
  Member = 'MEMBER',
}

export type ActivityLogEntry = {
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean']['output'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID']['output'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime']['output'];
  /** The text details for this Activity. */
  description: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String']['output'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID']['output'];
  /** The Space where the activity happened */
  space?: Maybe<Space>;
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
  child: Scalars['Boolean']['output'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID']['output'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime']['output'];
  /** The text details for this Activity. */
  description: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String']['output'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID']['output'];
  /** The Space where the activity happened */
  space?: Maybe<Space>;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalloutDiscussionComment = ActivityLogEntry & {
  /** The Callout in which the comment was added. */
  callout: Callout;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean']['output'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID']['output'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime']['output'];
  /** The text details for this Activity. */
  description: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String']['output'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID']['output'];
  /** The Space where the activity happened */
  space?: Maybe<Space>;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalloutLinkCreated = ActivityLogEntry & {
  /** The Callout in which the Link was created. */
  callout: Callout;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean']['output'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID']['output'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime']['output'];
  /** The text details for this Activity. */
  description: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** The Link that was created. */
  link: Link;
  /** The display name of the parent */
  parentDisplayName: Scalars['String']['output'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID']['output'];
  /** The Space where the activity happened */
  space?: Maybe<Space>;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalloutPostComment = ActivityLogEntry & {
  /** The Callout in which the Post was commented. */
  callout: Callout;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean']['output'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID']['output'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime']['output'];
  /** The text details for this Activity. */
  description: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String']['output'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID']['output'];
  /** The Post that was commented on. */
  post: Post;
  /** The Space where the activity happened */
  space?: Maybe<Space>;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalloutPostCreated = ActivityLogEntry & {
  /** The Callout in which the Post was created. */
  callout: Callout;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean']['output'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID']['output'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime']['output'];
  /** The text details for this Activity. */
  description: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String']['output'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID']['output'];
  /** The Post that was created. */
  post: Post;
  /** The Space where the activity happened */
  space?: Maybe<Space>;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalloutPublished = ActivityLogEntry & {
  /** The Callout that was published. */
  callout: Callout;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean']['output'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID']['output'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime']['output'];
  /** The text details for this Activity. */
  description: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String']['output'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID']['output'];
  /** The Space where the activity happened */
  space?: Maybe<Space>;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryCalloutWhiteboardContentModified =
  ActivityLogEntry & {
    /** The Callout in which the Whiteboard was updated. */
    callout: Callout;
    /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
    child: Scalars['Boolean']['output'];
    /** The id of the Collaboration entity within which the Activity was generated. */
    collaborationID: Scalars['UUID']['output'];
    /** The timestamp for the Activity. */
    createdDate: Scalars['DateTime']['output'];
    /** The text details for this Activity. */
    description: Scalars['String']['output'];
    id: Scalars['UUID']['output'];
    /** The display name of the parent */
    parentDisplayName: Scalars['String']['output'];
    /** The nameID of the parent */
    parentNameID: Scalars['NameID']['output'];
    /** The Space where the activity happened */
    space?: Maybe<Space>;
    /** The user that triggered this Activity. */
    triggeredBy: User;
    /** The event type for this Activity. */
    type: ActivityEventType;
    /** The Whiteboard that was updated. */
    whiteboard: Whiteboard;
  };

export type ActivityLogEntryCalloutWhiteboardCreated = ActivityLogEntry & {
  /** The Callout in which the Whiteboard was created. */
  callout: Callout;
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean']['output'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID']['output'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime']['output'];
  /** The text details for this Activity. */
  description: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String']['output'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID']['output'];
  /** The Space where the activity happened */
  space?: Maybe<Space>;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
  /** The Whiteboard that was created. */
  whiteboard: Whiteboard;
};

export type ActivityLogEntryChallengeCreated = ActivityLogEntry & {
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean']['output'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID']['output'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime']['output'];
  /** The text details for this Activity. */
  description: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String']['output'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID']['output'];
  /** The Space where the activity happened */
  space?: Maybe<Space>;
  /** The Subspace that was created. */
  subspace: Space;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryMemberJoined = ActivityLogEntry & {
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean']['output'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID']['output'];
  /** The community that was joined. */
  community: Community;
  /** The Contributor that joined the Community. */
  contributor: Contributor;
  /** The type of the Contributor that joined the Community. */
  contributorType: CommunityContributorType;
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime']['output'];
  /** The text details for this Activity. */
  description: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String']['output'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID']['output'];
  /** The Space where the activity happened */
  space?: Maybe<Space>;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryOpportunityCreated = ActivityLogEntry & {
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean']['output'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID']['output'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime']['output'];
  /** The text details for this Activity. */
  description: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String']['output'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID']['output'];
  /** The Space where the activity happened */
  space?: Maybe<Space>;
  /** The Subsubspace that was created. */
  subsubspace: Space;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
};

export type ActivityLogEntryUpdateSent = ActivityLogEntry & {
  /** Indicates if this Activity happened on a child Collaboration. Child results can be included via the "includeChild" parameter. */
  child: Scalars['Boolean']['output'];
  /** The id of the Collaboration entity within which the Activity was generated. */
  collaborationID: Scalars['UUID']['output'];
  /** The timestamp for the Activity. */
  createdDate: Scalars['DateTime']['output'];
  /** The text details for this Activity. */
  description: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** The url to the Journey. */
  journeyUrl: Scalars['String']['output'];
  /** The Message that been sent to this Community. */
  message: Scalars['String']['output'];
  /** The display name of the parent */
  parentDisplayName: Scalars['String']['output'];
  /** The nameID of the parent */
  parentNameID: Scalars['NameID']['output'];
  /** The Space where the activity happened */
  space?: Maybe<Space>;
  /** The user that triggered this Activity. */
  triggeredBy: User;
  /** The event type for this Activity. */
  type: ActivityEventType;
  /** The Updates for this Community. */
  updates: Room;
};

export type ActivityLogInput = {
  /** Display the activityLog results for the specified Collaboration. */
  collaborationID: Scalars['UUID']['input'];
  /** Include entries happened on child Collaborations. */
  includeChild?: InputMaybe<Scalars['Boolean']['input']>;
  /** The number of ActivityLog entries to return; if omitted return all. */
  limit?: InputMaybe<Scalars['Float']['input']>;
  /** Which activity types to include in the results. Returns all by default. */
  types?: InputMaybe<Array<ActivityEventType>>;
};

export type Actor = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** A description of this actor */
  description?: Maybe<Scalars['String']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The change / effort required of this actor */
  impact?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** A value derived by this actor */
  value?: Maybe<Scalars['String']['output']>;
};

export type ActorGroup = {
  /** The set of actors in this actor group */
  actors?: Maybe<Array<Actor>>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** A description of this group of actors */
  description?: Maybe<Scalars['String']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type Agent = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The Credentials held by this Agent. */
  credentials?: Maybe<Array<Credential>>;
  /** The Decentralized Identifier (DID) for this Agent. */
  did?: Maybe<Scalars['DID']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** A type of entity that this Agent is being used with. */
  type: AgentType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The Verfied Credentials for this Agent. */
  verifiedCredentials?: Maybe<Array<VerifiedCredential>>;
};

export type AgentBeginVerifiedCredentialOfferOutput = {
  /** The token containing the information about issuer, callback endpoint and the credentials offered */
  jwt: Scalars['String']['output'];
  /** The QR Code Image to be offered on the client for scanning by a mobile wallet */
  qrCodeImg: Scalars['String']['output'];
};

export type AgentBeginVerifiedCredentialRequestOutput = {
  /** The token containing the information about issuer, callback endpoint and the credentials offered */
  jwt: Scalars['String']['output'];
  /** The QR Code Image to be offered on the client for scanning by a mobile wallet */
  qrCodeImg: Scalars['String']['output'];
};

export enum AgentType {
  Account = 'ACCOUNT',
  Organization = 'ORGANIZATION',
  Space = 'SPACE',
  User = 'USER',
  VirtualContributor = 'VIRTUAL_CONTRIBUTOR',
}

export type AiPersona = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** A overview of knowledge provided by this AI Persona. */
  bodyOfKnowledge?: Maybe<Scalars['Markdown']['output']>;
  /** The body of knowledge ID used for the AI Persona. */
  bodyOfKnowledgeID?: Maybe<Scalars['String']['output']>;
  /** The body of knowledge type used for the AI Persona. */
  bodyOfKnowledgeType?: Maybe<AiPersonaBodyOfKnowledgeType>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The type of context sharing that are supported by this AI Persona when used. */
  dataAccessMode: AiPersonaDataAccessMode;
  /** The description for this AI Persona. */
  description?: Maybe<Scalars['Markdown']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The type of interactions that are supported by this AI Persona when used. */
  interactionModes: Array<AiPersonaInteractionMode>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export enum AiPersonaBodyOfKnowledgeType {
  AlkemioSpace = 'ALKEMIO_SPACE',
  None = 'NONE',
  Other = 'OTHER',
}

export enum AiPersonaDataAccessMode {
  None = 'NONE',
  SpaceProfile = 'SPACE_PROFILE',
  SpaceProfileAndContents = 'SPACE_PROFILE_AND_CONTENTS',
}

export enum AiPersonaEngine {
  CommunityManager = 'COMMUNITY_MANAGER',
  Expert = 'EXPERT',
  GenericOpenai = 'GENERIC_OPENAI',
  Guidance = 'GUIDANCE',
  OpenaiAssistant = 'OPENAI_ASSISTANT',
}

export enum AiPersonaInteractionMode {
  DiscussionTagging = 'DISCUSSION_TAGGING',
}

export type AiPersonaService = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The body of knowledge ID used for the AI Persona Service */
  bodyOfKnowledgeID?: Maybe<Scalars['UUID']['output']>;
  /** When wat the body of knowledge of the VC last updated. */
  bodyOfKnowledgeLastUpdated?: Maybe<Scalars['DateTime']['output']>;
  /** The body of knowledge type used for the AI Persona Service */
  bodyOfKnowledgeType: AiPersonaBodyOfKnowledgeType;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The required data access by the Virtual Persona */
  dataAccessMode: AiPersonaDataAccessMode;
  /** The AI Persona Engine being used by this AI Persona. */
  engine: AiPersonaEngine;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The prompt used by this Virtual Persona */
  prompt: Array<Scalars['String']['output']>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type AiPersonaServiceIngestInput = {
  aiPersonaServiceID: Scalars['UUID']['input'];
};

export type AiServer = {
  /** A particular AiPersonaService */
  aiPersonaService: AiPersonaService;
  /** The AiPersonaServices on this aiServer */
  aiPersonaServices: Array<AiPersonaService>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The default AiPersonaService in use on the aiServer. */
  defaultAiPersonaService: AiPersonaService;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type AiServerAiPersonaServiceArgs = {
  ID: Scalars['UUID']['input'];
};

export type Application = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The User for this Application. */
  contributor: Contributor;
  createdDate: Scalars['DateTime']['output'];
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Is this lifecycle in a final state (done). */
  isFinalized: Scalars['Boolean']['output'];
  lifecycle: Lifecycle;
  /** The next events of this Lifecycle. */
  nextEvents: Array<Scalars['String']['output']>;
  /** The Questions for this application. */
  questions: Array<Question>;
  /** The current state of this Lifecycle. */
  state: Scalars['String']['output'];
  updatedDate: Scalars['DateTime']['output'];
};

export type ApplicationEventInput = {
  applicationID: Scalars['UUID']['input'];
  eventName: Scalars['String']['input'];
};

export type ApplyForEntryRoleOnRoleSetInput = {
  questions: Array<CreateNvpInput>;
  roleSetID: Scalars['UUID']['input'];
};

export type AssignLicensePlanToAccount = {
  /** The ID of the Account to assign the LicensePlan to. */
  accountID: Scalars['UUID']['input'];
  /** The ID of the LicensePlan to assign. */
  licensePlanID: Scalars['UUID']['input'];
  /** The ID of the Licensing to use. */
  licensingID?: InputMaybe<Scalars['UUID']['input']>;
};

export type AssignLicensePlanToSpace = {
  /** The ID of the LicensePlan to assign. */
  licensePlanID: Scalars['UUID']['input'];
  /** The ID of the Licensing to use. */
  licensingID?: InputMaybe<Scalars['UUID']['input']>;
  /** The ID of the Space to assign the LicensePlan to. */
  spaceID: Scalars['UUID']['input'];
};

export type AssignRoleOnRoleSetToUserInput = {
  organizationID: Scalars['UUID']['input'];
  role: RoleName;
  userID: Scalars['UUID']['input'];
};

export type AssignRoleOnRoleSetToUserInput = {
  role: RoleName;
  userID: Scalars['UUID']['input'];
};

export type AssignRoleOnRoleSetToOrganizationInput = {
  contributorID: Scalars['UUID']['input'];
  role: RoleName;
  roleSetID: Scalars['UUID']['input'];
};

export type AssignRoleOnRoleSetToUserInput = {
  contributorID: Scalars['UUID']['input'];
  role: RoleName;
  roleSetID: Scalars['UUID']['input'];
};

export type AssignRoleOnRoleSetToVirtualContributorInput = {
  contributorID: Scalars['UUID']['input'];
  role: RoleName;
  roleSetID: Scalars['UUID']['input'];
};

export type AssignUserGroupMemberInput = {
  groupID: Scalars['UUID']['input'];
  userID: Scalars['UUID']['input'];
};

export type AuthenticationConfig = {
  /** Alkemio Authentication Providers Config. */
  providers: Array<AuthenticationProviderConfig>;
};

export type AuthenticationProviderConfig = {
  /** Configuration of the authentication provider */
  config: AuthenticationProviderConfigUnion;
  /** Is the authentication provider enabled? */
  enabled: Scalars['Boolean']['output'];
  /** CDN location of an icon of the authentication provider login button. */
  icon: Scalars['String']['output'];
  /** Label of the authentication provider. */
  label: Scalars['String']['output'];
  /** Name of the authentication provider. */
  name: Scalars['String']['output'];
};

export type AuthenticationProviderConfigUnion = OryConfig;

export enum AuthenticationType {
  Email = 'EMAIL',
  Linkedin = 'LINKEDIN',
  Microsoft = 'MICROSOFT',
  Unknown = 'UNKNOWN',
}

export type Authorization = {
  anonymousReadAccess?: Maybe<Scalars['Boolean']['output']>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The set of credential rules that are contained by this Authorization Policy. */
  credentialRules?: Maybe<Array<AuthorizationPolicyRuleCredential>>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The privileges granted to the current user based on this Authorization Policy. */
  myPrivileges?: Maybe<Array<AuthorizationPrivilege>>;
  /** The set of privilege rules that are contained by this Authorization Policy. */
  privilegeRules?: Maybe<Array<AuthorizationPolicyRulePrivilege>>;
  /** A type of entity that this Authorization Policy is being used with. */
  type?: Maybe<AuthorizationPolicyType>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The set of verified credential rules that are contained by this Authorization Policy. */
  verifiedCredentialRules?: Maybe<
    Array<AuthorizationPolicyRuleVerifiedCredential>
  >;
};

export enum AuthorizationCredential {
  BetaTester = 'BETA_TESTER',
  GlobalAdmin = 'GLOBAL_ADMIN',
  GlobalCommunityRead = 'GLOBAL_COMMUNITY_READ',
  GlobalLicenseManager = 'GLOBAL_LICENSE_MANAGER',
  GlobalRegistered = 'GLOBAL_REGISTERED',
  GlobalSpacesReader = 'GLOBAL_SPACES_READER',
  GlobalSupport = 'GLOBAL_SUPPORT',
  OrganizationAdmin = 'ORGANIZATION_ADMIN',
  OrganizationAssociate = 'ORGANIZATION_ASSOCIATE',
  OrganizationOwner = 'ORGANIZATION_OWNER',
  SpaceAdmin = 'SPACE_ADMIN',
  SpaceLead = 'SPACE_LEAD',
  SpaceMember = 'SPACE_MEMBER',
  SpaceSubspaceAdmin = 'SPACE_SUBSPACE_ADMIN',
  UserGroupMember = 'USER_GROUP_MEMBER',
  UserSelfManagement = 'USER_SELF_MANAGEMENT',
  VcCampaign = 'VC_CAMPAIGN',
}

export type AuthorizationPolicyRuleCredential = {
  cascade: Scalars['Boolean']['output'];
  criterias: Array<CredentialDefinition>;
  grantedPrivileges: Array<AuthorizationPrivilege>;
  name?: Maybe<Scalars['String']['output']>;
};

export type AuthorizationPolicyRulePrivilege = {
  grantedPrivileges: Array<AuthorizationPrivilege>;
  name?: Maybe<Scalars['String']['output']>;
  sourcePrivilege: AuthorizationPrivilege;
};

export type AuthorizationPolicyRuleVerifiedCredential = {
  claimRule: Scalars['String']['output'];
  credentialName: Scalars['String']['output'];
  grantedPrivileges: Array<AuthorizationPrivilege>;
};

export enum AuthorizationPolicyType {
  Account = 'ACCOUNT',
  Actor = 'ACTOR',
  ActorGroup = 'ACTOR_GROUP',
  Agent = 'AGENT',
  AiPersona = 'AI_PERSONA',
  AiPersonaService = 'AI_PERSONA_SERVICE',
  AiServer = 'AI_SERVER',
  Application = 'APPLICATION',
  Calendar = 'CALENDAR',
  CalendarEvent = 'CALENDAR_EVENT',
  Callout = 'CALLOUT',
  CalloutContribution = 'CALLOUT_CONTRIBUTION',
  CalloutFraming = 'CALLOUT_FRAMING',
  Collaboration = 'COLLABORATION',
  Communication = 'COMMUNICATION',
  Community = 'COMMUNITY',
  CommunityGuidelines = 'COMMUNITY_GUIDELINES',
  Context = 'CONTEXT',
  Discussion = 'DISCUSSION',
  Document = 'DOCUMENT',
  EcosystemModel = 'ECOSYSTEM_MODEL',
  Forum = 'FORUM',
  InnovationFlow = 'INNOVATION_FLOW',
  InnovationHub = 'INNOVATION_HUB',
  InnovationPack = 'INNOVATION_PACK',
  Invitation = 'INVITATION',
  InMemory = 'IN_MEMORY',
  Library = 'LIBRARY',
  License = 'LICENSE',
  LicensePolicy = 'LICENSE_POLICY',
  Licensing = 'LICENSING',
  Link = 'LINK',
  Organization = 'ORGANIZATION',
  OrganizationVerification = 'ORGANIZATION_VERIFICATION',
  Platform = 'PLATFORM',
  Post = 'POST',
  Preference = 'PREFERENCE',
  PreferenceSet = 'PREFERENCE_SET',
  Profile = 'PROFILE',
  Reference = 'REFERENCE',
  RoleSet = 'ROLE_SET',
  Room = 'ROOM',
  Space = 'SPACE',
  StorageAggregator = 'STORAGE_AGGREGATOR',
  StorageBucket = 'STORAGE_BUCKET',
  Tagset = 'TAGSET',
  Template = 'TEMPLATE',
  TemplatesManager = 'TEMPLATES_MANAGER',
  TemplatesSet = 'TEMPLATES_SET',
  TemplateDefault = 'TEMPLATE_DEFAULT',
  Timeline = 'TIMELINE',
  Unknown = 'UNKNOWN',
  User = 'USER',
  UserGroup = 'USER_GROUP',
  VirtualContributor = 'VIRTUAL_CONTRIBUTOR',
  Visual = 'VISUAL',
  Whiteboard = 'WHITEBOARD',
}

export enum AuthorizationPrivilege {
  AccessInteractiveGuidance = 'ACCESS_INTERACTIVE_GUIDANCE',
  AuthorizationReset = 'AUTHORIZATION_RESET',
  CommunityAddMember = 'COMMUNITY_ADD_MEMBER',
  CommunityAddMemberVcFromAccount = 'COMMUNITY_ADD_MEMBER_VC_FROM_ACCOUNT',
  CommunityApply = 'COMMUNITY_APPLY',
  CommunityInvite = 'COMMUNITY_INVITE',
  CommunityInviteAccept = 'COMMUNITY_INVITE_ACCEPT',
  CommunityJoin = 'COMMUNITY_JOIN',
  Contribute = 'CONTRIBUTE',
  Create = 'CREATE',
  CreateCallout = 'CREATE_CALLOUT',
  CreateDiscussion = 'CREATE_DISCUSSION',
  CreateInnovationHub = 'CREATE_INNOVATION_HUB',
  CreateInnovationPack = 'CREATE_INNOVATION_PACK',
  CreateMessage = 'CREATE_MESSAGE',
  CreateMessageReaction = 'CREATE_MESSAGE_REACTION',
  CreateMessageReply = 'CREATE_MESSAGE_REPLY',
  CreateOrganization = 'CREATE_ORGANIZATION',
  CreatePost = 'CREATE_POST',
  CreateSpace = 'CREATE_SPACE',
  CreateSubspace = 'CREATE_SUBSPACE',
  CreateVirtualContributor = 'CREATE_VIRTUAL_CONTRIBUTOR',
  CreateWhiteboard = 'CREATE_WHITEBOARD',
  Delete = 'DELETE',
  FileDelete = 'FILE_DELETE',
  FileUpload = 'FILE_UPLOAD',
  Grant = 'GRANT',
  GrantGlobalAdmins = 'GRANT_GLOBAL_ADMINS',
  LicenseReset = 'LICENSE_RESET',
  MoveContribution = 'MOVE_CONTRIBUTION',
  MovePost = 'MOVE_POST',
  PlatformAdmin = 'PLATFORM_ADMIN',
  Read = 'READ',
  ReadUsers = 'READ_USERS',
  ReadUserPii = 'READ_USER_PII',
  ReadUserSettings = 'READ_USER_SETTINGS',
  TransferResource = 'TRANSFER_RESOURCE',
  Update = 'UPDATE',
  UpdateCalloutPublisher = 'UPDATE_CALLOUT_PUBLISHER',
  UpdateContent = 'UPDATE_CONTENT',
  UpdateInnovationFlow = 'UPDATE_INNOVATION_FLOW',
}

export type Calendar = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** A single CalendarEvent */
  event?: Maybe<CalendarEvent>;
  /** The list of CalendarEvents for this Calendar. */
  events: Array<CalendarEvent>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type CalendarEventArgs = {
  ID: Scalars['UUID_NAMEID']['input'];
};

export type CalendarEvent = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The comments for this CalendarEvent */
  comments: Room;
  /** The user that created this CalendarEvent */
  createdBy?: Maybe<User>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The length of the event in days. */
  durationDays?: Maybe<Scalars['Float']['output']>;
  /** The length of the event in minutes. */
  durationMinutes: Scalars['Float']['output'];
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Flag to indicate if this event is for multiple days. */
  multipleDays: Scalars['Boolean']['output'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** The Profile for this Post. */
  profile: Profile;
  /** The start time for this CalendarEvent. */
  startDate?: Maybe<Scalars['DateTime']['output']>;
  /** Which Subspace is this event part of. Only applicable if the Space has this option enabled. */
  subspace?: Maybe<Space>;
  /** The event type, e.g. webinar, meetup etc. */
  type: CalendarEventType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** Is the event visible on the parent calendar. */
  visibleOnParentCalendar: Scalars['Boolean']['output'];
  /** Flag to indicate if this event is for a whole day. */
  wholeDay: Scalars['Boolean']['output'];
};

export enum CalendarEventType {
  Event = 'EVENT',
  Milestone = 'MILESTONE',
  Other = 'OTHER',
  Training = 'TRAINING',
}

export type Callout = {
  /** The activity for this Callout. */
  activity: Scalars['Float']['output'];
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The comments for this Callout. */
  comments?: Maybe<Room>;
  /** The Contribution Defaults for this Callout. */
  contributionDefaults: CalloutContributionDefaults;
  /** The ContributionPolicy for this Callout. */
  contributionPolicy: CalloutContributionPolicy;
  /** The Contributions that have been made to this Callout. */
  contributions: Array<CalloutContribution>;
  /** The user that created this Callout */
  createdBy?: Maybe<User>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The Callout Framing associated with this Callout. */
  framing: CalloutFraming;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Whether this callout is a Template or not. */
  isTemplate: Scalars['Boolean']['output'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** The Posts associated with this Callout. */
  posts?: Maybe<Array<Post>>;
  /** The user that published this Callout */
  publishedBy?: Maybe<User>;
  /** The timestamp for the publishing of this Callout. */
  publishedDate?: Maybe<Scalars['Float']['output']>;
  /** The sorting order for this Callout. */
  sortOrder: Scalars['Float']['output'];
  /** The Callout type, e.g. Post, Whiteboard, Discussion */
  type: CalloutType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** Visibility of the Callout. */
  visibility: CalloutVisibility;
};

export type CalloutContributionsArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID_NAMEID']['input']>>;
  filter?: InputMaybe<CalloutContributionFilterArgs>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  shuffle?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CalloutContribution = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The user that created this Document */
  createdBy?: Maybe<User>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The Link that was contributed. */
  link?: Maybe<Link>;
  /** The Post that was contributed. */
  post?: Maybe<Post>;
  /** The sorting order for this Contribution. */
  sortOrder: Scalars['Float']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The Whiteboard that was contributed. */
  whiteboard?: Maybe<Whiteboard>;
};

export type CalloutContributionDefaults = {
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The default description to use for new contributions. */
  postDescription?: Maybe<Scalars['Markdown']['output']>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The default whiteboard content for whiteboard responses. */
  whiteboardContent?: Maybe<Scalars['WhiteboardContent']['output']>;
};

export type CalloutContributionFilterArgs = {
  /** Include Contributions with Link ids of contributions to include. */
  linkIDs?: InputMaybe<Array<Scalars['UUID']['input']>>;
  /** Include Contributions with Post ids/nameIds. */
  postIDs?: InputMaybe<Array<Scalars['UUID_NAMEID']['input']>>;
  /** Include Contributions with Whiteboard ids/nameIds. */
  whiteboardIDs?: InputMaybe<Array<Scalars['UUID_NAMEID']['input']>>;
};

export type CalloutContributionPolicy = {
  /** The allowed contribution types for this callout. */
  allowedContributionTypes: Array<CalloutContributionType>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** State of the Callout. */
  state: CalloutState;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export enum CalloutContributionType {
  Link = 'LINK',
  Post = 'POST',
  Whiteboard = 'WHITEBOARD',
}

export type CalloutFraming = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The Profile for framing the associated Callout. */
  profile: Profile;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The Whiteboard for framing the associated Callout. */
  whiteboard?: Maybe<Whiteboard>;
};

export type CalloutGroup = {
  /** The explation text to clarify the Group. */
  description: Scalars['Markdown']['output'];
  /** The display name for the Group */
  displayName: CalloutGroupName;
};

export enum CalloutGroupName {
  Community = 'COMMUNITY',
  Contribute = 'CONTRIBUTE',
  Home = 'HOME',
  Knowledge = 'KNOWLEDGE',
  Subspaces = 'SUBSPACES',
}

export type CalloutPostCreated = {
  /** The identifier of the Callout on which the post was created. */
  calloutID: Scalars['String']['output'];
  /** The identifier of the Contribution. */
  contributionID: Scalars['String']['output'];
  /** The Post that has been created. */
  post: Post;
  /** The sorting order for this Contribution. */
  sortOrder: Scalars['Float']['output'];
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

export type ChatGuidanceAnswerRelevanceInput = {
  /** The answer id. */
  id: Scalars['String']['input'];
  /** Is the answer relevant or not. */
  relevant: Scalars['Boolean']['input'];
};

export type ChatGuidanceInput = {
  /** The language of the answer. */
  language?: InputMaybe<Scalars['String']['input']>;
  /** The question that is being asked. */
  question: Scalars['String']['input'];
};

export type Collaboration = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The list of Callouts for this Collaboration object. */
  callouts: Array<Callout>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The set of CalloutGroups in use in this Collaboration. */
  groups: Array<CalloutGroup>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The InnovationFlow for the Collaboration. */
  innovationFlow: InnovationFlow;
  /** Whether this Collaboration is a Template or not. */
  isTemplate: Scalars['Boolean']['output'];
  /** The License operating on this Collaboration. */
  license: License;
  /** The tagset templates on this Collaboration. */
  tagsetTemplates?: Maybe<Array<TagsetTemplate>>;
  /** The timeline with events in use by this Space */
  timeline: Timeline;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type CollaborationCalloutsArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID_NAMEID']['input']>>;
  groups?: InputMaybe<Array<Scalars['String']['input']>>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  shuffle?: InputMaybe<Scalars['Boolean']['input']>;
  sortByActivity?: InputMaybe<Scalars['Boolean']['input']>;
  tagsets?: InputMaybe<Array<TagsetArgs>>;
};

export type Communication = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The updates on this Communication. */
  updates: Room;
};

export type CommunicationAdminEnsureAccessInput = {
  communityID: Scalars['UUID']['input'];
};

export type CommunicationAdminMembershipInput = {
  communityID: Scalars['UUID']['input'];
};

export type CommunicationAdminMembershipResult = {
  /** Display name of the result */
  displayName: Scalars['String']['output'];
  /** A unique identifier for this comunication room membership result. */
  id: Scalars['String']['output'];
  /** Rooms in this Communication */
  rooms: Array<CommunicationAdminRoomMembershipResult>;
};

export type CommunicationAdminOrphanedUsageResult = {
  /** Rooms in the Communication platform that are not used */
  rooms: Array<CommunicationAdminRoomResult>;
};

export type CommunicationAdminRemoveOrphanedRoomInput = {
  roomID: Scalars['String']['input'];
};

export type CommunicationAdminRoomMembershipResult = {
  /** Display name of the entity */
  displayName: Scalars['String']['output'];
  /** Members of the room that are not members of the Community. */
  extraMembers: Array<Scalars['String']['output']>;
  /** A unique identifier for this membership result. */
  id: Scalars['String']['output'];
  /** The access mode for the room. */
  joinRule: Scalars['String']['output'];
  /** Name of the room */
  members: Array<Scalars['String']['output']>;
  /** Members of the community that are missing from the room */
  missingMembers: Array<Scalars['String']['output']>;
  /** The matrix room ID */
  roomID: Scalars['String']['output'];
};

export type CommunicationAdminRoomResult = {
  /** Display name of the result */
  displayName: Scalars['String']['output'];
  /** The identifier for the orphaned room. */
  id: Scalars['String']['output'];
  /** The members of the orphaned room */
  members: Array<Scalars['String']['output']>;
};

export type CommunicationAdminUpdateRoomStateInput = {
  isPublic: Scalars['Boolean']['input'];
  isWorldVisible: Scalars['Boolean']['input'];
  roomID: Scalars['String']['input'];
};

export type CommunicationRoom = {
  /** The display name of the room */
  displayName: Scalars['String']['output'];
  /** The identifier of the room */
  id: Scalars['String']['output'];
  /** The messages that have been sent to the Room. */
  messages: Array<Message>;
};

export type CommunicationSendMessageToCommunityLeadsInput = {
  /** The Community the message is being sent to */
  communityId: Scalars['UUID']['input'];
  /** The message being sent */
  message: Scalars['String']['input'];
};

export type CommunicationSendMessageToOrganizationInput = {
  /** The message being sent */
  message: Scalars['String']['input'];
  /** The Organization the message is being sent to */
  organizationId: Scalars['UUID']['input'];
};

export type CommunicationSendMessageToUserInput = {
  /** The message being sent */
  message: Scalars['String']['input'];
  /** All Users the message is being sent to */
  receiverIds: Array<Scalars['UUID']['input']>;
};

export type Community = Groupable & {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The Communications for this Community. */
  communication: Communication;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The user group with the specified id anywhere in the space */
  group: UserGroup;
  /** Groups of users related to a Community. */
  groups: Array<UserGroup>;
  /** The guidelines for members of this Community. */
  guidelines: CommunityGuidelines;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The RoleSet for this Community. */
  roleSet: RoleSet;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type CommunityGroupArgs = {
  ID: Scalars['UUID']['input'];
};

export type CommunityApplicationForRoleResult = {
  /** ID for the community */
  communityID: Scalars['UUID']['output'];
  /** Date of creation */
  createdDate: Scalars['DateTime']['output'];
  /** Display name of the community */
  displayName: Scalars['String']['output'];
  /** ID for the application */
  id: Scalars['UUID']['output'];
  /** ID for the ultimate containing Space */
  spaceID: Scalars['UUID']['output'];
  /** Nesting level of the Space */
  spaceLevel: Scalars['Float']['output'];
  /** The current state of the application. */
  state: Scalars['String']['output'];
  /** Date of last update */
  updatedDate: Scalars['DateTime']['output'];
};

export type CommunityApplicationResult = {
  /** The application itself */
  application: Application;
  /** ID for the pending membership */
  id: Scalars['UUID']['output'];
  /** The key information for the Space that the application/invitation is for */
  spacePendingMembershipInfo: SpacePendingMembershipInfo;
};

export enum CommunityContributorType {
  Organization = 'ORGANIZATION',
  User = 'USER',
  Virtual = 'VIRTUAL',
}

export type CommunityGuidelines = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The details of the guidelilnes */
  profile: Profile;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type CommunityInvitationForRoleResult = {
  /** ID for the community */
  communityID: Scalars['UUID']['output'];
  /** ID for Contrbutor that is being invited to a community */
  contributorID: Scalars['UUID']['output'];
  /** The Type of the Contrbutor that is being invited to a community */
  contributorType: CommunityContributorType;
  /** ID for the user that created the invitation. */
  createdBy: Scalars['UUID']['output'];
  /** Date of creation */
  createdDate: Scalars['DateTime']['output'];
  /** Display name of the community */
  displayName: Scalars['String']['output'];
  /** ID for the Invitation */
  id: Scalars['UUID']['output'];
  /** ID for the ultimate containing Space */
  spaceID: Scalars['UUID']['output'];
  /** Nesting level of the Space */
  spaceLevel: Scalars['Float']['output'];
  /** The current state of the invitation. */
  state: Scalars['String']['output'];
  /** Date of last update */
  updatedDate: Scalars['DateTime']['output'];
  /** The welcome message of the invitation */
  welcomeMessage?: Maybe<Scalars['UUID']['output']>;
};

export type CommunityInvitationResult = {
  /** ID for the pending membership */
  id: Scalars['UUID']['output'];
  /** The invitation itself */
  invitation: Invitation;
  /** The key information for the Space that the application/invitation is for */
  spacePendingMembershipInfo: SpacePendingMembershipInfo;
};

export enum CommunityMembershipPolicy {
  Applications = 'APPLICATIONS',
  Invitations = 'INVITATIONS',
  Open = 'OPEN',
}

export type CommunityMembershipResult = {
  /** The child community memberships */
  childMemberships: Array<CommunityMembershipResult>;
  /** ID for the membership */
  id: Scalars['UUID']['output'];
  /** The space for the membership is for */
  space: Space;
};

export enum CommunityMembershipStatus {
  ApplicationPending = 'APPLICATION_PENDING',
  InvitationPending = 'INVITATION_PENDING',
  Member = 'MEMBER',
  NotMember = 'NOT_MEMBER',
}

export enum CommunityRoleImplicit {
  SubspaceAdmin = 'SUBSPACE_ADMIN',
}

export enum RoleName {
  Admin = 'ADMIN',
  Lead = 'LEAD',
  Member = 'MEMBER',
}

export type Config = {
  /** Elastic APM (RUM & performance monitoring) related configuration. */
  apm: Apm;
  /** Authentication configuration. */
  authentication: AuthenticationConfig;
  /** Visual constraints for the given type */
  defaultVisualTypeConstraints: VisualConstraints;
  /** The feature flags for the platform */
  featureFlags: Array<PlatformFeatureFlag>;
  /** Integration with a 3rd party Geo information service */
  geo: Geo;
  /** Platform related locations. */
  locations: PlatformLocations;
  /** Sentry (client monitoring) related configuration. */
  sentry: Sentry;
  /** Configuration for storage providers, e.g. file */
  storage: StorageConfig;
};

export type ConfigDefaultVisualTypeConstraintsArgs = {
  type: VisualType;
};

export enum ContentUpdatePolicy {
  Admins = 'ADMINS',
  Contributors = 'CONTRIBUTORS',
  Owner = 'OWNER',
}

export type Context = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** What is the potential impact? */
  impact?: Maybe<Scalars['Markdown']['output']>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The goal that is being pursued */
  vision?: Maybe<Scalars['Markdown']['output']>;
  /** Who should get involved in this challenge */
  who?: Maybe<Scalars['Markdown']['output']>;
};

export type Contributor = {
  /** The Agent for the Contributor. */
  agent: Agent;
  /** The authorization rules for the Contributor */
  authorization?: Maybe<Authorization>;
  /** The ID of the Contributor */
  id: Scalars['UUID']['output'];
  /** A name identifier of the Contributor, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** The profile for the Contributor. */
  profile: Profile;
};

export type ContributorFilterInput = {
  /** Return contributors with credentials in the provided list */
  credentials?: InputMaybe<Array<AuthorizationCredential>>;
};

export type ContributorRolePolicy = {
  /** Maximum number of Contributors in this role */
  maximum: Scalars['Float']['output'];
  /** Minimum number of Contributors in this role */
  minimum: Scalars['Float']['output'];
};

export type ContributorRoles = {
  /** The applications for the specified user; only accessible for platform admins */
  applications: Array<CommunityApplicationForRoleResult>;
  id: Scalars['UUID']['output'];
  /** The invitations for the specified user; only accessible for platform admins */
  invitations: Array<CommunityInvitationForRoleResult>;
  /** Details of the roles the contributor has in Organizations */
  organizations: Array<RolesResultOrganization>;
  /** Details of Spaces the User or Organization is a member of, with child memberships - if Space is accessible for the current user. */
  spaces: Array<RolesResultSpace>;
};

export type ContributorRolesApplicationsArgs = {
  states?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type ContributorRolesInvitationsArgs = {
  states?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type ConvertSubspaceToSpaceInput = {
  /** The subspace to be promoted to be a new Space. Note: the original Subspace will no longer exist after the conversion.  */
  subspaceID: Scalars['UUID_NAMEID']['input'];
};

export type ConvertSubsubspaceToSubspaceInput = {
  /** The subsubspace to be promoted. Note: the original Opportunity will no longer exist after the conversion.  */
  subsubspaceID: Scalars['UUID_NAMEID']['input'];
};

export type CreateActorGroupInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  ecosystemModelID: Scalars['UUID']['input'];
  name: Scalars['String']['input'];
};

export type CreateActorInput = {
  actorGroupID: Scalars['UUID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  impact?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  value?: InputMaybe<Scalars['String']['input']>;
};

export type CreateAiPersonaInput = {
  aiPersonaService?: InputMaybe<CreateAiPersonaServiceInput>;
  aiPersonaServiceID?: InputMaybe<Scalars['UUID']['input']>;
  bodyOfKnowledge?: InputMaybe<Scalars['Markdown']['input']>;
  description?: InputMaybe<Scalars['Markdown']['input']>;
};

export type CreateAiPersonaServiceInput = {
  bodyOfKnowledgeID?: InputMaybe<Scalars['UUID']['input']>;
  bodyOfKnowledgeType?: InputMaybe<AiPersonaBodyOfKnowledgeType>;
  dataAccessMode?: InputMaybe<AiPersonaDataAccessMode>;
  engine?: InputMaybe<AiPersonaEngine>;
  externalConfig?: InputMaybe<ExternalConfig>;
  prompt?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateCalendarEventOnCalendarInput = {
  calendarID: Scalars['UUID']['input'];
  /** The length of the event in days. */
  durationDays?: InputMaybe<Scalars['Float']['input']>;
  /** The length of the event in minutes. */
  durationMinutes: Scalars['Float']['input'];
  /** Flag to indicate if this event is for multiple days. */
  multipleDays: Scalars['Boolean']['input'];
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  profileData: CreateProfileInput;
  /** The start date for the event. */
  startDate: Scalars['DateTime']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  type: CalendarEventType;
  /** Is the event visible on the parent calendar. */
  visibleOnParentCalendar: Scalars['Boolean']['input'];
  /** Flag to indicate if this event is for a whole day. */
  wholeDay: Scalars['Boolean']['input'];
};

export type CreateCalloutContributionDefaultsData = {
  /** The default description to use for new Post contributions. */
  postDescription?: Maybe<Scalars['Markdown']['output']>;
  whiteboardContent?: Maybe<Scalars['WhiteboardContent']['output']>;
};

export type CreateCalloutContributionDefaultsInput = {
  /** The default description to use for new Post contributions. */
  postDescription?: InputMaybe<Scalars['Markdown']['input']>;
  whiteboardContent?: InputMaybe<Scalars['WhiteboardContent']['input']>;
};

export type CreateCalloutContributionPolicyData = {
  /** State of the callout. */
  state?: Maybe<CalloutState>;
};

export type CreateCalloutContributionPolicyInput = {
  /** State of the callout. */
  state?: InputMaybe<CalloutState>;
};

export type CreateCalloutData = {
  contributionDefaults?: Maybe<CreateCalloutContributionDefaultsData>;
  contributionPolicy?: Maybe<CreateCalloutContributionPolicyData>;
  /** Controls if the comments are enabled for this Callout. Defaults to false. */
  enableComments?: Maybe<Scalars['Boolean']['output']>;
  framing: CreateCalloutFramingData;
  /** Set Callout Group for this Callout. */
  groupName?: Maybe<Scalars['String']['output']>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: Maybe<Scalars['NameID']['output']>;
  /** Send notification if this flag is true and visibility is PUBLISHED. Defaults to false. */
  sendNotification?: Maybe<Scalars['Boolean']['output']>;
  /** The sort order to assign to this Callout. */
  sortOrder?: Maybe<Scalars['Float']['output']>;
  /** Callout type. */
  type: CalloutType;
  /** Visibility of the Callout. Defaults to DRAFT. */
  visibility?: Maybe<CalloutVisibility>;
};

export type CreateCalloutFramingData = {
  profile: CreateProfileData;
  tags?: Maybe<Array<Scalars['String']['output']>>;
  whiteboard?: Maybe<CreateWhiteboardData>;
};

export type CreateCalloutFramingInput = {
  profile: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  whiteboard?: InputMaybe<CreateWhiteboardInput>;
};

export type CreateCalloutInput = {
  contributionDefaults?: InputMaybe<CreateCalloutContributionDefaultsInput>;
  contributionPolicy?: InputMaybe<CreateCalloutContributionPolicyInput>;
  /** Controls if the comments are enabled for this Callout. Defaults to false. */
  enableComments?: InputMaybe<Scalars['Boolean']['input']>;
  framing: CreateCalloutFramingInput;
  /** Set Callout Group for this Callout. */
  groupName?: InputMaybe<Scalars['String']['input']>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** Send notification if this flag is true and visibility is PUBLISHED. Defaults to false. */
  sendNotification?: InputMaybe<Scalars['Boolean']['input']>;
  /** The sort order to assign to this Callout. */
  sortOrder?: InputMaybe<Scalars['Float']['input']>;
  /** Callout type. */
  type: CalloutType;
  /** Visibility of the Callout. Defaults to DRAFT. */
  visibility?: InputMaybe<CalloutVisibility>;
};

export type CreateCalloutOnCollaborationInput = {
  collaborationID: Scalars['UUID']['input'];
  contributionDefaults?: InputMaybe<CreateCalloutContributionDefaultsInput>;
  contributionPolicy?: InputMaybe<CreateCalloutContributionPolicyInput>;
  /** Controls if the comments are enabled for this Callout. Defaults to false. */
  enableComments?: InputMaybe<Scalars['Boolean']['input']>;
  framing: CreateCalloutFramingInput;
  /** Set Callout Group for this Callout. */
  groupName?: InputMaybe<Scalars['String']['input']>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** Send notification if this flag is true and visibility is PUBLISHED. Defaults to false. */
  sendNotification?: InputMaybe<Scalars['Boolean']['input']>;
  /** The sort order to assign to this Callout. */
  sortOrder?: InputMaybe<Scalars['Float']['input']>;
  /** Callout type. */
  type: CalloutType;
  /** Visibility of the Callout. Defaults to DRAFT. */
  visibility?: InputMaybe<CalloutVisibility>;
};

export type CreateCollaborationData = {
  /** The Callouts to add to this Collaboration. */
  calloutsData?: Maybe<Array<CreateCalloutData>>;
  /** The InnovationFlow Template to use for this Collaboration. */
  innovationFlowData?: Maybe<CreateInnovationFlowData>;
};

export type CreateCollaborationInput = {
  /** The Callouts to add to this Collaboration. */
  calloutsData?: InputMaybe<Array<CreateCalloutInput>>;
  /** The InnovationFlow Template to use for this Collaboration. */
  innovationFlowData?: InputMaybe<CreateInnovationFlowInput>;
};

export type CreateCollaborationOnSpaceInput = {
  /** Add callouts from the template to the Collaboration; defaults to true. */
  addCallouts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Add tutorial callouts to the Collaboration; defaults to false. */
  addTutorialCallouts?: InputMaybe<Scalars['Boolean']['input']>;
  /** The Callouts to add to this Collaboration. */
  calloutsData?: InputMaybe<Array<CreateCalloutInput>>;
  /** The Template to use for instantiating the Collaboration. */
  collaborationTemplateID?: InputMaybe<Scalars['UUID']['input']>;
  /** The InnovationFlow Template to use for this Collaboration. */
  innovationFlowData?: InputMaybe<CreateInnovationFlowInput>;
};

export type CreateCommunityGuidelinesData = {
  profile: CreateProfileData;
};

export type CreateCommunityGuidelinesInput = {
  profile: CreateProfileInput;
};

export type CreateContextInput = {
  impact?: InputMaybe<Scalars['Markdown']['input']>;
  vision?: InputMaybe<Scalars['Markdown']['input']>;
  who?: InputMaybe<Scalars['Markdown']['input']>;
};

export type CreateContributionOnCalloutInput = {
  calloutID: Scalars['UUID']['input'];
  link?: InputMaybe<CreateLinkInput>;
  post?: InputMaybe<CreatePostInput>;
  /** The sort order to assign to this Contribution. */
  sortOrder?: InputMaybe<Scalars['Float']['input']>;
  whiteboard?: InputMaybe<CreateWhiteboardInput>;
};

export type CreateInnovationFlowData = {
  profile: CreateProfileData;
  states: Array<CreateInnovationFlowStateData>;
};

export type CreateInnovationFlowInput = {
  profile: CreateProfileInput;
  states: Array<CreateInnovationFlowStateInput>;
};

export type CreateInnovationFlowStateData = {
  /** The explation text to clarify the State. */
  description?: Maybe<Scalars['Markdown']['output']>;
  /** The display name for the State */
  displayName: Scalars['String']['output'];
};

export type CreateInnovationFlowStateInput = {
  /** The explation text to clarify the State. */
  description?: InputMaybe<Scalars['Markdown']['input']>;
  /** The display name for the State */
  displayName: Scalars['String']['input'];
};

export type CreateInnovationHubOnAccountInput = {
  /** The Account where the InnovationHub is to be created. */
  accountID: Scalars['UUID']['input'];
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  profileData: CreateProfileInput;
  /** A list of Spaces to include in this Innovation Hub. Only valid when type 'list' is used. */
  spaceListFilter?: InputMaybe<Array<Scalars['UUID']['input']>>;
  /** Spaces with which visibility this Innovation Hub will display. Only valid when type 'visibility' is used. */
  spaceVisibilityFilter?: InputMaybe<SpaceVisibility>;
  /** The subdomain to associate the Innovation Hub with. */
  subdomain: Scalars['String']['input'];
  /** The type of Innovation Hub. */
  type: InnovationHubType;
};

export type CreateInnovationPackOnAccountInput = {
  /** The Account where the InnovationPack is to be created. */
  accountID: Scalars['UUID']['input'];
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  profileData: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreateLicensePlanOnLicensingFrameworkInput = {
  /** Assign this plan to all new Organization accounts */
  assignToNewOrganizationAccounts: Scalars['Boolean']['input'];
  /** Assign this plan to all new User accounts */
  assignToNewUserAccounts: Scalars['Boolean']['input'];
  /** Is this plan enabled? */
  enabled: Scalars['Boolean']['input'];
  /** Is this plan free? */
  isFree: Scalars['Boolean']['input'];
  /** The credential to represent this plan */
  licenseCredential: LicensingCredentialBasedCredentialType;
  licensingFrameworkID: Scalars['UUID']['input'];
  /** The name of the License Plan */
  name: Scalars['String']['input'];
  /** The price per month of this plan. */
  pricePerMonth?: InputMaybe<Scalars['Float']['input']>;
  /** Does this plan require contact support */
  requiresContactSupport: Scalars['Boolean']['input'];
  /** Does this plan require a payment method? */
  requiresPaymentMethod: Scalars['Boolean']['input'];
  /** The sorting order for this Plan. */
  sortOrder: Scalars['Float']['input'];
  /** Is there a trial period enabled */
  trialEnabled: Scalars['Boolean']['input'];
  /** The type of this License Plan. */
  type: LicensingCredentialBasedPlanType;
};

export type CreateLinkInput = {
  profile: CreateProfileInput;
  uri?: InputMaybe<Scalars['String']['input']>;
};

export type CreateLocationData = {
  addressLine1?: Maybe<Scalars['String']['output']>;
  addressLine2?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  postalCode?: Maybe<Scalars['String']['output']>;
  stateOrProvince?: Maybe<Scalars['String']['output']>;
};

export type CreateLocationInput = {
  addressLine1?: InputMaybe<Scalars['String']['input']>;
  addressLine2?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  stateOrProvince?: InputMaybe<Scalars['String']['input']>;
};

export type CreateNvpInput = {
  name: Scalars['String']['input'];
  sortOrder: Scalars['Float']['input'];
  value: Scalars['String']['input'];
};

export type CreateOrganizationInput = {
  contactEmail?: InputMaybe<Scalars['String']['input']>;
  domain?: InputMaybe<Scalars['String']['input']>;
  legalEntityName?: InputMaybe<Scalars['String']['input']>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  profileData: CreateProfileInput;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePlatformInvitationForRoleInput = {
  email: Scalars['String']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  RoleName: RoleName;
  welcomeMessage?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePostInput = {
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  profileData: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  visualUri?: InputMaybe<Scalars['String']['input']>;
};

export type CreateProfileData = {
  /** The URL of the avatar of the user */
  avatarURL?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['Markdown']['output']>;
  /** The display name for the entity. */
  displayName: Scalars['String']['output'];
  location?: Maybe<CreateLocationData>;
  referencesData?: Maybe<Array<CreateReferenceData>>;
  /** A memorable short description for this entity. */
  tagline?: Maybe<Scalars['String']['output']>;
  tagsets?: Maybe<Array<CreateTagsetData>>;
};

export type CreateProfileInput = {
  /** The URL of the avatar of the user */
  avatarURL?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['Markdown']['input']>;
  /** The display name for the entity. */
  displayName: Scalars['String']['input'];
  location?: InputMaybe<CreateLocationInput>;
  referencesData?: InputMaybe<Array<CreateReferenceInput>>;
  /** A memorable short description for this entity. */
  tagline?: InputMaybe<Scalars['String']['input']>;
  tagsets?: InputMaybe<Array<CreateTagsetInput>>;
};

export type CreateReferenceData = {
  description?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  uri?: Maybe<Scalars['String']['output']>;
};

export type CreateReferenceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  uri?: InputMaybe<Scalars['String']['input']>;
};

export type CreateReferenceOnProfileInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  profileID: Scalars['UUID']['input'];
  uri?: InputMaybe<Scalars['String']['input']>;
};

export type CreateSpaceOnAccountInput = {
  /** The Account where the Space is to be created. */
  accountID: Scalars['UUID']['input'];
  collaborationData: CreateCollaborationOnSpaceInput;
  context?: InputMaybe<CreateContextInput>;
  /** The license plan the user wishes to use when creating the space. */
  licensePlanID?: InputMaybe<Scalars['UUID']['input']>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  profileData: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  type?: InputMaybe<SpaceType>;
};

export type CreateSubspaceInput = {
  collaborationData: CreateCollaborationOnSpaceInput;
  context?: InputMaybe<CreateContextInput>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  profileData: CreateProfileInput;
  spaceID: Scalars['UUID']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  type?: InputMaybe<SpaceType>;
};

export type CreateTagsetData = {
  name: Scalars['String']['output'];
  tags?: Maybe<Array<Scalars['String']['output']>>;
  type?: Maybe<TagsetType>;
};

export type CreateTagsetInput = {
  name: Scalars['String']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  type?: InputMaybe<TagsetType>;
};

export type CreateTagsetOnProfileInput = {
  name: Scalars['String']['input'];
  profileID?: InputMaybe<Scalars['UUID']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  type?: InputMaybe<TagsetType>;
};

export type CreateTemplateFromCollaborationOnTemplatesSetInput = {
  /** The Collaboration to use as the content for the Template. */
  collaborationID: Scalars['UUID']['input'];
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  profileData: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  templatesSetID: Scalars['UUID']['input'];
  visualUri?: InputMaybe<Scalars['String']['input']>;
};

export type CreateTemplateOnTemplatesSetInput = {
  /** The Callout to associate with this template. */
  calloutData?: InputMaybe<CreateCalloutInput>;
  /** The Collaboration to associate with this template. */
  collaborationData?: InputMaybe<CreateCollaborationInput>;
  /** The Community guidelines to associate with this template. */
  communityGuidelinesData?: InputMaybe<CreateCommunityGuidelinesInput>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** Post Template: The default description to be pre-filled. */
  postDefaultDescription?: InputMaybe<Scalars['Markdown']['input']>;
  profileData: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  templatesSetID: Scalars['UUID']['input'];
  /** The type of the Template to be created. */
  type: TemplateType;
  visualUri?: InputMaybe<Scalars['String']['input']>;
  /** The Whiteboard to associate with this template. */
  whiteboard?: InputMaybe<CreateWhiteboardInput>;
};

export type CreateUserGroupInput = {
  parentID: Scalars['UUID']['input'];
  profile: CreateProfileInput;
};

export type CreateUserInput = {
  accountUpn?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  profileData: CreateProfileInput;
};

export type CreateVirtualContributorOnAccountInput = {
  /** The Account where the VirtualContributor is to be created. */
  accountID: Scalars['UUID']['input'];
  /** Data used to create the AI Persona */
  aiPersona: CreateAiPersonaInput;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  profileData: CreateProfileInput;
};

export type CreateWhiteboardData = {
  content?: Maybe<Scalars['WhiteboardContent']['output']>;
};

export type CreateWhiteboardInput = {
  content?: InputMaybe<Scalars['WhiteboardContent']['input']>;
  /** A readable identifier, unique within the containing scope. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  profileData: CreateProfileInput;
};

export type Credential = {
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The timestamp for the expiry of this credential. */
  expires?: Maybe<Scalars['Float']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The User issuing the credential */
  issuer?: Maybe<Scalars['UUID']['output']>;
  resourceID: Scalars['String']['output'];
  type: CredentialType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type CredentialDefinition = {
  /** The resourceID for this CredentialDefinition */
  resourceID: Scalars['String']['output'];
  /** The type for this CredentialDefinition */
  type: Scalars['String']['output'];
};

export type CredentialMetadataOutput = {
  /** A json description of what the claim contains and schema validation definition */
  context: Scalars['String']['output'];
  /** The purpose of the credential */
  description: Scalars['String']['output'];
  /** The display name of the credential */
  name: Scalars['String']['output'];
  /** The schema that the credential will be validated against */
  schema: Scalars['String']['output'];
  /** The credential types that are associated with this credential */
  types: Array<Scalars['String']['output']>;
  /** System recognized unique type for the credential */
  uniqueType: Scalars['String']['output'];
};

export enum CredentialType {
  AccountLicensePlus = 'ACCOUNT_LICENSE_PLUS',
  BetaTester = 'BETA_TESTER',
  GlobalAdmin = 'GLOBAL_ADMIN',
  GlobalCommunityRead = 'GLOBAL_COMMUNITY_READ',
  GlobalLicenseManager = 'GLOBAL_LICENSE_MANAGER',
  GlobalRegistered = 'GLOBAL_REGISTERED',
  GlobalSpacesReader = 'GLOBAL_SPACES_READER',
  GlobalSupport = 'GLOBAL_SUPPORT',
  OrganizationAdmin = 'ORGANIZATION_ADMIN',
  OrganizationAssociate = 'ORGANIZATION_ASSOCIATE',
  OrganizationOwner = 'ORGANIZATION_OWNER',
  SpaceAdmin = 'SPACE_ADMIN',
  SpaceFeatureSaveAsTemplate = 'SPACE_FEATURE_SAVE_AS_TEMPLATE',
  SpaceFeatureVirtualContributors = 'SPACE_FEATURE_VIRTUAL_CONTRIBUTORS',
  SpaceFeatureWhiteboardMultiUser = 'SPACE_FEATURE_WHITEBOARD_MULTI_USER',
  SpaceLead = 'SPACE_LEAD',
  SpaceLicenseEnterprise = 'SPACE_LICENSE_ENTERPRISE',
  SpaceLicenseFree = 'SPACE_LICENSE_FREE',
  SpaceLicensePlus = 'SPACE_LICENSE_PLUS',
  SpaceLicensePremium = 'SPACE_LICENSE_PREMIUM',
  SpaceMember = 'SPACE_MEMBER',
  SpaceSubspaceAdmin = 'SPACE_SUBSPACE_ADMIN',
  UserGroupMember = 'USER_GROUP_MEMBER',
  UserSelfManagement = 'USER_SELF_MANAGEMENT',
  VcCampaign = 'VC_CAMPAIGN',
}

export type DeleteActorGroupInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteActorInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteAiPersonaServiceInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteApplicationInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteCalendarEventInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteCalloutInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteCollaborationInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteDiscussionInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteDocumentInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteInnovationHubInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteInnovationPackInput = {
  ID: Scalars['UUID_NAMEID']['input'];
};

export type DeleteInvitationInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteLicensePlanInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteLinkInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteOrganizationInput = {
  ID: Scalars['UUID']['input'];
};

export type DeletePlatformInvitationInput = {
  ID: Scalars['UUID']['input'];
};

export type DeletePostInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteReferenceInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteSpaceInput = {
  ID: Scalars['UUID_NAMEID']['input'];
};

export type DeleteStorageBuckeetInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteTemplateInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteUserGroupInput = {
  ID: Scalars['UUID']['input'];
};

export type DeleteUserInput = {
  ID: Scalars['UUID']['input'];
  deleteIdentity?: InputMaybe<Scalars['Boolean']['input']>;
};

export type DeleteVirtualContributorInput = {
  ID: Scalars['UUID_NAMEID']['input'];
};

export type DeleteWhiteboardInput = {
  ID: Scalars['UUID']['input'];
};

export type DirectRoom = {
  /** The display name of the room */
  displayName: Scalars['String']['output'];
  /** The identifier of the direct room */
  id: Scalars['String']['output'];
  /** The messages that have been sent to the Direct Room. */
  messages: Array<Message>;
  /** The recepient userID */
  receiverID?: Maybe<Scalars['String']['output']>;
};

export type Discussion = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The category assigned to this Discussion. */
  category: ForumDiscussionCategory;
  /** The comments for this Discussion. */
  comments: Room;
  /** The id of the user that created this discussion */
  createdBy?: Maybe<Scalars['UUID']['output']>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** Privacy mode for the Discussion. Note: this is not yet implemented in the authorization policy. */
  privacy: ForumDiscussionPrivacy;
  /** The Profile for this Discussion. */
  profile: Profile;
  /** The timestamp for the creation of this Discussion. */
  timestamp?: Maybe<Scalars['Float']['output']>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type DiscussionsInput = {
  /** The number of Discussion entries to return; if omitted return all Discussions. */
  limit?: InputMaybe<Scalars['Float']['input']>;
  /** The sort order of the Discussions to return. */
  orderBy?: InputMaybe<DiscussionsOrderBy>;
};

export enum DiscussionsOrderBy {
  DiscussionsCreatedateAsc = 'DISCUSSIONS_CREATEDATE_ASC',
  DiscussionsCreatedateDesc = 'DISCUSSIONS_CREATEDATE_DESC',
}

export type Document = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The user that created this Document */
  createdBy?: Maybe<User>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The display name. */
  displayName: Scalars['String']['output'];
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Mime type for this Document. */
  mimeType: MimeType;
  /** Size of the Document. */
  size: Scalars['Float']['output'];
  /** The tagset in use on this Document. */
  tagset: Tagset;
  /** Whether this Document is in its end location or not. */
  temporaryLocation: Scalars['Boolean']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The uploaded date of this Document */
  uploadedDate: Scalars['DateTime']['output'];
  /** The URL to be used to retrieve the Document */
  url: Scalars['String']['output'];
};

export type EcosystemModel = {
  /** A list of ActorGroups */
  actorGroups?: Maybe<Array<ActorGroup>>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** Overview of this ecosystem model. */
  description?: Maybe<Scalars['String']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type ExploreSpacesInput = {
  /** Take into account only the activity in the past X days. */
  daysOld?: InputMaybe<Scalars['Float']['input']>;
  /** Amount of Spaces returned. */
  limit?: InputMaybe<Scalars['Float']['input']>;
};

export type ExternalConfig = {
  /** The API key for the external LLM provider. */
  apiKey?: InputMaybe<Scalars['String']['input']>;
  /** The assistent ID backing the service in OpenAI`s assistant API */
  assistantId?: InputMaybe<Scalars['String']['input']>;
};

export type FileStorageConfig = {
  /** Max file size, in bytes. */
  maxFileSize: Scalars['Float']['output'];
};

export type Form = {
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** A description of the purpose of this Form. */
  description?: Maybe<Scalars['Markdown']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The set of Questions in this Form. */
  questions: Array<FormQuestion>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type FormQuestion = {
  /** The explation text to clarify the question. */
  explanation: Scalars['String']['output'];
  /** The maxiumum length of the answer, in characters, up to a limit of 512. */
  maxLength: Scalars['Float']['output'];
  /** The question to be answered */
  question: Scalars['String']['output'];
  /** Whether this Question requires an answer or not. */
  required: Scalars['Boolean']['output'];
  /** The sort order of this question in a wider set of questions. */
  sortOrder: Scalars['Float']['output'];
};

export type Forum = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** A particular Discussions active in this Forum. */
  discussion?: Maybe<Discussion>;
  discussionCategories: Array<ForumDiscussionCategory>;
  /** The Discussions active in this Forum. */
  discussions?: Maybe<Array<Discussion>>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type ForumDiscussionArgs = {
  ID: Scalars['String']['input'];
};

export type ForumDiscussionsArgs = {
  queryData?: InputMaybe<DiscussionsInput>;
};

export type ForumCreateDiscussionInput = {
  /** The category for the Discussion */
  category: ForumDiscussionCategory;
  /** The identifier for the Forum entity the Discussion is being created on. */
  forumID: Scalars['UUID']['input'];
  profile: CreateProfileInput;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export enum ForumDiscussionCategory {
  ChallengeCentric = 'CHALLENGE_CENTRIC',
  CommunityBuilding = 'COMMUNITY_BUILDING',
  Help = 'HELP',
  Other = 'OTHER',
  PlatformFunctionalities = 'PLATFORM_FUNCTIONALITIES',
  Releases = 'RELEASES',
}

export enum ForumDiscussionPrivacy {
  Authenticated = 'AUTHENTICATED',
  Author = 'AUTHOR',
  Public = 'PUBLIC',
}

export type Geo = {
  /** Endpoint where geo information is consumed from. */
  endpoint: Scalars['String']['output'];
};

export type GrantAuthorizationCredentialInput = {
  /** The resource to which this credential is tied. */
  resourceID?: InputMaybe<Scalars['UUID']['input']>;
  type: AuthorizationCredential;
  /** The user to whom the credential is being granted. */
  userID: Scalars['UUID']['input'];
};

export type GrantOrganizationAuthorizationCredentialInput = {
  /** The Organization to whom the credential is being granted. */
  organizationID: Scalars['UUID']['input'];
  /** The resource to which this credential is tied. */
  resourceID?: InputMaybe<Scalars['UUID']['input']>;
  type: AuthorizationCredential;
};

export type Groupable = {
  /** The groups contained by this entity. */
  groups?: Maybe<Array<UserGroup>>;
};

export type ISearchResults = {
  /** The search results for Callouts. */
  calloutResults: Array<SearchResult>;
  /** The total number of results for Callouts. */
  calloutResultsCount: Scalars['Float']['output'];
  /** The search results for contributions (Posts, Whiteboards etc). */
  contributionResults: Array<SearchResult>;
  /** The total number of search results for contributions (Posts, Whiteboards etc). */
  contributionResultsCount: Scalars['Float']['output'];
  /** The search results for contributors (Users, Organizations). */
  contributorResults: Array<SearchResult>;
  /** The total number of search results for contributors (Users, Organizations). */
  contributorResultsCount: Scalars['Float']['output'];
  /** The search results for Groups. */
  groupResults: Array<SearchResult>;
  /** The search results for Spaces / Subspaces. */
  journeyResults: Array<SearchResult>;
  /** The total number of results for Spaces / Subspaces. */
  journeyResultsCount: Scalars['Float']['output'];
};

/** An in-app notification type. To not be queried directly */
export type InAppNotification = {
  /** Which category (role) is this notification targeted to. */
  category: InAppNotificationCategory;
  id: Scalars['UUID']['output'];
  /** The receiver of the notification. */
  receiver: Contributor;
  /** The current state of the notification */
  state: InAppNotificationState;
  /** When (UTC) was the notification sent. */
  triggeredAt: Scalars['DateTime']['output'];
  /** The Contributor who triggered the notification. */
  triggeredBy?: Maybe<Contributor>;
  /** The type of the notification */
  type: NotificationEventType;
};

export type InAppNotificationCalloutPublished = InAppNotification & {
  /** The Callout that was published. */
  callout?: Maybe<Callout>;
  /** Which category (role) is this notification targeted to. */
  category: InAppNotificationCategory;
  id: Scalars['UUID']['output'];
  /** The receiver of the notification. */
  receiver: Contributor;
  /** Where the callout is located. */
  space?: Maybe<Space>;
  /** The current state of the notification */
  state: InAppNotificationState;
  /** When (UTC) was the notification sent. */
  triggeredAt: Scalars['DateTime']['output'];
  /** The Contributor who triggered the notification. */
  triggeredBy?: Maybe<Contributor>;
  /** The type of the notification */
  type: NotificationEventType;
};

/** Which category (role) is this notification targeted to. */
export enum InAppNotificationCategory {
  Admin = 'ADMIN',
  Member = 'MEMBER',
  Self = 'SELF',
}

export type InAppNotificationCommunityNewMember = InAppNotification & {
  /** The Contributor that joined. */
  actor?: Maybe<Contributor>;
  /** Which category (role) is this notification targeted to. */
  category: InAppNotificationCategory;
  /** The type of the Contributor that joined. */
  contributorType: CommunityContributorType;
  id: Scalars['UUID']['output'];
  /** The receiver of the notification. */
  receiver: Contributor;
  /** The Space that was joined. */
  space?: Maybe<Space>;
  /** The current state of the notification */
  state: InAppNotificationState;
  /** When (UTC) was the notification sent. */
  triggeredAt: Scalars['DateTime']['output'];
  /** The Contributor who triggered the notification. */
  triggeredBy?: Maybe<Contributor>;
  /** The type of the notification */
  type: NotificationEventType;
};

export enum InAppNotificationState {
  Archived = 'ARCHIVED',
  Read = 'READ',
  Unread = 'UNREAD',
}

export type InAppNotificationUserMentioned = InAppNotification & {
  /** Which category (role) is this notification targeted to. */
  category: InAppNotificationCategory;
  /** The comment that the contributor was mentioned in. */
  comment: Scalars['String']['output'];
  /** The display name of the resource where the comment was created. */
  commentOriginName: Scalars['String']['output'];
  /** The url of the resource where the comment was created. */
  commentUrl: Scalars['String']['output'];
  /** The type of the Contributor that joined. */
  contributorType: CommunityContributorType;
  id: Scalars['UUID']['output'];
  /** The receiver of the notification. */
  receiver: Contributor;
  /** The current state of the notification */
  state: InAppNotificationState;
  /** When (UTC) was the notification sent. */
  triggeredAt: Scalars['DateTime']['output'];
  /** The Contributor who triggered the notification. */
  triggeredBy?: Maybe<Contributor>;
  /** The type of the notification */
  type: NotificationEventType;
};

export type InnovationFlow = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The currently selected state for this Flow. */
  currentState: InnovationFlowState;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The Profile for this InnovationFlow. */
  profile: Profile;
  /** The set of States in use in this Flow. */
  states: Array<InnovationFlowState>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type InnovationFlowState = {
  /** The explation text to clarify the state. */
  description: Scalars['Markdown']['output'];
  /** The display name for the State */
  displayName: Scalars['String']['output'];
};

export type InnovationHub = {
  /** The Innovation Hub account. */
  account: Account;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Flag to control if this InnovationHub is listed in the platform store. */
  listedInStore: Scalars['Boolean']['output'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** The Innovation Hub profile. */
  profile: Profile;
  /** The InnovationHub provider. */
  provider: Contributor;
  /** Visibility of the InnovationHub in searches. */
  searchVisibility: SearchVisibility;
  spaceListFilter?: Maybe<Array<Space>>;
  /** If defined, what type of visibility to filter the Spaces on. You can have only one type of filter active at any given time. */
  spaceVisibilityFilter?: Maybe<SpaceVisibility>;
  /** The subdomain associated with this Innovation Hub. */
  subdomain: Scalars['String']['output'];
  /** Type of Innovation Hub */
  type: InnovationHubType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export enum InnovationHubType {
  List = 'LIST',
  Visibility = 'VISIBILITY',
}

export type InnovationPack = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Flag to control if this InnovationPack is listed in the platform store. */
  listedInStore: Scalars['Boolean']['output'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** The Profile for this InnovationPack. */
  profile: Profile;
  /** The InnovationPack provider. */
  provider: Contributor;
  /** Visibility of the InnovationPack in searches. */
  searchVisibility: SearchVisibility;
  /** The templatesSet in use by this InnovationPack */
  templatesSet?: Maybe<TemplatesSet>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type InnovationPacksInput = {
  /** The number of Discussion entries to return; if omitted return all InnovationPacks. */
  limit?: InputMaybe<Scalars['Float']['input']>;
  /** The sort order of the InnovationPacks to return. Defaults to number of templates Descending. */
  orderBy?: InputMaybe<InnovationPacksOrderBy>;
};

export enum InnovationPacksOrderBy {
  NumberOfTemplatesAsc = 'NUMBER_OF_TEMPLATES_ASC',
  NumberOfTemplatesDesc = 'NUMBER_OF_TEMPLATES_DESC',
  Random = 'RANDOM',
}

export type InputCreatorQueryResults = {
  /** Create an input based on the provided Callout */
  callout?: Maybe<CreateCalloutData>;
  /** Create an input based on the provided Collaboration */
  collaboration?: Maybe<CreateCollaborationData>;
  /** Create an input based on the provided Community Guidelines */
  communityGuidelines?: Maybe<CreateCommunityGuidelinesData>;
  /** Create an input based on the provided InnovationFlow */
  innovationFlow?: Maybe<CreateInnovationFlowData>;
  /** Create an input based on the provided Whiteboard */
  whiteboard?: Maybe<CreateWhiteboardData>;
};

export type InputCreatorQueryResultsCalloutArgs = {
  ID: Scalars['UUID']['input'];
};

export type InputCreatorQueryResultsCollaborationArgs = {
  ID: Scalars['UUID']['input'];
};

export type InputCreatorQueryResultsCommunityGuidelinesArgs = {
  ID: Scalars['UUID']['input'];
};

export type InputCreatorQueryResultsInnovationFlowArgs = {
  ID: Scalars['UUID']['input'];
};

export type InputCreatorQueryResultsWhiteboardArgs = {
  ID: Scalars['UUID']['input'];
};

export type Invitation = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The Contributor who is invited. */
  contributor: Contributor;
  /** The type of contributor that is invited. */
  contributorType: CommunityContributorType;
  /** The User who triggered the invitation. */
  createdBy: User;
  createdDate: Scalars['DateTime']['output'];
  /** An additional role to assign to the Contributor, in addition to the entry Role. */
  extraRole?: Maybe<RoleName>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Whether to also add the invited contributor to the parent community. */
  invitedToParent: Scalars['Boolean']['output'];
  /** Is this lifecycle in a final state (done). */
  isFinalized: Scalars['Boolean']['output'];
  lifecycle: Lifecycle;
  /** The next events of this Lifecycle. */
  nextEvents: Array<Scalars['String']['output']>;
  /** The current state of this Lifecycle. */
  state: Scalars['String']['output'];
  updatedDate: Scalars['DateTime']['output'];
  welcomeMessage?: Maybe<Scalars['String']['output']>;
};

export type InvitationEventInput = {
  eventName: Scalars['String']['input'];
  invitationID: Scalars['UUID']['input'];
};

export type InviteForEntryRoleOnRoleSetInput = {
  /** An additional role to assign to the Contributors, in addition to the entry Role. */
  extraRole?: InputMaybe<RoleName>;
  /** The identifiers for the contributors being invited. */
  invitedContributors: Array<Scalars['UUID']['input']>;
  roleSetID: Scalars['UUID']['input'];
  welcomeMessage?: InputMaybe<Scalars['String']['input']>;
};

export type InviteNewContributorForRoleOnRoleSetInput = {
  email: Scalars['String']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** An additional role to assign to the Contributors, in addition to the entry Role. */
  roleSetExtraRole?: InputMaybe<RoleName>;
  roleSetID: Scalars['UUID']['input'];
  welcomeMessage?: InputMaybe<Scalars['String']['input']>;
};

export type JoinAsEntryRoleOnRoleSetInput = {
  roleSetID: Scalars['UUID']['input'];
};

export type LatestReleaseDiscussion = {
  /** Id of the latest release discussion. */
  id: Scalars['String']['output'];
  /** NameID of the latest release discussion. */
  nameID: Scalars['String']['output'];
};

export type Library = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The InnovationHub listed on this platform */
  innovationHubs: Array<InnovationHub>;
  /** The Innovation Packs in the platform Innovation Library. */
  innovationPacks: Array<InnovationPack>;
  /** The Templates in the Innovation Library, together with information about the InnovationPack. */
  templates: Array<TemplateResult>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The VirtualContributors listed on this platform */
  virtualContributors: Array<VirtualContributor>;
};

export type LibraryInnovationPacksArgs = {
  queryData?: InputMaybe<InnovationPacksInput>;
};

export type LibraryTemplatesArgs = {
  filter?: InputMaybe<LibraryTemplatesFilterInput>;
};

export type LibraryTemplatesFilterInput = {
  /** Return Templates within the Library matching the specified Template Types. */
  types?: InputMaybe<Array<TemplateType>>;
};

export type License = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The set of License Entitlement Types on that entity. */
  availableEntitlements?: Maybe<Array<LicenseEntitlementType>>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The set of Entitlements associated with the License applicable to this entity. */
  entitlements: Array<LicenseEntitlement>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The type of entity that this License is being used with. */
  type?: Maybe<LicenseType>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type LicenseEntitlement = {
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** Data type of the entitlement, e.g. Limit, Feature flag etc. */
  dataType: LicenseEntitlementDataType;
  /** If the Entitlement is enabled */
  enabled: Scalars['Boolean']['output'];
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Whether the specified entitlement is available. */
  isAvailable: Scalars['Boolean']['output'];
  /** Limit of the entitlement */
  limit: Scalars['Float']['output'];
  /** Type of the entitlement, e.g. Space, Whiteboard contributors etc. */
  type: LicenseEntitlementType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The amount of the spcified entitlement used. */
  usage: Scalars['Float']['output'];
};

export enum LicenseEntitlementDataType {
  Flag = 'FLAG',
  Limit = 'LIMIT',
}

export enum LicenseEntitlementType {
  AccountInnovationHub = 'ACCOUNT_INNOVATION_HUB',
  AccountInnovationPack = 'ACCOUNT_INNOVATION_PACK',
  AccountSpaceFree = 'ACCOUNT_SPACE_FREE',
  AccountSpacePlus = 'ACCOUNT_SPACE_PLUS',
  AccountSpacePremium = 'ACCOUNT_SPACE_PREMIUM',
  AccountVirtualContributor = 'ACCOUNT_VIRTUAL_CONTRIBUTOR',
  SpaceFlagSaveAsTemplate = 'SPACE_FLAG_SAVE_AS_TEMPLATE',
  SpaceFlagVirtualContributorAccess = 'SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS',
  SpaceFlagWhiteboardMultiUser = 'SPACE_FLAG_WHITEBOARD_MULTI_USER',
  SpaceFree = 'SPACE_FREE',
  SpacePlus = 'SPACE_PLUS',
  SpacePremium = 'SPACE_PREMIUM',
}

export type LicensePlan = {
  /** Assign this plan to all new Organization accounts */
  assignToNewOrganizationAccounts: Scalars['Boolean']['output'];
  /** Assign this plan to all new User accounts */
  assignToNewUserAccounts: Scalars['Boolean']['output'];
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** Is this plan enabled? */
  enabled: Scalars['Boolean']['output'];
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Is this plan free? */
  isFree: Scalars['Boolean']['output'];
  /** The credential to represent this plan */
  licenseCredential: LicensingCredentialBasedCredentialType;
  /** The name of the License Plan */
  name: Scalars['String']['output'];
  /** The price per month of this plan. */
  pricePerMonth?: Maybe<Scalars['Float']['output']>;
  /** Does this plan require contact support */
  requiresContactSupport: Scalars['Boolean']['output'];
  /** Does this plan require a payment method? */
  requiresPaymentMethod: Scalars['Boolean']['output'];
  /** The sorting order for this Plan. */
  sortOrder: Scalars['Float']['output'];
  /** Is there a trial period enabled */
  trialEnabled: Scalars['Boolean']['output'];
  /** The type of this License Plan. */
  type: LicensingCredentialBasedPlanType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type LicensePolicy = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The set of credential rules that are contained by this License Policy. */
  credentialRules: Array<LicensingCredentialBasedPolicyCredentialRule>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export enum LicenseType {
  Account = 'ACCOUNT',
  Collaboration = 'COLLABORATION',
  Roleset = 'ROLESET',
  Space = 'SPACE',
  Whiteboard = 'WHITEBOARD',
}

export type Licensing = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The License Plans in use on the platform. */
  plans: Array<LicensePlan>;
  /** The LicensePolicy in use by the Licensing setup. */
  policy: LicensePolicy;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export enum LicensingCredentialBasedCredentialType {
  AccountLicensePlus = 'ACCOUNT_LICENSE_PLUS',
  SpaceFeatureSaveAsTemplate = 'SPACE_FEATURE_SAVE_AS_TEMPLATE',
  SpaceFeatureVirtualContributors = 'SPACE_FEATURE_VIRTUAL_CONTRIBUTORS',
  SpaceFeatureWhiteboardMultiUser = 'SPACE_FEATURE_WHITEBOARD_MULTI_USER',
  SpaceLicenseEnterprise = 'SPACE_LICENSE_ENTERPRISE',
  SpaceLicenseFree = 'SPACE_LICENSE_FREE',
  SpaceLicensePlus = 'SPACE_LICENSE_PLUS',
  SpaceLicensePremium = 'SPACE_LICENSE_PREMIUM',
}

export enum LicensingCredentialBasedPlanType {
  AccountFeatureFlag = 'ACCOUNT_FEATURE_FLAG',
  AccountPlan = 'ACCOUNT_PLAN',
  SpaceFeatureFlag = 'SPACE_FEATURE_FLAG',
  SpacePlan = 'SPACE_PLAN',
}

export type LicensingCredentialBasedPolicyCredentialRule = {
  credentialType: LicensingCredentialBasedCredentialType;
  grantedEntitlements: Array<LicensingGrantedEntitlement>;
  name?: Maybe<Scalars['String']['output']>;
};

export type LicensingGrantedEntitlement = {
  limit: Scalars['Float']['output'];
  /** The entitlement that is granted. */
  type: LicenseEntitlementType;
};

export type Lifecycle = {
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type Link = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The Profile for framing the associated Link Contribution. */
  profile: Profile;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** URI of the Link */
  uri: Scalars['String']['output'];
};

export type Location = {
  addressLine1?: Maybe<Scalars['String']['output']>;
  addressLine2?: Maybe<Scalars['String']['output']>;
  /** City of the location. */
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  postalCode?: Maybe<Scalars['String']['output']>;
  stateOrProvince?: Maybe<Scalars['String']['output']>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type LookupByNameQueryResults = {
  /** Lookup the specified InnovationPack using a NameID */
  innovationPack?: Maybe<InnovationPack>;
  /** Lookup the specified Template using a templatesSetId and the template NameID */
  template?: Maybe<Template>;
};

export type LookupByNameQueryResultsInnovationPackArgs = {
  NAMEID: Scalars['NameID']['input'];
};

export type LookupByNameQueryResultsTemplateArgs = {
  NAMEID: Scalars['NameID']['input'];
  templatesSetID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResults = {
  /** Lookup myPrivileges on the specified Account */
  account?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Application */
  application?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Calendar */
  calendar?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified CalendarEvent */
  calendarEvent?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Callout */
  callout?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Collaboration */
  collaboration?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Community */
  community?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Community guidelines */
  communityGuidelines?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Context */
  context?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Document */
  document?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified InnovationFlow */
  innovationFlow?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified InnovationHub */
  innovationHub?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified InnovationPack */
  innovationPack?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Invitation */
  invitation?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified License */
  license?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Post */
  post?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Profile */
  profile?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified RoleSet */
  roleSet?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Room */
  room?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Space */
  space?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified StorageAggregator */
  storageAggregator?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified StorageBucket */
  storageBucket?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Template */
  template?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified TemplatesManager */
  templatesManager?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified TemplatesSet */
  templatesSet?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified User */
  user?: Maybe<Array<AuthorizationPrivilege>>;
  /** A particular VirtualContributor */
  virtualContributor?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup myPrivileges on the specified Whiteboard */
  whiteboard?: Maybe<Array<AuthorizationPrivilege>>;
};

export type LookupMyPrivilegesQueryResultsAccountArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsApplicationArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsCalendarArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsCalendarEventArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsCalloutArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsCollaborationArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsCommunityArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsCommunityGuidelinesArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsContextArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsDocumentArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsInnovationFlowArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsInnovationHubArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsInnovationPackArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsInvitationArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsLicenseArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsPostArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsProfileArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsRoleSetArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsRoomArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsSpaceArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsStorageAggregatorArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsStorageBucketArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsTemplateArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsTemplatesManagerArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsTemplatesSetArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsUserArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsVirtualContributorArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupMyPrivilegesQueryResultsWhiteboardArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResults = {
  /** Lookup the specified Account */
  account?: Maybe<Account>;
  /** Lookup the specified Application */
  application?: Maybe<Application>;
  /** Lookup the specified Authorization Policy */
  authorizationPolicy?: Maybe<Authorization>;
  /** The privileges granted to the specified user based on this Authorization Policy. */
  authorizationPrivilegesForUser?: Maybe<Array<AuthorizationPrivilege>>;
  /** Lookup the specified Calendar */
  calendar?: Maybe<Calendar>;
  /** Lookup the specified CalendarEvent */
  calendarEvent?: Maybe<CalendarEvent>;
  /** Lookup the specified Callout */
  callout?: Maybe<Callout>;
  /** Lookup the specified Collaboration */
  collaboration?: Maybe<Collaboration>;
  /** Lookup the specified Community */
  community?: Maybe<Community>;
  /** Lookup the specified Community guidelines */
  communityGuidelines?: Maybe<CommunityGuidelines>;
  /** Lookup the specified Context */
  context?: Maybe<Context>;
  /** Lookup the specified Document */
  document?: Maybe<Document>;
  /** Lookup the specified InnovationFlow */
  innovationFlow?: Maybe<InnovationFlow>;
  /** Lookup the specified InnovationHub */
  innovationHub?: Maybe<InnovationHub>;
  /** Lookup the specified InnovationPack */
  innovationPack?: Maybe<InnovationPack>;
  /** Lookup the specified Invitation */
  invitation?: Maybe<Invitation>;
  /** Lookup the specified License */
  license?: Maybe<License>;
  /** Lookup myPrivileges on the specified entity. */
  myPrivileges?: Maybe<LookupMyPrivilegesQueryResults>;
  /** Lookup the specified Post */
  post?: Maybe<Post>;
  /** Lookup the specified Profile */
  profile?: Maybe<Profile>;
  /** Lookup the specified RoleSet */
  roleSet?: Maybe<RoleSet>;
  /** Lookup the specified Room */
  room?: Maybe<Room>;
  /** Lookup the specified Space */
  space?: Maybe<Space>;
  /** Lookup the specified StorageAggregator */
  storageAggregator?: Maybe<StorageAggregator>;
  /** Lookup the specified StorageBucket */
  storageBucket?: Maybe<StorageBucket>;
  /** Lookup the specified Template */
  template?: Maybe<Template>;
  /** Lookup the specified TemplatesManager */
  templatesManager?: Maybe<TemplatesManager>;
  /** Lookup the specified TemplatesSet */
  templatesSet?: Maybe<TemplatesSet>;
  /** A particular User */
  user?: Maybe<User>;
  /** A particular VirtualContributor */
  virtualContributor?: Maybe<VirtualContributor>;
  /** Lookup the specified Whiteboard */
  whiteboard?: Maybe<Whiteboard>;
};

export type LookupQueryResultsAccountArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsApplicationArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsAuthorizationPolicyArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsAuthorizationPrivilegesForUserArgs = {
  authorizationPolicyID: Scalars['UUID']['input'];
  userID: Scalars['UUID']['input'];
};

export type LookupQueryResultsCalendarArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsCalendarEventArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsCalloutArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsCollaborationArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsCommunityArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsCommunityGuidelinesArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsContextArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsDocumentArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsInnovationFlowArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsInnovationHubArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsInnovationPackArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsInvitationArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsLicenseArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsPostArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsProfileArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsRoleSetArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsRoomArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsSpaceArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsStorageAggregatorArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsStorageBucketArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsTemplateArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsTemplatesManagerArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsTemplatesSetArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsUserArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsVirtualContributorArgs = {
  ID: Scalars['UUID']['input'];
};

export type LookupQueryResultsWhiteboardArgs = {
  ID: Scalars['UUID']['input'];
};

export type MeQueryResults = {
  /** The community applications current authenticated user can act on. */
  communityApplications: Array<CommunityApplicationResult>;
  /** The invitations the current authenticated user can act on. */
  communityInvitations: Array<CommunityInvitationResult>;
  /** The query id */
  id: Scalars['String']['output'];
  /** The Spaces I am contributing to */
  mySpaces: Array<MySpaceResults>;
  /** The Spaces the current user is a member of as a flat list. */
  spaceMembershipsFlat: Array<CommunityMembershipResult>;
  /** The hierarchy of the Spaces the current user is a member. */
  spaceMembershipsHierarchical: Array<CommunityMembershipResult>;
  /** The current authenticated User;  null if not yet registered on the platform */
  user?: Maybe<User>;
};

export type MeQueryResultsCommunityApplicationsArgs = {
  states?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type MeQueryResultsCommunityInvitationsArgs = {
  states?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type MeQueryResultsMySpacesArgs = {
  limit?: InputMaybe<Scalars['Float']['input']>;
};

/** A message that was sent either as an Update or as part of a Discussion. */
export type Message = {
  /** The id for the message event. */
  id: Scalars['MessageID']['output'];
  /** The message being sent */
  message: Scalars['Markdown']['output'];
  /** Reactions on this message */
  reactions: Array<Reaction>;
  /** The User or Virtual Contributor that created this Message */
  sender?: Maybe<Contributor>;
  /** The message being replied to */
  threadID?: Maybe<Scalars['String']['output']>;
  /** The server timestamp in UTC */
  timestamp: Scalars['Float']['output'];
};

/** A detailed answer to a question, typically from an AI service. */
export type MessageAnswerQuestion = {
  /** Error message if an error occurred */
  error?: Maybe<Scalars['String']['output']>;
  /** The id of the answer; null if an error was returned */
  id?: Maybe<Scalars['String']['output']>;
  /** The original question */
  question: Scalars['String']['output'];
  /** Message successfully sent. If false, error will have the reason. */
  success: Scalars['Boolean']['output'];
};

export type Metadata = {
  /** Collection of metadata about Alkemio services. */
  services: Array<ServiceMetadata>;
};

export type MigrateEmbeddings = {
  /** Result from the mutation execution. */
  success: Scalars['Boolean']['output'];
};

export enum MimeType {
  Avif = 'AVIF',
  Bmp = 'BMP',
  Doc = 'DOC',
  Docx = 'DOCX',
  Gif = 'GIF',
  Jpeg = 'JPEG',
  Jpg = 'JPG',
  Odp = 'ODP',
  Ods = 'ODS',
  Odt = 'ODT',
  Pdf = 'PDF',
  Png = 'PNG',
  Potm = 'POTM',
  Potx = 'POTX',
  Ppsm = 'PPSM',
  Ppsx = 'PPSX',
  Ppt = 'PPT',
  Pptm = 'PPTM',
  Pptx = 'PPTX',
  Svg = 'SVG',
  Webp = 'WEBP',
  Xls = 'XLS',
  Xlsx = 'XLSX',
  Xpng = 'XPNG',
}

export type MoveCalloutContributionInput = {
  /** ID of the Callout to move the Contribution to. */
  calloutID: Scalars['UUID']['input'];
  /** ID of the Contribution to move. */
  contributionID: Scalars['UUID']['input'];
};

export type Mutation = {
  /** Add a reaction to a message from the specified Room. */
  addReactionToMessageInRoom: Reaction;
  /** Ensure all community members are registered for communications. */
  adminCommunicationEnsureAccessToCommunications: Scalars['Boolean']['output'];
  /** Remove an orphaned room from messaging platform. */
  adminCommunicationRemoveOrphanedRoom: Scalars['Boolean']['output'];
  /** Allow updating the state flags of a particular rule. */
  adminCommunicationUpdateRoomState: Scalars['Boolean']['output'];
  /** Ingests new data into Elasticsearch from scratch. This will delete all existing data and ingest new data from the source. This is an admin only operation. */
  adminSearchIngestFromScratch: Scalars['String']['output'];
  /** Update the Avatar on the Profile with the spedified profileID to be stored as a Document. */
  adminUpdateContributorAvatars: Profile;
  /** Remove the Kratos account associated with the specified User. Note: the Users profile on the platform is not deleted. */
  adminUserAccountDelete: User;
  /** Create a test customer on wingback. */
  adminWingbackCreateTestCustomer: Scalars['String']['output'];
  /** Get wingback customer entitlements. */
  adminWingbackGetCustomerEntitlements: Scalars['String']['output'];
  /** Reset the Authorization Policy on the specified AiServer. */
  aiServerAuthorizationPolicyReset: AiServer;
  /** Creates a new AiPersonaService on the aiServer. */
  aiServerCreateAiPersonaService: AiPersonaService;
  /** Deletes the specified AiPersonaService. */
  aiServerDeleteAiPersonaService: AiPersonaService;
  /** Trigger an ingesting of data on the remove AI Persona Service. */
  aiServerPersonaServiceIngest: Scalars['Boolean']['output'];
  /** Updates the specified AI Persona. */
  aiServerUpdateAiPersonaService: AiPersonaService;
  /** Apply to join the specified RoleSet in the entry Role. */
  applyForEntryRoleOnRoleSet: Application;
  /** Ask the chat engine for guidance. */
  askChatGuidanceQuestion: MessageAnswerQuestion;
  /** Assign the specified LicensePlan to an Account. */
  assignLicensePlanToAccount: Account;
  /** Assign the specified LicensePlan to a Space. */
  assignLicensePlanToSpace: Space;
  /** Assigns an Organization Role to user. */
  assignRoleToUser: User;
  /** Assigns a platform role to a User. */
  assignRoleNameToUser: User;
  /** Assigns an Organization a Role in the specified Community. */
  assignRoleToOrganization: Organization;
  /** Assigns a User to a role in the specified Community. */
  assignRoleToUser: User;
  /** Assigns a Virtual Contributor to a role in the specified Community. */
  assignRoleToVirtualContributor: VirtualContributor;
  /** Assigns a User as a member of the specified User Group. */
  assignUserToGroup: UserGroup;
  /** Reset the Authorization Policy on all entities */
  authorizationPolicyResetAll: Scalars['String']['output'];
  /** Reset the Authorization Policy on the specified Account. */
  authorizationPolicyResetOnAccount: Account;
  /** Reset the Authorization Policy on the specified Organization. */
  authorizationPolicyResetOnOrganization: Organization;
  /** Reset the Authorization Policy on the specified Platform. */
  authorizationPolicyResetOnPlatform: Platform;
  /** Reset the Authorization policy on the specified User. */
  authorizationPolicyResetOnUser: User;
  /** Reset the specified Authorization Policy to global admin privileges */
  authorizationPolicyResetToGlobalAdminsAccess: Authorization;
  /** Generate Alkemio user credential offer */
  beginAlkemioUserVerifiedCredentialOfferInteraction: AgentBeginVerifiedCredentialOfferOutput;
  /** Generate community member credential offer */
  beginCommunityMemberVerifiedCredentialOfferInteraction: AgentBeginVerifiedCredentialOfferOutput;
  /** Generate verified credential share request */
  beginVerifiedCredentialRequestInteraction: AgentBeginVerifiedCredentialRequestOutput;
  /** Deletes collections nameID-... */
  cleanupCollections: MigrateEmbeddings;
  /** Creates a new Space by converting an existing Challenge. */
  convertChallengeToSpace: Space;
  /** Creates a new Challenge by converting an existing Opportunity. */
  convertOpportunityToChallenge: Space;
  /** Creates a new Actor in the specified ActorGroup. */
  createActor: Actor;
  /** Create a new Actor Group on the EcosystemModel. */
  createActorGroup: ActorGroup;
  /** Create a new Callout on the Collaboration. */
  createCalloutOnCollaboration: Callout;
  /** Create a guidance chat room. */
  createChatGuidanceRoom?: Maybe<Room>;
  /** Create a new Contribution on the Callout. */
  createContributionOnCallout: CalloutContribution;
  /** Creates a new Discussion as part of this Forum. */
  createDiscussion: Discussion;
  /** Create a new CalendarEvent on the Calendar. */
  createEventOnCalendar: CalendarEvent;
  /** Creates a new User Group in the specified Community. */
  createGroupOnCommunity: UserGroup;
  /** Creates a new User Group for the specified Organization. */
  createGroupOnOrganization: UserGroup;
  /** Create an Innovation Hub on the specified account */
  createInnovationHub: InnovationHub;
  /** Creates a new InnovationPack on an Account. */
  createInnovationPack: InnovationPack;
  /** Create a new LicensePlan on the Licensing. */
  createLicensePlan: LicensePlan;
  /** Creates a new Organization on the platform. */
  createOrganization: Organization;
  /** Creates a new Reference on the specified Profile. */
  createReferenceOnProfile: Reference;
  /** Creates a new Level Zero Space within the specified Account. */
  createSpace: Account;
  /** Creates a new Subspace within the specified Space. */
  createSubspace: Space;
  /** Creates a new Tagset on the specified Profile */
  createTagsetOnProfile: Tagset;
  /** Creates a new Template on the specified TemplatesSet. */
  createTemplate: Template;
  /** Creates a new Template on the specified TemplatesSet using the provided Collaboration as content. */
  createTemplateFromCollaboration: Template;
  /** Creates a new User on the platform. */
  createUser: User;
  /** Creates a new User profile on the platform for a user that has a valid Authentication session. */
  createUserNewRegistration: User;
  /** Creates a new VirtualContributor on an Account. */
  createVirtualContributor: VirtualContributor;
  /** Deletes the specified Actor. */
  deleteActor: Actor;
  /** Deletes the specified Actor Group, including contained Actors. */
  deleteActorGroup: ActorGroup;
  /** Deletes the specified CalendarEvent. */
  deleteCalendarEvent: CalendarEvent;
  /** Delete a Callout. */
  deleteCallout: Callout;
  /** Delete Collaboration. */
  deleteCollaboration: Collaboration;
  /** Deletes the specified Discussion. */
  deleteDiscussion: Discussion;
  /** Deletes the specified Document. */
  deleteDocument: Document;
  /** Delete Innovation Hub. */
  deleteInnovationHub: InnovationHub;
  /** Deletes the specified InnovationPack. */
  deleteInnovationPack: InnovationPack;
  /** Removes the specified User invitation. */
  deleteInvitation: Invitation;
  /** Deletes the specified LicensePlan. */
  deleteLicensePlan: LicensePlan;
  /** Deletes the specified Link. */
  deleteLink: Link;
  /** Deletes the specified Organization. */
  deleteOrganization: Organization;
  /** Removes the specified User platformInvitation. */
  deletePlatformInvitation: PlatformInvitation;
  /** Deletes the specified Post. */
  deletePost: Post;
  /** Deletes the specified Reference. */
  deleteReference: Reference;
  /** Deletes the specified Space. */
  deleteSpace: Space;
  /** Deletes a Storage Bucket */
  deleteStorageBucket: StorageBucket;
  /** Deletes the specified Template. */
  deleteTemplate: Template;
  /** Deletes the specified User. */
  deleteUser: User;
  /** Removes the specified User Application. */
  deleteUserApplication: Application;
  /** Deletes the specified User Group. */
  deleteUserGroup: UserGroup;
  /** Deletes the specified VirtualContributor. */
  deleteVirtualContributor: VirtualContributor;
  /** Deletes the specified Whiteboard. */
  deleteWhiteboard: Whiteboard;
  /** Trigger an event on the Application. */
  eventOnApplication: Application;
  /** Trigger an event on the Invitation. */
  eventOnInvitation: Invitation;
  /** Trigger an event on the Organization Verification. */
  eventOnOrganizationVerification: OrganizationVerification;
  /** Grants an authorization credential to an Organization. */
  grantCredentialToOrganization: Organization;
  /** Grants an authorization credential to a User. */
  grantCredentialToUser: User;
  /** Resets the interaction with the chat engine. */
  ingest: Scalars['Boolean']['output'];
  /** Invite an existing Contriburor to join the specified Community as a member. */
  inviteForEntryRoleOnRoleSet: Array<Invitation>;
  /** Invite a User to join the platform and the specified RoleSet as a member. */
  inviteUserToPlatformAndRoleSet: PlatformInvitation;
  /** Invite a User to join the platform in a particular Platform role e.g. BetaTester */
  inviteUserToPlatformWithRole: PlatformInvitation;
  /** Join the specified RoleSet using the entry Role, without going through an approval process. */
  joinRoleSet: RoleSet;
  /** Reset the License with Entitlements on the specified Account. */
  licenseResetOnAccount: Account;
  /** Sends a message on the specified User`s behalf and returns the room id */
  messageUser: Scalars['String']['output'];
  /** Moves the specified Contribution to another Callout. */
  moveContributionToCallout: CalloutContribution;
  /** Refresh the Bodies of Knowledge on All VCs */
  refreshAllBodiesOfKnowledge: Scalars['Boolean']['output'];
  /** Triggers a request to the backing AI Service to refresh the knowledge that is available to it. */
  refreshVirtualContributorBodyOfKnowledge: Scalars['Boolean']['output'];
  /** Empties the CommunityGuidelines. */
  removeCommunityGuidelinesContent: CommunityGuidelines;
  /** Removes a message. */
  removeMessageOnRoom: Scalars['MessageID']['output'];
  /** Removes Organization Role from user. */
  removeRoleNameFromUser: User;
  /** Removes a User from a platform role. */
  removeRoleNameFromUser: User;
  /** Remove a reaction on a message from the specified Room. */
  removeReactionToMessageInRoom: Scalars['Boolean']['output'];
  /** Removes an Organization from a Role in the specified Community. */
  removeRoleFromOrganization: Organization;
  /** Removes a User from a Role in the specified Community. */
  removeRoleFromUser: User;
  /** Removes a Virtual from a Role in the specified Community. */
  removeRoleFromVirtualContributor: VirtualContributor;
  /** Removes the specified User from specified user group */
  removeUserFromGroup: UserGroup;
  /** Resets the interaction with the chat engine. */
  resetChatGuidance: Scalars['Boolean']['output'];
  /** Reset all license plans on Accounts */
  resetLicenseOnAccounts: Space;
  /** Removes an authorization credential from an Organization. */
  revokeCredentialFromOrganization: Organization;
  /** Removes an authorization credential from a User. */
  revokeCredentialFromUser: User;
  /** Revokes the specified LicensePlan on an Account. */
  revokeLicensePlanFromAccount: Account;
  /** Revokes the specified LicensePlan on a Space. */
  revokeLicensePlanFromSpace: Space;
  /** Sends a reply to a message from the specified Room. */
  sendMessageReplyToRoom: Message;
  /** Send message to Community Leads. */
  sendMessageToCommunityLeads: Scalars['Boolean']['output'];
  /** Send message to an Organization. */
  sendMessageToOrganization: Scalars['Boolean']['output'];
  /** Sends an comment message. Returns the id of the new Update message. */
  sendMessageToRoom: Message;
  /** Send message to a User. */
  sendMessageToUser: Scalars['Boolean']['output'];
  /** Transfer the specified InnovationHub to another Account. */
  transferInnovationHubToAccount: InnovationHub;
  /** Transfer the specified Innovation Pack to another Account. */
  transferInnovationPackToAccount: InnovationPack;
  /** Transfer the specified Space to another Account. */
  transferSpaceToAccount: Space;
  /** Transfer the specified Virtual Contributor to another Account. */
  transferVirtualContributorToAccount: InnovationPack;
  /** Updates the specified Actor. */
  updateActor: Actor;
  /** Updates the specified AiPersona. */
  updateAiPersona: AiPersona;
  /** User vote if a specific answer is relevant. */
  updateAnswerRelevance: Scalars['Boolean']['output'];
  /** Update the Application Form used by this RoleSet. */
  updateApplicationFormOnRoleSet: RoleSet;
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
  /** Updates the Collaboration, including InnovationFlow states, from the specified Collaboration Template. */
  updateCollaborationFromTemplate: Collaboration;
  /** Updates the CommunityGuidelines. */
  updateCommunityGuidelines: CommunityGuidelines;
  /** Update the sortOrder field of the Contributions of s Callout. */
  updateContributionsSortOrder: Array<CalloutContribution>;
  /** Updates the specified Discussion. */
  updateDiscussion: Discussion;
  /** Updates the specified Document. */
  updateDocument: Document;
  /** Updates the specified EcosystemModel. */
  updateEcosystemModel: EcosystemModel;
  /** Updates the InnovationFlow. */
  updateInnovationFlow: InnovationFlow;
  /** Updates the InnovationFlow. */
  updateInnovationFlowSelectedState: InnovationFlow;
  /** Updates the specified InnovationFlowState. */
  updateInnovationFlowSingleState: InnovationFlow;
  /** Update Innovation Hub. */
  updateInnovationHub: InnovationHub;
  /** Updates the InnovationPack. */
  updateInnovationPack: InnovationPack;
  /** Updates the LicensePlan. */
  updateLicensePlan: LicensePlan;
  /** Updates the specified Link. */
  updateLink: Link;
  /** Update notification state and return the notification. */
  updateNotificationState: InAppNotificationState;
  /** Updates the specified Organization. */
  updateOrganization: Organization;
  /** Updates the specified Organization platform settings. */
  updateOrganizationPlatformSettings: Organization;
  /** Updates one of the Setting on an Organization */
  updateOrganizationSettings: Organization;
  /** Updates the specified Post. */
  updatePost: Post;
  /** Updates one of the Preferences on a Space */
  updatePreferenceOnUser: Preference;
  /** Updates the specified Profile. */
  updateProfile: Profile;
  /** Updates the specified Reference. */
  updateReference: Reference;
  /** Updates the Space. */
  updateSpace: Space;
  /** Update the platform settings, such as nameID, of the specified Space. */
  updateSpacePlatformSettings: Space;
  /** Updates one of the Setting on a Space */
  updateSpaceSettings: Space;
  /** Updates the specified Tagset. */
  updateTagset: Tagset;
  /** Updates the specified Template. */
  updateTemplate: Template;
  /** Updates the specified Template Defaults. */
  updateTemplateDefault: TemplateDefault;
  /** Updates the specified Collaboration Template using the provided Collaboration. */
  updateTemplateFromCollaboration: Template;
  /** Updates the User. */
  updateUser: User;
  /** Updates the specified User Group. */
  updateUserGroup: UserGroup;
  /** Update the platform settings, such as nameID, email, for the specified User. */
  updateUserPlatformSettings: User;
  /** Updates one of the Setting on a User */
  updateUserSettings: User;
  /** Updates the specified VirtualContributor. */
  updateVirtualContributor: VirtualContributor;
  /** Updates the image URI for the specified Visual. */
  updateVisual: Visual;
  /** Updates the specified Whiteboard. */
  updateWhiteboard: Whiteboard;
  /** Create a new Document on the Storage and return the value as part of the returned Link. */
  uploadFileOnLink: Link;
  /** Create a new Document on the Storage and return the value as part of the returned Reference. */
  uploadFileOnReference: Reference;
  /** Create a new Document on the Storage and return the public Url. */
  uploadFileOnStorageBucket: Scalars['String']['output'];
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

export type MutationAdminCommunicationUpdateRoomStateArgs = {
  roomStateData: CommunicationAdminUpdateRoomStateInput;
};

export type MutationAdminUpdateContributorAvatarsArgs = {
  profileID: Scalars['UUID']['input'];
};

export type MutationAdminUserAccountDeleteArgs = {
  userID: Scalars['UUID']['input'];
};

export type MutationAdminWingbackGetCustomerEntitlementsArgs = {
  customerID: Scalars['String']['input'];
};

export type MutationAiServerCreateAiPersonaServiceArgs = {
  aiPersonaServiceData: CreateAiPersonaServiceInput;
};

export type MutationAiServerDeleteAiPersonaServiceArgs = {
  deleteData: DeleteAiPersonaServiceInput;
};

export type MutationAiServerPersonaServiceIngestArgs = {
  ingestData: AiPersonaServiceIngestInput;
};

export type MutationAiServerUpdateAiPersonaServiceArgs = {
  aiPersonaServiceData: UpdateAiPersonaServiceInput;
};

export type MutationApplyForEntryRoleOnRoleSetArgs = {
  applicationData: ApplyForEntryRoleOnRoleSetInput;
};

export type MutationAskChatGuidanceQuestionArgs = {
  chatData: ChatGuidanceInput;
};

export type MutationAssignLicensePlanToAccountArgs = {
  planData: AssignLicensePlanToAccount;
};

export type MutationAssignLicensePlanToSpaceArgs = {
  planData: AssignLicensePlanToSpace;
};

export type MutationassignRoleToUserArgs = {
  roleData: AssignRoleOnRoleSetToUserInput;
};

export type MutationAssignRoleNameToUserArgs = {
  roleData: AssignRoleOnRoleSetToUserInput;
};

export type MutationAssignRoleToOrganizationArgs = {
  roleData: AssignRoleOnRoleSetToOrganizationInput;
};

export type MutationAssignRoleToUserArgs = {
  roleData: AssignRoleOnRoleSetToUserInput;
};

export type MutationAssignRoleToVirtualContributorArgs = {
  roleData: AssignRoleOnRoleSetToVirtualContributorInput;
};

export type MutationAssignUserToGroupArgs = {
  roleData: AssignUserGroupMemberInput;
};

export type MutationAuthorizationPolicyResetOnAccountArgs = {
  authorizationResetData: AccountAuthorizationResetInput;
};

export type MutationAuthorizationPolicyResetOnOrganizationArgs = {
  authorizationResetData: OrganizationAuthorizationResetInput;
};

export type MutationAuthorizationPolicyResetOnUserArgs = {
  authorizationResetData: UserAuthorizationResetInput;
};

export type MutationAuthorizationPolicyResetToGlobalAdminsAccessArgs = {
  authorizationID: Scalars['String']['input'];
};

export type MutationBeginCommunityMemberVerifiedCredentialOfferInteractionArgs =
  {
    communityID: Scalars['String']['input'];
  };

export type MutationBeginVerifiedCredentialRequestInteractionArgs = {
  types: Array<Scalars['String']['input']>;
};

export type MutationConvertChallengeToSpaceArgs = {
  convertData: ConvertSubspaceToSpaceInput;
};

export type MutationConvertOpportunityToChallengeArgs = {
  convertData: ConvertSubsubspaceToSubspaceInput;
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

export type MutationCreateContributionOnCalloutArgs = {
  contributionData: CreateContributionOnCalloutInput;
};

export type MutationCreateDiscussionArgs = {
  createData: ForumCreateDiscussionInput;
};

export type MutationCreateEventOnCalendarArgs = {
  eventData: CreateCalendarEventOnCalendarInput;
};

export type MutationCreateGroupOnCommunityArgs = {
  groupData: CreateUserGroupInput;
};

export type MutationCreateGroupOnOrganizationArgs = {
  groupData: CreateUserGroupInput;
};

export type MutationCreateInnovationHubArgs = {
  createData: CreateInnovationHubOnAccountInput;
};

export type MutationCreateInnovationPackArgs = {
  innovationPackData: CreateInnovationPackOnAccountInput;
};

export type MutationCreateLicensePlanArgs = {
  planData: CreateLicensePlanOnLicensingFrameworkInput;
};

export type MutationCreateOrganizationArgs = {
  organizationData: CreateOrganizationInput;
};

export type MutationCreateReferenceOnProfileArgs = {
  referenceInput: CreateReferenceOnProfileInput;
};

export type MutationCreateSpaceArgs = {
  spaceData: CreateSpaceOnAccountInput;
};

export type MutationCreateSubspaceArgs = {
  subspaceData: CreateSubspaceInput;
};

export type MutationCreateTagsetOnProfileArgs = {
  tagsetData: CreateTagsetOnProfileInput;
};

export type MutationCreateTemplateArgs = {
  templateData: CreateTemplateOnTemplatesSetInput;
};

export type MutationCreateTemplateFromCollaborationArgs = {
  templateData: CreateTemplateFromCollaborationOnTemplatesSetInput;
};

export type MutationCreateUserArgs = {
  userData: CreateUserInput;
};

export type MutationCreateVirtualContributorArgs = {
  virtualContributorData: CreateVirtualContributorOnAccountInput;
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

export type MutationDeleteCollaborationArgs = {
  deleteData: DeleteCollaborationInput;
};

export type MutationDeleteDiscussionArgs = {
  deleteData: DeleteDiscussionInput;
};

export type MutationDeleteDocumentArgs = {
  deleteData: DeleteDocumentInput;
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

export type MutationDeleteLicensePlanArgs = {
  deleteData: DeleteLicensePlanInput;
};

export type MutationDeleteLinkArgs = {
  deleteData: DeleteLinkInput;
};

export type MutationDeleteOrganizationArgs = {
  deleteData: DeleteOrganizationInput;
};

export type MutationDeletePlatformInvitationArgs = {
  deleteData: DeletePlatformInvitationInput;
};

export type MutationDeletePostArgs = {
  deleteData: DeletePostInput;
};

export type MutationDeleteReferenceArgs = {
  deleteData: DeleteReferenceInput;
};

export type MutationDeleteSpaceArgs = {
  deleteData: DeleteSpaceInput;
};

export type MutationDeleteStorageBucketArgs = {
  deleteData: DeleteStorageBuckeetInput;
};

export type MutationDeleteTemplateArgs = {
  deleteData: DeleteTemplateInput;
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

export type MutationDeleteVirtualContributorArgs = {
  deleteData: DeleteVirtualContributorInput;
};

export type MutationDeleteWhiteboardArgs = {
  whiteboardData: DeleteWhiteboardInput;
};

export type MutationEventOnApplicationArgs = {
  eventData: ApplicationEventInput;
};

export type MutationEventOnInvitationArgs = {
  eventData: InvitationEventInput;
};

export type MutationEventOnOrganizationVerificationArgs = {
  eventData: OrganizationVerificationEventInput;
};

export type MutationGrantCredentialToOrganizationArgs = {
  grantCredentialData: GrantOrganizationAuthorizationCredentialInput;
};

export type MutationGrantCredentialToUserArgs = {
  grantCredentialData: GrantAuthorizationCredentialInput;
};

export type MutationinviteForEntryRoleOnRoleSetArgs = {
  invitationData: InviteForEntryRoleOnRoleSetInput;
};

export type MutationInviteUserToPlatformAndRoleSetArgs = {
  invitationData: InviteNewContributorForRoleOnRoleSetInput;
};

export type MutationInviteUserToPlatformWithRoleArgs = {
  invitationData: CreatePlatformInvitationForRoleInput;
};

export type MutationJoinRoleSetArgs = {
  joinData: JoinAsEntryRoleOnRoleSetInput;
};

export type MutationLicenseResetOnAccountArgs = {
  resetData: AccountLicenseResetInput;
};

export type MutationMessageUserArgs = {
  messageData: UserSendMessageInput;
};

export type MutationMoveContributionToCalloutArgs = {
  moveContributionData: MoveCalloutContributionInput;
};

export type MutationRefreshVirtualContributorBodyOfKnowledgeArgs = {
  refreshData: RefreshVirtualContributorBodyOfKnowledgeInput;
};

export type MutationRemoveCommunityGuidelinesContentArgs = {
  communityGuidelinesData: RemoveCommunityGuidelinesContentInput;
};

export type MutationRemoveMessageOnRoomArgs = {
  messageData: RoomRemoveMessageInput;
};

export type MutationRemoveRoleNameFromUserArgs = {
  roleData: RemoveRoleNameFromUserInput;
};

export type MutationRemoveRoleNameFromUserArgs = {
  roleData: RemoveRoleOnRoleSetFromUserInput;
};

export type MutationRemoveReactionToMessageInRoomArgs = {
  reactionData: RoomRemoveReactionToMessageInput;
};

export type MutationRemoveRoleFromOrganizationArgs = {
  roleData: RemoveRoleOnRoleSetFromOrganizationInput;
};

export type MutationRemoveRoleFromUserArgs = {
  roleData: RemoveRoleOnRoleSetFromUserInput;
};

export type MutationRemoveRoleFromVirtualContributorArgs = {
  roleData: RemoveRoleOnRoleSetFromVirtualContributorInput;
};

export type MutationRemoveUserFromGroupArgs = {
  roleData: RemoveUserGroupMemberInput;
};

export type MutationRevokeCredentialFromOrganizationArgs = {
  revokeCredentialData: RevokeOrganizationAuthorizationCredentialInput;
};

export type MutationRevokeCredentialFromUserArgs = {
  revokeCredentialData: RevokeAuthorizationCredentialInput;
};

export type MutationRevokeLicensePlanFromAccountArgs = {
  planData: RevokeLicensePlanFromAccount;
};

export type MutationRevokeLicensePlanFromSpaceArgs = {
  planData: RevokeLicensePlanFromSpace;
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

export type MutationTransferInnovationHubToAccountArgs = {
  transferData: TransferAccountInnovationHubInput;
};

export type MutationTransferInnovationPackToAccountArgs = {
  transferData: TransferAccountInnovationPackInput;
};

export type MutationTransferSpaceToAccountArgs = {
  transferData: TransferAccountSpaceInput;
};

export type MutationTransferVirtualContributorToAccountArgs = {
  transferData: TransferAccountVirtualContributorInput;
};

export type MutationUpdateActorArgs = {
  actorData: UpdateActorInput;
};

export type MutationUpdateAiPersonaArgs = {
  aiPersonaData: UpdateAiPersonaInput;
};

export type MutationUpdateAnswerRelevanceArgs = {
  input: ChatGuidanceAnswerRelevanceInput;
};

export type MutationUpdateApplicationFormOnRoleSetArgs = {
  applicationFormData: UpdateApplicationFormOnRoleSetInput;
};

export type MutationUpdateCalendarEventArgs = {
  eventData: UpdateCalendarEventInput;
};

export type MutationUpdateCalloutArgs = {
  calloutData: UpdateCalloutEntityInput;
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

export type MutationUpdateCollaborationFromTemplateArgs = {
  updateData: UpdateCollaborationFromTemplateInput;
};

export type MutationUpdateCommunityGuidelinesArgs = {
  communityGuidelinesData: UpdateCommunityGuidelinesEntityInput;
};

export type MutationUpdateContributionsSortOrderArgs = {
  sortOrderData: UpdateContributionCalloutsSortOrderInput;
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
  innovationFlowData: UpdateInnovationFlowEntityInput;
};

export type MutationUpdateInnovationFlowSelectedStateArgs = {
  innovationFlowStateData: UpdateInnovationFlowSelectedStateInput;
};

export type MutationUpdateInnovationFlowSingleStateArgs = {
  innovationFlowStateData: UpdateInnovationFlowSingleStateInput;
};

export type MutationUpdateInnovationHubArgs = {
  updateData: UpdateInnovationHubInput;
};

export type MutationUpdateInnovationPackArgs = {
  innovationPackData: UpdateInnovationPackInput;
};

export type MutationUpdateLicensePlanArgs = {
  updateData: UpdateLicensePlanInput;
};

export type MutationUpdateLinkArgs = {
  linkData: UpdateLinkInput;
};

export type MutationUpdateNotificationStateArgs = {
  notificationData: UpdateNotificationStateInput;
};

export type MutationUpdateOrganizationArgs = {
  organizationData: UpdateOrganizationInput;
};

export type MutationUpdateOrganizationPlatformSettingsArgs = {
  organizationData: UpdateOrganizationPlatformSettingsInput;
};

export type MutationUpdateOrganizationSettingsArgs = {
  settingsData: UpdateOrganizationSettingsInput;
};

export type MutationUpdatePostArgs = {
  postData: UpdatePostInput;
};

export type MutationUpdatePreferenceOnUserArgs = {
  preferenceData: UpdateUserPreferenceInput;
};

export type MutationUpdateProfileArgs = {
  profileData: UpdateProfileDirectInput;
};

export type MutationUpdateReferenceArgs = {
  referenceData: UpdateReferenceInput;
};

export type MutationUpdateSpaceArgs = {
  spaceData: UpdateSpaceInput;
};

export type MutationUpdateSpacePlatformSettingsArgs = {
  updateData: UpdateSpacePlatformSettingsInput;
};

export type MutationUpdateSpaceSettingsArgs = {
  settingsData: UpdateSpaceSettingsInput;
};

export type MutationUpdateTagsetArgs = {
  updateData: UpdateTagsetInput;
};

export type MutationUpdateTemplateArgs = {
  updateData: UpdateTemplateInput;
};

export type MutationUpdateTemplateDefaultArgs = {
  templateDefaultData: UpdateTemplateDefaultTemplateInput;
};

export type MutationUpdateTemplateFromCollaborationArgs = {
  updateData: UpdateTemplateFromCollaborationInput;
};

export type MutationUpdateUserArgs = {
  userData: UpdateUserInput;
};

export type MutationUpdateUserGroupArgs = {
  userGroupData: UpdateUserGroupInput;
};

export type MutationUpdateUserPlatformSettingsArgs = {
  updateData: UpdateUserPlatformSettingsInput;
};

export type MutationUpdateUserSettingsArgs = {
  settingsData: UpdateUserSettingsInput;
};

export type MutationUpdateVirtualContributorArgs = {
  virtualContributorData: UpdateVirtualContributorInput;
};

export type MutationUpdateVisualArgs = {
  updateData: UpdateVisualInput;
};

export type MutationUpdateWhiteboardArgs = {
  whiteboardData: UpdateWhiteboardEntityInput;
};

export type MutationUploadFileOnLinkArgs = {
  file: Scalars['Upload']['input'];
  uploadData: StorageBucketUploadFileOnLinkInput;
};

export type MutationUploadFileOnReferenceArgs = {
  file: Scalars['Upload']['input'];
  uploadData: StorageBucketUploadFileOnReferenceInput;
};

export type MutationUploadFileOnStorageBucketArgs = {
  file: Scalars['Upload']['input'];
  uploadData: StorageBucketUploadFileInput;
};

export type MutationUploadImageOnVisualArgs = {
  file: Scalars['Upload']['input'];
  uploadData: VisualUploadImageInput;
};

export enum MutationType {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE',
}

export type MySpaceResults = {
  latestActivity?: Maybe<ActivityLogEntry>;
  space: Space;
};

export type Nvp = {
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  value: Scalars['String']['output'];
};

/** The type of the notification */
export enum NotificationEventType {
  CollaborationCalloutPublished = 'COLLABORATION_CALLOUT_PUBLISHED',
  CollaborationDiscussionComment = 'COLLABORATION_DISCUSSION_COMMENT',
  CollaborationPostComment = 'COLLABORATION_POST_COMMENT',
  CollaborationPostCreated = 'COLLABORATION_POST_CREATED',
  CollaborationWhiteboardCreated = 'COLLABORATION_WHITEBOARD_CREATED',
  CommentReply = 'COMMENT_REPLY',
  CommunicationCommentSent = 'COMMUNICATION_COMMENT_SENT',
  CommunicationCommunityMessage = 'COMMUNICATION_COMMUNITY_MESSAGE',
  CommunicationOrganizationMention = 'COMMUNICATION_ORGANIZATION_MENTION',
  CommunicationOrganizationMessage = 'COMMUNICATION_ORGANIZATION_MESSAGE',
  CommunicationUpdateSent = 'COMMUNICATION_UPDATE_SENT',
  CommunicationUserMention = 'COMMUNICATION_USER_MENTION',
  CommunicationUserMessage = 'COMMUNICATION_USER_MESSAGE',
  CommunityApplicationCreated = 'COMMUNITY_APPLICATION_CREATED',
  CommunityInvitationCreated = 'COMMUNITY_INVITATION_CREATED',
  CommunityInvitationCreatedVc = 'COMMUNITY_INVITATION_CREATED_VC',
  CommunityNewMember = 'COMMUNITY_NEW_MEMBER',
  CommunityPlatformInvitationCreated = 'COMMUNITY_PLATFORM_INVITATION_CREATED',
  PlatformForumDiscussionComment = 'PLATFORM_FORUM_DISCUSSION_COMMENT',
  PlatformForumDiscussionCreated = 'PLATFORM_FORUM_DISCUSSION_CREATED',
  PlatformGlobalRoleChange = 'PLATFORM_GLOBAL_ROLE_CHANGE',
  PlatformUserInvitedToRole = 'PLATFORM_USER_INVITED_TO_ROLE',
  PlatformUserRegistered = 'PLATFORM_USER_REGISTERED',
  PlatformUserRemoved = 'PLATFORM_USER_REMOVED',
  SpaceCreated = 'SPACE_CREATED',
}

export type Organization = Contributor &
  Groupable & {
    /** The account hosted by this Organization. */
    account?: Maybe<Account>;
    /** All Users that are admins of this Organization. */
    admins?: Maybe<Array<User>>;
    /** The Agent representing this User. */
    agent: Agent;
    /** All Users that are associated with this Organization. */
    associates?: Maybe<Array<User>>;
    /** The authorization rules for the Contributor */
    authorization?: Maybe<Authorization>;
    /** Organization contact email */
    contactEmail?: Maybe<Scalars['String']['output']>;
    /** The date at which the entity was created. */
    createdDate?: Maybe<Scalars['DateTime']['output']>;
    /** Domain name; what is verified, eg. alkem.io */
    domain?: Maybe<Scalars['String']['output']>;
    /** Group defined on this organization. */
    group?: Maybe<UserGroup>;
    /** Groups defined on this organization. */
    groups?: Maybe<Array<UserGroup>>;
    /** The ID of the Contributor */
    id: Scalars['UUID']['output'];
    /** Legal name - required if hosting an Space */
    legalEntityName?: Maybe<Scalars['String']['output']>;
    /** Metrics about the activity within this Organization. */
    metrics?: Maybe<Array<Nvp>>;
    /** The roles on this Organization for the currently logged in user. */
    myRoles?: Maybe<Array<RoleName>>;
    /** A name identifier of the Contributor, unique within a given scope. */
    nameID: Scalars['NameID']['output'];
    /** All Users that are owners of this Organization. */
    owners?: Maybe<Array<User>>;
    /** The profile for this Organization. */
    profile: Profile;
    /** The settings for this Organization. */
    settings: OrganizationSettings;
    /** The StorageAggregator for managing storage buckets in use by this Organization */
    storageAggregator?: Maybe<StorageAggregator>;
    /** The date at which the entity was last updated. */
    updatedDate?: Maybe<Scalars['DateTime']['output']>;
    verification: OrganizationVerification;
    /** Organization website */
    website?: Maybe<Scalars['String']['output']>;
  };

export type OrganizationGroupArgs = {
  ID: Scalars['UUID']['input'];
};

export type OrganizationAuthorizationResetInput = {
  /** The identifier of the Organization whose Authorization Policy should be reset. */
  organizationID: Scalars['UUID']['input'];
};

export type OrganizationFilterInput = {
  contactEmail?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  domain?: InputMaybe<Scalars['String']['input']>;
  nameID?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export enum RoleName {
  Admin = 'ADMIN',
  Associate = 'ASSOCIATE',
  Owner = 'OWNER',
}

export type OrganizationSettings = {
  /** The membership settings for this Organization. */
  membership: OrganizationSettingsMembership;
  /** The privacy settings for this Organization */
  privacy: OrganizationSettingsPrivacy;
};

export type OrganizationSettingsMembership = {
  /** Allow Users with email addresses matching the domain of this Organization to join. */
  allowUsersMatchingDomainToJoin: Scalars['Boolean']['output'];
};

export type OrganizationSettingsPrivacy = {
  /** Allow contribution roles (membership, lead etc) in Spaces to be visible. */
  contributionRolesPubliclyVisible: Scalars['Boolean']['output'];
};

export type OrganizationVerification = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Is this lifecycle in a final state (done). */
  isFinalized: Scalars['Boolean']['output'];
  lifecycle: Lifecycle;
  /** The next events of this Lifecycle. */
  nextEvents: Array<Scalars['String']['output']>;
  /** The current state of this Lifecycle. */
  state: Scalars['String']['output'];
  /** Organization verification type */
  status: OrganizationVerificationEnum;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export enum OrganizationVerificationEnum {
  NotVerified = 'NOT_VERIFIED',
  VerifiedManualAttestation = 'VERIFIED_MANUAL_ATTESTATION',
}

export type OrganizationVerificationEventInput = {
  eventName: Scalars['String']['input'];
  organizationVerificationID: Scalars['UUID']['input'];
};

export type OryConfig = {
  /** Ory Issuer. */
  issuer: Scalars['String']['output'];
  /** Ory Kratos Public Base URL. Used by all Kratos Public Clients. */
  kratosPublicBaseURL: Scalars['String']['output'];
};

export type PageInfo = {
  /** The last cursor of the page result */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Indicate whether more items exist after the returned ones */
  hasNextPage: Scalars['Boolean']['output'];
  /** Indicate whether more items exist before the returned ones */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The first cursor of the page result */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PaginatedOrganization = {
  organization: Array<Organization>;
  pageInfo: PageInfo;
  total: Scalars['Float']['output'];
};

export type PaginatedSpaces = {
  pageInfo: PageInfo;
  spaces: Array<Space>;
  total: Scalars['Float']['output'];
};

export type PaginatedUsers = {
  pageInfo: PageInfo;
  total: Scalars['Float']['output'];
  users: Array<User>;
};

export type Platform = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** Alkemio configuration. Provides configuration to external services in the Alkemio ecosystem. */
  configuration: Config;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The Forum for the platform */
  forum: Forum;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Details about the current Innovation Hub you are in. */
  innovationHub?: Maybe<InnovationHub>;
  /** The latest release discussion. */
  latestReleaseDiscussion?: Maybe<LatestReleaseDiscussion>;
  /** The Innovation Library for the platform */
  library: Library;
  /** The Licensing in use by the platform. */
  licensingFramework: Licensing;
  /** Alkemio Services Metadata. */
  metadata: Metadata;
  /** The roles on the Platform for the currently logged in user. */
  myRoles: Array<RoleName>;
  /** Invitations to join roles for users not yet on the Alkemio platform. */
  platformInvitations: Array<PlatformInvitation>;
  /** The StorageAggregator with documents in use by Users + Organizations on the Platform. */
  storageAggregator: StorageAggregator;
  /** The TemplatesManager in use by the Platform */
  templatesManager?: Maybe<TemplatesManager>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type PlatformInnovationHubArgs = {
  id?: InputMaybe<Scalars['UUID_NAMEID']['input']>;
  subdomain?: InputMaybe<Scalars['String']['input']>;
};

export type PlatformFeatureFlag = {
  /** Is this feature flag enabled? */
  enabled: Scalars['Boolean']['output'];
  /** The name of the feature flag */
  name: PlatformFeatureFlagName;
};

export enum PlatformFeatureFlagName {
  Communications = 'COMMUNICATIONS',
  CommunicationsDiscussions = 'COMMUNICATIONS_DISCUSSIONS',
  GuidenceEngine = 'GUIDENCE_ENGINE',
  LandingPage = 'LANDING_PAGE',
  Notifications = 'NOTIFICATIONS',
  Ssi = 'SSI',
  Subscriptions = 'SUBSCRIPTIONS',
  Whiteboards = 'WHITEBOARDS',
}

export type PlatformInvitation = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The User who triggered the platformInvitation. */
  createdBy: User;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The email address of the external user being invited */
  email: Scalars['String']['output'];
  firstName?: Maybe<Scalars['String']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  /** The platform role the user will receive when they sign up */
  RoleName?: Maybe<RoleName>;
  /** Whether a new user profile has been created. */
  profileCreated: Scalars['Boolean']['output'];
  /** An additional role to assign to the Contributor, in addition to the entry Role. */
  roleSetExtraRole?: Maybe<RoleName>;
  /** Whether to also add the invited user to the parent community. */
  roleSetInvitedToParent: Scalars['Boolean']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  welcomeMessage?: Maybe<Scalars['String']['output']>;
};

export type PlatformLocations = {
  /** URL to a page about the platform */
  about: Scalars['String']['output'];
  /** URL where users can get tips and tricks */
  aup: Scalars['String']['output'];
  /** URL to the blog of the platform */
  blog: Scalars['String']['output'];
  /** URL where users can see the community forum */
  community: Scalars['String']['output'];
  /** URL for the link Contact in the HomePage and to create a new space with Enterprise plan */
  contactsupport: Scalars['String']['output'];
  /** URL for the documentation site */
  documentation: Scalars['String']['output'];
  /** Main domain of the environment */
  domain: Scalars['String']['output'];
  /** Name of the environment */
  environment: Scalars['String']['output'];
  /** URL to a form for providing feedback */
  feedback: Scalars['String']['output'];
  /** URL to latest forum release discussion where users can get information about the latest release */
  forumreleases: Scalars['String']['output'];
  /** URL for the link Foundation in the HomePage of the application */
  foundation: Scalars['String']['output'];
  /** URL where users can get help */
  help: Scalars['String']['output'];
  /** URL for the link Impact in the HomePage of the application */
  impact: Scalars['String']['output'];
  /** URL to a page about the innovation library */
  innovationLibrary: Scalars['String']['output'];
  /** URL to a page about the collaboration tools */
  inspiration: Scalars['String']['output'];
  /** URL to the landing page of the platform */
  landing: Scalars['String']['output'];
  /** URL where new users can get onboarding help */
  newuser: Scalars['String']['output'];
  /** URL for the link Opensource in the HomePage of the application */
  opensource: Scalars['String']['output'];
  /** URL to the privacy policy for the platform */
  privacy: Scalars['String']['output'];
  /** URL where users can get information about previous releases */
  releases: Scalars['String']['output'];
  /** URL to the security policy for the platform */
  security: Scalars['String']['output'];
  /** URL where users can get support for the platform */
  support: Scalars['String']['output'];
  /** URL for the link Contact in the HomePage to switch between plans */
  switchplan: Scalars['String']['output'];
  /** URL to the terms of usage for the platform */
  terms: Scalars['String']['output'];
  /** URL where users can get tips and tricks */
  tips: Scalars['String']['output'];
};

export enum RoleName {
  BetaTester = 'BETA_TESTER',
  CommunityReader = 'COMMUNITY_READER',
  GlobalAdmin = 'GLOBAL_ADMIN',
  LicenseManager = 'LICENSE_MANAGER',
  SpacesReader = 'SPACES_READER',
  Support = 'SUPPORT',
  VcCampaign = 'VC_CAMPAIGN',
}

export type Post = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The comments on this Post. */
  comments: Room;
  /** The user that created this Post */
  createdBy?: Maybe<User>;
  /** The date at which the entity was created. */
  createdDate: Scalars['DateTime']['output'];
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** The Profile for this Post. */
  profile: Profile;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type Preference = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The definition for the Preference */
  definition: PreferenceDefinition;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** Value of the preference */
  value: Scalars['String']['output'];
};

export type PreferenceDefinition = {
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** Preference description */
  description: Scalars['String']['output'];
  /** The name */
  displayName: Scalars['String']['output'];
  /** The group for the preference within the containing entity type. */
  group: Scalars['String']['output'];
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The type of the Preference, specific to the Entity it is on. */
  type: PreferenceType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** Preference value type */
  valueType: PreferenceValueType;
};

export enum PreferenceType {
  NotificationApplicationReceived = 'NOTIFICATION_APPLICATION_RECEIVED',
  NotificationApplicationSubmitted = 'NOTIFICATION_APPLICATION_SUBMITTED',
  NotificationCalloutPublished = 'NOTIFICATION_CALLOUT_PUBLISHED',
  NotificationCommentReply = 'NOTIFICATION_COMMENT_REPLY',
  NotificationCommunicationDiscussionCreated = 'NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED',
  NotificationCommunicationDiscussionCreatedAdmin = 'NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED_ADMIN',
  NotificationCommunicationMention = 'NOTIFICATION_COMMUNICATION_MENTION',
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
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** A description of the entity associated with this profile. */
  description?: Maybe<Scalars['Markdown']['output']>;
  /** The display name. */
  displayName: Scalars['String']['output'];
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The location for this Profile. */
  location?: Maybe<Location>;
  /** A list of URLs to relevant information. */
  references?: Maybe<Array<Reference>>;
  /** The storage bucket for this Profile. */
  storageBucket: StorageBucket;
  /** The tagline for this entity. */
  tagline?: Maybe<Scalars['String']['output']>;
  /** The default or named tagset. */
  tagset?: Maybe<Tagset>;
  /** A list of named tagsets, each of which has a list of tags. */
  tagsets?: Maybe<Array<Tagset>>;
  /** A type of entity that this Profile is being used with. */
  type?: Maybe<ProfileType>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The URL at which this profile can be viewed. */
  url: Scalars['String']['output'];
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
  userEmail: Scalars['String']['output'];
  /** The vc. */
  vc: Scalars['String']['output'];
};

export enum ProfileType {
  CalendarEvent = 'CALENDAR_EVENT',
  CalloutFraming = 'CALLOUT_FRAMING',
  Challenge = 'CHALLENGE',
  CommunityGuidelines = 'COMMUNITY_GUIDELINES',
  ContributionLink = 'CONTRIBUTION_LINK',
  Discussion = 'DISCUSSION',
  InnovationFlow = 'INNOVATION_FLOW',
  InnovationHub = 'INNOVATION_HUB',
  InnovationPack = 'INNOVATION_PACK',
  Opportunity = 'OPPORTUNITY',
  Organization = 'ORGANIZATION',
  Post = 'POST',
  Space = 'SPACE',
  Template = 'TEMPLATE',
  User = 'USER',
  UserGroup = 'USER_GROUP',
  VirtualContributor = 'VIRTUAL_CONTRIBUTOR',
  VirtualPersona = 'VIRTUAL_PERSONA',
  Whiteboard = 'WHITEBOARD',
}

export type Query = {
  /** An account. If no ID is specified then the first Account is returned. */
  account: Account;
  /** The Accounts on this platform; If accessed through an Innovation Hub will return ONLY the Accounts defined in it. */
  accounts: Array<Account>;
  /** Activity events related to the current user. */
  activityFeed: ActivityFeed;
  /** Activity events related to the current user grouped by Activity type and resource. */
  activityFeedGrouped: Array<ActivityLogEntry>;
  /** Retrieve the ActivityLog for the specified Collaboration */
  activityLogOnCollaboration: Array<ActivityLogEntry>;
  /** All Users that are members of a given room */
  adminCommunicationMembership: CommunicationAdminMembershipResult;
  /** Usage of the messaging platform that are not tied to the domain model. */
  adminCommunicationOrphanedUsage: CommunicationAdminOrphanedUsageResult;
  /** Alkemio AiServer */
  aiServer: AiServer;
  /** Active Spaces only, order by most active in the past X days. */
  exploreSpaces: Array<Space>;
  /** Get supported credential metadata */
  getSupportedVerifiedCredentialMetadata: Array<CredentialMetadataOutput>;
  /** Allow creation of inputs based on existing entities in the domain model */
  inputCreator: InputCreatorQueryResults;
  /** Allow direct lookup of entities from the domain model */
  lookup: LookupQueryResults;
  /** Allow direct lookup of entities using their NameIDs */
  lookupByName: LookupByNameQueryResults;
  /** Information about the current authenticated user */
  me: MeQueryResults;
  /** Get all notifications for a receiver. */
  notifications: Array<InAppNotification>;
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
  /** The roles that the specified VirtualContributor has. */
  rolesVirtualContributor: ContributorRoles;
  /** Search the platform for terms supplied */
  search: ISearchResults;
  /** Look up a top level Space (i.e. a Space that does not have a parent Space) by the UUID or NameID. */
  space: Space;
  /** The Spaces on this platform; If accessed through an Innovation Hub will return ONLY the Spaces defined in it. */
  spaces: Array<Space>;
  /** The Spaces on this platform */
  spacesPaginated: PaginatedSpaces;
  /** Information about a specific task */
  task: Task;
  /** All tasks with filtering applied */
  tasks: Array<Task>;
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
  /** A particular VirtualContributor */
  virtualContributor: VirtualContributor;
  /** The VirtualContributors on this platform */
  virtualContributors: Array<VirtualContributor>;
};

export type QueryAccountArgs = {
  ID: Scalars['UUID_NAMEID']['input'];
};

export type QueryActivityFeedArgs = {
  after?: InputMaybe<Scalars['UUID']['input']>;
  args?: InputMaybe<ActivityFeedQueryArgs>;
  before?: InputMaybe<Scalars['UUID']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryActivityFeedGroupedArgs = {
  args?: InputMaybe<ActivityFeedGroupedQueryArgs>;
};

export type QueryActivityLogOnCollaborationArgs = {
  queryData: ActivityLogInput;
};

export type QueryAdminCommunicationMembershipArgs = {
  communicationData: CommunicationAdminMembershipInput;
};

export type QueryExploreSpacesArgs = {
  options?: InputMaybe<ExploreSpacesInput>;
};

export type QueryNotificationsArgs = {
  receiverID: Scalars['UUID']['input'];
};

export type QueryOrganizationArgs = {
  ID: Scalars['UUID_NAMEID']['input'];
};

export type QueryOrganizationsArgs = {
  filter?: InputMaybe<ContributorFilterInput>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  shuffle?: InputMaybe<Scalars['Boolean']['input']>;
};

export type QueryOrganizationsPaginatedArgs = {
  after?: InputMaybe<Scalars['UUID']['input']>;
  before?: InputMaybe<Scalars['UUID']['input']>;
  filter?: InputMaybe<OrganizationFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<OrganizationVerificationEnum>;
};

export type QueryRolesOrganizationArgs = {
  rolesData: RolesOrganizationInput;
};

export type QueryRolesUserArgs = {
  rolesData: RolesUserInput;
};

export type QueryRolesVirtualContributorArgs = {
  rolesData: RolesVirtualContributorInput;
};

export type QuerySearchArgs = {
  searchData: SearchInput;
};

export type QuerySpaceArgs = {
  ID: Scalars['UUID_NAMEID']['input'];
};

export type QuerySpacesArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID']['input']>>;
  filter?: InputMaybe<SpaceFilterInput>;
};

export type QuerySpacesPaginatedArgs = {
  after?: InputMaybe<Scalars['UUID']['input']>;
  before?: InputMaybe<Scalars['UUID']['input']>;
  filter?: InputMaybe<SpaceFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type QueryTaskArgs = {
  id: Scalars['UUID']['input'];
};

export type QueryTasksArgs = {
  status?: InputMaybe<TaskStatus>;
};

export type QueryUserArgs = {
  ID: Scalars['UUID_NAMEID_EMAIL']['input'];
};

export type QueryUserAuthorizationPrivilegesArgs = {
  userAuthorizationPrivilegesData: UserAuthorizationPrivilegesInput;
};

export type QueryUsersArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID']['input']>>;
  filter?: InputMaybe<ContributorFilterInput>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  shuffle?: InputMaybe<Scalars['Boolean']['input']>;
};

export type QueryUsersPaginatedArgs = {
  after?: InputMaybe<Scalars['UUID']['input']>;
  before?: InputMaybe<Scalars['UUID']['input']>;
  filter?: InputMaybe<UserFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  withTags?: InputMaybe<Scalars['Boolean']['input']>;
};

export type QueryUsersWithAuthorizationCredentialArgs = {
  credentialsCriteriaData: UsersWithAuthorizationCredentialInput;
};

export type QueryVirtualContributorArgs = {
  ID: Scalars['UUID_NAMEID']['input'];
};

export type QueryVirtualContributorsArgs = {
  filter?: InputMaybe<ContributorFilterInput>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  shuffle?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Question = {
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  value: Scalars['String']['output'];
};

/** A reaction to a message. */
export type Reaction = {
  /** The reaction Emoji */
  emoji: Scalars['Emoji']['output'];
  /** The id for the reaction. */
  id: Scalars['MessageID']['output'];
  /** The user that reacted */
  sender?: Maybe<User>;
  /** The server timestamp in UTC */
  timestamp: Scalars['Float']['output'];
};

export type Reference = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** Description of this reference */
  description?: Maybe<Scalars['String']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Name of the reference, e.g. Linkedin, Twitter etc. */
  name: Scalars['String']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** URI of the reference */
  uri: Scalars['String']['output'];
};

export type RefreshVirtualContributorBodyOfKnowledgeInput = {
  /** The ID of the Virtual Contributor to update. */
  virtualContributorID: Scalars['UUID']['input'];
};

export type RelayPaginatedSpace = {
  /** The Account that this Space is part of. */
  account: Account;
  /** The "highest" subscription active for this Space. */
  activeSubscription?: Maybe<SpaceSubscription>;
  /** The Agent representing this Space. */
  agent: Agent;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The collaboration for the Space. */
  collaboration: Collaboration;
  /** Get the Community for the Space.  */
  community: Community;
  /** The context for the space. */
  context: Context;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The level of this Space, representing the number of Spaces above this one. */
  level: SpaceLevel;
  /** The ID of the level zero space for this tree. */
  levelZeroSpaceID: Scalars['String']['output'];
  /** The License operating on this Space. */
  license: License;
  /** Metrics about activity within this Space. */
  metrics?: Maybe<Array<Nvp>>;
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** The Profile for the Space. */
  profile: Profile;
  /** The Space provider. */
  provider: Contributor;
  /** The settings for this Space. */
  settings: SpaceSettings;
  /** The StorageAggregator in use by this Space */
  storageAggregator: StorageAggregator;
  /** The subscriptions active for this Space. */
  subscriptions: Array<SpaceSubscription>;
  /** A particular subspace, either by its ID or nameID */
  subspace: Space;
  /** The subspaces for the space. */
  subspaces: Array<Space>;
  /** The TemplatesManager in use by this Space */
  templatesManager?: Maybe<TemplatesManager>;
  /** The Type of the Space e.g. space/challenge/opportunity. */
  type: SpaceType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** Visibility of the Space. */
  visibility: SpaceVisibility;
};

export type RelayPaginatedSpaceSubspaceArgs = {
  ID: Scalars['UUID_NAMEID']['input'];
};

export type RelayPaginatedSpaceSubspacesArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID']['input']>>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  shuffle?: InputMaybe<Scalars['Boolean']['input']>;
};

export type RelayPaginatedSpaceEdge = {
  node: RelayPaginatedSpace;
};

export type RelayPaginatedSpacePageInfo = {
  /** The last cursor of the page result */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Indicate whether more items exist after the returned ones */
  hasNextPage: Scalars['Boolean']['output'];
  /** Indicate whether more items exist before the returned ones */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The first cursor of the page result */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type RemoveCommunityGuidelinesContentInput = {
  /** ID of the CommunityGuidelines that will be emptied */
  communityGuidelinesID: Scalars['UUID']['input'];
};

export type RemoveRoleNameFromUserInput = {
  organizationID: Scalars['UUID']['input'];
  role: RoleName;
  userID: Scalars['UUID']['input'];
};

export type RemoveRoleOnRoleSetFromUserInput = {
  role: RoleName;
  userID: Scalars['UUID']['input'];
};

export type RemoveRoleOnRoleSetFromOrganizationInput = {
  contributorID: Scalars['UUID']['input'];
  role: RoleName;
  roleSetID: Scalars['UUID']['input'];
};

export type RemoveRoleOnRoleSetFromUserInput = {
  contributorID: Scalars['UUID']['input'];
  role: RoleName;
  roleSetID: Scalars['UUID']['input'];
};

export type RemoveRoleOnRoleSetFromVirtualContributorInput = {
  contributorID: Scalars['UUID']['input'];
  role: RoleName;
  roleSetID: Scalars['UUID']['input'];
};

export type RemoveUserGroupMemberInput = {
  groupID: Scalars['UUID']['input'];
  userID: Scalars['UUID']['input'];
};

export type RevokeAuthorizationCredentialInput = {
  /** The resource to which access is being removed. */
  resourceID: Scalars['String']['input'];
  type: AuthorizationCredential;
  /** The user from whom the credential is being removed. */
  userID: Scalars['UUID']['input'];
};

export type RevokeLicensePlanFromAccount = {
  /** The ID of the Account to assign the LicensePlan to. */
  accountID: Scalars['UUID']['input'];
  /** The ID of the LicensePlan to assign. */
  licensePlanID: Scalars['UUID']['input'];
  /** The ID of the Licensing to use. */
  licensingID?: InputMaybe<Scalars['UUID']['input']>;
};

export type RevokeLicensePlanFromSpace = {
  /** The ID of the LicensePlan to assign. */
  licensePlanID: Scalars['UUID']['input'];
  /** The ID of the Licensing to use. */
  licensingID?: InputMaybe<Scalars['UUID']['input']>;
  /** The ID of the Space to assign the LicensePlan to. */
  spaceID: Scalars['UUID']['input'];
};

export type RevokeOrganizationAuthorizationCredentialInput = {
  /** The Organization from whom the credential is being removed. */
  organizationID: Scalars['UUID']['input'];
  /** The resource to which access is being removed. */
  resourceID?: InputMaybe<Scalars['UUID']['input']>;
  type: AuthorizationCredential;
};

export type Role = {
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The Credential associated with this Role. */
  credential: CredentialDefinition;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The role policy that applies for Organizations in this Role. */
  organizationPolicy: ContributorRolePolicy;
  /** The Credential associated with this Role. */
  parentCredentials: Array<CredentialDefinition>;
  /** Flag to indicate if this Role requires the entry level role to be held. */
  requiresEntryRole: Scalars['Boolean']['output'];
  /** Flag to indicate if this Role requires having the same role in the Parent RoleSet. */
  requiresSameRoleInParentRoleSet: Scalars['Boolean']['output'];
  /** The CommunityRole that this role definition is for. */
  type: RoleName;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The role policy that applies for Users in this Role. */
  userPolicy: ContributorRolePolicy;
  /** The role policy that applies for VirtualContributors in this Role. */
  virtualContributorPolicy: ContributorRolePolicy;
};

export type RoleSet = {
  /** The Form used for Applications to this roleSet. */
  applicationForm: Form;
  /** Applications available for this roleSet. */
  applications: Array<Application>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** All  users excluding the current lead users in this Community. */
  availableUsersForLeadRole: PaginatedUsers;
  /** All available users that are potential Community members. */
  availableUsersForEntryRole: PaginatedUsers;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The CommunityRole that acts as the entry Role for the RoleSet, so other roles potentially require it. */
  entryRoleType: RoleName;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Invitations for this roleSet. */
  invitations: Array<Invitation>;
  /** The License operating on this RoleSet. */
  license: License;
  /** The membership status of the currently logged in user. */
  myMembershipStatus?: Maybe<CommunityMembershipStatus>;
  /** The roles on this community for the currently logged in user. */
  myRoles: Array<RoleName>;
  /** The implicit roles on this community for the currently logged in user. */
  myRolesImplicit: Array<CommunityRoleImplicit>;
  /** All Organizations that have the specified Role in this Community. */
  organizationsInRole: Array<Organization>;
  /** Invitations to join this Community for users not yet on the Alkemio platform. */
  platformInvitations: Array<PlatformInvitation>;
  /** The Role Definitions from this RoleSet to return. */
  roleDefinition: Role;
  /** The Role Definitions included in this roleSet. */
  roleDefinitions: Array<Role>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** All users that are contributing to this Community in the specified Role. */
  usersInRole: Array<User>;
  /** All virtuals that have the specified Role in this Community. */
  virtualContributorsInRole: Array<VirtualContributor>;
};

export type RoleSetAvailableUsersForLeadRoleArgs = {
  after?: InputMaybe<Scalars['UUID']['input']>;
  before?: InputMaybe<Scalars['UUID']['input']>;
  filter?: InputMaybe<UserFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type RoleSetavailableUsersForEntryRoleArgs = {
  after?: InputMaybe<Scalars['UUID']['input']>;
  before?: InputMaybe<Scalars['UUID']['input']>;
  filter?: InputMaybe<UserFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type RoleSetOrganizationsInRoleArgs = {
  role: RoleName;
};

export type RoleSetRoleDefinitionArgs = {
  role: RoleName;
};

export type RoleSetUsersInRoleArgs = {
  limit?: InputMaybe<Scalars['Float']['input']>;
  role: RoleName;
};

export type RoleSetVirtualContributorsInRoleArgs = {
  role: RoleName;
};

export type RolesOrganizationInput = {
  /** Return membership in Spaces matching the provided filter. */
  filter?: InputMaybe<SpaceFilterInput>;
  /** The ID of the organization to retrieve the roles of. */
  organizationID: Scalars['UUID_NAMEID']['input'];
};

export type RolesResult = {
  /** Display name of the entity */
  displayName: Scalars['String']['output'];
  /** A unique identifier for this membership result. */
  id: Scalars['String']['output'];
  /** Name Identifier of the entity */
  nameID: Scalars['NameID']['output'];
  /** The roles held by the contributor */
  roles: Array<Scalars['String']['output']>;
};

export type RolesResultCommunity = {
  /** Display name of the entity */
  displayName: Scalars['String']['output'];
  /** A unique identifier for this membership result. */
  id: Scalars['String']['output'];
  /** The level of the Space e.g. space/challenge/opportunity. */
  level: SpaceLevel;
  /** Name Identifier of the entity */
  nameID: Scalars['NameID']['output'];
  /** The roles held by the contributor */
  roles: Array<Scalars['String']['output']>;
  /** The Type of the Space e.g. space/challenge/opportunity. */
  type: SpaceType;
};

export type RolesResultOrganization = {
  /** Display name of the entity */
  displayName: Scalars['String']['output'];
  /** A unique identifier for this membership result. */
  id: Scalars['String']['output'];
  /** Name Identifier of the entity */
  nameID: Scalars['NameID']['output'];
  /** The Organization ID. */
  organizationID: Scalars['String']['output'];
  /** The roles held by the contributor */
  roles: Array<Scalars['String']['output']>;
  /** Details of the Groups in the Organizations the user is a member of */
  userGroups: Array<RolesResult>;
};

export type RolesResultSpace = {
  /** Display name of the entity */
  displayName: Scalars['String']['output'];
  /** A unique identifier for this membership result. */
  id: Scalars['String']['output'];
  /** The level of the Space e.g. space/challenge/opportunity. */
  level: SpaceLevel;
  /** Name Identifier of the entity */
  nameID: Scalars['NameID']['output'];
  /** The roles held by the contributor */
  roles: Array<Scalars['String']['output']>;
  /** The Space ID */
  spaceID: Scalars['String']['output'];
  /** Details of the Subspace the user is a member of */
  subspaces: Array<RolesResultCommunity>;
  /** The Type of the Space e.g. space/challenge/opportunity. */
  type: SpaceType;
  /** Visibility of the Space. */
  visibility: SpaceVisibility;
};

export type RolesUserInput = {
  /** Return membership in Spaces matching the provided filter. */
  filter?: InputMaybe<SpaceFilterInput>;
  /** The ID of the user to retrieve the roles of. */
  userID: Scalars['UUID_NAMEID_EMAIL']['input'];
};

export type RolesVirtualContributorInput = {
  /** The ID or nameID of the VC to retrieve the roles of. */
  virtualContributorID: Scalars['UUID_NAMEID']['input'];
};

export type Room = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Messages in this Room. */
  messages: Array<Message>;
  /** The number of messages in the Room. */
  messagesCount: Scalars['Float']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** Virtual Contributor Interactions in this Room. */
  vcInteractions: Array<VcInteraction>;
};

export type RoomAddReactionToMessageInput = {
  /** The reaction to the message. */
  emoji: Scalars['Emoji']['input'];
  /** The message id that is being reacted to */
  messageID: Scalars['MessageID']['input'];
  /** The Room to remove a message from. */
  roomID: Scalars['UUID']['input'];
};

/** The event happened in the subscribed room */
export type RoomEventSubscriptionResult = {
  /** A message related event. */
  message?: Maybe<RoomMessageEventSubscriptionResult>;
  /** A message reaction related event. */
  reaction?: Maybe<RoomMessageReactionEventSubscriptionResult>;
  /** The Room on which the event happened. */
  room: Room;
  /** The identifier for the Room on which the event happened. */
  roomID: Scalars['String']['output'];
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
  messageID?: Maybe<Scalars['String']['output']>;
  /** The type of event. */
  type: MutationType;
};

export type RoomRemoveMessageInput = {
  /** The message id that should be removed */
  messageID: Scalars['MessageID']['input'];
  /** The Room to remove a message from. */
  roomID: Scalars['UUID']['input'];
};

export type RoomRemoveReactionToMessageInput = {
  /** The reaction that is being removed */
  reactionID: Scalars['MessageID']['input'];
  /** The Room to remove a message from. */
  roomID: Scalars['UUID']['input'];
};

export type RoomSendMessageInput = {
  /** The message being sent */
  message: Scalars['String']['input'];
  /** The Room the message is being sent to */
  roomID: Scalars['UUID']['input'];
};

export type RoomSendMessageReplyInput = {
  /** The message being sent */
  message: Scalars['String']['input'];
  /** The Room the message is being sent to */
  roomID: Scalars['UUID']['input'];
  /** The message starting the thread being replied to */
  threadID: Scalars['MessageID']['input'];
};

export type SearchInput = {
  /** Restrict the search to only the specified Space. Default is all Spaces. */
  searchInSpaceFilter?: InputMaybe<Scalars['UUID_NAMEID']['input']>;
  /** Expand the search to includes Tagsets with the provided names. Max 2. */
  tagsetNames?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The terms to be searched for within this Space. Max 5. */
  terms: Array<Scalars['String']['input']>;
  /** Restrict the search to only the specified entity types. Values allowed: space, subspace, user, group, organization, callout. Default is all. */
  typesFilter?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type SearchResult = {
  id: Scalars['UUID']['output'];
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float']['output'];
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']['output']>;
  /** The type of returned result for this search. */
  type: SearchResultType;
};

export type SearchResultCallout = SearchResult & {
  /** The Callout that was found. */
  callout: Callout;
  id: Scalars['UUID']['output'];
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float']['output'];
  /** The parent Space of the Callout. */
  space: Space;
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']['output']>;
  /** The type of returned result for this search. */
  type: SearchResultType;
};

export type SearchResultOrganization = SearchResult & {
  id: Scalars['UUID']['output'];
  /** The Organization that was found. */
  organization: Organization;
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float']['output'];
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']['output']>;
  /** The type of returned result for this search. */
  type: SearchResultType;
};

export type SearchResultPost = SearchResult & {
  /** The Callout of the Post. */
  callout: Callout;
  id: Scalars['UUID']['output'];
  /** The Post that was found. */
  post: Post;
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float']['output'];
  /** The Space of the Post. */
  space: Space;
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']['output']>;
  /** The type of returned result for this search. */
  type: SearchResultType;
};

export type SearchResultSpace = SearchResult & {
  id: Scalars['UUID']['output'];
  /** The parent of this Space, if any. */
  parentSpace?: Maybe<Space>;
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float']['output'];
  /** The Space that was found. */
  space: Space;
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']['output']>;
  /** The type of returned result for this search. */
  type: SearchResultType;
};

export enum SearchResultType {
  Callout = 'CALLOUT',
  Challenge = 'CHALLENGE',
  Opportunity = 'OPPORTUNITY',
  Organization = 'ORGANIZATION',
  Post = 'POST',
  Space = 'SPACE',
  Subspace = 'SUBSPACE',
  User = 'USER',
  Usergroup = 'USERGROUP',
  Whiteboard = 'WHITEBOARD',
}

export type SearchResultUser = SearchResult & {
  id: Scalars['UUID']['output'];
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float']['output'];
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']['output']>;
  /** The type of returned result for this search. */
  type: SearchResultType;
  /** The User that was found. */
  user: User;
};

export type SearchResultUserGroup = SearchResult & {
  id: Scalars['UUID']['output'];
  /** The score for this search result; more matches means a higher score. */
  score: Scalars['Float']['output'];
  /** The terms that were matched for this result */
  terms: Array<Scalars['String']['output']>;
  /** The type of returned result for this search. */
  type: SearchResultType;
  /** The User Group that was found. */
  userGroup: UserGroup;
};

export enum SearchVisibility {
  Account = 'ACCOUNT',
  Hidden = 'HIDDEN',
  Public = 'PUBLIC',
}

export type Sentry = {
  /** Flag indicating if the client should use Sentry for monitoring. */
  enabled: Scalars['Boolean']['output'];
  /** URL to the Sentry endpoint. */
  endpoint: Scalars['String']['output'];
  /** The Sentry environment to report to. */
  environment: Scalars['String']['output'];
  /** Flag indicating if PII should be submitted on Sentry events. */
  submitPII: Scalars['Boolean']['output'];
};

export type ServiceMetadata = {
  /** Service name e.g. CT Server */
  name?: Maybe<Scalars['String']['output']>;
  /** Version in the format {major.minor.patch} - using SemVer. */
  version?: Maybe<Scalars['String']['output']>;
};

export type Space = {
  /** The Account that this Space is part of. */
  account: Account;
  /** The "highest" subscription active for this Space. */
  activeSubscription?: Maybe<SpaceSubscription>;
  /** The Agent representing this Space. */
  agent: Agent;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The collaboration for the Space. */
  collaboration: Collaboration;
  /** Get the Community for the Space.  */
  community: Community;
  /** The context for the space. */
  context: Context;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The level of this Space, representing the number of Spaces above this one. */
  level: SpaceLevel;
  /** The ID of the level zero space for this tree. */
  levelZeroSpaceID: Scalars['String']['output'];
  /** The License operating on this Space. */
  license: License;
  /** Metrics about activity within this Space. */
  metrics?: Maybe<Array<Nvp>>;
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** The Profile for the Space. */
  profile: Profile;
  /** The Space provider. */
  provider: Contributor;
  /** The settings for this Space. */
  settings: SpaceSettings;
  /** The StorageAggregator in use by this Space */
  storageAggregator: StorageAggregator;
  /** The subscriptions active for this Space. */
  subscriptions: Array<SpaceSubscription>;
  /** A particular subspace, either by its ID or nameID */
  subspace: Space;
  /** The subspaces for the space. */
  subspaces: Array<Space>;
  /** The TemplatesManager in use by this Space */
  templatesManager?: Maybe<TemplatesManager>;
  /** The Type of the Space e.g. space/challenge/opportunity. */
  type: SpaceType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** Visibility of the Space. */
  visibility: SpaceVisibility;
};

export type SpaceSubspaceArgs = {
  ID: Scalars['UUID_NAMEID']['input'];
};

export type SpaceSubspacesArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID']['input']>>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  shuffle?: InputMaybe<Scalars['Boolean']['input']>;
};

export type SpaceFilterInput = {
  /** Return Spaces with a Visibility matching one of the provided types. */
  visibilities?: InputMaybe<Array<SpaceVisibility>>;
};

export enum SpaceLevel {
  Challenge = 'CHALLENGE',
  Opportunity = 'OPPORTUNITY',
  Space = 'SPACE',
}

export type SpacePendingMembershipInfo = {
  /** The CommunityGuidelines for the Space */
  communityGuidelines: CommunityGuidelines;
  /** The Context of the Space */
  context: Context;
  /** The Space ID */
  id: Scalars['UUID']['output'];
  /** The Level of the Space */
  level: SpaceLevel;
  /** The Profile of the Space */
  profile: Profile;
};

export enum SpacePrivacyMode {
  Private = 'PRIVATE',
  Public = 'PUBLIC',
}

export type SpaceSettings = {
  /** The collaboration settings for this Space. */
  collaboration: SpaceSettingsCollaboration;
  /** The membership settings for this Space. */
  membership: SpaceSettingsMembership;
  /** The privacy settings for this Space */
  privacy: SpaceSettingsPrivacy;
};

export type SpaceSettingsCollaboration = {
  /** Flag to control if events from Subspaces are visible on this Space calendar as well. */
  allowEventsFromSubspaces: Scalars['Boolean']['output'];
  /** Flag to control if members can create callouts. */
  allowMembersToCreateCallouts: Scalars['Boolean']['output'];
  /** Flag to control if members can create subspaces. */
  allowMembersToCreateSubspaces: Scalars['Boolean']['output'];
  /** Flag to control if ability to contribute is inherited from parent Space. */
  inheritMembershipRights: Scalars['Boolean']['output'];
};

export type SpaceSettingsMembership = {
  /** Allow subspace admins to invite to this Space. */
  allowSubspaceAdminsToInviteMembers: Scalars['Boolean']['output'];
  /** The membership policy in usage for this Space */
  policy: CommunityMembershipPolicy;
  /** The organizations that are trusted to Join as members for this Space */
  trustedOrganizations: Array<Scalars['UUID']['output']>;
};

export type SpaceSettingsPrivacy = {
  /** Flag to control if Platform Support has admin rights. */
  allowPlatformSupportAsAdmin: Scalars['Boolean']['output'];
  /** The privacy mode for this Space */
  mode: SpacePrivacyMode;
};

export type SpaceSubscription = {
  /** The expiry date of this subscription, null if it does never expire. */
  expires?: Maybe<Scalars['DateTime']['output']>;
  /** The name of the Subscription. */
  name: LicensingCredentialBasedCredentialType;
};

export enum SpaceType {
  BlankSlate = 'BLANK_SLATE',
  Challenge = 'CHALLENGE',
  Knowledge = 'KNOWLEDGE',
  Opportunity = 'OPPORTUNITY',
  Space = 'SPACE',
}

export enum SpaceVisibility {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Demo = 'DEMO',
}

export type StorageAggregator = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The Storage Bucket for files directly on this Storage Aggregator (legacy). */
  directStorageBucket: StorageBucket;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The key information about the entity using this StorageAggregator, if any. */
  parentEntity?: Maybe<StorageAggregatorParent>;
  /** The aggregate size of all StorageBuckets for this StorageAggregator. */
  size: Scalars['Float']['output'];
  /** The list of child storageAggregators for this StorageAggregator. */
  storageAggregators: Array<StorageAggregator>;
  /** The Storage Buckets that are being managed via this StorageAggregators. */
  storageBuckets: Array<StorageBucket>;
  /** A type of entity that this StorageAggregator is being used with. */
  type?: Maybe<StorageAggregatorType>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

/** Valid parent is Account, Space, User, Organization, Platform */
export type StorageAggregatorParent = {
  /** The display name. */
  displayName: Scalars['String']['output'];
  /** The UUID of the parent entity. */
  id: Scalars['UUID']['output'];
  /** If the parent entity is a Space, then the level of the Space. */
  level?: Maybe<SpaceLevel>;
  /** The URL that can be used to access the parent entity. */
  url: Scalars['String']['output'];
};

export enum StorageAggregatorType {
  Account = 'ACCOUNT',
  Organization = 'ORGANIZATION',
  Platform = 'PLATFORM',
  Space = 'SPACE',
  User = 'USER',
}

export type StorageBucket = {
  /** Mime types allowed to be stored on this StorageBucket. */
  allowedMimeTypes: Array<Scalars['String']['output']>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** A single Document */
  document?: Maybe<Document>;
  /** The list of Documents for this StorageBucket. */
  documents: Array<Document>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Maximum allowed file size on this StorageBucket. */
  maxFileSize: Scalars['Float']['output'];
  /** The key information about the entity using this StorageBucket, if any. */
  parentEntity?: Maybe<StorageBucketParent>;
  /** The aggregate size of all Documents for this StorageBucket. */
  size: Scalars['Float']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type StorageBucketDocumentArgs = {
  ID: Scalars['UUID_NAMEID']['input'];
};

export type StorageBucketDocumentsArgs = {
  IDs?: InputMaybe<Array<Scalars['UUID_NAMEID']['input']>>;
  limit?: InputMaybe<Scalars['Float']['input']>;
};

export type StorageBucketParent = {
  /** The display name. */
  displayName: Scalars['String']['output'];
  /** The UUID of the parent entity. */
  id: Scalars['UUID']['output'];
  /** The type of entity that this StorageBucket is being used with. */
  type: ProfileType;
  /** The URL that can be used to access the parent entity. */
  url: Scalars['String']['output'];
};

export type StorageBucketUploadFileInput = {
  storageBucketId: Scalars['String']['input'];
  /** Is this a temporary Document that will be moved later to another StorageBucket. */
  temporaryLocation?: InputMaybe<Scalars['Boolean']['input']>;
};

export type StorageBucketUploadFileOnLinkInput = {
  linkID: Scalars['String']['input'];
};

export type StorageBucketUploadFileOnReferenceInput = {
  referenceID: Scalars['String']['input'];
};

export type StorageConfig = {
  /** Config for uploading files to Alkemio. */
  file: FileStorageConfig;
};

export type Subscription = {
  activityCreated: ActivityCreatedSubscriptionResult;
  /** Receive new Update messages on Communities the currently authenticated User is a member of. */
  calloutPostCreated: CalloutPostCreated;
  /** Receive updates on Discussions */
  forumDiscussionUpdated: Discussion;
  /** Received on verified credentials change */
  profileVerifiedCredential: ProfileCredentialVerified;
  /** Receive Room event */
  roomEvents: RoomEventSubscriptionResult;
  /** Receive new Subspaces created on the Space. */
  subspaceCreated: SubspaceCreated;
  /** Receive updates on virtual contributors */
  virtualContributorUpdated: VirtualContributorUpdatedSubscriptionResult;
};

export type SubscriptionActivityCreatedArgs = {
  input: ActivityCreatedSubscriptionInput;
};

export type SubscriptionCalloutPostCreatedArgs = {
  calloutID: Scalars['UUID']['input'];
};

export type SubscriptionForumDiscussionUpdatedArgs = {
  forumID: Scalars['UUID']['input'];
};

export type SubscriptionRoomEventsArgs = {
  roomID: Scalars['UUID']['input'];
};

export type SubscriptionSubspaceCreatedArgs = {
  spaceID: Scalars['UUID']['input'];
};

export type SubscriptionVirtualContributorUpdatedArgs = {
  virtualContributorID: Scalars['UUID_NAMEID']['input'];
};

export type SubspaceCreated = {
  /** The identifier for the Space on which the subspace was created. */
  spaceID: Scalars['UUID']['output'];
  /** The subspace that has been created. */
  subspace: Space;
};

export type Tagset = {
  /** The allowed values for this Tagset. */
  allowedValues: Array<Scalars['String']['output']>;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  type: TagsetType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type TagsetArgs = {
  /** Return only Callouts that match one of the tagsets and any of the tags in them. */
  name: Scalars['String']['input'];
  /** A list of tags to include. */
  tags: Array<Scalars['String']['input']>;
};

export enum TagsetReservedName {
  CalloutGroup = 'CALLOUT_GROUP',
  Capabilities = 'CAPABILITIES',
  Default = 'DEFAULT',
  FlowState = 'FLOW_STATE',
  Keywords = 'KEYWORDS',
  Skills = 'SKILLS',
}

export type TagsetTemplate = {
  allowedValues: Array<Scalars['String']['output']>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** For Tagsets of type SELECT_ONE, the default selected value. */
  defaultSelectedValue?: Maybe<Scalars['String']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  type: TagsetType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export enum TagsetType {
  Freeform = 'FREEFORM',
  SelectMany = 'SELECT_MANY',
  SelectOne = 'SELECT_ONE',
}

export type Task = {
  /** The timestamp when the task was created */
  created: Scalars['Float']['output'];
  /** the timestamp when the task was completed */
  end?: Maybe<Scalars['Float']['output']>;
  /** info about the errors of the task */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** The UUID of the task */
  id: Scalars['UUID']['output'];
  /** Amount of items that need to be processed */
  itemsCount?: Maybe<Scalars['Float']['output']>;
  /** Amount of items that are already processed */
  itemsDone?: Maybe<Scalars['Float']['output']>;
  /** The progress  of the task if the total item count is defined */
  progress?: Maybe<Scalars['Float']['output']>;
  /** info about the completed part of the task */
  results?: Maybe<Array<Scalars['String']['output']>>;
  /** The timestamp when the task was started */
  start: Scalars['Float']['output'];
  /** The current status of the task */
  status: TaskStatus;
  /** TBD */
  type?: Maybe<Scalars['String']['output']>;
};

/** The current status of the task */
export enum TaskStatus {
  Completed = 'COMPLETED',
  Errored = 'ERRORED',
  InProgress = 'IN_PROGRESS',
}

export type Template = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The Callout for this Template. */
  callout?: Maybe<Callout>;
  /** The Collaboration for this Template. */
  collaboration?: Maybe<Collaboration>;
  /** The Community Guidelines for this Template. */
  communityGuidelines?: Maybe<CommunityGuidelines>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** The description for Post Templates to users filling out a new Post based on this Template. */
  postDefaultDescription?: Maybe<Scalars['Markdown']['output']>;
  /** The Profile for this Template. */
  profile: Profile;
  /** The type for this Template. */
  type: TemplateType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The Whiteboard for this Template. */
  whiteboard?: Maybe<Whiteboard>;
};

export type TemplateDefault = {
  /** The type of any Template stored here. */
  allowedTemplateType: TemplateType;
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The template accessible via this TemplateDefault, if any. */
  template?: Maybe<Template>;
  /** The type of this TemplateDefault. */
  type: TemplateDefaultType;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export enum TemplateDefaultType {
  PlatformSpace = 'PLATFORM_SPACE',
  PlatformSpaceTutorials = 'PLATFORM_SPACE_TUTORIALS',
  PlatformSubspace = 'PLATFORM_SUBSPACE',
  PlatformSubspaceKnowledge = 'PLATFORM_SUBSPACE_KNOWLEDGE',
  SpaceSubspace = 'SPACE_SUBSPACE',
}

export type TemplateResult = {
  /** The InnovationPack where this Template is being returned from. */
  innovationPack: InnovationPack;
  /** The Template that is being returned. */
  template: Template;
};

export enum TemplateType {
  Callout = 'CALLOUT',
  Collaboration = 'COLLABORATION',
  CommunityGuidelines = 'COMMUNITY_GUIDELINES',
  Post = 'POST',
  Whiteboard = 'WHITEBOARD',
}

export type TemplatesManager = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The TemplateDefaults in this TemplatesManager. */
  templateDefaults: Array<TemplateDefault>;
  /** The templatesSet in use by this TemplatesManager. */
  templatesSet?: Maybe<TemplatesSet>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type TemplatesSet = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The CalloutTemplates in this TemplatesSet. */
  calloutTemplates: Array<Template>;
  /** The total number of CalloutTemplates in this TemplatesSet. */
  calloutTemplatesCount: Scalars['Float']['output'];
  /** The CollaborationTemplates in this TemplatesSet. */
  collaborationTemplates: Array<Template>;
  /** The total number of CollaborationTemplates in this TemplatesSet. */
  collaborationTemplatesCount: Scalars['Float']['output'];
  /** The CommunityGuidelines in this TemplatesSet. */
  communityGuidelinesTemplates: Array<Template>;
  /** The total number of CommunityGuidelinesTemplates in this TemplatesSet. */
  communityGuidelinesTemplatesCount: Scalars['Float']['output'];
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The Post Templates in this TemplatesSet. */
  postTemplates: Array<Template>;
  /** The total number of Post Templates in this TemplatesSet. */
  postTemplatesCount: Scalars['Float']['output'];
  /** The Templates in this TemplatesSet. */
  templates: Array<Template>;
  /** The total number of Templates in this TemplatesSet. */
  templatesCount: Scalars['Float']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  /** The WhiteboardTemplates in this TemplatesSet. */
  whiteboardTemplates: Array<Template>;
  /** The total number of WhiteboardTemplates in this TemplatesSet. */
  whiteboardTemplatesCount: Scalars['Float']['output'];
};

export type Timeline = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The Innovation Library for the timeline */
  calendar: Calendar;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type TransferAccountInnovationHubInput = {
  /** The Innovation Hub to be transferred. */
  innovationHubID: Scalars['UUID']['input'];
  /** The Account to which the Innovation Hub will be transferred. */
  targetAccountID: Scalars['UUID']['input'];
};

export type TransferAccountInnovationPackInput = {
  /** The InnovationPack to be transferred. */
  innovationPackID: Scalars['UUID']['input'];
  /** The Account to which the Innovation Pack will be transferred. */
  targetAccountID: Scalars['UUID']['input'];
};

export type TransferAccountSpaceInput = {
  /** The Space to be transferred. */
  spaceID: Scalars['UUID']['input'];
  /** The Account to which the Space will be transferred. */
  targetAccountID: Scalars['UUID']['input'];
};

export type TransferAccountVirtualContributorInput = {
  /** The Account to which the Virtual Contributor will be transferred. */
  targetAccountID: Scalars['UUID']['input'];
  /** The Virtual Contributor to be transferred. */
  virtualContributorID: Scalars['UUID']['input'];
};

export type UpdateActorInput = {
  ID: Scalars['UUID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  impact?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAiPersonaInput = {
  ID: Scalars['UUID']['input'];
};

export type UpdateAiPersonaServiceInput = {
  ID: Scalars['UUID']['input'];
  engine?: InputMaybe<AiPersonaEngine>;
  externalConfig?: InputMaybe<ExternalConfig>;
  prompt?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateApplicationFormOnRoleSetInput = {
  formData: UpdateFormInput;
  roleSetID: Scalars['UUID']['input'];
};

export type UpdateCalendarEventInput = {
  ID: Scalars['UUID']['input'];
  /** The length of the event in days. */
  durationDays?: InputMaybe<Scalars['Float']['input']>;
  /** The length of the event in minutes. */
  durationMinutes: Scalars['Float']['input'];
  /** Flag to indicate if this event is for multiple days. */
  multipleDays: Scalars['Boolean']['input'];
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  /** The state date for the event. */
  startDate: Scalars['DateTime']['input'];
  type?: InputMaybe<CalendarEventType>;
  /** Is the event visible on the parent calendar. */
  visibleOnParentCalendar?: InputMaybe<Scalars['Boolean']['input']>;
  /** Flag to indicate if this event is for a whole day. */
  wholeDay: Scalars['Boolean']['input'];
};

export type UpdateCalloutContributionDefaultsInput = {
  /** The default description to use for new Post contributions. */
  postDescription?: InputMaybe<Scalars['Markdown']['input']>;
  /** The default description to use for new Whiteboard contributions. */
  whiteboardContent?: InputMaybe<Scalars['WhiteboardContent']['input']>;
};

export type UpdateCalloutContributionPolicyInput = {
  /** State of the callout. */
  state?: InputMaybe<CalloutState>;
};

export type UpdateCalloutEntityInput = {
  ID: Scalars['UUID']['input'];
  contributionDefaults?: InputMaybe<UpdateCalloutContributionDefaultsInput>;
  contributionPolicy?: InputMaybe<UpdateCalloutContributionPolicyInput>;
  framing?: InputMaybe<UpdateCalloutFramingInput>;
  /** Set Group for this Callout. */
  groupName?: InputMaybe<Scalars['String']['input']>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** The sort order to assign to this Callout. */
  sortOrder?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateCalloutFramingInput = {
  /** The Profile of the Template. */
  profile?: InputMaybe<UpdateProfileInput>;
  /** The new content to be used. */
  whiteboardContent?: InputMaybe<Scalars['WhiteboardContent']['input']>;
};

export type UpdateCalloutPublishInfoInput = {
  /** The identifier for the Callout whose publisher is to be updated. */
  calloutID: Scalars['UUID']['input'];
  /** The timestamp to set for the publishing of the Callout. */
  publishDate?: InputMaybe<Scalars['Float']['input']>;
  /** The identifier of the publisher of the Callout. */
  publisherID?: InputMaybe<Scalars['UUID']['input']>;
};

export type UpdateCalloutVisibilityInput = {
  /** The identifier for the Callout whose visibility is to be updated. */
  calloutID: Scalars['String']['input'];
  /** Send a notification on publishing. */
  sendNotification?: InputMaybe<Scalars['Boolean']['input']>;
  /** Visibility of the Callout. */
  visibility: CalloutVisibility;
};

export type UpdateCollaborationCalloutsSortOrderInput = {
  /** The IDs of the callouts to update the sort order on */
  calloutIDs: Array<Scalars['UUID_NAMEID']['input']>;
  collaborationID: Scalars['UUID']['input'];
};

export type UpdateCollaborationFromTemplateInput = {
  /** Add the Callouts from the Collaboration Template */
  addCallouts?: InputMaybe<Scalars['Boolean']['input']>;
  /** ID of the Collaboration to be updated */
  collaborationID: Scalars['UUID']['input'];
  /** The Collaboration Template that will be used for updates to the Collaboration */
  collaborationTemplateID: Scalars['UUID']['input'];
};

export type UpdateCommunityGuidelinesEntityInput = {
  /** ID of the CommunityGuidelines */
  communityGuidelinesID: Scalars['UUID']['input'];
  /** The Profile for this community guidelines. */
  profile: UpdateProfileInput;
};

export type UpdateContextInput = {
  impact?: InputMaybe<Scalars['Markdown']['input']>;
  vision?: InputMaybe<Scalars['Markdown']['input']>;
  who?: InputMaybe<Scalars['Markdown']['input']>;
};

export type UpdateContributionCalloutsSortOrderInput = {
  calloutID: Scalars['UUID']['input'];
  /** The IDs of the contributions to update the sort order on */
  contributionIDs: Array<Scalars['UUID']['input']>;
};

export type UpdateDiscussionInput = {
  ID: Scalars['UUID']['input'];
  /** The category for the Discussion */
  category?: InputMaybe<ForumDiscussionCategory>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
};

export type UpdateDocumentInput = {
  ID: Scalars['UUID']['input'];
  /** The display name for the Document. */
  displayName: Scalars['String']['input'];
  tagset?: InputMaybe<UpdateTagsetInput>;
};

export type UpdateEcosystemModelInput = {
  ID: Scalars['UUID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateFormInput = {
  description: Scalars['Markdown']['input'];
  questions: Array<UpdateFormQuestionInput>;
};

export type UpdateFormQuestionInput = {
  /** The explation text to clarify the question. */
  explanation: Scalars['String']['input'];
  /** The maxiumum length of the answer, in characters, up to a limit of 512. */
  maxLength: Scalars['Float']['input'];
  /** The question to be answered */
  question: Scalars['String']['input'];
  /** Whether an answer is required for this Question. */
  required: Scalars['Boolean']['input'];
  /** The sort order of this question in a wider set of questions. */
  sortOrder: Scalars['Float']['input'];
};

export type UpdateInnovationFlowEntityInput = {
  /** ID of the Innovation Flow */
  innovationFlowID: Scalars['UUID']['input'];
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  states?: InputMaybe<Array<UpdateInnovationFlowStateInput>>;
};

export type UpdateInnovationFlowInput = {
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  states?: InputMaybe<Array<UpdateInnovationFlowStateInput>>;
};

export type UpdateInnovationFlowSelectedStateInput = {
  /** ID of the Innovation Flow */
  innovationFlowID: Scalars['UUID']['input'];
  /** The State that the Innovation Flow is in */
  selectedState: Scalars['String']['input'];
};

export type UpdateInnovationFlowSingleStateInput = {
  /** ID of the Innovation Flow */
  innovationFlowID: Scalars['UUID']['input'];
  /** The name of the Innovation Flow State to be updated */
  stateDisplayName: Scalars['String']['input'];
  stateUpdatedData: UpdateInnovationFlowStateInput;
};

export type UpdateInnovationFlowStateInput = {
  /** The explation text to clarify the State. */
  description?: InputMaybe<Scalars['Markdown']['input']>;
  /** The display name for the State */
  displayName: Scalars['String']['input'];
};

export type UpdateInnovationHubInput = {
  ID: Scalars['UUID']['input'];
  /** Flag to control the visibility of the InnovationHub in the platform store. */
  listedInStore?: InputMaybe<Scalars['Boolean']['input']>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  /** Visibility of the InnovationHub in searches. */
  searchVisibility?: InputMaybe<SearchVisibility>;
  /** A list of Spaces to include in this Innovation Hub. Only valid when type 'list' is used. */
  spaceListFilter?: InputMaybe<Array<Scalars['UUID_NAMEID']['input']>>;
  /** Spaces with which visibility this Innovation Hub will display. Only valid when type 'visibility' is used. */
  spaceVisibilityFilter?: InputMaybe<SpaceVisibility>;
};

export type UpdateInnovationPackInput = {
  ID: Scalars['UUID']['input'];
  /** Flag to control the visibility of the InnovationPack in the platform Library. */
  listedInStore?: InputMaybe<Scalars['Boolean']['input']>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  /** Visibility of the InnovationPack in searches. */
  searchVisibility?: InputMaybe<SearchVisibility>;
};

export type UpdateLicensePlanInput = {
  ID: Scalars['UUID']['input'];
  /** Assign this plan to all new Organization accounts */
  assignToNewOrganizationAccounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Assign this plan to all new User accounts */
  assignToNewUserAccounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is this plan enabled? */
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is this plan free? */
  isFree?: InputMaybe<Scalars['Boolean']['input']>;
  /** The credential to represent this plan */
  licenseCredential?: InputMaybe<LicensingCredentialBasedCredentialType>;
  /** The price per month of this plan. */
  pricePerMonth?: InputMaybe<Scalars['Float']['input']>;
  /** Does this plan require contact support */
  requiresContactSupport?: InputMaybe<Scalars['Boolean']['input']>;
  /** Does this plan require a payment method? */
  requiresPaymentMethod?: InputMaybe<Scalars['Boolean']['input']>;
  /** The sorting order for this Plan. */
  sortOrder?: InputMaybe<Scalars['Float']['input']>;
  /** Is there a trial period enabled */
  trialEnabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateLinkInput = {
  ID: Scalars['UUID']['input'];
  /** The Profile of the Link. */
  profile?: InputMaybe<UpdateProfileInput>;
  uri?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLocationInput = {
  addressLine1?: InputMaybe<Scalars['String']['input']>;
  addressLine2?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  stateOrProvince?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateNotificationStateInput = {
  /** The ID of the notification to update. */
  ID: Scalars['UUID']['input'];
  /** The new state of the notification. */
  state: InAppNotificationState;
};

export type UpdateOrganizationInput = {
  /** The ID of the Organization to update. */
  ID: Scalars['UUID']['input'];
  contactEmail?: InputMaybe<Scalars['String']['input']>;
  domain?: InputMaybe<Scalars['String']['input']>;
  legalEntityName?: InputMaybe<Scalars['String']['input']>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationPlatformSettingsInput = {
  /** Upate the URL path for the Organization. */
  nameID: Scalars['NameID']['input'];
  /** The ID of the Organization to update. */
  organizationID: Scalars['UUID']['input'];
};

export type UpdateOrganizationSettingsEntityInput = {
  membership?: InputMaybe<UpdateOrganizationSettingsMembershipInput>;
  privacy?: InputMaybe<UpdateOrganizationSettingsPrivacyInput>;
};

export type UpdateOrganizationSettingsInput = {
  /** The identifier for the Organization whose settings are to be updated. */
  organizationID: Scalars['UUID']['input'];
  /** Update the settings for the Organization. */
  settings: UpdateOrganizationSettingsEntityInput;
};

export type UpdateOrganizationSettingsMembershipInput = {
  /** Allow Users with email addresses matching the domain of this Organization to join. */
  allowUsersMatchingDomainToJoin: Scalars['Boolean']['input'];
};

export type UpdateOrganizationSettingsPrivacyInput = {
  /** Allow contribution roles (membership, lead etc) in Spaces to be visible. */
  contributionRolesPubliclyVisible: Scalars['Boolean']['input'];
};

export type UpdatePostInput = {
  ID: Scalars['UUID']['input'];
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
};

export type UpdateProfileDirectInput = {
  description?: InputMaybe<Scalars['Markdown']['input']>;
  /** The display name for the entity. */
  displayName?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<UpdateLocationInput>;
  profileID: Scalars['UUID']['input'];
  references?: InputMaybe<Array<UpdateReferenceInput>>;
  /** A memorable short description for this entity. */
  tagline?: InputMaybe<Scalars['String']['input']>;
  tagsets?: InputMaybe<Array<UpdateTagsetInput>>;
};

export type UpdateProfileInput = {
  description?: InputMaybe<Scalars['Markdown']['input']>;
  /** The display name for the entity. */
  displayName?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<UpdateLocationInput>;
  references?: InputMaybe<Array<UpdateReferenceInput>>;
  /** A memorable short description for this entity. */
  tagline?: InputMaybe<Scalars['String']['input']>;
  tagsets?: InputMaybe<Array<UpdateTagsetInput>>;
};

export type UpdateReferenceInput = {
  ID: Scalars['UUID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  uri?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSpaceInput = {
  ID: Scalars['UUID']['input'];
  /** Update the contained Context entity. */
  context?: InputMaybe<UpdateContextInput>;
  /** The Profile of the InnovationFlow of this entity. */
  innovationFlowData?: InputMaybe<UpdateInnovationFlowInput>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
};

export type UpdateSpacePlatformSettingsInput = {
  /** Upate the URL path for the Space. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** The identifier for the Space whose license etc is to be updated. */
  spaceID: Scalars['UUID']['input'];
  /** Visibility of the Space, only on L0 spaces. */
  visibility?: InputMaybe<SpaceVisibility>;
};

export type UpdateSpaceSettingsCollaborationInput = {
  /** Flag to control if events from Subspaces are visible on this Space calendar as well. */
  allowEventsFromSubspaces: Scalars['Boolean']['input'];
  /** Flag to control if members can create callouts. */
  allowMembersToCreateCallouts: Scalars['Boolean']['input'];
  /** Flag to control if members can create subspaces. */
  allowMembersToCreateSubspaces: Scalars['Boolean']['input'];
  /** Flag to control if ability to contribute is inherited from parent Space. */
  inheritMembershipRights: Scalars['Boolean']['input'];
};

export type UpdateSpaceSettingsEntityInput = {
  collaboration?: InputMaybe<UpdateSpaceSettingsCollaborationInput>;
  membership?: InputMaybe<UpdateSpaceSettingsMembershipInput>;
  privacy?: InputMaybe<UpdateSpaceSettingsPrivacyInput>;
};

export type UpdateSpaceSettingsInput = {
  /** Update the settings for the Space. */
  settings: UpdateSpaceSettingsEntityInput;
  /** The identifier for the Space whose settings are to be updated. */
  spaceID: Scalars['String']['input'];
};

export type UpdateSpaceSettingsMembershipInput = {
  /** Flag to control if Subspace admins can invite for this Space. */
  allowSubspaceAdminsToInviteMembers: Scalars['Boolean']['input'];
  /** The membership policy in usage for this Space */
  policy: CommunityMembershipPolicy;
  /** The organizations that are trusted to Join as members for this Space */
  trustedOrganizations: Array<Scalars['UUID']['input']>;
};

export type UpdateSpaceSettingsPrivacyInput = {
  /** Flag to control if Platform Support has admin rights. */
  allowPlatformSupportAsAdmin?: InputMaybe<Scalars['Boolean']['input']>;
  mode?: InputMaybe<SpacePrivacyMode>;
};

export type UpdateTagsetInput = {
  ID: Scalars['UUID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  tags: Array<Scalars['String']['input']>;
};

export type UpdateTemplateDefaultTemplateInput = {
  /** The identifier for the TemplateDefault to be updated. */
  templateDefaultID: Scalars['UUID']['input'];
  /** The ID for the Template to use. */
  templateID: Scalars['UUID']['input'];
};

export type UpdateTemplateFromCollaborationInput = {
  /** The Collaboration whose content should be copied to this Template. */
  collaborationID: Scalars['UUID']['input'];
  /** The ID of the Template. */
  templateID: Scalars['UUID']['input'];
};

export type UpdateTemplateInput = {
  ID: Scalars['UUID']['input'];
  /** The default description to be pre-filled when users create Posts based on this template. */
  postDefaultDescription?: InputMaybe<Scalars['Markdown']['input']>;
  /** The Profile of the Template. */
  profile?: InputMaybe<UpdateProfileInput>;
  /** The new content to be used. */
  whiteboardContent?: InputMaybe<Scalars['WhiteboardContent']['input']>;
};

export type UpdateUserGroupInput = {
  ID: Scalars['UUID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  profileData?: InputMaybe<UpdateProfileInput>;
};

export type UpdateUserInput = {
  ID: Scalars['UUID']['input'];
  accountUpn?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  /** Set this user profile as being used as a service account or not. */
  serviceProfile?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateUserPlatformSettingsInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  /** Upate the URL path for the User. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** The identifier for the User whose platform managed information is to be updated. */
  userID: Scalars['String']['input'];
};

export type UpdateUserPreferenceInput = {
  /** Type of the user preference */
  type: PreferenceType;
  /** ID of the User */
  userID: Scalars['UUID']['input'];
  value: Scalars['String']['input'];
};

export type UpdateUserSettingsCommunicationInput = {
  /** Allow Users to send messages to this User. */
  allowOtherUsersToSendMessages: Scalars['Boolean']['input'];
};

export type UpdateUserSettingsEntityInput = {
  /** Settings related to this users Communication preferences. */
  communication?: InputMaybe<UpdateUserSettingsCommunicationInput>;
  /** Settings related to Privacy. */
  privacy?: InputMaybe<UpdateUserSettingsPrivacyInput>;
};

export type UpdateUserSettingsInput = {
  /** Update the settings for the User. */
  settings: UpdateUserSettingsEntityInput;
  /** The identifier for the User whose settings are to be updated. */
  userID: Scalars['UUID']['input'];
};

export type UpdateUserSettingsPrivacyInput = {
  /** Allow contribution roles (communication, lead etc) in Spaces to be visible. */
  contributionRolesPubliclyVisible: Scalars['Boolean']['input'];
};

export type UpdateVirtualContributorInput = {
  /** The ID of the Virtual Contributor to update. */
  ID: Scalars['UUID']['input'];
  /** Flag to control the visibility of the VC in the platform store. */
  listedInStore?: InputMaybe<Scalars['Boolean']['input']>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** The Profile of this entity. */
  profileData?: InputMaybe<UpdateProfileInput>;
  /** Visibility of the VC in searches. */
  searchVisibility?: InputMaybe<SearchVisibility>;
};

export type UpdateVisualInput = {
  alternativeText?: InputMaybe<Scalars['String']['input']>;
  uri: Scalars['String']['input'];
  visualID: Scalars['String']['input'];
};

export type UpdateWhiteboardEntityInput = {
  ID: Scalars['UUID']['input'];
  contentUpdatePolicy?: InputMaybe<ContentUpdatePolicy>;
  /** A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client. */
  nameID?: InputMaybe<Scalars['NameID']['input']>;
  /** The Profile of this entity. */
  profile?: InputMaybe<UpdateProfileInput>;
};

export type User = Contributor & {
  /** The account hosted by this User. */
  account?: Maybe<Account>;
  /** The unique personal identifier (upn) for the account associated with this user profile */
  accountUpn: Scalars['String']['output'];
  /** The Agent representing this User. */
  agent: Agent;
  /** Details about the authentication used for this User. */
  authentication?: Maybe<UserAuthenticationResult>;
  /** The authorization rules for the Contributor */
  authorization?: Maybe<Authorization>;
  /** The Community rooms this user is a member of */
  communityRooms?: Maybe<Array<CommunicationRoom>>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The direct rooms this user is a member of */
  directRooms?: Maybe<Array<DirectRoom>>;
  /** The email address for this User. */
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  /** Guidance Chat Room for this user */
  guidanceRoom?: Maybe<Room>;
  /** The ID of the Contributor */
  id: Scalars['UUID']['output'];
  /** Can a message be sent to this User. */
  isContactable: Scalars['Boolean']['output'];
  lastName: Scalars['String']['output'];
  /** A name identifier of the Contributor, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** The phone number for this User. */
  phone?: Maybe<Scalars['String']['output']>;
  /** The preferences for this user */
  preferences: Array<Preference>;
  /** The Profile for this User. */
  profile: Profile;
  /** The settings for this User. */
  settings: UserSettings;
  /** The StorageAggregator for managing storage buckets in use by this User */
  storageAggregator?: Maybe<StorageAggregator>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type UserAuthenticationResult = {
  /** When the Kratos Account for the user was created */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** The Authentication Method used for this User. One of email, linkedin, microsoft, or unknown */
  method: AuthenticationType;
};

export type UserAuthorizationPrivilegesInput = {
  /** The authorization definition to evaluate the user credentials against. */
  authorizationID: Scalars['UUID']['input'];
  /** The user to evaluate privileges granted based on held credentials. */
  userID: Scalars['UUID']['input'];
};

export type UserAuthorizationResetInput = {
  /** The identifier of the User whose Authorization Policy should be reset. */
  userID: Scalars['UUID']['input'];
};

export type UserFilterInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
};

export type UserGroup = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** The Users that are members of this User Group. */
  members?: Maybe<Array<User>>;
  /** Containing entity for this UserGroup. */
  parent?: Maybe<Groupable>;
  /** The profile for the user group */
  profile?: Maybe<Profile>;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export type UserSendMessageInput = {
  /** The message being sent */
  message: Scalars['String']['input'];
  /** The user a message is being sent to */
  receivingUserID: Scalars['String']['input'];
};

export type UserSettings = {
  /** The communication settings for this User. */
  communication: UserSettingsCommunication;
  /** The privacy settings for this User */
  privacy: UserSettingsPrivacy;
};

export type UserSettingsCommunication = {
  /** Allow Users to send messages to this User. */
  allowOtherUsersToSendMessages: Scalars['Boolean']['output'];
};

export type UserSettingsPrivacy = {
  /** Allow contribution roles (communication, lead etc) in Spaces to be visible. */
  contributionRolesPubliclyVisible: Scalars['Boolean']['output'];
};

export type UsersWithAuthorizationCredentialInput = {
  /** The resource to which a credential needs to be bound. */
  resourceID?: InputMaybe<Scalars['UUID']['input']>;
  /** The type of credential. */
  type: AuthorizationCredential;
};

export type VcInteraction = {
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  room: Room;
  threadID: Scalars['String']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  virtualContributorID: Scalars['UUID']['output'];
};

export type VerifiedCredential = {
  /** The time at which the credential is no longer valid */
  claims: Array<VerifiedCredentialClaim>;
  /** JSON for the context in the credential */
  context: Scalars['JSON']['output'];
  /** The time at which the credential is no longer valid */
  expires: Scalars['String']['output'];
  /** The time at which the credential was issued */
  issued: Scalars['String']['output'];
  /** The party issuing the VC */
  issuer: Scalars['String']['output'];
  /** The name of the VC */
  name: Scalars['String']['output'];
  /** The type of VC */
  type: Scalars['String']['output'];
};

export type VerifiedCredentialClaim = {
  /** The name of the claim */
  name: Scalars['JSON']['output'];
  /** The value for the claim */
  value: Scalars['JSON']['output'];
};

export type VirtualContributor = Contributor & {
  /** The Account of the Virtual Contributor. */
  account?: Maybe<Account>;
  /** The Agent representing this User. */
  agent: Agent;
  /** The AI persona being used by this virtual contributor */
  aiPersona?: Maybe<AiPersona>;
  /** The authorization rules for the Contributor */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the Contributor */
  id: Scalars['UUID']['output'];
  /** Flag to control if this VC is listed in the platform store. */
  listedInStore: Scalars['Boolean']['output'];
  /** A name identifier of the Contributor, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** The profile for this Virtual. */
  profile: Profile;
  /** The Virtual Contributor provider. */
  provider: Contributor;
  /** Visibility of the VC in searches. */
  searchVisibility: SearchVisibility;
  /** The status of the virtual contributor */
  status: VirtualContributorStatus;
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
};

export enum VirtualContributorStatus {
  Initializing = 'INITIALIZING',
  Ready = 'READY',
}

/** The result from a Virtual Contributor update */
export type VirtualContributorUpdatedSubscriptionResult = {
  /** The Virtual Contributor that was updated */
  virtualContributor: VirtualContributor;
};

export type Visual = {
  allowedTypes: Array<Scalars['String']['output']>;
  alternativeText?: Maybe<Scalars['String']['output']>;
  /** Post ratio width / height. */
  aspectRatio: Scalars['Float']['output'];
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The date at which the entity was created. */
  createdDate?: Maybe<Scalars['DateTime']['output']>;
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Maximum height resolution. */
  maxHeight: Scalars['Float']['output'];
  /** Maximum width resolution. */
  maxWidth: Scalars['Float']['output'];
  /** Minimum height resolution. */
  minHeight: Scalars['Float']['output'];
  /** Minimum width resolution. */
  minWidth: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  /** The date at which the entity was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
  uri: Scalars['String']['output'];
};

export type VisualConstraints = {
  /** Allowed file types. */
  allowedTypes: Array<Scalars['String']['output']>;
  /** Dimensions ratio width / height. */
  aspectRatio: Scalars['Float']['output'];
  /** Maximum height resolution. */
  maxHeight: Scalars['Float']['output'];
  /** Maximum width resolution. */
  maxWidth: Scalars['Float']['output'];
  /** Minimum height resolution. */
  minHeight: Scalars['Float']['output'];
  /** Minimum width resolution. */
  minWidth: Scalars['Float']['output'];
};

export enum VisualType {
  Avatar = 'AVATAR',
  Banner = 'BANNER',
  BannerWide = 'BANNER_WIDE',
  Card = 'CARD',
}

export type VisualUploadImageInput = {
  alternativeText?: InputMaybe<Scalars['String']['input']>;
  visualID: Scalars['String']['input'];
};

export type Whiteboard = {
  /** The authorization rules for the entity */
  authorization?: Maybe<Authorization>;
  /** The visual content of the Whiteboard. */
  content: Scalars['WhiteboardContent']['output'];
  /** The policy governing who can update the Whiteboard contet. */
  contentUpdatePolicy: ContentUpdatePolicy;
  /** The user that created this Whiteboard */
  createdBy?: Maybe<User>;
  /** The date at which the Whiteboard was created. */
  createdDate: Scalars['DateTime']['output'];
  /** The ID of the entity */
  id: Scalars['UUID']['output'];
  /** Whether the Whiteboard is multi-user enabled on Space level. */
  isMultiUser: Scalars['Boolean']['output'];
  /** A name identifier of the entity, unique within a given scope. */
  nameID: Scalars['NameID']['output'];
  /** The Profile for this Whiteboard. */
  profile: Profile;
  /** The date at which the Whiteboard was last updated. */
  updatedDate?: Maybe<Scalars['DateTime']['output']>;
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
  TArgs,
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
  TArgs,
> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {},
> =
  | ((
      ...args: any[]
    ) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => SchemaTypes.Maybe<TTypes> | Promise<SchemaTypes.Maybe<TTypes>>;

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
  TArgs = {},
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  AuthenticationProviderConfigUnion: SchemaTypes.OryConfig;
};

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> =
  {
    ActivityLogEntry:
      | (Omit<
          SchemaTypes.ActivityLogEntryCalendarEventCreated,
          'calendar' | 'calendarEvent' | 'space' | 'triggeredBy'
        > & {
          calendar: _RefType['Calendar'];
          calendarEvent: _RefType['CalendarEvent'];
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          triggeredBy: _RefType['User'];
        })
      | (Omit<
          SchemaTypes.ActivityLogEntryCalloutDiscussionComment,
          'callout' | 'space' | 'triggeredBy'
        > & {
          callout: _RefType['Callout'];
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          triggeredBy: _RefType['User'];
        })
      | (Omit<
          SchemaTypes.ActivityLogEntryCalloutLinkCreated,
          'callout' | 'link' | 'space' | 'triggeredBy'
        > & {
          callout: _RefType['Callout'];
          link: _RefType['Link'];
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          triggeredBy: _RefType['User'];
        })
      | (Omit<
          SchemaTypes.ActivityLogEntryCalloutPostComment,
          'callout' | 'post' | 'space' | 'triggeredBy'
        > & {
          callout: _RefType['Callout'];
          post: _RefType['Post'];
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          triggeredBy: _RefType['User'];
        })
      | (Omit<
          SchemaTypes.ActivityLogEntryCalloutPostCreated,
          'callout' | 'post' | 'space' | 'triggeredBy'
        > & {
          callout: _RefType['Callout'];
          post: _RefType['Post'];
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          triggeredBy: _RefType['User'];
        })
      | (Omit<
          SchemaTypes.ActivityLogEntryCalloutPublished,
          'callout' | 'space' | 'triggeredBy'
        > & {
          callout: _RefType['Callout'];
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          triggeredBy: _RefType['User'];
        })
      | (Omit<
          SchemaTypes.ActivityLogEntryCalloutWhiteboardContentModified,
          'callout' | 'space' | 'triggeredBy' | 'whiteboard'
        > & {
          callout: _RefType['Callout'];
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          triggeredBy: _RefType['User'];
          whiteboard: _RefType['Whiteboard'];
        })
      | (Omit<
          SchemaTypes.ActivityLogEntryCalloutWhiteboardCreated,
          'callout' | 'space' | 'triggeredBy' | 'whiteboard'
        > & {
          callout: _RefType['Callout'];
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          triggeredBy: _RefType['User'];
          whiteboard: _RefType['Whiteboard'];
        })
      | (Omit<
          SchemaTypes.ActivityLogEntryChallengeCreated,
          'space' | 'subspace' | 'triggeredBy'
        > & {
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          subspace: _RefType['Space'];
          triggeredBy: _RefType['User'];
        })
      | (Omit<
          SchemaTypes.ActivityLogEntryMemberJoined,
          'community' | 'contributor' | 'space' | 'triggeredBy'
        > & {
          community: _RefType['Community'];
          contributor: _RefType['Contributor'];
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          triggeredBy: _RefType['User'];
        })
      | (Omit<
          SchemaTypes.ActivityLogEntryOpportunityCreated,
          'space' | 'subsubspace' | 'triggeredBy'
        > & {
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          subsubspace: _RefType['Space'];
          triggeredBy: _RefType['User'];
        })
      | (Omit<
          SchemaTypes.ActivityLogEntryUpdateSent,
          'space' | 'triggeredBy' | 'updates'
        > & {
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          triggeredBy: _RefType['User'];
          updates: _RefType['Room'];
        });
    Contributor:
      | (Omit<
          SchemaTypes.Organization,
          | 'account'
          | 'admins'
          | 'associates'
          | 'group'
          | 'groups'
          | 'owners'
          | 'profile'
        > & {
          account?: SchemaTypes.Maybe<_RefType['Account']>;
          admins?: SchemaTypes.Maybe<Array<_RefType['User']>>;
          associates?: SchemaTypes.Maybe<Array<_RefType['User']>>;
          group?: SchemaTypes.Maybe<_RefType['UserGroup']>;
          groups?: SchemaTypes.Maybe<Array<_RefType['UserGroup']>>;
          owners?: SchemaTypes.Maybe<Array<_RefType['User']>>;
          profile: _RefType['Profile'];
        })
      | (Omit<
          SchemaTypes.User,
          | 'account'
          | 'communityRooms'
          | 'directRooms'
          | 'guidanceRoom'
          | 'profile'
        > & {
          account?: SchemaTypes.Maybe<_RefType['Account']>;
          communityRooms?: SchemaTypes.Maybe<
            Array<_RefType['CommunicationRoom']>
          >;
          directRooms?: SchemaTypes.Maybe<Array<_RefType['DirectRoom']>>;
          guidanceRoom?: SchemaTypes.Maybe<_RefType['Room']>;
          profile: _RefType['Profile'];
        })
      | (Omit<
          SchemaTypes.VirtualContributor,
          'account' | 'profile' | 'provider'
        > & {
          account?: SchemaTypes.Maybe<_RefType['Account']>;
          profile: _RefType['Profile'];
          provider: _RefType['Contributor'];
        });
    Groupable:
      | (Omit<
          SchemaTypes.Community,
          'communication' | 'group' | 'groups' | 'guidelines' | 'roleSet'
        > & {
          communication: _RefType['Communication'];
          group: _RefType['UserGroup'];
          groups: Array<_RefType['UserGroup']>;
          guidelines: _RefType['CommunityGuidelines'];
          roleSet: _RefType['RoleSet'];
        })
      | (Omit<
          SchemaTypes.Organization,
          | 'account'
          | 'admins'
          | 'associates'
          | 'group'
          | 'groups'
          | 'owners'
          | 'profile'
        > & {
          account?: SchemaTypes.Maybe<_RefType['Account']>;
          admins?: SchemaTypes.Maybe<Array<_RefType['User']>>;
          associates?: SchemaTypes.Maybe<Array<_RefType['User']>>;
          group?: SchemaTypes.Maybe<_RefType['UserGroup']>;
          groups?: SchemaTypes.Maybe<Array<_RefType['UserGroup']>>;
          owners?: SchemaTypes.Maybe<Array<_RefType['User']>>;
          profile: _RefType['Profile'];
        });
    InAppNotification:
      | (Omit<
          SchemaTypes.InAppNotificationCalloutPublished,
          'callout' | 'receiver' | 'space' | 'triggeredBy'
        > & {
          callout?: SchemaTypes.Maybe<_RefType['Callout']>;
          receiver: _RefType['Contributor'];
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          triggeredBy?: SchemaTypes.Maybe<_RefType['Contributor']>;
        })
      | (Omit<
          SchemaTypes.InAppNotificationCommunityNewMember,
          'actor' | 'receiver' | 'space' | 'triggeredBy'
        > & {
          actor?: SchemaTypes.Maybe<_RefType['Contributor']>;
          receiver: _RefType['Contributor'];
          space?: SchemaTypes.Maybe<_RefType['Space']>;
          triggeredBy?: SchemaTypes.Maybe<_RefType['Contributor']>;
        })
      | (Omit<
          SchemaTypes.InAppNotificationUserMentioned,
          'receiver' | 'triggeredBy'
        > & {
          receiver: _RefType['Contributor'];
          triggeredBy?: SchemaTypes.Maybe<_RefType['Contributor']>;
        });
    SearchResult:
      | (Omit<SchemaTypes.SearchResultCallout, 'callout' | 'space'> & {
          callout: _RefType['Callout'];
          space: _RefType['Space'];
        })
      | (Omit<SchemaTypes.SearchResultOrganization, 'organization'> & {
          organization: _RefType['Organization'];
        })
      | (Omit<SchemaTypes.SearchResultPost, 'callout' | 'post' | 'space'> & {
          callout: _RefType['Callout'];
          post: _RefType['Post'];
          space: _RefType['Space'];
        })
      | (Omit<SchemaTypes.SearchResultSpace, 'parentSpace' | 'space'> & {
          parentSpace?: SchemaTypes.Maybe<_RefType['Space']>;
          space: _RefType['Space'];
        })
      | (Omit<SchemaTypes.SearchResultUser, 'user'> & {
          user: _RefType['User'];
        })
      | (Omit<SchemaTypes.SearchResultUserGroup, 'userGroup'> & {
          userGroup: _RefType['UserGroup'];
        });
  };

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  APM: ResolverTypeWrapper<SchemaTypes.Apm>;
  Account: ResolverTypeWrapper<
    Omit<
      SchemaTypes.Account,
      | 'host'
      | 'innovationHubs'
      | 'innovationPacks'
      | 'spaces'
      | 'virtualContributors'
    > & {
      host?: SchemaTypes.Maybe<ResolversTypes['Contributor']>;
      innovationHubs: Array<ResolversTypes['InnovationHub']>;
      innovationPacks: Array<ResolversTypes['InnovationPack']>;
      spaces: Array<ResolversTypes['Space']>;
      virtualContributors: Array<ResolversTypes['VirtualContributor']>;
    }
  >;
  AccountAuthorizationResetInput: SchemaTypes.AccountAuthorizationResetInput;
  AccountLicenseResetInput: SchemaTypes.AccountLicenseResetInput;
  AccountSubscription: ResolverTypeWrapper<SchemaTypes.AccountSubscription>;
  AccountType: SchemaTypes.AccountType;
  ActivityCreatedSubscriptionInput: SchemaTypes.ActivityCreatedSubscriptionInput;
  ActivityCreatedSubscriptionResult: ResolverTypeWrapper<
    Omit<SchemaTypes.ActivityCreatedSubscriptionResult, 'activity'> & {
      activity: ResolversTypes['ActivityLogEntry'];
    }
  >;
  ActivityEventType: SchemaTypes.ActivityEventType;
  ActivityFeed: ResolverTypeWrapper<
    Omit<SchemaTypes.ActivityFeed, 'activityFeed' | 'pageInfo'> & {
      activityFeed: Array<ResolversTypes['ActivityLogEntry']>;
      pageInfo: ResolversTypes['PageInfo'];
    }
  >;
  ActivityFeedGroupedQueryArgs: SchemaTypes.ActivityFeedGroupedQueryArgs;
  ActivityFeedQueryArgs: SchemaTypes.ActivityFeedQueryArgs;
  ActivityFeedRoles: SchemaTypes.ActivityFeedRoles;
  ActivityLogEntry: ResolverTypeWrapper<
    ResolversInterfaceTypes<ResolversTypes>['ActivityLogEntry']
  >;
  ActivityLogEntryCalendarEventCreated: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ActivityLogEntryCalendarEventCreated,
      'calendar' | 'calendarEvent' | 'space' | 'triggeredBy'
    > & {
      calendar: ResolversTypes['Calendar'];
      calendarEvent: ResolversTypes['CalendarEvent'];
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      triggeredBy: ResolversTypes['User'];
    }
  >;
  ActivityLogEntryCalloutDiscussionComment: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ActivityLogEntryCalloutDiscussionComment,
      'callout' | 'space' | 'triggeredBy'
    > & {
      callout: ResolversTypes['Callout'];
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      triggeredBy: ResolversTypes['User'];
    }
  >;
  ActivityLogEntryCalloutLinkCreated: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ActivityLogEntryCalloutLinkCreated,
      'callout' | 'link' | 'space' | 'triggeredBy'
    > & {
      callout: ResolversTypes['Callout'];
      link: ResolversTypes['Link'];
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      triggeredBy: ResolversTypes['User'];
    }
  >;
  ActivityLogEntryCalloutPostComment: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ActivityLogEntryCalloutPostComment,
      'callout' | 'post' | 'space' | 'triggeredBy'
    > & {
      callout: ResolversTypes['Callout'];
      post: ResolversTypes['Post'];
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      triggeredBy: ResolversTypes['User'];
    }
  >;
  ActivityLogEntryCalloutPostCreated: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ActivityLogEntryCalloutPostCreated,
      'callout' | 'post' | 'space' | 'triggeredBy'
    > & {
      callout: ResolversTypes['Callout'];
      post: ResolversTypes['Post'];
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      triggeredBy: ResolversTypes['User'];
    }
  >;
  ActivityLogEntryCalloutPublished: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ActivityLogEntryCalloutPublished,
      'callout' | 'space' | 'triggeredBy'
    > & {
      callout: ResolversTypes['Callout'];
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      triggeredBy: ResolversTypes['User'];
    }
  >;
  ActivityLogEntryCalloutWhiteboardContentModified: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ActivityLogEntryCalloutWhiteboardContentModified,
      'callout' | 'space' | 'triggeredBy' | 'whiteboard'
    > & {
      callout: ResolversTypes['Callout'];
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      triggeredBy: ResolversTypes['User'];
      whiteboard: ResolversTypes['Whiteboard'];
    }
  >;
  ActivityLogEntryCalloutWhiteboardCreated: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ActivityLogEntryCalloutWhiteboardCreated,
      'callout' | 'space' | 'triggeredBy' | 'whiteboard'
    > & {
      callout: ResolversTypes['Callout'];
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      triggeredBy: ResolversTypes['User'];
      whiteboard: ResolversTypes['Whiteboard'];
    }
  >;
  ActivityLogEntryChallengeCreated: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ActivityLogEntryChallengeCreated,
      'space' | 'subspace' | 'triggeredBy'
    > & {
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      subspace: ResolversTypes['Space'];
      triggeredBy: ResolversTypes['User'];
    }
  >;
  ActivityLogEntryMemberJoined: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ActivityLogEntryMemberJoined,
      'community' | 'contributor' | 'space' | 'triggeredBy'
    > & {
      community: ResolversTypes['Community'];
      contributor: ResolversTypes['Contributor'];
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      triggeredBy: ResolversTypes['User'];
    }
  >;
  ActivityLogEntryOpportunityCreated: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ActivityLogEntryOpportunityCreated,
      'space' | 'subsubspace' | 'triggeredBy'
    > & {
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      subsubspace: ResolversTypes['Space'];
      triggeredBy: ResolversTypes['User'];
    }
  >;
  ActivityLogEntryUpdateSent: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ActivityLogEntryUpdateSent,
      'space' | 'triggeredBy' | 'updates'
    > & {
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      triggeredBy: ResolversTypes['User'];
      updates: ResolversTypes['Room'];
    }
  >;
  ActivityLogInput: SchemaTypes.ActivityLogInput;
  Actor: ResolverTypeWrapper<SchemaTypes.Actor>;
  ActorGroup: ResolverTypeWrapper<SchemaTypes.ActorGroup>;
  Agent: ResolverTypeWrapper<SchemaTypes.Agent>;
  AgentBeginVerifiedCredentialOfferOutput: ResolverTypeWrapper<SchemaTypes.AgentBeginVerifiedCredentialOfferOutput>;
  AgentBeginVerifiedCredentialRequestOutput: ResolverTypeWrapper<SchemaTypes.AgentBeginVerifiedCredentialRequestOutput>;
  AgentType: SchemaTypes.AgentType;
  AiPersona: ResolverTypeWrapper<SchemaTypes.AiPersona>;
  AiPersonaBodyOfKnowledgeType: SchemaTypes.AiPersonaBodyOfKnowledgeType;
  AiPersonaDataAccessMode: SchemaTypes.AiPersonaDataAccessMode;
  AiPersonaEngine: SchemaTypes.AiPersonaEngine;
  AiPersonaInteractionMode: SchemaTypes.AiPersonaInteractionMode;
  AiPersonaService: ResolverTypeWrapper<SchemaTypes.AiPersonaService>;
  AiPersonaServiceIngestInput: SchemaTypes.AiPersonaServiceIngestInput;
  AiServer: ResolverTypeWrapper<SchemaTypes.AiServer>;
  Application: ResolverTypeWrapper<
    Omit<SchemaTypes.Application, 'contributor'> & {
      contributor: ResolversTypes['Contributor'];
    }
  >;
  ApplicationEventInput: SchemaTypes.ApplicationEventInput;
  ApplyForEntryRoleOnRoleSetInput: SchemaTypes.ApplyForEntryRoleOnRoleSetInput;
  AssignLicensePlanToAccount: SchemaTypes.AssignLicensePlanToAccount;
  AssignLicensePlanToSpace: SchemaTypes.AssignLicensePlanToSpace;
  AssignRoleOnRoleSetToUserInput: SchemaTypes.AssignRoleOnRoleSetToUserInput;
  AssignRoleOnRoleSetToUserInput: SchemaTypes.AssignRoleOnRoleSetToUserInput;
  AssignRoleOnRoleSetToOrganizationInput: SchemaTypes.AssignRoleOnRoleSetToOrganizationInput;
  AssignRoleOnRoleSetToUserInput: SchemaTypes.AssignRoleOnRoleSetToUserInput;
  AssignRoleOnRoleSetToVirtualContributorInput: SchemaTypes.AssignRoleOnRoleSetToVirtualContributorInput;
  AssignUserGroupMemberInput: SchemaTypes.AssignUserGroupMemberInput;
  AuthenticationConfig: ResolverTypeWrapper<
    Omit<SchemaTypes.AuthenticationConfig, 'providers'> & {
      providers: Array<ResolversTypes['AuthenticationProviderConfig']>;
    }
  >;
  AuthenticationProviderConfig: ResolverTypeWrapper<
    Omit<SchemaTypes.AuthenticationProviderConfig, 'config'> & {
      config: ResolversTypes['AuthenticationProviderConfigUnion'];
    }
  >;
  AuthenticationProviderConfigUnion: ResolverTypeWrapper<
    ResolversUnionTypes<ResolversTypes>['AuthenticationProviderConfigUnion']
  >;
  AuthenticationType: SchemaTypes.AuthenticationType;
  Authorization: ResolverTypeWrapper<SchemaTypes.Authorization>;
  AuthorizationCredential: SchemaTypes.AuthorizationCredential;
  AuthorizationPolicyRuleCredential: ResolverTypeWrapper<SchemaTypes.AuthorizationPolicyRuleCredential>;
  AuthorizationPolicyRulePrivilege: ResolverTypeWrapper<SchemaTypes.AuthorizationPolicyRulePrivilege>;
  AuthorizationPolicyRuleVerifiedCredential: ResolverTypeWrapper<SchemaTypes.AuthorizationPolicyRuleVerifiedCredential>;
  AuthorizationPolicyType: SchemaTypes.AuthorizationPolicyType;
  AuthorizationPrivilege: SchemaTypes.AuthorizationPrivilege;
  Boolean: ResolverTypeWrapper<SchemaTypes.Scalars['Boolean']['output']>;
  Calendar: ResolverTypeWrapper<
    Omit<SchemaTypes.Calendar, 'event' | 'events'> & {
      event?: SchemaTypes.Maybe<ResolversTypes['CalendarEvent']>;
      events: Array<ResolversTypes['CalendarEvent']>;
    }
  >;
  CalendarEvent: ResolverTypeWrapper<
    Omit<
      SchemaTypes.CalendarEvent,
      'comments' | 'createdBy' | 'profile' | 'subspace'
    > & {
      comments: ResolversTypes['Room'];
      createdBy?: SchemaTypes.Maybe<ResolversTypes['User']>;
      profile: ResolversTypes['Profile'];
      subspace?: SchemaTypes.Maybe<ResolversTypes['Space']>;
    }
  >;
  CalendarEventType: SchemaTypes.CalendarEventType;
  Callout: ResolverTypeWrapper<
    Omit<
      SchemaTypes.Callout,
      | 'comments'
      | 'contributions'
      | 'createdBy'
      | 'framing'
      | 'posts'
      | 'publishedBy'
    > & {
      comments?: SchemaTypes.Maybe<ResolversTypes['Room']>;
      contributions: Array<ResolversTypes['CalloutContribution']>;
      createdBy?: SchemaTypes.Maybe<ResolversTypes['User']>;
      framing: ResolversTypes['CalloutFraming'];
      posts?: SchemaTypes.Maybe<Array<ResolversTypes['Post']>>;
      publishedBy?: SchemaTypes.Maybe<ResolversTypes['User']>;
    }
  >;
  CalloutContribution: ResolverTypeWrapper<
    Omit<
      SchemaTypes.CalloutContribution,
      'createdBy' | 'link' | 'post' | 'whiteboard'
    > & {
      createdBy?: SchemaTypes.Maybe<ResolversTypes['User']>;
      link?: SchemaTypes.Maybe<ResolversTypes['Link']>;
      post?: SchemaTypes.Maybe<ResolversTypes['Post']>;
      whiteboard?: SchemaTypes.Maybe<ResolversTypes['Whiteboard']>;
    }
  >;
  CalloutContributionDefaults: ResolverTypeWrapper<SchemaTypes.CalloutContributionDefaults>;
  CalloutContributionFilterArgs: SchemaTypes.CalloutContributionFilterArgs;
  CalloutContributionPolicy: ResolverTypeWrapper<SchemaTypes.CalloutContributionPolicy>;
  CalloutContributionType: SchemaTypes.CalloutContributionType;
  CalloutFraming: ResolverTypeWrapper<
    Omit<SchemaTypes.CalloutFraming, 'profile' | 'whiteboard'> & {
      profile: ResolversTypes['Profile'];
      whiteboard?: SchemaTypes.Maybe<ResolversTypes['Whiteboard']>;
    }
  >;
  CalloutGroup: ResolverTypeWrapper<SchemaTypes.CalloutGroup>;
  CalloutGroupName: SchemaTypes.CalloutGroupName;
  CalloutPostCreated: ResolverTypeWrapper<
    Omit<SchemaTypes.CalloutPostCreated, 'post'> & {
      post: ResolversTypes['Post'];
    }
  >;
  CalloutState: SchemaTypes.CalloutState;
  CalloutType: SchemaTypes.CalloutType;
  CalloutVisibility: SchemaTypes.CalloutVisibility;
  ChatGuidanceAnswerRelevanceInput: SchemaTypes.ChatGuidanceAnswerRelevanceInput;
  ChatGuidanceInput: SchemaTypes.ChatGuidanceInput;
  Collaboration: ResolverTypeWrapper<
    Omit<
      SchemaTypes.Collaboration,
      'callouts' | 'innovationFlow' | 'timeline'
    > & {
      callouts: Array<ResolversTypes['Callout']>;
      innovationFlow: ResolversTypes['InnovationFlow'];
      timeline: ResolversTypes['Timeline'];
    }
  >;
  Communication: ResolverTypeWrapper<
    Omit<SchemaTypes.Communication, 'updates'> & {
      updates: ResolversTypes['Room'];
    }
  >;
  CommunicationAdminEnsureAccessInput: SchemaTypes.CommunicationAdminEnsureAccessInput;
  CommunicationAdminMembershipInput: SchemaTypes.CommunicationAdminMembershipInput;
  CommunicationAdminMembershipResult: ResolverTypeWrapper<SchemaTypes.CommunicationAdminMembershipResult>;
  CommunicationAdminOrphanedUsageResult: ResolverTypeWrapper<SchemaTypes.CommunicationAdminOrphanedUsageResult>;
  CommunicationAdminRemoveOrphanedRoomInput: SchemaTypes.CommunicationAdminRemoveOrphanedRoomInput;
  CommunicationAdminRoomMembershipResult: ResolverTypeWrapper<SchemaTypes.CommunicationAdminRoomMembershipResult>;
  CommunicationAdminRoomResult: ResolverTypeWrapper<SchemaTypes.CommunicationAdminRoomResult>;
  CommunicationAdminUpdateRoomStateInput: SchemaTypes.CommunicationAdminUpdateRoomStateInput;
  CommunicationRoom: ResolverTypeWrapper<
    Omit<SchemaTypes.CommunicationRoom, 'messages'> & {
      messages: Array<ResolversTypes['Message']>;
    }
  >;
  CommunicationSendMessageToCommunityLeadsInput: SchemaTypes.CommunicationSendMessageToCommunityLeadsInput;
  CommunicationSendMessageToOrganizationInput: SchemaTypes.CommunicationSendMessageToOrganizationInput;
  CommunicationSendMessageToUserInput: SchemaTypes.CommunicationSendMessageToUserInput;
  Community: ResolverTypeWrapper<
    Omit<
      SchemaTypes.Community,
      'communication' | 'group' | 'groups' | 'guidelines' | 'roleSet'
    > & {
      communication: ResolversTypes['Communication'];
      group: ResolversTypes['UserGroup'];
      groups: Array<ResolversTypes['UserGroup']>;
      guidelines: ResolversTypes['CommunityGuidelines'];
      roleSet: ResolversTypes['RoleSet'];
    }
  >;
  CommunityApplicationForRoleResult: ResolverTypeWrapper<SchemaTypes.CommunityApplicationForRoleResult>;
  CommunityApplicationResult: ResolverTypeWrapper<
    Omit<
      SchemaTypes.CommunityApplicationResult,
      'application' | 'spacePendingMembershipInfo'
    > & {
      application: ResolversTypes['Application'];
      spacePendingMembershipInfo: ResolversTypes['SpacePendingMembershipInfo'];
    }
  >;
  CommunityContributorType: SchemaTypes.CommunityContributorType;
  CommunityGuidelines: ResolverTypeWrapper<
    Omit<SchemaTypes.CommunityGuidelines, 'profile'> & {
      profile: ResolversTypes['Profile'];
    }
  >;
  CommunityInvitationForRoleResult: ResolverTypeWrapper<SchemaTypes.CommunityInvitationForRoleResult>;
  CommunityInvitationResult: ResolverTypeWrapper<
    Omit<
      SchemaTypes.CommunityInvitationResult,
      'invitation' | 'spacePendingMembershipInfo'
    > & {
      invitation: ResolversTypes['Invitation'];
      spacePendingMembershipInfo: ResolversTypes['SpacePendingMembershipInfo'];
    }
  >;
  CommunityMembershipPolicy: SchemaTypes.CommunityMembershipPolicy;
  CommunityMembershipResult: ResolverTypeWrapper<
    Omit<
      SchemaTypes.CommunityMembershipResult,
      'childMemberships' | 'space'
    > & {
      childMemberships: Array<ResolversTypes['CommunityMembershipResult']>;
      space: ResolversTypes['Space'];
    }
  >;
  CommunityMembershipStatus: SchemaTypes.CommunityMembershipStatus;
  CommunityRoleImplicit: SchemaTypes.CommunityRoleImplicit;
  RoleName: SchemaTypes.RoleName;
  Config: ResolverTypeWrapper<
    Omit<SchemaTypes.Config, 'authentication'> & {
      authentication: ResolversTypes['AuthenticationConfig'];
    }
  >;
  ContentUpdatePolicy: SchemaTypes.ContentUpdatePolicy;
  Context: ResolverTypeWrapper<SchemaTypes.Context>;
  Contributor: ResolverTypeWrapper<
    ResolversInterfaceTypes<ResolversTypes>['Contributor']
  >;
  ContributorFilterInput: SchemaTypes.ContributorFilterInput;
  ContributorRolePolicy: ResolverTypeWrapper<SchemaTypes.ContributorRolePolicy>;
  ContributorRoles: ResolverTypeWrapper<SchemaTypes.ContributorRoles>;
  ConvertSubspaceToSpaceInput: SchemaTypes.ConvertSubspaceToSpaceInput;
  ConvertSubsubspaceToSubspaceInput: SchemaTypes.ConvertSubsubspaceToSubspaceInput;
  CreateActorGroupInput: SchemaTypes.CreateActorGroupInput;
  CreateActorInput: SchemaTypes.CreateActorInput;
  CreateAiPersonaInput: SchemaTypes.CreateAiPersonaInput;
  CreateAiPersonaServiceInput: SchemaTypes.CreateAiPersonaServiceInput;
  CreateCalendarEventOnCalendarInput: SchemaTypes.CreateCalendarEventOnCalendarInput;
  CreateCalloutContributionDefaultsData: ResolverTypeWrapper<SchemaTypes.CreateCalloutContributionDefaultsData>;
  CreateCalloutContributionDefaultsInput: SchemaTypes.CreateCalloutContributionDefaultsInput;
  CreateCalloutContributionPolicyData: ResolverTypeWrapper<SchemaTypes.CreateCalloutContributionPolicyData>;
  CreateCalloutContributionPolicyInput: SchemaTypes.CreateCalloutContributionPolicyInput;
  CreateCalloutData: ResolverTypeWrapper<SchemaTypes.CreateCalloutData>;
  CreateCalloutFramingData: ResolverTypeWrapper<SchemaTypes.CreateCalloutFramingData>;
  CreateCalloutFramingInput: SchemaTypes.CreateCalloutFramingInput;
  CreateCalloutInput: SchemaTypes.CreateCalloutInput;
  CreateCalloutOnCollaborationInput: SchemaTypes.CreateCalloutOnCollaborationInput;
  CreateCollaborationData: ResolverTypeWrapper<SchemaTypes.CreateCollaborationData>;
  CreateCollaborationInput: SchemaTypes.CreateCollaborationInput;
  CreateCollaborationOnSpaceInput: SchemaTypes.CreateCollaborationOnSpaceInput;
  CreateCommunityGuidelinesData: ResolverTypeWrapper<SchemaTypes.CreateCommunityGuidelinesData>;
  CreateCommunityGuidelinesInput: SchemaTypes.CreateCommunityGuidelinesInput;
  CreateContextInput: SchemaTypes.CreateContextInput;
  CreateContributionOnCalloutInput: SchemaTypes.CreateContributionOnCalloutInput;
  CreateInnovationFlowData: ResolverTypeWrapper<SchemaTypes.CreateInnovationFlowData>;
  CreateInnovationFlowInput: SchemaTypes.CreateInnovationFlowInput;
  CreateInnovationFlowStateData: ResolverTypeWrapper<SchemaTypes.CreateInnovationFlowStateData>;
  CreateInnovationFlowStateInput: SchemaTypes.CreateInnovationFlowStateInput;
  CreateInnovationHubOnAccountInput: SchemaTypes.CreateInnovationHubOnAccountInput;
  CreateInnovationPackOnAccountInput: SchemaTypes.CreateInnovationPackOnAccountInput;
  CreateLicensePlanOnLicensingFrameworkInput: SchemaTypes.CreateLicensePlanOnLicensingFrameworkInput;
  CreateLinkInput: SchemaTypes.CreateLinkInput;
  CreateLocationData: ResolverTypeWrapper<SchemaTypes.CreateLocationData>;
  CreateLocationInput: SchemaTypes.CreateLocationInput;
  CreateNVPInput: SchemaTypes.CreateNvpInput;
  CreateOrganizationInput: SchemaTypes.CreateOrganizationInput;
  CreatePlatformInvitationForRoleInput: SchemaTypes.CreatePlatformInvitationForRoleInput;
  CreatePostInput: SchemaTypes.CreatePostInput;
  CreateProfileData: ResolverTypeWrapper<SchemaTypes.CreateProfileData>;
  CreateProfileInput: SchemaTypes.CreateProfileInput;
  CreateReferenceData: ResolverTypeWrapper<SchemaTypes.CreateReferenceData>;
  CreateReferenceInput: SchemaTypes.CreateReferenceInput;
  CreateReferenceOnProfileInput: SchemaTypes.CreateReferenceOnProfileInput;
  CreateSpaceOnAccountInput: SchemaTypes.CreateSpaceOnAccountInput;
  CreateSubspaceInput: SchemaTypes.CreateSubspaceInput;
  CreateTagsetData: ResolverTypeWrapper<SchemaTypes.CreateTagsetData>;
  CreateTagsetInput: SchemaTypes.CreateTagsetInput;
  CreateTagsetOnProfileInput: SchemaTypes.CreateTagsetOnProfileInput;
  CreateTemplateFromCollaborationOnTemplatesSetInput: SchemaTypes.CreateTemplateFromCollaborationOnTemplatesSetInput;
  CreateTemplateOnTemplatesSetInput: SchemaTypes.CreateTemplateOnTemplatesSetInput;
  CreateUserGroupInput: SchemaTypes.CreateUserGroupInput;
  CreateUserInput: SchemaTypes.CreateUserInput;
  CreateVirtualContributorOnAccountInput: SchemaTypes.CreateVirtualContributorOnAccountInput;
  CreateWhiteboardData: ResolverTypeWrapper<SchemaTypes.CreateWhiteboardData>;
  CreateWhiteboardInput: SchemaTypes.CreateWhiteboardInput;
  Credential: ResolverTypeWrapper<SchemaTypes.Credential>;
  CredentialDefinition: ResolverTypeWrapper<SchemaTypes.CredentialDefinition>;
  CredentialMetadataOutput: ResolverTypeWrapper<SchemaTypes.CredentialMetadataOutput>;
  CredentialType: SchemaTypes.CredentialType;
  DID: ResolverTypeWrapper<SchemaTypes.Scalars['DID']['output']>;
  DateTime: ResolverTypeWrapper<SchemaTypes.Scalars['DateTime']['output']>;
  DeleteActorGroupInput: SchemaTypes.DeleteActorGroupInput;
  DeleteActorInput: SchemaTypes.DeleteActorInput;
  DeleteAiPersonaServiceInput: SchemaTypes.DeleteAiPersonaServiceInput;
  DeleteApplicationInput: SchemaTypes.DeleteApplicationInput;
  DeleteCalendarEventInput: SchemaTypes.DeleteCalendarEventInput;
  DeleteCalloutInput: SchemaTypes.DeleteCalloutInput;
  DeleteCollaborationInput: SchemaTypes.DeleteCollaborationInput;
  DeleteDiscussionInput: SchemaTypes.DeleteDiscussionInput;
  DeleteDocumentInput: SchemaTypes.DeleteDocumentInput;
  DeleteInnovationHubInput: SchemaTypes.DeleteInnovationHubInput;
  DeleteInnovationPackInput: SchemaTypes.DeleteInnovationPackInput;
  DeleteInvitationInput: SchemaTypes.DeleteInvitationInput;
  DeleteLicensePlanInput: SchemaTypes.DeleteLicensePlanInput;
  DeleteLinkInput: SchemaTypes.DeleteLinkInput;
  DeleteOrganizationInput: SchemaTypes.DeleteOrganizationInput;
  DeletePlatformInvitationInput: SchemaTypes.DeletePlatformInvitationInput;
  DeletePostInput: SchemaTypes.DeletePostInput;
  DeleteReferenceInput: SchemaTypes.DeleteReferenceInput;
  DeleteSpaceInput: SchemaTypes.DeleteSpaceInput;
  DeleteStorageBuckeetInput: SchemaTypes.DeleteStorageBuckeetInput;
  DeleteTemplateInput: SchemaTypes.DeleteTemplateInput;
  DeleteUserGroupInput: SchemaTypes.DeleteUserGroupInput;
  DeleteUserInput: SchemaTypes.DeleteUserInput;
  DeleteVirtualContributorInput: SchemaTypes.DeleteVirtualContributorInput;
  DeleteWhiteboardInput: SchemaTypes.DeleteWhiteboardInput;
  DirectRoom: ResolverTypeWrapper<
    Omit<SchemaTypes.DirectRoom, 'messages'> & {
      messages: Array<ResolversTypes['Message']>;
    }
  >;
  Discussion: ResolverTypeWrapper<
    Omit<SchemaTypes.Discussion, 'comments' | 'profile'> & {
      comments: ResolversTypes['Room'];
      profile: ResolversTypes['Profile'];
    }
  >;
  DiscussionsInput: SchemaTypes.DiscussionsInput;
  DiscussionsOrderBy: SchemaTypes.DiscussionsOrderBy;
  Document: ResolverTypeWrapper<
    Omit<SchemaTypes.Document, 'createdBy'> & {
      createdBy?: SchemaTypes.Maybe<ResolversTypes['User']>;
    }
  >;
  EcosystemModel: ResolverTypeWrapper<SchemaTypes.EcosystemModel>;
  Emoji: ResolverTypeWrapper<SchemaTypes.Scalars['Emoji']['output']>;
  ExploreSpacesInput: SchemaTypes.ExploreSpacesInput;
  ExternalConfig: SchemaTypes.ExternalConfig;
  FileStorageConfig: ResolverTypeWrapper<SchemaTypes.FileStorageConfig>;
  Float: ResolverTypeWrapper<SchemaTypes.Scalars['Float']['output']>;
  Form: ResolverTypeWrapper<SchemaTypes.Form>;
  FormQuestion: ResolverTypeWrapper<SchemaTypes.FormQuestion>;
  Forum: ResolverTypeWrapper<
    Omit<SchemaTypes.Forum, 'discussion' | 'discussions'> & {
      discussion?: SchemaTypes.Maybe<ResolversTypes['Discussion']>;
      discussions?: SchemaTypes.Maybe<Array<ResolversTypes['Discussion']>>;
    }
  >;
  ForumCreateDiscussionInput: SchemaTypes.ForumCreateDiscussionInput;
  ForumDiscussionCategory: SchemaTypes.ForumDiscussionCategory;
  ForumDiscussionPrivacy: SchemaTypes.ForumDiscussionPrivacy;
  Geo: ResolverTypeWrapper<SchemaTypes.Geo>;
  GrantAuthorizationCredentialInput: SchemaTypes.GrantAuthorizationCredentialInput;
  GrantOrganizationAuthorizationCredentialInput: SchemaTypes.GrantOrganizationAuthorizationCredentialInput;
  Groupable: ResolverTypeWrapper<
    ResolversInterfaceTypes<ResolversTypes>['Groupable']
  >;
  ISearchResults: ResolverTypeWrapper<
    Omit<
      SchemaTypes.ISearchResults,
      | 'calloutResults'
      | 'contributionResults'
      | 'contributorResults'
      | 'groupResults'
      | 'journeyResults'
    > & {
      calloutResults: Array<ResolversTypes['SearchResult']>;
      contributionResults: Array<ResolversTypes['SearchResult']>;
      contributorResults: Array<ResolversTypes['SearchResult']>;
      groupResults: Array<ResolversTypes['SearchResult']>;
      journeyResults: Array<ResolversTypes['SearchResult']>;
    }
  >;
  InAppNotification: ResolverTypeWrapper<
    ResolversInterfaceTypes<ResolversTypes>['InAppNotification']
  >;
  InAppNotificationCalloutPublished: ResolverTypeWrapper<
    Omit<
      SchemaTypes.InAppNotificationCalloutPublished,
      'callout' | 'receiver' | 'space' | 'triggeredBy'
    > & {
      callout?: SchemaTypes.Maybe<ResolversTypes['Callout']>;
      receiver: ResolversTypes['Contributor'];
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      triggeredBy?: SchemaTypes.Maybe<ResolversTypes['Contributor']>;
    }
  >;
  InAppNotificationCategory: SchemaTypes.InAppNotificationCategory;
  InAppNotificationCommunityNewMember: ResolverTypeWrapper<
    Omit<
      SchemaTypes.InAppNotificationCommunityNewMember,
      'actor' | 'receiver' | 'space' | 'triggeredBy'
    > & {
      actor?: SchemaTypes.Maybe<ResolversTypes['Contributor']>;
      receiver: ResolversTypes['Contributor'];
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      triggeredBy?: SchemaTypes.Maybe<ResolversTypes['Contributor']>;
    }
  >;
  InAppNotificationState: SchemaTypes.InAppNotificationState;
  InAppNotificationUserMentioned: ResolverTypeWrapper<
    Omit<
      SchemaTypes.InAppNotificationUserMentioned,
      'receiver' | 'triggeredBy'
    > & {
      receiver: ResolversTypes['Contributor'];
      triggeredBy?: SchemaTypes.Maybe<ResolversTypes['Contributor']>;
    }
  >;
  InnovationFlow: ResolverTypeWrapper<
    Omit<SchemaTypes.InnovationFlow, 'currentState' | 'profile' | 'states'> & {
      currentState: ResolversTypes['InnovationFlowState'];
      profile: ResolversTypes['Profile'];
      states: Array<ResolversTypes['InnovationFlowState']>;
    }
  >;
  InnovationFlowState: ResolverTypeWrapper<SchemaTypes.InnovationFlowState>;
  InnovationHub: ResolverTypeWrapper<
    Omit<
      SchemaTypes.InnovationHub,
      'account' | 'profile' | 'provider' | 'spaceListFilter'
    > & {
      account: ResolversTypes['Account'];
      profile: ResolversTypes['Profile'];
      provider: ResolversTypes['Contributor'];
      spaceListFilter?: SchemaTypes.Maybe<Array<ResolversTypes['Space']>>;
    }
  >;
  InnovationHubType: SchemaTypes.InnovationHubType;
  InnovationPack: ResolverTypeWrapper<
    Omit<
      SchemaTypes.InnovationPack,
      'profile' | 'provider' | 'templatesSet'
    > & {
      profile: ResolversTypes['Profile'];
      provider: ResolversTypes['Contributor'];
      templatesSet?: SchemaTypes.Maybe<ResolversTypes['TemplatesSet']>;
    }
  >;
  InnovationPacksInput: SchemaTypes.InnovationPacksInput;
  InnovationPacksOrderBy: SchemaTypes.InnovationPacksOrderBy;
  InputCreatorQueryResults: ResolverTypeWrapper<SchemaTypes.InputCreatorQueryResults>;
  Int: ResolverTypeWrapper<SchemaTypes.Scalars['Int']['output']>;
  Invitation: ResolverTypeWrapper<
    Omit<SchemaTypes.Invitation, 'contributor' | 'createdBy'> & {
      contributor: ResolversTypes['Contributor'];
      createdBy: ResolversTypes['User'];
    }
  >;
  InvitationEventInput: SchemaTypes.InvitationEventInput;
  InviteForEntryRoleOnRoleSetInput: SchemaTypes.InviteForEntryRoleOnRoleSetInput;
  InviteNewContributorForRoleOnRoleSetInput: SchemaTypes.InviteNewContributorForRoleOnRoleSetInput;
  JSON: ResolverTypeWrapper<SchemaTypes.Scalars['JSON']['output']>;
  JoinAsEntryRoleOnRoleSetInput: SchemaTypes.JoinAsEntryRoleOnRoleSetInput;
  LatestReleaseDiscussion: ResolverTypeWrapper<SchemaTypes.LatestReleaseDiscussion>;
  Library: ResolverTypeWrapper<
    Omit<
      SchemaTypes.Library,
      'innovationHubs' | 'innovationPacks' | 'templates' | 'virtualContributors'
    > & {
      innovationHubs: Array<ResolversTypes['InnovationHub']>;
      innovationPacks: Array<ResolversTypes['InnovationPack']>;
      templates: Array<ResolversTypes['TemplateResult']>;
      virtualContributors: Array<ResolversTypes['VirtualContributor']>;
    }
  >;
  LibraryTemplatesFilterInput: SchemaTypes.LibraryTemplatesFilterInput;
  License: ResolverTypeWrapper<SchemaTypes.License>;
  LicenseEntitlement: ResolverTypeWrapper<SchemaTypes.LicenseEntitlement>;
  LicenseEntitlementDataType: SchemaTypes.LicenseEntitlementDataType;
  LicenseEntitlementType: SchemaTypes.LicenseEntitlementType;
  LicensePlan: ResolverTypeWrapper<SchemaTypes.LicensePlan>;
  LicensePolicy: ResolverTypeWrapper<SchemaTypes.LicensePolicy>;
  LicenseType: SchemaTypes.LicenseType;
  Licensing: ResolverTypeWrapper<SchemaTypes.Licensing>;
  LicensingCredentialBasedCredentialType: SchemaTypes.LicensingCredentialBasedCredentialType;
  LicensingCredentialBasedPlanType: SchemaTypes.LicensingCredentialBasedPlanType;
  LicensingCredentialBasedPolicyCredentialRule: ResolverTypeWrapper<SchemaTypes.LicensingCredentialBasedPolicyCredentialRule>;
  LicensingGrantedEntitlement: ResolverTypeWrapper<SchemaTypes.LicensingGrantedEntitlement>;
  Lifecycle: ResolverTypeWrapper<SchemaTypes.Lifecycle>;
  LifecycleDefinition: ResolverTypeWrapper<
    SchemaTypes.Scalars['LifecycleDefinition']['output']
  >;
  Link: ResolverTypeWrapper<
    Omit<SchemaTypes.Link, 'profile'> & { profile: ResolversTypes['Profile'] }
  >;
  Location: ResolverTypeWrapper<SchemaTypes.Location>;
  LookupByNameQueryResults: ResolverTypeWrapper<
    Omit<
      SchemaTypes.LookupByNameQueryResults,
      'innovationPack' | 'template'
    > & {
      innovationPack?: SchemaTypes.Maybe<ResolversTypes['InnovationPack']>;
      template?: SchemaTypes.Maybe<ResolversTypes['Template']>;
    }
  >;
  LookupMyPrivilegesQueryResults: ResolverTypeWrapper<SchemaTypes.LookupMyPrivilegesQueryResults>;
  LookupQueryResults: ResolverTypeWrapper<
    Omit<
      SchemaTypes.LookupQueryResults,
      | 'account'
      | 'application'
      | 'calendar'
      | 'calendarEvent'
      | 'callout'
      | 'collaboration'
      | 'community'
      | 'communityGuidelines'
      | 'document'
      | 'innovationFlow'
      | 'innovationHub'
      | 'innovationPack'
      | 'invitation'
      | 'post'
      | 'profile'
      | 'roleSet'
      | 'room'
      | 'space'
      | 'storageBucket'
      | 'template'
      | 'templatesManager'
      | 'templatesSet'
      | 'user'
      | 'virtualContributor'
      | 'whiteboard'
    > & {
      account?: SchemaTypes.Maybe<ResolversTypes['Account']>;
      application?: SchemaTypes.Maybe<ResolversTypes['Application']>;
      calendar?: SchemaTypes.Maybe<ResolversTypes['Calendar']>;
      calendarEvent?: SchemaTypes.Maybe<ResolversTypes['CalendarEvent']>;
      callout?: SchemaTypes.Maybe<ResolversTypes['Callout']>;
      collaboration?: SchemaTypes.Maybe<ResolversTypes['Collaboration']>;
      community?: SchemaTypes.Maybe<ResolversTypes['Community']>;
      communityGuidelines?: SchemaTypes.Maybe<
        ResolversTypes['CommunityGuidelines']
      >;
      document?: SchemaTypes.Maybe<ResolversTypes['Document']>;
      innovationFlow?: SchemaTypes.Maybe<ResolversTypes['InnovationFlow']>;
      innovationHub?: SchemaTypes.Maybe<ResolversTypes['InnovationHub']>;
      innovationPack?: SchemaTypes.Maybe<ResolversTypes['InnovationPack']>;
      invitation?: SchemaTypes.Maybe<ResolversTypes['Invitation']>;
      post?: SchemaTypes.Maybe<ResolversTypes['Post']>;
      profile?: SchemaTypes.Maybe<ResolversTypes['Profile']>;
      roleSet?: SchemaTypes.Maybe<ResolversTypes['RoleSet']>;
      room?: SchemaTypes.Maybe<ResolversTypes['Room']>;
      space?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      storageBucket?: SchemaTypes.Maybe<ResolversTypes['StorageBucket']>;
      template?: SchemaTypes.Maybe<ResolversTypes['Template']>;
      templatesManager?: SchemaTypes.Maybe<ResolversTypes['TemplatesManager']>;
      templatesSet?: SchemaTypes.Maybe<ResolversTypes['TemplatesSet']>;
      user?: SchemaTypes.Maybe<ResolversTypes['User']>;
      virtualContributor?: SchemaTypes.Maybe<
        ResolversTypes['VirtualContributor']
      >;
      whiteboard?: SchemaTypes.Maybe<ResolversTypes['Whiteboard']>;
    }
  >;
  Markdown: ResolverTypeWrapper<SchemaTypes.Scalars['Markdown']['output']>;
  MeQueryResults: ResolverTypeWrapper<
    Omit<
      SchemaTypes.MeQueryResults,
      | 'communityApplications'
      | 'communityInvitations'
      | 'mySpaces'
      | 'spaceMembershipsFlat'
      | 'spaceMembershipsHierarchical'
      | 'user'
    > & {
      communityApplications: Array<
        ResolversTypes['CommunityApplicationResult']
      >;
      communityInvitations: Array<ResolversTypes['CommunityInvitationResult']>;
      mySpaces: Array<ResolversTypes['MySpaceResults']>;
      spaceMembershipsFlat: Array<ResolversTypes['CommunityMembershipResult']>;
      spaceMembershipsHierarchical: Array<
        ResolversTypes['CommunityMembershipResult']
      >;
      user?: SchemaTypes.Maybe<ResolversTypes['User']>;
    }
  >;
  Message: ResolverTypeWrapper<
    Omit<SchemaTypes.Message, 'reactions' | 'sender'> & {
      reactions: Array<ResolversTypes['Reaction']>;
      sender?: SchemaTypes.Maybe<ResolversTypes['Contributor']>;
    }
  >;
  MessageAnswerQuestion: ResolverTypeWrapper<SchemaTypes.MessageAnswerQuestion>;
  MessageID: ResolverTypeWrapper<SchemaTypes.Scalars['MessageID']['output']>;
  Metadata: ResolverTypeWrapper<SchemaTypes.Metadata>;
  MigrateEmbeddings: ResolverTypeWrapper<SchemaTypes.MigrateEmbeddings>;
  MimeType: SchemaTypes.MimeType;
  MoveCalloutContributionInput: SchemaTypes.MoveCalloutContributionInput;
  Mutation: ResolverTypeWrapper<{}>;
  MutationType: SchemaTypes.MutationType;
  MySpaceResults: ResolverTypeWrapper<
    Omit<SchemaTypes.MySpaceResults, 'latestActivity' | 'space'> & {
      latestActivity?: SchemaTypes.Maybe<ResolversTypes['ActivityLogEntry']>;
      space: ResolversTypes['Space'];
    }
  >;
  NVP: ResolverTypeWrapper<SchemaTypes.Nvp>;
  NameID: ResolverTypeWrapper<SchemaTypes.Scalars['NameID']['output']>;
  NotificationEventType: SchemaTypes.NotificationEventType;
  Organization: ResolverTypeWrapper<
    Omit<
      SchemaTypes.Organization,
      | 'account'
      | 'admins'
      | 'associates'
      | 'group'
      | 'groups'
      | 'owners'
      | 'profile'
    > & {
      account?: SchemaTypes.Maybe<ResolversTypes['Account']>;
      admins?: SchemaTypes.Maybe<Array<ResolversTypes['User']>>;
      associates?: SchemaTypes.Maybe<Array<ResolversTypes['User']>>;
      group?: SchemaTypes.Maybe<ResolversTypes['UserGroup']>;
      groups?: SchemaTypes.Maybe<Array<ResolversTypes['UserGroup']>>;
      owners?: SchemaTypes.Maybe<Array<ResolversTypes['User']>>;
      profile: ResolversTypes['Profile'];
    }
  >;
  OrganizationAuthorizationResetInput: SchemaTypes.OrganizationAuthorizationResetInput;
  OrganizationFilterInput: SchemaTypes.OrganizationFilterInput;
  RoleName: SchemaTypes.RoleName;
  OrganizationSettings: ResolverTypeWrapper<SchemaTypes.OrganizationSettings>;
  OrganizationSettingsMembership: ResolverTypeWrapper<SchemaTypes.OrganizationSettingsMembership>;
  OrganizationSettingsPrivacy: ResolverTypeWrapper<SchemaTypes.OrganizationSettingsPrivacy>;
  OrganizationVerification: ResolverTypeWrapper<SchemaTypes.OrganizationVerification>;
  OrganizationVerificationEnum: SchemaTypes.OrganizationVerificationEnum;
  OrganizationVerificationEventInput: SchemaTypes.OrganizationVerificationEventInput;
  OryConfig: ResolverTypeWrapper<SchemaTypes.OryConfig>;
  PageInfo: ResolverTypeWrapper<SchemaTypes.PageInfo>;
  PaginatedOrganization: ResolverTypeWrapper<
    Omit<SchemaTypes.PaginatedOrganization, 'organization' | 'pageInfo'> & {
      organization: Array<ResolversTypes['Organization']>;
      pageInfo: ResolversTypes['PageInfo'];
    }
  >;
  PaginatedSpaces: ResolverTypeWrapper<
    Omit<SchemaTypes.PaginatedSpaces, 'pageInfo' | 'spaces'> & {
      pageInfo: ResolversTypes['PageInfo'];
      spaces: Array<ResolversTypes['Space']>;
    }
  >;
  PaginatedUsers: ResolverTypeWrapper<
    Omit<SchemaTypes.PaginatedUsers, 'pageInfo' | 'users'> & {
      pageInfo: ResolversTypes['PageInfo'];
      users: Array<ResolversTypes['User']>;
    }
  >;
  Platform: ResolverTypeWrapper<
    Omit<
      SchemaTypes.Platform,
      | 'configuration'
      | 'forum'
      | 'innovationHub'
      | 'library'
      | 'platformInvitations'
      | 'templatesManager'
    > & {
      configuration: ResolversTypes['Config'];
      forum: ResolversTypes['Forum'];
      innovationHub?: SchemaTypes.Maybe<ResolversTypes['InnovationHub']>;
      library: ResolversTypes['Library'];
      platformInvitations: Array<ResolversTypes['PlatformInvitation']>;
      templatesManager?: SchemaTypes.Maybe<ResolversTypes['TemplatesManager']>;
    }
  >;
  PlatformFeatureFlag: ResolverTypeWrapper<SchemaTypes.PlatformFeatureFlag>;
  PlatformFeatureFlagName: SchemaTypes.PlatformFeatureFlagName;
  PlatformInvitation: ResolverTypeWrapper<
    Omit<SchemaTypes.PlatformInvitation, 'createdBy'> & {
      createdBy: ResolversTypes['User'];
    }
  >;
  PlatformLocations: ResolverTypeWrapper<SchemaTypes.PlatformLocations>;
  RoleName: SchemaTypes.RoleName;
  Post: ResolverTypeWrapper<
    Omit<SchemaTypes.Post, 'comments' | 'createdBy' | 'profile'> & {
      comments: ResolversTypes['Room'];
      createdBy?: SchemaTypes.Maybe<ResolversTypes['User']>;
      profile: ResolversTypes['Profile'];
    }
  >;
  Preference: ResolverTypeWrapper<SchemaTypes.Preference>;
  PreferenceDefinition: ResolverTypeWrapper<SchemaTypes.PreferenceDefinition>;
  PreferenceType: SchemaTypes.PreferenceType;
  PreferenceValueType: SchemaTypes.PreferenceValueType;
  Profile: ResolverTypeWrapper<
    Omit<SchemaTypes.Profile, 'location' | 'storageBucket'> & {
      location?: SchemaTypes.Maybe<ResolversTypes['Location']>;
      storageBucket: ResolversTypes['StorageBucket'];
    }
  >;
  ProfileCredentialVerified: ResolverTypeWrapper<SchemaTypes.ProfileCredentialVerified>;
  ProfileType: SchemaTypes.ProfileType;
  Query: ResolverTypeWrapper<{}>;
  Question: ResolverTypeWrapper<SchemaTypes.Question>;
  Reaction: ResolverTypeWrapper<
    Omit<SchemaTypes.Reaction, 'sender'> & {
      sender?: SchemaTypes.Maybe<ResolversTypes['User']>;
    }
  >;
  Reference: ResolverTypeWrapper<SchemaTypes.Reference>;
  RefreshVirtualContributorBodyOfKnowledgeInput: SchemaTypes.RefreshVirtualContributorBodyOfKnowledgeInput;
  RelayPaginatedSpace: ResolverTypeWrapper<
    Omit<
      SchemaTypes.RelayPaginatedSpace,
      | 'account'
      | 'collaboration'
      | 'community'
      | 'profile'
      | 'provider'
      | 'subspace'
      | 'subspaces'
      | 'templatesManager'
    > & {
      account: ResolversTypes['Account'];
      collaboration: ResolversTypes['Collaboration'];
      community: ResolversTypes['Community'];
      profile: ResolversTypes['Profile'];
      provider: ResolversTypes['Contributor'];
      subspace: ResolversTypes['Space'];
      subspaces: Array<ResolversTypes['Space']>;
      templatesManager?: SchemaTypes.Maybe<ResolversTypes['TemplatesManager']>;
    }
  >;
  RelayPaginatedSpaceEdge: ResolverTypeWrapper<
    Omit<SchemaTypes.RelayPaginatedSpaceEdge, 'node'> & {
      node: ResolversTypes['RelayPaginatedSpace'];
    }
  >;
  RelayPaginatedSpacePageInfo: ResolverTypeWrapper<SchemaTypes.RelayPaginatedSpacePageInfo>;
  RemoveCommunityGuidelinesContentInput: SchemaTypes.RemoveCommunityGuidelinesContentInput;
  RemoveRoleNameFromUserInput: SchemaTypes.RemoveRoleNameFromUserInput;
  RemoveRoleOnRoleSetFromUserInput: SchemaTypes.RemoveRoleOnRoleSetFromUserInput;
  RemoveRoleOnRoleSetFromOrganizationInput: SchemaTypes.RemoveRoleOnRoleSetFromOrganizationInput;
  RemoveRoleOnRoleSetFromUserInput: SchemaTypes.RemoveRoleOnRoleSetFromUserInput;
  RemoveRoleOnRoleSetFromVirtualContributorInput: SchemaTypes.RemoveRoleOnRoleSetFromVirtualContributorInput;
  RemoveUserGroupMemberInput: SchemaTypes.RemoveUserGroupMemberInput;
  RevokeAuthorizationCredentialInput: SchemaTypes.RevokeAuthorizationCredentialInput;
  RevokeLicensePlanFromAccount: SchemaTypes.RevokeLicensePlanFromAccount;
  RevokeLicensePlanFromSpace: SchemaTypes.RevokeLicensePlanFromSpace;
  RevokeOrganizationAuthorizationCredentialInput: SchemaTypes.RevokeOrganizationAuthorizationCredentialInput;
  Role: ResolverTypeWrapper<SchemaTypes.Role>;
  RoleSet: ResolverTypeWrapper<
    Omit<
      SchemaTypes.RoleSet,
      | 'applications'
      | 'availableUsersForLeadRole'
      | 'availableUsersForEntryRole'
      | 'invitations'
      | 'organizationsInRole'
      | 'platformInvitations'
      | 'usersInRole'
      | 'virtualContributorsInRole'
    > & {
      applications: Array<ResolversTypes['Application']>;
      availableUsersForLeadRole: ResolversTypes['PaginatedUsers'];
      availableUsersForEntryRole: ResolversTypes['PaginatedUsers'];
      invitations: Array<ResolversTypes['Invitation']>;
      organizationsInRole: Array<ResolversTypes['Organization']>;
      platformInvitations: Array<ResolversTypes['PlatformInvitation']>;
      usersInRole: Array<ResolversTypes['User']>;
      virtualContributorsInRole: Array<ResolversTypes['VirtualContributor']>;
    }
  >;
  RolesOrganizationInput: SchemaTypes.RolesOrganizationInput;
  RolesResult: ResolverTypeWrapper<SchemaTypes.RolesResult>;
  RolesResultCommunity: ResolverTypeWrapper<SchemaTypes.RolesResultCommunity>;
  RolesResultOrganization: ResolverTypeWrapper<SchemaTypes.RolesResultOrganization>;
  RolesResultSpace: ResolverTypeWrapper<SchemaTypes.RolesResultSpace>;
  RolesUserInput: SchemaTypes.RolesUserInput;
  RolesVirtualContributorInput: SchemaTypes.RolesVirtualContributorInput;
  Room: ResolverTypeWrapper<
    Omit<SchemaTypes.Room, 'messages' | 'vcInteractions'> & {
      messages: Array<ResolversTypes['Message']>;
      vcInteractions: Array<ResolversTypes['VcInteraction']>;
    }
  >;
  RoomAddReactionToMessageInput: SchemaTypes.RoomAddReactionToMessageInput;
  RoomEventSubscriptionResult: ResolverTypeWrapper<
    Omit<
      SchemaTypes.RoomEventSubscriptionResult,
      'message' | 'reaction' | 'room'
    > & {
      message?: SchemaTypes.Maybe<
        ResolversTypes['RoomMessageEventSubscriptionResult']
      >;
      reaction?: SchemaTypes.Maybe<
        ResolversTypes['RoomMessageReactionEventSubscriptionResult']
      >;
      room: ResolversTypes['Room'];
    }
  >;
  RoomMessageEventSubscriptionResult: ResolverTypeWrapper<
    Omit<SchemaTypes.RoomMessageEventSubscriptionResult, 'data'> & {
      data: ResolversTypes['Message'];
    }
  >;
  RoomMessageReactionEventSubscriptionResult: ResolverTypeWrapper<
    Omit<SchemaTypes.RoomMessageReactionEventSubscriptionResult, 'data'> & {
      data: ResolversTypes['Reaction'];
    }
  >;
  RoomRemoveMessageInput: SchemaTypes.RoomRemoveMessageInput;
  RoomRemoveReactionToMessageInput: SchemaTypes.RoomRemoveReactionToMessageInput;
  RoomSendMessageInput: SchemaTypes.RoomSendMessageInput;
  RoomSendMessageReplyInput: SchemaTypes.RoomSendMessageReplyInput;
  SearchInput: SchemaTypes.SearchInput;
  SearchResult: ResolverTypeWrapper<
    ResolversInterfaceTypes<ResolversTypes>['SearchResult']
  >;
  SearchResultCallout: ResolverTypeWrapper<
    Omit<SchemaTypes.SearchResultCallout, 'callout' | 'space'> & {
      callout: ResolversTypes['Callout'];
      space: ResolversTypes['Space'];
    }
  >;
  SearchResultOrganization: ResolverTypeWrapper<
    Omit<SchemaTypes.SearchResultOrganization, 'organization'> & {
      organization: ResolversTypes['Organization'];
    }
  >;
  SearchResultPost: ResolverTypeWrapper<
    Omit<SchemaTypes.SearchResultPost, 'callout' | 'post' | 'space'> & {
      callout: ResolversTypes['Callout'];
      post: ResolversTypes['Post'];
      space: ResolversTypes['Space'];
    }
  >;
  SearchResultSpace: ResolverTypeWrapper<
    Omit<SchemaTypes.SearchResultSpace, 'parentSpace' | 'space'> & {
      parentSpace?: SchemaTypes.Maybe<ResolversTypes['Space']>;
      space: ResolversTypes['Space'];
    }
  >;
  SearchResultType: SchemaTypes.SearchResultType;
  SearchResultUser: ResolverTypeWrapper<
    Omit<SchemaTypes.SearchResultUser, 'user'> & {
      user: ResolversTypes['User'];
    }
  >;
  SearchResultUserGroup: ResolverTypeWrapper<
    Omit<SchemaTypes.SearchResultUserGroup, 'userGroup'> & {
      userGroup: ResolversTypes['UserGroup'];
    }
  >;
  SearchVisibility: SchemaTypes.SearchVisibility;
  Sentry: ResolverTypeWrapper<SchemaTypes.Sentry>;
  ServiceMetadata: ResolverTypeWrapper<SchemaTypes.ServiceMetadata>;
  Space: ResolverTypeWrapper<
    Omit<
      SchemaTypes.Space,
      | 'account'
      | 'collaboration'
      | 'community'
      | 'profile'
      | 'provider'
      | 'subspace'
      | 'subspaces'
      | 'templatesManager'
    > & {
      account: ResolversTypes['Account'];
      collaboration: ResolversTypes['Collaboration'];
      community: ResolversTypes['Community'];
      profile: ResolversTypes['Profile'];
      provider: ResolversTypes['Contributor'];
      subspace: ResolversTypes['Space'];
      subspaces: Array<ResolversTypes['Space']>;
      templatesManager?: SchemaTypes.Maybe<ResolversTypes['TemplatesManager']>;
    }
  >;
  SpaceFilterInput: SchemaTypes.SpaceFilterInput;
  SpaceLevel: SchemaTypes.SpaceLevel;
  SpacePendingMembershipInfo: ResolverTypeWrapper<
    Omit<
      SchemaTypes.SpacePendingMembershipInfo,
      'communityGuidelines' | 'profile'
    > & {
      communityGuidelines: ResolversTypes['CommunityGuidelines'];
      profile: ResolversTypes['Profile'];
    }
  >;
  SpacePrivacyMode: SchemaTypes.SpacePrivacyMode;
  SpaceSettings: ResolverTypeWrapper<SchemaTypes.SpaceSettings>;
  SpaceSettingsCollaboration: ResolverTypeWrapper<SchemaTypes.SpaceSettingsCollaboration>;
  SpaceSettingsMembership: ResolverTypeWrapper<SchemaTypes.SpaceSettingsMembership>;
  SpaceSettingsPrivacy: ResolverTypeWrapper<SchemaTypes.SpaceSettingsPrivacy>;
  SpaceSubscription: ResolverTypeWrapper<SchemaTypes.SpaceSubscription>;
  SpaceType: SchemaTypes.SpaceType;
  SpaceVisibility: SchemaTypes.SpaceVisibility;
  StorageAggregator: ResolverTypeWrapper<
    Omit<
      SchemaTypes.StorageAggregator,
      'directStorageBucket' | 'storageBuckets'
    > & {
      directStorageBucket: ResolversTypes['StorageBucket'];
      storageBuckets: Array<ResolversTypes['StorageBucket']>;
    }
  >;
  StorageAggregatorParent: ResolverTypeWrapper<SchemaTypes.StorageAggregatorParent>;
  StorageAggregatorType: SchemaTypes.StorageAggregatorType;
  StorageBucket: ResolverTypeWrapper<
    Omit<SchemaTypes.StorageBucket, 'document' | 'documents'> & {
      document?: SchemaTypes.Maybe<ResolversTypes['Document']>;
      documents: Array<ResolversTypes['Document']>;
    }
  >;
  StorageBucketParent: ResolverTypeWrapper<SchemaTypes.StorageBucketParent>;
  StorageBucketUploadFileInput: SchemaTypes.StorageBucketUploadFileInput;
  StorageBucketUploadFileOnLinkInput: SchemaTypes.StorageBucketUploadFileOnLinkInput;
  StorageBucketUploadFileOnReferenceInput: SchemaTypes.StorageBucketUploadFileOnReferenceInput;
  StorageConfig: ResolverTypeWrapper<SchemaTypes.StorageConfig>;
  String: ResolverTypeWrapper<SchemaTypes.Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<{}>;
  SubspaceCreated: ResolverTypeWrapper<
    Omit<SchemaTypes.SubspaceCreated, 'subspace'> & {
      subspace: ResolversTypes['Space'];
    }
  >;
  Tagset: ResolverTypeWrapper<SchemaTypes.Tagset>;
  TagsetArgs: SchemaTypes.TagsetArgs;
  TagsetReservedName: SchemaTypes.TagsetReservedName;
  TagsetTemplate: ResolverTypeWrapper<SchemaTypes.TagsetTemplate>;
  TagsetType: SchemaTypes.TagsetType;
  Task: ResolverTypeWrapper<SchemaTypes.Task>;
  TaskStatus: SchemaTypes.TaskStatus;
  Template: ResolverTypeWrapper<
    Omit<
      SchemaTypes.Template,
      | 'callout'
      | 'collaboration'
      | 'communityGuidelines'
      | 'profile'
      | 'whiteboard'
    > & {
      callout?: SchemaTypes.Maybe<ResolversTypes['Callout']>;
      collaboration?: SchemaTypes.Maybe<ResolversTypes['Collaboration']>;
      communityGuidelines?: SchemaTypes.Maybe<
        ResolversTypes['CommunityGuidelines']
      >;
      profile: ResolversTypes['Profile'];
      whiteboard?: SchemaTypes.Maybe<ResolversTypes['Whiteboard']>;
    }
  >;
  TemplateDefault: ResolverTypeWrapper<
    Omit<SchemaTypes.TemplateDefault, 'template'> & {
      template?: SchemaTypes.Maybe<ResolversTypes['Template']>;
    }
  >;
  TemplateDefaultType: SchemaTypes.TemplateDefaultType;
  TemplateResult: ResolverTypeWrapper<
    Omit<SchemaTypes.TemplateResult, 'innovationPack' | 'template'> & {
      innovationPack: ResolversTypes['InnovationPack'];
      template: ResolversTypes['Template'];
    }
  >;
  TemplateType: SchemaTypes.TemplateType;
  TemplatesManager: ResolverTypeWrapper<
    Omit<SchemaTypes.TemplatesManager, 'templateDefaults' | 'templatesSet'> & {
      templateDefaults: Array<ResolversTypes['TemplateDefault']>;
      templatesSet?: SchemaTypes.Maybe<ResolversTypes['TemplatesSet']>;
    }
  >;
  TemplatesSet: ResolverTypeWrapper<
    Omit<
      SchemaTypes.TemplatesSet,
      | 'calloutTemplates'
      | 'collaborationTemplates'
      | 'communityGuidelinesTemplates'
      | 'postTemplates'
      | 'templates'
      | 'whiteboardTemplates'
    > & {
      calloutTemplates: Array<ResolversTypes['Template']>;
      collaborationTemplates: Array<ResolversTypes['Template']>;
      communityGuidelinesTemplates: Array<ResolversTypes['Template']>;
      postTemplates: Array<ResolversTypes['Template']>;
      templates: Array<ResolversTypes['Template']>;
      whiteboardTemplates: Array<ResolversTypes['Template']>;
    }
  >;
  Timeline: ResolverTypeWrapper<
    Omit<SchemaTypes.Timeline, 'calendar'> & {
      calendar: ResolversTypes['Calendar'];
    }
  >;
  TransferAccountInnovationHubInput: SchemaTypes.TransferAccountInnovationHubInput;
  TransferAccountInnovationPackInput: SchemaTypes.TransferAccountInnovationPackInput;
  TransferAccountSpaceInput: SchemaTypes.TransferAccountSpaceInput;
  TransferAccountVirtualContributorInput: SchemaTypes.TransferAccountVirtualContributorInput;
  UUID: ResolverTypeWrapper<SchemaTypes.Scalars['UUID']['output']>;
  UUID_NAMEID: ResolverTypeWrapper<
    SchemaTypes.Scalars['UUID_NAMEID']['output']
  >;
  UUID_NAMEID_EMAIL: ResolverTypeWrapper<
    SchemaTypes.Scalars['UUID_NAMEID_EMAIL']['output']
  >;
  UpdateActorInput: SchemaTypes.UpdateActorInput;
  UpdateAiPersonaInput: SchemaTypes.UpdateAiPersonaInput;
  UpdateAiPersonaServiceInput: SchemaTypes.UpdateAiPersonaServiceInput;
  UpdateApplicationFormOnRoleSetInput: SchemaTypes.UpdateApplicationFormOnRoleSetInput;
  UpdateCalendarEventInput: SchemaTypes.UpdateCalendarEventInput;
  UpdateCalloutContributionDefaultsInput: SchemaTypes.UpdateCalloutContributionDefaultsInput;
  UpdateCalloutContributionPolicyInput: SchemaTypes.UpdateCalloutContributionPolicyInput;
  UpdateCalloutEntityInput: SchemaTypes.UpdateCalloutEntityInput;
  UpdateCalloutFramingInput: SchemaTypes.UpdateCalloutFramingInput;
  UpdateCalloutPublishInfoInput: SchemaTypes.UpdateCalloutPublishInfoInput;
  UpdateCalloutVisibilityInput: SchemaTypes.UpdateCalloutVisibilityInput;
  UpdateCollaborationCalloutsSortOrderInput: SchemaTypes.UpdateCollaborationCalloutsSortOrderInput;
  UpdateCollaborationFromTemplateInput: SchemaTypes.UpdateCollaborationFromTemplateInput;
  UpdateCommunityGuidelinesEntityInput: SchemaTypes.UpdateCommunityGuidelinesEntityInput;
  UpdateContextInput: SchemaTypes.UpdateContextInput;
  UpdateContributionCalloutsSortOrderInput: SchemaTypes.UpdateContributionCalloutsSortOrderInput;
  UpdateDiscussionInput: SchemaTypes.UpdateDiscussionInput;
  UpdateDocumentInput: SchemaTypes.UpdateDocumentInput;
  UpdateEcosystemModelInput: SchemaTypes.UpdateEcosystemModelInput;
  UpdateFormInput: SchemaTypes.UpdateFormInput;
  UpdateFormQuestionInput: SchemaTypes.UpdateFormQuestionInput;
  UpdateInnovationFlowEntityInput: SchemaTypes.UpdateInnovationFlowEntityInput;
  UpdateInnovationFlowInput: SchemaTypes.UpdateInnovationFlowInput;
  UpdateInnovationFlowSelectedStateInput: SchemaTypes.UpdateInnovationFlowSelectedStateInput;
  UpdateInnovationFlowSingleStateInput: SchemaTypes.UpdateInnovationFlowSingleStateInput;
  UpdateInnovationFlowStateInput: SchemaTypes.UpdateInnovationFlowStateInput;
  UpdateInnovationHubInput: SchemaTypes.UpdateInnovationHubInput;
  UpdateInnovationPackInput: SchemaTypes.UpdateInnovationPackInput;
  UpdateLicensePlanInput: SchemaTypes.UpdateLicensePlanInput;
  UpdateLinkInput: SchemaTypes.UpdateLinkInput;
  UpdateLocationInput: SchemaTypes.UpdateLocationInput;
  UpdateNotificationStateInput: SchemaTypes.UpdateNotificationStateInput;
  UpdateOrganizationInput: SchemaTypes.UpdateOrganizationInput;
  UpdateOrganizationPlatformSettingsInput: SchemaTypes.UpdateOrganizationPlatformSettingsInput;
  UpdateOrganizationSettingsEntityInput: SchemaTypes.UpdateOrganizationSettingsEntityInput;
  UpdateOrganizationSettingsInput: SchemaTypes.UpdateOrganizationSettingsInput;
  UpdateOrganizationSettingsMembershipInput: SchemaTypes.UpdateOrganizationSettingsMembershipInput;
  UpdateOrganizationSettingsPrivacyInput: SchemaTypes.UpdateOrganizationSettingsPrivacyInput;
  UpdatePostInput: SchemaTypes.UpdatePostInput;
  UpdateProfileDirectInput: SchemaTypes.UpdateProfileDirectInput;
  UpdateProfileInput: SchemaTypes.UpdateProfileInput;
  UpdateReferenceInput: SchemaTypes.UpdateReferenceInput;
  UpdateSpaceInput: SchemaTypes.UpdateSpaceInput;
  UpdateSpacePlatformSettingsInput: SchemaTypes.UpdateSpacePlatformSettingsInput;
  UpdateSpaceSettingsCollaborationInput: SchemaTypes.UpdateSpaceSettingsCollaborationInput;
  UpdateSpaceSettingsEntityInput: SchemaTypes.UpdateSpaceSettingsEntityInput;
  UpdateSpaceSettingsInput: SchemaTypes.UpdateSpaceSettingsInput;
  UpdateSpaceSettingsMembershipInput: SchemaTypes.UpdateSpaceSettingsMembershipInput;
  UpdateSpaceSettingsPrivacyInput: SchemaTypes.UpdateSpaceSettingsPrivacyInput;
  UpdateTagsetInput: SchemaTypes.UpdateTagsetInput;
  UpdateTemplateDefaultTemplateInput: SchemaTypes.UpdateTemplateDefaultTemplateInput;
  UpdateTemplateFromCollaborationInput: SchemaTypes.UpdateTemplateFromCollaborationInput;
  UpdateTemplateInput: SchemaTypes.UpdateTemplateInput;
  UpdateUserGroupInput: SchemaTypes.UpdateUserGroupInput;
  UpdateUserInput: SchemaTypes.UpdateUserInput;
  UpdateUserPlatformSettingsInput: SchemaTypes.UpdateUserPlatformSettingsInput;
  UpdateUserPreferenceInput: SchemaTypes.UpdateUserPreferenceInput;
  UpdateUserSettingsCommunicationInput: SchemaTypes.UpdateUserSettingsCommunicationInput;
  UpdateUserSettingsEntityInput: SchemaTypes.UpdateUserSettingsEntityInput;
  UpdateUserSettingsInput: SchemaTypes.UpdateUserSettingsInput;
  UpdateUserSettingsPrivacyInput: SchemaTypes.UpdateUserSettingsPrivacyInput;
  UpdateVirtualContributorInput: SchemaTypes.UpdateVirtualContributorInput;
  UpdateVisualInput: SchemaTypes.UpdateVisualInput;
  UpdateWhiteboardEntityInput: SchemaTypes.UpdateWhiteboardEntityInput;
  Upload: ResolverTypeWrapper<SchemaTypes.Scalars['Upload']['output']>;
  User: ResolverTypeWrapper<
    Omit<
      SchemaTypes.User,
      'account' | 'communityRooms' | 'directRooms' | 'guidanceRoom' | 'profile'
    > & {
      account?: SchemaTypes.Maybe<ResolversTypes['Account']>;
      communityRooms?: SchemaTypes.Maybe<
        Array<ResolversTypes['CommunicationRoom']>
      >;
      directRooms?: SchemaTypes.Maybe<Array<ResolversTypes['DirectRoom']>>;
      guidanceRoom?: SchemaTypes.Maybe<ResolversTypes['Room']>;
      profile: ResolversTypes['Profile'];
    }
  >;
  UserAuthenticationResult: ResolverTypeWrapper<SchemaTypes.UserAuthenticationResult>;
  UserAuthorizationPrivilegesInput: SchemaTypes.UserAuthorizationPrivilegesInput;
  UserAuthorizationResetInput: SchemaTypes.UserAuthorizationResetInput;
  UserFilterInput: SchemaTypes.UserFilterInput;
  UserGroup: ResolverTypeWrapper<
    Omit<SchemaTypes.UserGroup, 'members' | 'parent' | 'profile'> & {
      members?: SchemaTypes.Maybe<Array<ResolversTypes['User']>>;
      parent?: SchemaTypes.Maybe<ResolversTypes['Groupable']>;
      profile?: SchemaTypes.Maybe<ResolversTypes['Profile']>;
    }
  >;
  UserSendMessageInput: SchemaTypes.UserSendMessageInput;
  UserSettings: ResolverTypeWrapper<SchemaTypes.UserSettings>;
  UserSettingsCommunication: ResolverTypeWrapper<SchemaTypes.UserSettingsCommunication>;
  UserSettingsPrivacy: ResolverTypeWrapper<SchemaTypes.UserSettingsPrivacy>;
  UsersWithAuthorizationCredentialInput: SchemaTypes.UsersWithAuthorizationCredentialInput;
  VcInteraction: ResolverTypeWrapper<
    Omit<SchemaTypes.VcInteraction, 'room'> & { room: ResolversTypes['Room'] }
  >;
  VerifiedCredential: ResolverTypeWrapper<SchemaTypes.VerifiedCredential>;
  VerifiedCredentialClaim: ResolverTypeWrapper<SchemaTypes.VerifiedCredentialClaim>;
  VirtualContributor: ResolverTypeWrapper<
    Omit<SchemaTypes.VirtualContributor, 'account' | 'profile' | 'provider'> & {
      account?: SchemaTypes.Maybe<ResolversTypes['Account']>;
      profile: ResolversTypes['Profile'];
      provider: ResolversTypes['Contributor'];
    }
  >;
  VirtualContributorStatus: SchemaTypes.VirtualContributorStatus;
  VirtualContributorUpdatedSubscriptionResult: ResolverTypeWrapper<
    Omit<
      SchemaTypes.VirtualContributorUpdatedSubscriptionResult,
      'virtualContributor'
    > & { virtualContributor: ResolversTypes['VirtualContributor'] }
  >;
  Visual: ResolverTypeWrapper<SchemaTypes.Visual>;
  VisualConstraints: ResolverTypeWrapper<SchemaTypes.VisualConstraints>;
  VisualType: SchemaTypes.VisualType;
  VisualUploadImageInput: SchemaTypes.VisualUploadImageInput;
  Whiteboard: ResolverTypeWrapper<
    Omit<SchemaTypes.Whiteboard, 'createdBy' | 'profile'> & {
      createdBy?: SchemaTypes.Maybe<ResolversTypes['User']>;
      profile: ResolversTypes['Profile'];
    }
  >;
  WhiteboardContent: ResolverTypeWrapper<
    SchemaTypes.Scalars['WhiteboardContent']['output']
  >;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  APM: SchemaTypes.Apm;
  Account: Omit<
    SchemaTypes.Account,
    | 'host'
    | 'innovationHubs'
    | 'innovationPacks'
    | 'spaces'
    | 'virtualContributors'
  > & {
    host?: SchemaTypes.Maybe<ResolversParentTypes['Contributor']>;
    innovationHubs: Array<ResolversParentTypes['InnovationHub']>;
    innovationPacks: Array<ResolversParentTypes['InnovationPack']>;
    spaces: Array<ResolversParentTypes['Space']>;
    virtualContributors: Array<ResolversParentTypes['VirtualContributor']>;
  };
  AccountAuthorizationResetInput: SchemaTypes.AccountAuthorizationResetInput;
  AccountLicenseResetInput: SchemaTypes.AccountLicenseResetInput;
  AccountSubscription: SchemaTypes.AccountSubscription;
  ActivityCreatedSubscriptionInput: SchemaTypes.ActivityCreatedSubscriptionInput;
  ActivityCreatedSubscriptionResult: Omit<
    SchemaTypes.ActivityCreatedSubscriptionResult,
    'activity'
  > & { activity: ResolversParentTypes['ActivityLogEntry'] };
  ActivityFeed: Omit<SchemaTypes.ActivityFeed, 'activityFeed' | 'pageInfo'> & {
    activityFeed: Array<ResolversParentTypes['ActivityLogEntry']>;
    pageInfo: ResolversParentTypes['PageInfo'];
  };
  ActivityFeedGroupedQueryArgs: SchemaTypes.ActivityFeedGroupedQueryArgs;
  ActivityFeedQueryArgs: SchemaTypes.ActivityFeedQueryArgs;
  ActivityLogEntry: ResolversInterfaceTypes<ResolversParentTypes>['ActivityLogEntry'];
  ActivityLogEntryCalendarEventCreated: Omit<
    SchemaTypes.ActivityLogEntryCalendarEventCreated,
    'calendar' | 'calendarEvent' | 'space' | 'triggeredBy'
  > & {
    calendar: ResolversParentTypes['Calendar'];
    calendarEvent: ResolversParentTypes['CalendarEvent'];
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    triggeredBy: ResolversParentTypes['User'];
  };
  ActivityLogEntryCalloutDiscussionComment: Omit<
    SchemaTypes.ActivityLogEntryCalloutDiscussionComment,
    'callout' | 'space' | 'triggeredBy'
  > & {
    callout: ResolversParentTypes['Callout'];
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    triggeredBy: ResolversParentTypes['User'];
  };
  ActivityLogEntryCalloutLinkCreated: Omit<
    SchemaTypes.ActivityLogEntryCalloutLinkCreated,
    'callout' | 'link' | 'space' | 'triggeredBy'
  > & {
    callout: ResolversParentTypes['Callout'];
    link: ResolversParentTypes['Link'];
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    triggeredBy: ResolversParentTypes['User'];
  };
  ActivityLogEntryCalloutPostComment: Omit<
    SchemaTypes.ActivityLogEntryCalloutPostComment,
    'callout' | 'post' | 'space' | 'triggeredBy'
  > & {
    callout: ResolversParentTypes['Callout'];
    post: ResolversParentTypes['Post'];
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    triggeredBy: ResolversParentTypes['User'];
  };
  ActivityLogEntryCalloutPostCreated: Omit<
    SchemaTypes.ActivityLogEntryCalloutPostCreated,
    'callout' | 'post' | 'space' | 'triggeredBy'
  > & {
    callout: ResolversParentTypes['Callout'];
    post: ResolversParentTypes['Post'];
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    triggeredBy: ResolversParentTypes['User'];
  };
  ActivityLogEntryCalloutPublished: Omit<
    SchemaTypes.ActivityLogEntryCalloutPublished,
    'callout' | 'space' | 'triggeredBy'
  > & {
    callout: ResolversParentTypes['Callout'];
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    triggeredBy: ResolversParentTypes['User'];
  };
  ActivityLogEntryCalloutWhiteboardContentModified: Omit<
    SchemaTypes.ActivityLogEntryCalloutWhiteboardContentModified,
    'callout' | 'space' | 'triggeredBy' | 'whiteboard'
  > & {
    callout: ResolversParentTypes['Callout'];
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    triggeredBy: ResolversParentTypes['User'];
    whiteboard: ResolversParentTypes['Whiteboard'];
  };
  ActivityLogEntryCalloutWhiteboardCreated: Omit<
    SchemaTypes.ActivityLogEntryCalloutWhiteboardCreated,
    'callout' | 'space' | 'triggeredBy' | 'whiteboard'
  > & {
    callout: ResolversParentTypes['Callout'];
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    triggeredBy: ResolversParentTypes['User'];
    whiteboard: ResolversParentTypes['Whiteboard'];
  };
  ActivityLogEntryChallengeCreated: Omit<
    SchemaTypes.ActivityLogEntryChallengeCreated,
    'space' | 'subspace' | 'triggeredBy'
  > & {
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    subspace: ResolversParentTypes['Space'];
    triggeredBy: ResolversParentTypes['User'];
  };
  ActivityLogEntryMemberJoined: Omit<
    SchemaTypes.ActivityLogEntryMemberJoined,
    'community' | 'contributor' | 'space' | 'triggeredBy'
  > & {
    community: ResolversParentTypes['Community'];
    contributor: ResolversParentTypes['Contributor'];
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    triggeredBy: ResolversParentTypes['User'];
  };
  ActivityLogEntryOpportunityCreated: Omit<
    SchemaTypes.ActivityLogEntryOpportunityCreated,
    'space' | 'subsubspace' | 'triggeredBy'
  > & {
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    subsubspace: ResolversParentTypes['Space'];
    triggeredBy: ResolversParentTypes['User'];
  };
  ActivityLogEntryUpdateSent: Omit<
    SchemaTypes.ActivityLogEntryUpdateSent,
    'space' | 'triggeredBy' | 'updates'
  > & {
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    triggeredBy: ResolversParentTypes['User'];
    updates: ResolversParentTypes['Room'];
  };
  ActivityLogInput: SchemaTypes.ActivityLogInput;
  Actor: SchemaTypes.Actor;
  ActorGroup: SchemaTypes.ActorGroup;
  Agent: SchemaTypes.Agent;
  AgentBeginVerifiedCredentialOfferOutput: SchemaTypes.AgentBeginVerifiedCredentialOfferOutput;
  AgentBeginVerifiedCredentialRequestOutput: SchemaTypes.AgentBeginVerifiedCredentialRequestOutput;
  AiPersona: SchemaTypes.AiPersona;
  AiPersonaService: SchemaTypes.AiPersonaService;
  AiPersonaServiceIngestInput: SchemaTypes.AiPersonaServiceIngestInput;
  AiServer: SchemaTypes.AiServer;
  Application: Omit<SchemaTypes.Application, 'contributor'> & {
    contributor: ResolversParentTypes['Contributor'];
  };
  ApplicationEventInput: SchemaTypes.ApplicationEventInput;
  ApplyForEntryRoleOnRoleSetInput: SchemaTypes.ApplyForEntryRoleOnRoleSetInput;
  AssignLicensePlanToAccount: SchemaTypes.AssignLicensePlanToAccount;
  AssignLicensePlanToSpace: SchemaTypes.AssignLicensePlanToSpace;
  AssignRoleOnRoleSetToUserInput: SchemaTypes.AssignRoleOnRoleSetToUserInput;
  AssignRoleOnRoleSetToUserInput: SchemaTypes.AssignRoleOnRoleSetToUserInput;
  AssignRoleOnRoleSetToOrganizationInput: SchemaTypes.AssignRoleOnRoleSetToOrganizationInput;
  AssignRoleOnRoleSetToUserInput: SchemaTypes.AssignRoleOnRoleSetToUserInput;
  AssignRoleOnRoleSetToVirtualContributorInput: SchemaTypes.AssignRoleOnRoleSetToVirtualContributorInput;
  AssignUserGroupMemberInput: SchemaTypes.AssignUserGroupMemberInput;
  AuthenticationConfig: Omit<SchemaTypes.AuthenticationConfig, 'providers'> & {
    providers: Array<ResolversParentTypes['AuthenticationProviderConfig']>;
  };
  AuthenticationProviderConfig: Omit<
    SchemaTypes.AuthenticationProviderConfig,
    'config'
  > & { config: ResolversParentTypes['AuthenticationProviderConfigUnion'] };
  AuthenticationProviderConfigUnion: ResolversUnionTypes<ResolversParentTypes>['AuthenticationProviderConfigUnion'];
  Authorization: SchemaTypes.Authorization;
  AuthorizationPolicyRuleCredential: SchemaTypes.AuthorizationPolicyRuleCredential;
  AuthorizationPolicyRulePrivilege: SchemaTypes.AuthorizationPolicyRulePrivilege;
  AuthorizationPolicyRuleVerifiedCredential: SchemaTypes.AuthorizationPolicyRuleVerifiedCredential;
  Boolean: SchemaTypes.Scalars['Boolean']['output'];
  Calendar: Omit<SchemaTypes.Calendar, 'event' | 'events'> & {
    event?: SchemaTypes.Maybe<ResolversParentTypes['CalendarEvent']>;
    events: Array<ResolversParentTypes['CalendarEvent']>;
  };
  CalendarEvent: Omit<
    SchemaTypes.CalendarEvent,
    'comments' | 'createdBy' | 'profile' | 'subspace'
  > & {
    comments: ResolversParentTypes['Room'];
    createdBy?: SchemaTypes.Maybe<ResolversParentTypes['User']>;
    profile: ResolversParentTypes['Profile'];
    subspace?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
  };
  Callout: Omit<
    SchemaTypes.Callout,
    | 'comments'
    | 'contributions'
    | 'createdBy'
    | 'framing'
    | 'posts'
    | 'publishedBy'
  > & {
    comments?: SchemaTypes.Maybe<ResolversParentTypes['Room']>;
    contributions: Array<ResolversParentTypes['CalloutContribution']>;
    createdBy?: SchemaTypes.Maybe<ResolversParentTypes['User']>;
    framing: ResolversParentTypes['CalloutFraming'];
    posts?: SchemaTypes.Maybe<Array<ResolversParentTypes['Post']>>;
    publishedBy?: SchemaTypes.Maybe<ResolversParentTypes['User']>;
  };
  CalloutContribution: Omit<
    SchemaTypes.CalloutContribution,
    'createdBy' | 'link' | 'post' | 'whiteboard'
  > & {
    createdBy?: SchemaTypes.Maybe<ResolversParentTypes['User']>;
    link?: SchemaTypes.Maybe<ResolversParentTypes['Link']>;
    post?: SchemaTypes.Maybe<ResolversParentTypes['Post']>;
    whiteboard?: SchemaTypes.Maybe<ResolversParentTypes['Whiteboard']>;
  };
  CalloutContributionDefaults: SchemaTypes.CalloutContributionDefaults;
  CalloutContributionFilterArgs: SchemaTypes.CalloutContributionFilterArgs;
  CalloutContributionPolicy: SchemaTypes.CalloutContributionPolicy;
  CalloutFraming: Omit<SchemaTypes.CalloutFraming, 'profile' | 'whiteboard'> & {
    profile: ResolversParentTypes['Profile'];
    whiteboard?: SchemaTypes.Maybe<ResolversParentTypes['Whiteboard']>;
  };
  CalloutGroup: SchemaTypes.CalloutGroup;
  CalloutPostCreated: Omit<SchemaTypes.CalloutPostCreated, 'post'> & {
    post: ResolversParentTypes['Post'];
  };
  ChatGuidanceAnswerRelevanceInput: SchemaTypes.ChatGuidanceAnswerRelevanceInput;
  ChatGuidanceInput: SchemaTypes.ChatGuidanceInput;
  Collaboration: Omit<
    SchemaTypes.Collaboration,
    'callouts' | 'innovationFlow' | 'timeline'
  > & {
    callouts: Array<ResolversParentTypes['Callout']>;
    innovationFlow: ResolversParentTypes['InnovationFlow'];
    timeline: ResolversParentTypes['Timeline'];
  };
  Communication: Omit<SchemaTypes.Communication, 'updates'> & {
    updates: ResolversParentTypes['Room'];
  };
  CommunicationAdminEnsureAccessInput: SchemaTypes.CommunicationAdminEnsureAccessInput;
  CommunicationAdminMembershipInput: SchemaTypes.CommunicationAdminMembershipInput;
  CommunicationAdminMembershipResult: SchemaTypes.CommunicationAdminMembershipResult;
  CommunicationAdminOrphanedUsageResult: SchemaTypes.CommunicationAdminOrphanedUsageResult;
  CommunicationAdminRemoveOrphanedRoomInput: SchemaTypes.CommunicationAdminRemoveOrphanedRoomInput;
  CommunicationAdminRoomMembershipResult: SchemaTypes.CommunicationAdminRoomMembershipResult;
  CommunicationAdminRoomResult: SchemaTypes.CommunicationAdminRoomResult;
  CommunicationAdminUpdateRoomStateInput: SchemaTypes.CommunicationAdminUpdateRoomStateInput;
  CommunicationRoom: Omit<SchemaTypes.CommunicationRoom, 'messages'> & {
    messages: Array<ResolversParentTypes['Message']>;
  };
  CommunicationSendMessageToCommunityLeadsInput: SchemaTypes.CommunicationSendMessageToCommunityLeadsInput;
  CommunicationSendMessageToOrganizationInput: SchemaTypes.CommunicationSendMessageToOrganizationInput;
  CommunicationSendMessageToUserInput: SchemaTypes.CommunicationSendMessageToUserInput;
  Community: Omit<
    SchemaTypes.Community,
    'communication' | 'group' | 'groups' | 'guidelines' | 'roleSet'
  > & {
    communication: ResolversParentTypes['Communication'];
    group: ResolversParentTypes['UserGroup'];
    groups: Array<ResolversParentTypes['UserGroup']>;
    guidelines: ResolversParentTypes['CommunityGuidelines'];
    roleSet: ResolversParentTypes['RoleSet'];
  };
  CommunityApplicationForRoleResult: SchemaTypes.CommunityApplicationForRoleResult;
  CommunityApplicationResult: Omit<
    SchemaTypes.CommunityApplicationResult,
    'application' | 'spacePendingMembershipInfo'
  > & {
    application: ResolversParentTypes['Application'];
    spacePendingMembershipInfo: ResolversParentTypes['SpacePendingMembershipInfo'];
  };
  CommunityGuidelines: Omit<SchemaTypes.CommunityGuidelines, 'profile'> & {
    profile: ResolversParentTypes['Profile'];
  };
  CommunityInvitationForRoleResult: SchemaTypes.CommunityInvitationForRoleResult;
  CommunityInvitationResult: Omit<
    SchemaTypes.CommunityInvitationResult,
    'invitation' | 'spacePendingMembershipInfo'
  > & {
    invitation: ResolversParentTypes['Invitation'];
    spacePendingMembershipInfo: ResolversParentTypes['SpacePendingMembershipInfo'];
  };
  CommunityMembershipResult: Omit<
    SchemaTypes.CommunityMembershipResult,
    'childMemberships' | 'space'
  > & {
    childMemberships: Array<ResolversParentTypes['CommunityMembershipResult']>;
    space: ResolversParentTypes['Space'];
  };
  Config: Omit<SchemaTypes.Config, 'authentication'> & {
    authentication: ResolversParentTypes['AuthenticationConfig'];
  };
  Context: SchemaTypes.Context;
  Contributor: ResolversInterfaceTypes<ResolversParentTypes>['Contributor'];
  ContributorFilterInput: SchemaTypes.ContributorFilterInput;
  ContributorRolePolicy: SchemaTypes.ContributorRolePolicy;
  ContributorRoles: SchemaTypes.ContributorRoles;
  ConvertSubspaceToSpaceInput: SchemaTypes.ConvertSubspaceToSpaceInput;
  ConvertSubsubspaceToSubspaceInput: SchemaTypes.ConvertSubsubspaceToSubspaceInput;
  CreateActorGroupInput: SchemaTypes.CreateActorGroupInput;
  CreateActorInput: SchemaTypes.CreateActorInput;
  CreateAiPersonaInput: SchemaTypes.CreateAiPersonaInput;
  CreateAiPersonaServiceInput: SchemaTypes.CreateAiPersonaServiceInput;
  CreateCalendarEventOnCalendarInput: SchemaTypes.CreateCalendarEventOnCalendarInput;
  CreateCalloutContributionDefaultsData: SchemaTypes.CreateCalloutContributionDefaultsData;
  CreateCalloutContributionDefaultsInput: SchemaTypes.CreateCalloutContributionDefaultsInput;
  CreateCalloutContributionPolicyData: SchemaTypes.CreateCalloutContributionPolicyData;
  CreateCalloutContributionPolicyInput: SchemaTypes.CreateCalloutContributionPolicyInput;
  CreateCalloutData: SchemaTypes.CreateCalloutData;
  CreateCalloutFramingData: SchemaTypes.CreateCalloutFramingData;
  CreateCalloutFramingInput: SchemaTypes.CreateCalloutFramingInput;
  CreateCalloutInput: SchemaTypes.CreateCalloutInput;
  CreateCalloutOnCollaborationInput: SchemaTypes.CreateCalloutOnCollaborationInput;
  CreateCollaborationData: SchemaTypes.CreateCollaborationData;
  CreateCollaborationInput: SchemaTypes.CreateCollaborationInput;
  CreateCollaborationOnSpaceInput: SchemaTypes.CreateCollaborationOnSpaceInput;
  CreateCommunityGuidelinesData: SchemaTypes.CreateCommunityGuidelinesData;
  CreateCommunityGuidelinesInput: SchemaTypes.CreateCommunityGuidelinesInput;
  CreateContextInput: SchemaTypes.CreateContextInput;
  CreateContributionOnCalloutInput: SchemaTypes.CreateContributionOnCalloutInput;
  CreateInnovationFlowData: SchemaTypes.CreateInnovationFlowData;
  CreateInnovationFlowInput: SchemaTypes.CreateInnovationFlowInput;
  CreateInnovationFlowStateData: SchemaTypes.CreateInnovationFlowStateData;
  CreateInnovationFlowStateInput: SchemaTypes.CreateInnovationFlowStateInput;
  CreateInnovationHubOnAccountInput: SchemaTypes.CreateInnovationHubOnAccountInput;
  CreateInnovationPackOnAccountInput: SchemaTypes.CreateInnovationPackOnAccountInput;
  CreateLicensePlanOnLicensingFrameworkInput: SchemaTypes.CreateLicensePlanOnLicensingFrameworkInput;
  CreateLinkInput: SchemaTypes.CreateLinkInput;
  CreateLocationData: SchemaTypes.CreateLocationData;
  CreateLocationInput: SchemaTypes.CreateLocationInput;
  CreateNVPInput: SchemaTypes.CreateNvpInput;
  CreateOrganizationInput: SchemaTypes.CreateOrganizationInput;
  CreatePlatformInvitationForRoleInput: SchemaTypes.CreatePlatformInvitationForRoleInput;
  CreatePostInput: SchemaTypes.CreatePostInput;
  CreateProfileData: SchemaTypes.CreateProfileData;
  CreateProfileInput: SchemaTypes.CreateProfileInput;
  CreateReferenceData: SchemaTypes.CreateReferenceData;
  CreateReferenceInput: SchemaTypes.CreateReferenceInput;
  CreateReferenceOnProfileInput: SchemaTypes.CreateReferenceOnProfileInput;
  CreateSpaceOnAccountInput: SchemaTypes.CreateSpaceOnAccountInput;
  CreateSubspaceInput: SchemaTypes.CreateSubspaceInput;
  CreateTagsetData: SchemaTypes.CreateTagsetData;
  CreateTagsetInput: SchemaTypes.CreateTagsetInput;
  CreateTagsetOnProfileInput: SchemaTypes.CreateTagsetOnProfileInput;
  CreateTemplateFromCollaborationOnTemplatesSetInput: SchemaTypes.CreateTemplateFromCollaborationOnTemplatesSetInput;
  CreateTemplateOnTemplatesSetInput: SchemaTypes.CreateTemplateOnTemplatesSetInput;
  CreateUserGroupInput: SchemaTypes.CreateUserGroupInput;
  CreateUserInput: SchemaTypes.CreateUserInput;
  CreateVirtualContributorOnAccountInput: SchemaTypes.CreateVirtualContributorOnAccountInput;
  CreateWhiteboardData: SchemaTypes.CreateWhiteboardData;
  CreateWhiteboardInput: SchemaTypes.CreateWhiteboardInput;
  Credential: SchemaTypes.Credential;
  CredentialDefinition: SchemaTypes.CredentialDefinition;
  CredentialMetadataOutput: SchemaTypes.CredentialMetadataOutput;
  DID: SchemaTypes.Scalars['DID']['output'];
  DateTime: SchemaTypes.Scalars['DateTime']['output'];
  DeleteActorGroupInput: SchemaTypes.DeleteActorGroupInput;
  DeleteActorInput: SchemaTypes.DeleteActorInput;
  DeleteAiPersonaServiceInput: SchemaTypes.DeleteAiPersonaServiceInput;
  DeleteApplicationInput: SchemaTypes.DeleteApplicationInput;
  DeleteCalendarEventInput: SchemaTypes.DeleteCalendarEventInput;
  DeleteCalloutInput: SchemaTypes.DeleteCalloutInput;
  DeleteCollaborationInput: SchemaTypes.DeleteCollaborationInput;
  DeleteDiscussionInput: SchemaTypes.DeleteDiscussionInput;
  DeleteDocumentInput: SchemaTypes.DeleteDocumentInput;
  DeleteInnovationHubInput: SchemaTypes.DeleteInnovationHubInput;
  DeleteInnovationPackInput: SchemaTypes.DeleteInnovationPackInput;
  DeleteInvitationInput: SchemaTypes.DeleteInvitationInput;
  DeleteLicensePlanInput: SchemaTypes.DeleteLicensePlanInput;
  DeleteLinkInput: SchemaTypes.DeleteLinkInput;
  DeleteOrganizationInput: SchemaTypes.DeleteOrganizationInput;
  DeletePlatformInvitationInput: SchemaTypes.DeletePlatformInvitationInput;
  DeletePostInput: SchemaTypes.DeletePostInput;
  DeleteReferenceInput: SchemaTypes.DeleteReferenceInput;
  DeleteSpaceInput: SchemaTypes.DeleteSpaceInput;
  DeleteStorageBuckeetInput: SchemaTypes.DeleteStorageBuckeetInput;
  DeleteTemplateInput: SchemaTypes.DeleteTemplateInput;
  DeleteUserGroupInput: SchemaTypes.DeleteUserGroupInput;
  DeleteUserInput: SchemaTypes.DeleteUserInput;
  DeleteVirtualContributorInput: SchemaTypes.DeleteVirtualContributorInput;
  DeleteWhiteboardInput: SchemaTypes.DeleteWhiteboardInput;
  DirectRoom: Omit<SchemaTypes.DirectRoom, 'messages'> & {
    messages: Array<ResolversParentTypes['Message']>;
  };
  Discussion: Omit<SchemaTypes.Discussion, 'comments' | 'profile'> & {
    comments: ResolversParentTypes['Room'];
    profile: ResolversParentTypes['Profile'];
  };
  DiscussionsInput: SchemaTypes.DiscussionsInput;
  Document: Omit<SchemaTypes.Document, 'createdBy'> & {
    createdBy?: SchemaTypes.Maybe<ResolversParentTypes['User']>;
  };
  EcosystemModel: SchemaTypes.EcosystemModel;
  Emoji: SchemaTypes.Scalars['Emoji']['output'];
  ExploreSpacesInput: SchemaTypes.ExploreSpacesInput;
  ExternalConfig: SchemaTypes.ExternalConfig;
  FileStorageConfig: SchemaTypes.FileStorageConfig;
  Float: SchemaTypes.Scalars['Float']['output'];
  Form: SchemaTypes.Form;
  FormQuestion: SchemaTypes.FormQuestion;
  Forum: Omit<SchemaTypes.Forum, 'discussion' | 'discussions'> & {
    discussion?: SchemaTypes.Maybe<ResolversParentTypes['Discussion']>;
    discussions?: SchemaTypes.Maybe<Array<ResolversParentTypes['Discussion']>>;
  };
  ForumCreateDiscussionInput: SchemaTypes.ForumCreateDiscussionInput;
  Geo: SchemaTypes.Geo;
  GrantAuthorizationCredentialInput: SchemaTypes.GrantAuthorizationCredentialInput;
  GrantOrganizationAuthorizationCredentialInput: SchemaTypes.GrantOrganizationAuthorizationCredentialInput;
  Groupable: ResolversInterfaceTypes<ResolversParentTypes>['Groupable'];
  ISearchResults: Omit<
    SchemaTypes.ISearchResults,
    | 'calloutResults'
    | 'contributionResults'
    | 'contributorResults'
    | 'groupResults'
    | 'journeyResults'
  > & {
    calloutResults: Array<ResolversParentTypes['SearchResult']>;
    contributionResults: Array<ResolversParentTypes['SearchResult']>;
    contributorResults: Array<ResolversParentTypes['SearchResult']>;
    groupResults: Array<ResolversParentTypes['SearchResult']>;
    journeyResults: Array<ResolversParentTypes['SearchResult']>;
  };
  InAppNotification: ResolversInterfaceTypes<ResolversParentTypes>['InAppNotification'];
  InAppNotificationCalloutPublished: Omit<
    SchemaTypes.InAppNotificationCalloutPublished,
    'callout' | 'receiver' | 'space' | 'triggeredBy'
  > & {
    callout?: SchemaTypes.Maybe<ResolversParentTypes['Callout']>;
    receiver: ResolversParentTypes['Contributor'];
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    triggeredBy?: SchemaTypes.Maybe<ResolversParentTypes['Contributor']>;
  };
  InAppNotificationCommunityNewMember: Omit<
    SchemaTypes.InAppNotificationCommunityNewMember,
    'actor' | 'receiver' | 'space' | 'triggeredBy'
  > & {
    actor?: SchemaTypes.Maybe<ResolversParentTypes['Contributor']>;
    receiver: ResolversParentTypes['Contributor'];
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    triggeredBy?: SchemaTypes.Maybe<ResolversParentTypes['Contributor']>;
  };
  InAppNotificationUserMentioned: Omit<
    SchemaTypes.InAppNotificationUserMentioned,
    'receiver' | 'triggeredBy'
  > & {
    receiver: ResolversParentTypes['Contributor'];
    triggeredBy?: SchemaTypes.Maybe<ResolversParentTypes['Contributor']>;
  };
  InnovationFlow: Omit<
    SchemaTypes.InnovationFlow,
    'currentState' | 'profile' | 'states'
  > & {
    currentState: ResolversParentTypes['InnovationFlowState'];
    profile: ResolversParentTypes['Profile'];
    states: Array<ResolversParentTypes['InnovationFlowState']>;
  };
  InnovationFlowState: SchemaTypes.InnovationFlowState;
  InnovationHub: Omit<
    SchemaTypes.InnovationHub,
    'account' | 'profile' | 'provider' | 'spaceListFilter'
  > & {
    account: ResolversParentTypes['Account'];
    profile: ResolversParentTypes['Profile'];
    provider: ResolversParentTypes['Contributor'];
    spaceListFilter?: SchemaTypes.Maybe<Array<ResolversParentTypes['Space']>>;
  };
  InnovationPack: Omit<
    SchemaTypes.InnovationPack,
    'profile' | 'provider' | 'templatesSet'
  > & {
    profile: ResolversParentTypes['Profile'];
    provider: ResolversParentTypes['Contributor'];
    templatesSet?: SchemaTypes.Maybe<ResolversParentTypes['TemplatesSet']>;
  };
  InnovationPacksInput: SchemaTypes.InnovationPacksInput;
  InputCreatorQueryResults: SchemaTypes.InputCreatorQueryResults;
  Int: SchemaTypes.Scalars['Int']['output'];
  Invitation: Omit<SchemaTypes.Invitation, 'contributor' | 'createdBy'> & {
    contributor: ResolversParentTypes['Contributor'];
    createdBy: ResolversParentTypes['User'];
  };
  InvitationEventInput: SchemaTypes.InvitationEventInput;
  InviteForEntryRoleOnRoleSetInput: SchemaTypes.InviteForEntryRoleOnRoleSetInput;
  InviteNewContributorForRoleOnRoleSetInput: SchemaTypes.InviteNewContributorForRoleOnRoleSetInput;
  JSON: SchemaTypes.Scalars['JSON']['output'];
  JoinAsEntryRoleOnRoleSetInput: SchemaTypes.JoinAsEntryRoleOnRoleSetInput;
  LatestReleaseDiscussion: SchemaTypes.LatestReleaseDiscussion;
  Library: Omit<
    SchemaTypes.Library,
    'innovationHubs' | 'innovationPacks' | 'templates' | 'virtualContributors'
  > & {
    innovationHubs: Array<ResolversParentTypes['InnovationHub']>;
    innovationPacks: Array<ResolversParentTypes['InnovationPack']>;
    templates: Array<ResolversParentTypes['TemplateResult']>;
    virtualContributors: Array<ResolversParentTypes['VirtualContributor']>;
  };
  LibraryTemplatesFilterInput: SchemaTypes.LibraryTemplatesFilterInput;
  License: SchemaTypes.License;
  LicenseEntitlement: SchemaTypes.LicenseEntitlement;
  LicensePlan: SchemaTypes.LicensePlan;
  LicensePolicy: SchemaTypes.LicensePolicy;
  Licensing: SchemaTypes.Licensing;
  LicensingCredentialBasedPolicyCredentialRule: SchemaTypes.LicensingCredentialBasedPolicyCredentialRule;
  LicensingGrantedEntitlement: SchemaTypes.LicensingGrantedEntitlement;
  Lifecycle: SchemaTypes.Lifecycle;
  LifecycleDefinition: SchemaTypes.Scalars['LifecycleDefinition']['output'];
  Link: Omit<SchemaTypes.Link, 'profile'> & {
    profile: ResolversParentTypes['Profile'];
  };
  Location: SchemaTypes.Location;
  LookupByNameQueryResults: Omit<
    SchemaTypes.LookupByNameQueryResults,
    'innovationPack' | 'template'
  > & {
    innovationPack?: SchemaTypes.Maybe<ResolversParentTypes['InnovationPack']>;
    template?: SchemaTypes.Maybe<ResolversParentTypes['Template']>;
  };
  LookupMyPrivilegesQueryResults: SchemaTypes.LookupMyPrivilegesQueryResults;
  LookupQueryResults: Omit<
    SchemaTypes.LookupQueryResults,
    | 'account'
    | 'application'
    | 'calendar'
    | 'calendarEvent'
    | 'callout'
    | 'collaboration'
    | 'community'
    | 'communityGuidelines'
    | 'document'
    | 'innovationFlow'
    | 'innovationHub'
    | 'innovationPack'
    | 'invitation'
    | 'post'
    | 'profile'
    | 'roleSet'
    | 'room'
    | 'space'
    | 'storageBucket'
    | 'template'
    | 'templatesManager'
    | 'templatesSet'
    | 'user'
    | 'virtualContributor'
    | 'whiteboard'
  > & {
    account?: SchemaTypes.Maybe<ResolversParentTypes['Account']>;
    application?: SchemaTypes.Maybe<ResolversParentTypes['Application']>;
    calendar?: SchemaTypes.Maybe<ResolversParentTypes['Calendar']>;
    calendarEvent?: SchemaTypes.Maybe<ResolversParentTypes['CalendarEvent']>;
    callout?: SchemaTypes.Maybe<ResolversParentTypes['Callout']>;
    collaboration?: SchemaTypes.Maybe<ResolversParentTypes['Collaboration']>;
    community?: SchemaTypes.Maybe<ResolversParentTypes['Community']>;
    communityGuidelines?: SchemaTypes.Maybe<
      ResolversParentTypes['CommunityGuidelines']
    >;
    document?: SchemaTypes.Maybe<ResolversParentTypes['Document']>;
    innovationFlow?: SchemaTypes.Maybe<ResolversParentTypes['InnovationFlow']>;
    innovationHub?: SchemaTypes.Maybe<ResolversParentTypes['InnovationHub']>;
    innovationPack?: SchemaTypes.Maybe<ResolversParentTypes['InnovationPack']>;
    invitation?: SchemaTypes.Maybe<ResolversParentTypes['Invitation']>;
    post?: SchemaTypes.Maybe<ResolversParentTypes['Post']>;
    profile?: SchemaTypes.Maybe<ResolversParentTypes['Profile']>;
    roleSet?: SchemaTypes.Maybe<ResolversParentTypes['RoleSet']>;
    room?: SchemaTypes.Maybe<ResolversParentTypes['Room']>;
    space?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    storageBucket?: SchemaTypes.Maybe<ResolversParentTypes['StorageBucket']>;
    template?: SchemaTypes.Maybe<ResolversParentTypes['Template']>;
    templatesManager?: SchemaTypes.Maybe<
      ResolversParentTypes['TemplatesManager']
    >;
    templatesSet?: SchemaTypes.Maybe<ResolversParentTypes['TemplatesSet']>;
    user?: SchemaTypes.Maybe<ResolversParentTypes['User']>;
    virtualContributor?: SchemaTypes.Maybe<
      ResolversParentTypes['VirtualContributor']
    >;
    whiteboard?: SchemaTypes.Maybe<ResolversParentTypes['Whiteboard']>;
  };
  Markdown: SchemaTypes.Scalars['Markdown']['output'];
  MeQueryResults: Omit<
    SchemaTypes.MeQueryResults,
    | 'communityApplications'
    | 'communityInvitations'
    | 'mySpaces'
    | 'spaceMembershipsFlat'
    | 'spaceMembershipsHierarchical'
    | 'user'
  > & {
    communityApplications: Array<
      ResolversParentTypes['CommunityApplicationResult']
    >;
    communityInvitations: Array<
      ResolversParentTypes['CommunityInvitationResult']
    >;
    mySpaces: Array<ResolversParentTypes['MySpaceResults']>;
    spaceMembershipsFlat: Array<
      ResolversParentTypes['CommunityMembershipResult']
    >;
    spaceMembershipsHierarchical: Array<
      ResolversParentTypes['CommunityMembershipResult']
    >;
    user?: SchemaTypes.Maybe<ResolversParentTypes['User']>;
  };
  Message: Omit<SchemaTypes.Message, 'reactions' | 'sender'> & {
    reactions: Array<ResolversParentTypes['Reaction']>;
    sender?: SchemaTypes.Maybe<ResolversParentTypes['Contributor']>;
  };
  MessageAnswerQuestion: SchemaTypes.MessageAnswerQuestion;
  MessageID: SchemaTypes.Scalars['MessageID']['output'];
  Metadata: SchemaTypes.Metadata;
  MigrateEmbeddings: SchemaTypes.MigrateEmbeddings;
  MoveCalloutContributionInput: SchemaTypes.MoveCalloutContributionInput;
  Mutation: {};
  MySpaceResults: Omit<
    SchemaTypes.MySpaceResults,
    'latestActivity' | 'space'
  > & {
    latestActivity?: SchemaTypes.Maybe<
      ResolversParentTypes['ActivityLogEntry']
    >;
    space: ResolversParentTypes['Space'];
  };
  NVP: SchemaTypes.Nvp;
  NameID: SchemaTypes.Scalars['NameID']['output'];
  Organization: Omit<
    SchemaTypes.Organization,
    | 'account'
    | 'admins'
    | 'associates'
    | 'group'
    | 'groups'
    | 'owners'
    | 'profile'
  > & {
    account?: SchemaTypes.Maybe<ResolversParentTypes['Account']>;
    admins?: SchemaTypes.Maybe<Array<ResolversParentTypes['User']>>;
    associates?: SchemaTypes.Maybe<Array<ResolversParentTypes['User']>>;
    group?: SchemaTypes.Maybe<ResolversParentTypes['UserGroup']>;
    groups?: SchemaTypes.Maybe<Array<ResolversParentTypes['UserGroup']>>;
    owners?: SchemaTypes.Maybe<Array<ResolversParentTypes['User']>>;
    profile: ResolversParentTypes['Profile'];
  };
  OrganizationAuthorizationResetInput: SchemaTypes.OrganizationAuthorizationResetInput;
  OrganizationFilterInput: SchemaTypes.OrganizationFilterInput;
  OrganizationSettings: SchemaTypes.OrganizationSettings;
  OrganizationSettingsMembership: SchemaTypes.OrganizationSettingsMembership;
  OrganizationSettingsPrivacy: SchemaTypes.OrganizationSettingsPrivacy;
  OrganizationVerification: SchemaTypes.OrganizationVerification;
  OrganizationVerificationEventInput: SchemaTypes.OrganizationVerificationEventInput;
  OryConfig: SchemaTypes.OryConfig;
  PageInfo: SchemaTypes.PageInfo;
  PaginatedOrganization: Omit<
    SchemaTypes.PaginatedOrganization,
    'organization' | 'pageInfo'
  > & {
    organization: Array<ResolversParentTypes['Organization']>;
    pageInfo: ResolversParentTypes['PageInfo'];
  };
  PaginatedSpaces: Omit<SchemaTypes.PaginatedSpaces, 'pageInfo' | 'spaces'> & {
    pageInfo: ResolversParentTypes['PageInfo'];
    spaces: Array<ResolversParentTypes['Space']>;
  };
  PaginatedUsers: Omit<SchemaTypes.PaginatedUsers, 'pageInfo' | 'users'> & {
    pageInfo: ResolversParentTypes['PageInfo'];
    users: Array<ResolversParentTypes['User']>;
  };
  Platform: Omit<
    SchemaTypes.Platform,
    | 'configuration'
    | 'forum'
    | 'innovationHub'
    | 'library'
    | 'platformInvitations'
    | 'templatesManager'
  > & {
    configuration: ResolversParentTypes['Config'];
    forum: ResolversParentTypes['Forum'];
    innovationHub?: SchemaTypes.Maybe<ResolversParentTypes['InnovationHub']>;
    library: ResolversParentTypes['Library'];
    platformInvitations: Array<ResolversParentTypes['PlatformInvitation']>;
    templatesManager?: SchemaTypes.Maybe<
      ResolversParentTypes['TemplatesManager']
    >;
  };
  PlatformFeatureFlag: SchemaTypes.PlatformFeatureFlag;
  PlatformInvitation: Omit<SchemaTypes.PlatformInvitation, 'createdBy'> & {
    createdBy: ResolversParentTypes['User'];
  };
  PlatformLocations: SchemaTypes.PlatformLocations;
  Post: Omit<SchemaTypes.Post, 'comments' | 'createdBy' | 'profile'> & {
    comments: ResolversParentTypes['Room'];
    createdBy?: SchemaTypes.Maybe<ResolversParentTypes['User']>;
    profile: ResolversParentTypes['Profile'];
  };
  Preference: SchemaTypes.Preference;
  PreferenceDefinition: SchemaTypes.PreferenceDefinition;
  Profile: Omit<SchemaTypes.Profile, 'location' | 'storageBucket'> & {
    location?: SchemaTypes.Maybe<ResolversParentTypes['Location']>;
    storageBucket: ResolversParentTypes['StorageBucket'];
  };
  ProfileCredentialVerified: SchemaTypes.ProfileCredentialVerified;
  Query: {};
  Question: SchemaTypes.Question;
  Reaction: Omit<SchemaTypes.Reaction, 'sender'> & {
    sender?: SchemaTypes.Maybe<ResolversParentTypes['User']>;
  };
  Reference: SchemaTypes.Reference;
  RefreshVirtualContributorBodyOfKnowledgeInput: SchemaTypes.RefreshVirtualContributorBodyOfKnowledgeInput;
  RelayPaginatedSpace: Omit<
    SchemaTypes.RelayPaginatedSpace,
    | 'account'
    | 'collaboration'
    | 'community'
    | 'profile'
    | 'provider'
    | 'subspace'
    | 'subspaces'
    | 'templatesManager'
  > & {
    account: ResolversParentTypes['Account'];
    collaboration: ResolversParentTypes['Collaboration'];
    community: ResolversParentTypes['Community'];
    profile: ResolversParentTypes['Profile'];
    provider: ResolversParentTypes['Contributor'];
    subspace: ResolversParentTypes['Space'];
    subspaces: Array<ResolversParentTypes['Space']>;
    templatesManager?: SchemaTypes.Maybe<
      ResolversParentTypes['TemplatesManager']
    >;
  };
  RelayPaginatedSpaceEdge: Omit<SchemaTypes.RelayPaginatedSpaceEdge, 'node'> & {
    node: ResolversParentTypes['RelayPaginatedSpace'];
  };
  RelayPaginatedSpacePageInfo: SchemaTypes.RelayPaginatedSpacePageInfo;
  RemoveCommunityGuidelinesContentInput: SchemaTypes.RemoveCommunityGuidelinesContentInput;
  RemoveRoleNameFromUserInput: SchemaTypes.RemoveRoleNameFromUserInput;
  RemoveRoleOnRoleSetFromUserInput: SchemaTypes.RemoveRoleOnRoleSetFromUserInput;
  RemoveRoleOnRoleSetFromOrganizationInput: SchemaTypes.RemoveRoleOnRoleSetFromOrganizationInput;
  RemoveRoleOnRoleSetFromUserInput: SchemaTypes.RemoveRoleOnRoleSetFromUserInput;
  RemoveRoleOnRoleSetFromVirtualContributorInput: SchemaTypes.RemoveRoleOnRoleSetFromVirtualContributorInput;
  RemoveUserGroupMemberInput: SchemaTypes.RemoveUserGroupMemberInput;
  RevokeAuthorizationCredentialInput: SchemaTypes.RevokeAuthorizationCredentialInput;
  RevokeLicensePlanFromAccount: SchemaTypes.RevokeLicensePlanFromAccount;
  RevokeLicensePlanFromSpace: SchemaTypes.RevokeLicensePlanFromSpace;
  RevokeOrganizationAuthorizationCredentialInput: SchemaTypes.RevokeOrganizationAuthorizationCredentialInput;
  Role: SchemaTypes.Role;
  RoleSet: Omit<
    SchemaTypes.RoleSet,
    | 'applications'
    | 'availableUsersForLeadRole'
    | 'availableUsersForEntryRole'
    | 'invitations'
    | 'organizationsInRole'
    | 'platformInvitations'
    | 'usersInRole'
    | 'virtualContributorsInRole'
  > & {
    applications: Array<ResolversParentTypes['Application']>;
    availableUsersForLeadRole: ResolversParentTypes['PaginatedUsers'];
    availableUsersForEntryRole: ResolversParentTypes['PaginatedUsers'];
    invitations: Array<ResolversParentTypes['Invitation']>;
    organizationsInRole: Array<ResolversParentTypes['Organization']>;
    platformInvitations: Array<ResolversParentTypes['PlatformInvitation']>;
    usersInRole: Array<ResolversParentTypes['User']>;
    virtualContributorsInRole: Array<
      ResolversParentTypes['VirtualContributor']
    >;
  };
  RolesOrganizationInput: SchemaTypes.RolesOrganizationInput;
  RolesResult: SchemaTypes.RolesResult;
  RolesResultCommunity: SchemaTypes.RolesResultCommunity;
  RolesResultOrganization: SchemaTypes.RolesResultOrganization;
  RolesResultSpace: SchemaTypes.RolesResultSpace;
  RolesUserInput: SchemaTypes.RolesUserInput;
  RolesVirtualContributorInput: SchemaTypes.RolesVirtualContributorInput;
  Room: Omit<SchemaTypes.Room, 'messages' | 'vcInteractions'> & {
    messages: Array<ResolversParentTypes['Message']>;
    vcInteractions: Array<ResolversParentTypes['VcInteraction']>;
  };
  RoomAddReactionToMessageInput: SchemaTypes.RoomAddReactionToMessageInput;
  RoomEventSubscriptionResult: Omit<
    SchemaTypes.RoomEventSubscriptionResult,
    'message' | 'reaction' | 'room'
  > & {
    message?: SchemaTypes.Maybe<
      ResolversParentTypes['RoomMessageEventSubscriptionResult']
    >;
    reaction?: SchemaTypes.Maybe<
      ResolversParentTypes['RoomMessageReactionEventSubscriptionResult']
    >;
    room: ResolversParentTypes['Room'];
  };
  RoomMessageEventSubscriptionResult: Omit<
    SchemaTypes.RoomMessageEventSubscriptionResult,
    'data'
  > & { data: ResolversParentTypes['Message'] };
  RoomMessageReactionEventSubscriptionResult: Omit<
    SchemaTypes.RoomMessageReactionEventSubscriptionResult,
    'data'
  > & { data: ResolversParentTypes['Reaction'] };
  RoomRemoveMessageInput: SchemaTypes.RoomRemoveMessageInput;
  RoomRemoveReactionToMessageInput: SchemaTypes.RoomRemoveReactionToMessageInput;
  RoomSendMessageInput: SchemaTypes.RoomSendMessageInput;
  RoomSendMessageReplyInput: SchemaTypes.RoomSendMessageReplyInput;
  SearchInput: SchemaTypes.SearchInput;
  SearchResult: ResolversInterfaceTypes<ResolversParentTypes>['SearchResult'];
  SearchResultCallout: Omit<
    SchemaTypes.SearchResultCallout,
    'callout' | 'space'
  > & {
    callout: ResolversParentTypes['Callout'];
    space: ResolversParentTypes['Space'];
  };
  SearchResultOrganization: Omit<
    SchemaTypes.SearchResultOrganization,
    'organization'
  > & { organization: ResolversParentTypes['Organization'] };
  SearchResultPost: Omit<
    SchemaTypes.SearchResultPost,
    'callout' | 'post' | 'space'
  > & {
    callout: ResolversParentTypes['Callout'];
    post: ResolversParentTypes['Post'];
    space: ResolversParentTypes['Space'];
  };
  SearchResultSpace: Omit<
    SchemaTypes.SearchResultSpace,
    'parentSpace' | 'space'
  > & {
    parentSpace?: SchemaTypes.Maybe<ResolversParentTypes['Space']>;
    space: ResolversParentTypes['Space'];
  };
  SearchResultUser: Omit<SchemaTypes.SearchResultUser, 'user'> & {
    user: ResolversParentTypes['User'];
  };
  SearchResultUserGroup: Omit<
    SchemaTypes.SearchResultUserGroup,
    'userGroup'
  > & { userGroup: ResolversParentTypes['UserGroup'] };
  Sentry: SchemaTypes.Sentry;
  ServiceMetadata: SchemaTypes.ServiceMetadata;
  Space: Omit<
    SchemaTypes.Space,
    | 'account'
    | 'collaboration'
    | 'community'
    | 'profile'
    | 'provider'
    | 'subspace'
    | 'subspaces'
    | 'templatesManager'
  > & {
    account: ResolversParentTypes['Account'];
    collaboration: ResolversParentTypes['Collaboration'];
    community: ResolversParentTypes['Community'];
    profile: ResolversParentTypes['Profile'];
    provider: ResolversParentTypes['Contributor'];
    subspace: ResolversParentTypes['Space'];
    subspaces: Array<ResolversParentTypes['Space']>;
    templatesManager?: SchemaTypes.Maybe<
      ResolversParentTypes['TemplatesManager']
    >;
  };
  SpaceFilterInput: SchemaTypes.SpaceFilterInput;
  SpacePendingMembershipInfo: Omit<
    SchemaTypes.SpacePendingMembershipInfo,
    'communityGuidelines' | 'profile'
  > & {
    communityGuidelines: ResolversParentTypes['CommunityGuidelines'];
    profile: ResolversParentTypes['Profile'];
  };
  SpaceSettings: SchemaTypes.SpaceSettings;
  SpaceSettingsCollaboration: SchemaTypes.SpaceSettingsCollaboration;
  SpaceSettingsMembership: SchemaTypes.SpaceSettingsMembership;
  SpaceSettingsPrivacy: SchemaTypes.SpaceSettingsPrivacy;
  SpaceSubscription: SchemaTypes.SpaceSubscription;
  StorageAggregator: Omit<
    SchemaTypes.StorageAggregator,
    'directStorageBucket' | 'storageBuckets'
  > & {
    directStorageBucket: ResolversParentTypes['StorageBucket'];
    storageBuckets: Array<ResolversParentTypes['StorageBucket']>;
  };
  StorageAggregatorParent: SchemaTypes.StorageAggregatorParent;
  StorageBucket: Omit<SchemaTypes.StorageBucket, 'document' | 'documents'> & {
    document?: SchemaTypes.Maybe<ResolversParentTypes['Document']>;
    documents: Array<ResolversParentTypes['Document']>;
  };
  StorageBucketParent: SchemaTypes.StorageBucketParent;
  StorageBucketUploadFileInput: SchemaTypes.StorageBucketUploadFileInput;
  StorageBucketUploadFileOnLinkInput: SchemaTypes.StorageBucketUploadFileOnLinkInput;
  StorageBucketUploadFileOnReferenceInput: SchemaTypes.StorageBucketUploadFileOnReferenceInput;
  StorageConfig: SchemaTypes.StorageConfig;
  String: SchemaTypes.Scalars['String']['output'];
  Subscription: {};
  SubspaceCreated: Omit<SchemaTypes.SubspaceCreated, 'subspace'> & {
    subspace: ResolversParentTypes['Space'];
  };
  Tagset: SchemaTypes.Tagset;
  TagsetArgs: SchemaTypes.TagsetArgs;
  TagsetTemplate: SchemaTypes.TagsetTemplate;
  Task: SchemaTypes.Task;
  Template: Omit<
    SchemaTypes.Template,
    | 'callout'
    | 'collaboration'
    | 'communityGuidelines'
    | 'profile'
    | 'whiteboard'
  > & {
    callout?: SchemaTypes.Maybe<ResolversParentTypes['Callout']>;
    collaboration?: SchemaTypes.Maybe<ResolversParentTypes['Collaboration']>;
    communityGuidelines?: SchemaTypes.Maybe<
      ResolversParentTypes['CommunityGuidelines']
    >;
    profile: ResolversParentTypes['Profile'];
    whiteboard?: SchemaTypes.Maybe<ResolversParentTypes['Whiteboard']>;
  };
  TemplateDefault: Omit<SchemaTypes.TemplateDefault, 'template'> & {
    template?: SchemaTypes.Maybe<ResolversParentTypes['Template']>;
  };
  TemplateResult: Omit<
    SchemaTypes.TemplateResult,
    'innovationPack' | 'template'
  > & {
    innovationPack: ResolversParentTypes['InnovationPack'];
    template: ResolversParentTypes['Template'];
  };
  TemplatesManager: Omit<
    SchemaTypes.TemplatesManager,
    'templateDefaults' | 'templatesSet'
  > & {
    templateDefaults: Array<ResolversParentTypes['TemplateDefault']>;
    templatesSet?: SchemaTypes.Maybe<ResolversParentTypes['TemplatesSet']>;
  };
  TemplatesSet: Omit<
    SchemaTypes.TemplatesSet,
    | 'calloutTemplates'
    | 'collaborationTemplates'
    | 'communityGuidelinesTemplates'
    | 'postTemplates'
    | 'templates'
    | 'whiteboardTemplates'
  > & {
    calloutTemplates: Array<ResolversParentTypes['Template']>;
    collaborationTemplates: Array<ResolversParentTypes['Template']>;
    communityGuidelinesTemplates: Array<ResolversParentTypes['Template']>;
    postTemplates: Array<ResolversParentTypes['Template']>;
    templates: Array<ResolversParentTypes['Template']>;
    whiteboardTemplates: Array<ResolversParentTypes['Template']>;
  };
  Timeline: Omit<SchemaTypes.Timeline, 'calendar'> & {
    calendar: ResolversParentTypes['Calendar'];
  };
  TransferAccountInnovationHubInput: SchemaTypes.TransferAccountInnovationHubInput;
  TransferAccountInnovationPackInput: SchemaTypes.TransferAccountInnovationPackInput;
  TransferAccountSpaceInput: SchemaTypes.TransferAccountSpaceInput;
  TransferAccountVirtualContributorInput: SchemaTypes.TransferAccountVirtualContributorInput;
  UUID: SchemaTypes.Scalars['UUID']['output'];
  UUID_NAMEID: SchemaTypes.Scalars['UUID_NAMEID']['output'];
  UUID_NAMEID_EMAIL: SchemaTypes.Scalars['UUID_NAMEID_EMAIL']['output'];
  UpdateActorInput: SchemaTypes.UpdateActorInput;
  UpdateAiPersonaInput: SchemaTypes.UpdateAiPersonaInput;
  UpdateAiPersonaServiceInput: SchemaTypes.UpdateAiPersonaServiceInput;
  UpdateApplicationFormOnRoleSetInput: SchemaTypes.UpdateApplicationFormOnRoleSetInput;
  UpdateCalendarEventInput: SchemaTypes.UpdateCalendarEventInput;
  UpdateCalloutContributionDefaultsInput: SchemaTypes.UpdateCalloutContributionDefaultsInput;
  UpdateCalloutContributionPolicyInput: SchemaTypes.UpdateCalloutContributionPolicyInput;
  UpdateCalloutEntityInput: SchemaTypes.UpdateCalloutEntityInput;
  UpdateCalloutFramingInput: SchemaTypes.UpdateCalloutFramingInput;
  UpdateCalloutPublishInfoInput: SchemaTypes.UpdateCalloutPublishInfoInput;
  UpdateCalloutVisibilityInput: SchemaTypes.UpdateCalloutVisibilityInput;
  UpdateCollaborationCalloutsSortOrderInput: SchemaTypes.UpdateCollaborationCalloutsSortOrderInput;
  UpdateCollaborationFromTemplateInput: SchemaTypes.UpdateCollaborationFromTemplateInput;
  UpdateCommunityGuidelinesEntityInput: SchemaTypes.UpdateCommunityGuidelinesEntityInput;
  UpdateContextInput: SchemaTypes.UpdateContextInput;
  UpdateContributionCalloutsSortOrderInput: SchemaTypes.UpdateContributionCalloutsSortOrderInput;
  UpdateDiscussionInput: SchemaTypes.UpdateDiscussionInput;
  UpdateDocumentInput: SchemaTypes.UpdateDocumentInput;
  UpdateEcosystemModelInput: SchemaTypes.UpdateEcosystemModelInput;
  UpdateFormInput: SchemaTypes.UpdateFormInput;
  UpdateFormQuestionInput: SchemaTypes.UpdateFormQuestionInput;
  UpdateInnovationFlowEntityInput: SchemaTypes.UpdateInnovationFlowEntityInput;
  UpdateInnovationFlowInput: SchemaTypes.UpdateInnovationFlowInput;
  UpdateInnovationFlowSelectedStateInput: SchemaTypes.UpdateInnovationFlowSelectedStateInput;
  UpdateInnovationFlowSingleStateInput: SchemaTypes.UpdateInnovationFlowSingleStateInput;
  UpdateInnovationFlowStateInput: SchemaTypes.UpdateInnovationFlowStateInput;
  UpdateInnovationHubInput: SchemaTypes.UpdateInnovationHubInput;
  UpdateInnovationPackInput: SchemaTypes.UpdateInnovationPackInput;
  UpdateLicensePlanInput: SchemaTypes.UpdateLicensePlanInput;
  UpdateLinkInput: SchemaTypes.UpdateLinkInput;
  UpdateLocationInput: SchemaTypes.UpdateLocationInput;
  UpdateNotificationStateInput: SchemaTypes.UpdateNotificationStateInput;
  UpdateOrganizationInput: SchemaTypes.UpdateOrganizationInput;
  UpdateOrganizationPlatformSettingsInput: SchemaTypes.UpdateOrganizationPlatformSettingsInput;
  UpdateOrganizationSettingsEntityInput: SchemaTypes.UpdateOrganizationSettingsEntityInput;
  UpdateOrganizationSettingsInput: SchemaTypes.UpdateOrganizationSettingsInput;
  UpdateOrganizationSettingsMembershipInput: SchemaTypes.UpdateOrganizationSettingsMembershipInput;
  UpdateOrganizationSettingsPrivacyInput: SchemaTypes.UpdateOrganizationSettingsPrivacyInput;
  UpdatePostInput: SchemaTypes.UpdatePostInput;
  UpdateProfileDirectInput: SchemaTypes.UpdateProfileDirectInput;
  UpdateProfileInput: SchemaTypes.UpdateProfileInput;
  UpdateReferenceInput: SchemaTypes.UpdateReferenceInput;
  UpdateSpaceInput: SchemaTypes.UpdateSpaceInput;
  UpdateSpacePlatformSettingsInput: SchemaTypes.UpdateSpacePlatformSettingsInput;
  UpdateSpaceSettingsCollaborationInput: SchemaTypes.UpdateSpaceSettingsCollaborationInput;
  UpdateSpaceSettingsEntityInput: SchemaTypes.UpdateSpaceSettingsEntityInput;
  UpdateSpaceSettingsInput: SchemaTypes.UpdateSpaceSettingsInput;
  UpdateSpaceSettingsMembershipInput: SchemaTypes.UpdateSpaceSettingsMembershipInput;
  UpdateSpaceSettingsPrivacyInput: SchemaTypes.UpdateSpaceSettingsPrivacyInput;
  UpdateTagsetInput: SchemaTypes.UpdateTagsetInput;
  UpdateTemplateDefaultTemplateInput: SchemaTypes.UpdateTemplateDefaultTemplateInput;
  UpdateTemplateFromCollaborationInput: SchemaTypes.UpdateTemplateFromCollaborationInput;
  UpdateTemplateInput: SchemaTypes.UpdateTemplateInput;
  UpdateUserGroupInput: SchemaTypes.UpdateUserGroupInput;
  UpdateUserInput: SchemaTypes.UpdateUserInput;
  UpdateUserPlatformSettingsInput: SchemaTypes.UpdateUserPlatformSettingsInput;
  UpdateUserPreferenceInput: SchemaTypes.UpdateUserPreferenceInput;
  UpdateUserSettingsCommunicationInput: SchemaTypes.UpdateUserSettingsCommunicationInput;
  UpdateUserSettingsEntityInput: SchemaTypes.UpdateUserSettingsEntityInput;
  UpdateUserSettingsInput: SchemaTypes.UpdateUserSettingsInput;
  UpdateUserSettingsPrivacyInput: SchemaTypes.UpdateUserSettingsPrivacyInput;
  UpdateVirtualContributorInput: SchemaTypes.UpdateVirtualContributorInput;
  UpdateVisualInput: SchemaTypes.UpdateVisualInput;
  UpdateWhiteboardEntityInput: SchemaTypes.UpdateWhiteboardEntityInput;
  Upload: SchemaTypes.Scalars['Upload']['output'];
  User: Omit<
    SchemaTypes.User,
    'account' | 'communityRooms' | 'directRooms' | 'guidanceRoom' | 'profile'
  > & {
    account?: SchemaTypes.Maybe<ResolversParentTypes['Account']>;
    communityRooms?: SchemaTypes.Maybe<
      Array<ResolversParentTypes['CommunicationRoom']>
    >;
    directRooms?: SchemaTypes.Maybe<Array<ResolversParentTypes['DirectRoom']>>;
    guidanceRoom?: SchemaTypes.Maybe<ResolversParentTypes['Room']>;
    profile: ResolversParentTypes['Profile'];
  };
  UserAuthenticationResult: SchemaTypes.UserAuthenticationResult;
  UserAuthorizationPrivilegesInput: SchemaTypes.UserAuthorizationPrivilegesInput;
  UserAuthorizationResetInput: SchemaTypes.UserAuthorizationResetInput;
  UserFilterInput: SchemaTypes.UserFilterInput;
  UserGroup: Omit<SchemaTypes.UserGroup, 'members' | 'parent' | 'profile'> & {
    members?: SchemaTypes.Maybe<Array<ResolversParentTypes['User']>>;
    parent?: SchemaTypes.Maybe<ResolversParentTypes['Groupable']>;
    profile?: SchemaTypes.Maybe<ResolversParentTypes['Profile']>;
  };
  UserSendMessageInput: SchemaTypes.UserSendMessageInput;
  UserSettings: SchemaTypes.UserSettings;
  UserSettingsCommunication: SchemaTypes.UserSettingsCommunication;
  UserSettingsPrivacy: SchemaTypes.UserSettingsPrivacy;
  UsersWithAuthorizationCredentialInput: SchemaTypes.UsersWithAuthorizationCredentialInput;
  VcInteraction: Omit<SchemaTypes.VcInteraction, 'room'> & {
    room: ResolversParentTypes['Room'];
  };
  VerifiedCredential: SchemaTypes.VerifiedCredential;
  VerifiedCredentialClaim: SchemaTypes.VerifiedCredentialClaim;
  VirtualContributor: Omit<
    SchemaTypes.VirtualContributor,
    'account' | 'profile' | 'provider'
  > & {
    account?: SchemaTypes.Maybe<ResolversParentTypes['Account']>;
    profile: ResolversParentTypes['Profile'];
    provider: ResolversParentTypes['Contributor'];
  };
  VirtualContributorUpdatedSubscriptionResult: Omit<
    SchemaTypes.VirtualContributorUpdatedSubscriptionResult,
    'virtualContributor'
  > & { virtualContributor: ResolversParentTypes['VirtualContributor'] };
  Visual: SchemaTypes.Visual;
  VisualConstraints: SchemaTypes.VisualConstraints;
  VisualUploadImageInput: SchemaTypes.VisualUploadImageInput;
  Whiteboard: Omit<SchemaTypes.Whiteboard, 'createdBy' | 'profile'> & {
    createdBy?: SchemaTypes.Maybe<ResolversParentTypes['User']>;
    profile: ResolversParentTypes['Profile'];
  };
  WhiteboardContent: SchemaTypes.Scalars['WhiteboardContent']['output'];
};

export type ApmResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['APM'] = ResolversParentTypes['APM'],
> = {
  endpoint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rumEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AccountResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Account'] = ResolversParentTypes['Account'],
> = {
  agent?: Resolver<ResolversTypes['Agent'], ParentType, ContextType>;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  host?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Contributor']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  innovationHubs?: Resolver<
    Array<ResolversTypes['InnovationHub']>,
    ParentType,
    ContextType
  >;
  innovationPacks?: Resolver<
    Array<ResolversTypes['InnovationPack']>,
    ParentType,
    ContextType
  >;
  license?: Resolver<ResolversTypes['License'], ParentType, ContextType>;
  spaces?: Resolver<Array<ResolversTypes['Space']>, ParentType, ContextType>;
  storageAggregator?: Resolver<
    ResolversTypes['StorageAggregator'],
    ParentType,
    ContextType
  >;
  subscriptions?: Resolver<
    Array<ResolversTypes['AccountSubscription']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['AccountType']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  virtualContributors?: Resolver<
    Array<ResolversTypes['VirtualContributor']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AccountSubscriptionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['AccountSubscription'] = ResolversParentTypes['AccountSubscription'],
> = {
  expires?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  name?: Resolver<
    ResolversTypes['LicensingCredentialBasedCredentialType'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityCreatedSubscriptionResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityCreatedSubscriptionResult'] = ResolversParentTypes['ActivityCreatedSubscriptionResult'],
> = {
  activity?: Resolver<
    ResolversTypes['ActivityLogEntry'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityFeedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityFeed'] = ResolversParentTypes['ActivityFeed'],
> = {
  activityFeed?: Resolver<
    Array<ResolversTypes['ActivityLogEntry']>,
    ParentType,
    ContextType
  >;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntry'] = ResolversParentTypes['ActivityLogEntry'],
> = {
  __resolveType: TypeResolveFn<
    | 'ActivityLogEntryCalendarEventCreated'
    | 'ActivityLogEntryCalloutDiscussionComment'
    | 'ActivityLogEntryCalloutLinkCreated'
    | 'ActivityLogEntryCalloutPostComment'
    | 'ActivityLogEntryCalloutPostCreated'
    | 'ActivityLogEntryCalloutPublished'
    | 'ActivityLogEntryCalloutWhiteboardContentModified'
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
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
};

export type ActivityLogEntryCalendarEventCreatedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntryCalendarEventCreated'] = ResolversParentTypes['ActivityLogEntryCalendarEventCreated'],
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
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutDiscussionCommentResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntryCalloutDiscussionComment'] = ResolversParentTypes['ActivityLogEntryCalloutDiscussionComment'],
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
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutLinkCreatedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntryCalloutLinkCreated'] = ResolversParentTypes['ActivityLogEntryCalloutLinkCreated'],
> = {
  callout?: Resolver<ResolversTypes['Callout'], ParentType, ContextType>;
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  link?: Resolver<ResolversTypes['Link'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutPostCommentResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntryCalloutPostComment'] = ResolversParentTypes['ActivityLogEntryCalloutPostComment'],
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
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutPostCreatedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntryCalloutPostCreated'] = ResolversParentTypes['ActivityLogEntryCalloutPostCreated'],
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
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutPublishedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntryCalloutPublished'] = ResolversParentTypes['ActivityLogEntryCalloutPublished'],
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
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutWhiteboardContentModifiedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntryCalloutWhiteboardContentModified'] = ResolversParentTypes['ActivityLogEntryCalloutWhiteboardContentModified'],
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
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  whiteboard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryCalloutWhiteboardCreatedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntryCalloutWhiteboardCreated'] = ResolversParentTypes['ActivityLogEntryCalloutWhiteboardCreated'],
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
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  whiteboard?: Resolver<ResolversTypes['Whiteboard'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryChallengeCreatedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntryChallengeCreated'] = ResolversParentTypes['ActivityLogEntryChallengeCreated'],
> = {
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
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  subspace?: Resolver<ResolversTypes['Space'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryMemberJoinedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntryMemberJoined'] = ResolversParentTypes['ActivityLogEntryMemberJoined'],
> = {
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  community?: Resolver<ResolversTypes['Community'], ParentType, ContextType>;
  contributor?: Resolver<
    ResolversTypes['Contributor'],
    ParentType,
    ContextType
  >;
  contributorType?: Resolver<
    ResolversTypes['CommunityContributorType'],
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryOpportunityCreatedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntryOpportunityCreated'] = ResolversParentTypes['ActivityLogEntryOpportunityCreated'],
> = {
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
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  subsubspace?: Resolver<ResolversTypes['Space'], ParentType, ContextType>;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActivityLogEntryUpdateSentResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActivityLogEntryUpdateSent'] = ResolversParentTypes['ActivityLogEntryUpdateSent'],
> = {
  child?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collaborationID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  journeyUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parentDisplayName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  parentNameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  triggeredBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ActivityEventType'], ParentType, ContextType>;
  updates?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActorResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Actor'] = ResolversParentTypes['Actor'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  impact?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  value?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ActorGroupResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ActorGroup'] = ResolversParentTypes['ActorGroup'],
> = {
  actors?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['Actor']>>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AgentResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Agent'] = ResolversParentTypes['Agent'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  credentials?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['Credential']>>,
    ParentType,
    ContextType
  >;
  did?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DID']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['AgentType'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  verifiedCredentials?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['VerifiedCredential']>>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AgentBeginVerifiedCredentialOfferOutputResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['AgentBeginVerifiedCredentialOfferOutput'] = ResolversParentTypes['AgentBeginVerifiedCredentialOfferOutput'],
> = {
  jwt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  qrCodeImg?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AgentBeginVerifiedCredentialRequestOutputResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['AgentBeginVerifiedCredentialRequestOutput'] = ResolversParentTypes['AgentBeginVerifiedCredentialRequestOutput'],
> = {
  jwt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  qrCodeImg?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AiPersonaResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['AiPersona'] = ResolversParentTypes['AiPersona'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  bodyOfKnowledge?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  bodyOfKnowledgeID?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  bodyOfKnowledgeType?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['AiPersonaBodyOfKnowledgeType']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  dataAccessMode?: Resolver<
    ResolversTypes['AiPersonaDataAccessMode'],
    ParentType,
    ContextType
  >;
  description?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  interactionModes?: Resolver<
    Array<ResolversTypes['AiPersonaInteractionMode']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AiPersonaServiceResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['AiPersonaService'] = ResolversParentTypes['AiPersonaService'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  bodyOfKnowledgeID?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  bodyOfKnowledgeLastUpdated?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  bodyOfKnowledgeType?: Resolver<
    ResolversTypes['AiPersonaBodyOfKnowledgeType'],
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  dataAccessMode?: Resolver<
    ResolversTypes['AiPersonaDataAccessMode'],
    ParentType,
    ContextType
  >;
  engine?: Resolver<ResolversTypes['AiPersonaEngine'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  prompt?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AiServerResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['AiServer'] = ResolversParentTypes['AiServer'],
> = {
  aiPersonaService?: Resolver<
    ResolversTypes['AiPersonaService'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.AiServerAiPersonaServiceArgs, 'ID'>
  >;
  aiPersonaServices?: Resolver<
    Array<ResolversTypes['AiPersonaService']>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  defaultAiPersonaService?: Resolver<
    ResolversTypes['AiPersonaService'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApplicationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Application'] = ResolversParentTypes['Application'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  contributor?: Resolver<
    ResolversTypes['Contributor'],
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isFinalized?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lifecycle?: Resolver<ResolversTypes['Lifecycle'], ParentType, ContextType>;
  nextEvents?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  questions?: Resolver<
    Array<ResolversTypes['Question']>,
    ParentType,
    ContextType
  >;
  state?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuthenticationConfigResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['AuthenticationConfig'] = ResolversParentTypes['AuthenticationConfig'],
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
  ParentType extends
    ResolversParentTypes['AuthenticationProviderConfig'] = ResolversParentTypes['AuthenticationProviderConfig'],
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
  ParentType extends
    ResolversParentTypes['AuthenticationProviderConfigUnion'] = ResolversParentTypes['AuthenticationProviderConfigUnion'],
> = {
  __resolveType: TypeResolveFn<'OryConfig', ParentType, ContextType>;
};

export type AuthorizationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Authorization'] = ResolversParentTypes['Authorization'],
> = {
  anonymousReadAccess?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  credentialRules?: Resolver<
    SchemaTypes.Maybe<
      Array<ResolversTypes['AuthorizationPolicyRuleCredential']>
    >,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  myPrivileges?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType
  >;
  privilegeRules?: Resolver<
    SchemaTypes.Maybe<
      Array<ResolversTypes['AuthorizationPolicyRulePrivilege']>
    >,
    ParentType,
    ContextType
  >;
  type?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['AuthorizationPolicyType']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  verifiedCredentialRules?: Resolver<
    SchemaTypes.Maybe<
      Array<ResolversTypes['AuthorizationPolicyRuleVerifiedCredential']>
    >,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuthorizationPolicyRuleCredentialResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['AuthorizationPolicyRuleCredential'] = ResolversParentTypes['AuthorizationPolicyRuleCredential'],
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
  name?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuthorizationPolicyRulePrivilegeResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['AuthorizationPolicyRulePrivilege'] = ResolversParentTypes['AuthorizationPolicyRulePrivilege'],
> = {
  grantedPrivileges?: Resolver<
    Array<ResolversTypes['AuthorizationPrivilege']>,
    ParentType,
    ContextType
  >;
  name?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  sourcePrivilege?: Resolver<
    ResolversTypes['AuthorizationPrivilege'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AuthorizationPolicyRuleVerifiedCredentialResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['AuthorizationPolicyRuleVerifiedCredential'] = ResolversParentTypes['AuthorizationPolicyRuleVerifiedCredential'],
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

export type CalendarResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Calendar'] = ResolversParentTypes['Calendar'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  event?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CalendarEvent']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.CalendarEventArgs, 'ID'>
  >;
  events?: Resolver<
    Array<ResolversTypes['CalendarEvent']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CalendarEventResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CalendarEvent'] = ResolversParentTypes['CalendarEvent'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  comments?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  createdBy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  durationDays?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  durationMinutes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  multipleDays?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  startDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  subspace?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<ResolversTypes['CalendarEventType'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  visibleOnParentCalendar?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  wholeDay?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CalloutResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Callout'] = ResolversParentTypes['Callout'],
> = {
  activity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  comments?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Room']>,
    ParentType,
    ContextType
  >;
  contributionDefaults?: Resolver<
    ResolversTypes['CalloutContributionDefaults'],
    ParentType,
    ContextType
  >;
  contributionPolicy?: Resolver<
    ResolversTypes['CalloutContributionPolicy'],
    ParentType,
    ContextType
  >;
  contributions?: Resolver<
    Array<ResolversTypes['CalloutContribution']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.CalloutContributionsArgs>
  >;
  createdBy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  framing?: Resolver<ResolversTypes['CalloutFraming'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isTemplate?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  posts?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['Post']>>,
    ParentType,
    ContextType
  >;
  publishedBy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType
  >;
  publishedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  sortOrder?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CalloutType'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  visibility?: Resolver<
    ResolversTypes['CalloutVisibility'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CalloutContributionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CalloutContribution'] = ResolversParentTypes['CalloutContribution'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdBy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  link?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Link']>,
    ParentType,
    ContextType
  >;
  post?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Post']>,
    ParentType,
    ContextType
  >;
  sortOrder?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  whiteboard?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Whiteboard']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CalloutContributionDefaultsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CalloutContributionDefaults'] = ResolversParentTypes['CalloutContributionDefaults'],
> = {
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  postDescription?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  whiteboardContent?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['WhiteboardContent']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CalloutContributionPolicyResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CalloutContributionPolicy'] = ResolversParentTypes['CalloutContributionPolicy'],
> = {
  allowedContributionTypes?: Resolver<
    Array<ResolversTypes['CalloutContributionType']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['CalloutState'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CalloutFramingResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CalloutFraming'] = ResolversParentTypes['CalloutFraming'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  whiteboard?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Whiteboard']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CalloutGroupResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CalloutGroup'] = ResolversParentTypes['CalloutGroup'],
> = {
  description?: Resolver<ResolversTypes['Markdown'], ParentType, ContextType>;
  displayName?: Resolver<
    ResolversTypes['CalloutGroupName'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CalloutPostCreatedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CalloutPostCreated'] = ResolversParentTypes['CalloutPostCreated'],
> = {
  calloutID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  contributionID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  post?: Resolver<ResolversTypes['Post'], ParentType, ContextType>;
  sortOrder?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CollaborationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Collaboration'] = ResolversParentTypes['Collaboration'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  callouts?: Resolver<
    Array<ResolversTypes['Callout']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.CollaborationCalloutsArgs>
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  groups?: Resolver<
    Array<ResolversTypes['CalloutGroup']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  innovationFlow?: Resolver<
    ResolversTypes['InnovationFlow'],
    ParentType,
    ContextType
  >;
  isTemplate?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  license?: Resolver<ResolversTypes['License'], ParentType, ContextType>;
  tagsetTemplates?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['TagsetTemplate']>>,
    ParentType,
    ContextType
  >;
  timeline?: Resolver<ResolversTypes['Timeline'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunicationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Communication'] = ResolversParentTypes['Communication'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  updates?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunicationAdminMembershipResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CommunicationAdminMembershipResult'] = ResolversParentTypes['CommunicationAdminMembershipResult'],
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
  ParentType extends
    ResolversParentTypes['CommunicationAdminOrphanedUsageResult'] = ResolversParentTypes['CommunicationAdminOrphanedUsageResult'],
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
  ParentType extends
    ResolversParentTypes['CommunicationAdminRoomMembershipResult'] = ResolversParentTypes['CommunicationAdminRoomMembershipResult'],
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
  ParentType extends
    ResolversParentTypes['CommunicationAdminRoomResult'] = ResolversParentTypes['CommunicationAdminRoomResult'],
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunicationRoomResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CommunicationRoom'] = ResolversParentTypes['CommunicationRoom'],
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
  ParentType extends
    ResolversParentTypes['Community'] = ResolversParentTypes['Community'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  communication?: Resolver<
    ResolversTypes['Communication'],
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  group?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.CommunityGroupArgs, 'ID'>
  >;
  groups?: Resolver<
    Array<ResolversTypes['UserGroup']>,
    ParentType,
    ContextType
  >;
  guidelines?: Resolver<
    ResolversTypes['CommunityGuidelines'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  roleSet?: Resolver<ResolversTypes['RoleSet'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunityApplicationForRoleResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CommunityApplicationForRoleResult'] = ResolversParentTypes['CommunityApplicationForRoleResult'],
> = {
  communityID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  spaceID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  spaceLevel?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunityApplicationResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CommunityApplicationResult'] = ResolversParentTypes['CommunityApplicationResult'],
> = {
  application?: Resolver<
    ResolversTypes['Application'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  spacePendingMembershipInfo?: Resolver<
    ResolversTypes['SpacePendingMembershipInfo'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunityGuidelinesResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CommunityGuidelines'] = ResolversParentTypes['CommunityGuidelines'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunityInvitationForRoleResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CommunityInvitationForRoleResult'] = ResolversParentTypes['CommunityInvitationForRoleResult'],
> = {
  communityID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  contributorID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  contributorType?: Resolver<
    ResolversTypes['CommunityContributorType'],
    ParentType,
    ContextType
  >;
  createdBy?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  spaceID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  spaceLevel?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  welcomeMessage?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunityInvitationResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CommunityInvitationResult'] = ResolversParentTypes['CommunityInvitationResult'],
> = {
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  invitation?: Resolver<ResolversTypes['Invitation'], ParentType, ContextType>;
  spacePendingMembershipInfo?: Resolver<
    ResolversTypes['SpacePendingMembershipInfo'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommunityMembershipResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CommunityMembershipResult'] = ResolversParentTypes['CommunityMembershipResult'],
> = {
  childMemberships?: Resolver<
    Array<ResolversTypes['CommunityMembershipResult']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  space?: Resolver<ResolversTypes['Space'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ConfigResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Config'] = ResolversParentTypes['Config'],
> = {
  apm?: Resolver<ResolversTypes['APM'], ParentType, ContextType>;
  authentication?: Resolver<
    ResolversTypes['AuthenticationConfig'],
    ParentType,
    ContextType
  >;
  defaultVisualTypeConstraints?: Resolver<
    ResolversTypes['VisualConstraints'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.ConfigDefaultVisualTypeConstraintsArgs, 'type'>
  >;
  featureFlags?: Resolver<
    Array<ResolversTypes['PlatformFeatureFlag']>,
    ParentType,
    ContextType
  >;
  geo?: Resolver<ResolversTypes['Geo'], ParentType, ContextType>;
  locations?: Resolver<
    ResolversTypes['PlatformLocations'],
    ParentType,
    ContextType
  >;
  sentry?: Resolver<ResolversTypes['Sentry'], ParentType, ContextType>;
  storage?: Resolver<ResolversTypes['StorageConfig'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ContextResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Context'] = ResolversParentTypes['Context'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  impact?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  vision?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  who?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ContributorResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Contributor'] = ResolversParentTypes['Contributor'],
> = {
  __resolveType: TypeResolveFn<
    'Organization' | 'User' | 'VirtualContributor',
    ParentType,
    ContextType
  >;
  agent?: Resolver<ResolversTypes['Agent'], ParentType, ContextType>;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
};

export type ContributorRolePolicyResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ContributorRolePolicy'] = ResolversParentTypes['ContributorRolePolicy'],
> = {
  maximum?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  minimum?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ContributorRolesResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ContributorRoles'] = ResolversParentTypes['ContributorRoles'],
> = {
  applications?: Resolver<
    Array<ResolversTypes['CommunityApplicationForRoleResult']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.ContributorRolesApplicationsArgs>
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  invitations?: Resolver<
    Array<ResolversTypes['CommunityInvitationForRoleResult']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.ContributorRolesInvitationsArgs>
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

export type CreateCalloutContributionDefaultsDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateCalloutContributionDefaultsData'] = ResolversParentTypes['CreateCalloutContributionDefaultsData'],
> = {
  postDescription?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  whiteboardContent?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['WhiteboardContent']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateCalloutContributionPolicyDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateCalloutContributionPolicyData'] = ResolversParentTypes['CreateCalloutContributionPolicyData'],
> = {
  state?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CalloutState']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateCalloutDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateCalloutData'] = ResolversParentTypes['CreateCalloutData'],
> = {
  contributionDefaults?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CreateCalloutContributionDefaultsData']>,
    ParentType,
    ContextType
  >;
  contributionPolicy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CreateCalloutContributionPolicyData']>,
    ParentType,
    ContextType
  >;
  enableComments?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >;
  framing?: Resolver<
    ResolversTypes['CreateCalloutFramingData'],
    ParentType,
    ContextType
  >;
  groupName?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  nameID?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['NameID']>,
    ParentType,
    ContextType
  >;
  sendNotification?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Boolean']>,
    ParentType,
    ContextType
  >;
  sortOrder?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<ResolversTypes['CalloutType'], ParentType, ContextType>;
  visibility?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CalloutVisibility']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateCalloutFramingDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateCalloutFramingData'] = ResolversParentTypes['CreateCalloutFramingData'],
> = {
  profile?: Resolver<
    ResolversTypes['CreateProfileData'],
    ParentType,
    ContextType
  >;
  tags?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['String']>>,
    ParentType,
    ContextType
  >;
  whiteboard?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CreateWhiteboardData']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateCollaborationDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateCollaborationData'] = ResolversParentTypes['CreateCollaborationData'],
> = {
  calloutsData?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['CreateCalloutData']>>,
    ParentType,
    ContextType
  >;
  innovationFlowData?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CreateInnovationFlowData']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateCommunityGuidelinesDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateCommunityGuidelinesData'] = ResolversParentTypes['CreateCommunityGuidelinesData'],
> = {
  profile?: Resolver<
    ResolversTypes['CreateProfileData'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateInnovationFlowDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateInnovationFlowData'] = ResolversParentTypes['CreateInnovationFlowData'],
> = {
  profile?: Resolver<
    ResolversTypes['CreateProfileData'],
    ParentType,
    ContextType
  >;
  states?: Resolver<
    Array<ResolversTypes['CreateInnovationFlowStateData']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateInnovationFlowStateDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateInnovationFlowStateData'] = ResolversParentTypes['CreateInnovationFlowStateData'],
> = {
  description?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateLocationDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateLocationData'] = ResolversParentTypes['CreateLocationData'],
> = {
  addressLine1?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  addressLine2?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  city?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  country?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  postalCode?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  stateOrProvince?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateProfileDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateProfileData'] = ResolversParentTypes['CreateProfileData'],
> = {
  avatarURL?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  location?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CreateLocationData']>,
    ParentType,
    ContextType
  >;
  referencesData?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['CreateReferenceData']>>,
    ParentType,
    ContextType
  >;
  tagline?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  tagsets?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['CreateTagsetData']>>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateReferenceDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateReferenceData'] = ResolversParentTypes['CreateReferenceData'],
> = {
  description?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  uri?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateTagsetDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateTagsetData'] = ResolversParentTypes['CreateTagsetData'],
> = {
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['String']>>,
    ParentType,
    ContextType
  >;
  type?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['TagsetType']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CreateWhiteboardDataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CreateWhiteboardData'] = ResolversParentTypes['CreateWhiteboardData'],
> = {
  content?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['WhiteboardContent']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CredentialResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Credential'] = ResolversParentTypes['Credential'],
> = {
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  expires?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  issuer?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  resourceID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CredentialType'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CredentialDefinitionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CredentialDefinition'] = ResolversParentTypes['CredentialDefinition'],
> = {
  resourceID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CredentialMetadataOutputResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['CredentialMetadataOutput'] = ResolversParentTypes['CredentialMetadataOutput'],
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
  ParentType extends
    ResolversParentTypes['DirectRoom'] = ResolversParentTypes['DirectRoom'],
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messages?: Resolver<
    Array<ResolversTypes['Message']>,
    ParentType,
    ContextType
  >;
  receiverID?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DiscussionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Discussion'] = ResolversParentTypes['Discussion'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  category?: Resolver<
    ResolversTypes['ForumDiscussionCategory'],
    ParentType,
    ContextType
  >;
  comments?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  createdBy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  privacy?: Resolver<
    ResolversTypes['ForumDiscussionPrivacy'],
    ParentType,
    ContextType
  >;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  timestamp?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type DocumentResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Document'] = ResolversParentTypes['Document'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdBy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  mimeType?: Resolver<ResolversTypes['MimeType'], ParentType, ContextType>;
  size?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  tagset?: Resolver<ResolversTypes['Tagset'], ParentType, ContextType>;
  temporaryLocation?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  uploadedDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type EcosystemModelResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['EcosystemModel'] = ResolversParentTypes['EcosystemModel'],
> = {
  actorGroups?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['ActorGroup']>>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface EmojiScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['Emoji'], any> {
  name: 'Emoji';
}

export type FileStorageConfigResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['FileStorageConfig'] = ResolversParentTypes['FileStorageConfig'],
> = {
  maxFileSize?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FormResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Form'] = ResolversParentTypes['Form'],
> = {
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  questions?: Resolver<
    Array<ResolversTypes['FormQuestion']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type FormQuestionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['FormQuestion'] = ResolversParentTypes['FormQuestion'],
> = {
  explanation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  maxLength?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  question?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  required?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sortOrder?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ForumResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Forum'] = ResolversParentTypes['Forum'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  discussion?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Discussion']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.ForumDiscussionArgs, 'ID'>
  >;
  discussionCategories?: Resolver<
    Array<ResolversTypes['ForumDiscussionCategory']>,
    ParentType,
    ContextType
  >;
  discussions?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['Discussion']>>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.ForumDiscussionsArgs>
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type GeoResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['Geo'] = ResolversParentTypes['Geo'],
> = {
  endpoint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type GroupableResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Groupable'] = ResolversParentTypes['Groupable'],
> = {
  __resolveType: TypeResolveFn<
    'Community' | 'Organization',
    ParentType,
    ContextType
  >;
  groups?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['UserGroup']>>,
    ParentType,
    ContextType
  >;
};

export type ISearchResultsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ISearchResults'] = ResolversParentTypes['ISearchResults'],
> = {
  calloutResults?: Resolver<
    Array<ResolversTypes['SearchResult']>,
    ParentType,
    ContextType
  >;
  calloutResultsCount?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
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

export type InAppNotificationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['InAppNotification'] = ResolversParentTypes['InAppNotification'],
> = {
  __resolveType: TypeResolveFn<
    | 'InAppNotificationCalloutPublished'
    | 'InAppNotificationCommunityNewMember'
    | 'InAppNotificationUserMentioned',
    ParentType,
    ContextType
  >;
  category?: Resolver<
    ResolversTypes['InAppNotificationCategory'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  receiver?: Resolver<ResolversTypes['Contributor'], ParentType, ContextType>;
  state?: Resolver<
    ResolversTypes['InAppNotificationState'],
    ParentType,
    ContextType
  >;
  triggeredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  triggeredBy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Contributor']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<
    ResolversTypes['NotificationEventType'],
    ParentType,
    ContextType
  >;
};

export type InAppNotificationCalloutPublishedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['InAppNotificationCalloutPublished'] = ResolversParentTypes['InAppNotificationCalloutPublished'],
> = {
  callout?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Callout']>,
    ParentType,
    ContextType
  >;
  category?: Resolver<
    ResolversTypes['InAppNotificationCategory'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  receiver?: Resolver<ResolversTypes['Contributor'], ParentType, ContextType>;
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  state?: Resolver<
    ResolversTypes['InAppNotificationState'],
    ParentType,
    ContextType
  >;
  triggeredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  triggeredBy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Contributor']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<
    ResolversTypes['NotificationEventType'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InAppNotificationCommunityNewMemberResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['InAppNotificationCommunityNewMember'] = ResolversParentTypes['InAppNotificationCommunityNewMember'],
> = {
  actor?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Contributor']>,
    ParentType,
    ContextType
  >;
  category?: Resolver<
    ResolversTypes['InAppNotificationCategory'],
    ParentType,
    ContextType
  >;
  contributorType?: Resolver<
    ResolversTypes['CommunityContributorType'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  receiver?: Resolver<ResolversTypes['Contributor'], ParentType, ContextType>;
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  state?: Resolver<
    ResolversTypes['InAppNotificationState'],
    ParentType,
    ContextType
  >;
  triggeredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  triggeredBy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Contributor']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<
    ResolversTypes['NotificationEventType'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InAppNotificationUserMentionedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['InAppNotificationUserMentioned'] = ResolversParentTypes['InAppNotificationUserMentioned'],
> = {
  category?: Resolver<
    ResolversTypes['InAppNotificationCategory'],
    ParentType,
    ContextType
  >;
  comment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  commentOriginName?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  commentUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  contributorType?: Resolver<
    ResolversTypes['CommunityContributorType'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  receiver?: Resolver<ResolversTypes['Contributor'], ParentType, ContextType>;
  state?: Resolver<
    ResolversTypes['InAppNotificationState'],
    ParentType,
    ContextType
  >;
  triggeredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  triggeredBy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Contributor']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<
    ResolversTypes['NotificationEventType'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InnovationFlowResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['InnovationFlow'] = ResolversParentTypes['InnovationFlow'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  currentState?: Resolver<
    ResolversTypes['InnovationFlowState'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  states?: Resolver<
    Array<ResolversTypes['InnovationFlowState']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InnovationFlowStateResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['InnovationFlowState'] = ResolversParentTypes['InnovationFlowState'],
> = {
  description?: Resolver<ResolversTypes['Markdown'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InnovationHubResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['InnovationHub'] = ResolversParentTypes['InnovationHub'],
> = {
  account?: Resolver<ResolversTypes['Account'], ParentType, ContextType>;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  listedInStore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['Contributor'], ParentType, ContextType>;
  searchVisibility?: Resolver<
    ResolversTypes['SearchVisibility'],
    ParentType,
    ContextType
  >;
  spaceListFilter?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['Space']>>,
    ParentType,
    ContextType
  >;
  spaceVisibilityFilter?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['SpaceVisibility']>,
    ParentType,
    ContextType
  >;
  subdomain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['InnovationHubType'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InnovationPackResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['InnovationPack'] = ResolversParentTypes['InnovationPack'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  listedInStore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['Contributor'], ParentType, ContextType>;
  searchVisibility?: Resolver<
    ResolversTypes['SearchVisibility'],
    ParentType,
    ContextType
  >;
  templatesSet?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['TemplatesSet']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InputCreatorQueryResultsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['InputCreatorQueryResults'] = ResolversParentTypes['InputCreatorQueryResults'],
> = {
  callout?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CreateCalloutData']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.InputCreatorQueryResultsCalloutArgs, 'ID'>
  >;
  collaboration?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CreateCollaborationData']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.InputCreatorQueryResultsCollaborationArgs, 'ID'>
  >;
  communityGuidelines?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CreateCommunityGuidelinesData']>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.InputCreatorQueryResultsCommunityGuidelinesArgs,
      'ID'
    >
  >;
  innovationFlow?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CreateInnovationFlowData']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.InputCreatorQueryResultsInnovationFlowArgs, 'ID'>
  >;
  whiteboard?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CreateWhiteboardData']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.InputCreatorQueryResultsWhiteboardArgs, 'ID'>
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type InvitationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Invitation'] = ResolversParentTypes['Invitation'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  contributor?: Resolver<
    ResolversTypes['Contributor'],
    ParentType,
    ContextType
  >;
  contributorType?: Resolver<
    ResolversTypes['CommunityContributorType'],
    ParentType,
    ContextType
  >;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  extraRole?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['RoleName']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  invitedToParent?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  isFinalized?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lifecycle?: Resolver<ResolversTypes['Lifecycle'], ParentType, ContextType>;
  nextEvents?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  state?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  welcomeMessage?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface JsonScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type LatestReleaseDiscussionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['LatestReleaseDiscussion'] = ResolversParentTypes['LatestReleaseDiscussion'],
> = {
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LibraryResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Library'] = ResolversParentTypes['Library'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  innovationHubs?: Resolver<
    Array<ResolversTypes['InnovationHub']>,
    ParentType,
    ContextType
  >;
  innovationPacks?: Resolver<
    Array<ResolversTypes['InnovationPack']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.LibraryInnovationPacksArgs>
  >;
  templates?: Resolver<
    Array<ResolversTypes['TemplateResult']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.LibraryTemplatesArgs>
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  virtualContributors?: Resolver<
    Array<ResolversTypes['VirtualContributor']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LicenseResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['License'] = ResolversParentTypes['License'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  availableEntitlements?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['LicenseEntitlementType']>>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  entitlements?: Resolver<
    Array<ResolversTypes['LicenseEntitlement']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  type?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['LicenseType']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LicenseEntitlementResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['LicenseEntitlement'] = ResolversParentTypes['LicenseEntitlement'],
> = {
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  dataType?: Resolver<
    ResolversTypes['LicenseEntitlementDataType'],
    ParentType,
    ContextType
  >;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isAvailable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  limit?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  type?: Resolver<
    ResolversTypes['LicenseEntitlementType'],
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  usage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LicensePlanResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['LicensePlan'] = ResolversParentTypes['LicensePlan'],
> = {
  assignToNewOrganizationAccounts?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  assignToNewUserAccounts?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isFree?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  licenseCredential?: Resolver<
    ResolversTypes['LicensingCredentialBasedCredentialType'],
    ParentType,
    ContextType
  >;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pricePerMonth?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  requiresContactSupport?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  requiresPaymentMethod?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  sortOrder?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  trialEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  type?: Resolver<
    ResolversTypes['LicensingCredentialBasedPlanType'],
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LicensePolicyResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['LicensePolicy'] = ResolversParentTypes['LicensePolicy'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  credentialRules?: Resolver<
    Array<ResolversTypes['LicensingCredentialBasedPolicyCredentialRule']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LicensingResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Licensing'] = ResolversParentTypes['Licensing'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  plans?: Resolver<
    Array<ResolversTypes['LicensePlan']>,
    ParentType,
    ContextType
  >;
  policy?: Resolver<ResolversTypes['LicensePolicy'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LicensingCredentialBasedPolicyCredentialRuleResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['LicensingCredentialBasedPolicyCredentialRule'] = ResolversParentTypes['LicensingCredentialBasedPolicyCredentialRule'],
> = {
  credentialType?: Resolver<
    ResolversTypes['LicensingCredentialBasedCredentialType'],
    ParentType,
    ContextType
  >;
  grantedEntitlements?: Resolver<
    Array<ResolversTypes['LicensingGrantedEntitlement']>,
    ParentType,
    ContextType
  >;
  name?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LicensingGrantedEntitlementResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['LicensingGrantedEntitlement'] = ResolversParentTypes['LicensingGrantedEntitlement'],
> = {
  limit?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  type?: Resolver<
    ResolversTypes['LicenseEntitlementType'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LifecycleResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Lifecycle'] = ResolversParentTypes['Lifecycle'],
> = {
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface LifecycleDefinitionScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['LifecycleDefinition'], any> {
  name: 'LifecycleDefinition';
}

export type LinkResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Link'] = ResolversParentTypes['Link'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  uri?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LocationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Location'] = ResolversParentTypes['Location'],
> = {
  addressLine1?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  addressLine2?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  city?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  country?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  postalCode?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  stateOrProvince?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LookupByNameQueryResultsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['LookupByNameQueryResults'] = ResolversParentTypes['LookupByNameQueryResults'],
> = {
  innovationPack?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['InnovationPack']>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupByNameQueryResultsInnovationPackArgs,
      'NAMEID'
    >
  >;
  template?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Template']>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupByNameQueryResultsTemplateArgs,
      'NAMEID' | 'templatesSetID'
    >
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LookupMyPrivilegesQueryResultsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['LookupMyPrivilegesQueryResults'] = ResolversParentTypes['LookupMyPrivilegesQueryResults'],
> = {
  account?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsAccountArgs, 'ID'>
  >;
  application?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsApplicationArgs,
      'ID'
    >
  >;
  calendar?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsCalendarArgs, 'ID'>
  >;
  calendarEvent?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsCalendarEventArgs,
      'ID'
    >
  >;
  callout?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsCalloutArgs, 'ID'>
  >;
  collaboration?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsCollaborationArgs,
      'ID'
    >
  >;
  community?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsCommunityArgs, 'ID'>
  >;
  communityGuidelines?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsCommunityGuidelinesArgs,
      'ID'
    >
  >;
  context?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsContextArgs, 'ID'>
  >;
  document?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsDocumentArgs, 'ID'>
  >;
  innovationFlow?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsInnovationFlowArgs,
      'ID'
    >
  >;
  innovationHub?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsInnovationHubArgs,
      'ID'
    >
  >;
  innovationPack?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsInnovationPackArgs,
      'ID'
    >
  >;
  invitation?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsInvitationArgs,
      'ID'
    >
  >;
  license?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsLicenseArgs, 'ID'>
  >;
  post?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsPostArgs, 'ID'>
  >;
  profile?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsProfileArgs, 'ID'>
  >;
  roleSet?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsRoleSetArgs, 'ID'>
  >;
  room?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsRoomArgs, 'ID'>
  >;
  space?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsSpaceArgs, 'ID'>
  >;
  storageAggregator?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsStorageAggregatorArgs,
      'ID'
    >
  >;
  storageBucket?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsStorageBucketArgs,
      'ID'
    >
  >;
  template?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsTemplateArgs, 'ID'>
  >;
  templatesManager?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsTemplatesManagerArgs,
      'ID'
    >
  >;
  templatesSet?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsTemplatesSetArgs,
      'ID'
    >
  >;
  user?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupMyPrivilegesQueryResultsUserArgs, 'ID'>
  >;
  virtualContributor?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsVirtualContributorArgs,
      'ID'
    >
  >;
  whiteboard?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupMyPrivilegesQueryResultsWhiteboardArgs,
      'ID'
    >
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type LookupQueryResultsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['LookupQueryResults'] = ResolversParentTypes['LookupQueryResults'],
> = {
  account?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Account']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsAccountArgs, 'ID'>
  >;
  application?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Application']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsApplicationArgs, 'ID'>
  >;
  authorizationPolicy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsAuthorizationPolicyArgs, 'ID'>
  >;
  authorizationPrivilegesForUser?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['AuthorizationPrivilege']>>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.LookupQueryResultsAuthorizationPrivilegesForUserArgs,
      'authorizationPolicyID' | 'userID'
    >
  >;
  calendar?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Calendar']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsCalendarArgs, 'ID'>
  >;
  calendarEvent?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CalendarEvent']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsCalendarEventArgs, 'ID'>
  >;
  callout?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Callout']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsCalloutArgs, 'ID'>
  >;
  collaboration?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Collaboration']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsCollaborationArgs, 'ID'>
  >;
  community?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Community']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsCommunityArgs, 'ID'>
  >;
  communityGuidelines?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CommunityGuidelines']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsCommunityGuidelinesArgs, 'ID'>
  >;
  context?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Context']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsContextArgs, 'ID'>
  >;
  document?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Document']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsDocumentArgs, 'ID'>
  >;
  innovationFlow?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['InnovationFlow']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsInnovationFlowArgs, 'ID'>
  >;
  innovationHub?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['InnovationHub']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsInnovationHubArgs, 'ID'>
  >;
  innovationPack?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['InnovationPack']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsInnovationPackArgs, 'ID'>
  >;
  invitation?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Invitation']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsInvitationArgs, 'ID'>
  >;
  license?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['License']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsLicenseArgs, 'ID'>
  >;
  myPrivileges?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['LookupMyPrivilegesQueryResults']>,
    ParentType,
    ContextType
  >;
  post?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Post']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsPostArgs, 'ID'>
  >;
  profile?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Profile']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsProfileArgs, 'ID'>
  >;
  roleSet?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['RoleSet']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsRoleSetArgs, 'ID'>
  >;
  room?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Room']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsRoomArgs, 'ID'>
  >;
  space?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsSpaceArgs, 'ID'>
  >;
  storageAggregator?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['StorageAggregator']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsStorageAggregatorArgs, 'ID'>
  >;
  storageBucket?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['StorageBucket']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsStorageBucketArgs, 'ID'>
  >;
  template?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Template']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsTemplateArgs, 'ID'>
  >;
  templatesManager?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['TemplatesManager']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsTemplatesManagerArgs, 'ID'>
  >;
  templatesSet?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['TemplatesSet']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsTemplatesSetArgs, 'ID'>
  >;
  user?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsUserArgs, 'ID'>
  >;
  virtualContributor?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['VirtualContributor']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsVirtualContributorArgs, 'ID'>
  >;
  whiteboard?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Whiteboard']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.LookupQueryResultsWhiteboardArgs, 'ID'>
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface MarkdownScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['Markdown'], any> {
  name: 'Markdown';
}

export type MeQueryResultsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['MeQueryResults'] = ResolversParentTypes['MeQueryResults'],
> = {
  communityApplications?: Resolver<
    Array<ResolversTypes['CommunityApplicationResult']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.MeQueryResultsCommunityApplicationsArgs>
  >;
  communityInvitations?: Resolver<
    Array<ResolversTypes['CommunityInvitationResult']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.MeQueryResultsCommunityInvitationsArgs>
  >;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mySpaces?: Resolver<
    Array<ResolversTypes['MySpaceResults']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.MeQueryResultsMySpacesArgs>
  >;
  spaceMembershipsFlat?: Resolver<
    Array<ResolversTypes['CommunityMembershipResult']>,
    ParentType,
    ContextType
  >;
  spaceMembershipsHierarchical?: Resolver<
    Array<ResolversTypes['CommunityMembershipResult']>,
    ParentType,
    ContextType
  >;
  user?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MessageResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Message'] = ResolversParentTypes['Message'],
> = {
  id?: Resolver<ResolversTypes['MessageID'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['Markdown'], ParentType, ContextType>;
  reactions?: Resolver<
    Array<ResolversTypes['Reaction']>,
    ParentType,
    ContextType
  >;
  sender?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Contributor']>,
    ParentType,
    ContextType
  >;
  threadID?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  timestamp?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MessageAnswerQuestionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['MessageAnswerQuestion'] = ResolversParentTypes['MessageAnswerQuestion'],
> = {
  error?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  question?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface MessageIdScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['MessageID'], any> {
  name: 'MessageID';
}

export type MetadataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Metadata'] = ResolversParentTypes['Metadata'],
> = {
  services?: Resolver<
    Array<ResolversTypes['ServiceMetadata']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MigrateEmbeddingsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['MigrateEmbeddings'] = ResolversParentTypes['MigrateEmbeddings'],
> = {
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type MutationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation'],
> = {
  addReactionToMessageInRoom?: Resolver<
    ResolversTypes['Reaction'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAddReactionToMessageInRoomArgs,
      'reactionData'
    >
  >;
  adminCommunicationEnsureAccessToCommunications?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAdminCommunicationEnsureAccessToCommunicationsArgs,
      'communicationData'
    >
  >;
  adminCommunicationRemoveOrphanedRoom?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAdminCommunicationRemoveOrphanedRoomArgs,
      'orphanedRoomData'
    >
  >;
  adminCommunicationUpdateRoomState?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAdminCommunicationUpdateRoomStateArgs,
      'roomStateData'
    >
  >;
  adminSearchIngestFromScratch?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  adminUpdateContributorAvatars?: Resolver<
    ResolversTypes['Profile'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAdminUpdateContributorAvatarsArgs,
      'profileID'
    >
  >;
  adminUserAccountDelete?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationAdminUserAccountDeleteArgs, 'userID'>
  >;
  adminWingbackCreateTestCustomer?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  adminWingbackGetCustomerEntitlements?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAdminWingbackGetCustomerEntitlementsArgs,
      'customerID'
    >
  >;
  aiServerAuthorizationPolicyReset?: Resolver<
    ResolversTypes['AiServer'],
    ParentType,
    ContextType
  >;
  aiServerCreateAiPersonaService?: Resolver<
    ResolversTypes['AiPersonaService'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAiServerCreateAiPersonaServiceArgs,
      'aiPersonaServiceData'
    >
  >;
  aiServerDeleteAiPersonaService?: Resolver<
    ResolversTypes['AiPersonaService'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAiServerDeleteAiPersonaServiceArgs,
      'deleteData'
    >
  >;
  aiServerPersonaServiceIngest?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAiServerPersonaServiceIngestArgs,
      'ingestData'
    >
  >;
  aiServerUpdateAiPersonaService?: Resolver<
    ResolversTypes['AiPersonaService'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAiServerUpdateAiPersonaServiceArgs,
      'aiPersonaServiceData'
    >
  >;
  applyForEntryRoleOnRoleSet?: Resolver<
    ResolversTypes['Application'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationApplyForEntryRoleOnRoleSetArgs,
      'applicationData'
    >
  >;
  askChatGuidanceQuestion?: Resolver<
    ResolversTypes['MessageAnswerQuestion'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationAskChatGuidanceQuestionArgs, 'chatData'>
  >;
  assignLicensePlanToAccount?: Resolver<
    ResolversTypes['Account'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAssignLicensePlanToAccountArgs,
      'planData'
    >
  >;
  assignLicensePlanToSpace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationAssignLicensePlanToSpaceArgs, 'planData'>
  >;
  assignRoleToUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationassignRoleToUserArgs,
      'roleData'
    >
  >;
  assignRoleNameToUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAssignRoleNameToUserArgs,
      'roleData'
    >
  >;
  assignRoleToOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationAssignRoleToOrganizationArgs, 'roleData'>
  >;
  assignRoleToUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationAssignRoleToUserArgs, 'roleData'>
  >;
  assignRoleToVirtualContributor?: Resolver<
    ResolversTypes['VirtualContributor'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAssignRoleToVirtualContributorArgs,
      'roleData'
    >
  >;
  assignUserToGroup?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationAssignUserToGroupArgs, 'roleData'>
  >;
  authorizationPolicyResetAll?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  authorizationPolicyResetOnAccount?: Resolver<
    ResolversTypes['Account'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAuthorizationPolicyResetOnAccountArgs,
      'authorizationResetData'
    >
  >;
  authorizationPolicyResetOnOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAuthorizationPolicyResetOnOrganizationArgs,
      'authorizationResetData'
    >
  >;
  authorizationPolicyResetOnPlatform?: Resolver<
    ResolversTypes['Platform'],
    ParentType,
    ContextType
  >;
  authorizationPolicyResetOnUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAuthorizationPolicyResetOnUserArgs,
      'authorizationResetData'
    >
  >;
  authorizationPolicyResetToGlobalAdminsAccess?: Resolver<
    ResolversTypes['Authorization'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationAuthorizationPolicyResetToGlobalAdminsAccessArgs,
      'authorizationID'
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
      SchemaTypes.MutationBeginCommunityMemberVerifiedCredentialOfferInteractionArgs,
      'communityID'
    >
  >;
  beginVerifiedCredentialRequestInteraction?: Resolver<
    ResolversTypes['AgentBeginVerifiedCredentialRequestOutput'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationBeginVerifiedCredentialRequestInteractionArgs,
      'types'
    >
  >;
  cleanupCollections?: Resolver<
    ResolversTypes['MigrateEmbeddings'],
    ParentType,
    ContextType
  >;
  convertChallengeToSpace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationConvertChallengeToSpaceArgs,
      'convertData'
    >
  >;
  convertOpportunityToChallenge?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationConvertOpportunityToChallengeArgs,
      'convertData'
    >
  >;
  createActor?: Resolver<
    ResolversTypes['Actor'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationCreateActorArgs, 'actorData'>
  >;
  createActorGroup?: Resolver<
    ResolversTypes['ActorGroup'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationCreateActorGroupArgs, 'actorGroupData'>
  >;
  createCalloutOnCollaboration?: Resolver<
    ResolversTypes['Callout'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationCreateCalloutOnCollaborationArgs,
      'calloutData'
    >
  >;
  createChatGuidanceRoom?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Room']>,
    ParentType,
    ContextType
  >;
  createContributionOnCallout?: Resolver<
    ResolversTypes['CalloutContribution'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationCreateContributionOnCalloutArgs,
      'contributionData'
    >
  >;
  createDiscussion?: Resolver<
    ResolversTypes['Discussion'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationCreateDiscussionArgs, 'createData'>
  >;
  createEventOnCalendar?: Resolver<
    ResolversTypes['CalendarEvent'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationCreateEventOnCalendarArgs, 'eventData'>
  >;
  createGroupOnCommunity?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationCreateGroupOnCommunityArgs, 'groupData'>
  >;
  createGroupOnOrganization?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationCreateGroupOnOrganizationArgs,
      'groupData'
    >
  >;
  createInnovationHub?: Resolver<
    ResolversTypes['InnovationHub'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationCreateInnovationHubArgs, 'createData'>
  >;
  createInnovationPack?: Resolver<
    ResolversTypes['InnovationPack'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationCreateInnovationPackArgs,
      'innovationPackData'
    >
  >;
  createLicensePlan?: Resolver<
    ResolversTypes['LicensePlan'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationCreateLicensePlanArgs, 'planData'>
  >;
  createOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationCreateOrganizationArgs,
      'organizationData'
    >
  >;
  createReferenceOnProfile?: Resolver<
    ResolversTypes['Reference'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationCreateReferenceOnProfileArgs,
      'referenceInput'
    >
  >;
  createSpace?: Resolver<
    ResolversTypes['Account'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationCreateSpaceArgs, 'spaceData'>
  >;
  createSubspace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationCreateSubspaceArgs, 'subspaceData'>
  >;
  createTagsetOnProfile?: Resolver<
    ResolversTypes['Tagset'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationCreateTagsetOnProfileArgs, 'tagsetData'>
  >;
  createTemplate?: Resolver<
    ResolversTypes['Template'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationCreateTemplateArgs, 'templateData'>
  >;
  createTemplateFromCollaboration?: Resolver<
    ResolversTypes['Template'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationCreateTemplateFromCollaborationArgs,
      'templateData'
    >
  >;
  createUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationCreateUserArgs, 'userData'>
  >;
  createUserNewRegistration?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType
  >;
  createVirtualContributor?: Resolver<
    ResolversTypes['VirtualContributor'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationCreateVirtualContributorArgs,
      'virtualContributorData'
    >
  >;
  deleteActor?: Resolver<
    ResolversTypes['Actor'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteActorArgs, 'deleteData'>
  >;
  deleteActorGroup?: Resolver<
    ResolversTypes['ActorGroup'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteActorGroupArgs, 'deleteData'>
  >;
  deleteCalendarEvent?: Resolver<
    ResolversTypes['CalendarEvent'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteCalendarEventArgs, 'deleteData'>
  >;
  deleteCallout?: Resolver<
    ResolversTypes['Callout'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteCalloutArgs, 'deleteData'>
  >;
  deleteCollaboration?: Resolver<
    ResolversTypes['Collaboration'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteCollaborationArgs, 'deleteData'>
  >;
  deleteDiscussion?: Resolver<
    ResolversTypes['Discussion'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteDiscussionArgs, 'deleteData'>
  >;
  deleteDocument?: Resolver<
    ResolversTypes['Document'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteDocumentArgs, 'deleteData'>
  >;
  deleteInnovationHub?: Resolver<
    ResolversTypes['InnovationHub'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteInnovationHubArgs, 'deleteData'>
  >;
  deleteInnovationPack?: Resolver<
    ResolversTypes['InnovationPack'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteInnovationPackArgs, 'deleteData'>
  >;
  deleteInvitation?: Resolver<
    ResolversTypes['Invitation'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteInvitationArgs, 'deleteData'>
  >;
  deleteLicensePlan?: Resolver<
    ResolversTypes['LicensePlan'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteLicensePlanArgs, 'deleteData'>
  >;
  deleteLink?: Resolver<
    ResolversTypes['Link'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteLinkArgs, 'deleteData'>
  >;
  deleteOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteOrganizationArgs, 'deleteData'>
  >;
  deletePlatformInvitation?: Resolver<
    ResolversTypes['PlatformInvitation'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationDeletePlatformInvitationArgs,
      'deleteData'
    >
  >;
  deletePost?: Resolver<
    ResolversTypes['Post'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeletePostArgs, 'deleteData'>
  >;
  deleteReference?: Resolver<
    ResolversTypes['Reference'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteReferenceArgs, 'deleteData'>
  >;
  deleteSpace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteSpaceArgs, 'deleteData'>
  >;
  deleteStorageBucket?: Resolver<
    ResolversTypes['StorageBucket'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteStorageBucketArgs, 'deleteData'>
  >;
  deleteTemplate?: Resolver<
    ResolversTypes['Template'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteTemplateArgs, 'deleteData'>
  >;
  deleteUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteUserArgs, 'deleteData'>
  >;
  deleteUserApplication?: Resolver<
    ResolversTypes['Application'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteUserApplicationArgs, 'deleteData'>
  >;
  deleteUserGroup?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteUserGroupArgs, 'deleteData'>
  >;
  deleteVirtualContributor?: Resolver<
    ResolversTypes['VirtualContributor'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationDeleteVirtualContributorArgs,
      'deleteData'
    >
  >;
  deleteWhiteboard?: Resolver<
    ResolversTypes['Whiteboard'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationDeleteWhiteboardArgs, 'whiteboardData'>
  >;
  eventOnApplication?: Resolver<
    ResolversTypes['Application'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationEventOnApplicationArgs, 'eventData'>
  >;
  eventOnInvitation?: Resolver<
    ResolversTypes['Invitation'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationEventOnInvitationArgs, 'eventData'>
  >;
  eventOnOrganizationVerification?: Resolver<
    ResolversTypes['OrganizationVerification'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationEventOnOrganizationVerificationArgs,
      'eventData'
    >
  >;
  grantCredentialToOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationGrantCredentialToOrganizationArgs,
      'grantCredentialData'
    >
  >;
  grantCredentialToUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationGrantCredentialToUserArgs,
      'grantCredentialData'
    >
  >;
  ingest?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  inviteForEntryRoleOnRoleSet?: Resolver<
    Array<ResolversTypes['Invitation']>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationinviteForEntryRoleOnRoleSetArgs,
      'invitationData'
    >
  >;
  inviteUserToPlatformAndRoleSet?: Resolver<
    ResolversTypes['PlatformInvitation'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationInviteUserToPlatformAndRoleSetArgs,
      'invitationData'
    >
  >;
  inviteUserToPlatformWithRole?: Resolver<
    ResolversTypes['PlatformInvitation'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationInviteUserToPlatformWithRoleArgs,
      'invitationData'
    >
  >;
  joinRoleSet?: Resolver<
    ResolversTypes['RoleSet'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationJoinRoleSetArgs, 'joinData'>
  >;
  licenseResetOnAccount?: Resolver<
    ResolversTypes['Account'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationLicenseResetOnAccountArgs, 'resetData'>
  >;
  messageUser?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationMessageUserArgs, 'messageData'>
  >;
  moveContributionToCallout?: Resolver<
    ResolversTypes['CalloutContribution'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationMoveContributionToCalloutArgs,
      'moveContributionData'
    >
  >;
  refreshAllBodiesOfKnowledge?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  refreshVirtualContributorBodyOfKnowledge?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationRefreshVirtualContributorBodyOfKnowledgeArgs,
      'refreshData'
    >
  >;
  removeCommunityGuidelinesContent?: Resolver<
    ResolversTypes['CommunityGuidelines'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationRemoveCommunityGuidelinesContentArgs,
      'communityGuidelinesData'
    >
  >;
  removeMessageOnRoom?: Resolver<
    ResolversTypes['MessageID'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationRemoveMessageOnRoomArgs, 'messageData'>
  >;
  removeRoleNameFromUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationRemoveRoleNameFromUserArgs,
      'roleData'
    >
  >;
  removeRoleNameFromUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationRemoveRoleNameFromUserArgs,
      'roleData'
    >
  >;
  removeReactionToMessageInRoom?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationRemoveReactionToMessageInRoomArgs,
      'reactionData'
    >
  >;
  removeRoleFromOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationRemoveRoleFromOrganizationArgs,
      'roleData'
    >
  >;
  removeRoleFromUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationRemoveRoleFromUserArgs, 'roleData'>
  >;
  removeRoleFromVirtualContributor?: Resolver<
    ResolversTypes['VirtualContributor'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationRemoveRoleFromVirtualContributorArgs,
      'roleData'
    >
  >;
  removeUserFromGroup?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationRemoveUserFromGroupArgs, 'roleData'>
  >;
  resetChatGuidance?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  resetLicenseOnAccounts?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType
  >;
  revokeCredentialFromOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationRevokeCredentialFromOrganizationArgs,
      'revokeCredentialData'
    >
  >;
  revokeCredentialFromUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationRevokeCredentialFromUserArgs,
      'revokeCredentialData'
    >
  >;
  revokeLicensePlanFromAccount?: Resolver<
    ResolversTypes['Account'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationRevokeLicensePlanFromAccountArgs,
      'planData'
    >
  >;
  revokeLicensePlanFromSpace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationRevokeLicensePlanFromSpaceArgs,
      'planData'
    >
  >;
  sendMessageReplyToRoom?: Resolver<
    ResolversTypes['Message'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationSendMessageReplyToRoomArgs, 'messageData'>
  >;
  sendMessageToCommunityLeads?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationSendMessageToCommunityLeadsArgs,
      'messageData'
    >
  >;
  sendMessageToOrganization?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationSendMessageToOrganizationArgs,
      'messageData'
    >
  >;
  sendMessageToRoom?: Resolver<
    ResolversTypes['Message'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationSendMessageToRoomArgs, 'messageData'>
  >;
  sendMessageToUser?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationSendMessageToUserArgs, 'messageData'>
  >;
  transferInnovationHubToAccount?: Resolver<
    ResolversTypes['InnovationHub'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationTransferInnovationHubToAccountArgs,
      'transferData'
    >
  >;
  transferInnovationPackToAccount?: Resolver<
    ResolversTypes['InnovationPack'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationTransferInnovationPackToAccountArgs,
      'transferData'
    >
  >;
  transferSpaceToAccount?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationTransferSpaceToAccountArgs,
      'transferData'
    >
  >;
  transferVirtualContributorToAccount?: Resolver<
    ResolversTypes['InnovationPack'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationTransferVirtualContributorToAccountArgs,
      'transferData'
    >
  >;
  updateActor?: Resolver<
    ResolversTypes['Actor'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateActorArgs, 'actorData'>
  >;
  updateAiPersona?: Resolver<
    ResolversTypes['AiPersona'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateAiPersonaArgs, 'aiPersonaData'>
  >;
  updateAnswerRelevance?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateAnswerRelevanceArgs, 'input'>
  >;
  updateApplicationFormOnRoleSet?: Resolver<
    ResolversTypes['RoleSet'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateApplicationFormOnRoleSetArgs,
      'applicationFormData'
    >
  >;
  updateCalendarEvent?: Resolver<
    ResolversTypes['CalendarEvent'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateCalendarEventArgs, 'eventData'>
  >;
  updateCallout?: Resolver<
    ResolversTypes['Callout'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateCalloutArgs, 'calloutData'>
  >;
  updateCalloutPublishInfo?: Resolver<
    ResolversTypes['Callout'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateCalloutPublishInfoArgs,
      'calloutData'
    >
  >;
  updateCalloutVisibility?: Resolver<
    ResolversTypes['Callout'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateCalloutVisibilityArgs,
      'calloutData'
    >
  >;
  updateCalloutsSortOrder?: Resolver<
    Array<ResolversTypes['Callout']>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateCalloutsSortOrderArgs,
      'sortOrderData'
    >
  >;
  updateCollaborationFromTemplate?: Resolver<
    ResolversTypes['Collaboration'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateCollaborationFromTemplateArgs,
      'updateData'
    >
  >;
  updateCommunityGuidelines?: Resolver<
    ResolversTypes['CommunityGuidelines'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateCommunityGuidelinesArgs,
      'communityGuidelinesData'
    >
  >;
  updateContributionsSortOrder?: Resolver<
    Array<ResolversTypes['CalloutContribution']>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateContributionsSortOrderArgs,
      'sortOrderData'
    >
  >;
  updateDiscussion?: Resolver<
    ResolversTypes['Discussion'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateDiscussionArgs, 'updateData'>
  >;
  updateDocument?: Resolver<
    ResolversTypes['Document'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateDocumentArgs, 'documentData'>
  >;
  updateEcosystemModel?: Resolver<
    ResolversTypes['EcosystemModel'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateEcosystemModelArgs,
      'ecosystemModelData'
    >
  >;
  updateInnovationFlow?: Resolver<
    ResolversTypes['InnovationFlow'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateInnovationFlowArgs,
      'innovationFlowData'
    >
  >;
  updateInnovationFlowSelectedState?: Resolver<
    ResolversTypes['InnovationFlow'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateInnovationFlowSelectedStateArgs,
      'innovationFlowStateData'
    >
  >;
  updateInnovationFlowSingleState?: Resolver<
    ResolversTypes['InnovationFlow'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateInnovationFlowSingleStateArgs,
      'innovationFlowStateData'
    >
  >;
  updateInnovationHub?: Resolver<
    ResolversTypes['InnovationHub'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateInnovationHubArgs, 'updateData'>
  >;
  updateInnovationPack?: Resolver<
    ResolversTypes['InnovationPack'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateInnovationPackArgs,
      'innovationPackData'
    >
  >;
  updateLicensePlan?: Resolver<
    ResolversTypes['LicensePlan'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateLicensePlanArgs, 'updateData'>
  >;
  updateLink?: Resolver<
    ResolversTypes['Link'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateLinkArgs, 'linkData'>
  >;
  updateNotificationState?: Resolver<
    ResolversTypes['InAppNotificationState'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateNotificationStateArgs,
      'notificationData'
    >
  >;
  updateOrganization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateOrganizationArgs,
      'organizationData'
    >
  >;
  updateOrganizationPlatformSettings?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateOrganizationPlatformSettingsArgs,
      'organizationData'
    >
  >;
  updateOrganizationSettings?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateOrganizationSettingsArgs,
      'settingsData'
    >
  >;
  updatePost?: Resolver<
    ResolversTypes['Post'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdatePostArgs, 'postData'>
  >;
  updatePreferenceOnUser?: Resolver<
    ResolversTypes['Preference'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdatePreferenceOnUserArgs,
      'preferenceData'
    >
  >;
  updateProfile?: Resolver<
    ResolversTypes['Profile'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateProfileArgs, 'profileData'>
  >;
  updateReference?: Resolver<
    ResolversTypes['Reference'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateReferenceArgs, 'referenceData'>
  >;
  updateSpace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateSpaceArgs, 'spaceData'>
  >;
  updateSpacePlatformSettings?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateSpacePlatformSettingsArgs,
      'updateData'
    >
  >;
  updateSpaceSettings?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateSpaceSettingsArgs, 'settingsData'>
  >;
  updateTagset?: Resolver<
    ResolversTypes['Tagset'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateTagsetArgs, 'updateData'>
  >;
  updateTemplate?: Resolver<
    ResolversTypes['Template'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateTemplateArgs, 'updateData'>
  >;
  updateTemplateDefault?: Resolver<
    ResolversTypes['TemplateDefault'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateTemplateDefaultArgs,
      'templateDefaultData'
    >
  >;
  updateTemplateFromCollaboration?: Resolver<
    ResolversTypes['Template'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateTemplateFromCollaborationArgs,
      'updateData'
    >
  >;
  updateUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateUserArgs, 'userData'>
  >;
  updateUserGroup?: Resolver<
    ResolversTypes['UserGroup'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateUserGroupArgs, 'userGroupData'>
  >;
  updateUserPlatformSettings?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateUserPlatformSettingsArgs,
      'updateData'
    >
  >;
  updateUserSettings?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateUserSettingsArgs, 'settingsData'>
  >;
  updateVirtualContributor?: Resolver<
    ResolversTypes['VirtualContributor'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUpdateVirtualContributorArgs,
      'virtualContributorData'
    >
  >;
  updateVisual?: Resolver<
    ResolversTypes['Visual'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateVisualArgs, 'updateData'>
  >;
  updateWhiteboard?: Resolver<
    ResolversTypes['Whiteboard'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.MutationUpdateWhiteboardArgs, 'whiteboardData'>
  >;
  uploadFileOnLink?: Resolver<
    ResolversTypes['Link'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUploadFileOnLinkArgs,
      'file' | 'uploadData'
    >
  >;
  uploadFileOnReference?: Resolver<
    ResolversTypes['Reference'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUploadFileOnReferenceArgs,
      'file' | 'uploadData'
    >
  >;
  uploadFileOnStorageBucket?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUploadFileOnStorageBucketArgs,
      'file' | 'uploadData'
    >
  >;
  uploadImageOnVisual?: Resolver<
    ResolversTypes['Visual'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.MutationUploadImageOnVisualArgs,
      'file' | 'uploadData'
    >
  >;
};

export type MySpaceResultsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['MySpaceResults'] = ResolversParentTypes['MySpaceResults'],
> = {
  latestActivity?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['ActivityLogEntry']>,
    ParentType,
    ContextType
  >;
  space?: Resolver<ResolversTypes['Space'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type NvpResolvers<
  ContextType = any,
  ParentType extends ResolversParentTypes['NVP'] = ResolversParentTypes['NVP'],
> = {
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface NameIdScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['NameID'], any> {
  name: 'NameID';
}

export type OrganizationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Organization'] = ResolversParentTypes['Organization'],
> = {
  account?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Account']>,
    ParentType,
    ContextType
  >;
  admins?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['User']>>,
    ParentType,
    ContextType
  >;
  agent?: Resolver<ResolversTypes['Agent'], ParentType, ContextType>;
  associates?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['User']>>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  contactEmail?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  domain?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  group?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['UserGroup']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.OrganizationGroupArgs, 'ID'>
  >;
  groups?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['UserGroup']>>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  legalEntityName?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  metrics?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['NVP']>>,
    ParentType,
    ContextType
  >;
  myRoles?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['RoleName']>>,
    ParentType,
    ContextType
  >;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  owners?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['User']>>,
    ParentType,
    ContextType
  >;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  settings?: Resolver<
    ResolversTypes['OrganizationSettings'],
    ParentType,
    ContextType
  >;
  storageAggregator?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['StorageAggregator']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  verification?: Resolver<
    ResolversTypes['OrganizationVerification'],
    ParentType,
    ContextType
  >;
  website?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrganizationSettingsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationSettings'] = ResolversParentTypes['OrganizationSettings'],
> = {
  membership?: Resolver<
    ResolversTypes['OrganizationSettingsMembership'],
    ParentType,
    ContextType
  >;
  privacy?: Resolver<
    ResolversTypes['OrganizationSettingsPrivacy'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrganizationSettingsMembershipResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationSettingsMembership'] = ResolversParentTypes['OrganizationSettingsMembership'],
> = {
  allowUsersMatchingDomainToJoin?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrganizationSettingsPrivacyResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationSettingsPrivacy'] = ResolversParentTypes['OrganizationSettingsPrivacy'],
> = {
  contributionRolesPubliclyVisible?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OrganizationVerificationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OrganizationVerification'] = ResolversParentTypes['OrganizationVerification'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isFinalized?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lifecycle?: Resolver<ResolversTypes['Lifecycle'], ParentType, ContextType>;
  nextEvents?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  state?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<
    ResolversTypes['OrganizationVerificationEnum'],
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OryConfigResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['OryConfig'] = ResolversParentTypes['OryConfig'],
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
  ParentType extends
    ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo'],
> = {
  endCursor?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
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
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PaginatedOrganizationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['PaginatedOrganization'] = ResolversParentTypes['PaginatedOrganization'],
> = {
  organization?: Resolver<
    Array<ResolversTypes['Organization']>,
    ParentType,
    ContextType
  >;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PaginatedSpacesResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['PaginatedSpaces'] = ResolversParentTypes['PaginatedSpaces'],
> = {
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  spaces?: Resolver<Array<ResolversTypes['Space']>, ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PaginatedUsersResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['PaginatedUsers'] = ResolversParentTypes['PaginatedUsers'],
> = {
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PlatformResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Platform'] = ResolversParentTypes['Platform'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  configuration?: Resolver<ResolversTypes['Config'], ParentType, ContextType>;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  forum?: Resolver<ResolversTypes['Forum'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  innovationHub?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['InnovationHub']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.PlatformInnovationHubArgs>
  >;
  latestReleaseDiscussion?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['LatestReleaseDiscussion']>,
    ParentType,
    ContextType
  >;
  library?: Resolver<ResolversTypes['Library'], ParentType, ContextType>;
  licensingFramework?: Resolver<
    ResolversTypes['Licensing'],
    ParentType,
    ContextType
  >;
  metadata?: Resolver<ResolversTypes['Metadata'], ParentType, ContextType>;
  myRoles?: Resolver<
    Array<ResolversTypes['RoleName']>,
    ParentType,
    ContextType
  >;
  platformInvitations?: Resolver<
    Array<ResolversTypes['PlatformInvitation']>,
    ParentType,
    ContextType
  >;
  storageAggregator?: Resolver<
    ResolversTypes['StorageAggregator'],
    ParentType,
    ContextType
  >;
  templatesManager?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['TemplatesManager']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PlatformFeatureFlagResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['PlatformFeatureFlag'] = ResolversParentTypes['PlatformFeatureFlag'],
> = {
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<
    ResolversTypes['PlatformFeatureFlagName'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PlatformInvitationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['PlatformInvitation'] = ResolversParentTypes['PlatformInvitation'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  firstName?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  lastName?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  RoleName?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['RoleName']>,
    ParentType,
    ContextType
  >;
  profileCreated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  roleSetExtraRole?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['RoleName']>,
    ParentType,
    ContextType
  >;
  roleSetInvitedToParent?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  welcomeMessage?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PlatformLocationsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['PlatformLocations'] = ResolversParentTypes['PlatformLocations'],
> = {
  about?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  aup?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  blog?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  community?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  contactsupport?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  documentation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  domain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  environment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  feedback?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  forumreleases?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  foundation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  help?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  impact?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  innovationLibrary?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  inspiration?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  landing?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  newuser?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  opensource?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  privacy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  releases?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  security?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  support?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  switchplan?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  terms?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tips?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PostResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Post'] = ResolversParentTypes['Post'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  comments?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  createdBy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PreferenceResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Preference'] = ResolversParentTypes['Preference'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  definition?: Resolver<
    ResolversTypes['PreferenceDefinition'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PreferenceDefinitionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['PreferenceDefinition'] = ResolversParentTypes['PreferenceDefinition'],
> = {
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  group?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['PreferenceType'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  valueType?: Resolver<
    ResolversTypes['PreferenceValueType'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProfileResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Profile'] = ResolversParentTypes['Profile'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  location?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Location']>,
    ParentType,
    ContextType
  >;
  references?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['Reference']>>,
    ParentType,
    ContextType
  >;
  storageBucket?: Resolver<
    ResolversTypes['StorageBucket'],
    ParentType,
    ContextType
  >;
  tagline?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  tagset?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Tagset']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.ProfileTagsetArgs>
  >;
  tagsets?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['Tagset']>>,
    ParentType,
    ContextType
  >;
  type?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['ProfileType']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  visual?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Visual']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.ProfileVisualArgs, 'type'>
  >;
  visuals?: Resolver<Array<ResolversTypes['Visual']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ProfileCredentialVerifiedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ProfileCredentialVerified'] = ResolversParentTypes['ProfileCredentialVerified'],
> = {
  userEmail?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  vc?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Query'] = ResolversParentTypes['Query'],
> = {
  account?: Resolver<
    ResolversTypes['Account'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.QueryAccountArgs, 'ID'>
  >;
  accounts?: Resolver<
    Array<ResolversTypes['Account']>,
    ParentType,
    ContextType
  >;
  activityFeed?: Resolver<
    ResolversTypes['ActivityFeed'],
    ParentType,
    ContextType,
    Partial<SchemaTypes.QueryActivityFeedArgs>
  >;
  activityFeedGrouped?: Resolver<
    Array<ResolversTypes['ActivityLogEntry']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.QueryActivityFeedGroupedArgs>
  >;
  activityLogOnCollaboration?: Resolver<
    Array<ResolversTypes['ActivityLogEntry']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.QueryActivityLogOnCollaborationArgs, 'queryData'>
  >;
  adminCommunicationMembership?: Resolver<
    ResolversTypes['CommunicationAdminMembershipResult'],
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.QueryAdminCommunicationMembershipArgs,
      'communicationData'
    >
  >;
  adminCommunicationOrphanedUsage?: Resolver<
    ResolversTypes['CommunicationAdminOrphanedUsageResult'],
    ParentType,
    ContextType
  >;
  aiServer?: Resolver<ResolversTypes['AiServer'], ParentType, ContextType>;
  exploreSpaces?: Resolver<
    Array<ResolversTypes['Space']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.QueryExploreSpacesArgs>
  >;
  getSupportedVerifiedCredentialMetadata?: Resolver<
    Array<ResolversTypes['CredentialMetadataOutput']>,
    ParentType,
    ContextType
  >;
  inputCreator?: Resolver<
    ResolversTypes['InputCreatorQueryResults'],
    ParentType,
    ContextType
  >;
  lookup?: Resolver<
    ResolversTypes['LookupQueryResults'],
    ParentType,
    ContextType
  >;
  lookupByName?: Resolver<
    ResolversTypes['LookupByNameQueryResults'],
    ParentType,
    ContextType
  >;
  me?: Resolver<ResolversTypes['MeQueryResults'], ParentType, ContextType>;
  notifications?: Resolver<
    Array<ResolversTypes['InAppNotification']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.QueryNotificationsArgs, 'receiverID'>
  >;
  organization?: Resolver<
    ResolversTypes['Organization'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.QueryOrganizationArgs, 'ID'>
  >;
  organizations?: Resolver<
    Array<ResolversTypes['Organization']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.QueryOrganizationsArgs>
  >;
  organizationsPaginated?: Resolver<
    ResolversTypes['PaginatedOrganization'],
    ParentType,
    ContextType,
    Partial<SchemaTypes.QueryOrganizationsPaginatedArgs>
  >;
  platform?: Resolver<ResolversTypes['Platform'], ParentType, ContextType>;
  rolesOrganization?: Resolver<
    ResolversTypes['ContributorRoles'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.QueryRolesOrganizationArgs, 'rolesData'>
  >;
  rolesUser?: Resolver<
    ResolversTypes['ContributorRoles'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.QueryRolesUserArgs, 'rolesData'>
  >;
  rolesVirtualContributor?: Resolver<
    ResolversTypes['ContributorRoles'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.QueryRolesVirtualContributorArgs, 'rolesData'>
  >;
  search?: Resolver<
    ResolversTypes['ISearchResults'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.QuerySearchArgs, 'searchData'>
  >;
  space?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.QuerySpaceArgs, 'ID'>
  >;
  spaces?: Resolver<
    Array<ResolversTypes['Space']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.QuerySpacesArgs>
  >;
  spacesPaginated?: Resolver<
    ResolversTypes['PaginatedSpaces'],
    ParentType,
    ContextType,
    Partial<SchemaTypes.QuerySpacesPaginatedArgs>
  >;
  task?: Resolver<
    ResolversTypes['Task'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.QueryTaskArgs, 'id'>
  >;
  tasks?: Resolver<
    Array<ResolversTypes['Task']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.QueryTasksArgs>
  >;
  user?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.QueryUserArgs, 'ID'>
  >;
  userAuthorizationPrivileges?: Resolver<
    Array<ResolversTypes['AuthorizationPrivilege']>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.QueryUserAuthorizationPrivilegesArgs,
      'userAuthorizationPrivilegesData'
    >
  >;
  users?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.QueryUsersArgs>
  >;
  usersPaginated?: Resolver<
    ResolversTypes['PaginatedUsers'],
    ParentType,
    ContextType,
    Partial<SchemaTypes.QueryUsersPaginatedArgs>
  >;
  usersWithAuthorizationCredential?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.QueryUsersWithAuthorizationCredentialArgs,
      'credentialsCriteriaData'
    >
  >;
  virtualContributor?: Resolver<
    ResolversTypes['VirtualContributor'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.QueryVirtualContributorArgs, 'ID'>
  >;
  virtualContributors?: Resolver<
    Array<ResolversTypes['VirtualContributor']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.QueryVirtualContributorsArgs>
  >;
};

export type QuestionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Question'] = ResolversParentTypes['Question'],
> = {
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ReactionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Reaction'] = ResolversParentTypes['Reaction'],
> = {
  emoji?: Resolver<ResolversTypes['Emoji'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['MessageID'], ParentType, ContextType>;
  sender?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType
  >;
  timestamp?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ReferenceResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Reference'] = ResolversParentTypes['Reference'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  description?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  uri?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RelayPaginatedSpaceResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RelayPaginatedSpace'] = ResolversParentTypes['RelayPaginatedSpace'],
> = {
  account?: Resolver<ResolversTypes['Account'], ParentType, ContextType>;
  activeSubscription?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['SpaceSubscription']>,
    ParentType,
    ContextType
  >;
  agent?: Resolver<ResolversTypes['Agent'], ParentType, ContextType>;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  collaboration?: Resolver<
    ResolversTypes['Collaboration'],
    ParentType,
    ContextType
  >;
  community?: Resolver<ResolversTypes['Community'], ParentType, ContextType>;
  context?: Resolver<ResolversTypes['Context'], ParentType, ContextType>;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['SpaceLevel'], ParentType, ContextType>;
  levelZeroSpaceID?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  license?: Resolver<ResolversTypes['License'], ParentType, ContextType>;
  metrics?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['NVP']>>,
    ParentType,
    ContextType
  >;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['Contributor'], ParentType, ContextType>;
  settings?: Resolver<ResolversTypes['SpaceSettings'], ParentType, ContextType>;
  storageAggregator?: Resolver<
    ResolversTypes['StorageAggregator'],
    ParentType,
    ContextType
  >;
  subscriptions?: Resolver<
    Array<ResolversTypes['SpaceSubscription']>,
    ParentType,
    ContextType
  >;
  subspace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.RelayPaginatedSpaceSubspaceArgs, 'ID'>
  >;
  subspaces?: Resolver<
    Array<ResolversTypes['Space']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.RelayPaginatedSpaceSubspacesArgs>
  >;
  templatesManager?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['TemplatesManager']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<ResolversTypes['SpaceType'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
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

export type RelayPaginatedSpaceEdgeResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RelayPaginatedSpaceEdge'] = ResolversParentTypes['RelayPaginatedSpaceEdge'],
> = {
  node?: Resolver<
    ResolversTypes['RelayPaginatedSpace'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RelayPaginatedSpacePageInfoResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RelayPaginatedSpacePageInfo'] = ResolversParentTypes['RelayPaginatedSpacePageInfo'],
> = {
  endCursor?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
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
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RoleResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Role'] = ResolversParentTypes['Role'],
> = {
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  credential?: Resolver<
    ResolversTypes['CredentialDefinition'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  organizationPolicy?: Resolver<
    ResolversTypes['ContributorRolePolicy'],
    ParentType,
    ContextType
  >;
  parentCredentials?: Resolver<
    Array<ResolversTypes['CredentialDefinition']>,
    ParentType,
    ContextType
  >;
  requiresEntryRole?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  requiresSameRoleInParentRoleSet?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  type?: Resolver<ResolversTypes['RoleName'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  userPolicy?: Resolver<
    ResolversTypes['ContributorRolePolicy'],
    ParentType,
    ContextType
  >;
  virtualContributorPolicy?: Resolver<
    ResolversTypes['ContributorRolePolicy'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RoleSetResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RoleSet'] = ResolversParentTypes['RoleSet'],
> = {
  applicationForm?: Resolver<ResolversTypes['Form'], ParentType, ContextType>;
  applications?: Resolver<
    Array<ResolversTypes['Application']>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  availableUsersForLeadRole?: Resolver<
    ResolversTypes['PaginatedUsers'],
    ParentType,
    ContextType,
    Partial<SchemaTypes.RoleSetAvailableUsersForLeadRoleArgs>
  >;
  availableUsersForEntryRole?: Resolver<
    ResolversTypes['PaginatedUsers'],
    ParentType,
    ContextType,
    Partial<SchemaTypes.RoleSetavailableUsersForEntryRoleArgs>
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  entryRoleType?: Resolver<
    ResolversTypes['RoleName'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  invitations?: Resolver<
    Array<ResolversTypes['Invitation']>,
    ParentType,
    ContextType
  >;
  license?: Resolver<ResolversTypes['License'], ParentType, ContextType>;
  myMembershipStatus?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CommunityMembershipStatus']>,
    ParentType,
    ContextType
  >;
  myRoles?: Resolver<
    Array<ResolversTypes['RoleName']>,
    ParentType,
    ContextType
  >;
  myRolesImplicit?: Resolver<
    Array<ResolversTypes['CommunityRoleImplicit']>,
    ParentType,
    ContextType
  >;
  organizationsInRole?: Resolver<
    Array<ResolversTypes['Organization']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.RoleSetOrganizationsInRoleArgs, 'role'>
  >;
  platformInvitations?: Resolver<
    Array<ResolversTypes['PlatformInvitation']>,
    ParentType,
    ContextType
  >;
  roleDefinition?: Resolver<
    ResolversTypes['Role'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.RoleSetRoleDefinitionArgs, 'role'>
  >;
  roleDefinitions?: Resolver<
    Array<ResolversTypes['Role']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  usersInRole?: Resolver<
    Array<ResolversTypes['User']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.RoleSetUsersInRoleArgs, 'role'>
  >;
  virtualContributorsInRole?: Resolver<
    Array<ResolversTypes['VirtualContributor']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.RoleSetVirtualContributorsInRoleArgs, 'role'>
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RolesResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RolesResult'] = ResolversParentTypes['RolesResult'],
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RolesResultCommunityResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RolesResultCommunity'] = ResolversParentTypes['RolesResultCommunity'],
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['SpaceLevel'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SpaceType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RolesResultOrganizationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RolesResultOrganization'] = ResolversParentTypes['RolesResultOrganization'],
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
  ParentType extends
    ResolversParentTypes['RolesResultSpace'] = ResolversParentTypes['RolesResultSpace'],
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['SpaceLevel'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  spaceID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  subspaces?: Resolver<
    Array<ResolversTypes['RolesResultCommunity']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<ResolversTypes['SpaceType'], ParentType, ContextType>;
  visibility?: Resolver<
    ResolversTypes['SpaceVisibility'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RoomResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Room'] = ResolversParentTypes['Room'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
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
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  vcInteractions?: Resolver<
    Array<ResolversTypes['VcInteraction']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RoomEventSubscriptionResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RoomEventSubscriptionResult'] = ResolversParentTypes['RoomEventSubscriptionResult'],
> = {
  message?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['RoomMessageEventSubscriptionResult']>,
    ParentType,
    ContextType
  >;
  reaction?: Resolver<
    SchemaTypes.Maybe<
      ResolversTypes['RoomMessageReactionEventSubscriptionResult']
    >,
    ParentType,
    ContextType
  >;
  room?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  roomID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RoomMessageEventSubscriptionResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RoomMessageEventSubscriptionResult'] = ResolversParentTypes['RoomMessageEventSubscriptionResult'],
> = {
  data?: Resolver<ResolversTypes['Message'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['MutationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type RoomMessageReactionEventSubscriptionResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['RoomMessageReactionEventSubscriptionResult'] = ResolversParentTypes['RoomMessageReactionEventSubscriptionResult'],
> = {
  data?: Resolver<ResolversTypes['Reaction'], ParentType, ContextType>;
  messageID?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<ResolversTypes['MutationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SearchResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['SearchResult'] = ResolversParentTypes['SearchResult'],
> = {
  __resolveType: TypeResolveFn<
    | 'SearchResultCallout'
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

export type SearchResultCalloutResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['SearchResultCallout'] = ResolversParentTypes['SearchResultCallout'],
> = {
  callout?: Resolver<ResolversTypes['Callout'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  space?: Resolver<ResolversTypes['Space'], ParentType, ContextType>;
  terms?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchResultType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SearchResultOrganizationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['SearchResultOrganization'] = ResolversParentTypes['SearchResultOrganization'],
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
  ParentType extends
    ResolversParentTypes['SearchResultPost'] = ResolversParentTypes['SearchResultPost'],
> = {
  callout?: Resolver<ResolversTypes['Callout'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  post?: Resolver<ResolversTypes['Post'], ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  space?: Resolver<ResolversTypes['Space'], ParentType, ContextType>;
  terms?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchResultType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SearchResultSpaceResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['SearchResultSpace'] = ResolversParentTypes['SearchResultSpace'],
> = {
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentSpace?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Space']>,
    ParentType,
    ContextType
  >;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  space?: Resolver<ResolversTypes['Space'], ParentType, ContextType>;
  terms?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SearchResultType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SearchResultUserResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['SearchResultUser'] = ResolversParentTypes['SearchResultUser'],
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
  ParentType extends
    ResolversParentTypes['SearchResultUserGroup'] = ResolversParentTypes['SearchResultUserGroup'],
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
  ParentType extends
    ResolversParentTypes['Sentry'] = ResolversParentTypes['Sentry'],
> = {
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  endpoint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  environment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  submitPII?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ServiceMetadataResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ServiceMetadata'] = ResolversParentTypes['ServiceMetadata'],
> = {
  name?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  version?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SpaceResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Space'] = ResolversParentTypes['Space'],
> = {
  account?: Resolver<ResolversTypes['Account'], ParentType, ContextType>;
  activeSubscription?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['SpaceSubscription']>,
    ParentType,
    ContextType
  >;
  agent?: Resolver<ResolversTypes['Agent'], ParentType, ContextType>;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  collaboration?: Resolver<
    ResolversTypes['Collaboration'],
    ParentType,
    ContextType
  >;
  community?: Resolver<ResolversTypes['Community'], ParentType, ContextType>;
  context?: Resolver<ResolversTypes['Context'], ParentType, ContextType>;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['SpaceLevel'], ParentType, ContextType>;
  levelZeroSpaceID?: Resolver<
    ResolversTypes['String'],
    ParentType,
    ContextType
  >;
  license?: Resolver<ResolversTypes['License'], ParentType, ContextType>;
  metrics?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['NVP']>>,
    ParentType,
    ContextType
  >;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['Contributor'], ParentType, ContextType>;
  settings?: Resolver<ResolversTypes['SpaceSettings'], ParentType, ContextType>;
  storageAggregator?: Resolver<
    ResolversTypes['StorageAggregator'],
    ParentType,
    ContextType
  >;
  subscriptions?: Resolver<
    Array<ResolversTypes['SpaceSubscription']>,
    ParentType,
    ContextType
  >;
  subspace?: Resolver<
    ResolversTypes['Space'],
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.SpaceSubspaceArgs, 'ID'>
  >;
  subspaces?: Resolver<
    Array<ResolversTypes['Space']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.SpaceSubspacesArgs>
  >;
  templatesManager?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['TemplatesManager']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<ResolversTypes['SpaceType'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
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

export type SpacePendingMembershipInfoResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['SpacePendingMembershipInfo'] = ResolversParentTypes['SpacePendingMembershipInfo'],
> = {
  communityGuidelines?: Resolver<
    ResolversTypes['CommunityGuidelines'],
    ParentType,
    ContextType
  >;
  context?: Resolver<ResolversTypes['Context'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['SpaceLevel'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SpaceSettingsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['SpaceSettings'] = ResolversParentTypes['SpaceSettings'],
> = {
  collaboration?: Resolver<
    ResolversTypes['SpaceSettingsCollaboration'],
    ParentType,
    ContextType
  >;
  membership?: Resolver<
    ResolversTypes['SpaceSettingsMembership'],
    ParentType,
    ContextType
  >;
  privacy?: Resolver<
    ResolversTypes['SpaceSettingsPrivacy'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SpaceSettingsCollaborationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['SpaceSettingsCollaboration'] = ResolversParentTypes['SpaceSettingsCollaboration'],
> = {
  allowEventsFromSubspaces?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  allowMembersToCreateCallouts?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  allowMembersToCreateSubspaces?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  inheritMembershipRights?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SpaceSettingsMembershipResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['SpaceSettingsMembership'] = ResolversParentTypes['SpaceSettingsMembership'],
> = {
  allowSubspaceAdminsToInviteMembers?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  policy?: Resolver<
    ResolversTypes['CommunityMembershipPolicy'],
    ParentType,
    ContextType
  >;
  trustedOrganizations?: Resolver<
    Array<ResolversTypes['UUID']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SpaceSettingsPrivacyResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['SpaceSettingsPrivacy'] = ResolversParentTypes['SpaceSettingsPrivacy'],
> = {
  allowPlatformSupportAsAdmin?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  mode?: Resolver<ResolversTypes['SpacePrivacyMode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SpaceSubscriptionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['SpaceSubscription'] = ResolversParentTypes['SpaceSubscription'],
> = {
  expires?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  name?: Resolver<
    ResolversTypes['LicensingCredentialBasedCredentialType'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type StorageAggregatorResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['StorageAggregator'] = ResolversParentTypes['StorageAggregator'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  directStorageBucket?: Resolver<
    ResolversTypes['StorageBucket'],
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  parentEntity?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['StorageAggregatorParent']>,
    ParentType,
    ContextType
  >;
  size?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  storageAggregators?: Resolver<
    Array<ResolversTypes['StorageAggregator']>,
    ParentType,
    ContextType
  >;
  storageBuckets?: Resolver<
    Array<ResolversTypes['StorageBucket']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['StorageAggregatorType']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type StorageAggregatorParentResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['StorageAggregatorParent'] = ResolversParentTypes['StorageAggregatorParent'],
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  level?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['SpaceLevel']>,
    ParentType,
    ContextType
  >;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type StorageBucketResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['StorageBucket'] = ResolversParentTypes['StorageBucket'],
> = {
  allowedMimeTypes?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  document?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Document']>,
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.StorageBucketDocumentArgs, 'ID'>
  >;
  documents?: Resolver<
    Array<ResolversTypes['Document']>,
    ParentType,
    ContextType,
    Partial<SchemaTypes.StorageBucketDocumentsArgs>
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  maxFileSize?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  parentEntity?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['StorageBucketParent']>,
    ParentType,
    ContextType
  >;
  size?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type StorageBucketParentResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['StorageBucketParent'] = ResolversParentTypes['StorageBucketParent'],
> = {
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ProfileType'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type StorageConfigResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['StorageConfig'] = ResolversParentTypes['StorageConfig'],
> = {
  file?: Resolver<ResolversTypes['FileStorageConfig'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type SubscriptionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription'],
> = {
  activityCreated?: SubscriptionResolver<
    ResolversTypes['ActivityCreatedSubscriptionResult'],
    'activityCreated',
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.SubscriptionActivityCreatedArgs, 'input'>
  >;
  calloutPostCreated?: SubscriptionResolver<
    ResolversTypes['CalloutPostCreated'],
    'calloutPostCreated',
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.SubscriptionCalloutPostCreatedArgs, 'calloutID'>
  >;
  forumDiscussionUpdated?: SubscriptionResolver<
    ResolversTypes['Discussion'],
    'forumDiscussionUpdated',
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.SubscriptionForumDiscussionUpdatedArgs, 'forumID'>
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
    RequireFields<SchemaTypes.SubscriptionRoomEventsArgs, 'roomID'>
  >;
  subspaceCreated?: SubscriptionResolver<
    ResolversTypes['SubspaceCreated'],
    'subspaceCreated',
    ParentType,
    ContextType,
    RequireFields<SchemaTypes.SubscriptionSubspaceCreatedArgs, 'spaceID'>
  >;
  virtualContributorUpdated?: SubscriptionResolver<
    ResolversTypes['VirtualContributorUpdatedSubscriptionResult'],
    'virtualContributorUpdated',
    ParentType,
    ContextType,
    RequireFields<
      SchemaTypes.SubscriptionVirtualContributorUpdatedArgs,
      'virtualContributorID'
    >
  >;
};

export type SubspaceCreatedResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['SubspaceCreated'] = ResolversParentTypes['SubspaceCreated'],
> = {
  spaceID?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  subspace?: Resolver<ResolversTypes['Space'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TagsetResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Tagset'] = ResolversParentTypes['Tagset'],
> = {
  allowedValues?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['TagsetType'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TagsetTemplateResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['TagsetTemplate'] = ResolversParentTypes['TagsetTemplate'],
> = {
  allowedValues?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  defaultSelectedValue?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['TagsetType'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TaskResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Task'] = ResolversParentTypes['Task'],
> = {
  created?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  end?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  errors?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['String']>>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  itemsCount?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  itemsDone?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  progress?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Float']>,
    ParentType,
    ContextType
  >;
  results?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['String']>>,
    ParentType,
    ContextType
  >;
  start?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['TaskStatus'], ParentType, ContextType>;
  type?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TemplateResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Template'] = ResolversParentTypes['Template'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  callout?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Callout']>,
    ParentType,
    ContextType
  >;
  collaboration?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Collaboration']>,
    ParentType,
    ContextType
  >;
  communityGuidelines?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['CommunityGuidelines']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  postDefaultDescription?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Markdown']>,
    ParentType,
    ContextType
  >;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['TemplateType'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  whiteboard?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Whiteboard']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TemplateDefaultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['TemplateDefault'] = ResolversParentTypes['TemplateDefault'],
> = {
  allowedTemplateType?: Resolver<
    ResolversTypes['TemplateType'],
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  template?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Template']>,
    ParentType,
    ContextType
  >;
  type?: Resolver<
    ResolversTypes['TemplateDefaultType'],
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TemplateResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['TemplateResult'] = ResolversParentTypes['TemplateResult'],
> = {
  innovationPack?: Resolver<
    ResolversTypes['InnovationPack'],
    ParentType,
    ContextType
  >;
  template?: Resolver<ResolversTypes['Template'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TemplatesManagerResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['TemplatesManager'] = ResolversParentTypes['TemplatesManager'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  templateDefaults?: Resolver<
    Array<ResolversTypes['TemplateDefault']>,
    ParentType,
    ContextType
  >;
  templatesSet?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['TemplatesSet']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TemplatesSetResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['TemplatesSet'] = ResolversParentTypes['TemplatesSet'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  calloutTemplates?: Resolver<
    Array<ResolversTypes['Template']>,
    ParentType,
    ContextType
  >;
  calloutTemplatesCount?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  collaborationTemplates?: Resolver<
    Array<ResolversTypes['Template']>,
    ParentType,
    ContextType
  >;
  collaborationTemplatesCount?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  communityGuidelinesTemplates?: Resolver<
    Array<ResolversTypes['Template']>,
    ParentType,
    ContextType
  >;
  communityGuidelinesTemplatesCount?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  postTemplates?: Resolver<
    Array<ResolversTypes['Template']>,
    ParentType,
    ContextType
  >;
  postTemplatesCount?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  templates?: Resolver<
    Array<ResolversTypes['Template']>,
    ParentType,
    ContextType
  >;
  templatesCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  whiteboardTemplates?: Resolver<
    Array<ResolversTypes['Template']>,
    ParentType,
    ContextType
  >;
  whiteboardTemplatesCount?: Resolver<
    ResolversTypes['Float'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type TimelineResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Timeline'] = ResolversParentTypes['Timeline'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  calendar?: Resolver<ResolversTypes['Calendar'], ParentType, ContextType>;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
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
  ParentType extends
    ResolversParentTypes['User'] = ResolversParentTypes['User'],
> = {
  account?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Account']>,
    ParentType,
    ContextType
  >;
  accountUpn?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  agent?: Resolver<ResolversTypes['Agent'], ParentType, ContextType>;
  authentication?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['UserAuthenticationResult']>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  communityRooms?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['CommunicationRoom']>>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  directRooms?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['DirectRoom']>>,
    ParentType,
    ContextType
  >;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  firstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  guidanceRoom?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Room']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isContactable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  phone?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  preferences?: Resolver<
    Array<ResolversTypes['Preference']>,
    ParentType,
    ContextType
  >;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  settings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType>;
  storageAggregator?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['StorageAggregator']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserAuthenticationResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['UserAuthenticationResult'] = ResolversParentTypes['UserAuthenticationResult'],
> = {
  createdAt?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  method?: Resolver<
    ResolversTypes['AuthenticationType'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserGroupResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['UserGroup'] = ResolversParentTypes['UserGroup'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  members?: Resolver<
    SchemaTypes.Maybe<Array<ResolversTypes['User']>>,
    ParentType,
    ContextType
  >;
  parent?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Groupable']>,
    ParentType,
    ContextType
  >;
  profile?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Profile']>,
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserSettingsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['UserSettings'] = ResolversParentTypes['UserSettings'],
> = {
  communication?: Resolver<
    ResolversTypes['UserSettingsCommunication'],
    ParentType,
    ContextType
  >;
  privacy?: Resolver<
    ResolversTypes['UserSettingsPrivacy'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserSettingsCommunicationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['UserSettingsCommunication'] = ResolversParentTypes['UserSettingsCommunication'],
> = {
  allowOtherUsersToSendMessages?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserSettingsPrivacyResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['UserSettingsPrivacy'] = ResolversParentTypes['UserSettingsPrivacy'],
> = {
  contributionRolesPubliclyVisible?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type VcInteractionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['VcInteraction'] = ResolversParentTypes['VcInteraction'],
> = {
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  room?: Resolver<ResolversTypes['Room'], ParentType, ContextType>;
  threadID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  virtualContributorID?: Resolver<
    ResolversTypes['UUID'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type VerifiedCredentialResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['VerifiedCredential'] = ResolversParentTypes['VerifiedCredential'],
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
  ParentType extends
    ResolversParentTypes['VerifiedCredentialClaim'] = ResolversParentTypes['VerifiedCredentialClaim'],
> = {
  name?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type VirtualContributorResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['VirtualContributor'] = ResolversParentTypes['VirtualContributor'],
> = {
  account?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Account']>,
    ParentType,
    ContextType
  >;
  agent?: Resolver<ResolversTypes['Agent'], ParentType, ContextType>;
  aiPersona?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['AiPersona']>,
    ParentType,
    ContextType
  >;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  listedInStore?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['Contributor'], ParentType, ContextType>;
  searchVisibility?: Resolver<
    ResolversTypes['SearchVisibility'],
    ParentType,
    ContextType
  >;
  status?: Resolver<
    ResolversTypes['VirtualContributorStatus'],
    ParentType,
    ContextType
  >;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type VirtualContributorUpdatedSubscriptionResultResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['VirtualContributorUpdatedSubscriptionResult'] = ResolversParentTypes['VirtualContributorUpdatedSubscriptionResult'],
> = {
  virtualContributor?: Resolver<
    ResolversTypes['VirtualContributor'],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type VisualResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Visual'] = ResolversParentTypes['Visual'],
> = {
  allowedTypes?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  alternativeText?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  aspectRatio?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  maxHeight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  maxWidth?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  minHeight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  minWidth?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  uri?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type VisualConstraintsResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['VisualConstraints'] = ResolversParentTypes['VisualConstraints'],
> = {
  allowedTypes?: Resolver<
    Array<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  aspectRatio?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  maxHeight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  maxWidth?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  minHeight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  minWidth?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type WhiteboardResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Whiteboard'] = ResolversParentTypes['Whiteboard'],
> = {
  authorization?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['Authorization']>,
    ParentType,
    ContextType
  >;
  content?: Resolver<
    ResolversTypes['WhiteboardContent'],
    ParentType,
    ContextType
  >;
  contentUpdatePolicy?: Resolver<
    ResolversTypes['ContentUpdatePolicy'],
    ParentType,
    ContextType
  >;
  createdBy?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['User']>,
    ParentType,
    ContextType
  >;
  createdDate?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['UUID'], ParentType, ContextType>;
  isMultiUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  nameID?: Resolver<ResolversTypes['NameID'], ParentType, ContextType>;
  profile?: Resolver<ResolversTypes['Profile'], ParentType, ContextType>;
  updatedDate?: Resolver<
    SchemaTypes.Maybe<ResolversTypes['DateTime']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface WhiteboardContentScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['WhiteboardContent'], any> {
  name: 'WhiteboardContent';
}

export type Resolvers<ContextType = any> = {
  APM?: ApmResolvers<ContextType>;
  Account?: AccountResolvers<ContextType>;
  AccountSubscription?: AccountSubscriptionResolvers<ContextType>;
  ActivityCreatedSubscriptionResult?: ActivityCreatedSubscriptionResultResolvers<ContextType>;
  ActivityFeed?: ActivityFeedResolvers<ContextType>;
  ActivityLogEntry?: ActivityLogEntryResolvers<ContextType>;
  ActivityLogEntryCalendarEventCreated?: ActivityLogEntryCalendarEventCreatedResolvers<ContextType>;
  ActivityLogEntryCalloutDiscussionComment?: ActivityLogEntryCalloutDiscussionCommentResolvers<ContextType>;
  ActivityLogEntryCalloutLinkCreated?: ActivityLogEntryCalloutLinkCreatedResolvers<ContextType>;
  ActivityLogEntryCalloutPostComment?: ActivityLogEntryCalloutPostCommentResolvers<ContextType>;
  ActivityLogEntryCalloutPostCreated?: ActivityLogEntryCalloutPostCreatedResolvers<ContextType>;
  ActivityLogEntryCalloutPublished?: ActivityLogEntryCalloutPublishedResolvers<ContextType>;
  ActivityLogEntryCalloutWhiteboardContentModified?: ActivityLogEntryCalloutWhiteboardContentModifiedResolvers<ContextType>;
  ActivityLogEntryCalloutWhiteboardCreated?: ActivityLogEntryCalloutWhiteboardCreatedResolvers<ContextType>;
  ActivityLogEntryChallengeCreated?: ActivityLogEntryChallengeCreatedResolvers<ContextType>;
  ActivityLogEntryMemberJoined?: ActivityLogEntryMemberJoinedResolvers<ContextType>;
  ActivityLogEntryOpportunityCreated?: ActivityLogEntryOpportunityCreatedResolvers<ContextType>;
  ActivityLogEntryUpdateSent?: ActivityLogEntryUpdateSentResolvers<ContextType>;
  Actor?: ActorResolvers<ContextType>;
  ActorGroup?: ActorGroupResolvers<ContextType>;
  Agent?: AgentResolvers<ContextType>;
  AgentBeginVerifiedCredentialOfferOutput?: AgentBeginVerifiedCredentialOfferOutputResolvers<ContextType>;
  AgentBeginVerifiedCredentialRequestOutput?: AgentBeginVerifiedCredentialRequestOutputResolvers<ContextType>;
  AiPersona?: AiPersonaResolvers<ContextType>;
  AiPersonaService?: AiPersonaServiceResolvers<ContextType>;
  AiServer?: AiServerResolvers<ContextType>;
  Application?: ApplicationResolvers<ContextType>;
  AuthenticationConfig?: AuthenticationConfigResolvers<ContextType>;
  AuthenticationProviderConfig?: AuthenticationProviderConfigResolvers<ContextType>;
  AuthenticationProviderConfigUnion?: AuthenticationProviderConfigUnionResolvers<ContextType>;
  Authorization?: AuthorizationResolvers<ContextType>;
  AuthorizationPolicyRuleCredential?: AuthorizationPolicyRuleCredentialResolvers<ContextType>;
  AuthorizationPolicyRulePrivilege?: AuthorizationPolicyRulePrivilegeResolvers<ContextType>;
  AuthorizationPolicyRuleVerifiedCredential?: AuthorizationPolicyRuleVerifiedCredentialResolvers<ContextType>;
  Calendar?: CalendarResolvers<ContextType>;
  CalendarEvent?: CalendarEventResolvers<ContextType>;
  Callout?: CalloutResolvers<ContextType>;
  CalloutContribution?: CalloutContributionResolvers<ContextType>;
  CalloutContributionDefaults?: CalloutContributionDefaultsResolvers<ContextType>;
  CalloutContributionPolicy?: CalloutContributionPolicyResolvers<ContextType>;
  CalloutFraming?: CalloutFramingResolvers<ContextType>;
  CalloutGroup?: CalloutGroupResolvers<ContextType>;
  CalloutPostCreated?: CalloutPostCreatedResolvers<ContextType>;
  Collaboration?: CollaborationResolvers<ContextType>;
  Communication?: CommunicationResolvers<ContextType>;
  CommunicationAdminMembershipResult?: CommunicationAdminMembershipResultResolvers<ContextType>;
  CommunicationAdminOrphanedUsageResult?: CommunicationAdminOrphanedUsageResultResolvers<ContextType>;
  CommunicationAdminRoomMembershipResult?: CommunicationAdminRoomMembershipResultResolvers<ContextType>;
  CommunicationAdminRoomResult?: CommunicationAdminRoomResultResolvers<ContextType>;
  CommunicationRoom?: CommunicationRoomResolvers<ContextType>;
  Community?: CommunityResolvers<ContextType>;
  CommunityApplicationForRoleResult?: CommunityApplicationForRoleResultResolvers<ContextType>;
  CommunityApplicationResult?: CommunityApplicationResultResolvers<ContextType>;
  CommunityGuidelines?: CommunityGuidelinesResolvers<ContextType>;
  CommunityInvitationForRoleResult?: CommunityInvitationForRoleResultResolvers<ContextType>;
  CommunityInvitationResult?: CommunityInvitationResultResolvers<ContextType>;
  CommunityMembershipResult?: CommunityMembershipResultResolvers<ContextType>;
  Config?: ConfigResolvers<ContextType>;
  Context?: ContextResolvers<ContextType>;
  Contributor?: ContributorResolvers<ContextType>;
  ContributorRolePolicy?: ContributorRolePolicyResolvers<ContextType>;
  ContributorRoles?: ContributorRolesResolvers<ContextType>;
  CreateCalloutContributionDefaultsData?: CreateCalloutContributionDefaultsDataResolvers<ContextType>;
  CreateCalloutContributionPolicyData?: CreateCalloutContributionPolicyDataResolvers<ContextType>;
  CreateCalloutData?: CreateCalloutDataResolvers<ContextType>;
  CreateCalloutFramingData?: CreateCalloutFramingDataResolvers<ContextType>;
  CreateCollaborationData?: CreateCollaborationDataResolvers<ContextType>;
  CreateCommunityGuidelinesData?: CreateCommunityGuidelinesDataResolvers<ContextType>;
  CreateInnovationFlowData?: CreateInnovationFlowDataResolvers<ContextType>;
  CreateInnovationFlowStateData?: CreateInnovationFlowStateDataResolvers<ContextType>;
  CreateLocationData?: CreateLocationDataResolvers<ContextType>;
  CreateProfileData?: CreateProfileDataResolvers<ContextType>;
  CreateReferenceData?: CreateReferenceDataResolvers<ContextType>;
  CreateTagsetData?: CreateTagsetDataResolvers<ContextType>;
  CreateWhiteboardData?: CreateWhiteboardDataResolvers<ContextType>;
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
  FileStorageConfig?: FileStorageConfigResolvers<ContextType>;
  Form?: FormResolvers<ContextType>;
  FormQuestion?: FormQuestionResolvers<ContextType>;
  Forum?: ForumResolvers<ContextType>;
  Geo?: GeoResolvers<ContextType>;
  Groupable?: GroupableResolvers<ContextType>;
  ISearchResults?: ISearchResultsResolvers<ContextType>;
  InAppNotification?: InAppNotificationResolvers<ContextType>;
  InAppNotificationCalloutPublished?: InAppNotificationCalloutPublishedResolvers<ContextType>;
  InAppNotificationCommunityNewMember?: InAppNotificationCommunityNewMemberResolvers<ContextType>;
  InAppNotificationUserMentioned?: InAppNotificationUserMentionedResolvers<ContextType>;
  InnovationFlow?: InnovationFlowResolvers<ContextType>;
  InnovationFlowState?: InnovationFlowStateResolvers<ContextType>;
  InnovationHub?: InnovationHubResolvers<ContextType>;
  InnovationPack?: InnovationPackResolvers<ContextType>;
  InputCreatorQueryResults?: InputCreatorQueryResultsResolvers<ContextType>;
  Invitation?: InvitationResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  LatestReleaseDiscussion?: LatestReleaseDiscussionResolvers<ContextType>;
  Library?: LibraryResolvers<ContextType>;
  License?: LicenseResolvers<ContextType>;
  LicenseEntitlement?: LicenseEntitlementResolvers<ContextType>;
  LicensePlan?: LicensePlanResolvers<ContextType>;
  LicensePolicy?: LicensePolicyResolvers<ContextType>;
  Licensing?: LicensingResolvers<ContextType>;
  LicensingCredentialBasedPolicyCredentialRule?: LicensingCredentialBasedPolicyCredentialRuleResolvers<ContextType>;
  LicensingGrantedEntitlement?: LicensingGrantedEntitlementResolvers<ContextType>;
  Lifecycle?: LifecycleResolvers<ContextType>;
  LifecycleDefinition?: GraphQLScalarType;
  Link?: LinkResolvers<ContextType>;
  Location?: LocationResolvers<ContextType>;
  LookupByNameQueryResults?: LookupByNameQueryResultsResolvers<ContextType>;
  LookupMyPrivilegesQueryResults?: LookupMyPrivilegesQueryResultsResolvers<ContextType>;
  LookupQueryResults?: LookupQueryResultsResolvers<ContextType>;
  Markdown?: GraphQLScalarType;
  MeQueryResults?: MeQueryResultsResolvers<ContextType>;
  Message?: MessageResolvers<ContextType>;
  MessageAnswerQuestion?: MessageAnswerQuestionResolvers<ContextType>;
  MessageID?: GraphQLScalarType;
  Metadata?: MetadataResolvers<ContextType>;
  MigrateEmbeddings?: MigrateEmbeddingsResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  MySpaceResults?: MySpaceResultsResolvers<ContextType>;
  NVP?: NvpResolvers<ContextType>;
  NameID?: GraphQLScalarType;
  Organization?: OrganizationResolvers<ContextType>;
  OrganizationSettings?: OrganizationSettingsResolvers<ContextType>;
  OrganizationSettingsMembership?: OrganizationSettingsMembershipResolvers<ContextType>;
  OrganizationSettingsPrivacy?: OrganizationSettingsPrivacyResolvers<ContextType>;
  OrganizationVerification?: OrganizationVerificationResolvers<ContextType>;
  OryConfig?: OryConfigResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  PaginatedOrganization?: PaginatedOrganizationResolvers<ContextType>;
  PaginatedSpaces?: PaginatedSpacesResolvers<ContextType>;
  PaginatedUsers?: PaginatedUsersResolvers<ContextType>;
  Platform?: PlatformResolvers<ContextType>;
  PlatformFeatureFlag?: PlatformFeatureFlagResolvers<ContextType>;
  PlatformInvitation?: PlatformInvitationResolvers<ContextType>;
  PlatformLocations?: PlatformLocationsResolvers<ContextType>;
  Post?: PostResolvers<ContextType>;
  Preference?: PreferenceResolvers<ContextType>;
  PreferenceDefinition?: PreferenceDefinitionResolvers<ContextType>;
  Profile?: ProfileResolvers<ContextType>;
  ProfileCredentialVerified?: ProfileCredentialVerifiedResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Question?: QuestionResolvers<ContextType>;
  Reaction?: ReactionResolvers<ContextType>;
  Reference?: ReferenceResolvers<ContextType>;
  RelayPaginatedSpace?: RelayPaginatedSpaceResolvers<ContextType>;
  RelayPaginatedSpaceEdge?: RelayPaginatedSpaceEdgeResolvers<ContextType>;
  RelayPaginatedSpacePageInfo?: RelayPaginatedSpacePageInfoResolvers<ContextType>;
  Role?: RoleResolvers<ContextType>;
  RoleSet?: RoleSetResolvers<ContextType>;
  RolesResult?: RolesResultResolvers<ContextType>;
  RolesResultCommunity?: RolesResultCommunityResolvers<ContextType>;
  RolesResultOrganization?: RolesResultOrganizationResolvers<ContextType>;
  RolesResultSpace?: RolesResultSpaceResolvers<ContextType>;
  Room?: RoomResolvers<ContextType>;
  RoomEventSubscriptionResult?: RoomEventSubscriptionResultResolvers<ContextType>;
  RoomMessageEventSubscriptionResult?: RoomMessageEventSubscriptionResultResolvers<ContextType>;
  RoomMessageReactionEventSubscriptionResult?: RoomMessageReactionEventSubscriptionResultResolvers<ContextType>;
  SearchResult?: SearchResultResolvers<ContextType>;
  SearchResultCallout?: SearchResultCalloutResolvers<ContextType>;
  SearchResultOrganization?: SearchResultOrganizationResolvers<ContextType>;
  SearchResultPost?: SearchResultPostResolvers<ContextType>;
  SearchResultSpace?: SearchResultSpaceResolvers<ContextType>;
  SearchResultUser?: SearchResultUserResolvers<ContextType>;
  SearchResultUserGroup?: SearchResultUserGroupResolvers<ContextType>;
  Sentry?: SentryResolvers<ContextType>;
  ServiceMetadata?: ServiceMetadataResolvers<ContextType>;
  Space?: SpaceResolvers<ContextType>;
  SpacePendingMembershipInfo?: SpacePendingMembershipInfoResolvers<ContextType>;
  SpaceSettings?: SpaceSettingsResolvers<ContextType>;
  SpaceSettingsCollaboration?: SpaceSettingsCollaborationResolvers<ContextType>;
  SpaceSettingsMembership?: SpaceSettingsMembershipResolvers<ContextType>;
  SpaceSettingsPrivacy?: SpaceSettingsPrivacyResolvers<ContextType>;
  SpaceSubscription?: SpaceSubscriptionResolvers<ContextType>;
  StorageAggregator?: StorageAggregatorResolvers<ContextType>;
  StorageAggregatorParent?: StorageAggregatorParentResolvers<ContextType>;
  StorageBucket?: StorageBucketResolvers<ContextType>;
  StorageBucketParent?: StorageBucketParentResolvers<ContextType>;
  StorageConfig?: StorageConfigResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  SubspaceCreated?: SubspaceCreatedResolvers<ContextType>;
  Tagset?: TagsetResolvers<ContextType>;
  TagsetTemplate?: TagsetTemplateResolvers<ContextType>;
  Task?: TaskResolvers<ContextType>;
  Template?: TemplateResolvers<ContextType>;
  TemplateDefault?: TemplateDefaultResolvers<ContextType>;
  TemplateResult?: TemplateResultResolvers<ContextType>;
  TemplatesManager?: TemplatesManagerResolvers<ContextType>;
  TemplatesSet?: TemplatesSetResolvers<ContextType>;
  Timeline?: TimelineResolvers<ContextType>;
  UUID?: GraphQLScalarType;
  UUID_NAMEID?: GraphQLScalarType;
  UUID_NAMEID_EMAIL?: GraphQLScalarType;
  Upload?: GraphQLScalarType;
  User?: UserResolvers<ContextType>;
  UserAuthenticationResult?: UserAuthenticationResultResolvers<ContextType>;
  UserGroup?: UserGroupResolvers<ContextType>;
  UserSettings?: UserSettingsResolvers<ContextType>;
  UserSettingsCommunication?: UserSettingsCommunicationResolvers<ContextType>;
  UserSettingsPrivacy?: UserSettingsPrivacyResolvers<ContextType>;
  VcInteraction?: VcInteractionResolvers<ContextType>;
  VerifiedCredential?: VerifiedCredentialResolvers<ContextType>;
  VerifiedCredentialClaim?: VerifiedCredentialClaimResolvers<ContextType>;
  VirtualContributor?: VirtualContributorResolvers<ContextType>;
  VirtualContributorUpdatedSubscriptionResult?: VirtualContributorUpdatedSubscriptionResultResolvers<ContextType>;
  Visual?: VisualResolvers<ContextType>;
  VisualConstraints?: VisualConstraintsResolvers<ContextType>;
  Whiteboard?: WhiteboardResolvers<ContextType>;
  WhiteboardContent?: GraphQLScalarType;
};

export type CreateUserMutationVariables = SchemaTypes.Exact<{
  userData: SchemaTypes.CreateUserInput;
}>;

export type CreateUserMutation = { createUser: { id: string } };

export type GetUserDataQueryVariables = SchemaTypes.Exact<{
  userId: SchemaTypes.Scalars['UUID_NAMEID_EMAIL']['input'];
}>;

export type GetUserDataQuery = {
  user: { id: string; email: string; profile: { displayName: string } };
};

export type GetUsersDataQueryVariables = SchemaTypes.Exact<{
  [key: string]: never;
}>;

export type GetUsersDataQuery = {
  users: Array<{ id: string; email: string; profile: { displayName: string } }>;
};

export type UserDataFragment = {
  id: string;
  email: string;
  profile: { displayName: string };
};

export type PendingMembershipsSpaceQueryVariables = SchemaTypes.Exact<{
  spaceId: SchemaTypes.Scalars['UUID_NAMEID']['input'];
  fetchDetails?: SchemaTypes.Scalars['Boolean']['input'];
}>;

export type PendingMembershipsSpaceQuery = {
  space: {
    __typename: 'Space';
    id: string;
    nameID: string;
    profile: {
      tagline?: string | undefined;
      id: string;
      displayName: string;
      tagset?: { id: string; tags: Array<string> } | undefined;
      cardBanner?: { id: string; uri: string } | undefined;
    };
  };
};

export type PendingMembershipsJourneyProfileFragment = {
  tagline?: string | undefined;
  id: string;
  displayName: string;
  tagset?: { id: string; tags: Array<string> } | undefined;
  cardBanner?: { id: string; uri: string } | undefined;
};

export type DeleteUserMutationVariables = SchemaTypes.Exact<{
  deleteData: SchemaTypes.DeleteUserInput;
}>;

export type DeleteUserMutation = { deleteUser: { id: string } };

export type UpdateUserMutationVariables = SchemaTypes.Exact<{
  userData: SchemaTypes.UpdateUserInput;
}>;

export type UpdateUserMutation = {
  updateUser: { id: string; email: string; profile: { displayName: string } };
};

export const UserDataFragmentDoc = gql`
  fragment UserData on User {
    id
    profile {
      displayName
    }
    email
  }
`;
export const PendingMembershipsJourneyProfileFragmentDoc = gql`
  fragment PendingMembershipsJourneyProfile on Profile {
    id
    displayName
    ... on Profile @include(if: $fetchDetails) {
      tagline
      tagset {
        id
        tags
      }
      cardBanner: visual(type: CARD) {
        id
        uri
      }
    }
  }
`;
export const CreateUserDocument = gql`
  mutation CreateUser($userData: CreateUserInput!) {
    createUser(userData: $userData) {
      id
    }
  }
`;
export const GetUserDataDocument = gql`
  query getUserData($userId: UUID_NAMEID_EMAIL!) {
    user(ID: $userId) {
      ...UserData
    }
  }
  ${UserDataFragmentDoc}
`;
export const GetUsersDataDocument = gql`
  query getUsersData {
    users {
      ...UserData
    }
  }
  ${UserDataFragmentDoc}
`;
export const PendingMembershipsSpaceDocument = gql`
  query PendingMembershipsSpace(
    $spaceId: UUID_NAMEID!
    $fetchDetails: Boolean! = false
  ) {
    space(ID: $spaceId) {
      id
      nameID
      profile {
        ...PendingMembershipsJourneyProfile
      }
      __typename
    }
  }
  ${PendingMembershipsJourneyProfileFragmentDoc}
`;
export const DeleteUserDocument = gql`
  mutation deleteUser($deleteData: DeleteUserInput!) {
    deleteUser(deleteData: $deleteData) {
      id
    }
  }
`;
export const UpdateUserDocument = gql`
  mutation updateUser($userData: UpdateUserInput!) {
    updateUser(userData: $userData) {
      ...UserData
    }
  }
  ${UserDataFragmentDoc}
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables
) => action();
const CreateUserDocumentString = print(CreateUserDocument);
const GetUserDataDocumentString = print(GetUserDataDocument);
const GetUsersDataDocumentString = print(GetUsersDataDocument);
const PendingMembershipsSpaceDocumentString = print(
  PendingMembershipsSpaceDocument
);
const DeleteUserDocumentString = print(DeleteUserDocument);
const UpdateUserDocumentString = print(UpdateUserDocument);
export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    CreateUser(
      variables: SchemaTypes.CreateUserMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<{
      data: SchemaTypes.CreateUserMutation;
      errors?: GraphQLError[];
      extensions?: any;
      headers: Headers;
      status: number;
    }> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.rawRequest<SchemaTypes.CreateUserMutation>(
            CreateUserDocumentString,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'CreateUser',
        'mutation',
        variables
      );
    },
    getUserData(
      variables: SchemaTypes.GetUserDataQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<{
      data: SchemaTypes.GetUserDataQuery;
      errors?: GraphQLError[];
      extensions?: any;
      headers: Headers;
      status: number;
    }> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.rawRequest<SchemaTypes.GetUserDataQuery>(
            GetUserDataDocumentString,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'getUserData',
        'query',
        variables
      );
    },
    getUsersData(
      variables?: SchemaTypes.GetUsersDataQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<{
      data: SchemaTypes.GetUsersDataQuery;
      errors?: GraphQLError[];
      extensions?: any;
      headers: Headers;
      status: number;
    }> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.rawRequest<SchemaTypes.GetUsersDataQuery>(
            GetUsersDataDocumentString,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'getUsersData',
        'query',
        variables
      );
    },
    PendingMembershipsSpace(
      variables: SchemaTypes.PendingMembershipsSpaceQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<{
      data: SchemaTypes.PendingMembershipsSpaceQuery;
      errors?: GraphQLError[];
      extensions?: any;
      headers: Headers;
      status: number;
    }> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.rawRequest<SchemaTypes.PendingMembershipsSpaceQuery>(
            PendingMembershipsSpaceDocumentString,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'PendingMembershipsSpace',
        'query',
        variables
      );
    },
    deleteUser(
      variables: SchemaTypes.DeleteUserMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<{
      data: SchemaTypes.DeleteUserMutation;
      errors?: GraphQLError[];
      extensions?: any;
      headers: Headers;
      status: number;
    }> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.rawRequest<SchemaTypes.DeleteUserMutation>(
            DeleteUserDocumentString,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deleteUser',
        'mutation',
        variables
      );
    },
    updateUser(
      variables: SchemaTypes.UpdateUserMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<{
      data: SchemaTypes.UpdateUserMutation;
      errors?: GraphQLError[];
      extensions?: any;
      headers: Headers;
      status: number;
    }> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.rawRequest<SchemaTypes.UpdateUserMutation>(
            UpdateUserDocumentString,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateUser',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
