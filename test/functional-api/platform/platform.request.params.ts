import { TestUser } from '@test/utils';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { SpaceVisibility } from '../../generated/alkemio-schema';

export const updateSpacePlatformSettingsCodegen = async (
  spaceID: string,
  visibility?: SpaceVisibility,
  nameID?: string,
  hostID?: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSpacePlatformSettings(
      {
        spaceID,
        license: {
          visibility,
          featureFlags: [
            {
              name: 'CALLOUT_TO_CALLOUT_TEMPLATE',
              enabled: false,
            },
            {
              name: 'WHITEBOART_RT',
              enabled: true,
            },
          ],
        },
        nameID,
        hostID,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
