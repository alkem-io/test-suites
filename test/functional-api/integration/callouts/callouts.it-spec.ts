import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeSpace } from '../space/space.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import {
  createCalloutOnCollaboration,
  deleteCallout,
  getSpaceCalloutByNameId,
  getSpaceCallouts,
  updateCallout,
  updateCalloutVisibility,
} from './callouts.request.params';
import { getDataPerSpaceCallout } from '../post/post.request.params';
import { CalloutState, CalloutType, CalloutVisibility } from './callouts-enum';
import { TestUser } from '@test/utils';

let opportunityName = 'post-opp';
let challengeName = 'post-chal';
let calloutDisplayName = '';
let calloutId = '';

const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const spaceName = 'callout-eco-name' + uniqueId;
const spaceNameId = 'callout-eco-nameid' + uniqueId;

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
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;

  calloutDisplayName = `callout-d-name-${uniqueId}`;
});

describe('Callouts - CRUD', () => {
  afterEach(async () => {
    await deleteCallout(calloutId);
  });
  test('should create callout on space coollaboration', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId
    );
    const calloutDataCreate = res.body.data.createCalloutOnCollaboration;
    calloutId = calloutDataCreate.id;

    const postsData = await getDataPerSpaceCallout(
      entitiesId.spaceId,
      calloutId
    );
    const data = postsData.body.data.space.collaboration.callouts[0];

    // Assert
    expect(data).toEqual(calloutDataCreate);
  });

  test('should update callout on space coollaboration', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId,
      {
        profile: { displayName: calloutDisplayName },
      }
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    const resUpdate = await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
      profileData: {
        displayName: calloutDisplayName + 'update',
        description: 'calloutDescription update',
      },
      state: CalloutState.ARCHIVED,
    });
    const calloutReq = await getSpaceCalloutByNameId(
      entitiesId.spaceId,
      calloutId
    );
    const calloutData = calloutReq.body.data.space.collaboration.callouts[0];

    // Assert
    expect(calloutData).toEqual(resUpdate.body.data.updateCallout);
  });

  test('should update callout visibility to Published', async () => {
    // Act
    const res = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;

    await updateCalloutVisibility(calloutId, CalloutVisibility.PUBLISHED);

    const calloutReq = await getSpaceCalloutByNameId(
      entitiesId.spaceId,
      calloutId
    );
    const calloutData = calloutReq.body.data.space.collaboration.callouts[0];
    // Assert
    expect(calloutData.visibility).toEqual(CalloutVisibility.PUBLISHED);
  });

  test('should delete callout on space coollaboration', async () => {
    // Arrange
    const res = await createCalloutOnCollaboration(
      entitiesId.spaceCollaborationId
    );
    calloutId = res.body.data.createCalloutOnCollaboration.id;
    const resCalloutDataBefore = await getSpaceCallouts(entitiesId.spaceId);
    const calloutDataBefore =
      resCalloutDataBefore.body.data.space.collaboration.callouts;

    // Act
    await deleteCallout(calloutId);
    const resCalloutData = await getSpaceCallouts(entitiesId.spaceId);
    const calloutData = resCalloutData.body.data.space.collaboration.callouts;

    // Assert
    expect(calloutData.length).toEqual(calloutDataBefore.length - 1);
    expect(calloutData).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          visibility: 'DRAFT',
        }),
      ])
    );
  });

  // test.skip('should read only callout from specified group', async () => {
  //   // Arrange
  //   await createCalloutOnCollaboration(entitiesId.spaceCollaborationId, {
  //     profile: { displayName: 'callout 1' },
  //     group: 'COMMUNITY_GROUP_1',
  //   });
  //   await createCalloutOnCollaboration(entitiesId.spaceCollaborationId, {
  //     profile: { displayName: 'callout 2' },
  //     group: 'COMMUNITY_GROUP_1',
  //   });

  //   await createCalloutOnCollaboration(entitiesId.spaceCollaborationId, {
  //     profile: { displayName: 'callout 3' },
  //     group: 'COMMUNITY_GROUP_1',
  //   });

  //   await createCalloutOnCollaboration(entitiesId.spaceCollaborationId, {
  //     profile: { displayName: 'callout 4' },
  //     group: 'CHALLENGES_GROUP_1',
  //   });

  //   // Act
  //   const calloutsReq = await getSpaceCalloutsFromGroups(entitiesId.spaceId, [
  //     'COMMUNITY_GROUP_1',
  //     'COMMUNITY_GROUP_2',
  //   ]);

  //   const callouts = calloutsReq.body.data.space.collaboration.callouts;

  //   // Assert
  //   expect(callouts).toHaveLength(3);
  // });
});

describe('Callouts - AUTH Space', () => {
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
          entitiesId.spaceCollaborationId,
          { type: CalloutType.POST },
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
          entitiesId.spaceCollaborationId,
          { type: CalloutType.POST },
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
          entitiesId.spaceCollaborationId
        );
        calloutId = res.body.data.createCalloutOnCollaboration.id;

        // Act
        const resUpdate = await updateCallout(calloutId, userRole, {
          profileData: {
            description: 'update',
          },
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
          entitiesId.spaceCollaborationId
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
          { type: CalloutType.POST },
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
          { type: CalloutType.POST },
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
          entitiesId.challengeCollaborationId
        );
        calloutId = res.body.data.createCalloutOnCollaboration.id;

        // Act
        const resUpdate = await updateCallout(calloutId, userRole, {
          profileData: {
            description: ' update',
          },
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
          entitiesId.challengeCollaborationId
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
          { type: CalloutType.POST },
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
          { type: CalloutType.POST },
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
          entitiesId.opportunityCollaborationId
        );
        calloutId = res.body.data.createCalloutOnCollaboration.id;

        // Act
        const resUpdate = await updateCallout(calloutId, userRole, {
          profileData: {
            displayName: calloutDisplayName + 'update',
            description: 'calloutDescription update',
          },
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
          entitiesId.opportunityCollaborationId
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
