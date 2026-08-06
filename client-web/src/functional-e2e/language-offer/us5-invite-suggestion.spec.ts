// Feature 029-detect-signup-language — US5: an inviter suggests Dutch for the
// person they invite. This spec covers the COMPOSE-TIME half that is drivable on
// this stack: as an admin, open the space-community invite dialog and exercise
// the "Suggested language for invitee" control (FR-014/FR-014a/FR-015).
//
//   US5-AS1: mark the invitee as expecting Dutch -> invitation records it.
//   US5-AS6: send without touching the language control -> nothing recorded.
//
// Both walks assert the SERVER outcome (the persisted PlatformInvitation read
// back over GraphQL), not just the dialog's own success feedback.
//
// The INVITEE-facing half (AS2/AS3/AS4: an emailed invitee signs up and lands in
// Dutch) requires completing the Kratos email-invite -> signup flow, which does
// not drive reliably headless on this stack (see us1-signup-offer.spec.ts) and is
// recorded as infeasible-headless — it is better covered at the API layer against
// alkem-io/server (registration seeding), see language-offer-test-plan.md.
//
// spec source: specs/029-detect-signup-language/repos.yaml -> tracks (US5)

import { test, expect, Page } from '@playwright/test';
import { BASE_URL, gql, languageConfig } from './helpers';
import { ADMIN_STATE } from './authState';

// Endonyms for the eligible language codes, as the Select renders them
// (crd-common `languages.<code>`).
const LANGUAGE_ENDONYMS: Record<string, string> = {
  bg: 'Български',
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  nl: 'Nederlands',
  pt: 'Português (Brasil)',
  ua: 'Українська',
};

/** crd-community `inviteMembers.dialog.suggestedLanguagePlaceholder` (also the reset option). */
const NO_PREFERENCE_LABEL = 'No preference';
/** crd-community `inviteMembers.results.sent` — the exact success outcome label. */
const SENT_LABEL = 'Invitation sent';

// A space the admin can administer + invite into. Resolved at run time from the
// server so the walk is not pinned to a seeded nameID that exists on only one
// environment; override with LANGUAGE_OFFER_SPACE_NAMEID to target a specific space.
let spaceNameId = process.env.LANGUAGE_OFFER_SPACE_NAMEID ?? '';
let spaceRoleSetId = '';

/** Invitations created by this file, removed in afterAll so runs stay idempotent. */
const createdInvitationIds: string[] = [];

// The invite dialog's suggested-language control (InviteMembersDialog.tsx),
// labelled by crd-community `inviteMembers.dialog.suggestedLanguageLabel`.
const suggestedLanguageSelect = (page: Page) =>
  page.getByRole('combobox', { name: /Suggested language for invitee|Voorgestelde taal voor de genodigde/i });

/** Resolve the target space (nameID + roleSetID) once per run. */
async function resolveSpace(page: Page): Promise<{ nameId: string; roleSetId: string }> {
  if (spaceNameId && spaceRoleSetId) return { nameId: spaceNameId, roleSetId: spaceRoleSetId };
  const data = await gql(page.request, '{ spaces { nameID about { membership { roleSetID } } } }');
  const spaces: Array<{ nameID: string; about: { membership: { roleSetID: string } } }> = data?.spaces ?? [];
  const match = spaceNameId ? spaces.find(s => s.nameID === spaceNameId) : spaces[0];
  expect(match, `no usable space found (looked for ${spaceNameId || 'the first space'})`).toBeTruthy();
  spaceNameId = match!.nameID;
  spaceRoleSetId = match!.about.membership.roleSetID;
  return { nameId: spaceNameId, roleSetId: spaceRoleSetId };
}

/**
 * Server-side read-back of the invitation the walk just created (a brand-new
 * email takes the PlatformInvitation path — R-5). Returns the recorded
 * suggestedLanguage, or null when none was recorded.
 */
async function readSuggestedLanguage(page: Page, email: string): Promise<string | null> {
  const { roleSetId } = await resolveSpace(page);
  const data = await gql(
    page.request,
    `query ReadInvite($roleSetId: UUID!) {
       lookup { roleSet(ID: $roleSetId) { platformInvitations { id email suggestedLanguage } } }
     }`,
    { roleSetId }
  );
  const invitations: Array<{ id: string; email: string; suggestedLanguage: string | null }> =
    data?.lookup?.roleSet?.platformInvitations ?? [];
  const invite = invitations.find(i => i.email.toLowerCase() === email.toLowerCase());
  expect(invite, `no PlatformInvitation was persisted for ${email}`).toBeTruthy();
  createdInvitationIds.push(invite!.id);
  return invite!.suggestedLanguage ?? null;
}

async function openInviteDialog(page: Page): Promise<void> {
  // Community tab (client-side ?tab=2 — see CrdSpaceRoutes: Community === section 2).
  const { nameId } = await resolveSpace(page);
  await page.goto(`${BASE_URL}/${nameId}?tab=2`);
  // crd-space:members.inviteMember — "Invite Member" (en) / "Lid uitnodigen" (nl).
  const inviteButton = page.getByRole('button', { name: /^(Invite Member|Lid uitnodigen)$/i });
  await inviteButton.waitFor({ state: 'visible', timeout: 25_000 });
  await inviteButton.click();
  await expect(page.getByRole('dialog', { name: /Invite others to join/i })).toBeVisible({ timeout: 15_000 });
}

/** Add a brand-new email invitee as a chip and send the invitation. */
async function sendInvitationTo(page: Page, email: string): Promise<void> {
  const search = page.getByRole('textbox', { name: /Search for users by name or email/i });
  await search.fill(email);
  await search.press('Enter');

  const send = page.getByRole('button', { name: /^Send$/i });
  await expect(send).toBeEnabled({ timeout: 10_000 });
  await send.click();

  // Exact outcome label from the result view (crd-community
  // `inviteMembers.results.sent`) — a substring match would also accept
  // "Invitation not sent"/"Invitation failed."
  await expect(page.getByText(SENT_LABEL, { exact: true })).toBeVisible({ timeout: 20_000 });
  // ... and no failure row is present alongside it.
  await expect(page.getByText(/Invitation failed\.|Can't invite/i)).toHaveCount(0);
}

test.describe('US5 — inviter suggests Dutch (compose-time)', () => {
  // Session comes from the `auth-setup` project (.auth/ storage state); the walk
  // never drives the login UI itself.
  test.use({ locale: 'en-US', storageState: ADMIN_STATE });

  // The walks create real PlatformInvitations; remove them so repeated runs do
  // not accumulate pending invitations on the environment.
  test.afterAll(async ({ browser }) => {
    if (createdInvitationIds.length === 0) return;
    const ctx = await browser.newContext({ storageState: ADMIN_STATE });
    try {
      for (const id of createdInvitationIds) {
        await gql(ctx.request, 'mutation Del($id: UUID!) { deletePlatformInvitation(deleteData: { ID: $id }) { id } }', {
          id,
        });
      }
    } finally {
      await ctx.close();
    }
  });

  // US5-AS1: the control is present, offers exactly the platform's eligible set,
  // and the invitation is persisted carrying the chosen language.
  test('US5-AS1 — mark invitee as expecting Dutch and send', async ({ page }, testInfo) => {
    await openInviteDialog(page);

    // FR-014: the control offers exactly "No preference" + the eligible set the
    // server advertises — no more, no less.
    const { eligible } = await languageConfig(page.request);
    expect(eligible, 'this walk needs Dutch in the eligible set').toContain('nl');
    const expectedOptions = [NO_PREFERENCE_LABEL, ...eligible.map(code => LANGUAGE_ENDONYMS[code] ?? code)];

    const select = suggestedLanguageSelect(page);
    await expect(select).toBeVisible();
    await select.click();
    const options = page.getByRole('option');
    await expect(options).toHaveText(expectedOptions);

    // Select Dutch and assert it is the SELECTED option, then that the closed
    // control displays it.
    const dutchOption = page.getByRole('option', { name: 'Nederlands', exact: true });
    await dutchOption.click();
    await expect(select).toHaveText('Nederlands');

    const email = `lang029-inv-${Date.now()}@alkemio.test`;
    await sendInvitationTo(page, email);

    // The point of US5: the suggestion is RECORDED on the invitation, not merely
    // accepted by the form (FR-014a).
    expect(
      await readSuggestedLanguage(page, email),
      'FR-014a: the sent invitation must carry the suggested language'
    ).toBe('nl');

    await page.screenshot({ path: testInfo.outputPath('us5-as1-invite-sent-dutch.png') });
  });

  // US5-AS6: the control is optional — sending without touching it still works
  // and records no suggestion (FR-015). Default state is "No preference".
  test('US5-AS6 — send without touching the language control', async ({ page }, testInfo) => {
    await openInviteDialog(page);

    // Closed control shows exactly the no-preference label — nothing pre-selected.
    await expect(suggestedLanguageSelect(page)).toHaveText(NO_PREFERENCE_LABEL);

    const email = `lang029-nolang-${Date.now()}@alkemio.test`;
    await sendInvitationTo(page, email);

    // FR-015: untouched control => NO language recorded on the invitation.
    expect(
      await readSuggestedLanguage(page, email),
      'FR-015: an untouched control must record no suggested language'
    ).toBeNull();

    await page.screenshot({ path: testInfo.outputPath('us5-as6-invite-sent-no-lang.png') });
  });
});
