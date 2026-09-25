import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allowedRoles,
  CAPABILITIES,
  CAPABILITY_GROUPS,
  capabilitiesFor,
  PLATFORM_ROLES,
  ROLE_SUMMARY,
} from './capabilities.data';
import type { Capability, Coverage, CoverageStatus } from './capabilities.data';
import { SCENARIOS } from './scenarios.data';

/**
 * Renders `platform-roles-test-plan.md` from `capabilities.data.ts` and
 * `scenarios.data.ts`. The plan is an OUTPUT — edit the data, re-run this:
 *
 *   cd server-api && pnpm exec tsx src/functional-api/platform-roles/generate-test-plan.ts
 *
 * `--check` exits 1 when the committed plan is stale (used by coverage-guard).
 */

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, 'platform-roles-test-plan.md');

const ICON: Record<CoverageStatus, string> = {
  automated: '✅ automated',
  planned: '🟡 planned',
  exclusive: '🟠 exclusive (on demand, never nightly)',
  'not-applicable': '— n/a',
  'not-automated': '⛔ not automated',
};

const BASIS_MARK = {
  named: '',
  family: '',
  silent: ' ⚠️',
  conflict: ' ❌',
} as const;

const short = (role: string): string =>
  role
    .replace(/^PLATFORM_/, '')
    .replace(/^FEATURE_/, 'F·')
    .toLowerCase()
    .replace(/_/g, ' ');

const cell = (c: Coverage): string =>
  c.reason ? `${ICON[c.status]} — ${c.reason}` : ICON[c.status];

const tally = (items: readonly Coverage[]): string => {
  const counts = new Map<CoverageStatus, number>();
  for (const i of items) counts.set(i.status, (counts.get(i.status) ?? 0) + 1);
  return (Object.keys(ICON) as CoverageStatus[])
    .filter(s => counts.has(s))
    .map(s => `${counts.get(s)} ${s}`)
    .join(' · ');
};

const live = (c: Capability): boolean =>
  c.positive.status !== 'not-automated' ||
  c.negative.status !== 'not-automated';

const liveCaps = CAPABILITIES.filter(live);
const positiveChecks = liveCaps.reduce(
  (n, c) =>
    n + (c.positive.status === 'not-applicable' ? 0 : allowedRoles(c).length),
  0
);
const negativeChecks = liveCaps.reduce(
  (n, c) => n + (PLATFORM_ROLES.length - allowedRoles(c).length),
  0
);

const lines: string[] = [];
const out = (s = ''): void => void lines.push(s);

out(
  '# Test plan — Platform roles: who can do what (workspace#027-platform-role-redesign)'
);
out();
out(
  '> **Status:** Built — QA-lead directive in-session 2026-09-18 (single delivery); awaiting review at PR · **Depth:** Deep (authorization change, cross-repo, release-train gated) · **Story:** alkem-io/server#4764 · Epic alkem-io/server#6320 · **Generated** from `capabilities.data.ts` + `scenarios.data.ts` — do not edit by hand'
);
out();
out(
  'The single Global Admin "god mode" is decomposed into 10 `Platform …` administration roles and 4 `Feature …` roles. This suite answers one question per role, in both directions: **can it do everything the acceptance criteria give it, and is it refused everything else.** ' +
    `It tracks **${CAPABILITIES.length} administrative capabilities** in ${Object.keys(CAPABILITY_GROUPS).length} groups × **${PLATFORM_ROLES.length} roles** = **${positiveChecks} positive** and **${negativeChecks} negative** role-level checks, plus **${SCENARIOS.length} rule scenarios** that a grid cannot express.`
);
out();
out(
  '**Negatives run at Slice A.** Each test user holds exactly one target role and no legacy credential (scenario X1 proves it first), so "this role is refused" is a valid assertion today — it does not have to wait for the legacy roles to be removed.'
);
out();
out('## How to run');
out();
out('```bash');
out(
  '# Against a stack running the 027 server. Needs the usual server-api .env.'
);
out('cd server-api');
out(
  'pnpm run test:platform-roles              # everything safe, two sequential phases, ~2 min warm'
);
out(
  'pnpm exec vitest run --project platform-roles src/functional-api/platform-roles/roles/platform-support.it-spec.ts   # one role'
);
out(
  'pnpm run test:platform-roles:exclusive    # platform-wide positives — ON DEMAND ONLY, never nightly; a stack nothing else is using'
);
out(
  'pnpm run test:platform-roles:plan         # re-render this file from the two data tables'
);
out('```');
out();
out(
  'Phase 1 (`platform-roles`) runs the 14 role files and the read-only specs in parallel; phase 2 (`platform-roles-rules`) runs the rule specs afterwards. One project-level globalSetup serves both: it seeds the 14 single-role users once, refuses to continue if any of them holds anything but its one role, and builds each capability group’s fixtures concurrently.'
);
out();
out('## Risk');
out();
out('| # | Risk (in user terms) | Likelihood | Impact | Level | Drives |');
out('|---|---|---|---|---|---|');
out(
  '| 1 | An operator with a narrow role can still do something outside it (a sibling mutation kept its old gate) | Med | High | **High** | every negative in the capability tables |'
);
out(
  '| 2 | A role cannot do its own job after the legacy grants are removed (lost capability on release day) | Med | High | **High** | every positive in the capability tables |'
);
out(
  '| 3 | Someone escalates: self-assignment, Users Admin handing out a Platform role, a Platform role reaching an organization | Low | Critical | **High** | R1–R6, O2, X2 |'
);
out(
  '| 4 | A revoked or demoted operator keeps access until a cache expires | Med | High | **High** | I1, O1 |'
);
out(
  '| 5 | The audit trail is readable by the people it records, or misses rejected attempts | Low | High | Med | T1, T2, AR1, AR2, H3 |'
);
out(
  '| 6 | The suite itself harms a shared environment or breaks other suites | Med | High | **High** | destructive positives isolated in an on-demand `exclusive` project that the nightly never runs + snapshot/restore + own vitest project + one-time seeding |'
);
out();
out('## Coverage at a glance');
out();
out(`- Capabilities — positive: ${tally(CAPABILITIES.map(c => c.positive))}`);
out(`- Capabilities — negative: ${tally(CAPABILITIES.map(c => c.negative))}`);
out(`- Rule scenarios — positive: ${tally(SCENARIOS.map(s => s.positive))}`);
out(`- Rule scenarios — negative: ${tally(SCENARIOS.map(s => s.negative))}`);
out();
out('| Role | Spec file | Can (positive) | Cannot (negative) |');
out('|---|---|---|---|');
for (const role of PLATFORM_ROLES) {
  const { can, cannot } = capabilitiesFor(role);
  const file = `roles/${role.toLowerCase().replace(/_/g, '-')}.it-spec.ts`;
  out(
    `| ${role} | \`${file}\` | ${can.filter(live).length} | ${cannot.filter(live).length} |`
  );
}
out();
out('## Allowed — verified against the requirements');
out();
{
  const n = (b: string): number =>
    CAPABILITIES.filter(c => c.requirement.basis === b).length;
  out(
    `Checked 2026-09-18 against \`spec.md\` (§Target global role model, §Action → owning role) and \`contracts/privilege-map.md\`. **All ${Object.keys(CAPABILITY_GROUPS).length} action families' owner sets match the spec exactly**, including the three declared exceptions (Content Full Access on A6 delete, A7 and the A16 read). The spec assigns owners per action FAMILY; per surface: **${n('named')}** are named in the requirements, **${n('family')}** are covered by their family's wording, **${n('silent')}** are backed by neither (⚠️), **${n('conflict')}** contradict a requirement (❌).`
  );
  out();
  out('| Capability | Allowed today | Finding |');
  out('|---|---|---|');
  for (const c of CAPABILITIES.filter(c => c.requirement.note))
    out(
      `| ${c.requirement.basis === 'conflict' ? '❌' : '⚠️'} \`${c.id}\` | ${allowedRoles(c).map(short).join(', ')} | ${c.requirement.note} |`
    );
  out();
  out(
    'These rows are still tested as implemented — the finding is for product/spec owners to confirm or correct, and the table is where the answer gets recorded.'
  );
}
out();
out('## What a positive proves');
out();
out(
  '"The call returned no error" is never sufficient on its own. Each capability declares what its positive must observe:'
);
out();
{
  const k = (x: string): number =>
    CAPABILITIES.filter(c => c.verifies?.kind === x).length;
  out('| Kind | Count | A passing positive means |');
  out('|---|---|---|');
  out(
    `| **effect** | ${k('effect')} | the call succeeded AND the effect is read back independently (entity gone / field changed / holder listed / resource on the target account) |`
  );
  out(
    `| **returns-data** | ${k('returns-data')} | the read returned KNOWN fixture data — an always-empty or always-null resolver fails |`
  );
  out(
    `| **executed** | ${k('executed')} | success payload only — maintenance jobs (resets, re-index, migrations) have no API-visible effect to read back; this is the honest limit |`
  );
  out(
    `| **reached-resolver** | ${k('reached-resolver')} | an external dependency is absent in test environments; the oracle is a NON-authorization error on the root field, proving the gate was passed |`
  );
}
out();
out('## Capability → coverage');
out();
out(
  '"Allowed" = owners, plus roles reaching it by a declared accepted exception (*italic*). Every role not listed is a negative.'
);
for (const [id, group] of Object.entries(CAPABILITY_GROUPS)) {
  const caps = CAPABILITIES.filter(c => c.group === id);
  if (caps.length === 0) continue;
  out();
  out(`### ${id} — ${group.title}`);
  out();
  out(`Spec: ${group.spec}`);
  out();
  out(
    '| Capability | Allowed | Positive — must observe | Positive | Negative |'
  );
  out('|---|---|---|---|---|');
  for (const c of caps) {
    const allowed =
      [
        ...c.owners.map(short),
        ...c.acceptedExtra.map(r => `*${short(r)}*`),
      ].join(', ') || '**nobody**';
    const tags = [
      c.variant,
      c.renamedAtSliceB ? `renamed \`${c.renamedAtSliceB}\` at Slice B` : '',
      c.retiredAtSliceB ? 'deleted at Slice B' : '',
      c.kind === 'mcp-tool' ? 'MCP tool' : '',
    ].filter(Boolean);
    out(
      `| \`${c.surface}\`${tags.length ? ` (${tags.join('; ')})` : ''}${BASIS_MARK[c.requirement.basis]} | ${allowed} | ${c.verifies ? `**${c.verifies.kind}** — ${c.verifies.oracle}` : '—'} | ${cell(c.positive)} | ${cell(c.negative)} |`
    );
  }
}
out();
out('## Per role — what it can do, and what it is refused');
out();
out(
  'One section per role, in the order of `roles/*.it-spec.ts`. **Can** lists every capability the role is allowed, with what a passing positive must observe. **Cannot** lists everything else — each one is a negative that must be refused at the authorization gate. Marks: 🟠 runs in the on-demand project only · ⛔ not automated (see gaps) · no mark = runs in the default project.'
);
{
  const mark = (c: Coverage): string =>
    c.status === 'exclusive'
      ? ' 🟠'
      : c.status === 'not-automated'
        ? ' ⛔'
        : '';
  for (const role of PLATFORM_ROLES) {
    const { can, cannot } = capabilitiesFor(role);
    const summary = ROLE_SUMMARY[role];
    out();
    out(`### ${role}`);
    out();
    out(
      `**${summary.name}** — \`roles/${role.toLowerCase().replace(/_/g, '-')}.it-spec.ts\``
    );
    out();
    out(`- **Owns:** ${summary.owns}`);
    out(`- **Must not:** ${summary.mustNot}`);
    out();
    const positives = can.filter(c => c.positive.status !== 'not-applicable');
    if (positives.length === 0) {
      out(
        '**Can:** nothing in the capability table — this role owns no administrative capability. What it confers is proven by the Feature-role scenarios (F1–F3) below.'
      );
    } else {
      out(`**Can (${positives.length})**`);
      out();
      out('| Capability | Reaches it as | A passing positive must observe |');
      out('|---|---|---|');
      for (const c of positives) {
        const how = c.owners.includes(role) ? 'owner' : '*accepted exception*';
        out(
          `| \`${c.id}\`${c.variant ? ` (${c.variant})` : ''}${mark(c.positive)} | ${how} | ${c.verifies ? `**${c.verifies.kind}** — ${c.verifies.oracle}` : '—'} |`
        );
      }
    }
    out();
    out(`**Cannot (${cannot.length})** — by group:`);
    out();
    for (const [id, group] of Object.entries(CAPABILITY_GROUPS)) {
      const refused = cannot.filter(c => c.group === id);
      if (refused.length === 0) continue;
      out(
        `- **${id}** ${group.title}: ${refused.map(c => `\`${c.surface.split(' ')[0]}\`${c.variant ? ` (${c.variant})` : ''}${mark(c.negative)}`).join(', ')}`
      );
    }
  }
}
out();
out('## Rule scenarios');
out();
out(
  '| Id | Scenario | Spec | File | Positive — what the test must observe | Negative — what the test must observe |'
);
out('|---|---|---|---|---|---|');
for (const s of SCENARIOS) {
  const half = (h: Coverage & { oracle?: string }): string =>
    [
      ICON[h.status],
      h.oracle,
      h.reason ? (h.oracle ? `⚠️ ${h.reason}` : h.reason) : undefined,
    ]
      .filter(Boolean)
      .join(' — ');
  out(
    `| ${s.id} | ${s.title} | ${s.spec} | ${s.file === '-' ? '—' : `\`${s.file}\``} | ${half(s.positive)} | ${half(s.negative)} |`
  );
}
out();
out('## Existing tests requiring update');
out();
out('| File | Currently | Must become |');
out('|---|---|---|');
out(
  '| `server-api/.../graphql-guard/graphql-guard-nested-queries.it-spec.ts` | Expects GLOBAL_ADMIN space privileges with `PLATFORM_ADMIN` — 5 of 8 tests red on the 027 server (run 2026-09-18) | Same swap its two sibling guard specs got: drop `PLATFORM_ADMIN`, add `ACCOUNT_LICENSE_MANAGE` + `PLATFORM_CONTENT_FULL_ACCESS` |'
);
out(
  '| `client-web/.../authz-admin-guard/platform-global-roles.spec.ts` | Navigates to the removed `GLOBAL_COMMUNITY_READER` role page; on the 027 client that falls back to the first offered role and **grants Platform Roles Admin to `qa.user`** | Rewrite against a target role before the 027 client reaches the nightly (UI phase) |'
);
out();
out('## Not covered — known gaps');
out();
out('| Item | Half | Why not automated | Where it belongs |');
out('|---|---|---|---|');
const gap = (label: string, halfName: string, c: Coverage): void => {
  if (c.status === 'not-automated')
    out(`| ${label} | ${halfName} | ${c.reason ?? ''} | ${c.belongs ?? ''} |`);
};
for (const c of CAPABILITIES) {
  gap(`\`${c.id}\``, 'positive', c.positive);
  if (c.negative.status !== c.positive.status)
    gap(`\`${c.id}\``, 'negative', c.negative);
}
for (const s of SCENARIOS) {
  gap(`${s.id} — ${s.title}`, 'positive', s.positive);
  gap(`${s.id} — ${s.title}`, 'negative', s.negative);
}
out(
  '| UI behaviour per role | both | Sections per role and the Authorization page ARE automated in `client-web/src/functional-e2e/platform-roles/` (`pnpm run test:platform-roles` in client-web, 47 tests). One UI can/cannot per role and immediacy in the UI are still manual | `platform-roles-admin-manual-checklist.md`, Parts C and D |'
);
out();
out('## Currently red — product findings, not test defects');
out();
out('| Test | Observed | Why it stays red |');
out('|---|---|---|');
out(
  '| `PLATFORM_SETTINGS_ADMIN › can › A13.updateLicensePlan` | the mutation reports success; the value re-reads unchanged | `LicensePlanService.update()` saves the plan without applying the input (also on `develop`). A positive must observe its effect — there is none to observe |'
);
out(
  '| `PLATFORM_RESOURCE_ADMIN › cannot › A16.createPlatformRolesAccess` | Resource Admin READS a private space it is not a member of | the server grants it READ on every space deliberately; the requirements allow only Spaces Reader (+ the Content Full Access exception). Needs a product decision — then either the table or the server changes |'
);
out(
  '| `PLATFORM_CONTENT_FULL_ACCESS › cannot › A13.createLicensePlan` | Content Full Access CREATES a license plan | the five censused A13 mutations check a dedicated in-memory policy, exactly so that the root CRUD cascade does not admit Content Full Access; `createLicensePlan` was left out of the census and still checks `licensingFramework.authorization`, which inherits that cascade. Found 2026-09-21 |'
);
out();
out('## What is genuinely proven');
out();
{
  const count = (items: readonly Coverage[], st: CoverageStatus): number =>
    items.filter(i => i.status === st).length;
  const capPos = CAPABILITIES.map(c => c.positive);
  const capNeg = CAPABILITIES.map(c => c.negative);
  out(
    `Verified live against the 027 server, twice in a row with identical results (2026-09-18): **${count(capPos, 'automated')} of ${CAPABILITIES.length} capabilities have an automated positive and ${count(capNeg, 'automated')} an automated negative**, run for all ${PLATFORM_ROLES.length} roles — ${positiveChecks} positive and ${negativeChecks} negative role-level checks in the table, of which the exclusive and not-automated rows are excluded from the default run. Every negative is a refusal AT THE AUTHORIZATION GATE (an authorization code on the gate path), never a validation error, a not-found, or a forbidden sub-field. Every positive observes what its row declares — an effect read back, known data returned, a success payload, or (5 rows) a non-authorization error proving the gate was passed.`
  );
  out();
  out(
    `Rule scenarios: ${count(
      SCENARIOS.map(x => x.positive),
      'automated'
    )} positive and ${count(
      SCENARIOS.map(x => x.negative),
      'automated'
    )} negative halves automated. **What is NOT proven:** anything that reads a role-assignment audit record (the MCP endpoint is disabled on the stack this was built against — those halves are visible \`test.todo\`s that switch on with \`PLATFORM_ROLES_MCP=1\` once the endpoint answers); the ${count(capPos, 'exclusive')} platform-wide positives in the \`exclusive\` project, which are written and type-checked but have NEVER been executed; restart and fault-injection scenarios; and the UI.`
  );
}
out();

const rendered = lines.join('\n');

if (process.argv.includes('--check')) {
  const { readFileSync } = await import('node:fs');
  const current = readFileSync(target, 'utf8');
  if (current !== rendered) {
    console.error(
      'platform-roles-test-plan.md is stale — re-run generate-test-plan.ts'
    );
    process.exit(1);
  }
} else {
  writeFileSync(target, rendered);
  console.log(`wrote ${target} (${lines.length} lines)`);
}
