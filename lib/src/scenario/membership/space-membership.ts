import axios from "axios";
import { testConfiguration } from "../../config/test.configuration";
import { LogManager } from "../LogManager";
import { TestUserManager } from "../TestUserManager";
import { getUserToken } from "../registration/get-user-token";
import { provisionTestIdentities } from "../registration/provision-test-identities";

/**
 * workspace#027 Slice B — space membership without a privileged "add member".
 *
 * Slice B deleted the blanket `ROLESET_ENTRY_ROLE_ASSIGN` grant the legacy
 * global admin / global support held. On an L0 space NO actor holds it any
 * more (Platform Support with the support flag gets CRUD + GRANT, not entry
 * assignment; the space's own admins never had it), so `assignRoleToUser(
 * MEMBER)` by the harness admin is refused and every scenario that seeded its
 * community that way lost its members.
 *
 * The product way in is the user's own: the space opens its membership, the
 * user JOINS as themself, and the admin then grants ADMIN / LEAD on top (a role
 * change for an existing member needs GRANT only, which the admin holds). This
 * module does exactly that, in parallel per space, and puts the membership
 * policy back the way it found it, so a test that asserts on the policy sees
 * what it configured.
 */

type SpaceRef = { spaceId: string; parentSpaceId?: string };

const roleSetToSpace = new Map<string, SpaceRef>();
const spaceToRoleSet = new Map<string, string>();

/** Remember which space (and parent) a role set belongs to. Idempotent; a known parent is never overwritten by `undefined`. */
export const registerSpaceRoleSet = (
  roleSetId: string,
  spaceId: string,
  parentSpaceId?: string,
): void => {
  if (!roleSetId || !spaceId) return;
  const known = roleSetToSpace.get(roleSetId);
  roleSetToSpace.set(roleSetId, {
    spaceId,
    parentSpaceId: parentSpaceId ?? known?.parentSpaceId,
  });
  spaceToRoleSet.set(spaceId, roleSetId);
};

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

const tokenCache = new Map<string, string>();

/** A bearer for the user with this id: the persona map first, then the user's email read as admin. */
const tokenForUserId = async (userId: string): Promise<string> => {
  const cached = tokenCache.get(userId);
  if (cached) return cached;
  const persona = Object.values(TestUserManager.users ?? {}).find(
    (u) => u && u.id === userId,
  );
  let email = persona?.email;
  if (persona?.authToken) {
    tokenCache.set(userId, persona.authToken);
    return persona.authToken;
  }
  if (!email) {
    const r = await raw<{ lookup: { user: { email: string } | null } }>(
      await adminToken(),
      "query($id: UUID!) { lookup { user(ID: $id) { email } } }",
      { id: userId },
    );
    email = r.data?.lookup?.user?.email;
  }
  if (!email) {
    throw new Error(`space membership: no email for user ${userId}`);
  }
  let token: string;
  try {
    token = await getUserToken(email);
  } catch (e) {
    // A user created through `createUser` has an Alkemio record but no Kratos
    // identity, so it cannot sign in — and therefore cannot join. Where the
    // Kratos admin API is reachable, give it one (same harness password; the
    // server links the identity to the existing user by email). Only
    // `@alkem.io` addresses can be provisioned that way.
    const match = /^([^@]+)@alkem\.io$/i.exec(email);
    if (!match || !testConfiguration.endPoints.kratos.admin) throw e;
    await provisionTestIdentities([match[1]]);
    token = await getUserToken(email);
  }
  tokenCache.set(userId, token);
  return token;
};

const SPACES_WITH_ROLE_SETS =
  "query { platformAdmin { spaces(filter: { visibilities: [ACTIVE, DEMO, INACTIVE, ARCHIVED] }) { id community { roleSet { id } } subspaces { id community { roleSet { id } } subspaces { id community { roleSet { id } } } } } } }";

type SpaceNode = {
  id: string;
  community?: { roleSet?: { id: string } };
  subspaces?: SpaceNode[];
};

const indexSpaces = (nodes: SpaceNode[] | undefined, parent?: string) => {
  for (const node of nodes ?? []) {
    const rs = node.community?.roleSet?.id;
    if (rs) registerSpaceRoleSet(rs, node.id, parent);
    indexSpaces(node.subspaces, node.id);
  }
};

/** The space a role set belongs to — from the registry, or by indexing the platform's spaces once. */
export const resolveSpaceOfRoleSet = async (
  roleSetId: string,
): Promise<SpaceRef | undefined> => {
  const known = roleSetToSpace.get(roleSetId);
  if (known) return known;
  const r = await raw<{ platformAdmin: { spaces: SpaceNode[] } }>(
    await adminToken(),
    SPACES_WITH_ROLE_SETS,
  );
  indexSpaces(r.data?.platformAdmin?.spaces);
  return roleSetToSpace.get(roleSetId);
};

const MEMBERSHIP_SETTINGS =
  "query($id: UUID!) { lookup { space(ID: $id) { settings { membership { policy allowSubspaceAdminsToInviteMembers trustedOrganizations } } } } }";
// The membership input is all-required, so the current values travel back
// with the one field that changes.
const SET_MEMBERSHIP =
  "mutation($id: String!, $membership: UpdateSpaceSettingsMembershipInput!) { updateSpaceSettings(settingsData: { spaceID: $id, settings: { membership: $membership } }) { id } }";

type MembershipSettings = {
  policy: string;
  allowSubspaceAdminsToInviteMembers: boolean;
  trustedOrganizations: string[];
};

/** Runs `fn` with the space's membership policy OPEN, then restores the previous settings. */
const withOpenMembership = async <T>(
  spaceId: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const admin = await adminToken();
  const before = await raw<{
    lookup: { space: { settings: { membership: MembershipSettings } } };
  }>(admin, MEMBERSHIP_SETTINGS, { id: spaceId });
  const previous = before.data?.lookup?.space?.settings?.membership;
  if (!previous?.policy) {
    throw new Error(
      `space membership: cannot read the membership settings of space ${spaceId}: ${JSON.stringify(before.errors).slice(0, 200)}`,
    );
  }
  const changed = previous.policy !== "OPEN";
  if (changed) {
    const set = await raw(admin, SET_MEMBERSHIP, {
      id: spaceId,
      membership: { ...previous, policy: "OPEN" },
    });
    if (set.errors) {
      throw new Error(
        `space membership: cannot open membership on space ${spaceId}: ${set.errors[0].message}`,
      );
    }
  }
  try {
    return await fn();
  } finally {
    if (changed) {
      const restore = await raw(admin, SET_MEMBERSHIP, {
        id: spaceId,
        membership: previous,
      });
      if (restore.errors) {
        LogManager.getLogger().error(
          `space membership: could not restore policy ${previous.policy} on space ${spaceId}: ${restore.errors[0].message}`,
        );
      }
    }
  }
};

const JOIN =
  "mutation($id: UUID!) { joinRoleSet(joinData: { roleSetID: $id }) { id } }";

const joinAs = async (
  token: string,
  roleSetId: string,
): Promise<string | undefined> => {
  const r = await raw(token, JOIN, { id: roleSetId });
  return r.errors?.[0]?.message;
};

/**
 * Make every user in `userIds` an entry-role member of the space behind
 * `roleSetId`, joining as themselves in parallel. A user who is not yet a
 * member of the parent space is joined there first (recursively up the chain).
 * Already-members are a no-op on the server.
 */
export const ensureSpaceMembers = async (
  roleSetId: string,
  userIds: string[],
  spaceIdHint?: string,
): Promise<void> => {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return;
  if (spaceIdHint) registerSpaceRoleSet(roleSetId, spaceIdHint);
  const ref = await resolveSpaceOfRoleSet(roleSetId);
  if (!ref) {
    throw new Error(
      `space membership: role set ${roleSetId} belongs to no space this run knows (organization role sets are not joinable this way)`,
    );
  }
  const tokens = await Promise.all(ids.map(tokenForUserId));

  await withOpenMembership(ref.spaceId, async () => {
    const attempt = async (subset: number[]) =>
      Promise.all(subset.map((i) => joinAs(tokens[i], roleSetId)));

    const all = ids.map((_, i) => i);
    let errors = await attempt(all);
    // A subspace refuses a non-member of its parent either explicitly ("not a
    // member of parent roleSet") or as a missing JOIN privilege (an OPEN
    // subspace grants JOIN to parent members only) — in both cases the way in
    // is to join the parent first, recursively up the chain.
    const blockedByParent = all.filter((i) => Boolean(errors[i]));
    if (blockedByParent.length > 0 && ref.parentSpaceId) {
      const parentRoleSet = spaceToRoleSet.get(ref.parentSpaceId);
      if (parentRoleSet) {
        await ensureSpaceMembers(
          parentRoleSet,
          blockedByParent.map((i) => ids[i]),
          ref.parentSpaceId,
        );
        const retried = await attempt(blockedByParent);
        blockedByParent.forEach((i, k) => {
          errors[i] = retried[k];
        });
      }
    }
    const failed = all.filter((i) => errors[i]);
    if (failed.length > 0) {
      throw new Error(
        `space membership: ${failed.length} of ${ids.length} users could not join role set ${roleSetId} (space ${ref.spaceId}): ${failed
          .map((i) => `${ids[i]}: ${errors[i]}`)
          .join("; ")}`,
      );
    }
  });
};

/** Clears cached bearers (a persona re-registered under another password, a new run). */
export const resetMembershipTokenCache = (): void => {
  tokenCache.clear();
  adminTokenCache = undefined;
};
