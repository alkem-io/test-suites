import { entitiesId } from '@test/types/entities-helper';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { TestUser } from '@test/utils/token.helper';

export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const createOpportunity = async (
  opportunityName: string,
  opportunityNameId: string,
  parentId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSubspace(
      {
        subspaceData: opportunityVariablesData(
          opportunityName,
          opportunityNameId,
          parentId,
        ),
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const opportunityVariablesData = (
  displayName: string,
  nameId: string,
  challengeId: string,
) => {
  const variables = {
    spaceID: challengeId,
    nameID: nameId,
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
