import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { delay } from '@test/utils/delay';
import {
  createPostOnCalloutCodegen,
  deletePostCodegen,
} from '@test/functional-api/callout/post/post.request.params';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/utils/data-setup/entities';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { entitiesId, getMailsData } from '@test/types/entities-helper';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';

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
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: users.challengeMember.id,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.challengeMember.id,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: users.opportunityMember.id,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.opportunityMember.id,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },

    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },
    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },
    {
      userID: users.opportunityAdmin.id,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.opportunityAdmin.id,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },
    {
      userID: users.nonSpaceMember.id,
      type: UserPreferenceType.NotificationPostCreated,
    },
    {
      userID: users.nonSpaceMember.id,
      type: UserPreferenceType.NotificationPostCreatedAdmin,
    },
  ];
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
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
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationPostCommentCreated,
      'false'
    );
    await changePreferenceUserCodegen(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationPostCreated,
      'false'
    );
    await changePreferenceUserCodegen(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationPostCreatedAdmin,
      'false'
    );

    await changePreferenceUserCodegen(
      users.globalCommunityAdmin.id,
      UserPreferenceType.NotificationPostCommentCreated,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdmin.id,
      UserPreferenceType.NotificationPostCreated,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdmin.id,
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

  //ToDo: fix test
  test.skip('GA create space post - GA(1), HA (2), HM(6) get notifications', async () => {
    const postSubjectAdmin = `${spaceName}: New Post created by admin`;
    const postSubjectMember = `${spaceName}: New Post created by admin, have a look!`;

    // Act
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.space.calloutId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.GLOBAL_ADMIN
    );
    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    await delay(6000);
    const mails = await getMailsData();
    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.globalAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.spaceAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.globalAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.spaceAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.spaceMember.email)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.challengeAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.challengeMember.email)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityAdmin.email
      )
    );
    expect(mails[1]).toEqual(9);
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityMember.email
      )
    );
  });

  test('HA create space post - GA(1), HA (1), HM(6) get notifications', async () => {
    const postSubjectAdmin = `${spaceName}: New Post created by space`;
    const postSubjectMember = `${spaceName}: New Post created by space, have a look!`;
    // Act
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.space.calloutId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.HUB_ADMIN
    );
    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    await delay(6000);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(9);

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.globalAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.spaceAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.globalAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.spaceAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.spaceMember.email)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.challengeAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.challengeMember.email)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityAdmin.email
      )
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityMember.email
      )
    );
  });

  test('HA create challenge post - GA(1), HA (1), CA(1), CM(3),  get notifications', async () => {
    const postSubjectAdmin = `${challengeName}: New Post created by space`;
    const postSubjectMember = `${challengeName}: New Post created by space, have a look!`;
    // Act
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.challenge.calloutId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.HUB_ADMIN
    );
    challengePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    await delay(6000);
    const mails = await getMailsData();
    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.globalAdmin.email)
    );

    // Space admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templatedAdminResult(postSubjectAdmin, users.spaceAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.globalAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectAdmin, users.challengeAdmin.email)
    );

    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.spaceMember.email)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.challengeAdmin.email)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.challengeMember.email)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityAdmin.email
      )
    );
    expect(mails[1]).toEqual(7);
    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityMember.email
      )
    );
  });

  test('OM create opportunity post - HA(2), CA(1), OA(2), OM(4), get notifications', async () => {
    const postSubjectAdmin = `${opportunityName}: New Post created by opportunity`;
    const postSubjectMember = `${opportunityName}: New Post created by opportunity, have a look!`;
    // Act
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.opportunity.calloutId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.OPPORTUNITY_MEMBER
    );
    opportunityPostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    await delay(6000);
    const mails = await getMailsData();
    expect(mails[0]).toEqual(
      await templatedAdminResult(postSubjectAdmin, users.globalAdmin.email)
    );

    // Space admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templatedAdminResult(postSubjectAdmin, users.spaceAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectMember, users.globalAdmin.email)
    );

    // Space admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.spaceAdmin.email)
    );

    // Space member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.spaceMember.email)
    );

    // Challenge admin does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.challengeAdmin.email)
    );

    // Challenge member does not reacive email
    expect(mails[0]).not.toEqual(
      await templateMemberResult(postSubjectMember, users.challengeMember.email)
    );
    expect(mails[0]).toEqual(
      await templateMemberResult(postSubjectAdmin, users.opportunityAdmin.email)
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityAdmin.email
      )
    );

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityAdmin.email
      )
    );
    expect(mails[1]).toEqual(5);

    expect(mails[0]).toEqual(
      await templateMemberResult(
        postSubjectMember,
        users.opportunityMember.email
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
      entitiesId.opportunity.calloutId,
      { displayName: postDisplayName },
      postNameID,
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
