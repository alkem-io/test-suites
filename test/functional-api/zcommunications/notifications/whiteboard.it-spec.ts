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
  createOrgAndSpaceWithUsers,
  registerUsersAndAssignToAllEntitiesAsMembers,
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
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
const spaceName = 'not-up-eco-name' + uniqueId;
const spaceNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let spaceWhiteboardId = '';
let preferencesConfig: any[] = [];
const spaceMemOnly = `spacemem${uniqueId}@alkem.io`;
const challengeAndSpaceMemOnly = `chalmem${uniqueId}@alkem.io`;
const opportunityAndChallengeAndSpaceMem = `oppmem${uniqueId}@alkem.io`;

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

  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);
  await registerUsersAndAssignToAllEntitiesAsMembers(
    spaceMemOnly,
    challengeAndSpaceMemOnly,
    opportunityAndChallengeAndSpaceMem
  );

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: spaceMemOnly,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: challengeAndSpaceMemOnly,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: opportunityAndChallengeAndSpaceMem,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.qaUserId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },

    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.WHITEBOARD_CREATED,
    },
  ];
});

afterAll(async () => {
  await removeUser(spaceMemOnly);
  await removeUser(challengeAndSpaceMemOnly);
  await removeUser(opportunityAndChallengeAndSpaceMem);

  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
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

  test('GA create space whiteboard - GA(1), HA (2), HM(6) get notifications', async () => {
    const subjectTextAdmin = `${spaceName}: New Whiteboard created by admin`;
    const subjectTextMember = `${spaceName} - New Whiteboard created by admin, have a look!`;

    // Act
    const res = await createWhiteboardOnCallout(
      entitiesId.spaceWhiteboardCalloutId,
      whiteboardDisplayName,
      TestUser.GLOBAL_ADMIN
    );
    spaceWhiteboardId = res.body.data.createWhiteboardOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.globalAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.spaceAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.qaUserEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceMemberEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [`${spaceMemOnly}`])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [challengeAndSpaceMemOnly])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [
        opportunityAndChallengeAndSpaceMem,
      ])
    );
    await deleteWhiteboard(spaceWhiteboardId);
  });

  test('HA create space whiteboard - GA(1), HA (1), HM(6) get notifications', async () => {
    const subjectTextAdmin = `[${spaceName}] New Whiteboard created by space`;
    const subjectTextMember = `${spaceName} - New Whiteboard created by space, have a look!`;
    // Act
    await createWhiteboardOnCallout(
      entitiesId.spaceWhiteboardCalloutId,
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
      await expectedDataFunc(subjectTextAdmin, [users.spaceAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.qaUserEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceMemberEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [`${spaceMemOnly}`])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [challengeAndSpaceMemOnly])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [
        opportunityAndChallengeAndSpaceMem,
      ])
    );
  });

  test('HA create challenge whiteboard - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    const subjectTextAdmin = `[${challengeName}] New Whiteboard created by space`;
    const subjectTextMember = `${challengeName} - New Whiteboard created by space, have a look!`;
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
      await expectedDataFunc(subjectTextAdmin, [users.spaceAdminEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.qaUserEmail])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceMemberEmail])
    );

    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [`${spaceMemOnly}`])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [challengeAndSpaceMemOnly])
    );

    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [
        opportunityAndChallengeAndSpaceMem,
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

    // HA - 1 mail as space admin
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextAdmin, [users.spaceAdminEmail])
    );

    // QA - 1 as opportunity member
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.qaUserEmail])
    );

    // HM - 2 mails as opportunity member and admin
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [users.spaceMemberEmail])
    );

    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [`${spaceMemOnly}`])
    );

    // Challenge member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataFunc(subjectTextMember, [challengeAndSpaceMemOnly])
    );

    // OM - 1 mail as opportunity member
    expect(mails[0]).toEqual(
      await expectedDataFunc(subjectTextMember, [
        opportunityAndChallengeAndSpaceMem,
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
