/**
 * `me` graceful degradation for callers with no resolved actor
 * (server#6315, PR #6324 — spec `107-oidc-session-revocation`, User Story 2).
 *
 * `ActorContextService.createAnonymous()` sets `actorID = ''`, so every guard
 * that used to throw fired for *any* anonymous visitor. These specs assert the
 * seven guards now return the empty value their type already permits, and that
 * a caller cannot tell one class of unusable bearer from another.
 *
 * Scenarios: SRA-G1, SRA-G2, SRA-G3, SRA-G4, SRA-R1, SRA-N2.
 * Expected to FAIL on `develop` (G1–G4) — that is the regression fence.
 */
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
} from '@alkemio/tests-lib';
import {
  buildUnsignedHs256Bearer,
  createDisposableVerifiedUser,
  deleteUserTolerant,
  deleteUserWithOptions,
  getTokenForTestUser,
  MeCompositeData,
  MeConversationsData,
  MeIdentityProbeData,
  MeNotificationsPageData,
  meCompositeQuery,
  meConversationsQuery,
  meIdentityProbeQuery,
  meNotificationsPageQuery,
  postGraphqlRaw,
} from './me-degradation.request.params';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'me-degradation-anon',
};

// Deleted in beforeAll so its bearer is orphaned for the whole file; kept here
// because SRA-N2 needs it alongside the two never-valid bearer classes.
let orphanedToken = '';
let orphanedUserId = '';

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);

  const disposable = await createDisposableVerifiedUser('me-degradation');
  orphanedToken = disposable.token;
  orphanedUserId = disposable.userId;
  await deleteUserWithOptions(orphanedUserId, { deleteIdentity: true });
});

afterAll(async () => {
  await deleteUserTolerant(orphanedUserId);
});

describe('me degradation - anonymous caller', () => {
  test('SRA-G1 - anonymous me degrades across all seven guards instead of erroring', async () => {
    const response = await postGraphqlRaw<MeCompositeData>(meCompositeQuery);

    expect(response.status).toEqual(200);
    expect(response.body.errors).toBeUndefined();

    const me = response.body.data?.me;
    expect(me?.id).toEqual('me-');
    expect(me?.user).toBeNull();
    expect(me?.notificationsUnreadCount).toEqual(0);
    expect(me?.communityInvitationsCount).toEqual(0);
    expect(me?.communityInvitations).toEqual([]);
    expect(me?.communityApplications).toEqual([]);
    expect(me?.notifications.total).toEqual(0);
    expect(me?.notifications.inAppNotifications).toEqual([]);
    expect(me?.conversations.conversations).toEqual([]);
  });

  test('SRA-G2 - degraded paginated field returns the contract empty page', async () => {
    const response = await postGraphqlRaw<MeNotificationsPageData>(
      meNotificationsPageQuery
    );

    expect(response.status).toEqual(200);
    expect(response.body.errors).toBeUndefined();

    // Guard 1 threw ForbiddenException, a different type from the other six —
    // an exception-type sweep would miss it, so it is asserted on its own.
    const notifications = response.body.data?.me.notifications;
    expect(notifications?.total).toEqual(0);
    expect(notifications?.inAppNotifications).toEqual([]);
    expect(notifications?.pageInfo.hasNextPage).toEqual(false);
    expect(notifications?.pageInfo.hasPreviousPage).toEqual(false);
    expect(notifications?.pageInfo.startCursor ?? null).toBeNull();
    expect(notifications?.pageInfo.endCursor ?? null).toBeNull();
  });

  test('SRA-G3 - the nested conversations resolver degrades, not just its container', async () => {
    const response =
      await postGraphqlRaw<MeConversationsData>(meConversationsQuery);

    expect(response.status).toEqual(200);
    expect(response.body.errors).toBeUndefined();
    // Relaxing only the container leaves the real thrower in
    // me.conversations.resolver.fields.ts intact.
    expect(response.body.data?.me.conversations.conversations).toEqual([]);
  });

  test('SRA-G4 - authenticated behaviour is unchanged', async () => {
    const response = await postGraphqlRaw<MeCompositeData>(
      meCompositeQuery,
      getTokenForTestUser(TestUser.SPACE_MEMBER)
    );

    expect(response.status).toEqual(200);
    expect(response.body.errors).toBeUndefined();

    const me = response.body.data?.me;
    expect(me?.user?.id).toEqual(expect.any(String));
    expect(me?.user?.id?.length).toBeGreaterThan(0);
    expect(me?.id).toEqual(`me-${me?.user?.id}`);
    expect(me?.id).not.toEqual('me-');

    // Shape, not fixture data — the caller's real values must not be coupled to.
    expect(typeof me?.notificationsUnreadCount).toEqual('number');
    expect(typeof me?.communityInvitationsCount).toEqual('number');
    expect(Array.isArray(me?.communityInvitations)).toEqual(true);
    expect(Array.isArray(me?.communityApplications)).toEqual(true);
    expect(typeof me?.notifications.total).toEqual('number');
    expect(Array.isArray(me?.notifications.inAppNotifications)).toEqual(true);
    expect(Array.isArray(me?.conversations.conversations)).toEqual(true);
  });

  test('SRA-R1 - no BAD_USER_INPUT or FORBIDDEN from the anonymous me', async () => {
    const response = await postGraphqlRaw<MeCompositeData>(meCompositeQuery);

    expect(response.body.errors).toBeUndefined();
    // The literal strings the removed exceptions carried.
    expect(response.raw).not.toContain('BAD_USER_INPUT');
    expect(response.raw).not.toContain('FORBIDDEN');
    expect(response.raw).not.toContain('Unable to retrieve');
    expect(response.raw).not.toContain('no userID provided');
  });

  test('SRA-N2 - no existence oracle across bearer classes', async () => {
    const [noCredentials, orphaned, garbage, unsigned] = await Promise.all([
      postGraphqlRaw<MeIdentityProbeData>(meIdentityProbeQuery),
      postGraphqlRaw<MeIdentityProbeData>(meIdentityProbeQuery, orphanedToken),
      postGraphqlRaw<MeIdentityProbeData>(
        meIdentityProbeQuery,
        'not-a-token-at-all'
      ),
      postGraphqlRaw<MeIdentityProbeData>(
        meIdentityProbeQuery,
        buildUnsignedHs256Bearer()
      ),
    ]);

    // The oracle that would matter: a deleted account's still-valid bearer must
    // be indistinguishable from presenting no credentials at all.
    expect(orphaned.status).toEqual(200);
    expect(orphaned.body.errors).toBeUndefined();
    expect(orphaned.body.data?.me.id).toEqual('me-');
    expect(orphaned.body.data?.me.notificationsUnreadCount).toEqual(0);
    expect(orphaned.status).toEqual(noCredentials.status);
    expect(orphaned.body).toEqual(noCredentials.body);

    // An unverifiable bearer is refused by JWS verification before any account
    // is looked up, so its 401 is a property of the token, never of an account.
    for (const response of [garbage, unsigned]) {
      expect(response.status).toEqual(401);
      expect(response.body.errors?.[0]?.message).toEqual('unauthenticated');
      expect(
        (response.body.errors?.[0]?.extensions as { code?: string })?.code
      ).toEqual('UNAUTHENTICATED');
      expect(response.body.data ?? null).toBeNull();
      expect(response.raw).not.toContain(orphanedUserId);
    }
  });
});
