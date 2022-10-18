import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const activityLogOnCollaboration = async (
  collaborationID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query activityLogOnCollaboration($queryData: ActivityLogInput!){
      activityLogOnCollaboration(queryData: $queryData) {
        collaborationID
        triggeredBy
        resourceID
        description
        type
      }
    }`,
    variables: {
      queryData: {
        collaborationID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
