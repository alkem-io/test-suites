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
  getHubCalloutByNameId,
  getHubCallouts,
  updateCallout,
  updateCalloutVisibility,
} from './callouts.request.params';
import { getDataPerHubCallout } from '../aspect/aspect.request.params';
import { CalloutState, CalloutType, CalloutVisibility } from './callouts-enum';
import { TestUser } from '@test/utils';

let opportunityName = 'aspect-opp';
let challengeName = 'aspect-chal';
let calloutNameID = '';
let calloutDisplayName = '';
let calloutId = '';

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

  calloutDisplayName = `callout-d-name-${uniqueId}`;
  calloutNameID = calloutDisplayName;
});

describe('Callouts - CRUD', () => {
  afterEach(async () => {
    await deleteCallout(calloutId);
  });
  test('should create callout on hub coollaboration', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName
    );

    const calloutDataCreate = res.body.data.createCalloutOnCollaboration;
    calloutId = calloutDataCreate.id;

    const aspectsData = await getDataPerHubCallout(entitiesId.hubId, calloutId);
    const data = aspectsData.body.data.hub.collaboration.callouts[0];

    // Assert
    expect(data).toEqual(calloutDataCreate);
  });

  test('should update callout on hub coollaboration', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    const resUpdate = await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
      displayName: calloutDisplayName + 'update',
      description: 'calloutDescription update',
      state: CalloutState.ARCHIVED,
    });

    const calloutReq = await getHubCalloutByNameId(entitiesId.hubId, calloutId);
    const calloutData = calloutReq.body.data.hub.collaboration.callouts[0];

    // Assert
    expect(calloutData).toEqual(resUpdate.body.data.updateCallout);
  });

  test('should update callout visibility to Published', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(calloutId, CalloutVisibility.PUBLISHED);

    const calloutReq = await getHubCalloutByNameId(entitiesId.hubId, calloutId);
    const calloutData = calloutReq.body.data.hub.collaboration.callouts[0];
    // Assert
    expect(calloutData.visibility).toEqual(CalloutVisibility.PUBLISHED);
  });

  test('should delete callout on hub coollaboration', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.hubCollaborationId,
      calloutDisplayName
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    // Act
    await deleteCallout(calloutId);
    const resCalloutData = await getHubCallouts(entitiesId.hubId);
    const calloutData = resCalloutData.body.data.hub.collaboration.callouts;

    // Assert
    expect(calloutData).toHaveLength(4);
    expect(calloutData).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          visibility: 'DRAFT',
        }),
      ])
    );
  });
});

describe('Callouts - AUTH Hub', () => {
  describe('DDT user privileges to create callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    // Arrange
    test.each`
      userRole                 | message
      ${TestUser.GLOBAL_ADMIN} | ${'"data":{"createCalloutOnCollaboration"'}
      ${TestUser.HUB_ADMIN}    | ${'"data":{"createCalloutOnCollaboration"'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCollaboration(
          entitiesId.hubCollaborationId,
          calloutDisplayName,
          'description',
          CalloutState.OPEN,
          CalloutType.CARD,
          userRole
        );
        calloutId = res.body.data.createCalloutOnCollaboration.id;

        // Assert
        expect(res.text).toContain(message);
      }
    );
  });

  describe('DDT user NO privileges to create callout', () => {
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.HUB_MEMBER}     | ${'errors'}
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCollaboration(
          entitiesId.hubCollaborationId,
          calloutDisplayName,
          'description',
          CalloutState.OPEN,
          CalloutType.CARD,
          userRole
        );

        // Assert
        expect(res.text).toContain(message);
      }
    );
  });

  describe('DDT user privileges to update callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"updateCallout"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"updateCallout"'}
      ${TestUser.HUB_MEMBER}     | ${'errors'}
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to update callout',
      async ({ userRole, message }) => {
        const res = await createCalloutOnCollaboration(
          entitiesId.hubCollaborationId,
          calloutDisplayName,
          calloutNameID
        );
        calloutId = res.body.data.createCalloutOnCollaboration.id;

        // Act
        const resUpdate = await updateCallout(calloutId, userRole, {
          displayName: calloutDisplayName + 'update',
          description: 'calloutDescription update',
          state: CalloutState.ARCHIVED,
        });

        // Assert
        expect(resUpdate.text).toContain(message);
      }
    );
  });

  describe('DDT user privileges to delete callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"deleteCallout"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"deleteCallout"'}
      ${TestUser.HUB_MEMBER}     | ${'errors'}
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to delete callout',
      async ({ userRole, message }) => {
        const res = await createCalloutOnCollaboration(
          entitiesId.hubCollaborationId,
          calloutDisplayName,
          calloutNameID
        );
        calloutId = res.body.data.createCalloutOnCollaboration.id;

        // Act
        const resDelete = await deleteCallout(calloutId, userRole);

        // Assert
        expect(resDelete.text).toContain(message);
      }
    );
  });
});

describe('Callouts - AUTH Challenge', () => {
  describe('DDT user privileges to create callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    // Arrange
    test.each`
      userRole                    | message
      ${TestUser.HUB_ADMIN}       | ${'"data":{"createCalloutOnCollaboration"'}
      ${TestUser.CHALLENGE_ADMIN} | ${'"data":{"createCalloutOnCollaboration"'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCollaboration(
          entitiesId.challengeCollaborationId,
          calloutDisplayName,
          'description',
          CalloutState.OPEN,
          CalloutType.CARD,
          userRole
        );
        calloutId = res.body.data.createCalloutOnCollaboration.id;

        // Assert
        expect(res.text).toContain(message);
      }
    );
  });

  describe('DDT user NO privileges to create callout', () => {
    // Arrange
    test.each`
      userRole                     | message
      ${TestUser.CHALLENGE_MEMBER} | ${'errors'}
      ${TestUser.NON_HUB_MEMBER}   | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCollaboration(
          entitiesId.challengeCollaborationId,
          calloutDisplayName,
          'description',
          CalloutState.OPEN,
          CalloutType.CARD,
          userRole
        );

        // Assert
        expect(res.text).toContain(message);
      }
    );
  });

  describe('DDT user privileges to update callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test.each`
      userRole                     | message
      ${TestUser.HUB_ADMIN}        | ${'"data":{"updateCallout"'}
      ${TestUser.CHALLENGE_ADMIN}  | ${'"data":{"updateCallout"'}
      ${TestUser.CHALLENGE_MEMBER} | ${'errors'}
      ${TestUser.NON_HUB_MEMBER}   | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to update callout',
      async ({ userRole, message }) => {
        const res = await createCalloutOnCollaboration(
          entitiesId.challengeCollaborationId,
          calloutDisplayName,
          calloutNameID
        );
        calloutId = res.body.data.createCalloutOnCollaboration.id;

        // Act
        const resUpdate = await updateCallout(calloutId, userRole, {
          displayName: calloutDisplayName + 'update',
          description: 'calloutDescription update',
          state: CalloutState.ARCHIVED,
        });

        // Assert
        expect(resUpdate.text).toContain(message);
      }
    );
  });

  describe('DDT user privileges to delete callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test.each`
      userRole                     | message
      ${TestUser.HUB_ADMIN}        | ${'"data":{"deleteCallout"'}
      ${TestUser.CHALLENGE_ADMIN}  | ${'"data":{"deleteCallout"'}
      ${TestUser.CHALLENGE_MEMBER} | ${'errors'}
      ${TestUser.NON_HUB_MEMBER}   | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to delete callout',
      async ({ userRole, message }) => {
        const res = await createCalloutOnCollaboration(
          entitiesId.challengeCollaborationId,

          calloutDisplayName,
          calloutNameID
        );
        calloutId = res.body.data.createCalloutOnCollaboration.id;

        // Act
        const resDelete = await deleteCallout(calloutId, userRole);

        // Assert
        expect(resDelete.text).toContain(message);
      }
    );
  });
});

describe('Callouts - AUTH Opportunity', () => {
  describe('DDT user privileges to create callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    // Arrange
    test.each`
      userRole                      | message
      ${TestUser.HUB_ADMIN}         | ${'"data":{"createCalloutOnCollaboration"'}
      ${TestUser.CHALLENGE_ADMIN}   | ${'"data":{"createCalloutOnCollaboration"'}
      ${TestUser.OPPORTUNITY_ADMIN} | ${'"data":{"createCalloutOnCollaboration"'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCollaboration(
          entitiesId.opportunityCollaborationId,
          calloutDisplayName,
          'description',
          CalloutState.OPEN,
          CalloutType.CARD,
          userRole
        );
        calloutId = res.body.data.createCalloutOnCollaboration.id;

        // Assert
        expect(res.text).toContain(message);
      }
    );
  });

  describe('DDT user NO privileges to create callout', () => {
    // Arrange
    test.each`
      userRole                       | message
      ${TestUser.HUB_MEMBER}         | ${'errors'}
      ${TestUser.CHALLENGE_MEMBER}   | ${'errors'}
      ${TestUser.OPPORTUNITY_MEMBER} | ${'errors'}
      ${TestUser.NON_HUB_MEMBER}     | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCollaboration(
          entitiesId.opportunityCollaborationId,
          calloutDisplayName,
          'description',
          CalloutState.OPEN,
          CalloutType.CARD,
          userRole
        );

        // Assert
        expect(res.text).toContain(message);
      }
    );
  });

  describe('DDT user privileges to update callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test.each`
      userRole                       | message
      ${TestUser.HUB_ADMIN}          | ${'"data":{"updateCallout"'}
      ${TestUser.CHALLENGE_ADMIN}    | ${'"data":{"updateCallout"'}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${'"data":{"updateCallout"'}
      ${TestUser.HUB_MEMBER}         | ${'errors'}
      ${TestUser.CHALLENGE_MEMBER}   | ${'errors'}
      ${TestUser.OPPORTUNITY_MEMBER} | ${'errors'}
      ${TestUser.NON_HUB_MEMBER}     | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to update callout',
      async ({ userRole, message }) => {
        const res = await createCalloutOnCollaboration(
          entitiesId.opportunityCollaborationId,
          calloutDisplayName
        );
        calloutId = res.body.data.createCalloutOnCollaboration.id;

        // Act
        const resUpdate = await updateCallout(calloutId, userRole, {
          displayName: calloutDisplayName + 'update',
          description: 'calloutDescription update',
          state: CalloutState.ARCHIVED,
        });

        // Assert
        expect(resUpdate.text).toContain(message);
      }
    );
  });

  describe('DDT user privileges to delete callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test.each`
      userRole                       | message
      ${TestUser.HUB_ADMIN}          | ${'"data":{"deleteCallout"'}
      ${TestUser.CHALLENGE_ADMIN}    | ${'"data":{"deleteCallout"'}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${'"data":{"deleteCallout"'}
      ${TestUser.HUB_MEMBER}         | ${'errors'}
      ${TestUser.CHALLENGE_MEMBER}   | ${'errors'}
      ${TestUser.OPPORTUNITY_MEMBER} | ${'errors'}
      ${TestUser.NON_HUB_MEMBER}     | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to delete callout',
      async ({ userRole, message }) => {
        const res = await createCalloutOnCollaboration(
          entitiesId.opportunityCollaborationId,
          calloutDisplayName
        );
        calloutId = res.body.data.createCalloutOnCollaboration.id;

        // Act
        const resDelete = await deleteCallout(calloutId, userRole);

        // Assert
        expect(resDelete.text).toContain(message);
      }
    );
  });
});
