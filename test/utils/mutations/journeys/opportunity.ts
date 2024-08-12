import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { TestUser } from '@test/utils/token.helper';

export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const createOpportunityCodegen = async (
  opportunityName: string,
  opportunityNameId: string,
  parentId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  innovationFlowTemplateID?: string
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSubspace(
      {
        subspaceData: opportunityVariablesDataCodegen(
          opportunityName,
          opportunityNameId,
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

export const opportunityVariablesDataCodegen = (
  displayName: string,
  nameId: string,
  challengeId: string,
  innovationFlowTemplateID = entitiesId.space.innovationFlowTemplateOppId
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
      innovationFlowTemplateID,
    },
  };

  return variables;
};
