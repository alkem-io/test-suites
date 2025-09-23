import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import {
  AiPersonaEngine,
  VirtualContributorBodyOfKnowledgeType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const getModelCardForAiPersona = async (
  aiPersonaId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetAiPersonaModelCard(
      {
        id: aiPersonaId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getVirtualContributorWithModelCard = async (
  virtualContributorId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetVirtualContributorWithModelCard(
      {
        id: virtualContributorId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const createVirtualContributorWithEngineType = async (
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
          bodyOfKnowledgeType:
            VirtualContributorBodyOfKnowledgeType.AlkemioKnowledgeBase,
          aiPersona: {
            engine: engineType,
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
