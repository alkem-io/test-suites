// Feature 029-detect-signup-language — US5: an inviter suggests Dutch for the
// person they invite. This spec covers the COMPOSE-TIME half that is drivable on
// this stack: as an admin, open the space-community invite dialog and exercise
// the "Suggested language for invitee" control (FR-014/FR-014a/FR-015).
//
//   US5-AS1: mark the invitee as expecting Dutch -> invite sent carrying it.
//   US5-AS6: send without touching the language control -> sends with no suggestion.
//
// The INVITEE-facing half (AS2/AS3/AS4: an emailed invitee signs up and lands in
// Dutch) requires completing the Kratos email-invite -> signup flow, which does
// not drive reliably headless on this stack (see us1-signup-offer.spec.ts) and is
// recorded as infeasible-headless. AS7 (batch fan-out gql read-back onto both
// Invitation and PlatformInvitation) is a server-contract check (gql-live probe 4)
// and AS8 (invite email untouched) is a code assessment (FR-016a/DL-12).
//
// spec source: specs/029-detect-signup-language/repos.yaml -> tracks (US5)

import { test, expect, Page } from '@playwright/test';
import { BASE_URL } from './helpers';
import { uiLogin } from './loginHelper';

const ADMIN_EMAIL = 'admin@alkem.io';
// A space the admin can administer + invite into (seeded).
const SPACE_NAMEID = 'welcome-space';

// The invite dialog's suggested-language control (InviteMembersDialog.tsx).
const suggestedLanguageSelect = (page: Page) =>
  page.getByRole('combobox', { name: /Suggested language for invitee|Verwachte taal/i });

async function openInviteDialog(page: Page): Promise<void> {
  // Community tab (client-side ?tab=2 on the seeded Welcome Space).
  await page.goto(`${BASE_URL}/${SPACE_NAMEID}?tab=2`);
  const inviteButton = page.getByRole('button', { name: /^Invite$/i });
  await inviteButton.waitFor({ state: 'visible', timeout: 25_000 });
  await inviteButton.click();
  await expect(page.getByRole('dialog', { name: /Invite others to join/i })).toBeVisible({ timeout: 15_000 });
}

test.describe('US5 — inviter suggests Dutch (compose-time)', () => {
  test.use({ locale: 'en-US' });

  // US5-AS1: the suggested-language control is present, eligible-set-driven
  // (Dutch is the only option), and an invite can be sent carrying the suggestion.
  test('US5-AS1 — mark invitee as expecting Dutch and send', async ({ page }) => {
    test.setTimeout(120_000);
    await uiLogin(page, ADMIN_EMAIL);
    await openInviteDialog(page);

    // The control exists (FR-014) and offers exactly the eligible set (Dutch).
    const select = suggestedLanguageSelect(page);
    await expect(select).toBeVisible();
    await select.click();
    const dutchOption = page.getByRole('option', { name: 'Nederlands', exact: true });
    await expect(dutchOption).toBeVisible({ timeout: 10_000 });
    await dutchOption.click();
    await expect(select).toContainText('Nederlands');

    // Add a brand-new email invitee (PlatformInvitation path — R-5).
    const email = `forge029-inv-${Date.now()}@alkemio.test`;
    const search = page.getByRole('textbox', { name: /Search for users by name or email/i });
    await search.fill(email);
    await search.press('Enter');

    // Send becomes enabled with a valid invitee; sending succeeds.
    const send = page.getByRole('button', { name: /^Send$/i });
    await expect(send).toBeEnabled({ timeout: 10_000 });
    await send.click();

    // A result row / success outcome appears (invitation sent).
    await expect(page.getByText(/invitation.*sent|sent the invitation|Invitation sent/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.screenshot({ path: 'us5-as1-invite-sent-dutch.png', fullPage: false });
  });

  // US5-AS6: the control is optional — sending without touching it still works
  // and records no suggestion (FR-015). Default state is "No preference".
  test('US5-AS6 — send without touching the language control', async ({ page }) => {
    test.setTimeout(120_000);
    await uiLogin(page, ADMIN_EMAIL);
    await openInviteDialog(page);

    // Control defaults to "No preference" — do NOT touch it.
    await expect(suggestedLanguageSelect(page)).toContainText(/No preference|Geen voorkeur/i);

    const email = `forge029-nolang-${Date.now()}@alkemio.test`;
    const search = page.getByRole('textbox', { name: /Search for users by name or email/i });
    await search.fill(email);
    await search.press('Enter');

    const send = page.getByRole('button', { name: /^Send$/i });
    await expect(send).toBeEnabled({ timeout: 10_000 });
    await send.click();

    await expect(page.getByText(/invitation.*sent|sent the invitation|Invitation sent/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.screenshot({ path: 'us5-as6-invite-sent-no-lang.png', fullPage: false });
  });
});
