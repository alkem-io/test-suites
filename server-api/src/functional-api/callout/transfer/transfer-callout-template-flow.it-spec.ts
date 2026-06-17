/**
 * Transfer callout into a template-changed destination flow
 * (alkem-io/server#4970, alkem-io/client-web#9353)
 *
 * Scenario: the destination flow is replaced via an applied space template (all states differ
 * from the source), then a callout is transferred into it.
 * - Destination flow replaced with the custom template states (precondition).
 * - Source state absent in the changed destination flow (precondition).
 * - Transferred callout is present in the destination callouts set.
 * - Transferred callout lands on a valid destination state (skipped — BUG: stale state).
 * - Transferred callout adopts the destination default state (skipped — BUG: stale state).
 */
import {
  TestScenarioConfig,
  TestScenarioFactory,
} from '@alkemio/tests-lib';
import { getSpaceData } from '@functional-api/journey/space/space.request.params';
import {
  createCalloutOnCalloutsSet,
  getCalloutsData,
  transferCallout,
} from '@functional-api/callout/callouts.request.params';
import {
  createTemplateFromSpace,
  updateCollaborationFromSpaceTemplate,
} from '@functional-api/templates/space/space-template.request.params';
import {
  getInnovationFlowStatesWithIds,
  updateInnovationFlowState,
} from '@functional-api/innovation-flow/innovation-flow.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

const collaboration = { addPostCallout: true };
const sourceConfig: TestScenarioConfig = {
  name: 'transfer-callout-template-src',
  space: { collaboration },
};
const targetConfig: TestScenarioConfig = {
  name: 'transfer-callout-template-dst',
  space: { collaboration, subspace: { collaboration } },
};

// All-custom state names, different from both the L0 default (Home, ...) and the L1 default
// (Explore, ...), so the transferred callout's source state has no match in the destination.
const CUSTOM_STATES = ['Custom Stage One', 'Custom Stage Two', 'Custom Stage Three'];

const calloutsSetIdOf = async (spaceId: string) => {
  const res = await getSpaceData(spaceId);
  return res.data?.lookup.space?.collaboration.calloutsSet.id ?? '';
};

const collaborationIdOf = async (spaceId: string) => {
  const res = await getSpaceData(spaceId);
  return res.data?.lookup.space?.collaboration.id ?? '';
};

const calloutStateInSet = async (calloutsSetId: string, calloutId: string) => {
  const res = await getCalloutsData(calloutsSetId);
  const callout = res.data?.lookup.calloutsSet?.callouts?.find(
    c => c.id === calloutId
  );
  return {
    found: !!callout,
    state: callout?.classification?.flowState?.tags?.[0],
  };
};

let sourceState: string | undefined;
let destStatesAfterTemplate: string[];
let destDefaultState: string;
let transferredId: string;
let afterState: string | undefined;
let visibleInDestination = false;

beforeAll(async () => {
  sourceScenario = await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario = await TestScenarioFactory.createBaseScenario(targetConfig);

  // Build an innovation flow template with entirely custom states: take the target L0 as a
  // donor, rename all its flow states, then snapshot it as a space template.
  const donorFlow = await getInnovationFlowStatesWithIds(
    targetScenario.space.id
  );
  const donorStates =
    donorFlow.data?.lookup.space?.collaboration.innovationFlow.states ?? [];
  for (let i = 0; i < donorStates.length; i++) {
    const name = CUSTOM_STATES[i] ?? `Custom Stage ${i + 1}`;
    await updateInnovationFlowState(donorStates[i].id, name, 'Custom state');
  }
  const template = await createTemplateFromSpace(
    targetScenario.space.id,
    targetScenario.space.templateSetId,
    'Custom Flow Template'
  );
  const templateId = template.data?.createTemplateFromSpace.id ?? '';

  // Change the target L1 subspace's innovation flow by applying that template.
  const targetCollaborationId = await collaborationIdOf(
    targetScenario.subspace.id
  );
  await updateCollaborationFromSpaceTemplate(targetCollaborationId, templateId);

  const targetFlowAfter = await getInnovationFlowStatesWithIds(
    targetScenario.subspace.id
  );
  destStatesAfterTemplate = (
    targetFlowAfter.data?.lookup.space?.collaboration.innovationFlow.states ??
    []
  ).map(s => s.displayName);
  destDefaultState = destStatesAfterTemplate[0] ?? '';

  // Create the callout in the source L0 space and transfer it to the changed target subspace.
  const sourceCalloutsSetId = await calloutsSetIdOf(sourceScenario.space.id);
  const created = await createCalloutOnCalloutsSet(sourceCalloutsSetId, {
    framing: { profile: { displayName: 'Callout transferred to templated flow' } },
  });
  transferredId = created.data?.createCalloutOnCalloutsSet.id ?? '';
  sourceState = (
    await calloutStateInSet(sourceCalloutsSetId, transferredId)
  ).state;

  const targetCalloutsSetId = await calloutsSetIdOf(targetScenario.subspace.id);
  await transferCallout(transferredId, targetCalloutsSetId);

  const after = await calloutStateInSet(targetCalloutsSetId, transferredId);
  afterState = after.state;
  visibleInDestination = after.found;
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

// alkem-io/server#4970 / alkem-io/client-web#9353 — a callout transferred into a space whose
// innovation flow was replaced via a template (all states different from the source) must be
// reassigned to the destination default state and stay visible, not orphaned in a state that
// no longer exists.
describe('Transfer callout into a template-changed destination flow', () => {
  test('the destination flow was replaced with the custom template states (precondition)', () => {
    expect(destStatesAfterTemplate).toEqual(
      expect.arrayContaining(CUSTOM_STATES)
    );
  });

  test('the callout source state is not present in the changed destination flow (precondition)', () => {
    expect(destStatesAfterTemplate).not.toContain(sourceState);
  });

  test('the transferred callout is present in the destination callouts set', () => {
    expect(visibleInDestination).toBe(true);
  });

  // alkem-io/server#4970 / alkem-io/client-web#9353 — BUG: after the destination flow is
  // replaced via a template, the transferred callout is left in a stale flow state (the
  // destination's pre-template default, e.g. "Explore") that no longer exists in the flow,
  // so the client cannot display it. It should be reassigned to a valid destination state.
  // Unskip once the server reassigns transferred callouts to the current flow.
  test.skip('the transferred callout lands on a valid destination flow state', () => {
    expect(destStatesAfterTemplate).toContain(afterState);
  });

  test.skip('the transferred callout adopts the destination default flow state', () => {
    expect(afterState).toEqual(destDefaultState);
  });
});
