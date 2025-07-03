import {
  TestScenarioConfig,
  TestScenarioFactory,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  createCalloutOnCalloutsSet,
  deleteCallout,
  getCalloutsData,
  updateCallout,
  updateCalloutVisibility,
} from './callouts.request.params';
import { TestUser } from '@alkemio/tests-lib';
import { getDataPerSpaceCallout } from './post/post.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { CalloutVisibility } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { CalloutContributionType } from '@alkemio/client-lib';

const uniqueId = UniqueIDGenerator.getID();

let calloutDisplayName = '';
let calloutId = '';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'callouts',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },

    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: {
        addTutorialCallouts: false,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      subspace: {
        collaboration: {
          addTutorialCallouts: false,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

beforeEach(async () => {
  calloutDisplayName = `callout-d-name-${uniqueId}`;
});

describe('Callouts - CRUD', () => {
  describe('', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test('should create callout on space coollaboration', async () => {
      // Act
      const res = await createCalloutOnCalloutsSet(
        baseScenario.space.collaboration.calloutsSetId
      );
      const calloutDataCreate = res.data?.createCalloutOnCalloutsSet;
      calloutId = calloutDataCreate?.id ?? '';

      const postsData = await getDataPerSpaceCallout(
        baseScenario.space.id,
        calloutId
      );
      const data =
        postsData?.data?.lookup?.space?.collaboration?.calloutsSet
          .callouts?.[0];

      // Assert
      expect(data).toEqual(calloutDataCreate);
    });

    test('should update callout on space coollaboration', async () => {
      // Act
      const res = await createCalloutOnCalloutsSet(
        baseScenario.space.collaboration.calloutsSetId,
        {
          framing: {
            profile: { displayName: calloutDisplayName },
          },
        }
      );
      calloutId = res?.data?.createCalloutOnCalloutsSet.id ?? '';

      const resUpdate = await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
        framing: {
          profile: {
            displayName: calloutDisplayName + 'update',
            description: 'calloutDescription update',
          },
        },
      });
      const calloutReq = await getDataPerSpaceCallout(
        baseScenario.space.id,
        calloutId
      );
      const calloutData =
        calloutReq.data?.lookup?.space?.collaboration?.calloutsSet
          .callouts?.[0];

      // Assert
      expect(calloutData).toEqual(resUpdate?.data?.updateCallout);
    });

    test('should update callout visibility to Published', async () => {
      // Act
      const res = await createCalloutOnCalloutsSet(
        baseScenario.space.collaboration.calloutsSetId
      );
      calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

      await updateCalloutVisibility(calloutId, CalloutVisibility.Published);

      const calloutReq = await getDataPerSpaceCallout(
        baseScenario.space.id,
        calloutId
      );
      const calloutData =
        calloutReq.data?.lookup?.space?.collaboration?.calloutsSet
          .callouts?.[0];
      // Assert
      expect(calloutData?.settings?.visibility).toEqual(
        CalloutVisibility.Published
      );
    });
  });

  test('should delete callout on space coollaboration', async () => {
    // Arrange
    const res = await createCalloutOnCalloutsSet(
      baseScenario.space.collaboration.calloutsSetId
    );
    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';
    const resCalloutDataBefore = await getCalloutsData(
      baseScenario.space.collaboration.calloutsSetId
    );
    const calloutDataBefore =
      resCalloutDataBefore.data?.lookup.calloutsSet?.callouts ?? [];

    // Act
    await deleteCallout(calloutId);
    const resCalloutData = await getCalloutsData(
      baseScenario.space.collaboration.calloutsSetId
    );
    const calloutData = resCalloutData.data?.lookup.calloutsSet?.callouts ?? [];

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
  //   await createCalloutOnCalloutsSet(baseScenario.space.collaboration.id, {
  //     profile: { displayName: 'callout 1' },
  //     group: 'COMMUNITY_GROUP_1',
  //   });
  //   await createCalloutOnCalloutsSet(baseScenario.space.collaboration.id, {
  //     profile: { displayName: 'callout 2' },
  //     group: 'COMMUNITY_GROUP_1',
  //   });

  //   await createCalloutOnCalloutsSet(baseScenario.space.collaboration.id, {
  //     profile: { displayName: 'callout 3' },
  //     group: 'COMMUNITY_GROUP_1',
  //   });

  //   await createCalloutOnCalloutsSet(baseScenario.space.collaboration.id, {
  //     profile: { displayName: 'callout 4' },
  //     group: 'CHALLENGES_GROUP_1',
  //   });

  //   // Act
  //   const calloutsReq = await getSpaceCalloutsFromGroups(baseScenario.space.id, [
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
      ${TestUser.GLOBAL_ADMIN} | ${'"data":{"createCalloutOnCalloutsSet"'}
      ${TestUser.SPACE_ADMIN}  | ${'"data":{"createCalloutOnCalloutsSet"'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCalloutsSet(
          baseScenario.space.collaboration.calloutsSetId,
          {
            settings: {
              contribution: { allowedTypes: [CalloutContributionType.Post] },
            },
          },
          userRole
        );
        calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

        // Assert
        expect(JSON.stringify(res)).toContain(message);
      }
    );
  });

  describe('DDT user NO privileges to create callout', () => {
    // Arrange
    test.each`
      userRole                     | message
      ${TestUser.NON_SPACE_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCalloutsSet(
          baseScenario.space.collaboration.calloutsSetId,
          userRole
        );

        // Assert
        expect(JSON.stringify(res)).toContain(message);
      }
    );
  });

  describe('DDT user privileges to update callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test.each`
      userRole                     | message
      ${TestUser.GLOBAL_ADMIN}     | ${'"data":{"updateCallout"'}
      ${TestUser.SPACE_ADMIN}      | ${'"data":{"updateCallout"'}
      ${TestUser.SPACE_MEMBER}     | ${'errors'}
      ${TestUser.NON_SPACE_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to update callout',
      async ({ userRole, message }) => {
        const res = await createCalloutOnCalloutsSet(
          baseScenario.space.collaboration.calloutsSetId
        );
        calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

        // Act
        const resUpdate = await updateCallout(calloutId, userRole, {
          framing: {
            profile: {
              description: 'update',
              displayName: calloutDisplayName + 'update',
            },
          },
        });

        // Assert
        expect(JSON.stringify(resUpdate)).toContain(message);
      }
    );
  });

  describe('DDT user privileges to delete callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test.each`
      userRole                     | message
      ${TestUser.GLOBAL_ADMIN}     | ${'"data":{"deleteCallout"'}
      ${TestUser.SPACE_ADMIN}      | ${'"data":{"deleteCallout"'}
      ${TestUser.SPACE_MEMBER}     | ${'errors'}
      ${TestUser.NON_SPACE_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to delete callout',
      async ({ userRole, message }) => {
        const res = await createCalloutOnCalloutsSet(
          baseScenario.space.collaboration.calloutsSetId
        );
        calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

        // Act
        const resDelete = await deleteCallout(calloutId, userRole);

        // Assert
        expect(JSON.stringify(resDelete)).toContain(message);
      }
    );
  });
});

describe('Callouts - AUTH Subspace', () => {
  describe('DDT user privileges to create callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    // Arrange
    test.each`
      userRole                    | message
      ${TestUser.SPACE_ADMIN}     | ${'"data":{"createCalloutOnCalloutsSet"'}
      ${TestUser.SUBSPACE_ADMIN}  | ${'"data":{"createCalloutOnCalloutsSet"'}
      ${TestUser.SUBSPACE_MEMBER} | ${'"data":{"createCalloutOnCalloutsSet"'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCalloutsSet(
          baseScenario.subspace.collaboration.calloutsSetId,
          {
            settings: {
              contribution: { allowedTypes: [CalloutContributionType.Post] },
            },
          },
          userRole
        );

        calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

        // Assert
        expect(JSON.stringify(res)).toContain(message);
      }
    );
  });

  describe('DDT user NO privileges to create callout', () => {
    // Arrange
    test.each`
      userRole                     | message
      ${TestUser.NON_SPACE_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCalloutsSet(
          baseScenario.subspace.collaboration.calloutsSetId,
          {
            settings: {
              contribution: { allowedTypes: [CalloutContributionType.Post] },
            },
          },
          userRole
        );

        // Assert
        expect(JSON.stringify(res)).toContain(message);
      }
    );
  });

  describe('DDT user privileges to update callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test.each`
      userRole                     | message
      ${TestUser.SPACE_ADMIN}      | ${'"data":{"updateCallout"'}
      ${TestUser.SUBSPACE_ADMIN}   | ${'"data":{"updateCallout"'}
      ${TestUser.SUBSPACE_MEMBER}  | ${'errors'}
      ${TestUser.NON_SPACE_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to update callout',
      async ({ userRole, message }) => {
        const res = await createCalloutOnCalloutsSet(
          baseScenario.subspace.collaboration.calloutsSetId
        );
        calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

        // Act
        const resUpdate = await updateCallout(calloutId, userRole, {
          framing: {
            profile: {
              description: ' update',
              displayName: calloutDisplayName + 'update',
            },
          },
        });

        // Assert
        expect(JSON.stringify(resUpdate)).toContain(message);
      }
    );
  });

  describe('DDT user privileges to delete callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test.each`
      userRole                     | message
      ${TestUser.SPACE_ADMIN}      | ${'"data":{"deleteCallout"'}
      ${TestUser.SUBSPACE_ADMIN}   | ${'"data":{"deleteCallout"'}
      ${TestUser.SUBSPACE_MEMBER}  | ${'errors'}
      ${TestUser.NON_SPACE_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to delete callout',
      async ({ userRole, message }) => {
        const res = await createCalloutOnCalloutsSet(
          baseScenario.subspace.collaboration.calloutsSetId
        );
        calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

        // Act
        const resDelete = await deleteCallout(calloutId, userRole);

        // Assert
        expect(JSON.stringify(resDelete)).toContain(message);
      }
    );
  });
});

describe('Callouts - AUTH Subsubspace', () => {
  describe('DDT user privileges to create callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    // Arrange
    test.each`
      userRole                       | message
      ${TestUser.SPACE_ADMIN}        | ${'"data":{"createCalloutOnCalloutsSet"'}
      ${TestUser.SUBSPACE_ADMIN}     | ${'"data":{"createCalloutOnCalloutsSet"'}
      ${TestUser.SUBSUBSPACE_ADMIN}  | ${'"data":{"createCalloutOnCalloutsSet"'}
      ${TestUser.SUBSPACE_MEMBER}    | ${'"data":{"createCalloutOnCalloutsSet"'}
      ${TestUser.SUBSUBSPACE_MEMBER} | ${'"data":{"createCalloutOnCalloutsSet"'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCalloutsSet(
          baseScenario.subsubspace.collaboration.calloutsSetId,
          {
            settings: {
              contribution: { allowedTypes: [CalloutContributionType.Post] },
            },
          },
          userRole
        );
        calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

        // Assert
        expect(JSON.stringify(res)).toContain(message);
      }
    );
  });

  // ToDo check if space member should have rights ro create callouts on L2?
  // ${TestUser.SPACE_MEMBER}     | ${'errors'}
  describe('DDT user NO privileges to create callout', () => {
    // Arrange
    test.each`
      userRole                     | message
      ${TestUser.NON_SPACE_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to create callout',
      async ({ userRole, message }) => {
        // Act
        const res = await createCalloutOnCalloutsSet(
          baseScenario.subsubspace.collaboration.calloutsSetId,
          {
            settings: {
              contribution: { allowedTypes: [CalloutContributionType.Post] },
            },
          },
          userRole
        );

        // Assert
        expect(JSON.stringify(res)).toContain(message);
      }
    );
  });

  describe('DDT user privileges to update callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test.each`
      userRole                       | message
      ${TestUser.SPACE_ADMIN}        | ${'"data":{"updateCallout"'}
      ${TestUser.SUBSPACE_ADMIN}     | ${'"data":{"updateCallout"'}
      ${TestUser.SUBSUBSPACE_ADMIN}  | ${'"data":{"updateCallout"'}
      ${TestUser.SPACE_MEMBER}       | ${'errors'}
      ${TestUser.SUBSPACE_MEMBER}    | ${'errors'}
      ${TestUser.SUBSUBSPACE_MEMBER} | ${'errors'}
      ${TestUser.NON_SPACE_MEMBER}   | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to update callout',
      async ({ userRole, message }) => {
        const res = await createCalloutOnCalloutsSet(
          baseScenario.subsubspace.collaboration.calloutsSetId
        );
        calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

        // Act
        const resUpdate = await updateCallout(calloutId, userRole, {
          framing: {
            profile: {
              displayName: calloutDisplayName + 'update',
              description: 'calloutDescription update',
            },
          },
        });

        // Assert
        expect(JSON.stringify(resUpdate)).toContain(message);
      }
    );
  });

  describe('DDT user privileges to delete callout', () => {
    afterEach(async () => {
      await deleteCallout(calloutId);
    });
    test.each`
      userRole                       | message
      ${TestUser.SPACE_ADMIN}        | ${'"data":{"deleteCallout"'}
      ${TestUser.SUBSPACE_ADMIN}     | ${'"data":{"deleteCallout"'}
      ${TestUser.SUBSUBSPACE_ADMIN}  | ${'"data":{"deleteCallout"'}
      ${TestUser.SPACE_MEMBER}       | ${'errors'}
      ${TestUser.SUBSPACE_MEMBER}    | ${'errors'}
      ${TestUser.SUBSUBSPACE_MEMBER} | ${'errors'}
      ${TestUser.NON_SPACE_MEMBER}   | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to delete callout',
      async ({ userRole, message }) => {
        const res = await createCalloutOnCalloutsSet(
          baseScenario.subsubspace.collaboration.calloutsSetId
        );
        calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

        // Act
        const resDelete = await deleteCallout(calloutId, userRole);

        // Assert
        expect(JSON.stringify(resDelete)).toContain(message);
      }
    );
  });
});
