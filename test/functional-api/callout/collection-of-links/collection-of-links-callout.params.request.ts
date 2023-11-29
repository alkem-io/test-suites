import { PostTypes } from '@test/functional-api/integration/post/post.request.params';
import { CalloutType } from '@test/generated/alkemio-schema';
import { TestUser } from '@test/utils';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';

export const createLinkCollectionCalloutCodegen = async (
  collaborationID: string,
  displayName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateCalloutOnCollaboration(
      {
        calloutData: {
          collaborationID,
          type: CalloutType.LinkCollection,
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

export const createLinkOnCalloutCodegen = async (
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
            name: 'Link Callout reference name',
            description: 'Link Callout reference description',
          },
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
