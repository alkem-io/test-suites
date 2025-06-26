import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const getLicensePlans = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetPlatformLicensePlans(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getSpaceLicenseSubscriptions = async (
  ID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetSpaceLicenseSubscriptions(
      { ID },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getLicensePlanByName = async (licenseCredential: string) => {
  const response = await getLicensePlans();
  const allLicensePlans =
    response.data?.platform.licensingFramework.plans ?? [];
  const filteredLicensePlan = allLicensePlans.filter(
    (plan: { licenseCredential: string; id: string }) =>
      plan.licenseCredential.includes(licenseCredential) ||
      plan.id === licenseCredential
  );
  const licensePlan = filteredLicensePlan;

  return licensePlan;
};

export const assignLicensePlanToSpace = async (
  spaceID: string,
  licensePlanID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignLicensePlanToSpace(
      {
        planData: {
          spaceID,
          licensePlanID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const revokeLicensePlanFromSpace = async (
  spaceID: string,
  licensePlanID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const res = await getLicensePlans();
  const licensingID = res.data?.platform.licensingFramework.id ?? '';
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RevokeLicensePlanFromSpace(
      { planData: { spaceID, licensePlanID, licensingID } },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignLicensePlanToAccount = async (
  accountId: string,
  licensePlanId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const res = await getLicensePlans();
  const licensingId = res.data?.platform.licensingFramework.id ?? '';
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignLicensePlanToAccount(
      {
        accountId,
        licensePlanId,
        licensingId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const revokeLicensePlanFromAccount = async (
  accountId: string,
  licensePlanId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const res = await getLicensePlans();
  const licensingId = res.data?.platform.licensingFramework.id ?? '';
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RevokeLicensePlanFromAccount(
      {
        accountId,
        licensePlanId,
        licensingId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
