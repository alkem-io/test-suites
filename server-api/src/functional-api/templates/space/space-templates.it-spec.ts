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
  updateCollaborationFromSpaceTemplate,
} from './space-template.request.params';
import {
  getCollaborationFlowStates,
  getTemplateContentSpaceFlowStates,
  updateInnovationFlowStateSidebar,
  SidebarWidgetWire,
} from './innovation-flow.request.params';
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

describe('innovation flow state sidebar round-trip', () => {
  let sidebarTemplateId = '';

  afterEach(async () => {
    if (sidebarTemplateId) {
      await deleteTemplate(sidebarTemplateId);
      sidebarTemplateId = '';
    }
  });

  test('save-as-template then apply-from-template carries the sidebar verbatim, content and order, including empty', async () => {
    // Arrange: customize the sidebar on two states of the base space, leave the rest
    // untouched.
    const before = await getCollaborationFlowStates(baseScenario.space.id);
    const beforeStates =
      before?.data?.lookup?.space?.collaboration?.innovationFlow?.states ?? [];
    expect(beforeStates.length).toBeGreaterThanOrEqual(2);

    const [firstState, secondState, ...untouchedStates] = beforeStates;

    const customSidebar: SidebarWidgetWire[] = [
      'EVENTS',
      'GUIDELINES',
      'INTENT',
    ];
    const emptySidebar: SidebarWidgetWire[] = [];

    const firstUpdate = await updateInnovationFlowStateSidebar(
      firstState.id,
      customSidebar,
      TestUser.SPACE_ADMIN
    );
    const secondUpdate = await updateInnovationFlowStateSidebar(
      secondState.id,
      emptySidebar,
      TestUser.SPACE_ADMIN
    );

    expect(
      firstUpdate?.data?.updateInnovationFlowState.settings.sidebar
    ).toEqual(customSidebar);
    expect(
      secondUpdate?.data?.updateInnovationFlowState.settings.sidebar
    ).toEqual(emptySidebar);

    // Untouched-states default: states never customized still carry a non-null
    // sidebar array (backfill/create default), independent of its exact content.
    untouchedStates.forEach(state => {
      expect(Array.isArray(state.settings.sidebar)).toBe(true);
    });

    // Act (save fidelity): save the base space as a template and read the template's
    // content-space flow states back.
    const createRes = await createTemplateFromSpace(
      baseScenario.space.id,
      baseScenario.space.templateSetId,
      'Sidebar round-trip template'
    );
    sidebarTemplateId = createRes?.data?.createTemplateFromSpace?.id ?? '';
    expect(sidebarTemplateId).not.toEqual('');

    const templateRead =
      await getTemplateContentSpaceFlowStates(sidebarTemplateId);
    const templateStates =
      templateRead?.data?.lookup?.template?.contentSpace?.collaboration
        ?.innovationFlow?.states ?? [];

    expect(templateStates.length).toEqual(beforeStates.length);
    expect(templateStates[0].settings.sidebar).toEqual(customSidebar);
    expect(templateStates[1].settings.sidebar).toEqual(emptySidebar);

    // Act (apply fidelity): apply the template onto the scenario subspace's
    // collaboration — L1, wholesale replace, no fixed-tab interference.
    await updateCollaborationFromSpaceTemplate(
      baseScenario.subspace.collaboration.id,
      sidebarTemplateId
    );

    const applied = await getCollaborationFlowStates(baseScenario.subspace.id);
    const appliedStates =
      applied?.data?.lookup?.space?.collaboration?.innovationFlow?.states ?? [];

    expect(appliedStates.length).toEqual(templateStates.length);
    appliedStates.forEach((state, index) => {
      expect(state.settings.sidebar).toEqual(
        templateStates[index].settings.sidebar
      );
    });
    expect(appliedStates[0].settings.sidebar).toEqual(customSidebar);
    expect(appliedStates[1].settings.sidebar).toEqual(emptySidebar);
  });
});
