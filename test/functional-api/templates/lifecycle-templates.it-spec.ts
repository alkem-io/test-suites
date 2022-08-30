import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { removeHub } from '../integration/hub/hub.request.params';
import {
  emptyLifecycleDefaultDefinition,
  emptyTemplateInfo,
  errorAuthCreateLifecycle,
  errorAuthDeleteLifecycle,
  errorAuthUpdateLifecycle,
  errorDeleteLastTemplate,
  errorInvalidDescription,
  errorInvalidInfo,
  errorInvalidType,
  errorNoLifecycle,
  lifecycleDefaultDefinition,
  lifecycleDefinitionUpdate,
  templateDefaultInfo,
  templateInfoUpdate,
} from '../integration/lifecycle/lifecycle-template-testdata';
import {
  createLifecycleTemplate,
  deleteLifecycleTemplate,
  getLifecycleTemplatesCountForHub,
  updateLifecycleTemplate,
} from '../integration/lifecycle/lifecycle.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { entitiesId } from '../zcommunications/communications-helper';
import { createOrgAndHubWithUsers } from '../zcommunications/create-entities-with-users-helper';

const organizationName = 'lifec-org-name' + uniqueId;
const hostNameId = 'lifec-org-nameid' + uniqueId;
const hubName = 'lifec-eco-name' + uniqueId;
const hubNameId = 'lifec-eco-nameid' + uniqueId;
let templateId = '';
beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
});
afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Lifecycle templates - CRUD', () => {
  afterEach(async () => {
    await deleteLifecycleTemplate(templateId);
  });
  test('Delete lifecycle template', async () => {
    // Arrange

    const res = await createLifecycleTemplate(entitiesId.hubTemplateId);
    templateId = res.body.data.createLifecycleTemplate.id;
    const countBefore = await getLifecycleTemplatesCountForHub(
      entitiesId.hubId
    );
    // Act
    const resDeleteTemplate = await deleteLifecycleTemplate(templateId);
    const countAfter = await getLifecycleTemplatesCountForHub(entitiesId.hubId);
    // Assert
    expect(countAfter).toEqual(countBefore - 1);
    expect(resDeleteTemplate.body.data.deleteLifecycleTemplate.id).toEqual(
      templateId
    );
  });

  test('Update lifecycle template', async () => {
    const res = await createLifecycleTemplate(entitiesId.hubTemplateId);
    const templateId = res.body.data.createLifecycleTemplate.id;

    const resUpdateTemplate = await updateLifecycleTemplate(
      templateId,
      'OPPORTUNITY',
      lifecycleDefinitionUpdate,
      templateInfoUpdate
    );

    const resBaseData = resUpdateTemplate.body.data.updateLifecycleTemplate;

    expect(resBaseData).toEqual(
      expect.objectContaining({
        id: templateId,
        type: 'OPPORTUNITY',
        definition: lifecycleDefinitionUpdate,
      })
    );
    expect(resBaseData.info).toEqual(
      expect.objectContaining({
        title: templateInfoUpdate.title,
        description: templateInfoUpdate.description,
        tagset: { tags: templateInfoUpdate.tags },
      })
    );
  });

  describe('Create lifecycle template', () => {
    // Arrange
    test.each`
      type
      ${'CHALLENGE'}
      ${'OPPORTUNITY'}
    `('should create "$type" template', async ({ type }) => {
      // Act
      const res = await createLifecycleTemplate(entitiesId.hubTemplateId, type);
      templateId = res.body.data.createLifecycleTemplate.id;

      // Assert
      expect(res.body.data.createLifecycleTemplate).toEqual(
        expect.objectContaining({
          id: templateId,
          type: type,
          definition: lifecycleDefaultDefinition,
        })
      );
    });
  });
});

describe('Aspect templates - Negative Scenarios', () => {
  afterEach(async () => {
    await deleteLifecycleTemplate(templateId);
  });
  // Disabled due to bug: Missing validation - 2 identical lifecycle templates can be created: bug: #2061
  test.skip('Should fail creation of identical Lifecycle templates', async () => {
    // Arrange
    const countBefore = await getLifecycleTemplatesCountForHub(
      entitiesId.hubId
    );

    // Act
    const resTemplateOne = await createLifecycleTemplate(
      entitiesId.hubTemplateId
    );
    templateId = resTemplateOne.body.data.createLifecycleTemplate.id;
    const resTemplateTwo = await createLifecycleTemplate(
      entitiesId.hubTemplateId
    );
    const templateIdTwo = resTemplateTwo.body.data.createLifecycleTemplate.id;

    const countAfter = await getLifecycleTemplatesCountForHub(entitiesId.hubId);

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(resTemplateTwo).toContain('Error');
    await deleteLifecycleTemplate(templateIdTwo);
  });

  // skipping the tests, as validation for info is missing
  describe.skip('Should FAIL to create lifecycle template', () => {
    // Arrange
    test.each`
      type           | definition                         | info                   | result                     | errorType
      ${' '}         | ${lifecycleDefaultDefinition}      | ${templateDefaultInfo} | ${errorInvalidType}        | ${'Invalid type'}
      ${'CHALLENGE'} | ${emptyLifecycleDefaultDefinition} | ${templateDefaultInfo} | ${errorInvalidDescription} | ${'Invalid definition'}
      ${'CHALLENGE'} | ${lifecycleDefaultDefinition}      | ${emptyTemplateInfo}   | ${errorInvalidInfo}        | ${'Invalid info: '}
    `(
      'should fail to create template with invalid: "$errorType"',
      async ({ type, definition, info, result }) => {
        // Act
        const res = await createLifecycleTemplate(
          entitiesId.hubTemplateId,
          type,
          definition,
          info
        );
        // Assert
        expect(res.text).toContain(result);
      }
    );
  });

  test('Delete non existent Lifecycle template', async () => {
    // Act
    const res = await deleteLifecycleTemplate(
      '0bade07d-6736-4ee2-93c0-b2af22a998ff'
    );

    // Assert
    expect(res.text).toContain(errorNoLifecycle);
  });
});

describe('Lifecycle templates - CRUD Authorization', () => {
  describe('Lifecycle templates - Create', () => {
    describe('DDT user privileges to create hub lifecycle template - positive', () => {
      // Arrange
      afterEach(async () => {
        await deleteLifecycleTemplate(templateId);
      });
      test.each`
        userRole                 | message
        ${TestUser.GLOBAL_ADMIN} | ${'"data":{"createLifecycleTemplate"'}
        ${TestUser.HUB_ADMIN}    | ${'"data":{"createLifecycleTemplate"'}
      `(
        'User: "$userRole" creates successfully hub lifecycle template ',
        async ({ userRole, message }) => {
          // Act
          const resTemplateOne = await createLifecycleTemplate(
            entitiesId.hubTemplateId,
            'CHALLENGE',
            lifecycleDefaultDefinition,
            templateInfoUpdate,
            userRole
          );

          templateId = resTemplateOne.body.data.createLifecycleTemplate.id;

          // Assert
          expect(resTemplateOne.text).toContain(message);
        }
      );
    });

    describe('DDT user privileges to create hub lifecycle template - negative', () => {
      // Arrange
      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${errorAuthCreateLifecycle}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthCreateLifecycle}
      `(
        'User: "$userRole" get error message: "$message", when intend to create hub lifecycle template ',
        async ({ userRole, message }) => {
          // Act
          const resTemplateOne = await createLifecycleTemplate(
            entitiesId.hubTemplateId,
            'CHALLENGE',
            lifecycleDefaultDefinition,
            templateInfoUpdate,
            userRole
          );

          // Assert
          expect(resTemplateOne.text).toContain(message);
        }
      );
    });
  });

  describe('Lifecycle templates - Update', () => {
    beforeAll(async () => {
      const resCreateLifecycleTempl = await createLifecycleTemplate(
        entitiesId.hubTemplateId
      );
      templateId = resCreateLifecycleTempl.body.data.createLifecycleTemplate.id;
    });
    afterAll(async () => {
      await deleteLifecycleTemplate(templateId);
    });

    describe('DDT user privileges to update hub lifecycle template', () => {
      // Arrange

      test.each`
        userRole                   | message
        ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"updateLifecycleTemplate"'}
        ${TestUser.HUB_ADMIN}      | ${'"data":{"updateLifecycleTemplate"'}
        ${TestUser.HUB_MEMBER}     | ${errorAuthUpdateLifecycle}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthUpdateLifecycle}
      `(
        'User: "$userRole" get message: "$message", when intend to update hub lifecycle template ',
        async ({ userRole, message }) => {
          // Act
          const resUpdateTemplate = await updateLifecycleTemplate(
            templateId,
            'CHALLENGE',
            lifecycleDefaultDefinition,
            templateInfoUpdate,
            userRole
          );

          // Assert
          expect(resUpdateTemplate.text).toContain(message);
        }
      );
    });
  });

  describe('Lifecycle templates - Remove', () => {
    describe('DDT user privileges to remove hub lifecycle template', () => {
      // Arrange
      afterEach(async () => {
        await deleteLifecycleTemplate(templateId);
      });
      test.each`
        userRole                   | message
        ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"deleteLifecycleTemplate"'}
        ${TestUser.HUB_ADMIN}      | ${'"data":{"deleteLifecycleTemplate"'}
        ${TestUser.HUB_MEMBER}     | ${errorAuthDeleteLifecycle}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthDeleteLifecycle}
      `(
        'User: "$userRole" get message: "$message", when intend to remove hub lifecycle template ',
        async ({ userRole, message }) => {
          // Act
          const resCreateLifecycleTempl = await createLifecycleTemplate(
            entitiesId.hubTemplateId
          );
          templateId =
            resCreateLifecycleTempl.body.data.createLifecycleTemplate.id;

          const removeRes = await deleteLifecycleTemplate(templateId, userRole);

          // Assert
          expect(removeRes.text).toContain(message);
        }
      );
    });
  });
});

describe('Lifecycle templates - Remove last template', () => {
  test.skip('when 2 templates only, should NOT update lifecycle tamplate type to be the same as the other', async () => {
    // Act
    const resUpdateTemplate = await updateLifecycleTemplate(
      entitiesId.hubLifecycleTemplateOppId,
      'OPPORTUNITY'
    );

    // Assert
    expect(resUpdateTemplate.text).toContain('Error:....');
  });

  test('should NOT delete default lifecycle templates, as they are the only', async () => {
    // Arrange
    const countBefore = await getLifecycleTemplatesCountForHub(
      entitiesId.hubId
    );

    // Act
    const res1 = await deleteLifecycleTemplate(
      entitiesId.hubLifecycleTemplateOppId,
      TestUser.GLOBAL_ADMIN
    );
    const res2 = await deleteLifecycleTemplate(
      entitiesId.hubLifecycleTemplateChId,
      TestUser.GLOBAL_ADMIN
    );
    const countAfter = await getLifecycleTemplatesCountForHub(entitiesId.hubId);

    // Assert
    expect(countAfter).toEqual(countBefore);
    expect(res1.text).toContain(errorDeleteLastTemplate);
    expect(res2.text).toContain(errorDeleteLastTemplate);
  });

  test('should delete default lifecycle templates, as there are new with same types', async () => {
    // Arrange
    const resTemplateOne = await createLifecycleTemplate(
      entitiesId.hubTemplateId,
      'CHALLENGE'
    );
    templateId = resTemplateOne.body.data.createLifecycleTemplate.id;

    // Arrange
    const resTemplateTwo = await createLifecycleTemplate(
      entitiesId.hubTemplateId,
      'OPPORTUNITY'
    );
    templateId = resTemplateTwo.body.data.createLifecycleTemplate.id;

    const countBefore = await getLifecycleTemplatesCountForHub(
      entitiesId.hubId
    );

    // Act
    const res1 = await deleteLifecycleTemplate(
      entitiesId.hubLifecycleTemplateOppId,
      TestUser.GLOBAL_ADMIN
    );
    const res2 = await deleteLifecycleTemplate(
      entitiesId.hubLifecycleTemplateChId,
      TestUser.GLOBAL_ADMIN
    );
    const countAfter = await getLifecycleTemplatesCountForHub(entitiesId.hubId);

    // Assert
    expect(countAfter).toEqual(countBefore - 2);
    expect(res1.text).toContain('"data":{"deleteLifecycleTemplate"');
    expect(res2.text).toContain('"data":{"deleteLifecycleTemplate"');
  });
});
