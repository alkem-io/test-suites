import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { buildMatrixFixtures, teardownMatrixFixtures } from './fixtures';
import type { MatrixFixtures } from './fixtures';
import { buildSurfaceInvocations, isAuthorizationDenial } from './surface-invocations';
import type { SurfaceInvocation } from './surface-invocations';
import type { SurfaceRef } from './verification/a-row-surfaces.data';
import {
  activeMatrix,
  activeMatrixScope,
  surfaceMemberName,
  testUserFor,
} from './role-action-matrix.data';
import { isStageB, platformRolesStage } from './stage';

/**
 * workspace#027-platform-role-redesign (T009) — [US3]. ONE test body
 * iterating T008's generated cells, each exercised as the fixture user
 * holding ONLY that cell's role, invoked through T007b's helper for that
 * cell's surface.
 *
 * Positive cells assert in BOTH stages. Denial cells assert ONLY at stage B
 * (D18) — at stage A the legacy broad grants still reach every surface, so
 * a denial cell would pass for the wrong reason (it isn't exercising what
 * it thinks it is). A green denial at stage A is suspicious, not
 * reassuring (tasks.md Notes) — this file never asserts one.
 *
 * Cell identity in every failure message names role + A-row + surface
 * (member name, at THIS stage) — never just the family. A failure that
 * only said "Resource Admin denied resource moves" when 8 of 9
 * `transfer*` mutations are fine is the diagnostic the per-surface
 * granularity was bought to avoid.
 */

let fixtures: MatrixFixtures;
let invocations: ReadonlyMap<SurfaceRef, SurfaceInvocation>;

beforeAll(async () => {
  fixtures = await buildMatrixFixtures();
  invocations = buildSurfaceInvocations(fixtures);
}, 300_000);

afterAll(async () => {
  if (fixtures) {
    await teardownMatrixFixtures(fixtures);
  }
});

const stage = platformRolesStage();
const cells = activeMatrix(stage);

/**
 * Surfaces whose ALLOW cell can only assert "was NOT refused by
 * authorization" — the resolver is reached, the privilege gate passes, and
 * what fails afterwards is environmental rather than a verdict. Two reasons
 * qualify a name for this set: an EXTERNAL service absent from a
 * developer/CI environment (the original two, below), or a POST-gate
 * precondition that cannot be staged from this repo (the two added
 * 2026-08-06). Nothing else belongs here — a fixture that CAN be built is a
 * fixture bug, and weakening its assertion would hide it.
 *
 * The first two were observed red in the 2026-07-31 canonical re-run, for
 * reasons that have nothing to do with authorization:
 *
 *   `cleanupCollections`    → `TypeError: fetch failed` in
 *                             `ChromaClient.listCollections` (no Chroma)
 *   `createWingbackAccount` → `Error: Wingback is not enabled` from
 *                             `WingbackManager.createCustomer` (feature off)
 *
 * Both stack traces start INSIDE the resolver, which is reachable only after
 * the privilege check has already passed — so the red cell was in fact
 * evidence that its own ALLOW holds.
 *
 * The precedent for this situation in this file is `noClientWired` below,
 * which SKIPS. Skipping here would discard that evidence, so these two assert
 * something weaker but still real: the call was **not refused by
 * authorization**. Every other ALLOW cell keeps asserting full success.
 *
 * This is what makes the canonical project gateable at all — a suite that is
 * permanently red for environmental reasons cannot be a gate
 * (`sec-test-suites-19` / `spec-ts-20` / `qual-ts-26`). Remove a name from
 * this set the moment its dependency is available in the environment the
 * gate runs in.
 */
const EXTERNAL_DEPENDENCY_SURFACES: ReadonlySet<string> = new Set([
  'cleanupCollections',
  'createWingbackAccount',
  // 2026-08-06 live run — same shape, different reason: the resolver is
  // reachable and the gate passes, but its POST-gate precondition cannot be
  // staged from this repo, so full success is not assertable.
  //
  //   `adminCommunicationUpdateRoomState` → `getRoom` on a Matrix room id.
  //     `fixtures.roomIdPlaceholder` is a deliberate placeholder (a synthetic
  //     UUID), and the adapter answers `MATRIX_ENTITY_NOT_FOUND_ERROR`. Its
  //     sibling `adminCommunicationRemoveOrphanedRoom` takes the same
  //     placeholder and is green only because removing a room that is not
  //     there is a no-op — an accident of that resolver, not a fixture that
  //     works.
  //   `adminUserEmailChangeDriftResolve` → requires an OUTSTANDING drift
  //     between Alkemio and Kratos. Manufacturing one means desynchronising
  //     the identity store on purpose; staging it here would leave the shared
  //     stack in the broken state this mutation exists to repair.
  //
  // Both keep asserting the thing this matrix is actually about — that the
  // caller was NOT refused by authorization.
  'adminCommunicationUpdateRoomState',
  'adminUserEmailChangeDriftResolve',
]);

const invocationFor = (surface: SurfaceRef): SurfaceInvocation => {
  const invoke = invocations.get(surface);
  if (!invoke) {
    const member = surfaceMemberName(surface, stage);
    throw new Error(
      `role-action-matrix: no surface-invocations.ts helper registered for surface "${member}" — T007b is stale relative to T007a's census.`
    );
  }
  return invoke;
};

describe(`role-action-matrix (T008/T009) — scope=${activeMatrixScope()} stage=${stage}`, () => {
  it('the active matrix is non-empty (a zero-length table hides every cell below)', () => {
    expect(cells.length).toBeGreaterThan(0);
  });

  for (const cell of cells) {
    const member = surfaceMemberName(cell.surface, stage);
    const label = `${cell.role} x ${cell.aRow} (${member}) -> ${cell.expected}`;
    const caller = testUserFor(cell.role);

    // A19's `audit-log-analyze` MCP tool (and any future `mcp-tool` census
    // entry) has no client wired in this repo — its `surface-invocations.ts`
    // helper is a documented placeholder that always reports denial
    // regardless of caller (T007b/T019's Phase-V-only note). Asserting ALLOW
    // against it fails for a fixture-gap reason, not an authorization one
    // (2026-07-29 live-verification finding); skip it at BOTH stages here
    // rather than fake a client that does not exist. Declared, not omitted:
    // it still appears in the suite, just always skipped, so a future MCP
    // client landing is what turns this back on (remove this guard then).
    const noClientWired = cell.surface.kind === 'mcp-tool';

    // See EXTERNAL_DEPENDENCY_SURFACES above.
    const externalDependency = EXTERNAL_DEPENDENCY_SURFACES.has(member);

    if (cell.expected === 'allow') {
      it.skipIf(noClientWired)(`ALLOW: ${label}`, async () => {
        const outcome = await invocationFor(cell.surface)(caller);

        if (!outcome.ok && externalDependency) {
          expect(
            isAuthorizationDenial(outcome.errors),
            `expected ${label} to reach its resolver (its external dependency is absent here, so full success cannot be asserted), but it was refused by AUTHORIZATION: ${JSON.stringify(
              outcome.errors
            )}`
          ).toBe(false);
          return;
        }

        expect(
          outcome.ok,
          `expected ${label} to be ALLOWED, got: ${
            outcome.ok ? '' : JSON.stringify(outcome.errors)
          }`
        ).toBe(true);
      });
    } else {
      // qual-ts-4 (2026-07-30 fix wave) proposed executing a stage-A DENY
      // cell early whenever `denyIsStageInvariant` shows the credential's
      // reach is identical at both stages — legitimate in THEORY (D18's
      // legacy grants never widen one of our 13 roles' own reach), but
      // **live-verification found it unsafe for DESTRUCTIVE, single-use
      // surfaces** (A5's `deleteUser`, A8's deletes, A13's
      // `DeleteLicensePlan`): every DENY cell for a surface shares ONE
      // disposable target with the ONE real ALLOW caller who deletes it —
      // `TARGET_ROLES` order puts several DENY roles AFTER the owning role,
      // so once the real deletion runs, every later DENY cell hits
      // `EntityNotFoundException` instead of an authorization rejection —
      // exactly the "green/red for the wrong reason" hazard this suite
      // exists to prevent, now self-inflicted.
      //
      // corr-ts-16 (2026-07-30 corrective wave) fixed the root cause instead
      // of working around it: `buildMatrix` (`role-action-matrix.data.ts`)
      // now orders every surface's ALLOW cell(s) AFTER its DENY cells, so
      // the real, state-mutating ALLOW invocation can never run ahead of a
      // DENY cell for the same surface, at EITHER stage. The stage-A DENY
      // skip below stays — it is D18's separate concern (legacy grants
      // still reach every surface at stage A, so a green denial there is
      // meaningless, not unsafe) — `denyIsStageInvariant` stays exported,
      // documented, for a future stage-A-safe-denial follow-up.
      it.skipIf(!isStageB() || noClientWired)(
        `DENY: ${label}`,
        async () => {
          const outcome = await invocationFor(cell.surface)(caller);
          expect(
            outcome.ok,
            `expected ${label} to be DENIED, but it succeeded`
          ).toBe(false);
          // sec-test-suites-3: the denial must be an AUTHORIZATION denial
          // (FORBIDDEN/FORBIDDEN_POLICY), not a validation/not-found error
          // that happens to precede the gate — a green denial for the
          // wrong reason is exactly the failure mode this suite's own
          // header warns about, applied to its own assertions.
          const errors = outcome.ok ? [] : outcome.errors;
          expect(
            isAuthorizationDenial(errors),
            `expected ${label} to be DENIED with an authorization error (FORBIDDEN/FORBIDDEN_POLICY), got: ${JSON.stringify(errors)}`
          ).toBe(true);
        }
      );
    }
  }
});
