import { registerInKratosOrFail } from "../../../registration/register-in-kratos-or-fail";
import { registerInAlkemioOrFail } from "../../../registration/register-in-alkemio-or-fail";
import { verifyInKratosOrFail } from "../../../registration/verify-in-kratos-or-fail";
import { UniqueIDGenerator } from "../../../../utils/uniqueId";
import { TestUser } from "../../../../common/enums/test.user";
import { getGraphqlClient } from "../../../../utils/graphqlClient";
import { graphqlErrorWrapper, runAs } from "../../../../utils/graphql.wrapper";
import { GraphqlActor } from "../../../../utils/graphql.actor";
import { UpdateUserSettingsEntityInput } from "../../../../core/generated/alkemio-schema";

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

export const getDefaultUserData = () => {
  const uniqueId = UniqueIDGenerator.getID();
  return {
    firstName: `fn${uniqueId}`,
    lastName: `ln${uniqueId}`,
    nameID: `user-nameid-${uniqueId}`,
    email: `user-email-${uniqueId}@alkem.io`,
    profileData: {
      displayName: `FNLN${uniqueId}`,
      description: "User description",
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
  userRole: GraphqlActor = TestUser.GLOBAL_ADMIN
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
  userRole: GraphqlActor = TestUser.GLOBAL_ADMIN
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
  userRole: GraphqlActor = TestUser.GLOBAL_ADMIN,
  /** Also remove the Kratos identity — required for a disposable persona a
   * spec registered through the sign-up flow, or its email stays taken. */
  deleteIdentity = false
) =>
  runAs(userRole, (sdk, headers) =>
    sdk.deleteUser({ deleteData: { ID: userId, deleteIdentity } }, headers)
  );

export const getUsersData = async (
  userRole: GraphqlActor = TestUser.GLOBAL_ADMIN
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
  userRole: GraphqlActor = TestUser.GLOBAL_ADMIN
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
  userRole: GraphqlActor = TestUser.GLOBAL_ADMIN
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
  userRole: GraphqlActor = TestUser.GLOBAL_ADMIN
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

export const updateUserSettings = async (
  userID: string,
  settings: UpdateUserSettingsEntityInput,
  userRole: GraphqlActor = TestUser.GLOBAL_ADMIN
) =>
  runAs(userRole, (sdk, headers) =>
    sdk.UpdateUserSettings({ settingsData: { userID, settings } }, headers)
  );

// export const updateUserSettings = async (
//   userID: string,
//   settings: UpdateUserSettingsEntityInput,
//   userRole: GraphqlActor = TestUser.GLOBAL_ADMIN
// ) => {
//   const graphqlClient = getGraphqlClient();
//   const callback = (authToken: string | undefined) =>
//     graphqlClient.updateUserSettings(
//       {
//         userID,
//         settingsData: settings,
//       },
//       {
//         authorization: `Bearer ${authToken}`,
//       }
//     );

//   return graphqlErrorWrapper(callback, userRole);
// };

export const updateUserSettingCommunicationMessage = async (
  userID: string,
  value: boolean,
  userRole: GraphqlActor = TestUser.GLOBAL_ADMIN
) => {
  return updateUserSettings(
    userID,
    {
      communication: {
        allowOtherUsersToSendMessages: value,
      },
    },
    userRole
  );
};
