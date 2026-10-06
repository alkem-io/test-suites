// The email an unregistered address receives when it is invited to associate
// with an organization, end to end through the notifications service and
// MailSlurper. Follows `associates.it-spec.ts` for the scenario idioms.
//
// The recipient has no account, so the invitation is email-only: no in-app row
// and no push exist for anyone. The Space external-invitation email runs on its
// own template and keeps its own subject — asserted here in the same run so a
// change to one cannot silently leak into the other.
import {
  delay,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import {
  deleteExternalInvitation,
  inviteForEntryRoleOnRoleSet,
  resendPlatformInvitation,
} from '@functional-api/roleset/invitations/invitation.request.params';
import {
  mailsToAfter,
  mailSummary,
} from '@functional-api/roleset/invitations/platform-invitation.helpers';
import { getSingleInvitationResult } from '@functional-api/roleset/roleset.request.params';

const uniqueId = UniqueIDGenerator.getID();
const secretPhrase = `secret-phrase-${uniqueId}`;
const welcomeMessage = `<b>markup</b> ${secretPhrase}`;

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'org-email-invite-mail',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN],
    },
  },
};

const platformInvitationIds: string[] = [];

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  for (const id of platformInvitationIds) {
    await deleteExternalInvitation(id).catch(() => undefined);
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

/** Undoes quoted-printable transfer encoding so markup and links can be
 * matched as written, whichever way the transport delivered the body. */
const decodeBody = (body: string | undefined): string =>
  (body ?? '')
    .replace(/=\r?\n/g, '')
    .replace(/=3D/gi, '=')
    .replace(/=20/g, ' ');

/** The in-app notification total of a persona — every type. */
const inAppTotal = async (userRole: TestUser): Promise<number> => {
  const response = await graphqlRequestAuth(
    {
      operationName: 'MeInAppNotificationsTotal',
      query:
        'query MeInAppNotificationsTotal { me { notifications { total } } }',
    },
    userRole
  );
  expect(
    response.body?.errors,
    JSON.stringify(response.body?.errors)
  ).toBeUndefined();
  return response.body?.data?.me?.notifications?.total as number;
};

/** How long the in-app fan-out of one event is given to show up. The email of
 * the same event has already landed when this runs; the in-app leg travels a
 * separate queue, so the negative holds its baseline for one more period. */
const IN_APP_SETTLE_MS = 3_000;
const IN_APP_POLL_MS = 500;

/** Email-only means no in-app row for anyone: re-reads both admins' totals
 * throughout the settle period and fails at the first read that moves — a
 * bounded poll in place of a sleep, so a late row cannot slip past a single
 * read and a stray one surfaces as soon as it lands. */
const expectNoInAppFanOut = async (baseline: {
  admin: number;
  platformAdmin: number;
}): Promise<void> => {
  const until = Date.now() + IN_APP_SETTLE_MS;
  for (;;) {
    expect(await inAppTotal(TestUser.ORGANIZATION_ADMIN)).toEqual(
      baseline.admin
    );
    expect(await inAppTotal(TestUser.GLOBAL_ADMIN)).toEqual(
      baseline.platformAdmin
    );
    if (Date.now() >= until) return;
    await delay(IN_APP_POLL_MS);
  }
};

describe('Organization email invitation — the unregistered invitee is emailed (US2-AS1, US2-AS7, US3-AS1)', () => {
  test('one email on the organization template: subject names the organization only, body names the inviter, the offered role, the escaped message and the invitations link; no in-app row; resend sends exactly one more', async () => {
    const organizationName = baseScenario.organization.profile.displayName;
    const inviterName = TestUserManager.users.organizationAdmin.displayName;
    const email = `ext-${uniqueId}@example.com`;
    const expectedSubject = `You are invited to join ${organizationName} on Alkemio`;

    const adminTotalBefore = await inAppTotal(TestUser.ORGANIZATION_ADMIN);
    const platformAdminTotalBefore = await inAppTotal(TestUser.GLOBAL_ADMIN);

    let platformInvitationId = '';
    const mails = await mailsToAfter(
      async () => {
        const res = await inviteForEntryRoleOnRoleSet(
          baseScenario.organization.roleSetId,
          [],
          [email],
          welcomeMessage,
          [RoleName.Owner],
          TestUser.ORGANIZATION_ADMIN
        );
        expect(res?.error).toBeUndefined();
        platformInvitationId =
          getSingleInvitationResult(res)?.platformInvitation?.id ?? '';
        expect(platformInvitationId).toHaveLength(36);
        platformInvitationIds.push(platformInvitationId);
      },
      email,
      1
    );

    // Exactly one mail to the address, on the organization template.
    expect(mails, mailSummary(mails)).toHaveLength(1);
    const mail = mails[0];
    expect(mail.subject).toEqual(expectedSubject);
    // The message and the inviter are body-only — never in the subject line.
    expect(mail.subject).not.toContain(secretPhrase);
    expect(mail.subject).not.toContain(inviterName);

    const body = decodeBody(mail.body);
    expect(body).toContain('Associate + Owner');
    expect(body).toContain(inviterName);
    expect(body).toContain(organizationName);
    expect(body).toContain(secretPhrase);
    // Markup in the message is shown, never interpreted.
    expect(body).toContain('&lt;b&gt;markup&lt;/b&gt;');
    expect(body).not.toContain('<b>markup</b>');
    // No account, so no first name to greet.
    expect(body).toContain('Hello,');
    // The call to action is the platform's invitations entry point.
    expect(body).toMatch(/href="[^"]*\/home\?dialog=invitations"/);

    // The Space external-invitation email was not used for it.
    expect(
      mails.filter(m => /^Invitation to join /.test(m.subject ?? ''))
    ).toHaveLength(0);

    // Email-only: nobody gets an in-app notification for it. A negative that
    // has to hold through the fan-out, not just at one read.
    await expectNoInAppFanOut({
      admin: adminTotalBefore,
      platformAdmin: platformAdminTotalBefore,
    });

    // Resend: exactly one more mail, same template, same subject.
    const resent = await mailsToAfter(
      async () => {
        const res = await resendPlatformInvitation(
          platformInvitationId,
          TestUser.ORGANIZATION_ADMIN
        );
        expect(res?.error).toBeUndefined();
      },
      email,
      1
    );
    expect(resent, mailSummary(resent)).toHaveLength(1);
    expect(resent[0].subject).toEqual(expectedSubject);
    expect(decodeBody(resent[0].body)).toContain('Associate + Owner');

    await expectNoInAppFanOut({
      admin: adminTotalBefore,
      platformAdmin: platformAdminTotalBefore,
    });
  });

  test('the Space external invitation in the same run still uses the Space template and subject', async () => {
    const spaceName = baseScenario.space.about.profile.displayName;
    const email = `ext-space-${uniqueId}@example.com`;

    const mails = await mailsToAfter(
      async () => {
        const res = await inviteForEntryRoleOnRoleSet(
          baseScenario.space.community.roleSetId,
          [],
          [email],
          'Hello, feel free to join our community!',
          [RoleName.Member],
          TestUser.GLOBAL_ADMIN
        );
        expect(res?.error).toBeUndefined();
        const id = getSingleInvitationResult(res)?.platformInvitation?.id ?? '';
        expect(id).toHaveLength(36);
        platformInvitationIds.push(id);
      },
      email,
      1
    );
    expect(mails, mailSummary(mails)).toHaveLength(1);
    expect(mails[0].subject).toEqual(`Invitation to join ${spaceName}`);
    expect(mails[0].subject).not.toContain('You are invited to join');
  });
});
