/* eslint-disable quotes */
import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeHub } from '../hub/hub.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndHubWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import {
  createCalloutOnCollaboration,
  deleteCallout,
  getChallengeCalloutByNameId,
  getHubCalloutByNameId,
  getOpportunityCalloutByNameId,
  updateCallout,
  updateCalloutVisibility,
} from './callouts.request.params';
import {
  PostTypes,
  createPostOnCallout,
  getDataPerHubCallout,
} from '../post/post.request.params';
import { CalloutState, CalloutVisibility } from './callouts-enum';
import { TestUser } from '@test/utils';
import { postCommentInCallout } from '../comments/comments.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { createWhiteboardOnCallout } from '../whiteboard/whiteboard.request.params';

let opportunityName = 'post-opp';
let challengeName = 'post-chal';
let calloutId = '';
let postNameID = '';

const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const hubName = 'callout-eco-name' + uniqueId;
const hubNameId = 'callout-eco-nameid' + uniqueId;

const getIdentifier = (
  entity: string,
  hubCalloutId: string,
  challengeCalloutId: string,
  opportunityCalloutId: string
) => {
  let id = '';
  if (entity === 'hub') {
    id = hubCalloutId;
    return id;
  } else if (entity === 'challenge') {
    id = challengeCalloutId;
    return id;
  } else {
    id = opportunityCalloutId;
    return id;
  }
};
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
});

describe('Callouts - Close State', () => {
  afterEach(async () => {
    await deleteCallout(calloutId);
  });
  test('Close callout that has not been published', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
      state: CalloutState.CLOSED,
    });
    const postsData = await getDataPerHubCallout(entitiesId.hubId, calloutId);
    const data = postsData.body.data.hub.collaboration.callouts[0];

    // Assert
    expect(data.state).toEqual(CalloutState.CLOSED);
  });

  test('Close callout that has been published', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(calloutId, CalloutVisibility.PUBLISHED);

    await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
      state: CalloutState.CLOSED,
    });
    const postsData = await getDataPerHubCallout(entitiesId.hubId, calloutId);
    const data = postsData.body.data.hub.collaboration.callouts[0];

    // Assert
    expect(data.state).toEqual(CalloutState.CLOSED);
  });
});

// The suite contains scenarios for 'post create' and 'post comment'. Post Update / Delete to be added on later stage (low priority)
describe('Callout - Close State - User Privileges Posts', () => {
  let hubCalloutId = '';
  let challengeCalloutId = '';
  let opportunityCalloutId = '';
  let postCommentsIdHub = '';
  let postCommentsIdChallenge = '';
  let postCommentsIdOpportunity = '';
  postNameID = `post-name-id-${uniqueId}`;

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      const resPostonHub = await createPostOnCallout(calloutId, postNameID, {
        profileData: { displayName: 'postDisplayName' },
      });
      const postDataCreate = resPostonHub.body.data.createPostOnCallout;
      const postCommentsId = postDataCreate.comments.id;

      await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
        state: CalloutState.CLOSED,
      });
      return postCommentsId;
    };

    const hubCallout = await getHubCalloutByNameId(
      entitiesId.hubId,
      entitiesId.hubCalloutId
    );
    hubCalloutId = hubCallout.body.data.hub.collaboration.callouts[0].id;
    postCommentsIdHub = await preconditions(hubCalloutId);

    const challengeCallout = await getChallengeCalloutByNameId(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeCalloutId
    );
    challengeCalloutId =
      challengeCallout.body.data.hub.challenge.collaboration.callouts[0].id;
    postCommentsIdChallenge = await preconditions(challengeCalloutId);

    const opportunityCallout = await getOpportunityCalloutByNameId(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityCalloutId
    );
    opportunityCalloutId =
      opportunityCallout.body.data.hub.opportunity.collaboration.callouts[0].id;
    postCommentsIdOpportunity = await preconditions(opportunityCalloutId);
  });

  afterAll(async () => {
    await deleteCallout(opportunityCalloutId);
    await deleteCallout(challengeCalloutId);
    await deleteCallout(hubCalloutId);
  });

  describe('Send Comment to Post - Callout Close State ', () => {
    describe('DDT Users sending messages to closed callout post', () => {
      // Arrange
      test.each`
        userRole                       | message                                                                            | entity
        ${TestUser.HUB_ADMIN}          | ${'sendComment'}                                                                   | ${'hub'}
        ${TestUser.HUB_MEMBER}         | ${'sendComment'}                                                                   | ${'hub'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'hub'}
        ${TestUser.CHALLENGE_ADMIN}    | ${'sendComment'}                                                                   | ${'challenge'}
        ${TestUser.CHALLENGE_MEMBER}   | ${'sendComment'}                                                                   | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'challenge'}
        ${TestUser.OPPORTUNITY_ADMIN}  | ${'sendComment'}                                                                   | ${'opportunity'}
        ${TestUser.OPPORTUNITY_MEMBER} | ${'sendComment'}                                                                   | ${'opportunity'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'opportunity'}
      `(
        'User: "$userRole" can send message to closed "$entity" callout post',
        async ({ userRole, message, entity }) => {
          const id = getIdentifier(
            entity,
            postCommentsIdHub,
            postCommentsIdChallenge,
            postCommentsIdOpportunity
          );

          const messageRes = await mutation(
            sendComment,
            sendCommentVariablesData(id, 'sendComment'),
            userRole
          );

          // Assert
          expect(messageRes.text).toContain(message);
        }
      );
    });
  });

  describe('Create Post - Callout Close State ', () => {
    describe('DDT Users create post to closed callout', () => {
      // Arrange
      test.each`
        userRole                       | message                                                                             | entity
        ${TestUser.HUB_ADMIN}          | ${'"New collaborations to a closed Callout with id:'}                               | ${'hub'}
        ${TestUser.HUB_MEMBER}         | ${'"New collaborations to a closed Callout with id'}                                | ${'hub'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-post' privilege: create post on callout"} | ${'hub'}
        ${TestUser.CHALLENGE_ADMIN}    | ${'"New collaborations to a closed Callout with id:'}                               | ${'challenge'}
        ${TestUser.CHALLENGE_MEMBER}   | ${'"New collaborations to a closed Callout with id'}                                | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-post' privilege: create post on callout"} | ${'challenge'}
        ${TestUser.OPPORTUNITY_ADMIN}  | ${'"New collaborations to a closed Callout with id:'}                               | ${'opportunity'}
        ${TestUser.OPPORTUNITY_MEMBER} | ${'"New collaborations to a closed Callout with id'}                                | ${'opportunity'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-post' privilege: create post on callout"} | ${'opportunity'}
      `(
        'User: "$userRole" get error when create post to closed "$entity" callout',
        async ({ userRole, message, entity }) => {
          const id = getIdentifier(
            entity,
            hubCalloutId,
            challengeCalloutId,
            opportunityCalloutId
          );

          const res = await createPostOnCallout(
            id,
            'postname-id',
            { profileData: { displayName: 'postDisplayName' } },
            PostTypes.KNOWLEDGE,
            userRole
          );

          // Assert
          expect(res.text).toContain(message);
        }
      );
    });
  });
});

// The suite contains scenarios for whiteboard creation. Whiteboard Update / Delete to be added on later stage (low priority)
describe('Callout - Close State - User Privileges Whiteboardes', () => {
  let hubCalloutId = '';
  let challengeCalloutId = '';
  let opportunityCalloutId = '';

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
        state: CalloutState.CLOSED,
      });
    };

    const hubCallout = await getHubCalloutByNameId(
      entitiesId.hubId,
      entitiesId.hubWhiteboardCalloutId
    );
    hubCalloutId = hubCallout.body.data.hub.collaboration.callouts[0].id;
    await preconditions(hubCalloutId);

    const challengeCallout = await getChallengeCalloutByNameId(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeWhiteboardCalloutId
    );
    challengeCalloutId =
      challengeCallout.body.data.hub.challenge.collaboration.callouts[0].id;
    await preconditions(challengeCalloutId);

    const opportunityCallout = await getOpportunityCalloutByNameId(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityWhiteboardCalloutId
    );
    opportunityCalloutId =
      opportunityCallout.body.data.hub.opportunity.collaboration.callouts[0].id;
    await preconditions(opportunityCalloutId);
  });

  afterAll(async () => {
    await deleteCallout(opportunityCalloutId);
    await deleteCallout(challengeCalloutId);
    await deleteCallout(hubCalloutId);
  });

  describe('Whiteboard Callout - Close State ', () => {
    describe('DDT Users create whiteboard to closed callout', () => {
      // Arrange
      test.each`
        userRole                       | message                                                                                         | entity
        ${TestUser.HUB_ADMIN}          | ${'"New collaborations to a closed Callout with id:'}                                           | ${'hub'}
        ${TestUser.HUB_MEMBER}         | ${'"New collaborations to a closed Callout with id'}                                            | ${'hub'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-whiteboard' privilege: create whiteboard on callout"} | ${'hub'}
        ${TestUser.CHALLENGE_ADMIN}    | ${'"New collaborations to a closed Callout with id:'}                                           | ${'challenge'}
        ${TestUser.CHALLENGE_MEMBER}   | ${'"New collaborations to a closed Callout with id'}                                            | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-whiteboard' privilege: create whiteboard on callout"} | ${'challenge'}
        ${TestUser.OPPORTUNITY_ADMIN}  | ${'"New collaborations to a closed Callout with id:'}                                           | ${'opportunity'}
        ${TestUser.OPPORTUNITY_MEMBER} | ${'"New collaborations to a closed Callout with id'}                                            | ${'opportunity'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-whiteboard' privilege: create whiteboard on callout"} | ${'opportunity'}
      `(
        'User: "$userRole" get error when create whiteboard to closed "$entity" callout',
        async ({ userRole, message, entity }) => {
          const id = getIdentifier(
            entity,
            hubCalloutId,
            challengeCalloutId,
            opportunityCalloutId
          );

          const res = await createWhiteboardOnCallout(
            id,
            'WhiteboardName',
            userRole
          );
          // Assert
          expect(res.text).toContain(message);
        }
      );
    });
  });
});

describe('Callout - Close State - User Privileges Discussions', () => {
  let hubCalloutId = '';
  let challengeCalloutId = '';
  let opportunityCalloutId = '';
  let hubCalloutCommentsId = '';
  let challengeCalloutCommentsId = '';
  let opportunityCalloutCommentsId = '';

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
        state: CalloutState.CLOSED,
      });
    };

    const hubCallout = await getHubCalloutByNameId(
      entitiesId.hubId,
      entitiesId.hubDiscussionCalloutId
    );
    hubCalloutId = hubCallout.body.data.hub.collaboration.callouts[0].id;
    hubCalloutCommentsId =
      hubCallout.body.data.hub.collaboration.callouts[0].comments.id;
    await preconditions(hubCalloutId);

    const challengeCallout = await getChallengeCalloutByNameId(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeDiscussionCalloutId
    );
    challengeCalloutId =
      challengeCallout.body.data.hub.challenge.collaboration.callouts[0].id;
    challengeCalloutCommentsId =
      challengeCallout.body.data.hub.challenge.collaboration.callouts[0]
        .comments.id;
    await preconditions(challengeCalloutId);

    const opportunityCallout = await getOpportunityCalloutByNameId(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityDiscussionCalloutId
    );
    opportunityCalloutId =
      opportunityCallout.body.data.hub.opportunity.collaboration.callouts[0].id;
    opportunityCalloutCommentsId =
      opportunityCallout.body.data.hub.opportunity.collaboration.callouts[0]
        .comments.id;
    await preconditions(opportunityCalloutId);
  });

  afterAll(async () => {
    await deleteCallout(opportunityCalloutId);
    await deleteCallout(challengeCalloutId);
    await deleteCallout(hubCalloutId);
  });

  describe('Discussion Callout - Close State ', () => {
    describe('DDT Users sending messages to closed discussion callout', () => {
      // Arrange
      test.each`
        userRole                       | message                                                                            | entity
        ${TestUser.HUB_ADMIN}          | ${'"New collaborations to a closed Callout with id:'}                              | ${'hub'}
        ${TestUser.HUB_MEMBER}         | ${'"New collaborations to a closed Callout with id'}                               | ${'hub'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'hub'}
        ${TestUser.CHALLENGE_ADMIN}    | ${'"New collaborations to a closed Callout with id:'}                              | ${'challenge'}
        ${TestUser.CHALLENGE_MEMBER}   | ${'"New collaborations to a closed Callout with id'}                               | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'challenge'}
        ${TestUser.OPPORTUNITY_ADMIN}  | ${'"New collaborations to a closed Callout with id:'}                              | ${'opportunity'}
        ${TestUser.OPPORTUNITY_MEMBER} | ${'"New collaborations to a closed Callout with id'}                               | ${'opportunity'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'opportunity'}
      `(
        'User: "$userRole" get error when send message to closed "$entity" callout',
        async ({ userRole, message, entity }) => {
          const commentsId = getIdentifier(
            entity,
            hubCalloutCommentsId,
            challengeCalloutCommentsId,
            opportunityCalloutCommentsId
          );
          // Act
          const res = await postCommentInCallout(
            commentsId,
            'comment on discussion callout',
            userRole
          );

          // Assert
          expect(res.text).toContain(message);
        }
      );
    });
  });
});
