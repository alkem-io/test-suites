// Tiny CLI shim so validate-parallel-lanes.test.mjs can exercise the real
// `resolveNightlyWorkers` (server-api/src/scripts/nightly-lanes.ts) as a
// child process, one input combination at a time, without pulling a TS
// loader into the plain `node --test` runner itself. Run via `pnpm exec tsx`
// so the dynamic import of a sibling .ts file resolves. Mirrors
// parse-workers-cli.mjs's shape.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Cleared before the dynamic import: `resolveNightlyWorkers`'s own
// default-parameter fallback for the opt-out reads this REAL var name
// straight off `process.env`, so a stray value inherited from the host shell
// (spawnSync forwards `...process.env`) would otherwise make the `optOut ===
// undefined` cases below non-deterministic. Every test case passes its
// intended opt-out value explicitly via `optOut` instead.
delete process.env.NIGHTLY_ALLOW_CPU_OVERSUBSCRIPTION;

const repoRoot = process.argv[2];
const modUrl = pathToFileURL(
  path.join(repoRoot, 'server-api', 'src', 'scripts', 'nightly-lanes.ts')
).href;

const { resolveNightlyWorkers } = await import(modUrl);

const requested = process.env.NIGHTLY_MAX_WORKERS_TEST_INPUT;
const capPercent = process.env.NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT_TEST_INPUT;
const optOut = process.env.NIGHTLY_ALLOW_CPU_OVERSUBSCRIPTION_TEST_INPUT;
const cpusRaw = process.env.NIGHTLY_TEST_CPUS;
const cpus = cpusRaw !== undefined ? Number(cpusRaw) : undefined;

try {
  const result =
    cpus !== undefined
      ? resolveNightlyWorkers(requested, capPercent, optOut, cpus)
      : resolveNightlyWorkers(requested, capPercent, optOut);
  console.log(JSON.stringify({ ok: true, result }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, message: e.message }));
  process.exit(1);
}
