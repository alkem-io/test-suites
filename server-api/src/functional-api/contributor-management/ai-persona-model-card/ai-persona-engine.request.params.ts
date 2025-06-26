import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import {
  AiPersonaBodyOfKnowledgeType,
  AiPersonaEngine,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

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
