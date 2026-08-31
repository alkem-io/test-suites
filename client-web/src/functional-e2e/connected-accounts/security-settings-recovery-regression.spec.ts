// spec: workspace#051-cleverbase-account-linking — recovery regression for T027
// Case: CA-41 (E3-recovery-set-password-unaffected-by-T027).
//
// The T027 seam (securitySettingsResumeTarget) redirects only settings flows
// whose return_to targets a Security page. A recovery-born settings flow
// carries no such return_to, so the bare /settings route must still render
// 'Set new password' — no redirect. This spec STOPS at that screen: the
// password form is never submitted, so no shared credential mutates and the
// case is idempotent + parallel-safe. 'Completing recovery sets a working
// password' is already covered end-to-end by
// authentication/authentication-password-recovery.spec.ts and not duplicated.
//
// Shared-inbox coupling, both directions:
//  - Our side: recipient-scoped + baseline-stamped reads (mailslurper.helper.ts),
//    and we NEVER wipe the shared inbox — the legacy recovery spec may be
//    polling it concurrently.
//  - Persona: subsubspace.member@alkem.io — deliberately distinct from the
//    persona the legacy recovery spec drives (non.space@alkem.io), so
//    parallel runs never chase each other's mail or passwords. The legacy
//    side's helper (tests-lib getRecoveryLink) is recipient-filtered too, so
//    a CA-41 mail arriving mid-poll can no longer be opened by that spec.
//  - Residual risk (accepted): the legacy spec's deleteMailSlurperMails wipe
//    can land inside our poll window and delete our not-yet-read mail; the
//    poll then simply times out rather than corrupting anything. No retries
//    are added to paper over it.
//
// This runs pre-auth in a cold context: the post-sign-in "new design" dialog
// cannot appear before the final assert, so no dismissNewLookDialog call
// (whose internal waitForTimeout polling was a hidden sleep) exists here.

import { expect, test } from '@playwright/test';
import { navigateToLoginPageFromMenu } from '../authentication/login-page-objects';
import {
  continueButton,
  recoveryEmailField,
} from '../authentication/common-authentication-page-elements';
import { newestRecoveryMailStamp, recoveryLinkFor } from './mailslurper.helper';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Security settings — recovery flow unaffected by the T027 resume seam', () => {
  test("CA-41: the recovery-born settings flow still renders 'Set new password' on bare /settings", async ({
    page,
    request,
  }) => {
    // Cold SPA boot + mail latency + the Kratos redirect chain need more than
    // the local 30s default.
    test.setTimeout(90_000);

    const email = 'subsubspace.member@alkem.io';

    // navigateToLoginPageFromMenu accepts the cookie-consent banner FIRST —
    // on a fresh context it overlays the header 'Log in' link, and a click
    // through the overlay is intercepted (see login-page-objects.ts).
    await navigateToLoginPageFromMenu(baseUrl, page);
    await page.getByRole('link', { name: 'Forgot password?' }).click();

    await recoveryEmailField(page).click();
    await recoveryEmailField(page).fill(email);

    // Baseline captured BEFORE submitting, from MailSlurper's OWN clock (the
    // newest recovery-mail stamp already in the inbox): only mail stamped
    // strictly after it qualifies, so a previous run's accumulated recovery
    // mail (this spec never wipes the inbox) can never satisfy the poll —
    // stale links would otherwise resolve instantly and, once >1h old, land
    // on the recovery-flow-expired screen instead of 'Set new password'.
    // Comparing MailSlurper stamps to each other (not to Date.now()) makes
    // the filter immune to the deployment-dependent, unmarked timezone in
    // MailSlurper's dateSent (see mailslurper.helper.ts).
    const baselineStamp = await newestRecoveryMailStamp(request, email);
    await continueButton(page).click();

    // Polling assertion on the mail API — zero fixed sleeps.
    let recoveryLink: string | undefined;
    await expect
      .poll(
        async () => {
          recoveryLink = await recoveryLinkFor(request, email, baselineStamp);
          return recoveryLink;
        },
        { timeout: 45_000, intervals: [2_000] }
      )
      .toBeTruthy();

    await page.goto(recoveryLink as string);

    // The recovery flow carries no security return_to, so
    // securitySettingsResumeTarget yields null and no redirect fires: the
    // 'Set new password' card renders on the bare /settings route.
    await expect(page.getByRole('heading', { name: 'Set new password' })).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/settings(\?|$)/);
    expect(page.url()).not.toMatch(/\/settings\/security/);

    // STOP HERE — the password form is never submitted (idempotency +
    // parallel-safety: the shared harness credential must never mutate).
  });
});
