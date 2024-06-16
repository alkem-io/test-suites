import {
  OrganizationPreferenceType,
  UserPreferenceType,
} from '@test/generated/alkemio-schema';
import { graphqlErrorWrapper } from '../graphql.wrapper';
import { getGraphqlClient } from '../graphqlClient';
import { TestUser } from '../token.helper';

export const changePreferenceOrganizationCodegen = async (
  organizationID: string,
  type: OrganizationPreferenceType = OrganizationPreferenceType.AuthorizationOrganizationMatchDomain,
  value: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.updatePreferenceOnOrganization(
      {
        preferenceData: {
          organizationID,
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

export const changePreferenceUserCodegen = async (
  userID: string,
  type: UserPreferenceType = UserPreferenceType.NotificationUserSignUp,
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
