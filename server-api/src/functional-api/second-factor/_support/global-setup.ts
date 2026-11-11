import type { TestProject } from 'vitest/node';
import {
  clearAddressCounters,
  seedPlatformRoleUsers,
} from '@alkemio/tests-lib';

/**
 * Once per run: clear the login proxy's per-address counters, seed the
 * single-role users the reset and rule cases act as, and clear again — their
 * sign-ins pass the proxy from the runner's address, and a successful sign-in
 * no longer clears it. Every case clears again in its own `beforeEach`.
 */
export type SecondFactorRunContext = {
  tokens: {
    support: string;
    usersAdmin: string;
    settingsAdmin: string;
  };
};

declare module 'vitest' {
  export interface ProvidedContext {
    secondFactor: SecondFactorRunContext;
  }
}

export default async function setup(project: TestProject) {
  await clearAddressCounters();
  const { tokens } = await seedPlatformRoleUsers();
  await clearAddressCounters();
  project.provide('secondFactor', {
    tokens: {
      support: tokens.PLATFORM_SUPPORT,
      usersAdmin: tokens.PLATFORM_USERS_ADMIN,
      settingsAdmin: tokens.PLATFORM_SETTINGS_ADMIN,
    },
  });
}
