import { TestUser } from '@test/utils';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';

export const createInnovationPackOnLibraryCodegen = async (
  displayName: string,
  nameID: string,
  providerID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.createInnovationPack(
      {
        data: {
          accountID: providerID,
          profileData: { displayName },
          nameID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
