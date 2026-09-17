import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const getActivityLogOnCollaboration = async (
  collaborationID: string,
  limit: number,
  userRole: TestUser = TestUser.BOOTSTRAP_PLATFORM_ROLES_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetActivityLogOnCollaboration(
      {
        queryData: {
          collaborationID,
          limit,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
