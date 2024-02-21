/* eslint-disable quotes */
import '@test/utils/array.matcher';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteOpportunityCodegen } from '@test/functional-api/journey/opportunity/opportunity.request.params';
import { deleteOrganizationCodegen } from '../../organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  deleteCalloutCodegen,
  createCalloutOnCollaborationCodegen,
  updateCalloutCodegen,
  updateCalloutVisibilityCodegen,
} from '../callouts.request.params';
import {
  PostTypes,
  createPostOnCalloutCodegen,
  getDataPerSpaceCalloutCodegen,
} from '../post/post.request.params';
import { TestUser } from '@test/utils';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
  getDefaultChallengeCalloutByNameIdCodegen,
  getDefaultOpportunityCalloutByNameIdCodegen,
  getDefaultSpaceCalloutByNameIdCodegen,
} from '@test/utils/data-setup/entities';
import {
  CalloutState,
  CalloutVisibility,
} from '@test/generated/alkemio-schema';
import { deleteSpaceCodegen } from '../../journey/space/space.request.params';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';

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
  await deleteOpportunityCodegen(entitiesId.opportunityId);
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  postNameID = `post-name-id-${uniqueId}`;
});

describe('Callouts - Close State', () => {
  afterEach(async () => {
    await deleteCalloutCodegen(calloutId);
  });
  test('Close callout that has not been published', async () => {
    // Act
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.spaceCollaborationId
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutCodegen(calloutId, TestUser.GLOBAL_ADMIN, {
      contributionPolicy: {
        state: CalloutState.Closed,
      },
    });
    const postsData = await getDataPerSpaceCalloutCodegen(
      entitiesId.spaceId,
      calloutId
    );
    const data = postsData.data?.space.collaboration?.callouts?.[0];

    // Assert
    expect(data?.contributionPolicy.state).toEqual(CalloutState.Closed);
  });

  test('Close callout that has been published', async () => {
    // Act
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.spaceCollaborationId
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published
    );

    await updateCalloutCodegen(calloutId, TestUser.GLOBAL_ADMIN, {
      contributionPolicy: {
        state: CalloutState.Closed,
      },
    });
    const postsData = await getDataPerSpaceCalloutCodegen(
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
      const resPostonSpace = await createPostOnCalloutCodegen(calloutId, {
        displayName: 'postDisplayName',
      });
      const postDataCreate =
        resPostonSpace.data?.createContributionOnCallout.post;
      const postCommentsId = postDataCreate?.comments.id ?? '';

      await updateCalloutCodegen(calloutId, TestUser.GLOBAL_ADMIN, {
        contributionPolicy: {
          state: CalloutState.Closed,
        },
      });
      return postCommentsId;
    };

    const spaceCallout = await getDefaultSpaceCalloutByNameIdCodegen(
      entitiesId.spaceId,
      entitiesId.spaceCalloutId
    );
    spaceCalloutId = spaceCallout[0].id;
    postCommentsIdSpace = await preconditions(spaceCalloutId);

    const challengeCallout = await getDefaultChallengeCalloutByNameIdCodegen(
      entitiesId.spaceId,
      entitiesId.challengeId,
      entitiesId.challengeCalloutId
    );
    challengeCalloutId = challengeCallout[0].id;
    postCommentsIdChallenge = await preconditions(challengeCalloutId);

    const opportunityCallout = await getDefaultOpportunityCalloutByNameIdCodegen(
      entitiesId.spaceId,
      entitiesId.opportunityId,
      entitiesId.opportunityCalloutId
    );
    opportunityCalloutId = opportunityCallout[0].id;
    postCommentsIdOpportunity = await preconditions(opportunityCalloutId);
  });

  afterAll(async () => {
    await deleteCalloutCodegen(opportunityCalloutId);
    await deleteCalloutCodegen(challengeCalloutId);
    await deleteCalloutCodegen(spaceCalloutId);
  });

  describe('Send Comment to Post - Callout Close State ', () => {
    describe('DDT Users sending messages to closed callout post', () => {
      // Arrange
      test.each`
        userRole                       | message                                                                            | entity
        ${TestUser.HUB_ADMIN}          | ${'sendComment'}                                                                   | ${'space'}
        ${TestUser.HUB_MEMBER}         | ${'sendComment'}                                                                   | ${'space'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'space'}
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
            postCommentsIdSpace,
            postCommentsIdChallenge,
            postCommentsIdOpportunity
          );

          const messageRes = await sendMessageToRoomCodegen(
            id,
            'sendComment',
            userRole
          );

          // Assert
          expect(JSON.stringify(messageRes)).toContain(message);
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

          const res = await createPostOnCalloutCodegen(
            id,
            {
              displayName: 'postDisplayName',
            },
            postNameID,
            PostTypes.KNOWLEDGE,
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
      await updateCalloutCodegen(calloutId, TestUser.GLOBAL_ADMIN, {
        contributionPolicy: {
          state: CalloutState.Closed,
        },
      });
    };

    const spaceCallout = await getDefaultSpaceCalloutByNameIdCodegen(
      entitiesId.spaceId,
      entitiesId.spaceDiscussionCalloutId
    );

    spaceCalloutId = spaceCallout[0].id;
    spaceCalloutCommentsId = spaceCallout[0].comments?.id ?? '';
    await preconditions(spaceCalloutId);

    const challengeCallout = await getDefaultChallengeCalloutByNameIdCodegen(
      entitiesId.spaceId,
      entitiesId.challengeId,
      entitiesId.challengeDiscussionCalloutId
    );
    challengeCalloutId = challengeCallout[0].id;
    challengeCalloutCommentsId = challengeCallout[0].comments?.id ?? '';
    await preconditions(challengeCalloutId);

    const opportunityCallout = await getDefaultOpportunityCalloutByNameIdCodegen(
      entitiesId.spaceId,
      entitiesId.opportunityId,
      entitiesId.opportunityDiscussionCalloutId
    );
    opportunityCalloutId = opportunityCallout[0].id;
    opportunityCalloutCommentsId = opportunityCallout[0].comments?.id ?? '';
    await preconditions(opportunityCalloutId);
  });

  afterAll(async () => {
    await deleteCalloutCodegen(opportunityCalloutId);
    await deleteCalloutCodegen(challengeCalloutId);
    await deleteCalloutCodegen(spaceCalloutId);
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
          const res = await sendMessageToRoomCodegen(
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
