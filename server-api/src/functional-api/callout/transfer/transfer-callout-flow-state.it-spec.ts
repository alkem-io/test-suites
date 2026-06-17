/**
 * Transfer callout — destination flow state matching
 * (alkem-io/server#6021; verified against server#4970, client-web#9353)
 *
 * Scenarios:
 * - No-match L1 -> L0 (same tree): source state absent in destination -> adopts destination default; visible.
 * - Match L0 -> L0 (different spaces, shared flow): source state present -> keeps its state; visible.
 * - No-match cross-space L0 -> L1 subspace (different L0): adopts destination default; visible.
 * - Cross-space L1 -> L1 subspace (different L0, server#4970): matching state kept; visible.
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
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let scenarioA: OrganizationWithSpaceModel;
let scenarioB: OrganizationWithSpaceModel;

const collaboration = { addPostCallout: true };
const scenarioConfigA: TestScenarioConfig = {
  name: 'transfer-callout-flow-a',
  space: { collaboration, subspace: { collaboration } },
};
const scenarioConfigB: TestScenarioConfig = {
  name: 'transfer-callout-flow-b',
  space: { collaboration, subspace: { collaboration } },
};

const readCollaboration = async (spaceId: string) => {
  const res = await getSpaceData(spaceId);
  const collab = res.data?.lookup.space?.collaboration;
  const stateNames =
    collab?.innovationFlow.states.map(s => s.displayName) ?? [];
  return {
    calloutsSetId: collab?.calloutsSet.id ?? '',
    stateNames,
    defaultState: stateNames[0] ?? '',
  };
};

const readCalloutInSet = async (calloutsSetId: string, calloutId: string) => {
  const res = await getCalloutsData(calloutsSetId);
  const callout = res.data?.lookup.calloutsSet?.callouts?.find(
    c => c.id === calloutId
  );
  return {
    found: !!callout,
    state: callout?.classification?.flowState?.tags?.[0],
  };
};

beforeAll(async () => {
  scenarioA = await TestScenarioFactory.createBaseScenario(scenarioConfigA);
  scenarioB = await TestScenarioFactory.createBaseScenario(scenarioConfigB);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(scenarioA);
  await TestScenarioFactory.cleanUpBaseScenario(scenarioB);
});

// alkem-io/server#6021 — when a callout is transferred across spaces, it must adopt the
// destination's default flow state if its current state name does not exist in the
// destination, and keep its state name when the destination has a matching state.
// Verified against alkem-io/server#4970 and alkem-io/client-web#9353.
describe('Transfer callout - destination flow state matching', () => {
  describe('source state name absent in destination', () => {
    // Source = L1 subspace, destination = L0 space: their default flows differ.
    let transferredId: string;
    let sourceState: string | undefined;
    let destStates: string[];
    let destDefaultState: string;
    let afterState: string | undefined;
    let visibleInDestination = false;

    beforeAll(async () => {
      const source = await readCollaboration(scenarioA.subspace.id);
      const dest = await readCollaboration(scenarioA.space.id);
      destStates = dest.stateNames;
      destDefaultState = dest.defaultState;

      const created = await createCalloutOnCalloutsSet(source.calloutsSetId, {
        framing: { profile: { displayName: 'Transfer no-match callout' } },
      });
      transferredId = created.data?.createCalloutOnCalloutsSet.id ?? '';
      sourceState = (
        await readCalloutInSet(source.calloutsSetId, transferredId)
      ).state;

      await transferCallout(transferredId, dest.calloutsSetId);

      const after = await readCalloutInSet(dest.calloutsSetId, transferredId);
      afterState = after.state;
      visibleInDestination = after.found;
    });

    test('source state is not one of the destination states (precondition)', () => {
      expect(destStates).not.toContain(sourceState);
    });

    test('callout adopts the destination default flow state', () => {
      expect(afterState).toEqual(destDefaultState);
    });

    test('transferred callout is visible in the destination', () => {
      expect(visibleInDestination).toBe(true);
    });
  });

  describe('source state name present in destination', () => {
    // Source and destination are both L0 spaces, so they share the same default flow states.
    let transferredId: string;
    let sourceState: string | undefined;
    let destStates: string[];
    let afterState: string | undefined;
    let visibleInDestination = false;

    beforeAll(async () => {
      const source = await readCollaboration(scenarioA.space.id);
      const dest = await readCollaboration(scenarioB.space.id);
      destStates = dest.stateNames;

      const created = await createCalloutOnCalloutsSet(source.calloutsSetId, {
        framing: { profile: { displayName: 'Transfer match callout' } },
      });
      transferredId = created.data?.createCalloutOnCalloutsSet.id ?? '';
      sourceState = (
        await readCalloutInSet(source.calloutsSetId, transferredId)
      ).state;

      await transferCallout(transferredId, dest.calloutsSetId);

      const after = await readCalloutInSet(dest.calloutsSetId, transferredId);
      afterState = after.state;
      visibleInDestination = after.found;
    });

    test('source state is one of the destination states (precondition)', () => {
      expect(destStates).toContain(sourceState);
    });

    test('callout keeps its matching flow state', () => {
      expect(afterState).toEqual(sourceState);
    });

    test('transferred callout is visible in the destination', () => {
      expect(visibleInDestination).toBe(true);
    });
  });

  describe('source state name absent in destination (L0 space -> another L0 space L1 subspace)', () => {
    // Source = L0 space, destination = the L1 subspace of a *different* L0 space: a genuine
    // cross-space transfer, and their default flows differ so the L0 callout's state does
    // not exist in the destination subspace.
    let transferredId: string;
    let sourceState: string | undefined;
    let destStates: string[];
    let destDefaultState: string;
    let afterState: string | undefined;
    let visibleInDestination = false;

    beforeAll(async () => {
      const source = await readCollaboration(scenarioA.space.id);
      const dest = await readCollaboration(scenarioB.subspace.id);
      destStates = dest.stateNames;
      destDefaultState = dest.defaultState;

      const created = await createCalloutOnCalloutsSet(source.calloutsSetId, {
        framing: { profile: { displayName: 'Transfer L0 to L1 callout' } },
      });
      transferredId = created.data?.createCalloutOnCalloutsSet.id ?? '';
      sourceState = (
        await readCalloutInSet(source.calloutsSetId, transferredId)
      ).state;

      await transferCallout(transferredId, dest.calloutsSetId);

      const after = await readCalloutInSet(dest.calloutsSetId, transferredId);
      afterState = after.state;
      visibleInDestination = after.found;
    });

    test('source state is not one of the destination states (precondition)', () => {
      expect(destStates).not.toContain(sourceState);
    });

    test('transferred callout is visible in the destination', () => {
      expect(visibleInDestination).toBe(true);
    });

    test('callout adopts the destination default flow state', () => {
      expect(afterState).toEqual(destDefaultState);
    });
  });

  // alkem-io/server#4970 — transferring a callout from the L1 subspace of one L0 to the L1
  // subspace of a *different* L0 must leave it visible on the destination subspace. Both
  // subspaces share the default L1 flow, so the source state matches and must be kept.
  describe('cross-space transfer between two L1 subspaces (server#4970)', () => {
    let transferredId: string;
    let sourceState: string | undefined;
    let destStates: string[];
    let afterState: string | undefined;
    let visibleInDestination = false;

    beforeAll(async () => {
      const source = await readCollaboration(scenarioA.subspace.id);
      const dest = await readCollaboration(scenarioB.subspace.id);
      destStates = dest.stateNames;

      const created = await createCalloutOnCalloutsSet(source.calloutsSetId, {
        framing: {
          profile: { displayName: 'Transfer L1 subspace to L1 subspace' },
        },
      });
      transferredId = created.data?.createCalloutOnCalloutsSet.id ?? '';
      sourceState = (
        await readCalloutInSet(source.calloutsSetId, transferredId)
      ).state;

      await transferCallout(transferredId, dest.calloutsSetId);

      const after = await readCalloutInSet(dest.calloutsSetId, transferredId);
      afterState = after.state;
      visibleInDestination = after.found;
    });

    test('source state is one of the destination states (precondition)', () => {
      expect(destStates).toContain(sourceState);
    });

    test('transferred callout is visible in the destination subspace', () => {
      expect(visibleInDestination).toBe(true);
    });

    test('callout keeps its matching flow state', () => {
      expect(afterState).toEqual(sourceState);
    });
  });
});
