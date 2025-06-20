import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/dist/utils/graphql.wrapper';
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
