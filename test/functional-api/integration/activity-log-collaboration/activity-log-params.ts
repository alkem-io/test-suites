import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const activityLogOnCollaboration = async (
  collaborationID: string,
  limit: number,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query activityLogOnCollaboration($queryData: ActivityLogInput!){
      activityLogOnCollaboration(queryData: $queryData) {
        collaborationID
        triggeredBy {
          id
        }
        description
        type
      }
    }`,
    variables: {
      queryData: {
        collaborationID,
        limit,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
