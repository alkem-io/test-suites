// Tiny CLI shim so validate-parallel-lanes.test.mjs can exercise the real
// `resolveNightlyWorkers` (server-api/src/scripts/nightly-lanes.ts) as a
// child process, one input combination at a time, without pulling a TS
// loader into the plain `node --test` runner itself. Run via `pnpm exec tsx`
// so the dynamic import of a sibling .ts file resolves. Mirrors
// parse-workers-cli.mjs's shape.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const repoRoot = process.argv[2];
const modUrl = pathToFileURL(
  path.join(repoRoot, 'server-api', 'src', 'scripts', 'nightly-lanes.ts')
).href;

const { resolveNightlyWorkers } = await import(modUrl);

const requested = process.env.NIGHTLY_MAX_WORKERS_TEST_INPUT;
const capPercent = process.env.NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT_TEST_INPUT;
const cpusRaw = process.env.NIGHTLY_TEST_CPUS;
const cpus = cpusRaw !== undefined ? Number(cpusRaw) : undefined;

try {
  const result =
    cpus !== undefined
      ? resolveNightlyWorkers(requested, capPercent, cpus)
      : resolveNightlyWorkers(requested, capPercent);
  console.log(JSON.stringify({ ok: true, result }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, message: e.message }));
  process.exit(1);
}
