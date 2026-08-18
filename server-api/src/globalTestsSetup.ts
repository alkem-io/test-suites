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

// Process-level (not per-project) cache: `_initializeGlobalSetup` runs once
// PER vitest project instance even when every project shares this file via
// root `extends: true` — the `__alkemioGlobalSetupDone` guard below stops
// the actual provisioning/mint work from repeating, but `project.provide`
// itself is scoped to whichever project instance calls it (verified against
// the installed vitest: a project's provided context does NOT propagate to
// sibling projects). So the mint happens once, into this module-scope cache,
// and EVERY project's setup() call — guarded or not — re-provides the same
// cached value onto its own project instance, which is what makes
// `inject('alkemioUserModels')` resolve identically from either lane.
let cachedUserModels: SerializedTestUserModels | undefined;

export default async function setup(project: MinimalProject) {
  console.log('[globalSetup] Starting global test setup...');

  // Guard against duplicate invocations when Vitest projects inherit
  // globalSetup from root config via extends: true (array merge semantics).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(globalThis as any).__alkemioGlobalSetupDone) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__alkemioGlobalSetupDone = true;

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
    cachedUserModels = TestUserManager.serialize();

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
  // itself never completed — defensive, not the primary path.
  if (!cachedUserModels) {
    await TestUserManager.populateUserModelMap();
    cachedUserModels = TestUserManager.serialize();
  }

  project.provide('alkemioUserModels', cachedUserModels);

  // Return a teardown function so Vitest can ensure a clean exit.
  // The GraphQL client is stateless HTTP and WebSocket subscriptions are
  // terminated in per-file afterAll hooks, so no global cleanup is needed.
  return () => {
    LogManager.getLogger().info('Global teardown complete');
  };
}
