import { TestUser } from '../../../utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';

const uniqueId = (Date.now() + Math.random()).toString();
export const challengeNameId = `chalNaId${uniqueId}`;

export const getSubspaceDataCodegen = async (
  spaceId: string,
  subspaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSubspacePage(
      {
        spaceId,
        subspaceId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSubspacesDataCodegen = async (spaceId: string) => {
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

export const createSubspaceCodegen = async (
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
        subspaceData: challengeVariablesDataCodegen(
          challengeName,
          challengeNameId,
          parentId,
          innovationFlowTemplateID
        ),
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const challengeVariablesDataCodegen = (
  displayName: string,
  nameId: string,
  spaceId: string,
  innovationFlowTemplateID = entitiesId.spaceInnovationFlowTemplateChId
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
      innovationFlowTemplateID,
    },
  };

  return variables;
};
