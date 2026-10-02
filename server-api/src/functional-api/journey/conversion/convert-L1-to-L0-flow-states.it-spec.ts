/**
 * Convert L1 to L0 — flow-state carry-over detail (alkem-io/server#6418,
 * alkem-io/client-web#9528)
 *
 * The anchor spec (`convert-L1-to-L0-basic.it-spec.ts`) proves the L1's states are carried
 * over verbatim as a whole. These two cases pin down two details that a "first state only"
 * regression would hide:
 * - The L1's `currentStateID` is carried over even when it is not the first state.
 * - Per-state `settings` (sidebar in particular) are carried over verbatim, including an
 *   explicitly empty sidebar — no default widget must be re-populated.
 */
import { TestScenarioConfig, TestScenarioFactory } from '@alkemio/tests-lib';
import { convertSpaceL1ToSpaceL0 } from './conversion.request.params';
import {
  getInnovationFlowStatesWithIds,
  updateInnovationFlowState,
  updateInnovationFlowCurrentState,
} from '@functional-api/innovation-flow/innovation-flow.request.params';
import { getSpaceData } from '../space/space.request.params';
import { SidebarWidget } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const currentStateScenarioConfig: TestScenarioConfig = {
  name: 'convert-l1-to-l0-flow-states-current',
  space: {
    subspace: {},
  },
};

const sidebarScenarioConfig: TestScenarioConfig = {
  name: 'convert-l1-to-l0-flow-states-sidebar',
  space: {
    subspace: {},
  },
};

describe('Convert L1 to L0 - flow-state carry-over detail', () => {
  describe('currentStateID carried over when not the first state', () => {
    let baseScenario: OrganizationWithSpaceModel;
    let chosenState: { id: string; displayName: string };
    let currentStateAfter:
      | { displayName: string; description?: string }
      | undefined;

    beforeAll(async () => {
      baseScenario = await TestScenarioFactory.createBaseScenario(
        currentStateScenarioConfig
      );

      const flowBefore = await getInnovationFlowStatesWithIds(
        baseScenario.subspace.id
      );
      const statesBefore = (
        flowBefore.data?.lookup.space?.collaboration.innovationFlow.states ??
        []
      )
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const innovationFlowId =
        flowBefore.data?.lookup.space?.collaboration.innovationFlow.id ?? '';

      // Deliberately not first, not last — the L1's default flow has 5 states.
      chosenState = statesBefore[2];

      await updateInnovationFlowCurrentState(innovationFlowId, chosenState.id);

      // Sanity precondition: fail fast here if the mutation didn't take, rather than
      // masking a setup failure as a promotion-time regression below.
      const sanity = await getSpaceData(baseScenario.subspace.id);
      expect(
        sanity.data?.lookup.space?.collaboration.innovationFlow.currentState
          ?.displayName
      ).toEqual(chosenState.displayName);

      const convertResult = await convertSpaceL1ToSpaceL0(
        baseScenario.subspace.id
      );
      currentStateAfter =
        convertResult.data?.convertSpaceL1ToSpaceL0?.collaboration
          .innovationFlow.currentState;
    });

    afterAll(async () => {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    });

    test('promoted L0 currentState is the L1 chosen state, not the first state', () => {
      expect(currentStateAfter?.displayName).toEqual(chosenState.displayName);
    });
  });

  describe('per-state settings (sidebar) carried over verbatim', () => {
    let baseScenario: OrganizationWithSpaceModel;
    type StateBefore = {
      id: string;
      displayName: string;
      settings?: {
        sidebar?: SidebarWidget[];
        allowNewCallouts?: boolean;
        visible?: boolean;
      };
    };
    let stateABefore: StateBefore;
    let stateBBefore: StateBefore;
    let statesAfter: Array<{
      displayName: string;
      settings?: {
        sidebar?: SidebarWidget[];
        allowNewCallouts?: boolean;
        visible?: boolean;
      };
    }>;

    beforeAll(async () => {
      baseScenario = await TestScenarioFactory.createBaseScenario(
        sidebarScenarioConfig
      );

      const flowBefore = await getInnovationFlowStatesWithIds(
        baseScenario.subspace.id
      );
      const statesBefore = (
        flowBefore.data?.lookup.space?.collaboration.innovationFlow.states ??
        []
      )
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      stateABefore = statesBefore[0];
      stateBBefore = statesBefore[1];

      await updateInnovationFlowState(stateABefore.id, undefined, undefined, {
        sidebar: [SidebarWidget.Events, SidebarWidget.Updates],
      });
      await updateInnovationFlowState(stateBBefore.id, undefined, undefined, {
        sidebar: [],
      });

      // Re-read the pre-conversion settings (allowNewCallouts/visible) via the fully-selected
      // fragment (getSpaceData) so the "unchanged" assertions below compare against the actual
      // seeded values, not an assumption.
      const flowSeeded = await getSpaceData(baseScenario.subspace.id);
      const seededStates =
        flowSeeded.data?.lookup.space?.collaboration.innovationFlow.states ??
        [];
      stateABefore = {
        ...stateABefore,
        ...seededStates.find(s => s.displayName === stateABefore.displayName),
      };
      stateBBefore = {
        ...stateBBefore,
        ...seededStates.find(s => s.displayName === stateBBefore.displayName),
      };

      const convertResult = await convertSpaceL1ToSpaceL0(
        baseScenario.subspace.id
      );
      statesAfter =
        convertResult.data?.convertSpaceL1ToSpaceL0?.collaboration
          .innovationFlow.states ?? [];
    });

    afterAll(async () => {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    });

    test('a populated sidebar is carried over exactly, in order', () => {
      const stateA = statesAfter.find(
        s => s.displayName === stateABefore.displayName
      );
      expect(stateA?.settings?.sidebar).toEqual([
        SidebarWidget.Events,
        SidebarWidget.Updates,
      ]);
    });

    test('an explicitly empty sidebar stays empty — no default widget is re-populated', () => {
      const stateB = statesAfter.find(
        s => s.displayName === stateBBefore.displayName
      );
      expect(stateB?.settings?.sidebar).toEqual([]);
    });

    test('other per-state settings are unchanged by promotion', () => {
      const stateA = statesAfter.find(
        s => s.displayName === stateABefore.displayName
      );
      const stateB = statesAfter.find(
        s => s.displayName === stateBBefore.displayName
      );

      expect(stateA?.settings?.allowNewCallouts).toEqual(
        stateABefore.settings?.allowNewCallouts
      );
      expect(stateA?.settings?.visible).toEqual(stateABefore.settings?.visible);
      expect(stateB?.settings?.allowNewCallouts).toEqual(
        stateBBefore.settings?.allowNewCallouts
      );
      expect(stateB?.settings?.visible).toEqual(stateBBefore.settings?.visible);
    });
  });
});
