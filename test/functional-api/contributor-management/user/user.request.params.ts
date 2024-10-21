import { registerInKratosOrFail } from '@test/utils/kratos/register-in-kratos-or-fail';
import { verifyInKratosOrFail } from '@test/utils/kratos/verify-in-kratos-or-fail';
import { registerInAlkemioOrFail } from '@test/utils/register-in-alkemio-or-fail';
import { TestUser } from '../../../utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const registerVerifiedUser = async (
  email: string,
  firstName: string,
  lastName: string
) => {
  await registerInKratosOrFail(firstName, lastName, email);
  await verifyInKratosOrFail(email);
  const userId = await registerInAlkemioOrFail(firstName, lastName, email);
  return userId;
};

export const getDefaultUserData = () => {
  const uniqueId = Math.random()
    .toString(12)
    .slice(-6);
  return {
    firstName: `fn${uniqueId}`,
    lastName: `ln${uniqueId}`,
    nameID: `user-nameid-${uniqueId}`,
    email: `user-email-${uniqueId}@alkem.io`,
    profileData: {
      displayName: `FNLN${uniqueId}`,
      description: 'User description',
    },
  };
};

export const createUser = async (
  options?: {
    firstName?: string;
    lastName?: string;
    nameID?: string;
    email?: string;
    phone?: string;
    profileData?: {
      displayName: string;
      description?: string;
    };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateUser(
      {
        userData: {
          ...getDefaultUserData(),
          ...options,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const updateUser = async (
  updateUserId: string,
  phoneUser: string,
  profileData?: {
    location?: { country?: string; city?: string };
    description?: string;
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.updateUser(
      {
        userData: {
          ID: updateUserId,
          phone: phoneUser,
          profileData,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deleteUser = async (
  userId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.deleteUser(
      {
        deleteData: {
          ID: userId,
          deleteIdentity: false,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getUsersData = async (
  userId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.getUsersData(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getUserData = async (
  userId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.getUserData(
      {
        userId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getUserPendingMemberships = async (
  fetchDetails: boolean,
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.PendingMembershipsSpace(
      { fetchDetails, spaceId },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
