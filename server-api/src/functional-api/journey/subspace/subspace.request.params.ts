import { delay, getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
const uniqueId = UniqueIDGenerator.getID();

export const subspaceNameId = `chalNaId${uniqueId}`;

export const getSubspaceData = async (
  subspaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSubspacePage(
      {
        subspaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSubspacesData = async (spaceId: string) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSubspacesData(
      {
        spaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
};

export const createSubspace = async (
  subspaceName: string,
  subspaceNameId: string,
  parentId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSubspace(
      {
        subspaceData: subspaceVariablesData(
          subspaceName,
          subspaceNameId,
          parentId
        ),
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

/**
 * Setup-time subspace creation that is resilient to the ENV_FAILURE
 * retry-after-commit race, and surfaces genuine failures instead of masking
 * them.
 *
 * Two problems this replaces the plain
 * `createSubspace(...).data?.createSubspace.id ?? ''` idiom for:
 *
 * 1. Masking. The `?? ''` turns a failed create into an empty string; later
 *    mutations/queries then reject that empty id with a misleading
 *    `UUID not valid:`. That is how the 2026-07-15 nightly produced a 12-failure
 *    cascade across subspace-sorting-and-pinning and subsubspace with no trace
 *    of the real cause. We throw the actual error at the true failure point
 *    instead (same de-masking as `createRootSpace`, test-suites#577 / #563).
 *
 * 2. The retry-after-commit race. On a ~5s connection reset (test-suites#563 /
 *    server#6258), `graphqlErrorWrapper` retries the mutation — but a create may
 *    have already committed server-side before the reset, so the retry comes
 *    back as `nameID already taken` (BAD_USER_INPUT). The subspace *does* exist;
 *    failing setup for a create that actually succeeded is wrong. Because the
 *    nameID is unique per run, `already taken` here reliably means our own
 *    committed-then-retried create — so we look it up by nameID under the parent
 *    and return it. (This is the caveat the wrapper's retry comment calls
 *    "harmless"; for a create it is not — hence this recovery.)
 *
 * The recovery lookup must POLL, not fire once. createSubspace is not atomic
 * server-side: the space row (which reserves the nameID) lands first and the
 * children (about/collaboration/community…) keep landing for up to ~30s more
 * (e.g. behind the Matrix 30s RPC timeout). While the space is half-built, the
 * parent's subspaces query fails on child resolvers and non-null bubbling nulls
 * the whole list — a single-shot lookup therefore missed a subspace that
 * demonstrably existed (2026-07-15 nightly, test-suites#563: `alpha-35e44f` /
 * `opio2fed` were direct children of the queried parent yet setup still threw
 * `already taken`). We retry until the tree reads clean, and if it never does,
 * we throw with BOTH the create error and the last lookup failure — never
 * masking either.
 */
const RECOVERY_LOOKUP_ATTEMPTS = 10;
const RECOVERY_LOOKUP_DELAY_MS = 5000;
export const createSubspaceOrFail = async (
  subspaceName: string,
  subspaceNameId: string,
  parentId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<string> => {
  const response = await createSubspace(
    subspaceName,
    subspaceNameId,
    parentId,
    userRole
  );
  const id = response.data?.createSubspace?.id;
  if (id) {
    return id;
  }

  const alreadyTaken = response.error?.errors?.some(e =>
    String((e as { message?: unknown }).message ?? '').includes(
      'nameID is already taken'
    )
  );
  const createDetail = response.error
    ? JSON.stringify(response.error.errors)
    : 'server returned no createSubspace.id and no error';

  if (alreadyTaken) {
    let lastLookupDetail = '';
    for (let attempt = 1; attempt <= RECOVERY_LOOKUP_ATTEMPTS; attempt++) {
      const existing = await getSubspacesData(parentId);
      const subspaces = existing.data?.lookup?.space?.subspaces as
        | Array<{ id: string; nameID: string }>
        | undefined;
      if (existing.error || !subspaces) {
        // Half-built space (or a transient env failure): record why and retry.
        lastLookupDetail = `lookup failed: ${JSON.stringify(
          existing.error?.errors ?? 'no data'
        )}`;
      } else {
        const match = subspaces.find(s => s.nameID === subspaceNameId);
        if (match?.id) {
          return match.id;
        }
        lastLookupDetail = `no subspace with nameID '${subspaceNameId}' among [${subspaces
          .map(s => s.nameID)
          .join(', ')}]`;
      }
      if (attempt < RECOVERY_LOOKUP_ATTEMPTS) {
        await delay(RECOVERY_LOOKUP_DELAY_MS);
      }
    }
    throw new Error(
      `Failed to create subspace '${subspaceName}' (nameID '${subspaceNameId}', parent '${parentId}'): create reported '${createDetail}' and the committed-create recovery did not stabilise after ${RECOVERY_LOOKUP_ATTEMPTS} lookups: ${lastLookupDetail}`
    );
  }

  throw new Error(
    `Failed to create subspace '${subspaceName}' (nameID '${subspaceNameId}', parent '${parentId}'): ${createDetail}`
  );
};

export const subspaceVariablesData = (
  displayName: string,
  nameId: string,
  spaceId: string
) => {
  const variables = {
    nameID: nameId,
    spaceID: spaceId,
    about: {
      profileData: {
        displayName,
        tagline: 'test tagline' + uniqueId,
        description: 'test description' + uniqueId,
        referencesData: [
          {
            name: 'test video' + uniqueId,
            uri: 'https://youtu.be/-wGlzcjs',
            description: 'dest description' + uniqueId,
          },
        ],
      },
      why: 'test vision' + uniqueId,
      who: 'test who' + uniqueId,
    },
    collaborationData: {
      addTutorialCallouts: true,
      calloutsSetData: {},
    },
  };

  return variables;
};

export const updateSubspacePinned = async (
  spaceID: string,
  subspaceID: string,
  pinned: boolean,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSubspacePinned(
      {
        pinnedData: {
          spaceID,
          subspaceID,
          pinned,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateSubspacesSortOrder = async (
  spaceID: string,
  subspaceIDs: string[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSubspacesSortOrder(
      {
        sortOrderData: {
          spaceID,
          subspaceIDs,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
