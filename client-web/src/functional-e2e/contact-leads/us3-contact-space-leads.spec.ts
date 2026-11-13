// spec: client-web/src/functional-e2e/contact-leads/contact-leads-test-plan.md
// W2 journey 10 (docs/qa/server-rebuild/plan.md § W2; audit row F3): a member
// uses "Contact Leads" on a Space. Since client-web's CRD sidebar the message
// goes to each lead as a private 1:1 chat (`sendDirectMessageToUsers`), so the
// oracle is each lead's own conversation read-back plus the direct-message
// digest mail; a member who is not a lead gets neither.
//
// The whole walk is `@local-stack`: the chat runs on Matrix, which fails on
// the shared test cluster for environmental reasons, and the digest mail
// waits on the MESSAGING_DIGEST_* windows (same values on the server).

import { test, expect } from '@playwright/test';
import {
  assignRoleToUser,
  delay,
  digestWindow,
  getMailsToSince,
  readUserSettings,
  removeRoleFromUser,
  RoleName,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  updateUserSettings,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import {
  spaceTitle,
  teardownScenario,
  userIdsInRole,
} from '../helpers/space-access.helper';
import {
  contactLeadsButton,
  contactLeadsDialog,
  contactLeadsRecipients,
  conversationsWith,
  deleteDisposableUser,
  directDigestSubject,
  expectMutationAnswered,
  awaitMailSince,
  mailsSince,
  markMailbox,
  openCommunityTab,
  openPersonaPage,
  registerDisposableUser,
  runCleanup,
  uid,
  type DisposableUser,
  type MailboxMark,
  type PersonaPage,
} from './contact-leads.helpers';

/**
 *   sender   disposable — a member; sends from the Space sidebar
 *   leadA/B  disposable — members holding LEAD; the Space's only user leads
 *   member   disposable — a member, NOT a lead (negative control)
 *
 * Direct-message email is off by default (034); leadA, leadB AND member opt in
 * through the lib on their own disposable accounts, so the member's "no mail"
 * would go red if the server messaged it.
 */
const id = uid();
const text = `W2 J10 hello leads ${id}`;
const directEmail = digestWindow('email', 'direct');

let scenario: OrganizationWithSpaceModel | undefined;
let sender: DisposableUser | undefined;
let leadA: DisposableUser | undefined;
let leadB: DisposableUser | undefined;
let member: DisposableUser | undefined;
let senderPage: PersonaPage | undefined;
/** The leads' and the member's mailboxes, marked right before C3-1's send. */
let marks: Record<'leadA' | 'leadB' | 'member', MailboxMark> | undefined;

test.describe.configure({ mode: 'serial' });

test.describe(
  'W2 journey 10 — contact the leads of a Space',
  { tag: '@local-stack' },
  () => {
    test.beforeAll(async ({ browser }) => {
      // The lib's actor map (platform admin read-backs) is per worker.
      await TestUserManager.populateUserModelMap();
      scenario = await TestScenarioFactory.createBaseScenario({
        name: `w2-leads-${id}`,
        space: { collaboration: { addTutorialCallouts: false } },
      });
      expect(scenario.scenarioSetupSucceeded, 'Space scenario set up').toBe(
        true
      );
      sender = await registerDisposableUser(`j10u${id}`);
      leadA = await registerDisposableUser(`j10l${id}`);
      leadB = await registerDisposableUser(`j10n${id}`);
      member = await registerDisposableUser(`j10v${id}`);
      const roleSetId = scenario.space.community.roleSetId;
      for (const user of [sender, leadA, leadB, member]) {
        must(
          await assignRoleToUser(user.id, roleSetId, RoleName.Member),
          `MEMBER ${user.displayName}`
        );
      }
      // The factory makes the creating platform admin a lead, and a Space
      // allows two user leads: free the slot, so the recipients are exactly the
      // two run-owned leads.
      for (const other of (
        await userIdsInRole(roleSetId, RoleName.Lead)
      ).filter(l => l !== leadA!.id && l !== leadB!.id)) {
        must(
          await removeRoleFromUser(other, roleSetId, RoleName.Lead),
          `remove LEAD ${other}`
        );
      }
      for (const lead of [leadA, leadB]) {
        must(
          await assignRoleToUser(lead.id, roleSetId, RoleName.Lead),
          `LEAD ${lead.displayName}`
        );
      }
      expect(
        [...(await userIdsInRole(roleSetId, RoleName.Lead))].sort()
      ).toEqual([leadA.id, leadB.id].sort());
      for (const user of [leadA, leadB, member]) {
        must(
          await updateUserSettings(user.id, {
            notification: {
              user: { conversationMessageDirect: { email: true } },
            },
          }),
          `opt ${user.displayName} into direct-message email`
        );
      }
      senderPage = await openPersonaPage(browser, sender.email);
    });

    test.afterAll(async () => {
      await senderPage?.close();
      await runCleanup([
        ['Space', () => teardownScenario(scenario)],
        ['sender', () => deleteDisposableUser(sender)],
        ['lead A', () => deleteDisposableUser(leadA)],
        ['lead B', () => deleteDisposableUser(leadB)],
        ['member', () => deleteDisposableUser(member)],
      ]);
    });

    const subject = () => directDigestSubject(sender!.displayName);

    test('C3-1 the member sends from "Contact Leads"; each lead holds exactly one 1:1 conversation with the sender carrying the text, the non-lead member none', async () => {
      const page = senderPage!.page;
      const spaceName = scenario!.space.about.profile.displayName;
      await openCommunityTab(page, scenario!.space.nameId);
      await expect(spaceTitle(page, spaceName)).toBeVisible();
      await contactLeadsButton(page).click();

      const dialog = contactLeadsDialog(page);
      await expect(dialog).toBeVisible();
      // Exactly the two leads; their order is the server's, not a contract.
      await expect(contactLeadsRecipients(dialog)).toHaveCount(2);
      expect(
        (await contactLeadsRecipients(dialog).allInnerTexts())
          .map(t => t.trim())
          .sort()
      ).toEqual([leadA!.displayName, leadB!.displayName].sort());
      await dialog
        .getByRole('textbox', { name: 'Message', exact: true })
        .fill(text);
      marks = {
        leadA: await markMailbox(leadA!.email),
        leadB: await markMailbox(leadB!.email),
        member: await markMailbox(member!.email),
      };
      const answered = expectMutationAnswered(page, 'sendDirectMessageToUsers');
      await dialog.getByRole('button', { name: 'Send', exact: true }).click();
      await answered();

      const confirmation = page.getByRole('dialog', {
        name: 'Message sent',
        exact: true,
      });
      await expect(
        confirmation.getByText(
          'Your message has been sent as a private chat.',
          { exact: true }
        )
      ).toBeVisible();
      await expect(
        confirmation.getByText('Not reached', { exact: true })
      ).toHaveCount(0);

      for (const lead of [leadA!, leadB!]) {
        const conversations = await conversationsWith(lead.email, sender!.id);
        expect(
          conversations,
          `${lead.displayName}'s conversations with the sender`
        ).toHaveLength(1);
        expect(
          [...conversations[0].memberIds].sort(),
          'a 1:1, not a group'
        ).toEqual([lead.id, sender!.id].sort());
        expect(conversations[0].messagesCount).toBe(1);
        expect(conversations[0].lastMessage).toBe(text);
      }
      expect(
        await conversationsWith(member!.email, sender!.id),
        'the non-lead member'
      ).toHaveLength(0);
    });

    test('C3-2 each lead gets exactly one direct-message digest mail naming the sender; the non-lead member gets none', async () => {
      test.setTimeout(directEmail.testTimeoutMs + directEmail.maxDelayGraceMs);
      for (const user of [leadA!, leadB!, member!]) {
        // Opt-in held: the member's negative is falsifiable.
        expect(
          must(
            await readUserSettings(user.id, TestUser.GLOBAL_ADMIN),
            'readUserSettings'
          ).user.settings.notification.user.conversationMessageDirect.email,
          `${user.displayName} direct-message email`
        ).toBe(true);
      }
      const m = marks!;
      await awaitMailSince(
        m.leadA,
        subject(),
        'lead A',
        directEmail.quietGraceMs
      );
      await awaitMailSince(
        m.leadB,
        subject(),
        'lead B',
        directEmail.quietGraceMs
      );
      // eslint-disable-next-line no-restricted-syntax -- negative settle window at the email:direct MAX-DELAY bound (digestWindow constant)
      await delay(directEmail.maxDelayGraceMs);
      expect(
        await mailsSince(m.leadA, subject()),
        'digests to lead A'
      ).toHaveLength(1);
      expect(
        await mailsSince(m.leadB, subject()),
        'digests to lead B'
      ).toHaveLength(1);
      expect(
        (await getMailsToSince(m.member)).filter(mail =>
          (mail.subject ?? '').startsWith(sender!.displayName)
        ),
        'mail about the sender to the non-lead member'
      ).toHaveLength(0);
    });
  }
);
