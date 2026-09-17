import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { SpaceVisibility } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const updateSpacePlatformSettings = async (
  spaceID: string,
  visibility: SpaceVisibility,
  nameID: string,
  userRole: TestUser = TestUser.BOOTSTRAP_PLATFORM_ROLES_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateSpacePlatformSettings(
      {
        spaceId: spaceID,
        nameId: nameID,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
