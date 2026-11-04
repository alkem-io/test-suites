import { TestUser } from "../../../common/enums/test.user";
import type {
  UpdateUserInput,
  UserFilterInput,
} from "../../../core/generated/alkemio-schema";
import { GraphqlActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";
import { postGraphqlRawAs } from "../../../utils/graphql.raw.client";

/** A user's nameID and account id. */
export const readUserAccount = (
  userId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadUserAccount({ userId }, headers));

/** The id behind a user nameID, or null when none exists. */
export const readUserIdByNameId = (
  nameID: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadUserIdByNameId({ nameID }, headers));

/** A user's profile tagsets (id + name), for a profile update that targets one. */
export const readUserProfileTagsets = (
  userId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadUserProfileTagsets({ userId }, headers));

/** Update any part of a user (profile data, names, phone …); returns the id only. */
export const updateUserProfile = (
  userData: UpdateUserInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.UpdateUserProfile({ userData }, headers));

/** The spaces (with subspaces) a user holds roles in, plus its pending invitations/applications. */
export const readUserSpaceRoles = (
  actorID: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.ReadUserSpaceRoles({ actorID }, headers));

/** Paginated user search by filter (email, displayName …). */
export const findUsersPaginated = (
  filter: UserFilterInput,
  first = 1,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.UsersPaginated({ filter, first }, headers));

/** A user's full settings block, including the notification matrix. */
export const readUserSettings = (
  userId: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) => runAs(actor, (sdk, headers) => sdk.GetUserSettings({ userId }, headers));

/** The one `deleteUser` document of the lib, shared by every caller. */
export const deleteUserDocument = `
  mutation deleteUser($deleteData: DeleteUserInput!) {
    deleteUser(deleteData: $deleteData) {
      id
    }
  }
`;

/**
 * `deleteUser` with the raw HTTP status/body — for a spec that measures the
 * transport outcome of the deletion (e.g. that an out-of-band admin delete
 * does not disturb the subject's cookie session).
 */
export const deleteUserRaw = (
  userId: string,
  deleteIdentity: boolean,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  postGraphqlRawAs<{ deleteUser: { id: string } }>(actor, deleteUserDocument, {
    deleteData: { ID: userId, deleteIdentity },
  });
