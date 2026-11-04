import { TestUser } from "../../../common/enums/test.user";
import { NotificationEvent } from "../../../core/generated/alkemio-schema";
import type { SubscribeToPushNotificationsInput } from "../../../core/generated/alkemio-schema";
import { GraphqlActor } from "../../../utils/graphql.actor";
import { runAs } from "../../../utils/graphql.wrapper";
import { postGraphqlRawAs } from "../../../utils/graphql.raw.client";

/**
 * Reads on `me` — what the acting identity sees about itself. Every function
 * takes the actor explicitly because "me" is the whole point: a persona, a
 * disposable user's bearer, or a browser session cookie.
 */

/** The smallest authenticated read: is this session/bearer still accepted? */
export const readMySession = (actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.ReadMySession({}, headers));

/** `readMySession` with the raw HTTP status and body, for specs that assert on the transport outcome. */
export const readMySessionRaw = (actor: GraphqlActor) =>
  postGraphqlRawAs<{ me: { id: string } }>(actor, "{ me { id } }");

/** The actor's own user: id, nameID, profile displayName + url, account id. */
export const readMyUser = (actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.ReadMyUser({}, headers));

/**
 * `me { id user { id } }` with the raw HTTP status and body — for a spec that
 * asserts on the transport outcome AND on whether a user is still attached to
 * the session (a revoked session answers 401, or 200 as an anonymous actor
 * with no user).
 */
export const readMyUserRaw = (actor: GraphqlActor) =>
  postGraphqlRawAs<{ me: { id: string; user: { id: string } | null } }>(
    actor,
    "{ me { id user { id } } }",
  );

/** The actor's own privileges on its user, with the display name. */
export const readMyPrivileges = (actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.ReadMyPrivileges({}, headers));

/** The platform roles the actor holds (`platform.roleSet.myRoles`). */
export const readMyPlatformRoles = (actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.ReadMyPlatformRoles({}, headers));

/** The actor's stored UI language. */
export const readMyLanguageSetting = (actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.ReadMyLanguageSetting({}, headers));

/** The actor's full settings block (notification matrix, privacy, language …). */
export const readMyUserSettings = (actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.ReadMyUserSettings({}, headers));

/**
 * The actor's in-app notifications, optionally filtered by event type and
 * limited to the first N. The payload carries the space-invitation,
 * callout and organization-associate shapes the specs assert on.
 */
export const readMyNotifications = (
  actor: GraphqlActor,
  options?: { types?: NotificationEvent[]; first?: number },
) =>
  runAs(actor, (sdk, headers) =>
    sdk.ReadMyNotifications(
      {
        filter: options?.types ? { types: options.types } : undefined,
        first: options?.first,
      },
      headers,
    ),
  );

export const readMyNotificationsUnreadCount = (actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.ReadMyNotificationsUnreadCount({}, headers));

/** The actor's conversations with their rooms. */
export const readMyConversations = (actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.GetMeConversations({}, headers));

/** Pending space and organization invitations/applications of the actor, with their counts. */
export const readMyPendingMemberships = (actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.MeOrganizationPending({}, headers));

/** Whether the actor may delete its own account right now. */
export const readMyAccountDeletionCanDelete = (actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.ReadMyAccountDeletionCanDelete({}, headers));

export const readMyMcpApiKeys = (actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.ReadMyMcpApiKeys({}, headers));

export const revokeMyMcpApiKey = (keyID: string, actor: GraphqlActor) =>
  runAs(actor, (sdk, headers) => sdk.RevokeMyMcpApiKey({ keyID }, headers));

/** Register a (fake) web-push subscription for the actor. */
export const subscribeToPushNotifications = (
  subscriptionData: SubscribeToPushNotificationsInput,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN,
) =>
  runAs(actor, (sdk, headers) =>
    sdk.SubscribeToPushNotifications({ subscriptionData }, headers),
  );
