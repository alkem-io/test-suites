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
  AspectTypes,
  createAspectOnCallout,
  getDataPerHubCallout,
} from '../aspect/aspect.request.params';
import { CalloutState, CalloutVisibility } from './callouts-enum';
import { TestUser } from '@test/utils';
import { postCommentInCallout } from '../comments/comments.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  sendComment,
  sendCommentVariablesData,
} from '@test/utils/mutations/communications-mutation';
import { createCanvasOnCallout } from '../canvas/canvas.request.params';

let opportunityName = 'aspect-opp';
let challengeName = 'aspect-chal';
let calloutId = '';
let cardNameID = '';

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
  cardNameID = `aspect-name-id-${uniqueId}`;
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
    const aspectsData = await getDataPerHubCallout(entitiesId.hubId, calloutId);
    const data = aspectsData.body.data.hub.collaboration.callouts[0];

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
    const aspectsData = await getDataPerHubCallout(entitiesId.hubId, calloutId);
    const data = aspectsData.body.data.hub.collaboration.callouts[0];

    // Assert
    expect(data.state).toEqual(CalloutState.CLOSED);
  });
});

// The suite contains scenarios for 'card create' and 'card comment'. Card Update / Delete to be added on later stage (low priority)
describe('Callout - Close State - User Privileges Cards', () => {
  let hubCalloutId = '';
  let challengeCalloutId = '';
  let opportunityCalloutId = '';
  let aspectCommentsIdHub = '';
  let aspectCommentsIdChallenge = '';
  let aspectCommentsIdOpportunity = '';
  cardNameID = `aspect-name-id-${uniqueId}`;

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      const resAspectonHub = await createAspectOnCallout(
        calloutId,
        cardNameID,
        { profileData: { displayName: 'aspectDisplayName' } }
      );
      const aspectDataCreate = resAspectonHub.body.data.createAspectOnCallout;
      const aspectCommentsId = aspectDataCreate.comments.id;

      await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
        state: CalloutState.CLOSED,
      });
      return aspectCommentsId;
    };

    const hubCallout = await getHubCalloutByNameId(
      entitiesId.hubId,
      entitiesId.hubCalloutId
    );
    hubCalloutId = hubCallout.body.data.hub.collaboration.callouts[0].id;
    aspectCommentsIdHub = await preconditions(hubCalloutId);

    const challengeCallout = await getChallengeCalloutByNameId(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeCalloutId
    );
    challengeCalloutId =
      challengeCallout.body.data.hub.challenge.collaboration.callouts[0].id;
    aspectCommentsIdChallenge = await preconditions(challengeCalloutId);

    const opportunityCallout = await getOpportunityCalloutByNameId(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityCalloutId
    );
    opportunityCalloutId =
      opportunityCallout.body.data.hub.opportunity.collaboration.callouts[0].id;
    aspectCommentsIdOpportunity = await preconditions(opportunityCalloutId);
  });

  afterAll(async () => {
    await deleteCallout(opportunityCalloutId);
    await deleteCallout(challengeCalloutId);
    await deleteCallout(hubCalloutId);
  });

  describe('Send Comment to Card - Callout Close State ', () => {
    describe('DDT Users sending messages to closed callout card', () => {
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
        'User: "$userRole" can send message to closed "$entity" callout card',
        async ({ userRole, message, entity }) => {
          const id = getIdentifier(
            entity,
            aspectCommentsIdHub,
            aspectCommentsIdChallenge,
            aspectCommentsIdOpportunity
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

  describe('Create Card - Callout Close State ', () => {
    describe('DDT Users create card to closed callout', () => {
      // Arrange
      test.each`
        userRole                       | message                                                                                 | entity
        ${TestUser.HUB_ADMIN}          | ${'"New collaborations to a closed Callout with id:'}                                   | ${'hub'}
        ${TestUser.HUB_MEMBER}         | ${'"New collaborations to a closed Callout with id'}                                    | ${'hub'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-aspect' privilege: create aspect on callout"} | ${'hub'}
        ${TestUser.CHALLENGE_ADMIN}    | ${'"New collaborations to a closed Callout with id:'}                                   | ${'challenge'}
        ${TestUser.CHALLENGE_MEMBER}   | ${'"New collaborations to a closed Callout with id'}                                    | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-aspect' privilege: create aspect on callout"} | ${'challenge'}
        ${TestUser.OPPORTUNITY_ADMIN}  | ${'"New collaborations to a closed Callout with id:'}                                   | ${'opportunity'}
        ${TestUser.OPPORTUNITY_MEMBER} | ${'"New collaborations to a closed Callout with id'}                                    | ${'opportunity'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-aspect' privilege: create aspect on callout"} | ${'opportunity'}
      `(
        'User: "$userRole" get error when create card to closed "$entity" callout',
        async ({ userRole, message, entity }) => {
          const id = getIdentifier(
            entity,
            hubCalloutId,
            challengeCalloutId,
            opportunityCalloutId
          );

          const res = await createAspectOnCallout(
            id,
            'aspectname-id',
            { profileData: { displayName: 'aspectDisplayName' } },
            AspectTypes.KNOWLEDGE,
            userRole
          );

          // Assert
          expect(res.text).toContain(message);
        }
      );
    });
  });
});

// The suite contains scenarios for canvas creation. Canvas Update / Delete to be added on later stage (low priority)
describe('Callout - Close State - User Privileges Canvases', () => {
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
      entitiesId.hubCanvasCalloutId
    );
    hubCalloutId = hubCallout.body.data.hub.collaboration.callouts[0].id;
    await preconditions(hubCalloutId);

    const challengeCallout = await getChallengeCalloutByNameId(
      entitiesId.hubId,
      entitiesId.challengeId,
      entitiesId.challengeCanvasCalloutId
    );
    challengeCalloutId =
      challengeCallout.body.data.hub.challenge.collaboration.callouts[0].id;
    await preconditions(challengeCalloutId);

    const opportunityCallout = await getOpportunityCalloutByNameId(
      entitiesId.hubId,
      entitiesId.opportunityId,
      entitiesId.opportunityCanvasCalloutId
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

  describe('Canvas Callout - Close State ', () => {
    describe('DDT Users create canvas to closed callout', () => {
      // Arrange
      test.each`
        userRole                       | message                                                                                 | entity
        ${TestUser.HUB_ADMIN}          | ${'"New collaborations to a closed Callout with id:'}                                   | ${'hub'}
        ${TestUser.HUB_MEMBER}         | ${'"New collaborations to a closed Callout with id'}                                    | ${'hub'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-canvas' privilege: create canvas on callout"} | ${'hub'}
        ${TestUser.CHALLENGE_ADMIN}    | ${'"New collaborations to a closed Callout with id:'}                                   | ${'challenge'}
        ${TestUser.CHALLENGE_MEMBER}   | ${'"New collaborations to a closed Callout with id'}                                    | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-canvas' privilege: create canvas on callout"} | ${'challenge'}
        ${TestUser.OPPORTUNITY_ADMIN}  | ${'"New collaborations to a closed Callout with id:'}                                   | ${'opportunity'}
        ${TestUser.OPPORTUNITY_MEMBER} | ${'"New collaborations to a closed Callout with id'}                                    | ${'opportunity'}
        ${TestUser.NON_HUB_MEMBER}     | ${"Authorization: unable to grant 'create-canvas' privilege: create canvas on callout"} | ${'opportunity'}
      `(
        'User: "$userRole" get error when create canvas to closed "$entity" callout',
        async ({ userRole, message, entity }) => {
          const id = getIdentifier(
            entity,
            hubCalloutId,
            challengeCalloutId,
            opportunityCalloutId
          );

          const res = await createCanvasOnCallout(id, 'CanvasName', userRole);
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
