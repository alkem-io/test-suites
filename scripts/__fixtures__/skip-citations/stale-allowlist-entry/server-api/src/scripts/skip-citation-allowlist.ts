export interface UndocumentedSkipEntry {
  file: string;
  kind: string;
  title: string;
  recordedOn: string;
  note: string;
}

export const UNDOCUMENTED_SKIPS: UndocumentedSkipEntry[] = [
  {
    file: 'src/functional-api/x/a.it-spec.ts',
    kind: 'test.skip',
    title: 'a test that no longer exists',
    recordedOn: '2026-08-21',
    note: 'grandfathered for the self-test fixture — deliberately stale',
  },
];
