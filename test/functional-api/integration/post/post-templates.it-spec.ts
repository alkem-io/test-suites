import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  removePost,
  updatePost,
  createPostTemplate,
  getPostTemplateForHubByPostType,
  getPostTemplatesCountForHub,
  deletePostTemplate,
  updatePostTemplate,
  createPostNewType,
  createPostTemplateNoType,
  getDataPerHubCallout,
  getDataPerChallengeCallout,
  getDataPerOpportunityCallout,
} from './post.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeHub } from '../hub/hub.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import {
  assignUsersToHubAndOrg,
  createChallengeForOrgHub,
  createOpportunityForChallenge,
  createOrgAndHub,
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
let hubPostId = '';
let challengePostId = '';
let opportunityPostId = '';
let postNameID = '';
let postDisplayName = '';
let postDataCreate = '';
const organizationName = 'post-org-name' + uniqueId;
const hostNameId = 'post-org-nameid' + uniqueId;
const hubName = 'post-eco-name' + uniqueId;
const hubNameId = 'post-eco-nameid' + uniqueId;
let postTemplateId = '';

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);
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
  postNameID = `post-name-id-${uniqueId}`;
  postDisplayName = `post-d-name-${uniqueId}`;
});

describe('Post templates - CRUD', () => {
  const typeFromHubtemplate = 'testType';
  afterEach(async () => {
    await deletePostTemplate(postTemplateId);
  });
  test('Create Post template', async () => {
    // Arrange
    const countBefore = await getPostTemplatesCountForHub(entitiesId.hubId);

    // Act
    const resCreatePostTempl = await createPostTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;
    const postDataCreate = resCreatePostTempl.body.data.createPostTemplate;
    const countAfter = await getPostTemplatesCountForHub(entitiesId.hubId);
    const getCreatedPostData = await getPostTemplateForHubByPostType(
      entitiesId.hubId,
      typeFromHubtemplate
    );

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(getCreatedPostData).toEqual([postDataCreate]);
  });

  test('Update Post template', async () => {
    // Arrange
    const resCreatePostTempl = await createPostTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;

    // Act
    const resUpdatePostTempl = await updatePostTemplate(
      postTemplateId,
      typeFromHubtemplate + ' - Update'
    );

    const postDataUpdate = resUpdatePostTempl.body.data.updatePostTemplate;
    const getUpatedPostData = await getPostTemplateForHubByPostType(
      entitiesId.hubId,
      typeFromHubtemplate + ' - Update'
    );

    // Assert
    expect(getUpatedPostData).toEqual([postDataUpdate]);
  });

  test('Delete Post template', async () => {
    // Arrange
    const resCreatePostTempl = await createPostTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;
    const countBefore = await getPostTemplatesCountForHub(entitiesId.hubId);

    // Act
    const remove = await deletePostTemplate(postTemplateId);
    const countAfter = await getPostTemplatesCountForHub(entitiesId.hubId);

    // Assert
    expect(countAfter).toEqual(countBefore - 1);
    expect(remove.body.data.deletePostTemplate.type).toEqual(
      typeFromHubtemplate
    );
  });
});

describe('Post templates - Utilization in posts', () => {
  const templateType = 'testType';
  beforeAll(async () => {
    const resCreatePostTempl = await createPostTemplate(
      entitiesId.hubTemplateId,
      templateType
    );
    postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;
  });

  afterEach(async () => {
    await deletePostTemplate(postTemplateId);
  });

  describe('Create post on all entities with newly created postTemplate', () => {
    afterAll(async () => {
      await removePost(hubPostId);
      await removePost(challengePostId);
      await removePost(opportunityPostId);
    });

    test('Create Post on Hub', async () => {
      // Act
      const resPostonHub = await createPostNewType(
        entitiesId.hubCalloutId,
        templateType,
        `new-temp-n-id-${uniqueId}`,
        { profileData: { displayName: `new-temp-d-name-${uniqueId}` } }
      );
      postDataCreate = resPostonHub.body.data.createPostOnCallout;
      const postTypeFromHubTemplate =
        resPostonHub.body.data.createPostOnCallout.type;
      hubPostId = resPostonHub.body.data.createPostOnCallout.id;

      const postsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        postsData.body.data.hub.collaboration.callouts[0].posts[0];

      // Assert
      expect(postTypeFromHubTemplate).toEqual(templateType);
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
      const postTypeFromHubTemplate =
        res.body.data.createPostOnCallout.type;
      challengePostId = res.body.data.createPostOnCallout.id;

      const postsData = await getDataPerChallengeCallout(
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.challengeCalloutId
      );
      const data =
        postsData.body.data.hub.challenge.collaboration.callouts[0]
          .posts[0];

      // Assert
      expect(postTypeFromHubTemplate).toEqual(templateType);
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
      const postTypeFromHubTemplate =
        res.body.data.createPostOnCallout.type;
      opportunityPostId = res.body.data.createPostOnCallout.id;

      const postsData = await getDataPerOpportunityCallout(
        entitiesId.hubId,
        entitiesId.opportunityId,
        entitiesId.opportunityCalloutId
      );
      const data =
        postsData.body.data.hub.opportunity.collaboration.callouts[0]
          .posts[0];

      // Assert
      expect(postTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });
  });

  describe('Update Post template already utilized by an post', () => {
    let postTypeFromHubTemplate = '';
    beforeAll(async () => {
      const resPostonHub = await createPostNewType(
        entitiesId.hubCalloutId,
        templateType,
        `new-asp-n-id-${uniqueId}`,
        { profileData: { displayName: `new-asp-d-name-${uniqueId}` } }
      );
      postDataCreate = resPostonHub.body.data.createPostOnCallout;
      hubPostId = resPostonHub.body.data.createPostOnCallout.id;
      postTypeFromHubTemplate =
        resPostonHub.body.data.createPostOnCallout.type;
    });
    afterAll(async () => {
      await removePost(hubPostId);
    });
    test('Create post with existing post template, and update template type, doesnt change the post type', async () => {
      // Act
      await updatePostTemplate(postTemplateId, templateType + ' - Update');

      const postsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        postsData.body.data.hub.collaboration.callouts[0].posts[0];

      // Assert
      expect(postTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });

    test('Update post to use the new post template type', async () => {
      // Act

      const resPostonHub = await updatePost(
        hubPostId,
        postNameID,
        { profileData: { displayName: postDisplayName + 'EA update' } },
        templateType + ' - Update'
      );
      const postDataUpdate = resPostonHub.body.data.updatePost;
      const postTypeFromHubTemplate =
        resPostonHub.body.data.updatePost.type;
      hubPostId = resPostonHub.body.data.updatePost.id;

      const postsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        postsData.body.data.hub.collaboration.callouts[0].posts[0];

      // Assert
      expect(postTypeFromHubTemplate).toEqual(templateType + ' - Update');
      expect(data).toEqual(postDataUpdate);
    });
  });

  describe('Remove Post template already utilized by an post', () => {
    let postTypeFromHubTemplate = '';
    beforeAll(async () => {
      const resPostonHub = await createPostNewType(
        entitiesId.hubCalloutId,
        templateType,
        `rem-temp-asp-n-id-${uniqueId}`,
        {
          profileData: {
            displayName: postDisplayName + `rem-temp-asp-d-n-${uniqueId}`,
          },
        }
      );
      postDataCreate = resPostonHub.body.data.createPostOnCallout;
      hubPostId = resPostonHub.body.data.createPostOnCallout.id;
      postTypeFromHubTemplate =
        resPostonHub.body.data.createPostOnCallout.type;
    });
    afterAll(async () => {
      await removePost(hubPostId);
    });
    test('Create post with existing post template, and remove the post template, doesnt change the post type', async () => {
      // Act
      await deletePostTemplate(postTemplateId);

      const postsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        postsData.body.data.hub.collaboration.callouts[0].posts[0];

      // Assert
      expect(postTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(postDataCreate);
    });
  });
});

describe('Post templates - CRUD Authorization', () => {
  const templateType = 'testTemplateType';
  beforeAll(async () => {
    await assignUsersToHubAndOrg();
  });
  describe('Post templates - Create', () => {
    describe('DDT user privileges to create hub post template - positive', () => {
      // Arrange
      afterEach(async () => {
        await deletePostTemplate(postTemplateId);
      });
      test.each`
        userRole                 | templateTypes | message
        ${TestUser.GLOBAL_ADMIN} | ${'GA type'}  | ${'"data":{"createPostTemplate"'}
        ${TestUser.HUB_ADMIN}    | ${'HA type'}  | ${'"data":{"createPostTemplate"'}
      `(
        'User: "$userRole" get message: "$message", when intend to create hub post template ',
        async ({ userRole, templateTypes, message }) => {
          // Act
          const resCreatePostTempl = await createPostTemplate(
            entitiesId.hubTemplateId,
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

    describe('DDT user privileges to create hub post template - negative', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${errorAuthCreatePostTemplate}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthCreatePostTemplate}
      `(
        'User: "$userRole" get message: "$message", when intend to create hub post template ',
        async ({ userRole, message }) => {
          // Act
          const resCreatePostTempl = await createPostTemplate(
            entitiesId.hubTemplateId,
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
    const typeFromHubtemplate = 'test template';
    beforeAll(async () => {
      const resCreatePostTempl = await createPostTemplate(
        entitiesId.hubTemplateId,
        templateType
      );
      postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;
    });
    afterAll(async () => {
      await deletePostTemplate(postTemplateId);
    });
    const templateType = 'testTemplateType';
    describe('DDT user privileges to update hub post template - positive', () => {
      // Arrange

      test.each`
        userRole                   | message
        ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"updatePostTemplate"'}
        ${TestUser.HUB_ADMIN}      | ${'"data":{"updatePostTemplate"'}
        ${TestUser.HUB_MEMBER}     | ${errorAuthUpdatePostTemplate}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthUpdatePostTemplate}
      `(
        'User: "$userRole" get message: "$message", when intend to update hub post template ',
        async ({ userRole, message }) => {
          // Act
          const resUpdatePostTempl = await updatePostTemplate(
            postTemplateId,
            typeFromHubtemplate + ' - Update',
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
    describe('DDT user privileges to remove hub post template - positive', () => {
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
        'User: "$userRole" get message: "$message", whe intend to remova hub post template ',
        async ({ userRole, templateTypes, message }) => {
          // Act
          const resCreatePostTempl = await createPostTemplate(
            entitiesId.hubTemplateId,
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
  const typeFromHubtemplate = 'testType';
  afterEach(async () => {
    await deletePostTemplate(postTemplateId);
  });
  // Disabled due to bug: BUG: Missing validation - 2 post templates can be created with same type for the same hub #2009
  test('Create Post template with same type', async () => {
    // Arrange
    const countBefore = await getPostTemplatesCountForHub(entitiesId.hubId);

    // Act
    const resCreatePostTempl1 = await createPostTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    postTemplateId = resCreatePostTempl1.body.data.createPostTemplate.id;

    const resCreatePostTempl2 = await createPostTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    const countAfter = await getPostTemplatesCountForHub(entitiesId.hubId);

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(resCreatePostTempl2.text).toContain(errorDuplicatePostType);
  });

  test('Create Post template without type', async () => {
    // Arrange
    const countBefore = await getPostTemplatesCountForHub(entitiesId.hubId);

    // Act
    const resCreatePostTempl = await createPostTemplateNoType(
      entitiesId.hubTemplateId
    );

    const countAfter = await getPostTemplatesCountForHub(entitiesId.hubId);

    // Assert
    expect(countAfter).toEqual(countBefore);
    expect(resCreatePostTempl.text).toContain(
      'Field \\"type\\" of required type \\"String!\\" was not provided.'
    );
  });

  test('Update Post template type to empty value - remains the same type', async () => {
    // Arrange
    const resCreatePostTempl = await createPostTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    postTemplateId = resCreatePostTempl.body.data.createPostTemplate.id;

    // Act
    await updatePostTemplate(postTemplateId, '');

    const getUpatedPostData = await getPostTemplateForHubByPostType(
      entitiesId.hubId,
      ''
    );
    const getUpatedPostDataOrigin = await getPostTemplateForHubByPostType(
      entitiesId.hubId,
      typeFromHubtemplate
    );

    // Assert
    expect(getUpatedPostData).toHaveLength(0);
    expect(getUpatedPostDataOrigin[0].type).toEqual(typeFromHubtemplate);
  });

  test('Delete non existent Post template', async () => {
    // Act

    const res = await deletePostTemplate(
      '0bade07d-6736-4ee2-93c0-b2af22a998ff'
    );
    expect(res.text).toContain(errorNoPostTemplate);
  });
});
