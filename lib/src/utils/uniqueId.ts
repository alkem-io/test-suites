import { randomUUID } from 'node:crypto';

/**
 * Collision-safe short IDs for test fixtures (test-suites#569, R6).
 *
 * The previous `Math.random().toString(12).slice(-6)` was not time-based, had
 * reduced float-tail entropy, and — because files capture it once at module
 * scope under Vitest `isolate:false` — was birthday-collision-plausible across a
 * 100+ file run, producing non-deterministic nameID/displayName clashes. A
 * monotonic prefix plus cryptographic randomness makes collisions effectively
 * impossible while staying short and nameID-valid (lowercase alphanumeric).
 *
 * LENGTH MATTERS (test-suites#563): test nameIDs are built as
 * `<scenarioName.slice(0,18)>-<id>` and the server caps a nameID at 28 chars
 * (`NameID.MAX_LENGTH`), leaving ~9 chars for the id (18 + '-' + id <= 28). The
 * first cut of this generator emitted a 9–11 char id, which pushed those
 * nameIDs to 29 and made the server reject `createSpace` (BAD_USER_INPUT) —
 * surfacing as a masked "Space ID is required" cascade. The id is kept short
 * (seq + 4 chars) so `18 + '-' + id` stays within 28 for any realistic run.
 */
export class UniqueIDGenerator {
  // Monotonic per-process counter guarantees uniqueness within a worker (the
  // counter alone cannot collide); the random suffix covers collisions across
  // parallel workers / separate runs.
  private static counter = 0;

  public static getID(): string {
    const seq = (UniqueIDGenerator.counter++).toString(36);
    // Fixed-width random SUFFIX: the counter is an unambiguous prefix (result
    // minus the last 4 chars), so uniqueness is never lost to truncation. Total
    // length is seq(<=4 for a run) + 4 = <=8, keeping nameIDs within 28.
    const rand = randomUUID().replace(/-/g, '').slice(0, 4);
    return `${seq}${rand}`;
  }
}
