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
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { delay } from '@test/utils/delay';
import { postCommentInCallout } from '@test/functional-api/integration/comments/comments.request.params';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const hubName = 'not-up-eco-name' + uniqueId;
const hubNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let preferencesConfig: any[] = [];
const cardSubjectTextMember = `${hubName} - New comment received on Callout &#34;Suggestions, Questions, and Feedback&#34;, have a look!`;

const expectedDataHub = async (toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: cardSubjectTextMember,
      toAddresses,
    }),
  ]);
};

const expectedDataChal = async (toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `${challengeName} - New comment received on Callout &#34;Suggestions, Questions, and Feedback&#34;, have a look!`,
      toAddresses,
    }),
  ]);
};

const expectedDataOpp = async (toAddresses: any[]) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: `${opportunityName} - New comment received on Callout &#34;Suggestions, Questions, and Feedback&#34;, have a look!`,
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

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: users.hubMemberId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: users.hubAdminId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: users.hubAdminId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },
  ];
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - callout comments', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.DISCUSSION_COMMENT_CREATED,
      'false'
    );

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });

  test('GA create hub callout comment - HM(7) get notifications', async () => {
    // Act
    await postCommentInCallout(
      entitiesId.hubDiscussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.GLOBAL_ADMIN
    );
    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);
    expect(mails[0]).toEqual(await expectedDataHub([users.globalAdminEmail]));
    expect(mails[0]).toEqual(await expectedDataHub([users.hubAdminEmail]));
    expect(mails[0]).toEqual(await expectedDataHub([users.hubMemberEmail]));
    expect(mails[0]).toEqual(
      await expectedDataHub([users.challengeAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataHub([users.challengeMemberEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataHub([users.opportunityAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataHub([users.opportunityMemberEmail])
    );
  });

  test('HA create hub callout comment - HM(7) get notifications', async () => {
    // Act
    await postCommentInCallout(
      entitiesId.hubDiscussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);
    expect(mails[0]).toEqual(await expectedDataHub([users.globalAdminEmail]));
    expect(mails[0]).toEqual(await expectedDataHub([users.hubAdminEmail]));
    expect(mails[0]).toEqual(await expectedDataHub([users.hubMemberEmail]));
    expect(mails[0]).toEqual(
      await expectedDataHub([users.challengeAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataHub([users.challengeMemberEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataHub([users.opportunityAdminEmail])
    );
    expect(mails[0]).toEqual(
      await expectedDataHub([users.opportunityMemberEmail])
    );
  });

  test('HA create challenge callout comment - HM(5),  get notifications', async () => {
    // Act
    await postCommentInCallout(
      entitiesId.challengeDiscussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(await expectedDataChal([users.globalAdminEmail]));
    // HA don't get notification as is member only of HUB
    expect(mails[0]).not.toEqual(await expectedDataChal([users.hubAdminEmail]));
    // Hub member does not reacive email

    expect(mails[0]).not.toEqual(
      await expectedDataChal([users.hubMemberEmail])
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
    await postCommentInCallout(
      entitiesId.opportunityDiscussionCalloutCommentsId,
      'comment on discussion callout',
      TestUser.OPPORTUNITY_MEMBER
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(3);
    expect(mails[0]).toEqual(await expectedDataOpp([users.globalAdminEmail]));
    // HA don't get notification as is member only of HUB
    expect(mails[0]).not.toEqual(await expectedDataOpp([users.hubAdminEmail]));
    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(await expectedDataOpp([users.hubMemberEmail]));
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
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    await postCommentInCallout(
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
