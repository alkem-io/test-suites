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
  createInnovationFlowTemplate,
  deleteInnovationFlowTemplate,
  getInnovationFlowTemplatesCountForHub,
  updateInnovationFlowTemplate,
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

describe('Lifecycle templates - Remove last template', () => {
  test('should NOT delete default lifecycle templates, as they are the only', async () => {
    // Arrange
    const countBefore = await getInnovationFlowTemplatesCountForHub(
      entitiesId.hubId
    );

    // Act
    const res1 = await deleteInnovationFlowTemplate(
      entitiesId.hubInnovationFlowTemplateOppId,
      TestUser.GLOBAL_ADMIN
    );
    const res2 = await deleteInnovationFlowTemplate(
      entitiesId.hubInnovationFlowTemplateChId,
      TestUser.GLOBAL_ADMIN
    );

    const countAfter = await getInnovationFlowTemplatesCountForHub(
      entitiesId.hubId
    );

    // Assert
    expect(countAfter).toEqual(countBefore);
    expect(res1.text).toContain(errorDeleteLastTemplate);
    expect(res2.text).toContain(errorDeleteLastTemplate);
  });

  test('should delete default lifecycle templates, as there are new with same types', async () => {
    // Arrange
    const resTemplateOne = await createInnovationFlowTemplate(
      entitiesId.hubTemplateId,
      'CHALLENGE'
    );
    templateId = resTemplateOne.body.data.createInnovationFlowTemplate.id;

    // Arrange
    const resTemplateTwo = await createInnovationFlowTemplate(
      entitiesId.hubTemplateId,
      'OPPORTUNITY'
    );
    templateId = resTemplateTwo.body.data.createInnovationFlowTemplate.id;

    const countBefore = await getInnovationFlowTemplatesCountForHub(
      entitiesId.hubId
    );

    // Act
    const res1 = await deleteInnovationFlowTemplate(
      entitiesId.hubInnovationFlowTemplateOppId,
      TestUser.GLOBAL_ADMIN
    );
    const res2 = await deleteInnovationFlowTemplate(
      entitiesId.hubInnovationFlowTemplateChId,
      TestUser.GLOBAL_ADMIN
    );
    const countAfter = await getInnovationFlowTemplatesCountForHub(
      entitiesId.hubId
    );

    // Assert
    expect(countAfter).toEqual(countBefore - 2);
    expect(res1.text).toContain('"data":{"deleteInnovationFlowTemplate"');
    expect(res2.text).toContain('"data":{"deleteInnovationFlowTemplate"');
  });
});

describe('Lifecycle templates - CRUD', () => {
  afterEach(async () => {
    await deleteInnovationFlowTemplate(templateId);
  });
  test('Delete lifecycle template', async () => {
    // Arrange

    const res = await createInnovationFlowTemplate(entitiesId.hubTemplateId);
    templateId = res.body.data.createInnovationFlowTemplate.id;
    const countBefore = await getInnovationFlowTemplatesCountForHub(
      entitiesId.hubId
    );
    // Act
    const resDeleteTemplate = await deleteInnovationFlowTemplate(templateId);
    const countAfter = await getInnovationFlowTemplatesCountForHub(
      entitiesId.hubId
    );
    // Assert
    expect(countAfter).toEqual(countBefore - 1);
    expect(resDeleteTemplate.body.data.deleteInnovationFlowTemplate.id).toEqual(
      templateId
    );
  });

  test('Update lifecycle template', async () => {
    const res = await createInnovationFlowTemplate(entitiesId.hubTemplateId);
    const templateId = res.body.data.createInnovationFlowTemplate.id;

    const resUpdateTemplate = await updateInnovationFlowTemplate(
      templateId,
      lifecycleDefinitionUpdate,
      templateInfoUpdate
    );
    const resBaseData =
      resUpdateTemplate.body.data.updateInnovationFlowTemplate;

    expect(resBaseData).toEqual(
      expect.objectContaining({
        id: templateId,
        type: 'CHALLENGE',
        definition: lifecycleDefinitionUpdate,
      })
    );
    expect(resBaseData.profile).toEqual(
      expect.objectContaining({
        displayName: templateInfoUpdate.displayName,
        description: templateInfoUpdate.description,
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
      const res = await createInnovationFlowTemplate(
        entitiesId.hubTemplateId,
        type
      );
      templateId = res.body.data.createInnovationFlowTemplate.id;

      // Assert
      expect(res.body.data.createInnovationFlowTemplate).toEqual(
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
    await deleteInnovationFlowTemplate(templateId);
  });
  // Disabled due to bug: Missing validation - 2 identical lifecycle templates can be created: bug: #2061
  test.skip('Should fail creation of identical Lifecycle templates', async () => {
    // Arrange
    const countBefore = await getInnovationFlowTemplatesCountForHub(
      entitiesId.hubId
    );

    // Act
    const resTemplateOne = await createInnovationFlowTemplate(
      entitiesId.hubTemplateId
    );
    templateId = resTemplateOne.body.data.createInnovationFlowTemplate.id;
    const resTemplateTwo = await createInnovationFlowTemplate(
      entitiesId.hubTemplateId
    );
    const templateIdTwo =
      resTemplateTwo.body.data.createInnovationFlowTemplate.id;

    const countAfter = await getInnovationFlowTemplatesCountForHub(
      entitiesId.hubId
    );

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(resTemplateTwo).toContain('Error');
    await deleteInnovationFlowTemplate(templateIdTwo);
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
        const res = await createInnovationFlowTemplate(
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
    const res = await deleteInnovationFlowTemplate(
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
        await deleteInnovationFlowTemplate(templateId);
      });
      test.each`
        userRole                 | message
        ${TestUser.GLOBAL_ADMIN} | ${'"data":{"createInnovationFlowTemplate"'}
        ${TestUser.HUB_ADMIN}    | ${'"data":{"createInnovationFlowTemplate"'}
      `(
        'User: "$userRole" creates successfully hub lifecycle template ',
        async ({ userRole, message }) => {
          // Act
          const resTemplateOne = await createInnovationFlowTemplate(
            entitiesId.hubTemplateId,
            'CHALLENGE',
            lifecycleDefaultDefinition,
            templateInfoUpdate,
            userRole
          );

          templateId = resTemplateOne.body.data.createInnovationFlowTemplate.id;

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
          const resTemplateOne = await createInnovationFlowTemplate(
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
      const resCreateLifecycleTempl = await createInnovationFlowTemplate(
        entitiesId.hubTemplateId
      );
      templateId =
        resCreateLifecycleTempl.body.data.createInnovationFlowTemplate.id;
    });
    afterAll(async () => {
      await deleteInnovationFlowTemplate(templateId);
    });

    describe('DDT user privileges to update hub lifecycle template', () => {
      // Arrange

      test.each`
        userRole                   | message
        ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"updateInnovationFlowTemplate"'}
        ${TestUser.HUB_ADMIN}      | ${'"data":{"updateInnovationFlowTemplate"'}
        ${TestUser.HUB_MEMBER}     | ${errorAuthUpdateLifecycle}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthUpdateLifecycle}
      `(
        'User: "$userRole" get message: "$message", when intend to update hub lifecycle template ',
        async ({ userRole, message }) => {
          // Act
          const resUpdateTemplate = await updateInnovationFlowTemplate(
            templateId,
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
        await deleteInnovationFlowTemplate(templateId);
      });
      test.each`
        userRole                   | message
        ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"deleteInnovationFlowTemplate"'}
        ${TestUser.HUB_ADMIN}      | ${'"data":{"deleteInnovationFlowTemplate"'}
        ${TestUser.HUB_MEMBER}     | ${errorAuthDeleteLifecycle}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthDeleteLifecycle}
      `(
        'User: "$userRole" get message: "$message", when intend to remove hub lifecycle template ',
        async ({ userRole, message }) => {
          // Act
          const resCreateLifecycleTempl = await createInnovationFlowTemplate(
            entitiesId.hubTemplateId
          );
          templateId =
            resCreateLifecycleTempl.body.data.createInnovationFlowTemplate.id;

          const removeRes = await deleteInnovationFlowTemplate(
            templateId,
            userRole
          );

          // Assert
          expect(removeRes.text).toContain(message);
        }
      );
    });
  });
});
