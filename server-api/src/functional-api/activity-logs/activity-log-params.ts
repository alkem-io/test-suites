import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { rawRequest } from '@functional-api/platform-roles/_support/raw-request';

export const getActivityLogOnCollaboration = async (
  collaborationID: string,
  limit: number,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
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

// Raw (untyped) feed reads. `rawRequest` keeps `data` AND `errors`, which the
// empty-scope / excludeMyActivity oracles need ("an empty list with no errors"
// is the contract; a Forbidden error is a different outcome), and the lib's
// generated ActivityFeed*QueryArgs types lag server develop (no
// `excludeMyActivity`). Pass GraphQL enum VALUES as plain strings in `args`.
export type ActivityFeedRow = {
  id: string;
  collaborationID: string;
  type: string;
  description: string;
  triggeredBy: { id: string };
};

const ACTIVITY_FEED_GROUPED = `query ActivityFeedGrouped($args: ActivityFeedGroupedQueryArgs) {
  activityFeedGrouped(args: $args) { id collaborationID type description triggeredBy { id } }
}`;

export const getActivityFeedGroupedAs = (
  token: string,
  args: Record<string, unknown>
) =>
  rawRequest<{ activityFeedGrouped: ActivityFeedRow[] }>(
    token,
    ACTIVITY_FEED_GROUPED,
    { args }
  );

const ACTIVITY_FEED = `query ActivityFeed($first: Int, $after: UUID, $args: ActivityFeedQueryArgs) {
  activityFeed(first: $first, after: $after, args: $args) {
    total
    pageInfo { endCursor hasNextPage }
    activityFeed { id type description collaborationID triggeredBy { id } }
  }
}`;

export type ActivityFeedPage = {
  activityFeed: {
    total: number;
    pageInfo: { endCursor: string | null; hasNextPage: boolean };
    activityFeed: ActivityFeedRow[];
  };
};

export const getActivityFeedAs = (
  token: string,
  vars: { first?: number; after?: string; args?: Record<string, unknown> }
) => rawRequest<ActivityFeedPage>(token, ACTIVITY_FEED, vars);
