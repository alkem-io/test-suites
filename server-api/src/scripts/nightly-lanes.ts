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
 * per-file reasoning).
 *
 * Fourth pass: a real two-lane nightly run at W=5 on a freshly recreated DB
 * produced two more genuine interference failures the guard had certified
 * parallel-safe — `callouts.it-spec.ts` (four DDT rows: a shared pool user
 * expected to succeed at updating/deleting a callout got an Authorization
 * error instead) and `convert-L1-to-L0-basic.it-spec.ts` (three "roleSet
 * members/leads/admins are preserved" assertions came back empty instead
 * of the expected preserved set) — confirmed by re-running both files
 * serially (both passed). Root-caused to two more content-rule gaps, both
 * generalised:
 *   - a new rule 9 covers a roleSet's member/lead/admin user list read
 *     straight off (or immediately around) a `convertSpace*`/`moveSpace*`
 *     structural mutation — the server's own conversion service removes
 *     and re-assigns that roleSet's role credentials as part of the move,
 *     and the read can observe the window before that settles.
 *   - a new rule 10 covers the DDT idiom this suite uses to assert a
 *     privileged mutation SUCCEEDS for a named shared-pool role
 *     (`${TestUser.X} | ${'"data":{"someMutation"'}`) — the server's
 *     actor-authorization cache is keyed only by actor ID, so it can be
 *     transiently stale for that shared identity whenever ANY concurrent
 *     file changes one of that same identity's credentials anywhere on
 *     the platform.
 * Rule 9 additionally flagged `move-vs-convert-comparison.it-spec.ts`;
 * rule 10 additionally flagged `close-state-callouts.it-spec.ts` — both
 * were promoted and are now demoted alongside the two files that actually
 * failed. See `validate-parallel-lanes.ts` rule 9/10 docstrings for the
 * server-side evidence and an explicit statement of what rule 10 does NOT
 * cover (it matches one specific DDT success-message idiom, not every
 * possible phrasing of "assert this shared user's privileged action
 * succeeded" — a real, stated residual-risk gap).
 *
 * Fifth pass (per-worker identity pools, aa691544): every rule above except
 * 1 (mailbox), 4 (genuinely platform-wide aggregates) and 9 (the roleSet
 * conversion window) existed to catch two files racing on the SAME shared
 * pool identity — `TestUserManager.users.X` resolving to one Kratos user
 * shared by every concurrently-running file. That premise no longer holds:
 * each vitest worker now mints its own 13-identity pool
 * (`TestUserManager.resolveForCurrentWorker`, keyed by `VITEST_POOL_ID`),
 * and under `pool: 'threads'` a worker runs one file at a time — so two
 * FILES THAT CAN RUN CONCURRENTLY can never resolve the same identity. That
 * is a structural guarantee, not a heuristic, and it is sound regardless of
 * import shape (direct call, class method, namespace import, dynamic
 * import) because it removes the shared SUBJECT the taint engine was
 * tracking calls onto, not the calls themselves. Rules 2 (grant), 3
 * (settings mutation), 6 (revocation), 7 (platform-role assertion), 8
 * (roleSet-membership assertion) and 10 (DDT privileged-success, the
 * ActorContext-cache race) are REMOVED outright — verified per-file, not
 * assumed: every one of their historical trip sites targets
 * `TestUserManager.users.*` / `TestUser.*`, never a file-local unique user
 * (see `validate-parallel-lanes.ts` for the removal rationale and the
 * verification evidence per rule). Rule 5 is NARROWED rather than removed:
 * its old shared-identity-aggregate shape (`me.communityApplications` /
 * `me.communityInvitations` / `rolesUser(userID)` / `myPushSubscriptions`)
 * is actor-ID-scoped at the server (confirmed by reading
 * `me.resolver.fields.ts` / `roles.resolver.queries.ts` /
 * `push.subscription.resolver.queries.ts`) and is neutralised by the same
 * per-worker argument — but a DIFFERENT, real hazard was hiding under the
 * same rule via an accidental case-insensitive substring match on
 * `getCommunityApplicationsInvitations`: the three `*-auto-invite.it-spec.ts`
 * files assert an exact, non-zero `toHaveLength` on invitations an async
 * `autoInvite` background flow creates, gated only by a fixed `delay(5000)`
 * — a load-timing hazard, not an identity-sharing one, and per-worker
 * identity pools do nothing to fix it (heavier concurrent server load makes
 * the fixed delay LESS likely to be enough, not more). Rule 5 now targets
 * exactly that shape; see `validate-parallel-lanes.ts` for the pattern and
 * per-file confirmation that every other rule-5 trip site was the
 * neutralised, actor-scoped kind. Net effect: 25 files promoted
 * (`account/transfer-innovation-pack-to-account`, the five `entitlements/
 * *-functional-entitlements` files plus `roleset/user/user.authorization`
 * that only ever grant/revoke a platform role on `nonSpaceMember` inside
 * their own beforeAll/afterAll, `callout/callouts` and
 * `callout/lock-state/close-state-callouts` — the DDT rule-10 files, all
 * five `roleset/hierarchy-parity/*` files and `roleset/user/user.it-spec.ts`
 * — the rule-8 roleSet-membership-assertion files,
 * `contributor-management/user/update-user` and
 * `push-notifications/push-notifications-settings` — the rule-3 settings
 * files, `journey/conversion/convert-L1-to-L0` (asserts a specific
 * invitation/application ID is gone, not a count — the rule-9 window does
 * NOT apply, it never reads a roleSet member/lead/admin aggregate),
 * `journey/space/space-platform-settings`, both `push-subscriptions-*`
 * files, `roleset/application/application`,
 * `roleset/invitations/invitation-contributors`, `roleset/user/user2` — the
 * remaining rule-5 files whose aggregate is genuinely actor-scoped — and
 * `callout/reactions/callout-reactions.it-spec.ts`, which never tripped any
 * rule at all and was simply never audited into the manifest before now).
 * 14 files stay serial: 4 mailbox files (rule 1 — `organization-settings`,
 * `invitation-external`, `invitation-subspace-admin`, and
 * `deleted-user-session-orphan.it-spec.ts`, newly identified: it transitively
 * re-registers a deleted user through `me-degradation.request.params.ts` ->
 * `registerVerifiedUser` -> `verifyInKratosOrFail` -> the global mailbox,
 * a real hop the third/fourth passes' manifest never happened to audit for
 * rule 1), 7 conversion-window files (rule 9 —
 * `convert-L1-to-L0-basic`, `convert-L1-to-L0-with-L2-to-L1`,
 * `convert-L2-to-L1`, `move-vs-convert-comparison`, and all three
 * `move-L*-community.it-spec.ts` files, which read the SAME post-conversion
 * roleSet aggregate as `convert-L1-to-L0-basic` and were never distinguished
 * from it), and the 3 `*-auto-invite.it-spec.ts` files (the narrowed rule 5
 * — a load-timing hazard this repo's own conventions forbid fixing here,
 * since only lane assignment may change, never the test's fixed delay).
 *
 * The files NOT in this list each trip an independent, real hazard —
 * shared-mailbox access, a genuinely platform-wide aggregate assertion, a
 * load-timing-sensitive exact count off the async auto-invite flow, or a
 * post-conversion roleSet aggregate read inside the server's own
 * remove-then-reassign window — see the guard's own audit output for the
 * per-file rule and hop path.
 */
export const PARALLEL_MANIFEST: string[] = [
  'src/functional-api/account/transfer-innovation-pack-to-account.it-spec.ts',
  'src/functional-api/activity-logs/activity-log-on-transfer-conversion.it-spec.ts',
  'src/functional-api/activity-logs/challenge-activity-logs.it-spec.ts',
  'src/functional-api/activity-logs/opportunity-activity-logs.it-spec.ts',
  'src/functional-api/activity-logs/space-activity-logs.it-spec.ts',
  'src/functional-api/calendar/calendar-event-wholeday-timezone.it-spec.ts',
  'src/functional-api/calendar/calendar-event.it-spec.ts',
  'src/functional-api/callout/callouts.it-spec.ts',
  'src/functional-api/callout/lock-state/close-state-callouts.it-spec.ts',
  'src/functional-api/callout/post/post-on-callout.it-spec.ts',
  'src/functional-api/callout/reactions/callout-reactions.it-spec.ts',
  'src/functional-api/callout/transfer/transfer-callout-changed-flow.it-spec.ts',
  'src/functional-api/callout/transfer/transfer-callout-flow-state.it-spec.ts',
  'src/functional-api/callout/transfer/transfer-callout-template-flow.it-spec.ts',
  'src/functional-api/communications/community-updates/updates.it-spec.ts',
  'src/functional-api/communications/conversations/conversation-message-subscriptions.it-spec.ts',
  'src/functional-api/communications/conversations/conversation-subscriptions.it-spec.ts',
  'src/functional-api/communications/conversations/conversations.it-spec.ts',
  'src/functional-api/communications/conversations/delete-conversation.it-spec.ts',
  'src/functional-api/communications/forum-discussions/platform-discussions.it-spec.ts',
  'src/functional-api/communications/reactions/reactions.it-spec.ts',
  'src/functional-api/communications/replies/reply.it-spec.ts',
  'src/functional-api/contributor-management/organization/organization-owner.it-spec.ts',
  'src/functional-api/contributor-management/organization/organization-verification.it-spec.ts',
  'src/functional-api/contributor-management/organization/organization.it-spec.ts',
  'src/functional-api/contributor-management/user/create-user.it-spec.ts',
  'src/functional-api/contributor-management/user/delete-user.it-spec.ts',
  'src/functional-api/contributor-management/user/update-user.it-spec.ts',
  'src/functional-api/contributor-management/virtual-contributor/knowledge-base-access.it-spec.ts',
  'src/functional-api/contributor-management/virtual-contributor/model-card/engine-types.it-spec.ts',
  'src/functional-api/contributor-management/virtual-contributor/model-card/model-card.it-spec.ts',
  'src/functional-api/contributor-management/virtual-contributor/vc-access.it-spec.ts',
  'src/functional-api/contributor-management/virtual-contributor/vc.it-spec.ts',
  'src/functional-api/entitlements/innovation-packs-functional-entitlements.it-spec.ts',
  'src/functional-api/entitlements/licenses-functional-entitlements.it-spec.ts',
  'src/functional-api/entitlements/organization-entitlements.it-spec.ts',
  'src/functional-api/entitlements/space-functional-entitlements.it-spec.ts',
  'src/functional-api/entitlements/user-entitlements.it-spec.ts',
  'src/functional-api/entitlements/vc-functional-entitlements.it-spec.ts',
  'src/functional-api/journey/conversion/convert-L1-to-L0-url-resolver.it-spec.ts',
  'src/functional-api/journey/conversion/convert-L1-to-L0.it-spec.ts',
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
  'src/functional-api/journey/space/space-platform-settings.it-spec.ts',
  'src/functional-api/journey/space/space.it-spec.ts',
  'src/functional-api/journey/subspace/create-subspace.it-spec.ts',
  'src/functional-api/journey/subspace/flows-subspace.it-spec.ts',
  'src/functional-api/journey/subspace/query-subspace-data.it-spec.ts',
  'src/functional-api/journey/subspace/subspace-sorting-and-pinning.it-spec.ts',
  'src/functional-api/journey/subsubspace/subsubspace.it-spec.ts',
  'src/functional-api/journey/subsubspace/subsubspace_authorization.it-spec.ts',
  'src/functional-api/language/invitation-language-seeding.it-spec.ts',
  'src/functional-api/language/user-language-settings.it-spec.ts',
  'src/functional-api/push-notifications/push-notifications-settings.it-spec.ts',
  'src/functional-api/push-notifications/push-subscriptions-lifecycle.it-spec.ts',
  'src/functional-api/push-notifications/push-subscriptions-security.it-spec.ts',
  'src/functional-api/roleset/application/application-lifecycle.it-spec.ts',
  'src/functional-api/roleset/application/application.it-spec.ts',
  'src/functional-api/roleset/hierarchy-parity/actor-reachability.it-spec.ts',
  'src/functional-api/roleset/hierarchy-parity/application-hierarchy-parity.it-spec.ts',
  'src/functional-api/roleset/hierarchy-parity/invitation-hierarchy-parity.it-spec.ts',
  'src/functional-api/roleset/hierarchy-parity/join-hierarchy-parity.it-spec.ts',
  'src/functional-api/roleset/hierarchy-parity/removal-cascade.it-spec.ts',
  'src/functional-api/roleset/invitations/invitation-contributors.it-spec.ts',
  'src/functional-api/roleset/organization/organization-edge.it-spec.ts',
  'src/functional-api/roleset/organization/organization.it-spec.ts',
  'src/functional-api/roleset/organization/organization2.it-spec.ts',
  'src/functional-api/roleset/user/user-edge.it-spec.ts',
  'src/functional-api/roleset/user/user-edge2.it-spec.ts',
  'src/functional-api/roleset/user/user.authorization.it-spec.ts',
  'src/functional-api/roleset/user/user.it-spec.ts',
  'src/functional-api/roleset/user/user2.it-spec.ts',
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
