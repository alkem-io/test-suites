import { getGraphqlClient } from '@test/utils/graphqlClient';
import { TestUser } from '../../../utils/token.helper';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { SearchVisibility } from '@alkemio/client-lib';

export const createVirtualContributorOnAccount = async (
  displayName: string,
  accountID: string,
  bodyOfKnowledgeID: string,
  userRole: TestUser = TestUser.BETA_TESTER
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

export const updateVirtualContributor = async (
  ID: string,
  searchVisibility: SearchVisibility.Public,
  userRole: TestUser = TestUser.BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateVirtualContributor(
      {
        virtualContributorData: {
          ID,
          searchVisibility,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const deleteVirtualContributorOnAccount = async (
  ID: string,
  userRole: TestUser = TestUser.BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteVirtualContributorOnAccount(
      {
        virtualContributorData: {
          ID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const removeVirtualContributorFromCommunity = async (
  roleSetId: string,
  virtualContributorId: string,
  userRole: TestUser = TestUser.BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RemoveRoleFromVirtualContributor(
      {
        roleSetId,
        virtualContributorId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const queryVCData = async (
  id: string,
  userRole: TestUser = TestUser.BETA_TESTER
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.VirtualContributor(
      {
        id,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
