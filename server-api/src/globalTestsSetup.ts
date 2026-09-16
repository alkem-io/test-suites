import {
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

  // workspace#027-platform-role-redesign (qual-ts-14, 2026-07-30 fix wave):
  // seeding the 027 single-role fixtures (`grantSingleRoleFixtures()`) no
  // longer lives here. This file is the shared root `globalSetup`, inherited
  // by ALL 32 vitest projects via `extends: true` — an unconditional call
  // here (a) hard-fails every UNRELATED suite whenever a single-role fixture
  // cannot be seeded (e.g. the server does not yet carry the 12 new
  // `RoleName` values), and (b) used to run AHEAD of the env-prerequisite
  // gate above, pre-empting the one-clear-message abort it exists to
  // provide. It now runs from a project-scoped setupFile
  // (`functional-api/platform-roles/platform-roles.setup.ts`), wired ONLY
  // into the two `platform-roles`/`platform-roles-canonical` projects
  // (`vitest.config.ts`) — the only consumers of these fixtures — so no
  // other project is ever blocked by this feature's own fixture seeding.

  // Return a teardown function so Vitest can ensure a clean exit.
  // The GraphQL client is stateless HTTP and WebSocket subscriptions are
  // terminated in per-file afterAll hooks, so no global cleanup is needed.
  return () => {
    LogManager.getLogger().info('Global teardown complete');
  };
}
