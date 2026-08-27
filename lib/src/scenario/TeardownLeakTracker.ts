import { LogManager } from "./LogManager";

/**
 * The kind of top-level entity a base scenario tears down. Deliberately a
 * closed union rather than a free-form string: every call site names one of
 * these, so a typo in an entity type can never silently create a new,
 * unaggregated bucket in the leak summary.
 */
export type TeardownEntityType =
  | "PlatformDiscussion"
  | "Space"
  | "VirtualContributor"
  | "InnovationPack"
  | "Organization";

export interface TeardownLeak {
  scenarioName: string;
  entityType: TeardownEntityType;
  entityId: string;
  message: string;
}

export interface TeardownLeakSummary {
  scenariosAttempted: number;
  leakCount: number;
  benignSkipCount: number;
  leaks: TeardownLeak[];
}

/**
 * Process-level accumulator for base-scenario teardown outcomes.
 *
 * `TestScenarioFactory.cleanUpBaseScenario` used to wrap its whole delete
 * sequence in one try/catch that only logged, which had two effects: the
 * FIRST failing delete skipped every delete after it (leaking the rest of
 * the tree), and every failure — real or benign — was invisible outside a
 * buried log line. This tracker gives per-entity teardown a place to record
 * outcomes so a run can report how many scenarios attempted teardown and
 * which entities actually failed to delete — without changing the
 * log-and-continue principle: nothing here ever throws into a test or exits
 * the process.
 *
 * A singleton per module instance, which in practice means per OS thread.
 *
 * The summary line is printed inline, from `cleanUpBaseScenario` itself,
 * after every scenario's teardown finishes — NOT only from a `process.on`
 * `'exit'`/`'beforeExit'` listener. That was the first design, and it does
 * not work under this repo's actual runner topology: verified empirically
 * (2026-08-19, live vitest run of a real `.it-spec.ts`) that with
 * `pool: 'threads'`, the worker thread that actually executes scenario
 * teardown is torn down via `Worker.terminate()` once its tests finish —
 * which does NOT run that thread's own `'exit'` listeners — while a
 * *different*, data-empty module instance living on the main thread (loaded
 * transitively while wiring up `globalSetup`) is the only one whose `'exit'`
 * fires. An exit-only design would therefore silently never print in the
 * one runner this repo actually uses. Printing inline guarantees
 * visibility: it runs synchronously in the exact call that did the work, so
 * it cannot be lost to a forceful thread teardown. Each line reports the
 * cumulative running total for that worker so far; the last line a given
 * worker prints is its true final tally, and a CI step can equally well
 * just grep the whole captured log for any `leaks: [1-9]` occurrence to
 * catch a leak from ANY worker without needing to find each one's last line.
 * The `process.on('exit')` listener below is kept as a harmless secondary
 * best-effort net for non-thread-pool consumers of this library (a direct
 * Node script, `pool: 'forks'`, `maxWorkers: 1` with no thread involved at
 * all) where it does fire reliably — it is idempotent with the inline print,
 * so it can only ever repeat information already printed, never invent new
 * information the inline print missed.
 */
class TeardownLeakTrackerImpl {
  private scenariosAttempted = 0;
  private benignSkipCount = 0;
  private leaks: TeardownLeak[] = [];

  /** Call once per `cleanUpBaseScenario` invocation, regardless of outcome. */
  recordScenarioAttempt(): void {
    this.scenariosAttempted += 1;
  }

  /**
   * A delete came back "not found" — the entity was already removed, almost
   * always by a parent's cascading delete earlier in the same teardown
   * sequence (e.g. deleting the space removes its subspace/subsubspace
   * first). Expected, not a leak; recorded separately so the leak count
   * stays meaningful.
   */
  recordBenignNotFound(
    scenarioName: string,
    entityType: TeardownEntityType,
    entityId: string,
  ): void {
    this.benignSkipCount += 1;
    LogManager.getLogger().info(
      `[teardown-benign] scenario='${scenarioName}' entityType=${entityType} entityId=${entityId} — already removed (cascade), not a leak`,
    );
  }

  /**
   * A delete genuinely failed (or its outcome could not be classified as
   * benign — treated conservatively as a leak per the "unknown counts as
   * real" rule). Recorded with enough detail to grep and to reconstruct
   * which fixture was left behind.
   */
  recordLeak(
    scenarioName: string,
    entityType: TeardownEntityType,
    entityId: string,
    message: string,
  ): void {
    this.leaks.push({ scenarioName, entityType, entityId, message });
    LogManager.getLogger().error(
      `[teardown-leak] scenario='${scenarioName}' entityType=${entityType} entityId=${entityId} error="${message}"`,
    );
  }

  getSummary(): TeardownLeakSummary {
    return {
      scenariosAttempted: this.scenariosAttempted,
      leakCount: this.leaks.length,
      benignSkipCount: this.benignSkipCount,
      leaks: [...this.leaks],
    };
  }

  /**
   * The grep-able one-line summary, in the spirit of `[nightly] lanes: ...`
   * and `[auth] pool size: N`. Deliberately worded as a positive statement
   * in the zero case ("leaks: 0 ... — clean") rather than staying silent —
   * silence is indistinguishable from "this process never got far enough to
   * check"; a positive zero-line is not.
   */
  formatSummaryLine(): string {
    const { scenariosAttempted, leakCount } = this.getSummary();
    return leakCount === 0
      ? `[teardown] leaks: 0 entities across ${scenariosAttempted} scenario(s) attempted — clean`
      : `[teardown] leaks: ${leakCount} entities across ${scenariosAttempted} scenario(s) attempted — see [teardown-leak] lines above`;
  }

  /**
   * Prints the current cumulative summary line. Called from
   * `cleanUpBaseScenario` after every scenario teardown — see the class
   * doc for why this must be inline rather than exit-hook-driven. Safe to
   * call repeatedly: each call reflects the up-to-date running total, and a
   * worker that tears down many scenarios will print many lines, the last
   * of which is its final tally.
   */
  printSummary(): void {
    // Deliberately console.log, not LogManager: the console transport
    // defaults to error-only (LOG_LEVEL unset/'warn' in CI), and this line
    // — like `[nightly] lanes: ...` and `[auth] pool size: N` — must be
    // read back from the captured run log regardless of log level.
    console.log(this.formatSummaryLine());
  }

  /**
   * Best-effort secondary print for runner topologies where `'exit'`
   * actually fires in the same thread that did the work (see class doc).
   * A no-op when nothing was ever attempted, so a thread that never touched
   * `TestScenarioFactory` does not add noise to every run's tail.
   */
  printSummaryOnExit(): void {
    if (this.scenariosAttempted === 0) {
      return;
    }
    this.printSummary();
  }

  /** Test-only: reset all accumulated state. */
  resetForTest(): void {
    this.scenariosAttempted = 0;
    this.benignSkipCount = 0;
    this.leaks = [];
  }
}

export const TeardownLeakTracker = new TeardownLeakTrackerImpl();

// Best-effort secondary net — see the class doc for why the inline print
// from `cleanUpBaseScenario` is the primary, reliable mechanism.
process.on("exit", () => {
  TeardownLeakTracker.printSummaryOnExit();
});
