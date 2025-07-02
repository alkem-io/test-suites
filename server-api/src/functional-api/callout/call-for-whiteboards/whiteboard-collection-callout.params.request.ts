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
          contributionDefaults: {
            whiteboardContent:
              '{"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":[],"appState":{"gridSize":null,"viewBackgroundColor":"#ffffff"}}',
          },
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
          whiteboard: {
            content:
              '{"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":[],"appState":{"gridSize":null,"viewBackgroundColor":"#ffffff"}}',
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
