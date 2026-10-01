import { templateInfoUpdate } from './space-template-testdata';
import { deleteTemplate, GetTemplateById } from '../template.request.params';

import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  getSpaceTemplatesCount,
  createTemplateFromSpace,
  getSpaceTemplatesCountForSpace,
  updateSpaceTemplate,
  updateCollaborationFromSpaceTemplate,
} from './space-template.request.params';
import {
  getTemplateContentSpaceFlowStates,
  updateInnovationFlowStateSidebar,
  updateInnovationFlowStatesSortOrder,
} from './space-template.request.params';
import {
  getInnovationFlowStatesWithIds,
  updateInnovationFlowState,
} from '@functional-api/innovation-flow/innovation-flow.request.params';
import { SidebarWidget } from '@alkemio/tests-lib/core/generated/alkemio-schema';
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

// workspace#040-sidebar-widget-config (client-web#10092). FR-009 positional defaults for an
// L0 Space created from the platform default template, with SEARCH placed by the 055 rule
// (before the first INDEX, else after the last create button).
const L0_DEFAULT_SIDEBARS: SidebarWidget[][] = [
  [
    SidebarWidget.Intent,
    SidebarWidget.About,
    SidebarWidget.CreatePost,
    SidebarWidget.Search,
    SidebarWidget.ApplicationButton,
    SidebarWidget.SubspaceLinks,
    SidebarWidget.Events,
    SidebarWidget.Updates,
  ],
  [
    SidebarWidget.Intent,
    SidebarWidget.CreatePost,
    SidebarWidget.Search,
    SidebarWidget.ApplicationButton,
    SidebarWidget.ContactLeads,
    SidebarWidget.AddUser,
    SidebarWidget.VirtualContributors,
    SidebarWidget.Guidelines,
  ],
  [
    SidebarWidget.Intent,
    SidebarWidget.CreateSubspace,
    SidebarWidget.CreatePost,
    SidebarWidget.Search,
    SidebarWidget.ApplicationButton,
  ],
  [
    SidebarWidget.Intent,
    SidebarWidget.CreatePost,
    SidebarWidget.ApplicationButton,
    SidebarWidget.Search,
    SidebarWidget.Index,
  ],
];
// FR-009 subspace / added-tab default.
const GENERIC_DEFAULT_SIDEBAR = L0_DEFAULT_SIDEBARS[3];

/** A Space's flow states in tab order, failing loudly if the read itself failed. */
const readFlow = async (spaceId: string) => {
  const res = await getInnovationFlowStatesWithIds(spaceId);
  expect(res.error).toBeUndefined();
  const flow = res.data?.lookup.space?.collaboration.innovationFlow;
  expect(flow?.states.length).toBeGreaterThan(0);
  return {
    flowId: flow?.id ?? '',
    states: [...(flow?.states ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
  };
};

const setSidebar = async (stateId: string, sidebar: SidebarWidget[]) => {
  const res = await updateInnovationFlowStateSidebar(
    stateId,
    sidebar,
    TestUser.SPACE_ADMIN
  );
  expect(res.error).toBeUndefined();
  // FR-003: the mutation's own response serializes the stored list.
  expect(res.data?.updateInnovationFlowState.settings.sidebar).toEqual(sidebar);
};

describe('innovation flow state sidebar round-trip', () => {
  let sidebarTemplateId = '';

  afterEach(async () => {
    if (sidebarTemplateId) {
      await deleteTemplate(sidebarTemplateId);
      sidebarTemplateId = '';
    }
  });

  test('save-as-template then apply onto a subspace carries every state sidebar verbatim, content and order, including empty', async () => {
    // US4-AS1: every FR-009 position of a fresh L0 Space carries its default list.
    const { states: spaceStates } = await readFlow(baseScenario.space.id);
    expect(spaceStates.map(state => state.settings.sidebar)).toEqual(
      L0_DEFAULT_SIDEBARS
    );
    // US4-AS3 (store half): subspace states carry the generic default.
    const { states: subspaceStates } = await readFlow(baseScenario.subspace.id);
    subspaceStates.forEach(state =>
      expect(state.settings.sidebar).toEqual(GENERIC_DEFAULT_SIDEBAR)
    );

    // Arrange: four distinct lists — a reordered custom list, an explicit empty list, and
    // the two untouched (and mutually different) defaults.
    const sourceSidebars: SidebarWidget[][] = [
      [SidebarWidget.Events, SidebarWidget.Guidelines, SidebarWidget.Intent],
      [],
      L0_DEFAULT_SIDEBARS[2],
      L0_DEFAULT_SIDEBARS[3],
    ];
    await setSidebar(spaceStates[0].id, sourceSidebars[0]);
    await setSidebar(spaceStates[1].id, sourceSidebars[1]);
    const expected = spaceStates.map((state, index) => [
      state.displayName,
      sourceSidebars[index],
    ]);

    // Act + assert (US3-AS1): the template carries each state's list verbatim.
    const createRes = await createTemplateFromSpace(
      baseScenario.space.id,
      baseScenario.space.templateSetId,
      'Sidebar round-trip template'
    );
    expect(createRes.error).toBeUndefined();
    sidebarTemplateId = createRes.data?.createTemplateFromSpace.id ?? '';
    expect(sidebarTemplateId).not.toEqual('');

    const templateRes =
      await getTemplateContentSpaceFlowStates(sidebarTemplateId);
    expect(templateRes.error).toBeUndefined();
    const templateStates = [
      ...(templateRes.data?.lookup.template.contentSpace.collaboration
        .innovationFlow.states ?? []),
    ].sort((a, b) => a.sortOrder - b.sortOrder);
    expect(
      templateStates.map(state => [state.displayName, state.settings.sidebar])
    ).toEqual(expected);

    // Act + assert (US3-AS2, update path): applying it onto the L1 subspace reproduces
    // every state, its position and its list — the empty list stays empty.
    const applyRes = await updateCollaborationFromSpaceTemplate(
      baseScenario.subspace.collaboration.id,
      sidebarTemplateId
    );
    expect(applyRes.error).toBeUndefined();

    const { states: applied } = await readFlow(baseScenario.subspace.id);
    expect(
      applied.map(state => [state.displayName, state.settings.sidebar])
    ).toEqual(expected);
  });

  test('apply-from-template onto an existing L0 Space replaces its flow wholesale: template states, order and sidebars arrive verbatim over the target values', async () => {
    // Since server#6418 an L0 Space has no fixed tabs (L0_FIXED_INNOVATION_FLOW_STATES = 0),
    // so applying a template replaces every state, exactly as on a subspace.
    // Donor: the subspace, with every state renamed, given its own list, and the order
    // reversed — so creation order, rank and name all disagree, and any pairing other
    // than "the template's state, in the template's order" is caught.
    const donorLists: SidebarWidget[][] = [
      [SidebarWidget.Updates, SidebarWidget.ContactLeads],
      [SidebarWidget.AddUser],
      [SidebarWidget.Index, SidebarWidget.Intent],
      [
        SidebarWidget.VirtualContributors,
        SidebarWidget.Events,
        SidebarWidget.About,
      ],
      [SidebarWidget.Guidelines],
    ];
    const runId = UniqueIDGenerator.getID();
    const donor = await readFlow(baseScenario.subspace.id);
    expect(donor.states.length).toBeLessThanOrEqual(donorLists.length);
    for (const [index, state] of donor.states.entries()) {
      const renameRes = await updateInnovationFlowState(
        state.id,
        `Donor ${index} ${runId}`
      );
      expect(renameRes.error).toBeUndefined();
      await setSidebar(state.id, donorLists[index]);
    }
    const reorderRes = await updateInnovationFlowStatesSortOrder(
      donor.flowId,
      [...donor.states].reverse().map(state => state.id)
    );
    expect(reorderRes.error).toBeUndefined();
    const { states: donorStates } = await readFlow(baseScenario.subspace.id);
    const expected = donorStates.map(state => [
      state.displayName,
      state.settings.sidebar,
    ]);
    // The reversal took: the last-created state now leads.
    expect(expected[0]).toEqual([
      `Donor ${donor.states.length - 1} ${runId}`,
      donorLists[donor.states.length - 1],
    ]);

    const createRes = await createTemplateFromSpace(
      baseScenario.subspace.id,
      baseScenario.space.templateSetId,
      'Wholesale L0 apply template'
    );
    expect(createRes.error).toBeUndefined();
    sidebarTemplateId = createRes.data?.createTemplateFromSpace.id ?? '';
    expect(sidebarTemplateId).not.toEqual('');

    // The target's own pre-apply values differ from every donor list.
    const { states: target } = await readFlow(baseScenario.space.id);
    for (const state of target) {
      await setSidebar(state.id, [SidebarWidget.Search]);
    }

    // Act
    const applyRes = await updateCollaborationFromSpaceTemplate(
      baseScenario.space.collaboration.id,
      sidebarTemplateId
    );
    expect(applyRes.error).toBeUndefined();

    // Assert: the L0 now has the donor's states, names, relative order and lists.
    const { states: applied } = await readFlow(baseScenario.space.id);
    expect(
      applied.map(state => [state.displayName, state.settings.sidebar])
    ).toEqual(expected);
  });
});
