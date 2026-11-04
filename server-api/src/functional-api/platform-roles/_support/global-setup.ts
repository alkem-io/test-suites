import type { TestProject } from 'vitest/node';
import { getGraphqlClient, seedPlatformRoleUsers } from '@alkemio/tests-lib';
import { BUILT_IN_SEQUENCE, GROUPS } from './groups';
import type { GroupFixtures, GroupModule, RunContext } from './types';

/**
 * Project-level globalSetup for `platform-roles` — runs ONCE per run, in the
 * main process, AFTER the root `globalTestsSetup.ts` (vitest merges the two).
 *
 * It is deliberately a globalSetup and not a `setupFiles` entry: vitest
 * invalidates setup modules before every test file, so a module-level "already
 * seeded" flag resets per file and the seeding silently re-runs N times.
 *
 * Order: seed the 14 role users (shared with the Playwright suite — register,
 * one login each, grant, and refuse to continue unless each holds exactly its
 * one role) → build each group's fixtures → provide it all to the workers.
 */

const log = (message: string): void =>
  console.log(`[platform-roles setup] ${message}`);

type Prepared = { ctx: RunContext; teardown: () => Promise<void> };

/**
 * The suite runs as TWO sequential vitest projects (role files first, rule specs
 * second) that both list this file. Seeding and fixtures must still happen once,
 * so the first call prepares, later calls reuse, and teardown runs when the last
 * project is done.
 */
const SHARED = '__alkemioPlatformRolesRun';
type Shared = { prepared: Promise<Prepared>; users: number };

export default async function setup(project: TestProject) {
  const globals = globalThis as unknown as Record<string, Shared | undefined>;
  const shared = (globals[SHARED] ??= { prepared: prepare(), users: 0 });
  shared.users++;
  const { ctx, teardown } = await shared.prepared;
  project.provide('platformRoles', ctx);
  return async () => {
    if (--shared.users === 0) {
      globals[SHARED] = undefined;
      await teardown();
    }
  };
}

const prepare = async (): Promise<Prepared> => {
  const started = Date.now();
  const sdk = getGraphqlClient();
  const runId = Date.now().toString(36);

  // Registration, sign-in, granting and the exactly-one-role check are shared
  // with the Playwright suite — see `seedPlatformRoleUsers` in the lib.
  const { tokens, userIds, bootstrapToken } = await seedPlatformRoleUsers();

  const base = { runId, tokens, userIds, bootstrapToken };
  const fixtures: RunContext['fixtures'] = {};
  const built: { group: GroupModule; fx: GroupFixtures }[] = [];
  const teardownBuilt = async (): Promise<void> => {
    for (const { group, fx } of [...built].reverse()) {
      try {
        await group.teardown(base, sdk, fx);
      } catch (e) {
        // Reported, never swallowed: residue is how a suite poisons its own next run.
        console.error(
          `[platform-roles teardown] ${group.group} left residue: ${(e as Error).message}`
        );
      }
    }
  };

  // Groups are independent by contract, so fixtures are built CONCURRENTLY —
  // except the lane that creates organizations as Platform Support (see
  // BUILT_IN_SEQUENCE). Kratos registration is serialized inside `users.ts`.
  const buildOne = async (group: GroupModule): Promise<void> => {
    const t = Date.now();
    const fx = await group.build(base, sdk);
    fixtures[group.group] = fx;
    built.push({ group, fx });
    log(`${group.group} fixtures built in ${Date.now() - t}ms`);
  };
  const sequential = GROUPS.filter(g => BUILT_IN_SEQUENCE.has(g.group));
  const parallel = GROUPS.filter(g => !BUILT_IN_SEQUENCE.has(g.group));
  const ordered = [...sequential, ...parallel];
  const lane = (async () => {
    const settled: PromiseSettledResult<void>[] = [];
    for (const group of sequential) {
      settled.push(
        await buildOne(group).then(
          () => ({ status: 'fulfilled', value: undefined }) as const,
          reason => ({ status: 'rejected', reason }) as const
        )
      );
    }
    return settled;
  })();
  // Start BOTH lanes before awaiting either.
  const others = Promise.allSettled(parallel.map(buildOne));
  const results = [...(await lane), ...(await others)];
  const failed = results.flatMap((r, i) =>
    r.status === 'rejected'
      ? [`${ordered[i].group}: ${(r.reason as Error)?.message ?? r.reason}`]
      : []
  );
  if (failed.length > 0) {
    // vitest only calls the returned teardown when setup SUCCEEDS — so a failed
    // build must clean up every group that did build, right here.
    await teardownBuilt();
    throw new Error(
      `platform-roles: fixture build failed —\n  ${failed.join('\n  ')}`
    );
  }

  log(`ready in ${Math.round((Date.now() - started) / 1000)}s`);
  return { ctx: { ...base, fixtures }, teardown: teardownBuilt };
};
