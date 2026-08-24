import {
  provisionTestIdentities,
  registerAllTestUsers,
  stringifyConfig,
  testConfiguration,
  TestUser,
} from '@alkemio/tests-lib';
import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { ensurePersonaState } from '../src/functional-e2e/fixtures/authenticated-session.fixture';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default async function globalSetup() {
  console.log('[globalSetup] Starting Playwright global setup...');

  console.info(
    `\nLaunching tests using configuration: ${stringifyConfig(testConfiguration)}`
  );

  // Seed the test personas the same way server-api's globalTestsSetup does
  // (test-suites#565 Phase 2). When the Kratos ADMIN API is reachable
  // (KRATOS_ADMIN_URL), upsert every persona deterministically through it:
  // no self-service password policy / breached-password (HIBP) check, no
  // "already exists" no-op that leaves a wrong password in place — a reset
  // Kratos store heals on the next run instead of timing out every login.
  // Without admin access, fall back to self-service registration.
  if (testConfiguration.endPoints.kratos.admin) {
    await provisionTestIdentities();
  } else if (testConfiguration.registerUsers) {
    await registerAllTestUsers();
  }

  // Warm every persona's storage state SERIALLY, before any worker exists.
  //
  // A cold UI login takes tens of seconds on a busy dev machine, and the first
  // spec per persona used to pay that cost inside its own test timeout — with
  // several workers logging different personas in CONCURRENTLY, the logins
  // contended on the SPA dev server and blew the 30s budget as
  // "Test timeout ... exceeded while setting up storageState".
  //
  // ensurePersonaState validates a saved session against Kratos `whoami`
  // before reusing it, so on a healthy cache this loop costs one cheap HTTP
  // check per persona; only actually-invalid sessions (first run, expired
  // cookie, reset Kratos store) pay a real login — one at a time, with no
  // test-timeout clock running. Tests then adopt the pre-warmed state and the
  // in-fixture login remains a rarely-used fallback (e.g. a persona added to a
  // spec but not to TestUser).
  //
  // Persona warm-up failures are non-fatal by design: only the specs using
  // that persona should fail (attributably, via the fixture's own retry+error),
  // not the entire run.
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: process.env.UI_HEADLESS !== 'false',
  });
  try {
    for (const userName of Object.values(TestUser)) {
      const email = `${userName}@alkem.io`;
      try {
        await ensurePersonaState(browser, email);
      } catch (error) {
        console.warn(
          `[globalSetup] could not warm session for ${email} — specs using it will retry in-test: ${
            (error as Error)?.message ?? error
          }`
        );
      }
    }
  } finally {
    await browser.close();
  }
}
