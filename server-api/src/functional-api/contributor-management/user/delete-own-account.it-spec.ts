/**
 * Hardened self-account-deletion semantics (054-delete-own-account, wave 1).
 *
 * Authored against contracts/deleteuser-self-branch.md,
 * contracts/graphql-account-deletion.md, contracts/audit-account-deletion.md
 * — the server-wave-1 implementation these assertions pin does not exist in
 * this worktree yet (only the `AlkemioErrorStatus` enum entries have
 * landed). Per the plan's rollout ordering this suite executes live at
 * forge-verify against the completed wave-1 stack, not as a build gate;
 * `pnpm --filter @alkemio/test-suite-server-api run lint` (this repo's build
 * gate) only compiles and type-checks it.
 *
 * Covers:
 *   US1 (T302) — happy path: fresh self-deletion succeeds, no post-commit
 *     error, deleteIdentity pin, one surviving self-initiated audit row.
 *   US2 (T303) — per-kind blocker equivalence + truncation at 25.
 *   US4 (T304) — sole-organization-owner protection + admin pass-through.
 *   US3 (T305) — session-freshness gate, including the three fail-closed
 *     cases and the silent-refresh-does-not-count case.
 *   US5 (T306) — external-subscription audit passthrough + post-commit legs
 *     + admin-on-other has no freshness gate.
 */
import {
  deleteInnovationPack,
  deleteSpace,
  deleteVirtualContributor,
  getUserToken,
  queryHarnessDb,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { deleteInnovationHub } from '@functional-api/innovation-hub/innovation-hub-params';
import {
  AccountDeletionBlockerKind,
  addSecondOrganizationOwner,
  countAuditDetailsContainingEmail,
  countInAppNotificationPayloadsContainingEmail,
  createDisposableSelfUser,
  deleteUserAsSelf,
  DisposableSelfUser,
  getMeAccountDeletion,
  getOrganizationOwnerIds,
  getPlatformAuditRowsForUser,
  mintAgedSessionFor,
  mintFreshSessionFor,
  mutateBffSession,
  PRIVILEGED_SESSION_WINDOW_S,
  seedBlockerAccountSpace,
  seedBlockerInnovationHub,
  seedBlockerInnovationPack,
  seedBlockerVirtualContributor,
  seedExternalSubscriptionId,
  seedSoleOrganizationOwner,
} from './delete-own-account.request.params';
import { deleteUserTolerant } from '@functional-api/graphql-guard/me-degradation.request.params';
import { deleteUser as deleteUserAsAdmin } from './user.request.params';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'delete-own-account',
};

const disposableUserIds: string[] = [];

// Populates TestUserManager (admin token etc.) for this worker. Without it the
// suite only passes when another lane file happens to run first — vitest orders
// files by cached duration, so this (longest) file runs first once cached and
// every case fails with `userModelMapType` undefined.
beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

afterAll(async () => {
  for (const userId of disposableUserIds) {
    await deleteUserTolerant(userId);
  }
});

const tracked = async (
  prefix: string
): Promise<DisposableSelfUser> => {
  const user = await createDisposableSelfUser(prefix);
  disposableUserIds.push(user.userId);
  return user;
};

describe('delete-own-account — US1 happy path', () => {
  test('a fresh user with no blockers deletes successfully, is de-identified, and leaves one surviving self-initiated audit row', async () => {
    const user = await tracked('us1-happy');
    const session = await mintFreshSessionFor(user);

    const preflight = await getMeAccountDeletion(session);
    expect(preflight.body.errors).toBeUndefined();
    expect(preflight.body.data?.me.accountDeletion.canDelete).toBe(true);
    expect(preflight.body.data?.me.accountDeletion.sessionFresh).toBe(true);
    expect(preflight.body.data?.me.accountDeletion.blockers).toEqual([]);

    // deleteIdentity: false — the pin (contract §3) still erases the Kratos
    // identity for a SELF caller.
    const deletion = await deleteUserAsSelf(user.userId, session, false);
    expect(deletion.body.errors).toBeUndefined();
    expect(deletion.body.data?.deleteUser.id).toEqual(user.userId);

    await expect(getUserToken(user.email)).rejects.toThrow();

    const remainingUser = await queryHarnessDb<{ id: string }>(
      'SELECT id FROM "user" WHERE id = $1',
      [user.userId]
    );
    expect(remainingUser).toHaveLength(0);

    const remainingAccount = await queryHarnessDb<{ id: string }>(
      'SELECT id FROM account WHERE id = $1',
      [user.accountId]
    );
    expect(remainingAccount).toHaveLength(0);

    const auditRows = await getPlatformAuditRowsForUser(user.userId);
    const primaryRows = auditRows.filter(r => r.outcome === 'account_deleted');
    expect(primaryRows).toHaveLength(1);
    expect(primaryRows[0].category).toEqual('account_deletion');
    expect(primaryRows[0].initiatorRole).toEqual('self');
  });
});

describe('delete-own-account — US2 per-kind blocker equivalence', () => {
  test.each<{
    kind: AccountDeletionBlockerKind;
    seed: (accountId: string) => Promise<string>;
    resolve: (resourceId: string) => Promise<unknown>;
  }>([
    {
      kind: 'ACCOUNT_SPACE',
      seed: seedBlockerAccountSpace,
      resolve: id => deleteSpace(id),
    },
    {
      kind: 'ACCOUNT_VIRTUAL_CONTRIBUTOR',
      seed: seedBlockerVirtualContributor,
      resolve: id => deleteVirtualContributor(id),
    },
    {
      kind: 'ACCOUNT_INNOVATION_PACK',
      seed: seedBlockerInnovationPack,
      resolve: id => deleteInnovationPack(id),
    },
    {
      kind: 'ACCOUNT_INNOVATION_HUB',
      seed: seedBlockerInnovationHub,
      resolve: id => deleteInnovationHub(id),
    },
  ])(
    '$kind blocks self deletion until resolved',
    async ({ kind, seed, resolve }) => {
      const user = await tracked(`us2-${kind.toLowerCase()}`);
      const resourceId = await seed(user.accountId);
      const session = await mintFreshSessionFor(user);

      const blockedPreflight = await getMeAccountDeletion(session);
      expect(blockedPreflight.body.data?.me.accountDeletion.canDelete).toBe(
        false
      );
      const blockerKinds =
        blockedPreflight.body.data?.me.accountDeletion.blockers.map(
          b => b.kind
        ) ?? [];
      expect(blockerKinds).toEqual([kind]);

      const blockedDeletion = await deleteUserAsSelf(user.userId, session);
      const codes = (blockedDeletion.body.errors ?? []).map(
        e => (e as { extensions?: { code?: string } }).extensions?.code
      );
      expect(codes).toContain('ACCOUNT_DELETION_BLOCKED');

      await resolve(resourceId);

      const clearPreflight = await getMeAccountDeletion(session);
      expect(clearPreflight.body.data?.me.accountDeletion.canDelete).toBe(
        true
      );

      const finalDeletion = await deleteUserAsSelf(user.userId, session);
      expect(finalDeletion.body.errors).toBeUndefined();
    }
  );

  test('a truncated blocker list caps at 25, flags truncated, and reports accurate per-kind totals', async () => {
    const user = await tracked('us2-truncation');
    const spaceIds: string[] = [];
    const SPACE_COUNT = 26;
    for (let i = 0; i < SPACE_COUNT; i++) {
      spaceIds.push(await seedBlockerAccountSpace(user.accountId));
    }
    const session = await mintFreshSessionFor(user);

    const preflight = await getMeAccountDeletion(session);
    const accountDeletion = preflight.body.data?.me.accountDeletion;
    expect(accountDeletion?.blockers).toHaveLength(25);
    expect(accountDeletion?.truncated).toBe(true);
    const spaceTotal = accountDeletion?.totals.find(
      t => t.kind === 'ACCOUNT_SPACE'
    );
    expect(spaceTotal?.total).toEqual(SPACE_COUNT);

    for (const spaceId of spaceIds) {
      await deleteSpace(spaceId);
    }
  });
});

describe('delete-own-account — US4 sole organization owner', () => {
  test('a sole owner is blocked on self, unblocked once a second owner exists, and an admin can delete a sole owner directly', async () => {
    const user = await tracked('us4-sole-owner');
    const { organizationId, roleSetId } = await seedSoleOrganizationOwner(
      user.userId
    );
    const session = await mintFreshSessionFor(user);

    const blockedPreflight = await getMeAccountDeletion(session);
    const blocker = blockedPreflight.body.data?.me.accountDeletion.blockers.find(
      b => b.kind === 'SOLE_ORGANIZATION_OWNER'
    );
    expect(blocker).toBeDefined();
    expect(blocker?.selfResolvable).toBe(false);

    const blockedDeletion = await deleteUserAsSelf(user.userId, session);
    const codes = (blockedDeletion.body.errors ?? []).map(
      e => (e as { extensions?: { code?: string } }).extensions?.code
    );
    expect(codes).toContain('ACCOUNT_DELETION_BLOCKED');

    const secondOwner = await tracked('us4-second-owner');
    await addSecondOrganizationOwner(roleSetId, secondOwner.userId);

    const clearPreflight = await getMeAccountDeletion(session);
    expect(
      clearPreflight.body.data?.me.accountDeletion.blockers.some(
        b => b.kind === 'SOLE_ORGANIZATION_OWNER'
      )
    ).toBe(false);

    // Closes both directions of R-10: the blocker disappearing is not
    // itself proof deletion actually proceeds (false positive), and the
    // organization must still have an owner afterwards — never orphaned
    // down to zero (false negative) — the departing user is not among them.
    const finalDeletion = await deleteUserAsSelf(user.userId, session);
    expect(finalDeletion.body.errors).toBeUndefined();

    const remainingOwnerIds = await getOrganizationOwnerIds(organizationId);
    expect(remainingOwnerIds).toEqual([secondOwner.userId]);
  });

  test('the admin branch deletes a sole organization owner directly (support-route pass-through, FR-023)', async () => {
    const soleOwner = await tracked('us4-admin-passthrough');
    await seedSoleOrganizationOwner(soleOwner.userId);

    // The shared GLOBAL_ADMIN teardown helper (contract §6), not the
    // self-branch call — SOLE_ORGANIZATION_OWNER must NOT block the admin
    // branch (contract §5).
    const adminDeletion = await deleteUserAsAdmin(soleOwner.userId);
    expect(adminDeletion.error).toBeUndefined();
    expect(adminDeletion?.data?.deleteUser.id).toEqual(soleOwner.userId);
  });
});

describe('delete-own-account — US3 session freshness gate', () => {
  test('a session older than the privileged window is refused SESSION_REFRESH_REQUIRED and deletes nothing', async () => {
    const user = await tracked('us3-stale');
    const staleSession = await mintAgedSessionFor(
      user,
      PRIVILEGED_SESSION_WINDOW_S + 60
    );

    const preflight = await getMeAccountDeletion(staleSession);
    expect(preflight.body.data?.me.accountDeletion.sessionFresh).toBe(false);

    const deletion = await deleteUserAsSelf(user.userId, staleSession);
    const codes = (deletion.body.errors ?? []).map(
      e => (e as { extensions?: { code?: string } }).extensions?.code
    );
    expect(codes).toContain('SESSION_REFRESH_REQUIRED');

    const remainingUser = await queryHarnessDb<{ id: string }>(
      'SELECT id FROM "user" WHERE id = $1',
      [user.userId]
    );
    expect(remainingUser).toHaveLength(1);
  });

  test('a session with missing, zeroed, or unparseable created_at fails closed', async () => {
    const cases: Array<{
      label: string;
      mutate: (p: Record<string, unknown>) => Record<string, unknown>;
    }> = [
      {
        label: 'missing',
        mutate: p => {
          const rest = { ...p };
          delete rest.created_at;
          return rest;
        },
      },
      { label: 'zeroed', mutate: p => ({ ...p, created_at: 0 }) },
      {
        label: 'unparseable',
        mutate: p => ({ ...p, created_at: 'not-a-number' }),
      },
    ];

    for (const { mutate } of cases) {
      const user = await tracked('us3-failclosed');
      const session = await mintFreshSessionFor(user);
      await mutateBffSession(session.sessionId, mutate);

      const deletion = await deleteUserAsSelf(user.userId, session);
      const codes = (deletion.body.errors ?? []).map(
        e => (e as { extensions?: { code?: string } }).extensions?.code
      );
      expect(codes).toContain('SESSION_REFRESH_REQUIRED');
    }
  });

  test('silent token rotation and idle renewal do not count as re-authentication', async () => {
    const user = await tracked('us3-silent-refresh');
    const staleSession = await mintAgedSessionFor(
      user,
      PRIVILEGED_SESSION_WINDOW_S + 60
    );
    const nowS = Math.floor(Date.now() / 1000);
    await mutateBffSession(staleSession.sessionId, p => ({
      ...p,
      last_refreshed_at: nowS,
      last_extended_at: nowS,
    }));

    const deletion = await deleteUserAsSelf(user.userId, staleSession);
    const codes = (deletion.body.errors ?? []).map(
      e => (e as { extensions?: { code?: string } }).extensions?.code
    );
    expect(codes).toContain('SESSION_REFRESH_REQUIRED');
  });

  test('a freshly minted session (the re-auth round trip analogue) deletes successfully', async () => {
    const user = await tracked('us3-fresh-after-reauth');
    const freshSession = await mintFreshSessionFor(user);

    const deletion = await deleteUserAsSelf(user.userId, freshSession);
    expect(deletion.body.errors).toBeUndefined();
  });
});

describe('delete-own-account — US5 external subscription + post-commit legs', () => {
  test('an active Wingback subscription does not block deletion and its id is captured in the primary audit row', async () => {
    const user = await tracked('us5-subscription');
    const externalSubscriptionId = `wingback-test-054-${UniqueIDGenerator.getID()}`;
    await seedExternalSubscriptionId(user.accountId, externalSubscriptionId);
    const session = await mintFreshSessionFor(user);

    const preflight = await getMeAccountDeletion(session);
    expect(preflight.body.data?.me.accountDeletion.externalSubscriptionLinked).toBe(
      true
    );
    expect(preflight.body.data?.me.accountDeletion.canDelete).toBe(true);

    const deletion = await deleteUserAsSelf(user.userId, session);
    expect(deletion.body.errors).toBeUndefined();

    const auditRows = await getPlatformAuditRowsForUser(user.userId);
    const primary = auditRows.find(r => r.outcome === 'account_deleted');
    expect(primary?.details?.externalSubscriptionID).toEqual(
      externalSubscriptionId
    );
  });

  test('post-commit legs are recorded as their own audited outcomes', async () => {
    const user = await tracked('us5-legs');
    const session = await mintFreshSessionFor(user);

    const deletion = await deleteUserAsSelf(user.userId, session, false);
    expect(deletion.body.errors).toBeUndefined();

    const auditRows = await getPlatformAuditRowsForUser(user.userId);
    const outcomes = auditRows.map(r => r.outcome);
    expect(outcomes).toContain('session_revocation_completed');
    // deleteIdentity: false, and the pin still deletes it — the leg outcome
    // reflects the pinned deletion, not the caller's (ignored) input.
    expect(outcomes).toContain('identity_deletion_completed');
  });

  test('admin-on-other deletion audits initiator_role platform_admin and applies no freshness gate', async () => {
    const target = await tracked('us5-admin-on-other');

    // The ordinary GLOBAL_ADMIN bearer — never carries `issuedAt` at all
    // (only the cookie-session strategy stamps it). If the self branch's
    // freshness gate applied here this call would be refused
    // SESSION_REFRESH_REQUIRED regardless of "staleness"; it succeeding is
    // itself the proof the gate is self-only.
    const deletion = await deleteUserAsAdmin(target.userId);
    expect(deletion.error).toBeUndefined();

    const auditRows = await getPlatformAuditRowsForUser(target.userId);
    const primary = auditRows.find(r => r.outcome === 'account_deleted');
    expect(primary?.initiatorRole).toEqual('platform_admin');
  });

  test('no departed user email survives in any audit details or in-app notification payload', async () => {
    const user = await tracked('us5-pii-strip');
    const session = await mintFreshSessionFor(user);

    const deletion = await deleteUserAsSelf(user.userId, session);
    expect(deletion.body.errors).toBeUndefined();

    expect(await countAuditDetailsContainingEmail(user.email)).toEqual(0);
    expect(
      await countInAppNotificationPayloadsContainingEmail(user.email)
    ).toEqual(0);
  });
});
