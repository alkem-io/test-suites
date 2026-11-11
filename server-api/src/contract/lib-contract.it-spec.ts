/**
 * @contract — the lib surface the client-web net depends on.
 *
 * The first thing that must go green on the rebuilt server (docs/qa/
 * server-rebuild, W2 pre-work). It asserts NAMES and SHAPES, never server
 * constants: every exported name a client-web spec or helper imports from
 * `@alkemio/tests-lib` exists with the expected kind, every enum member they
 * reference exists, every generated-SDK operation the specs still call
 * directly is a function — the last three read from client-web's own source
 * (`client-web-lib-usage.ts`), so a new import is covered the day it lands —
 * and one
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
  readCalloutsSetCalloutTypes,
  readCalloutsSetCalloutVisibility,
  CalloutVisibility,
  readCalloutsSetCalloutResponses,
  readMyUser,
  readOrganizationRoleSet,
  readRoleSetUsersInRoles,
  readSpaceAbout,
  readSpaceByNameId,
  readSpaceLevelAndVisibility,
  readSpaceRefs,
  readSpaceSettings,
  readSpaceSubspaceTree,
  readSubspaceByNameId,
  joinRoleSet,
  readRoleSetUsersInRole,
} from '@alkemio/tests-lib';
import { readFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import nodePath from 'node:path';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { libBarrelExportNames, scanClientWebLibUsage } from './client-web-lib-usage';

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
  'readSpaceByNameId',
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
  'readSubspaceByNameId',
  'readSpaceSubspaceTree',
  'assignLicensePlanToSpace',
  'readRoleSetUsersInRole',
  'readRoleSetUsersInRoles',
  'readRoleSetOrganizationsInRoles',
  'readRoleSetInvitations',
  'readRoleSetApplications',
  'readRoleSetInvitationIds',
  'readRoleSetPlatformInvitations',
  'readRoleSetPending',
  'joinRoleSet',
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
  'readCalloutsSetCalloutTypes',
  'readCalloutsSetCalloutVisibility',
  'readCalloutsSetCalloutResponses',
  'readCalloutFormResponses',
  'readMemoDocuments',
  // W2 journey 5 (content editing)
  'readMemoContent',
  'readWhiteboardState',
  'createWhiteboardFramedCallout',
  'entitleSpaceForWhiteboardMultiUser',
  'createMemoFramedCallout',
  'createCollaboraFramedCallout',
  'entitleSpaceForOfficeDocuments',
  'readCalloutCollaboraDocument',
  'readOfficeDocumentText',
  'officeDocumentFileId',
  'officeDocumentParagraphs',
  'connectWhiteboardPeer',
  'readActivityLogOnCollaboration',
  'readCalloutsPlacement',
  'readPost',
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
  TagsetReservedName: ['FlowState'],
  AuthorizationPrivilege: ['MovePost', 'Update'],
  ActorType: ['User', 'Organization', 'VirtualContributor'],
  SidebarWidget: ['About', 'Community', 'Events', 'Activity'],
  NotificationEvent: ['OrganizationAdminSpaceCommunityInvitation'],
  CalendarEventType: ['Event'],
  RoleSetInvitationResultType: [],
  WhiteboardPreviewMode: ['Auto', 'Custom', 'Fixed'],
  CollaboraDocumentType: ['Wordprocessing'],
};


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

});

/**
 * The same surface, derived from client-web's source rather than listed by
 * hand: the lists above are the audit's floor, these follow the specs.
 */
describe('@contract lib surface as client-web/src uses it today', () => {
  const usage = scanClientWebLibUsage();

  test('the scan sees the suite (a scan that finds nothing must not pass)', () => {
    expect(usage.filesScanned).toBeGreaterThan(100);
    expect(usage.importedNames.size).toBeGreaterThan(100);
    expect(usage.directSdkOperations.size).toBeGreaterThan(10);
  });

  test('every name client-web imports from the lib barrel is exported by it (values and types)', () => {
    const exported = libBarrelExportNames();
    const missing = [...usage.importedNames].filter(name => !exported.has(name)).sort();
    expect(missing, `not exported by @alkemio/tests-lib: ${missing.join(', ')}`).toEqual([]);
  });

  test('every enum member client-web references on a lib-owned enum exists', () => {
    const problems: string[] = [];
    for (const [name, members] of usage.memberReferences) {
      const value = exportsOf[name];
      // Enums only: a plain object whose own values are all strings/numbers.
      // Classes (TestScenarioFactory …) are functions and are skipped here.
      if (!value || typeof value !== 'object') continue;
      const entries = Object.values(value as Record<string, unknown>);
      if (!entries.every(v => typeof v === 'string' || typeof v === 'number')) continue;
      for (const member of members) {
        if (!(member in (value as Record<string, unknown>))) problems.push(`${name}.${member}`);
      }
    }
    expect(problems.sort()).toEqual([]);
  });

  test('every generated-SDK operation client-web calls directly is a function on the client', () => {
    const sdk = getGraphqlClient() as unknown as Record<string, unknown>;
    const missing = [...usage.directSdkOperations].filter(op => typeof sdk[op] !== 'function').sort();
    expect(missing, `not on the generated SDK: ${missing.join(', ')}`).toEqual([]);
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

  test('space: an L0 reads back by its nameID, with level, host account and about profile', async () => {
    const byName = await readSpaceByNameId(base.space.nameId);
    expect(byName.error).toBeUndefined();
    const space = byName.data?.lookupByName.space;
    expect(space?.id).toBe(base.space.id);
    expect(space?.nameID).toBe(base.space.nameId);
    expect(space?.level).toEqual(expect.any(String));
    expect(space?.account.id).toEqual(expect.any(String));
    expect(space?.about.profile.displayName).toEqual(expect.any(String));
  });

  test('space: the subspace reads back through its parent, and the tree lists it', async () => {
    const sub = await readSubspaceByNameId(base.space.id, base.subspace.nameId);
    expect(sub.error).toBeUndefined();
    expect(sub.data?.lookup.space?.id).toBe(base.space.id);
    expect(sub.data?.lookup.space?.subspaceByNameID.id).toBe(base.subspace.id);
    expect(sub.data?.lookup.space?.subspaceByNameID.level).toEqual(expect.any(String));
    expect(sub.data?.lookup.space?.subspaceByNameID.about.profile.url).toEqual(expect.any(String));

    const tree = await readSpaceSubspaceTree(base.space.id);
    expect(tree.error).toBeUndefined();
    const l1 = tree.data?.lookup.space?.subspaces ?? [];
    expect(l1.map(s => s.id)).toContain(base.subspace.id);
    for (const s of l1) expect(Array.isArray(s.subspaces)).toBe(true);
  });

  test('role set: a user joins an open space as itself and reads back as a member', async () => {
    const joiner = TestUserManager.users.nonSpaceMember.id;
    const joined = await joinRoleSet(base.space.community.roleSetId, TestUser.NON_SPACE_MEMBER);
    expect(joined.error).toBeUndefined();
    expect(joined.data?.joinRoleSet.id).toBe(base.space.community.roleSetId);
    const members = await readRoleSetUsersInRole(base.space.community.roleSetId, RoleName.Member);
    expect(members.data?.lookup.roleSet?.usersInRole.map(u => u.id)).toContain(joiner);
  });

  test('callout: the seeded post callout reads back with its framing', async () => {
    const callout = await readCalloutFraming(base.space.collaboration.calloutPostId);
    expect(callout.error).toBeUndefined();
    expect(callout.data?.lookup.callout?.id).toBe(base.space.collaboration.calloutPostId);
    expect(callout.data?.lookup.callout?.framing.type).toEqual(expect.any(String));
    expect(callout.data?.lookup.callout?.framing.profile.url).toEqual(expect.any(String));
  });

  test('callouts set: a callout reads back with its framing type, framing link and accepted contribution types', async () => {
    // A CTA callout that accepts posts (every field 0.5 reads), beside the
    // seeded post callout as the plain-framing control.
    const title = `contract cta ${lib.UniqueIDGenerator.getID()}`;
    const linkName = `contract link ${lib.UniqueIDGenerator.getID()}`;
    const uri = 'https://example.com/contract-cta';
    const created = await lib.createCalloutWithData({
      calloutsSetID: base.space.collaboration.calloutsSetId,
      framing: {
        type: lib.CalloutFramingType.Link,
        profile: { displayName: title },
        link: { uri, profile: { displayName: linkName } },
      },
      settings: {
        contribution: {
          enabled: true,
          allowedTypes: [lib.CalloutContributionType.Post],
          canAddContributions: lib.CalloutAllowedActors.Members,
        },
        visibility: lib.CalloutVisibility.Published,
      },
    });
    const ctaId = created.data?.createCalloutOnCalloutsSet.id;
    expect(ctaId, 'seed the CTA callout').toEqual(expect.any(String));

    const set = await readCalloutsSetCalloutTypes(base.space.collaboration.calloutsSetId);
    expect(set.error).toBeUndefined();
    expect(set.data?.lookup.calloutsSet?.id).toBe(base.space.collaboration.calloutsSetId);
    const callouts = set.data?.lookup.calloutsSet?.callouts ?? [];

    const cta = callouts.find(c => c.id === ctaId);
    expect(cta?.framing.type).toBe(lib.CalloutFramingType.Link);
    expect(cta?.framing.profile.displayName).toBe(title);
    expect(cta?.framing.link?.uri).toBe(uri);
    expect(cta?.framing.link?.profile.displayName).toBe(linkName);
    expect(cta?.framing.whiteboard ?? null).toBeNull();
    expect(cta?.framing.memo ?? null).toBeNull();
    expect(cta?.settings.contribution.allowedTypes).toEqual([lib.CalloutContributionType.Post]);

    const post = callouts.find(c => c.id === base.space.collaboration.calloutPostId);
    expect(post?.framing.type).toBe(lib.CalloutFramingType.None);
    expect(post?.framing.whiteboard ?? null).toBeNull();
    expect(post?.framing.memo ?? null).toBeNull();
    expect(post?.framing.link ?? null).toBeNull();
  });

  test('callouts set: a draft and a published callout read back with their title and visibility', async () => {
    const title = `contract draft ${lib.UniqueIDGenerator.getID()}`;
    const created = await lib.createCalloutWithData({
      calloutsSetID: base.space.collaboration.calloutsSetId,
      framing: { profile: { displayName: title } },
      settings: { visibility: CalloutVisibility.Draft },
    });
    const draftId = created.data?.createCalloutOnCalloutsSet.id;
    expect(draftId, 'seed the draft callout').toEqual(expect.any(String));

    const set = await readCalloutsSetCalloutVisibility(base.space.collaboration.calloutsSetId);
    expect(set.error).toBeUndefined();
    expect(set.data?.lookup.calloutsSet?.id).toBe(base.space.collaboration.calloutsSetId);
    const callouts = set.data?.lookup.calloutsSet?.callouts ?? [];
    const draft = callouts.find(c => c.id === draftId);
    expect(draft?.framing.profile.displayName).toBe(title);
    expect(draft?.settings.visibility).toBe(CalloutVisibility.Draft);
    const post = callouts.find(c => c.id === base.space.collaboration.calloutPostId);
    expect(post?.settings.visibility, 'the seeded post callout is published').toBe(CalloutVisibility.Published);
  });

  test('callouts set: a callout reads back with its comments setting and its posts with their author', async () => {
    // A Posts callout with comments OFF (the seeded post callout has them ON),
    // and one post on it by the admin: every field the client-web specs read.
    const calloutTitle = `contract posts ${lib.UniqueIDGenerator.getID()}`;
    const postTitle = `contract post ${lib.UniqueIDGenerator.getID()}`;
    const created = await lib.createCalloutWithData({
      calloutsSetID: base.space.collaboration.calloutsSetId,
      framing: { profile: { displayName: calloutTitle } },
      settings: {
        framing: { commentsEnabled: false },
        contribution: {
          enabled: true,
          allowedTypes: [lib.CalloutContributionType.Post],
          canAddContributions: lib.CalloutAllowedActors.Members,
        },
        visibility: lib.CalloutVisibility.Published,
      },
    });
    const calloutId = created.data?.createCalloutOnCalloutsSet.id;
    expect(calloutId, 'seed the Posts callout').toEqual(expect.any(String));
    const post = await lib.createContributionOnCallout({
      calloutID: calloutId as string,
      type: lib.CalloutContributionType.Post,
      post: { profileData: { displayName: postTitle } },
    });
    expect(post.error, 'seed the post').toBeUndefined();

    const set = await readCalloutsSetCalloutResponses(base.space.collaboration.calloutsSetId);
    expect(set.error).toBeUndefined();
    expect(set.data?.lookup.calloutsSet?.id).toBe(base.space.collaboration.calloutsSetId);
    const callouts = set.data?.lookup.calloutsSet?.callouts ?? [];
    const byId = (id: string) => callouts.find(c => c.id === id);
    expect(byId(base.space.collaboration.calloutPostId)?.settings.framing.commentsEnabled, 'seeded post callout').toBe(true);
    const seeded = byId(calloutId as string);
    expect(seeded?.framing.profile.displayName).toBe(calloutTitle);
    expect(seeded?.settings.framing.commentsEnabled).toBe(false);
    expect(seeded?.contributions.map(c => c.post?.profile.displayName)).toEqual([postTitle]);
    expect(seeded?.contributions[0]?.post?.createdBy?.id, 'post author').toBe(TestUserManager.users.globalAdmin.id);
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

  test('callouts set: placement lists each post with its sortOrder and phase tags', async () => {
    const placement = await lib.readCalloutsPlacement(base.space.collaboration.calloutsSetId);
    expect(placement.error).toBeUndefined();
    const callouts = placement.data?.lookup.calloutsSet?.callouts;
    expect(Array.isArray(callouts)).toBe(true);
    expect(callouts?.map(c => c.id)).toContain(base.space.collaboration.calloutPostId);
    for (const callout of callouts ?? []) {
      expect(callout.id).toEqual(expect.any(String));
      expect(callout.sortOrder).toEqual(expect.any(Number));
      expect(Array.isArray(callout.classification?.flowState?.tags)).toBe(true);
    }
    // Negative control: an unknown callouts set never yields a populated list.
    const unknown = await lib.readCalloutsPlacement('00000000-0000-4000-8000-000000000000');
    expect(unknown.data?.lookup?.calloutsSet ?? null, JSON.stringify(unknown.error)).toBeNull();
    // ...and not because the request never reached the server.
    expect(unknown.error?.errors.map(e => e.code) ?? []).not.toContain('ENV_FAILURE');
  });
});

/** A one-entry zip archive (no CRC: the reader does not check it), enough to unit-test the readers. */
const zipOf = (name: string, data: Buffer, method: 0 | 8): Buffer => {
  const nameBytes = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(method, 8);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(method, 10);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(46 + nameBytes.length, 12);
  eocd.writeUInt32LE(30 + nameBytes.length + data.length, 16);
  return Buffer.concat([local, nameBytes, data, central, nameBytes, eocd]);
};

describe('@contract content editing readers (W2 journey 5): whiteboard, memo, Collabora document', () => {
  const uid = lib.UniqueIDGenerator.getID();
  let base: OrganizationWithSpaceModel;
  let calloutsSetId: string;

  beforeAll(async () => {
    base = await TestScenarioFactory.createBaseScenario({
      name: `lib-contract-content-${uid}`,
      space: { collaboration: { addTutorialCallouts: false, addPostCollectionCallout: false } },
    });
    calloutsSetId = base.space.collaboration.calloutsSetId;
  }, ROUND_TRIP_BUDGET_MS);

  afterAll(async () => {
    if (base) await TestScenarioFactory.cleanUpBaseScenario(base);
  }, ROUND_TRIP_BUDGET_MS);

  test('LA-1 whiteboard state: updatedDate parses, isMultiUser is a boolean, the preview mode is a member of the enum', async () => {
    const created = await lib.createWhiteboardFramedCallout(calloutsSetId, `contract WB ${uid}`, `contract-wb-${uid}`);
    const state = await lib.readWhiteboardState(created.whiteboardId);
    expect(state.error).toBeUndefined();
    const whiteboard = state.data?.lookup.whiteboard;
    expect(whiteboard?.id).toBe(created.whiteboardId);
    expect(typeof whiteboard?.isMultiUser).toBe('boolean');
    expect(Number.isNaN(Date.parse(String(whiteboard?.updatedDate)))).toBe(false);
    expect(Object.values(lib.WhiteboardPreviewMode)).toContain(whiteboard?.previewSettings.mode);
    // both visuals the client uploads on close are selected; a never-edited board may have no uri yet
    expect(whiteboard?.profile.id).toEqual(expect.any(String));
    for (const visual of [whiteboard?.profile.visual, whiteboard?.profile.preview]) {
      expect(visual === null || visual === undefined || typeof visual.uri === 'string').toBe(true);
    }
  });

  test('LA-3/LA-4 memo content: the seeded markdown reads back; an unknown memo is an error, not an empty memo', async () => {
    const memo = await lib.createMemoFramedCallout(calloutsSetId, {
      displayName: `contract memo callout ${uid}`,
      memoTitle: `contract memo ${uid}`,
      markdown: `contract ${uid}`,
    });
    expect(memo.calloutUrl).toEqual(expect.any(String));
    const read = await lib.readMemoContent(memo.memoId);
    expect(read.error).toBeUndefined();
    expect(read.data?.lookup.memo?.id).toBe(memo.memoId);
    expect(read.data?.lookup.memo?.markdown).toContain(`contract ${uid}`);
    expect(Number.isNaN(Date.parse(String(read.data?.lookup.memo?.updatedDate)))).toBe(false);
    expect(read.data?.lookup.memo?.authorization?.myPrivileges).toContain(lib.AuthorizationPrivilege.UpdateContent);
    // negative control: the reader does not invent content for an id that is not a memo
    const unknown = await lib.readMemoContent('00000000-0000-4000-8000-000000000000');
    expect(unknown.data?.lookup.memo ?? null).toBeNull();
    // the lookup's own refusal, not a transport failure (which also leaves no data)
    expect(unknown.error?.errors.map(e => e.code)).toEqual(['ENTITY_NOT_FOUND']);
  });

  test('LA-5/LA-6/LA-7 Collabora: entitle, create, read back the document and its stored text', async () => {
    await lib.entitleSpaceForOfficeDocuments(base.space.id);
    const created = await lib.createCollaboraFramedCallout(calloutsSetId, {
      displayName: `contract doc ${uid}`,
      nameID: `contract-doc-${uid}`,
      documentType: lib.CollaboraDocumentType.Wordprocessing,
    });
    expect(created.previewUrl).toMatch(/\/api\/private\/wopi\/files\/[^/]+\/preview$/);

    const read = await lib.readCalloutCollaboraDocument(created.calloutId);
    expect(read.error).toBeUndefined();
    const document = read.data?.lookup.callout?.framing.collaboraDocument;
    expect(document?.id).toBe(created.collaboraDocumentId);
    expect(document?.documentType).toBe(lib.CollaboraDocumentType.Wordprocessing);
    expect(document?.previewUrl).toBe(created.previewUrl);

    // A blank document nobody has saved is stored with zero bytes (observed 2026-11-09 and 2026-11-10, local stack):
    // no paragraphs, and the read itself succeeded (a failed fetch throws, so "empty" is never a failed read).
    const text = await lib.readOfficeDocumentText(created.previewUrl);
    expect(text).toEqual({ paragraphs: [], bytes: 0 });
    // negative control: a document id the platform does not hold is a thrown error, not "no paragraphs"
    await expect(
      lib.readOfficeDocumentText('/api/private/wopi/files/00000000-0000-4000-8000-000000000000/preview')
    ).rejects.toThrow(/office document fetch failed/);
  });

  test('LA-7 the reader parses an OpenDocument and a DOCX, and refuses something that is not an office document', () => {
    const fixtures = nodePath.resolve(__dirname, '../functional-api/collabora/files-to-upload');
    expect(lib.officeDocumentParagraphs(readFileSync(nodePath.join(fixtures, 'collabora-import.odt')))).toEqual([
      'Alkemio test-suites Collabora import fixture.',
    ]);
    // a DOCX with a deflated word/document.xml: two paragraphs, one of them split into runs, one with an entity
    const docx = zipOf('word/document.xml', deflateRawSync(Buffer.from(
      '<w:document><w:body><w:p><w:r><w:t>DOC </w:t></w:r><w:r><w:t xml:space="preserve">abc</w:t></w:r></w:p><w:p/><w:p><w:r><w:t>A &amp; B</w:t></w:r></w:p></w:body></w:document>'
    )), 8);
    expect(lib.officeDocumentParagraphs(docx)).toEqual(['DOC abc', '', 'A & B']);
    // character references (decimal, hex, and an escaped one that must stay literal) and an ODT repeated-space run
    const refs = zipOf('word/document.xml', Buffer.from(
      '<w:document><w:body><w:p><w:r><w:t>A&#32;B&#x43;&amp;#32;</w:t></w:r></w:p></w:body></w:document>'
    ), 0);
    expect(lib.officeDocumentParagraphs(refs)).toEqual(['A BC&#32;']);
    const spaces = zipOf('content.xml', Buffer.from(
      '<office:text><text:p>a<text:s text:c="3"/>b<text:s/>c</text:p></office:text>'
    ), 0);
    expect(lib.officeDocumentParagraphs(spaces), 'text:c counts spaces').toEqual(['a   b c']);
    expect(lib.officeDocumentParagraphs(Buffer.alloc(0)), 'an unsaved blank document has no paragraphs').toEqual([]);
    expect(() => lib.officeDocumentParagraphs(Buffer.from('this is not a zip archive at all'))).toThrow(/not an office document/);
    expect(() => lib.officeDocumentFileId('https://example.test/not-a-preview')).toThrow(/not a Collabora preview URL/);
  });

  test('LA-8 the rooms gauge reader takes collaboration_rooms_active from a /metrics exposition, and refuses one without it', () => {
    const exposition = [
      '# HELP collaboration_rooms_active Number of live in-memory document rooms.',
      '# TYPE collaboration_rooms_active gauge',
      'collaboration_rooms_active 3',
      '# HELP collaboration_rooms_active_total_x a longer name that must not match',
      'collaboration_rooms_active_total_x 9',
    ].join('\n');
    expect(lib.collaborationRoomsActiveOf(exposition)).toBe(3);
    expect(lib.collaborationRoomsActiveOf('collaboration_rooms_active 0\n')).toBe(0);
    // Prometheus float and exponent forms of the same count
    expect(lib.collaborationRoomsActiveOf('collaboration_rooms_active 3.0\n')).toBe(3);
    expect(lib.collaborationRoomsActiveOf('collaboration_rooms_active 1e+00\n')).toBe(1);
    // negative control: an exposition without the gauge is an error, never a count of 0
    expect(() => lib.collaborationRoomsActiveOf('collaboration_rooms_active_total_x 9\n')).toThrow(
      /carry no collaboration_rooms_active/
    );
    expect(typeof lib.readCollaborationRoomsActive).toBe('function');
  });
});
