// plan: second-factor-test-plan.md
//
// An organisation's rule, as its members meet it in the browser: the switch in
// the organisation's settings, the reminder in grace, the refusal once the
// deadline has passed (mid-session and at start-up), and the web ID token
// presented as a bearer by a refused sign-in; and, for a member with one way
// to pass the second step, the reminder, Security and /second-factor asking for
// a second (D55). Always an organisation rule on a throwaway organisation —
// never the platform rule.
import { randomUUID } from 'crypto';
import { expect, request, test, type Page } from '@playwright/test';
import {
  ageRuleSince,
  clearAddressCounters,
  createThrowawayUser,
  deleteThrowawayUsers,
  enrolTotp,
  errorCodes,
  loginWithPassword,
  readOrganization,
  readOrganizationSecondFactorRequired,
  readSecondFactorRequirement,
  readServedUser,
  secondFactorCredentialsLeft,
  setOrganizationRule,
  totpCode,
  withThrowawayOrganization,
  type ThrowawayUser,
} from '@alkemio/tests-lib';
import { must, sessionActor } from '../helpers/lib-actor.helper';
import { welcomeHeading } from '../authentication/common-authentication-page-elements';
import {
  COPY,
  baseUrl,
  block,
  expectRefusalPage,
  expectSignedIn,
  expectStaysAbsent,
  freshPage,
  generateRecoveryCodesOnPage,
  getQuietly,
  nameIdOf,
  openSecurityTab,
  requirementRead,
  roleTokens,
  secondStepCodeField,
  secondStepHeading,
  signInAgainFromRefusalPage,
  storedSignIn,
  submitPassword,
  submitSecondStep,
} from './second-factor.helpers';

let usersAdminToken = '';
let member: ThrowawayUser | undefined;
let orgAdmin: ThrowawayUser | undefined;
/** Members with one way to pass the second step, made by the D55 walks. */
const oneWayMembers: ThrowawayUser[] = [];

/** A throwaway member whose one way to pass the second step is the app. */
const oneWayMember = async (
  tag: string
): Promise<{ user: ThrowawayUser; nameId: string; secret: string }> => {
  const user = await createThrowawayUser(tag);
  oneWayMembers.push(user);
  const secret = await enrolTotp(
    (await loginWithPassword(user.email)).sessionToken
  );
  expect(await secondFactorCredentialsLeft(user.identityId)).toEqual(['totp']);
  return { user, nameId: await nameIdOf(user), secret };
};

/** The password, then the code, on the sign-in page. */
const signInWithCode = async (
  page: Page,
  email: string,
  secret: string
): Promise<void> => {
  await submitPassword(page, email);
  await expect(secondStepHeading(page)).toBeVisible();
  await submitSecondStep(page, secondStepCodeField(page), totpCode(secret));
};

const requirementOf = async (page: Page) => {
  const status = await readSecondFactorRequirement(await sessionActor(page));
  expect(errorCodes(status)).toEqual([]);
  return status.body.data!.me.secondFactorRequirement;
};

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

/** `GET /rest/memo/:id/pdf` with only a bearer — no cookie, no storage state. */
const memoPdfWithBearer = async (token: string) => {
  const api = await request.newContext();
  try {
    const response = await getQuietly(
      api,
      `${baseUrl}/api/private/rest/memo/${randomUUID()}/pdf`,
      { Authorization: `Bearer ${token}` }
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
    await deleteThrowawayUsers(
      [member, orgAdmin, ...oneWayMembers],
      usersAdminToken
    );
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
              .filter({ hasText: COPY.reminderPrefix });
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
            await expectStaysAbsent(
              reminder,
              'the dismissed reminder came back after a reload'
            );
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
                .filter({ hasText: COPY.reminderPrefix })
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

            const hint = await getQuietly(
              page.request,
              `${baseUrl}/api/auth/oidc/id-token-hint`
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

  test('D55 in grace, a one-way sign-in: the reminder and Security ask for a second way; once the flow holds two, Security says to sign in again; signed in again, neither shows', async ({
    browser,
    browserName,
  }) => {
    const { user, nameId, secret } = await oneWayMember('reqgraceway');
    const securityHref = new RegExp(
      `/user/${nameId}/settings/security#two-step-verification$`
    );
    const notices = (page: Page) => ({
      needed: page.getByText(COPY.secondWayNeeded, { exact: true }),
      added: page.getByText(COPY.secondWayAdded, { exact: true }),
    });

    await withThrowawayOrganization(
      { admin: orgAdmin!, associates: [user] },
      async organization => {
        expect(
          errorCodes(
            await setOrganizationRule(organization.id, true, {
              bearerToken: orgAdmin!.token,
            })
          )
        ).toEqual([]);

        await test.step('D55 the reminder and Security ask for a second way; with two in the flow, Security says to sign in again', async () => {
          const { context, page } = await freshPage(browser);
          try {
            await signInWithCode(page, user.email, secret);
            await expectSignedIn(page);
            const requirement = await requirementOf(page);
            expect(requirement).toMatchObject({
              covered: true,
              satisfied: false,
              secondWayNeeded: true,
            });
            expect(await storedSignIn(page)).toEqual({ acr: 'aal2', ways: 1 });

            const reminder = page
              .getByRole('status')
              .filter({ hasText: COPY.reminderSecondWayPrefix });
            await expect(reminder).toContainText(
              COPY.reminderSecondWayText(
                longDate(new Date(requirement.deadline!))
              )
            );
            await expect(
              reminder.getByRole('link', {
                name: COPY.reminderSecondWayAction,
                exact: true,
              })
            ).toHaveAttribute('href', securityHref);
            // Shown in place of the first-factor reminder, not beside it.
            await expect(
              page.getByRole('status').filter({ hasText: COPY.reminderPrefix })
            ).toHaveCount(0);

            await openSecurityTab(page, nameId);
            await expect(notices(page).needed).toBeVisible();
            await generateRecoveryCodesOnPage(page, context, browserName);
            // The sign-in still counted one; the flow now holds two.
            await expect(notices(page).added).toBeVisible();
            await expect(notices(page).needed).toHaveCount(0);
            expect(await secondFactorCredentialsLeft(user.identityId)).toEqual([
              'lookup_secret',
              'totp',
            ]);
          } finally {
            await context.close();
          }
        });

        await test.step('D55 signed in again with two ways, no reminder and no second-way notice', async () => {
          await clearAddressCounters();
          const { context, page } = await freshPage(browser);
          try {
            await signInWithCode(page, user.email, secret);
            await expectSignedIn(page);
            expect(await requirementOf(page)).toMatchObject({
              covered: true,
              satisfied: true,
              secondWayNeeded: false,
            });
            expect(await storedSignIn(page)).toEqual({ acr: 'aal2', ways: 2 });

            // Each absence means something only once the read the reminder
            // and the section render from has been answered in full.
            const reread = requirementRead(page);
            await page.reload();
            await (await reread).finished();
            await expectSignedIn(page);
            await expectStaysAbsent(
              page.getByRole('status').filter({
                hasText: new RegExp(
                  `${COPY.reminderPrefix}|${COPY.reminderSecondWayPrefix}`
                ),
              }),
              'a reminder showed for a sign-in that meets the rule'
            );

            const sectionRead = requirementRead(page);
            await openSecurityTab(page, nameId);
            await (await sectionRead).finished();
            await expect(
              block(page, COPY.recoveryTitle).getByText(COPY.recoveryActive, {
                exact: true,
              })
            ).toBeVisible();
            await expectStaysAbsent(
              notices(page).needed.or(notices(page).added),
              'a second-way notice showed for a sign-in that counted two ways'
            );
          } finally {
            await context.close();
          }
        });
      }
    );
  });

  test('D55 past the deadline, a one-way sign-in lands on /second-factor and is asked for a second way; adding one there and signing in again gets through', async ({
    browser,
    browserName,
  }) => {
    const { user, secret } = await oneWayMember('reqpastway');

    await withThrowawayOrganization(
      { admin: orgAdmin!, associates: [user] },
      async organization => {
        expect(
          errorCodes(
            await setOrganizationRule(organization.id, true, {
              bearerToken: orgAdmin!.token,
            })
          )
        ).toEqual([]);
        await ageRuleSince({ organizationId: organization.id }, 15);

        const { context, page } = await freshPage(browser);
        try {
          // Both steps, so the refusal is the count's and not the second
          // step's: the page asks for a second way, not for a first factor.
          await signInWithCode(page, user.email, secret);
          await expectRefusalPage(page, COPY.pageSecondWay);
          expect(await storedSignIn(page)).toEqual({ acr: 'aal2', ways: 1 });
          const refused = await readSecondFactorRequirement(
            await sessionActor(page)
          );
          expect(errorCodes(refused)).toContain('SECOND_FACTOR_REQUIRED');

          await generateRecoveryCodesOnPage(page, context, browserName);
          await expect(
            page.getByText(COPY.pageEnrolled, { exact: true })
          ).toBeVisible();
          await expect(
            page.getByText(COPY.pageSecondWay, { exact: true })
          ).toHaveCount(0);

          await signInAgainFromRefusalPage(page, user.email, secret);
          await expectSignedIn(page);
          expect(new URL(page.url()).pathname).not.toBe('/second-factor');
          expect(await requirementOf(page)).toMatchObject({
            covered: true,
            satisfied: true,
            secondWayNeeded: false,
          });
          expect(await storedSignIn(page)).toEqual({ acr: 'aal2', ways: 2 });
        } finally {
          await context.close();
        }
      }
    );
  });
});
