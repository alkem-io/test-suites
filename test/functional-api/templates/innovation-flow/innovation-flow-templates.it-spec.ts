import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteSpace } from '../../journey/space/space.request.params';
import {
  emptyLifecycleDefaultDefinition,
  errorAuthCreateInnovationFlow,
  errorAuthDeleteInnovationFlow,
  errorAuthUpdateInnovationFlow,
  errorDeleteLastInnovationFlowTemplate,
  errorInvalidDescription,
  errorNoInnovationFlow,
  lifecycleDefaultDefinition,
  lifecycleDefinitionUpdate,
  templateInfoUpdate,
} from '../lifecycle/innovation-flow-template-testdata';
import {
  createInnovationFlowTemplate,
  deleteInnovationFlowTemplate,
  getInnovationFlowTemplatesCountForSpace,
  updateInnovationFlowTemplate,
} from '../lifecycle/innovation-flow.request.params';
import { deleteOrganization } from '../../contributor-management/organization/organization.request.params';
import { createOrgAndSpaceWithUsers } from '@test/utils/data-setup/entities';
import { entitiesId } from '@test/types/entities-helper';

const organizationName = 'lifec-org-name' + uniqueId;
const hostNameId = 'lifec-org-nameid' + uniqueId;
const spaceName = 'lifec-eco-name' + uniqueId;
const spaceNameId = 'lifec-eco-nameid' + uniqueId;
let templateId = '';
beforeAll(async () => {
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

afterAll(async () => {
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('InnovationFlow templates - Remove last template', () => {
  // skipping until we decide if we still want to be able to remove the last template
  test.skip('should NOT delete default innovationFlow templates, as they are the only', async () => {
    // Arrange
    const countBefore = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Act
    const res1 = await deleteInnovationFlowTemplate(
      entitiesId.space.innovationFlowTemplateOppId,
      TestUser.GLOBAL_ADMIN
    );
    const res2 = await deleteInnovationFlowTemplate(
      entitiesId.space.innovationFlowTemplateChId,
      TestUser.GLOBAL_ADMIN
    );

    const countAfter = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Assert
    expect(countAfter).toEqual(countBefore);
    expect(res1.error?.errors[0].message).toContain(
      errorDeleteLastInnovationFlowTemplate
    );
    expect(res2.error?.errors[0].message).toContain(
      errorDeleteLastInnovationFlowTemplate
    );
  });

  // skipping until we decide if we still want to be able to remove the last template
  test.skip('should delete default innovationFlow templates, as there are new with same types', async () => {
    // Arrange
    const resTemplateOne = await createInnovationFlowTemplate(
      entitiesId.space.templateSetId,
      { profile: { displayName: 'inno1' } }
    );
    templateId = resTemplateOne?.data?.createTemplate.id ?? '';

    // Arrange
    const resTemplateTwo = await createInnovationFlowTemplate(
      entitiesId.space.templateSetId,
      { profile: { displayName: 'inno2' } }
    );
    templateId = resTemplateTwo?.data?.createTemplate.id ?? '';

    const countBefore = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Act
    const res1 = await deleteInnovationFlowTemplate(
      entitiesId.space.innovationFlowTemplateOppId,
      TestUser.GLOBAL_ADMIN
    );
    const res2 = await deleteInnovationFlowTemplate(
      entitiesId.space.innovationFlowTemplateChId,
      TestUser.GLOBAL_ADMIN
    );

    const countAfter = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Assert
    expect(countAfter).toEqual((countBefore as number) - 2);
    expect(res1.data?.deleteTemplate.id).toEqual(
      entitiesId.space.innovationFlowTemplateOppId
    );
    expect(res2.data?.deleteTemplate.id).toEqual(
      entitiesId.space.innovationFlowTemplateChId
    );
  });
});

describe('InnovationFlow templates - CRUD', () => {
  afterEach(async () => {
    await deleteInnovationFlowTemplate(templateId);
  });
  test('Delete innovationFlow template', async () => {
    // Arrange

    const res = await createInnovationFlowTemplate(
      entitiesId.space.templateSetId,
      { displayName: 'inno3' }
    );
    templateId = res?.data?.createTemplate.id ?? '';
    const countBefore = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Act
    const resDeleteTemplate = await deleteInnovationFlowTemplate(
      templateId
    );

    const countAfter = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Assert
    expect(countAfter).toEqual((countBefore ?? 0) - 1);
    expect(resDeleteTemplate?.data?.deleteTemplate.id).toEqual(templateId);
  });

  test('Update innovationFlow template', async () => {
    const res = await createInnovationFlowTemplate(
      entitiesId.space.templateSetId,
      { displayName: 'inno4' }
    );
    const templateId = res?.data?.createTemplate.id ?? '';

    const resUpdateTemplate = await updateInnovationFlowTemplate(
      templateId,
      templateInfoUpdate,
      lifecycleDefinitionUpdate
    );
    const resBaseData = resUpdateTemplate?.data?.updateTemplate;

    expect(resBaseData?.innovationFlow?.states).toEqual(
      lifecycleDefinitionUpdate
    );
    expect(resBaseData?.profile).toEqual(
      expect.objectContaining({
        displayName: templateInfoUpdate.displayName,
        description: templateInfoUpdate.description,
      })
    );
  });

  describe('Create innovationFlow template', () => {
    // Arrange
    test.each`
      profile                                          | states
      ${{ displayName: 'inno5' }}                      | ${lifecycleDefaultDefinition}
      ${{ displayName: 'inno6', description: 'desc' }} | ${lifecycleDefaultDefinition}
    `('should create inovation flow template', async ({ profile, states }) => {
      // Act
      const res = await createInnovationFlowTemplate(
        entitiesId.space.templateSetId,
        profile,
        states
      );
      const templateData = res?.data?.createTemplate;
      templateId = templateData?.id ?? '';
      expect(templateData?.id).toBeDefined();
      expect(templateData?.profile).toEqual(
        expect.objectContaining({
          displayName: profile.displayName,
          description: profile.description ?? null,
        })
      );
      expect(templateData?.innovationFlow?.states).toEqual(states);
    });
  });
});

describe('Post templates - Negative Scenarios', () => {
  afterEach(async () => {
    await deleteInnovationFlowTemplate(templateId);
  });
  // I think it shouldn't fail
  test.skip('Should fail creation of identical innovationFlow templates', async () => {
    // Arrange
    const countBefore = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Act
    const resTemplateOne = await createInnovationFlowTemplate(
      entitiesId.space.templateSetId
    );
    const templateData = resTemplateOne?.data?.createTemplate;
    templateId = templateData?.id ?? '';
    const templateName = templateData?.profile?.displayName;

    const resTemplateTwo = await createInnovationFlowTemplate(
      entitiesId.space.templateSetId
    );

    const countAfter = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Assert
    expect(countAfter).toEqual((countBefore as number) + 1);
    expect(resTemplateTwo.error?.errors[0].message).toEqual(
      `InnovationFlow Template with the provided name already exists: ${templateName}`
    );
  });

  describe('Should FAIL to create innovationFlow template', () => {
    // Arrange
    test.each`
      definition                         | info                         | result                     | errorType
      ${emptyLifecycleDefaultDefinition} | ${{ displayName: 'inno8a' }} | ${errorInvalidDescription} | ${'Invalid definition'}
    `(
      'should fail to create template with invalid: "$errorType"',
      async ({ definition, info, result }) => {
        // Act
        const res = await createInnovationFlowTemplate(
          entitiesId.space.templateSetId,
          info,
          definition
        );

        // Assert
        expect(res.error?.errors[0].message).toContain(result);
      }
    );
  });

  test('Delete non existent InnovationFlow template', async () => {
    // Act
    const res = await deleteInnovationFlowTemplate(
      '0bade07d-6736-4ee2-93c0-b2af22a998ff'
    );

    // Assert
    expect(res.error?.errors[0]?.message).toContain(errorNoInnovationFlow);
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
        userRole                 | message    | profile
        ${TestUser.GLOBAL_ADMIN} | ${'inno8'} | ${{ displayName: 'inno8' }}
        ${TestUser.HUB_ADMIN}    | ${'inno9'} | ${{ displayName: 'inno9' }}
      `(
        'User: "$userRole" creates successfully space innovationFlow template ',
        async ({ userRole, message, profile }) => {
          // Act
          const resTemplateOne = await createInnovationFlowTemplate(
            entitiesId.space.templateSetId,
            profile,
            lifecycleDefaultDefinition,
            userRole
          );

          const templateData = resTemplateOne?.data?.createTemplate;
          templateId = templateData?.id ?? '';

          // Assert
          expect(
            resTemplateOne.data?.createTemplate.profile?.displayName
          ).toEqual(message);
        }
      );
    });

    describe('DDT user privileges to create space innovationFlow template - negative', () => {
      // Arrange
      test.each`
        userRole                   | message                          | profile
        ${TestUser.HUB_MEMBER}     | ${errorAuthCreateInnovationFlow} | ${{ displayName: 'inno10' }}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthCreateInnovationFlow} | ${{ displayName: 'inno11' }}
      `(
        'User: "$userRole" get error message: "$message", when intend to create space innovationFlow template ',
        async ({ userRole, message, profile }) => {
          // Act
          const resTemplateOne = await createInnovationFlowTemplate(
            entitiesId.space.templateSetId,
            profile,
            lifecycleDefaultDefinition,
            userRole
          );

          // Assert
          expect(resTemplateOne.error?.errors[0].message).toContain(message);
        }
      );
    });
  });

  describe('InnovationFlow templates - Update', () => {
    beforeAll(async () => {
      const resCreateLifecycleTempl = await createInnovationFlowTemplate(
        entitiesId.space.templateSetId,
        { displayName: 'inno12' }
      );
      const templateData = resCreateLifecycleTempl?.data?.createTemplate;
      templateId = templateData?.id ?? '';
    });
    afterAll(async () => {
      await deleteInnovationFlowTemplate(templateId);
    });

    describe('DDT user privileges to update space innovationFlow template', () => {
      // Arrange

      test.each`
        userRole                 | message
        ${TestUser.GLOBAL_ADMIN} | ${templateInfoUpdate.displayName}
        ${TestUser.HUB_ADMIN}    | ${templateInfoUpdate.displayName}
      `(
        'User: "$userRole" get message: "$message", when intend to update space innovationFlow template ',
        async ({ userRole, message }) => {
          // Act
          const resUpdateTemplate = await updateInnovationFlowTemplate(
            templateId,
            templateInfoUpdate,
            lifecycleDefaultDefinition,
            userRole
          );

          // Assert
          expect(
            resUpdateTemplate.data?.updateTemplate.profile?.displayName
          ).toContain(message);
        }
      );

      test.each`
        userRole                   | message
        ${TestUser.HUB_MEMBER}     | ${errorAuthUpdateInnovationFlow}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthUpdateInnovationFlow}
      `(
        'User: "$userRole" get ERROR message: "$message", when intend to update space innovationFlow template ',
        async ({ userRole, message }) => {
          // Act
          const resUpdateTemplate = await updateInnovationFlowTemplate(
            templateId,
            templateInfoUpdate,
            lifecycleDefaultDefinition,
            userRole
          );

          // Assert
          expect(resUpdateTemplate.error?.errors[0].message).toContain(message);
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
        userRole                 | profile
        ${TestUser.GLOBAL_ADMIN} | ${{ displayName: 'inno13' }}
        ${TestUser.HUB_ADMIN}    | ${{ displayName: 'inno14' }}
      `(
        'User: "$userRole" get message: "$message", when intend to remove space innovationFlow template ',
        async ({ userRole, profile }) => {
          // Act
          const resCreateLifecycleTempl = await createInnovationFlowTemplate(
            entitiesId.space.templateSetId,
            profile
          );
          const templateData = resCreateLifecycleTempl?.data?.createTemplate;
          templateId = templateData?.id ?? '';

          const removeRes = await deleteInnovationFlowTemplate(
            templateId,
            userRole
          );
          // Assert
          expect(removeRes.data?.deleteTemplate.id).toEqual(templateId);
        }
      );

      test.each`
        userRole                   | message                          | profile
        ${TestUser.HUB_MEMBER}     | ${errorAuthDeleteInnovationFlow} | ${{ displayName: 'inno15' }}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthDeleteInnovationFlow} | ${{ displayName: 'inno16' }}
      `(
        'User: "$userRole" get ERROR message: "$message", when intend to remove space innovationFlow template ',
        async ({ userRole, message, profile }) => {
          // Act
          const resCreateLifecycleTempl = await createInnovationFlowTemplate(
            entitiesId.space.templateSetId,
            profile
          );
          const templateData = resCreateLifecycleTempl?.data?.createTemplate;
          templateId = templateData?.id ?? '';

          const removeRes = await deleteInnovationFlowTemplate(
            templateId,
            userRole
          );

          // Assert
          expect(removeRes.error?.errors[0].message).toContain(message);
        }
      );
    });
  });
});
