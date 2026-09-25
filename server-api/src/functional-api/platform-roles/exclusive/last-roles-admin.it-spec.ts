import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { describeOutcome } from '../_support/outcome';
import {
  accessOf,
  assignRole,
  holdersOf,
  orThrow,
  rejectionOf,
  removeRole,
} from '../_support/role-set';
import { createSubject, deleteSubjects } from '../_support/subjects';
import type { Subject } from '../_support/subjects';
import type { RunContext } from '../_support/types';
import { expectRecorded, rejectedGrant } from '../_support/audit-assertions';
import { mcpTest } from '../_support/mcp-client';

/**
 * EXCLUSIVE — run alone, on demand, never in the nightly. To make one account
 * the LAST Platform Roles Admin this spec strips the role from every other
 * holder, the break-glass account and the shared role user included, and gives
 * it back in `afterAll`. While it runs nobody else can assign a Platform role.
 *
 * Who can even attempt the revoke: rule 6 (self) and rule 1 (assigner
 * capability) are evaluated BEFORE rule 5, so the caller must hold the
 * Platform-role assigner privilege WITHOUT being a Roles Admin. At Slice A that
 * is the bootstrap account once stripped — its legacy global-admin credential
 * still carries the privilege. At Slice B no such caller exists and rule 5 is
 * unreachable through the API; if this spec then fails on rule 1, that is why.
 * Should the rule be broken at Slice B, nobody is left to re-grant: recovery is
 * a server restart (the bootstrap re-seed).
 */
const ROLE = 'PLATFORM_ROLES_ADMIN';

let ctx: RunContext;
let last: Subject;
let stripped: string[] = [];

beforeAll(async () => {
  ctx = inject('platformRoles');
  last = await createSubject('lastadmin');
  await orThrow(
    'grant the fixture',
    assignRole(ctx.bootstrapToken, ROLE, last.id)
  );

  const others = (await holdersOf(last.token, ROLE)).filter(
    id => id !== last.id
  );
  for (const id of others) {
    await orThrow(`strip ${id}`, removeRole(last.token, ROLE, id));
    stripped.push(id);
  }
}, 180_000);

afterAll(async () => {
  // The fixture first: it is the one that re-grants everybody else.
  if (!(await accessOf(last.token)).myRoles.includes(ROLE)) {
    await orThrow(
      'RULE 5 IS BROKEN — re-grant the fixture through the legacy credential',
      assignRole(ctx.bootstrapToken, ROLE, last.id)
    );
  }
  const roleUserFirst = [...stripped].sort(
    (a, b) =>
      Number(b === ctx.userIds.PLATFORM_ROLES_ADMIN) -
      Number(a === ctx.userIds.PLATFORM_ROLES_ADMIN)
  );
  const notRestored: string[] = [];
  for (const id of roleUserFirst) {
    const restored = await assignRole(last.token, ROLE, id);
    if (restored.kind !== 'ok') {
      notRestored.push(`${id}: ${describeOutcome(restored)}`);
    }
  }
  if (notRestored.length > 0) {
    // Keep the fixture as a Roles Admin: it may be the only one left.
    throw new Error(
      `last-roles-admin: holders NOT restored — ${notRestored.join(' | ')}. ${last.email} still holds the role; re-grant by hand.`
    );
  }
  stripped = [];
  await orThrow(
    'revoke the fixture',
    removeRole(ctx.bootstrapToken, ROLE, last.id)
  );
  await deleteSubjects(ctx.tokens.PLATFORM_USERS_ADMIN, [last]);
}, 180_000);

describe('R5.last-roles-admin', () => {
  test('negative: revoking the last Roles Admin is refused by rule 5 and the holder stays', async () => {
    expect(await holdersOf(last.token, ROLE)).toEqual([last.id]);

    const refused = await removeRole(ctx.bootstrapToken, ROLE, last.id);

    expect(refused.kind, describeOutcome(refused)).toBe('denied');
    expect(rejectionOf(refused)).toMatchObject({
      ruleId: 'last-roles-admin',
      message: 'Rejected: cannot remove the last platform-roles-admin',
    });
    expect(await holdersOf(last.token, ROLE)).toEqual([last.id]);
  });

  mcpTest('negative: the refusal is recorded against the last holder', () =>
    expectRecorded(
      ctx.tokens.PLATFORM_AUDIT_READER,
      last.id,
      () => removeRole(ctx.bootstrapToken, ROLE, last.id),
      { newest: rejectedGrant('cannot remove the last platform-roles-admin') }
    )
  );
});
