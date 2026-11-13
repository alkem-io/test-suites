import { expect } from '@playwright/test';
import {
  CommunityMembershipPolicy,
  deleteUser,
  getUserToken,
  joinRoleSet,
  registerVerifiedUser,
  testConfiguration,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  type GraphqlActor,
} from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';
import { deleteSpaceTree } from '../helpers/space-cleanup.helper';
import {
  deleteVcIfPresent,
  runCleanup,
} from '../contributors-crud/contributors-crud.helpers';

/**
 * Shared fixture plumbing for the workspace#080 Form walks (us1–us4a). Every
 * file owns its data and reaches the server only through
 * `@alkemio/tests-lib`:
 *
 * - identities are DISPOSABLE and self-registered through public Kratos
 *   (`registerVerifiedUser`: sign-up + verification link read by recipient),
 *   signed in with the harness password, and deleted with their Kratos
 *   identity in teardown — no Kratos admin API, no admin password;
 * - membership is JOINED AS SELF (`joinRoleSet` with the persona's own
 *   bearer): since workspace#027 Slice B no actor may put a user into an L0
 *   Space as MEMBER, so the walks' Spaces and Subspaces are created with an
 *   OPEN membership policy and each persona joins the parent first, then the
 *   Subspace; ADMIN is granted on top by the harness Global Admin;
 * - every Space / VC / user is recorded in a `FormFixtureLedger` the moment it
 *   exists and removed by a FILE-LEVEL `afterAll`, children first; a failed
 *   step fails the hook after every other step has still run.
 */

/** The harness Global Admin (`TestUserManager.users.globalAdmin`). */
export const ADMIN_EMAIL = 'admin@alkem.io';

/** The password every harness persona and every self-registered user signs in with. */
export const harnessPassword = (): string =>
  testConfiguration.identities.admin.password;

/** One id per file run; lowercase alphanumeric, nameID- and email-safe. */
export const formRunId = (): string => UniqueIDGenerator.getID();

/** Call first in every `beforeAll`: the persona bearers `TestUser.*` actors resolve to. */
export const loadHarnessPersonas = async (): Promise<void> => {
  await TestUserManager.populateUserModelMap();
};

const tokens = new Map<string, string>();

/**
 * The lib actor for an email: the harness Global Admin persona, or a
 * disposable user's bearer from the non-interactive login (minted once per
 * file). The login endpoint is rate limited, so a refusal is retried on a
 * bounded backoff — a condition wait, not a sleep.
 */
export async function actorFor(email: string): Promise<GraphqlActor> {
  if (email === ADMIN_EMAIL) return TestUser.GLOBAL_ADMIN;
  let token = tokens.get(email);
  if (!token) {
    let minted = '';
    await expect(async () => {
      minted = await getUserToken(email);
    }).toPass({ intervals: [1_000, 5_000, 15_000], timeout: 120_000 });
    token = minted;
    tokens.set(email, token);
  }
  return { bearerToken: token };
}

/**
 * Membership settings for a Space or Subspace these walks create: OPEN, so
 * that the personas can join as themselves. `allowSubspaceAdminsToInviteMembers`
 * keeps the bootstrap template's value per level (L0 true, Subspace false).
 */
export const openMembership = (level: 'space' | 'subspace') => ({
  policy: CommunityMembershipPolicy.Open,
  allowSubspaceAdminsToInviteMembers: level === 'space',
  trustedOrganizations: [] as string[],
});

/**
 * Each persona joins the role set as itself (the server half of the UI
 * "Join" button). A Subspace is joined only after its parent Space.
 */
export async function joinAsSelf(
  roleSetID: string,
  emails: string[],
  where: string
): Promise<void> {
  for (const email of emails) {
    must(
      await joinRoleSet(roleSetID, await actorFor(email)),
      `${email} joins ${where}`
    );
  }
}

/**
 * Everything a walk seeded, recorded the moment it exists so a half-failed
 * `beforeAll` is still undone. Teardown order: VCs (one may sit on a Space),
 * Space trees (leaves first, throws on a refusal), users with their Kratos
 * identities. Every step runs; the failures are thrown together.
 */
export class FormFixtureLedger {
  private readonly users = new Map<string, string>();
  private readonly spaceIds: string[] = [];
  private readonly vcIds: string[] = [];

  /** Registers a disposable, verified identity + Alkemio user; returns its user id. */
  async registerUser(email: string, first: string, last: string): Promise<string> {
    const id = await registerVerifiedUser(email, first, last);
    this.users.set(id, email);
    return id;
  }

  /** A user the walk deleted itself (an account-deletion step). */
  userDeleted(id: string): void {
    this.users.delete(id);
  }

  /** An L0 Space; its subspaces go with it. */
  space(id: string): void {
    this.spaceIds.push(id);
  }

  vc(id: string): void {
    this.vcIds.push(id);
  }

  async teardown(): Promise<void> {
    const steps: Array<[string, () => Promise<unknown>]> = [
      ...this.vcIds.map(
        (id): [string, () => Promise<unknown>] => [
          `delete VC ${id}`,
          () => deleteVcIfPresent(id),
        ]
      ),
      ...this.spaceIds.map(
        (id): [string, () => Promise<unknown>] => [
          `delete space tree ${id}`,
          () => deleteSpaceTree(id),
        ]
      ),
      ...[...this.users.entries()].map(
        ([id, email]): [string, () => Promise<unknown>] => [
          `delete user ${email}`,
          async () => {
            const result = await deleteUser(id, TestUser.GLOBAL_ADMIN, true);
            const code = result.error?.errors?.[0]?.code;
            if (result.error && code !== 'ENTITY_NOT_FOUND') {
              throw new Error(JSON.stringify(result.error.errors));
            }
          },
        ]
      ),
    ];
    this.vcIds.length = 0;
    this.spaceIds.length = 0;
    this.users.clear();
    await runCleanup(steps);
  }
}
