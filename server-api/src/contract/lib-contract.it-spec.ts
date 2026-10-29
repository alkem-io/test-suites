/**
 * @contract — the lib surface the client-web net depends on.
 *
 * The first thing that must go green on the rebuilt server (docs/qa/
 * server-rebuild, W2 pre-work). It asserts NAMES and SHAPES, never server
 * constants: every exported name a client-web spec or helper imports from
 * `@alkemio/tests-lib` exists with the expected kind, every generated-SDK
 * operation the specs still call directly is a function, and one
 * `createBaseScenario` → one read-back per entity type → `cleanUpBaseScenario`
 * round trip works against the running stack in under a minute.
 *
 * Run: `pnpm -C server-api exec vitest run --project contract`
 */
import * as lib from '@alkemio/tests-lib';
import {
  getGraphqlClient,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  RoleName,
  readCalloutFraming,
  readMyUser,
  readOrganizationRoleSet,
  readRoleSetUsersInRoles,
  readSpaceAbout,
  readSpaceLevelAndVisibility,
  readSpaceRefs,
  readSpaceSettings,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const ROUND_TRIP_BUDGET_MS = 60_000;

/** Lib names imported by client-web specs and helpers (client-net-audit § 3a + the W2 fold). */
const FUNCTIONS: string[] = [
  // § 3a — imported directly from the barrel
  'assignRoleToUser',
  'assignRoleToVirtualContributor',
  'createCalloutOnCalloutsSet',
  'createPngFixture',
  'delay',
  'deleteSpace',
  'ensureHarnessAdminRoles',
  'getGraphqlClient',
  'getMailsData',
  'getUserToken',
  'getVerificationLinkFor',
  'graphqlErrorWrapper',
  'harnessPostgresConfigured',
  'platformRoleEmail',
  'postGraphqlRaw',
  'queryHarnessDb',
  'registerInKratosOrFail',
  'registerTestUser',
  'seedPlatformRoleUsers',
  'updateCalloutVisibility',
  'verifyInKratosOrFail',
  // § 3a — reached through area helpers
  'createOrganization',
  'deleteOrganization',
  'assignRoleToOrganization',
  'removeRoleFromUser',
  'updateSpaceSettings',
  'applyOrganizationVerificationSequence',
  'createInnovationPack',
  'deleteInnovationPack',
  'registerInAlkemioOrFail',
  'provisionTestIdentities',
  'registerAllTestUsers',
  'getRecoveryLinkFor',
  'deleteMailSlurperMails',
  'getQueueStats',
  'waitForQueuePublishIncrease',
  'rabbitMqManagementConfigured',
  'findBffSessionIdBySub',
  'ageBffSessionCreatedAt',
  'decodeJwtPayloadUnsafe',
  'digestWindow',
  'mintBffSession',
  // the registration chain and the older base functions the fold reuses
  'createSubspace',
  'createSpaceBasicData',
  'deleteUser',
  'updateUserSettings',
  'updateUser',
  'createPlatformDiscussion',
  'deletePlatformDiscussion',
  'getPlatformForumId',
  'createVirtualContributor',
  'deleteVirtualContributor',
  'createTemplateOnTemplatesSet',
  'assignPlatformRole',
  'getLicensePlanByName',
  'assignLicensePlanToAccount',
  // the actor runner and raw poster
  'runAs',
  'resolveActor',
  'postGraphqlRawAs',
  // W2 business-action functions (lib/src/scenario/functions/<area>/)
  'readMySession',
  'readMySessionRaw',
  'readMyUser',
  'readMyPrivileges',
  'readMyPlatformRoles',
  'readMyLanguageSetting',
  'readMyUserSettings',
  'readMyNotifications',
  'readMyNotificationsUnreadCount',
  'readMyConversations',
  'readMyPendingMemberships',
  'readMyAccountDeletionCanDelete',
  'readMyMcpApiKeys',
  'revokeMyMcpApiKey',
  'subscribeToPushNotifications',
  'readPlatformLanguageConfiguration',
  'readPlatformServiceVersions',
  'readPlatformVirtualAssistantAccess',
  'readPlatformForumDiscussions',
  'removePlatformRoleFromUser',
  'deletePlatformInvitation',
  'introspectEnumValues',
  'introspectSchemaFieldTypes',
  'readUserAccount',
  'readUserIdByNameId',
  'readUserProfileTagsets',
  'updateUserProfile',
  'readUserSpaceRoles',
  'findUsersPaginated',
  'readUserSettings',
  'deleteUserRaw',
  'readOrganizationProfileTagsets',
  'readOrganizationVerification',
  'readOrganizationAccount',
  'readOrganizationSpaceRoles',
  'readOrganizationRoleSet',
  'readOrganizationRoleSetApplications',
  'readOrganizationRoleSetInvitations',
  'readOrganizationRoleSetPlatformInvitations',
  'readOrganizationRoleSetPending',
  'readOrganizationAssociateEligibility',
  'updateOrganizationData',
  'removeRoleFromOrganization',
  'readAccountResources',
  'readInnovationPackVisibility',
  'readInnovationPackTemplatesSet',
  'updateBaselineLicensePlanOnAccount',
  'transferSpaceToAccount',
  'readVirtualContributorProfileTagsets',
  'readVirtualContributorVisibility',
  'updateVirtualContributorData',
  'createVirtualContributorWithData',
  'convertVirtualContributorToUseKnowledgeBase',
  'createSpaceOnAccount',
  'createSubspaceWithData',
  'updateSpaceData',
  'readSpaceLevelAndVisibility',
  'readSpaceSettings',
  'readSpaceMyPrivileges',
  'readSpaceAbout',
  'readSpaceRefs',
  'readSpaceCalloutNames',
  'readSpaceInnovationFlowStates',
  'updateInnovationFlowStateSettings',
  'updateInnovationFlowStatesSortOrder',
  'readSpaceGuidelinesId',
  'updateCommunityGuidelines',
  'readSpaceTemplatesManager',
  'readSpaceAccountSpaces',
  'readSpaceClassifications',
  'assignLicensePlanToSpace',
  'readRoleSetUsersInRole',
  'readRoleSetUsersInRoles',
  'readRoleSetOrganizationsInRoles',
  'readRoleSetInvitations',
  'readRoleSetApplications',
  'readRoleSetInvitationIds',
  'readRoleSetPlatformInvitations',
  'readRoleSetPending',
  'applyForEntryRoleOnRoleSet',
  'inviteForEntryRoleOnRoleSet',
  'eventOnInvitation',
  'eventOnApplication',
  'createCalloutWithData',
  'updateCalloutData',
  'deleteCallout',
  'createContributionOnCallout',
  'submitCalloutFormResponse',
  'updateCalloutForm',
  'deleteCalloutFormResponse',
  'readCalloutFraming',
  'readCalloutFramingSettings',
  'readCalloutSubspaces',
  'readCalloutContributions',
  'readCalloutFramingContributors',
  'readCalloutsSetCallouts',
  'readCalloutFormResponses',
  'readMemoDocuments',
  'readActivityLogOnCollaboration',
  'uploadFileOnStorageBucket',
  'readTemplatesSetTemplates',
  'createTemplateWithData',
  'createCalloutTemplateWithFile',
  'readTemplatesSetClassificationTemplates',
  'createClassificationTemplate',
  'addClassificationEntryFromTemplate',
  'updateClassificationEntrySelection',
  'updateTagsetTags',
];

/** Classes and namespaces the specs construct or call statically. */
const CLASSES: string[] = ['TestScenarioFactory', 'TestUserManager', 'UniqueIDGenerator'];

/** Lib-owned enums with the member names the specs use (values are the server's and are not asserted). */
const ENUM_MEMBERS: Record<string, string[]> = {
  TestUser: ['GLOBAL_ADMIN', 'SPACE_ADMIN', 'SPACE_MEMBER', 'NON_SPACE_MEMBER'],
  RoleName: ['Member', 'Admin', 'Lead', 'Associate', 'Owner'],
  SpacePrivacyMode: ['Public', 'Private'],
  CommunityMembershipPolicy: ['Open', 'Applications', 'Invitations'],
  CalloutVisibility: ['Published', 'Draft'],
  CalloutFramingType: ['None', 'Whiteboard', 'Memo', 'Link'],
  SpaceLevel: ['L0', 'L1', 'L2'],
  SpaceVisibility: ['Active', 'Archived', 'Demo'],
  ActorType: ['User', 'Organization', 'VirtualContributor'],
  SidebarWidget: ['About', 'Community', 'Events', 'Activity'],
  NotificationEvent: ['OrganizationAdminSpaceCommunityInvitation'],
  CalendarEventType: ['Event'],
  RoleSetInvitationResultType: [],
};

/** Generated-SDK operations client-web still calls directly (client-net-audit § 3b). */
const DIRECT_SDK_OPERATIONS: string[] = [
  'AddReactionToCallout',
  'applyForEntryRole',
  'AssignLicensePlanToSpace',
  'calloutFormResponses',
  'calloutsSetFramingDefinitions',
  'createFormCalloutOnCalloutsSet',
  'createPollCalloutOnCalloutsSet',
  'CreateCalendarEventOnCalendar',
  'DeletePlatformInvitation',
  'GetInnovationFlowStatesWithIds',
  'GetRoleSetUsersInRoles',
  'getSpaceInvitations',
  'GetSpaceCalendarId',
  'InvitationStateEvent',
  'InviteForEntryRoleOnRoleSet',
  'LookupPlatformInvitation',
  'LookupPlatformInvitationCreatedBy',
  'MeQuery',
  'PlatformRolesAssignRoleToUser',
  'PlatformRolesRemoveRoleFromUser',
  'platformRoleSetUsersInRole',
  'RemoveRoleFromOrganization',
  'ResendPlatformInvitation',
  'RevokeLicensePlanFromSpace',
  'RoleSetApplicationsInvitations',
  'RoleSetMembersList',
  'RoleSetPendingPlatformInvitations',
  'SendMessageToRoom',
  'SubscribeToPushNotifications',
  'UnsubscribeFromPushNotifications',
  'UpdateInnovationFlowState',
  'UpdateOrganizationSettings',
  'updateUserServiceProfile',
];

const exportsOf = lib as unknown as Record<string, unknown>;

describe('@contract lib surface used by the client-web net', () => {
  test('every function the specs import is exported as a function', () => {
    const missing = FUNCTIONS.filter(name => typeof exportsOf[name] !== 'function');
    expect(missing, `missing or not callable: ${missing.join(', ')}`).toEqual([]);
  });

  test('the factory, user manager and id generator are exported as classes', () => {
    const missing = CLASSES.filter(name => typeof exportsOf[name] !== 'function');
    expect(missing).toEqual([]);
    for (const method of ['createBaseScenario', 'createBaseScenarioEmpty', 'createBaseScenarioOrganization', 'cleanUpBaseScenario']) {
      expect(typeof (TestScenarioFactory as unknown as Record<string, unknown>)[method], `TestScenarioFactory.${method}`).toBe('function');
    }
    for (const method of ['populateUserModelMap', 'getUserModelByType', 'getUserModelByEmail', 'refreshUserModel']) {
      expect(typeof (TestUserManager as unknown as Record<string, unknown>)[method], `TestUserManager.${method}`).toBe('function');
    }
    expect(typeof lib.UniqueIDGenerator.getID).toBe('function');
    expect(typeof lib.testConfiguration.endPoints.server).toBe('string');
  });

  test('every lib-owned enum the specs use carries the member names they reference', () => {
    const problems: string[] = [];
    for (const [enumName, members] of Object.entries(ENUM_MEMBERS)) {
      const value = exportsOf[enumName];
      if (!value || typeof value !== 'object') {
        problems.push(`${enumName}: not exported`);
        continue;
      }
      for (const member of members) {
        if (!(member in (value as Record<string, unknown>))) problems.push(`${enumName}.${member}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('every generated-SDK operation the specs call directly is a function on the client', () => {
    const sdk = getGraphqlClient() as unknown as Record<string, unknown>;
    const missing = DIRECT_SDK_OPERATIONS.filter(op => typeof sdk[op] !== 'function');
    expect(missing).toEqual([]);
  });
});

describe('@contract base scenario round trip', () => {
  const name = `lib-contract-${lib.UniqueIDGenerator.getID()}`;
  const scenarioConfig: TestScenarioConfig = {
    name,
    organization: { community: { addAdmin: false, addMembers: false } },
    space: {
      collaboration: { addPostCallout: true },
      subspace: { collaboration: { addPostCallout: true } },
    },
  };
  let base: OrganizationWithSpaceModel;
  let startedAt = 0;

  beforeAll(async () => {
    startedAt = Date.now();
    base = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  }, ROUND_TRIP_BUDGET_MS);

  afterAll(async () => {
    if (base) await TestScenarioFactory.cleanUpBaseScenario(base);
    expect(Date.now() - startedAt, 'create → read-backs → clean up budget').toBeLessThan(ROUND_TRIP_BUDGET_MS);
  }, ROUND_TRIP_BUDGET_MS);

  test('the scenario reports its ids', () => {
    expect(base.scenarioSetupSucceeded).toBe(true);
    expect(base.organization.id).toEqual(expect.any(String));
    expect(base.space.id).toEqual(expect.any(String));
    expect(base.space.community.roleSetId).toEqual(expect.any(String));
    expect(base.space.collaboration.calloutsSetId).toEqual(expect.any(String));
    expect(base.space.collaboration.calloutPostId).toEqual(expect.any(String));
    expect(base.subspace.id).toEqual(expect.any(String));
  });

  test('me: the harness admin resolves to a user', async () => {
    const me = await readMyUser(TestUser.GLOBAL_ADMIN);
    expect(me.error).toBeUndefined();
    expect(me.data?.me.user?.id).toEqual(expect.any(String));
    expect(me.data?.me.user?.profile?.displayName).toEqual(expect.any(String));
  });

  test('space: refs, about, settings and level read back by id', async () => {
    const refs = await readSpaceRefs(base.space.id);
    expect(refs.error).toBeUndefined();
    expect(refs.data?.lookup.space?.id).toBe(base.space.id);
    expect(refs.data?.lookup.space?.community?.roleSet.id).toBe(base.space.community.roleSetId);
    expect(refs.data?.lookup.space?.collaboration?.calloutsSet.id).toBe(base.space.collaboration.calloutsSetId);

    const about = await readSpaceAbout(base.space.id);
    expect(about.data?.lookup.space?.about.profile.displayName).toEqual(expect.any(String));

    const settings = await readSpaceSettings(base.space.id);
    expect(settings.data?.lookup.space?.settings.privacy.mode).toEqual(expect.any(String));
    expect(settings.data?.lookup.space?.settings.membership.policy).toEqual(expect.any(String));

    const level = await readSpaceLevelAndVisibility(base.subspace.id);
    expect(level.data?.lookup.space?.level).toEqual(expect.any(String));
    expect(level.data?.lookup.space?.visibility).toEqual(expect.any(String));
  });

  test('callout: the seeded post callout reads back with its framing', async () => {
    const callout = await readCalloutFraming(base.space.collaboration.calloutPostId);
    expect(callout.error).toBeUndefined();
    expect(callout.data?.lookup.callout?.id).toBe(base.space.collaboration.calloutPostId);
    expect(callout.data?.lookup.callout?.framing.type).toEqual(expect.any(String));
    expect(callout.data?.lookup.callout?.framing.profile.url).toEqual(expect.any(String));
  });

  test('organization: its role set reads back by id', async () => {
    const org = await readOrganizationRoleSet(base.organization.id);
    expect(org.error).toBeUndefined();
    expect(org.data?.organization.id).toBe(base.organization.id);
    expect(org.data?.organization.roleSet.id).toBe(base.organization.roleSetId);
  });

  test('role set: users in roles has the list shape', async () => {
    const roles = await readRoleSetUsersInRoles(base.space.community.roleSetId, [RoleName.Admin, RoleName.Member]);
    expect(roles.error).toBeUndefined();
    const usersInRoles = roles.data?.lookup.roleSet?.usersInRoles ?? [];
    expect(Array.isArray(usersInRoles)).toBe(true);
    for (const entry of usersInRoles) {
      expect(entry.role).toEqual(expect.any(String));
      expect(Array.isArray(entry.users)).toBe(true);
    }
  });
});
