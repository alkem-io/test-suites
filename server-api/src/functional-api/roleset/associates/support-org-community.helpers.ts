// Shared pieces of the Platform Support organisation Community-tab suites
// (workspace#090, server#6692 / #6708): support-org-community-scope.it-spec.ts
// and support-org-community-actions.it-spec.ts.
//
// Why raw GraphQL here instead of the request-params wrappers: the actors are
// registered users that have no `TestUser` slot, the wrappers resolve only the
// error and not the `extensions.code` of a refusal next to `data`, and the
// self-target code and the new privilege have to be asserted exactly.
//
// Actors (see the plan, 0.2):
//   SUP   `global.support@alkem.io`, Platform Support ONLY, never an org role
//         holder unless a case says so. Not the harness admin: that persona
//         also holds Content Full Access, Roles Admin, ..., and as creator of
//         every fixture organisation it is an org ADMIN, so it would pass on
//         the entity-admin path and write no audit row.
//   OA    `organization.admin@alkem.io`, ASSOCIATE + ADMIN of each fixture org.
//   GA    the harness admin; creates and deletes the fixture orgs.
import {
  assignPlatformRole,
  createOrganizationOrAdopt,
  deleteOrganization,
  harnessPostgresConfigured,
  queryHarnessDb,
  seedPlatformRoleUsers,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  type SeededPlatformRoleUsers,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  type AuditRecord,
  callAuditTool,
  MCP_AVAILABLE,
} from '../../platform-roles/_support/mcp-client';
import {
  rawRead,
  rawRequest,
  type RawResult,
} from '../../platform-roles/_support/raw-request';
import {
  type RegisteredUser,
  registerUser,
} from '../../platform-roles/_support/users';
import { deleteDisposableUsers } from '../../platform-roles/_support/groups/disposable-user';
import { assignRoleToUser, removeRoleFromUser } from '../roles-request.params';

// ===== actors =================================================================

export type Who = { id: string; token: string; email: string };

export const whoIs = (user: TestUser): Who => {
  const model = TestUserManager.getUserModelByType(user);
  return { id: model.id, token: model.authToken, email: model.email };
};

export const sup = (): Who => whoIs(TestUser.GLOBAL_SUPPORT_ADMIN);
export const orgAdmin = (): Who => whoIs(TestUser.ORGANIZATION_ADMIN);
export const harnessAdmin = (): Who => whoIs(TestUser.GLOBAL_ADMIN);

let seeded: Promise<SeededPlatformRoleUsers> | undefined;
/** The 14 single-role users + the bootstrap admin. Idempotent; shared by the file. */
export const platformRoleUsers = (): Promise<SeededPlatformRoleUsers> => {
  seeded ??= seedPlatformRoleUsers().catch((e: unknown) => {
    seeded = undefined;
    throw e;
  });
  return seeded;
};

/**
 * Loads the shared personas and makes sure Support holds Platform Support (as
 * `TestScenarioFactory` does when it builds a scenario), then requires that it
 * holds NOTHING else: every "refused" below would otherwise be another role's
 * doing. Fails the describe loudly, in its `beforeAll`.
 */
export const assertSupportIsSupportOnly = async (): Promise<void> => {
  await TestUserManager.populateUserModelMap();
  const roles = async (): Promise<string[]> => {
    const { data, errors } = await rawRequest<{
      platform: { roleSet: { myRoles: string[] } };
    }>(sup().token, 'query { platform { roleSet { myRoles } } }');
    if (errors.length > 0 || !data) {
      throw new Error(
        `cannot read the Support persona's roles: ${errors[0]?.message}`
      );
    }
    return data.platform.roleSet.myRoles;
  };
  if (!(await roles()).includes('PLATFORM_SUPPORT')) {
    await assignPlatformRole(sup().id, RoleName.PlatformSupport);
  }
  expect([...(await roles())].sort()).toEqual(['PLATFORM_SUPPORT', 'REGISTERED']);
};

export const runId = (): string => Date.now().toString(36);

/** A throwaway registered user with its own token, so it can ACT (accept, apply). */
export const newUser = (label: string): Promise<RegisteredUser> =>
  registerUser(`t090${label}.${runId()}${UniqueIDGenerator.getID()}`);

// ===== GraphQL documents ======================================================

export const INVITE = `mutation($d: InviteForEntryRoleOnRoleSetInput!) {
  inviteForEntryRoleOnRoleSet(invitationData: $d) {
    type invitedActorID invitedEmail
    invitation { id state extraRoles }
    platformInvitation { id email roleSetExtraRoles }
  }
}`;
const ASSIGN_USER = 'mutation($d: AssignRoleOnRoleSetInput!) { assignRoleToUser(roleData: $d) { id } }';
const ASSIGN_ACTOR = 'mutation($d: AssignRoleOnRoleSetInput!) { assignRole(roleData: $d) { id } }';
const REMOVE_USER = 'mutation($d: RemoveRoleOnRoleSetInput!) { removeRoleFromUser(roleData: $d) { id } }';
const REMOVE_ACTOR = 'mutation($d: RemoveRoleOnRoleSetInput!) { removeRole(roleData: $d) { id } }';
const DELETE_INVITATION = 'mutation($id: UUID!) { deleteInvitation(deleteData: { ID: $id }) { id } }';
const DELETE_PLATFORM_INVITATION = 'mutation($id: UUID!) { deletePlatformInvitation(deleteData: { ID: $id }) { id } }';
const RESEND = 'mutation($id: UUID!) { resendPlatformInvitation(resendData: { ID: $id }) { id } }';
const EVENT_ON_INVITATION = 'mutation($d: InvitationEventInput!) { eventOnInvitation(eventData: $d) { id state extraRolesWithheld } }';
const EVENT_ON_APPLICATION = 'mutation($d: ApplicationEventInput!) { eventOnApplication(eventData: $d) { id state } }';
const APPLY = 'mutation($d: ApplyForEntryRoleOnRoleSetInput!) { applyForEntryRoleOnRoleSet(applicationData: $d) { id state } }';
const RESET_ORG = 'mutation($d: OrganizationAuthorizationResetInput!) { authorizationPolicyResetOnOrganization(authorizationResetData: $d) { id } }';

export type InviteResult = {
  type: string;
  invitedActorID?: string | null;
  invitedEmail?: string | null;
  invitation?: { id: string; state: string; extraRoles: string[] } | null;
  platformInvitation?: {
    id: string;
    email: string;
    roleSetExtraRoles: string[];
  } | null;
};

export const invite = (
  token: string,
  roleSetId: string,
  options: { users?: string[]; emails?: string[]; roles?: RoleName[] }
): Promise<RawResult<{ inviteForEntryRoleOnRoleSet: InviteResult[] }>> =>
  rawRequest(token, INVITE, {
    d: {
      roleSetID: roleSetId,
      invitedActorIDs: options.users ?? [],
      invitedUserEmails: options.emails ?? [],
      welcomeMessage: 'support-org-community 090',
      extraRoles: options.roles ?? [],
    },
  });

export const assignUser = (
  token: string,
  roleSetId: string,
  userId: string,
  role: RoleName
) =>
  rawRequest(token, ASSIGN_USER, {
    d: { roleSetID: roleSetId, actorID: userId, role },
  });

export const assignActor = (
  token: string,
  roleSetId: string,
  actorId: string,
  role: RoleName
) =>
  rawRequest(token, ASSIGN_ACTOR, {
    d: { roleSetID: roleSetId, actorID: actorId, role },
  });

export const removeUser = (
  token: string,
  roleSetId: string,
  userId: string,
  role: RoleName
) =>
  rawRequest(token, REMOVE_USER, {
    d: { roleSetID: roleSetId, actorID: userId, role },
  });

export const removeActor = (
  token: string,
  roleSetId: string,
  actorId: string,
  role: RoleName
) =>
  rawRequest(token, REMOVE_ACTOR, {
    d: { roleSetID: roleSetId, actorID: actorId, role },
  });

export const deleteUserInvitation = (token: string, id: string) =>
  rawRequest(token, DELETE_INVITATION, { id });
export const deleteEmailInvitation = (token: string, id: string) =>
  rawRequest(token, DELETE_PLATFORM_INVITATION, { id });
export const resendEmailInvitation = (token: string, id: string) =>
  rawRequest(token, RESEND, { id });

export const eventOnInvitation = (
  token: string,
  invitationID: string,
  eventName: string
) =>
  rawRequest<{
    eventOnInvitation: {
      id: string;
      state: string;
      extraRolesWithheld: string[] | null;
    };
  }>(token, EVENT_ON_INVITATION, { d: { invitationID, eventName } });

export const eventOnApplication = (
  token: string,
  applicationID: string,
  eventName: string
) =>
  rawRequest<{ eventOnApplication: { id: string; state: string } }>(
    token,
    EVENT_ON_APPLICATION,
    { d: { applicationID, eventName } }
  );

export const apply = async (
  token: string,
  roleSetId: string
): Promise<string> => {
  const data = await rawRead<{ applyForEntryRoleOnRoleSet: { id: string } }>(
    token,
    APPLY,
    { d: { roleSetID: roleSetId, questions: [] } }
  );
  return data.applyForEntryRoleOnRoleSet.id;
};

export const resetOrganization = (token: string, organizationId: string) =>
  rawRequest<{ authorizationPolicyResetOnOrganization: { id: string } }>(
    token,
    RESET_ORG,
    { d: { organizationID: organizationId } }
  );

// ===== reads ==========================================================

/** role -> user ids, as seen by `token` (the Community tab's member list). */
export const membersOf = async (
  token: string,
  roleSetId: string,
  roles: RoleName[] = [RoleName.Associate, RoleName.Admin, RoleName.Owner]
): Promise<Record<string, string[]>> => {
  const data = await rawRead<{
    lookup: {
      roleSet: { usersInRoles: { role: string; users: { id: string }[] }[] };
    };
  }>(
    token,
    'query($id: UUID!, $roles: [RoleName!]!) { lookup { roleSet(ID: $id) { usersInRoles(roles: $roles) { role users { id } } } } }',
    { id: roleSetId, roles }
  );
  const byRole: Record<string, string[]> = {};
  for (const entry of data.lookup.roleSet.usersInRoles) {
    byRole[entry.role] = entry.users.map(u => u.id);
  }
  for (const role of roles) byRole[role] ??= [];
  return byRole;
};

export type PendingInvitation = {
  id: string;
  state: string;
  extraRoles: string[];
  createdBy: { id: string } | null;
};

export const pendingInvitations = async (
  token: string,
  roleSetId: string
): Promise<PendingInvitation[]> => {
  const data = await rawRead<{
    lookup: { roleSet: { invitations: PendingInvitation[] } };
  }>(
    token,
    'query($id: UUID!) { lookup { roleSet(ID: $id) { invitations { id state extraRoles createdBy { id } } } } }',
    { id: roleSetId }
  );
  return data.lookup.roleSet.invitations;
};

export const pendingEmailInvitations = async (
  token: string,
  roleSetId: string
): Promise<{ id: string; email: string }[]> => {
  const data = await rawRead<{
    lookup: { roleSet: { platformInvitations: { id: string; email: string }[] } };
  }>(
    token,
    'query($id: UUID!) { lookup { roleSet(ID: $id) { platformInvitations { id email } } } }',
    { id: roleSetId }
  );
  return data.lookup.roleSet.platformInvitations;
};

export const pendingApplicationIds = async (
  token: string,
  roleSetId: string
): Promise<string[]> => {
  const data = await rawRead<{
    lookup: { roleSet: { applications: { id: string }[] } };
  }>(
    token,
    'query($id: UUID!) { lookup { roleSet(ID: $id) { applications { id } } } }',
    { id: roleSetId }
  );
  return data.lookup.roleSet.applications.map(a => a.id);
};

export const applicationState = async (
  token: string,
  applicationId: string
): Promise<{ state: string; nextEvents: string[] }> => {
  const data = await rawRead<{
    lookup: { application: { state: string; nextEvents: string[] } };
  }>(
    token,
    'query($id: UUID!) { lookup { application(ID: $id) { state nextEvents } } }',
    { id: applicationId }
  );
  return data.lookup.application;
};

export const invitationState = async (
  token: string,
  invitationId: string
): Promise<string | null> => {
  const { data, errors } = await rawRequest<{
    lookup: { invitation: { state: string } | null };
  }>(token, 'query($id: UUID!) { lookup { invitation(ID: $id) { state } } }', {
    id: invitationId,
  });
  if (errors.length > 0) {
    if (errors.every(e => e.extensions?.code === 'ENTITY_NOT_FOUND'))
      return null;
    throw new Error(`invitation read failed: ${errors[0].message}`);
  }
  return data?.lookup?.invitation?.state ?? null;
};

/** The organisation invitations the signed-in user sees as pending ("my invitations"). */
export const myOrganizationInvitationIds = async (
  token: string
): Promise<string[]> => {
  const data = await rawRead<{
    me: { organizationInvitations: { id: string }[] };
  }>(token, 'query { me { organizationInvitations { id } } }');
  return data.me.organizationInvitations.map(i => i.id);
};

const REMOVE_PLATFORM_ROLE = 'mutation($d: RemovePlatformRoleInput!) { removePlatformRoleFromUser(roleData: $d) { id } }';
/** Takes a platform role off a user, as the bootstrap Platform Roles Admin. */
export const removePlatformRole = async (
  userId: string,
  role: RoleName
): Promise<void> => {
  const { bootstrapToken } = await platformRoleUsers();
  await rawRead(bootstrapToken, REMOVE_PLATFORM_ROLE, {
    d: { actorID: userId, role },
  });
};

/** A throwaway user that holds Platform Support. Delete it with `removeUsers`. */
export const newSupportUser = async (label: string): Promise<RegisteredUser> => {
  const user = await newUser(label);
  const res = await assignPlatformRole(user.id, RoleName.PlatformSupport);
  if (res?.error) {
    throw new Error(`cannot grant Platform Support: ${JSON.stringify(res.error)}`);
  }
  return user;
};

// ===== refusals ===============================================================

export const SELF_TARGET_CODE = 'PLATFORM_SUPPORT_SELF_TARGET';
export const SELF_TARGET_TEXT = 'self-targeted platform-support action is not allowed';

type Refusal = Pick<RawResult<unknown>, 'errors'> & { data?: unknown };

/**
 * A plain authorization refusal, named by the privilege it was refused on. The
 * message is the server's `Authorization: unable to grant '<privilege>'
 * privilege: ...`, so a different privilege or a different failure (not found,
 * validation) cannot pass.
 */
export const expectForbidden = (res: Refusal, privilege: string): void => {
  expect(res.errors.length).toBeGreaterThan(0);
  expect(res.errors[0].extensions?.code).toEqual('FORBIDDEN_POLICY');
  expect(res.errors[0].message).toMatch(
    new RegExp(`Authorization: unable to grant '${privilege}' privilege`)
  );
};

/** The Support self-target refusal: its own code AND its own text. */
export const expectSelfTarget = (res: Refusal): void => {
  expect(res.errors.length).toBeGreaterThan(0);
  expect(res.errors[0].extensions?.code).toEqual(SELF_TARGET_CODE);
  expect(res.errors[0].message).toContain(SELF_TARGET_TEXT);
};

export const expectOk = (res: Refusal, what = 'call'): void => {
  expect(res.errors, `${what} must succeed`).toEqual([]);
};

// ===== fixture organisations ==================================================

export type Org = {
  id: string;
  nameId: string;
  displayName: string;
  roleSetId: string;
};

/**
 * A fresh organisation created by GA (so GA is ASSOCIATE + ADMIN, never OWNER)
 * with OA as ASSOCIATE + ADMIN. Created AFTER the deploy under test, so its
 * stored policy carries the Support rules.
 */
export const createOrg = async (
  label: string,
  options: { orphan?: boolean } = {}
): Promise<Org> => {
  const unique = `${label}-${runId()}${UniqueIDGenerator.getID()}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  const displayName = `s090 ${unique}`;
  const nameId = unique.slice(0, 24);
  const created = await createOrganizationOrAdopt(displayName, nameId);
  const org = created.data?.createOrganization;
  if (!org) {
    throw new Error(
      `could not create organisation ${nameId}: ${JSON.stringify(created.error)}`
    );
  }
  const fixture: Org = {
    id: org.id,
    nameId: org.nameID,
    displayName,
    roleSetId: org.roleSet.id,
  };
  if (options.orphan) {
    await makeOrphan(fixture);
  } else {
    for (const role of [RoleName.Associate, RoleName.Admin]) {
      const res = await assignRoleToUser(
        orgAdmin().id,
        fixture.roleSetId,
        role
      );
      if (res?.error) {
        throw new Error(`OA ${role}: ${JSON.stringify(res.error)}`);
      }
    }
  }
  return fixture;
};

/**
 * The creator steps down: GA leaves ADMIN first, then ASSOCIATE (a member may
 * always leave). Afterwards nobody holds any organisation role.
 */
export const makeOrphan = async (org: Org): Promise<void> => {
  for (const role of [RoleName.Admin, RoleName.Associate]) {
    const res = await removeRoleFromUser(harnessAdmin().id, org.roleSetId, role);
    if (res?.error) {
      throw new Error(`GA cannot leave ${role}: ${JSON.stringify(res.error)}`);
    }
  }
  const held = await membersOf(harnessAdmin().token, org.roleSetId).catch(
    () => undefined
  );
  // GA now reads as a Support user, which is allowed to read the members.
  if (held) {
    expect(held[RoleName.Associate]).toEqual([]);
    expect(held[RoleName.Admin]).toEqual([]);
    expect(held[RoleName.Owner]).toEqual([]);
  }
};

export const removeOrgs = async (orgs: readonly Org[]): Promise<void> => {
  const failures: string[] = [];
  for (const org of orgs) {
    const res = await deleteOrganization(org.id);
    if (res?.error) failures.push(`${org.nameId}: ${JSON.stringify(res.error)}`);
  }
  if (failures.length > 0) {
    throw new Error(`organisations were left behind:\n${failures.join('\n')}`);
  }
};

export const removeUsers = async (
  users: readonly { id: string; email: string }[]
): Promise<void> => {
  if (users.length === 0) return;
  const { tokens } = await platformRoleUsers();
  await deleteDisposableUsers(tokens.PLATFORM_USERS_ADMIN, users);
};

// ===== audit ==================================================================

export const MCP_OFF_REASON =
  'MCP off: audit half not asserted (the server under test runs with MCP_ENABLED=false)';

export type OrgAdminAuditRow = AuditRecord & {
  details: Record<string, unknown> & {
    action: string;
    roleSetId: string;
  };
};

/** `organization_administration` rows whose SUBJECT is this user, newest first. */
export const orgAdminHistory = async (
  subjectUserId: string
): Promise<{ total: number; entries: OrgAdminAuditRow[] }> => {
  const { tokens } = await platformRoleUsers();
  const { isError, text } = await callAuditTool(tokens.PLATFORM_AUDIT_READER, {
    action: 'user_history',
    subjectUserId,
    category: 'organization_administration',
    limit: 200,
    includeDetails: true,
  });
  if (isError) throw new Error(`analyze_audit_log refused: ${text}`);
  return JSON.parse(text) as { total: number; entries: OrgAdminAuditRow[] };
};

export type ExpectedRow = {
  action: string;
  outcome: 'role_granted' | 'role_revoked' | 'operation_succeeded';
  /** The Support user (or, at accept time, the offerer) the row is attributed to. */
  initiator: string;
  roleSetId: string;
  /** Matched case-insensitively (the server writes lower-case role names). */
  roles?: string[];
  withheldRoles?: string[];
  reason?: string;
  invitationId?: string;
  platformInvitationId?: string;
  applicationId?: string;
};

const matchRow = (entry: OrgAdminAuditRow, expected: ExpectedRow): void => {
  const where = `row ${expected.action}`;
  expect(entry.category, where).toEqual('organization_administration');
  expect(entry.outcome, where).toEqual(expected.outcome);
  expect(entry.initiatorRole, where).toEqual('platform_support');
  expect(entry.initiatorUserId, where).toEqual(expected.initiator);
  expect(entry.details.action, where).toEqual(expected.action);
  expect(entry.details.roleSetId, where).toEqual(expected.roleSetId);
  const lower = (value: unknown): unknown =>
    Array.isArray(value) ? value.map(v => String(v).toLowerCase()) : value;
  if (expected.roles)
    expect(lower(entry.details.roles), where).toEqual(
      expected.roles.map(r => r.toLowerCase())
    );
  if (expected.withheldRoles)
    expect(lower(entry.details.withheldRoles), where).toEqual(
      expected.withheldRoles.map(r => r.toLowerCase())
    );
  if (expected.reason) expect(entry.details.reason, where).toEqual(expected.reason);
  if (expected.invitationId)
    expect(entry.details.invitationId, where).toEqual(expected.invitationId);
  if (expected.platformInvitationId)
    expect(entry.details.platformInvitationId, where).toEqual(
      expected.platformInvitationId
    );
  if (expected.applicationId)
    expect(entry.details.applicationId, where).toEqual(expected.applicationId);
  // FR-017: identifiers only. The MCP tool masks `oldEmail`/`newEmail` and
  // nothing else, so an address anywhere in `details` would surface here.
  expect(JSON.stringify(entry.details), `${where}: no address`).not.toMatch(
    /@/
  );
};

/**
 * The audit assertions of ONE test. Effect assertions stay in the test body and
 * always run; the audit halves are asserted only when the server exposes MCP.
 * `finish()` then turns an unasserted audit half into a visible SKIP (never a
 * silent green).
 */
export const auditScope = () => {
  let unasserted = 0;
  let asserted = 0;
  return {
    /**
     * Runs `act`, then asserts that `subject` gained EXACTLY these rows
     * (listed oldest first), attributed as given. The count is a delta, so a
     * shared persona's history never matters. `expected` may be a function of
     * `act`'s result, for identifiers that exist only once the call has
     * returned (the invitation an invite created).
     */
    async rows<T>(
      subjectUserId: string,
      act: () => Promise<T>,
      expected: ExpectedRow[] | ((result: T) => ExpectedRow[])
    ): Promise<T> {
      if (!MCP_AVAILABLE) {
        unasserted++;
        return act();
      }
      const before = await orgAdminHistory(subjectUserId);
      const result = await act();
      const after = await orgAdminHistory(subjectUserId);
      const rowsExpected =
        typeof expected === 'function' ? expected(result) : expected;
      expect(
        after.total - before.total,
        `audit rows gained by ${subjectUserId}`
      ).toEqual(rowsExpected.length);
      const gained = after.entries.slice(0, rowsExpected.length).reverse();
      rowsExpected.forEach((row, index) => matchRow(gained[index], row));
      asserted++;
      return result;
    },
    /** `rows` with nothing expected. Pair it with a positive row assertion in the same test. */
    async noRow<T>(subjectUserId: string, act: () => Promise<T>): Promise<T> {
      return this.rows(subjectUserId, act, []);
    },
    /** Rows gained by an action, for a plain "nothing was written" read. */
    asserted: () => asserted,
    finish(ctx: { skip: (note?: string) => never }): void {
      if (unasserted > 0) ctx.skip(MCP_OFF_REASON);
    },
  };
};

// ===== loopback Postgres (local stack only) ===================================

export const LOCAL_DB = harnessPostgresConfigured();

export type OrgAuditSqlRow = {
  subjectUserId: string | null;
  initiatorUserId: string | null;
  initiatorRole: string;
  outcome: string;
  details: Record<string, unknown>;
};

/** Every `organization_administration` row of one organisation, oldest first. */
export const orgAuditRowsSql = (organizationId: string) =>
  queryHarnessDb<OrgAuditSqlRow>(
    `SELECT "subjectUserId", "initiatorUserId", "initiatorRole", outcome, details
     FROM platform_audit_entry
     WHERE category = 'organization_administration' AND "subjectOrganizationId" = $1
     ORDER BY "createdDate", "rowId"`,
    [organizationId]
  );
