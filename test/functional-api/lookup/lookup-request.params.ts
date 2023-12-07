import { TestUser } from '@test/utils';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';

export const lookupProfileVisuals = async (
  profileId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.lookupProfileVisuals(
      {
        ID: profileId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
