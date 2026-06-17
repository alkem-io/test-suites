/**
 * Transfer callout into a changed destination flow (alkem-io/client-web#9353)
 *
 * Scenario:
 * - The destination's first flow state is renamed so the flow no longer holds the callout's
 *   source state; after transfer the callout is visible and adopts the destination default state.
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
  getInnovationFlowStatesWithIds,
  updateInnovationFlowState,
} from '@functional-api/innovation-flow/innovation-flow.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let sourceScenario: OrganizationWithSpaceModel;
let destinationScenario: OrganizationWithSpaceModel;

const collaboration = { addPostCallout: true };
const sourceConfig: TestScenarioConfig = {
  name: 'transfer-callout-changed-flow-src',
  space: { collaboration },
};
const destinationConfig: TestScenarioConfig = {
  name: 'transfer-callout-changed-flow-dst',
  space: { collaboration },
};

// The destination's first flow state is renamed to this, so the destination flow no longer
// contains the callout's source state ("Home"), reproducing alkem-io/client-web#9353.
const RENAMED_FIRST_STATE = 'Reframed Start 9353';

const calloutsSetIdOf = async (spaceId: string) => {
  const res = await getSpaceData(spaceId);
  return res.data?.lookup.space?.collaboration.calloutsSet.id ?? '';
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
let destStatesAfterChange: string[];
let destDefaultState: string;
let transferredId: string;
let afterState: string | undefined;
let visibleInDestination = false;

beforeAll(async () => {
  sourceScenario = await TestScenarioFactory.createBaseScenario(sourceConfig);
  destinationScenario =
    await TestScenarioFactory.createBaseScenario(destinationConfig);

  // Change the destination's innovation flow: rename its first (default) state so the flow
  // no longer contains "Home" — the state the transferred callout comes from.
  const flow = await getInnovationFlowStatesWithIds(
    destinationScenario.space.id
  );
  const states =
    flow.data?.lookup.space?.collaboration.innovationFlow.states ?? [];
  expect(states.length).toBeGreaterThan(0);
  await updateInnovationFlowState(states[0].id, RENAMED_FIRST_STATE);

  const flowAfter = await getInnovationFlowStatesWithIds(
    destinationScenario.space.id
  );
  destStatesAfterChange = (
    flowAfter.data?.lookup.space?.collaboration.innovationFlow.states ?? []
  ).map(s => s.displayName);
  destDefaultState = destStatesAfterChange[0] ?? '';

  // Create a callout in the source space and capture the state it comes from.
  const sourceCalloutsSetId = await calloutsSetIdOf(sourceScenario.space.id);
  const created = await createCalloutOnCalloutsSet(sourceCalloutsSetId, {
    framing: { profile: { displayName: 'Callout transferred to changed flow' } },
  });
  transferredId = created.data?.createCalloutOnCalloutsSet.id ?? '';
  sourceState = (
    await calloutStateInSet(sourceCalloutsSetId, transferredId)
  ).state;

  // Transfer it into the destination whose flow no longer has that state.
  const destCalloutsSetId = await calloutsSetIdOf(destinationScenario.space.id);
  await transferCallout(transferredId, destCalloutsSetId);

  const after = await calloutStateInSet(destCalloutsSetId, transferredId);
  afterState = after.state;
  visibleInDestination = after.found;
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(destinationScenario);
});

// alkem-io/client-web#9353 — a callout transferred into a space whose innovation flow has been
// changed (so it no longer contains the callout's source state) must still land on a valid
// destination state and remain visible, instead of being orphaned in an unmatched state.
describe('Transfer callout into a changed destination flow', () => {
  test('the callout source state is not present in the changed destination flow (precondition)', () => {
    expect(destStatesAfterChange).not.toContain(sourceState);
  });

  test('the transferred callout is visible in the destination', () => {
    expect(visibleInDestination).toBe(true);
  });

  test('the transferred callout lands on a valid destination flow state', () => {
    expect(destStatesAfterChange).toContain(afterState);
  });

  test('the transferred callout adopts the destination default flow state', () => {
    expect(afterState).toEqual(destDefaultState);
  });
});
