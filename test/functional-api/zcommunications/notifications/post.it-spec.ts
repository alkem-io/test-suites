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
import {
  createPostOnCallout,
  PostTypes,
  removePost,
} from '@test/functional-api/integration/post/post.request.params';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'not-up-org-name' + uniqueId;
const hostNameId = 'not-up-org-nameid' + uniqueId;
const hubName = 'not-up-eco-name' + uniqueId;
const hubNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let hubPostId = '';
let challengePostId = '';
let opportunityPostId = '';
let postDisplayName = '';
let preferencesConfig: any[] = [];

const templatedAdminResult = async (entityName: string, userEmail: string) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: entityName,
      toAddresses: [userEmail],
    }),
  ]);
};

const templateMemberResult = async (entityName: string, userEmail: string) => {
  return expect.arrayContaining([
    expect.objectContaining({
      subject: entityName,
      toAddresses: [userEmail],
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
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },

    {
      userID: users.hubMemberId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.hubMemberId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },

    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },

    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },

    {
      userID: users.hubAdminId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.hubAdminId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },
  ];
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Notifications - post', () => {
  let postNameID = '';

  beforeEach(async () => {
    await deleteMailSlurperMails();

    postNameID = `asp-name-id-${uniqueId}`;
    postDisplayName = `asp-d-name-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.POST_COMMENT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.POST_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.POST_CREATED_ADMIN,
      'false'
    );

    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.POST_COMMENT_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.POST_CREATED,
      'false'
    );
    await changePreferenceUser(
      users.globalCommunityAdminId,
      UserPreferenceType.POST_CREATED_ADMIN,
      'false'
    );

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });

  afterEach(async () => {
    await removePost(hubPostId);
    await removePost(challengePostId);
    await removePost(opportunityPostId);
  });

  test('GA create hub post - GA(1), HA (2), HM(6) get notifications', async () => {
    const postSubjectAdmin = `[${hubName}] New Post created by admin`;
    const postSubjectMember = `${hubName} - New Post created by admin, have a look!`;

    // Act
    const resPostonHub = await createPostOnCallout(
      entitiesId.hubCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.GLOBAL_ADMIN
    );
    hubPostId = resPostonHub.body.data.createPostOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.hubAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.hubAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.hubMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.challengeAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityMemberEmail
      )
    );
  });

  test('HA create hub post - GA(1), HA (1), HM(6) get notifications', async () => {
    const postSubjectAdmin = `[${hubName}] New Post created by hub`;
    const postSubjectMember = `${hubName} - New Post created by hub, have a look!`;
    // Act
    const resPostonHub = await createPostOnCallout(
      entitiesId.hubCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.HUB_ADMIN
    );
    hubPostId = resPostonHub.body.data.createPostOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.hubAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.hubAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.hubMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.challengeAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityMemberEmail
      )
    );
  });

  test('HA create challenge post - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    const postSubjectAdmin = `[${challengeName}] New Post created by hub`;
    const postSubjectMember = `${challengeName} - New Post created by hub, have a look!`;
    // Act
    const resPostonHub = await createPostOnCallout(
      entitiesId.challengeCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.HUB_ADMIN
    );
    challengePostId = resPostonHub.body.data.createPostOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(8);

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.hubAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectAdmin, users.challengeAdminEmail)
    );

    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.hubMemberEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.challengeAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityMemberEmail
      )
    );
  });

  test('OM create opportunity post - HA(2), CA(1), OA(2), OM(4), get notifications', async () => {
    const postSubjectAdmin = `[${opportunityName}] New Post created by opportunity`;
    const postSubjectMember = `${opportunityName} - New Post created by opportunity, have a look!`;
    // Act
    const resPostonHub = await createPostOnCallout(
      entitiesId.opportunityCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.OPPORTUNITY_MEMBER
    );
    opportunityPostId = resPostonHub.body.data.createPostOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(7);

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.hubAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.globalAdminEmail)
    );
    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.hubAdminEmail)
    );

    // Hub member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.hubMemberEmail)
    );

    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.challengeAdminEmail)
    );

    // Challenge member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.challengeMemberEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectAdmin, users.opportunityAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.opportunityAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityMemberEmail
      )
    );
  });

  test('OA create opportunity post - 0 notifications - all roles with notifications disabled', async () => {
    preferencesConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );
    // Act
    const resPostonHub = await createPostOnCallout(
      entitiesId.opportunityCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.OPPORTUNITY_ADMIN
    );
    opportunityPostId = resPostonHub.body.data.createPostOnCallout.id;

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
