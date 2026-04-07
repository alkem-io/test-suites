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
  name: 'push-subscription-security',
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

describe('Push Subscriptions - Input Validation', () => {
  // Related: https://github.com/alkem-io/server/pull/5884
  // CodeRabbit flagged missing @MaxLength on p256dh (~87 chars) and auth (~22 chars)

  // skip until bug is fixed: BUG: [PWA] Push notification subscription can be created with invalid data#5951
  test.skip('should reject oversized p256dh key', async () => {
    const oversizedKey = 'A'.repeat(500);
    const res = await subscribeToPushNotifications(
      'https://fcm.googleapis.com/fcm/send/valid-oversized-test',
      oversizedKey,
      'tBHItJI5svbpC7htN',
      TestUser.GLOBAL_ADMIN
    );
    console.log(res);

    expect(res.body.errors).toBeDefined();
  });
  // skip until bug is fixed: BUG: [PWA] Push notification subscription can be created with invalid data#5951
  test.skip('should reject oversized auth key', async () => {
    const sub = generateFakePushSubscription('auth-oversize');
    const oversizedAuth = 'B'.repeat(500);
    const res = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      oversizedAuth,
      TestUser.GLOBAL_ADMIN
    );
    console.log(res.body);

    expect(res.body.errors).toBeDefined();
  });

  // Note: empty endpoint test already exists in lifecycle spec (skipped pending bug fix)
  // skip until bug is fixed: BUG: [PWA] Push notification subscription can be created with invalid data#5951
  test.skip('should reject empty p256dh key', async () => {
    const res = await subscribeToPushNotifications(
      'https://fcm.googleapis.com/fcm/send/empty-key-test',
      '',
      'validAuth',
      TestUser.GLOBAL_ADMIN
    );
    console.log(res.body);

    expect(res.body.errors).toBeDefined();
  });

  // skip until bug is fixed: BUG: [PWA] Push notification subscription can be created with invalid data#5951
  test.skip('should reject empty auth key', async () => {
    const res = await subscribeToPushNotifications(
      'https://fcm.googleapis.com/fcm/send/empty-auth-test',
      'validP256dhKey',
      '',
      TestUser.GLOBAL_ADMIN
    );
    console.log(res.body);

    expect(res.body.errors).toBeDefined();
  });

  // CodeRabbit flagged missing @IsUUID decorator on subscriptionID in delete DTO
  test('should reject non-UUID subscriptionID on unsubscribe', async () => {
    const res = await unsubscribeFromPushNotifications(
      'not-a-valid-uuid',
      TestUser.GLOBAL_ADMIN
    );

    expect(res.body.errors).toBeDefined();
  });

  test('should reject SQL injection attempt in subscriptionID', async () => {
    const res = await unsubscribeFromPushNotifications(
      "'; DROP TABLE push_subscription; --",
      TestUser.GLOBAL_ADMIN
    );
    console.log(res.body);
    expect(res.body.errors).toBeDefined();
  });

  // skip until bug is fixed: BUG: [PWA] Push notification subscription can be created with invalid data#5951
  test.skip('should reject special characters in endpoint', async () => {
    const res = await subscribeToPushNotifications(
      '<script>alert("xss")</script>',
      'validP256dhKey',
      'validAuth',
      TestUser.GLOBAL_ADMIN
    );
    console.log(res.body);

    expect(res.body.errors).toBeDefined();
  });
});
// skip until bug is fixed: BUG: [PWA] Push notification subscription can be created with invalid data#5951
describe.skip('Push Subscriptions - SSRF / Endpoint Validation', () => {
  // Arbitrary endpoint URLs could be used for SSRF attacks
  // The server should validate that endpoints point to legitimate push services
  // skip until bug is fixed: BUG: [PWA] Push notification subscription can be created with invalid data#5951
  test.skip('should reject internal network endpoint (localhost)', async () => {
    const res = await subscribeToPushNotifications(
      'http://localhost:8080/internal-service',
      'validP256dhKey',
      'validAuth',
      TestUser.GLOBAL_ADMIN
    );
    console.log(res.body);
    expect(res.body.errors).toBeDefined();
  });

  test('should reject cloud metadata endpoint (AWS IMDS)', async () => {
    const res = await subscribeToPushNotifications(
      'http://169.254.169.254/latest/meta-data/',
      'validP256dhKey',
      'validAuth',
      TestUser.GLOBAL_ADMIN
    );
    console.log(res.body);
    expect(res.body.errors).toBeDefined();
  });

  test('should reject private IP range endpoint', async () => {
    const res = await subscribeToPushNotifications(
      'http://10.0.0.1:3000/api',
      'validP256dhKey',
      'validAuth',
      TestUser.GLOBAL_ADMIN
    );
    console.log(res.body);

    expect(res.body.errors).toBeDefined();
  });

  test('should reject non-HTTPS endpoint', async () => {
    const res = await subscribeToPushNotifications(
      'http://push.example.com/subscription',
      'validP256dhKey',
      'validAuth',
      TestUser.GLOBAL_ADMIN
    );
    console.log(res.body);
    expect(res.body.errors).toBeDefined();
  });

  test('should reject file protocol endpoint', async () => {
    const res = await subscribeToPushNotifications(
      'file:///etc/passwd',
      'validP256dhKey',
      'validAuth',
      TestUser.GLOBAL_ADMIN
    );
    console.log(res.body);

    expect(res.body.errors).toBeDefined();
  });
});

describe('Push Subscriptions - VAPID Key Security', () => {
  test('should return a valid base64url-encoded VAPID public key', async () => {
    const res = await getVapidPublicKey(TestUser.GLOBAL_ADMIN);
    const key = res.body.data?.vapidPublicKey;

    expect(key).toBeDefined();
    // ECDSA P-256 uncompressed public key in base64url is 87 chars
    expect(key.length).toBeGreaterThanOrEqual(80);
    // Must be valid base64url (no +, /, or = characters)
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test('should not expose VAPID private key in public key query', async () => {
    const res = await getVapidPublicKey(TestUser.GLOBAL_ADMIN);

    // Verify query succeeded with no errors
    expect(res.body.errors ?? []).toHaveLength(0);
    expect(res.body.data?.vapidPublicKey).toBeDefined();

    // Verify the response data contains only the expected field
    const dataKeys = Object.keys(res.body.data);
    expect(dataKeys).toEqual(['vapidPublicKey']);

    // Additionally check that the full response body doesn't leak private key material
    const responseStr = JSON.stringify(res.body).toLowerCase();
    expect(responseStr).not.toContain('privatekey');
    expect(responseStr).not.toContain('vapidprivate');
    expect(responseStr).not.toContain('secret');
  });
});

describe('Push Subscriptions - Authorization Edge Cases', () => {
  // Lifecycle spec already tests that cross-user unsubscribe is blocked.
  // This test checks that the error response does not leak existence info
  // (i.e. same error for real-but-unauthorized ID vs completely fake ID).

  test('should return identical error for unauthorized vs nonexistent subscription ID', async () => {
    // Create subscription as GLOBAL_ADMIN
    const sub = generateFakePushSubscription('authz-enum-test');
    const createRes = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_ADMIN
    );
    const createData = createRes.body.data?.subscribeToPushNotifications;
    expect(createData).toBeDefined();
    expect(createData.id).toBeDefined();
    const realId = createData.id;
    pendingCleanup.push({ id: realId, user: TestUser.GLOBAL_ADMIN });

    // Try to unsubscribe as different user
    const wrongUserRes = await unsubscribeFromPushNotifications(
      realId,
      TestUser.SPACE_ADMIN
    );

    // Try with a completely fake ID
    const fakeIdRes = await unsubscribeFromPushNotifications(
      '11111111-1111-1111-1111-111111111111',
      TestUser.SPACE_ADMIN
    );

    // Both should return the same error shape — no information leakage
    // about whether the subscription exists
    expect(wrongUserRes.body.errors).toBeDefined();
    expect(fakeIdRes.body.errors).toBeDefined();
    expect(wrongUserRes.body.errors?.[0]?.message).toEqual(
      fakeIdRes.body.errors?.[0]?.message
    );
  });

  test('should not expose subscription details (endpoint, keys) in list query', async () => {
    const sub = generateFakePushSubscription('no-leak-test');
    const createRes = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_ADMIN,
      'Leak Test Browser'
    );
    expect(createRes.body.errors ?? []).toHaveLength(0);
    const subId = createRes.body.data?.subscribeToPushNotifications.id;
    expect(subId).toBeDefined();
    pendingCleanup.push({ id: subId, user: TestUser.GLOBAL_ADMIN });

    const listRes = await getMyPushSubscriptions(TestUser.GLOBAL_ADMIN);
    const found = listRes.body.data?.myPushSubscriptions.find(
      (s: any) => s.id === subId
    );

    expect(found).toBeDefined();
    expect(found.userAgent).toEqual('Leak Test Browser');

    // Verify returned fields are limited to safe metadata only
    const fieldNames = Object.keys(found);
    expect(fieldNames).not.toContain('endpoint');
    expect(fieldNames).not.toContain('p256dh');
    expect(fieldNames).not.toContain('auth');
    expect(fieldNames).not.toContain('keys');

    // Also check values don't leak through other fields
    const responseStr = JSON.stringify(found);
    expect(responseStr).not.toContain(sub.p256dh);
    expect(responseStr).not.toContain(sub.auth);
  });
});

describe('Push Subscriptions - Concurrent Subscription Cap', () => {
  // The lifecycle spec tests the cap sequentially.
  // This tests whether concurrent registrations can bypass the 10-sub limit.

  // skip until bug is fixed: BUG: Unsubscribed push subscriptions are returned as disabled, instead of getting removed#5961 --- IGNORE ---
  test.skip('should enforce max 10 subscriptions under concurrent registration', async () => {
    // First, clean up any existing subscriptions for this user
    const existingSubs = await getMyPushSubscriptions(TestUser.SPACE_ADMIN);
    for (const s of existingSubs.body.data?.myPushSubscriptions ?? []) {
      await unsubscribeFromPushNotifications(s.id, TestUser.SPACE_ADMIN);
    }

    // Fire 15 concurrent subscription requests
    const concurrentRequests = Array.from({ length: 15 }, (_, i) => {
      const sub = generateFakePushSubscription(`concurrent-cap-${i}`);
      return subscribeToPushNotifications(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        TestUser.SPACE_ADMIN,
        `Concurrent Device ${i}`
      );
    });

    await Promise.all(concurrentRequests);

    // Verify the cap is still enforced
    const listRes = await getMyPushSubscriptions(TestUser.SPACE_ADMIN);
    const subs = listRes.body.data?.myPushSubscriptions ?? [];
    console.log(listRes);
    expect(subs.length).toBeLessThanOrEqual(10);

    // Cleanup
    for (const s of subs) {
      await unsubscribeFromPushNotifications(s.id, TestUser.SPACE_ADMIN);
    }
  });
});

describe('Push Subscriptions - Cross-User Endpoint Hijack', () => {
  // Note: basic upsert/replay is already covered in lifecycle spec

  test('should not allow user A to hijack user B endpoint by subscribing to it', async () => {
    const sub = generateFakePushSubscription('hijack-test');

    // User A subscribes
    const resA = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_ADMIN
    );
    const idA = resA.body.data?.subscribeToPushNotifications.id;

    // User B subscribes with same endpoint (device takeover attempt)
    const resB = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.SPACE_ADMIN
    );

    // After B subscribes, A should no longer have this subscription
    // (the endpoint should belong to only one user at a time)
    const listA = await getMyPushSubscriptions(TestUser.GLOBAL_ADMIN);
    const aHasEndpoint = listA.body.data?.myPushSubscriptions.some(
      (s: any) => s.id === idA
    );

    const listB = await getMyPushSubscriptions(TestUser.SPACE_ADMIN);
    const bSub = listB.body.data?.myPushSubscriptions.find(
      (s: any) => s.id === resB.body.data?.subscribeToPushNotifications?.id
    );

    // Either: B's subscribe fails (endpoint belongs to A)
    // Or: endpoint transfers to B and A loses it
    // Both are acceptable — what's NOT acceptable is both users
    // receiving pushes on the same endpoint (duplicate delivery)
    if (resB.body.errors) {
      // Rejected — endpoint stays with A
      expect(aHasEndpoint).toBe(true);
    } else {
      // Transferred — A should lose it, B should have it
      expect(aHasEndpoint).toBe(false);
      expect(bSub).toBeDefined();

      // Cleanup B's subscription
      await unsubscribeFromPushNotifications(bSub.id, TestUser.SPACE_ADMIN);
    }

    // Cleanup A's subscription if it still exists
    if (aHasEndpoint) {
      await unsubscribeFromPushNotifications(idA, TestUser.GLOBAL_ADMIN);
    }
  });
});
