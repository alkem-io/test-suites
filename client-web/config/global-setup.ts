import {
  registerAllTestUsers,
  stringifyConfig,
  testConfiguration,
} from '@alkemio/tests-lib';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default async function globalSetup() {
  console.log('[globalSetup] Starting Playwright global setup...');

  if (!testConfiguration.registerUsers) return;

  console.info(
    `\nLaunching tests using configuration: ${stringifyConfig(testConfiguration)}`
  );

  await registerAllTestUsers();
}
