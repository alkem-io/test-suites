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
import { CalloutState, CalloutType, CalloutVisibility } from './callouts-enum';
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
let calloutNameID = '';
let calloutDisplayName = '';
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
  calloutNameID = `callout-name-id-${uniqueId}`;
  calloutDisplayName = `callout-d-name-${uniqueId}`;
  cardNameID = `aspect-name-id-${uniqueId}`;
});

describe('Callouts - Close State', () => {
  afterEach(async () => {
    await deleteCallout(calloutId);
  });
  test('Close callout that has not been published', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName,
      calloutNameID
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
      entitiesId.hubCollaborationId,
      calloutDisplayName,
      calloutNameID
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
  const cardCalloutNameId = 'card-default';
  cardNameID = `aspect-name-id-${uniqueId}`;

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      const resAspectonHub = await createAspectOnCallout(
        calloutId,
        'aspectDisplayName',
        cardNameID
      );
      const aspectDataCreate = resAspectonHub.body.data.createAspectOnCallout;
      const aspectCommentsId = aspectDataCreate.comments.id;

      await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
        state: CalloutState.CLOSED,
        type: CalloutType.CARD,
      });
      return aspectCommentsId;
    };

    const hubCallout = await getHubCalloutByNameId(
      entitiesId.hubId,
      cardCalloutNameId
    );
    hubCalloutId = hubCallout.body.data.hub.collaboration.callouts[0].id;
    aspectCommentsIdHub = await preconditions(hubCalloutId);

    const challengeCallout = await getChallengeCalloutByNameId(
      entitiesId.hubId,
      entitiesId.challengeId,
      cardCalloutNameId
    );
    challengeCalloutId =
      challengeCallout.body.data.hub.challenge.collaboration.callouts[0].id;
    aspectCommentsIdChallenge = await preconditions(challengeCalloutId);

    const opportunityCallout = await getOpportunityCalloutByNameId(
      entitiesId.hubId,
      entitiesId.opportunityId,
      cardCalloutNameId
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
        userRole                   | message                                                                                  | entity
        ${TestUser.HUB_ADMIN}      | ${'sendComment'}                                                                         | ${'hub'}
        ${TestUser.HUB_MEMBER}     | ${'sendComment'}                                                                         | ${'hub'}
        ${TestUser.NON_HUB_MEMBER} | ${"\"Authorization: unable to grant 'create-comment' privilege: comments send message:"} | ${'hub'}
        ${TestUser.HUB_MEMBER}     | ${'sendComment'}                                                                         | ${'challenge'}
        ${TestUser.QA_USER}        | ${'sendComment'}                                                                         | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER} | ${"\"Authorization: unable to grant 'create-comment' privilege: comments send message:"} | ${'challenge'}
        ${TestUser.HUB_MEMBER}     | ${'sendComment'}                                                                         | ${'opportunity'}
        ${TestUser.QA_USER}        | ${'sendComment'}                                                                         | ${'opportunity'}
        ${TestUser.NON_HUB_MEMBER} | ${"\"Authorization: unable to grant 'create-comment' privilege: comments send message:"} | ${'opportunity'}
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
            sendCommentVariablesData(id, 'test message on aspect'),
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
        userRole                   | message                                                                                 | entity
        ${TestUser.HUB_ADMIN}      | ${'"New collaborations to a closed Callout with id:'}                                   | ${'hub'}
        ${TestUser.HUB_MEMBER}     | ${'"New collaborations to a closed Callout with id'}                                    | ${'hub'}
        ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'create-aspect' privilege: create aspect on callout"} | ${'hub'}
        ${TestUser.HUB_ADMIN}      | ${'"New collaborations to a closed Callout with id:'}                                   | ${'challenge'}
        ${TestUser.HUB_MEMBER}     | ${'"New collaborations to a closed Callout with id'}                                    | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'create-aspect' privilege: create aspect on callout"} | ${'challenge'}
        ${TestUser.HUB_ADMIN}      | ${'"New collaborations to a closed Callout with id:'}                                   | ${'opportunity'}
        ${TestUser.HUB_MEMBER}     | ${'"New collaborations to a closed Callout with id'}                                    | ${'opportunity'}
        ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'create-aspect' privilege: create aspect on callout"} | ${'opportunity'}
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
            'aspectDisplayName',
            'aspectname-id',
            'aspectDescription',
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
  const canvasCalloutNameId = 'canvas-default';

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
        state: CalloutState.CLOSED,
      });
    };

    const hubCallout = await getHubCalloutByNameId(
      entitiesId.hubId,
      canvasCalloutNameId
    );
    hubCalloutId = hubCallout.body.data.hub.collaboration.callouts[0].id;
    await preconditions(hubCalloutId);

    const challengeCallout = await getChallengeCalloutByNameId(
      entitiesId.hubId,
      entitiesId.challengeId,
      canvasCalloutNameId
    );
    challengeCalloutId =
      challengeCallout.body.data.hub.challenge.collaboration.callouts[0].id;
    await preconditions(challengeCalloutId);

    const opportunityCallout = await getOpportunityCalloutByNameId(
      entitiesId.hubId,
      entitiesId.opportunityId,
      canvasCalloutNameId
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
        userRole                   | message                                                                                 | entity
        ${TestUser.HUB_ADMIN}      | ${'"New collaborations to a closed Callout with id:'}                                   | ${'hub'}
        ${TestUser.HUB_MEMBER}     | ${'"New collaborations to a closed Callout with id'}                                    | ${'hub'}
        ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'create-canvas' privilege: create canvas on callout"} | ${'hub'}
        ${TestUser.HUB_MEMBER}     | ${'"New collaborations to a closed Callout with id:'}                                   | ${'challenge'}
        ${TestUser.QA_USER}        | ${'"New collaborations to a closed Callout with id'}                                    | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'create-canvas' privilege: create canvas on callout"} | ${'challenge'}
        ${TestUser.HUB_MEMBER}     | ${'"New collaborations to a closed Callout with id:'}                                   | ${'opportunity'}
        ${TestUser.QA_USER}        | ${'"New collaborations to a closed Callout with id'}                                    | ${'opportunity'}
        ${TestUser.NON_HUB_MEMBER} | ${"Authorization: unable to grant 'create-canvas' privilege: create canvas on callout"} | ${'opportunity'}
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
  const discussionCalloutNameId = 'suggestions';

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
        state: CalloutState.CLOSED,
        type: CalloutType.COMMENTS,
      });
    };

    const hubCallout = await getHubCalloutByNameId(
      entitiesId.hubId,
      discussionCalloutNameId
    );
    hubCalloutId = hubCallout.body.data.hub.collaboration.callouts[0].id;
    await preconditions(hubCalloutId);

    const challengeCallout = await getChallengeCalloutByNameId(
      entitiesId.hubId,
      entitiesId.challengeId,
      discussionCalloutNameId
    );
    challengeCalloutId =
      challengeCallout.body.data.hub.challenge.collaboration.callouts[0].id;
    await preconditions(challengeCalloutId);

    const opportunityCallout = await getOpportunityCalloutByNameId(
      entitiesId.hubId,
      entitiesId.opportunityId,
      discussionCalloutNameId
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

  describe('Discussion Callout - Close State ', () => {
    describe('DDT Users sending messages to closed discussion callout', () => {
      // Arrange
      test.each`
        userRole                   | entity
        ${TestUser.HUB_ADMIN}      | ${'hub'}
        ${TestUser.HUB_MEMBER}     | ${'hub'}
        ${TestUser.NON_HUB_MEMBER} | ${'hub'}
        ${TestUser.HUB_MEMBER}     | ${'challenge'}
        ${TestUser.QA_USER}        | ${'challenge'}
        ${TestUser.NON_HUB_MEMBER} | ${'challenge'}
        ${TestUser.HUB_MEMBER}     | ${'opportunity'}
        ${TestUser.QA_USER}        | ${'opportunity'}
        ${TestUser.NON_HUB_MEMBER} | ${'opportunity'}
      `(
        'User: "$userRole" get error when send message to closed "$entity" callout',
        async ({ userRole, entity }) => {
          const id = getIdentifier(
            entity,
            hubCalloutId,
            challengeCalloutId,
            opportunityCalloutId
          );
          // Act
          const res = await postCommentInCallout(
            id,
            'comment on discussion callout',
            userRole
          );

          // Assert
          expect(res.text).toContain(
            `"New collaborations to a closed Callout with id: '${id}' are not allowed!"`
          );
        }
      );
    });
  });
});
