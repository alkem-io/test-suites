import {
  applyOrganizationVerificationSequence,
  delay,
  getGraphqlClient,
  getMailsData,
  getUserToken,
  harnessPostgresConfigured,
  postGraphqlRaw,
  queryHarnessDb,
  registerInKratosOrFail,
  TestUser,
  TestUserManager,
  verifyInKratosOrFail,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import type {
  InviteForEntryRoleOnRoleSetMutation,
  RoleSetApplicationsInvitationsQuery,
  RoleSetPendingPlatformInvitationsQuery,
} from '@alkemio/tests-lib/core/generated/graphql';
import type { MailItem } from '@alkemio/tests-lib';
import {
  assignUserRoleOnOrganization,
  cleanUpTestOrganizations,
  createTestOrganization,
  deletePersonasByEmail,
  registerPersona,
  runSuffix,
  setOrganizationMembershipSettings,
  type OrgFixture,
} from '../organization-user-associates/organization-user-associates.helpers';

/**
 * Local GraphQL/mailbox helpers for the organization email invitation
 * acceptance walks. Built on the organization-user-associates helper file: organizations, role grants and persona teardown are reused from
 * there; this file adds what the email-invitation walks need on top — the
 * email-invite, resend, revoke and lookup calls (the generated
 * `@alkemio/tests-lib` SDK, run with a persona's bearer token so a freshly
 * registered persona can act), a verified-domain organization, MailSlurper
 * reads scoped to one address, and a registration path that resolves the
 * Alkemio user.
 *
 * Every mail assertion is a per-address DELTA (count before, act, count after):
 * invitee addresses are unique per run, so no walk needs to prune the shared
 * mailbox and no walk reads another walk's mail.
 */

export {
  assignUserRoleOnOrganization,
  cleanUpTestOrganizations,
  createTestOrganization,
  deletePersonasByEmail,
  registerPersona,
  runSuffix,
  TestUser,
  TestUserManager,
  getUserToken,
  postGraphqlRaw,
  type OrgFixture,
};

export const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/** The exact subject of the organization email (notifications template). */
export const organizationInvitationSubject = (organizationName: string) =>
  `You are invited to join ${organizationName} on Alkemio`;

/** The server's default resend window (seconds). */
export const DEFAULT_RESEND_COOLDOWN_SECONDS = 300;

/**
 * The resend cooldown the stack under test runs with. The server keeps one
 * window per role set and address and reads it from
 * PLATFORM_INVITATION_RESEND_COOLDOWN_SECONDS; the harness that boots the stack
 * sets the same variable for this process so a walk can wait the window out.
 * Falls back to the server default when unset or not a positive integer.
 */
export const resendCooldownSeconds = (): number => {
  const configured = Number(process.env.PLATFORM_INVITATION_RESEND_COOLDOWN_SECONDS);
  return Number.isInteger(configured) && configured >= 1 ? configured : DEFAULT_RESEND_COOLDOWN_SECONDS;
};

export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── Registration ─────────────────────────────────────────────────────────

export type RegisteredUser = {
  email: string;
  token: string;
  id: string;
  displayName: string;
  firstName: string;
};

/**
 * Registers + verifies a real identity (Kratos) at an arbitrary address and
 * resolves the Alkemio user behind it. The first authenticated `me` call is
 * what finalizes registration server-side (domain auto-join, conversion of open
 * invitations), so the conversion has happened by the time this returns.
 * Idempotent on "identity already exists" — a persona the authenticated-session
 * fixture already provisioned is simply read back.
 */
export const registerUserAtAddress = async (email: string, firstName: string): Promise<RegisteredUser> => {
  let verificationFlowId: string | undefined;
  try {
    ({ verificationFlowId } = await registerInKratosOrFail(firstName, 'E2E', email));
  } catch {
    // already registered — verification below is idempotent
  }
  await verifyInKratosOrFail(email, verificationFlowId);
  const token = await getUserToken(email);
  const me = await postGraphqlRaw<{ me: { user: { id: string; profile: { displayName: string } } } }>(
    'query { me { user { id profile { displayName } } } }',
    { bearerToken: token }
  );
  const id = me.body.data?.me.user.id;
  const displayName = me.body.data?.me.user.profile.displayName;
  if (!id || !displayName) {
    throw new Error(`registerUserAtAddress(${email}) produced no user: ${me.raw}`);
  }
  return { email, token, id, displayName, firstName };
};

/** The platform admin's bearer token (the harness persona, never a UI session). */
export const adminToken = async (): Promise<string> => {
  await TestUserManager.populateUserModelMap();
  return getUserToken(TestUserManager.users.globalAdmin.email);
};

// ─── Organization with a verified domain and the join switch on ───────────

/**
 * An organization whose domain is `domain`, manually verified, with "users
 * matching this domain may join" on — the exact precondition under which a
 * registration would auto-join a matching address. Registered with the organization
 * fixture registry so `cleanUpTestOrganizations` removes it.
 */
export const createDomainJoinOrganization = async (label: string, domain: string): Promise<OrgFixture> => {
  const org = await createTestOrganization(label, runSuffix);
  const token = await adminToken();

  const update = await postGraphqlRaw<{ updateOrganization: { id: string } }>(
    `mutation($id: UUID!, $domain: String!) {
      updateOrganization(organizationData: { ID: $id, domain: $domain }) { id }
    }`,
    { bearerToken: token, variables: { id: org.id, domain } }
  );
  if ((update.body.errors ?? []).length > 0) {
    throw new Error(`setting domain on ${org.id} failed: ${update.raw}`);
  }

  await setOrganizationMembershipSettings(org.id, { allowUsersMatchingDomainToJoin: true });

  const verification = await postGraphqlRaw<{ organization: { verification: { id: string } } }>(
    'query($id: UUID!) { organization(ID: $id) { verification { id } } }',
    { bearerToken: token, variables: { id: org.id } }
  );
  const verificationId = verification.body.data?.organization.verification.id;
  if (!verificationId) throw new Error(`no verification id for ${org.id}: ${verification.raw}`);
  await applyOrganizationVerificationSequence(verificationId, ['VERIFICATION_REQUEST', 'MANUALLY_VERIFY']);

  const status = await postGraphqlRaw<{ organization: { verification: { status: string } } }>(
    'query($id: UUID!) { organization(ID: $id) { verification { status } } }',
    { bearerToken: token, variables: { id: org.id } }
  );
  if (status.body.data?.organization.verification.status !== 'VERIFIED_MANUAL_ATTESTATION') {
    throw new Error(`organization ${org.id} is not verified: ${status.raw}`);
  }
  return org;
};

// ─── Email-invitation API (generated SDK, persona bearer token) ───────────

type Sdk = ReturnType<typeof getGraphqlClient>;

export type ApiResult<T> = { data: T | undefined; errors: Array<{ message?: string; extensions?: { code?: string } }>; raw: string };

/**
 * Runs one generated-SDK operation (`@alkemio/tests-lib`, the documents under
 * `lib/src/scenario/graphql`) as the holder of `bearerToken`, so a freshly
 * registered persona can act, and normalizes the outcome: graphql-request
 * throws on GraphQL errors, here they come back as `errors` beside the data
 * with `raw` for assertion messages, the shape every walk asserts on.
 */
const asPersona = async <T>(
  bearerToken: string,
  call: (sdk: Sdk, headers: { authorization: string }) => Promise<{ data: T }>
): Promise<ApiResult<T>> => {
  try {
    const { data } = await call(getGraphqlClient(), { authorization: `Bearer ${bearerToken}` });
    return { data, errors: [], raw: JSON.stringify(data) };
  } catch (error) {
    const response = (error as { response?: { data?: T | null; errors?: ApiResult<T>['errors'] } }).response;
    return {
      data: response?.data ?? undefined,
      errors: response?.errors ?? [{ message: String(error) }],
      raw: JSON.stringify(response ?? String(error)),
    };
  }
};

export const errorCodeOf = (result: { errors: ApiResult<unknown>['errors'] }): string | undefined =>
  result.errors[0]?.extensions?.code;

export type InviteOutcome = InviteForEntryRoleOnRoleSetMutation['inviteForEntryRoleOnRoleSet'][number];

/** `inviteForEntryRoleOnRoleSet` with both pickable actors and typed emails. */
export const inviteRaw = async (
  roleSetID: string,
  bearerToken: string,
  options: {
    actorIds?: string[];
    emails?: string[];
    roles?: RoleName[];
    message?: string;
    language?: string;
  }
): Promise<ApiResult<InviteForEntryRoleOnRoleSetMutation>> =>
  asPersona(bearerToken, (sdk, headers) =>
    sdk.InviteForEntryRoleOnRoleSet(
      {
        roleSetId: roleSetID,
        invitedActorIds: options.actorIds ?? [],
        invitedUserEmails: options.emails ?? [],
        extraRoles: options.roles ?? [],
        welcomeMessage: options.message ?? `E2E invitation ${runSuffix}`,
        suggestedLanguage: options.language,
      },
      headers
    )
  );

export type OpenEmailInvitation = NonNullable<
  RoleSetPendingPlatformInvitationsQuery['lookup']['roleSet']
>['platformInvitations'][number];

/** The role set's OPEN email invitations (the list the pending tables render). */
export const listOpenEmailInvitations = async (
  roleSetId: string,
  bearerToken: string
): Promise<ApiResult<{ lookup: { roleSet: { platformInvitations: OpenEmailInvitation[] } } }>> => {
  const res = await asPersona(bearerToken, (sdk, headers) => sdk.RoleSetPendingPlatformInvitations({ roleSetId }, headers));
  return {
    ...res,
    data: res.data ? { lookup: { roleSet: { platformInvitations: res.data.lookup.roleSet?.platformInvitations ?? [] } } } : undefined,
  };
};

export const openEmailAddresses = async (roleSetId: string, bearerToken: string): Promise<string[]> => {
  const res = await listOpenEmailInvitations(roleSetId, bearerToken);
  if (res.errors.length > 0) throw new Error(`listing open email invitations failed: ${res.raw}`);
  return (res.data?.lookup.roleSet.platformInvitations ?? []).map(p => p.email);
};

export type RoleSetInvitationRow = NonNullable<RoleSetApplicationsInvitationsQuery['lookup']['roleSet']>['invitations'][number];

/** The role set's regular invitations — where a registered email invitee lands. */
export const listInvitations = async (roleSetId: string, bearerToken: string): Promise<RoleSetInvitationRow[]> => {
  const res = await asPersona(bearerToken, (sdk, headers) => sdk.RoleSetApplicationsInvitations({ roleSetId }, headers));
  if (res.errors.length > 0) throw new Error(`listing invitations failed: ${res.raw}`);
  return res.data?.lookup.roleSet?.invitations ?? [];
};

export const deleteEmailInvitationRaw = async (id: string, bearerToken: string) =>
  asPersona(bearerToken, (sdk, headers) => sdk.DeletePlatformInvitation({ invitationId: id }, headers));

export const resendEmailInvitationRaw = async (id: string, bearerToken: string) =>
  asPersona(bearerToken, (sdk, headers) => sdk.ResendPlatformInvitation({ invitationId: id }, headers));

/** One platform invitation by id — the read that still answers for a consumed
 * row (`createdBy` is deliberately not selected: it fails once the inviter's
 * account is gone, see `lookupEmailInvitationCreatedBy`). */
export const lookupEmailInvitationRaw = async (id: string, bearerToken: string) =>
  asPersona(bearerToken, (sdk, headers) => sdk.LookupPlatformInvitation({ invitationId: id }, headers));

/** The recorded inviter through the API. `createdBy` is non-null, so once that
 * account is deleted the field fails and `createdBy?.id` is undefined — which
 * is the point: a resend that rewrote the inviter to the resender would
 * resolve to that admin instead, so "not the resender" is checkable anywhere. */
export const lookupEmailInvitationCreatedBy = async (id: string, bearerToken: string) =>
  asPersona(bearerToken, (sdk, headers) => sdk.LookupPlatformInvitationCreatedBy({ invitationId: id }, headers));

/** The recorded inviter, read straight from the table: through the API it
 * does not resolve once that account is deleted. Undefined when the harness
 * cannot reach Postgres (remote targets). */
export const recordedInviterId = async (platformInvitationId: string): Promise<string | undefined> => {
  if (!harnessPostgresConfigured()) return undefined;
  const rows = await queryHarnessDb<{ createdBy: string }>(
    'SELECT "createdBy" FROM platform_invitation WHERE id = $1',
    [platformInvitationId]
  );
  return rows[0]?.createdBy;
};

export const getUserIdsInRole = async (roleSetId: string, role: RoleName, bearerToken: string): Promise<string[]> => {
  const res = await asPersona(bearerToken, (sdk, headers) => sdk.GetRoleSetUsersInRoles({ roleSetId, roles: [role] }, headers));
  if (res.errors.length > 0) throw new Error(`usersInRoles(${role}) failed: ${res.raw}`);
  return (res.data?.lookup.roleSet?.usersInRoles ?? []).flatMap(r => r.users.map(u => u.id));
};

// ─── MailSlurper (per-address) ────────────────────────────────────────────

export type { MailItem };

/** How often the inbox is re-read while a walk waits on mail. */
const MAIL_POLL_MS = 500;
/** Delivery is fire-and-forget: "no (more) mail" only means something once
 * nothing new has arrived for the address for this long, and "exactly N" only
 * once the count has held for this long. The same quiet period the server-api
 * suite uses for the same claims (`platform-invitation.helpers.ts`). */
export const MAIL_QUIET_MS = 4_000;
/** Upper bound on waiting for mail that is expected to arrive at all. */
export const MAIL_DELIVERY_TIMEOUT_MS = 45_000;

export const mailsTo = async (address: string): Promise<MailItem[]> => {
  const [items] = (await getMailsData()) as [MailItem[], number];
  return items.filter(m => m.toAddresses?.some(a => a.toLowerCase() === address.toLowerCase()));
};

/** Waits until at least `count` mails to `address` exist (or the timeout passes)
 * and returns them. Returns whatever was found, so the caller's own assertion
 * carries the failure message. */
export const waitForMailsTo = async (
  address: string,
  count: number,
  timeoutMs = MAIL_DELIVERY_TIMEOUT_MS
): Promise<MailItem[]> => {
  const deadline = Date.now() + timeoutMs;
  let found = await mailsTo(address);
  while (found.length < count && Date.now() < deadline) {
    await delay(MAIL_POLL_MS);
    found = await mailsTo(address);
  }
  return found;
};

/**
 * Polls the mails to `address` until there are `expected` of them and that
 * number has held for a full quiet period — the one read behind every exact
 * count and every "no more mail" claim in these walks. More than `expected`
 * ends the poll at once (the claim is already broken, there is nothing left to
 * wait for); fewer keeps polling until the delivery bound. Without `expected`
 * it simply waits for the address's mail to stop changing, for a settled
 * baseline. Returns whatever is there at the end, so the caller's own assertion
 * carries the message.
 */
export const settledMailsTo = async (address: string, expected?: number): Promise<MailItem[]> => {
  const deadline = Date.now() + MAIL_DELIVERY_TIMEOUT_MS;
  let found = await mailsTo(address);
  let stableSince = Date.now();
  for (;;) {
    const now = Date.now();
    if (expected !== undefined && found.length > expected) return found;
    if ((expected === undefined || found.length >= expected) && now - stableSince >= MAIL_QUIET_MS) return found;
    if (now >= deadline) return found;
    await delay(MAIL_POLL_MS);
    const next = await mailsTo(address);
    if (next.length !== found.length) stableSince = Date.now();
    found = next;
  }
};

/** Undoes quoted-printable transfer encoding so links and markup match as written. */
export const decodeMailBody = (body: string | undefined): string =>
  (body ?? '').replace(/=\r?\n/g, '').replace(/=3D/gi, '=').replace(/=20/g, ' ');

/** The call-to-action link of the organization email (the invitations entry point). */
export const invitationLinkFromMail = (body: string | undefined): string | undefined =>
  decodeMailBody(body).match(/href="([^"]*dialog=invitations[^"]*)"/)?.[1]?.replace(/&amp;/g, '&');

/** Personas whose addresses an invitation walk invented and that may exist by teardown. */
export const teardownAddresses = async (emails: string[]): Promise<string[]> =>
  deletePersonasByEmail(emails.filter(Boolean));

export { RoleName };
