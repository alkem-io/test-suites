// spec: client-web/src/functional-e2e/space-join-invite/space-join-invite-test-plan.md
// W2 journey 2 (docs/qa/server-rebuild/plan.md § W2): invite an existing user
// to a Space → accept in the UI → open it.

import { test, expect } from '@playwright/test';
import {
  CommunityMembershipPolicy,
  readRoleSetInvitations,
  SpacePrivacyMode,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import {
  aboutDialog,
  baseUrl,
  calloutHeading,
  contentFeed,
  expectMutationAnswered,
  openPersonaPage,
  spaceTitle,
  teardownScenario,
  userIdsInRole,
  type PersonaPage,
} from '../helpers/space-access.helper';
import { applyFlowSettled, expectNoApplyControl } from '../applications/applications.helpers';
import { deleteFixtureUser, registerFixtureUser } from '../contributors-callout/cards-fixture';
import {
  decodeMailBody,
  MAIL_DELIVERY_TIMEOUT_MS,
  mailsTo,
  settledMailsTo,
} from '../organization-email-invitations/organization-email-invitations.helpers';

/**
 * A PRIVATE Space whose membership policy is INVITATIONS — no Join, no Apply —
 * so an invitation is the only way in, and the member-only callout proves the
 * acceptance landed.
 *
 *   admin     `space.admin`               — invites from Community settings
 *   invitee   disposable, registered here — receives, accepts, opens the Space
 *   bystander `non.space`                 — not invited (negative control)
 *
 * The invitee is a fresh identity so its mailbox holds only this run's mail
 * and its notification settings are the platform defaults. Mail is read by
 * recipient and by this Space's run-unique subject; the inbox is never pruned.
 */
const uid = UniqueIDGenerator.getID();
const scenarioName = `w2-inv-${uid}`;
const inviteeName = `W2 Invitee ${uid}`;

let scenario: OrganizationWithSpaceModel | undefined;
let invitee: { id: string; email: string } | undefined;
let admin: PersonaPage | undefined;
let inviteePage: PersonaPage | undefined;
let bystander: PersonaPage | undefined;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  scenario = await TestScenarioFactory.createBaseScenario({
    name: scenarioName,
    space: {
      collaboration: { addPostCallout: true },
      community: { admins: [TestUser.SPACE_ADMIN], members: [TestUser.SPACE_ADMIN] },
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },
        membership: { policy: CommunityMembershipPolicy.Invitations },
      },
    },
  });
  invitee = await registerFixtureUser(inviteeName);
  admin = await openPersonaPage(browser, TestUserManager.users.spaceAdmin.email);
  bystander = await openPersonaPage(browser, TestUserManager.users.nonSpaceMember.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await admin?.close();
  await inviteePage?.close();
  await bystander?.close();
  try {
    await teardownScenario(scenario);
  } finally {
    scenario = undefined;
    if (invitee) await deleteFixtureUser(invitee.id);
    invitee = undefined;
  }
});

const space = () => scenario!.space;
const spaceName = () => space().about.profile.displayName;
const calloutName = () => space().collaboration.calloutPostDisplayName;
/** The notifications template's subject for a Space invitation. */
const invitationSubject = () => `Invitation to join ${spaceName()}`;
const invitationsDialogUrl = () => `${baseUrl}/home?dialog=invitations`;
/** This Space's invitation mails to `address`, once the address's mail has stopped changing. */
const settledInvitationMails = async (address: string) =>
  (await settledMailsTo(address)).filter(m => m.subject === invitationSubject());

test.describe('W2 journey 2 — invite an existing user, accept in the UI, open the Space', () => {
  test('I2-1 the admin invites the user by name from Community settings; the pending list and the server both hold the invitation', async () => {
    const page = admin!.page;
    await page.goto(`${baseUrl}/${space().nameId}/settings/community`);
    await page.getByRole('button', { name: 'Invite', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: `Invite others to join "${spaceName()}"` });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Search for users by name or email' }).fill(inviteeName);
    await dialog.getByRole('button', { name: inviteeName, exact: true }).click();

    const sent = expectMutationAnswered(page, 'inviteForEntryRoleOnRoleSet');
    await dialog.getByRole('button', { name: 'Send', exact: true }).click();
    await sent();
    const result = dialog.getByRole('listitem').filter({ hasText: inviteeName });
    await expect(result).toContainText('Invitation sent');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toBeHidden();

    // The admin's pending list — a row for the invitee, in state Invited.
    const row = page.getByRole('row').filter({ hasText: inviteeName });
    await expect(row).toContainText('Invited');
    await expect(row.getByRole('button', { name: 'Revoke invitation' })).toBeVisible();

    const { lookup } = must(await readRoleSetInvitations(space().community.roleSetId), 'readRoleSetInvitations');
    const invitations = lookup.roleSet?.invitations ?? [];
    expect(invitations.filter(i => i.actor.id === invitee!.id).map(i => i.state)).toEqual(['invited']);
    expect(invitations.some(i => i.actor.id === TestUserManager.users.nonSpaceMember.id)).toBe(false);
  });

  test('I2-2 exactly one invitation mail reaches the invitee, pointing at the invitations dialog; the bystander gets none', async () => {
    // The invitee's box also holds its sign-up mails, so wait for THIS
    // subject to arrive, then for the box to settle, then count.
    await expect
      .poll(
        async () => (await mailsTo(invitee!.email)).filter(m => m.subject === invitationSubject()).length,
        { timeout: MAIL_DELIVERY_TIMEOUT_MS, message: `"${invitationSubject()}" never reached the invitee` }
      )
      .toBeGreaterThan(0);
    const mails = await settledInvitationMails(invitee!.email);
    expect(mails, `mails "${invitationSubject()}" to the invitee`).toHaveLength(1);
    expect(decodeMailBody(mails[0].body)).toContain(`href="${invitationsDialogUrl()}"`);

    // Negative, after the positive above has arrived: nothing with this
    // Space's subject reached the persona who was not invited.
    expect(await settledInvitationMails(TestUserManager.users.nonSpaceMember.email)).toHaveLength(0);
  });

  test('I2-3 the invitee sees the invitation, accepts it, becomes a MEMBER and opens the Space with its member-only callout', async ({ browser }) => {
    inviteePage = await openPersonaPage(browser, invitee!.email);
    const page = inviteePage.page;

    // Before accepting, the Space is closed to the invitee: About only, with
    // the pending invitation as its action.
    await page.goto(`${baseUrl}/${space().nameId}`);
    const about = aboutDialog(page, spaceName());
    await expect(about.getByRole('button', { name: 'Accept invitation', exact: true })).toBeVisible();
    await expect(contentFeed(page)).toHaveCount(0);

    await page.goto(invitationsDialogUrl());
    const list = page.getByRole('dialog', { name: 'Pending Memberships' });
    // The card's name is avatar initial + Space + inviter + message; the Space name is run-unique.
    const card = list.getByRole('button', { name: new RegExp(spaceName()) });
    await expect(card).toBeVisible();
    await card.click();

    const detail = page.getByRole('dialog', { name: `My Pending Membership: ${spaceName()}` });
    await expect(detail).toContainText(`space admin invited you to ${spaceName()}`);
    const accepted = expectMutationAnswered(page, 'eventOnInvitation');
    await detail.getByRole('button', { name: `Accept invitation to ${spaceName()}`, exact: true }).click();
    await accepted();

    await expect.poll(() => userIdsInRole(space().community.roleSetId)).toContain(invitee!.id);
    const { lookup } = must(await readRoleSetInvitations(space().community.roleSetId), 'readRoleSetInvitations');
    expect((lookup.roleSet?.invitations ?? []).find(i => i.actor.id === invitee!.id)?.state).toBe('accepted');

    await page.goto(`${baseUrl}/${space().nameId}`);
    await expect(spaceTitle(page, spaceName())).toBeVisible();
    await expect(calloutHeading(page, calloutName())).toBeVisible();
  });

  test('I2-4 the persona who was not invited is not a member and cannot join or read the Space', async () => {
    // Positive control: the accepted invitee sees the callout on a fresh load.
    await inviteePage!.page.reload();
    await expect(calloutHeading(inviteePage!.page, calloutName())).toBeVisible();

    const page = bystander!.page;
    const flow = applyFlowSettled(page);
    try {
      await page.goto(`${baseUrl}/${space().nameId}`);
      const about = aboutDialog(page, spaceName());
      await expect(about.getByRole('heading', { name: spaceName(), level: 2 })).toBeVisible();
      // Read only once the membership action has resolved for this viewer.
      await flow.settled();
      // Invitation-only: none of the membership actions is offered to this viewer.
      await expectNoApplyControl(about);
    } finally {
      flow.dispose();
    }
    await expect(contentFeed(page)).toHaveCount(0);
    expect(await userIdsInRole(space().community.roleSetId)).not.toContain(
      TestUserManager.users.nonSpaceMember.id
    );
  });
});
