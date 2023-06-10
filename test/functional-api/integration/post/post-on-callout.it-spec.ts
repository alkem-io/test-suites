import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  removePost,
  PostTypes,
  updatePost,
  createPostOnCallout,
  getDataPerHubCallout,
  getDataPerChallengeCallout,
  getDataPerOpportunityCallout,
  postDataPerHubCalloutCount,
  postDataPerChallengeCalloutCount,
  postDataPerOpportunityCalloutCount,
} from './post.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeHub } from '../hub/hub.request.params';
import {
  delay,
  entitiesId,
} from '@test/functional-api/zcommunications/communications-helper';
import {
  createReferenceOnProfile,
  createReferenceOnProfileVariablesData,
  uniqueId,
} from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { mutation } from '@test/utils/graphql.request';
import {
  removeComment,
  removeCommentVariablesData,
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndHubWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { errorAuthUpdatePost } from './post-template-testdata';
import {
  deleteReference,
  deleteVariablesData,
} from '@test/utils/mutations/delete-mutation';
import { users } from '@test/utils/queries/users-data';

let opportunityName = 'post-opp';
let challengeName = 'post-chal';
let hubPostId = '';
let challengePostId = '';
let opportunityPostId = '';
let postNameID = '';
let postDisplayName = '';
let postDataCreate = '';
let postCommentsIdHub = '';
let postCommentsIdChallenge = '';
let msessageId = '';
const hubCalloutId = '';

const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const hubName = 'post-eco-name' + uniqueId;
const hubNameId = 'post-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});

describe('Posts - Create', () => {
  afterEach(async () => {
    await removePost(hubPostId);
    await removePost(challengePostId);
    await removePost(opportunityPostId);
  });
  test('HM should create post on hub callout', async () => {
    // Act
    const resPostonHub = await createPostOnCallout(
      entitiesId.hubCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.KNOWLEDGE,
      TestUser.HUB_MEMBER
    );
    postDataCreate = resPostonHub.body.data.createPostOnCallout;
    hubPostId = resPostonHub.body.data.createPostOnCallout.id;

    const postsData = await getDataPerHubCallout(
      entitiesId.hubId,
      entitiesId.hubCalloutId,
      TestUser.HUB_MEMBER
    );
    const data = postsData.body.data.hub.collaboration.callouts[0].posts[0];

    // Assert
    expect(data).toEqual(postDataCreate);
  });

  test('GA should create post on hub callout without setting nameId', async () => {
    // Act
    const resPostonHub = await createPostOnCallout(
      entitiesId.hubCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } }
    );

    hubPostId = resPostonHub.body.data.createPostOnCallout.id;
    const hubPostNameId = resPostonHub.body.data.createPostOnCallout.nameID;

    // Assert
    expect(hubPostNameId).toContain(postNameID);
  });

  test('NON-EM should NOT create post on hub callout', async () => {
    // Act
    const resPostonHub = await createPostOnCallout(
      entitiesId.hubCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.ACTOR,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(resPostonHub.text).toContain(
      `Authorization: unable to grant 'create-post' privilege: create post on callout: ${hubCalloutId}`
    );
  });

  test('ChA should create post on challenge callout', async () => {
    // Act
    const resPostonChallenge = await createPostOnCallout(
      entitiesId.challengeCalloutId,
      postNameID + 'ch',
      { profileData: { displayName: postDisplayName } },
      PostTypes.RELATED_INITIATIVE,
      TestUser.CHALLENGE_ADMIN
    );

    postDataCreate = resPostonChallenge.body.data.createPostOnCallout;
    challengePostId = resPostonChallenge.body.data.createPostOnCallout.id;

    const postsData = await getDataPerChallengeCallout(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeCalloutId,
      TestUser.CHALLENGE_ADMIN
    );
    const data =
      postsData.body.data.hub.challenge.collaboration.callouts[0].posts[0];

    // Assert
    expect(data).toEqual(postDataCreate);
  });

  test('GA should create post on opportunity callout', async () => {
    // Act
    const resPostonOpportunity = await createPostOnCallout(
      entitiesId.opportunityCalloutId,
      postNameID + 'op',
      { profileData: { displayName: postDisplayName } }
    );
    postDataCreate = resPostonOpportunity.body.data.createPostOnCallout;
    opportunityPostId = resPostonOpportunity.body.data.createPostOnCallout.id;

    const postsData = await getDataPerOpportunityCallout(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityCalloutId
    );
    const data =
      postsData.body.data.hub.opportunity.collaboration.callouts[0].posts[0];

    // Assert
    expect(data).toEqual(postDataCreate);
  });
});

describe('Posts - Update', () => {
  beforeAll(async () => {
    const resPostonHub = await createPostOnCallout(
      entitiesId.hubCalloutId,
      `post-name-id-up-${uniqueId}`,
      { profileData: { displayName: postDisplayName + 'forUpdates' } }
    );
    hubPostId = resPostonHub.body.data.createPostOnCallout.id;
  });

  afterAll(async () => {
    await removePost(hubPostId);
  });

  test('HM should NOT update post created on hub callout from GA', async () => {
    // Act
    const resPostonHub = await updatePost(
      hubPostId,
      postNameID,
      { profileData: { displayName: postDisplayName + 'HM update' } },
      PostTypes.KNOWLEDGE,
      TestUser.HUB_MEMBER
    );

    // Assert
    expect(resPostonHub.text).toContain(errorAuthUpdatePost);
  });

  test('NON-HM should NOT update post created on hub callout from GA', async () => {
    // Arrange
    const resPostonHub = await updatePost(
      hubPostId,
      postNameID,
      { profileData: { displayName: postDisplayName + 'Non-HM update' } },
      PostTypes.KNOWLEDGE,
      TestUser.NON_HUB_MEMBER
    );

    // Act
    expect(resPostonHub.text).toContain(errorAuthUpdatePost);
  });

  test('HA should update post created on hub callout from GA', async () => {
    // Arrange
    const resPostonHub = await updatePost(
      hubPostId,
      postNameID,
      { profileData: { displayName: postDisplayName + 'HA update' } },
      PostTypes.KNOWLEDGE,
      TestUser.HUB_ADMIN
    );
    const postDataUpdate = resPostonHub.body.data.updatePost;

    // Act
    const postsData = await getDataPerHubCallout(
      entitiesId.hubId,
      entitiesId.hubCalloutId,
      TestUser.HUB_ADMIN
    );
    const data = postsData.body.data.hub.collaboration.callouts[0].posts[0];

    // Assert
    expect(data).toEqual(postDataUpdate);
  });
  test('GA should update post created on hub callout from GA', async () => {
    // Arrange
    const resPostonHub = await updatePost(
      hubPostId,
      postNameID,
      { profileData: { displayName: postDisplayName + 'GA update' } },
      PostTypes.KNOWLEDGE,
      TestUser.GLOBAL_ADMIN
    );
    const postDataUpdate = resPostonHub.body.data.updatePost;

    // Act
    const postsData = await getDataPerHubCallout(
      entitiesId.hubId,
      entitiesId.hubCalloutId
    );
    const data = postsData.body.data.hub.collaboration.callouts[0].posts[0];

    // Assert
    expect(data).toEqual(postDataUpdate);
  });
});

test('HM should update post created on hub callout from HM', async () => {
  // Arrange
  const resPostonHubEM = await createPostOnCallout(
    entitiesId.hubCalloutId,
    postNameID,
    { profileData: { displayName: postDisplayName + 'HM' } },

    PostTypes.KNOWLEDGE,
    TestUser.HUB_MEMBER
  );
  const hubPostIdEM = resPostonHubEM.body.data.createPostOnCallout.id;

  // Act
  const resPostonHub = await updatePost(
    hubPostIdEM,
    postNameID,
    { profileData: { displayName: postDisplayName + 'HM update' } },

    PostTypes.ACTOR,
    TestUser.HUB_MEMBER
  );

  const postDataUpdate = resPostonHub.body.data.updatePost;

  // Act
  const postsData = await getDataPerHubCallout(
    entitiesId.hubId,
    entitiesId.hubCalloutId,
    TestUser.HUB_MEMBER
  );
  const data = postsData.body.data.hub.collaboration.callouts[0].posts[0];

  // Assert
  expect(data).toEqual(postDataUpdate);

  await removePost(hubPostIdEM);
});

describe('Posts - Delete', () => {
  test('HM should NOT delete post created on hub callout from GA', async () => {
    // Arrange
    const resPostonHub = await createPostOnCallout(
      entitiesId.hubCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } }
    );

    hubPostId = resPostonHub.body.data.createPostOnCallout.id;

    // Act
    const responseRemove = await removePost(hubPostId, TestUser.HUB_MEMBER);

    const postsData = await postDataPerHubCalloutCount(
      entitiesId.hubId,
      entitiesId.hubCalloutId
    );

    // Assert
    expect(responseRemove.text).toContain(
      `Authorization: unable to grant 'delete' privilege: delete post: ${postNameID}`
    );
    expect(postsData).toHaveLength(1);
    await removePost(hubPostId);
  });

  test('HM should delete post created on hub callout from Himself', async () => {
    // Arrange
    const resPostonHub = await createPostOnCallout(
      entitiesId.hubCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.RELATED_INITIATIVE,
      TestUser.HUB_MEMBER
    );

    hubPostId = resPostonHub.body.data.createPostOnCallout.id;

    // Act
    await removePost(hubPostId, TestUser.HUB_MEMBER);
    const postsData = await postDataPerHubCalloutCount(
      entitiesId.hubId,
      entitiesId.hubCalloutId
    );

    // Assert
    expect(postsData).toHaveLength(0);
  });

  test('HM should delete post created on hub callout from EM', async () => {
    // Arrange
    const resPostonHub = await createPostOnCallout(
      entitiesId.hubCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.RELATED_INITIATIVE,
      TestUser.HUB_MEMBER
    );
    hubPostId = resPostonHub.body.data.createPostOnCallout.id;

    // Act
    await removePost(hubPostId, TestUser.GLOBAL_ADMIN);
    const postsData = await postDataPerHubCalloutCount(
      entitiesId.hubId,
      entitiesId.hubCalloutId
    );
    // Assert
    expect(postsData).toHaveLength(0);
  });

  test('NON-EM should NOT delete post created on hub callout created from HM', async () => {
    // Arrange
    const resPostonHub = await createPostOnCallout(
      entitiesId.hubCalloutId,
      postNameID,
      { profileData: { displayName: postDisplayName } },
      PostTypes.RELATED_INITIATIVE,
      TestUser.HUB_MEMBER
    );

    hubPostId = resPostonHub.body.data.createPostOnCallout.id;

    // Act
    const responseRemove = await removePost(hubPostId, TestUser.NON_HUB_MEMBER);

    const postsData = await postDataPerHubCalloutCount(
      entitiesId.hubId,
      entitiesId.hubCalloutId
    );
    // Assert
    expect(responseRemove.text).toContain(
      `Authorization: unable to grant 'delete' privilege: delete post: ${postNameID}`
    );
    expect(postsData).toHaveLength(1);
    await removePost(hubPostId);
  });

  test('ChA should delete post created on challenge callout from GA', async () => {
    // Arrange
    const resPostonChallenge = await createPostOnCallout(
      entitiesId.challengeCalloutId,
      postNameID + 'ch',
      { profileData: { displayName: postDisplayName + 'ch' } }
    );
    challengePostId = resPostonChallenge.body.data.createPostOnCallout.id;

    // Act
    await removePost(challengePostId, TestUser.CHALLENGE_ADMIN);
    const data = await postDataPerChallengeCalloutCount(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeCalloutId
    );

    // Assert
    expect(data).toHaveLength(0);
  });

  test('HA should delete post created on challenge callout from ChA', async () => {
    // Arrange
    const resPostonChallenge = await createPostOnCallout(
      entitiesId.challengeCalloutId,
      postNameID + 'ch',
      { profileData: { displayName: postDisplayName + 'ch' } },
      PostTypes.RELATED_INITIATIVE,
      TestUser.CHALLENGE_ADMIN
    );

    challengePostId = resPostonChallenge.body.data.createPostOnCallout.id;

    // Act
    await removePost(challengePostId, TestUser.HUB_ADMIN);

    const data = await postDataPerChallengeCalloutCount(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeCalloutId
    );

    // Assert
    expect(data).toHaveLength(0);
  });

  test('ChA should delete post created on opportunity callout from OM', async () => {
    // Act
    const resPostonOpportunity = await createPostOnCallout(
      entitiesId.opportunityCalloutId,
      postNameID + 'opm',
      { profileData: { displayName: postDisplayName + 'opm' } },
      PostTypes.RELATED_INITIATIVE,
      TestUser.OPPORTUNITY_MEMBER
    );
    opportunityPostId = resPostonOpportunity.body.data.createPostOnCallout.id;

    // Act
    await removePost(opportunityPostId, TestUser.CHALLENGE_ADMIN);
    const data = await postDataPerOpportunityCalloutCount(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityCalloutId
    );

    // Assert
    expect(data).toHaveLength(0);
  });

  test('ChM should not delete post created on challenge callout from ChA', async () => {
    // Arrange
    const resPostonChallenge = await createPostOnCallout(
      entitiesId.challengeCalloutId,
      postNameID + 'ch',
      { profileData: { displayName: postDisplayName + 'ch' } },
      PostTypes.RELATED_INITIATIVE,
      TestUser.CHALLENGE_ADMIN
    );

    challengePostId = resPostonChallenge.body.data.createPostOnCallout.id;

    // Act
    const responseRemove = await removePost(
      challengePostId,
      TestUser.CHALLENGE_MEMBER
    );

    const data = await postDataPerChallengeCalloutCount(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeCalloutId
    );
    // Assert
    expect(responseRemove.text).toContain(
      `Authorization: unable to grant 'delete' privilege: delete post: ${postNameID}`
    );
    expect(data).toHaveLength(1);
    await removePost(challengePostId);
  });

  test('OM should delete own post on opportunity callout', async () => {
    // Act
    const resPostonOpportunity = await createPostOnCallout(
      entitiesId.opportunityCalloutId,
      postNameID + 'op',
      { profileData: { displayName: postDisplayName + 'ch' } },
      PostTypes.RELATED_INITIATIVE,
      TestUser.OPPORTUNITY_MEMBER
    );
    opportunityPostId = resPostonOpportunity.body.data.createPostOnCallout.id;

    // Act
    await removePost(opportunityPostId, TestUser.OPPORTUNITY_MEMBER);
    const data = await postDataPerOpportunityCalloutCount(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityCalloutId
    );

    // Assert
    expect(data).toHaveLength(0);
  });

  test('GA should delete own post on opportunity callout', async () => {
    // Act
    const resPostonOpportunity = await createPostOnCallout(
      entitiesId.opportunityCalloutId,
      postNameID + 'op',
      { profileData: { displayName: postDisplayName + 'ch' } },
      PostTypes.RELATED_INITIATIVE,
      TestUser.GLOBAL_ADMIN
    );
    opportunityPostId = resPostonOpportunity.body.data.createPostOnCallout.id;

    // Act
    await removePost(opportunityPostId, TestUser.GLOBAL_ADMIN);
    const data = await postDataPerOpportunityCalloutCount(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityCalloutId
    );

    // Assert
    expect(data).toHaveLength(0);
  });
});

describe('Posts - Messages', () => {
  describe('Send Message - Post created by GA on Hub callout', () => {
    beforeAll(async () => {
      const resPostonHub = await createPostOnCallout(
        entitiesId.hubCalloutId,
        `asp-dhub-mess-${uniqueId}`,
        { profileData: { displayName: `asp-nhub-mess-${uniqueId}` } }
      );

      hubPostId = resPostonHub.body.data.createPostOnCallout.id;
      postCommentsIdHub =
        resPostonHub.body.data.createPostOnCallout.comments.id;

      const resPostonChallenge = await createPostOnCallout(
        entitiesId.challengeCalloutId,
        `asp-dchal-mess-${uniqueId}`,
        { profileData: { displayName: `asp-nchal-mess-${uniqueId}` } }
      );

      challengePostId = resPostonChallenge.body.data.createPostOnCallout.id;
      postCommentsIdChallenge =
        resPostonChallenge.body.data.createPostOnCallout.comments.id;
    });

    afterAll(async () => {
      await removePost(hubPostId);
      await removePost(challengePostId);
    });

    afterEach(async () => {
      await delay(3000);
      await mutation(
        removeComment,
        removeCommentVariablesData(postCommentsIdHub, msessageId),
        TestUser.GLOBAL_ADMIN
      );
    });

    test('ChA should send comment on post created on challenge callout from GA', async () => {
      // Arrange
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          postCommentsIdChallenge,
          'test message on challenge post'
        ),
        TestUser.CHALLENGE_ADMIN
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      const postsData = await getDataPerChallengeCallout(
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.challengeCalloutId
      );
      const data =
        postsData.body.data.hub.challenge.collaboration.callouts[0].posts[0]
          .comments;

      // Assert
      expect(data).toEqual({
        id: postCommentsIdChallenge,
        messages: [
          {
            id: msessageId,
            message: 'test message on challenge post',
            sender: { id: users.challengeAdminId },
          },
        ],
      });
    });

    test('HM should send comment on post created on hub callout from GA', async () => {
      // Arrange
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdHub, 'test message'),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendMessageToRoom.id;

      const postsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        postsData.body.data.hub.collaboration.callouts[0].posts[0].comments;

      // Assert
      expect(data).toEqual({
        id: postCommentsIdHub,
        messages: [
          {
            id: msessageId,
            message: 'test message',
            sender: { id: users.hubMemberId },
          },
        ],
      });
    });

    test('NON-HM should NOT send comment on post created on hub callout from GA', async () => {
      // Arrange
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdHub, 'test message'),
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(messageRes.text).toContain(
        `Authorization: unable to grant 'create-message' privilege: room send message: ${postCommentsIdHub}`
      );
    });
    describe('Messages - GA Send/Remove flow', () => {
      test('GA should send comment on post created on hub callout from GA', async () => {
        // Act
        const messageRes = await mutation(
          sendComment,
          sendCommentVariablesData(postCommentsIdHub, 'test message'),
          TestUser.GLOBAL_ADMIN
        );
        msessageId = messageRes.body.data.sendMessageToRoom.id;

        const postsData = await getDataPerHubCallout(
          entitiesId.hubId,
          entitiesId.hubCalloutId
        );
        const data =
          postsData.body.data.hub.collaboration.callouts[0].posts[0].comments;

        // Assert
        expect(data).toEqual({
          id: postCommentsIdHub,
          messages: [
            {
              id: msessageId,
              message: 'test message',
              sender: { id: users.globalAdminId },
            },
          ],
        });
      });

      test('GA should remove comment on post created on hub callout from GA', async () => {
        // Act
        await mutation(
          removeComment,
          removeCommentVariablesData(postCommentsIdHub, msessageId),
          TestUser.GLOBAL_ADMIN
        );

        const postsData = await getDataPerHubCallout(
          entitiesId.hubId,
          entitiesId.hubCalloutId
        );
        const data =
          postsData.body.data.hub.collaboration.callouts[0].posts[0].comments
            .messages;

        // Assert
        expect(data).toHaveLength(0);
      });
    });
  });
  describe('Delete Message - Post created by HM on Hub callout', () => {
    beforeAll(async () => {
      const resPostonHub = await createPostOnCallout(
        entitiesId.hubCalloutId,
        `em-asp-n-hub-mess-${uniqueId}`,
        { profileData: { displayName: `em-asp-d-hub-mess-${uniqueId}` } },
        PostTypes.RELATED_INITIATIVE,
        TestUser.HUB_MEMBER
      );
      hubPostId = resPostonHub.body.data.createPostOnCallout.id;
      postCommentsIdHub =
        resPostonHub.body.data.createPostOnCallout.comments.id;

      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdHub, 'test message'),
        TestUser.GLOBAL_ADMIN
      );

      msessageId = messageRes.body.data.sendMessageToRoom.id;
      await delay(1000);
    });

    afterAll(async () => {
      await removePost(hubPostId);
    });

    test('HM should NOT delete comment sent from GA', async () => {
      // Act
      const removeMessageRes = await mutation(
        removeComment,
        removeCommentVariablesData(postCommentsIdHub, msessageId),
        TestUser.HUB_MEMBER
      );

      // Assert
      expect(removeMessageRes.text).toContain(
        `Authorization: unable to grant 'delete' privilege: room remove message: ${postCommentsIdHub}`
      );
    });

    test('NON-HM should NOT delete comment sent from GA', async () => {
      // Act
      const removeMessageRes = await mutation(
        removeComment,
        removeCommentVariablesData(postCommentsIdHub, msessageId),
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(removeMessageRes.text).toContain(
        `Authorization: unable to grant 'delete' privilege: room remove message: ${postCommentsIdHub}`
      );
    });

    test('GA should remove comment sent from GA', async () => {
      // Act
      await mutation(
        removeComment,
        removeCommentVariablesData(postCommentsIdHub, msessageId),
        TestUser.GLOBAL_ADMIN
      );

      const postsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        postsData.body.data.hub.collaboration.callouts[0].posts[0].comments
          .messages;

      // Assert
      expect(data).toHaveLength(0);
    });

    test('HM should delete own comment', async () => {
      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(postCommentsIdHub, 'test message'),
        TestUser.HUB_MEMBER
      );

      msessageId = messageRes.body.data.sendMessageToRoom.id;
      await delay(1000);

      // Act
      const removeMessageRes = await mutation(
        removeComment,
        removeCommentVariablesData(postCommentsIdHub, msessageId),
        TestUser.HUB_MEMBER
      );
      const postsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );

      const dataCount =
        postsData.body.data.hub.collaboration.callouts[0].posts[0].comments
          .messages;

      // Assert
      expect(dataCount).toHaveLength(0);
      expect(removeMessageRes.text).not.toContain(
        `Authorization: unable to grant 'delete' privilege: comments remove message: post-comments-em-asp-n-hub-mess-${uniqueId}`
      );
    });
  });
});

describe('Posts - References', () => {
  const refname = 'brum';
  const refuri = 'https://brum.io';
  const refdescription = 'Brum like a brum.';
  let refId = '';
  let postProfileId = '';

  beforeAll(async () => {
    const resPostonHub = await createPostOnCallout(
      entitiesId.hubCalloutId,
      `asp-n-id-up-${uniqueId}`,
      { profileData: { displayName: 'test' } }
    );
    hubPostId = resPostonHub.body.data.createPostOnCallout.id;
    postProfileId = resPostonHub.body.data.createPostOnCallout.profile.id;
  });

  afterAll(async () => {
    await removePost(hubPostId);
  });

  test('HM should NOT add reference to post created on hub callout from GA', async () => {
    // Arrange
    const createRef = await mutation(
      createReferenceOnProfile,
      createReferenceOnProfileVariablesData(
        postProfileId,
        refname,
        refuri,
        refdescription
      ),
      TestUser.HUB_MEMBER
    );

    // Act
    expect(createRef.text).toContain(
      `Authorization: unable to grant 'create' privilege: profile: ${postProfileId}`
    );
  });

  test('NON-HM should NOT add reference to post created on hub callout from GA', async () => {
    // Arrange
    const createRef = await mutation(
      createReferenceOnProfile,
      createReferenceOnProfileVariablesData(
        postProfileId,
        refname,
        refuri,
        refdescription
      ),
      TestUser.NON_HUB_MEMBER
    );

    // Act
    expect(createRef.text).toContain(
      `Authorization: unable to grant 'create' privilege: profile: ${postProfileId}`
    );
  });

  describe('References - EA Create/Remove flow', () => {
    test('HA should add reference to post created on hub callout from GA', async () => {
      // Arrange
      const createRef = await mutation(
        createReferenceOnProfile,
        createReferenceOnProfileVariablesData(
          postProfileId,
          refname,
          refuri,
          refdescription
        ),

        TestUser.HUB_ADMIN
      );
      refId = createRef.body.data.createReferenceOnProfile.id;

      // Ac
      const postsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        postsData.body.data.hub.collaboration.callouts[0].posts[0].profile
          .references[0];

      // Assert
      expect(data).toEqual({
        id: refId,
        name: refname,
        uri: refuri,
      });
    });

    test('HA should remove reference from post created EA', async () => {
      // Arrange
      await mutation(
        deleteReference,
        deleteVariablesData(refId),
        TestUser.HUB_ADMIN
      );

      // Act
      const postsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        postsData.body.data.hub.collaboration.callouts[0].posts[0].profile
          .references;

      // Assert
      expect(data).toHaveLength(0);
    });
  });
});
