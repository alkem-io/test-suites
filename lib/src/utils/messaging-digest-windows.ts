/**
 * 034-messaging-notifications (Operator Ruling R4) — the four debounce windows.
 *
 * Messaging notifications are no longer sent on message arrival. Arrival only
 * ARMS a per-(recipient, channel, kind) track in Redis; a sweep flushes it once
 * the track's quiet period has elapsed with no further message, or at the
 * latest once its max delay has elapsed since the FIRST un-notified message on
 * that track (data-model.md §5). Four tracks exist per recipient:
 * `{email,push} x {direct,group}`.
 *
 * Every wait in the messaging test suites MUST be derived from these windows
 * rather than hard-coded, because the live stack's windows are env-overridable
 * and the test stacks run them at seconds scale. This module is the SINGLE
 * source of those derivations — `digestWindow(channel, kind)` returns both the
 * sleeps (`quietGraceMs` / `maxDelayGraceMs`) and the per-test timeout
 * (`testTimeoutMs`) for one track.
 *
 * FALLBACK DIRECTION IS DELIBERATE — read this before "simplifying" it.
 * When an env var is absent the fallback is the PRODUCTION default from
 * data-model.md §6 (60s/300s/300s/1800s/...), NOT the seconds-scale value the
 * test `.env.default` ships. That is the only safe direction: a suite pointed
 * at a stack running production windows must then wait production-length
 * periods (slow, but correct) instead of waiting 4 seconds and concluding
 * "nothing arrived" while the real dispatch is still 296 seconds away. A
 * negative test that goes green because nothing has arrived YET is worse than
 * no test at all. The short values live in `.env.default` so a local/CI stack
 * that configures the SERVER with them also configures the harness with them.
 *
 * Env is read on every call (never captured at module load) so `dotenv.config()`
 * ordering can never freeze a stale value into the derived waits.
 */

export type DigestChannel = 'email' | 'push';
export type DigestKind = 'direct' | 'group';
export type DigestTrack = `${DigestChannel}:${DigestKind}`;

interface TrackSpec {
  quietEnvVar: string;
  maxDelayEnvVar: string;
  /** In-code server default, seconds — data-model.md §6. */
  productionQuietSeconds: number;
  /** In-code server default, seconds — data-model.md §6. */
  productionMaxDelaySeconds: number;
}

const TRACK_SPECS: Record<DigestTrack, TrackSpec> = {
  'push:direct': {
    quietEnvVar: 'MESSAGING_DIGEST_PUSH_DIRECT_QUIET_SECONDS',
    maxDelayEnvVar: 'MESSAGING_DIGEST_PUSH_DIRECT_MAX_DELAY_SECONDS',
    productionQuietSeconds: 60,
    productionMaxDelaySeconds: 300,
  },
  'push:group': {
    quietEnvVar: 'MESSAGING_DIGEST_PUSH_GROUP_QUIET_SECONDS',
    maxDelayEnvVar: 'MESSAGING_DIGEST_PUSH_GROUP_MAX_DELAY_SECONDS',
    productionQuietSeconds: 300,
    productionMaxDelaySeconds: 900,
  },
  'email:direct': {
    quietEnvVar: 'MESSAGING_DIGEST_EMAIL_DIRECT_QUIET_SECONDS',
    maxDelayEnvVar: 'MESSAGING_DIGEST_EMAIL_DIRECT_MAX_DELAY_SECONDS',
    productionQuietSeconds: 300,
    productionMaxDelaySeconds: 1800,
  },
  'email:group': {
    quietEnvVar: 'MESSAGING_DIGEST_EMAIL_GROUP_QUIET_SECONDS',
    maxDelayEnvVar: 'MESSAGING_DIGEST_EMAIL_GROUP_MAX_DELAY_SECONDS',
    productionQuietSeconds: 1200,
    productionMaxDelaySeconds: 3600,
  },
};

const SWEEP_INTERVAL_ENV_VAR = 'MESSAGING_DIGEST_SWEEP_INTERVAL_SECONDS';
const PRODUCTION_SWEEP_INTERVAL_SECONDS = 10;

/**
 * Slack for everything BETWEEN the flush decision and the assertion surface:
 * one adapter RPC for unread counts, the RabbitMQ hop, the notifications
 * service render + SMTP handoff, and Mailslurper's own ingest. Never smaller
 * than 5s, and never smaller than a few sweep ticks of scheduler jitter.
 */
const settleFor = (sweepIntervalMs: number): number =>
  Math.max(5_000, sweepIntervalMs * 3);

const readPositiveSeconds = (envVar: string, fallbackSeconds: number): number => {
  const raw = process.env[envVar];
  if (raw === undefined || raw.trim() === '') return fallbackSeconds;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `${envVar} must be a positive number of seconds; got "${raw}". ` +
        'Fix the harness env rather than letting a messaging wait silently ' +
        'collapse to zero.'
    );
  }
  return parsed;
};

export interface DigestWindow {
  channel: DigestChannel;
  kind: DigestKind;
  /** e.g. `email:direct` — quote this in the comment next to any wait. */
  track: DigestTrack;
  /** Debounce period: resets on every new message on this track. */
  quietMs: number;
  /** FR-011b cap, measured from the first un-notified message on the track. */
  maxDelayMs: number;
  /** How often a replica sweeps the due queue — a flush is never earlier than a tick. */
  sweepIntervalMs: number;
  /** Pipeline slack between the flush decision and the observable sink. */
  settleMs: number;
  /**
   * `quiet + sweep + settle`. After a FINAL message on this track, a dispatch
   * that is going to happen has happened by now. Use this to wait FOR a
   * digest, and as the minimum grace for "nothing arrived" when the track was
   * armed exactly once.
   */
  quietGraceMs: number;
  /**
   * `maxDelay + sweep + settle`. The strongest bound the design offers: even a
   * debounce that keeps being reset must have fired by now. Use this for every
   * load-bearing NEGATIVE assertion ("this recipient will NEVER be notified"),
   * so the test cannot pass merely because the dispatch is still pending.
   */
  maxDelayGraceMs: number;
  /**
   * How long after a message it is still guaranteed to be too early for this
   * track to have fired — `quiet` minus a small margin.
   *
   * SOUND ONLY FOR A TRACK ARMED ONCE. The claim "a sweep can only DELAY a
   * flush past `lastMessage + quiet`, never advance it" holds for a single
   * message, but not for a burst: the real fire time is
   * `min(lastMessage + quiet, firstMessage + maxDelay)`, so once a burst has
   * run for longer than `maxDelay - quiet` the FR-011b cap wins and the digest
   * fires BEFORE `lastMessage + quiet`. With the shipped `email:direct` values
   * (quiet 4s, maxDelay 15s) any burst lasting over 11s trips it — reachable
   * for a handful of sequential sends on a loaded runner, and it shows up as a
   * debounce regression that isn't one.
   *
   * For a burst, use {@link preFireProbeAfterBurstMs}, which accounts for the
   * cap and refuses to hand back an unsound bound.
   */
  preFireProbeMs: number;
  /** The env var that sets this track's max delay — quoted in diagnostics. */
  maxDelayEnvVar: string;
  /** Per-test timeout derived from this window — never a literal. */
  testTimeoutMs: number;
}

const timeoutFor = (
  maxDelayGraceMsTotal: number,
  cycles: number,
  baseMs: number
): number => baseMs + cycles * maxDelayGraceMsTotal;

/**
 * The windows for ONE track. Every sleep and every per-test timeout in the
 * messaging suites derives from this.
 */
export const digestWindow = (
  channel: DigestChannel,
  kind: DigestKind
): DigestWindow => {
  const track: DigestTrack = `${channel}:${kind}`;
  const spec = TRACK_SPECS[track];

  const quietMs =
    readPositiveSeconds(spec.quietEnvVar, spec.productionQuietSeconds) * 1_000;
  const maxDelayMs =
    readPositiveSeconds(spec.maxDelayEnvVar, spec.productionMaxDelaySeconds) *
    1_000;
  const sweepIntervalMs =
    readPositiveSeconds(
      SWEEP_INTERVAL_ENV_VAR,
      PRODUCTION_SWEEP_INTERVAL_SECONDS
    ) * 1_000;
  const settleMs = settleFor(sweepIntervalMs);

  const quietGraceMs = quietMs + sweepIntervalMs + settleMs;
  // `max` rather than a bare sum: a misconfigured stack with max_delay < quiet
  // must never produce a grace SHORTER than the quiet grace, or the strongest
  // negative bound would silently become the weakest.
  const maxDelayGraceMs = Math.max(
    quietGraceMs,
    maxDelayMs + sweepIntervalMs + settleMs
  );

  return {
    channel,
    kind,
    track,
    quietMs,
    maxDelayMs,
    sweepIntervalMs,
    settleMs,
    quietGraceMs,
    maxDelayGraceMs,
    preFireProbeMs: Math.max(
      0,
      quietMs - Math.min(1_000, Math.floor(quietMs / 4))
    ),
    maxDelayEnvVar: spec.maxDelayEnvVar,
    testTimeoutMs: timeoutFor(maxDelayGraceMs, 2, 60_000),
  };
};

/**
 * Cap-aware pre-fire probe, for a track armed by a BURST rather than a single
 * message.
 *
 * The fire time is `min(lastMessage + quiet, firstMessage + maxDelay)`.
 * `preFireProbeMs` only models the first term, so after a long burst it can
 * sleep straight PAST the flush and the following "assert zero" then fails on
 * a correct build. This returns the largest sleep that is still guaranteed to
 * land before EITHER term, measured from `firstMessageAtMs`.
 *
 * If the cap has already been reached, no sound probe exists — the digest may
 * legitimately have fired already — so this THROWS rather than returning a
 * bound the caller would use to assert something untrue. That converts an
 * intermittent, misattributed red into one actionable message.
 */
export const preFireProbeAfterBurstMs = (
  window: DigestWindow,
  firstMessageAtMs: number,
  nowMs: number = Date.now()
): number => {
  const margin = Math.min(1_000, Math.floor(window.quietMs / 4));
  const capProbeMs = firstMessageAtMs + window.maxDelayMs - margin - nowMs;
  if (capProbeMs <= 0) {
    const burstMs = nowMs - firstMessageAtMs;
    throw new Error(
      `messaging-digest-windows: arming the ${window.track} burst took ${burstMs}ms, ` +
        `which has already reached its max-delay cap of ${window.maxDelayMs}ms. ` +
        'The FR-011b cap fires the digest BEFORE lastMessage + quiet, so there is no ' +
        'sound "too early to have fired" bound left and a zero-notifications assertion ' +
        `here would be testing nothing. Shorten the burst, or raise ${window.maxDelayEnvVar} ` +
        'on BOTH the server under test and this harness.'
    );
  }
  return Math.max(0, Math.min(window.preFireProbeMs, capProbeMs));
};

/**
 * Per-test timeout for a test that waits on SEVERAL tracks (e.g. the
 * direct-vs-group independence case), or that walks more than the default two
 * dispatch cycles. `cycles` counts how many full max-delay waits the test can
 * legitimately perform on each of its tracks.
 */
export const digestTestTimeoutMs = (
  windows: DigestWindow | DigestWindow[],
  { cycles = 2, baseMs = 60_000 }: { cycles?: number; baseMs?: number } = {}
): number => {
  const list = Array.isArray(windows) ? windows : [windows];
  const total = list.reduce((sum, w) => sum + w.maxDelayGraceMs, 0);
  return timeoutFor(total, cycles, baseMs);
};

/**
 * One-line description of a window, for the `test()` title or a failure
 * message — makes it obvious in a report WHICH window a wait was covering and
 * whether the harness picked up the stack's short values or fell back to the
 * production defaults.
 */
export const describeDigestWindow = (window: DigestWindow): string =>
  `${window.track} quiet=${window.quietMs / 1_000}s ` +
  `maxDelay=${window.maxDelayMs / 1_000}s ` +
  `sweep=${window.sweepIntervalMs / 1_000}s`;
