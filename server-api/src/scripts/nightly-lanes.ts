/**
 * Single source of truth for nightly lane membership.
 *
 * `vitest.config.ts` (which builds the `nightly-parallel`/`nightly-serial`
 * project includes/excludes from this data), `validate-parallel-lanes.ts`
 * (which proves the partition and hazard-soundness of the promotion), and
 * `globalTestsSetup.ts` (which logs the resolved lane counts for the CI
 * assert-config step) all import this module, so the configured lanes, the
 * guard's proof, and the run-time log line can never drift apart from each
 * other.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The 13 area globs that make up the nightly scope — byte-identical to the
 * legacy `nightly` project's `include` list in `vitest.config.ts`. Never
 * edited as part of lane-membership work; only the promotion manifest below
 * moves files between lanes.
 */
export const NIGHTLY_INCLUDE = [
  'src/functional-api/account/**/*.it-spec.ts',
  'src/functional-api/roleset/**/*.it-spec.ts',
  'src/functional-api/contributor-management/**/*.it-spec.ts',
  'src/functional-api/callout/**/*.it-spec.ts',
  'src/functional-api/communications/**/*.it-spec.ts',
  'src/functional-api/activity-logs/**/*.it-spec.ts',
  'src/functional-api/journey/**/*.it-spec.ts',
  'src/functional-api/storage/**/*.it-spec.ts',
  'src/functional-api/entitlements/**/*.it-spec.ts',
  'src/functional-api/templates/**/*.it-spec.ts',
  'src/functional-api/calendar/**/*.it-spec.ts',
  'src/functional-api/push-notifications/**/*.it-spec.ts',
  'src/functional-api/language/**/*.it-spec.ts',
] as const;

/**
 * The promotion manifest — the explicit, reviewed list of nightly files
 * granted parallel-lane membership. Repo-relative paths (relative to
 * `server-api/`), matching the style vitest itself reports for `include`
 * matches. Absence from this list means the file runs in the serial lane by
 * construction (`SERIAL_SET` below) — new spec files default to safe without
 * anyone having to remember to add them anywhere.
 *
 * Populated by running `lanes:validate` in audit mode and promoting every
 * file the guard proves passes all hazard rules — see
 * `validate-parallel-lanes.ts` for the rule taxonomy and derivation method.
 *
 * Re-derived twice. First pass (closing the taint-analysis gaps: class
 * declarations, namespace imports, dynamic `import()` were previously
 * invisible to the guard) collapsed this list from 89 to 1 — 88 files
 * reached `TestScenarioFactory.checkAndAssignRoleNameToUser`, an exported
 * class method the old guard could never see, which calls
 * `assignPlatformRole` to grant a platform role to one of three shared pool
 * users. Second pass: that call is guarded by an already-has-it check
 * (`userModel.RoleNames.includes(role)`, ~500 characters before the call,
 * the ONLY occurrence of either the guard idiom or this call site in the
 * whole repo) — a convergent, idempotent grant, not an order-dependent
 * mutation, so rule 2 was split (`validate-parallel-lanes.ts`
 * `guardWindowRe`) to stop flagging guarded grants while a new rule 6
 * (no guard exemption, ever) keeps failing closed on any REVOCATION
 * reachable from a promoted file, and a new rule 7 catches assertions that
 * read a shared user's role state. Result: this list is, byte-for-byte,
 * the same 89 files as before either taint-analysis fix — now arrived at
 * soundly instead of by omission.
 *
 * Third pass (2026-08-18, post-empirical): a real two-lane nightly run at
 * NIGHTLY_MAX_WORKERS=4 (89 parallel / 17 serial — the prior derivation)
 * produced three genuine interference failures the guard had certified
 * parallel-safe — `move-L1-to-L2-auto-invite.it-spec.ts`,
 * `join-hierarchy-parity.it-spec.ts`, and (its rule-5 exemption now
 * REMOVED as disproven) `user2.it-spec.ts` — confirmed by re-running every
 * failed file serially (all three then passed; see
 * `server-api/html-report/{results,serial-confirm-raw}.json` from that run
 * for the raw evidence). Root-caused to two rule gaps, both generalised
 * rather than patched per-file:
 *   - rule 5's content pattern was case-SENSITIVE and missed the repo's own
 *     `getCommunityApplicationsInvitations` wrapper (capital C) around the
 *     `CommunityApplicationsInvitations` GraphQL operation — fixed with an
 *     `i` flag.
 *   - a new rule 8 covers assertions on a shared pool user's roleSet-level
 *     MEMBER state (`isUserMemberOfRoleSet` / `getRoleSetUsersInMemberRole`),
 *     the roleSet-membership counterpart of rule 7's platform-role-state
 *     check — previously uncovered by any rule.
 * Both extensions caught every file in the same call shape, not just the
 * three that happened to fail in this particular run — 13 additional files
 * newly flagged and moved to serial as a result (see
 * `validate-parallel-lanes.ts` rule 5/8 docstrings for the full list and
 * per-file reasoning). The 33 files NOT in this list each trip an
 * independent, real hazard (unguarded platform-role grant/revocation
 * outside the guarded factory path, direct settings mutation, mailbox
 * access, or a global/shared-identity aggregate or membership assertion) —
 * see the guard's own audit output for the per-file rule and hop path.
 */
export const PARALLEL_MANIFEST: string[] = [
  'src/functional-api/activity-logs/activity-log-on-transfer-conversion.it-spec.ts',
  'src/functional-api/activity-logs/challenge-activity-logs.it-spec.ts',
  'src/functional-api/activity-logs/opportunity-activity-logs.it-spec.ts',
  'src/functional-api/activity-logs/space-activity-logs.it-spec.ts',
  'src/functional-api/calendar/calendar-event.it-spec.ts',
  'src/functional-api/calendar/calendar-event-wholeday-timezone.it-spec.ts',
  'src/functional-api/callout/callouts.it-spec.ts',
  'src/functional-api/callout/lock-state/close-state-callouts.it-spec.ts',
  'src/functional-api/callout/post/post-on-callout.it-spec.ts',
  'src/functional-api/callout/transfer/transfer-callout-changed-flow.it-spec.ts',
  'src/functional-api/callout/transfer/transfer-callout-flow-state.it-spec.ts',
  'src/functional-api/callout/transfer/transfer-callout-template-flow.it-spec.ts',
  'src/functional-api/communications/community-updates/updates.it-spec.ts',
  'src/functional-api/communications/conversations/conversation-message-subscriptions.it-spec.ts',
  'src/functional-api/communications/conversations/conversations.it-spec.ts',
  'src/functional-api/communications/conversations/conversation-subscriptions.it-spec.ts',
  'src/functional-api/communications/conversations/delete-conversation.it-spec.ts',
  'src/functional-api/communications/forum-discussions/platform-discussions.it-spec.ts',
  'src/functional-api/communications/reactions/reactions.it-spec.ts',
  'src/functional-api/communications/replies/reply.it-spec.ts',
  'src/functional-api/contributor-management/organization/organization.it-spec.ts',
  'src/functional-api/contributor-management/organization/organization-owner.it-spec.ts',
  'src/functional-api/contributor-management/organization/organization-verification.it-spec.ts',
  'src/functional-api/contributor-management/user/create-user.it-spec.ts',
  'src/functional-api/contributor-management/user/delete-user.it-spec.ts',
  'src/functional-api/contributor-management/virtual-contributor/knowledge-base-access.it-spec.ts',
  'src/functional-api/contributor-management/virtual-contributor/model-card/engine-types.it-spec.ts',
  'src/functional-api/contributor-management/virtual-contributor/model-card/model-card.it-spec.ts',
  'src/functional-api/contributor-management/virtual-contributor/vc-access.it-spec.ts',
  'src/functional-api/contributor-management/virtual-contributor/vc.it-spec.ts',
  'src/functional-api/entitlements/organization-entitlements.it-spec.ts',
  'src/functional-api/journey/conversion/convert-L1-to-L0-basic.it-spec.ts',
  'src/functional-api/journey/conversion/convert-L1-to-L0-url-resolver.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L0-applications-invitations.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L0-authorization.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L0-basic.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L0-rooms.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L2-applications-invitations.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L2-authorization.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L2-basic.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L2-rooms.it-spec.ts',
  'src/functional-api/journey/conversion/move-L2-to-L1-applications-invitations.it-spec.ts',
  'src/functional-api/journey/conversion/move-L2-to-L1-authorization.it-spec.ts',
  'src/functional-api/journey/conversion/move-L2-to-L1-basic.it-spec.ts',
  'src/functional-api/journey/conversion/move-L2-to-L1-rooms.it-spec.ts',
  'src/functional-api/journey/conversion/move-vs-convert-comparison.it-spec.ts',
  'src/functional-api/journey/space/space.it-spec.ts',
  'src/functional-api/journey/subspace/create-subspace.it-spec.ts',
  'src/functional-api/journey/subspace/flows-subspace.it-spec.ts',
  'src/functional-api/journey/subspace/query-subspace-data.it-spec.ts',
  'src/functional-api/journey/subspace/subspace-sorting-and-pinning.it-spec.ts',
  'src/functional-api/journey/subsubspace/subsubspace_authorization.it-spec.ts',
  'src/functional-api/journey/subsubspace/subsubspace.it-spec.ts',
  'src/functional-api/language/invitation-language-seeding.it-spec.ts',
  'src/functional-api/language/user-language-settings.it-spec.ts',
  'src/functional-api/roleset/application/application-lifecycle.it-spec.ts',
  'src/functional-api/roleset/organization/organization2.it-spec.ts',
  'src/functional-api/roleset/organization/organization-edge.it-spec.ts',
  'src/functional-api/roleset/organization/organization.it-spec.ts',
  'src/functional-api/roleset/user/user-edge2.it-spec.ts',
  'src/functional-api/roleset/user/user-edge.it-spec.ts',
  'src/functional-api/storage/auth/organization-document-auth.it-spec.ts',
  'src/functional-api/storage/auth/private-space-document-auth.it-spec.ts',
  'src/functional-api/storage/auth/private-space-private-ch-document-auth.it-spec.ts',
  'src/functional-api/storage/auth/private-space-public-ch-document-auth.it-spec.ts',
  'src/functional-api/storage/auth/public-space-document-auth.it-spec.ts',
  'src/functional-api/storage/auth/public-space-private-ch-document-auth.it-spec.ts',
  'src/functional-api/storage/auth/public-space-public-ch-document-auth.it-spec.ts',
  'src/functional-api/storage/auth/user-document-auth.it-spec.ts',
  'src/functional-api/storage/uploads.it-spec.ts',
  'src/functional-api/templates/post/post-templates.it-spec.ts',
  'src/functional-api/templates/space/space-templates.it-spec.ts',
  'src/functional-api/templates/whiteboard/whiteboard-templates.it-spec.ts',
];

/**
 * Explicit, reviewed exclusion list — files removed from BOTH nightly lanes
 * (parallel and serial) regardless of `NIGHTLY_INCLUDE` membership or
 * `PARALLEL_MANIFEST` promotion. This is a lane-scope decision expressed in
 * config, never a `.skip` inside the spec file itself: the test still
 * exists and can still be run explicitly (`vitest run <path>`), it is
 * simply out of nightly's scope until someone re-includes it.
 *
 * What belongs here: a spec that is in nightly's glob scope but must not run
 * tonight — e.g. a genuinely flaky-under-investigation file, or one whose
 * dependency (server API, fixture data, infra) is known broken right now.
 * It is deliberately NOT the place to park a spec just because it's newly
 * merged or unfamiliar — a failing nightly run is itself useful signal, and
 * exclusion should follow an actual, stated reason to distrust the file,
 * not mere unfamiliarity.
 *
 * Every entry MUST carry an inline comment giving the reason and the date
 * it was excluded, so an exclusion can never quietly rot into an invisible,
 * unexplained permanent gap. Entries are expected to be temporary — added
 * with a plan to re-include once the reason is resolved, not a permanent
 * parking lot. `validate-parallel-lanes.ts` fails the guard, by design, if
 * an entry here no longer matches any file on disk — a stale exclusion
 * (e.g. after the file is renamed or deleted) must be noticed and cleaned
 * up, not silently dropped. `countNightlyFiles()` below folds the exclusion
 * into the reported total, and `globalTestsSetup.ts` logs the excluded
 * count (`excluded=N`) at run time, so a shrinking nightly suite is always
 * visible in the CI run log — not just in this file.
 *
 * Empty by default: nothing is currently excluded.
 */
export const NIGHTLY_EXCLUDE: string[] = [];

/**
 * Parses the feature-owned worker-count pin.
 *
 * Deliberately NOT the vitest built-in `VITEST_MAX_WORKERS` — that variable
 * is applied per-project during `resolveConfig`, so it would also flatten
 * the serial lane's pinned `maxWorkers: 1` (verified against the installed
 * vitest 4.0.18). `NIGHTLY_MAX_WORKERS` is read
 * explicitly here and applied only to the `nightly-parallel` project.
 *
 * GitHub renders an unset repository variable as an empty string in the
 * workflow env, so `""` is treated the same as `undefined` — both default to
 * 1 (today's semantics), not as an invalid value.
 */
export function parseNightlyWorkers(raw: string | undefined): number {
  if (raw === undefined || raw === '') {
    return 1;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `NIGHTLY_MAX_WORKERS must be an integer >= 1; got ${JSON.stringify(raw)}. ` +
        'Unset (or empty) defaults to 1.'
    );
  }
  return parsed;
}

/** The `NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT` default when unset/empty. */
export const DEFAULT_CPU_CAP_PERCENT = 75;

/**
 * Parses the CPU-percentage safety-ceiling variable.
 *
 * Same validation discipline as `parseNightlyWorkers`: GitHub renders an
 * unset repository variable as an empty string, so unset/`""` both default
 * to `DEFAULT_CPU_CAP_PERCENT` rather than being treated as invalid. Any
 * other non-integer, or an integer outside `[1, 100]`, throws naming the
 * variable — this is a percentage of the machine, so 0 or negative would
 * make every run un-runnable and >100 has no meaning.
 */
export function parseCpuCapPercent(raw: string | undefined): number {
  if (raw === undefined || raw === '') {
    return DEFAULT_CPU_CAP_PERCENT;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error(
      `NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT must be an integer between 1 and 100; got ${JSON.stringify(raw)}. ` +
        `Unset (or empty) defaults to ${DEFAULT_CPU_CAP_PERCENT}.`
    );
  }
  return parsed;
}

/**
 * `os.availableParallelism()` (Node ≥19.4/18.15) reports the CPU count the
 * runtime can actually schedule onto — cgroup CPU quota aware, unlike
 * `os.cpus().length`. Falls back to `os.cpus().length` on older runtimes
 * where the function is absent.
 */
function detectAvailableParallelism(): number {
  const maybeFn = (os as unknown as { availableParallelism?: () => number })
    .availableParallelism;
  return typeof maybeFn === 'function' ? maybeFn() : os.cpus().length;
}

/** The resolved nightly-parallel worker count, plus the inputs that produced it. */
export interface NightlyWorkerResolution {
  /** `NIGHTLY_MAX_WORKERS` after defaulting/validation — the explicit intent. */
  requested: number;
  /** `floor(cpus * capPercent / 100)`, never below 1 — the safety ceiling. */
  cpuCap: number;
  /** The CPU count the ceiling was derived from. */
  cpus: number;
  /** `clamp(1, min(requested, cpuCap))` — what actually gets passed to vitest. */
  effective: number;
  /** True when the ceiling reduced the requested value (`cpuCap < requested`). */
  capped: boolean;
}

/**
 * Resolves `nightly-parallel`'s `maxWorkers` from a hybrid rule: an
 * explicit, reproducible INTENT (`NIGHTLY_MAX_WORKERS`) capped by a CPU
 * PERCENTAGE safety ceiling (`NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT`).
 *
 * These solve two different problems and neither one alone is enough.
 * Empirically the real bottleneck for this suite is SERVER throughput, not
 * client CPU — on a 1-replica local server, W=5 took 21.4 min but W=6 took
 * 29.0 min (SLOWER: the server saturates, workers just queue behind it).
 * That means the worker count must stay an explicit, humanly-chosen,
 * reproducible decision — a pure percentage-of-CPU value would silently
 * shift every time the runner's core count changes, making a slow night
 * unexplainable. But a pure explicit number has no floor against reality:
 * pointed at a small/shared runner, an explicit value chosen for a beefy
 * box would thrash it. The percentage is therefore only a CEILING that
 * protects the runner, never the primary signal — `effective` is always
 * `<= requested`, never derived FROM `cpuCap` when `cpuCap >= requested`.
 * `NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT` is resolved via vitest's own
 * percentage-string support (`os.availableParallelism()`-based) — but
 * resolved to a concrete number HERE rather than handed to vitest as a
 * percentage string, so the effective value is knowable, loggable, and
 * assertable instead of being an opaque internal computation.
 */
export function resolveNightlyWorkers(
  requestedRaw: string | undefined,
  cpuCapPercentRaw: string | undefined,
  cpus: number = detectAvailableParallelism()
): NightlyWorkerResolution {
  const requested = parseNightlyWorkers(requestedRaw);
  const capPercent = parseCpuCapPercent(cpuCapPercentRaw);
  const cpuCap = Math.max(1, Math.floor(cpus * (capPercent / 100)));
  const effective = Math.max(1, Math.min(requested, cpuCap));
  return { requested, cpuCap, cpus, effective, capped: cpuCap < requested };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// src/scripts -> server-api
const SERVER_API_ROOT = path.resolve(__dirname, '..', '..');

function walkItSpecFiles(absDir: string): string[] {
  if (!fs.existsSync(absDir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const abs = path.join(absDir, entry.name);
    if (entry.isDirectory()) out.push(...walkItSpecFiles(abs));
    else if (entry.isFile() && abs.endsWith('.it-spec.ts')) out.push(abs);
  }
  return out;
}

/**
 * Resolves `NIGHTLY_INCLUDE` against the real filesystem to report the exact
 * (parallel, serial, total, excluded) file counts — used only for the
 * `[nightly] lanes: …` run-time log line the CI assert-config step reads
 * back (contract C2). `total` already has `NIGHTLY_EXCLUDE` folded out, so
 * `parallel + serial === total` continues to hold with exclusions in play.
 * The guard (`validate-parallel-lanes.ts`) has its own root-aware version of
 * this walk (and its own, independently fail-closed proof of the same
 * partition) so its fixture self-tests can point it at a throwaway tree
 * instead; this one always resolves against the real repo layout.
 */
export function countNightlyFiles(): {
  total: number;
  parallel: number;
  serial: number;
  excluded: number;
} {
  const manifestSet = new Set(PARALLEL_MANIFEST);
  const excludeSet = new Set(NIGHTLY_EXCLUDE);
  const files: string[] = [];
  for (const glob of NIGHTLY_INCLUDE) {
    const baseDir = path.join(
      SERVER_API_ROOT,
      glob.replace(/\/\*\*\/\*\.it-spec\.ts$/, '')
    );
    for (const abs of walkItSpecFiles(baseDir)) {
      files.push(path.relative(SERVER_API_ROOT, abs).split(path.sep).join('/'));
    }
  }
  const excluded = files.filter(f => excludeSet.has(f)).length;
  const total = files.length - excluded;
  return {
    total,
    parallel: manifestSet.size,
    serial: total - manifestSet.size,
    excluded,
  };
}
