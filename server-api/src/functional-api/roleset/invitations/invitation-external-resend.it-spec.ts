// Resending the invitation email of an open Space email invitation: same
// privilege as inviting, one mail per allowed resend, a per-invitation
// cooldown after that, and nothing at all for a consumed or unauthorized call.
// The platform invitation itself is never touched by a resend.
import {
  delay,
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
  mailsToAfter,
  mailSummary,
  THROTTLED_CODE,
} from './platform-invitation.helpers';

const uniqueId = UniqueIDGenerator.getID();
const message = 'Hello, feel free to join our community!';

let baseScenario: OrganizationWithSpaceModel;
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

const createdUserIds: string[] = [];
const createdInvitationIds: string[] = [];

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  for (const id of createdInvitationIds) {
    await deleteExternalInvitation(id).catch(() => undefined);
  }
  for (const id of createdUserIds) {
    await deleteUser(id).catch(() => undefined);
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

/** Invites a fresh, unregistered address on the Space and tracks the row. */
const inviteNewAddress = async (label: string) => {
  const email = `${label}-${uniqueId}@alkem.io`;
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

    const firstMails = await mailsToAfter(
      async () => {
        const res = await resendPlatformInvitation(
          platformInvitationId,
          TestUser.SPACE_ADMIN
        );
        expect(res?.error).toBeUndefined();
        expect(res?.data?.resendPlatformInvitation.id).toEqual(
          platformInvitationId
        );
      },
      email,
      1
    );
    expect(firstMails, mailSummary(firstMails)).toHaveLength(1);
    expect(firstMails[0].subject).toEqual(
      `Invitation to join ${baseScenario.space.about.profile.displayName}`
    );

    // The invitation record is exactly what it was.
    const after = await lookupPlatformInvitation(platformInvitationId);
    expect(after?.data?.lookup?.platformInvitation).toEqual(
      before?.data?.lookup?.platformInvitation
    );

    // Immediately again: refused with the dedicated code, nothing sent.
    const secondMails = await mailsToAfter(
      async () => {
        const res = await resendPlatformInvitation(
          platformInvitationId,
          TestUser.SPACE_ADMIN
        );
        expect(getErrorCode(res)).toEqual(THROTTLED_CODE);
        expect(res?.data?.resendPlatformInvitation).toBeUndefined();
      },
      email,
      0
    );
    expect(secondMails, mailSummary(secondMails)).toHaveLength(0);
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

  test('US3-AS4: once the address has registered the invitation is consumed — resend is refused (not throttled) and sends nothing', async () => {
    const { email, platformInvitationId } = await inviteNewAddress('consumed');
    const userId = await registerVerifiedUser(
      email,
      `fn${uniqueId}`,
      `ln${uniqueId}`
    );
    createdUserIds.push(userId);
    // Registration itself may still be delivering mail for this address (the
    // welcome message, the converted invitation). Let it land before the
    // resend's own quiet period starts, so only the resend can add mail.
    await delay(6_000);

    const mails = await mailsToAfter(
      async () => {
        const res = await resendPlatformInvitation(
          platformInvitationId,
          TestUser.SPACE_ADMIN
        );
        expect(res?.error).toBeDefined();
        expect(getErrorCode(res)).not.toEqual(THROTTLED_CODE);
        expect(res?.data?.resendPlatformInvitation).toBeUndefined();
      },
      email,
      0
    );
    expect(mails, mailSummary(mails)).toHaveLength(0);
  });
});
