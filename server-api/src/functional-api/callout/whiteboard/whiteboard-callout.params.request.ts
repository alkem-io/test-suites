import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import {
  CalloutType,
  CalloutVisibility,
} from '@alkemio/tests-lib/dist/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/dist/utils/graphql.wrapper';

export const createWhiteboardCallout = async (
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
          type: CalloutType.Whiteboard,

          visibility: CalloutVisibility.Published,
          framing: {
            profile: {
              displayName,
              description: 'Whiteboard callout',
            },
            whiteboard: {
              content:
                '{"type":"excalidraw","version":2,"source":"https://excalidraw.com","elements":[],"appState":{"gridSize":null,"viewBackgroundColor":"#ffffff"}}',
              profile: {
                displayName: 'whiteboard',
              },
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

export const deleteWhiteboard = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.DeleteWhiteboard(
      {
        input: {
          ID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
