export const NIGHTLY_INCLUDE = ['src/functional-api/account/**/*.it-spec.ts'];
export const PARALLEL_MANIFEST = ['src/functional-api/account/safe.it-spec.ts'];
export const NIGHTLY_EXCLUDE = [
  'src/functional-api/account/excluded.it-spec.ts', // fixture-only: proves an excluded file lands in neither lane; reason/date carried inline per the real list's convention
];
export function parseNightlyWorkers(raw) {
  if (raw === undefined || raw === '') return 1;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('NIGHTLY_MAX_WORKERS must be an integer >= 1; got ' + JSON.stringify(raw));
  }
  return parsed;
}
