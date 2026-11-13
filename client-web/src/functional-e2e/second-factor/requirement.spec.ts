// plan: second-factor-test-plan.md
//
// An organisation's rule, as its members meet it in the browser: the switch in
// the organisation's settings, the reminder in grace, the refusal once the
// deadline has passed (mid-session and at start-up), and the web ID token
// presented as a bearer by a refused sign-in. Always an organisation rule on a
// throwaway organisation — never the platform rule.
import { randomUUID } from 'crypto';
import { expect, request, test, type Page } from '@playwright/test';
import {
  ageRuleSince,
  clearAddressCounters,
  createThrowawayUser,
  deleteThrowawayUsers,
  errorCodes,
  readOrganization,
  readOrganizationSecondFactorRequired,
  readSecondFactorRequirement,
  readServedUser,
  setOrganizationRule,
  withThrowawayOrganization,
  type ThrowawayUser,
} from '@alkemio/tests-lib';
import { must, sessionActor } from '../helpers/lib-actor.helper';
import { welcomeHeading } from '../authentication/common-authentication-page-elements';
import {
  COPY,
  baseUrl,
  expectSignedIn,
  freshPage,
  nameIdOf,
  requirementRead,
  roleTokens,
  submitPassword,
} from './second-factor.helpers';

let usersAdminToken = '';
let member: ThrowawayUser | undefined;
let orgAdmin: ThrowawayUser | undefined;

/** date-fns `PPP` in en-US ("November 26th, 2026"), the reminder's format. */
const longDate = (date: Date): string => {
  const day = date.getDate();
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? 'th'
      : (['th', 'st', 'nd', 'rd'][day % 10] ?? 'th');
  const month = date.toLocaleString('en-US', { month: 'long' });
  return `${month} ${day}${suffix}, ${date.getFullYear()}`;
};

/** On /second-factor: one notice, and the refusal never reached a toast. */
const expectRefusalPage = async (page: Page): Promise<void> => {
  await page.waitForURL(url => url.pathname === '/second-factor');
  await expect(
    page.getByRole('heading', { name: COPY.pageTitle, exact: true })
  ).toBeVisible();
  await expect(page.getByText(COPY.pageRequired, { exact: true })).toHaveCount(1);
  await expect(page.getByText(COPY.refusalToast, { exact: true })).toHaveCount(0);
};

/** `GET /rest/memo/:id/pdf` with only a bearer — no cookie, no storage state. */
const memoPdfWithBearer = async (token: string) => {
  const api = await request.newContext();
  try {
    const response = await api.get(
      `${baseUrl}/api/private/rest/memo/${randomUUID()}/pdf`,
      { headers: { Authorization: `Bearer ${token}` }, failOnStatusCode: false }
    );
    const text = await response.text();
    return { status: response.status(), text };
  } finally {
    await api.dispose();
  }
};

test.describe('US4 — an organisation requires a second factor', () => {
  test.beforeAll(async () => {
    usersAdminToken = (await roleTokens()).usersAdmin;
    member = await createThrowawayUser('reqmember');
    orgAdmin = await createThrowawayUser('reqorgadmin');
  });

  test.afterAll(async () => {
    await deleteThrowawayUsers([member, orgAdmin], usersAdminToken);
  });

  test.beforeEach(async () => {
    await clearAddressCounters();
  });

  test('the switch persists; grace shows the reminder once; past the deadline the next navigation, and the next sign-in, land on /second-factor; its ID token is refused as a bearer', async ({
    browser,
  }) => {
    const memberNameId = await nameIdOf(member!);
    const adminActor = { bearerToken: orgAdmin!.token };

    await withThrowawayOrganization(
      { admin: orgAdmin!, associates: [member!] },
      async organization => {
        expect(
          errorCodes(await setOrganizationRule(organization.id, true, adminActor))
        ).toEqual([]);
        const orgNameId = must(
          await readOrganization(organization.id, adminActor),
          'read the organisation'
        ).organization.nameID;

        await test.step('US4-AS2 the organisation settings switch persists', async () => {
          const { context, page } = await freshPage(browser);
          try {
            await submitPassword(page, orgAdmin!.email);
            await expectSignedIn(page);
            await page.goto(
              `${baseUrl}/organization/${orgNameId}/settings/settings`
            );
            const ruleSwitch = page.getByRole('switch', {
              name: COPY.orgRuleSwitch,
              exact: true,
            });
            await expect(ruleSwitch).toBeChecked();
            const confirmTurnOff = page.getByRole('button', {
              name: COPY.orgRuleTurnOffConfirm,
              exact: true,
            });

            // Turning the rule off asks first; dismissing the question keeps it.
            await ruleSwitch.click();
            await expect(confirmTurnOff).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(confirmTurnOff).toHaveCount(0);
            await page.reload();
            await expect(ruleSwitch).toBeChecked();
            expect(
              await readOrganizationSecondFactorRequired(
                organization.id,
                adminActor
              )
            ).toBe(true);

            for (const next of [false, true]) {
              await ruleSwitch.click();
              if (!next) await confirmTurnOff.click();
              await expect
                .poll(() =>
                  readOrganizationSecondFactorRequired(organization.id, adminActor)
                )
                .toBe(next);
              await page.reload();
              await (next
                ? expect(ruleSwitch).toBeChecked()
                : expect(ruleSwitch).not.toBeChecked());
            }
          } finally {
            await context.close();
          }
        });

        await test.step('US4-AS3 in grace the reminder shows the deadline and a link to Security, once per browser session', async () => {
          const { context, page } = await freshPage(browser);
          try {
            await submitPassword(page, member!.email);
            await expectSignedIn(page);
            const status = await readSecondFactorRequirement(
              await sessionActor(page)
            );
            const requirement = status.body.data!.me.secondFactorRequirement;
            expect(requirement).toMatchObject({ covered: true, satisfied: false });

            const reminder = page
              .getByRole('status')
              .filter({ hasText: 'Set up two-step verification before' });
            await expect(reminder).toContainText(
              COPY.reminderText(longDate(new Date(requirement.deadline!)))
            );
            await expect(
              reminder.getByRole('link', { name: COPY.reminderAction, exact: true })
            ).toHaveAttribute(
              'href',
              new RegExp(
                `/user/${memberNameId}/settings/security#two-step-verification$`
              )
            );

            await reminder
              .getByRole('button', { name: COPY.reminderDismiss, exact: true })
              .click();
            await expect(reminder).toHaveCount(0);
            // The absence after a reload means something only once the read
            // the reminder renders from has been answered in full.
            const reread = requirementRead(page);
            await page.reload();
            await (await reread).finished();
            await expectSignedIn(page);
            await expect(reminder).toHaveCount(0);
          } finally {
            await context.close();
          }

          // A new browser session shows it again: the dismissal lasts one session.
          const next = await freshPage(browser);
          try {
            await submitPassword(next.page, member!.email);
            await expectSignedIn(next.page);
            await expect(
              next.page
                .getByRole('status')
                .filter({ hasText: 'Set up two-step verification before' })
            ).toBeVisible();
          } finally {
            await next.context.close();
          }
        });

        await test.step('US4-AS4 past the deadline, the next navigation of a signed-in session lands on /second-factor', async () => {
          const { context, page } = await freshPage(browser);
          try {
            await submitPassword(page, member!.email);
            await expectSignedIn(page);

            // The server reads the rule on every request: no wait after this.
            await ageRuleSince({ organizationId: organization.id }, 15);
            await welcomeHeading(page).click();
            await expectRefusalPage(page);
          } finally {
            await context.close();
          }
        });

        await test.step('US4-AS4/D22 a sign-in past the deadline lands on /second-factor, and its ID token is refused as a bearer', async () => {
          const { context, page } = await freshPage(browser);
          try {
            await submitPassword(page, member!.email);
            await expectRefusalPage(page);

            const hint = await page.request.get(
              `${baseUrl}/api/auth/oidc/id-token-hint`,
              { failOnStatusCode: false }
            );
            expect(hint.status()).toBe(200);
            const body = (await hint.json()) as {
              id_token?: string;
              second_factor_required?: boolean;
            };
            expect(body.second_factor_required).toBe(true);
            expect(typeof body.id_token).toBe('string');
            const idToken = body.id_token!;

            // The ID token alone, no cookie: refused — not data, and not 401.
            const graphql = await readSecondFactorRequirement({
              bearerToken: idToken,
            });
            expect(graphql.status).toBe(200);
            expect(errorCodes(graphql)).toContain('SECOND_FACTOR_REQUIRED');
            const pdf = await memoPdfWithBearer(idToken);
            expect(pdf.status).toBe(403);
            expect(JSON.parse(pdf.text)).toMatchObject({
              error_code: 'second_factor_required',
            });

            // Control: the same member's non-interactive token is never
            // evaluated, so the same requests are served — as the member, so a
            // token the server did not accept cannot pass for one it served.
            // An accepted token on an unknown memo is answered by the route:
            // 404, where a rejected token is 401 and the refusal 403.
            const control = await readServedUser({ bearerToken: member!.token });
            expect(errorCodes(control)).toEqual([]);
            expect(control.body.data?.me.user?.id).toBe(member!.userId);
            expect((await memoPdfWithBearer(member!.token)).status).toBe(404);
          } finally {
            await context.close();
          }
        });
      }
    );
  });
});
