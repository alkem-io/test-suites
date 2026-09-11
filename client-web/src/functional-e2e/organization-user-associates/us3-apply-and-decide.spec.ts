// User Story 3: "A user applies to associate; the organization decides"
// (workspace#062-organization-user-associates, P1).
//
// server-api coverage (it-specs, same scenarios, repository-internal detail):
//   server-api/src/functional-api/roleset/associates/organization-associate-application.it-spec.ts
//
// @forge-acceptance
//
// forge-verify note: every scenario below was independently walked live
// against the running forge-062 stack (real UI clicks + network-level and
// mailbox assertions) before this spec was written — this file is the
// durable, committed form of that same walk. AS9's premigration fixture
// (settings jsonb stripped of `allowApplications` in Postgres) reproduces
// the exact defect surface `@AfterLoad` must default on read.

import { expect, Page, test as baseTest } from '@playwright/test';
import { registerTestUser, TestScenarioFactory } from '@alkemio/tests-lib';
import type { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { getMailsData } from '@alkemio/tests-lib/utils/mailslurper.rest.requests';
import {
  assignUserRoleOnOrganization,
  cleanUpTestOrganizations,
  createTestOrganization,
  getAssociateEligibility,
  getInAppNotificationTypes,
  getUserToken,
  inviteUserToOrganizationRaw,
  OrgFixture,
  postGraphqlRaw,
  removeUserRoleOnOrganization,
  runSuffix,
  setOrganizationMembershipSettings,
  stripAllowApplicationsSetting,
  TestUserManager,
} from './organization-user-associates.helpers';

baseTest.describe.configure({ mode: 'serial' });

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const adminEmail = process.env.AUTH_TEST_HARNESS_EMAIL || 'admin@alkem.io';
const harnessPassword = process.env.AUTH_TEST_HARNESS_PASSWORD!;

// Every persona this walk needs, named deterministically from `runSuffix` so
// `createPersonaTest` can capture the email at module-load time (registration
// itself happens in `beforeAll`, matching the 061 walk's own convention).
const adminAName = `us3-admin-a-${runSuffix}`;
const adminOtherName = `us3-admin-other-${runSuffix}`;
const applicantApproveName = `us3-app-approve-${runSuffix}`;
const applicantRejectName = `us3-app-reject-${runSuffix}`;
const applicantOpenName = `us3-app-open-${runSuffix}`;
const viewerName = `us3-viewer-${runSuffix}`;
const zApplicantName = `us3-z-app-${runSuffix}`;

const adminAEmail = `${adminAName}@alkem.io`;
const adminOtherEmail = `${adminOtherName}@alkem.io`;
const applicantApproveEmail = `${applicantApproveName}@alkem.io`;
const applicantRejectEmail = `${applicantRejectName}@alkem.io`;
const applicantOpenEmail = `${applicantOpenName}@alkem.io`;
const viewerEmail = `${viewerName}@alkem.io`;
const zApplicantEmail = `${zApplicantName}@alkem.io`;

const adminATest = createPersonaTest(adminAEmail);
const applicantApproveTest = createPersonaTest(applicantApproveEmail);
const applicantRejectTest = createPersonaTest(applicantRejectEmail);
const viewerTest = createPersonaTest(viewerEmail);
const zApplicantTest = createPersonaTest(zApplicantEmail);
const platformAdminTest = createPersonaTest(adminEmail);

let baseScenario: OrganizationWithSpaceModel;
let orgO: OrgFixture; // AS1–AS4, AS6: allowApplications on, two ADMINs
let orgZ: OrgFixture; // AS8: zero ADMINs, one OWNER
let orgQ: OrgFixture; // AS5: allowApplications off
let orgP: OrgFixture; // AS9: settings jsonb stripped of allowApplications (premigration shape)

const meUserIdQuery = 'query { me { user { id } } }';

async function userIdFor(email: string): Promise<string> {
  const bearerToken = await getUserToken(email);
  const res = await postGraphqlRaw<{ me: { user: { id: string } } }>(meUserIdQuery, { bearerToken });
  const id = res.body.data?.me.user.id;
  if (!id) throw new Error(`Could not resolve user id for ${email}: ${JSON.stringify(res.body.errors)}`);
  return id;
}

baseTest.beforeAll(async () => {
  baseTest.setTimeout(240_000);

  // Sequential — parallel Kratos registration flows collide (registerTestUser's
  // own doc comment / 061 walk precedent).
  await registerTestUser(adminAName);
  await registerTestUser(adminOtherName);
  await registerTestUser(applicantApproveName);
  await registerTestUser(applicantRejectName);
  await registerTestUser(applicantOpenName);
  await registerTestUser(viewerName);
  await registerTestUser(zApplicantName);

  baseScenario = await TestScenarioFactory.createBaseScenario({
    name: `org-associates-us3-${runSuffix}`,
  } as TestScenarioConfig);

  [orgO, orgZ, orgQ, orgP] = await Promise.all([
    createTestOrganization('OrgO', runSuffix),
    createTestOrganization('OrgZ', runSuffix),
    createTestOrganization('OrgQ', runSuffix),
    createTestOrganization('OrgP', runSuffix),
  ]);

  const [adminAId, adminOtherId] = await Promise.all([userIdFor(adminAEmail), userIdFor(adminOtherEmail)]);

  // org O: two ADMINs (adminA acts in the UI; adminOther is the "every OTHER
  // admin" recipient AS2/AS3 check), allowApplications stays default ON.
  await assignUserRoleOnOrganization(orgO.roleSetId, adminAId, RoleName.Associate);
  await assignUserRoleOnOrganization(orgO.roleSetId, adminAId, RoleName.Admin);
  await assignUserRoleOnOrganization(orgO.roleSetId, adminOtherId, RoleName.Associate);
  await assignUserRoleOnOrganization(orgO.roleSetId, adminOtherId, RoleName.Admin);

  // org Z: the creating GLOBAL_ADMIN is auto OWNER+ADMIN+ASSOCIATE — drop the
  // ADMIN role only, leaving zero true admins and one owner (US3-AS8).
  await removeUserRoleOnOrganization(orgZ.roleSetId, TestUserManager.users.globalAdmin.id, RoleName.Admin);

  // org Q: applications switched off (US3-AS5).
  await setOrganizationMembershipSettings(orgQ.id, { allowApplications: false });

  // org P: simulates a row that predates this feature — the settings jsonb
  // never got the `allowApplications` key (US3-AS9).
  await stripAllowApplicationsSetting(orgP.id);
});

baseTest.afterAll(async () => {
  await cleanUpTestOrganizations();
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

// ─── Page-level helpers ───────────────────────────────────────────────────

async function applyToAssociateViaUi(page: Page, orgNameId: string, message: string) {
  await page.goto(`${baseUrl}/organization/${orgNameId}`);
  await page.waitForLoadState('networkidle');
  const applyBtn = page.getByRole('button', { name: 'Apply to associate' });
  await expect(applyBtn).toBeVisible({ timeout: 15_000 });
  await applyBtn.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const textboxes = dialog.getByRole('textbox');
  await expect(textboxes).toHaveCount(1);
  await textboxes.first().fill(message);
  await dialog.getByRole('button', { name: /^Apply$/i }).click();
  await expect(dialog.getByText('Application submitted')).toBeVisible({ timeout: 10_000 });
}

async function openAssociatesTab(page: Page, orgNameId: string) {
  await page.goto(`${baseUrl}/organization/${orgNameId}/settings/community`);
  await expect(page.getByRole('heading', { name: 'Associates' })).toBeVisible({ timeout: 15_000 });
}

// ─── US3-AS1 ────────────────────────────────────────────────────────────

applicantApproveTest.describe('US3-AS1 — a registered user with a domain mismatch applies from the profile', () => {
  applicantApproveTest('Apply dialog offers exactly one optional message field; hero flips to Application pending', async ({
    page,
  }) => {
    await applyToAssociateViaUi(page, orgO.nameID, `US3-AS1 application ${runSuffix}`);
    await page.getByRole('button', { name: /close/i }).click();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Application pending', { exact: true })).toBeVisible({ timeout: 10_000 });
  });
});

// ─── US3-AS2 ────────────────────────────────────────────────────────────

adminATest.describe('US3-AS2 — every ADMIN is told; the pending table lists the applicant with the note', () => {
  adminATest('email/in-app land on both admins with the note in the body only; View shows the note', async ({ page }) => {
    await expect
      .poll(async () => (await getInAppNotificationTypes(adminOtherEmail)).includes('ORGANIZATION_ADMIN_ASSOCIATE_APPLICATION'), {
        timeout: 20_000,
      })
      .toBe(true);

    const [mails] = await getMailsData();
    const applicationMails = (mails as Array<{ toAddresses: string[]; subject: string; body: string }>).filter(m =>
      m.subject.includes(`applied to associate with ${orgO.displayName}`)
    );
    expect(applicationMails.length).toBeGreaterThanOrEqual(2);
    for (const mail of applicationMails) {
      expect(mail.subject).not.toContain(`US3-AS1 application ${runSuffix}`);
      expect(mail.body).toContain(`US3-AS1 application ${runSuffix}`);
    }

    await openAssociatesTab(page, orgO.nameID);
    const row = page.getByRole('row', { name: new RegExp(applicantApproveName, 'i') });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row.getByRole('button', { name: 'Approve' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Reject' })).toBeVisible();

    await row.getByRole('button', { name: 'View application' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(`US3-AS1 application ${runSuffix}`);
    await dialog.getByRole('button', { name: /close/i }).click();
  });
});

// ─── US3-AS3 ────────────────────────────────────────────────────────────

adminATest.describe('US3-AS3 — approving makes the applicant an associate; only the OTHER admins hear "joined"', () => {
  adminATest('the row leaves the table; the applicant is told approved; adminOther (not the approver) hears joined', async ({
    page,
  }) => {
    await openAssociatesTab(page, orgO.nameID);
    const row = page.getByRole('row', { name: new RegExp(applicantApproveName, 'i') });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByRole('row', { name: new RegExp(applicantApproveName, 'i') })).toHaveCount(0, {
      timeout: 10_000,
    });

    const bearerToken = await getUserToken(applicantApproveEmail);
    await expect.poll(async () => (await getAssociateEligibility(orgO.id, bearerToken)).reason, { timeout: 20_000 }).toBe(
      'ALREADY_ASSOCIATE'
    );

    await expect
      .poll(async () => getInAppNotificationTypes(applicantApproveEmail), { timeout: 20_000 })
      .toEqual(expect.arrayContaining(['USER_ORGANIZATION_ASSOCIATE_APPLICATION_APPROVED']));

    // FR-010 / 061 R40: "joined" is suppressed only where a replacement exists
    // — the invitation-accept case. An approved application has none, so the
    // co-admins still hear it; only the approver is excluded.
    await expect
      .poll(async () => getInAppNotificationTypes(adminOtherEmail), { timeout: 20_000 })
      .toEqual(expect.arrayContaining(['ORGANIZATION_ADMIN_ASSOCIATE_JOINED']));

    const adminATypes = await getInAppNotificationTypes(adminAEmail);
    expect(adminATypes).not.toContain('ORGANIZATION_ADMIN_ASSOCIATE_JOINED');
  });
});

// ─── US3-AS4 ────────────────────────────────────────────────────────────

applicantRejectTest.describe('US3-AS4 — the applicant applies, then adminA rejects; reapplying is left open', () => {
  applicantRejectTest('applicant applies via the profile', async ({ page }) => {
    await applyToAssociateViaUi(page, orgO.nameID, `US3-AS4 application ${runSuffix}`);
    await page.getByRole('button', { name: /close/i }).click();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Application pending', { exact: true })).toBeVisible({ timeout: 10_000 });
  });
});

adminATest.describe('US3-AS4 (decision) — adminA rejects the AS4 applicant', () => {
  adminATest('reject removes the row; the applicant is refused, told, and free to reapply', async ({ page }) => {
    await openAssociatesTab(page, orgO.nameID);
    const row = page.getByRole('row', { name: new RegExp(applicantRejectName, 'i') });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByRole('button', { name: 'Reject' }).click();
    await expect(page.getByRole('row', { name: new RegExp(applicantRejectName, 'i') })).toHaveCount(0, {
      timeout: 10_000,
    });

    const bearerToken = await getUserToken(applicantRejectEmail);
    await expect
      .poll(async () => (await getAssociateEligibility(orgO.id, bearerToken)).reason, { timeout: 20_000 })
      .toBe('ELIGIBLE_TO_APPLY');

    const [mails] = await getMailsData();
    const declined = (mails as Array<{ toAddresses: string[]; subject: string }>).some(
      m => m.toAddresses.includes(applicantRejectEmail) && m.subject.includes('declined')
    );
    expect(declined).toBe(true);
  });
});

// ─── US3-AS5 ────────────────────────────────────────────────────────────

viewerTest.describe('US3-AS5 — an organization with applications switched off offers no Apply action', () => {
  viewerTest('profile shows the closed line; the API refusal is typed; nothing is created', async ({ page }) => {
    await page.goto(`${baseUrl}/organization/${orgQ.nameID}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Apply to associate' })).toHaveCount(0);
    await expect(page.getByText('This organisation is not currently accepting applications.')).toBeVisible({
      timeout: 10_000,
    });

    const bearerToken = await getUserToken(viewerEmail);
    const res = await postGraphqlRaw<{ applyForEntryRoleOnRoleSet: { id: string } }>(
      'mutation($roleSetID: UUID!) { applyForEntryRoleOnRoleSet(applicationData: { roleSetID: $roleSetID, questions: [] }) { id } }',
      { variables: { roleSetID: orgQ.roleSetId }, bearerToken }
    );
    expect((res.body.errors?.[0]?.extensions as { code?: string } | undefined)?.code).toBe('ROLESET_APPLICATIONS_NOT_ACCEPTED');
  });
});

// ─── US3-AS6 ────────────────────────────────────────────────────────────

baseTest.describe('US3-AS6 — inviting a user with a pending application is refused, not duplicated', () => {
  baseTest('the invite outcome is ALREADY_HAS_OPEN_APPLICATION; no invitation is created', async () => {
    const applicantToken = await getUserToken(applicantOpenEmail);
    const applyRes = await postGraphqlRaw<{ applyForEntryRoleOnRoleSet: { id: string; actor: { id: string } } }>(
      'mutation($roleSetID: UUID!) { applyForEntryRoleOnRoleSet(applicationData: { roleSetID: $roleSetID, questions: [] }) { id actor { id } } }',
      { variables: { roleSetID: orgO.roleSetId }, bearerToken: applicantToken }
    );
    const applicantActorId = applyRes.body.data!.applyForEntryRoleOnRoleSet.actor.id;

    const adminAToken = await getUserToken(adminAEmail);
    const outcome = await inviteUserToOrganizationRaw(
      orgO.roleSetId,
      applicantActorId,
      `US3-AS6 invite attempt ${runSuffix}`,
      adminAToken
    );
    expect(outcome.type).toBe('ALREADY_HAS_OPEN_APPLICATION');
    expect(outcome.invitationId).toBeNull();
  });
});

// ─── US3-AS7 ────────────────────────────────────────────────────────────

baseTest.describe('US3-AS7 — an unauthenticated visitor is sent to log in and returned to the profile', () => {
  baseTest('clicking Apply to associate leads to /login and back to the organization profile', async ({ page }) => {
    await page.goto(`${baseUrl}/organization/${orgO.nameID}`);
    await page.waitForLoadState('networkidle');
    const cookieBtn = page.getByRole('button', { name: 'Accept All Cookies' });
    if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) await cookieBtn.click();

    const applyBtn = page
      .getByRole('button', { name: 'Apply to associate' })
      .or(page.getByRole('link', { name: 'Apply to associate' }));
    await expect(applyBtn.first()).toBeVisible({ timeout: 10_000 });
    await applyBtn.first().click();
    await page.waitForURL(/.*login.*/, { timeout: 15_000 });

    const emailField = page.getByRole('textbox', { name: 'E-Mail' });
    await expect(emailField).toBeVisible({ timeout: 15_000 });
    await emailField.fill(viewerEmail);
    await page.getByRole('textbox', { name: 'Password' }).fill(harnessPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(new RegExp(`.*organization/${orgO.nameID}.*`), { timeout: 20_000 });
  });
});

// ─── US3-AS8 ────────────────────────────────────────────────────────────

zApplicantTest.describe('US3-AS8 — a zero-ADMIN organization escalates the application to support', () => {
  zApplicantTest('exactly one support email fires with the no-administrators line; no in-app row for the owner', async ({
    page,
  }) => {
    await applyToAssociateViaUi(page, orgZ.nameID, `US3-AS8 application ${runSuffix}`);

    const [mails] = await getMailsData();
    const escalation = (mails as Array<{ toAddresses: string[]; subject: string; body: string }>).filter(m =>
      m.subject.includes(`applied to associate with ${orgZ.displayName}`)
    );
    expect(escalation.length).toBe(1);
    expect(escalation[0].body).toMatch(/no administrators/i);

    // The owner (GLOBAL_ADMIN kept OWNER when ADMIN was stripped in beforeAll)
    // gets no in-app row for this event.
    const ownerTypes = await getInAppNotificationTypes(adminEmail);
    expect(ownerTypes).not.toContain('ORGANIZATION_ADMIN_ASSOCIATE_APPLICATION');
  });
});

platformAdminTest.describe('US3-AS8 (decision) — the remaining owner decides from the Associates tab', () => {
  platformAdminTest('the pending application is visible and decidable to the owner', async ({ page }) => {
    await openAssociatesTab(page, orgZ.nameID);
    const row = page.getByRole('row', { name: new RegExp(zApplicantName, 'i') });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row.getByRole('button', { name: 'Approve' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Reject' })).toBeVisible();
  });
});

// ─── US3-AS9 ────────────────────────────────────────────────────────────

viewerTest.describe('US3-AS9 — a pre-migration organization reads as accepting applications', () => {
  viewerTest('the profile offers Apply and the form still shows exactly one optional message field', async ({ page }) => {
    await page.goto(`${baseUrl}/organization/${orgP.nameID}`);
    await page.waitForLoadState('networkidle');
    const applyBtn = page.getByRole('button', { name: 'Apply to associate' });
    await expect(applyBtn).toBeVisible({ timeout: 15_000 });
    await applyBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('textbox')).toHaveCount(1);
  });
});
