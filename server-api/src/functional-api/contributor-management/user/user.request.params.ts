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
 */
export const reregisterUser = async (
  email: string,
  firstName: string,
  lastName: string
) => {
  await registerVerifiedUser(email, firstName, lastName);
  await TestUserManager.refreshUserModel(email);
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

/**
 * User creation resilient to the ENV_FAILURE retry-after-commit race, mirroring
 * `createSpaceBasicDataOrFail` (test-suites#563).
 *
 * `graphqlErrorWrapper` retries a create after a ~5 s connection cut, but the
 * first attempt may already have committed (reserving the nameID), so the retry
 * comes back as `The provided nameID is already taken`. The user DOES exist:
 * recover its id by nameID instead of failing a test whose create succeeded.
 *
 * A preflight lookup establishes provenance: a nameID that already exists
 * BEFORE we create is a genuine duplicate and is rejected up front, so the
 * recovery only ever returns a user this call committed.
 */
const isOnlyNotFound = (errors: unknown): boolean =>
  Array.isArray(errors) &&
  errors.length > 0 &&
  errors.every(
    e =>
      (e as { extensions?: { code?: string } })?.extensions?.code ===
      'ENTITY_NOT_FOUND'
  );
const USER_RECOVERY_LOOKUP_ATTEMPTS = 5;
const USER_RECOVERY_LOOKUP_DELAY_MS = 2000;
export const createUserOrFail = async (
  options: {
    firstName?: string;
    lastName?: string;
    nameID: string;
    email?: string;
    phone?: string;
    profileData?: {
      displayName: string;
      description?: string;
    };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<string> => {
  // Fail closed: `lookupByName.user` resolves through
  // `getUserByNameIdOrFail`, so ENTITY_NOT_FOUND is the normal "free" answer;
  // any OTHER lookup error means we cannot prove the nameID is free and the
  // recovery below could hand back a pre-existing user.
  const preflight = await getUserByNameId(options.nameID, userRole);
  if (preflight.error && !isOnlyNotFound(preflight.error.errors)) {
    throw new Error(
      `Cannot verify whether user '${options.nameID}' already exists: ${JSON.stringify(
        preflight.error.errors
      )}`
    );
  }
  if (preflight.data?.lookupByName?.user) {
    throw new Error(
      `Refusing to create user '${options.nameID}': nameID already exists before creation — genuine duplicate, not a retry-after-commit`
    );
  }

  const response = await createUser(options, userRole);
  const id = response.data?.createUser?.id;
  if (id) {
    return id;
  }

  const alreadyTaken = response.error?.errors?.some(e =>
    String((e as { message?: unknown }).message ?? '').includes('already taken')
  );
  const createDetail = response.error
    ? JSON.stringify(response.error.errors)
    : 'server returned no createUser.id and no error';

  if (alreadyTaken) {
    let lastLookupDetail = '';
    for (let attempt = 1; attempt <= USER_RECOVERY_LOOKUP_ATTEMPTS; attempt++) {
      const existing = await getUserByNameId(options.nameID, userRole);
      const recoveredId = existing.data?.lookupByName?.user;
      if (recoveredId) {
        return recoveredId;
      }
      lastLookupDetail = existing.error
        ? `lookup failed: ${JSON.stringify(existing.error.errors)}`
        : 'lookup returned no user';
      if (attempt < USER_RECOVERY_LOOKUP_ATTEMPTS) {
        await new Promise(resolve =>
          setTimeout(resolve, USER_RECOVERY_LOOKUP_DELAY_MS)
        );
      }
    }
    throw new Error(
      `createUser '${options.nameID}' reported 'already taken' (retry-after-commit) but the user could not be recovered by nameID after ${USER_RECOVERY_LOOKUP_ATTEMPTS} attempts (${lastLookupDetail}); create error: ${createDetail}`
    );
  }

  throw new Error(`createUser '${options.nameID}' failed: ${createDetail}`);
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
