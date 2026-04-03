/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getVapidPublicKey,
  getMyPushSubscriptions,
  generateFakePushSubscription,
} from '@functional-api/push-notifications/push-notifications.request.params';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'push-subscription-lifecycle',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

// Track subscription IDs for safe cleanup on assertion failure
const pendingCleanup: { id: string; user: TestUser }[] = [];

afterEach(async () => {
  for (const { id, user } of pendingCleanup) {
    await unsubscribeFromPushNotifications(id, user).catch(() => {
      // already cleaned up or never created — ignore
    });
  }
  pendingCleanup.length = 0;
});

describe('Push Subscriptions - VAPID Public Key', () => {
  test('should return a VAPID public key for authenticated user', async () => {
    const res = await getVapidPublicKey(TestUser.GLOBAL_ADMIN);

    expect(res.body.data?.vapidPublicKey).toBeDefined();
    expect(typeof res.body.data?.vapidPublicKey).toBe('string');
    expect(res.body.data?.vapidPublicKey.length).toBeGreaterThan(0);
  });

  test('should return the same VAPID key for different users', async () => {
    const res1 = await getVapidPublicKey(TestUser.GLOBAL_ADMIN);
    const res2 = await getVapidPublicKey(TestUser.SPACE_ADMIN);

    expect(res1.body.data?.vapidPublicKey).toEqual(
      res2.body.data?.vapidPublicKey
    );
  });

  test('should return VAPID key for non-space member (authenticated user)', async () => {
    const res = await getVapidPublicKey(TestUser.NON_SPACE_MEMBER);

    expect(res.body.data?.vapidPublicKey).toBeDefined();
  });
});

describe('Push Subscriptions - Subscribe', () => {
  test('should create a new push subscription', async () => {
    const sub = generateFakePushSubscription('subscribe-test');
    const res = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_ADMIN,
      'Mozilla/5.0 Test Browser'
    );

    const data = res.body.data?.subscribeToPushNotifications;
    pendingCleanup.push({ id: data?.id, user: TestUser.GLOBAL_ADMIN });

    expect(data).toBeDefined();
    expect(data.id).toBeDefined();
    expect(data.status).toEqual('ACTIVE');
    expect(data.userAgent).toEqual('Mozilla/5.0 Test Browser');
  });

  test('should update existing subscription when same endpoint is used', async () => {
    const sub = generateFakePushSubscription('upsert-test');

    // First subscription
    const res1 = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_ADMIN,
      'Browser v1'
    );
    const firstId = res1.body.data?.subscribeToPushNotifications.id;
    pendingCleanup.push({ id: firstId, user: TestUser.GLOBAL_ADMIN });

    // Re-subscribe with same endpoint
    const res2 = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_ADMIN,
      'Browser v2'
    );
    const secondId = res2.body.data?.subscribeToPushNotifications.id;

    // Should be the same subscription (upsert behavior)
    expect(secondId).toEqual(firstId);
  });

  // skipped until bug is fixed: https://github.com/orgs/alkem-io/projects/50/views/15?pane=issue&itemId=171313016&issue=alkem-io%7Cserver%7C5951
  test.skip('should fail with invalid subscription data', async () => {
    const res = await subscribeToPushNotifications(
      '', // empty endpoint
      'some-key',
      'some-auth',
      TestUser.GLOBAL_ADMIN
    );
    console.log(res);

    expect(res.body.errors).toBeDefined();
  });
});

describe('Push Subscriptions - Unsubscribe', () => {
  test('should unsubscribe an existing push subscription', async () => {
    const sub = generateFakePushSubscription('unsubscribe-test');
    const createRes = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_ADMIN
    );
    const subscriptionId = createRes.body.data?.subscribeToPushNotifications.id;
    pendingCleanup.push({ id: subscriptionId, user: TestUser.GLOBAL_ADMIN });

    const res = await unsubscribeFromPushNotifications(
      subscriptionId,
      TestUser.GLOBAL_ADMIN
    );

    expect(res.body.data?.unsubscribeFromPushNotifications).toBeDefined();
    expect(res.body.data?.unsubscribeFromPushNotifications.id).toEqual(
      subscriptionId
    );
  });

  test('should fail when unsubscribing with invalid subscription ID', async () => {
    const res = await unsubscribeFromPushNotifications(
      '00000000-0000-0000-0000-000000000000',
      TestUser.GLOBAL_ADMIN
    );

    expect(res.body.errors).toBeDefined();
  });

  test('should not allow unsubscribing another users subscription', async () => {
    const sub = generateFakePushSubscription('cross-user-test');
    const createRes = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_ADMIN
    );
    const subscriptionId = createRes.body.data?.subscribeToPushNotifications.id;
    pendingCleanup.push({ id: subscriptionId, user: TestUser.GLOBAL_ADMIN });

    // Try to unsubscribe as a different user
    const res = await unsubscribeFromPushNotifications(
      subscriptionId,
      TestUser.SPACE_ADMIN
    );

    expect(res.body.errors).toBeDefined();
  });
});

describe('Push Subscriptions - List (myPushSubscriptions)', () => {
  test('should return empty list when user has no subscriptions', async () => {
    const res = await getMyPushSubscriptions(TestUser.NON_SPACE_MEMBER);

    expect(res.body.data?.myPushSubscriptions).toBeDefined();
    expect(res.body.data?.myPushSubscriptions).toEqual([]);
  });

  test('should list all active subscriptions for the current user', async () => {
    const sub1 = generateFakePushSubscription('list-test-1');
    const sub2 = generateFakePushSubscription('list-test-2');

    const res1 = await subscribeToPushNotifications(
      sub1.endpoint,
      sub1.p256dh,
      sub1.auth,
      TestUser.GLOBAL_ADMIN,
      'Chrome on Windows'
    );
    const res2 = await subscribeToPushNotifications(
      sub2.endpoint,
      sub2.p256dh,
      sub2.auth,
      TestUser.GLOBAL_ADMIN,
      'Firefox on Linux'
    );

    const id1 = res1.body.data?.subscribeToPushNotifications.id;
    const id2 = res2.body.data?.subscribeToPushNotifications.id;
    pendingCleanup.push(
      { id: id1, user: TestUser.GLOBAL_ADMIN },
      { id: id2, user: TestUser.GLOBAL_ADMIN }
    );

    const listRes = await getMyPushSubscriptions(TestUser.GLOBAL_ADMIN);
    const subs = listRes.body.data?.myPushSubscriptions;

    expect(subs.length).toBeGreaterThanOrEqual(2);

    const ids = subs.map((s: any) => s.id);
    expect(ids).toContain(id1);
    expect(ids).toContain(id2);
  });

  test('should not show other users subscriptions', async () => {
    const sub = generateFakePushSubscription('isolation-test');
    const createRes = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_ADMIN,
      'GA Browser'
    );
    const subId = createRes.body.data?.subscribeToPushNotifications.id;
    pendingCleanup.push({ id: subId, user: TestUser.GLOBAL_ADMIN });

    // Query as a different user
    const listRes = await getMyPushSubscriptions(TestUser.SPACE_ADMIN);
    const ids =
      listRes.body.data?.myPushSubscriptions.map((s: any) => s.id) ?? [];
    expect(ids).not.toContain(subId);
  });

  // skip until bug is fixed: BUG: Unsubscribed push subscriptions are returned as disabled, instead of getting removed#5961
  test.skip('should not list unsubscribed subscriptions', async () => {
    const sub = generateFakePushSubscription('removed-test');
    const createRes = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_ADMIN
    );
    const subId = createRes.body.data?.subscribeToPushNotifications.id;

    // Unsubscribe
    await unsubscribeFromPushNotifications(subId, TestUser.GLOBAL_ADMIN);

    // Verify it is no longer listed
    const listRes = await getMyPushSubscriptions(TestUser.GLOBAL_ADMIN);
    const ids =
      listRes.body.data?.myPushSubscriptions.map((s: any) => s.id) ?? [];
    expect(ids).not.toContain(subId);
  });
});

describe('Push Subscriptions - Max subscriptions cap (10)', () => {
  // skip until bug is fixed: BUG: Unsubscribed push subscriptions are returned as disabled, instead of getting removed#5961
  test.skip('should replace oldest subscription when exceeding max limit of 10', async () => {
    const subscriptionIds: string[] = [];

    // Create 10 subscriptions
    for (let i = 0; i < 10; i++) {
      const sub = generateFakePushSubscription(`cap-test-${i}`);
      const res = await subscribeToPushNotifications(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        TestUser.SPACE_MEMBER,
        `Device ${i}`
      );
      const id = res.body.data?.subscribeToPushNotifications.id;
      subscriptionIds.push(id);
      pendingCleanup.push({ id, user: TestUser.SPACE_MEMBER });
    }

    // Verify we have 10
    const listBefore = await getMyPushSubscriptions(TestUser.SPACE_MEMBER);
    expect(listBefore.body.data?.myPushSubscriptions.length).toEqual(10);

    // Create 11th subscription — should auto-remove the oldest
    const sub11 = generateFakePushSubscription('cap-test-11');
    const res11 = await subscribeToPushNotifications(
      sub11.endpoint,
      sub11.p256dh,
      sub11.auth,
      TestUser.SPACE_MEMBER,
      'Device 11'
    );
    const id11 = res11.body.data?.subscribeToPushNotifications.id;
    pendingCleanup.push({ id: id11, user: TestUser.SPACE_MEMBER });

    // Verify still at 10
    const listAfter = await getMyPushSubscriptions(TestUser.SPACE_MEMBER);
    expect(listAfter.body.data?.myPushSubscriptions.length).toEqual(10);

    // The first subscription should be gone
    const activeIds =
      listAfter.body.data?.myPushSubscriptions.map((s: any) => s.id) ?? [];
    expect(activeIds).not.toContain(subscriptionIds[0]);
    expect(activeIds).toContain(id11);
  });
});

describe('Push Subscriptions - Subscription fields', () => {
  test('should return correct fields on subscription creation', async () => {
    const sub = generateFakePushSubscription('fields-test');
    const res = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_ADMIN,
      'Chrome/120 on macOS'
    );

    const subscription = res.body.data?.subscribeToPushNotifications;
    pendingCleanup.push({
      id: subscription?.id,
      user: TestUser.GLOBAL_ADMIN,
    });

    expect(subscription).toBeDefined();
    expect(subscription.id).toBeDefined();
    expect(subscription.createdDate).toBeDefined();
    expect(subscription.status).toEqual('ACTIVE');
    expect(subscription.userAgent).toEqual('Chrome/120 on macOS');
  });

  test('should be accessible via myPushSubscriptions with all fields', async () => {
    const sub = generateFakePushSubscription('query-fields-test');
    const createRes = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_ADMIN,
      'Safari/17 on iOS'
    );
    const subId = createRes.body.data?.subscribeToPushNotifications.id;
    pendingCleanup.push({ id: subId, user: TestUser.GLOBAL_ADMIN });

    const listRes = await getMyPushSubscriptions(TestUser.GLOBAL_ADMIN);
    const found = listRes.body.data?.myPushSubscriptions.find(
      (s: any) => s.userAgent === 'Safari/17 on iOS'
    );

    expect(found).toBeDefined();
    expect(found.id).toBeDefined();
    expect(found.createdDate).toBeDefined();
    expect(found.status).toEqual('ACTIVE');
  });
});
