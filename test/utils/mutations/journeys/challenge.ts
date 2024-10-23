import { entitiesId } from '@test/types/entities-helper';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { TestUser } from '@test/utils/token.helper';

export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const createChallenge = async (
  challengeName: string,
  challengeNameId: string,
  parentId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  innovationFlowTemplateID?: string
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSubspace(
      {
        subspaceData: challengeVariablesData(
          challengeName,
          challengeNameId,
          parentId,
        ),
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const challengeVariablesData = (
  displayName: string,
  nameId: string,
  spaceId: string,
) => {
  const variables = {
    nameID: nameId,
    spaceID: spaceId,
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
    context: {
      vision: 'test vision' + uniqueId,
      impact: 'test impact' + uniqueId,
      who: 'test who' + uniqueId,
    },
    collaborationData: {
      "addTutorialCallouts": true
    },
  };

  return variables;
};
