import { beforeAll } from 'vitest';
import { grantSingleRoleFixtures } from '@alkemio/tests-lib';

/**
 * workspace#027-platform-role-redesign (qual-ts-14, 2026-07-30 fix wave) —
 * project-scoped `setupFiles` entry, wired ONLY into the `platform-roles`
 * and `platform-roles-canonical` vitest projects (`vitest.config.ts`), never
 * the shared root `globalTestsSetup.ts`. Seeding these 13 single-role
 * fixtures is this feature's own concern; running it from the shared
 * root setup meant an unrelated project (e.g. `callouts`, `storage`) could
 * be hard-failed by a fixture this feature owns, and ran ahead of the
 * env-prerequisite gate besides.
 *
 * `beforeAll` here (not a bare top-level call) matches this repo's own
 * `setupTests.ts` convention for `setupFiles`. The module-level `seeded`
 * guard is the actual de-dup mechanism: with `isolate: false` and
 * `fileParallelism: false` (both platform-roles projects), this module
 * loads once per worker and `beforeAll` re-fires per test FILE within that
 * worker — the flag ensures the live seeding call itself runs exactly once.
 */
let seeded = false;

beforeAll(async () => {
  if (seeded) return;
  seeded = true;
  await grantSingleRoleFixtures();
}, 300_000);
