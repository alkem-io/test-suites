import {
  LogManager,
  provisionTestIdentities,
  registerAllTestUsers,
  stringifyConfig,
  testConfiguration,
  verifyEnvPrerequisites,
  TestUserManager,
  type SerializedTestUserModels,
} from '@alkemio/tests-lib';
import { countNightlyFiles, parseNightlyWorkers } from './scripts/nightly-lanes';

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
  console.log('[globalSetup] Starting global test setup...');

  // Guard against duplicate invocations when Vitest projects inherit
  // globalSetup from root config via extends: true (array merge semantics).
  if (!globalState.__alkemioGlobalSetupDone) {
    globalState.__alkemioGlobalSetupDone = true;

    LogManager.getLogger().info(
      `\nLaunching tests using configuration: ${stringifyConfig(testConfiguration)}`
    );

    // Provision test-user identities (#565 Phase 2). When the Kratos admin API is
    // reachable (CI, via an in-cluster port-forward → KRATOS_ADMIN_URL) upsert the
    // identities deterministically through it — no self-service policy/HIBP checks,
    // no "already exists" no-op, always the correct password. Otherwise (local dev,
    // no admin access) fall back to self-service registration.
    if (testConfiguration.endPoints.kratos.admin) {
      await provisionTestIdentities();
    } else if (testConfiguration.registerUsers) {
      await registerAllTestUsers();
    }

    // Env-prerequisite gate: prove the auth prerequisite
    // is actually met by minting a real admin token BEFORE any scenario runs. A
    // broken env (e.g. Kratos admin provisioned with a mismatched password) then
    // aborts here with one clear message instead of cascading into every scenario
    // failing 40+ minutes in. Runs even when registration is skipped (users are
    // expected pre-seeded in that mode — verify they can authenticate).
    await verifyEnvPrerequisites();

    // Mint hoist: all 13 shared-user logins mint exactly
    // once here, regardless of worker count. Workers never mint their own —
    // they hydrate from the provided context below.
    await TestUserManager.populateUserModelMap();
    globalState.__alkemioUserModels = TestUserManager.serialize();

    const workers = parseNightlyWorkers(process.env.NIGHTLY_MAX_WORKERS);
    const lanes = countNightlyFiles();
    // Deliberately console.log, not LogManager: the console transport
    // defaults to error-only (LOG_LEVEL unset/'warn' in CI), and this line
    // is read back from the captured run log by the CI assert-config step.
    console.log(
      `[nightly] lanes: parallel=${lanes.parallel} serial=${lanes.serial} maxWorkers=${workers}`
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
    await TestUserManager.populateUserModelMap();
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
