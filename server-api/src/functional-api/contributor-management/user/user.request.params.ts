import {
  getGraphqlClient,
  registerInAlkemioOrFail,
  registerInKratosOrFail,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  verifyInKratosOrFail,
} from '@alkemio/tests-lib';
import { UpdateUserSettingsEntityInput } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

const uniqueId = UniqueIDGenerator.getID();

export const registerVerifiedUser = async (
  email: string,
  firstName: string,
  lastName: string
) => {
  const { verificationFlowId } = await registerInKratosOrFail(firstName, lastName, email);
  await verifyInKratosOrFail(email, verificationFlowId);
  const userId = await registerInAlkemioOrFail(firstName, lastName, email);
  return userId;
};

/**
 * Re-registers an already-deleted test user (Kratos + verify + Alkemio),
 * then refreshes the cached TestUserManager model so subsequent tests work.
 *
 * `email` is resolved through `TestUserManager.resolvePoolEmailForCurrentWorker`
 * first: the two existing call sites pass a literal base pool-role email
 * (e.g. `beta.tester@alkem.io`) rather than looking it up dynamically. Under
 * per-worker identity pools that literal is worker-0's address, not
 * necessarily the current worker's own — re-registering it unresolved would
 * recreate the WRONG worker's identity (one it doesn't own and may be
 * concurrently in use by worker 0), reintroducing the exact cross-worker
 * interference this pooling change exists to eliminate. Any email that
 * isn't a known pool role (a test-generated one-off address) passes through
 * unchanged, as does any address outside the pool domain (`@alkem.io`) —
 * `resolvePoolEmailForCurrentWorker` matches the whole address, not just the
 * local part, so a one-off like `beta.tester@example.com` is never rewritten
 * into a real pool identity.
 */
export const reregisterUser = async (
  email: string,
  firstName: string,
  lastName: string
) => {
  const resolvedEmail = TestUserManager.resolvePoolEmailForCurrentWorker(email);
  await registerVerifiedUser(resolvedEmail, firstName, lastName);
  await TestUserManager.refreshUserModel(resolvedEmail);
};

/**
 * Deletes a test user and fully re-registers them (Kratos + verify + Alkemio),
 * then refreshes the cached TestUserManager model so subsequent tests work.
 */
export const deleteAndReregisterUser = async (
  userId: string,
  email: string,
  firstName: string,
  lastName: string
) => {
  await deleteUser(userId);
  await reregisterUser(email, firstName, lastName);
};

export const getDefaultUserData = () => {
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
  // `options.email`, when passed, is resolved through
  // `resolvePoolEmailForCurrentWorker` first — the one existing call site
  // that recreates a deleted shared-pool user (vc.it-spec.ts, restoring the
  // beta tester after "should not delete user who hosts an account") passes
  // a literal base pool-role email. Unresolved, that would recreate
  // worker-0's identity from a worker that doesn't own it, reintroducing
  // cross-worker interference. Any other email (the common case — a
  // test-generated one-off address) passes through unchanged, as does any
  // address outside the pool domain (`@alkem.io`): the resolver matches the
  // whole address, not just the local part.
  const resolvedOptions = options?.email
    ? {
        ...options,
        email: TestUserManager.resolvePoolEmailForCurrentWorker(options.email),
      }
    : options;
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateUser(
      {
        userData: {
          ...getDefaultUserData(),
          ...resolvedOptions,
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
          deleteIdentity: true,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getUsersData = async (
  userID: string,
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

export const getUserByNameId = async (
  nameId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetUserByNameId(
      {
        nameId,
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

// export const changePreferenceUser = async (
//   userID: string,
//   type: PreferenceType = PreferenceType.NotificationUserSignUp,
//   value: string,
//   userRole: TestUser = TestUser.GLOBAL_ADMIN
// ) => {
//   const graphqlClient = getGraphqlClient();
//   const callback = (authToken: string | undefined) =>
//     graphqlClient.UpdatePreferenceOnUser(
//       {
//         preferenceData: {
//           userID,
//           type,
//           value,
//         },
//       },
//       {
//         authorization: `Bearer ${authToken}`,
//       }
//     );

//   return graphqlErrorWrapper(callback, userRole);
// };

export const updateUserSettings = async (
  userID: string,
  settings: UpdateUserSettingsEntityInput,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateUserSettings(
      {
        settingsData: {
          userID,
          settings,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

// export const updateUserSettingCommunicationMessage = async (
//   userID: string,
//   value: boolean,
//   userRole: TestUser = TestUser.GLOBAL_ADMIN
// ) => {
//   return updateUserSettings(
//     userID,
//     {
//       communication: {
//         allowOtherUsersToSendMessages: value,
//       },
//     },
//     userRole
//   );
// };
