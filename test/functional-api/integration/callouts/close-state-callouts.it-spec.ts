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
  getDataPerChallengeCallout,
  getDataPerHubCallout,
  getDataPerOpportunityCallout,
} from '../aspect/aspect.request.params';
import { CalloutState, CalloutType, CalloutVisibility } from './callouts-enum';
import { delay, TestUser } from '@test/utils';
import { postCommentInCallout } from '../comments/comments.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  removeComment,
  removeCommentVariablesData,
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
let msessageId = '';

const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const hubName = 'callout-eco-name' + uniqueId;
const hubNameId = 'callout-eco-nameid' + uniqueId;

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

    await updateCallout(
      calloutId,
      calloutDisplayName,
      calloutNameID,
      'calloutDescription update',
      CalloutState.CLOSED,
      CalloutType.COMMENTS
    );
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

    await updateCallout(
      calloutId,
      calloutDisplayName,
      calloutNameID,
      'calloutDescription update',
      CalloutState.CLOSED,
      CalloutType.COMMENTS
    );
    const aspectsData = await getDataPerHubCallout(entitiesId.hubId, calloutId);
    const data = aspectsData.body.data.hub.collaboration.callouts[0];

    // Assert
    expect(data.state).toEqual(CalloutState.CLOSED);
  });
});

describe('Callout - Close State - User Privileges Discussions', () => {
  let hubCalloutId = '';
  let challengeCalloutId = '';
  let opportunityCalloutId = '';
  const discussionCalloutNameId = 'suggestions';
  let hubAspectId = '';

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      await postCommentInCallout(calloutId, 'comment on discussion callout');
      const resAspectonHub = await createAspectOnCallout(
        calloutId,
        'aspectDisplayName',
        cardNameID
      );
      const aspectDataCreate = resAspectonHub.body.data.createAspectOnCallout;
      hubAspectId = aspectDataCreate.id;
      await updateCallout(
        calloutId,
        calloutDisplayName,
        discussionCalloutNameId,
        'calloutDescription update',
        CalloutState.CLOSED,
        CalloutType.COMMENTS
      );
    };

    const hubCallout = await getHubCalloutByNameId(
      entitiesId.hubId,
      discussionCalloutNameId
    );
    hubCalloutId = hubCallout[0].id;
    await preconditions(hubCalloutId);

    const challengeCallout = await getChallengeCalloutByNameId(
      entitiesId.hubId,
      entitiesId.challengeId,
      discussionCalloutNameId
    );
    challengeCalloutId = challengeCallout[0].id;
    await preconditions(challengeCalloutId);

    const opportunityCallout = await getOpportunityCalloutByNameId(
      entitiesId.hubId,
      entitiesId.opportunityId,
      discussionCalloutNameId
    );
    opportunityCalloutId = opportunityCallout[0].id;
    await preconditions(opportunityCalloutId);
  });

  afterAll(async () => {
    await deleteCallout(opportunityCalloutId);
    await deleteCallout(challengeCalloutId);
    await deleteCallout(hubCalloutId);
  });

  describe('Discussion Callout - Close State ', () => {
    describe('DDT Users sending messages to closed Hub discussion callout', () => {
      // Arrange
      test.each`
        userRole
        ${TestUser.HUB_ADMIN}
        ${TestUser.HUB_MEMBER}
        ${TestUser.NON_HUB_MEMBER}
      `(
        `User: "$userRole" get errorwhen send message to closed callout with id: ${hubCalloutId}`,
        async ({ userRole }) => {
          // Act
          const res = await postCommentInCallout(
            hubCalloutId,
            'comment on discussion callout',
            userRole
          );

          // Assert
          expect(res.text).toContain(
            `"New collaborations to a closed Callout with id: '${hubCalloutId}' are not allowed!"`
          );
        }
      );
    });

    describe('DDT Users sending messages to closed Challenge discussion callout', () => {
      // Arrange
      test.each`
        userRole
        ${TestUser.HUB_MEMBER}
        ${TestUser.QA_USER}
        ${TestUser.NON_HUB_MEMBER}
      `(
        `User: "$userRole" get errorwhen send message to closed callout with id: ${challengeCalloutId}`,
        async ({ userRole }) => {
          // Act
          const res = await postCommentInCallout(
            challengeCalloutId,
            'comment on discussion callout',
            userRole
          );

          // Assert
          expect(res.text).toContain(
            `"New collaborations to a closed Callout with id: '${challengeCalloutId}' are not allowed!"`
          );
        }
      );
    });

    describe('DDT Users sending messages to closed Opportunity discussion callout', () => {
      // Arrange
      test.each`
        userRole
        ${TestUser.HUB_MEMBER}
        ${TestUser.QA_USER}
        ${TestUser.NON_HUB_MEMBER}
      `(
        `User: "$userRole" get errorwhen send message to closed callout with id: ${opportunityCalloutId}`,
        async ({ userRole }) => {
          // Act
          const res = await postCommentInCallout(
            opportunityCalloutId,
            'comment on discussion callout',
            userRole
          );

          // Assert
          expect(res.text).toContain(
            `"New collaborations to a closed Callout with id: '${opportunityCalloutId}' are not allowed!"`
          );
        }
      );
    });
  });
});

// The suite contains scenarios for 'card create' and 'card comment'. Card Update / Delete to be added on later stage (low priority)
describe('Callout - Close State - User Privileges Cards', () => {
  let hubCalloutId = '';
  let challengeCalloutId = '';
  let opportunityCalloutId = '';
  const cardCalloutNameId = 'card-default';
  let hubAspectId = '';
  let aspectCommentsIdChallenge = '';
  cardNameID = `aspect-name-id-${uniqueId}`;

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      const resAspectonHub = await createAspectOnCallout(
        calloutId,
        'aspectDisplayName',
        cardNameID
      );
      const aspectDataCreate = resAspectonHub.body.data.createAspectOnCallout;
      const aspectId = aspectDataCreate.id;
      aspectCommentsIdChallenge = aspectDataCreate.comments.id;

      const messageRes = await mutation(
        sendComment,
        sendCommentVariablesData(
          aspectCommentsIdChallenge,
          'test message on aspect'
        ),
        TestUser.HUB_MEMBER
      );
      msessageId = messageRes.body.data.sendComment.id;
      hubAspectId = aspectDataCreate.id;
      await updateCallout(
        calloutId,
        calloutDisplayName,
        cardCalloutNameId,
        'calloutDescription update',
        CalloutState.CLOSED,
        CalloutType.COMMENTS
      );
    };

    const hubCallout = await getHubCalloutByNameId(
      entitiesId.hubId,
      cardCalloutNameId
    );
    hubCalloutId = hubCallout[0].id;
    await preconditions(hubCalloutId);

    const challengeCallout = await getChallengeCalloutByNameId(
      entitiesId.hubId,
      entitiesId.challengeId,
      cardCalloutNameId
    );
    challengeCalloutId = challengeCallout[0].id;
    await preconditions(challengeCalloutId);

    const opportunityCallout = await getOpportunityCalloutByNameId(
      entitiesId.hubId,
      entitiesId.opportunityId,
      cardCalloutNameId
    );
    opportunityCalloutId = opportunityCallout[0].id;
    await preconditions(opportunityCalloutId);
  });

  afterAll(async () => {
    await deleteCallout(opportunityCalloutId);
    await deleteCallout(challengeCalloutId);
    await deleteCallout(hubCalloutId);
  });

  afterEach(async () => {
    await delay(3000);
    await mutation(
      removeComment,
      removeCommentVariablesData(aspectCommentsIdChallenge, msessageId),
      TestUser.GLOBAL_ADMIN
    );
  });
  describe('Send Comment to Card - Callout Close State ', () => {
    describe('DDT Users sending messages to closed Hub callout card', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_ADMIN}      | ${'sendComment'}
        ${TestUser.HUB_MEMBER}     | ${'sendComment'}
        ${TestUser.NON_HUB_MEMBER} | ${'"Authorization: unable to grant \'create-comment\' privilege: comments send message:'}
      `(
        'User: "$userRole" can send message to closed Hub callout card',
        async ({ userRole, message }) => {
          const aspectsData = await getDataPerHubCallout(
            entitiesId.hubId,
            entitiesId.hubCalloutId
          );
          const aspectCommentsId =
            aspectsData.body.data.hub.collaboration.callouts[0].aspects[0]
              .comments.id;
          const messageRes = await mutation(
            sendComment,
            sendCommentVariablesData(
              aspectCommentsId,
              'test message on aspect'
            ),
            userRole
          );

          // Assert
          expect(messageRes.text).toContain(message);
        }
      );
    });

    describe('DDT Users sending messages to closed Challenge callout card', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${'sendComment'}
        ${TestUser.QA_USER}        | ${'sendComment'}
        ${TestUser.NON_HUB_MEMBER} | ${'"Authorization: unable to grant \'create-comment\' privilege: comments send message:'}
      `(
        'User: "$userRole" can send message to closed Challenge callout card',
        async ({ userRole, message }) => {
          const aspectsData = await getDataPerChallengeCallout(
            entitiesId.hubId,
            entitiesId.challengeId,
            entitiesId.challengeCalloutId
          );
          const aspectCommentsId =
            aspectsData.body.data.hub.challenge.collaboration.callouts[0]
              .aspects[0].comments.id;
          const messageRes = await mutation(
            sendComment,
            sendCommentVariablesData(
              aspectCommentsId,
              'test message on aspect'
            ),
            userRole
          );

          // Assert
          expect(messageRes.text).toContain(message);
        }
      );
    });

    describe('DDT Users sending messages to closed Opportunity callout card', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${'sendComment'}
        ${TestUser.QA_USER}        | ${'sendComment'}
        ${TestUser.NON_HUB_MEMBER} | ${'"Authorization: unable to grant \'create-comment\' privilege: comments send message:'}
      `(
        'User: "$userRole" can send message to closed Opportunity callout card',
        async ({ userRole, message }) => {
          const aspectsData = await getDataPerOpportunityCallout(
            entitiesId.hubId,
            entitiesId.opportunityId,
            entitiesId.opportunityCalloutId
          );
          const aspectCommentsId =
            aspectsData.body.data.hub.opportunity.collaboration.callouts[0]
              .aspects[0].comments.id;
          const messageRes = await mutation(
            sendComment,
            sendCommentVariablesData(
              aspectCommentsId,
              'test message on aspect'
            ),
            userRole
          );

          // Assert
          expect(messageRes.text).toContain(message);
        }
      );
    });
  });
  describe('Create Card - Callout Close State ', () => {
    describe('DDT Users create card to closed Hub callout', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_ADMIN}      | ${'"New collaborations to a closed Callout with id:'}
        ${TestUser.HUB_MEMBER}     | ${'"New collaborations to a closed Callout with id'}
        ${TestUser.NON_HUB_MEMBER} | ${'Authorization: unable to grant \'create-aspect\' privilege: create aspect on callout'}
      `(
        'User: "$userRole" get error when create card to closed callout on hub',
        async ({ userRole, message }) => {
          const res = await createAspectOnCallout(
            entitiesId.hubCalloutId,
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

    describe('DDT Users create card to closed Challenge callout', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${'"New collaborations to a closed Callout with id:'}
        ${TestUser.QA_USER}        | ${'"New collaborations to a closed Callout with id'}
        ${TestUser.NON_HUB_MEMBER} | ${'Authorization: unable to grant \'create-aspect\' privilege: create aspect on callout'}
      `(
        'User: "$userRole" get error when create card to closed callout on challenge',
        async ({ userRole, message }) => {
          const res = await createAspectOnCallout(
            entitiesId.challengeCalloutId,
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

    describe('DDT Users create card to closed Opportunity callout', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${'"New collaborations to a closed Callout with id:'}
        ${TestUser.QA_USER}        | ${'"New collaborations to a closed Callout with id'}
        ${TestUser.NON_HUB_MEMBER} | ${'Authorization: unable to grant \'create-aspect\' privilege: create aspect on callout'}
      `(
        'User: "$userRole" get error when create card to closed callout on opportunity',
        async ({ userRole, message }) => {
          const res = await createAspectOnCallout(
            entitiesId.opportunityCalloutId,
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
  const hubAspectId = '';

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      await updateCallout(
        calloutId,
        calloutDisplayName,
        canvasCalloutNameId,
        'calloutDescription update',
        CalloutState.CLOSED,
        CalloutType.COMMENTS
      );
    };

    await updateCallout(
      calloutId,
      calloutDisplayName,
      canvasCalloutNameId,
      'calloutDescription update',
      CalloutState.CLOSED,
      CalloutType.CANVAS
    );

    const hubCallout = await getHubCalloutByNameId(
      entitiesId.hubId,
      canvasCalloutNameId
    );
    hubCalloutId = hubCallout[0].id;
    await preconditions(hubCalloutId);

    const challengeCallout = await getChallengeCalloutByNameId(
      entitiesId.hubId,
      entitiesId.challengeId,
      canvasCalloutNameId
    );
    challengeCalloutId = challengeCallout[0].id;
    await preconditions(challengeCalloutId);

    const opportunityCallout = await getOpportunityCalloutByNameId(
      entitiesId.hubId,
      entitiesId.opportunityId,
      canvasCalloutNameId
    );
    opportunityCalloutId = opportunityCallout[0].id;
    await preconditions(opportunityCalloutId);
  });

  afterAll(async () => {
    await deleteCallout(opportunityCalloutId);
    await deleteCallout(challengeCalloutId);
    await deleteCallout(hubCalloutId);
  });

  describe('Canvas Callout - Close State ', () => {
    describe('DDT Users canvas to closed Hub canvas callout', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_ADMIN}      | ${'"New collaborations to a closed Callout with id:'}
        ${TestUser.HUB_MEMBER}     | ${'"New collaborations to a closed Callout with id'}
        ${TestUser.NON_HUB_MEMBER} | ${'Authorization: unable to grant \'create-canvas\' privilege: create canvas on callout'}
      `(
        `User: "$userRole" get error when create canvas to closed callout with id: ${hubCalloutId}`,
        async ({ userRole, message }) => {
          // Act
          const res = await createCanvasOnCallout(
            hubCalloutId,
            'CanvasName',
            userRole
          );

          // Assert
          expect(res.text).toContain(message);
        }
      );
    });

    describe('DDT Users canvas to closed Challenge canvas callout', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${'"New collaborations to a closed Callout with id:'}
        ${TestUser.QA_USER}        | ${'"New collaborations to a closed Callout with id'}
        ${TestUser.NON_HUB_MEMBER} | ${'"New collaborations to a closed Callout with id'}
      `(
        `User: "$userRole" get error when create canvas to closed callout with id: ${challengeCalloutId}`,
        async ({ userRole, message }) => {
          // Act
          const res = await postCommentInCallout(
            challengeCalloutId,
            'comment on discussion callout',
            userRole
          );

          // Assert
          expect(res.text).toContain(message);
        }
      );
    });

    describe('DDT Users canvas to closed Opportunity canvas callout', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${'"New collaborations to a closed Callout with id:'}
        ${TestUser.QA_USER}        | ${'"New collaborations to a closed Callout with id'}
        ${TestUser.NON_HUB_MEMBER} | ${'"New collaborations to a closed Callout with id'}
      `(
        `User: "$userRole" get error when create canvas to closed callout with id: ${opportunityCalloutId}`,
        async ({ userRole, message }) => {
          // Act
          const res = await postCommentInCallout(
            opportunityCalloutId,
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
