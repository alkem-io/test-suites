import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser, TestUserManager } from '@alkemio/tests-lib';
import {
  A_ROW_SURFACES,
  type ARowId,
} from './verification/a-row-surfaces.data';
import { TARGET_ROLES, buildMatrix } from './role-action-matrix.data';
import { platformRolesStage } from './stage';

/**
 * workspace#027-platform-role-redesign (T017) — [US5]. The FR-024
 * completeness check, three-dimensional (D22):
 *
 * (a) a set-difference between the platform role-set's roles as reported by
 *     the LIVE API and the roles present in the generated matrix — a role
 *     with no covering permission test MUST fail the suite;
 * (b) every `ARowId` in the mirrored census (T007a) appears in the matrix
 *     with >=1 surface, AND every surface DECLARES its intent
 *     (`intendedOwners` present, possibly empty — A17/A18 are the two
 *     declared exemptions, read off their `lifecycle` marker, never off
 *     "the row happens to be empty");
 * (c) every stateful flow this repo owns (flows 1, 2, 5 — FR-024's amended
 *     per-layer inventory rule) has a named spec file that EXISTS. Its own
 *     file so it runs and fails even when the matrix body above is
 *     filtered down to a subset.
 *
 * This file's own counts are DERIVED from the mirrored census / the live
 * API — never a literal copied from a task description (every such literal
 * in this feature's planning prose is stale, per the fifteenth-pass census
 * recount).
 */

describe('matrix-completeness (T017a) — every platform role-set role is covered', () => {
  it('the live API role-set and the generated matrix agree on which roles are covered', async () => {
    // Every other platform-roles spec reaches this map as a side effect of
    // TestScenarioFactory.createBaseScenario (or similar); this spec calls
    // TestUserManager directly, so it must populate the map itself. Idempotent
    // (TestUserManager.populateUserModelMap no-ops once `populated` is set).
    await TestUserManager.populateUserModelMap();

    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const live = await getGraphqlClient().platformRoleSetRoleNames(
      {},
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(live.errors, 'live role-set query must succeed').toBeUndefined();

    const liveRoles = new Set(live.data?.platform.roleSet.roleNames ?? []);
    const coveredRoles = new Set(TARGET_ROLES);

    // Every TARGET role (this feature's 13-role model) MUST be reported by
    // the live role-set — a role in our table the server no longer knows
    // about is a stale generator, not a completeness gap.
    for (const role of coveredRoles) {
      expect(
        liveRoles.has(role),
        `matrix covers role "${role}" but the live platform role-set does not report it`
      ).toBe(true);
    }

    // A role newly added to the live platform role-set with NO matching
    // matrix coverage fails here — this is the FR-024 "future roles cannot
    // be added untested" half. Legacy (`GLOBAL_*`) and pre-027 platform
    // roles (`PLATFORM_OPERATIONS_ADMIN` is covered; `PLATFORM_BETA_TESTER`,
    // `PLATFORM_ASSISTANT_ACCESS`, `PLATFORM_VC_CAMPAIGN` are NOT part of
    // this feature's 13-role target model and are declared exempt here by
    // name, not silently absorbed by a broad allowlist) are excluded.
    const KNOWN_UNCOVERED_LEGACY_OR_UNRELATED_ROLES = new Set([
      'GLOBAL_ADMIN',
      'GLOBAL_SUPPORT',
      'GLOBAL_LICENSE_MANAGER',
      'GLOBAL_COMMUNITY_READER',
      'GLOBAL_SPACES_READER',
      'GLOBAL_PLATFORM_MANAGER',
      'GLOBAL_SUPPORT_MANAGER',
      'PLATFORM_BETA_TESTER',
      'PLATFORM_ASSISTANT_ACCESS',
      'PLATFORM_VC_CAMPAIGN',
      'MEMBER',
      'LEAD',
      'ADMIN',
      'ASSOCIATE',
      'OWNER',
      'REGISTERED',
      'GUEST',
      'ANONYMOUS',
    ]);
    for (const role of liveRoles) {
      if (coveredRoles.has(role)) continue;
      expect(
        KNOWN_UNCOVERED_LEGACY_OR_UNRELATED_ROLES.has(role),
        `live platform role-set reports role "${role}" which is neither in the matrix's 13-role target model nor in the declared legacy/unrelated exemption list — a role with no covering permission test`
      ).toBe(true);
    }
  });
});

describe('matrix-completeness (T017b) — every census A-row appears with declared intent', () => {
  const stage = platformRolesStage();
  const matrix = buildMatrix(stage);
  const rowsInMatrix = new Set(matrix.map(c => c.aRow));

  // The one row genuinely exempt from needing ANY surface at all: A18
  // (`{retired}` — removed by FR-020, zero entries in both slices).
  // spec-ts-3 (2026-07-30 fix wave): server's census type
  // (`a.row.surfaces.ts`) documents a per-SURFACE `'retired'` lifecycle
  // value, but A18 has no surface at all to CARRY one — there is nothing to
  // mirror at the surface level for a row with zero entries. Until server
  // declares a ROW-level marker, this is a closed, NAMED allowlist — never
  // "the row happens to be empty" (T017's own explicit warning: an omitted
  // declaration must never be able to pass as "nobody owns this"). A future
  // `AXX: []` is NOT in this list, so `isExemptAtStage` returns `false` for
  // it, the row is absent from the generated matrix (nothing to iterate),
  // and the assertion below (`present || exempt`) correctly fails — exactly
  // the protection "the row happens to be empty" was silently defeating.
  const RETIRED_ROWS: ReadonlySet<ARowId> = new Set(['A18']);

  const isExemptAtStage = (aRow: ARowId): boolean => {
    if (RETIRED_ROWS.has(aRow)) return true;
    const surfaces = A_ROW_SURFACES[aRow];
    if (surfaces.length === 0) return false; // an UNDECLARED empty row is a gap, not an exemption
    return surfaces.every(
      s =>
        typeof s.lifecycle === 'object' &&
        s.lifecycle !== null &&
        'deferred' in s.lifecycle &&
        s.lifecycle.deferred === 'B' &&
        stage === 'A'
    ); // A17 at stage A only
  };

  it('every declared A-row is either present in the matrix, or a declared exemption (A18 always, A17 at stage A)', () => {
    for (const aRow of Object.keys(A_ROW_SURFACES) as ARowId[]) {
      const present = rowsInMatrix.has(aRow);
      const exempt = isExemptAtStage(aRow);
      expect(
        present || exempt,
        `A-row "${aRow}" has no matrix coverage and is not a declared exemption`
      ).toBe(true);
    }
  });

  it('every declared surface has an `intendedOwners` field — declared, not merely non-empty (A17 legitimately declares [])', () => {
    for (const surfaces of Object.values(A_ROW_SURFACES)) {
      for (const surface of surfaces) {
        expect(
          Array.isArray(surface.intendedOwners),
          `surface "${String(surface.member)}" is missing a declared intendedOwners field`
        ).toBe(true);
      }
    }
  });
});

describe('matrix-completeness (T017c) — the stateful flows this repo owns have a named, existing spec file', () => {
  // FR-024's amended per-layer inventory rule: flows 1, 2 and 5 live in
  // `test-suites` (this repo drives a remote API — flows 3/4 need a stack
  // restart / fault injection this repo cannot do, research D25, and are
  // named in `server`'s STATEFUL_FLOW_COVERAGE, server T070a). Checked by
  // FILE EXISTENCE — not by `import()`, which would re-execute the flow
  // spec's own `describe`/`beforeAll` bodies as a side effect of THIS
  // file's collection, double-registering them.
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const STATEFUL_FLOW_FILES: readonly [flow: string, relativePath: string][] = [
    ['flow 1 — grant-act-revoke-deny', 'flows/grant-act-revoke-deny.it-spec.ts'],
    ['flow 2 — org-inheritance-demotion', 'flows/org-inheritance-demotion.it-spec.ts'],
    ['flow 5 — rejection-audited', 'flows/rejection-audited.it-spec.ts'],
  ];

  it.each(STATEFUL_FLOW_FILES)('%s has a named, existing spec file', (_flow, relativePath) => {
    expect(existsSync(path.join(__dirname, relativePath))).toBe(true);
  });
});
