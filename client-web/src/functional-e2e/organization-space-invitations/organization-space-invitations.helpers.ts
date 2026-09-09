import {
  createOrganization,
  deleteOrganization,
  getGraphqlClient,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
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

/**
 * Every (organization, roleSet, role) this file granted, newest first.
 *
 * `deleteOrganization` on the server is a NON-TRANSACTIONAL seven-step sequence
 * (profile → storageAggregator → groups → authorization → verification →
 * roleSet → actor). An organization that still holds Space standing fails at the
 * roleSet step — by which point its profile, authorization and verification are
 * already committed as deleted. The row survives, gutted: unusable through the
 * API (every read throws EntityNotInitialized / EntityNotFound) AND undeletable
 * through it, and it aborts the platform-wide authorization reset, which walks
 * every organization. One aborted fixture left 45 of these behind.
 *
 * So teardown strips the Space grants BEFORE deleting, and reports anything it
 * could not remove instead of swallowing it.
 */
const grantedOrgRoles: { organizationID: string; roleSetID: string; role: RoleName }[] = [];

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
  // Strip Space standing first — see `grantedOrgRoles`. Without this the delete
  // below half-succeeds and leaves an unusable, undeletable organization that
  // also breaks `authorizationPolicyResetAll`.
  const grants = grantedOrgRoles.splice(0, grantedOrgRoles.length);
  for (const g of grants) {
    await removeOrgRole(g.organizationID, g.roleSetID, g.role);
  }

  const ids = createdOrganizationIds.splice(0, createdOrganizationIds.length);
  const undeleted: string[] = [];
  for (const id of ids) {
    try {
      const res = await deleteOrganization(id);
      // deleteOrganization resolves GraphQL failures as `{ error }` rather than
      // rejecting, so a bare catch never sees the case that matters.
      if ((res as { error?: unknown })?.error) undeleted.push(id);
    } catch {
      undeleted.push(id);
    }
  }

  if (undeleted.length > 0) {
    // Loud, but NOT thrown: teardown must not replace a real test failure. A
    // half-deleted organization is an environment problem an operator has to
    // clear at the database level, so name the ids.
    console.error(
      `[cleanUpTestOrganizations] ${undeleted.length} organization(s) could not be deleted and may now be half-deleted — ` +
        `they will break authorizationPolicyResetAll until removed: ${undeleted.join(', ')}`
    );
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
  // Unshift: roles are stripped in reverse grant order at teardown, so LEAD
  // comes off before the MEMBER entry role it depends on.
  grantedOrgRoles.unshift({ organizationID, roleSetID, role });
  return res;
};

/**
 * Strips a role from an organization on a role set. The mirror of
 * `assignOrgRole`, needed because `TestScenarioFactory` grants the Space's own
 * HOSTING organization Member+Lead on creation — so a Space starts with one of
 * its two Lead-organization slots already occupied. A fixture that fills "both
 * Lead slots" without clearing the host first therefore overflows on the second
 * one with ROLESET_POLICY_ROLE_LIMITS_VIOLATED. `organization-invitations.it-spec.ts`
 * has always done this (`clearHostOrgFromSpace`); the acceptance walks did not.
 *
 * Best-effort by design: removing a role the organization does not hold throws
 * the min-limit guard, which is not a failure for a "make sure it is not there"
 * call.
 */
export const removeOrgRole = async (
  organizationID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RemoveRoleFromOrganization(
      { roleData: { actorID: organizationID, roleSetID, role } },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole).catch(() => undefined);
};

/**
 * Frees both Lead-organization slots on `roleSetID` by removing the hosting
 * organization's Lead and Member grants. Call before any fixture that seeds
 * Lead organizations.
 */
export const clearHostOrgFromSpace = async (
  hostOrganizationID: string,
  roleSetID: string
): Promise<void> => {
  await removeOrgRole(hostOrganizationID, roleSetID, RoleName.Lead);
  await removeOrgRole(hostOrganizationID, roleSetID, RoleName.Member);
};

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

  // Wait for the grant to become VISIBLE before returning. `ActorContext`
  // caches credentials, and a read issued immediately after a grant can still
  // see the pre-grant actor — alkem-io/server#6461, an open pre-existing
  // platform defect that ruling R25 explicitly leaves unpatched by this feature
  // and tells test flows to poll around ("test flows poll/wait instead").
  //
  // Without this the walks failed in two different disguises, neither of which
  // looks like a cache race:
  //   * US2 — the invite fired before the ADMIN was visible, the server saw an
  //     organization with NO admins, and the R3/FR-019 zero-admin escalation
  //     sent the invitation to support@alkem.io instead. The assertion reported
  //     only "no mail for organization.admin@alkem.io".
  //   * US3 — navigating to the org's settings straight after the grant was
  //     bounced to the public profile, because the route guard had not seen it.
  await waitUntil(
    async () => (await getOrganizationAdminIds(organizationRoleSetId)).includes(actorID),
    `organization admin ${actorID} to become visible on roleSet ${organizationRoleSetId}`
  );
  return res;
};

/** The user ids currently holding ADMIN on an organization's own role set. */
export const getOrganizationAdminIds = async (
  organizationRoleSetId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<string[]> => {
  const requestParams = {
    operationName: 'OrgRoleSetAdmins',
    query: `
      query OrgRoleSetAdmins($roleSetId: UUID!) {
        lookup {
          roleSet(ID: $roleSetId) {
            id
            usersInRole(role: ADMIN) { id }
          }
        }
      }
    `,
    variables: { roleSetId: organizationRoleSetId },
  };
  const response = await graphqlRequestAuth(requestParams, userRole);
  const users = response.body?.data?.lookup?.roleSet?.usersInRole as
    | { id: string }[]
    | undefined;
  return (users ?? []).map(u => u.id);
};

/**
 * Polls `predicate` until true. The blunt instrument R25 prescribes for
 * server#6461; every use should say which grant it is waiting on.
 */
export const waitUntil = async (
  predicate: () => Promise<boolean>,
  what: string,
  { timeoutMs = 20_000, intervalMs = 500 } = {}
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await predicate().catch(() => false)) return;
    if (Date.now() > deadline) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for ${what}`);
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
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

/**
 * The two personas the US3 walk logs in as: an organization ADMIN and an
 * organization ASSOCIATE with no pre-existing standing in any Space.
 *
 * Registered by `config/global-setup.ts`, NOT by the spec. `createPersonaTest`
 * drives the login form from a `storageState` fixture, and fixture setup
 * precedes every hook in a spec file — so a spec cannot register the persona it
 * logs in as. Names are fixed rather than suffixed with `runSuffix` because
 * globalSetup runs in its own process and would generate a different suffix.
 */
export const US3_REGISTERED_USER_NAMES = ['orgadmin-us3', 'orgassoc-us3'];
export { TestUserManager, TestUser };
