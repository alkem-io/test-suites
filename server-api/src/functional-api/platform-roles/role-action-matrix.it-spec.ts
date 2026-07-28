import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { buildMatrixFixtures, teardownMatrixFixtures } from './fixtures';
import type { MatrixFixtures } from './fixtures';
import { buildSurfaceInvocations } from './surface-invocations';
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

    if (cell.expected === 'allow') {
      it(`ALLOW: ${label}`, async () => {
        const outcome = await invocationFor(cell.surface)(caller);
        expect(
          outcome.ok,
          `expected ${label} to be ALLOWED, got: ${
            outcome.ok ? '' : JSON.stringify(outcome.errors)
          }`
        ).toBe(true);
      });
    } else {
      // Denial cells are meaningless before Slice B removes the legacy
      // broad grants (D18) — declared but skipped at stage A rather than
      // silently omitted, so the SHAPE of the suite is visible even when
      // the assertion cannot yet fire.
      it.skipIf(!isStageB())(`DENY: ${label}`, async () => {
        const outcome = await invocationFor(cell.surface)(caller);
        expect(
          outcome.ok,
          `expected ${label} to be DENIED, but it succeeded`
        ).toBe(false);
      });
    }
  }
});
