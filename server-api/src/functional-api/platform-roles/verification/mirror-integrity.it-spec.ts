import { describe, expect, it } from 'vitest';
import { AuthorizationCredential } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  A_ROW_SURFACES,
  type ARowId,
} from './a-row-surfaces.data';
import {
  isAnyOfGate,
  isConditionGate,
  isCredentialGate,
  isRequiresGate,
} from './gate.model';
import { reachers } from './reachability';

/**
 * workspace#027-platform-role-redesign (T007a). This is NOT a substitute for
 * a cross-repo diff against `server`'s verification files — this repo never
 * reads another repo's tree at test time (charter: stay in your lane), so
 * that diff stays a MANUAL, occasional check (the mirror is written
 * structurally identical — same ids, same order — specifically so it stays a
 * one-line check when someone runs it).
 *
 * What this DOES guard, automatically, on every run: the mirrored census's
 * own documented invariants (contracts/privilege-map.md §"A-row → surfaces",
 * spec.md §Scale) — so an accidental local edit to the mirror (which would be
 * a merge error per T007a) fails LOUDLY here rather than silently producing a
 * wrong matrix. If server's actual census ever changes shape without this
 * mirror being updated to match, THIS spec keeps passing (it only checks
 * internal self-consistency) — that gap is what `role-action-matrix.data.ts`
 * (T008) and `matrix-completeness.it-spec.ts` (T017) additionally guard,
 * against the LIVE API's role-set and this repo's own generated RoleName
 * enum, which is the practical, in-repo proxy for "is the mirror stale".
 */

const LIVE_ROW_IDS: readonly ARowId[] = (
  Object.keys(A_ROW_SURFACES) as ARowId[]
).filter(id => A_ROW_SURFACES[id].length > 0);

const ALL_ENTRIES = Object.values(A_ROW_SURFACES).flat();

const RETIRED_IN_B_ENTRIES = ALL_ENTRIES.filter(
  s =>
    typeof s.lifecycle === 'object' &&
    s.lifecycle !== null &&
    'retiredIn' in s.lifecycle &&
    s.lifecycle.retiredIn === 'B'
);

const DEFERRED_TO_B_ENTRIES = ALL_ENTRIES.filter(
  s =>
    typeof s.lifecycle === 'object' &&
    s.lifecycle !== null &&
    'deferred' in s.lifecycle &&
    s.lifecycle.deferred === 'B'
);

/** "Multiplies" at stage A = every entry except A17's two `deferred: 'B'`
 * surfaces (not live yet) and A1's four `retiredIn: 'B'` entries (declared,
 * non-multiplying by design — privilege-map.md §"the census file holds 80
 * entries, of which 76 multiply"). */
const multiplyingAt = (stage: 'A' | 'B') =>
  ALL_ENTRIES.filter(s => {
    if (
      typeof s.lifecycle === 'object' &&
      s.lifecycle !== null &&
      'retiredIn' in s.lifecycle
    ) {
      return false; // never multiplies, in either slice
    }
    if (
      typeof s.lifecycle === 'object' &&
      s.lifecycle !== null &&
      'deferred' in s.lifecycle
    ) {
      return stage === 'B';
    }
    return true;
  });

describe('mirror-integrity (T007a) — the mirrored census matches its own documented shape', () => {
  it('A18 is retired — zero entries in both slices', () => {
    expect(A_ROW_SURFACES.A18).toEqual([]);
  });

  it('exactly 21 live A-rows at stage A (A18 empty, A17 deferred but declared)', () => {
    // A17 IS declared (its array has 2 entries) even though both are
    // `{deferred: 'B'}` — "live" here means "has at least one entry
    // declared", matching T017(b)'s completeness dimension, not "has an
    // entry that multiplies at this stage".
    expect(LIVE_ROW_IDS.length).toBe(21);
    expect(LIVE_ROW_IDS).not.toContain('A18');
  });

  it('the census file holds 113 entries total (corr-ts-27/spec-ts-19/qual-ts-24 re-sync count against server c7610d6fa — every planning document that still says ~76/~80/99/102/106 is stale)', () => {
    expect(ALL_ENTRIES.length).toBe(113);
  });

  it('exactly 4 entries carry {retiredIn: "B"} — A1s FR-022 credential mutations', () => {
    expect(RETIRED_IN_B_ENTRIES.length).toBe(4);
    for (const entry of RETIRED_IN_B_ENTRIES) {
      expect(entry.intendedOwners).toEqual([]);
    }
  });

  it('exactly 2 entries carry {deferred: "B"} — both of A17s surfaces', () => {
    expect(DEFERRED_TO_B_ENTRIES.length).toBe(2);
    for (const entry of DEFERRED_TO_B_ENTRIES) {
      expect(entry.intendedOwners).toEqual([]);
    }
  });

  it('107 entries multiply at stage A; 109 at stage B (113 total minus the 4 non-multiplying retiredIn entries, minus A17s 2 deferred-until-B entries at stage A only)', () => {
    expect(multiplyingAt('A').length).toBe(107);
    expect(multiplyingAt('B').length).toBe(109);
  });

  it('per-row surface counts match the documented census table (stage-A declared count)', () => {
    const expected: Record<ARowId, number> = {
      A1: 10,
      A2: 4,
      A3: 10,
      A4: 3,
      A5: 3,
      A6: 2,
      A7: 8,
      A8: 6,
      A9: 13,
      A10: 6,
      A11: 13,
      A12: 6,
      A13: 5,
      A14: 1,
      A15: 3,
      A16: 1,
      A17: 2,
      A18: 0,
      A19: 3,
      A20: 6,
      A20b: 6,
      A21: 2,
    };
    for (const [row, count] of Object.entries(expected) as [
      ARowId,
      number,
    ][]) {
      expect(
        A_ROW_SURFACES[row].length,
        `row ${row}: expected ${count} declared surfaces, found ${A_ROW_SURFACES[row].length}`
      ).toBe(count);
    }
  });

  it('every declared gate is exactly one of the four closed shapes', () => {
    for (const surface of ALL_ENTRIES) {
      const shapes = [
        isRequiresGate(surface.gate),
        isAnyOfGate(surface.gate),
        isCredentialGate(surface.gate),
        isConditionGate(surface.gate),
      ];
      expect(shapes.filter(Boolean).length).toBe(1);
    }
  });

  it('reachers() never throws for any live-at-A surface, at stage A', () => {
    for (const row of LIVE_ROW_IDS) {
      for (const surface of A_ROW_SURFACES[row]) {
        if (
          typeof surface.lifecycle === 'object' &&
          surface.lifecycle !== null &&
          'deferred' in surface.lifecycle
        ) {
          continue; // not live at A — reachers() is still well-defined, but
          // there is nothing meaningful to assert about a stage-A
          // reacher set for a surface that does not exist yet at A.
        }
        expect(() => reachers(surface, 'A')).not.toThrow();
      }
    }
  });

  it('reachers() never throws for any declared surface, at stage B', () => {
    for (const surfaces of Object.values(A_ROW_SURFACES)) {
      for (const surface of surfaces) {
        expect(() => reachers(surface, 'B')).not.toThrow();
      }
    }
  });

  it('A16 has a declared acceptedExtraReachers entry with a reason (FR-010)', () => {
    const [a16] = A_ROW_SURFACES.A16;
    expect(a16.acceptedExtraReachers?.length).toBeGreaterThan(0);
    expect(a16.acceptedExtraReachers?.[0]?.reason).toBeTruthy();
  });

  it('A17s intent is the empty set on both surfaces (owned by the entity admin, not any global role)', () => {
    for (const surface of A_ROW_SURFACES.A17) {
      expect(surface.intendedOwners).toEqual([]);
    }
  });
});

/**
 * THE STRUCTURAL-DIFF GUARD (T007a, corrective wave). `mirror-integrity`'s
 * checks above are self-consistency only — they pass even when this
 * mirror's DATA has silently drifted from server's, as long as the mirror
 * still agrees with itself. That is exactly how today's defect slipped
 * through: server's T070m commit (3c4cacd17) corrected four rows'
 * `legacyReachers` AND added three `ManagedPrivilege` members plus the
 * whole `TREE_SCOPED_PRIVILEGE_GRANTS` mechanism to `privilege.grants.ts`,
 * in the SAME parallel wave this mirror was built from the pre-T070m
 * census — a race, not a judgement error, but nothing here would have
 * caught it because nothing here computed a DERIVED fact and pinned it.
 *
 * These assertions are pure (`reachers()` — no I/O, no Nest DI, no network)
 * and pin the SC-002 positive ownership + T070m watch-cells the census's own
 * comments call out, converting "read `reachability.spec.ts` in `server`
 * before touching anything here" (tasks.md Notes) from a prose warning a
 * human might skip into code that runs, and fails LOUDLY, every time this
 * suite runs — Slice A or B, canonical or full, with no live stack required.
 * A future edit to `a-row-surfaces.data.ts`, `cascade-and-grants.data.ts` or
 * `reachability.ts` that silently narrows (or fails to widen) a reacher set
 * breaks one of these, at build/test time, rather than needing a human to
 * diff two repos by hand.
 */
describe('mirror-integrity (T007a) — the structural-diff guard: derived reachability matches its own documented exceptions', () => {
  const stageA = 'A' as const;

  it('the DECLARED legacyReachers fields the T070m race left stale are exactly as wide as server (A4, A7, A14, A16)', () => {
    // A4 — the shared PLATFORM_USERS_ADMIN credential rule's legacy list is
    // undifferentiated across A4/A5, so GLOBAL_PLATFORM_MANAGER (added for
    // A5) reaches A4 too. Scoped to the `requires`/`anyOf` surfaces only —
    // A4 also carries the `deleteUser` legacy-admin CREDENTIAL PIN
    // (spec-ts-8), whose `legacyReachers` is deliberately `[GA]` alone (the
    // pin's whole point is that it is NOT reached via the shared privilege's
    // wider legacy list).
    for (const surface of A_ROW_SURFACES.A4) {
      if (!isRequiresGate(surface.gate) && !isAnyOfGate(surface.gate)) {
        continue;
      }
      expect(surface.legacyReachers).toEqual(
        expect.arrayContaining([AuthorizationCredential.GlobalPlatformManager])
      );
    }
    // A7 — global-admin reaches the account-tree UPDATE branch of every A7
    // dual-path gate via the Slice-A-only legacy CRUD+GRANT cascade.
    for (const surface of A_ROW_SURFACES.A7) {
      expect(surface.legacyReachers).toEqual(
        expect.arrayContaining([AuthorizationCredential.GlobalAdmin])
      );
    }
    // A14 — global-license-manager already holds ACCOUNT_LICENSE_MANAGE
    // today, pre-dating this feature's additive extension.
    for (const surface of A_ROW_SURFACES.A14) {
      expect(surface.legacyReachers).toEqual(
        expect.arrayContaining([AuthorizationCredential.GlobalLicenseManager])
      );
    }
    // A16 — the legacy root cascade grants plain READ on the space tree to
    // global-admin today, alongside the void global-spaces-reader row.
    // global-support is deliberately ABSENT (sec-server-3/corr-server-2
    // fix, spec-ts-7): its cross-space READ came ONLY from the root rule's
    // now-removed GLOBAL_SUPPORT membership — re-pinning it here would be
    // asserting the exact divergence this guard exists to catch.
    for (const surface of A_ROW_SURFACES.A16) {
      expect(surface.legacyReachers).toEqual(
        expect.arrayContaining([AuthorizationCredential.GlobalAdmin])
      );
      expect(surface.legacyReachers).not.toContain(
        AuthorizationCredential.GlobalSupport
      );
    }
  });

  it('SC-002: platform-operations-admin is a DERIVED reacher of every A3 and A11 surface at stage A', () => {
    // This is the exact regression the missing AUTHORIZATION_RESET /
    // LICENSE_RESET / PLATFORM_OPERATIONS_ADMIN ManagedPrivilege members
    // caused: without them, `isManagedPrivilege()` returns false for A3/A11's
    // literal gates and `reachers()` silently returns an EMPTY set for every
    // role, including the row's own intended owner.
    for (const surface of A_ROW_SURFACES.A3) {
      expect(reachers(surface, stageA)).toContain(
        AuthorizationCredential.PlatformOperationsAdmin
      );
    }
    for (const surface of A_ROW_SURFACES.A11) {
      expect(reachers(surface, stageA)).toContain(
        AuthorizationCredential.PlatformOperationsAdmin
      );
    }
  });

  it('A16: derived reachers include BOTH the explicit READ grant (owner + legacy) and the root-cascade extra reachers', () => {
    // Without a ManagedPrivilege entry for bare READ, the explicit-grant
    // half (platform-spaces-reader / global-spaces-reader) silently drops
    // out, leaving only the root-cascade credentials — A16 would then look
    // like its OWN owner cannot reach it.
    const [a16] = A_ROW_SURFACES.A16;
    const reached = reachers(a16, stageA);
    expect(reached).toEqual(
      expect.arrayContaining([
        AuthorizationCredential.PlatformSpacesReader,
        AuthorizationCredential.GlobalSpacesReader,
        AuthorizationCredential.PlatformContentFullAccess,
        AuthorizationCredential.GlobalAdmin,
      ])
    );
    // spec-ts-7: global-support must NOT be a derived reacher any more —
    // sec-server-3/corr-server-2 removed its only path (the root rule's
    // credential list). Re-appearing here would mean the mirror (or the
    // server) regressed the fix.
    expect(reached).not.toContain(AuthorizationCredential.GlobalSupport);
  });

  it('A12/A13: the tree-scoped grants reach their owning role at stage A (licensing-framework)', () => {
    // Without TREE_SCOPED_PRIVILEGE_GRANTS, a bare GRANT/CREATE/UPDATE/DELETE
    // gate on the licensing-framework tree derives an EMPTY reacher set —
    // these gates are deliberately declared with the family's OWNING
    // privilege name (PLATFORM_SETTINGS_ADMIN et al.) in intent, but the
    // LITERAL gate checked is the bare CRUD verb (T040's documented
    // exception), so `reachers()` has nowhere else to source the owner from.
    const licenseManagerSurfaces = A_ROW_SURFACES.A12.filter(
      s => s.tree === 'licensing-framework'
    );
    expect(licenseManagerSurfaces.length).toBeGreaterThan(0);
    for (const surface of licenseManagerSurfaces) {
      expect(reachers(surface, stageA)).toContain(
        AuthorizationCredential.PlatformLicenseManager
      );
    }
    for (const surface of A_ROW_SURFACES.A13) {
      expect(reachers(surface, stageA)).toContain(
        AuthorizationCredential.PlatformSettingsAdmin
      );
    }
  });

  it('A9: the conversion-admin-synthetic tree-scoped grant reaches platform-resource-admin at stage A', () => {
    // The three cross-L0 moves, the three promote/demote conversions and
    // `convertVirtualContributorToUseKnowledgeBase` are ALL checked against
    // the legacy PLATFORM_ADMIN catch-all via the SAME resolver-local
    // synthetic policy (spec-server-10 fix, corr-ts-20/qual-ts-17 re-sync)
    // — only reachable through
    // TREE_SCOPED_PRIVILEGE_GRANTS['conversion-admin-synthetic'].
    const conversionSurfaces = A_ROW_SURFACES.A9.filter(
      s => s.tree === 'conversion-admin-synthetic'
    );
    expect(conversionSurfaces.length).toBe(7);
    for (const surface of conversionSurfaces) {
      expect(reachers(surface, stageA)).toContain(
        AuthorizationCredential.PlatformResourceAdmin
      );
    }
  });

  it('A9: transferCallout reaches platform-resource-admin via the callouts-set tree-scoped grant, with global-support-manager (not global-support) as its legacy reacher', () => {
    // corr-server-9 fix (corr-ts-20/qual-ts-17 re-sync): transferCallout's
    // OWN authorization tree is `callouts-set`, distinct from the `account`
    // tree the other four A9 transfer mutations share.
    const [transferCallout] = A_ROW_SURFACES.A9.filter(
      s => s.tree === 'callouts-set'
    );
    expect(transferCallout).toBeDefined();
    const reached = reachers(transferCallout, stageA);
    expect(reached).toContain(AuthorizationCredential.PlatformResourceAdmin);
    expect(reached).toContain(AuthorizationCredential.GlobalSupportManager);
    expect(reached).not.toContain(AuthorizationCredential.GlobalSupport);
  });

  it('A13: global-admin is a derived legacy reacher at stage A', () => {
    // corr-server-7/corr-server-10 fix (corr-ts-20/qual-ts-17 re-sync): the
    // resolver-local synthetic policy explicitly includes GLOBAL_ADMIN.
    for (const surface of A_ROW_SURFACES.A13) {
      expect(reachers(surface, stageA)).toContain(
        AuthorizationCredential.GlobalAdmin
      );
    }
  });
});
