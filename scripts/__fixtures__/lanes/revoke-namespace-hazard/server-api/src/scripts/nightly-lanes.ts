export const NIGHTLY_INCLUDE = ['src/functional-api/account/**/*.it-spec.ts'];
export const PARALLEL_MANIFEST = ['src/functional-api/account/risky.it-spec.ts'];
export function parseNightlyWorkers(raw) {
  if (raw === undefined || raw === '') return 1;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('NIGHTLY_MAX_WORKERS must be an integer >= 1; got ' + JSON.stringify(raw));
  }
  return parsed;
}
