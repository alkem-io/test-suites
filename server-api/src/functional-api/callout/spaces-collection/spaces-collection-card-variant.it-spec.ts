/**
 * Functional API specs for the Subspaces (SPACES) collection callout's
 * card-variant setting (contract graphql-spaces-card-variant, S1-S5).
 *
 * Covers: EXPANDED on create, COMPACT default, partial-update independence
 * (S4 / risk R-9), variant-only writes (toggle, `spaces: null`,
 * `selection: null`, `selection: { selectedIds: null }`) preserving a stored
 * CUSTOM selection in order, and off-kind rejection (S3) for both NONE and
 * CONTRIBUTORS framing types.
 *
 * These tests run against a live API stack. They are self-seeding: every
 * required entity (space, subspaces, callouts) is created in beforeAll/per-test and
 * removed in afterAll. No pre-existing data is assumed.
 *
 * Execution: pnpm --filter @alkemio/test-suite-server-api exec vitest run
 *   src/functional-api/callout/spaces-collection
 */

import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  ActorType,
  CalloutFramingType,
  CalloutSelectionMode,
  SpaceCollectionCardVariant,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

import { deleteCallout, getCalloutsData } from '../callouts.request.params';
import {
  createSpacesCollectionCallout,
  createSpacesCollectionCalloutWithVariant,
  getCalloutSpacesSettings,
  updateCalloutSpacesSettings,
} from './spaces-collection.request.params';
import { createSubspaceOrFail } from '@functional-api/journey/subspace/subspace.request.params';
import { deleteSpace } from '@functional-api/journey/space/space.request.params';

const uniqueId = UniqueIDGenerator.getID();

let baseScenario: OrganizationWithSpaceModel;
let calloutsSetId = '';

// Callout IDs created per-suite/test and cleaned up in afterAll
const createdCalloutIds: string[] = [];

const scenarioConfig: TestScenarioConfig = {
  name: `spaces-collection-card-variant-${uniqueId}`,
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  calloutsSetId = baseScenario.space.collaboration.calloutsSetId;
});

afterAll(async () => {
  await Promise.all(
    createdCalloutIds.map(id => deleteCallout(id).catch(() => undefined))
  );
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('US2 — card-variant setting round-trips through the public API', () => {
  test('case 1 — create EXPANDED (S5): read back EXPANDED; selection is {mode: AUTO, selectedIds: []}', async () => {
    const res = await createSpacesCollectionCalloutWithVariant(
      calloutsSetId,
      `spaces-expanded-${uniqueId}`,
      SpaceCollectionCardVariant.Expanded
    );
    expect(res.error).toBeUndefined();
    const callout = res?.data?.createCalloutOnCalloutsSet;
    expect(callout?.id).toBeTruthy();
    createdCalloutIds.push(callout!.id);

    expect(callout?.settings?.framing?.spaces?.cardVariant).toBe(
      SpaceCollectionCardVariant.Expanded
    );
    expect(callout?.settings?.framing?.selection?.mode).toBe(
      CalloutSelectionMode.Auto
    );
    expect(callout?.settings?.framing?.selection?.selectedIds).toEqual([]);
  });

  test('case 2 — default (S1): SPACES callout created with no spaces settings reads back COMPACT', async () => {
    const res = await createSpacesCollectionCalloutWithVariant(
      calloutsSetId,
      `spaces-default-${uniqueId}`
    );
    expect(res.error).toBeUndefined();
    const callout = res?.data?.createCalloutOnCalloutsSet;
    expect(callout?.id).toBeTruthy();
    createdCalloutIds.push(callout!.id);

    expect(callout?.settings?.framing?.spaces?.cardVariant).toBe(
      SpaceCollectionCardVariant.Compact
    );
  });

  describe('case 3 — partial update (S4)', () => {
    let calloutId = '';

    beforeAll(async () => {
      const res = await createSpacesCollectionCalloutWithVariant(
        calloutsSetId,
        `spaces-partial-update-${uniqueId}`,
        SpaceCollectionCardVariant.Expanded
      );
      calloutId = res?.data?.createCalloutOnCalloutsSet?.id ?? '';
      createdCalloutIds.push(calloutId);
    });

    test('updating only commentsEnabled leaves cardVariant EXPANDED', async () => {
      const res = await updateCalloutSpacesSettings({
        ID: calloutId,
        settings: { framing: { commentsEnabled: false } },
      });
      expect(res.error).toBeUndefined();
      expect(
        res?.data?.updateCallout?.settings?.framing?.spaces?.cardVariant
      ).toBe(SpaceCollectionCardVariant.Expanded);
    });

    test('updating with spaces: {} leaves cardVariant EXPANDED and carries no GraphQL error (S2 / R-9)', async () => {
      const res = await updateCalloutSpacesSettings({
        ID: calloutId,
        settings: { framing: { spaces: {} } },
      });
      expect(res.error).toBeUndefined();
      expect(
        res?.data?.updateCallout?.settings?.framing?.spaces?.cardVariant
      ).toBe(SpaceCollectionCardVariant.Expanded);
      // The mutation answers with the entity it just saved; only a fresh read
      // proves what the row holds.
      const reread = await getCalloutSpacesSettings(calloutId);
      expect(
        reread?.data?.lookup?.callout?.settings?.framing?.spaces?.cardVariant
      ).toBe(SpaceCollectionCardVariant.Expanded);
    });
  });

  describe('case 4 — variant-only writes preserve a stored CUSTOM selection (S5)', () => {
    // A default {AUTO, []} selection is exactly what the server's normalizer
    // rebuilds whenever the block is missing, so asserting "unchanged" against
    // it cannot tell a preserved selection from a wiped one. Every case here
    // therefore seeds a CUSTOM selection over two real DIRECT subspaces of the
    // host space (the write-time host-scope guard rejects anything else), in
    // an order that differs from creation order, and asserts the list comes
    // back identical IN ORDER (array equality, not set equality).
    let subspaceAId = '';
    let subspaceBId = '';
    let seededIds: string[] = [];

    // An explicit GraphQL `null` on the wire. The generated `InputMaybe<T>` is
    // `T | undefined`, but `undefined` is dropped by JSON serialization (the
    // field is then simply omitted) — only a real `null` exercises the
    // server's explicit-null handling, so the type is bent here on purpose.
    const EXPLICIT_NULL = null as unknown as undefined;

    beforeAll(async () => {
      const hostSpaceId = baseScenario.space.id;
      subspaceAId = await createSubspaceOrFail(
        `ccv-a-${uniqueId}`,
        `ccv-a-${uniqueId}`,
        hostSpaceId
      );
      subspaceBId = await createSubspaceOrFail(
        `ccv-b-${uniqueId}`,
        `ccv-b-${uniqueId}`,
        hostSpaceId
      );
      // Reverse of creation order, so an order-losing store is observable.
      seededIds = [subspaceBId, subspaceAId];
    });

    afterAll(async () => {
      // Runs before the file-level afterAll, so the subspaces go before
      // cleanUpBaseScenario deletes the host space. Each delete is independent:
      // one failure never strands the other.
      await Promise.all(
        [subspaceAId, subspaceBId]
          .filter(id => id.length > 0)
          .map(id => deleteSpace(id).catch(() => undefined))
      );
    });

    /** Creates an EXPANDED SPACES callout seeded with a CUSTOM selection [B, A]. */
    const createExpandedCustomCallout = async (label: string) => {
      const res = await createSpacesCollectionCallout({
        calloutsSetID: calloutsSetId,
        framing: {
          type: CalloutFramingType.Spaces,
          profile: { displayName: `spaces-${label}-${uniqueId}` },
        },
        settings: {
          framing: {
            spaces: { cardVariant: SpaceCollectionCardVariant.Expanded },
            selection: {
              mode: CalloutSelectionMode.Custom,
              selectedIds: seededIds,
            },
          },
        },
      });
      expect(res.error).toBeUndefined();
      const callout = res?.data?.createCalloutOnCalloutsSet;
      const calloutId = callout?.id ?? '';
      expect(calloutId).toBeTruthy();
      createdCalloutIds.push(calloutId);
      // Precondition: the seed really is CUSTOM [B, A], not a normalized default.
      expect(callout?.settings?.framing?.spaces?.cardVariant).toBe(
        SpaceCollectionCardVariant.Expanded
      );
      expect(callout?.settings?.framing?.selection?.mode).toBe(
        CalloutSelectionMode.Custom
      );
      expect(callout?.settings?.framing?.selection?.selectedIds).toEqual(
        seededIds
      );
      return calloutId;
    };

    /** The mutation response AND a fresh re-read both carry the seeded CUSTOM selection. */
    const expectCustomSelectionKept = async (
      updated: Awaited<ReturnType<typeof updateCalloutSpacesSettings>>,
      calloutId: string,
      expectedVariant: SpaceCollectionCardVariant
    ) => {
      expect(updated.error).toBeUndefined();
      const fromMutation = updated?.data?.updateCallout?.settings?.framing;
      expect(fromMutation?.spaces?.cardVariant).toBe(expectedVariant);
      expect(fromMutation?.selection?.mode).toBe(CalloutSelectionMode.Custom);
      expect(fromMutation?.selection?.selectedIds).toEqual(seededIds);

      // The mutation answers with the entity it just saved; only a fresh read
      // proves what the row holds.
      const reread = await getCalloutSpacesSettings(calloutId);
      expect(reread.error).toBeUndefined();
      const stored = reread?.data?.lookup?.callout?.settings?.framing;
      expect(stored?.spaces?.cardVariant).toBe(expectedVariant);
      expect(stored?.selection?.mode).toBe(CalloutSelectionMode.Custom);
      expect(stored?.selection?.selectedIds).toEqual(seededIds);
    };

    test('toggle: EXPANDED updated to COMPACT reads back COMPACT; CUSTOM selection kept in order', async () => {
      const calloutId = await createExpandedCustomCallout('toggle');

      const updated = await updateCalloutSpacesSettings({
        ID: calloutId,
        settings: {
          framing: {
            spaces: { cardVariant: SpaceCollectionCardVariant.Compact },
          },
        },
      });
      await expectCustomSelectionKept(
        updated,
        calloutId,
        SpaceCollectionCardVariant.Compact
      );
    });

    test('settings.framing.spaces: null leaves cardVariant EXPANDED and the CUSTOM selection intact', async () => {
      const calloutId = await createExpandedCustomCallout('spaces-null');

      const updated = await updateCalloutSpacesSettings({
        ID: calloutId,
        settings: { framing: { spaces: EXPLICIT_NULL } },
      });
      await expectCustomSelectionKept(
        updated,
        calloutId,
        SpaceCollectionCardVariant.Expanded
      );
    });

    test('settings.framing.selection: null leaves the CUSTOM selection intact', async () => {
      const calloutId = await createExpandedCustomCallout('selection-null');

      const updated = await updateCalloutSpacesSettings({
        ID: calloutId,
        settings: { framing: { selection: EXPLICIT_NULL } },
      });
      await expectCustomSelectionKept(
        updated,
        calloutId,
        SpaceCollectionCardVariant.Expanded
      );
    });

    test('selection: { selectedIds: null } with a variant change succeeds and keeps the stored list', async () => {
      const calloutId = await createExpandedCustomCallout('selectedids-null');

      const updated = await updateCalloutSpacesSettings({
        ID: calloutId,
        settings: {
          framing: {
            spaces: { cardVariant: SpaceCollectionCardVariant.Compact },
            selection: { selectedIds: EXPLICIT_NULL },
          },
        },
      });
      await expectCustomSelectionKept(
        updated,
        calloutId,
        SpaceCollectionCardVariant.Compact
      );
    });
  });

  describe('case 5 — rejected off-kind (S3)', () => {
    // The wrapper also returns `error` on a connection failure, so a rejection
    // is only proven by its reason — and "persists nothing" only by listing the
    // callouts set afterwards and finding no callout under that name.
    const REJECTION_REASON =
      'Card-variant settings can only be set when framing.type = SPACES.';

    const expectRejectedAndAbsent = async (
      res: Awaited<ReturnType<typeof createSpacesCollectionCallout>>,
      displayName: string
    ) => {
      expect(res.error).toBeDefined();
      expect(JSON.stringify(res.error?.errors)).toContain(REJECTION_REASON);
      expect(res?.data?.createCalloutOnCalloutsSet?.id).toBeUndefined();

      const listed = await getCalloutsData(calloutsSetId);
      expect(listed.error).toBeUndefined();
      const names = (listed.data?.lookup.calloutsSet?.callouts ?? []).map(
        c => c.framing.profile.displayName
      );
      expect(names).not.toContain(displayName);
    };

    test('create NONE callout supplying spaces is rejected; no callout created', async () => {
      const displayName = `spaces-none-reject-${uniqueId}`;
      const res = await createSpacesCollectionCallout({
        calloutsSetID: calloutsSetId,
        framing: {
          type: CalloutFramingType.None,
          profile: { displayName },
        },
        settings: {
          framing: {
            spaces: { cardVariant: SpaceCollectionCardVariant.Expanded },
          },
        },
      });
      await expectRejectedAndAbsent(res, displayName);
    });

    test('create CONTRIBUTORS callout (with a valid contributors block) supplying spaces is rejected; no callout created', async () => {
      const displayName = `spaces-contributors-reject-${uniqueId}`;
      const res = await createSpacesCollectionCallout({
        calloutsSetID: calloutsSetId,
        framing: {
          type: CalloutFramingType.Contributors,
          profile: { displayName },
        },
        settings: {
          framing: {
            contributors: { contributorTypes: [ActorType.User] },
            spaces: { cardVariant: SpaceCollectionCardVariant.Expanded },
          },
        },
      });
      await expectRejectedAndAbsent(res, displayName);
    });

    test('update an existing NONE callout with spaces is rejected; re-read shows settings.framing.spaces null/undefined', async () => {
      const created = await createSpacesCollectionCallout({
        calloutsSetID: calloutsSetId,
        framing: {
          type: CalloutFramingType.None,
          profile: { displayName: `spaces-none-update-reject-${uniqueId}` },
        },
      });
      const calloutId = created?.data?.createCalloutOnCalloutsSet?.id ?? '';
      expect(calloutId).toBeTruthy();
      createdCalloutIds.push(calloutId);

      const updated = await updateCalloutSpacesSettings({
        ID: calloutId,
        settings: {
          framing: {
            spaces: { cardVariant: SpaceCollectionCardVariant.Expanded },
          },
        },
      });
      expect(updated.error).toBeDefined();
      expect(JSON.stringify(updated.error?.errors)).toContain(
        'Card-variant settings can only be set when framing.type = SPACES.'
      );

      const reread = await getCalloutSpacesSettings(calloutId);
      expect(reread.error).toBeUndefined();
      expect(
        reread?.data?.lookup?.callout?.settings?.framing?.spaces
      ).toBeFalsy();
    });
  });
});
