import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { TestUser } from '@alkemio/tests-lib';
import {
  A_ROW_SURFACES,
  type ARowId,
  type SurfaceRef,
} from './verification/a-row-surfaces.data';
import { reachers } from './verification/reachability';
import { credentialFor } from './verification/role-credential.map';
import type { PlatformRolesStage } from './stage';

/**
 * workspace#027-platform-role-redesign (T008) — the GENERATOR, not a
 * hand-written table: `MATRIX = ROLES x A_ROWS.flatMap(a => a.surfaces)`,
 * `expected = reachers(surface, stage).includes(credentialFor(role)) ? allow
 * : deny`. The derived reacher set (T007a's mirrored `reachability.ts`) is
 * the ONLY source of truth here — never `intendedOwners`, never a scalar
 * owner on the A-row (eighth clarification pass). Do NOT "simplify" this to
 * `intendedOwners.includes(role)` — that is the exact narrowing the
 * eleventh analyze pass caught, and it would be wrong, silently, on exactly
 * the rows this feature exists to fix (A16/A17, T007a).
 *
 * `credentialFor` is the single canonical role -> credential map
 * (`verification/role-credential.map.ts`, mirroring server's
 * `ROLE_CREDENTIAL_MAP`, FR-011/T030's anti-drift guard) — never a local
 * string cast. The two vocabularies (`RoleName` / `AuthorizationCredential`)
 * are identical strings for the 12 new roles but diverge for two legacy
 * ones (`GLOBAL_SPACES_READER`/`GlobalSpacesReader` vs.
 * `GLOBAL_COMMUNITY_READER`/`GlobalCommunityRead`) — the silent-void defect
 * itself — so a local cast would be wrong exactly where it matters most.
 */

export type MatrixExpectation = 'allow' | 'deny';

export interface MatrixCell {
  readonly role: RoleName;
  readonly aRow: ARowId;
  readonly surface: SurfaceRef;
  readonly expected: MatrixExpectation;
}

/**
 * The 13 target platform-role-set roles this feature's matrix iterates
 * (research C12: 10 `Platform …` + 3 `Feature …`). Adding a role to the
 * target model is a one-line edit here — that is the point of the
 * generator shape (spec.md: "resist any expansion that turns a row into a
 * hand-written spec").
 */
export const TARGET_ROLES: readonly RoleName[] = [
  RoleName.PlatformRolesAdmin,
  RoleName.PlatformUsersAdmin,
  RoleName.PlatformOperationsAdmin,
  RoleName.PlatformSupport,
  RoleName.PlatformLicenseManager,
  RoleName.PlatformSettingsAdmin,
  RoleName.PlatformResourceAdmin,
  RoleName.PlatformSpacesReader,
  RoleName.PlatformAuditReader,
  RoleName.PlatformContentFullAccess,
  RoleName.FeatureBetaTester,
  RoleName.FeatureOrganizationCreator,
  RoleName.FeatureVirtualAssistant,
];

/**
 * The single-role fixture (T003/T004) that holds EXACTLY the given target
 * role and no other — what T009 authenticates as to exercise a matrix cell.
 * A role missing from this map is a T003/T004 gap, not a T008 one; the
 * generator throws rather than silently producing an unauthenticatable
 * cell (mirrors `credentialFor`'s own fail-loud contract).
 */
const TEST_USER_FOR_ROLE: Partial<Record<RoleName, TestUser>> = {
  [RoleName.PlatformRolesAdmin]: TestUser.PLATFORM_ROLES_ADMIN,
  [RoleName.PlatformUsersAdmin]: TestUser.PLATFORM_USERS_ADMIN,
  [RoleName.PlatformOperationsAdmin]: TestUser.PLATFORM_OPERATIONS_ADMIN,
  [RoleName.PlatformSupport]: TestUser.PLATFORM_SUPPORT,
  [RoleName.PlatformLicenseManager]: TestUser.PLATFORM_LICENSE_MANAGER,
  [RoleName.PlatformSettingsAdmin]: TestUser.PLATFORM_SETTINGS_ADMIN,
  [RoleName.PlatformResourceAdmin]: TestUser.PLATFORM_RESOURCE_ADMIN,
  [RoleName.PlatformSpacesReader]: TestUser.PLATFORM_SPACES_READER,
  [RoleName.PlatformAuditReader]: TestUser.PLATFORM_AUDIT_READER,
  [RoleName.PlatformContentFullAccess]: TestUser.PLATFORM_CONTENT_FULL_ACCESS,
  [RoleName.FeatureBetaTester]: TestUser.FEATURE_BETA_TESTER,
  [RoleName.FeatureOrganizationCreator]: TestUser.FEATURE_ORGANIZATION_CREATOR,
  [RoleName.FeatureVirtualAssistant]: TestUser.FEATURE_VIRTUAL_ASSISTANT,
};

export function testUserFor(role: RoleName): TestUser {
  const user = TEST_USER_FOR_ROLE[role];
  if (!user) {
    throw new Error(
      `role-action-matrix: no single-role fixture registered for RoleName "${role}" — T003/T004 is stale or this role is not yet part of the 13-role target model.`
    );
  }
  return user;
}

/** The `member` string a caller must invoke for this surface, at this
 * stage — resolves A14's per-slice rename (T007a) rather than ever
 * hard-coding either name. */
export function surfaceMemberName(
  surface: SurfaceRef,
  stage: PlatformRolesStage
): string {
  return typeof surface.member === 'string'
    ? surface.member
    : surface.member[stage];
}

/**
 * Whether a census entry produces a matrix cell AT ALL, at a given stage.
 * - `retired` (A18): never — matches `A_ROW_SURFACES.A18`'s empty array in
 *   practice, but stated explicitly for any other row that might carry the
 *   marker in future.
 * - `{deferred: 'B'}` (A17): only at stage B — the surface does not exist
 *   at stage A.
 * - `{retiredIn: 'B'}` (A1's four FR-022 mutations): NEVER, in EITHER
 *   slice — declared for `reachability.spec.ts`'s guard (server T070m) but
 *   deliberately non-multiplying here (privilege-map.md §"the census file
 *   holds 99 entries, fewer multiply").
 * - absent: always.
 */
export function multipliesAtStage(
  surface: SurfaceRef,
  stage: PlatformRolesStage
): boolean {
  const lc = surface.lifecycle;
  if (lc === 'retired') return false;
  if (lc && typeof lc === 'object' && 'retiredIn' in lc) return false;
  if (lc && typeof lc === 'object' && 'deferred' in lc) return stage === 'B';
  return true;
}

/** Every `[ARowId, SurfaceRef]` pair that multiplies into a matrix cell at
 * the given stage, in census order. */
export function liveSurfaces(
  stage: PlatformRolesStage
): ReadonlyArray<{ readonly aRow: ARowId; readonly surface: SurfaceRef }> {
  const out: { aRow: ARowId; surface: SurfaceRef }[] = [];
  for (const aRow of Object.keys(A_ROW_SURFACES) as ARowId[]) {
    for (const surface of A_ROW_SURFACES[aRow]) {
      if (multipliesAtStage(surface, stage)) {
        out.push({ aRow, surface });
      }
    }
  }
  return out;
}

/** The A-rows that have at least one surface live at this stage — the
 * completeness dimension T017(b) walks, and the row-set the canonical
 * projection below picks one representative surface from. At stage A this
 * is 20 rows (A17 excluded — both its surfaces are `{deferred: 'B'}`); at
 * stage B it is 21 (A18 stays excluded — `retired`, zero entries in both
 * slices). Never hard-code either number — derive it, here and at every
 * call site, from the census (architect note, fifteenth-pass census
 * recount: every literal in this feature's planning prose is stale). */
export function liveARowsAtStage(
  stage: PlatformRolesStage
): readonly ARowId[] {
  const rows = new Set<ARowId>();
  for (const { aRow } of liveSurfaces(stage)) {
    rows.add(aRow);
  }
  return [...rows];
}

/**
 * ONE canonical surface per live A-row — the first surface (census/array
 * order) that multiplies at this stage. Deterministic and stable across
 * runs; which surface is "the" canonical one is otherwise arbitrary, so
 * census order is as good a tie-break as any and never changes silently
 * underfoot (T008/T005: `platform-roles-canonical` and `platform-roles`
 * read the SAME table with a filter, so they cannot disagree).
 */
export function canonicalSurfaceByRow(
  stage: PlatformRolesStage
): ReadonlyMap<ARowId, SurfaceRef> {
  const map = new Map<ARowId, SurfaceRef>();
  for (const { aRow, surface } of liveSurfaces(stage)) {
    if (!map.has(aRow)) {
      map.set(aRow, surface);
    }
  }
  return map;
}

/** The full cross-product: every target role x every surface live at this
 * stage. This is `platform-roles`' table — the Slice B release-train gate,
 * ~99x13 in shape once every surface is live (T008's own doc comment: never
 * assert a literal count copied from a task description — derive it). */
export function buildMatrix(stage: PlatformRolesStage): readonly MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (const { aRow, surface } of liveSurfaces(stage)) {
    const reachSet = reachers(surface, stage);
    for (const role of TARGET_ROLES) {
      const credential = credentialFor(role);
      const expected: MatrixExpectation = reachSet.includes(credential)
        ? 'allow'
        : 'deny';
      cells.push({ role, aRow, surface, expected });
    }
  }
  return cells;
}

/** The canonical subset: every target role x ONE surface per live A-row —
 * `platform-roles-canonical`'s table, the PR-feedback inner loop. Filtered
 * from the SAME generation as {@link buildMatrix}, never a second
 * computation, so the two projects cannot disagree (T005). */
export function buildCanonicalMatrix(
  stage: PlatformRolesStage
): readonly MatrixCell[] {
  const canonical = new Set(canonicalSurfaceByRow(stage).values());
  return buildMatrix(stage).filter(cell => canonical.has(cell.surface));
}

/**
 * Which of the two identically-globbed vitest projects (T005) is running —
 * read from `PLATFORM_ROLES_MATRIX_SCOPE`, set per-project in
 * `vitest.config.ts`. Unset (e.g. a direct `vitest run` of this file
 * outside either named project) defaults to `'full'`, the stricter/larger
 * of the two, rather than silently narrowing coverage.
 */
export type MatrixScope = 'canonical' | 'full';

export function activeMatrixScope(): MatrixScope {
  const raw = process.env.PLATFORM_ROLES_MATRIX_SCOPE;
  return raw === 'canonical' ? 'canonical' : 'full';
}

/** The table this vitest run should iterate, given the active stage
 * ({@link platformRolesStage}) and matrix scope ({@link activeMatrixScope}). */
export function activeMatrix(stage: PlatformRolesStage): readonly MatrixCell[] {
  return activeMatrixScope() === 'canonical'
    ? buildCanonicalMatrix(stage)
    : buildMatrix(stage);
}
