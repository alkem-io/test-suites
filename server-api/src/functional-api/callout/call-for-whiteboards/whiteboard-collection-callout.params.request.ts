import { CalloutContributionType } from '@alkemio/client-lib';
import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const createWhiteboardCollectionCallout = async (
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
              description: 'Whiteboard collection callout',
            },
          },
          settings: {
            contribution: {
              enabled: true,
              allowedTypes: [CalloutContributionType.Whiteboard],
            },
          },
          // Since server#6399 whiteboardContent is server-internal; an empty
          // default whiteboard is created when no source is given.
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const createWhiteboardOnCallout = async (
  calloutID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateContributionOnCallout(
      {
        contributionData: {
          calloutID,
          type: CalloutContributionType.Whiteboard,
          // Since server#6399 CreateWhiteboardInput has no inline content;
          // an empty whiteboard is created (seed via sourceWhiteboardID).
          whiteboard: {
            profile: {
              displayName: '111',
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
