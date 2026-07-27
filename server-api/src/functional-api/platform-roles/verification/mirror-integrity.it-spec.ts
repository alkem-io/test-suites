import { describe, expect, it } from 'vitest';
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

  it('the census file holds 99 entries total (the fifteenth-pass-corrected count — every planning document that still says ~76/~80 is stale)', () => {
    expect(ALL_ENTRIES.length).toBe(99);
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

  it('93 entries multiply at stage A; 95 at stage B (99 total minus the 4 non-multiplying retiredIn entries, minus A17s 2 deferred-until-B entries at stage A only)', () => {
    expect(multiplyingAt('A').length).toBe(93);
    expect(multiplyingAt('B').length).toBe(95);
  });

  it('per-row surface counts match the documented census table (stage-A declared count)', () => {
    const expected: Record<ARowId, number> = {
      A1: 6,
      A2: 4,
      A3: 10,
      A4: 2,
      A5: 3,
      A6: 2,
      A7: 8,
      A8: 6,
      A9: 9,
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
      A20: 4,
      A20b: 4,
      A21: 1,
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
