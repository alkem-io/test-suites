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
  createCalloutOnCollaboration,
  deleteCallout,
  updateCalloutVisibility,
} from '@test/functional-api/integration/callouts/callouts.request.params';
import {
  CalloutState,
  CalloutType,
  CalloutVisibility,
} from '@test/functional-api/integration/callouts/callouts-enum';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const hubName = 'not-up-eco-name' + uniqueId;
const hubNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;

let preferencesConfig: any[] = [];
const hubMemOnly = `hubmem${uniqueId}@alkem.io`;
const challengeAndHubMemOnly = `chalmem${uniqueId}@alkem.io`;
const opportunityAndChallengeAndHubMem = `oppmem${uniqueId}@alkem.io`;
let calloutNameID = '';
let calloutDisplayName = '';
let calloutDescription = '';
let calloutId = '';

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
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: hubMemOnly,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: opportunityAndChallengeAndHubMem,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: users.hubAdminId,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: users.hubMemberId,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: users.qaUserId,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
    },

    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.CALLOUT_PUBLISHED,
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

afterEach(async () => {
  await deleteCallout(calloutId);
});

describe('Notifications - aspect', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();

    calloutNameID = `call-name-id-${uniqueId}`;
    calloutDisplayName = `call-d-name-${uniqueId}`;
    calloutDescription = `callDescription-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.CALLOUT_PUBLISHED,
      'false'
    );

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });
  test('GA PUBLISH hub callout - HM(7) get notifications', async () => {
    const hubCalloutSubjectText = `${hubName} - New callout is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName,
      calloutNameID,
      calloutDescription,
      CalloutState.OPEN,
      CalloutType.CARD,
      TestUser.GLOBAL_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(calloutId, CalloutVisibility.PUBLISHED);

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [`${hubMemOnly}`],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );

    expect(mails[1]).toEqual(7);
  });

  test('GA create DRAFT -> PUBLISHED -> DRAFT -> PUBLISHED hub callout - HM(7) get notifications on PUBLISH event only', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName,
      calloutNameID,
      calloutDescription,
      CalloutState.OPEN,
      CalloutType.CARD,
      TestUser.GLOBAL_ADMIN
    );

    calloutId = res.body.data.createCalloutOnCollaboration.id;
    await delay(1500);
    let mails = await getMailsData();

    expect(mails[1]).toEqual(0);

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.DRAFT,
      TestUser.HUB_ADMIN
    );

    await delay(1500);
    mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    mails = await getMailsData();

    expect(mails[1]).toEqual(14);
  });

  test('HA create PUBLISHED hub callout type: CARD - HM(7) get notifications', async () => {
    const hubCalloutSubjectText = `${hubName} - New callout is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName,
      calloutNameID,
      calloutDescription,
      CalloutState.OPEN,
      CalloutType.CARD,
      TestUser.HUB_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [`${hubMemOnly}`],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );
    expect(mails[1]).toEqual(7);
  });

  test('HA create PUBLISHED hub callout type: CANVAS - HM(7) get notifications', async () => {
    const hubCalloutSubjectText = `${hubName} - New callout is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName,
      calloutNameID,
      calloutDescription,
      CalloutState.OPEN,
      CalloutType.CANVAS,
      TestUser.HUB_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [`${hubMemOnly}`],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: hubCalloutSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );
    expect(mails[1]).toEqual(7);
  });

  test('HA create PUBLISHED challenge callout type: CARD - CM(5) get notifications', async () => {
    const challengeCalloutSubjectText = `${challengeName} - New callout is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.challengeCollaborationId,
      calloutDisplayName,
      calloutNameID,
      calloutDescription,
      CalloutState.OPEN,
      CalloutType.CARD,
      TestUser.HUB_ADMIN
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeCalloutSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    // Don't receive as Hub Admin is not member of challenge
    expect(mails[0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeCalloutSubjectText,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeCalloutSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeCalloutSubjectText,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeCalloutSubjectText,
          toAddresses: [`${hubMemOnly}`],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeCalloutSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: challengeCalloutSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );
    expect(mails[1]).toEqual(5);
  });

  test('OA create PUBLISHED opportunity callout type: CARD - OM(4) get notifications', async () => {
    const opportunityCalloutSubjectText = `${opportunityName} - New callout is published &#34;${calloutDisplayName}&#34;, have a look!`;
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.opportunityCollaborationId,
      calloutDisplayName,
      calloutNameID,
      calloutDescription,
      CalloutState.OPEN,
      CalloutType.CARD,
      TestUser.HUB_MEMBER
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;
    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.HUB_MEMBER
    );

    await delay(6000);
    const mails = await getMailsData();

    // GA - 1 mails as opportunity member; as admin - 0
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: opportunityCalloutSubjectText,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );

    // HA - 0 mail as hub admin
    expect(mails[0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: opportunityCalloutSubjectText,
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );

    // QA - 1 as opportunity member
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: opportunityCalloutSubjectText,
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );

    // HM - 1 mails as opportunity member; as admin - 0
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: opportunityCalloutSubjectText,
          toAddresses: [users.hubMemberEmail],
        }),
      ])
    );

    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: opportunityCalloutSubjectText,
          toAddresses: [`${hubMemOnly}`],
        }),
      ])
    );

    // Challenge member does not reacive email
    expect(mails[0]).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: opportunityCalloutSubjectText,
          toAddresses: [challengeAndHubMemOnly],
        }),
      ])
    );

    // OM - 1 mail as opportunity member
    expect(mails[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: opportunityCalloutSubjectText,
          toAddresses: [opportunityAndChallengeAndHubMem],
        }),
      ])
    );
    expect(mails[1]).toEqual(4);
  });

  test('OA create PUBLISHED opportunity callout type: CARD - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.opportunityCollaborationId,
      calloutDisplayName,
      calloutNameID,
      calloutDescription,
      CalloutState.OPEN,
      CalloutType.CARD,
      TestUser.HUB_MEMBER
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(
      calloutId,
      CalloutVisibility.PUBLISHED,
      TestUser.QA_USER
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
