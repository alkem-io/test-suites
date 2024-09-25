import '@test/utils/array.matcher';
import {
  createPostTemplateCodegen,
  getPostTemplatesCountForSpace,
  updatePostTemplateCodegen,
  deletePostTemplateCodegen,
} from './post-template.request.params';
import { deleteSpace } from '@test/functional-api/journey/space/space.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import {
  errorAuthCreatePostTemplate,
  errorAuthDeletePostTemplate,
  errorAuthUpdatePostTemplate,
  errorNoPostTemplate,
} from './post-template-testdata';
import {
  assignUsersToSpaceAndOrgCodegen,
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpace,
} from '@test/utils/data-setup/entities';
import { PostDataFragment } from '@test/generated/alkemio-schema';
import {
  deletePostCodegen,
  createPostOnCalloutCodegen,
  getDataPerSpaceCalloutCodegen,
  updatePostCodegen,
  getPostDataCodegen,
} from '../../callout/post/post.request.params';
import { GetTemplateById } from '@test/functional-api/templates/template.request.params';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { entitiesId } from '@test/functional-api/roleset/communications-helper';

let opportunityName = 'post-opp';
let challengeName = 'post-chal';
let spacePostId = '';
let challengePostId = '';
let opportunityPostId = '';
let postNameID = '';
let postDisplayName = '';
const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const spaceName = 'post-eco-name' + uniqueId;
const spaceNameId = 'post-eco-nameid' + uniqueId;
let postTemplateId = '';

beforeAll(async () => {
  await createOrgAndSpace(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);
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
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});

describe('Post templates - CRUD', () => {
  const typeFromSpacetemplate = 'testType';
  afterEach(async () => {
    await deletePostTemplateCodegen(postTemplateId);
  });
  test('Create Post template', async () => {
    // Arrange
    const countBefore = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Act
    const resCreatePostTempl = await createPostTemplateCodegen(
      entitiesId.space.templateSetId
    );
    const postDataCreate = resCreatePostTempl?.data?.createTemplate;
    postTemplateId = postDataCreate?.id ?? '';
    const countAfter = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    const getTemplate = await GetTemplateById(postTemplateId);
    const templateData = getTemplate?.data?.lookup.template;

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(postDataCreate).toEqual(
      expect.objectContaining({
        id: templateData?.id,
        type: templateData?.type,
      })
    );
  });

  test('Update Post template', async () => {
    // Arrange
    const resCreatePostTempl = await createPostTemplateCodegen(
      entitiesId.space.templateSetId
    );
    postTemplateId = resCreatePostTempl?.data?.createTemplate.id ?? '';

    // Act
    const resUpdatePostTempl = await updatePostTemplateCodegen(
      postTemplateId,
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
    const resCreatePostTempl = await createPostTemplateCodegen(
      entitiesId.space.templateSetId
    );
    postTemplateId = resCreatePostTempl?.data?.createTemplate.id ?? '';
    const countBefore = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Act
    const remove = await deletePostTemplateCodegen(postTemplateId);
    const countAfter = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Assert
    expect(countAfter).toEqual(countBefore - 1);
    expect(remove?.data?.deleteTemplate.id).toEqual(postTemplateId);
  });
});

describe('Post templates - Utilization in posts', () => {
  beforeAll(async () => {
    const resCreatePostTempl = await createPostTemplateCodegen(
      entitiesId.space.templateId
    );
    postTemplateId = resCreatePostTempl?.data?.createTemplate.id ?? '';
  });

  afterEach(async () => {
    await deletePostTemplateCodegen(postTemplateId);
  });

  describe('Create post on all entities with newly created postTemplate', () => {
    afterAll(async () => {
      await deletePostCodegen(spacePostId);
      await deletePostCodegen(challengePostId);
      await deletePostCodegen(opportunityPostId);
    });

    test('Create Post on Space', async () => {
      // Act
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.space.calloutId,
        { displayName: `new-temp-d-name-${uniqueId}` },
        `new-temp-n-id-${uniqueId}`
      );
      const postDataCreate =
        resPostonSpace.data?.createContributionOnCallout.post;
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

      const postsData = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.space.calloutId
      );
      const data = postsData.data?.space.collaboration?.callouts?.[0].contributions?.find(
        c => c.post && c.post.id === spacePostId
      )?.post;

      // Assert
      expect(data).toEqual(postDataCreate);
    });

    test('Create Post on Challenge', async () => {
      // Act
      const res = await createPostOnCalloutCodegen(
        entitiesId.challenge.calloutId,
        { displayName: `new-temp-d-name-${uniqueId}` },
        `new-temp-n-id-${uniqueId}`
      );
      const postDataCreate = res.data?.createContributionOnCallout.post;
      challengePostId = res.data?.createContributionOnCallout.post?.id ?? '';

      const postsData = await getPostDataCodegen(challengePostId);

      // Assert
      expect(postsData.data?.lookup.post).toEqual(postDataCreate);
    });

    test('Create Post on Opportunity', async () => {
      // Act
      const res = await createPostOnCalloutCodegen(
        entitiesId.opportunity.calloutId,
        { displayName: `new-temp-d-name-${uniqueId}` },
        `new-temp-n-id-${uniqueId}`
      );
      const postDataCreate = res.data?.createContributionOnCallout.post;
      opportunityPostId = res.data?.createContributionOnCallout.post?.id ?? '';

      const postsData = await getPostDataCodegen(opportunityPostId);

      // Assert
      expect(postsData.data?.lookup.post).toEqual(postDataCreate);
    });
  });

  describe('Update Post template already utilized by an post', () => {
    let postDataCreate: PostDataFragment | undefined;
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.space.calloutId,
        { displayName: `new-asp-d-name-${uniqueId}` },
        `new-asp-n-id-${uniqueId}`
      );
      postDataCreate = resPostonSpace.data?.createContributionOnCallout.post;
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
    });
    afterAll(async () => {
      await deletePostCodegen(spacePostId);
    });
    test('Create post with existing post template, and update template defaultDescription, doesnt change the post description', async () => {
      // Act
      await updatePostTemplateCodegen(
        postTemplateId,
        'update default description - Updated'
      );

      const postsData = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.space.calloutId
      );
      const data = postsData.data?.space?.collaboration?.callouts?.[0].contributions?.find(
        c => c.post && c.post.id === spacePostId
      )?.post;

      // Assert
      expect(data).toEqual(postDataCreate);
    });

    test('Update post to use the new post template type', async () => {
      // Act

      const resPostonSpace = await updatePostCodegen(spacePostId, postNameID, {
        profileData: { displayName: postDisplayName + 'EA update' },
      });
      const postDataUpdate = resPostonSpace.data?.updatePost;
      spacePostId = resPostonSpace.data?.updatePost.id ?? '';

      const postsData = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.space.calloutId
      );
      const data = postsData.data?.space?.collaboration?.callouts?.[0].contributions?.find(
        c => c.post && c.post.id === spacePostId
      )?.post;

      // Assert
      expect(data).toEqual(postDataUpdate);
    });
  });

  describe('Remove Post template already utilized by an post', () => {
    let postDataCreate: PostDataFragment | undefined;
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.space.calloutId,
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
      await deletePostCodegen(spacePostId);
    });
    test('Create post with existing post template, and remove the post template, doesnt change the post', async () => {
      // Act
      await deletePostTemplateCodegen(postTemplateId);

      const postsData = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.space.calloutId
      );
      const data = postsData.data?.space?.collaboration?.callouts?.[0].contributions?.find(
        c => c.post && c.post.id === spacePostId
      )?.post;

      // Assert
      expect(data).toEqual(postDataCreate);
    });
  });
});

describe('Post templates - CRUD Authorization', () => {
  beforeAll(async () => {
    await assignUsersToSpaceAndOrgCodegen();
  });
  describe('Post templates - Create', () => {
    describe('DDT user privileges to create space post template - positive', () => {
      // Arrange
      afterEach(async () => {
        await deletePostTemplateCodegen(postTemplateId);
      });
      test.each`
        userRole
        ${TestUser.GLOBAL_ADMIN}
        ${TestUser.HUB_ADMIN}
      `(
        'User: "$userRole" get message: "$message", when intend to create space post template ',
        async ({ userRole }) => {
          // Act
          const resCreatePostTempl = await createPostTemplateCodegen(
            entitiesId.space.templateSetId,
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
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${errorAuthCreatePostTemplate}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthCreatePostTemplate}
      `(
        'User: "$userRole" get message: "$message", when intend to create space post template ',
        async ({ userRole, message }) => {
          // Act
          const resCreatePostTempl = await createPostTemplateCodegen(
            entitiesId.space.templateSetId,
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
      const resCreatePostTempl = await createPostTemplateCodegen(
        entitiesId.space.templateSetId
      );
      postTemplateId = resCreatePostTempl?.data?.createTemplate.id ?? '';
    });
    afterAll(async () => {
      await deletePostTemplateCodegen(postTemplateId);
    });
    describe('DDT user privileges to update space post template - positive', () => {
      // Arrange

      test.each`
        userRole
        ${TestUser.GLOBAL_ADMIN}
        ${TestUser.HUB_ADMIN}
      `(
        'User: "$userRole" get message: "$message", when intend to update space post template ',
        async ({ userRole }) => {
          // Act
          const resUpdatePostTempl = await updatePostTemplateCodegen(
            postTemplateId,
            'update default description test',
            'update title',
            'update description',
            userRole
          );

          // Assert
          expect(
            resUpdatePostTempl.data?.updateTemplate.postDefaultDescription
          ).toContain('update default description test');
        }
      );

      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${errorAuthUpdatePostTemplate}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthUpdatePostTemplate}
      `(
        'User: "$userRole" get message: "$message", when intend to update space post template ',
        async ({ userRole, message }) => {
          // Act
          const resUpdatePostTempl = await updatePostTemplateCodegen(
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
        await deletePostTemplateCodegen(postTemplateId);
      });
      test.each`
        userRole
        ${TestUser.GLOBAL_ADMIN}
        ${TestUser.HUB_ADMIN}
      `(
        'User: "$userRole" get message: "$message", whe intend to remova space post template ',
        async ({ userRole }) => {
          // Act
          const resCreatePostTempl = await createPostTemplateCodegen(
            entitiesId.space.templateSetId
          );
          postTemplateId = resCreatePostTempl?.data?.createTemplate.id ?? '';

          const removeRes = await deletePostTemplateCodegen(
            postTemplateId,
            userRole
          );

          // Assert
          expect(removeRes?.data?.deleteTemplate?.id).toEqual(
            resCreatePostTempl.data?.createTemplate.id
          );
        }
      );

      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${errorAuthDeletePostTemplate}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthDeletePostTemplate}
      `(
        'User: "$userRole" get message: "$message", whe intend to remova space post template ',
        async ({ userRole, message }) => {
          // Act
          const resCreatePostTempl = await createPostTemplateCodegen(
            entitiesId.space.templateSetId
          );
          postTemplateId = resCreatePostTempl?.data?.createTemplate.id ?? '';

          const removeRes = await deletePostTemplateCodegen(
            postTemplateId,
            userRole
          );

          // Assert
          expect(removeRes?.error?.errors[0].message).toContain(message);
        }
      );
    });
  });
});

describe('Post templates - Negative Scenarios', () => {
  afterEach(async () => {
    await deletePostTemplateCodegen(postTemplateId);
  });

  test('Delete non existent Post template', async () => {
    // Act

    const res = await deletePostTemplateCodegen(
      '0bade07d-6736-4ee2-93c0-b2af22a998ff'
    );
    expect(res.error?.errors[0].message).toContain(errorNoPostTemplate);
  });
});
