import { TestUser } from '@test/utils';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';

export const getLicensePlans = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetPlatgformLicensePlans(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getVCLicensePlan = async (licenseCredential: string) => {
  const response = await getLicensePlans();
  const allLicensePlans = response.data?.platform.licensing.plans ?? [];
  const filteredLicensePlan = allLicensePlans.filter(
    plan =>
      plan.licenseCredential.includes(licenseCredential) ||
      plan.id === licenseCredential
  );
  const licensePlan = filteredLicensePlan;

  return licensePlan;
};

export const assignLicensePlanToAccount = async (
  accountID: string,
  licensePlanID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignLicensePlanToAccount(
      {
        planData: {
          accountID,
          licensePlanID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
