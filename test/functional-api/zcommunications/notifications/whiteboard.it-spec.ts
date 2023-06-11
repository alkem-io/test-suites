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
import { entitiesId, getMailsData } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { removeUser } from '@test/functional-api/user-management/user.request.params';
import {
  createWhiteboardOnCallout,
  deleteWhiteboard,
} from '@test/functional-api/integration/whiteboard/whiteboard.request.params';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const hubName = 'not-up-eco-name' + uniqueId;
const hubNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let hubWhiteboardId = '';
let preferencesConfig: any[] = [];
const hubMemOnly = `hubmem${uniqueId}@alkem.io`;
const challengeAndHubMemOnly = `chalmem${uniqueId}@alkem.io`;
const opportunityAndChallengeAndHubMem = `oppmem${uniqueId}@alkem.io`;

const expectedDataFunc = async (subject: string, toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject,
      toAddresses,
    }),
  ]);
};

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
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: hubMemOnly,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: opportunityAndChallengeAndHubMem,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.hubAdminId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.hubMemberId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.qaUserId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
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

// skip the suite until fixed the whiteboard callout creation
describe.skip('Notifications - whiteboard', () => {
  let whiteboardDisplayName = '';

  beforeEach(async () => {
    await deleteMailSlurperMails();
    whiteboardDisplayName = `asp-d-name-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.WHITEBOARD_CREATED,
      'false'
    );

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });

  test('GA create hub whiteboard - GA(1), HA (2), HM(6) get notifications', async () => {
    const subjectTextAdmin = `[${hubName}] New Whiteboard created by admin`;
    const subjectTextMember = `${hubName} - New Whiteboard created by admin, have a look!`;

    // Act
    const res = await createWhiteboardOnCallout(
      entitiesId.hubWhiteboardCalloutId,
      whiteboardDisplayName,
      TestUser.GLOBAL_ADMIN
    );
    hubWhiteboardId = res.body.data.createWhiteboardOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.globalAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.hubAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.qaUserEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.hubMemberEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [`${hubMemOnly}`])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [challengeAndHubMemOnly])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [
        opportunityAndChallengeAndHubMem,
      ])
    );
    await deleteWhiteboard(hubWhiteboardId);
  });

  test('HA create hub whiteboard - GA(1), HA (1), HM(6) get notifications', async () => {
    const subjectTextAdmin = `[${hubName}] New Whiteboard created by hub`;
    const subjectTextMember = `${hubName} - New Whiteboard created by hub, have a look!`;
    // Act
    await createWhiteboardOnCallout(
      entitiesId.hubWhiteboardCalloutId,
      whiteboardDisplayName,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.globalAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.hubAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.qaUserEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.hubMemberEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [`${hubMemOnly}`])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [challengeAndHubMemOnly])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [
        opportunityAndChallengeAndHubMem,
      ])
    );
  });

  test('HA create challenge whiteboard - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    const subjectTextAdmin = `[${challengeName}] New Whiteboard created by hub`;
    const subjectTextMember = `${challengeName} - New Whiteboard created by hub, have a look!`;
    // Act
    await createWhiteboardOnCallout(
      entitiesId.challengeWhiteboardCalloutId,
      whiteboardDisplayName,
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(8);

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.globalAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.hubAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.qaUserEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.hubMemberEmail])
    );

    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [`${hubMemOnly}`])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [challengeAndHubMemOnly])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [
        opportunityAndChallengeAndHubMem,
      ])
    );
  });

  test('OM create opportunity whiteboard - HA(2), CA(1), OA(2), OM(4), get notifications', async () => {
    const subjectTextAdmin = `[${opportunityName}] New Whiteboard created by qa`;
    const subjectTextMember = `${opportunityName} - New Whiteboard created by qa, have a look!`;
    // Act
    await createWhiteboardOnCallout(
      entitiesId.opportunityWhiteboardCalloutId,
      whiteboardDisplayName,
      TestUser.QA_USER
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    // GA - 2 mails as opportunity member and admin
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.globalAdminEmail])
    );

    // HA - 1 mail as hub admin
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.hubAdminEmail])
    );

    // QA - 1 as opportunity member
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.qaUserEmail])
    );

    // HM - 2 mails as opportunity member and admin
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.hubMemberEmail])
    );

    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [`${hubMemOnly}`])
    );

    // Challenge member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [challengeAndHubMemOnly])
    );

    // OM - 1 mail as opportunity member
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [
        opportunityAndChallengeAndHubMem,
      ])
    );
  });

  test('OA create opportunity whiteboard - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    await createWhiteboardOnCallout(
      entitiesId.opportunityWhiteboardCalloutId,
      whiteboardDisplayName,
      TestUser.QA_USER
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
