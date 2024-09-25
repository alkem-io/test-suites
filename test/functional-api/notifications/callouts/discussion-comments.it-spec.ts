import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/utils/data-setup/entities';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import { entitiesId, getMailsData } from '@test/types/entities-helper';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const spaceName = 'not-up-eco-name' + uniqueId;
const spaceNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let preferencesConfig: any[] = [];
const postSubjectTextMember = `${spaceName} - New comment received on Callout \u0026#34;Space Post Callout\u0026#34;, have a look!`;

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
      subject: `${challengeName} - New comment received on Callout \u0026#34;Challenge Post Callout\u0026#34;, have a look!`,
      toAddresses,
    }),
  ]);
};

const expectedDataOpp = async (toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `${opportunityName} - New comment received on Callout \u0026#34;Opportunity Post Callout\u0026#34;, have a look!`,
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

  preferencesConfig = [
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.challengeMember.id,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.opportunityMember.id,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },

    {
      userID: users.opportunityAdmin.id,
      type: UserPreferenceType.NotificationDiscussionCommentCreated,
    },
  ];
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Notifications - callout comments', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationDiscussionCommentCreated,
      'false'
    );

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'true')
    );
  });

  // ToDo: fix test
  test.skip('GA create space callout comment - HM(7) get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.space.discussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.GLOBAL_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.globalAdmin.email])
    );
    expect(mails[0]).toEqual(await expectedDataSpace([users.spaceAdmin.email]));
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.spaceMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.challengeAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.challengeMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.opportunityAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.opportunityMember.email])
    );
  });

  // ToDo: fix test
  test.skip('HA create space callout comment - HM(7) get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.space.discussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.globalAdmin.email])
    );
    expect(mails[0]).toEqual(await expectedDataSpace([users.spaceAdmin.email]));
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.spaceMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.challengeAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.challengeMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.opportunityAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataSpace([users.opportunityMember.email])
    );
  });

  test('HA create challenge callout comment - HM(5),  get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.challenge.discussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(await expectedDataChal([users.globalAdmin.email]));
    // HA don't get notification as is member only of HUB
    expect(mails[0]).not.toEqual(
      await expectedDataChal([users.spaceAdmin.email])
    );
    // Space member does not reacive email

    expect(mails[0]).not.toEqual(
      await expectedDataChal([users.spaceMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataChal([users.challengeAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataChal([users.challengeMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataChal([users.opportunityAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataChal([users.opportunityMember.email])
    );
  });

  test('OM create opportunity callout comment - HM(3), get notifications', async () => {
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.opportunity.discussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.OPPORTUNITY_MEMBER
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(3);
    expect(mails[0]).toEqual(await expectedDataOpp([users.globalAdmin.email]));
    // HA don't get notification as is member only of HUB
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([users.spaceAdmin.email])
    );
    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([users.spaceMember.email])
    );
    // Challenge admin does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([users.challengeAdmin.email])
    );
    // Challenge member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([users.challengeMember.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataOpp([users.opportunityAdmin.email])
    );
    expect(mails[0]).toEqual(
      await expectedDataOpp([users.opportunityMember.email])
    );
  });

  test('OA create opportunity callout comment - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'false')
    );
    // Act
    await sendMessageToRoomCodegen(
      entitiesId.opportunity.discussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
