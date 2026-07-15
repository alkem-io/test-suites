import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
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
 * Setup-time subspace creation that surfaces failures instead of masking them.
 *
 * The `createSubspace(...).data?.createSubspace.id ?? ''` idiom used in test
 * setup turns a failed create — a `graphqlErrorWrapper`-swallowed
 * BAD_USER_INPUT / FORBIDDEN_POLICY, or an exhausted ENV_FAILURE retry — into an
 * empty string. Later mutations/queries then reject that empty id with a
 * misleading `UUID not valid:`, which is how the 2026-07-15 nightly produced a
 * 12-failure cascade across subspace-sorting-and-pinning and subsubspace with no
 * trace of the real cause. Throw the actual error at the true failure point
 * instead (same de-masking as `createRootSpace`, test-suites#577 / #563).
 */
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
  if (!id) {
    const detail = response.error
      ? JSON.stringify(response.error.errors)
      : 'server returned no createSubspace.id and no error';
    throw new Error(
      `Failed to create subspace '${subspaceName}' (nameID '${subspaceNameId}', parent '${parentId}'): ${detail}`
    );
  }
  return id;
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
