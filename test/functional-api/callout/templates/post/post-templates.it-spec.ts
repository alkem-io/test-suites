import '@test/utils/array.matcher';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import {
  createPostTemplateCodegen,
  getPostTemplateForSpaceByPostType,
  getPostTemplatesCountForSpace,
  updatePostTemplateCodegen,
  deletePostTemplateCodegen,
} from './post-template.request.params';
import { deleteOpportunityCodegen } from '@test/functional-api/journey/opportunity/opportunity.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import {
  errorAuthCreatePostTemplate,
  errorAuthDeletePostTemplate,
  errorAuthUpdatePostTemplate,
  errorDuplicatePostType,
  errorNoPostTemplate,
} from './post-template-testdata';
import {
  assignUsersToSpaceAndOrgCodegen,
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { PostDataFragment } from '@test/generated/alkemio-schema';
import {
  deletePostCodegen,
  createPostOnCalloutCodegen,
  getDataPerSpaceCalloutCodegen,
  getDataPerChallengeCalloutCodegen,
  getDataPerOpportunityCalloutCodegen,
  updatePostCodegen,
} from '../../post/post.request.params';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';

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
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);
});

afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunityId);
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
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
      entitiesId.spaceTemplateId,
      typeFromSpacetemplate
    );
    const postDataCreate = resCreatePostTempl?.data?.createPostTemplate;
    postTemplateId = postDataCreate?.id ?? '';
    const countAfter = await getPostTemplatesCountForSpace(entitiesId.spaceId);
    const getCreatedPostData = await getPostTemplateForSpaceByPostType(
      entitiesId.spaceId,
      typeFromSpacetemplate
    );

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(getCreatedPostData).toEqual([postDataCreate]);
  });

  test('Update Post template', async () => {
    // Arrange
    const resCreatePostTempl = await createPostTemplateCodegen(
      entitiesId.spaceTemplateId,
      typeFromSpacetemplate
    );
    postTemplateId = resCreatePostTempl?.data?.createPostTemplate.id ?? '';

    // Act
    const resUpdatePostTempl = await updatePostTemplateCodegen(
      postTemplateId,
      typeFromSpacetemplate + ' - Update'
    );

    const postDataUpdate = resUpdatePostTempl?.data?.updatePostTemplate;
    const getUpatedPostData = await getPostTemplateForSpaceByPostType(
      entitiesId.spaceId,
      typeFromSpacetemplate + ' - Update'
    );

    // Assert
    expect(getUpatedPostData).toEqual([postDataUpdate]);
  });

  test('Delete Post template', async () => {
    // Arrange
    const resCreatePostTempl = await createPostTemplateCodegen(
      entitiesId.spaceTemplateId,
      typeFromSpacetemplate
    );
    postTemplateId = resCreatePostTempl?.data?.createPostTemplate.id ?? '';
    const countBefore = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Act
    const remove = await deletePostTemplateCodegen(postTemplateId);
    const countAfter = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Assert
    expect(countAfter).toEqual(countBefore - 1);
    expect(remove?.data?.deletePostTemplate.type).toEqual(
      typeFromSpacetemplate
    );
  });
});

describe('Post templates - Utilization in posts', () => {
  const templateType = 'testType';
  beforeAll(async () => {
    const resCreatePostTempl = await createPostTemplateCodegen(
      entitiesId.spaceTemplateId,
      templateType
    );
    postTemplateId = resCreatePostTempl?.data?.createPostTemplate.id ?? '';
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
        entitiesId.spaceCalloutId,
        { displayName: `new-temp-d-name-${uniqueId}` },
        `new-temp-n-id-${uniqueId}`,
        templateType
      );
      const postDataCreate =
        resPostonSpace.data?.createContributionOnCallout.post;
      const postType =
        resPostonSpace.data?.createContributionOnCallout.post?.type;
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';

      const postsData = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId
      );
      const data = postsData.data?.space.collaboration?.callouts?.[0].contributions?.find(
        c => c.post && c.post.id === spacePostId
      )?.post;

      // Assert
      expect(postType).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });

    test('Create Post on Challenge', async () => {
      // Act
      const res = await createPostOnCalloutCodegen(
        entitiesId.challengeCalloutId,
        { displayName: `new-temp-d-name-${uniqueId}` },
        `new-temp-n-id-${uniqueId}`,
        templateType
      );
      const postDataCreate = res.data?.createContributionOnCallout.post;
      const postType = res.data?.createContributionOnCallout.post?.type;
      challengePostId = res.data?.createContributionOnCallout.post?.id ?? '';

      const postsData = await getDataPerChallengeCalloutCodegen(
        entitiesId.challengeId,
        entitiesId.challengeCalloutId
      );
      const data = postsData.data?.lookup.challenge?.collaboration?.callouts?.[0].contributions?.find(
        c => c.post && c.post.id === challengePostId
      )?.post;

      // Assert
      expect(postType).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });

    test('Create Post on Opportunity', async () => {
      // Act
      const res = await createPostOnCalloutCodegen(
        entitiesId.opportunityCalloutId,
        { displayName: `new-temp-d-name-${uniqueId}` },
        `new-temp-n-id-${uniqueId}`,
        templateType
      );
      const postDataCreate = res.data?.createContributionOnCallout.post;
      const postType = res.data?.createContributionOnCallout.post?.type;
      opportunityPostId = res.data?.createContributionOnCallout.post?.id ?? '';

      const postsData = await getDataPerOpportunityCalloutCodegen(
        entitiesId.opportunityId,
        entitiesId.opportunityCalloutId
      );
      const data = postsData.data?.lookup.opportunity?.collaboration?.callouts?.[0].contributions?.find(
        c => c.post && c.post.id === opportunityPostId
      )?.post;

      // Assert
      expect(postType).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });
  });

  describe('Update Post template already utilized by an post', () => {
    let postDataCreate: PostDataFragment | undefined;
    let postType = '';
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.spaceCalloutId,
        { displayName: `new-asp-d-name-${uniqueId}` },
        `new-asp-n-id-${uniqueId}`,
        templateType
      );
      postDataCreate = resPostonSpace.data?.createContributionOnCallout.post;
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postType =
        resPostonSpace.data?.createContributionOnCallout.post?.type ?? '';
    });
    afterAll(async () => {
      await deletePostCodegen(spacePostId);
    });
    test('Create post with existing post template, and update template type, doesnt change the post type', async () => {
      // Act
      await updatePostTemplateCodegen(
        postTemplateId,
        templateType + ' - Update'
      );

      const postsData = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId
      );
      const data = postsData.data?.space?.collaboration?.callouts?.[0].contributions?.find(
        c => c.post && c.post.id === spacePostId
      )?.post;

      // Assert
      expect(postType).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });

    test('Update post to use the new post template type', async () => {
      // Act

      const resPostonSpace = await updatePostCodegen(
        spacePostId,
        postNameID,
        { profileData: { displayName: postDisplayName + 'EA update' } },
        templateType + ' - Update'
      );
      const postDataUpdate = resPostonSpace.data?.updatePost;
      const postTypeFromSpaceTemplate = resPostonSpace.data?.updatePost.type;
      spacePostId = resPostonSpace.data?.updatePost.id ?? '';

      const postsData = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId
      );
      const data = postsData.data?.space?.collaboration?.callouts?.[0].contributions?.find(
        c => c.post && c.post.id === spacePostId
      )?.post;

      // Assert
      expect(postTypeFromSpaceTemplate).toEqual(templateType + ' - Update');
      expect(data).toEqual(postDataUpdate);
    });
  });

  describe('Remove Post template already utilized by an post', () => {
    let postDataCreate: PostDataFragment | undefined;
    let postTypeFromSpaceTemplate = '';
    beforeAll(async () => {
      const resPostonSpace = await createPostOnCalloutCodegen(
        entitiesId.spaceCalloutId,
        {
          displayName: postDisplayName + `rem-temp-asp-d-n-${uniqueId}`,
        },
        `rem-temp-asp-n-id-${uniqueId}`,
        templateType
      );
      postDataCreate = resPostonSpace.data?.createContributionOnCallout.post;
      spacePostId =
        resPostonSpace.data?.createContributionOnCallout.post?.id ?? '';
      postTypeFromSpaceTemplate =
        resPostonSpace.data?.createContributionOnCallout.post?.type ?? '';
    });
    afterAll(async () => {
      await deletePostCodegen(spacePostId);
    });
    test('Create post with existing post template, and remove the post template, doesnt change the post type', async () => {
      // Act
      await deletePostTemplateCodegen(postTemplateId);

      const postsData = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId
      );
      const data = postsData.data?.space?.collaboration?.callouts?.[0].contributions?.find(
        c => c.post && c.post.id === spacePostId
      )?.post;

      // Assert
      expect(postTypeFromSpaceTemplate).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });
  });
});

describe('Post templates - CRUD Authorization', () => {
  const templateType = 'testTemplateType';
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
        userRole                 | templateTypes
        ${TestUser.GLOBAL_ADMIN} | ${'GA type'}
        ${TestUser.HUB_ADMIN}    | ${'HA type'}
      `(
        'User: "$userRole" get message: "$message", when intend to create space post template ',
        async ({ userRole, templateTypes }) => {
          // Act
          const resCreatePostTempl = await createPostTemplateCodegen(
            entitiesId.spaceTemplateId,
            templateTypes,
            'test default description',
            'test title',
            'test description',
            userRole
          );
          const postTemoplateData =
            resCreatePostTempl?.data?.createPostTemplate;
          postTemplateId = postTemoplateData?.id ?? '';

          // Assert
          expect(postTemoplateData?.type).toContain(templateTypes);
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
            entitiesId.spaceTemplateId,
            templateType,
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
    const typeFromSpacetemplate = 'test template';
    beforeAll(async () => {
      const resCreatePostTempl = await createPostTemplateCodegen(
        entitiesId.spaceTemplateId,
        templateType
      );
      postTemplateId = resCreatePostTempl?.data?.createPostTemplate.id ?? '';
    });
    afterAll(async () => {
      await deletePostTemplateCodegen(postTemplateId);
    });
    const templateType = 'testTemplateType';
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
            typeFromSpacetemplate + ' - Update',
            'update default description',
            'update title',
            'update description',
            userRole
          );

          // Assert
          expect(resUpdatePostTempl.data?.updatePostTemplate.type).toContain(
            typeFromSpacetemplate + ' - Update'
          );
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
            typeFromSpacetemplate + ' - Update',
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
        userRole                 | templateTypes
        ${TestUser.GLOBAL_ADMIN} | ${'GA type'}
        ${TestUser.HUB_ADMIN}    | ${'HA type'}
      `(
        'User: "$userRole" get message: "$message", whe intend to remova space post template ',
        async ({ userRole, templateTypes }) => {
          // Act
          const resCreatePostTempl = await createPostTemplateCodegen(
            entitiesId.spaceTemplateId,
            templateTypes
          );
          postTemplateId =
            resCreatePostTempl?.data?.createPostTemplate.id ?? '';

          const removeRes = await deletePostTemplateCodegen(
            postTemplateId,
            userRole
          );

          // Assert
          expect(removeRes?.data?.deletePostTemplate?.type).toContain(
            templateTypes
          );
        }
      );

      test.each`
        userRole                   | templateTypes    | message
        ${TestUser.HUB_MEMBER}     | ${'HM type'}     | ${errorAuthDeletePostTemplate}
        ${TestUser.NON_HUB_MEMBER} | ${'Non-HM type'} | ${errorAuthDeletePostTemplate}
      `(
        'User: "$userRole" get message: "$message", whe intend to remova space post template ',
        async ({ userRole, templateTypes, message }) => {
          // Act
          const resCreatePostTempl = await createPostTemplateCodegen(
            entitiesId.spaceTemplateId,
            templateTypes
          );
          postTemplateId =
            resCreatePostTempl?.data?.createPostTemplate.id ?? '';

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
  const typeFromSpacetemplate = 'testType';
  afterEach(async () => {
    await deletePostTemplateCodegen(postTemplateId);
  });
  // Disabled due to bug: BUG: Missing validation - 2 post templates can be created with same type for the same space #2009
  test('Create Post template with same type', async () => {
    // Arrange
    const countBefore = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Act
    const resCreatePostTempl1 = await createPostTemplateCodegen(
      entitiesId.spaceTemplateId,
      typeFromSpacetemplate
    );
    postTemplateId = resCreatePostTempl1?.data?.createPostTemplate.id ?? '';

    const resCreatePostTempl2 = await createPostTemplateCodegen(
      entitiesId.spaceTemplateId,
      typeFromSpacetemplate
    );
    const countAfter = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(resCreatePostTempl2.error?.errors[0].message).toContain(
      errorDuplicatePostType
    );
  });

  test('Update Post template type to empty value - remains the same type', async () => {
    // Arrange
    const resCreatePostTempl = await createPostTemplateCodegen(
      entitiesId.spaceTemplateId,
      typeFromSpacetemplate
    );
    postTemplateId = resCreatePostTempl?.data?.createPostTemplate.id ?? '';

    // Act
    await updatePostTemplateCodegen(postTemplateId, '');

    const getUpatedPostData = await getPostTemplateForSpaceByPostType(
      entitiesId.spaceId,
      ''
    );
    await getPostTemplateForSpaceByPostType(
      entitiesId.spaceId,
      typeFromSpacetemplate
    );

    // Assert
    expect(getUpatedPostData).toHaveLength(0);
  });

  test('Delete non existent Post template', async () => {
    // Act

    const res = await deletePostTemplateCodegen(
      '0bade07d-6736-4ee2-93c0-b2af22a998ff'
    );
    expect(res.error?.errors[0].message).toContain(errorNoPostTemplate);
  });
});