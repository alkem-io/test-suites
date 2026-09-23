/**
 * Functional API specs for the Subspaces (SPACES) collection callout's
 * card-variant setting (contract graphql-spaces-card-variant, S1-S5).
 *
 * Covers: EXPANDED on create, COMPACT default, partial-update independence
 * (S4 / risk R-9), toggling, and off-kind rejection (S3) for both NONE and
 * CONTRIBUTORS framing types.
 *
 * These tests run against a live API stack. They are self-seeding: every
 * required entity (space, callouts) is created in beforeAll/per-test and
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

  test('case 4 — toggle: EXPANDED updated to COMPACT reads back COMPACT; selection unchanged (S5)', async () => {
    const created = await createSpacesCollectionCalloutWithVariant(
      calloutsSetId,
      `spaces-toggle-${uniqueId}`,
      SpaceCollectionCardVariant.Expanded
    );
    const calloutId = created?.data?.createCalloutOnCalloutsSet?.id ?? '';
    expect(calloutId).toBeTruthy();
    createdCalloutIds.push(calloutId);

    const beforeSelection =
      created?.data?.createCalloutOnCalloutsSet?.settings?.framing?.selection;

    const updated = await updateCalloutSpacesSettings({
      ID: calloutId,
      settings: {
        framing: {
          spaces: { cardVariant: SpaceCollectionCardVariant.Compact },
        },
      },
    });
    expect(updated.error).toBeUndefined();
    expect(
      updated?.data?.updateCallout?.settings?.framing?.spaces?.cardVariant
    ).toBe(SpaceCollectionCardVariant.Compact);
    expect(updated?.data?.updateCallout?.settings?.framing?.selection).toEqual(
      beforeSelection
    );

    const reread = await getCalloutSpacesSettings(calloutId);
    expect(
      reread?.data?.lookup?.callout?.settings?.framing?.spaces?.cardVariant
    ).toBe(SpaceCollectionCardVariant.Compact);
    expect(reread?.data?.lookup?.callout?.settings?.framing?.selection).toEqual(
      beforeSelection
    );
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
