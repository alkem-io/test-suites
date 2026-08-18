// Tiny CLI shim so validate-parallel-lanes.test.mjs can exercise the real
// `parseNightlyWorkers` (server-api/src/scripts/nightly-lanes.ts) as a child
// process, one env value at a time, without pulling a TS loader into the
// plain `node --test` runner itself. Run via `pnpm exec tsx` so the dynamic
// import of a sibling .ts file resolves.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const repoRoot = process.argv[2];
const modUrl = pathToFileURL(
  path.join(repoRoot, 'server-api', 'src', 'scripts', 'nightly-lanes.ts')
).href;

const { parseNightlyWorkers } = await import(modUrl);
const raw = process.env.NIGHTLY_MAX_WORKERS_TEST_INPUT;

try {
  console.log(JSON.stringify({ ok: true, result: parseNightlyWorkers(raw) }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, message: e.message }));
  process.exit(1);
}
