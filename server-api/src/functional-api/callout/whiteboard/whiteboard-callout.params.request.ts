import { getGraphqlClient } from '@alkemio/tests-lib/utils/graphqlClient';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import {
  CalloutAllowedActors,
  CalloutFramingType,
  CalloutVisibility,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

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
          framing: {
            profile: {
              displayName,
              description: 'Whiteboard callout',
            },
            // Since server#6399 CreateWhiteboardInput has no inline content;
            // an empty whiteboard is created (seed via sourceWhiteboardID).
            whiteboard: {
              profile: {
                displayName: 'whiteboard',
              },
            },
            type: CalloutFramingType.Whiteboard,
          },
          settings: {
            framing: {
              commentsEnabled: true,
            },
            visibility: CalloutVisibility.Published,
            contribution: {
              enabled: true,
              allowedTypes: [],
              canAddContributions: CalloutAllowedActors.Admins,
              commentsEnabled: true,
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
