import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import {
  createPostOnCalloutCodegen,
  deletePostCodegen,
  PostTypes,
} from '@test/functional-api/callout/post/post.request.params';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/roles/community/communications-helper';

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
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },
  ];
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Notifications - post', () => {
  let postNameID = '';

  beforeEach(async () => {
    await deleteMailSlurperMails();

    postNameID = `asp-name-id-${uniqueId}`;
    postDisplayName = `asp-d-name-${uniqueId}`;
  });

  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationPostCommentCreated,
      'false'
    );
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationPostCreated,
      'false'
    );
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationPostCreatedAdmin,
      'false'
    );

    await changePreferenceUserCodegen(
      users.globalCommunityAdminId,
      UserPreferenceType.NotificationPostCommentCreated,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdminId,
      UserPreferenceType.NotificationPostCreated,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdminId,
      UserPreferenceType.NotificationPostCreatedAdmin,
      'false'
    );

    preferencesConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'true')
    );
  });

  afterEach(async () => {
    await deletePostCodegen(spacePostId);
    await deletePostCodegen(challengePostId);
    await deletePostCodegen(opportunityPostId);
  });

  test('GA create space post - GA(1), HA (2), HM(6) get notifications', async () => {
    const postSubjectAdmin = `${spaceName}: New Post created by admin`;
    const postSubjectMember = `${spaceName}: New Post created by admin, have a look!`;

    // Act
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.spaceCalloutId,
      { displayName: postDisplayName },
      postNameID,
      PostTypes.KNOWLEDGE,
      TestUser.GLOBAL_ADMIN
    );
    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

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
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.spaceCalloutId,
      { displayName: postDisplayName },
      postNameID,
      PostTypes.KNOWLEDGE,
      TestUser.HUB_ADMIN
    );
    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

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
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.challengeCalloutId,
      { displayName: postDisplayName },
      postNameID,
      PostTypes.KNOWLEDGE,
      TestUser.HUB_ADMIN
    );
    challengePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

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
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.opportunityCalloutId,
      { displayName: postDisplayName },
      postNameID,
      PostTypes.KNOWLEDGE,
      TestUser.OPPORTUNITY_MEMBER
    );
    opportunityPostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

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
        await changePreferenceUserCodegen(config.userID, config.type, 'false')
    );
    // Act
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.opportunityCalloutId,
      { displayName: postDisplayName },
      postNameID,
      PostTypes.KNOWLEDGE,
      TestUser.OPPORTUNITY_ADMIN
    );
    opportunityPostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
