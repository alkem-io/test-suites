import type { TestProject } from 'vitest/node';
import {
  clearAddressCounters,
  getUserToken,
  platformRuleOn,
  restorePlatformRule,
  savePlatformRule,
  seedPlatformRoleUsers,
  setPlatformRule,
  TestUser,
} from '@alkemio/tests-lib';

/**
 * Once per run: clear the login proxy's per-address counters, seed the
 * single-role users the reset and rule cases act as, mint the global admin's
 * token (platform CREATE, which no single platform role holds), and clear
 * again — their
 * sign-ins pass the proxy from the runner's address, and a successful sign-in
 * no longer clears it. Every case clears again in its own `beforeEach`, and the
 * run clears once more when it ends: its sign-ins leave the runner's address
 * counted, and the next suite on the same stack signs in from it too.
 */
export type SecondFactorRunContext = {
  tokens: {
    support: string;
    usersAdmin: string;
    settingsAdmin: string;
    globalAdmin: string;
  };
};

declare module 'vitest' {
  export interface ProvidedContext {
    secondFactor: SecondFactorRunContext;
  }
}

export default async function setup(project: TestProject) {
  // The rule case switches the platform rule off again in its own `finally`;
  // a worker killed before then leaves it on, with a deadline for every
  // platform-role holder. The run's end switches it off when the run found it off.
  const ruleAtStart = await savePlatformRule();
  await clearAddressCounters();
  const { tokens } = await seedPlatformRoleUsers();
  const globalAdmin = await getUserToken(`${TestUser.GLOBAL_ADMIN}@alkem.io`);
  await clearAddressCounters();
  project.provide('secondFactor', {
    tokens: {
      support: tokens.PLATFORM_SUPPORT,
      usersAdmin: tokens.PLATFORM_USERS_ADMIN,
      settingsAdmin: tokens.PLATFORM_SETTINGS_ADMIN,
      globalAdmin,
    },
  });
  return async () => {
    try {
      if (platformRuleOn(ruleAtStart) || !platformRuleOn(await savePlatformRule())) {
        return;
      }
      const off = await setPlatformRule(false, {
        bearerToken: tokens.PLATFORM_SETTINGS_ADMIN,
      }).catch(() => undefined);
      const byApi =
        off?.body.data?.updatePlatformSettings.security
          ?.secondFactorRequiredForPlatformRoles === false;
      if (!byApi) await restorePlatformRule(ruleAtStart);
      throw new Error(
        `second-factor: the run ended with the platform rule on, which it found off; it was switched off ${byApi ? 'through the API' : 'by SQL, which records no off transition'}`
      );
    } finally {
      await clearAddressCounters();
    }
  };
}
