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

export const cleanUpTestOrganizations = async (): Promise<void> => {
  const ids = createdOrganizationIds.splice(0, createdOrganizationIds.length);
  for (const id of ids) {
    await deleteOrganization(id).catch(() => undefined);
  }
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
  bearerToken: string
): Promise<{ type: string; invitationId: string | null }> => {
  const res = await postGraphqlRaw<{
    inviteForEntryRoleOnRoleSet: Array<{ type: string; invitation: { id: string } | null }>;
  }>(
    `mutation($roleSetID: UUID!, $invitedActorID: UUID!, $welcomeMessage: String!) {
      inviteForEntryRoleOnRoleSet(invitationData: {
        invitedActorIDs: [$invitedActorID], invitedUserEmails: [], roleSetID: $roleSetID,
        welcomeMessage: $welcomeMessage, extraRoles: []
      }) { type invitation { id } }
    }`,
    { variables: { roleSetID, invitedActorID, welcomeMessage }, bearerToken }
  );
  if ((res.body.errors ?? []).length > 0) {
    throw new Error(`inviteUserToOrganizationRaw failed: ${JSON.stringify(res.body.errors)}`);
  }
  const outcome = res.body.data!.inviteForEntryRoleOnRoleSet[0];
  return { type: outcome.type, invitationId: outcome.invitation?.id ?? null };
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
