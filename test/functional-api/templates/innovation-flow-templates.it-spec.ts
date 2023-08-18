import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { removeSpace } from '../integration/space/space.request.params';
import {
  emptyLifecycleDefaultDefinition,
  errorAuthCreateInnovationFlow,
  errorAuthDeleteInnovationFlow,
  errorAuthUpdateInnovationFlow,
  errorDeleteLastInnovationFlowTemplate,
  errorInvalidDescription,
  errorInvalidInfo,
  errorInvalidType,
  errorNoInnovationFlow,
  lifecycleDefaultDefinition,
  lifecycleDefinitionUpdate,
  templateInfoUpdate,
} from '../integration/lifecycle/innovation-flow-template-testdata';
import {
  createInnovationFlowTemplate,
  deleteInnovationFlowTemplate,
  getInnovationFlowTemplatesCountForSpace,
  updateInnovationFlowTemplate,
} from '../integration/lifecycle/innovation-flow.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { entitiesId } from '../zcommunications/communications-helper';
import { createOrgAndSpaceWithUsers } from '../zcommunications/create-entities-with-users-helper';

const organizationName = 'lifec-org-name' + uniqueId;
const hostNameId = 'lifec-org-nameid' + uniqueId;
const spaceName = 'lifec-eco-name' + uniqueId;
const spaceNameId = 'lifec-eco-nameid' + uniqueId;
let innFlowDisplayName: string;
let templateId = '';
beforeAll(async () => {
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

beforeEach(async () => {
  innFlowDisplayName = 'Challenge template' + uniqueId;
});

afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('InnovationFlow templates - Remove last template', () => {
  beforeEach(async () => {
    innFlowDisplayName = 'Challenge template' + uniqueId;
  });
  test('should NOT delete default innovationFlow templates, as they are the only', async () => {
    // Arrange
    const countBefore = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Act
    const res1 = await deleteInnovationFlowTemplate(
      entitiesId.spaceInnovationFlowTemplateOppId,
      TestUser.GLOBAL_ADMIN
    );
    const res2 = await deleteInnovationFlowTemplate(
      entitiesId.spaceInnovationFlowTemplateChId,
      TestUser.GLOBAL_ADMIN
    );

    const countAfter = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Assert
    expect(countAfter).toEqual(countBefore);
    expect(res1.text).toContain(errorDeleteLastInnovationFlowTemplate);
    expect(res2.text).toContain(errorDeleteLastInnovationFlowTemplate);
  });

  test('should delete default innovationFlow templates, as there are new with same types', async () => {
    // Arrange
    const resTemplateOne = await createInnovationFlowTemplate(
      entitiesId.spaceTemplateId,
      'CHALLENGE',
      { profile: { displayName: 'inno1' } }
    );
    templateId = resTemplateOne.body.data.createInnovationFlowTemplate.id;

    // Arrange
    const resTemplateTwo = await createInnovationFlowTemplate(
      entitiesId.spaceTemplateId,
      'OPPORTUNITY',
      { profile: { displayName: 'inno2' } }
    );
    templateId = resTemplateTwo.body.data.createInnovationFlowTemplate.id;

    const countBefore = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Act
    const res1 = await deleteInnovationFlowTemplate(
      entitiesId.spaceInnovationFlowTemplateOppId,
      TestUser.GLOBAL_ADMIN
    );
    const res2 = await deleteInnovationFlowTemplate(
      entitiesId.spaceInnovationFlowTemplateChId,
      TestUser.GLOBAL_ADMIN
    );
    const countAfter = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Assert
    expect(countAfter).toEqual(countBefore - 2);
    expect(res1.text).toContain('"data":{"deleteInnovationFlowTemplate"');
    expect(res2.text).toContain('"data":{"deleteInnovationFlowTemplate"');
  });
});

describe('InnovationFlow templates - CRUD', () => {
  afterEach(async () => {
    await deleteInnovationFlowTemplate(templateId);
  });
  test('Delete innovationFlow template', async () => {
    // Arrange

    const res = await createInnovationFlowTemplate(
      entitiesId.spaceTemplateId,
      'CHALLENGE',
      { profile: { displayName: 'inno3' } }
    );
    templateId = res.body.data.createInnovationFlowTemplate.id;
    const countBefore = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );
    // Act
    const resDeleteTemplate = await deleteInnovationFlowTemplate(templateId);
    const countAfter = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );
    // Assert
    expect(countAfter).toEqual(countBefore - 1);
    expect(resDeleteTemplate.body.data.deleteInnovationFlowTemplate.id).toEqual(
      templateId
    );
  });

  test('Update innovationFlow template', async () => {
    const res = await createInnovationFlowTemplate(
      entitiesId.spaceTemplateId,
      'CHALLENGE',
      { profile: { displayName: 'inno4' } }
    );
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

  describe('Create innovationFlow template', () => {
    // Arrange
    test.each`
      type             | profile
      ${'CHALLENGE'}   | ${{ profile: { displayName: 'inno5' } }}
      ${'OPPORTUNITY'} | ${{ profile: { displayName: 'inno6' } }}
    `('should create "$type" template', async ({ type, profile }) => {
      // Act
      const res = await createInnovationFlowTemplate(
        entitiesId.spaceTemplateId,
        type,
        profile
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

describe('Post templates - Negative Scenarios', () => {
  afterEach(async () => {
    await deleteInnovationFlowTemplate(templateId);
  });
  // Disabled due to bug: Missing validation - 2 identical innovationFlow templates can be created: bug: #2061
  test.skip('Should fail creation of identical innovationFlow templates', async () => {
    // Arrange
    const countBefore = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Act
    const resTemplateOne = await createInnovationFlowTemplate(
      entitiesId.spaceTemplateId
    );
    templateId = resTemplateOne.body.data.createInnovationFlowTemplate.id;
    const resTemplateTwo = await createInnovationFlowTemplate(
      entitiesId.spaceTemplateId
    );
    const templateIdTwo =
      resTemplateTwo.body.data.createInnovationFlowTemplate.id;

    const countAfter = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Assert
    expect(countAfter).toEqual(countBefore + 1);
    expect(resTemplateTwo).toContain('Error');
    await deleteInnovationFlowTemplate(templateIdTwo);
  });

  // skipping the tests, as validation for info is missing
  describe.skip('Should FAIL to create innovationFlow template', () => {
    // Arrange
    test.each`
      type           | definition                         | info                                     | result                     | errorType
      ${' '}         | ${lifecycleDefaultDefinition}      | ${{ profile: { displayName: 'inno7' } }} | ${errorInvalidType}        | ${'Invalid type'}
      ${'CHALLENGE'} | ${emptyLifecycleDefaultDefinition} | ${{ profile: { displayName: 'inno8' } }} | ${errorInvalidDescription} | ${'Invalid definition'}
      ${'CHALLENGE'} | ${lifecycleDefaultDefinition}      | ${{ profile: { displayName: 'inno9' } }} | ${errorInvalidInfo}        | ${'Invalid info: '}
    `(
      'should fail to create template with invalid: "$errorType"',
      async ({ type, definition, info, result }) => {
        // Act
        const res = await createInnovationFlowTemplate(
          entitiesId.spaceTemplateId,
          type,
          definition,
          info
        );
        // Assert
        expect(res.text).toContain(result);
      }
    );
  });

  test('Delete non existent InnovationFlow template', async () => {
    // Act
    const res = await deleteInnovationFlowTemplate(
      '0bade07d-6736-4ee2-93c0-b2af22a998ff'
    );

    // Assert
    expect(res.text).toContain(errorNoInnovationFlow);
  });
});

describe('InnovationFlow templates - CRUD Authorization', () => {
  describe('InnovationFlow templates - Create', () => {
    describe('DDT user privileges to create space innovationFlow template - positive', () => {
      // Arrange
      afterEach(async () => {
        await deleteInnovationFlowTemplate(templateId);
      });
      test.each`
        userRole                 | message                                     | profile
        ${TestUser.GLOBAL_ADMIN} | ${'"data":{"createInnovationFlowTemplate"'} | ${{ profile: { displayName: 'inno8' } }}
        ${TestUser.HUB_ADMIN}    | ${'"data":{"createInnovationFlowTemplate"'} | ${{ profile: { displayName: 'inno9' } }}
      `(
        'User: "$userRole" creates successfully space innovationFlow template ',
        async ({ userRole, message, profile }) => {
          // Act
          const resTemplateOne = await createInnovationFlowTemplate(
            entitiesId.spaceTemplateId,
            'CHALLENGE',
            profile,
            lifecycleDefaultDefinition,
            //templateInfoUpdate,
            userRole
          );

          templateId = resTemplateOne.body.data.createInnovationFlowTemplate.id;

          // Assert
          expect(resTemplateOne.text).toContain(message);
        }
      );
    });

    describe('DDT user privileges to create space innovationFlow template - negative', () => {
      // Arrange
      test.each`
        userRole                   | message                          | profile
        ${TestUser.HUB_MEMBER}     | ${errorAuthCreateInnovationFlow} | ${{ profile: { displayName: 'inno10' } }}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthCreateInnovationFlow} | ${{ profile: { displayName: 'inno11' } }}
      `(
        'User: "$userRole" get error message: "$message", when intend to create space innovationFlow template ',
        async ({ userRole, message, profile }) => {
          // Act
          const resTemplateOne = await createInnovationFlowTemplate(
            entitiesId.spaceTemplateId,
            'CHALLENGE',
            profile,
            lifecycleDefaultDefinition,
            //            templateInfoUpdate,
            userRole
          );

          // Assert
          expect(resTemplateOne.text).toContain(message);
        }
      );
    });
  });

  describe('InnovationFlow templates - Update', () => {
    beforeAll(async () => {
      const resCreateLifecycleTempl = await createInnovationFlowTemplate(
        entitiesId.spaceTemplateId,
        'CHALLENGE',
        { profile: { displayName: 'inno12' } }
      );
      templateId =
        resCreateLifecycleTempl.body.data.createInnovationFlowTemplate.id;
    });
    afterAll(async () => {
      await deleteInnovationFlowTemplate(templateId);
    });

    describe('DDT user privileges to update space innovationFlow template', () => {
      // Arrange

      test.each`
        userRole                   | message
        ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"updateInnovationFlowTemplate"'}
        ${TestUser.HUB_ADMIN}      | ${'"data":{"updateInnovationFlowTemplate"'}
        ${TestUser.HUB_MEMBER}     | ${errorAuthUpdateInnovationFlow}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthUpdateInnovationFlow}
      `(
        'User: "$userRole" get message: "$message", when intend to update space innovationFlow template ',
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

  describe('InnovationFlow templates - Remove', () => {
    describe('DDT user privileges to remove space innovationFlow template', () => {
      // Arrange
      afterEach(async () => {
        await deleteInnovationFlowTemplate(templateId);
      });
      test.each`
        userRole                   | message                                     | profile
        ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"deleteInnovationFlowTemplate"'} | ${{ profile: { displayName: 'inno13' } }}
        ${TestUser.HUB_ADMIN}      | ${'"data":{"deleteInnovationFlowTemplate"'} | ${{ profile: { displayName: 'inno14' } }}
        ${TestUser.HUB_MEMBER}     | ${errorAuthDeleteInnovationFlow}            | ${{ profile: { displayName: 'inno15' } }}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthDeleteInnovationFlow}            | ${{ profile: { displayName: 'inno16' } }}
      `(
        'User: "$userRole" get message: "$message", when intend to remove space innovationFlow template ',
        async ({ userRole, message, profile }) => {
          // Act
          const resCreateLifecycleTempl = await createInnovationFlowTemplate(
            entitiesId.spaceTemplateId,
            'CHALLENGE',
            profile
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
