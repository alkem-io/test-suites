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
 * soundly instead of by omission. The 17 files NOT in this list each trip
 * an independent, real hazard (unguarded platform-role grant/revocation
 * outside the guarded factory path, direct settings mutation, mailbox
 * access, or a global-aggregate assertion) — see the guard's own audit
 * output for the per-file rule and hop path.
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
  'src/functional-api/journey/conversion/convert-L1-to-L0.it-spec.ts',
  'src/functional-api/journey/conversion/convert-L1-to-L0-url-resolver.it-spec.ts',
  'src/functional-api/journey/conversion/convert-L1-to-L0-with-L2-to-L1.it-spec.ts',
  'src/functional-api/journey/conversion/convert-L2-to-L1.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L0-applications-invitations.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L0-authorization.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L0-auto-invite.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L0-basic.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L0-community.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L0-rooms.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L2-applications-invitations.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L2-authorization.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L2-auto-invite.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L2-basic.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L2-community.it-spec.ts',
  'src/functional-api/journey/conversion/move-L1-to-L2-rooms.it-spec.ts',
  'src/functional-api/journey/conversion/move-L2-to-L1-applications-invitations.it-spec.ts',
  'src/functional-api/journey/conversion/move-L2-to-L1-authorization.it-spec.ts',
  'src/functional-api/journey/conversion/move-L2-to-L1-auto-invite.it-spec.ts',
  'src/functional-api/journey/conversion/move-L2-to-L1-basic.it-spec.ts',
  'src/functional-api/journey/conversion/move-L2-to-L1-community.it-spec.ts',
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
  'src/functional-api/roleset/hierarchy-parity/actor-reachability.it-spec.ts',
  'src/functional-api/roleset/hierarchy-parity/application-hierarchy-parity.it-spec.ts',
  'src/functional-api/roleset/hierarchy-parity/invitation-hierarchy-parity.it-spec.ts',
  'src/functional-api/roleset/hierarchy-parity/join-hierarchy-parity.it-spec.ts',
  'src/functional-api/roleset/hierarchy-parity/removal-cascade.it-spec.ts',
  'src/functional-api/roleset/organization/organization2.it-spec.ts',
  'src/functional-api/roleset/organization/organization-edge.it-spec.ts',
  'src/functional-api/roleset/organization/organization.it-spec.ts',
  'src/functional-api/roleset/user/user2.it-spec.ts',
  'src/functional-api/roleset/user/user-edge2.it-spec.ts',
  'src/functional-api/roleset/user/user-edge.it-spec.ts',
  'src/functional-api/roleset/user/user.it-spec.ts',
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
 * (parallel, serial, total) file counts — used only for the `[nightly]
 * lanes: …` run-time log line the CI assert-config step reads back (contract
 * C2). The guard (`validate-parallel-lanes.ts`) has its own root-aware
 * version of this walk so its fixture self-tests can point it at a throwaway
 * tree instead; this one always resolves against the real repo layout.
 */
export function countNightlyFiles(): {
  total: number;
  parallel: number;
  serial: number;
} {
  const manifestSet = new Set(PARALLEL_MANIFEST);
  let total = 0;
  for (const glob of NIGHTLY_INCLUDE) {
    const baseDir = path.join(
      SERVER_API_ROOT,
      glob.replace(/\/\*\*\/\*\.it-spec\.ts$/, '')
    );
    total += walkItSpecFiles(baseDir).length;
  }
  return {
    total,
    parallel: manifestSet.size,
    serial: total - manifestSet.size,
  };
}
