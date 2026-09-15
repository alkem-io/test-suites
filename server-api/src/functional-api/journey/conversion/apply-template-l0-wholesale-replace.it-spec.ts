/**
 * Apply a Space Template to an L0 space — wholesale replacement, no fixed-phase
 * preservation (alkem-io/server#6418, R-22, product-approved)
 *
 * server#6418 removed the L0 "4 fixed phases" floor (`L0_FIXED_INNOVATION_FLOW_STATES`
 * dropped from 4 to 0), so applying a Space Template to an *existing* L0 now degrades to
 * the same wholesale delete-and-recreate mechanism that subspaces have always had —
 * `transfer-callout-template-flow.it-spec.ts` proves this mechanism for an L1 target; this
 * file generalizes the same assertions to an L0 target, which is the entire behavior change
 * R-22 describes.
 *
 * Scenario:
 * - Callouts classified into the L0's phases 3 and 4 (precondition).
 * - A template built from a donor space with entirely custom state names is applied to the
 *   L0's collaboration.
 * - None of the L0's original phase names survive — no fixed-phase preservation.
 * - Both callouts remain present in the L0's calloutsSet (not silently dropped).
 * - Both callouts land on a valid state of the new flow.
 */
import { TestScenarioConfig, TestScenarioFactory } from '@alkemio/tests-lib';
import { getSpaceData } from '../space/space.request.params';
import {
  createCalloutOnCalloutsSet,
  getCalloutsData,
} from '@functional-api/callout/callouts.request.params';
import {
  createTemplateFromSpace,
  updateCollaborationFromSpaceTemplate,
} from '@functional-api/templates/space/space-template.request.params';
import {
  getInnovationFlowStatesWithIds,
  updateInnovationFlowState,
} from '@functional-api/innovation-flow/innovation-flow.request.params';
import { TagsetReservedName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let targetScenario: OrganizationWithSpaceModel;
let donorScenario: OrganizationWithSpaceModel;

const targetConfig: TestScenarioConfig = {
  name: 'apply-template-l0-wholesale-target',
  space: {},
};
const donorConfig: TestScenarioConfig = {
  name: 'apply-template-l0-wholesale-donor',
  space: {},
};

// Custom donor state names, distinct from the L0 default template's phase names, so the
// applied template forces a real replacement.
const DONOR_STATES = [
  'R22 Phase One',
  'R22 Phase Two',
  'R22 Phase Three',
  'R22 Phase Four',
];

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

let originalStateNames: string[];
let calloutInPhase3Id: string;
let calloutInPhase4Id: string;
let statesAfterTemplate: string[];
let calloutsSetId: string;

beforeAll(async () => {
  targetScenario = await TestScenarioFactory.createBaseScenario(targetConfig);
  donorScenario = await TestScenarioFactory.createBaseScenario(donorConfig);

  // Capture the L0's own (platform-default) states before anything changes.
  const flowBefore = await getInnovationFlowStatesWithIds(
    targetScenario.space.id
  );
  const statesBefore = (
    flowBefore.data?.lookup.space?.collaboration.innovationFlow.states ?? []
  )
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  originalStateNames = statesBefore.map(s => s.displayName);

  calloutsSetId = await calloutsSetIdOf(targetScenario.space.id);

  // Mirrors R-22's release-checklist scenario: one callout classified into phase 3, one into
  // phase 4 of the L0's own (pre-template) flow.
  const phase3 = statesBefore[2]?.displayName ?? '';
  const phase4 = statesBefore[3]?.displayName ?? '';

  const callout3 = await createCalloutOnCalloutsSet(calloutsSetId, {
    framing: { profile: { displayName: 'Callout in phase 3' } },
    classification: { tagsets: [{ name: TagsetReservedName.FlowState, tags: [phase3] }] },
  });
  calloutInPhase3Id = callout3.data?.createCalloutOnCalloutsSet.id ?? '';

  const callout4 = await createCalloutOnCalloutsSet(calloutsSetId, {
    framing: { profile: { displayName: 'Callout in phase 4' } },
    classification: { tagsets: [{ name: TagsetReservedName.FlowState, tags: [phase4] }] },
  });
  calloutInPhase4Id = callout4.data?.createCalloutOnCalloutsSet.id ?? '';

  // Build a donor template with entirely custom state names.
  const donorFlow = await getInnovationFlowStatesWithIds(donorScenario.space.id);
  const donorStates = (
    donorFlow.data?.lookup.space?.collaboration.innovationFlow.states ?? []
  )
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  for (let i = 0; i < donorStates.length; i++) {
    const name = DONOR_STATES[i] ?? `R22 Phase ${i + 1}`;
    await updateInnovationFlowState(donorStates[i].id, name, 'R22 custom state');
  }
  const template = await createTemplateFromSpace(
    donorScenario.space.id,
    donorScenario.space.templateSetId,
    'R-22 wholesale-replace template'
  );
  const templateId = template.data?.createTemplateFromSpace.id ?? '';

  // Apply the template to the target L0's own collaboration.
  const targetCollaborationId = await collaborationIdOf(targetScenario.space.id);
  await updateCollaborationFromSpaceTemplate(targetCollaborationId, templateId);

  const flowAfter = await getInnovationFlowStatesWithIds(targetScenario.space.id);
  statesAfterTemplate = (
    flowAfter.data?.lookup.space?.collaboration.innovationFlow.states ?? []
  ).map(s => s.displayName);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
  await TestScenarioFactory.cleanUpBaseScenario(donorScenario);
});

describe('Apply template to an L0 - wholesale replacement (R-22)', () => {
  test('the L0 originally has its own (platform-default) 4 phases (precondition)', () => {
    expect(originalStateNames).toHaveLength(4);
  });

  test('the two callouts were created into phase 3 and phase 4 of the original flow (precondition)', () => {
    expect(calloutInPhase3Id).not.toEqual('');
    expect(calloutInPhase4Id).not.toEqual('');
  });

  test('the template state count is applied and none of the original L0 phase names remain', () => {
    expect(statesAfterTemplate).toEqual(
      expect.arrayContaining(DONOR_STATES)
    );
    originalStateNames.forEach(name => {
      expect(statesAfterTemplate).not.toContain(name);
    });
  });

  test('both callouts are still present in the L0 calloutsSet after the template apply', async () => {
    const after3 = await calloutStateInSet(calloutsSetId, calloutInPhase3Id);
    const after4 = await calloutStateInSet(calloutsSetId, calloutInPhase4Id);

    expect(after3.found).toBe(true);
    expect(after4.found).toBe(true);
  });

  test('both callouts land on a valid state of the new flow', async () => {
    const after3 = await calloutStateInSet(calloutsSetId, calloutInPhase3Id);
    const after4 = await calloutStateInSet(calloutsSetId, calloutInPhase4Id);

    expect(statesAfterTemplate).toContain(after3.state);
    expect(statesAfterTemplate).toContain(after4.state);
  });
});
