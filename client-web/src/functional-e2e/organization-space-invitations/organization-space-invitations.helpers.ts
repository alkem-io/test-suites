import {
  createOrganization,
  deleteOrganization,
  getGraphqlClient,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

/**
 * Local GraphQL helpers for the organization-space-invitations acceptance
 * walks, User Story 1. `@alkemio/tests-lib`'s `baseFunctions.ts` has `createOrganization` but
 * not the organization-settings / roleset / invitation mutations this walk
 * needs (those live as local `.request.params.ts` files inside the
 * `server-api` package, which `client-web` cannot import across the
 * workspace-package boundary) — so the same generated SDK client
 * (`getGraphqlClient()`) is used directly here, mirroring the server-api
 * request-params pattern one-for-one.
 */

/** One org fixture, with just what the walk needs to drive the UI and assert outcomes. */
export type OrgFixture = {
  id: string;
  nameID: string;
  displayName: string;
  roleSetId: string;
};

// The run suffix is what makes a nameID unique across runs, so it must SURVIVE
// truncation: the label is trimmed to fit, then the suffix is appended. Slugifying
// `label + suffix` and truncating the result instead cut the suffix off any label
// at or over the limit — two runs then collided on the same nameID and the whole
// file failed at fixture setup.
const NAME_ID_MAX = 24;
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const slugifyWithSuffix = (label: string, runSuffix: string) => {
  const suffix = slug(runSuffix);
  return `${slug(label).slice(0, Math.max(0, NAME_ID_MAX - suffix.length))}${suffix}`;
};

// Every organization this file creates, so a run can hand them all back.
// `TestScenarioFactory.cleanUpBaseScenario` only removes the base scenario's
// own org and Space — the ad-hoc fixtures below are invisible to it, so
// without this registry each full run left ~26 organizations behind and the
// platform's per-account organization limit eventually starts failing fixture
// setup for everyone on that environment.
const createdOrganizationIds: string[] = [];

/** Creates a fresh organization for this walk, returning its id/roleSetId. */
export const createTestOrganization = async (
  label: string,
  runSuffix: string
): Promise<OrgFixture> => {
  const displayName = `${label} ${runSuffix}`;
  const nameID = slugifyWithSuffix(label, runSuffix);
  const res = await createOrganization(displayName, nameID);
  if (!res.data?.createOrganization) {
    throw new Error(
      `Failed to create organization "${label}": ${JSON.stringify(res.error)}`
    );
  }
  createdOrganizationIds.push(res.data.createOrganization.id);
  return {
    id: res.data.createOrganization.id,
    nameID: res.data.createOrganization.nameID,
    displayName,
    roleSetId: res.data.createOrganization.roleSet.id,
  };
};

/**
 * Deletes every organization `createTestOrganization` made in this process and
 * empties the registry. Best-effort per organization: one failure (already
 * deleted, still referenced) must not stop the rest, and teardown must never
 * fail a green run.
 */
export const cleanUpTestOrganizations = async (): Promise<void> => {
  const ids = createdOrganizationIds.splice(0, createdOrganizationIds.length);
  for (const id of ids) {
    await deleteOrganization(id).catch(() => undefined);
  }
};

/**
 * Deletes the platform users a spec registered with `registerTestUser`, by
 * email. Symmetric with `cleanUpTestOrganizations` above, and it exists for the
 * same reason: `cleanUpBaseScenario` only knows about the personas IT created,
 * so a spec that registers its own leaves them behind on the acceptance
 * environment on EVERY run — and with `retries: 2` each retry registers a fresh
 * `runSuffix`, so a flaky run leaks three sets rather than one. Accounts
 * accumulate with profiles, settings and organization credentials.
 *
 * Best-effort per user, like the organization teardown: one failure (already
 * gone, still referenced) must not stop the rest, and teardown must never fail
 * an otherwise green run.
 */
export const cleanUpRegisteredUsers = async (
  userNames: string[]
): Promise<void> => {
  if (userNames.length === 0) return;
  const graphqlClient = getGraphqlClient();
  const wanted = new Set(
    userNames.map(name => `${name}@alkem.io`.toLowerCase())
  );
  try {
    // Resolved by EMAIL, which is what `registerTestUser` deterministically
    // derives from the user name. `GetUserByNameId` is not usable here: the
    // nameID is generated from the first/last name split, not from the name we
    // passed, so it cannot be reconstructed reliably.
    const all = await graphqlErrorWrapper(
      (authToken: string | undefined) =>
        graphqlClient.getUsersData(
          {},
          { authorization: `Bearer ${authToken}` }
        ),
      TestUser.GLOBAL_ADMIN
    );
    const targets = (all.data?.users ?? []).filter(user =>
      wanted.has(String(user.email).toLowerCase())
    );
    for (const target of targets) {
      await graphqlErrorWrapper(
        (authToken: string | undefined) =>
          graphqlClient.deleteUser(
            { deleteData: { ID: target.id } },
            { authorization: `Bearer ${authToken}` }
          ),
        TestUser.GLOBAL_ADMIN
      ).catch(() => undefined);
    }
  } catch {
    // Best-effort — see the docblock.
  }
};

/** Grants `role` to `org` directly on `roleSetId` (bypasses invite/accept — used to seed
 * pre-existing Member/Lead state, exactly as the direct "add organisation" action would). */
export const assignOrgRole = async (
  organizationID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignRoleToOrganization(
      { roleData: { actorID: organizationID, roleSetID, role } },
      { authorization: `Bearer ${authToken}` }
    );
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error) {
    throw new Error(
      `assignOrgRole(${role}) failed for ${organizationID}: ${JSON.stringify(res.error)}`
    );
  }
  return res;
};

/** Toggles the "Allow Spaces to invite this organisation" setting (US5's own switch, used
 * here only as an AS4 fixture — off before the space admin ever invites it). */
export const setAllowSpaceInvitations = async (
  organizationID: string,
  allowSpaceInvitations: boolean,
  allowUsersMatchingDomainToJoin = false,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateOrganizationSettings(
      {
        settingsData: {
          organizationID,
          settings: {
            membership: { allowSpaceInvitations, allowUsersMatchingDomainToJoin },
          },
        },
      },
      { authorization: `Bearer ${authToken}` }
    );
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error) {
    throw new Error(
      `setAllowSpaceInvitations failed for ${organizationID}: ${JSON.stringify(res.error)}`
    );
  }
  return res;
};

/** Pre-seeds a pending invitation via the API — used only to put an organization into the
 * "already invited" state ahead of the UI's own AS5 attempt (the UI walk itself drives every
 * invite it is actually asserting on). */
export const inviteOrganizationViaApi = async (
  roleSetId: string,
  organizationId: string,
  welcomeMessage: string,
  userRole: TestUser = TestUser.SPACE_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.InviteForEntryRoleOnRoleSet(
      {
        roleSetId,
        invitedActorIds: [organizationId],
        invitedUserEmails: [],
        welcomeMessage,
        extraRoles: [],
      },
      { authorization: `Bearer ${authToken}` }
    );
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error) {
    throw new Error(
      `inviteOrganizationViaApi failed for ${organizationId}: ${JSON.stringify(res.error)}`
    );
  }
  return res;
};

/** Grants `actorID` ADMIN on an organization's OWN roleset (org-admin standing, not
 * Space membership) — used for the AS6 org-admin-side "gone from their pending invitations"
 * check via `me.communityInvitations`. */
export const assignOrganizationAdmin = async (
  organizationRoleSetId: string,
  actorID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignRoleToUser(
      { roleData: { actorID, roleSetID: organizationRoleSetId, role: RoleName.Admin } },
      { authorization: `Bearer ${authToken}` }
    );
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error) {
    throw new Error(
      `assignOrganizationAdmin failed for ${actorID} on ${organizationRoleSetId}: ${JSON.stringify(res.error)}`
    );
  }
  return res;
};

/** The ids of every pending invitation visible to `userRole` via `me.communityInvitations` —
 * the org-admin-side view of a Space's organization invitations (AS6). */
export const getMyCommunityInvitationIds = async (
  userRole: TestUser
): Promise<string[]> => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.MeQuery({}, { authorization: `Bearer ${authToken}` });
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error || !res.data) {
    throw new Error(`getMyCommunityInvitationIds failed: ${JSON.stringify(res.error)}`);
  }
  return res.data.me.communityInvitations.map(inv => inv.invitation.id);
};

/** The ids of every pending organization invitation still open on the Space (AS3/AS6 cleanup
 * and assertions on the Space side, via the same query the server exposes for it). */
export const getSpaceInvitationIds = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<string[]> => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.getSpaceInvitations({ spaceId }, { authorization: `Bearer ${authToken}` });
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error || !res.data?.lookup.space) {
    throw new Error(`getSpaceInvitationIds failed: ${JSON.stringify(res.error)}`);
  }
  return res.data.lookup.space.community.roleSet.invitations.map(inv => inv.id);
};

/** Generates unique fake VAPID subscription fields for `subscribeToPushForUser` —
 * mirrors server-api's `generateFakePushSubscription` one-for-one (not importable
 * here, same package-boundary reason as the rest of this file). */
let pushEndpointCounter = 0;
const generateFakePushSubscription = (prefix: string) => {
  pushEndpointCounter++;
  const uniqueId = `${prefix}-${Date.now()}-${pushEndpointCounter}`;
  return {
    endpoint: `https://fcm.googleapis.com/fcm/send/${uniqueId}`,
    p256dh: `BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfXPQ-${uniqueId}`,
    auth: `tBHItJI5svbpC7htN-${uniqueId.slice(0, 8)}`,
  };
};

/** Subscribes `userRole` to push with a fake (non-delivering) endpoint. REQUIRED
 * precondition for any push-emit assertion — the server's push adapter no-ops
 * (never publishes to the queue) for a recipient with zero active subscriptions.
 * Returns the subscription id; tear down with `unsubscribeFromPushForUser`. */
export const subscribeToPushForUser = async (
  userRole: TestUser,
  label: string
): Promise<string> => {
  const graphqlClient = getGraphqlClient();
  const sub = generateFakePushSubscription(label);
  const callback = (authToken: string | undefined) =>
    graphqlClient.SubscribeToPushNotifications(
      { subscriptionData: { ...sub, userAgent: `${label}-test` } },
      { authorization: `Bearer ${authToken}` }
    );
  const res = await graphqlErrorWrapper(callback, userRole);
  const subscriptionId = res.data?.subscribeToPushNotifications?.id;
  if (res.error || !subscriptionId) {
    throw new Error(
      `subscribeToPushForUser failed for "${label}" (${userRole}): ${JSON.stringify(res.error)}`
    );
  }
  return subscriptionId;
};

/** Tears down a subscription created by `subscribeToPushForUser`. A subscription
 * left behind keeps attracting publishes and inflates later tests' queue deltas. */
export const unsubscribeFromPushForUser = async (
  userRole: TestUser,
  subscriptionId: string
): Promise<void> => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UnsubscribeFromPushNotifications(
      { subscriptionData: { subscriptionID: subscriptionId } },
      { authorization: `Bearer ${authToken}` }
    );
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error) {
    throw new Error(
      `unsubscribeFromPushForUser failed for ${userRole}/${subscriptionId}: ${JSON.stringify(res.error)}`
    );
  }
};

export const runSuffix = UniqueIDGenerator.getID();
export { TestUserManager, TestUser };
