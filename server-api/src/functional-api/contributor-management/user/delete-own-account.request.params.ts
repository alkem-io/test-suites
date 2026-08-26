/**
 * Fixtures and request helpers for the self-account-deletion hardened
 * semantics (054-delete-own-account, contracts/deleteuser-self-branch.md,
 * contracts/graphql-account-deletion.md, contracts/audit-account-deletion.md).
 *
 * Reuses `createDisposableVerifiedUser` / `deleteUserTolerant` from the
 * graphql-guard stream (server#6315's session-orphan work already needed the
 * same "a Kratos identity + Alkemio user that exists only to be deleted"
 * shape) rather than a third parallel implementation — see
 * `deleted-user-session-orphan.it-spec.ts` for the precedent of importing
 * across these two directories.
 */
import { createOrganization as createOrganizationLocal } from '@functional-api/contributor-management/organization/organization.request.params';
import { createInnovationHub } from '@functional-api/innovation-hub/innovation-hub-params';
import {
  createDisposableVerifiedUser,
  DisposableUser,
} from '@functional-api/graphql-guard/me-degradation.request.params';
import {
  assignRoleToUser,
  removeRoleFromUser,
} from '@functional-api/roleset/roles-request.params';
import {
  createInnovationPack,
  createVirtualContributor,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { createSpaceBasicData } from '@alkemio/tests-lib';
import { getUserData } from './user.request.params';
import {
  getMeAccountDeletion,
  deleteUserAsSelf,
  meAccountDeletionQuery,
  MeAccountDeletionData,
  AccountDeletionBlockerKind,
  RawAuth,
  postGraphqlRaw,
} from '@alkemio/tests-lib';
import { mintBffSessionForUser } from '@alkemio/tests-lib';
import {
  ageBffSessionCreatedAt,
  mutateBffSession,
} from '@alkemio/tests-lib';
import { queryHarnessDb } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { getGraphqlClient, TestUserManager } from '@alkemio/tests-lib';

/** contracts/deleteuser-self-branch.md §2 — 15-minute privileged window,
 * mirrored here (not imported — test-suites has no dependency on the
 * server's source tree) so the it-specs can construct "just inside" /
 * "just outside" `created_at` values without a magic number. */
export const PRIVILEGED_SESSION_WINDOW_S = 15 * 60;

export type DisposableSelfUser = DisposableUser & {
  accountId: string;
};

/** A disposable Kratos+Alkemio identity plus its own account id — the shape
 * every self-branch fixture needs (blockers, the Wingback subscription seed,
 * and the BFF session are all keyed off one or the other). */
export const createDisposableSelfUser = async (
  prefix = 'delete-own-account'
): Promise<DisposableSelfUser> => {
  const disposable = await createDisposableVerifiedUser(prefix);
  const userData = await getUserData(disposable.userId, TestUser.GLOBAL_ADMIN);
  const accountId = userData?.data?.user?.account?.id;
  if (!accountId) {
    throw new Error(
      `createDisposableSelfUser: no account.id resolved for user '${disposable.userId}'`
    );
  }
  return { ...disposable, accountId };
};

/** Mints a fresh (right-now) BFF cookie session for the disposable user —
 * the auth a happy-path self `deleteUser` call needs, since the bearer path
 * never stamps `ActorContext.issuedAt` (contracts/deleteuser-self-branch.md
 * §2 — the harness's non-interactive-login bearer is deliberately never
 * "self session freshness"-eligible, only the cookie path is). */
export const mintFreshSessionFor = async (
  user: DisposableSelfUser
): Promise<RawAuth & { sessionId: string }> => {
  const minted = await mintBffSessionForUser(user.email, user.userId);
  return { cookieHeader: minted.cookieHeader, sessionId: minted.sessionId };
};

/** Mints a BFF session already `createdAtEpochS` in the past — the US3
 * negative-case entry point (contracts/deleteuser-self-branch.md §2). */
export const mintAgedSessionFor = async (
  user: DisposableSelfUser,
  ageSeconds: number
): Promise<RawAuth & { sessionId: string }> => {
  const createdAtEpochS = Math.floor(Date.now() / 1000) - ageSeconds;
  const minted = await mintBffSessionForUser(user.email, user.userId, {
    createdAtEpochS,
  });
  return { cookieHeader: minted.cookieHeader, sessionId: minted.sessionId };
};

export {
  getMeAccountDeletion,
  deleteUserAsSelf,
  meAccountDeletionQuery,
  ageBffSessionCreatedAt,
  mutateBffSession,
};
export type { MeAccountDeletionData, RawAuth, AccountDeletionBlockerKind };

// ---------------------------------------------------------------------------
// Blocker fixtures — contracts/deleteuser-self-branch.md §5 / graphql-account-
// deletion.md §1 AccountDeletionBlockerKind. Each seeds exactly one blocking
// resource on the disposable user's OWN account, run as GLOBAL_ADMIN (the
// disposable user is not a `TestUser` persona, so it cannot drive these
// scenario-setup mutations itself — only the resulting blocker/session state
// needs to be observed AS the disposable user).
// ---------------------------------------------------------------------------

export const seedBlockerAccountSpace = async (
  accountId: string
): Promise<string> => {
  const uniqueId = UniqueIDGenerator.getID();
  const res = await createSpaceBasicData(
    `del-blocker-space-${uniqueId}`,
    `del-blocker-space-${uniqueId}`,
    accountId
  );
  const id = res?.data?.createSpace?.id;
  if (!id) {
    throw new Error(
      `seedBlockerAccountSpace: createSpaceBasicData failed — ${JSON.stringify(res?.error)}`
    );
  }
  return id;
};

export const seedBlockerVirtualContributor = async (
  accountId: string
): Promise<string> => {
  const uniqueId = UniqueIDGenerator.getID();
  const res = await createVirtualContributor(accountId, {
    profileDisplayName: `del-blocker-vc-${uniqueId}`,
  });
  const id = res?.data?.createVirtualContributor?.id;
  if (!id) {
    throw new Error(
      `seedBlockerVirtualContributor: createVirtualContributor failed — ${JSON.stringify(res?.error)}`
    );
  }
  return id;
};

export const seedBlockerInnovationPack = async (
  accountId: string
): Promise<string> => {
  const uniqueId = UniqueIDGenerator.getID();
  const res = await createInnovationPack(
    accountId,
    `del-blocker-pack-${uniqueId}`,
    `del-blocker-pack-${uniqueId}`
  );
  const id = res?.data?.createInnovationPack?.id;
  if (!id) {
    throw new Error(
      `seedBlockerInnovationPack: createInnovationPack failed — ${JSON.stringify(res?.error)}`
    );
  }
  return id;
};

export const seedBlockerInnovationHub = async (
  accountId: string
): Promise<string> => {
  const res = await createInnovationHub(accountId);
  const id = res?.data?.createInnovationHub?.id;
  if (!id) {
    throw new Error(
      `seedBlockerInnovationHub: createInnovationHub failed — ${JSON.stringify(res?.error)}`
    );
  }
  return id;
};

/**
 * Makes `userId` the SOLE OWNER of a fresh organization: create as
 * GLOBAL_ADMIN, assign OWNER to `userId`, then strip OWNER from every OTHER
 * holder the platform assigned by default. Deterministic regardless of
 * whichever default owner-assignment behaviour organization creation has —
 * the invariant this fixture cares about is "sole owner", not "who created
 * it".
 */
export const seedSoleOrganizationOwner = async (
  userId: string
): Promise<{ organizationId: string; roleSetId: string }> => {
  const uniqueId = UniqueIDGenerator.getID();
  const created = await createOrganizationLocal(
    `del-owner-org-${uniqueId}`,
    `del-owner-org-${uniqueId}`
  );
  const organizationId = created?.data?.createOrganization?.id;
  const roleSetId = created?.data?.createOrganization?.roleSet?.id;
  if (!organizationId || !roleSetId) {
    throw new Error(
      `seedSoleOrganizationOwner: createOrganization failed — ${JSON.stringify(created?.error)}`
    );
  }

  await assignRoleToUser(userId, roleSetId, RoleName.Owner);

  const currentOwnerIds = await getOrganizationOwnerIds(organizationId);
  for (const ownerId of currentOwnerIds) {
    if (ownerId !== userId) {
      await removeRoleFromUser(ownerId, roleSetId, RoleName.Owner);
    }
  }

  return { organizationId, roleSetId };
};

/** Adds a second OWNER to an org already seeded by
 * `seedSoleOrganizationOwner` — the "no longer sole owner" resolution case
 * (contracts/deleteuser-self-branch.md §5, US4-AS2). */
export const addSecondOrganizationOwner = async (
  roleSetId: string,
  secondOwnerUserId: string
): Promise<void> => {
  await assignRoleToUser(secondOwnerUserId, roleSetId, RoleName.Owner);
};

/** No selection in `OrganizationData` parameterises `usersInRole` by role
 * (it is fixed to `ASSOCIATE`), so this is a small standalone raw query
 * rather than the codegen'd `getOrganizationData` helper. */
const getOrganizationOwnerIds = async (
  organizationId: string
): Promise<string[]> => {
  const bearerToken = TestUserManager.getUserModelByType(
    TestUser.GLOBAL_ADMIN
  ).authToken;
  const query = `
    query DeleteOwnAccountOrganizationOwners($organizationId: UUID!) {
      organization(ID: $organizationId) {
        roleSet {
          usersInRole(role: OWNER) {
            id
          }
        }
      }
    }
  `;
  const response = await postGraphqlRaw<{
    organization: { roleSet: { usersInRole: Array<{ id: string }> } };
  }>(query, { bearerToken, variables: { organizationId } });
  return (
    response.body.data?.organization.roleSet.usersInRole.map(u => u.id) ?? []
  );
};

/** quickstart.md §4 — no GraphQL mutation exists for
 * `account.externalSubscriptionID`; it is service-internal to the Wingback
 * license flow. Seeded by direct SQL, exactly as documented there. */
export const seedExternalSubscriptionId = async (
  accountId: string,
  externalSubscriptionId: string
): Promise<void> => {
  await queryHarnessDb(
    'UPDATE account SET "externalSubscriptionID" = $1 WHERE id = $2',
    [externalSubscriptionId, accountId]
  );
};

/** contracts/audit-account-deletion.md §2/§3 — one row per outcome, keyed by
 * `subjectUserId`. Read directly: no GraphQL surface exposes audit rows to a
 * non-admin caller, and the it-specs need the departed user's own audit
 * trail after their account (and any admin-facing query permission) is
 * gone. */
export type PlatformAuditRow = {
  category: string;
  subjectUserId: string;
  initiatorUserId: string | null;
  initiatorRole: string;
  outcome: string;
  details: Record<string, unknown> | null;
  createdDate: string;
};

export const getPlatformAuditRowsForUser = async (
  subjectUserId: string
): Promise<PlatformAuditRow[]> =>
  queryHarnessDb<PlatformAuditRow>(
    `SELECT category, "subjectUserId", "initiatorUserId", "initiatorRole", outcome, details, "createdDate"
     FROM platform_audit_entry
     WHERE "subjectUserId" = $1
     ORDER BY "createdDate" ASC`,
    [subjectUserId]
  );

/** contracts/audit-account-deletion.md §4 — the PII-free assertion needs a
 * platform-wide scan (the deletion may have written a row addressed to an
 * admin, not the subject), keyed by the departed user's email so a caller
 * can assert it appears in zero `details` payloads. */
export const countAuditDetailsContainingEmail = async (
  email: string
): Promise<number> => {
  const rows = await queryHarnessDb<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM platform_audit_entry
     WHERE details::text ILIKE $1`,
    [`%${email}%`]
  );
  return Number(rows[0]?.count ?? '0');
};

export const countInAppNotificationPayloadsContainingEmail = async (
  email: string
): Promise<number> => {
  const rows = await queryHarnessDb<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM in_app_notification
     WHERE payload::text ILIKE $1`,
    [`%${email}%`]
  );
  return Number(rows[0]?.count ?? '0');
};

/** Re-exported for callers that need to hand-roll a raw query with a
 * `TestUser` persona's bearer (e.g. the organization-owners probe above). */
export { getGraphqlClient };
