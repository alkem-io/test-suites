import request from 'supertest';
import { testConfiguration } from '..';

/**
 * Thin client over the RabbitMQ management HTTP API (compose publishes
 * 15672 — see server/quickstart-services.yml). Used for EMIT-LEVEL
 * assertions on internal queues that have no GraphQL/REST surface of their
 * own — notably `alkemio-push-notifications`, the queue the server's push
 * adapter publishes to and its own PushDeliveryService consumes in the same
 * process (workspace feature 034-messaging-notifications, Operator Ruling
 * 3c: push is verified to the emit/payload boundary only, never real
 * browser delivery — the acceptance overlay ships no VAPID keys).
 *
 * The instantaneous `messages` (queue depth) count is racy for a
 * single-replica consumer that drains near-instantly — a message can be
 * published and acked before the next poll. The cumulative
 * `message_stats.publish` counter never resets while the queue exists, so
 * it is the reliable "a publish happened" signal; assertions here diff it
 * against a baseline taken before the action under test.
 */

export interface QueueStats {
  messagesReady: number;
  messagesUnacknowledged: number;
  /** Cumulative messages ever published to this queue (never resets). */
  publishedTotal: number;
}

const authHeader = (): string => {
  const { user, password } = testConfiguration.endPoints.rabbitMqManagement;
  const token = Buffer.from(`${user}:${password}`).toString('base64');
  return `Basic ${token}`;
};

/**
 * Reads current stats for one queue. Returns zeroed stats (rather than
 * throwing) when the queue does not exist yet (e.g. no message has ever
 * been published) — RabbitMQ's management API 404s on an unknown queue,
 * which is a valid "nothing published yet" baseline for this harness.
 */
export const getQueueStats = async (
  queueName: string,
  vhost = '/'
): Promise<QueueStats> => {
  const { url } = testConfiguration.endPoints.rabbitMqManagement;
  const encodedVhost = encodeURIComponent(vhost);

  const response = await request(url)
    .get(`/api/queues/${encodedVhost}/${queueName}`)
    .set('Authorization', authHeader())
    .set('Accept', 'application/json');

  if (response.status === 404) {
    return { messagesReady: 0, messagesUnacknowledged: 0, publishedTotal: 0 };
  }

  const body = response.body ?? {};
  return {
    messagesReady: body.messages_ready ?? 0,
    messagesUnacknowledged: body.messages_unacknowledged ?? 0,
    publishedTotal: body.message_stats?.publish ?? 0,
  };
};

/**
 * Polls `queueName`'s cumulative publish counter until it has advanced by
 * at least `expectedIncrease` past `baseline`, or the timeout elapses.
 * Returns the last-observed stats either way — callers assert on the
 * returned `publishedTotal` so a timeout produces a normal (informative)
 * test failure rather than a thrown harness error.
 */
export const waitForQueuePublishIncrease = async (
  queueName: string,
  baseline: number,
  expectedIncrease = 1,
  { timeout = 15_000, interval = 1_000 }: { timeout?: number; interval?: number } = {}
): Promise<QueueStats> => {
  const start = Date.now();
  let last = await getQueueStats(queueName);

  while (
    last.publishedTotal < baseline + expectedIncrease &&
    Date.now() - start < timeout
  ) {
    await new Promise(resolve => setTimeout(resolve, interval));
    last = await getQueueStats(queueName);
  }

  return last;
};
