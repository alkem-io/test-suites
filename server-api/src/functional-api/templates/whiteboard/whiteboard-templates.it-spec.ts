import { GetTemplateById } from '@functional-api/templates/template.request.params';
import {
  createWhiteboardTemplate,
  getWhiteboardTemplatesCount,
} from './whiteboard-templates.request.params';
import { deleteTemplate } from '../template.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/dist/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig, TestScenarioFactory } from '@alkemio/tests-lib';

let templateId = '';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'templates-whiteboard',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
    subspace: {
      collaboration: {
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
      },
      subspace: {
        collaboration: {
          addPostCallout: true,
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
        },
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

beforeEach(async () => {});

describe('WHITEBOARD templates - CRUD', () => {
  afterEach(async () => {
    await deleteTemplate(templateId);
  });
  test('Create Whiteboard template', async () => {
    // Arrange
    const countBefore = await getWhiteboardTemplatesCount(
      baseScenario.space.templateSetId
    );
    // Act
    const resCreateTemplate = await createWhiteboardTemplate(
      baseScenario.space.templateSetId
    );
    const whiteboardData = resCreateTemplate?.data?.createTemplate;
    templateId = whiteboardData?.id ?? '';
    const countAfter = await getWhiteboardTemplatesCount(
      baseScenario.space.templateSetId
    );

    const getTemplate = await GetTemplateById(templateId);
    const templateData = getTemplate?.data?.lookup.template;

    // Assert
    expect(countAfter).toEqual((countBefore as number) + 1);
    expect(whiteboardData).toEqual(
      expect.objectContaining({
        id: templateData?.id,
        type: templateData?.type,
      })
    );
  });

  test('Delete Whiteboard template', async () => {
    // Arrange
    const resCreatePostTempl = await createWhiteboardTemplate(
      baseScenario.space.templateSetId
    );
    templateId = resCreatePostTempl?.data?.createTemplate.id ?? '';
    const countBefore = await getWhiteboardTemplatesCount(
      baseScenario.space.templateSetId
    );

    // Act
    const remove = await deleteTemplate(templateId);
    const countAfter = await getWhiteboardTemplatesCount(
      baseScenario.space.templateSetId
    );

    // Assert
    expect(countAfter).toEqual((countBefore as number) - 1);
    expect(remove?.data?.deleteTemplate.id).toEqual(templateId);
  });
});
