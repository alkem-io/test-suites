import { templateInfoUpdate } from './space-template-testdata';
import { deleteTemplate, GetTemplateById } from '../template.request.params';

import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import {
  getSpaceTemplatesCount,
  createTemplateFromSpace,
  getSpaceTemplatesCountForSpace,
  updateSpaceTemplate,
} from './space-template.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let templateId = '';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'callouts',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: {
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
    },
  },
};
beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

/** @testCase TC-0800 */
describe('Subspace templates - CRUD', () => {
  afterEach(async () => {
    await deleteTemplate(templateId);
  });

  test('Create subspace template', async () => {
    // Arrange

    const countBefore = await getSpaceTemplatesCount(
      baseScenario.space.templateSetId
    );

    const res = await createTemplateFromSpace(
      baseScenario.subspace.id,
      baseScenario.space.templateSetId,
      'Subspace Template 1'
    );

    const collaborationData = res?.data?.createTemplateFromSpace;
    templateId = collaborationData?.id ?? '';

    // Act
    const countAfter = await getSpaceTemplatesCount(
      baseScenario.space.templateSetId
    );

    const getTemplate = await GetTemplateById(templateId);
    const templateData = getTemplate?.data?.lookup.template;

    // Assert
    expect(countAfter).toEqual((countBefore as number) + 1);
    expect(collaborationData).toEqual(
      expect.objectContaining({
        id: templateData?.id,
        type: templateData?.type,
      })
    );
  });

  test('Delete subspace template', async () => {
    // Arrange
    const countBefore = await getSpaceTemplatesCountForSpace(
      baseScenario.space.id
    );
    const res = await createTemplateFromSpace(
      baseScenario.subspace.id,
      baseScenario.space.templateSetId,
      'Subspace Template 2'
    );

    templateId = res?.data?.createTemplateFromSpace.id ?? '';

    // Act
    const resDeleteTemplate = await deleteTemplate(templateId);
    const countAfter = await getSpaceTemplatesCountForSpace(
      baseScenario.space.id
    );

    // Assert
    expect(countAfter).toEqual(countBefore);
    expect(resDeleteTemplate?.data?.deleteTemplate.id).toEqual(templateId);
  });

  test('Update subspace template', async () => {
    // Arrange
    const res = await createTemplateFromSpace(
      baseScenario.subspace.id,
      baseScenario.space.templateSetId,
      'Subspace Template 3'
    );
    const collaborationData = res?.data?.createTemplateFromSpace;
    templateId = collaborationData?.id ?? '';

    const resUpdateTemplate = await updateSpaceTemplate(
      templateId,
      templateInfoUpdate
    );
    const resBaseData = resUpdateTemplate?.data?.updateTemplate;

    expect(resBaseData?.profile).toEqual(
      expect.objectContaining({
        displayName: templateInfoUpdate.displayName,
        description: templateInfoUpdate.description,
      })
    );
  });
});
