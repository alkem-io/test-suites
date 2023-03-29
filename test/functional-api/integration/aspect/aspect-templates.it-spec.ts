import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  removeAspect,
  updateAspect,
  createPostTemplate,
  getPostTemplateForHubByAspectType,
  getPostTemplatesCountForHub,
  deletePostTemplate,
  updatePostTemplate,
  createAspectNewType,
  createPostTemplateNoType,
  getDataPerHubCallout,
  getDataPerChallengeCallout,
  getDataPerOpportunityCallout,
} from './aspect.request.params';
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
  errorDuplicateAspectType,
  errorNoPostTemplate,
} from './aspect-template-testdata';

let opportunityName = 'aspect-opp';
let challengeName = 'aspect-chal';
let hubAspectId = '';
let challengeAspectId = '';
let opportunityAspectId = '';
let aspectNameID = '';
let aspectDisplayName = '';
let aspectDataCreate = '';
const organizationName = 'aspect-org-name' + uniqueId;
const hostNameId = 'aspect-org-nameid' + uniqueId;
const hubName = 'aspect-eco-name' + uniqueId;
const hubNameId = 'aspect-eco-nameid' + uniqueId;
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
  aspectNameID = `aspect-name-id-${uniqueId}`;
  aspectDisplayName = `aspect-d-name-${uniqueId}`;
});

describe('Aspect templates - CRUD', () => {
  const typeFromHubtemplate = 'testType';
  afterEach(async () => {
    await deletePostTemplate(postTemplateId);
  });
  test('Create Aspect template', async () => {
    // Arrange
    const countBefore = await getPostTemplatesCountForHub(entitiesId.hubId);

    // Act
    const resCreateAspectTempl = await createPostTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    postTemplateId = resCreateAspectTempl.body.data.createPostTemplate.id;
    const aspectDataCreate = resCreateAspectTempl.body.data.createPostTemplate;
    const countAfter = await getPostTemplatesCountForHub(entitiesId.hubId);
    const getCreatedAspectData = await getPostTemplateForHubByAspectType(
      entitiesId.hubId,
      typeFromHubtemplate
    );

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(getCreatedAspectData).toEqual([aspectDataCreate]);
  });

  test('Update Aspect template', async () => {
    // Arrange
    const resCreateAspectTempl = await createPostTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    postTemplateId = resCreateAspectTempl.body.data.createPostTemplate.id;

    // Act
    const resUpdateAspectTempl = await updatePostTemplate(
      postTemplateId,
      typeFromHubtemplate + ' - Update'
    );

    const aspectDataUpdate = resUpdateAspectTempl.body.data.updatePostTemplate;
    const getUpatedAspectData = await getPostTemplateForHubByAspectType(
      entitiesId.hubId,
      typeFromHubtemplate + ' - Update'
    );

    // Assert
    expect(getUpatedAspectData).toEqual([aspectDataUpdate]);
  });

  test('Delete Aspect template', async () => {
    // Arrange
    const resCreateAspectTempl = await createPostTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    postTemplateId = resCreateAspectTempl.body.data.createPostTemplate.id;
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

describe('Aspect templates - Utilization in aspects', () => {
  const templateType = 'testType';
  beforeAll(async () => {
    const resCreateAspectTempl = await createPostTemplate(
      entitiesId.hubTemplateId,
      templateType
    );
    postTemplateId = resCreateAspectTempl.body.data.createPostTemplate.id;
  });

  afterEach(async () => {
    await deletePostTemplate(postTemplateId);
  });

  describe('Create aspect on all entities with newly created postTemplate', () => {
    afterAll(async () => {
      await removeAspect(hubAspectId);
      await removeAspect(challengeAspectId);
      await removeAspect(opportunityAspectId);
    });

    test('Create Aspect on Hub', async () => {
      // Act
      const resAspectonHub = await createAspectNewType(
        entitiesId.hubCalloutId,
        templateType,
        `new-temp-n-id-${uniqueId}`,
        { profileData: { displayName: `new-temp-d-name-${uniqueId}` } }
      );
      aspectDataCreate = resAspectonHub.body.data.createAspectOnCallout;
      const aspectTypeFromHubTemplate =
        resAspectonHub.body.data.createAspectOnCallout.type;
      hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;

      const aspectsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        aspectsData.body.data.hub.collaboration.callouts[0].aspects[0];

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(aspectDataCreate);
    });

    test('Create Aspect on Challenge', async () => {
      // Act
      const res = await createAspectNewType(
        entitiesId.challengeCalloutId,
        templateType,
        `new-temp-n-id-${uniqueId}`,
        { profileData: { displayName: `new-temp-d-name-${uniqueId}` } }
      );
      aspectDataCreate = res.body.data.createAspectOnCallout;
      const aspectTypeFromHubTemplate =
        res.body.data.createAspectOnCallout.type;
      challengeAspectId = res.body.data.createAspectOnCallout.id;

      const aspectsData = await getDataPerChallengeCallout(
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.challengeCalloutId
      );
      const data =
        aspectsData.body.data.hub.challenge.collaboration.callouts[0]
          .aspects[0];

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(aspectDataCreate);
    });

    test('Create Aspect on Opportunity', async () => {
      // Act
      const res = await createAspectNewType(
        entitiesId.opportunityCalloutId,
        templateType,
        `new-temp-n-id-${uniqueId}`,
        { profileData: { displayName: `new-temp-d-name-${uniqueId}` } }
      );
      aspectDataCreate = res.body.data.createAspectOnCallout;
      const aspectTypeFromHubTemplate =
        res.body.data.createAspectOnCallout.type;
      opportunityAspectId = res.body.data.createAspectOnCallout.id;

      const aspectsData = await getDataPerOpportunityCallout(
        entitiesId.hubId,
        entitiesId.opportunityId,
        entitiesId.opportunityCalloutId
      );
      const data =
        aspectsData.body.data.hub.opportunity.collaboration.callouts[0]
          .aspects[0];

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(aspectDataCreate);
    });
  });

  describe('Update Aspect template already utilized by an aspect', () => {
    let aspectTypeFromHubTemplate = '';
    beforeAll(async () => {
      const resAspectonHub = await createAspectNewType(
        entitiesId.hubCalloutId,
        templateType,
        `new-asp-n-id-${uniqueId}`,
        { profileData: { displayName: `new-asp-d-name-${uniqueId}` } }
      );
      aspectDataCreate = resAspectonHub.body.data.createAspectOnCallout;
      hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
      aspectTypeFromHubTemplate =
        resAspectonHub.body.data.createAspectOnCallout.type;
    });
    afterAll(async () => {
      await removeAspect(hubAspectId);
    });
    test('Create aspect with existing aspect template, and update template type, doesnt change the aspect type', async () => {
      // Act
      await updatePostTemplate(postTemplateId, templateType + ' - Update');

      const aspectsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        aspectsData.body.data.hub.collaboration.callouts[0].aspects[0];

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(aspectDataCreate);
    });

    test('Update aspect to use the new aspect template type', async () => {
      // Act

      const resAspectonHub = await updateAspect(
        hubAspectId,
        aspectNameID,
        { profileData: { displayName: aspectDisplayName + 'EA update' } },
        templateType + ' - Update'
      );
      const aspectDataUpdate = resAspectonHub.body.data.updateAspect;
      const aspectTypeFromHubTemplate =
        resAspectonHub.body.data.updateAspect.type;
      hubAspectId = resAspectonHub.body.data.updateAspect.id;

      const aspectsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        aspectsData.body.data.hub.collaboration.callouts[0].aspects[0];

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType + ' - Update');
      expect(data).toEqual(aspectDataUpdate);
    });
  });

  describe('Remove Aspect template already utilized by an aspect', () => {
    let aspectTypeFromHubTemplate = '';
    beforeAll(async () => {
      const resAspectonHub = await createAspectNewType(
        entitiesId.hubCalloutId,
        templateType,
        `rem-temp-asp-n-id-${uniqueId}`,
        {
          profileData: {
            displayName: aspectDisplayName + `rem-temp-asp-d-n-${uniqueId}`,
          },
        }
      );
      aspectDataCreate = resAspectonHub.body.data.createAspectOnCallout;
      hubAspectId = resAspectonHub.body.data.createAspectOnCallout.id;
      aspectTypeFromHubTemplate =
        resAspectonHub.body.data.createAspectOnCallout.type;
    });
    afterAll(async () => {
      await removeAspect(hubAspectId);
    });
    test('Create aspect with existing aspect template, and remove the aspect template, doesnt change the aspect type', async () => {
      // Act
      await deletePostTemplate(postTemplateId);

      const aspectsData = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId
      );
      const data =
        aspectsData.body.data.hub.collaboration.callouts[0].aspects[0];

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual(aspectDataCreate);
    });
  });
});

describe('Aspect templates - CRUD Authorization', () => {
  const templateType = 'testTemplateType';
  beforeAll(async () => {
    await assignUsersToHubAndOrg();
  });
  describe('Aspect templates - Create', () => {
    describe('DDT user privileges to create hub aspect template - positive', () => {
      // Arrange
      afterEach(async () => {
        await deletePostTemplate(postTemplateId);
      });
      test.each`
        userRole                 | templateTypes | message
        ${TestUser.GLOBAL_ADMIN} | ${'GA type'}  | ${'"data":{"createPostTemplate"'}
        ${TestUser.HUB_ADMIN}    | ${'HA type'}  | ${'"data":{"createPostTemplate"'}
      `(
        'User: "$userRole" get message: "$message", when intend to create hub aspect template ',
        async ({ userRole, templateTypes, message }) => {
          // Act
          const resCreateAspectTempl = await createPostTemplate(
            entitiesId.hubTemplateId,
            templateTypes,
            'test default description',
            'test title',
            'test description',
            userRole
          );
          postTemplateId = resCreateAspectTempl.body.data.createPostTemplate.id;

          // Assert
          expect(resCreateAspectTempl.text).toContain(message);
        }
      );
    });

    describe('DDT user privileges to create hub aspect template - negative', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${errorAuthCreatePostTemplate}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthCreatePostTemplate}
      `(
        'User: "$userRole" get message: "$message", when intend to create hub aspect template ',
        async ({ userRole, message }) => {
          // Act
          const resCreateAspectTempl = await createPostTemplate(
            entitiesId.hubTemplateId,
            templateType,
            'test default description',
            'test title',
            'test description',
            userRole
          );

          // Assert
          expect(resCreateAspectTempl.text).toContain(message);
        }
      );
    });
  });

  describe('Aspect templates - Update', () => {
    const typeFromHubtemplate = 'test template';
    beforeAll(async () => {
      const resCreateAspectTempl = await createPostTemplate(
        entitiesId.hubTemplateId,
        templateType
      );
      postTemplateId = resCreateAspectTempl.body.data.createPostTemplate.id;
    });
    afterAll(async () => {
      await deletePostTemplate(postTemplateId);
    });
    const templateType = 'testTemplateType';
    describe('DDT user privileges to update hub aspect template - positive', () => {
      // Arrange

      test.each`
        userRole                   | message
        ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"updatePostTemplate"'}
        ${TestUser.HUB_ADMIN}      | ${'"data":{"updatePostTemplate"'}
        ${TestUser.HUB_MEMBER}     | ${errorAuthUpdatePostTemplate}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthUpdatePostTemplate}
      `(
        'User: "$userRole" get message: "$message", when intend to update hub aspect template ',
        async ({ userRole, message }) => {
          // Act
          const resUpdateAspectTempl = await updatePostTemplate(
            postTemplateId,
            typeFromHubtemplate + ' - Update',
            'update default description',
            'update title',
            'update description',
            userRole
          );

          // Assert
          expect(resUpdateAspectTempl.text).toContain(message);
        }
      );
    });
  });

  describe('Aspect templates - Remove', () => {
    describe('DDT user privileges to remove hub aspect template - positive', () => {
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
        'User: "$userRole" get message: "$message", whe intend to remova hub aspect template ',
        async ({ userRole, templateTypes, message }) => {
          // Act
          const resCreateAspectTempl = await createPostTemplate(
            entitiesId.hubTemplateId,
            templateTypes
          );
          postTemplateId = resCreateAspectTempl.body.data.createPostTemplate.id;

          const removeRes = await deletePostTemplate(postTemplateId, userRole);

          // Assert
          expect(removeRes.text).toContain(message);
        }
      );
    });
  });
});

describe('Aspect templates - Negative Scenarios', () => {
  const typeFromHubtemplate = 'testType';
  afterEach(async () => {
    await deletePostTemplate(postTemplateId);
  });
  // Disabled due to bug: BUG: Missing validation - 2 aspect templates can be created with same type for the same hub #2009
  test('Create Aspect template with same type', async () => {
    // Arrange
    const countBefore = await getPostTemplatesCountForHub(entitiesId.hubId);

    // Act
    const resCreateAspectTempl1 = await createPostTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    postTemplateId = resCreateAspectTempl1.body.data.createPostTemplate.id;

    const resCreateAspectTempl2 = await createPostTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    const countAfter = await getPostTemplatesCountForHub(entitiesId.hubId);

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(resCreateAspectTempl2.text).toContain(errorDuplicateAspectType);
  });

  test('Create Aspect template without type', async () => {
    // Arrange
    const countBefore = await getPostTemplatesCountForHub(entitiesId.hubId);

    // Act
    const resCreateAspectTempl = await createPostTemplateNoType(
      entitiesId.hubTemplateId
    );

    const countAfter = await getPostTemplatesCountForHub(entitiesId.hubId);

    // Assert
    expect(countAfter).toEqual(countBefore);
    expect(resCreateAspectTempl.text).toContain(
      'Field \\"type\\" of required type \\"String!\\" was not provided.'
    );
  });

  test('Update Aspect template type to empty value - remains the same type', async () => {
    // Arrange
    const resCreateAspectTempl = await createPostTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    postTemplateId = resCreateAspectTempl.body.data.createPostTemplate.id;

    // Act
    await updatePostTemplate(postTemplateId, '');

    const getUpatedAspectData = await getPostTemplateForHubByAspectType(
      entitiesId.hubId,
      ''
    );
    const getUpatedAspectDataOrigin = await getPostTemplateForHubByAspectType(
      entitiesId.hubId,
      typeFromHubtemplate
    );

    // Assert
    expect(getUpatedAspectData).toHaveLength(0);
    expect(getUpatedAspectDataOrigin[0].type).toEqual(typeFromHubtemplate);
  });

  test('Delete non existent Aspect template', async () => {
    // Act

    const res = await deletePostTemplate(
      '0bade07d-6736-4ee2-93c0-b2af22a998ff'
    );
    expect(res.text).toContain(errorNoPostTemplate);
  });
});
