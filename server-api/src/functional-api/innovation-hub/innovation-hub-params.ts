import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import {
  InnovationHubType,
  SpaceVisibility,
} from '@alkemio/tests-lib/dist/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/dist/utils/graphql.wrapper';

export const createInnovationHub = async (
  accountID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateInnovationHub(
      {
        input: {
          accountID,
          subdomain: 'demo',
          type: InnovationHubType.Visibility,
          nameID: 'demo',
          profileData: {
            displayName: 'demo space',
          },
          spaceVisibilityFilter: SpaceVisibility.Demo,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deleteInnovationHub = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteInnovationHub(
      {
        input: {
          ID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
