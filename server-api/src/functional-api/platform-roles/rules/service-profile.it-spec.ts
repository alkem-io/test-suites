import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { PLATFORM_ROLES } from '../capabilities.data';
import { describeOutcome } from '../_support/outcome';
import {
  assignRole,
  orThrow,
  rejectionOf,
  removeRole,
  revokeAllRoles,
  setServiceProfile,
} from '../_support/role-set';
import { createSubject, deleteSubjects } from '../_support/subjects';
import type { Subject } from '../_support/subjects';
import type { RunContext } from '../_support/types';
import { expectRecorded } from '../_support/audit-assertions';
import { mcpTest } from '../_support/mcp-client';

/**
 * The service-profile marker. The API exposes it as an INPUT only — no field
 * reads it back — so the marker is observed through the one thing it controls:
 * Platform Spaces Reader is grantable to a marked account and refused, by
 * rule 3, to an unmarked one.
 */
const SPACES_READER = 'PLATFORM_SPACES_READER';
const RULE_3 =
  'Rejected: platform-spaces-reader may only be granted to a service account';
const OTHER_ROLES = PLATFORM_ROLES.filter(r => r !== 'PLATFORM_ROLES_ADMIN');

let ctx: RunContext;
let rolesAdmin: string;
/** Marked in `beforeAll`; every negative tries to CLEAR it. */
let marked: Subject;
let fresh: Subject;

/** Grants and takes back Spaces Reader; the grant's outcome IS the marker. */
const spacesReaderGrant = async (target: Subject) => {
  const outcome = await assignRole(rolesAdmin, SPACES_READER, target.id);
  if (outcome.kind === 'ok') {
    await orThrow('cleanup', removeRole(rolesAdmin, SPACES_READER, target.id));
  }
  return outcome;
};

beforeAll(async () => {
  ctx = inject('platformRoles');
  rolesAdmin = ctx.tokens.PLATFORM_ROLES_ADMIN;
  marked = await createSubject('marked');
  fresh = await createSubject('fresh');
  await orThrow(
    'mark the target',
    setServiceProfile(rolesAdmin, marked.id, true)
  );
}, 120_000);

afterAll(async () => {
  for (const subject of [marked, fresh]) {
    await revokeAllRoles(ctx.bootstrapToken, subject);
  }
  await deleteSubjects([marked, fresh]);
}, 120_000);

describe('S1.marker-owned-by-roles-admin', () => {
  test('positive: Roles Admin sets then clears the marker; a cleared account can no longer be granted Spaces Reader', async () => {
    const unmarked = await spacesReaderGrant(fresh);
    expect(rejectionOf(unmarked).message).toBe(RULE_3);

    const set = await setServiceProfile(rolesAdmin, fresh.id, true);
    expect(set.kind, describeOutcome(set)).toBe('ok');
    const whileMarked = await spacesReaderGrant(fresh);
    expect(whileMarked.kind, describeOutcome(whileMarked)).toBe('ok');

    const cleared = await setServiceProfile(rolesAdmin, fresh.id, false);
    expect(cleared.kind, describeOutcome(cleared)).toBe('ok');
    const afterClear = await spacesReaderGrant(fresh);
    expect(afterClear.kind, describeOutcome(afterClear)).toBe('denied');
    expect(rejectionOf(afterClear)).toMatchObject({
      ruleId: 'spaces-reader-service-account',
      message: RULE_3,
    });
  });

  mcpTest(
    'positive: each marker change is recorded against the target',
    async () => {
      const auditReader = ctx.tokens.PLATFORM_AUDIT_READER;
      const changed = (previous: boolean, next: boolean) => ({
        category: 'platform_role_assignment',
        outcome: 'service_profile_changed',
        details: { previousServiceProfile: previous, newServiceProfile: next },
      });
      await expectRecorded(
        auditReader,
        fresh.id,
        () => setServiceProfile(rolesAdmin, fresh.id, true),
        { newest: changed(false, true) }
      );
      await expectRecorded(
        auditReader,
        fresh.id,
        () => setServiceProfile(rolesAdmin, fresh.id, false),
        { newest: changed(true, false) }
      );
    }
  );

  test.each(OTHER_ROLES)(
    'negative: %s is denied at updateUser and the marker stays set',
    async role => {
      const outcome = await setServiceProfile(
        ctx.tokens[role],
        marked.id,
        false
      );
      const stillMarked = await spacesReaderGrant(marked);
      if (stillMarked.kind !== 'ok') {
        // The marker moved: put it back so the next role starts from "set".
        await orThrow(
          're-mark',
          setServiceProfile(rolesAdmin, marked.id, true)
        );
      }

      expect(outcome.kind, describeOutcome(outcome)).toBe('denied');
      expect(stillMarked.kind, describeOutcome(stillMarked)).toBe('ok');
    }
  );
});
