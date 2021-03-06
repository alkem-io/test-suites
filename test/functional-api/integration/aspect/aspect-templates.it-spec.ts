import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  removeAspect,
  updateAspect,
  createAspectTemplate,
  getAspectTemplateForHubByAspectType,
  getAspectTemplatesCountForHub,
  deleteAspectTemplate,
  updateAspectTemplate,
  createAspectNewType,
  createAspectTemplateNoType,
  aspectDataPerContext,
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

let opportunityName = 'aspect-opp';
let challengeName = 'aspect-chal';
let hubAspectId = '';
let challengeAspectId = '';
let opportunityAspectId = '';
let aspectNameID = '';
let aspectDisplayName = '';
let aspectDescription = '';
let aspectDataCreate = '';
const organizationName = 'aspect-org-name' + uniqueId;
const hostNameId = 'aspect-org-nameid' + uniqueId;
const hubName = 'aspect-eco-name' + uniqueId;
const hubNameId = 'aspect-eco-nameid' + uniqueId;
let aspectTemplateId = '';

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
  aspectDescription = `aspectDescription-${uniqueId}`;
});

describe('Aspect templates - CRUD', () => {
  const typeFromHubtemplate = 'testType';
  afterEach(async () => {
    await deleteAspectTemplate(aspectTemplateId);
  });
  test('Create Aspect template', async () => {
    // Arrange
    const countBefore = await getAspectTemplatesCountForHub(entitiesId.hubId);

    // Act
    const resCreateAspectTempl = await createAspectTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    aspectTemplateId = resCreateAspectTempl.body.data.createAspectTemplate.id;
    const aspectDataCreate =
      resCreateAspectTempl.body.data.createAspectTemplate;
    const countAfter = await getAspectTemplatesCountForHub(entitiesId.hubId);
    const getCreatedAspectData = await getAspectTemplateForHubByAspectType(
      entitiesId.hubId,
      typeFromHubtemplate
    );

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(getCreatedAspectData).toEqual([aspectDataCreate]);
  });

  test('Update Aspect template', async () => {
    // Arrange
    const resCreateAspectTempl = await createAspectTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    aspectTemplateId = resCreateAspectTempl.body.data.createAspectTemplate.id;

    // Act
    const resUpdateAspectTempl = await updateAspectTemplate(
      aspectTemplateId,
      typeFromHubtemplate + ' - Update'
    );

    const aspectDataUpdate =
      resUpdateAspectTempl.body.data.updateAspectTemplate;
    const getUpatedAspectData = await getAspectTemplateForHubByAspectType(
      entitiesId.hubId,
      typeFromHubtemplate + ' - Update'
    );

    // Assert
    expect(getUpatedAspectData).toEqual([aspectDataUpdate]);
  });

  test('Delete Aspect template', async () => {
    // Arrange
    const resCreateAspectTempl = await createAspectTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    aspectTemplateId = resCreateAspectTempl.body.data.createAspectTemplate.id;
    const countBefore = await getAspectTemplatesCountForHub(entitiesId.hubId);

    // Act
    const remove = await deleteAspectTemplate(aspectTemplateId);
    const countAfter = await getAspectTemplatesCountForHub(entitiesId.hubId);

    // Assert
    expect(countAfter).toEqual(countBefore - 1);
    expect(remove.body.data.deleteAspectTemplate.type).toEqual(
      typeFromHubtemplate
    );
  });
});

describe('Aspect templates - Utilization in aspects', () => {
  const templateType = 'testType';
  beforeAll(async () => {
    const resCreateAspectTempl = await createAspectTemplate(
      entitiesId.hubTemplateId,
      templateType
    );
    aspectTemplateId = resCreateAspectTempl.body.data.createAspectTemplate.id;
  });

  afterEach(async () => {
    await deleteAspectTemplate(aspectTemplateId);
  });

  describe('Create aspect on all entities with newly created aspectTemplate', () => {
    afterAll(async () => {
      await removeAspect(hubAspectId);
      await removeAspect(challengeAspectId);
      await removeAspect(opportunityAspectId);
    });

    test('Create Aspect on Hub', async () => {
      // Act
      const resAspectonHub = await createAspectNewType(
        entitiesId.hubContextId,
        templateType,
        `new-template-d-name-${uniqueId}`,
        `new-template-name-id-${uniqueId}`,
        'check with new template type'
      );
      aspectDataCreate = resAspectonHub.body.data.createAspectOnContext;
      const aspectTypeFromHubTemplate =
        resAspectonHub.body.data.createAspectOnContext.type;
      hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;

      const aspectsData = await aspectDataPerContext(
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      const data = aspectsData.hubAspect;

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual([aspectDataCreate]);
    });

    test('Create Aspect on Challenge', async () => {
      // Act
      const res = await createAspectNewType(
        entitiesId.challengeContextId,
        templateType,
        `new-template-d-name-${uniqueId}`,
        `new-template-name-id-${uniqueId}`,
        'check with new template type'
      );
      aspectDataCreate = res.body.data.createAspectOnContext;
      const aspectTypeFromHubTemplate =
        res.body.data.createAspectOnContext.type;
      challengeAspectId = res.body.data.createAspectOnContext.id;

      const aspectsData = await aspectDataPerContext(
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      const data = aspectsData.challengeAspect;

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual([aspectDataCreate]);
    });

    test('Create Aspect on Opportunity', async () => {
      // Act
      const res = await createAspectNewType(
        entitiesId.opportunityContextId,
        templateType,
        `new-template-d-name-${uniqueId}`,
        `new-template-name-id-${uniqueId}`,
        'check with new template type'
      );
      aspectDataCreate = res.body.data.createAspectOnContext;
      const aspectTypeFromHubTemplate =
        res.body.data.createAspectOnContext.type;
      opportunityAspectId = res.body.data.createAspectOnContext.id;

      const aspectsData = await aspectDataPerContext(
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      const data = aspectsData.opportunityAspect;

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual([aspectDataCreate]);
    });
  });

  describe('Update Aspect template already utilized by an aspect', () => {
    let aspectTypeFromHubTemplate = '';
    beforeAll(async () => {
      const resAspectonHub = await createAspectNewType(
        entitiesId.hubContextId,
        templateType,
        `new-aspect-d-name-${uniqueId}`,
        `new-aspect-name-id-${uniqueId}`
      );
      aspectDataCreate = resAspectonHub.body.data.createAspectOnContext;
      hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;
      aspectTypeFromHubTemplate =
        resAspectonHub.body.data.createAspectOnContext.type;
    });
    afterAll(async () => {
      await removeAspect(hubAspectId);
    });
    test('Create aspect with existing aspect template, and update template type, doesnt change the aspect type', async () => {
      // Act
      await updateAspectTemplate(aspectTemplateId, templateType + ' - Update');

      const aspectsData = await aspectDataPerContext(
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      const data = aspectsData.hubAspect;

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual([aspectDataCreate]);
    });

    test('Update aspect to use the new aspect template type', async () => {
      // Act

      const resAspectonHub = await updateAspect(
        hubAspectId,
        aspectNameID,
        aspectDisplayName + 'EA update',
        aspectDescription + 'EA update',
        templateType + ' - Update'
      );
      const aspectDataUpdate = resAspectonHub.body.data.updateAspect;
      const aspectTypeFromHubTemplate =
        resAspectonHub.body.data.updateAspect.type;
      hubAspectId = resAspectonHub.body.data.updateAspect.id;

      const aspectsData = await aspectDataPerContext(
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      const data = aspectsData.hubAspect;

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType + ' - Update');
      expect(data).toEqual([aspectDataUpdate]);
    });
  });

  describe('Remove Aspect template already utilized by an aspect', () => {
    let aspectTypeFromHubTemplate = '';
    beforeAll(async () => {
      const resAspectonHub = await createAspectNewType(
        entitiesId.hubContextId,
        templateType,
        `rem-temp-aspect-d-name-${uniqueId}`,
        `rem-temp-aspect-name-id-${uniqueId}`
      );
      aspectDataCreate = resAspectonHub.body.data.createAspectOnContext;
      hubAspectId = resAspectonHub.body.data.createAspectOnContext.id;
      aspectTypeFromHubTemplate =
        resAspectonHub.body.data.createAspectOnContext.type;
    });
    afterAll(async () => {
      await removeAspect(hubAspectId);
    });
    test('Create aspect with existing aspect template, and remove the aspect template, doesnt change the aspect type', async () => {
      // Act
      await deleteAspectTemplate(aspectTemplateId);

      const aspectsData = await aspectDataPerContext(
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.opportunityId
      );
      const data = aspectsData.hubAspect;

      // Assert
      expect(aspectTypeFromHubTemplate).toEqual(templateType);
      expect(data).toEqual([aspectDataCreate]);
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
        await deleteAspectTemplate(aspectTemplateId);
      });
      test.each`
        userRole                 | templateTypes | message
        ${TestUser.GLOBAL_ADMIN} | ${'GA type'}  | ${'"data":{"createAspectTemplate"'}
        ${TestUser.HUB_ADMIN}    | ${'HA type'}  | ${'"data":{"createAspectTemplate"'}
      `(
        'User: "$userRole" get message: "$message", whe intend to create hub aspect template ',
        async ({ userRole, templateTypes, message }) => {
          // Act
          const resCreateAspectTempl = await createAspectTemplate(
            entitiesId.hubTemplateId,
            templateTypes,
            'test default description',
            'test title',
            'test description',
            ['tag11', 'tag12'],
            userRole
          );
          aspectTemplateId =
            resCreateAspectTempl.body.data.createAspectTemplate.id;

          // Assert
          expect(resCreateAspectTempl.text).toContain(message);
        }
      );
    });

    describe('DDT user privileges to create hub aspect template - negative', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${'Authorization: unable to grant \'create\' privilege: templates set create aspect template:'}
        ${TestUser.NON_HUB_MEMBER} | ${'Authorization: unable to grant \'create\' privilege: templates set create aspect template:'}
      `(
        'User: "$userRole" get message: "$message", whe intend to create hub aspect template ',
        async ({ userRole, message }) => {
          // Act
          const resCreateAspectTempl = await createAspectTemplate(
            entitiesId.hubTemplateId,
            templateType,
            'test default description',
            'test title',
            'test description',
            ['tag11', 'tag12'],
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
      const resCreateAspectTempl = await createAspectTemplate(
        entitiesId.hubTemplateId,
        templateType
      );
      aspectTemplateId = resCreateAspectTempl.body.data.createAspectTemplate.id;
    });
    afterAll(async () => {
      await deleteAspectTemplate(aspectTemplateId);
    });
    const templateType = 'testTemplateType';
    describe('DDT user privileges to create hub aspect template - positive', () => {
      // Arrange

      test.each`
        userRole                   | message
        ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"updateAspectTemplate"'}
        ${TestUser.HUB_ADMIN}      | ${'"data":{"updateAspectTemplate"'}
        ${TestUser.HUB_MEMBER}     | ${'Authorization: unable to grant \'update\' privilege: update aspect template:'}
        ${TestUser.NON_HUB_MEMBER} | ${'Authorization: unable to grant \'update\' privilege: update aspect template:'}
      `(
        'User: "$userRole" get message: "$message", whe intend to update hub aspect template ',
        async ({ userRole, message }) => {
          // Act
          const resUpdateAspectTempl = await updateAspectTemplate(
            aspectTemplateId,
            typeFromHubtemplate + ' - Update',
            'update default description',
            'update title',
            'update description',
            ['tagU1', 'tagU2'],
            userRole
          );

          // Assert
          expect(resUpdateAspectTempl.text).toContain(message);
        }
      );
    });
  });

  describe('Aspect templates - Remove', () => {
    describe('DDT user privileges to create hub aspect template - positive', () => {
      // Arrange
      afterEach(async () => {
        await deleteAspectTemplate(aspectTemplateId);
      });
      test.each`
        userRole                   | templateTypes    | message
        ${TestUser.GLOBAL_ADMIN}   | ${'GA type'}     | ${'"data":{"deleteAspectTemplate"'}
        ${TestUser.HUB_ADMIN}      | ${'HA type'}     | ${'"data":{"deleteAspectTemplate"'}
        ${TestUser.HUB_MEMBER}     | ${'HM type'}     | ${'Authorization: unable to grant \'delete\' privilege: aspect template delete:'}
        ${TestUser.NON_HUB_MEMBER} | ${'Non-HM type'} | ${'Authorization: unable to grant \'delete\' privilege: aspect template delete:'}
      `(
        'User: "$userRole" get message: "$message", whe intend to create hub aspect template ',
        async ({ userRole, templateTypes, message }) => {
          // Act
          const resCreateAspectTempl = await createAspectTemplate(
            entitiesId.hubTemplateId,
            templateTypes
          );
          aspectTemplateId =
            resCreateAspectTempl.body.data.createAspectTemplate.id;

          const removeRes = await deleteAspectTemplate(
            aspectTemplateId,
            userRole
          );

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
    await deleteAspectTemplate(aspectTemplateId);
  });
  // Disabled due to bug: BUG: Missing validation - 2 aspect templates can be created with same type for the same hub #2009
  test.skip('Create Aspect template with same type', async () => {
    // Arrange
    const countBefore = await getAspectTemplatesCountForHub(entitiesId.hubId);

    // Act
    const resCreateAspectTempl1 = await createAspectTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    aspectTemplateId = resCreateAspectTempl1.body.data.createAspectTemplate.id;
    const aspectDataCreate1 =
      resCreateAspectTempl1.body.data.createAspectTemplate;

    const resCreateAspectTempl2 = await createAspectTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    const aspectTemplateId2 =
      resCreateAspectTempl2.body.data.createAspectTemplate.id;
    const countAfter = await getAspectTemplatesCountForHub(entitiesId.hubId);
    const getCreatedAspectData = await getAspectTemplateForHubByAspectType(
      entitiesId.hubId,
      typeFromHubtemplate
    );

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(getCreatedAspectData).toEqual([aspectDataCreate1]);
    await deleteAspectTemplate(aspectTemplateId2);
  });

  test('Create Aspect template without type', async () => {
    // Arrange
    const countBefore = await getAspectTemplatesCountForHub(entitiesId.hubId);

    // Act
    const resCreateAspectTempl = await createAspectTemplateNoType(
      entitiesId.hubTemplateId
    );

    const countAfter = await getAspectTemplatesCountForHub(entitiesId.hubId);

    // Assert
    expect(countAfter).toEqual(countBefore);
    expect(resCreateAspectTempl.text).toContain(
      'Field \\"type\\" of required type \\"String!\\" was not provided.'
    );
  });

  test('Update Aspect template type to empty value - remains the same type', async () => {
    // Arrange
    const resCreateAspectTempl = await createAspectTemplate(
      entitiesId.hubTemplateId,
      typeFromHubtemplate
    );
    aspectTemplateId = resCreateAspectTempl.body.data.createAspectTemplate.id;

    // Act
    await updateAspectTemplate(aspectTemplateId, '');

    const getUpatedAspectData = await getAspectTemplateForHubByAspectType(
      entitiesId.hubId,
      ''
    );
    const getUpatedAspectDataOrigin = await getAspectTemplateForHubByAspectType(
      entitiesId.hubId,
      typeFromHubtemplate
    );

    // Assert
    expect(getUpatedAspectData).toHaveLength(0);
    expect(getUpatedAspectDataOrigin[0].type).toEqual(typeFromHubtemplate);
  });

  test('Delete non existent Aspect template', async () => {
    // Act

    const res = await deleteAspectTemplate(
      '0bade07d-6736-4ee2-93c0-b2af22a998ff'
    );
    expect(res.text).toContain(
      'Not able to locate AspectTemplate with the specified ID: 0bade07d-6736-4ee2-93c0-b2af22a998ff'
    );
  });
});
