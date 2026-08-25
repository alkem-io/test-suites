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

    // Untouched-states default: the scenario space is an L0 Space created from the
    // platform default template, so states never customized carry the exact FR-009
    // positional defaults — 3rd tab (Subspaces) the third-tab list, 4th+ tabs the
    // generic default. Every default list starts [CREATE_POST, APPLICATION_BUTTON].
    const thirdTabDefault: SidebarWidgetWire[] = [
      'CREATE_POST',
      'APPLICATION_BUTTON',
      'INTENT',
    ];
    const genericDefault: SidebarWidgetWire[] = [
      'CREATE_POST',
      'APPLICATION_BUTTON',
      'INTENT',
      'INDEX',
    ];
    untouchedStates.forEach((state, index) => {
      expect(state.settings.sidebar).toEqual(
        index === 0 ? thirdTabDefault : genericDefault
      );
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

  test('apply-from-template onto an existing top-level Space honors the template sidebar on the fixed tabs, not the pre-apply target values', async () => {
    // Arrange: the base space is itself a top-level (L0) Space whose states already
    // exist with an established identity — the fixed-tab-preservation branch only
    // engages against an EXISTING top-level target, unlike the create-from-template
    // path exercised by the L1 case above. Give every state a distinctive
    // "template-source" sidebar and save it as a template.
    const before = await getCollaborationFlowStates(baseScenario.space.id);
    const beforeStates =
      before?.data?.lookup?.space?.collaboration?.innovationFlow?.states ?? [];
    expect(beforeStates.length).toBeGreaterThanOrEqual(2);

    const templateSourceSidebars: SidebarWidgetWire[][] = beforeStates.map(
      (_, index) =>
        index % 2 === 0 ? ['UPDATES', 'CONTACT_LEADS'] : ['ADD_USER']
    );
    // Sequential, not Promise.all: updateInnovationFlowState reads-modifies-writes the
    // whole flow aggregate, so concurrent sibling updates lost-update each other. This
    // arrange is not testing concurrency — it just needs each state set deterministically.
    for (let index = 0; index < beforeStates.length; index++) {
      await updateInnovationFlowStateSidebar(
        beforeStates[index].id,
        templateSourceSidebars[index],
        TestUser.SPACE_ADMIN
      );
    }

    const createRes = await createTemplateFromSpace(
      baseScenario.space.id,
      baseScenario.space.templateSetId,
      'Fixed-tab apply template'
    );
    // Register in the describe-scoped cleanup slot immediately, so the afterEach
    // deletes the template even when a later assertion in this test fails.
    sidebarTemplateId = createRes?.data?.createTemplateFromSpace?.id ?? '';
    expect(sidebarTemplateId).not.toEqual('');

    // Give the (still the same) target space its OWN, different pre-apply sidebar per
    // state — proof that a post-apply match to the template is not a false positive.
    const targetPreApplySidebars: SidebarWidgetWire[][] = beforeStates.map(
      () => ['GUIDELINES']
    );
    for (let index = 0; index < beforeStates.length; index++) {
      await updateInnovationFlowStateSidebar(
        beforeStates[index].id,
        targetPreApplySidebars[index],
        TestUser.SPACE_ADMIN
      );
    }

    const preApply = await getCollaborationFlowStates(baseScenario.space.id);
    const preApplyStates =
      preApply?.data?.lookup?.space?.collaboration?.innovationFlow?.states ??
      [];
    preApplyStates.forEach((state, index) => {
      expect(state.settings.sidebar).toEqual(targetPreApplySidebars[index]);
      expect(state.settings.sidebar).not.toEqual(
        templateSourceSidebars[index]
      );
    });

    // Act: apply the template onto the base space's OWN collaboration — the L0
    // fixed-tab-preservation branch, since the target already has established states.
    await updateCollaborationFromSpaceTemplate(
      baseScenario.space.collaboration.id,
      sidebarTemplateId
    );

    const applied = await getCollaborationFlowStates(baseScenario.space.id);
    const appliedStates =
      applied?.data?.lookup?.space?.collaboration?.innovationFlow?.states ??
      [];

    // Assert: tab identity is preserved by COUNT and POSITION (sortOrder), NOT by id —
    // the L0 apply path deletes and recreates states, regenerating ids by design while
    // preserving the fixed tabs' identity and order. Every tab's sidebar now carries the
    // template's list verbatim, overwriting the target's own pre-apply values.
    expect(appliedStates.length).toEqual(preApplyStates.length);
    expect(appliedStates.map(state => state.sortOrder)).toEqual(
      preApplyStates.map(state => state.sortOrder)
    );
    appliedStates.forEach((state, index) => {
      expect(state.settings.sidebar).toEqual(templateSourceSidebars[index]);
    });
    // No explicit delete here — the describe-level afterEach owns the cleanup.
  });
});
