import {
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
 */
function clearPersonaSessions() {
  const authDir = path.resolve(__dirname, '..', '.auth');
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
}
