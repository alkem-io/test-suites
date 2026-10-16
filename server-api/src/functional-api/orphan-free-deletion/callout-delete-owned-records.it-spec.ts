/**
 * Orphan-free deletion — callouts (alkem-io/server#6614, fix alkem-io/server#6637)
 *
 * Plan: ./orphan-free-deletion-test-plan.md
 *
 * - CD-1: deleting a PLAIN callout deletes its classification and the
 *   classification's tagsets, with their authorization policies. Before #6637
 *   only a Tasks board's classification was removed, so this is red without the fix.
 * - CD-2: deleting a Tasks-board callout still succeeds and still removes its
 *   classification, including the board marker tagset. Green before #6637 as
 *   well: a regression guard for the branch that moved into a logged-not-thrown
 *   `try`.
 *
 * Oracle: `_support/owned-records.ts` (authorization-policy lookups as the
 * Platform Operations Admin, positive control before the delete, exact
 * ENTITY_NOT_FOUND after it).
 *
 * Not assertable, by design: the classification itself and the Tasks-board
 * column template (`tagset_template`) have no GraphQL lookup, and the template
 * has no policy either, so its removal is unobservable and stays unpinned.
 * Only the classification's and its tagsets' policies are observable.
 */
import {
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  createCalloutOnCalloutsSet,
  deleteCallout,
} from '@functional-api/callout/callouts.request.params';
import { rawRead } from '@functional-api/platform-roles/_support/raw-request';
import {
  expectLookupGone,
  expectPoliciesGone,
  expectPoliciesPresent,
  expectRandomPolicyIsNotFound,
  ids,
  operationsAdminToken,
  type OwnedIds,
} from './_support/owned-records';

const READ_CALLOUT = `
  query($id: UUID!) {
    lookup {
      callout(ID: $id) {
        id
        taskColumnCounts { column count }
        classification {
          authorization { id }
          tagsets { name authorization { id } }
        }
      }
    }
  }`;

type CalloutRead = {
  lookup: {
    callout: {
      id: string;
      taskColumnCounts: { column: string; count: number }[] | null;
      classification: {
        authorization: { id: string } | null;
        tagsets: { name: string; authorization: { id: string } | null }[];
      } | null;
    };
  };
};

let baseScenario: OrganizationWithSpaceModel;
let poa: string;
const adminToken = () =>
  TestUserManager.getUserModelByType(TestUser.GLOBAL_ADMIN).authToken;

const readCallout = async (calloutId: string) => {
  const data = await rawRead<CalloutRead>(adminToken(), READ_CALLOUT, {
    id: calloutId,
  });
  return data.lookup.callout;
};

/** classification policy + one entry per tagset policy, labelled for the failure message. */
const classificationPolicies = (
  callout: Awaited<ReturnType<typeof readCallout>>
): OwnedIds => {
  const classification = callout.classification;
  expect(classification, 'callout has a classification').not.toBeNull();
  const captured: Record<string, string | null | undefined> = {
    'classification policy': classification?.authorization?.id,
  };
  for (const tagset of classification?.tagsets ?? []) {
    captured[`tagset '${tagset.name}' policy`] = tagset.authorization?.id;
  }
  return ids(captured);
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario({
    name: 'orphan-free-callout-delete',
    space: {},
  });
  poa = await operationsAdminToken();
  // The oracle's own assumption, checked on the stack under test.
  await expectRandomPolicyIsNotFound(poa);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Orphan-free deletion - callouts (server#6614)', () => {
  test('CD-1 - deleting a plain callout deletes its classification and tagset policies', async () => {
    const created = await createCalloutOnCalloutsSet(
      baseScenario.space.collaboration.calloutsSetId
    );
    const calloutId = created.data?.createCalloutOnCalloutsSet.id ?? '';
    expect(calloutId).not.toBe('');

    const callout = await readCallout(calloutId);
    // A precondition, so the tagset class is not vacuous.
    expect(callout.classification?.tagsets.length).toBeGreaterThanOrEqual(1);
    const owned = classificationPolicies(callout);

    await expectPoliciesPresent(poa, owned);

    const deleted = await deleteCallout(calloutId);
    expect(deleted.error).toBeUndefined();
    expect(deleted.data?.deleteCallout.id).toBe(calloutId);

    await expectPoliciesGone(poa, owned, 'plain callout classification');
    // Control that the delete happened at all.
    await expectLookupGone(adminToken(), 'callout', calloutId);
  });

  test('CD-2 - deleting a Tasks-board callout succeeds and removes its classification, including the board marker tagset', async () => {
    const created = await createCalloutOnCalloutsSet(
      baseScenario.space.collaboration.calloutsSetId,
      { taskBoard: {} }
    );
    const calloutId = created.data?.createCalloutOnCalloutsSet.id ?? '';
    expect(calloutId).not.toBe('');

    const callout = await readCallout(calloutId);
    // It really is a board: columns are seeded, and the marker tagset
    // (server TagsetReservedName.TASK = 'task') is in the classification.
    expect(callout.taskColumnCounts).not.toBeNull();
    expect(callout.taskColumnCounts?.length).toBeGreaterThanOrEqual(1);
    expect(callout.classification?.tagsets.map(t => t.name)).toContain('task');
    const owned = classificationPolicies(callout);

    await expectPoliciesPresent(poa, owned);

    const deleted = await deleteCallout(calloutId);
    expect(deleted.error).toBeUndefined();
    expect(deleted.data?.deleteCallout.id).toBe(calloutId);

    await expectPoliciesGone(poa, owned, 'Tasks-board classification');
    await expectLookupGone(adminToken(), 'callout', calloutId);
  });
});
