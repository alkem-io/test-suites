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
 * recover it by nameID instead of failing a test whose create succeeded.
 *
 * A preflight lookup establishes provenance: a nameID that already exists
 * BEFORE we create is a genuine duplicate and is rejected up front, so the
 * recovery only ever returns a user this call committed. `lookupByName.user`
 * resolves through `getUserByNameIdOrFail`, so ENTITY_NOT_FOUND is the normal
 * "free" answer; any OTHER preflight error fails closed.
 *
 * The recovery then POLLS `getUserData` until the user reads fully built —
 * the cut first request is still running server-side when the retry reports
 * the nameID taken, and a user whose authorization policy has not been
 * applied yet fails `deleteUser` with AUTHORIZATION_INVALID_POLICY.
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
const USER_READY_ATTEMPTS = 10;
const USER_READY_DELAY_MS = 1000;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type CreatedUserData = NonNullable<
  NonNullable<Awaited<ReturnType<typeof createUser>>['data']>['createUser']
>;

export const createUserDataOrFail = async (
  options: {
    firstName?: string;
    lastName?: string;
    nameID?: string;
    email?: string;
    phone?: string;
    profileData?: {
      displayName: string;
      description?: string;
    };
  } = {},
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<CreatedUserData> => {
  // A caller-supplied nameID is the recovery key; otherwise mint one per call
  // (getDefaultUserData reuses one module-level id for every call).
  const callId = UniqueIDGenerator.getID();
  const nameID = options.nameID ?? `user-nameid-${callId}`;
  const email = options.email ?? `user-email-${callId}@alkem.io`;
  const createOptions = { ...options, nameID, email };

  const preflight = await getUserByNameId(nameID, userRole);
  if (preflight.error && !isOnlyNotFound(preflight.error.errors)) {
    throw new Error(
      `Cannot verify whether user '${nameID}' already exists: ${JSON.stringify(
        preflight.error.errors
      )}`
    );
  }
  if (preflight.data?.lookupByName?.user) {
    throw new Error(
      `Refusing to create user '${nameID}': nameID already exists before creation — genuine duplicate, not a retry-after-commit`
    );
  }

  const response = await createUser(createOptions, userRole);
  if (response.data?.createUser?.id) {
    const created = response.data.createUser;
    // The create payload already carries the authorization policy; only if it
    // came back empty do we wait for it, same as the recovery path below.
    if ((created.authorization?.credentialRules?.length ?? 0) > 0) {
      return created;
    }
    return waitForUserReady(created.id, nameID, createDetailOf(response), userRole);
  }

  const alreadyTaken = response.error?.errors?.some(e =>
    String((e as { message?: unknown }).message ?? '').includes('already taken')
  );
  const createDetail = createDetailOf(response);
  if (!alreadyTaken) {
    throw new Error(`createUser '${nameID}' failed: ${createDetail}`);
  }

  let recoveredId: string | undefined;
  let lastLookupDetail = '';
  for (let attempt = 1; attempt <= USER_RECOVERY_LOOKUP_ATTEMPTS; attempt++) {
    const existing = await getUserByNameId(nameID, userRole);
    recoveredId = existing.data?.lookupByName?.user;
    if (recoveredId) {
      break;
    }
    lastLookupDetail = existing.error
      ? `lookup failed: ${JSON.stringify(existing.error.errors)}`
      : 'lookup returned no user';
    if (attempt < USER_RECOVERY_LOOKUP_ATTEMPTS) {
      await sleep(USER_RECOVERY_LOOKUP_DELAY_MS);
    }
  }
  if (!recoveredId) {
    throw new Error(
      `createUser '${nameID}' reported 'already taken' (retry-after-commit) but the user could not be recovered by nameID after ${USER_RECOVERY_LOOKUP_ATTEMPTS} attempts (${lastLookupDetail}); create error: ${createDetail}`
    );
  }

  // Wait for the (still running) first create to finish building the user.
  return waitForUserReady(recoveredId, nameID, createDetail, userRole);
};

const createDetailOf = (
  response: Awaited<ReturnType<typeof createUser>>
): string =>
  response.error
    ? JSON.stringify(response.error.errors)
    : 'server returned no createUser.id and no error';

/** Polls until the user's authorization policy is applied — a user read
 * before that fails `deleteUser` with AUTHORIZATION_INVALID_POLICY. */
const waitForUserReady = async (
  userId: string,
  nameID: string,
  createDetail: string,
  userRole: TestUser
): Promise<CreatedUserData> => {
  let lastReadyDetail = '';
  for (let attempt = 1; attempt <= USER_READY_ATTEMPTS; attempt++) {
    const existing = await getUserData(userId, userRole);
    const user = existing.data?.user;
    if (user && (user.authorization?.credentialRules?.length ?? 0) > 0) {
      return user as CreatedUserData;
    }
    lastReadyDetail = existing.error
      ? `read failed: ${JSON.stringify(existing.error.errors)}`
      : 'authorization policy not applied yet';
    if (attempt < USER_READY_ATTEMPTS) {
      await sleep(USER_READY_DELAY_MS);
    }
  }
  throw new Error(
    `createUser '${nameID}' exists as ${userId} but never read fully built after ${USER_READY_ATTEMPTS} attempts (${lastReadyDetail}); create response: ${createDetail}`
  );
};

/** Id-only convenience over `createUserDataOrFail`. */
export const createUserOrFail = async (
  options: Parameters<typeof createUserDataOrFail>[0] & { nameID: string },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<string> => (await createUserDataOrFail(options, userRole)).id;

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
