import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { getGraphqlClient } from '@alkemio/tests-lib';
import type { PlatformRole } from '../capabilities.data';
import { classify, describeOutcome } from '../_support/outcome';
import { rawRead } from '../_support/raw-request';
import {
  accessOf,
  assignRole,
  orThrow,
  removeRole,
  revokeAllRoles,
} from '../_support/role-set';
import type { Access } from '../_support/role-set';
import {
  createSubject,
  deleteSubjectOrganization,
  deleteSubjects,
} from '../_support/subjects';
import type { Subject } from '../_support/subjects';
import { bearer } from '../_support/types';
import type { RunContext } from '../_support/types';

/**
 * The three Feature roles whose capability is not an administrative surface,
 * so the role × capability grid shows them with no positive at all. What they
 * confer is observed here, AS the holder: a license entitlement on the
 * holder's own account, or one privilege on the platform policy.
 */
const TRIAL_ENTITLEMENT = 'ACCOUNT_LICENSE_PLUS';

let ctx: RunContext;
let usersAdmin: string;
let subject: Subject;
let baseline: Access;

/** The license subscriptions of the caller's OWN account. */
const entitlementsOf = async (token: string): Promise<string[]> => {
  const { me } = await rawRead<{
    me: { user: { account: { subscriptions: { name: string }[] } } };
  }>(token, 'query { me { user { account { subscriptions { name } } } } }');
  return me.user.account.subscriptions.map(s => s.name);
};

beforeAll(async () => {
  ctx = inject('platformRoles');
  usersAdmin = ctx.tokens.PLATFORM_USERS_ADMIN;
  subject = await createSubject('feature');
  baseline = await accessOf(subject.token);
}, 120_000);

afterAll(async () => {
  await revokeAllRoles(ctx.bootstrapToken, subject);
  await deleteSubjects([subject]);
}, 120_000);

const grantedThenRevoked = async (
  role: PlatformRole,
  whileHeld: () => Promise<void>
): Promise<void> => {
  try {
    const granted = await assignRole(usersAdmin, role, subject.id);
    expect(granted.kind, describeOutcome(granted)).toBe('ok');
    await whileHeld();
  } finally {
    await orThrow('cleanup', removeRole(usersAdmin, role, subject.id));
  }
};

describe('F1.beta-tester-entitlement', () => {
  test('positive: the holder’s account reports the trial entitlement after the grant, not after the revoke', async () => {
    expect(await entitlementsOf(subject.token)).not.toContain(
      TRIAL_ENTITLEMENT
    );

    await grantedThenRevoked('FEATURE_BETA_TESTER', async () => {
      expect(await entitlementsOf(subject.token)).toContain(TRIAL_ENTITLEMENT);
    });

    expect(await entitlementsOf(subject.token)).not.toContain(
      TRIAL_ENTITLEMENT
    );
  });

  test('negative: the holder cannot create an organization', async () => {
    await grantedThenRevoked('FEATURE_BETA_TESTER', async () => {
      const outcome = await classify(['createOrganization'], () =>
        getGraphqlClient().PlatformRolesCreateOrganization(
          {
            organizationData: {
              nameID: `pr-f1-${ctx.runId}`,
              profileData: { displayName: `platform-roles f1 ${ctx.runId}` },
            },
          },
          bearer(subject.token)
        )
      );
      if (outcome.kind === 'ok') {
        // Wrongly allowed: do not leave the organization behind.
        await deleteSubjectOrganization(
          ctx.tokens.PLATFORM_SUPPORT,
          (outcome.data as { createOrganization: { id: string } })
            .createOrganization.id
        );
      }
      expect(outcome.kind, describeOutcome(outcome)).toBe('denied');
    });
  });
});

describe('F2.virtual-assistant-access', () => {
  const PRIVILEGE = 'ACCESS_VIRTUAL_ASSISTANT';

  test('positive: the holder has ACCESS_VIRTUAL_ASSISTANT on the platform policy', async () => {
    await grantedThenRevoked('FEATURE_VIRTUAL_ASSISTANT', async () => {
      expect((await accessOf(subject.token)).platform).toContain(PRIVILEGE);
    });
    // The single-role fixture holds it too — the same read the client makes.
    expect(
      (await accessOf(ctx.tokens.FEATURE_VIRTUAL_ASSISTANT)).platform
    ).toContain(PRIVILEGE);
  });

  test('negative: a registered user without the role does not', async () => {
    const access = await accessOf(subject.token);
    expect(access.myRoles).toEqual(['REGISTERED']);
    expect(access.platform).not.toContain(PRIVILEGE);
  });
});

describe('F3.vc-campaign-entitlement', () => {
  test('positive: the holder’s account reports the trial entitlement and myRoles lists the role', async () => {
    await grantedThenRevoked('FEATURE_VC_CAMPAIGN', async () => {
      expect(await entitlementsOf(subject.token)).toContain(TRIAL_ENTITLEMENT);
      expect((await accessOf(subject.token)).myRoles).toContain(
        'FEATURE_VC_CAMPAIGN'
      );
    });

    expect(await entitlementsOf(subject.token)).not.toContain(
      TRIAL_ENTITLEMENT
    );
  });

  test('negative: the role adds no privilege on the platform or the role-set policy', async () => {
    await grantedThenRevoked('FEATURE_VC_CAMPAIGN', async () => {
      const held = await accessOf(subject.token);
      expect(held.platform).toEqual(baseline.platform);
      expect(held.roleSet).toEqual(baseline.roleSet);
    });
  });
});
