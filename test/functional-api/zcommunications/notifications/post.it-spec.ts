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
} from '../create-entities-with-users-helper';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
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
const spaceName = 'not-up-eco-name' + uniqueId;
const spaceNameId = 'not-up-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `opName${uniqueId}`;
let spacePostId = '';
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
      userID: users.globalAdminId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },

    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.spaceMemberId,
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
      userID: users.spaceAdminId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.spaceAdminId,
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
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.POST_CREATED,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.POST_CREATED_ADMIN,
    },
  ];
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
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
    await removePost(spacePostId);
    await removePost(challengePostId);
    await removePost(opportunityPostId);
  });

  test('GA create space post - GA(1), HA (2), HM(6) get notifications', async () => {
    const postSubjectAdmin = `${spaceName}: New Post created by admin`;
    const postSubjectMember = `${spaceName}: New Post created by admin, have a look!`;

    // Act
    const resPostonSpace = await createPostOnCallout(
      entitiesId.spaceCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.GLOBAL_ADMIN
    );
    spacePostId = resPostonSpace.body.data.createPostOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();
    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.spaceAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.spaceAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.spaceMemberEmail)
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
    expect(mails[1]).toEqual(9);
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityMemberEmail
      )
    );
  });

  test('HA create space post - GA(1), HA (1), HM(6) get notifications', async () => {
    const postSubjectAdmin = `${spaceName}: New Post created by space`;
    const postSubjectMember = `${spaceName}: New Post created by space, have a look!`;
    // Act
    const resPostonSpace = await createPostOnCallout(
      entitiesId.spaceCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.HUB_ADMIN
    );
    spacePostId = resPostonSpace.body.data.createPostOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.globalAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.spaceAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.spaceAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.spaceMemberEmail)
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
    const postSubjectAdmin = `${challengeName}: New Post created by space`;
    const postSubjectMember = `${challengeName}: New Post created by space, have a look!`;
    // Act
    const resPostonSpace = await createPostOnCallout(
      entitiesId.challengeCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.HUB_ADMIN
    );
    challengePostId = resPostonSpace.body.data.createPostOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();
    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.globalAdminEmail)
    );

    // Space admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templatedAdminResult(postSubjectAdmin, users.spaceAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.globalAdminEmail)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectAdmin, users.challengeAdminEmail)
    );

    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.spaceMemberEmail)
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
    expect(mails[1]).toEqual(7);
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityMemberEmail
      )
    );
  });

  test('OM create opportunity post - HA(2), CA(1), OA(2), OM(4), get notifications', async () => {
    const postSubjectAdmin = `${opportunityName}: New Post created by opportunity`;
    const postSubjectMember = `${opportunityName}: New Post created by opportunity, have a look!`;
    // Act
    const resPostonSpace = await createPostOnCallout(
      entitiesId.opportunityCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.OPPORTUNITY_MEMBER
    );
    opportunityPostId = resPostonSpace.body.data.createPostOnCallout.id;

    await delay(6000);
    const mails = await getMailsData();
    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.globalAdminEmail)
    );

    // Space admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templatedAdminResult(postSubjectAdmin, users.spaceAdminEmail)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.globalAdminEmail)
    );

    // Space admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.spaceAdminEmail)
    );

    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.spaceMemberEmail)
    );

    // Challenge admin does not reacive email
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
      await templateMemberResult(postSubjectMember, users.opportunityAdminEmail)
    );
    expect(mails[1]).toEqual(5);

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
    const resPostonSpace = await createPostOnCallout(
      entitiesId.opportunityCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.OPPORTUNITY_ADMIN
    );
    opportunityPostId = resPostonSpace.body.data.createPostOnCallout.id;

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
