import { SpaceVisibility } from '@test/generated/alkemio-schema';
import { TestUser } from '@test/utils';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';

export const updateAccountPlatformSettingsCodegen = async (
  accountID: string,
  hostID?: string,
  visibility?: SpaceVisibility,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateAccountPlatformSettings(
      {
        accountID,
        hostID: hostID ? hostID : undefined,
        license: {
          visibility,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
