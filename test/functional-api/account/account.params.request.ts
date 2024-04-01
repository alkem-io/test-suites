import { SpaceVisibility } from '@test/generated/alkemio-schema';
import { TestUser } from '@test/utils';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';

export const updateAccountPlatformSettingsCodegen = async (
  accountID: string,
  hostID?: string,
  nameID?: string,
  visibility?: SpaceVisibility,
  calloutToCalloutTemplate?: boolean,
  whiteboard_rt?: boolean,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateAccountPlatformSettings(
      {
        accountID,
        hostID,
        license: {
          visibility,
          featureFlags: [
            {
              name: 'CALLOUT_TO_CALLOUT_TEMPLATE',
              enabled: calloutToCalloutTemplate || false,
            },
            {
              name: 'WHITEBOART_RT',
              enabled: whiteboard_rt || false,
            },
          ],
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
