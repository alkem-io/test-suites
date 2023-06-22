import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  removePost,
  updatePost,
  createPostTemplate,
  getPostTemplateForSpaceByPostType,
  getPostTemplatesCountForSpace,
  deletePostTemplate,
  updatePostTemplate,
  createPostNewType,
  createPostTemplateNoType,
  getDataPerSpaceCallout,
  getDataPerChallengeCallout,
  getDataPerOpportunityCallout,
} from './post.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeSpace } from '../space/space.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import {
  assignUsersToSpaceAndOrg,
  createChallengeForOrgSpace,
  createOpportunityForChallenge,
  createOrgAndSpace,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import {
  errorAuthCreatePostTemplate,
  errorAuthDeletePostTemplate,
  errorAuthUpdatePostTemplate,
  errorDuplicatePostType,
  errorNoPostTemplate,
} from './post-template-testdata';

let opportunityName = 'post-opp';
let challengeName = 'post-chal';
let spacePostId = '';
let challengePostId = '';
let opportunityPostId = '';
let postNameID = '';
let postDisplayName = '';
let postDataCreate = '';
const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const spaceName = 'post-eco-name' + uniqueId;
const spaceNameId = 'post-eco-nameid' + uniqueId;
let postTemplateId = '';

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await createChallengeForOrgSpace(challengeName);
  await createOpportunityForChallenge(opportunityName);
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
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});

describe('Post templates - CRUD', () => {
  const typeFromSpacetemplate = 'testType';
  afterEach(async () => {
    await deletePostTemplate(postTemplateId);
  });
  test('Create Post template', async () => {
    // Arrange
    const countBefore = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Act
    const resCreatePostTempl = await createPostTemplate(
      entitiesId.spaceTemplateId,
      typeFromSpacetemplate
    );
    postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;
    const postDataCreate = resCreatePostTempl.body.data.createPostTemplate;
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
    const resCreatePostTempl = await createPostTemplate(
      entitiesId.spaceTemplateId,
      typeFromSpacetemplate
    );
    postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;

    // Act
    const resUpdatePostTempl = await updatePostTemplate(
      postTemplateId,
      typeFromSpacetemplate + ' - Update'
    );

    const postDataUpdate = resUpdatePostTempl.body.data.updatePostTemplate;
    const getUpatedPostData = await getPostTemplateForSpaceByPostType(
      entitiesId.spaceId,
      typeFromSpacetemplate + ' - Update'
    );

    // Assert
    expect(getUpatedPostData).toEqual([postDataUpdate]);
  });

  test('Delete Post template', async () => {
    // Arrange
    const resCreatePostTempl = await createPostTemplate(
      entitiesId.spaceTemplateId,
      typeFromSpacetemplate
    );
    postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;
    const countBefore = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Act
    const remove = await deletePostTemplate(postTemplateId);
    const countAfter = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Assert
    expect(countAfter).toEqual(countBefore - 1);
    expect(remove.body.data.deletePostTemplate.type).toEqual(
      typeFromSpacetemplate
    );
  });
});

describe('Post templates - Utilization in posts', () => {
  const templateType = 'testType';
  beforeAll(async () => {
    const resCreatePostTempl = await createPostTemplate(
      entitiesId.spaceTemplateId,
      templateType
    );
    postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;
  });

  afterEach(async () => {
    await deletePostTemplate(postTemplateId);
  });

  describe('Create post on all entities with newly created postTemplate', () => {
    afterAll(async () => {
      await removePost(spacePostId);
      await removePost(challengePostId);
      await removePost(opportunityPostId);
    });

    test('Create Post on Space', async () => {
      // Act
      const resPostonSpace = await createPostNewType(
        entitiesId.spaceCalloutId,
        templateType,
        `new-temp-n-id-${uniqueId}`,
        { profileData: { displayName: `new-temp-d-name-${uniqueId}` } }
      );
      postDataCreate = resPostonSpace.body.data.createPostOnCallout;
      const postTypeFromSpaceTemplate =
        resPostonSpace.body.data.createPostOnCallout.type;
      spacePostId = resPostonSpace.body.data.createPostOnCallout.id;

      const postsData = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId
      );
      const data = postsData.body.data.space.collaboration.callouts[0].posts[0];

      // Assert
      expect(postTypeFromSpaceTemplate).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });

    test('Create Post on Challenge', async () => {
      // Act
      const res = await createPostNewType(
        entitiesId.challengeCalloutId,
        templateType,
        `new-temp-n-id-${uniqueId}`,
        { profileData: { displayName: `new-temp-d-name-${uniqueId}` } }
      );
      postDataCreate = res.body.data.createPostOnCallout;
      const postTypeFromSpaceTemplate = res.body.data.createPostOnCallout.type;
      challengePostId = res.body.data.createPostOnCallout.id;

      const postsData = await getDataPerChallengeCallout(
        entitiesId.spaceId,
        entitiesId.challengeId,
        entitiesId.challengeCalloutId
      );
      const data =
        postsData.body.data.space.challenge.collaboration.callouts[0].posts[0];

      // Assert
      expect(postTypeFromSpaceTemplate).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });

    test('Create Post on Opportunity', async () => {
      // Act
      const res = await createPostNewType(
        entitiesId.opportunityCalloutId,
        templateType,
        `new-temp-n-id-${uniqueId}`,
        { profileData: { displayName: `new-temp-d-name-${uniqueId}` } }
      );
      postDataCreate = res.body.data.createPostOnCallout;
      const postTypeFromSpaceTemplate = res.body.data.createPostOnCallout.type;
      opportunityPostId = res.body.data.createPostOnCallout.id;

      const postsData = await getDataPerOpportunityCallout(
        entitiesId.spaceId,
        entitiesId.opportunityId,
        entitiesId.opportunityCalloutId
      );
      const data =
        postsData.body.data.space.opportunity.collaboration.callouts[0]
          .posts[0];

      // Assert
      expect(postTypeFromSpaceTemplate).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });
  });

  describe('Update Post template already utilized by an post', () => {
    let postTypeFromSpaceTemplate = '';
    beforeAll(async () => {
      const resPostonSpace = await createPostNewType(
        entitiesId.spaceCalloutId,
        templateType,
        `new-asp-n-id-${uniqueId}`,
        { profileData: { displayName: `new-asp-d-name-${uniqueId}` } }
      );
      postDataCreate = resPostonSpace.body.data.createPostOnCallout;
      spacePostId = resPostonSpace.body.data.createPostOnCallout.id;
      postTypeFromSpaceTemplate =
        resPostonSpace.body.data.createPostOnCallout.type;
    });
    afterAll(async () => {
      await removePost(spacePostId);
    });
    test('Create post with existing post template, and update template type, doesnt change the post type', async () => {
      // Act
      await updatePostTemplate(postTemplateId, templateType + ' - Update');

      const postsData = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId
      );
      const data = postsData.body.data.space.collaboration.callouts[0].posts[0];

      // Assert
      expect(postTypeFromSpaceTemplate).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });

    test('Update post to use the new post template type', async () => {
      // Act

      const resPostonSpace = await updatePost(
        spacePostId,
        postNameID,
        { profileData: { displayName: postDisplayName + 'EA update' } },
        templateType + ' - Update'
      );
      const postDataUpdate = resPostonSpace.body.data.updatePost;
      const postTypeFromSpaceTemplate =
        resPostonSpace.body.data.updatePost.type;
      spacePostId = resPostonSpace.body.data.updatePost.id;

      const postsData = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId
      );
      const data = postsData.body.data.space.collaboration.callouts[0].posts[0];

      // Assert
      expect(postTypeFromSpaceTemplate).toEqual(templateType + ' - Update');
      expect(data).toEqual(postDataUpdate);
    });
  });

  describe('Remove Post template already utilized by an post', () => {
    let postTypeFromSpaceTemplate = '';
    beforeAll(async () => {
      const resPostonSpace = await createPostNewType(
        entitiesId.spaceCalloutId,
        templateType,
        `rem-temp-asp-n-id-${uniqueId}`,
        {
          profileData: {
            displayName: postDisplayName + `rem-temp-asp-d-n-${uniqueId}`,
          },
        }
      );
      postDataCreate = resPostonSpace.body.data.createPostOnCallout;
      spacePostId = resPostonSpace.body.data.createPostOnCallout.id;
      postTypeFromSpaceTemplate =
        resPostonSpace.body.data.createPostOnCallout.type;
    });
    afterAll(async () => {
      await removePost(spacePostId);
    });
    test('Create post with existing post template, and remove the post template, doesnt change the post type', async () => {
      // Act
      await deletePostTemplate(postTemplateId);

      const postsData = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId
      );
      const data = postsData.body.data.space.collaboration.callouts[0].posts[0];

      // Assert
      expect(postTypeFromSpaceTemplate).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });
  });
});

describe('Post templates - CRUD Authorization', () => {
  const templateType = 'testTemplateType';
  beforeAll(async () => {
    await assignUsersToSpaceAndOrg();
  });
  describe('Post templates - Create', () => {
    describe('DDT user privileges to create space post template - positive', () => {
      // Arrange
      afterEach(async () => {
        await deletePostTemplate(postTemplateId);
      });
      test.each`
        userRole                 | templateTypes | message
        ${TestUser.GLOBAL_ADMIN} | ${'GA type'}  | ${'"data":{"createPostTemplate"'}
        ${TestUser.HUB_ADMIN}    | ${'HA type'}  | ${'"data":{"createPostTemplate"'}
      `(
        'User: "$userRole" get message: "$message", when intend to create space post template ',
        async ({ userRole, templateTypes, message }) => {
          // Act
          const resCreatePostTempl = await createPostTemplate(
            entitiesId.spaceTemplateId,
            templateTypes,
            'test default description',
            'test title',
            'test description',
            userRole
          );
          postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;

          // Assert
          expect(resCreatePostTempl.text).toContain(message);
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
          const resCreatePostTempl = await createPostTemplate(
            entitiesId.spaceTemplateId,
            templateType,
            'test default description',
            'test title',
            'test description',
            userRole
          );

          // Assert
          expect(resCreatePostTempl.text).toContain(message);
        }
      );
    });
  });

  describe('Post templates - Update', () => {
    const typeFromSpacetemplate = 'test template';
    beforeAll(async () => {
      const resCreatePostTempl = await createPostTemplate(
        entitiesId.spaceTemplateId,
        templateType
      );
      postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;
    });
    afterAll(async () => {
      await deletePostTemplate(postTemplateId);
    });
    const templateType = 'testTemplateType';
    describe('DDT user privileges to update space post template - positive', () => {
      // Arrange

      test.each`
        userRole                   | message
        ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"updatePostTemplate"'}
        ${TestUser.HUB_ADMIN}      | ${'"data":{"updatePostTemplate"'}
        ${TestUser.HUB_MEMBER}     | ${errorAuthUpdatePostTemplate}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthUpdatePostTemplate}
      `(
        'User: "$userRole" get message: "$message", when intend to update space post template ',
        async ({ userRole, message }) => {
          // Act
          const resUpdatePostTempl = await updatePostTemplate(
            postTemplateId,
            typeFromSpacetemplate + ' - Update',
            'update default description',
            'update title',
            'update description',
            userRole
          );

          // Assert
          expect(resUpdatePostTempl.text).toContain(message);
        }
      );
    });
  });

  describe('Post templates - Remove', () => {
    describe('DDT user privileges to remove space post template - positive', () => {
      // Arrange
      afterEach(async () => {
        await deletePostTemplate(postTemplateId);
      });
      test.each`
        userRole                   | templateTypes    | message
        ${TestUser.GLOBAL_ADMIN}   | ${'GA type'}     | ${'"data":{"deletePostTemplate"'}
        ${TestUser.HUB_ADMIN}      | ${'HA type'}     | ${'"data":{"deletePostTemplate"'}
        ${TestUser.HUB_MEMBER}     | ${'HM type'}     | ${errorAuthDeletePostTemplate}
        ${TestUser.NON_HUB_MEMBER} | ${'Non-HM type'} | ${errorAuthDeletePostTemplate}
      `(
        'User: "$userRole" get message: "$message", whe intend to remova space post template ',
        async ({ userRole, templateTypes, message }) => {
          // Act
          const resCreatePostTempl = await createPostTemplate(
            entitiesId.spaceTemplateId,
            templateTypes
          );
          postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;

          const removeRes = await deletePostTemplate(postTemplateId, userRole);

          // Assert
          expect(removeRes.text).toContain(message);
        }
      );
    });
  });
});

describe('Post templates - Negative Scenarios', () => {
  const typeFromSpacetemplate = 'testType';
  afterEach(async () => {
    await deletePostTemplate(postTemplateId);
  });
  // Disabled due to bug: BUG: Missing validation - 2 post templates can be created with same type for the same space #2009
  test('Create Post template with same type', async () => {
    // Arrange
    const countBefore = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Act
    const resCreatePostTempl1 = await createPostTemplate(
      entitiesId.spaceTemplateId,
      typeFromSpacetemplate
    );
    postTemplateId = resCreatePostTempl1.body.data.createPostTemplate.id;

    const resCreatePostTempl2 = await createPostTemplate(
      entitiesId.spaceTemplateId,
      typeFromSpacetemplate
    );
    const countAfter = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(resCreatePostTempl2.text).toContain(errorDuplicatePostType);
  });

  test('Create Post template without type', async () => {
    // Arrange
    const countBefore = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Act
    const resCreatePostTempl = await createPostTemplateNoType(
      entitiesId.spaceTemplateId
    );

    const countAfter = await getPostTemplatesCountForSpace(entitiesId.spaceId);

    // Assert
    expect(countAfter).toEqual(countBefore);
    expect(resCreatePostTempl.text).toContain(
      'Field \\"type\\" of required type \\"String!\\" was not provided.'
    );
  });

  test('Update Post template type to empty value - remains the same type', async () => {
    // Arrange
    const resCreatePostTempl = await createPostTemplate(
      entitiesId.spaceTemplateId,
      typeFromSpacetemplate
    );
    postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;

    // Act
    await updatePostTemplate(postTemplateId, '');

    const getUpatedPostData = await getPostTemplateForSpaceByPostType(
      entitiesId.spaceId,
      ''
    );
    const getUpatedPostDataOrigin = await getPostTemplateForSpaceByPostType(
      entitiesId.spaceId,
      typeFromSpacetemplate
    );

    // Assert
    expect(getUpatedPostData).toHaveLength(0);
    expect(getUpatedPostDataOrigin[0].type).toEqual(typeFromSpacetemplate);
  });

  test('Delete non existent Post template', async () => {
    // Act

    const res = await deletePostTemplate(
      '0bade07d-6736-4ee2-93c0-b2af22a998ff'
    );
    expect(res.text).toContain(errorNoPostTemplate);
  });
});
