import '@test/utils/array.matcher';
import {
  deletePostCodegen,
  postDataPerSpaceCallout,
  getDataPerSpaceCalloutCodegen,
  createPostOnCalloutCodegen,
  updatePostCodegen,
  getPostDataCodegen,
} from './post.request.params';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { TestUser } from '@test/utils/token.helper';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  removeMessageOnRoomCodegen,
  sendMessageToRoomCodegen,
} from '@test/functional-api/communications/communication.params';
import { errorAuthUpdatePost } from '../../templates/post/post-template-testdata';
import {
  createReferenceOnProfileCodegen,
  deleteReferenceOnProfileCodegen,
} from '@test/functional-api/references/references.request.params';
import { entitiesId } from '@test/types/entities-helper';
import { delay } from '@test/utils';

let opportunityName = 'post-opp';
let challengeName = 'post-chal';
let spacePostId = '';
let challengePostId = '';
let opportunityPostId = '';
let postNameID = '';
let postDisplayName = '';
let postCommentsIdSpace = '';
let postCommentsIdChallenge = '';
let msessageId = '';
const spaceCalloutId = '';

const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const spaceName = 'post-eco-name' + uniqueId;
const spaceNameId = 'post-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);
  await createOpportunityWithUsersCodegen(opportunityName);
});

afterAll(async () => {
  await deleteSpace(entitiesId.opportunity.id);
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});

describe('Posts - Create', () => {
  afterEach(async () => {
    await deletePostCodegen(spacePostId);
    await deletePostCodegen(challengePostId);
    await deletePostCodegen(opportunityPostId);
  });
  test('HM should create post on space callout', async () => {
    // Act
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.space.calloutId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.HUB_MEMBER
    );
    const postDataCreate =
      resPostonSpace.data?.createContributionOnCallout.post;
    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    const postsData = await getDataPerSpaceCalloutCodegen(
      entitiesId.spaceId,
      entitiesId.space.calloutId,
      TestUser.HUB_MEMBER
    );
    const data = postsData.data?.space.collaboration?.callouts?.[0].contributions?.find(
      c => c.post && c.post.id === spacePostId
    )?.post;

    // Assert
    expect(data).toEqual(postDataCreate);
  });

  test('GA should create post on space callout without setting nameId', async () => {
    // Act
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.space.calloutId,
      { displayName: postDisplayName },
      postNameID
    );

    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
    const spacePostNameId =
      resPostonSpace.data?.createContributionOnCallout.post?.nameID;

    // Assert
    expect(spacePostNameId).toContain(postNameID);
  });

  test('NON-SM should NOT create post on space callout', async () => {
    // Act
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.space.calloutId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(JSON.stringify(resPostonSpace)).toContain(
      `Authorization: unable to grant 'contribute' privilege: create contribution on callout: ${spaceCalloutId}`
    );
  });

  test('ChA should create post on challenge callout', async () => {
    // Act
    const resPostonChallenge = await createPostOnCalloutCodegen(
      entitiesId.challenge.calloutId,
      { displayName: postDisplayName },
      postNameID + 'ch',
      TestUser.CHALLENGE_ADMIN
    );

    const postDataCreate =
      resPostonChallenge.data?.createContributionOnCallout.post;
    challengePostId =
      resPostonChallenge.data?.createContributionOnCallout.post?.id ?? '';

    const post = await getPostDataCodegen(
      challengePostId,
      TestUser.CHALLENGE_ADMIN
    );

    // Assert
    expect(post.data?.lookup.post).toEqual(postDataCreate);
  });

  test('GA should create post on opportunity callout', async () => {
    // Act
    const resPostonOpportunity = await createPostOnCalloutCodegen(
      entitiesId.opportunity.calloutId,
      { displayName: postDisplayName },
      postNameID + 'op'
    );

    const postDataCreate =
      resPostonOpportunity.data?.createContributionOnCallout.post;
    opportunityPostId =
      resPostonOpportunity.data?.createContributionOnCallout.post?.id ?? '';

    const post = await getPostDataCodegen(
      opportunityPostId,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(post.data?.lookup.post).toEqual(postDataCreate);
  });
});

describe('Posts - Update', () => {
  beforeAll(async () => {
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.space.calloutId,
      { displayName: postDisplayName + 'forUpdates' },
      `post-name-id-up-${uniqueId}`
    );
    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
  });

  afterAll(async () => {
    await deletePostCodegen(spacePostId);
  });

  test('HM should NOT update post created on space callout from GA', async () => {
    // Act
    const resPostonSpace = await updatePostCodegen(
      spacePostId,
      postNameID,
      { profileData: { displayName: postDisplayName + 'HM update' } },
      TestUser.HUB_MEMBER
    );

    // Assert
    expect(JSON.stringify(resPostonSpace)).toContain(errorAuthUpdatePost);
  });

  test('NON-HM should NOT update post created on space callout from GA', async () => {
    // Arrange
    const resPostonSpace = await updatePostCodegen(
      spacePostId,
      postNameID,
      { profileData: { displayName: postDisplayName + 'Non-HM update' } },
      TestUser.NON_HUB_MEMBER
    );

    // Act
    expect(JSON.stringify(resPostonSpace)).toContain(errorAuthUpdatePost);
  });

  test('HA should update post created on space callout from GA', async () => {
    // Arrange
    const resPostonSpace = await updatePostCodegen(
      spacePostId,
      postNameID,
      { profileData: { displayName: postDisplayName + 'HA update' } },
      TestUser.HUB_ADMIN
    );
    const postDataUpdate = resPostonSpace.data?.updatePost;

    // Act
    const postsData = await getDataPerSpaceCalloutCodegen(
      entitiesId.spaceId,
      entitiesId.space.calloutId,
      TestUser.HUB_ADMIN
    );
    const data = postsData.data?.space.collaboration?.callouts?.[0].contributions?.find(
      c => c.post && c.post.id === postDataUpdate?.id
    )?.post;

    // Assert
    expect(data).toEqual(postDataUpdate);
  });
  test('GA should update post created on space callout from GA', async () => {
    // Arrange
    const resPostonSpace = await updatePostCodegen(
      spacePostId,
      postNameID,
      { profileData: { displayName: postDisplayName + 'GA update' } },
      TestUser.GLOBAL_ADMIN
    );
    const postDataUpdate = resPostonSpace.data?.updatePost;

    // Act
    const postsData = await getDataPerSpaceCalloutCodegen(
      entitiesId.spaceId,
      entitiesId.space.calloutId
    );
    const data = postsData.data?.space.collaboration?.callouts?.[0].contributions?.find(
      c => c.post && c.post.id === postDataUpdate?.id
    )?.post;

    // Assert
    expect(data).toEqual(postDataUpdate);
  });
});

test('HM should update post created on space callout from HM', async () => {
  // Arrange
  const resPostonSpaceEM = await createPostOnCalloutCodegen(
    entitiesId.space.calloutId,
    { displayName: postDisplayName + 'HM' },
    postNameID,
    TestUser.HUB_MEMBER
  );
  const spacePostIdEM =
    resPostonSpaceEM.data?.createContributionOnCallout.post?.id ?? 'ß';

  // Act
  const resPostonSpace = await updatePostCodegen(
    spacePostIdEM,
    postNameID,
    { profileData: { displayName: postDisplayName + 'HM update' } },

    TestUser.HUB_MEMBER
  );

  const postDataUpdate = resPostonSpace.data?.updatePost;

  // Act
  const postsData = await getDataPerSpaceCalloutCodegen(
    entitiesId.spaceId,
    entitiesId.space.calloutId,
    TestUser.HUB_MEMBER
  );
  const data = postsData.data?.space.collaboration?.callouts?.[0].contributions?.find(
    c => c.post && c.post.id === spacePostIdEM
  )?.post;

  // Assert
  expect(data).toEqual(postDataUpdate);

  await deletePostCodegen(spacePostIdEM);
});

describe('Posts - Delete', () => {
  test('HM should NOT delete post created on space callout from GA', async () => {
    // Arrange
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.space.calloutId,
      { displayName: postDisplayName },
      postNameID
    );

    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    // Act
    const responseRemove = await deletePostCodegen(
      spacePostId,
      TestUser.HUB_MEMBER
    );

    const postsData = await postDataPerSpaceCallout(
      entitiesId.spaceId,
      entitiesId.space.calloutId
    );

    // Assert
    expect(responseRemove.error?.errors[0].message).toContain(
      `Authorization: unable to grant 'delete' privilege: delete post: ${spacePostId}`
    );
    expect(postsData).toHaveLength(1);
    await deletePostCodegen(spacePostId);
  });

  test('HM should delete post created on space callout from Himself', async () => {
    // Arrange
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.space.calloutId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.HUB_MEMBER
    );

    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    // Act
    await deletePostCodegen(spacePostId, TestUser.HUB_MEMBER);
    const postsData = await postDataPerSpaceCallout(
      entitiesId.spaceId,
      entitiesId.space.calloutId
    );

    // Assert
    expect(postsData).toHaveLength(0);
  });

  test('HM should delete post created on space callout from EM', async () => {
    // Arrange
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.space.calloutId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.HUB_MEMBER
    );
    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    // Act
    await deletePostCodegen(spacePostId, TestUser.GLOBAL_ADMIN);
    const postsData = await postDataPerSpaceCallout(
      entitiesId.spaceId,
      entitiesId.space.calloutId
    );
    // Assert
    expect(postsData).toHaveLength(0);
  });

  test('NON-EM should NOT delete post created on space callout created from HM', async () => {
    // Arrange
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.space.calloutId,
      { displayName: postDisplayName },
      postNameID,
      TestUser.HUB_MEMBER
    );

    spacePostId =
      resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

    // Act
    const responseRemove = await deletePostCodegen(
      spacePostId,
      TestUser.NON_HUB_MEMBER
    );

    const postsData = await postDataPerSpaceCallout(
      entitiesId.spaceId,
      entitiesId.space.calloutId
    );
    // Assert
    expect(responseRemove.error?.errors[0].code).toContain('FORBIDDEN_POLICY');
    expect(postsData).toHaveLength(1);
    await deletePostCodegen(spacePostId);
  });

  test('ChA should delete post created on challenge callout from GA', async () => {
    // Arrange
    const resPostonChallenge = await createPostOnCalloutCodegen(
      entitiesId.challenge.calloutId,
      { displayName: postDisplayName + 'ch' },
      postNameID + 'ch'
    );
    challengePostId =
      resPostonChallenge.data?.createContributionOnCallout.post?.id ?? '';

    // Act
    await deletePostCodegen(challengePostId, TestUser.CHALLENGE_ADMIN);
    const data = await getPostDataCodegen(challengePostId);

    // Assert
    expect(data.error?.errors[0].message).toEqual(
      `Not able to locate post with the specified ID: ${challengePostId}`
    );
  });

  test('HA should delete post created on challenge callout from ChA', async () => {
    // Arrange
    const resPostonChallenge = await createPostOnCalloutCodegen(
      entitiesId.challenge.calloutId,
      { displayName: postDisplayName + 'ch' },
      postNameID + 'ch',
      TestUser.CHALLENGE_ADMIN
    );

    challengePostId =
      resPostonChallenge.data?.createContributionOnCallout.post?.id ?? '';

    // Act
    await deletePostCodegen(challengePostId, TestUser.HUB_ADMIN);
    const data = await getPostDataCodegen(challengePostId);

    // Assert
    expect(data.error?.errors[0].message).toEqual(
      `Not able to locate post with the specified ID: ${challengePostId}`
    );
  });

  test('ChA should delete post created on opportunity callout from OM', async () => {
    // Act
    const resPostonOpportunity = await createPostOnCalloutCodegen(
      entitiesId.opportunity.calloutId,
      { displayName: postDisplayName + 'opm' },
      postNameID + 'opm',
      TestUser.OPPORTUNITY_MEMBER
    );
    opportunityPostId =
      resPostonOpportunity.data?.createContributionOnCallout.post?.id ?? '';

    // Act
    await deletePostCodegen(opportunityPostId, TestUser.CHALLENGE_ADMIN);
    const data = await getPostDataCodegen(opportunityPostId);

    // Assert
    expect(data.error?.errors[0].message).toEqual(
      `Not able to locate post with the specified ID: ${opportunityPostId}`
    );
  });

  test('ChM should not delete post created on challenge callout from ChA', async () => {
    // Arrange
    const resPostonChallenge = await createPostOnCalloutCodegen(
      entitiesId.challenge.calloutId,
      { displayName: postDisplayName + 'ch' },
      postNameID + 'ch',
      TestUser.CHALLENGE_ADMIN
    );

    challengePostId =
      resPostonChallenge.data?.createContributionOnCallout.post?.id ?? '';

    // Act
    const responseRemove = await deletePostCodegen(
      challengePostId,
      TestUser.CHALLENGE_MEMBER
    );

    const dataPost = await getPostDataCodegen(challengePostId);

    // // Assert
    expect(responseRemove?.error?.errors[0].message).toContain(
      `Authorization: unable to grant 'delete' privilege: delete post: ${dataPost?.data?.lookup?.post?.id}`
    );
    expect(dataPost?.data?.lookup?.post?.id).toEqual(challengePostId);
    await deletePostCodegen(challengePostId);
  });

  test('OM should delete own post on opportunity callout', async () => {
    // Act
    const resPostonOpportunity = await createPostOnCalloutCodegen(
      entitiesId.opportunity.calloutId,
      { displayName: postDisplayName + 'ch' },
      postNameID + 'op',
      TestUser.OPPORTUNITY_MEMBER
    );
    opportunityPostId =
      resPostonOpportunity.data?.createContributionOnCallout.post?.id ?? '';

    // Act
    await deletePostCodegen(opportunityPostId, TestUser.OPPORTUNITY_MEMBER);
    const data = await getPostDataCodegen(opportunityPostId);

    // Assert
    expect(data.error?.errors[0].message).toEqual(
      `Not able to locate post with the specified ID: ${opportunityPostId}`
    );
  });

  test('GA should delete own post on opportunity callout', async () => {
    // Act
    const resPostonOpportunity = await createPostOnCalloutCodegen(
      entitiesId.opportunity.calloutId,
      { displayName: postDisplayName + 'ch' },
      postNameID + 'op',
      TestUser.GLOBAL_ADMIN
    );
    opportunityPostId =
      resPostonOpportunity.data?.createContributionOnCallout.post?.id ?? '';

    // Act
    await deletePostCodegen(opportunityPostId, TestUser.GLOBAL_ADMIN);
    const data = await getPostDataCodegen(opportunityPostId);

    // Assert
    expect(data.error?.errors[0].message).toEqual(
      `Not able to locate post with the specified ID: ${opportunityPostId}`
    );
  });
});

describe('Posts - Messages', () => {
  describe('Send Message - Post created by GA on Space callout', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.space.calloutId,
        { displayName: `asp-nspace-mess-${uniqueId}` },
        `asp-dspace-mess-${uniqueId}`
      );

      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdSpace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';

      const resPostonChallenge = await createPostOnCalloutCodegen(
        entitiesId.challenge.calloutId,
        { displayName: `asp-nchal-mess-${uniqueId}` },
        `asp-dchal-mess-${uniqueId}`
      );

      challengePostId =
        resPostonChallenge.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdChallenge =
        resPostonChallenge.data?.createContributionOnCallout.post?.comments
          .id ?? '';
    });

    afterAll(async () => {
      await deletePostCodegen(spacePostId);
      await deletePostCodegen(challengePostId);
    });

    afterEach(async () => {
      await delay(3000);
      await removeMessageOnRoomCodegen(
        postCommentsIdSpace,
        msessageId,
        TestUser.GLOBAL_ADMIN
      );
    });

    test('ChA should send comment on post created on challenge callout from GA', async () => {
      // Arrange
      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdChallenge,
        'test message on challenge post',
        TestUser.CHALLENGE_ADMIN
      );
      msessageId = messageRes?.data?.sendMessageToRoom.id;
      const postsData = await getPostDataCodegen(challengePostId);

      // Assert
      expect(postsData.data?.lookup.post?.comments).toEqual({
        id: postCommentsIdChallenge,
        messagesCount: 1,
        messages: [
          {
            id: msessageId,
            message: 'test message on challenge post',
            sender: { id: users.challengeAdmin.id },
          },
        ],
      });
    });

    test('HM should send comment on post created on space callout from GA', async () => {
      // Arrange
      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        'test message',
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes?.data?.sendMessageToRoom.id;
      const postsData = await getPostDataCodegen(spacePostId);

      // Assert
      expect(postsData.data?.lookup.post?.comments).toEqual({
        id: postCommentsIdSpace,
        messagesCount: 1,
        messages: [
          {
            id: msessageId,
            message: 'test message',
            sender: { id: users.spaceMember.id },
          },
        ],
      });
    });

    test('NON-HM should NOT send comment on post created on space callout from GA', async () => {
      // Arrange
      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        'test message',
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(messageRes.error?.errors[0].message).toContain(
        `Authorization: unable to grant 'create-message' privilege: room send message: ${postCommentsIdSpace}`
      );
    });
    describe('Messages - GA Send/Remove flow', () => {
      test('GA should send comment on post created on space callout from GA', async () => {
        // Act
        const messageRes = await sendMessageToRoomCodegen(
          postCommentsIdSpace,
          'test message',
          TestUser.GLOBAL_ADMIN
        );
        msessageId = messageRes?.data?.sendMessageToRoom.id;
        const postsData = await getPostDataCodegen(spacePostId);

        // Assert
        expect(postsData.data?.lookup.post?.comments).toEqual({
          id: postCommentsIdSpace,
          messagesCount: 1,
          messages: [
            {
              id: msessageId,
              message: 'test message',
              sender: { id: users.globalAdmin.id },
            },
          ],
        });
      });

      test('GA should remove comment on post created on space callout from GA', async () => {
        // Act
        await removeMessageOnRoomCodegen(
          postCommentsIdSpace,
          msessageId,
          TestUser.GLOBAL_ADMIN
        );
        const postsData = await getPostDataCodegen(spacePostId);

        // Assert
        expect(postsData.data?.lookup.post?.comments.messages).toHaveLength(0);
      });
    });
  });
  describe('Delete Message - Post created by HM on Space callout', () => {
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.space.calloutId,
        { displayName: `em-asp-d-space-mess-${uniqueId}` },
        `em-asp-n-spa-mess-${uniqueId}`,
        TestUser.HUB_MEMBER
      );
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postCommentsIdSpace =
        resPostonSpace.data?.createContributionOnCallout.post?.comments.id ??
        '';

      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        'test message',
        TestUser.GLOBAL_ADMIN
      );

      msessageId = messageRes?.data?.sendMessageToRoom.id;
      await delay(1000);
    });

    afterAll(async () => {
      await deletePostCodegen(spacePostId);
    });

    test('HM should NOT delete comment sent from GA', async () => {
      // Act
      const removeMessageRes = await removeMessageOnRoomCodegen(
        postCommentsIdSpace,
        msessageId,
        TestUser.HUB_MEMBER
      );

      // Assert
      expect(removeMessageRes.error?.errors[0].message).toContain(
        `Authorization: unable to grant 'delete' privilege: room remove message: ${postCommentsIdSpace}`
      );
    });

    test('NON-HM should NOT delete comment sent from GA', async () => {
      // Act
      const removeMessageRes = await removeMessageOnRoomCodegen(
        postCommentsIdSpace,
        msessageId,
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(removeMessageRes.error?.errors[0].message).toContain(
        `Authorization: unable to grant 'delete' privilege: room remove message: ${postCommentsIdSpace}`
      );
    });

    test('GA should remove comment sent from GA', async () => {
      // Act
      await removeMessageOnRoomCodegen(
        postCommentsIdSpace,
        msessageId,
        TestUser.GLOBAL_ADMIN
      );
      const postsData = await getPostDataCodegen(spacePostId);

      // Assert
      expect(postsData.data?.lookup.post?.comments.messages).toHaveLength(0);
    });

    test('HM should delete own comment', async () => {
      const messageRes = await sendMessageToRoomCodegen(
        postCommentsIdSpace,
        'test message',
        TestUser.HUB_MEMBER
      );

      msessageId = messageRes?.data?.sendMessageToRoom.id;
      await delay(1000);

      // Act
      await removeMessageOnRoomCodegen(
        postCommentsIdSpace,
        msessageId,
        TestUser.HUB_MEMBER
      );
      const postsData = await getPostDataCodegen(spacePostId);

      // Assert
      expect(postsData.data?.lookup.post?.comments.messages).toHaveLength(0);
    });
  });
});

describe('Posts - References', () => {
  const refname = 'brum';
  let refId = '';
  let postProfileId = '';

  beforeAll(async () => {
    const resPostonSpace = await createPostOnCalloutCodegen(
      entitiesId.space.calloutId,

      { displayName: 'test' },
      `asp-n-id-up-${uniqueId}`
    );
    spacePostId =
      resPostonSpace?.data?.createContributionOnCallout?.post?.id ?? '';
    postProfileId =
      resPostonSpace?.data?.createContributionOnCallout?.post?.profile.id ?? '';
  });

  afterAll(async () => {
    await deletePostCodegen(spacePostId);
  });

  test('HM should NOT add reference to post created on space callout from GA', async () => {
    // Arrange
    const createRef = await createReferenceOnProfileCodegen(
      postProfileId,
      refname,
      TestUser.HUB_MEMBER
    );

    // Act
    expect(createRef.error?.errors[0].message).toContain(
      `Authorization: unable to grant 'create' privilege: profile: ${postProfileId}`
    );
  });

  test('NON-HM should NOT add reference to post created on space callout from GA', async () => {
    // Arrange
    const createRef = await createReferenceOnProfileCodegen(
      postProfileId,
      refname,
      TestUser.NON_HUB_MEMBER
    );

    // Act
    expect(createRef.error?.errors[0].message).toContain(
      `Authorization: unable to grant 'create' privilege: profile: ${postProfileId}`
    );
  });

  describe('References - EA Create/Remove flow', () => {
    test('HA should add reference to post created on space callout from GA', async () => {
      // Arrange
      const createRef = await createReferenceOnProfileCodegen(
        postProfileId,
        refname,
        TestUser.HUB_ADMIN
      );
      refId = createRef?.data?.createReferenceOnProfile.id ?? '';

      // Act
      const postsData = await getPostDataCodegen(spacePostId);

      // Assert
      expect(
        postsData.data?.lookup.post?.profile.references?.[0]
      ).toMatchObject({
        id: refId,
        name: refname,
      });
    });

    test('HA should remove reference from post created EA', async () => {
      // Arrange
      await deleteReferenceOnProfileCodegen(refId, TestUser.HUB_ADMIN);

      // Act
      const postsData = await getPostDataCodegen(spacePostId);

      // Assert
      expect(postsData.data?.lookup.post?.profile.references).toHaveLength(0);
    });
  });
});
