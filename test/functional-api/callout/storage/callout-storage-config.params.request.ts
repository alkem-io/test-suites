import { TestUser } from '@test/utils';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';

export const calloutStorageConfigCodegen = async (
  calloutId: string,
  spaceNameId: string,
  includeSpace: boolean,
  includeChallenge: boolean,
  includeOpportunity: boolean,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.CalloutStorageConfig(
      {
        calloutId,
        spaceNameId,
        includeSpace,
        includeChallenge,
        includeOpportunity,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
