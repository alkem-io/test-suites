import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { deleteSpace } from '@alkemio/tests-lib/scenario/baseFunctions';

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
  const lookup = await graphqlErrorWrapper(
    (authToken: string | undefined) => client.getSpaceIdByNameId({ nameID }, { authorization: `Bearer ${authToken}` }),
    TestUser.GLOBAL_ADMIN
  );
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
