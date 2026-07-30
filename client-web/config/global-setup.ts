import {
  grantSingleRoleFixtures,
  registerAllTestUsers,
  stringifyConfig,
  testConfiguration,
} from '@alkemio/tests-lib';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Remove cached per-persona sessions from previous runs. The authenticated
 * session fixture reuses `.auth/persona.*.json` across worker restarts within a
 * run; clearing them here keeps that reuse strictly run-scoped, so a stale /
 * expired Kratos session can never leak into a fresh run.
 *
 * Resolve `.auth` from `process.cwd()` — NOT `__dirname` — so this matches the
 * location the fixture writes to (`authenticated-session.fixture.ts` also uses
 * `process.cwd()/.auth`). globalSetup and the workers share one cwd, so both
 * always agree; deriving from `__dirname` here would point at `client-web/.auth`
 * and silently miss (leak) sessions whenever Playwright runs from another cwd.
 */
function clearPersonaSessions() {
  const authDir = path.join(process.cwd(), '.auth');
  if (!fs.existsSync(authDir)) return;
  for (const file of fs.readdirSync(authDir)) {
    if (file.startsWith('persona.') && file.endsWith('.json')) {
      fs.rmSync(path.join(authDir, file), { force: true });
    }
  }
}

export default async function globalSetup() {
  console.log('[globalSetup] Starting Playwright global setup...');

  clearPersonaSessions();

  if (!testConfiguration.registerUsers) return;

  console.info(
    `\nLaunching tests using configuration: ${stringifyConfig(testConfiguration)}`
  );

  await registerAllTestUsers();

  // corr-ts-15/qual-ts-12: `registerAllTestUsers()` (post qual-ts-2 fix)
  // registers the Kratos/Alkemio identities for the 027-platform-role-redesign
  // single-role fixtures but grants them NO platform role — that step moved
  // to `grantSingleRoleFixtures()`, called from `server-api`'s
  // `globalTestsSetup.ts`, a file Playwright never loads. Without this call,
  // every `@forge-acceptance` spec (`us2-role-capabilities`,
  // `us3-grantability`, `us4-holder-lists`) authenticates as a role-less
  // user and fails at its first authorization assertion.
  //
  // corr-ts-25/sec-test-suites-4 fix (2026-07-30 corrective wave): gated on
  // the SAME env flag that lifts `playwright.config.ts`'s `testIgnore` for
  // those three specs (`PLAYWRIGHT_INCLUDE_FORGE_ACCEPTANCE`) — this
  // globalSetup is shared by EVERY project this repo runs, including the
  // nightly regression config (`playwright.config.nightly.ts`), which does
  // not set that flag and therefore never collects the specs that need this
  // seeding. Unconditionally calling it here (a) hard-fails every UNRELATED
  // suite whenever a single-role fixture cannot be seeded (e.g. the target
  // server does not yet carry the 12 new `RoleName` values — develop, or
  // any pre-Slice-A environment) and (b) performs 13 privileged platform-
  // role grants on a shared environment every night for fixtures nothing
  // running that night consumes — server-api's `globalTestsSetup.ts`
  // dropped the identical unconditional call for the identical reason.
  if (process.env.PLAYWRIGHT_INCLUDE_FORGE_ACCEPTANCE) {
    await grantSingleRoleFixtures();
  }
}
