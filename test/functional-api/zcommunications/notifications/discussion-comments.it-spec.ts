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
import { postCommentInCallout } from '@test/functional-api/integration/comments/comments.request.params';

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
  await registerUsersAndAssignToAllEntitiesAsMembers(
    hubMemOnly,
    challengeAndHubMemOnly,
    opportunityAndChallengeAndHubMem
  );

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: hubMemOnly,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: challengeAndHubMemOnly,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: opportunityAndChallengeAndHubMem,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: users.hubAdminId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: users.hubMemberId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: users.qaUserId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
    },

    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.DISCUSSION_COMMENT_CREATED,
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
      entitiesId.hubDiscussionCalloutId,
      'comment on discussion callout',
      TestUser.GLOBAL_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);
    expect(mails[0]).toEqual(await expectedDataHub([users.globalAdminIdEmail]));
    expect(mails[0]).toEqual(await expectedDataHub([users.hubAdminEmail]));
    expect(mails[0]).toEqual(await expectedDataHub([users.qaUserEmail]));
    expect(mails[0]).toEqual(await expectedDataHub([users.hubMemberEmail]));
    expect(mails[0]).toEqual(await expectedDataHub([`${hubMemOnly}`]));
    expect(mails[0]).toEqual(await expectedDataHub([challengeAndHubMemOnly]));
    expect(mails[0]).toEqual(
      await expectedDataHub([opportunityAndChallengeAndHubMem])
    );
  });

  test('HA create hub callout comment - HM(7) get notifications', async () => {
    // Act
    await postCommentInCallout(
      entitiesId.hubDiscussionCalloutId,
      'comment on discussion callout',
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);
    expect(mails[0]).toEqual(await expectedDataHub([users.hubAdminEmail]));
    expect(mails[0]).toEqual(await expectedDataHub([users.qaUserEmail]));
    expect(mails[0]).toEqual(await expectedDataHub([users.hubMemberEmail]));
    expect(mails[0]).toEqual(await expectedDataHub([`${hubMemOnly}`]));
    expect(mails[0]).toEqual(await expectedDataHub([challengeAndHubMemOnly]));
    expect(mails[0]).toEqual(
      await expectedDataHub([opportunityAndChallengeAndHubMem])
    );
  });

  test('HA create challenge callout comment - HM(5),  get notifications', async () => {
    // Act
    await postCommentInCallout(
      entitiesId.challengeDiscussionCalloutId,
      'comment on discussion callout',
      TestUser.HUB_ADMIN
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(5);
    expect(mails[0]).toEqual(
      await expectedDataChal([users.globalAdminIdEmail])
    );
    // HA don't get notification as is member only of HUB
    expect(mails[0]).not.toEqual(await expectedDataChal([users.hubAdminEmail]));
    expect(mails[0]).toEqual(await expectedDataChal([users.qaUserEmail]));
    expect(mails[0]).toEqual(await expectedDataChal([users.hubMemberEmail]));
    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(await expectedDataChal([`${hubMemOnly}`]));
    expect(mails[0]).toEqual(await expectedDataChal([challengeAndHubMemOnly]));
    expect(mails[0]).toEqual(
      await expectedDataChal([opportunityAndChallengeAndHubMem])
    );
  });

  test('OM create opportunity callout comment - HM(7), get notifications', async () => {
    // Act
    await postCommentInCallout(
      entitiesId.opportunityDiscussionCalloutId,
      'comment on discussion callout',
      TestUser.QA_USER
    );

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(4);
    expect(mails[0]).toEqual(await expectedDataOpp([users.globalAdminIdEmail]));
    // HA don't get notification as is member only of HUB
    expect(mails[0]).not.toEqual(await expectedDataOpp([users.hubAdminEmail]));
    // QA - 1 as opportunity member
    expect(mails[0]).toEqual(await expectedDataOpp([users.qaUserEmail]));
    // HM - 1 mails as opportunity member and admin
    expect(mails[0]).toEqual(await expectedDataOpp([users.hubMemberEmail]));
    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(await expectedDataOpp([`${hubMemOnly}`]));
    // Challenge member does not reacive email
    expect(mails[0]).not.toEqual(
      await expectedDataOpp([challengeAndHubMemOnly])
    );

    // OM - 1 mail as opportunity member
    expect(mails[0]).toEqual(
      await expectedDataOpp([opportunityAndChallengeAndHubMem])
    );
  });

  test('OA create opportunity callout comment - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    await postCommentInCallout(
      entitiesId.opportunityDiscussionCalloutId,
      'comment on discussion callout',
      TestUser.QA_USER
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
