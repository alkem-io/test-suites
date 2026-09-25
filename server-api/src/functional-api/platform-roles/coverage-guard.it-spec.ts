import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, inject, test } from 'vitest';
import { PLATFORM_ROLE_NAMES } from '@alkemio/tests-lib';
import { CAPABILITIES, PLATFORM_ROLES } from './capabilities.data';
import type { Coverage } from './capabilities.data';
import { SCENARIOS } from './scenarios.data';
import { GROUPS, invocationFor } from './_support/groups';
import { runnableFor } from './_support/role-spec';
import { rawRead } from './_support/raw-request';

/**
 * Keeps the three statements of coverage from drifting apart: the data tables
 * (what the plan SAYS is covered), the code (what actually runs) and the server
 * (which roles exist). Everything but the last check reads files only.
 *
 * While capability groups are still being written, a missing invocation or a
 * missing scenario file is expected; those two checks report a count and only
 * FAIL under `PLATFORM_ROLES_GUARD_STRICT=1`. Everything else always fails.
 */
const here = dirname(fileURLToPath(import.meta.url));
const STRICT = process.env.PLATFORM_ROLES_GUARD_STRICT !== '0';

const runs = (c: Coverage): boolean =>
  c.status === 'planned' || c.status === 'automated';
const list = (items: string[]): string =>
  `${items.length}:\n  ${items.join('\n  ')}`;

/** Fails under STRICT; otherwise stays in the report as a counted todo. */
const gapCheck = (name: string, gaps: string[]): void => {
  if (STRICT || gaps.length === 0) {
    test(name, () => expect(gaps, list(gaps)).toEqual([]));
  } else {
    test.todo(
      `${name} — ${gaps.length} gaps; PLATFORM_ROLES_GUARD_STRICT=1 lists and enforces them`
    );
  }
};

/** `describe('<id>'` strings that look like a scenario id, per spec file. */
const SCENARIO_ID = /describe\(\s*['"`]([A-Z]+\d+[a-z]?\.[a-z0-9-]+)['"`]/g;
const specFiles = [
  ...readdirSync(here).filter(f => f.endsWith('.it-spec.ts')),
  ...(existsSync(join(here, 'rules'))
    ? readdirSync(join(here, 'rules'))
        .filter(f => f.endsWith('.it-spec.ts'))
        .map(f => `rules/${f}`)
    : []),
];
const describedIn = new Map(
  specFiles.map(file => [
    file,
    [...readFileSync(join(here, file), 'utf8').matchAll(SCENARIO_ID)].map(
      m => m[1]
    ),
  ])
);

describe('coverage guard', () => {
  gapCheck(
    'every capability that runs has an invocation in _support/groups',
    CAPABILITIES.filter(
      c => (runs(c.positive) || runs(c.negative)) && !invocationFor(c.id)
    ).map(c => c.id)
  );

  test('every invocation belongs to a capability row', () => {
    const known = new Set(CAPABILITIES.map(c => c.id));
    const orphans = GROUPS.flatMap(g =>
      Object.keys((g as { invocations: object }).invocations).filter(
        id => !known.has(id)
      )
    );
    expect(orphans, list(orphans)).toEqual([]);
  });

  const runnable = SCENARIOS.filter(
    s => s.file !== '-' && (runs(s.positive) || runs(s.negative))
  );

  gapCheck('every scenario’s spec file exists', [
    ...new Set(runnable.filter(s => !describedIn.has(s.file)).map(s => s.file)),
  ]);

  test('every scenario is described in its named file, where that file exists', () => {
    const missing = runnable
      .filter(
        s => describedIn.has(s.file) && !describedIn.get(s.file)?.includes(s.id)
      )
      .map(s => `${s.id} → ${s.file}`);
    expect(missing, list(missing)).toEqual([]);
  });

  test('every described scenario id has a row in scenarios.data.ts, naming that file', () => {
    const rows = new Map(SCENARIOS.map(s => [s.id, s.file]));
    const strays = [...describedIn].flatMap(([file, ids]) =>
      ids.filter(id => rows.get(id) !== file).map(id => `${id} in ${file}`)
    );
    expect(strays, list(strays)).toEqual([]);
  });

  test('the shared role-user list (lib) names exactly the roles of the capability table', () => {
    expect([...PLATFORM_ROLE_NAMES].sort()).toEqual([...PLATFORM_ROLES].sort());
  });

  test('every role has its spec file, with a `can` block exactly when the role has positives to run', () => {
    const problems: string[] = [];
    for (const role of PLATFORM_ROLES) {
      const file = join(
        here,
        'roles',
        `${role.toLowerCase().replace(/_/g, '-')}.it-spec.ts`
      );
      if (!existsSync(file)) {
        problems.push(`${role}: no ${file}`);
        continue;
      }
      const source = readFileSync(file, 'utf8');
      if (!source.includes(`const ROLE = '${role}';`)) {
        problems.push(`${role}: its file does not declare ROLE = '${role}'`);
      }
      // An empty describe() fails the run, and a missing one hides positives.
      const hasCanBlock = source.includes("describe('can'");
      const hasPositives = runnableFor(role).can.length > 0;
      if (hasCanBlock !== hasPositives) {
        problems.push(
          `${role}: \`can\` block ${hasCanBlock ? 'present' : 'missing'} but the table has ${hasPositives ? 'positives' : 'no positives'} to run`
        );
      }
    }
    expect(problems).toEqual([]);
  });

  test('the committed platform-roles-test-plan.md is what the generator renders', () => {
    const tsx = createRequire(import.meta.url).resolve('tsx/cli');
    const check = spawnSync(
      process.execPath,
      [tsx, join(here, 'generate-test-plan.ts'), '--check'],
      {
        encoding: 'utf8',
      }
    );
    expect(check.status, check.stderr || check.stdout).toBe(0);
  });

  test('LIVE: the platform role-set offers exactly the 14 target roles plus the known legacy names', async () => {
    // A role added on the server must get its rows here before this passes again.
    const LEGACY_AND_BASE = [
      'REGISTERED',
      'GLOBAL_ADMIN',
      'GLOBAL_SUPPORT',
      'GLOBAL_LICENSE_MANAGER',
      'GLOBAL_SPACES_READER',
      'GLOBAL_COMMUNITY_READER',
      'GLOBAL_PLATFORM_MANAGER',
      'GLOBAL_SUPPORT_MANAGER',
      'PLATFORM_BETA_TESTER',
      'PLATFORM_VC_CAMPAIGN',
      'PLATFORM_ASSISTANT_ACCESS',
    ];
    const { platform } = await rawRead<{
      platform: { roleSet: { roleNames: string[] } };
    }>(
      inject('platformRoles').tokens.PLATFORM_ROLES_ADMIN,
      'query { platform { roleSet { roleNames } } }'
    );
    expect([...platform.roleSet.roleNames].sort()).toEqual(
      [...PLATFORM_ROLES, ...LEGACY_AND_BASE].sort()
    );
  });
});
