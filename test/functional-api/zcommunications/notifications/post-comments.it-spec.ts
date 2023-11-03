import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { entitiesId, getMailsData } from '../communications-helper';
import { removeOpportunityCodegen } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallengeCodegen } from '@test/functional-api/integration/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/integration/space/space.request.params';
import { delay } from '@test/utils/delay';
import {
  createPostOnCalloutCodegen,
  PostTypes,
  removePost,
} from '@test/functional-api/integration/post/post.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  removeComment,
  removeCommentVariablesData,
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';

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
let postCommentsIdSpace = '';
let postCommentsIdChallenge = '';
let postCommentsIdOpportunity = '';
let messageId = '';
let preferencesPostConfig: any[] = [];
let preferencesPostCommentsConfig: any[] = [];

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

  preferencesPostConfig = [
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

  preferencesPostCommentsConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.spaceMemberId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.challengeMemberId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.opportunityMemberId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.spaceAdminId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.challengeAdminId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.opportunityAdminId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.POST_COMMENT_CREATED,
    },
  ];
});

afterAll(async () => {
  await removeOpportunityCodegen(entitiesId.opportunityId);
  await removeChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Notifications - post comments', () => {
  let postNameID = '';
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
  beforeEach(async () => {
    await deleteMailSlurperMails();

    postNameID = `post-name-id-${uniqueId}`;
    postDisplayName = `post-d-name-${uniqueId}`;
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
    preferencesPostConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
    );

    preferencesPostCommentsConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'true')
    );
  });

  afterEach(async () => {
    await delay(6000);
    await mutation(
      removeComment,
      removeCommentVariablesData(postCommentsIdSpace, messageId),
      TestUser.GLOBAL_ADMIN
    );
  });
  describe('GA create post on space  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.spaceCalloutId,
        { displayName: postDisplayName },
        postNameID,
        PostTypes.KNOWLEDGE,
        TestUser.GLOBAL_ADMIN
      );
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdSpace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';
    });

    afterAll(async () => {
      await removePost(spacePostId);
    });
    test('GA create comment - GA(1) get notifications', async () => {
      const spacePostSubjectText = `${spaceName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdSpace,
          'test message on space post'
        ),
        TestUser.GLOBAL_ADMIN
      );
      messageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: spacePostSubjectText,
            toAddresses: [users.globalAdminEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('HM create comment - GA(1) get notifications', async () => {
      const spacePostSubjectText = `${spaceName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdSpace,
          'test message on space post'
        ),
        TestUser.HUB_MEMBER
      );
      messageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: spacePostSubjectText,
            toAddresses: [users.globalAdminEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('HM create post on space  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.spaceCalloutId,
        { displayName: postDisplayName },
        postNameID,
        PostTypes.KNOWLEDGE,
        TestUser.HUB_MEMBER
      );
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdSpace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';
    });

    afterAll(async () => {
      await removePost(spacePostId);
    });
    test('HM create comment - HM(1) get notifications', async () => {
      const spacePostSubjectText = `${spaceName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdSpace,
          'test message on space post'
        ),
        TestUser.HUB_MEMBER
      );
      messageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: spacePostSubjectText,
            toAddresses: [users.spaceMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('HA create comment - HM(1) get notifications', async () => {
      const spacePostSubjectText = `${spaceName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdSpace,
          'test message on space post'
        ),
        TestUser.HUB_ADMIN
      );
      messageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: spacePostSubjectText,
            toAddresses: [users.spaceMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('CM create post on challenge  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.challengeCalloutId,
        { displayName: postDisplayName },
        postNameID,
        PostTypes.KNOWLEDGE,
        TestUser.CHALLENGE_MEMBER
      );
      challengePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdChallenge =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';
    });

    afterAll(async () => {
      await removePost(challengePostId);
    });
    test('CM create comment - CM(1) get notifications', async () => {
      const challengePostSubjectText = `${challengeName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdChallenge,
          'test message on challenge post'
        ),
        TestUser.CHALLENGE_MEMBER
      );
      messageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: challengePostSubjectText,
            toAddresses: [users.challengeMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('CA create comment - CM(1) get notifications', async () => {
      const challengePostSubjectText = `${challengeName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdChallenge,
          'test message on challenge post'
        ),
        TestUser.CHALLENGE_ADMIN
      );
      messageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: challengePostSubjectText,
            toAddresses: [users.challengeMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('OM create post on opportunity  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.opportunityCalloutId,
        { displayName: postDisplayName },
        postNameID,
        PostTypes.KNOWLEDGE,
        TestUser.OPPORTUNITY_MEMBER
      );
      opportunityPostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdOpportunity =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';
    });

    afterAll(async () => {
      await removePost(opportunityPostId);
    });
    test('OM create comment - OM(1) get notifications', async () => {
      const opportunityPostSubjectText = `${opportunityName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;

      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdOpportunity,
          'test message on opportunity post'
        ),
        TestUser.OPPORTUNITY_MEMBER
      );
      messageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: opportunityPostSubjectText,
            toAddresses: [users.opportunityMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });

    test('CA create comment - OM(1) get notifications', async () => {
      const opportunityPostSubjectText = `${opportunityName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdOpportunity,
          'test message on opportunity post'
        ),
        TestUser.CHALLENGE_ADMIN
      );
      messageId = messageRes.body.data.sendMessageToRoom.id;

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: opportunityPostSubjectText,
            toAddresses: [users.opportunityMemberEmail],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  test('OA create post on opportunity and comment - 0 notifications - all roles with notifications disabled', async () => {
    preferencesPostCommentsConfig.forEach(
      async config =>
        await changePreferenceUser(config.userID, config.type, 'false')
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
    postCommentsIdOpportunity =
      resPostonSpace.data?.createContributionOnCallout.post?.comments.id ?? '';
    await mutation(
      sendComment,
      sendCommentVariablesData(
        postCommentsIdOpportunity,
        'test message on opportunity post'
      ),
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
