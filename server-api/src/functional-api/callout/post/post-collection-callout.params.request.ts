import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const createPostCollectionCallout = async (
  calloutsSetID: string,
  nameID: string,
  displayName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateCalloutOnCalloutsSet(
      {
        calloutData: {
          calloutsSetID,
          nameID,
          framing: {
            profile: {
              displayName,
              description: 'Post collection callout',
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

export const createPostCardOnCallout = async (
  calloutID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateContributionOnCallout(
      {
        contributionData: {
          calloutID,
          post: {
            profileData: {
              displayName: '111',
              description: 'Create Call for Posts\n',
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
