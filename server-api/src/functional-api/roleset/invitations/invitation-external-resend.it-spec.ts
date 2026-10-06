// Resending the invitation email of an open Space email invitation: same
// privilege as inviting (so an admin of another role set, or no one at all,
// is refused), one mail per allowed resend, a cooldown kept per role set and
// address after that (revoking and re-inviting does not reset it), and nothing
// at all for a consumed or unauthorized call.
// The platform invitation itself is never touched by a resend.
import {
  postGraphqlRaw,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  deleteUser,
  registerVerifiedUser,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  getErrorCode,
  getSingleInvitationResult,
  lookupPlatformInvitation,
} from '../roleset.request.params';
import {
  deleteExternalInvitation,
  inviteForEntryRoleOnRoleSet,
  resendPlatformInvitation,
} from './invitation.request.params';
import {
  drainMailsTo,
  INVITATION_REFUSED_CODE,
  mailsToAfter,
  mailSummary,
  settledMailsTo,
  THROTTLED_CODE,
} from './platform-invitation.helpers';

const uniqueId = UniqueIDGenerator.getID();
const message = 'Hello, feel free to join our community!';

let baseScenario: OrganizationWithSpaceModel;
// A second, unrelated space whose only admin is a different persona: it holds
// the invite privilege on its own role set and none on the first one.
let otherScenario: OrganizationWithSpaceModel;
const otherScenarioConfig: TestScenarioConfig = {
  name: 'invitation-external-resend-other',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SUBSPACE_ADMIN],
      members: [TestUser.SUBSPACE_ADMIN],
    },
  },
};
const scenarioConfig: TestScenarioConfig = {
  name: 'invitation-external-resend',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

// The resend cooldown the stack runs with, as exported to this run (the server
// reads the same variable; five minutes when unset).
const configuredResendWindowMs = (): number => {
  const configured = Number(process.env.PLATFORM_INVITATION_RESEND_COOLDOWN_SECONDS);
  return (Number.isInteger(configured) && configured >= 1 ? configured : 300) * 1000;
};

const createdUserIds: string[] = [];
const createdInvitationIds: string[] = [];

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  otherScenario =
    await TestScenarioFactory.createBaseScenario(otherScenarioConfig);
});

afterAll(async () => {
  for (const id of createdInvitationIds) {
    await deleteExternalInvitation(id).catch(() => undefined);
  }
  for (const id of createdUserIds) {
    await deleteUser(id).catch(() => undefined);
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  await TestScenarioFactory.cleanUpBaseScenario(otherScenario);
});

/** Invites a fresh, unregistered address on the Space and tracks the row. */
const inviteNewAddress = async (label: string) => {
  const email = `${label}-${uniqueId}@example.com`;
  const res = await inviteForEntryRoleOnRoleSet(
    baseScenario.space.community.roleSetId,
    [],
    [email],
    message,
    [RoleName.Member],
    TestUser.GLOBAL_ADMIN
  );
  const platformInvitationId =
    getSingleInvitationResult(res)?.platformInvitation?.id ?? '';
  expect(platformInvitationId.length).toEqual(36);
  createdInvitationIds.push(platformInvitationId);
  // The creation mail is asynchronous; let it land before any step counts mail.
  await drainMailsTo(email);
  return { email, platformInvitationId };
};

describe('Resend a Space email invitation', () => {
  test('US3-AS2/AS3: a Space admin resends once (one mail, record unchanged); an immediate second resend is throttled and sends nothing', async () => {
    const { email, platformInvitationId } = await inviteNewAddress('resend');
    const before = await lookupPlatformInvitation(platformInvitationId);

    // Both resends run back to back inside one mail-counting window: the
    // cooldown may be as short as a few seconds on a stack booted for the
    // resend-window checks, so the second call must not wait on the first
    // one's mail. The first is accepted, the immediate second is refused with
    // the dedicated code, and exactly one mail goes out for the pair.
    let throttledCode: string | undefined;
    let resentAgain: unknown;
    const mails = await mailsToAfter(
      async () => {
        const res = await resendPlatformInvitation(
          platformInvitationId,
          TestUser.SPACE_ADMIN
        );
        expect(res?.error).toBeUndefined();
        expect(res?.data?.resendPlatformInvitation.id).toEqual(
          platformInvitationId
        );
        const again = await resendPlatformInvitation(
          platformInvitationId,
          TestUser.SPACE_ADMIN
        );
        throttledCode = getErrorCode(again);
        resentAgain = again?.data?.resendPlatformInvitation;
      },
      email,
      1
    );
    expect(throttledCode).toEqual(THROTTLED_CODE);
    expect(resentAgain).toBeUndefined();
    expect(mails, mailSummary(mails)).toHaveLength(1);
    expect(mails[0].subject).toEqual(
      `Invitation to join ${baseScenario.space.about.profile.displayName}`
    );

    // The invitation record is exactly what it was.
    const after = await lookupPlatformInvitation(platformInvitationId);
    expect(before?.error).toBeUndefined();
    expect(before?.data?.lookup?.platformInvitation?.id).toEqual(
      platformInvitationId
    );
    expect(after?.error).toBeUndefined();
    expect(after?.data?.lookup?.platformInvitation?.id).toEqual(
      platformInvitationId
    );
    expect(after?.data?.lookup?.platformInvitation).toEqual(
      before?.data?.lookup?.platformInvitation
    );
  });

  test('US3-AS5: a plain Space member cannot resend — authorization error, no mail', async () => {
    const { email, platformInvitationId } = await inviteNewAddress('member');

    const mails = await mailsToAfter(
      async () => {
        const res = await resendPlatformInvitation(
          platformInvitationId,
          TestUser.SPACE_MEMBER
        );
        expect(res?.error?.errors?.[0]?.message).toMatch(
          /Authorization: unable to grant/
        );
        expect(res?.data?.resendPlatformInvitation).toBeUndefined();
      },
      email,
      0
    );
    expect(mails, mailSummary(mails)).toHaveLength(0);
  });

  test('US3-AS3: the cooldown belongs to the address on the role set — revoke and re-invite, then an immediate resend, is still throttled', async ctx => {
    const { email, platformInvitationId } = await inviteNewAddress('reinvite');
    let newInvitationId = '';
    let throttledAt = 0;
    let startedAt = 0;
    let throttledCode: string | undefined;
    let resent: unknown;

    // The whole claim, revoke, re-invite, resend sequence runs back to back
    // inside one mail-counting window: the cooldown may be as short as a few
    // seconds on a stack booted for the resend-window checks, so no step waits
    // on mail in between. Exactly two mails are expected in total — the first
    // resend and the re-invitation's creation mail; a successful second resend
    // would add a third.
    const mails = await mailsToAfter(
      async () => {
        // The first resend claims the window for this address on this role set.
        startedAt = Date.now();
        const first = await resendPlatformInvitation(
          platformInvitationId,
          TestUser.SPACE_ADMIN
        );
        expect(first?.error).toBeUndefined();

        // Revoke the invitation and invite the same address again: a new
        // invitation, and its creation mail goes out at once.
        const revoked = await deleteExternalInvitation(
          platformInvitationId,
          TestUser.SPACE_ADMIN
        );
        expect(revoked?.error).toBeUndefined();
        const reinvited = await inviteForEntryRoleOnRoleSet(
          baseScenario.space.community.roleSetId,
          [],
          [email],
          message,
          [RoleName.Member],
          TestUser.SPACE_ADMIN
        );
        newInvitationId =
          getSingleInvitationResult(reinvited)?.platformInvitation?.id ?? '';
        expect(newInvitationId.length).toEqual(36);
        expect(newInvitationId).not.toEqual(platformInvitationId);
        createdInvitationIds.push(newInvitationId);

        // Resending the new invitation immediately meets the window the first
        // resend claimed.
        const res = await resendPlatformInvitation(
          newInvitationId,
          TestUser.SPACE_ADMIN
        );
        throttledAt = Date.now();
        throttledCode = getErrorCode(res);
        resent = res?.data?.resendPlatformInvitation;
      },
      email,
      2
    );

    // A window shorter than the steps above lapses before the second resend,
    // which then rightly succeeds; that run cannot tell a lost cooldown from an
    // expired one.
    if (
      throttledCode !== THROTTLED_CODE &&
      throttledAt - startedAt >= configuredResendWindowMs()
    ) {
      ctx.skip(
        `the resend cooldown (${configuredResendWindowMs() / 1000} s) lapsed during the revoke and re-invite steps; run with a longer PLATFORM_INVITATION_RESEND_COOLDOWN_SECONDS`
      );
    }

    // Refused with the dedicated code, nothing sent for it.
    expect(throttledCode).toEqual(THROTTLED_CODE);
    expect(resent).toBeUndefined();
    expect(mails, mailSummary(mails)).toHaveLength(2);
  });

  test('US3-AS5: an admin of a different space — invite privilege on another role set only — cannot resend this one: authorization error, no mail', async () => {
    const { email, platformInvitationId } =
      await inviteNewAddress('otheradmin');

    // Sanity: that persona really is an admin elsewhere, able to invite on
    // its own role set.
    const own = await inviteForEntryRoleOnRoleSet(
      otherScenario.space.community.roleSetId,
      [],
      [`own-${uniqueId}@example.com`],
      message,
      [RoleName.Member],
      TestUser.SUBSPACE_ADMIN
    );
    expect(own?.error).toBeUndefined();
    const ownInvitationId =
      getSingleInvitationResult(own)?.platformInvitation?.id ?? '';
    expect(ownInvitationId.length).toEqual(36);
    createdInvitationIds.push(ownInvitationId);

    const mails = await mailsToAfter(
      async () => {
        const res = await resendPlatformInvitation(
          platformInvitationId,
          TestUser.SUBSPACE_ADMIN
        );
        expect(res?.error?.errors?.[0]?.message).toMatch(
          /Authorization: unable to grant/
        );
        expect(res?.data?.resendPlatformInvitation).toBeUndefined();
      },
      email,
      0
    );
    expect(mails, mailSummary(mails)).toHaveLength(0);
  });

  test('US3-AS5: an anonymous caller cannot resend — authorization error, no mail', async () => {
    const { email, platformInvitationId } = await inviteNewAddress('anon');

    const mails = await mailsToAfter(
      async () => {
        const res = await postGraphqlRaw<{
          resendPlatformInvitation: { id: string };
        }>(
          'mutation($id: UUID!) { resendPlatformInvitation(resendData: { ID: $id }) { id } }',
          { variables: { id: platformInvitationId } }
        );
        expect(res.body.errors?.length, res.raw).toBeGreaterThan(0);
        expect(res.raw).toMatch(/Authorization|authenticat|unauthori/i);
        expect(
          res.body.data?.resendPlatformInvitation ?? undefined
        ).toBeUndefined();
        expect(res.raw).not.toContain(THROTTLED_CODE);
      },
      email,
      0
    );
    expect(mails, mailSummary(mails)).toHaveLength(0);
  });

  test('US3-AS4: once the address has registered the invitation is consumed — resend is refused (not throttled) and sends nothing', async () => {
    const { email, platformInvitationId } = await inviteNewAddress('consumed');
    const userId = await registerVerifiedUser(
      email,
      `fn${uniqueId}`,
      `ln${uniqueId}`
    );
    createdUserIds.push(userId);
    // Registration itself may still be delivering mail for this address (the
    // welcome message, the converted invitation). Wait until that has stopped
    // arriving before the resend's own quiet period starts, so only the resend
    // can add mail.
    await settledMailsTo(email);

    const mails = await mailsToAfter(
      async () => {
        const res = await resendPlatformInvitation(
          platformInvitationId,
          TestUser.SPACE_ADMIN
        );
        expect(res?.error).toBeDefined();
        expect(getErrorCode(res)).not.toEqual(THROTTLED_CODE);
        // The typed "consumed" refusal, not just any error (an unknown id or
        // an authorization refusal must not satisfy this case).
        expect(getErrorCode(res)).toEqual(INVITATION_REFUSED_CODE);
        expect(res?.error?.errors?.[0]?.message).toMatch(/already consumed/i);
        expect(res?.data?.resendPlatformInvitation).toBeUndefined();
      },
      email,
      0
    );
    expect(mails, mailSummary(mails)).toHaveLength(0);
  });
});
