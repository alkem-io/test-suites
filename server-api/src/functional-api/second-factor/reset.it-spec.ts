/**
 * The support reset of a member's second factor (US2-AS5, AS7; D6, D23, D24,
 * D37). Plan: ./second-factor-test-plan.md. Needs a stack with the feature's
 * Kratos values, the Kratos admin port, loopback Redis/Postgres and Matrix
 * (the room). On a database older than the server slice,
 * `authorizationPolicyResetOnPlatform` must have run once, or the reset
 * answers FORBIDDEN_POLICY for an environment reason.
 */
import {
  authenticationAuditRows,
  awaitLive,
  createPrivateRoom,
  createUser,
  credentialTypes,
  deleteBffSession,
  deleteUser,
  enrolTotp,
  errorCodes,
  eventually,
  generateRecoveryCodes,
  identitySessions,
  loginWithPassword,
  loginWithTotp,
  mintBffSession,
  postGraphqlRaw,
  postToRoom,
  readMySessionRaw,
  readSubjectMarker,
  resetSecondFactor,
  secondFactorCredentialsLeft,
  subscribeToRoom,
  type RoomSubscription,
  type ThrowawayUser,
} from '@alkemio/tests-lib';
import { roleTokens, secondFactorCases } from './_support/cases';

const throwawayUser = secondFactorCases();
const SECOND_FACTOR_TYPES = ['lookup_secret', 'totp', 'webauthn'];
const DELIVERY_BOUND_MS = 30_000;

const enrolledMember = async (tag: string) => {
  const user = await throwawayUser(tag);
  const secret = await enrolTotp(
    (await loginWithPassword(user.email)).sessionToken
  );
  await generateRecoveryCodes((await loginWithTotp(user.email, secret)).sessionToken);
  return user;
};

const resetRows = async (userId: string) =>
  (await authenticationAuditRows({ userId })).filter(r =>
    r.outcome.startsWith('second_factor_reset_')
  );

/** A room `member` can read, opened by `poster`, who posts into it. */
const roomOf = (poster: ThrowawayUser, member: ThrowawayUser) =>
  createPrivateRoom({ bearerToken: poster.token }, [member.userId]);

/** The subscription delivers `poster`'s message: it is live before the action. */
const expectLive = async (
  sub: RoomSubscription,
  roomId: string,
  poster: ThrowawayUser
) => {
  await awaitLive(
    sub,
    () => postToRoom(roomId, 'before', { bearerToken: poster.token }),
    DELIVERY_BOUND_MS
  );
};

/** The next message is not delivered and the socket closes with `code`. */
const expectClosedOnNextMessage = async (
  sub: RoomSubscription,
  roomId: string,
  poster: ThrowawayUser,
  code: number
) => {
  const id = await postToRoom(roomId, 'after', { bearerToken: poster.token });
  await eventually(() => sub.closeCode() !== undefined, DELIVERY_BOUND_MS, 'socket close');
  expect(sub.closeCode()).toBe(code);
  expect(sub.messageIds).not.toContain(id);
};

describe('Second factor — support reset', () => {
  test('US2-AS5 Platform Support resets an enrolled member: credentials, sessions and subscriptions end; the fence; two audit rows', async () => {
    const member = await enrolledMember('reset');
    const poster = await throwawayUser('poster');
    const roomId = await roomOf(poster, member);
    const before = await credentialTypes(member.identityId);
    expect(before).toEqual(expect.arrayContaining(['lookup_secret', 'totp']));
    expect((await identitySessions(member.identityId)).length).toBeGreaterThan(0);

    const minted = await mintBffSession(member.identityId, member.userId);
    expect((await readMySessionRaw({ cookieHeader: minted.cookieHeader })).status).toBe(200);
    const sub = await subscribeToRoom(minted.cookieHeader, roomId);
    try {
      await expectLive(sub, roomId, poster);

      const reset = await resetSecondFactor(
        member.userId,
        { bearerToken: roleTokens().support },
        { invalidatePassword: false }
      );
      const result = reset.body.data?.adminResetUserSecondFactor;
      expect(result, reset.raw).toBeDefined();
      expect([...result!.removedCredentialTypes].sort()).toEqual(
        before.filter(t => SECOND_FACTOR_TYPES.includes(t))
      );
      expect(result!.passwordInvalidated).toBe(false);

      expect(await secondFactorCredentialsLeft(member.identityId)).toEqual([]);
      expect(await identitySessions(member.identityId)).toEqual([]);

      // Tombstoned: answered as signed out on its next request.
      expect((await readMySessionRaw({ cookieHeader: minted.cookieHeader })).status).toBe(401);
      await expectClosedOnNextMessage(sub, roomId, poster, 4401);

      // The fence (D24): only `created_at` differs between the two sessions.
      const marker = await readSubjectMarker(member.identityId);
      const begunBefore = await mintBffSession(member.identityId, member.userId, {
        createdAtEpochS: marker - 1,
      });
      const begunAfter = await mintBffSession(member.identityId, member.userId, {
        createdAtEpochS: marker + 1,
      });
      expect((await readMySessionRaw({ cookieHeader: begunBefore.cookieHeader })).status).toBe(401);
      expect((await readMySessionRaw({ cookieHeader: begunAfter.cookieHeader })).status).toBe(200);

      const rows = await resetRows(member.userId);
      expect(rows.map(r => r.outcome)).toEqual([
        'second_factor_reset_started',
        'second_factor_reset_completed',
      ]);
      expect(rows[0].correlationId).toBeTruthy();
      expect(rows[1].correlationId).toBe(rows[0].correlationId);
      expect(rows[0].details).toMatchObject({ invalidatePassword: false });
      expect(rows[1].details).toMatchObject({
        removedCredentialTypes: result!.removedCredentialTypes,
        sessionsRevoked: result!.sessionsRevoked,
        tokenRevocationFailedCount: expect.any(Number),
      });
      expect(JSON.stringify(rows.map(r => r.details))).not.toContain(member.email);
    } finally {
      sub.dispose();
    }
  });

  test('D6 Platform Users Admin may reset; Platform Settings Admin is refused with no row', async () => {
    const member = await enrolledMember('roles');

    const refused = await resetSecondFactor(
      member.userId,
      { bearerToken: roleTokens().settingsAdmin },
      { invalidatePassword: false }
    );
    expect(errorCodes(refused)).toContain('FORBIDDEN_POLICY');
    expect(await resetRows(member.userId)).toEqual([]);
    expect(await credentialTypes(member.identityId)).toContain('totp');

    const allowed = await resetSecondFactor(
      member.userId,
      { bearerToken: roleTokens().usersAdmin },
      { invalidatePassword: false }
    );
    expect(allowed.body.data?.adminResetUserSecondFactor.removedCredentialTypes, allowed.raw).toContain('totp');
    expect(await credentialTypes(member.identityId)).not.toContain('totp');
  });

  test('US2-AS7 a self-target and a user whose record links no identity are refused, with no row', async () => {
    const supportMe = await postGraphqlRaw<{ me: { user: { id: string } } }>(
      'query { me { user { id } } }',
      { bearerToken: roleTokens().support }
    );
    const supportId = supportMe.body.data!.me.user.id;
    const selfRowsBefore = (await resetRows(supportId)).length;
    const self = await resetSecondFactor(
      supportId,
      { bearerToken: roleTokens().support },
      { invalidatePassword: false }
    );
    expect(self.body.data?.adminResetUserSecondFactor).toBeFalsy();
    // The self-target guard, not the privilege check (D6's case proves the
    // support role holds the privilege).
    expect(errorCodes(self)).toEqual(['FORBIDDEN']);
    expect((await resetRows(supportId)).length).toBe(selfRowsBefore);

    // Created through the API, never signed in: no Kratos identity linked.
    // As the global admin: platform CREATE is not one of Platform Users
    // Admin's privileges.
    const asGlobalAdmin = { bearerToken: roleTokens().globalAdmin };
    const unlinked = await createUser(
      {
        email: `sf.unlinked${Date.now()}@alkem.io`,
        profileData: { displayName: 'second factor unlinked' },
      },
      asGlobalAdmin
    );
    const unlinkedId = unlinked.data?.createUser.id;
    expect(unlinkedId, JSON.stringify(unlinked.error)).toBeDefined();
    try {
      const answer = await resetSecondFactor(
        unlinkedId!,
        { bearerToken: roleTokens().support },
        { invalidatePassword: false }
      );
      expect(answer.body.data?.adminResetUserSecondFactor).toBeFalsy();
      expect(errorCodes(answer)).toEqual(['ENTITY_NOT_FOUND']);
      expect(await resetRows(unlinkedId!)).toEqual([]);
    } finally {
      await deleteUser(unlinkedId!, asGlobalAdmin);
    }
  });

  test('D37 a subscription whose session record is gone is closed with 4401 and delivers nothing', async () => {
    const member = await throwawayUser('dropped');
    const poster = await throwawayUser('dposter');
    const roomId = await roomOf(poster, member);
    const minted = await mintBffSession(member.identityId, member.userId);
    const sub = await subscribeToRoom(minted.cookieHeader, roomId);
    try {
      await expectLive(sub, roomId, poster);
      await deleteBffSession(minted.sessionId);
      await expectClosedOnNextMessage(sub, roomId, poster, 4401);
    } finally {
      sub.dispose();
    }
  });
});
