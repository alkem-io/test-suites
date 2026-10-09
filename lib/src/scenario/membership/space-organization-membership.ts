import axios from "axios";
import { testConfiguration } from "../../config/test.configuration";
import { LogManager } from "../LogManager";
import { TestUserManager } from "../TestUserManager";
import { getUserToken } from "../registration/get-user-token";

/**
 * workspace#027 Slice B — organisations enter a space by INVITATION only.
 *
 * `ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION` is granted to nobody any more (R6:
 * a direct add put an organisation into a space without its consent), so the
 * harness cannot `assignRoleToOrganization(MEMBER)` a new organisation. The
 * product way in: a role-set admin INVITES the organisation, one of the
 * organisation's admins ACCEPTS. An organisation already in the role set can
 * still be moved between MEMBER and LEAD with GRANT.
 */

const endpoint = () => testConfiguration.endPoints.graphql.private;

const raw = async <T = any>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<{ data?: T; errors?: { message: string }[] }> => {
  const response = await axios.post(
    endpoint(),
    { query, variables },
    {
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      validateStatus: () => true,
    },
  );
  if (response.status !== 200 && !response.data?.errors) {
    return {
      errors: [
        { message: `HTTP ${response.status}: ${JSON.stringify(response.data).slice(0, 200)}` },
      ],
    };
  }
  return response.data;
};

let adminTokenCache: string | undefined;
const adminToken = async (): Promise<string> =>
  (adminTokenCache ??= await getUserToken("admin@alkem.io"));

const INVITE =
  "mutation($rs: UUID!, $org: UUID!) { inviteForEntryRoleOnRoleSet(invitationData: { roleSetID: $rs, invitedActorIDs: [$org], invitedUserEmails: [], extraRoles: [] }) { type notice invitedActorID invitation { id state } } }";
const ACCEPT =
  "mutation($id: UUID!) { eventOnInvitation(eventData: { invitationID: $id, eventName: \"ACCEPT\" }) { id state } }";
const DELETE_INVITATION =
  "mutation($id: UUID!) { deleteInvitation(deleteData: { ID: $id }) { id } }";
const ORG_ADMINS =
  "query($id: UUID!) { lookup { organization(ID: $id) { roleSet { admins: usersInRole(role: ADMIN) { id email } owners: usersInRole(role: OWNER) { id email } } } } }";
const IS_MEMBER =
  "query($rs: UUID!) { lookup { roleSet(ID: $rs) { organizationsInRole(role: MEMBER) { id } } } }";
const ROLESET_ADMINS =
  "query($rs: UUID!) { lookup { roleSet(ID: $rs) { admins: usersInRole(role: ADMIN) { id email } owners: usersInRole(role: OWNER) { id email } } } }";
const ASSIGN_USER =
  "mutation($rs: UUID!, $user: UUID!, $role: RoleName!) { assignRoleToUser(roleData: { roleSetID: $rs, actorID: $user, role: $role }) { id } }";
const REMOVE_USER =
  "mutation($rs: UUID!, $user: UUID!, $role: RoleName!) { removeRoleFromUser(roleData: { roleSetID: $rs, actorID: $user, role: $role }) { id } }";

const tokenFor = async (email: string): Promise<string | undefined> => {
  const persona = Object.values(TestUserManager.users ?? {}).find(
    (u) => u && u.email === email,
  );
  if (persona?.authToken) return persona.authToken;
  try {
    return await getUserToken(email);
  } catch {
    return undefined;
  }
};

/** Accept the invitation as one of the organisation's admins or owners. */
const acceptAsOrganizationAdmin = async (
  organizationId: string,
  invitationId: string,
): Promise<void> => {
  const admin = await adminToken();
  // The harness admin created most fixture organisations and is their OWNER
  // and ADMIN — try it first, without a lookup.
  const own = await raw(admin, ACCEPT, { id: invitationId });
  if (!own.errors) return;
  const who = await raw<{
    lookup: {
      organization: {
        roleSet: {
          admins: { id: string; email: string }[];
          owners: { id: string; email: string }[];
        };
      };
    };
  }>(admin, ORG_ADMINS, { id: organizationId });
  const candidates = [
    ...(who.data?.lookup?.organization?.roleSet?.admins ?? []),
    ...(who.data?.lookup?.organization?.roleSet?.owners ?? []),
  ].filter((u) => u.email !== "admin@alkem.io");
  const tried: string[] = [own.errors[0].message.slice(0, 120)];
  for (const candidate of candidates) {
    const token = await tokenFor(candidate.email);
    if (!token) continue;
    const r = await raw(token, ACCEPT, { id: invitationId });
    if (!r.errors) return;
    tried.push(`${candidate.email}: ${r.errors[0].message.slice(0, 120)}`);
  }
  throw new Error(
    `organisation membership: nobody could accept invitation ${invitationId} for organisation ${organizationId} — ${tried.join("; ")}`,
  );
};

/**
 * Make `organizationId` an entry-role member of the space behind `roleSetId`:
 * invite as the harness admin, accept as the organisation's admin. A no-op for
 * an organisation already in the role set.
 */
export const ensureSpaceOrganizationMember = async (
  roleSetId: string,
  organizationId: string,
): Promise<void> => {
  const admin = await adminToken();
  const current = await raw<{
    lookup: { roleSet: { organizationsInRole: { id: string }[] } };
  }>(admin, IS_MEMBER, { rs: roleSetId });
  if (
    current.data?.lookup?.roleSet?.organizationsInRole?.some(
      (o) => o.id === organizationId,
    )
  ) {
    return;
  }
  const invited = await raw<{
    inviteForEntryRoleOnRoleSet: {
      type: string;
      notice?: string;
      invitation?: { id: string; state: string };
    }[];
  }>(admin, INVITE, { rs: roleSetId, org: organizationId });
  if (invited.errors) {
    throw new Error(
      `organisation membership: cannot invite organisation ${organizationId} to role set ${roleSetId}: ${invited.errors[0].message}`,
    );
  }
  const result = invited.data?.inviteForEntryRoleOnRoleSet?.[0];
  const invitationId = result?.invitation?.id;
  if (!invitationId) {
    throw new Error(
      `organisation membership: no invitation created for organisation ${organizationId}: ${JSON.stringify(result).slice(0, 200)}`,
    );
  }
  await acceptAsOrganizationAdmin(organizationId, invitationId);
  // Leave the role set exactly as a direct add would have: the accepted
  // invitation record would otherwise linger in the Space's pending /
  // invitations table (one more row naming the organisation), which the UI
  // walks written against the direct add never expected.
  const removed = await raw(admin, DELETE_INVITATION, { id: invitationId });
  if (removed.errors) {
    LogManager.getLogger().warn(
      `[organisation membership] accepted invitation ${invitationId} could not be deleted: ${removed.errors[0]?.message}`,
    );
  }
  LogManager.getLogger().info?.(
    `[organisation membership] ${organizationId} joined role set ${roleSetId} by invitation`,
  );
};

/**
 * workspace#027 Slice B (T076): the legacy `{global-admin, global-support}`
 * rule that let the harness admin assign straight into ANY organisation's role
 * set is gone; an organisation's own ADMINS keep `ROLESET_ENTRY_ROLE_ASSIGN` on
 * its role set (non-cascading). So when the harness admin is refused an
 * ASSOCIATE / ADMIN / OWNER assignment on an organisation it is not an admin
 * of (a spec stripped its auto-granted ADMIN, or another persona created the
 * organisation), retry the very same mutation as one of that organisation's
 * current admins (owners as a last resort).
 *
 * Returns the mutation's `{ data, errors }` of the LAST attempt, or undefined
 * when the role set has no admin the harness can sign in as.
 */
export const assignUserRoleAsOrganizationAdmin = async (
  roleSetId: string,
  userId: string,
  role: string,
): Promise<{ data?: any; errors?: { message: string }[] } | undefined> =>
  userRoleAsOrganizationAdmin(ASSIGN_USER, roleSetId, userId, role);

/** The removal counterpart: GRANT on an organisation is its admins' alone. */
export const removeUserRoleAsOrganizationAdmin = async (
  roleSetId: string,
  userId: string,
  role: string,
): Promise<{ data?: any; errors?: { message: string }[] } | undefined> =>
  userRoleAsOrganizationAdmin(REMOVE_USER, roleSetId, userId, role);

const userRoleAsOrganizationAdmin = async (
  mutation: string,
  roleSetId: string,
  userId: string,
  role: string,
): Promise<{ data?: any; errors?: { message: string }[] } | undefined> => {
  const who = await raw<{
    lookup: {
      roleSet: {
        admins: { id: string; email: string }[];
        owners: { id: string; email: string }[];
      };
    };
  }>(await adminToken(), ROLESET_ADMINS, { rs: roleSetId });
  const candidates = [
    ...(who.data?.lookup?.roleSet?.admins ?? []),
    ...(who.data?.lookup?.roleSet?.owners ?? []),
  ].filter((u) => u.email !== "admin@alkem.io" && u.id !== userId);
  let last: { data?: any; errors?: { message: string }[] } | undefined;
  for (const candidate of candidates) {
    const token = await tokenFor(candidate.email);
    if (!token) continue;
    last = await raw(token, mutation, { rs: roleSetId, user: userId, role });
    if (!last.errors) return last;
    LogManager.getLogger().warn(
      `userRoleAsOrganizationAdmin: ${candidate.email} could not apply ${role} for ${userId} on ${roleSetId}: ${last.errors[0]?.message}`,
    );
  }
  return last;
};
