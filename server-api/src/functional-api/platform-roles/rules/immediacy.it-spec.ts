import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import {
  createDisposableUser,
  deleteDisposableUser,
} from '../_support/disposable-user';
import type { DisposableUser } from '../_support/disposable-user';
import { describeOutcome } from '../_support/outcome';
import { rawOutcome } from '../_support/raw-outcome';
import { rawRead, rawRequest } from '../_support/raw-request';

/**
 * The server caches each actor's credentials for 60 seconds. A grant or revoke
 * must flush that cache, or the change only lands a minute later.
 *
 * So every assertion here is made on a WARM cache: the subject's previous
 * request was answered with the OLD state, nothing flushed its cache since, and
 * the very next request must already show the NEW state. The probe is a gated
 * READ — it changes nothing, so it cannot flush the cache it is probing.
 * No waits anywhere: a wait would let the cache expire and hide the defect.
 */
const ROLE = 'PLATFORM_AUDIT_READER';
const GATE = ['platformAdmin', 'userEmailChangeAuditEntries'] as const;
const PROBE =
  'query($id: UUID!) { platformAdmin { userEmailChangeAuditEntries(userID: $id) { total } } }';
const GRANT = `mutation($id: UUID!) { assignPlatformRoleToUser(roleData: { actorID: $id, role: ${ROLE} }) { id } }`;
const REVOKE = `mutation($id: UUID!) { removePlatformRoleFromUser(roleData: { actorID: $id, role: ${ROLE} }) { id } }`;
const HOLDERS = `query { platform { roleSet { usersInRole(role: ${ROLE}) { id } } } }`;

describe('I1.grant-revoke-next-request', () => {
  const ctx = inject('platformRoles');
  const rolesAdmin = ctx.tokens.PLATFORM_ROLES_ADMIN;
  let subject: DisposableUser;

  const probe = async (): Promise<string> =>
    describeOutcome(
      await rawOutcome(GATE, subject.token, PROBE, { id: subject.id })
    );
  const grant = () => rawRead(rolesAdmin, GRANT, { id: subject.id });
  const revoke = () => rawRead(rolesAdmin, REVOKE, { id: subject.id });

  beforeAll(async () => {
    subject = await createDisposableUser(ctx, 'i1');
  });

  afterAll(async () => {
    const { platform } = await rawRead<{
      platform: { roleSet: { usersInRole: { id: string }[] } };
    }>(rolesAdmin, HOLDERS);
    if (platform.roleSet.usersInRole.some(u => u.id === subject.id)) {
      await rawRequest(rolesAdmin, REVOKE, { id: subject.id });
    }
    await deleteDisposableUser(ctx, subject);
  });

  test('positive: a grant works on the very next request, on a cache warm with "no role"', async () => {
    expect(await probe()).toMatch(/^denied \(FORBIDDEN_POLICY/);
    await grant();
    try {
      expect(await probe()).toBe('ok');
    } finally {
      await revoke();
    }
  });

  test('negative: a revoke denies on the very next request, on a cache warm with the role — 3 times over', async () => {
    const seen: string[] = [];
    for (let round = 0; round < 3; round++) {
      await grant();
      seen.push(await probe());
      await revoke();
      seen.push(await probe());
    }
    expect(seen.map(s => s.replace(/ \(.*$/, ''))).toEqual([
      'ok',
      'denied',
      'ok',
      'denied',
      'ok',
      'denied',
    ]);
  });
});
