import '@test/utils/array.matcher';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  createCalloutOnCollaborationCodegen,
  deleteCalloutCodegen,
  getCollaborationCalloutsDataCodegen,
  updateCalloutCodegen,
  updateCalloutVisibilityCodegen,
} from './callouts.request.params';
import { TestUser } from '@test/utils';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { CalloutState, CalloutType } from '@test/generated/alkemio-schema';
import { CalloutVisibility } from '@alkemio/client-lib/dist/types/alkemio-schema';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { getDataPerSpaceCalloutCodegen } from './post/post.request.params';
import { entitiesId } from '../../types/entities-helper';

let opportunityName = 'post-opp';
let challengeName = 'post-chal';
let calloutDisplayName = '';
let calloutId = '';

const organizationName = 'callout-org-name' + uniqueId;
const hostNameId = 'callout-org-nameid' + uniqueId;
const spaceName = 'callout-eco-name' + uniqueId;
const spaceNameId = 'callout-eco-nameid' + uniqueId;

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
  calloutDisplayName = `callout-d-name-${uniqueId}`;
});

describe('Callouts - CRUD', () => {
  afterEach(async () => {
    await deleteCalloutCodegen(calloutId);
  });
  test('should create callout on space coollaboration', async () => {
    // Act
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.space.collaborationId
    );
    const calloutDataCreate = res.data?.createCalloutOnCollaboration;
    calloutId = calloutDataCreate?.id ?? '';

    const postsData = await getDataPerSpaceCalloutCodegen(
      entitiesId.spaceId,
      calloutId
    );
    const data = postsData?.data?.space.collaboration?.callouts?.[0];

    // Assert
    expect(data).toEqual(calloutDataCreate);
  });

  test('should update callout on space coollaboration', async () => {
    // Act
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.space.collaborationId,
      {
        framing: {
          profile: { displayName: calloutDisplayName },
        },
      }
    );
    calloutId = res?.data?.createCalloutOnCollaboration.id ?? '';

    const resUpdate = await updateCalloutCodegen(
      calloutId,
      TestUser.GLOBAL_ADMIN,
      {
        framing: {
          profile: {
            displayName: calloutDisplayName + 'update',
            description: 'calloutDescription update',
          },
        },
        contributionPolicy: {
          state: CalloutState.Archived,
        },
      }
    );
    const calloutReq = await getDataPerSpaceCalloutCodegen(
      entitiesId.spaceId,
      calloutId
    );
    const calloutData = calloutReq.data?.space.collaboration?.callouts?.[0];

    // Assert
    expect(calloutData).toEqual(resUpdate?.data?.updateCallout);
  });

  test('should update callout visibility to Published', async () => {
    // Act
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.space.collaborationId
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

    await updateCalloutVisibilityCodegen(
      calloutId,
      CalloutVisibility.Published
    );

    const calloutReq = await getDataPerSpaceCalloutCodegen(
      entitiesId.spaceId,
      calloutId
    );
    const calloutData = calloutReq.data?.space.collaboration?.callouts?.[0];
    // Assert
    expect(calloutData?.visibility).toEqual(CalloutVisibility.Published);
  });

  test('should delete callout on space coollaboration', async () => {
    // Arrange
    const res = await createCalloutOnCollaborationCodegen(
      entitiesId.space.collaborationId
    );
    calloutId = res.data?.createCalloutOnCollaboration.id ?? '';
    const resCalloutDataBefore = await getCollaborationCalloutsDataCodegen(
      entitiesId.space.collaborationId
    );
    const calloutDataBefore =
      resCalloutDataBefore.data?.lookup.collaboration?.callouts ?? [];

    // Act
    await deleteCalloutCodegen(calloutId);
    const resCalloutData = await getCollaborationCalloutsDataCodegen(
      entitiesId.space.collaborationId
    );
    const calloutData =
      resCalloutData.data?.lookup.collaboration?.callouts ?? [];

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
  //   await createCalloutOnCollaboration(entitiesId.space.collaborationId, {
  //     profile: { displayName: 'callout 1' },
  //     group: 'COMMUNITY_GROUP_1',
  //   });
  //   await createCalloutOnCollaboration(entitiesId.space.collaborationId, {
  //     profile: { displayName: 'callout 2' },
  //     group: 'COMMUNITY_GROUP_1',
  //   });

  //   await createCalloutOnCollaboration(entitiesId.space.collaborationId, {
  //     profile: { displayName: 'callout 3' },
  //     group: 'COMMUNITY_GROUP_1',
  //   });

  //   await createCalloutOnCollaboration(entitiesId.space.collaborationId, {
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
      await deleteCalloutCodegen(calloutId);
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
        const res = await createCalloutOnCollaborationCodegen(
          entitiesId.space.collaborationId,
          { type: CalloutType.Post },
          userRole
        );
        calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

        // Assert
        expect(JSON.stringify(res)).toContain(message);
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
        const res = await createCalloutOnCollaborationCodegen(
          entitiesId.space.collaborationId,
          { type: CalloutType.Post },
          userRole
        );

        // Assert
        expect(JSON.stringify(res)).toContain(message);
      }
    );
  });

  describe('DDT user privileges to update callout', () => {
    afterEach(async () => {
      await deleteCalloutCodegen(calloutId);
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
        const res = await createCalloutOnCollaborationCodegen(
          entitiesId.space.collaborationId
        );
        calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

        // Act
        const resUpdate = await updateCalloutCodegen(calloutId, userRole, {
          framing: {
            profile: {
              description: 'update',
            },
          },
          contributionPolicy: {
            state: CalloutState.Archived,
          },
        });

        // Assert
        expect(JSON.stringify(resUpdate)).toContain(message);
      }
    );
  });

  describe('DDT user privileges to delete callout', () => {
    afterEach(async () => {
      await deleteCalloutCodegen(calloutId);
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
        const res = await createCalloutOnCollaborationCodegen(
          entitiesId.space.collaborationId
        );
        calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

        // Act
        const resDelete = await deleteCalloutCodegen(calloutId, userRole);

        // Assert
        expect(JSON.stringify(resDelete)).toContain(message);
      }
    );
  });
});

describe('Callouts - AUTH Challenge', () => {
  describe('DDT user privileges to create callout', () => {
    afterEach(async () => {
      await deleteCalloutCodegen(calloutId);
    });
    // Arrange
    test.each`
      userRole                     | message
      ${TestUser.HUB_ADMIN}        | ${'"data":{"createCalloutOnCollaboration"'}
      ${TestUser.CHALLENGE_ADMIN}  | ${'"data":{"createCalloutOnCollaboration"'}
      ${TestUser.CHALLENGE_MEMBER} | ${'"data":{"createCalloutOnCollaboration"'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCollaborationCodegen(
          entitiesId.challenge.collaborationId,
          { type: CalloutType.Post },
          userRole
        );

        calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

        // Assert
        expect(JSON.stringify(res)).toContain(message);
      }
    );
  });

  describe('DDT user NO privileges to create callout', () => {
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCollaborationCodegen(
          entitiesId.challenge.collaborationId,
          { type: CalloutType.Post },
          userRole
        );

        // Assert
        expect(JSON.stringify(res)).toContain(message);
      }
    );
  });

  describe('DDT user privileges to update callout', () => {
    afterEach(async () => {
      await deleteCalloutCodegen(calloutId);
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
        const res = await createCalloutOnCollaborationCodegen(
          entitiesId.challenge.collaborationId
        );
        calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

        // Act
        const resUpdate = await updateCalloutCodegen(calloutId, userRole, {
          framing: {
            profile: {
              description: ' update',
            },
          },
          contributionPolicy: {
            state: CalloutState.Archived,
          },
        });

        // Assert
        expect(JSON.stringify(resUpdate)).toContain(message);
      }
    );
  });

  describe('DDT user privileges to delete callout', () => {
    afterEach(async () => {
      await deleteCalloutCodegen(calloutId);
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
        const res = await createCalloutOnCollaborationCodegen(
          entitiesId.challenge.collaborationId
        );
        calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

        // Act
        const resDelete = await deleteCalloutCodegen(calloutId, userRole);

        // Assert
        expect(JSON.stringify(resDelete)).toContain(message);
      }
    );
  });
});

describe('Callouts - AUTH Opportunity', () => {
  describe('DDT user privileges to create callout', () => {
    afterEach(async () => {
      await deleteCalloutCodegen(calloutId);
    });
    // Arrange
    test.each`
      userRole                       | message
      ${TestUser.HUB_ADMIN}          | ${'"data":{"createCalloutOnCollaboration"'}
      ${TestUser.CHALLENGE_ADMIN}    | ${'"data":{"createCalloutOnCollaboration"'}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${'"data":{"createCalloutOnCollaboration"'}
      ${TestUser.HUB_MEMBER}         | ${'"data":{"createCalloutOnCollaboration"'}
      ${TestUser.CHALLENGE_MEMBER}   | ${'"data":{"createCalloutOnCollaboration"'}
      ${TestUser.OPPORTUNITY_MEMBER} | ${'"data":{"createCalloutOnCollaboration"'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCollaborationCodegen(
          entitiesId.opportunity.collaborationId,
          { type: CalloutType.Post },
          userRole
        );
        calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

        // Assert
        expect(JSON.stringify(res)).toContain(message);
      }
    );
  });

  describe('DDT user NO privileges to create callout', () => {
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCollaborationCodegen(
          entitiesId.opportunity.collaborationId,
          { type: CalloutType.Post },
          userRole
        );

        // Assert
        expect(JSON.stringify(res)).toContain(message);
      }
    );
  });

  describe('DDT user privileges to update callout', () => {
    afterEach(async () => {
      await deleteCalloutCodegen(calloutId);
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
        const res = await createCalloutOnCollaborationCodegen(
          entitiesId.opportunity.collaborationId
        );
        calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

        // Act
        const resUpdate = await updateCalloutCodegen(calloutId, userRole, {
          framing: {
            profile: {
              displayName: calloutDisplayName + 'update',
              description: 'calloutDescription update',
            },
          },
          contributionPolicy: {
            state: CalloutState.Archived,
          },
        });

        // Assert
        expect(JSON.stringify(resUpdate)).toContain(message);
      }
    );
  });

  describe('DDT user privileges to delete callout', () => {
    afterEach(async () => {
      await deleteCalloutCodegen(calloutId);
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
        const res = await createCalloutOnCollaborationCodegen(
          entitiesId.opportunity.collaborationId
        );
        calloutId = res.data?.createCalloutOnCollaboration.id ?? '';

        // Act
        const resDelete = await deleteCalloutCodegen(calloutId, userRole);

        // Assert
        expect(JSON.stringify(resDelete)).toContain(message);
      }
    );
  });
});
