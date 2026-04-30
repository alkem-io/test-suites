import {
  createPostTemplate,
  getPostTemplatesCountForSpace,
  updatePostTemplate,
} from './post-template.request.params';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestSetupUtils,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  errorAuthCreatePostTemplate,
  errorAuthDeleteTemplate,
  errorAuthUpdatePostTemplate,
  errorNoPostTemplate,
} from './post-template-testdata';
import {
  deletePost,
  createPostOnCallout,
  getDataPerSpaceCallout,
  updatePost,
  getPostData,
} from '../../callout/post/post.request.params';
import { GetTemplateById } from '@functional-api/templates/template.request.params';
import { deleteTemplate } from '../template.request.params';
import { TestUser } from '@alkemio/tests-lib';
import { assignRoleToUser } from '@functional-api/roleset/roles-request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  PostDataFragment,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

const uniqueId = UniqueIDGenerator.getID();

let spacePostId = '';
let subspacePostId = '';
let subsubspacePostId = '';
let postNameID = '';
let postDisplayName = '';
let postTemplateId = '';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'post-templates',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
    subspace: {
      collaboration: {
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
      },
      subspace: {
        collaboration: {
          addPostCallout: true,
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
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
  postDisplayName = `post-d-name-${uniqueId}`;
});

/** @testCase TC-0801, TC-0802, TC-0803 */
describe('Post templates - CRUD', () => {
  const typeFromSpacetemplate = 'testType';
  afterEach(async () => {
    await deleteTemplate(postTemplateId);
  });
  test('Create Post template', async () => {
    // Arrange
    const countBefore = await getPostTemplatesCountForSpace(
      baseScenario.space.id
    );

    // Act
    const resCreatePostTempl = await createPostTemplate(
      baseScenario.space.templateSetId
    );

    const postDataCreate = resCreatePostTempl?.data?.createTemplate;
    postTemplateId = postDataCreate?.id ?? '';
    const countAfter = await getPostTemplatesCountForSpace(
      baseScenario.space.id
    );

    const getTemplate = await GetTemplateById(postTemplateId);
    const templateData = getTemplate?.data?.lookup.template;

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(postDataCreate).toEqual(
      expect.objectContaining({
        id: templateData?.id,
        type: templateData?.type,
        nameID: templateData?.nameID,
      })
    );
  });

  test('Update Post template', async () => {
    // Arrange
    const resCreatePostTempl = await createPostTemplate(
      baseScenario.space.templateSetId
    );
    postTemplateId = resCreatePostTempl?.data?.createTemplate.id ?? '';

    // Act
    const resUpdatePostTempl = await updatePostTemplate(
      postTemplateId,
      'test title - Update',
      'test description - Update',
      typeFromSpacetemplate + ' - Update'
    );

    const postDataUpdate = resUpdatePostTempl?.data?.updateTemplate;
    const { data: getUpatedPostData } = await GetTemplateById(postTemplateId);
    const newTemplateData = getUpatedPostData?.lookup.template;
    // Assert
    expect(newTemplateData).toEqual(
      expect.objectContaining({
        id: postDataUpdate?.id,
        profile: expect.objectContaining({
          displayName: postDataUpdate?.profile.displayName,
          description: postDataUpdate?.profile.description,
        }),
        postDefaultDescription: postDataUpdate?.postDefaultDescription,
      })
    );
  });

  test('Delete Post template', async () => {
    // Arrange
    const resCreatePostTempl = await createPostTemplate(
      baseScenario.space.templateSetId
    );
    postTemplateId = resCreatePostTempl?.data?.createTemplate.id ?? '';
    const countBefore = await getPostTemplatesCountForSpace(
      baseScenario.space.id
    );

    // Act
    const remove = await deleteTemplate(postTemplateId);
    const countAfter = await getPostTemplatesCountForSpace(
      baseScenario.space.id
    );

    // Assert
    expect(countAfter).toEqual(countBefore - 1);
    expect(remove?.data?.deleteTemplate.id).toEqual(postTemplateId);
  });
});

describe('Post templates - Utilization in posts', () => {
  beforeAll(async () => {
    const resCreatePostTempl = await createPostTemplate(
      baseScenario.space.templateSetId
    );
    postTemplateId = resCreatePostTempl?.data?.createTemplate.id ?? '';
  });

  afterEach(async () => {
    await deleteTemplate(postTemplateId);
  });

  describe('Create post on all entities with newly created postTemplate', () => {
    afterAll(async () => {
      await deletePost(spacePostId);
      await deletePost(subspacePostId);
      await deletePost(subsubspacePostId);
    });

    test('Create Post on Space', async () => {
      // Act
      const resPostonSpace = await createPostOnCallout(
        baseScenario.space.collaboration.calloutPostId,
        { displayName: `new-temp-d-name-${uniqueId}` },
        `new-temp-n-id-${uniqueId}`
      );
      const postDataCreate =
        resPostonSpace.data?.createContributionOnCallout.post;
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

      const postsData = await getDataPerSpaceCallout(
        baseScenario.space.id,
        baseScenario.space.collaboration.calloutPostId
      );
      const data =
        postsData.data?.lookup?.space?.collaboration?.calloutsSet.callouts?.[0].contributions?.find(
          (c: { post?: { id: string } }) => c.post && c.post.id === spacePostId
        )?.post;

      // Assert
      expect(data).toEqual(postDataCreate);
    });

    test('Create Post on Subspace', async () => {
      // Act
      const res = await createPostOnCallout(
        baseScenario.subspace.collaboration.calloutPostId,
        { displayName: `new-temp-d-name-${uniqueId}` },
        `new-temp-n-id-${uniqueId}`
      );
      const postDataCreate = res.data?.createContributionOnCallout.post;
      subspacePostId = res.data?.createContributionOnCallout.post?.id ?? '';

      const postsData = await getPostData(subspacePostId);

      // Assert
      expect(postsData.data?.lookup.post).toEqual(postDataCreate);
    });

    test('Create Post on Subsubspace', async () => {
      // Act
      const res = await createPostOnCallout(
        baseScenario.subsubspace.collaboration.calloutPostId,
        { displayName: `new-temp-d-name-${uniqueId}` },
        `new-temp-n-id-${uniqueId}`
      );
      const postDataCreate = res.data?.createContributionOnCallout.post;
      subsubspacePostId = res.data?.createContributionOnCallout.post?.id ?? '';

      const postsData = await getPostData(subsubspacePostId);

      // Assert
      expect(postsData.data?.lookup.post).toEqual(postDataCreate);
    });
  });

  describe('Update Post template already utilized by an post', () => {
    let postDataCreate: PostDataFragment | undefined;
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCallout(
        baseScenario.space.collaboration.calloutPostId,
        { displayName: `new-asp-d-name-${uniqueId}` },
        `new-asp-n-id-${uniqueId}`
      );
      postDataCreate = resPostonSpace.data?.createContributionOnCallout.post;
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
    });
    afterAll(async () => {
      await deletePost(spacePostId);
    });
    test('Create post with existing post template, and update template defaultDescription, doesnt change the post description', async () => {
      // Act
      await updatePostTemplate(
        postTemplateId,
        'update title',
        'update description',
        'update default description - Updated'
      );

      const postsData = await getDataPerSpaceCallout(
        baseScenario.space.id,
        baseScenario.space.collaboration.calloutPostId
      );
      const data =
        postsData.data?.lookup?.space?.collaboration?.calloutsSet.callouts?.[0].contributions?.find(
          (c: { post?: { id: string } }) => c.post && c.post.id === spacePostId
        )?.post;

      // Assert
      expect(data).toEqual(postDataCreate);
    });

    test('Update post to use the new post template type', async () => {
      // Act

      const resPostonSpace = await updatePost(spacePostId, postNameID, {
        profileData: { displayName: postDisplayName + 'EA update' },
      });
      const postDataUpdate = resPostonSpace.data?.updatePost;
      spacePostId = resPostonSpace.data?.updatePost.id ?? '';

      const postsData = await getDataPerSpaceCallout(
        baseScenario.space.id,
        baseScenario.space.collaboration.calloutPostId
      );
      const data =
        postsData.data?.lookup?.space?.collaboration?.calloutsSet.callouts?.[0].contributions?.find(
          (c: { post?: { id: string } }) => c.post && c.post.id === spacePostId
        )?.post;

      // Assert
      expect(data).toEqual(postDataUpdate);
    });
  });

  describe('Remove Post template already utilized by an post', () => {
    let postDataCreate: PostDataFragment | undefined;
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCallout(
        baseScenario.space.collaboration.calloutPostId,
        {
          displayName: postDisplayName + `rem-temp-asp-d-n-${uniqueId}`,
        },
        `rem-temp-asp-n-id-${uniqueId}`
      );
      postDataCreate = resPostonSpace.data?.createContributionOnCallout.post;
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
    });
    afterAll(async () => {
      await deletePost(spacePostId);
    });
    test('Create post with existing post template, and remove the post template, doesnt change the post', async () => {
      // Act
      await deleteTemplate(postTemplateId);

      const postsData = await getDataPerSpaceCallout(
        baseScenario.space.id,
        baseScenario.space.collaboration.calloutPostId
      );
      const data =
        postsData.data?.lookup?.space?.collaboration?.calloutsSet.callouts?.[0].contributions?.find(
          (c: { post?: { id: string } }) => c.post && c.post.id === spacePostId
        )?.post;

      // Assert
      expect(data).toEqual(postDataCreate);
    });
  });
});

describe('Post templates - CRUD Authorization', () => {
  beforeAll(async () => {
    await TestSetupUtils.assignUsersToRoles(
      baseScenario.space.community.roleSetId,
      0
    );
    await assignRoleToUser(
      TestUserManager.users.spaceAdmin.id,
      baseScenario.space.community.roleSetId,
      RoleName.Admin
    );
  });
  describe('Post templates - Create', () => {
    describe('DDT user privileges to create space post template - positive', () => {
      // Arrange
      afterEach(async () => {
        await deleteTemplate(postTemplateId);
      });
      test.each`
        userRole
        ${TestUser.GLOBAL_ADMIN}
        ${TestUser.SPACE_ADMIN}
      `(
        'User: "$userRole" get message: "$message", when intend to create space post template ',
        async ({ userRole }) => {
          // Act
          const resCreatePostTempl = await createPostTemplate(
            baseScenario.space.templateSetId,
            'test default description',
            'test title',
            'test description',
            userRole
          );
          const postTemoplateData = resCreatePostTempl?.data?.createTemplate;
          postTemplateId = postTemoplateData?.id ?? '';
        }
      );
    });

    describe('DDT user privileges to create space post template - negative', () => {
      // Arrange
      test.each`
        userRole                     | message
        ${TestUser.SPACE_MEMBER}     | ${errorAuthCreatePostTemplate}
        ${TestUser.NON_SPACE_MEMBER} | ${errorAuthCreatePostTemplate}
      `(
        'User: "$userRole" get message: "$message", when intend to create space post template ',
        async ({ userRole, message }) => {
          // Act
          const resCreatePostTempl = await createPostTemplate(
            baseScenario.space.templateSetId,
            'test default description',
            'test title',
            'test description',
            userRole
          );

          // Assert
          expect(resCreatePostTempl.error?.errors[0].message).toContain(
            message
          );
        }
      );
    });
  });

  describe('Post templates - Update', () => {
    beforeAll(async () => {
      const resCreatePostTempl = await createPostTemplate(
        baseScenario.space.templateSetId
      );
      postTemplateId = resCreatePostTempl?.data?.createTemplate.id ?? '';
    });
    afterAll(async () => {
      await deleteTemplate(postTemplateId);
    });
    describe('DDT user privileges to update space post template - positive', () => {
      // Arrange

      test.each`
        userRole
        ${TestUser.GLOBAL_ADMIN}
        ${TestUser.SPACE_ADMIN}
      `(
        'User: "$userRole" get message: "$message", when intend to update space post template ',
        async ({ userRole }) => {
          // Act
          const resUpdatePostTempl = await updatePostTemplate(
            postTemplateId,
            'update title',
            'update description',
            'update default description test',
            userRole
          );

          // Assert
          expect(
            resUpdatePostTempl.data?.updateTemplate.postDefaultDescription
          ).toContain('update default description test');
        }
      );

      test.each`
        userRole                     | message
        ${TestUser.SPACE_MEMBER}     | ${errorAuthUpdatePostTemplate}
        ${TestUser.NON_SPACE_MEMBER} | ${errorAuthUpdatePostTemplate}
      `(
        'User: "$userRole" get message: "$message", when intend to update space post template ',
        async ({ userRole, message }) => {
          // Act
          const resUpdatePostTempl = await updatePostTemplate(
            postTemplateId,
            'update default description',
            'update title',
            'update description',
            userRole
          );

          // Assert
          expect(resUpdatePostTempl?.error?.errors[0].message).toContain(
            message
          );
        }
      );
    });
  });

  describe('Post templates - Remove', () => {
    describe('DDT user privileges to remove space post template - positive', () => {
      // Arrange
      afterEach(async () => {
        await deleteTemplate(postTemplateId);
      });
      test.each`
        userRole
        ${TestUser.GLOBAL_ADMIN}
        ${TestUser.SPACE_ADMIN}
      `(
        'User: "$userRole" get message: "$message", whe intend to remova space post template ',
        async ({ userRole }) => {
          // Act
          const resCreatePostTempl = await createPostTemplate(
            baseScenario.space.templateSetId
          );
          postTemplateId = resCreatePostTempl?.data?.createTemplate.id ?? '';

          const removeRes = await deleteTemplate(postTemplateId, userRole);

          // Assert
          expect(removeRes?.data?.deleteTemplate?.id).toEqual(
            resCreatePostTempl.data?.createTemplate.id
          );
        }
      );

      test.each`
        userRole                     | message
        ${TestUser.SPACE_MEMBER}     | ${errorAuthDeleteTemplate}
        ${TestUser.NON_SPACE_MEMBER} | ${errorAuthDeleteTemplate}
      `(
        'User: "$userRole" get message: "$message", whe intend to remova space post template ',
        async ({ userRole, message }) => {
          // Act
          const resCreatePostTempl = await createPostTemplate(
            baseScenario.space.templateSetId
          );
          postTemplateId = resCreatePostTempl?.data?.createTemplate.id ?? '';

          const removeRes = await deleteTemplate(postTemplateId, userRole);

          // Assert
          expect(removeRes?.error?.errors[0].message).toContain(message);
        }
      );
    });
  });
});

describe('Post templates - Negative Scenarios', () => {
  afterEach(async () => {
    await deleteTemplate(postTemplateId);
  });

  test('Delete non existent Post template', async () => {
    // Act

    const res = await deleteTemplate('0bade07d-6736-4ee2-93c0-b2af22a998ff');
    expect(res.error?.errors[0].message).toContain(errorNoPostTemplate);
  });
});
