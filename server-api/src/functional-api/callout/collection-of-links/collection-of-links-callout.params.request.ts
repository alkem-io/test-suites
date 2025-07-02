import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const createLinkCollectionCallout = async (
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
              description: 'Link collection callout',
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

export const createLinkOnCallout = async (
  calloutID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateContributionOnCallout(
      {
        contributionData: {
          calloutID,
          link: {
            profile: {
              displayName: 'Link Callout reference name',
              description: 'Link Callout reference description',
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
