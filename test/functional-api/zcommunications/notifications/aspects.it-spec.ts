import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndHubWithUsers,
  registerUsersAndAssignToAllEntitiesAsMembers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData, users } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { removeUser } from '@test/functional-api/user-management/user.request.params';
import {
  createAspectOnContext,
  AspectTypes,
  removeAspect,
} from '@test/functional-api/integration/aspect/aspect.request.params';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const hubName = 'not-up-eco-name' + uniqueId;
const hubNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let hubAspectId = '';
let challengeAspectId = '';
let opportunityAspectId = '';
let aspectDisplayName = '';
let aspectDescription = '';
let preferencesConfig: any[] = [];
const hubMemOnly = `hubmem${uniqueId}@alkem.io`;
const challengeAndHubMemOnly = `chalmem${uniqueId}@alkem.io`;
const opportunityAndChallengeAndHubMem = `oppmem${uniqueId}@alkem.io`;

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);
  await registerUsersAndAssignToAllEntitiesAsMembers(
    hubMemOnly,
    challengeAndHubMemOnly,
    opportunityAndChallengeAndHubMem
  );

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: hubMemOnly,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: hubMemOnly,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: opportunityAndChallengeAndHubMem,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: opportunityAndChallengeAndHubMem,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },

    {
      userID: users.hubAdminId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.ASPECT_CREATED,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.ASPECT_CREATED_ADMIN,
    },
  ];
});

afterAll(async () => {
  await removeUser(hubMemOnly);
  await removeUser(challengeAndHubMemOnly);
  await removeUser(opportunityAndChallengeAndHubMem);

  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - aspect', () => {
  let aspectNameID = '';

  beforeEach(async () => {
    await deleteMailSlurperMails();

    aspectNameID = `aspect-name-id-${uniqueId}`;
    aspectDisplayName = `aspect-d-name-${uniqueId}`;
    aspectDescription = `aspectDescription-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.ASPECT_COMMENT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.ASPECT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.ASPECT_CREATED_ADMIN,
      'false'
    );

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });

  afterEach(async () => {
    await removeAspect(hubAspectId);
    await removeAspect(challengeAspectId);
    await removeAspect(opportunityAspectId);
  });

  test('GA create hub aspect - GA(1), HA (2), HM(6) get notifications', async () => {
    const hubAspectSubjectText = `New aspect created on ${hubName}: ${aspectDisplayName}`;
    // Act
    const resAspectonHub = await createAspectOnContext(
      entitiesId.hubContextId,
      aspectDisplayName,
      aspectNameID,
      aspectDescription,
      AspectTypes.KNOWLEDGE,
      TestUser.GLOBAL_ADMIN
    );
    hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [`${hubMemOnly}`],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );

    expect(mails[1]).toEqual(9);
  });

  test('HA create hub aspect - GA(1), HA (1), HM(6) get notifications', async () => {
    const hubAspectSubjectText = `New aspect created on ${hubName}: ${aspectDisplayName}`;
    // Act
    const resAspectonHub = await createAspectOnContext(
      entitiesId.hubContextId,
      aspectDisplayName,
      aspectNameID,
      aspectDescription,
      AspectTypes.KNOWLEDGE,
      TestUser.HUB_ADMIN
    );
    hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [`${hubMemOnly}`],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );
    expect(mails[1]).toEqual(9);
  });

  test('CA create challenge aspect - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    const hubAspectSubjectText = `New aspect created on ${challengeName}: ${aspectDisplayName}`;
    // Act
    const resAspectonHub = await createAspectOnContext(
      entitiesId.challengeContextId,
      aspectDisplayName,
      aspectNameID,
      aspectDescription,
      AspectTypes.KNOWLEDGE,
      TestUser.HUB_ADMIN
    );
    challengeAspectId = resAspectonHub.body.data.createAspectOnContext.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [`${hubMemOnly}`],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );
    expect(mails[1]).toEqual(8);
  });

  test('OM create opportunity aspect - HA(2), CA(1), OA(2), OM(4), get notifications', async () => {
    const hubAspectSubjectText = `New aspect created on ${opportunityName}: ${aspectDisplayName}`;
    // Act
    const resAspectonHub = await createAspectOnContext(
      entitiesId.opportunityContextId,
      aspectDisplayName,
      aspectNameID,
      aspectDescription,
      AspectTypes.KNOWLEDGE,
      TestUser.QA_USER
    );
    opportunityAspectId = resAspectonHub.body.data.createAspectOnContext.id;

    await delay(6000);
    const mails = await getMailsData();

    // GA - 2 mails as opportunity member and admin
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    // HA - 1 mail as hub admin
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );

    // QA - 1 as opportunity member
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );

    // HM - 2 mails as opportunity member and admin
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [`${hubMemOnly}`],
        }),
      ])
    );

    // Challenge member does not reacive email
    expect(mails[0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );

    // OM - 1 mail as opportunity member and admin
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubAspectSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );
    expect(mails[1]).toEqual(7);
  });

  test('OA create opportunity aspect - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    const resAspectonHub = await createAspectOnContext(
      entitiesId.opportunityContextId,
      aspectDisplayName,
      aspectNameID,
      aspectDescription,
      AspectTypes.KNOWLEDGE,
      TestUser.QA_USER
    );
    opportunityAspectId = resAspectonHub.body.data.createAspectOnContext.id;

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
