/* eslint-disable quotes */
import '@test/utils/array.matcher';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  deleteCallout,
  createCalloutOnCollaboration,
  updateCallout,
  updateCalloutVisibility,
} from '../callouts.request.params';
import {
  createPostOnCallout,
  getDataPerSpaceCallout,
} from '../post/post.request.params';
import { TestUser } from '@test/utils';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndSpaceWithUsers,
  getDefaultChallengeCalloutByNameId,
  getDefaultOpportunityCalloutByNameId,
  getDefaultSpaceCalloutByNameId,
} from '@test/utils/data-setup/entities';
import {
  CalloutState,
  CalloutVisibility,
} from '@test/generated/alkemio-schema';
import { deleteSpace } from '../../journey/space/space.request.params';
import { sendMessageToRoom } from '@test/functional-api/communications/communication.params';
import { entitiesId } from '@test/types/entities-helper';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';

let opportunityName = 'post-opp';
let challengeName = 'post-chal';
let calloutId = '';
let postNameID = '';

const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const spaceName = 'callout-eco-name' + uniqueId;
const spaceNameId = 'callout-eco-nameid' + uniqueId;

const getIdentifier = (
  entity: string,
  spaceCalloutId: string,
  challengeCalloutId: string,
  opportunityCalloutId: string
) => {
  let id = '';
  if (entity === 'space') {
    id = spaceCalloutId;
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
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);
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
});

describe('Callouts - Close State', () => {
  afterEach(async () => {
    await deleteCallout(calloutId);
  });
  test('Close callout that has not been published', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.space.collaborationId,
      {
        framing: { profile: { displayName: 'check' } },
      }
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
      contributionPolicy: {
        state: CalloutState.Closed,
      },
    });

    const postsData = await getDataPerSpaceCallout(
      entitiesId.spaceId,
      calloutId
    );
    const data = postsData.data?.space.collaboration?.callouts?.[0];

    // Assert
    expect(data?.contributionPolicy.state).toEqual(CalloutState.Closed);
  });

  test('Close callout that has been published', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.space.collaborationId
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibility(calloutId, CalloutVisibility.Published);

    await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
      contributionPolicy: {
        state: CalloutState.Closed,
      },
    });
    const postsData = await getDataPerSpaceCallout(
      entitiesId.spaceId,
      calloutId
    );
    const data = postsData.data?.space.collaboration?.callouts?.[0];

    // Assert
    expect(data?.contributionPolicy.state).toEqual(CalloutState.Closed);
  });
});

// The suite contains scenarios for 'post create' and 'post comment'. Post Update / Delete to be added on later stage (low priority)
describe('Callout - Close State - User Privileges Posts', () => {
  let spaceCalloutId = '';
  let challengeCalloutId = '';
  let opportunityCalloutId = '';
  let postCommentsIdSpace = '';
  let postCommentsIdChallenge = '';
  let postCommentsIdOpportunity = '';

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      const resPostonSpace = await createPostOnCallout(calloutId, {
        displayName: 'postDisplayName',
      });
      const postDataCreate =
        resPostonSpace.data?.createContributionOnCallout.post;
      const postCommentsId = postDataCreate?.comments.id ?? '';

      await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
        contributionPolicy: {
          state: CalloutState.Closed,
        },
      });
      return postCommentsId;
    };

    const spaceCallout = await getDefaultSpaceCalloutByNameId(
      entitiesId.spaceId,
      entitiesId.space.calloutId
    );
    spaceCalloutId = spaceCallout?.data?.lookup?.callout?.id ?? '';
    postCommentsIdSpace = await preconditions(spaceCalloutId);

    const challengeCallout = await getDefaultChallengeCalloutByNameId(
      entitiesId.spaceId,
      entitiesId.challenge.id,
      entitiesId.challenge.calloutId
    );
    challengeCalloutId = challengeCallout?.data?.lookup?.callout?.id ?? '';
    postCommentsIdChallenge = await preconditions(challengeCalloutId);

    const opportunityCallout = await getDefaultOpportunityCalloutByNameId(
      entitiesId.spaceId,
      entitiesId.opportunity.id,
      entitiesId.opportunity.calloutId
    );
    opportunityCalloutId = opportunityCallout?.id ?? '';
    postCommentsIdOpportunity = await preconditions(opportunityCalloutId);
  });

  afterAll(async () => {
    await deleteCallout(opportunityCalloutId);
    await deleteCallout(challengeCalloutId);
    await deleteCallout(spaceCalloutId);
  });

  describe('Send Comment to Post - Callout Close State ', () => {
    describe('DDT Users sending messages to closed callout post', () => {
      // Arrange
      test.each`
        userRole                       | message          | entity
        ${TestUser.HUB_ADMIN}          | ${'sendComment'} | ${'space'}
        ${TestUser.HUB_MEMBER}         | ${'sendComment'} | ${'space'}
        ${TestUser.CHALLENGE_ADMIN}    | ${'sendComment'} | ${'challenge'}
        ${TestUser.CHALLENGE_MEMBER}   | ${'sendComment'} | ${'challenge'}
        ${TestUser.OPPORTUNITY_ADMIN}  | ${'sendComment'} | ${'opportunity'}
        ${TestUser.OPPORTUNITY_MEMBER} | ${'sendComment'} | ${'opportunity'}
      `(
        'User: "$userRole" can send message to closed "$entity" callout post',
        async ({ userRole, message, entity }) => {
          const id = getIdentifier(
            entity,
            postCommentsIdSpace,
            postCommentsIdChallenge,
            postCommentsIdOpportunity
          );

          const messageRes = await sendMessageToRoom(
            id,
            'sendComment',
            userRole
          );

          // Assert
          expect(
            JSON.stringify(messageRes.data?.sendMessageToRoom.message)
          ).toContain(message);
        }
      );

      test.each`
        userRole                   | message                                                                            | entity
        ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'space'}
        ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'opportunity'}
      `(
        'User: "$userRole" cannot send message to closed "$entity" callout post',
        async ({ userRole, message, entity }) => {
          const id = getIdentifier(
            entity,
            postCommentsIdSpace,
            postCommentsIdChallenge,
            postCommentsIdOpportunity
          );

          const messageRes = await sendMessageToRoom(
            id,
            'sendComment',
            userRole
          );

          // Assert
          expect(JSON.stringify(messageRes.error?.errors[0].message)).toContain(
            message
          );
        }
      );
    });
  });

  describe('Create Post - Callout Close State ', () => {
    describe('DDT Users create post to closed callout', () => {
      // Arrange
      test.each`
        userRole                       | message                                                                                    | entity
        ${TestUser.HUB_ADMIN}          | ${'"data":{"createContributionOnCallout"'}                                                 | ${'space'}
        ${TestUser.HUB_MEMBER}         | ${'"New contributions to a closed Callout with id'}                                        | ${'space'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'contribute' privilege: create contribution on callout"} | ${'space'}
        ${TestUser.CHALLENGE_ADMIN}    | ${'"data":{"createContributionOnCallout"'}                                                 | ${'challenge'}
        ${TestUser.CHALLENGE_MEMBER}   | ${'"New contributions to a closed Callout with id'}                                        | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'contribute' privilege: create contribution on callout"} | ${'challenge'}
        ${TestUser.OPPORTUNITY_ADMIN}  | ${'"data":{"createContributionOnCallout"'}                                                 | ${'opportunity'}
        ${TestUser.OPPORTUNITY_MEMBER} | ${'"New contributions to a closed Callout with id'}                                        | ${'opportunity'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'contribute' privilege: create contribution on callout"} | ${'opportunity'}
      `(
        'User: "$userRole" get error when create post to closed "$entity" callout',
        async ({ userRole, message, entity }) => {
          const id = getIdentifier(
            entity,
            spaceCalloutId,
            challengeCalloutId,
            opportunityCalloutId
          );

          const res = await createPostOnCallout(
            id,
            {
              displayName: 'postDisplayName',
            },
            postNameID,
            userRole
          );

          // Assert
          expect(JSON.stringify(res)).toContain(message);
        }
      );
    });
  });
});

describe('Callout - Close State - User Privileges Discussions', () => {
  let spaceCalloutId = '';
  let challengeCalloutId = '';
  let opportunityCalloutId = '';
  let spaceCalloutCommentsId = '';
  let challengeCalloutCommentsId = '';
  let opportunityCalloutCommentsId = '';

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
        contributionPolicy: {
          state: CalloutState.Closed,
        },
      });
    };

    const spaceCallout = await getDefaultSpaceCalloutByNameId(
      entitiesId.spaceId,
      entitiesId.space.discussionCalloutId
    );

    spaceCalloutId = spaceCallout?.data?.lookup?.callout?.id ?? '';
    spaceCalloutCommentsId =
      spaceCallout?.data?.lookup?.callout?.comments?.id ?? '';
    await preconditions(spaceCalloutId);

    const challengeCallout = await getDefaultChallengeCalloutByNameId(
      entitiesId.spaceId,
      entitiesId.challenge.id,
      entitiesId.challenge.discussionCalloutId
    );
    challengeCalloutId = challengeCallout?.data?.lookup?.callout?.id ?? '';
    challengeCalloutCommentsId =
      challengeCallout?.data?.lookup?.callout?.comments?.id ?? '';
    await preconditions(challengeCalloutId);

    const opportunityCallout = await getDefaultOpportunityCalloutByNameId(
      entitiesId.spaceId,
      entitiesId.opportunity.id,
      entitiesId.opportunity.discussionCalloutId
    );
    opportunityCalloutId = opportunityCallout?.id ?? '';
    opportunityCalloutCommentsId = opportunityCallout?.comments?.id ?? '';
    await preconditions(opportunityCalloutId);
  });

  afterAll(async () => {
    await deleteCallout(opportunityCalloutId);
    await deleteCallout(challengeCalloutId);
    await deleteCallout(spaceCalloutId);
  });

  describe('Discussion Callout - Close State ', () => {
    describe('DDT Users sending messages to closed discussion callout', () => {
      // Arrange
      test.each`
        userRole                       | code                  | entity
        ${TestUser.HUB_ADMIN}          | ${'CALLOUT_CLOSED'}   | ${'space'}
        ${TestUser.HUB_MEMBER}         | ${'CALLOUT_CLOSED'}   | ${'space'}
        ${TestUser.NON_HUB_MEMBER}     | ${'FORBIDDEN_POLICY'} | ${'space'}
        ${TestUser.CHALLENGE_ADMIN}    | ${'CALLOUT_CLOSED'}   | ${'challenge'}
        ${TestUser.CHALLENGE_MEMBER}   | ${'CALLOUT_CLOSED'}   | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER}     | ${'FORBIDDEN_POLICY'} | ${'challenge'}
        ${TestUser.OPPORTUNITY_ADMIN}  | ${'CALLOUT_CLOSED'}   | ${'opportunity'}
        ${TestUser.OPPORTUNITY_MEMBER} | ${'CALLOUT_CLOSED'}   | ${'opportunity'}
        ${TestUser.NON_HUB_MEMBER}     | ${'FORBIDDEN_POLICY'} | ${'opportunity'}
      `(
        'User: "$userRole" get error when send code to closed "$entity" callout',
        async ({ userRole, code, entity }) => {
          const commentsId = getIdentifier(
            entity,
            spaceCalloutCommentsId,
            challengeCalloutCommentsId,
            opportunityCalloutCommentsId
          );
          // Act
          const res = await sendMessageToRoom(
            commentsId,
            'comment on discussion callout',
            userRole
          );

          // Assert
          expect(res.error?.errors[0].code).toContain(code);
        }
      );
    });
  });
});
