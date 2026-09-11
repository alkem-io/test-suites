import {
  registerAllTestUsers,
  registerTestUser,
  stringifyConfig,
  testConfiguration,
} from '@alkemio/tests-lib';
import dotenv from 'dotenv';
import { US3_REGISTERED_USER_NAMES } from '../src/functional-e2e/organization-space-invitations/organization-space-invitations.helpers';
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

  // Two extra personas the organization-space-invitations walks need as
  // ORGANIZATION admins/associates with no pre-existing standing in any Space.
  // They must exist BEFORE any test's `storageState` fixture drives the login
  // form: `createPersonaTest` logs in during fixture setup, which precedes
  // every hook in a spec file, so a spec cannot register its own login persona.
  // Names are fixed rather than per-run because globalSetup runs in its own
  // process — a suffix generated in the spec module would not match.
  // `registerTestUser` is idempotent ("already exists" is a no-op).
  for (const userName of US3_REGISTERED_USER_NAMES) {
    await registerTestUser(userName);
  }
}
