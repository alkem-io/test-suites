/**
 * The orphaned-actor state a deleted user leaves behind, over the bearer path
 * (server#6315, PR #6324 — spec `107-oidc-session-revocation`).
 *
 * The HS256 non-interactive-login bearer still verifies after its user row is
 * gone, so `AuthenticationService.createActorContext` falls back to
 * `createAnonymous()` and the request reaches the `me` resolvers with
 * `actorID === ''` — the reachable analogue of an orphaned session. These specs
 * assert the **degradation**, and the deletion mutation's own behaviour around
 * it. They deliberately do not claim to test revocation: `getSubRevokedAt` is
 * read only by `CookieSessionStrategy`, which this harness never exercises.
 *
 * Scenarios: SRA-G5, SRA-R2, SRA-R3, SRA-E1, SRA-E2, SRA-E3, SRA-N1.
 */
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  createDisposableVerifiedUser,
  deleteUserTolerant,
  deleteUserWithOptions,
  MeCompositeData,
  MeUserData,
  meCompositeQuery,
  meUserQuery,
  postGraphqlRaw,
  RawGraphqlResponse,
} from '@functional-api/graphql-guard/me-degradation.request.params';
import { createUserOrFail, deleteUser } from './user.request.params';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'deleted-user-orphan',
};

// The shared subject of SRA-G5 / SRA-R2: deleted once, replayed twice.
let orphanedToken = '';
let orphanedUserId = '';
let preDeleteProbe: RawGraphqlResponse<MeUserData>;
let orphanedReplay: RawGraphqlResponse<MeCompositeData>;

const disposableUserIds: string[] = [];

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);

  const disposable = await createDisposableVerifiedUser();
  orphanedUserId = disposable.userId;
  orphanedToken = disposable.token;

  preDeleteProbe = await postGraphqlRaw<MeUserData>(meUserQuery, orphanedToken);
  await deleteUserWithOptions(orphanedUserId, { deleteIdentity: true });
  orphanedReplay = await postGraphqlRaw<MeCompositeData>(
    meCompositeQuery,
    orphanedToken
  );
});

afterAll(async () => {
  for (const userId of [orphanedUserId, ...disposableUserIds]) {
    await deleteUserTolerant(userId);
  }
});

describe('deleted user - orphaned bearer', () => {
  test('SRA-G5 - an orphaned actor degrades identically to an anonymous caller', async () => {
    // Precondition: the bearer resolved a real actor before the deletion.
    expect(preDeleteProbe.body.errors).toBeUndefined();
    expect(preDeleteProbe.body.data?.me.user?.id).toEqual(orphanedUserId);

    expect(orphanedReplay.status).toEqual(200);
    expect(orphanedReplay.body.errors).toBeUndefined();

    const me = orphanedReplay.body.data?.me;
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

  test('SRA-R2 - no BAD_USER_INPUT or FORBIDDEN from the orphaned-token request', async () => {
    expect(orphanedReplay.body.errors).toBeUndefined();
    expect(orphanedReplay.raw).not.toContain('BAD_USER_INPUT');
    expect(orphanedReplay.raw).not.toContain('FORBIDDEN');
    expect(orphanedReplay.raw).not.toContain('Unable to retrieve');
    expect(orphanedReplay.raw).not.toContain('no userID provided');
  });

  test('SRA-R3 - a second user is untouched by the first user deletion', async () => {
    const [victim, bystander] = await Promise.all([
      createDisposableVerifiedUser('blast-victim'),
      createDisposableVerifiedUser('blast-bystander'),
    ]);
    disposableUserIds.push(victim.userId, bystander.userId);

    await deleteUserWithOptions(victim.userId, { deleteIdentity: true });

    const response = await postGraphqlRaw<MeUserData>(
      meUserQuery,
      bystander.token
    );

    expect(response.status).toEqual(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data?.me.user?.id).toEqual(bystander.userId);
    expect(response.body.data?.me.id).toEqual(`me-${bystander.userId}`);
  });

  test('SRA-E1 - a user with no identity reference deletes cleanly', async () => {
    const testUniqueId = UniqueIDGenerator.getID();
    // The createUser mutation makes an Alkemio row with no Kratos identity, so
    // authenticationID is NULL and the revocation cascade must be skipped.
    // createUserOrFail recovers the committed user by nameID if the harness's
    // ~5 s connection cut forces a retry-after-commit (test-suites#563).
    const userId = await createUserOrFail({
      nameID: `no-identity-${testUniqueId}`,
      email: `no-identity-${testUniqueId}@alkem.io`,
    });
    expect(userId).not.toEqual('');

    const response = await deleteUser(userId);

    expect(response.error).toBeUndefined();
    expect(response?.data?.deleteUser.id).toEqual(userId);
  });

  test('SRA-E2 - repeated deletion is an ordinary not-found, never a revocation error', async () => {
    const disposable = await createDisposableVerifiedUser('repeat-delete');
    disposableUserIds.push(disposable.userId);

    await deleteUserWithOptions(disposable.userId, { deleteIdentity: true });
    const response = await deleteUserWithOptions(disposable.userId, {
      deleteIdentity: true,
    });

    const message = String(response.error?.errors[0].message);
    expect(message).toContain(
      `Unable to find user with given ID: ${disposable.userId}`
    );
    // The new code path must not leak a new failure mode into an idempotent retry.
    const lowered = message.toLowerCase();
    for (const term of ['revocation', 'revoke', 'redis', 'session', 'token']) {
      expect(lowered).not.toContain(term);
    }
  });

  test('SRA-E3 - deletion with deleteIdentity false still succeeds', async () => {
    const disposable = await createDisposableVerifiedUser('keep-identity');
    disposableUserIds.push(disposable.userId);

    const response = await deleteUserWithOptions(disposable.userId, {
      deleteIdentity: false,
    });

    expect(response.error).toBeUndefined();
    expect(response?.data?.deleteUser.id).toEqual(disposable.userId);
  });

  test('SRA-N1 - no token material on the deletion response surface', async () => {
    const disposable = await createDisposableVerifiedUser('no-leak');
    disposableUserIds.push(disposable.userId);

    const response = await deleteUserWithOptions(disposable.userId, {
      deleteIdentity: true,
    });
    const serialised = JSON.stringify(response);

    for (const secret of [
      'access_token',
      'id_token',
      'refresh_token',
      'Bearer ',
      'alkemio_session',
      'terminated_at',
      'alkemio:sid:',
      'alkemio:sub:',
    ]) {
      expect(serialised).not.toContain(secret);
    }
  });
});
