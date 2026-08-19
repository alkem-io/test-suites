import { UserModel } from "./models/UserModel";
import { TestUserModels } from "./models/TestUserModels";
import { getUserToken } from "./registration/get-user-token";
import { TestUser } from "../common/enums/test.user";
import { getGraphqlClient } from "../utils/graphqlClient";
import { buildPoolIdentifierEmail } from "./pool-identity";

/**
 * The wire shape `TestUserManager.serialize()` hands to `globalSetup`'s
 * `project.provide('alkemioUserModels', …)` and every worker rehydrates via
 * `inject('alkemioUserModels')` — the vitest-provided-context transport for
 * the once-per-run mint hoist.
 *
 * Only the flat email→model matrix crosses the wire — it holds every
 * worker's identities, minted once by whichever process actually ran
 * `populateUserModelMap()`. `typeEntries`/`users` are NOT part of the
 * payload: they are this-worker's VIEW over that matrix (see
 * `resolveForCurrentWorker`) and must be recomputed locally by each worker
 * from its own `VITEST_POOL_ID`, never transported — the process that mints
 * (Vitest's main/orchestrator process) has no pool id of its own, so a
 * transported view would silently be worker-0's view on every worker.
 */
export interface SerializedTestUserModels {
  emailEntries: [string, UserModel][];
}

export class TestUserManager {
  private static userModelMapEmail: Map<string, UserModel>;
  private static userModelMapType: Map<TestUser, UserModel>;
  private static populated = false;

  public static users: TestUserModels;

  /**
   * Resolves the identity pool slot this OS thread owns, so concurrently
   * running files (different Vitest worker threads under `pool: 'threads'`)
   * never resolve `TestUserManager.users`/`getUserModelByType` to the same
   * underlying Kratos identity — the root cause of the nightly's cross-file
   * interference class (test-suites parallel-nightly hardening).
   *
   * `VITEST_POOL_ID` (NOT `VITEST_WORKER_ID`) is the stable slot id: verified
   * empirically against the installed vitest 4.0.18 — under `pool: 'threads'`
   * with `maxWorkers: N`, `VITEST_POOL_ID` cycles `1..N` (one value per
   * underlying OS thread, stable across every file that thread executes),
   * while `VITEST_WORKER_ID` is a monotonically increasing per-TASK counter
   * (unbounded, a fresh value per file regardless of which thread ran it) —
   * unusable as a pool-slot key. 1-based; subtract 1 for a 0-based index.
   * Unset outside a worker (e.g. the main/orchestrator process running
   * `globalSetup`, or `maxWorkers: 1`) defaults to slot 1 → index 0, which
   * is deliberately the UNSUFFIXED identity set (see `buildIdentifier`) so
   * `NIGHTLY_MAX_WORKERS=1` (today's default everywhere outside the nightly
   * job) is byte-for-byte identical to pre-per-worker-pool behaviour.
   */
  private static getCurrentWorkerIndex(): number {
    const raw = Number(process.env.VITEST_POOL_ID);
    return Number.isFinite(raw) && raw > 0 ? raw - 1 : 0;
  }

  /**
   * Mints each core test user's token ONCE per run and caches it (the class is a
   * module singleton under Vitest `isolate:false`). It used to re-mint every
   * user on every scenario setup — a full Kratos native login flow per user per
   * file (~users × files ≈ hundreds of logins). Under that load Kratos
   * rate-limits (429), which the server maps to `invalid_credentials`, failing
   * setups intermittently mid-run (test-suites#563). Non-interactive-login
   * tokens live 4h — far longer than a run — so a single mint per user is safe.
   * The `populated` flag flips only after a full pass, so a partial failure
   * (e.g. an early rate-limit) is retried in full rather than left incomplete.
   *
   * `workerCount` grows the pool to `TestUser` × `workerCount` distinct
   * identities — one full 13-role set PER concurrent Vitest worker slot, so
   * no two files that can run concurrently (different worker threads) ever
   * share an identity. Defaults to 1 (today's single shared pool) for any
   * caller outside `globalTestsSetup.ts` (there are none post-hoist — see
   * that file's own comment — but the default keeps this method safe to
   * call standalone, e.g. from a future ad-hoc script).
   *
   * The invariant the nightly CI gate protects is "the pool mints exactly
   * once per run", not "the pool has exactly N members" — the printed
   * `[auth] pool size: N` line (N = `TestUser` size × `workerCount`) is the
   * single source of truth CI derives its expected mint count from, so
   * growing the pool (by adding a `TestUser` or raising `workerCount`) never
   * requires touching the CI assertion, while a duplicate mint still fails
   * it (the printed size is unaffected by a duplicate mint, but the counted
   * mint lines would be).
   */
  public static async populateUserModelMap(workerCount = 1) {
    if (this.populated) {
      return;
    }
    this.userModelMapEmail = new Map<string, UserModel>();

    const poolUsers = Object.keys(TestUser);
    // Deliberately console.log, not LogManager (console transport defaults
    // to error-only in CI) — read back by the nightly's mint-count gate as
    // the expected pool size, derived from the actual pool definition
    // (`TestUser` × `workerCount`) rather than hardcoded in the workflow.
    console.log(`[auth] pool size: ${poolUsers.length * workerCount}`);

    for (let workerIndex = 0; workerIndex < workerCount; workerIndex++) {
      for (const user of poolUsers) {
        const userValue = TestUser[user as keyof typeof TestUser];
        // Create a user model for each test user
        const email = this.buildIdentifier(userValue, workerIndex);
        const userModel = this.createEmptyUserModel(email, userValue);

        // Populate the authentication token. Tagged 'pool' — these are the
        // shared-user mints the nightly's mint-count invariant counts (must
        // equal the `[auth] pool size: N` line above, exactly once per run).
        userModel.authToken = await getUserToken(userModel.email, 'pool');

        // Populate the user model with details from the api
        await this.populateUserModelFromApi(userModel);

        this.userModelMapEmail.set(userModel.email, userModel);
      }
    }
    // Derive this process's own view (userModelMapType + users) over the
    // full matrix. The process that mints is Vitest's main/orchestrator
    // process, which has no pool id — it resolves to worker-index 0, same
    // as every other caller with no worker context.
    this.resolveForCurrentWorker();

    // Cache is complete — subsequent scenario setups reuse these tokens.
    this.populated = true;

    // logElapsedTime('populateUserModels', start);
  }

  /**
   * Snapshots the cached user models for the `globalSetup` -> worker
   * hand-off. Only ever called after `populateUserModelMap()` has minted —
   * a worker that hydrates from this never mints its own tokens.
   */
  public static serialize(): SerializedTestUserModels {
    return {
      emailEntries: [...this.userModelMapEmail.entries()],
    };
  }

  /**
   * Restores the cached user models from the data `globalSetup` provided,
   * without minting anything. Idempotent — safe to call from every worker's
   * `beforeAll` even though the underlying module state is a per-worker
   * singleton (`pool: 'threads'`, `isolate: false`) that only needs it once.
   *
   * Every worker hydrates the SAME full email matrix (all workers' identities)
   * but then derives its OWN `userModelMapType`/`users` view from it, keyed
   * by ITS OWN `VITEST_POOL_ID` — see `resolveForCurrentWorker`.
   */
  public static hydrateFromProvided(data: SerializedTestUserModels): void {
    this.userModelMapEmail = new Map(data.emailEntries);
    this.resolveForCurrentWorker();
    this.populated = true;
  }

  /**
   * Builds this worker's `userModelMapType` and `users` (the
   * role-name-keyed view most tests actually consume) by selecting, for
   * each `TestUser` role, THIS worker's own identity out of the full
   * email matrix — never worker-0's, never another worker's. This is what
   * makes `TestUserManager.users.spaceAdmin` (etc.) resolve differently in
   * concurrently-running files without any spec needing to change.
   */
  private static resolveForCurrentWorker(): void {
    const workerIndex = this.getCurrentWorkerIndex();
    this.userModelMapType = new Map<TestUser, UserModel>();

    for (const user of Object.keys(TestUser)) {
      const userValue = TestUser[user as keyof typeof TestUser];
      const email = this.buildIdentifier(userValue, workerIndex);
      const userModel = this.userModelMapEmail.get(email);
      if (userModel) {
        this.userModelMapType.set(userValue, userModel);
      }
    }
    this.populateUsers();
  }

  private static createEmptyUserModel(
    email: string,
    testUser: TestUser
  ): UserModel {
    const result: UserModel = {
      email,
      id: "",
      displayName: "",
      profileId: "",
      nameId: "",
      agentId: "",
      accountId: "",
      authToken: "",
      type: testUser,
      RoleNames: [],
    };
    return result;
  }

  private static populateUsers() {
    this.users = {
      globalAdmin: TestUserManager.getUserModelByType(TestUser.GLOBAL_ADMIN),
      globalSupportAdmin: TestUserManager.getUserModelByType(
        TestUser.GLOBAL_SUPPORT_ADMIN
      ),
      globalLicenseAdmin: TestUserManager.getUserModelByType(
        TestUser.GLOBAL_LICENSE_ADMIN
      ),
      spaceAdmin: TestUserManager.getUserModelByType(TestUser.SPACE_ADMIN),
      spaceMember: TestUserManager.getUserModelByType(TestUser.SPACE_MEMBER),
      subspaceAdmin: TestUserManager.getUserModelByType(
        TestUser.SUBSPACE_ADMIN
      ),
      subspaceMember: TestUserManager.getUserModelByType(
        TestUser.SUBSPACE_MEMBER
      ),
      subsubspaceAdmin: TestUserManager.getUserModelByType(
        TestUser.SUBSUBSPACE_ADMIN
      ),
      subsubspaceMember: TestUserManager.getUserModelByType(
        TestUser.SUBSUBSPACE_MEMBER
      ),
      qaUser: TestUserManager.getUserModelByType(TestUser.QA_USER),
      // notificationsAdmin: TestUserManager.getUserModelByType(
      //   TestUser.NOTIFICATIONS_ADMIN
      // ),
      nonSpaceMember: TestUserManager.getUserModelByType(
        TestUser.NON_SPACE_MEMBER
      ),
      betaTester: TestUserManager.getUserModelByType(
        TestUser.GLOBAL_BETA_TESTER
      ),
      organizationAdmin: TestUserManager.getUserModelByType(
        TestUser.ORGANIZATION_ADMIN
      ),
    };
  }

  /**
   * Refreshes the cached UserModel for a given email by re-fetching
   * the auth token and user data from the API.
   * Use after deleting and re-registering a test user.
   */
  public static async refreshUserModel(email: string): Promise<UserModel> {
    const userModel = this.userModelMapEmail.get(email);
    if (!userModel) {
      throw new Error(`UserModel with email ${email} not found`);
    }
    // Ad-hoc re-mint after a delete/re-register — outside the shared pool,
    // not counted by the nightly's 'pool' mint-count invariant.
    userModel.authToken = await getUserToken(email, 'ad-hoc');
    await this.populateUserModelFromApi(userModel);
    return userModel;
  }

  public static getUserModelByEmail(userEmail: string): UserModel {
    const userModel = this.userModelMapEmail.get(userEmail);
    if (!userModel) {
      throw new Error(`UserModel with email ${userEmail} not found`);
    }
    return userModel;
  }

  public static getUserModelByType(userType: TestUser): UserModel {
    const userModel = this.userModelMapType.get(userType);

    if (!userModel) {
      throw new Error(`UserModel with type ${userType} not found`);
    }
    return userModel;
  }

  /**
   * Resolves a pool role to THIS worker's own real email address — e.g.
   * `TestUser.GLOBAL_BETA_TESTER` -> `beta.tester@alkem.io` on worker-index 0,
   * `beta.tester+w3@alkem.io` on worker-index 3. Exposed for the rare
   * legacy call site that deletes-and-recreates a shared pool identity by a
   * literal base email (`reregisterUser`/`createUser` in
   * `contributor-management/user/user.request.params.ts`) — recreating the
   * SAME identity the current worker actually owns, not worker-0's, is what
   * keeps that path from reintroducing cross-worker interference by the
   * back door.
   */
  public static emailForCurrentWorker(user: TestUser): string {
    return this.buildIdentifier(user, this.getCurrentWorkerIndex());
  }

  /**
   * If `email`'s local-part matches a known pool role (e.g.
   * `beta.tester@alkem.io`), re-resolves it to THIS worker's own real
   * address for that role. Any other email (a test-generated one-off
   * address, `user-email-<uniqueId>@alkem.io`) passes through unchanged —
   * this only ever rewrites the small, closed set of literal pool-role
   * emails a couple of legacy call sites still hardcode.
   */
  public static resolvePoolEmailForCurrentWorker(email: string): string {
    const localPart = email.slice(0, email.indexOf('@'));
    const match = (Object.values(TestUser) as string[]).find(
      value => value === localPart
    );
    return match
      ? this.emailForCurrentWorker(match as TestUser)
      : email;
  }

  private static async populateUserModelFromApi(
    userModel: UserModel
  ): Promise<void> {
    const userData = await this.getUserData(userModel.authToken);
    const userInfo = userData?.data?.me.user;
    userModel.displayName = userInfo?.profile?.displayName || "";
    userModel.id = userInfo?.id || "";
    userModel.profileId = userInfo?.profile?.id || "";
    userModel.nameId = userInfo?.nameID || "";
    userModel.agentId = userInfo?.actor?.id || "";
    userModel.accountId = userInfo?.account?.id || "";

    const RoleNames = userData?.data?.platform?.roleSet.myRoles || [];
    userModel.RoleNames = RoleNames;
  }

  private static async getUserData(authToken: string) {
    const graphqlClient = getGraphqlClient();
    const result = graphqlClient.getMyUserInfo(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );
    return result;
  }

  private static buildIdentifier(user: TestUser, workerIndex = 0) {
    return buildPoolIdentifierEmail(user, workerIndex);
  }
}
