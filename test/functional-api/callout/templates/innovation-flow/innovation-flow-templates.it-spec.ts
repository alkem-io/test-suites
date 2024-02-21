import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils/token.helper';
import { deleteSpaceCodegen } from '../../../journey/space/space.request.params';
import {
  emptyLifecycleDefaultDefinition,
  errorAuthCreateInnovationFlow,
  errorAuthDeleteInnovationFlow,
  errorAuthUpdateInnovationFlow,
  errorDeleteLastInnovationFlowTemplate,
  errorInvalidDescription,
  errorInvalidType,
  errorNoInnovationFlow,
  lifecycleDefaultDefinition,
  lifecycleDefinitionUpdate,
  templateInfoUpdate,
} from '../../../lifecycle/innovation-flow-template-testdata';
import {
  createInnovationFlowTemplateCodegen,
  deleteInnovationFlowTemplateCodegen,
  getInnovationFlowTemplatesCountForSpace,
  updateInnovationFlowTemplateCodegen,
} from '../../../lifecycle/innovation-flow.request.params';
import { deleteOrganizationCodegen } from '../../../organization/organization.request.params';
import { createOrgAndSpaceWithUsersCodegen } from '@test/utils/data-setup/entities';
import { InnovationFlowType } from '@alkemio/client-lib';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';

const organizationName = 'lifec-org-name' + uniqueId;
const hostNameId = 'lifec-org-nameid' + uniqueId;
const spaceName = 'lifec-eco-name' + uniqueId;
const spaceNameId = 'lifec-eco-nameid' + uniqueId;
let templateId = '';
beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('InnovationFlow templates - Remove last template', () => {
  test('should NOT delete default innovationFlow templates, as they are the only', async () => {
    // Arrange
    const countBefore = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Act
    const res1 = await deleteInnovationFlowTemplateCodegen(
      entitiesId.spaceInnovationFlowTemplateOppId,
      TestUser.GLOBAL_ADMIN
    );
    const res2 = await deleteInnovationFlowTemplateCodegen(
      entitiesId.spaceInnovationFlowTemplateChId,
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

  test('should delete default innovationFlow templates, as there are new with same types', async () => {
    // Arrange
    const resTemplateOne = await createInnovationFlowTemplateCodegen(
      entitiesId.spaceTemplateId,
      InnovationFlowType.Challenge,
      { profile: { displayName: 'inno1' } }
    );
    templateId = resTemplateOne?.data?.createInnovationFlowTemplate.id ?? '';

    // Arrange
    const resTemplateTwo = await createInnovationFlowTemplateCodegen(
      entitiesId.spaceTemplateId,
      InnovationFlowType.Opportunity,
      { profile: { displayName: 'inno2' } }
    );
    templateId = resTemplateTwo?.data?.createInnovationFlowTemplate.id ?? '';

    const countBefore = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Act
    const res1 = await deleteInnovationFlowTemplateCodegen(
      entitiesId.spaceInnovationFlowTemplateOppId,
      TestUser.GLOBAL_ADMIN
    );
    const res2 = await deleteInnovationFlowTemplateCodegen(
      entitiesId.spaceInnovationFlowTemplateChId,
      TestUser.GLOBAL_ADMIN
    );

    const countAfter = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Assert
    expect(countAfter).toEqual((countBefore as number) - 2);
    expect(res1.data?.deleteInnovationFlowTemplate.id).toEqual(
      entitiesId.spaceInnovationFlowTemplateOppId
    );
    expect(res2.data?.deleteInnovationFlowTemplate.id).toEqual(
      entitiesId.spaceInnovationFlowTemplateChId
    );
  });
});

describe('InnovationFlow templates - CRUD', () => {
  afterEach(async () => {
    await deleteInnovationFlowTemplateCodegen(templateId);
  });
  test('Delete innovationFlow template', async () => {
    // Arrange

    const res = await createInnovationFlowTemplateCodegen(
      entitiesId.spaceTemplateId,
      InnovationFlowType.Challenge,
      { profile: { displayName: 'inno3' } }
    );
    templateId = res?.data?.createInnovationFlowTemplate.id ?? '';
    const countBefore = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );
    // Act
    const resDeleteTemplate = await deleteInnovationFlowTemplateCodegen(
      templateId
    );
    const countAfter = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );
    // Assert
    expect(countAfter).toEqual((countBefore ?? 0) - 1);
    expect(resDeleteTemplate?.data?.deleteInnovationFlowTemplate.id).toEqual(
      templateId
    );
  });

  test('Update innovationFlow template', async () => {
    const res = await createInnovationFlowTemplateCodegen(
      entitiesId.spaceTemplateId,
      InnovationFlowType.Challenge,
      { profile: { displayName: 'inno4' } }
    );
    const templateId = res?.data?.createInnovationFlowTemplate.id ?? '';

    const resUpdateTemplate = await updateInnovationFlowTemplateCodegen(
      templateId,
      templateInfoUpdate,
      lifecycleDefinitionUpdate
    );
    const resBaseData = resUpdateTemplate?.data?.updateInnovationFlowTemplate;

    expect(resBaseData).toEqual(
      expect.objectContaining({
        id: templateId,
        type: 'CHALLENGE',
        definition: lifecycleDefinitionUpdate,
      })
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
      type             | profile
      ${'CHALLENGE'}   | ${{ profile: { displayName: 'inno5' } }}
      ${'OPPORTUNITY'} | ${{ profile: { displayName: 'inno6' } }}
    `('should create "$type" template', async ({ type, profile }) => {
      // Act
      const res = await createInnovationFlowTemplateCodegen(
        entitiesId.spaceTemplateId,
        type,
        profile
      );
      const templateData = res?.data?.createInnovationFlowTemplate;
      templateId = templateData?.id ?? '';

      // Assert
      expect(templateData).toEqual(
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
    await deleteInnovationFlowTemplateCodegen(templateId);
  });
  test('Should fail creation of identical innovationFlow templates', async () => {
    // Arrange
    const countBefore = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Act
    const resTemplateOne = await createInnovationFlowTemplateCodegen(
      entitiesId.spaceTemplateId
    );
    templateId = resTemplateOne?.data?.createInnovationFlowTemplate.id ?? '';
    const resTemplateTwo = await createInnovationFlowTemplateCodegen(
      entitiesId.spaceTemplateId
    );

    const countAfter = await getInnovationFlowTemplatesCountForSpace(
      entitiesId.spaceId
    );

    // Assert
    expect(countAfter).toEqual((countBefore as number) + 1);
    expect(resTemplateTwo.error?.errors[0].message).toEqual(
      'InnovationFlow Template with the provided type already exists: Innovation flow - Display Name'
    );
  });

  describe('Should FAIL to create innovationFlow template', () => {
    // Arrange
    test.each`
      type                            | definition                         | info                                      | result                     | errorType
      ${' '}                          | ${lifecycleDefaultDefinition}      | ${{ profile: { displayName: 'inno7a' } }} | ${errorInvalidType}        | ${'Invalid type'}
      ${InnovationFlowType.Challenge} | ${emptyLifecycleDefaultDefinition} | ${{ profile: { displayName: 'inno8a' } }} | ${errorInvalidDescription} | ${'Invalid definition'}
    `(
      'should fail to create template with invalid: "$errorType"',
      async ({ type, definition, info, result }) => {
        // Act
        const res = await createInnovationFlowTemplateCodegen(
          entitiesId.spaceTemplateId,
          type,
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
    const res = await deleteInnovationFlowTemplateCodegen(
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
        await deleteInnovationFlowTemplateCodegen(templateId);
      });
      test.each`
        userRole                 | message    | profile
        ${TestUser.GLOBAL_ADMIN} | ${'inno8'} | ${{ profile: { displayName: 'inno8' } }}
        ${TestUser.HUB_ADMIN}    | ${'inno9'} | ${{ profile: { displayName: 'inno9' } }}
      `(
        'User: "$userRole" creates successfully space innovationFlow template ',
        async ({ userRole, message, profile }) => {
          // Act
          const resTemplateOne = await createInnovationFlowTemplateCodegen(
            entitiesId.spaceTemplateId,
            InnovationFlowType.Challenge,
            profile,
            lifecycleDefaultDefinition,
            userRole
          );

          const templateData =
            resTemplateOne?.data?.createInnovationFlowTemplate;
          templateId = templateData?.id ?? '';

          // Assert
          expect(
            resTemplateOne.data?.createInnovationFlowTemplate.profile
              .displayName
          ).toEqual(message);
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
          const resTemplateOne = await createInnovationFlowTemplateCodegen(
            entitiesId.spaceTemplateId,
            InnovationFlowType.Challenge,
            profile,
            lifecycleDefaultDefinition,
            //            templateInfoUpdate,
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
      const resCreateLifecycleTempl = await createInnovationFlowTemplateCodegen(
        entitiesId.spaceTemplateId,
        InnovationFlowType.Challenge,
        { profile: { displayName: 'inno12' } }
      );
      const templateData =
        resCreateLifecycleTempl?.data?.createInnovationFlowTemplate;
      templateId = templateData?.id ?? '';
    });
    afterAll(async () => {
      await deleteInnovationFlowTemplateCodegen(templateId);
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
          const resUpdateTemplate = await updateInnovationFlowTemplateCodegen(
            templateId,
            templateInfoUpdate,
            lifecycleDefaultDefinition,
            userRole
          );

          // Assert
          expect(
            resUpdateTemplate.data?.updateInnovationFlowTemplate.profile
              .displayName
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
          const resUpdateTemplate = await updateInnovationFlowTemplateCodegen(
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
        await deleteInnovationFlowTemplateCodegen(templateId);
      });
      test.each`
        userRole                 | profile
        ${TestUser.GLOBAL_ADMIN} | ${{ profile: { displayName: 'inno13' } }}
        ${TestUser.HUB_ADMIN}    | ${{ profile: { displayName: 'inno14' } }}
      `(
        'User: "$userRole" get message: "$message", when intend to remove space innovationFlow template ',
        async ({ userRole, profile }) => {
          // Act
          const resCreateLifecycleTempl = await createInnovationFlowTemplateCodegen(
            entitiesId.spaceTemplateId,
            InnovationFlowType.Challenge,
            profile
          );
          const templateData =
            resCreateLifecycleTempl?.data?.createInnovationFlowTemplate;
          templateId = templateData?.id ?? '';

          const removeRes = await deleteInnovationFlowTemplateCodegen(
            templateId,
            userRole
          );
          // Assert
          expect(removeRes.data?.deleteInnovationFlowTemplate.id).toEqual(
            templateId
          );
        }
      );

      test.each`
        userRole                   | message                          | profile
        ${TestUser.HUB_MEMBER}     | ${errorAuthDeleteInnovationFlow} | ${{ profile: { displayName: 'inno15' } }}
        ${TestUser.NON_HUB_MEMBER} | ${errorAuthDeleteInnovationFlow} | ${{ profile: { displayName: 'inno16' } }}
      `(
        'User: "$userRole" get ERROR message: "$message", when intend to remove space innovationFlow template ',
        async ({ userRole, message, profile }) => {
          // Act
          const resCreateLifecycleTempl = await createInnovationFlowTemplateCodegen(
            entitiesId.spaceTemplateId,
            InnovationFlowType.Challenge,
            profile
          );
          const templateData =
            resCreateLifecycleTempl?.data?.createInnovationFlowTemplate;
          templateId = templateData?.id ?? '';

          const removeRes = await deleteInnovationFlowTemplateCodegen(
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
