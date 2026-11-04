// On a subspace (L1/L2) flow the sidebar lists belong to positions, not to phases: the
// first phase's list is the subspace sidebar. Reordering keeps every list at its rank, and
// deleting the first phase hands its list to the new first phase. On an L0 flow every list
// stays with its own tab. Template flows follow the level of the space they were made from.
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { SidebarWidget } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  createStateOnInnovationFlow,
  deleteStateOnInnovationFlow,
  getFlowStatesByCollaboration,
  updateInnovationFlowState,
  updateInnovationFlowStatesSortOrder,
} from '@functional-api/innovation-flow/innovation-flow.request.params';
import {
  createTemplateFromSpace,
  getTemplateContentSpaceFlowStates,
} from '@functional-api/templates/space/space-template.request.params';
import { deleteTemplate } from '@functional-api/templates/template.request.params';

const runId = UniqueIDGenerator.getID();

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'subspace-sidebar-positional',
  space: {
    collaboration: {
      addTutorialCallouts: false,
      addPostCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    subspace: {
      collaboration: {
        addPostCallout: true,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_ADMIN],
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

type RankedState = { id: string; sortOrder: number };

/**
 * Flow rank: sortOrder ascending, ties broken by the lower id compared as a plain lowercase
 * string — the same rule the server and the client use to find the first phase.
 */
const byRank = (a: RankedState, b: RankedState) => {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  const left = a.id.toLowerCase();
  const right = b.id.toLowerCase();
  return left < right ? -1 : left > right ? 1 : 0;
};

/** A collaboration's flow with its states ranked, failing loudly if the read failed. */
const readFlow = async (collaborationId: string) => {
  const res = await getFlowStatesByCollaboration(collaborationId);
  expect(res.error).toBeUndefined();
  const flow = res.data?.lookup.collaboration.innovationFlow;
  expect(flow?.states.length).toBeGreaterThan(0);
  return {
    flowId: flow?.id ?? '',
    states: [...(flow?.states ?? [])].sort(byRank),
  };
};

/** A template's content-space flow with its states ranked. */
const readTemplateFlow = async (templateId: string) => {
  const res = await getTemplateContentSpaceFlowStates(templateId);
  expect(res.error).toBeUndefined();
  const flow =
    res.data?.lookup.template.contentSpace.collaboration.innovationFlow;
  expect(flow?.states.length).toBeGreaterThan(0);
  return {
    flowId: flow?.id ?? '',
    states: [...(flow?.states ?? [])].sort(byRank),
  };
};

const setSidebar = async (stateId: string, sidebar: SidebarWidget[]) => {
  const res = await updateInnovationFlowState(stateId, undefined, undefined, {
    sidebar,
  });
  expect(res.error).toBeUndefined();
};

const setVisible = async (stateId: string, visible: boolean) => {
  const res = await updateInnovationFlowState(stateId, undefined, undefined, {
    visible,
  });
  expect(res.error).toBeUndefined();
};

/** Pads a collaboration's flow with new phases until it has at least `count` of them. */
const ensureAtLeastStates = async (collaborationId: string, count: number) => {
  const flow = await readFlow(collaborationId);
  for (let index = flow.states.length; index < count; index++) {
    const res = await createStateOnInnovationFlow(
      flow.flowId,
      `Phase ${index + 1} ${runId}`
    );
    expect(res.error).toBeUndefined();
  }
  const padded = await readFlow(collaborationId);
  expect(padded.states.length).toBeGreaterThanOrEqual(count);
  return padded;
};

const sidebarsById = (
  states: { id: string; settings: { sidebar: SidebarWidget[] } }[]
) =>
  Object.fromEntries(states.map(state => [state.id, state.settings.sidebar]));

// Three mutually distinct lists, using the widgets this feature introduced.
const la: SidebarWidget[] = [SidebarWidget.Intent, SidebarWidget.Community];
const lb: SidebarWidget[] = [
  SidebarWidget.About,
  SidebarWidget.Events,
  SidebarWidget.Activity,
];
const lc: SidebarWidget[] = [SidebarWidget.Search, SidebarWidget.Index];

describe('Subspace sidebar - positional reorder', () => {
  test('reordering an L1 flow keeps every list at its position and returns every state', async () => {
    // Arrange
    const { flowId, states } = await ensureAtLeastStates(
      baseScenario.subspace.collaboration.id,
      3
    );
    const [a, b, c, ...rest] = states;
    await setSidebar(a.id, la);
    await setSidebar(b.id, lb);
    await setSidebar(c.id, lc);
    // Hide one phase so a regression that moves whole settings by position is visible.
    await setVisible(b.id, false);
    const before = await readFlow(baseScenario.subspace.collaboration.id);
    const visibleBefore = Object.fromEntries(
      before.states.map(state => [state.id, state.settings.visible])
    );
    expect(visibleBefore[b.id]).toBe(false);
    expect(visibleBefore[c.id]).toBe(true);

    // Act
    const res = await updateInnovationFlowStatesSortOrder(flowId, [
      c.id,
      a.id,
      b.id,
      ...rest.map(state => state.id),
    ]);

    // Assert: the response carries every state of the flow, already holding its new list.
    expect(res.error).toBeUndefined();
    const response = res.data?.updateInnovationFlowStatesSortOrder ?? [];
    expect(response).toHaveLength(states.length);
    expect(
      [...response]
        .sort(byRank)
        .slice(0, 3)
        .map(state => state.settings.sidebar)
    ).toEqual([la, lb, lc]);

    // Assert: the phases moved, the lists did not; visibility stays with its phase.
    const after = await readFlow(baseScenario.subspace.collaboration.id);
    expect(
      after.states
        .slice(0, 3)
        .map(state => [state.displayName, state.settings.sidebar])
    ).toEqual([
      [c.displayName, la],
      [a.displayName, lb],
      [b.displayName, lc],
    ]);
    expect(sidebarsById(after.states.slice(3))).toEqual(
      sidebarsById(before.states.slice(3))
    );
    const visibleAfter = Object.fromEntries(
      after.states.map(state => [state.id, state.settings.visible])
    );
    expect(visibleAfter).toEqual(visibleBefore);
    expect(visibleAfter[b.id]).toBe(false);
    expect(visibleAfter[c.id]).toBe(true);

    // Cleanup: leave the scenario flow fully visible for the tests that follow.
    await setVisible(b.id, true);
  });

  test('a reorder naming only some phases of an L1 flow is rejected and changes nothing', async () => {
    // Arrange
    const before = await readFlow(baseScenario.subspace.collaboration.id);
    const [first, second] = before.states;

    // Act: the server only accepts a reorder that names every phase.
    const res = await updateInnovationFlowStatesSortOrder(before.flowId, [
      second.id,
      first.id,
    ]);

    // Assert
    expect(res.error?.errors[0].message).toContain(
      'does not match the number of states'
    );
    const after = await readFlow(baseScenario.subspace.collaboration.id);
    expect(after.states.map(state => state.id)).toEqual(
      before.states.map(state => state.id)
    );
    expect(after.states.map(state => state.settings.sidebar)).toEqual(
      before.states.map(state => state.settings.sidebar)
    );
  });

  test('reordering an L0 flow keeps every list with its own tab', async () => {
    // Arrange
    const { flowId, states } = await ensureAtLeastStates(
      baseScenario.space.collaboration.id,
      3
    );
    const [t1, t2, t3, ...rest] = states;
    await setSidebar(t1.id, [SidebarWidget.Updates]);
    await setSidebar(t2.id, [SidebarWidget.Guidelines, SidebarWidget.Intent]);
    await setSidebar(t3.id, [
      SidebarWidget.ContactLeads,
      SidebarWidget.AddUser,
    ]);
    const before = await readFlow(baseScenario.space.collaboration.id);

    // Act
    const res = await updateInnovationFlowStatesSortOrder(flowId, [
      t3.id,
      t1.id,
      t2.id,
      ...rest.map(state => state.id),
    ]);

    // Assert
    expect(res.error).toBeUndefined();
    expect(res.data?.updateInnovationFlowStatesSortOrder).toHaveLength(
      states.length
    );
    const after = await readFlow(baseScenario.space.collaboration.id);
    expect(after.states.slice(0, 3).map(state => state.id)).toEqual([
      t3.id,
      t1.id,
      t2.id,
    ]);
    expect(sidebarsById(after.states)).toEqual(sidebarsById(before.states));
  });
});

describe('Subspace sidebar - template flows follow their level', () => {
  const templateIds: string[] = [];

  afterAll(async () => {
    for (const templateId of templateIds) {
      await deleteTemplate(templateId);
    }
  });

  const createTemplate = async (spaceId: string, displayName: string) => {
    const res = await createTemplateFromSpace(
      spaceId,
      baseScenario.space.templateSetId,
      `${displayName} ${runId}`
    );
    expect(res.error).toBeUndefined();
    const templateId = res.data?.createTemplateFromSpace.id ?? '';
    expect(templateId).not.toEqual('');
    templateIds.push(templateId);
    return templateId;
  };

  test('a template made from an L1 subspace reorders positionally', async () => {
    // Arrange
    await ensureAtLeastStates(baseScenario.subspace.collaboration.id, 3);
    const templateId = await createTemplate(
      baseScenario.subspace.id,
      'L1 sidebar template'
    );
    const { flowId, states } = await readTemplateFlow(templateId);
    expect(states.length).toBeGreaterThanOrEqual(3);
    const [a, b, c, ...rest] = states;
    await setSidebar(a.id, la);
    await setSidebar(b.id, lb);
    await setSidebar(c.id, lc);

    // Act
    const res = await updateInnovationFlowStatesSortOrder(flowId, [
      c.id,
      a.id,
      b.id,
      ...rest.map(state => state.id),
    ]);

    // Assert
    expect(res.error).toBeUndefined();
    const after = await readTemplateFlow(templateId);
    expect(
      after.states
        .slice(0, 3)
        .map(state => [state.displayName, state.settings.sidebar])
    ).toEqual([
      [c.displayName, la],
      [a.displayName, lb],
      [b.displayName, lc],
    ]);
  });

  test('a template made from an L0 space keeps every list with its own state', async () => {
    // Arrange: pad here too, so this test does not depend on the L0 reorder test above.
    await ensureAtLeastStates(baseScenario.space.collaboration.id, 3);
    const templateId = await createTemplate(
      baseScenario.space.id,
      'L0 sidebar template'
    );
    const { flowId, states } = await readTemplateFlow(templateId);
    expect(states.length).toBeGreaterThanOrEqual(3);
    const [a, b, c, ...rest] = states;
    await setSidebar(a.id, la);
    await setSidebar(b.id, lb);
    await setSidebar(c.id, lc);

    // Act
    const res = await updateInnovationFlowStatesSortOrder(flowId, [
      c.id,
      a.id,
      b.id,
      ...rest.map(state => state.id),
    ]);

    // Assert
    expect(res.error).toBeUndefined();
    const after = await readTemplateFlow(templateId);
    expect(
      after.states
        .slice(0, 3)
        .map(state => [state.displayName, state.settings.sidebar])
    ).toEqual([
      [c.displayName, lc],
      [a.displayName, la],
      [b.displayName, lb],
    ]);
  });
});

describe('Subspace sidebar - community and activity widgets', () => {
  test('COMMUNITY and ACTIVITY round-trip on the first phase of an L1 flow', async () => {
    // Arrange
    const { states } = await readFlow(baseScenario.subspace.collaboration.id);
    const sidebar = [
      SidebarWidget.Community,
      SidebarWidget.Activity,
      SidebarWidget.Search,
    ];

    // Act
    await setSidebar(states[0].id, sidebar);

    // Assert
    const after = await readFlow(baseScenario.subspace.collaboration.id);
    expect(after.states[0].id).toEqual(states[0].id);
    expect(after.states[0].settings.sidebar).toEqual(sidebar);
  });

  test('a space member without update rights cannot write the subspace sidebar', async () => {
    // Arrange
    const { states } = await readFlow(baseScenario.subspace.collaboration.id);
    const stored = states[0].settings.sidebar;

    // Act
    const res = await updateInnovationFlowState(
      states[0].id,
      undefined,
      undefined,
      { sidebar: [SidebarWidget.Community, SidebarWidget.Activity] },
      TestUser.SPACE_MEMBER
    );

    // Assert: denied for lack of the update privilege, not for any other reason.
    expect(res.error?.errors?.[0]?.code).toEqual('FORBIDDEN_POLICY');
    const after = await readFlow(baseScenario.subspace.collaboration.id);
    expect(after.states[0].settings.sidebar).toEqual(stored);
  });
});

describe('Subspace sidebar - deleting a phase', () => {
  test('deleting the first phase of an L1 flow hands its list to the new first phase', async () => {
    // Arrange
    const { flowId, states } = await ensureAtLeastStates(
      baseScenario.subspace.collaboration.id,
      3
    );
    const [first, second, third] = states;
    await setSidebar(first.id, la);
    await setSidebar(second.id, lb);
    await setSidebar(third.id, lc);
    const before = await readFlow(baseScenario.subspace.collaboration.id);

    // Act
    const res = await deleteStateOnInnovationFlow(flowId, first.id);

    // Assert: the inheritor holds the deleted list; every other phase keeps its own.
    expect(res.error).toBeUndefined();
    const after = await readFlow(baseScenario.subspace.collaboration.id);
    expect(after.states).toHaveLength(before.states.length - 1);
    expect(after.states[0].id).toEqual(second.id);
    expect(after.states[0].settings.sidebar).toEqual(la);
    expect(sidebarsById(after.states.slice(1))).toEqual(
      sidebarsById(before.states.slice(2))
    );
  });

  test('deleting a phase that is not first changes no other list on an L1 flow', async () => {
    // Arrange
    const { flowId, states } = await ensureAtLeastStates(
      baseScenario.subspace.collaboration.id,
      3
    );
    const deleted = states[1];
    const expected = sidebarsById(
      states.filter(state => state.id !== deleted.id)
    );

    // Act
    const res = await deleteStateOnInnovationFlow(flowId, deleted.id);

    // Assert
    expect(res.error).toBeUndefined();
    const after = await readFlow(baseScenario.subspace.collaboration.id);
    expect(after.states).toHaveLength(states.length - 1);
    expect(sidebarsById(after.states)).toEqual(expected);
  });

  test('deleting the first tab of an L0 flow hands its list to no one', async () => {
    // Arrange
    const { flowId, states } = await ensureAtLeastStates(
      baseScenario.space.collaboration.id,
      2
    );
    const [first, second] = states;
    await setSidebar(first.id, [SidebarWidget.Guidelines]);
    await setSidebar(second.id, [SidebarWidget.ContactLeads]);
    const before = await readFlow(baseScenario.space.collaboration.id);
    const expected = sidebarsById(
      before.states.filter(state => state.id !== first.id)
    );

    // Act
    const res = await deleteStateOnInnovationFlow(flowId, first.id);

    // Assert
    expect(res.error).toBeUndefined();
    const after = await readFlow(baseScenario.space.collaboration.id);
    expect(after.states[0].id).toEqual(second.id);
    expect(after.states[0].settings.sidebar).toEqual([
      SidebarWidget.ContactLeads,
    ]);
    expect(sidebarsById(after.states)).toEqual(expected);
  });
});
