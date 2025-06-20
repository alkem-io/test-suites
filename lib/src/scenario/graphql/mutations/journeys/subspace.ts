import { TestUser } from "@src/common/enums/test.user";
import { graphqlErrorWrapper } from "@src/utils/graphql.wrapper";
import { getGraphqlClient } from "@src/utils/graphqlClient";
import { UniqueIDGenerator } from "@src/utils/uniqueId";

const uniqueId = UniqueIDGenerator.getID();

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
        tagline: "test tagline" + uniqueId,
        description: "test description" + uniqueId,
        referencesData: [
          {
            name: "test video" + uniqueId,
            uri: "https://youtu.be/-wGlzcjs",
            description: "dest description" + uniqueId,
          },
        ],
      },
    },
    collaborationData: {
      addTutorialCallouts: true,
      calloutsSetData: {},
    },
  };

  return variables;
};
