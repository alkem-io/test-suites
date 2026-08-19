import {
  assertApprovedTestTarget,
  LogManager,
  provisionPoolPlatformRoles,
  provisionTestIdentities,
  registerAllTestUsers,
  stringifyConfig,
  testConfiguration,
  verifyEnvPrerequisites,
  TestUserManager,
  type SerializedTestUserModels,
} from '@alkemio/tests-lib';
import { countNightlyFiles, resolveNightlyWorkers } from './scripts/nightly-lanes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MinimalProject = { provide: (key: string, value: any) => void };

type AlkemioGlobalState = typeof globalThis & {
  __alkemioGlobalSetupDone?: boolean;
  __alkemioUserModels?: SerializedTestUserModels;
};

// `_initializeGlobalSetup` runs once PER vitest project instance — every
// project (nightly-parallel, nightly-serial, and the root project vitest
// always adds even when only a subset is requested via `--project`) gets its
// own `ServerModuleRunner` and therefore its own fresh module instance of
// THIS file. A module-scope variable is consequently per-project, not
// per-process, and can never be relied on to survive between calls: the
// `__alkemioGlobalSetupDone` guard below IS process-scoped (it lives on
// `globalThis`), so the second and third calls skip the mint, but a
// module-scope cache would still be `undefined` in their own fresh module
// instance, tripping the fallback below and re-minting all 13 tokens per
// extra project. The minted snapshot is therefore held on `globalThis`
// itself, right next to the guard flag, so every project's setup() call —
// guarded or not — reads and re-provides the same process-wide value onto
// its own project instance, which is what makes `inject('alkemioUserModels')`
// resolve identically from every lane without ever minting twice.
const globalState = globalThis as AlkemioGlobalState;

export default async function setup(project: MinimalProject) {
  // Fail-fast environment guard: must run before ANY provisioning,
  // registration, minting, or role-granting step below — those are what
  // would actually create/upgrade identities on whatever host is
  // configured. See lib/src/config/environment-guard.ts for the allowlist
  // and the opt-out escape hatch.
  assertApprovedTestTarget(testConfiguration);

  console.log('[globalSetup] Starting global test setup...');

  // Guard against duplicate invocations when Vitest projects inherit
  // globalSetup from root config via extends: true (array merge semantics).
  // Resolved up front (env-var only, no side effects) so BOTH the mint step
  // below and the run-time log line use the exact same number — the pool
  // grows to one full role set PER worker slot `nightly-parallel` will
  // actually run with (see TestUserManager.populateUserModelMap and
  // pool-identity.ts), and `resolveNightlyWorkers` is the single source of
  // truth for that worker count regardless of which project's setup() call
  // happens to run first.
  const resolution = resolveNightlyWorkers(
    process.env.NIGHTLY_MAX_WORKERS,
    process.env.NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT
  );

  if (!globalState.__alkemioGlobalSetupDone) {
    globalState.__alkemioGlobalSetupDone = true;

    LogManager.getLogger().info(
      `\nLaunching tests using configuration: ${stringifyConfig(testConfiguration)}`
    );

    // Provision test-user identities (#565 Phase 2). When the Kratos admin API is
    // reachable (CI, via an in-cluster port-forward → KRATOS_ADMIN_URL) upsert the
    // identities deterministically through it — no self-service policy/HIBP checks,
    // no "already exists" no-op, always the correct password. Otherwise (local dev,
    // no admin access) fall back to self-service registration. Both paths provision
    // `resolution.effective` full role sets — one per worker slot.
    if (testConfiguration.endPoints.kratos.admin) {
      await provisionTestIdentities(resolution.effective);
    } else if (testConfiguration.registerUsers) {
      await registerAllTestUsers(resolution.effective);
    }

    // Env-prerequisite gate: prove the auth prerequisite
    // is actually met by minting a real admin token BEFORE any scenario runs. A
    // broken env (e.g. Kratos admin provisioned with a mismatched password) then
    // aborts here with one clear message instead of cascading into every scenario
    // failing 40+ minutes in. Runs even when registration is skipped (users are
    // expected pre-seeded in that mode — verify they can authenticate). Only
    // probes worker-index 0's (unsuffixed) identities — a representative
    // sanity check, not a per-worker-slot sweep.
    await verifyEnvPrerequisites();

    // Mint hoist: every worker slot's shared-user logins mint exactly
    // once here, regardless of ACTUAL worker count at run time (a project
    // with fewer files than `resolution.effective` simply never spawns
    // enough workers to use the extra slots — see TestUserManager for why
    // that is harmless, not wasted). Workers never mint their own — they
    // hydrate from the provided context below.
    await TestUserManager.populateUserModelMap(resolution.effective);

    // Platform-role parity across worker slots. `admin@alkem.io`'s
    // GLOBAL_ADMIN comes from the SERVER's bootstrap, so `admin+wN` would
    // otherwise be an ordinary user and every scenario setup that worker
    // runs would fail its first privileged call. Must run after the mint
    // (it needs the resolved user ids + current roles) and before
    // serialize() (so workers hydrate the updated roles).
    await provisionPoolPlatformRoles(resolution.effective);

    globalState.__alkemioUserModels = TestUserManager.serialize();

    const lanes = countNightlyFiles();
    // Deliberately console.log, not LogManager: the console transport
    // defaults to error-only (LOG_LEVEL unset/'warn' in CI), and this line
    // is read back from the captured run log by the CI assert-config step.
    //
    // Visibility is the point: a silently reduced worker count would make a
    // slow run inexplicable. The parenthetical always reports both the
    // requested intent and the CPU-percentage ceiling it was checked
    // against, and carries an explicit `CAPPED` marker whenever the ceiling
    // actually reduced the requested value — the resolution rule itself
    // lives in src/scripts/nightly-lanes.ts (resolveNightlyWorkers).
    const resolutionNote =
      `(requested=${resolution.requested} cpuCap=${resolution.cpuCap} of ${resolution.cpus} cpus` +
      `${resolution.capped ? ', CAPPED' : ''})`;
    console.log(
      `[nightly] lanes: parallel=${lanes.parallel} serial=${lanes.serial} maxWorkers=${resolution.effective} ${resolutionNote} excluded=${lanes.excluded}`
    );
  }

  // Fallback for the (should-be-unreachable) case where the guard above was
  // already tripped by an earlier project in this same process but the mint
  // itself crashed before the snapshot was written to `globalState` — the
  // ONLY legitimate reason `__alkemioUserModels` can still be unset once the
  // guard is true. This must never fire on a normal run: with the snapshot
  // now held on `globalThis`, every project after the first reads the same
  // value written here and never re-mints.
  if (!globalState.__alkemioUserModels) {
    await TestUserManager.populateUserModelMap(resolution.effective);
    await provisionPoolPlatformRoles(resolution.effective);
    globalState.__alkemioUserModels = TestUserManager.serialize();
  }

  project.provide('alkemioUserModels', globalState.__alkemioUserModels);

  // Return a teardown function so Vitest can ensure a clean exit.
  // The GraphQL client is stateless HTTP and WebSocket subscriptions are
  // terminated in per-file afterAll hooks, so no global cleanup is needed.
  return () => {
    LogManager.getLogger().info('Global teardown complete');
  };
}
