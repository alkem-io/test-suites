import { randomUUID } from 'node:crypto';

/**
 * Collision-safe short IDs for test fixtures (test-suites#569, R6).
 *
 * The previous `Math.random().toString(12).slice(-6)` was not time-based, had
 * reduced float-tail entropy, and — because 52 files capture it once at module
 * scope under Vitest `isolate:false` — was birthday-collision-plausible across a
 * 100+ file run, producing non-deterministic nameID/displayName clashes. A
 * time-ordered prefix plus cryptographic randomness makes collisions effectively
 * impossible while staying short and nameID-valid (lowercase alphanumeric).
 */
export class UniqueIDGenerator {
  // Monotonic per-process counter guarantees uniqueness within a worker (the
  // counter alone cannot collide); the random suffix covers collisions across
  // parallel workers / separate runs.
  private static counter = 0;

  public static getID(): string {
    const seq = (UniqueIDGenerator.counter++).toString(36);
    const rand = randomUUID().replace(/-/g, '').slice(0, 8);
    return `${seq}${rand}`;
  }
}
