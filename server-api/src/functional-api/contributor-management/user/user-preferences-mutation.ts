import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { PreferenceType } from '@alkemio/tests-lib/dist/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/dist/utils/graphql.wrapper';

export const changePreferenceUser = async (
  userID: string,
  type: PreferenceType = PreferenceType.NotificationUserSignUp,
  value: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdatePreferenceOnUser(
      {
        preferenceData: {
          userID,
          type,
          value,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
