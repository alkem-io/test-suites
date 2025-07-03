import {
  createCalloutOnCalloutsSet,
  deleteCallout,
  updateCallout,
  updateCalloutVisibility,
} from '../callouts.request.params';
import {
  createPostOnCallout,
  getDataPerSpaceCallout,
} from '../post/post.request.params';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestSetupUtils,
  TestUser,
} from '@alkemio/tests-lib';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CalloutAllowedContributors,
  CalloutFramingType,
  CalloutVisibility,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

const uniqueId = UniqueIDGenerator.getID();

let calloutId = '';
let postNameID = '';

const getIdentifier = (
  entity: string,
  spaceCalloutId: string,
  subspaceCalloutId: string,
  subsubspaceCalloutId: string
) => {
  let id = '';
  if (entity === 'space') {
    id = spaceCalloutId;
    return id;
  } else if (entity === 'subspace') {
    id = subspaceCalloutId;
    return id;
  } else {
    id = subsubspaceCalloutId;
    return id;
  }
};

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'callout-close-state',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
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
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
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
          addPostCallout: true,
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
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
  postNameID = `post-name-id-${uniqueId}`;
});

describe('Callouts - Close State', () => {
  afterEach(async () => {
    await deleteCallout(calloutId);
  });
  test('Close callout that has not been published', async () => {
    // Act
    const res = await createCalloutOnCalloutsSet(
      baseScenario.space.collaboration.calloutsSetId,
      {
        framing: { profile: { displayName: 'check' } },
      }
    );
    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

    await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
      settings: { contribution: { enabled: false } },
    });

    await createPostOnCallout(
      calloutId,
      { displayName: 'postDisplayName' },
      postNameID,
      TestUser.SPACE_MEMBER
    );

    const postsData = await getDataPerSpaceCallout(
      baseScenario.space.id,
      calloutId
    );
    const data =
      postsData.data?.lookup?.space?.collaboration?.calloutsSet.callouts?.[0];

    // Assert
    expect(data?.contributions).toEqual([]);
    expect(data?.settings?.visibility).toEqual(CalloutVisibility.Draft);
  });

  test('Close callout that has been published', async () => {
    // Act
    const res = await createCalloutOnCalloutsSet(
      baseScenario.space.collaboration.calloutsSetId
    );
    calloutId = res.data?.createCalloutOnCalloutsSet.id ?? '';

    await updateCalloutVisibility(calloutId, CalloutVisibility.Published);

    await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
      settings: { contribution: { enabled: false } },
    });

    const resPostonSpace = await createPostOnCallout(
      calloutId,
      { displayName: 'postDisplayName' },
      postNameID,
      TestUser.SPACE_MEMBER
    );

    const postsData = await getDataPerSpaceCallout(
      baseScenario.space.id,
      calloutId
    );
    const data =
      postsData.data?.lookup?.space?.collaboration?.calloutsSet.callouts?.[0];

    // Assert
    expect(resPostonSpace.error?.errors[0].code).toContain('CALLOUT_CLOSED');
    expect(data?.contributions).toEqual([]);
    expect(data?.settings?.visibility).toEqual(CalloutVisibility.Published);
  });
});

// The suite contains scenarios for 'post create' and 'post comment'. Post Update / Delete to be added on later stage (low priority)
describe('Callout - Close State - User Privileges Posts', () => {
  let spaceCalloutId = '';
  let subspaceCalloutId = '';
  let subsubspaceCalloutId = '';
  let postCommentsIdSpace = '';
  let postCommentsIdSubspace = '';
  let postCommentsIdSubsubspace = '';

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      const resPostonSpace = await createPostOnCallout(calloutId, {
        displayName: 'postDisplayName',
      });
      const postDataCreate =
        resPostonSpace.data?.createContributionOnCallout.post;
      const postCommentsId = postDataCreate?.comments.id ?? '';

      await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
        settings: {
          framing: {
            commentsEnabled: true,
          },
          contribution: {
            enabled: true,
            canAddContributions: CalloutAllowedContributors.Admins,
            commentsEnabled: true,
          },
        },
      });

      return postCommentsId;
    };

    const spaceCallout = await TestSetupUtils.getDefaultSpaceCalloutByNameId(
      baseScenario.space.collaboration.calloutsSetId,
      baseScenario.space.collaboration.calloutPostCollectionId
    );
    spaceCalloutId = spaceCallout?.data?.lookup?.callout?.id ?? '';
    postCommentsIdSpace = await preconditions(spaceCalloutId);

    const subspaceCallout = await TestSetupUtils.getDefaultSpaceCalloutByNameId(
      baseScenario.subspace.collaboration.calloutsSetId,
      baseScenario.subspace.collaboration.calloutPostCollectionId
    );
    subspaceCalloutId = subspaceCallout?.data?.lookup?.callout?.id ?? '';
    postCommentsIdSubspace = await preconditions(subspaceCalloutId);

    const subsubspaceCallout =
      await TestSetupUtils.getDefaultSpaceCalloutByNameId(
        baseScenario.subsubspace.collaboration.calloutsSetId,
        baseScenario.subsubspace.collaboration.calloutPostCollectionId
      );
    subsubspaceCalloutId = subsubspaceCallout?.data?.lookup.callout?.id ?? '';
    postCommentsIdSubsubspace = await preconditions(subsubspaceCalloutId);
  });

  afterAll(async () => {
    await deleteCallout(subsubspaceCalloutId);
    await deleteCallout(subspaceCalloutId);
    await deleteCallout(spaceCalloutId);
  });

  describe('Send Comment to Post - Callout Close State ', () => {
    describe('DDT Users sending messages to closed callout post', () => {
      // Arrange
      test.each`
        userRole                       | message          | entity
        ${TestUser.SPACE_ADMIN}        | ${'sendComment'} | ${'space'}
        ${TestUser.SPACE_MEMBER}       | ${'sendComment'} | ${'space'}
        ${TestUser.SUBSPACE_ADMIN}     | ${'sendComment'} | ${'subspace'}
        ${TestUser.SUBSPACE_MEMBER}    | ${'sendComment'} | ${'subspace'}
        ${TestUser.SUBSUBSPACE_ADMIN}  | ${'sendComment'} | ${'subsubspace'}
        ${TestUser.SUBSUBSPACE_MEMBER} | ${'sendComment'} | ${'subsubspace'}
      `(
        'User: "$userRole" can send message to closed "$entity" callout post',
        async ({ userRole, message, entity }) => {
          const id = getIdentifier(
            entity,
            postCommentsIdSpace,
            postCommentsIdSubspace,
            postCommentsIdSubsubspace
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
        userRole                     | message                                                                            | entity
        ${TestUser.NON_SPACE_MEMBER} | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'space'}
        ${TestUser.NON_SPACE_MEMBER} | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'subspace'}
        ${TestUser.NON_SPACE_MEMBER} | ${"Authorization: unable to grant 'create-message' privilege: room send message:"} | ${'subsubspace'}
      `(
        'User: "$userRole" cannot send message to closed "$entity" callout post',
        async ({ userRole, message, entity }) => {
          const id = getIdentifier(
            entity,
            postCommentsIdSpace,
            postCommentsIdSubspace,
            postCommentsIdSubsubspace
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
        ${TestUser.SPACE_ADMIN}        | ${'"data":{"createContributionOnCallout"'}                                                 | ${'space'}
        ${TestUser.SPACE_MEMBER}       | ${'"Only admins are allowed to contribute to Callout with id'}                             | ${'space'}
        ${TestUser.NON_SPACE_MEMBER}   | ${"Authorization: unable to grant 'contribute' privilege: create contribution on callout"} | ${'space'}
        ${TestUser.SUBSPACE_ADMIN}     | ${'"data":{"createContributionOnCallout"'}                                                 | ${'subspace'}
        ${TestUser.SUBSPACE_MEMBER}    | ${'"Only admins are allowed to contribute to Callout with id'}                             | ${'subspace'}
        ${TestUser.NON_SPACE_MEMBER}   | ${"Authorization: unable to grant 'contribute' privilege: create contribution on callout"} | ${'subspace'}
        ${TestUser.SUBSUBSPACE_ADMIN}  | ${'"data":{"createContributionOnCallout"'}                                                 | ${'subsubspace'}
        ${TestUser.SUBSUBSPACE_MEMBER} | ${'"Only admins are allowed to contribute to Callout with id'}                             | ${'subsubspace'}
        ${TestUser.NON_SPACE_MEMBER}   | ${"Authorization: unable to grant 'contribute' privilege: create contribution on callout"} | ${'subsubspace'}
      `(
        'User: "$userRole" get error when create post to closed "$entity" callout',
        async ({ userRole, message, entity }) => {
          const id = getIdentifier(
            entity,
            spaceCalloutId,
            subspaceCalloutId,
            subsubspaceCalloutId
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

// ToDo

describe.skip('Callout - Close State - User Privileges Discussions', () => {
  let spaceCalloutCommentsId = '';
  let subspaceCalloutCommentsId = '';
  let subsubspaceCalloutCommentsId = '';

  beforeAll(async () => {
    const preconditions = async (calloutId: string) => {
      await updateCallout(calloutId, TestUser.GLOBAL_ADMIN, {
        framing: { type: CalloutFramingType.None },
        settings: {
          framing: {
            commentsEnabled: false,
          },
          contribution: {
            enabled: true,
            canAddContributions: CalloutAllowedContributors.Admins,
            commentsEnabled: true,
          },
        },
      });
    };

    const spaceCallout = await TestSetupUtils.getDefaultSpaceCalloutByNameId(
      baseScenario.space.collaboration.calloutsSetId,
      baseScenario.space.collaboration.calloutPostCommentsId
    );

    spaceCalloutCommentsId =
      spaceCallout?.data?.lookup?.callout?.comments?.id ?? '';
    await preconditions(baseScenario.space.collaboration.calloutPostId);

    const subspaceCallout = await TestSetupUtils.getDefaultSpaceCalloutByNameId(
      baseScenario.subspace.collaboration.calloutsSetId,
      baseScenario.subspace.collaboration.calloutPostCommentsId
    );
    subspaceCalloutCommentsId =
      subspaceCallout?.data?.lookup?.callout?.comments?.id ?? '';
    await preconditions(baseScenario.subspace.collaboration.calloutPostId);

    const subsubspaceCallout =
      await TestSetupUtils.getDefaultSpaceCalloutByNameId(
        baseScenario.subsubspace.collaboration.calloutsSetId,
        baseScenario.subsubspace.collaboration.calloutPostCommentsId
      );
    subsubspaceCalloutCommentsId =
      subsubspaceCallout?.data?.lookup.callout?.comments?.id ?? '';
    await preconditions(baseScenario.subsubspace.collaboration.calloutPostId);
  });

  afterAll(async () => {
    await deleteCallout(baseScenario.subsubspace.collaboration.calloutPostId);
    await deleteCallout(baseScenario.subspace.collaboration.calloutPostId);
    await deleteCallout(baseScenario.space.collaboration.calloutPostId);
  });

  describe('Discussion Callout - Close State ', () => {
    describe('DDT Users sending messages to closed discussion callout', () => {
      // Arrange
      test.each`
        userRole                       | code                  | entity
        ${TestUser.SPACE_ADMIN}        | ${'CALLOUT_CLOSED'}   | ${'space'}
        ${TestUser.SPACE_MEMBER}       | ${'CALLOUT_CLOSED'}   | ${'space'}
        ${TestUser.NON_SPACE_MEMBER}   | ${'FORBIDDEN_POLICY'} | ${'space'}
        ${TestUser.SUBSPACE_ADMIN}     | ${'CALLOUT_CLOSED'}   | ${'subspace'}
        ${TestUser.SUBSPACE_MEMBER}    | ${'CALLOUT_CLOSED'}   | ${'subspace'}
        ${TestUser.NON_SPACE_MEMBER}   | ${'FORBIDDEN_POLICY'} | ${'subspace'}
        ${TestUser.SUBSUBSPACE_ADMIN}  | ${'CALLOUT_CLOSED'}   | ${'subsubspace'}
        ${TestUser.SUBSUBSPACE_MEMBER} | ${'CALLOUT_CLOSED'}   | ${'subsubspace'}
        ${TestUser.NON_SPACE_MEMBER}   | ${'FORBIDDEN_POLICY'} | ${'subsubspace'}
      `(
        'User: "$userRole" get error when send code to closed "$entity" callout',
        async ({ userRole, code, entity }) => {
          const commentsId = getIdentifier(
            entity,
            spaceCalloutCommentsId,
            subspaceCalloutCommentsId,
            subsubspaceCalloutCommentsId
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
