import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/roles/community/communications-helper';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const spaceName = 'not-up-eco-name' + uniqueId;
const spaceNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let preferencesConfig: any[] = [];
const postSubjectTextMember = `${spaceName} - New comment received on Callout &#34;General chat 💬&#34;, have a look!`;

const expectedDataSpace = async (toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: postSubjectTextMember,
      toAddresses,
    }),
  ]);
};

const expectedDataChal = async (toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `${challengeName} - New comment received on Callout &#34;General chat 💬&#34;, have a look!`,
      toAddresses,
    }),
  ]);
};

const expectedDataOpp = async (toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `${opportunityName} - New comment received on Callout &#34;General chat 💬&#34;, have a look!`,
      toAddresses,
    }),
  ]);
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);
  await createOpportunityWithUsersCodegen(opportunityName);

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },
  ];
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Notifications - callout comments', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationDiscussionCommentCreated,
      'false'
    );

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'true')
    );
  });

  test('GA create space callout comment - HM(7) get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.spaceDiscussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.GLOBAL_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);
    expect(mails[0]).toEqual(await expectedDataSpace([users.globalAdminEmail]));
    expect(mails[0]).toEqual(await expectedDataSpace([users.spaceAdminEmail]));
    expect(mails[0]).toEqual(await expectedDataSpace([users.spaceMemberEmail]));
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.challengeAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.challengeMemberEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.opportunityAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.opportunityMemberEmail])
    );
  });

  test('HA create space callout comment - HM(7) get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.spaceDiscussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);
    expect(mails[0]).toEqual(await expectedDataSpace([users.globalAdminEmail]));
    expect(mails[0]).toEqual(await expectedDataSpace([users.spaceAdminEmail]));
    expect(mails[0]).toEqual(await expectedDataSpace([users.spaceMemberEmail]));
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.challengeAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.challengeMemberEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.opportunityAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.opportunityMemberEmail])
    );
  });

  test('HA create challenge callout comment - HM(5),  get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.challengeDiscussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(await expectedDataChal([users.globalAdminEmail]));
    // HA don't get notification as is member only of HUB
    expect(mails[0]).not.toEqual(
      await expectedDataChal([users.spaceAdminEmail])
    );
    // Space member does not reacive email

    expect(mails[0]).not.toEqual(
      await expectedDataChal([users.spaceMemberEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataChal([users.challengeAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataChal([users.challengeMemberEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataChal([users.opportunityAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataChal([users.opportunityMemberEmail])
    );
  });

  test('OM create opportunity callout comment - HM(3), get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.opportunityDiscussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.OPPORTUNITY_MEMBER
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(3);
    expect(mails[0]).toEqual(await expectedDataOpp([users.globalAdminEmail]));
    // HA don't get notification as is member only of HUB
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([users.spaceAdminEmail])
    );
    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([users.spaceMemberEmail])
    );
    // Challenge admin does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([users.challengeAdminEmail])
    );
    // Challenge member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([users.challengeMemberEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataOpp([users.opportunityAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataOpp([users.opportunityMemberEmail])
    );
  });

  test('OA create opportunity callout comment - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'false')
    );
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.opportunityDiscussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
