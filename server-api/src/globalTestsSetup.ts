import {
  ensureHarnessAdminRoles,
  LogManager,
  provisionTestIdentities,
  registerAllTestUsers,
  stringifyConfig,
  testConfiguration,
  verifyEnvPrerequisites,
} from '@alkemio/tests-lib';

export default async function setup() {
  console.log('[globalSetup] Starting global test setup...');

  // Guard against duplicate invocations when Vitest projects inherit
  // globalSetup from root config via extends: true (array merge semantics).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((globalThis as any).__alkemioGlobalSetupDone) return;
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

  // Env-prerequisite gate (test-suites#565, Phase 1): prove the auth prerequisite
  // is actually met by minting a real admin token BEFORE any scenario runs. A
  // broken env (e.g. Kratos admin provisioned with a mismatched password) then
  // aborts here with one clear message instead of cascading into every scenario
  // failing 40+ minutes in. Runs even when registration is skipped (users are
  // expected pre-seeded in that mode — verify they can authenticate).
  await verifyEnvPrerequisites();

  // workspace#027 Slice B: the bootstrap account is seeded with the four
  // operational families only; the harness grants it the content, support,
  // resource and licensing families through a second Platform Roles Admin.
  // No-op on a Slice A stack or once done.
  await ensureHarnessAdminRoles();

  // Return a teardown function so Vitest can ensure a clean exit.
  // The GraphQL client is stateless HTTP and WebSocket subscriptions are
  // terminated in per-file afterAll hooks, so no global cleanup is needed.
  return () => {
    LogManager.getLogger().info('Global teardown complete');
  };
}
