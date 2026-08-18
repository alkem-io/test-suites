export const NIGHTLY_INCLUDE = ['src/functional-api/account/**/*.it-spec.ts'];
export const PARALLEL_MANIFEST = ['src/functional-api/account/safe.it-spec.ts'];
// Deliberately references a file that does not exist on disk — proves the
// guard fails closed on a stale exclusion (e.g. after a rename/delete)
// instead of silently treating it as a no-op.
export const NIGHTLY_EXCLUDE = [
  'src/functional-api/account/renamed-away.it-spec.ts',
];
export function parseNightlyWorkers(raw) {
  if (raw === undefined || raw === '') return 1;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('NIGHTLY_MAX_WORKERS must be an integer >= 1; got ' + JSON.stringify(raw));
  }
  return parsed;
}
