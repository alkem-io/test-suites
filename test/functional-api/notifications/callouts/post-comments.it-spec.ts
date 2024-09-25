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
import {
  removeMessageOnRoomCodegen,
  sendMessageToRoomCodegen,
} from '@test/functional-api/communications/communication.params';
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
let postCommentsIdSpace = '';
let postCommentsIdChallenge = '';
let postCommentsIdOpportunity = '';
let messageId = '';
let preferencesPostConfig: any[] = [];
let preferencesPostCommentsConfig: any[] = [];

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

  preferencesPostConfig = [
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

  preferencesPostCommentsConfig = [
    {
      userID: users.globalAdmin.id,
      type: UserPreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: users.spaceMember.id,
      type: UserPreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: users.challengeMember.id,
      type: UserPreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: users.opportunityMember.id,
      type: UserPreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: users.spaceAdmin.id,
      type: UserPreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: users.challengeAdmin.id,
      type: UserPreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: users.opportunityAdmin.id,
      type: UserPreferenceType.NotificationPostCommentCreated,
    },
    {
      userID: users.nonSpaceMember.id,
      type: UserPreferenceType.NotificationPostCommentCreated,
    },
  ];
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
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
    preferencesPostConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'false')
    );

    preferencesPostCommentsConfig.forEach(
      async config =>
        await changePreferenceUserCodegen(config.userID, config.type, 'true')
    );
  });

  afterEach(async () => {
    await delay(6000);
    await removeMessageOnRoomCodegen(
      postCommentsIdSpace,
      messageId,
      TestUser.GLOBAL_ADMIN
    );
  });
  describe('GA create post on space  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.space.calloutId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.GLOBAL_ADMIN
      );
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdSpace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';
    });

    afterAll(async () => {
      await deletePostCodegen(spacePostId);
    });
    test('GA create comment - GA(1) get notifications', async () => {
      // Act
      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        'test message on space post',
        TestUser.GLOBAL_ADMIN
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();
      expect(mails[1]).toEqual(0);
    });

    test('HM create comment - GA(1) get notifications', async () => {
      const spacePostSubjectText = `${spaceName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        'test message on space post',
        TestUser.HUB_MEMBER
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: spacePostSubjectText,
            toAddresses: [users.globalAdmin.email],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('HM create post on space  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.space.calloutId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.HUB_MEMBER
      );
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdSpace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';
    });

    afterAll(async () => {
      await deletePostCodegen(spacePostId);
    });
    test('HM create comment - HM(1) get notifications', async () => {
      // Act
      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        'test message on space post',
        TestUser.HUB_MEMBER
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[1]).toEqual(0);
    });

    test('HA create comment - HM(1) get notifications', async () => {
      const spacePostSubjectText = `${spaceName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        'test message on space post',
        TestUser.HUB_ADMIN
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: spacePostSubjectText,
            toAddresses: [users.spaceMember.email],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('CM create post on challenge  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.challenge.calloutId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.CHALLENGE_MEMBER
      );
      challengePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdChallenge =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';
    });

    afterAll(async () => {
      await deletePostCodegen(challengePostId);
    });
    test('CM create comment - CM(1) get notifications', async () => {
      // Act
      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdChallenge,
        'test message on challenge post',
        TestUser.CHALLENGE_MEMBER
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[1]).toEqual(0);
    });

    test('CA create comment - CM(1) get notifications', async () => {
      const challengePostSubjectText = `${challengeName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdChallenge,
        'test message on challenge post',
        TestUser.CHALLENGE_ADMIN
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: challengePostSubjectText,
            toAddresses: [users.challengeMember.email],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  describe('OM create post on opportunity  ', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.opportunity.calloutId,
        { displayName: postDisplayName },
        postNameID,
        TestUser.OPPORTUNITY_MEMBER
      );
      opportunityPostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdOpportunity =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';
    });

    afterAll(async () => {
      await deletePostCodegen(opportunityPostId);
    });
    test('OM create comment - OM(1) get notifications', async () => {
      // Act
      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdOpportunity,
        'test message on opportunity post',
        TestUser.OPPORTUNITY_MEMBER
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[1]).toEqual(0);
    });

    test('CA create comment - OM(1) get notifications', async () => {
      const opportunityPostSubjectText = `${opportunityName} - New comment received on your Post &#34;${postDisplayName}&#34;, have a look!`;
      // Act
      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdOpportunity,
        'test message on opportunity post',
        TestUser.CHALLENGE_ADMIN
      );
      messageId = messageRes?.data?.sendMessageToRoom.id ?? '';

      await delay(6000);
      const mails = await getMailsData();

      expect(mails[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: opportunityPostSubjectText,
            toAddresses: [users.opportunityMember.email],
          }),
        ])
      );

      expect(mails[1]).toEqual(1);
    });
  });

  test('OA create post on opportunity and comment - 0 notifications - all roles with notifications disabled', async () => {
    preferencesPostCommentsConfig.forEach(
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
    postCommentsIdOpportunity =
      resPostonSpace.data?.createContributionOnCallout.post?.comments.id ?? '';
    await sendMessageToRoomCodegen(
      postCommentsIdOpportunity,
      'test message on opportunity post',
      TestUser.OPPORTUNITY_ADMIN
    );

    // Assert
    await delay(1500);
    const mails = await getMailsData();

    expect(mails[1]).toEqual(0);
  });
});
