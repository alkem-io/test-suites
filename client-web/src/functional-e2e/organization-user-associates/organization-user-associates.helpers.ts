import {
  createOrganization,
  deleteOrganization,
  getGraphqlClient,
  getUserToken,
  postGraphqlRaw,
  queryHarnessDb,
  registerTestUser,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

/**
 * Local GraphQL/DB helpers for the organization-user-associates acceptance
 * walks (workspace#062-organization-user-associates). Mirrors the
 * organization-space-invitations (061) helper file one-for-one: `@alkemio/tests-lib`
 * has `createOrganization` and the generic role mutations, but not the
 * organization-settings / apply / invite-outcome shapes this feature's walks
 * need — so the generated SDK client (`getGraphqlClient()`) and `postGraphqlRaw`
 * are used directly here, same rationale as `organization-space-invitations.helpers.ts`.
 */

export type OrgFixture = {
  id: string;
  nameID: string;
  displayName: string;
  roleSetId: string;
};

const NAME_ID_MAX = 24;
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const slugifyWithSuffix = (label: string, runSuffix: string) => {
  const suffix = slug(runSuffix);
  return `${slug(label).slice(0, Math.max(0, NAME_ID_MAX - suffix.length))}${suffix}`;
};

// Registry so a run can hand back every organization it created — the base
// scenario cleanup has no visibility into these ad-hoc fixtures.
const createdOrganizationIds: string[] = [];

export const createTestOrganization = async (label: string, runSuffix: string): Promise<OrgFixture> => {
  const displayName = `US3 ${label} ${runSuffix}`;
  const nameID = slugifyWithSuffix(label, runSuffix);
  const res = await createOrganization(displayName, nameID);
  if (!res.data?.createOrganization) {
    throw new Error(`Failed to create organization "${label}": ${JSON.stringify(res.error)}`);
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
 * empties the registry. Every organization is attempted — one failure must not
 * stop the rest — and anything left behind FAILS the calling `afterAll` (same
 * contract as the 061 sibling helper): the failed id has already left the
 * registry, so no later cleanup can retry it, and a green run that leaks an
 * organization hands a stale fixture to the next walk.
 */
export const cleanUpTestOrganizations = async (): Promise<void> => {
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
    // Thrown from the caller's `afterAll`. Playwright reports a hook failure
    // alongside — never instead of — the file's own test results, so an earlier
    // real test failure is preserved. A half-deleted organization is an
    // environment problem an operator has to clear, so name the ids.
    throw new Error(
      `[cleanUpTestOrganizations] ${undeleted.length} organization(s) could not be deleted and may now be half-deleted — ` +
        `they will break authorizationPolicyResetAll until removed: ${undeleted.join(', ')}`
    );
  }
};

/**
 * Deletes the run-suffixed identities a walk registered, by email, and returns
 * one line per failure (empty when clean). No later run reuses these emails,
 * so without this every run leaves its user + profile rows in the shared
 * database. An email that never finished registering resolves to no id and is
 * skipped; every deletion result is inspected, because `graphqlErrorWrapper`
 * resolves GraphQL failures as `{ error }` instead of rejecting.
 */
export const deletePersonasByEmail = async (emails: string[]): Promise<string[]> => {
  const failures: string[] = [];
  const client = getGraphqlClient();
  for (const email of emails) {
    if (!email) continue; // beforeAll failed before registering it
    let id: string | undefined;
    try {
      const bearerToken = await getUserToken(email);
      const me = await postGraphqlRaw<{ me: { user: { id: string } } }>('query { me { user { id } } }', {
        bearerToken,
      });
      id = me.body.data?.me.user.id;
    } catch {
      // never registered (or already gone) — nothing to delete
    }
    if (!id) continue;
    const userId = id;
    const res = await graphqlErrorWrapper(
      authToken => client.deleteUser({ deleteData: { ID: userId } }, { authorization: `Bearer ${authToken}` }),
      TestUser.GLOBAL_ADMIN
    );
    if (res.error) failures.push(`user ${email} (${userId}): ${JSON.stringify(res.error)}`);
  }
  return failures;
};

/** Grants `role` to a USER on an organization's own roleset (org-admin/owner/
 * associate standing — not Space membership). */
export const assignUserRoleOnOrganization = async (
  roleSetID: string,
  actorID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const client = getGraphqlClient();
  const res = await graphqlErrorWrapper(
    authToken => client.assignRoleToUser({ roleData: { actorID, roleSetID, role } }, { authorization: `Bearer ${authToken}` }),
    userRole
  );
  if (res.error) {
    throw new Error(`assignUserRoleOnOrganization(${role}) failed for ${actorID} on ${roleSetID}: ${JSON.stringify(res.error)}`);
  }
};

export const removeUserRoleOnOrganization = async (
  roleSetID: string,
  actorID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const client = getGraphqlClient();
  const res = await graphqlErrorWrapper(
    authToken => client.removeRoleFromUser({ roleData: { actorID, roleSetID, role } }, { authorization: `Bearer ${authToken}` }),
    userRole
  );
  if (res.error) {
    throw new Error(`removeUserRoleOnOrganization(${role}) failed for ${actorID} on ${roleSetID}: ${JSON.stringify(res.error)}`);
  }
};

/** Updates the organization's membership settings block. `allowUsersMatchingDomainToJoin`
 * is non-nullable on the wire input (schema quirk — every call must state it explicitly,
 * default `false` here since none of this walk's fixtures use the domain-join door). */
export const setOrganizationMembershipSettings = async (
  organizationID: string,
  membership: { allowApplications?: boolean; allowUsersMatchingDomainToJoin?: boolean; allowSpaceInvitations?: boolean },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const client = getGraphqlClient();
  const res = await graphqlErrorWrapper(
    authToken =>
      client.UpdateOrganizationSettings(
        {
          settingsData: {
            organizationID,
            settings: { membership: { allowUsersMatchingDomainToJoin: false, ...membership } },
          },
        },
        { authorization: `Bearer ${authToken}` }
      ),
    userRole
  );
  if (res.error) {
    throw new Error(`setOrganizationMembershipSettings failed for ${organizationID}: ${JSON.stringify(res.error)}`);
  }
};

/** Strips the `allowApplications` key from an organization's stored settings
 * jsonb directly in Postgres — simulates a pre-migration row (US3-AS9), the
 * shape `@AfterLoad` must default on read since no batch migration exists for it. */
export const stripAllowApplicationsSetting = async (organizationID: string): Promise<void> => {
  await queryHarnessDb(
    'UPDATE organization SET settings = settings #- \'{membership,allowApplications}\' WHERE id = $1',
    [organizationID]
  );
};

/** Applies to an organization's roleset via the API — used for fixtures whose
 * UI apply flow is asserted elsewhere in the same walk (avoids re-deriving the
 * same UI steps for every "already has a pending application" precondition). */
export const applyToOrganizationViaApi = async (
  roleSetID: string,
  userRole: TestUser,
  message: string
): Promise<string> => {
  const client = getGraphqlClient();
  const res = await graphqlErrorWrapper(
    authToken =>
      client.applyForEntryRole(
        { applicationData: { roleSetID, questions: [{ name: 'message', value: message, sortOrder: 1 }] } },
        { authorization: `Bearer ${authToken}` }
      ),
    userRole
  );
  if (res.error || !res.data?.applyForEntryRoleOnRoleSet?.id) {
    throw new Error(`applyToOrganizationViaApi failed on ${roleSetID}: ${JSON.stringify(res.error)}`);
  }
  return res.data.applyForEntryRoleOnRoleSet.id;
};

/** Raw invite mutation, returning the typed per-invitee outcome the invite
 * dialog itself surfaces (`ALREADY_HAS_OPEN_APPLICATION`, `ALREADY_ASSOCIATE`,
 * `ROLE_LIMIT_REACHED`, …) — asserted at the network layer instead of scraping
 * dialog text, so the check survives copy changes. */
export const inviteUserToOrganizationRaw = async (
  roleSetID: string,
  invitedActorID: string,
  welcomeMessage: string,
  bearerToken: string,
  extraRoles: RoleName[] = []
): Promise<{ type: string; invitationId: string | null }> => {
  const res = await postGraphqlRaw<{
    inviteForEntryRoleOnRoleSet: Array<{ type: string; invitation: { id: string } | null }>;
  }>(
    `mutation($roleSetID: UUID!, $invitedActorID: UUID!, $welcomeMessage: String!, $extraRoles: [RoleName!]!) {
      inviteForEntryRoleOnRoleSet(invitationData: {
        invitedActorIDs: [$invitedActorID], invitedUserEmails: [], roleSetID: $roleSetID,
        welcomeMessage: $welcomeMessage, extraRoles: $extraRoles
      }) { type invitation { id } }
    }`,
    { variables: { roleSetID, invitedActorID, welcomeMessage, extraRoles }, bearerToken }
  );
  if ((res.body.errors ?? []).length > 0) {
    throw new Error(`inviteUserToOrganizationRaw failed: ${JSON.stringify(res.body.errors)}`);
  }
  const outcome = res.body.data!.inviteForEntryRoleOnRoleSet[0];
  return { type: outcome.type, invitationId: outcome.invitation?.id ?? null };
};

/** The user ids currently holding `role` on a role set (org-side view, as the
 * platform admin) — used to fill a role to its cap and to prove a withheld
 * role was NOT granted (US2-AS5). */
export const getUserIdsInRole = async (
  roleSetId: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<string[]> => {
  const client = getGraphqlClient();
  const res = await graphqlErrorWrapper(
    authToken => client.GetRoleSetUsersInRoles({ roleSetId, roles: [role] }, { authorization: `Bearer ${authToken}` }),
    userRole
  );
  if (res.error) {
    throw new Error(`getUserIdsInRole(${role}) failed on ${roleSetId}: ${JSON.stringify(res.error)}`);
  }
  return (res.data?.lookup.roleSet?.usersInRoles ?? []).flatMap(r => r.users.map(u => u.id));
};

const ELIGIBILITY_QUERY = `
  query($id: UUID!) {
    organization(ID: $id) { myAssociateEligibility { canApply canJoinDirectly reason } }
  }`;

export const getAssociateEligibility = async (
  organizationID: string,
  bearerToken: string
): Promise<{ canApply: boolean; canJoinDirectly: boolean; reason: string }> => {
  const res = await postGraphqlRaw<{
    organization: { myAssociateEligibility: { canApply: boolean; canJoinDirectly: boolean; reason: string } };
  }>(ELIGIBILITY_QUERY, { variables: { id: organizationID }, bearerToken });
  if ((res.body.errors ?? []).length > 0) {
    throw new Error(`getAssociateEligibility failed: ${JSON.stringify(res.body.errors)}`);
  }
  return res.body.data!.organization.myAssociateEligibility;
};

const IN_APP_NOTIFICATIONS_QUERY = `
  query {
    me { notifications { inAppNotifications { id type } } }
  }`;

/** Every in-app notification `type` currently on the given persona's list
 * (`inAppNotifications` takes no server-side type filter — filtered here). */
export const getInAppNotificationTypes = async (email: string): Promise<string[]> => {
  const bearerToken = await getUserToken(email);
  const res = await postGraphqlRaw<{ me: { notifications: { inAppNotifications: Array<{ id: string; type: string }> } } }>(
    IN_APP_NOTIFICATIONS_QUERY,
    { bearerToken }
  );
  if ((res.body.errors ?? []).length > 0) {
    throw new Error(`getInAppNotificationTypes failed for ${email}: ${JSON.stringify(res.body.errors)}`);
  }
  return res.body.data!.me.notifications.inAppNotifications.map(n => n.type);
};

const IN_APP_ASSOCIATE_ACTOR_QUERY = `
  query GetOrgAssociateActorInAppNotifications($types: [NotificationEvent!]) {
    me {
      notifications(filter: { types: $types }) {
        inAppNotifications {
          id
          type
          payload {
            type
            ... on InAppNotificationPayloadOrganizationAssociateActor {
              actor { id }
              organization { id }
            }
          }
        }
      }
    }
  }`;

/**
 * The ids of the actors carried by this persona's in-app rows of `type` for
 * `organizationId`.
 *
 * Scoped on purpose. An admin accumulates rows of the same type from every
 * DIRECT role assignment made on the organization — including the ones a
 * fixture performs while setting the walk up (FR-010: a direct assignment DOES
 * produce "joined"). So "this persona has no row of this type at all" is an
 * assertion that can only ever fail; the real claim is "no row of this type
 * for THIS actor".
 */
export const getInAppActorIdsForType = async (
  email: string,
  type: string,
  organizationId: string
): Promise<string[]> => {
  const bearerToken = await getUserToken(email);
  const res = await postGraphqlRaw<{
    me: {
      notifications: {
        inAppNotifications: Array<{
          type: string;
          payload?: { actor?: { id: string } | null; organization?: { id: string } | null } | null;
        }>;
      };
    };
  }>(IN_APP_ASSOCIATE_ACTOR_QUERY, { bearerToken, variables: { types: [type] } });
  if ((res.body.errors ?? []).length > 0) {
    throw new Error(`getInAppActorIdsForType failed for ${email}: ${JSON.stringify(res.body.errors)}`);
  }
  return res.body.data!.me.notifications.inAppNotifications
    .filter(n => n.payload?.organization?.id === organizationId)
    .map(n => n.payload?.actor?.id)
    .filter((id): id is string => Boolean(id));
};

export const runSuffix = UniqueIDGenerator.getID();

/** Registers a fresh persona via the raw Kratos API (no UI, no mailbox
 * polling — the sign-up FLOW itself is not this feature's concern) and
 * returns its email, following the 061 walk's own convention. */
export const registerPersona = async (label: string): Promise<string> => {
  const userName = `${label}-${runSuffix}`;
  await registerTestUser(userName);
  return `${userName}@alkem.io`;
};

export { TestUserManager, TestUser, getUserToken, postGraphqlRaw };
