/**
 * Self-service account deletion (server#6416, client-web#10231) — the
 * **portable delta** after reconciling with test-suites#620
 * (workspace#054, client-web#10107).
 *
 * PR #620 covers the self branch thoroughly, but every one of its cases needs
 * a loopback compose stack (its Postgres/Redis/session-minting primitives
 * refuse a non-loopback target) and its specs are excluded from `nightly`.
 * This file is deliberately portable — no DB, no Redis, no session minting,
 * no `SESSION_SIGNING_KEY` — so it runs wherever the suite runs, including
 * nightly.
 *
 * ⚠ Named `account-deletion-portable` rather than `delete-own-account-portable`
 * (the build sheet's suggestion) because it would still be swallowed by
 * #620's own `vitest.config.ts` nightly-exclusion glob
 * (`delete-own-account*.it-spec.ts`), which matches on a prefix. Flag this to
 * the #620 reviewer: the two branches' filenames still collide in *intent*
 * (both cover "self deletion, portably") even though they no longer collide
 * in name.
 *
 * **The fact TC-01/TC-18 rest on.** `actorContext.issuedAt` is populated only
 * by `cookie-session.strategy.ts` from the BFF session's `created_at`. The
 * non-interactive-login bearer this suite runs over never sets it, and the
 * self-branch session-age gate fails closed on `undefined` — and runs
 * *before* the authorization/blocker checks. So over a bearer, a self
 * `deleteUser` is always refused `SESSION_REFRESH_REQUIRED`; that is not a
 * harness limitation, it is the fail-closed condition reached naturally.
 */
import {
  createDisposableVerifiedUser,
  deleteUserTolerant,
  deleteUserWithOptions,
  meUserQuery,
  MeUserData,
  postGraphqlRaw,
} from '@functional-api/graphql-guard/me-degradation.request.params';
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  assignLicensePlanToAccount,
  getLicensePlanByName,
} from '@functional-api/license/license.params.request';
import { deleteSpace } from '@functional-api/journey/space/space.request.params';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'account-deletion-portable',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

/** `me.accountDeletion` — new surface, absent from the generated client on
 * develop (lib's codegen has zero `accountDeletion` hits), so it goes in as
 * a raw document rather than through the generated SDK. */
const accountDeletionPreflightQuery = `
  query AccountDeletionPreflight {
    me {
      accountDeletion {
        canDelete
        sessionFresh
        truncated
        externalSubscriptionLinked
        blockers {
          kind
          resourceID
          displayName
          url
          selfResolvable
        }
        totals {
          kind
          total
        }
      }
    }
  }
`;

type AccountDeletionPreflightData = {
  me: {
    accountDeletion: {
      canDelete: boolean;
      sessionFresh: boolean;
      truncated: boolean;
      externalSubscriptionLinked: boolean;
      blockers: Array<{
        kind: string;
        resourceID: string;
        displayName: string;
        url: string | null;
        selfResolvable: boolean;
      }>;
      totals: Array<{ kind: string; total: number }>;
    };
  };
};

/** Raw self-service `deleteUser` — same mutation the admin path uses; the
 * self/admin branch is derived server-side from
 * `actorContext.actorID === deleteData.ID`, never from a separate field. */
const deleteUserRawMutation = `
  mutation DeleteUserRaw($deleteData: DeleteUserInput!) {
    deleteUser(deleteData: $deleteData) {
      id
    }
  }
`;

type DeleteUserRawData = { deleteUser: { id: string } | null };

/** Fetches the caller's own personal-account ID, so TC-05 can seed a Space the
 * disposable subject genuinely owns (not an admin-provisioned one). */
const meAccountQuery = `
  query MeAccountForSeed {
    me {
      user {
        account {
          id
        }
      }
    }
  }
`;

type MeAccountData = { me: { user: { account: { id: string } } | null } };

const createSpaceRawMutation = `
  mutation CreateSpaceRaw($spaceData: CreateSpaceOnAccountInput!) {
    createSpace(spaceData: $spaceData) {
      id
    }
  }
`;

type CreateSpaceRawData = { createSpace: { id: string } };

// No token material may appear on a response surface — same marker list
// SRA-N1 (deleted-user-session-orphan.it-spec.ts) scans for.
const TOKEN_MATERIAL_MARKERS = [
  'access_token',
  'id_token',
  'refresh_token',
  'Bearer ',
  'alkemio_session',
  'terminated_at',
  'alkemio:sid:',
  'alkemio:sub:',
];

describe('account deletion — portable delta (054)', () => {
  // TC-01 -----------------------------------------------------------------
  test('TC-01 — a raw-API self-deletion cannot bypass the session-age gate', async () => {
    const subject = await createDisposableVerifiedUser('del-fc');
    try {
      const deletionResponse = await postGraphqlRaw<DeleteUserRawData>(
        deleteUserRawMutation,
        subject.token,
        { deleteData: { ID: subject.userId, deleteIdentity: true } }
      );

      // HTTP 200 carrying a GraphQL error — assert on body.errors, never status.
      expect(deletionResponse.status).toEqual(200);
      expect(deletionResponse.body.errors?.[0]?.extensions).toMatchObject({
        code: 'SESSION_REFRESH_REQUIRED',
      });
      expect(deletionResponse.body.data?.deleteUser ?? null).toBeNull();
      for (const marker of TOKEN_MATERIAL_MARKERS) {
        expect(deletionResponse.raw).not.toContain(marker);
      }

      // Nothing was deleted — the subject's own bearer still resolves.
      const meProbe = await postGraphqlRaw<MeUserData>(
        meUserQuery,
        subject.token
      );
      expect(meProbe.body.errors).toBeUndefined();
      expect(meProbe.body.data?.me.user?.id).toEqual(subject.userId);
    } finally {
      await deleteUserTolerant(subject.userId);
    }
  });

  // TC-02 -----------------------------------------------------------------
  test('TC-02 — the preflight answers over a bearer and reports the session as not fresh', async () => {
    const subject = await createDisposableVerifiedUser('del-preflight');
    try {
      const preflight = await postGraphqlRaw<AccountDeletionPreflightData>(
        accountDeletionPreflightQuery,
        subject.token
      );

      // Not refused, even though the mutation would be — the preflight is
      // advisory, not gated (FR-005).
      expect(preflight.body.errors).toBeUndefined();
      const accountDeletion = preflight.body.data?.me.accountDeletion;
      expect(accountDeletion).toBeDefined();
      expect(accountDeletion?.canDelete).toEqual(true);
      expect(accountDeletion?.blockers).toEqual([]);
      expect(accountDeletion?.truncated).toEqual(false);
      expect(accountDeletion?.externalSubscriptionLinked).toEqual(false);
      // The exact contract point (FR-010): canDelete alone is not enough.
      expect(accountDeletion?.sessionFresh).toEqual(false);
      // Emitted only on the self branch — its presence is itself evidence
      // the branch was correctly derived as self.
      expect(accountDeletion?.totals).toContainEqual({
        kind: 'SOLE_ORGANIZATION_OWNER',
        total: 0,
      });
    } finally {
      await deleteUserTolerant(subject.userId);
    }
  });

  // TC-05 -----------------------------------------------------------------
  test('TC-05 — the admin blocked path keeps its pre-existing exception shape', async () => {
    const subject = await createDisposableVerifiedUser('del-admin-block');
    const uniqueId = UniqueIDGenerator.getID();
    let spaceID: string | undefined;
    try {
      const accountProbe = await postGraphqlRaw<MeAccountData>(
        meAccountQuery,
        subject.token
      );
      const accountID = accountProbe.body.data?.me.user?.account.id;
      expect(accountID).toBeTruthy();

      // A freshly registered personal account carries zero free-space
      // entitlement on this environment — grant the plan the platform's own
      // entitlements suite uses (organization-entitlements.it-spec.ts) so the
      // account can hold the one Space this case needs.
      const plusPlan = await getLicensePlanByName('ACCOUNT_LICENSE_PLUS');
      expect(plusPlan[0]?.id).toBeTruthy();
      await assignLicensePlanToAccount(accountID as string, plusPlan[0].id);

      const spaceCreation = await postGraphqlRaw<CreateSpaceRawData>(
        createSpaceRawMutation,
        subject.token,
        {
          spaceData: {
            nameID: `del-blk-${uniqueId}`,
            accountID,
            about: {
              profileData: { displayName: `TC-05 blocker space ${uniqueId}` },
            },
            collaborationData: {
              addTutorialCallouts: false,
              calloutsSetData: {},
            },
          },
        }
      );
      expect(spaceCreation.body.errors).toBeUndefined();
      expect(spaceCreation.body.data?.createSpace.id).toBeTruthy();
      spaceID = spaceCreation.body.data?.createSpace.id;

      // Admin-branch deletion — pre-existing ForbiddenException, unchanged by
      // this feature. Never ACCOUNT_DELETION_BLOCKED: that code is self-only.
      const deletion = await deleteUserWithOptions(subject.userId, {
        deleteIdentity: true,
      });

      expect(deletion.error).toBeDefined();
      const deletionError = deletion.error?.errors[0];
      expect(deletionError?.extensions).toBeDefined();
      expect((deletionError?.extensions as { code?: string })?.code).not.toEqual(
        'ACCOUNT_DELETION_BLOCKED'
      );
      expect(String(deletionError?.message)).toContain(
        'account contains one or more resources'
      );

      // The subject still exists afterwards.
      const meProbe = await postGraphqlRaw<MeUserData>(
        meUserQuery,
        subject.token
      );
      expect(meProbe.body.errors).toBeUndefined();
      expect(meProbe.body.data?.me.user?.id).toEqual(subject.userId);
    } finally {
      // The blocker (the Space) must go first, or the disposable account and
      // its license assignment are left behind forever — deleteUserTolerant
      // silently swallows the same "account contains resources" refusal.
      if (spaceID) {
        await deleteSpace(spaceID);
      }
      await deleteUserTolerant(subject.userId);
    }
  });

  // TC-18 -------------------------------------------------------------------
  test('TC-18 — a plain user cannot delete another user (ratified by the QA lead)', async () => {
    // Register serially — Kratos rejects parallel registration flows.
    const attacker = await createDisposableVerifiedUser('del-attacker');
    const victim = await createDisposableVerifiedUser('del-victim');
    try {
      const escalationAttempt = await postGraphqlRaw<DeleteUserRawData>(
        deleteUserRawMutation,
        attacker.token,
        { deleteData: { ID: victim.userId, deleteIdentity: true } }
      );

      // The distinction here IS the case: a forbidden/authorization refusal,
      // not SESSION_REFRESH_REQUIRED (which would mean the self branch was
      // wrongly taken for a non-self target, and the escalation was only
      // incidentally blocked by the freshness gate).
      const escalationCode = (
        escalationAttempt.body.errors?.[0]?.extensions as
          | { code?: string }
          | undefined
      )?.code;
      expect(escalationCode).toBeDefined();
      expect(escalationCode).not.toEqual('SESSION_REFRESH_REQUIRED');
      // Observed code, recorded rather than invented (per the build sheet's
      // instruction): the pre-existing `AuthorizationService.grantAccessOrFail`
      // guard on the target user's DELETE privilege throws
      // ForbiddenAuthorizationPolicyException → FORBIDDEN_POLICY. Confirmed
      // live against origin/develop 2026-09-02.
      expect(escalationCode).toEqual('FORBIDDEN_POLICY');
      expect(escalationAttempt.body.data?.deleteUser ?? null).toBeNull();

      // The victim is untouched.
      const victimProbe = await postGraphqlRaw<MeUserData>(
        meUserQuery,
        victim.token
      );
      expect(victimProbe.body.errors).toBeUndefined();
      expect(victimProbe.body.data?.me.user?.id).toEqual(victim.userId);

      // The attacker's own preflight is unaffected — the refusal was about
      // the target, not a broken caller.
      const attackerPreflight = await postGraphqlRaw<AccountDeletionPreflightData>(
        accountDeletionPreflightQuery,
        attacker.token
      );
      expect(attackerPreflight.body.errors).toBeUndefined();
      expect(attackerPreflight.body.data?.me.accountDeletion.canDelete).toEqual(
        true
      );
    } finally {
      await deleteUserTolerant(attacker.userId);
      await deleteUserTolerant(victim.userId);
    }
  });
});
