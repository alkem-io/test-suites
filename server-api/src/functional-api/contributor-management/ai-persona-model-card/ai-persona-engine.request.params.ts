import { getGraphqlClient } from '@utils/graphqlClient';
import { TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@utils/graphql.wrapper';
import {
  AiPersonaBodyOfKnowledgeType,
  AiPersonaEngine,
} from '@generated/alkemio-schema';

export const createVirtualContributorWithEngineType = async (
  displayName: string,
  accountID: string,
  bodyOfKnowledgeID: string,
  engineType: AiPersonaEngine,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateVirtualContributorOnAccount(
      {
        virtualContributorData: {
          profileData: {
            displayName,
          },
          accountID,
          aiPersona: {
            aiPersonaService: {
              bodyOfKnowledgeID,
              bodyOfKnowledgeType: AiPersonaBodyOfKnowledgeType.AlkemioSpace,
              engine: engineType,
            },
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const createExternalVirtualContributorWithEngineType = async (
  displayName: string,
  accountID: string,
  engineType: AiPersonaEngine,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateVirtualContributorOnAccount(
      {
        virtualContributorData: {
          profileData: {
            displayName,
          },
          accountID,
          aiPersona: {
            aiPersonaService: {
              bodyOfKnowledgeType:
                AiPersonaBodyOfKnowledgeType.AlkemioKnowledgeBase,
              engine: engineType,
            },
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
