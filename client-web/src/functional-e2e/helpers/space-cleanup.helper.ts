import { expect } from '@playwright/test';
import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib';
import { deleteSpace } from '@alkemio/tests-lib/scenario/baseFunctions';
import { readSpaceSubspaceTree } from '@alkemio/tests-lib';

/**
 * Deletes the Space with this nameID if it exists — the safety net for a walk
 * that creates a Space through the UI and deletes it through the UI at the
 * end: when the walk fails in between, the Space stays behind, and on an
 * account with the free allowance (3 Spaces) three such leaks turn every later
 * "Create Space" into "Capacity reached". Idempotent; a missing Space is not an
 * error.
 */
export async function deleteSpaceByNameId(nameID: string): Promise<void> {
  const client = getGraphqlClient();
  const lookupOnce = () =>
    graphqlErrorWrapper(
      (authToken: string | undefined) => client.getSpaceIdByNameId({ nameID }, { authorization: `Bearer ${authToken}` }),
      TestUser.GLOBAL_ADMIN
    );
  let lookup = await lookupOnce();
  // A Space whose creation is still in flight (the walk failed mid-create)
  // exists but has no authorization policy yet, and the lookup answers
  // AUTHORIZATION_INVALID_POLICY instead of the id. There is no create
  // transaction: createSpace saves the Space and only then applies and saves
  // its policies (server account.resolver.mutations.ts), so the window closes
  // when that second pass finishes — or never, if it fails, which leaves the
  // orphan server#6648 describes. Poll until the lookup answers either way.
  const creationInFlight = () => JSON.stringify(lookup.error ?? '').includes('AUTHORIZATION_INVALID_POLICY');
  if (creationInFlight()) {
    await expect
      .poll(
        async () => {
          lookup = await lookupOnce();
          return creationInFlight();
        },
        {
          timeout: 60_000,
          message: `Space '${nameID}' still has no authorization policy after 60 s — an orphaned create (server#6648), not a slow one`,
        }
      )
      .toBe(false);
  }
  if (lookup.error) {
    throw new Error(`could not look up Space '${nameID}': ${JSON.stringify(lookup.error)}`);
  }
  const id = lookup.data?.lookupByName?.space?.id;
  if (!id) return;
  const res = await deleteSpace(id);
  if (res.error) {
    throw new Error(`could not delete leaked Space '${nameID}': ${JSON.stringify(res.error)}`);
  }
}

/**
 * Deletes a space and every subspace under it, leaves first — the server
 * refuses `deleteSpace` on a space that still has subspaces ("contains 1
 * subspaces"), so a walk that creates subspaces through the UI must remove
 * them before its seeded L0 can go. `TestScenarioFactory.cleanUpBaseScenario`
 * only knows the subspaces it created itself and logs (does not throw) when
 * the L0 delete is refused, which leaks the L0 against the account's Space
 * allowance. Idempotent: a space that is already gone is not an error.
 * Throws with every failure listed, so a leak fails the hook loudly.
 */
export async function deleteSpaceTree(spaceId: string): Promise<void> {
  if (!spaceId) return;
  const tree = await readSpaceSubspaceTree(spaceId);
  const root = tree.data?.lookup?.space;
  if (!root) {
    // Gone already (not-found), or unreadable — only the latter is a problem.
    const notFound = JSON.stringify(tree.error ?? '').includes('ENTITY_NOT_FOUND');
    if (tree.error && !notFound) {
      throw new Error(`could not read the subspace tree of ${spaceId}: ${JSON.stringify(tree.error)}`);
    }
    return;
  }
  const ordered = [
    ...root.subspaces.flatMap(l1 => l1.subspaces.map(l2 => l2.id)),
    ...root.subspaces.map(l1 => l1.id),
    root.id,
  ];
  const failures: string[] = [];
  for (const id of ordered) {
    const res = await deleteSpace(id);
    if (res.error) failures.push(`${id}: ${JSON.stringify(res.error.errors ?? res.error)}`);
  }
  if (failures.length > 0) {
    throw new Error(`deleteSpaceTree(${spaceId}) left spaces behind: ${failures.join('; ')}`);
  }
}
