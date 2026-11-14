// spec: client-web/src/functional-e2e/admin-organizations/admin-organizations-test-plan.md
// W2 journey 12 (docs/qa/server-rebuild/plan.md § W2), audit rows L2 / H5:
// the platform admin works on an organisation in Administration ›
// Organisations. L2-1 verifies it with the row's toggle and then resets it;
// L2-2 edits, on the admin edit form, the identity and contact fields only
// that form offers (display name, legal entity name, domain, contact email).
// Each change is read back over the lib and on the reloaded list or form.
//
// Already covered and not repeated: creating and deleting an organisation in
// Administration (contributors-crud 2.1, 1.7), and an organisation admin's
// name / tagline / website edit (contributors-crud 2.2).
//
// The organisation is self-seeded UNVERIFIED (the factory's default); only
// the platform admin acts on it. The two cases are independent: L2-2 does
// not depend on the verification state.

import { test, expect } from '@playwright/test';
import {
  OrganizationVerificationEnum,
  TestUserManager,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  adminOrganizationRow,
  expectMutationAnswered,
  openPersonaPage,
  runCleanup,
  runId,
  seedUnverifiedOrganization,
  serverOrganization,
  serverVerification,
  teardownScenario,
  type PersonaPage,
} from './admin-organizations.helpers';

const RUN = runId();

let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  await TestUserManager.populateUserModelMap();
  scenario = await seedUnverifiedOrganization(`w2-adminorg-${RUN}`);
  admin = await openPersonaPage(
    browser,
    TestUserManager.users.globalAdmin.email
  );
});

test.afterAll(async () => {
  await runCleanup([
    ['close admin', () => admin?.close() ?? Promise.resolve()],
    ['delete organisation', () => teardownScenario(scenario)],
  ]);
});

test('L2-1 the platform admin verifies an organisation with the row toggle and resets it; each state is stored and shown after a reload', async () => {
  const page = admin!.page;
  const org = scenario!.organization;
  const name = org.profile.displayName;
  expect(await serverVerification(org.id), 'seeded unverified').toBe(
    OrganizationVerificationEnum.NotVerified
  );

  let row = await adminOrganizationRow(page, name);
  await expect(row).toHaveCount(1);
  await expect(row.getByText('Not verified', { exact: true })).toBeVisible();

  // Not verified → Verified.
  const verified = expectMutationAnswered(
    page,
    'eventOnOrganizationVerification'
  );
  await row
    .getByRole('button', { name: 'Toggle verification', exact: true })
    .click();
  await verified();
  await expect
    .poll(() => serverVerification(org.id))
    .toBe(OrganizationVerificationEnum.VerifiedManualAttestation);
  row = await adminOrganizationRow(page, name);
  await expect(row.getByText('Verified', { exact: true })).toBeVisible();
  await expect(row.getByText('Not verified', { exact: true })).toHaveCount(0);

  // Verified → Not verified (the toggle sends RESET).
  const reset = expectMutationAnswered(page, 'eventOnOrganizationVerification');
  await row
    .getByRole('button', { name: 'Toggle verification', exact: true })
    .click();
  await reset();
  await expect
    .poll(() => serverVerification(org.id))
    .toBe(OrganizationVerificationEnum.NotVerified);
  row = await adminOrganizationRow(page, name);
  await expect(row.getByText('Not verified', { exact: true })).toBeVisible();
});

test('L2-2 the platform admin edits display name, legal entity name, domain and contact email on the admin form; all are stored and the list shows the new name only', async () => {
  const page = admin!.page;
  const org = scenario!.organization;
  const oldName = org.profile.displayName;
  const newName = `W2 Admin Org ${RUN}`;
  const legal = `W2 Legal Entity ${RUN} B.V.`;
  const domain = `w2-${RUN}.example.org`;
  const email = `contact-${RUN}@example.org`;
  const before = await serverOrganization(org.id);
  expect([
    before.legalEntityName ?? '',
    before.domain ?? '',
    before.contactEmail ?? '',
  ]).toEqual(['', '', '']);

  const row = await adminOrganizationRow(page, oldName);
  await expect(row).toHaveCount(1);
  await row
    .getByRole('button', { name: 'Edit organisation', exact: true })
    .click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Edit organisation',
      exact: true,
    })
  ).toBeVisible();
  const displayName = page.getByRole('textbox', {
    name: 'Display name',
    exact: true,
  });
  await expect(displayName).toHaveValue(oldName);
  await displayName.fill(newName);
  await page
    .getByRole('textbox', { name: 'Legal entity name', exact: true })
    .fill(legal);
  await page.getByRole('textbox', { name: 'Domain', exact: true }).fill(domain);
  await page
    .getByRole('textbox', { name: 'Contact email', exact: true })
    .fill(email);
  const saved = expectMutationAnswered(page, 'updateOrganization');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await saved();
  // The form returns to the admin list.
  await expect(page).toHaveURL(/\/admin\/organizations$/);

  const stored = await serverOrganization(org.id);
  expect(stored.nameID, 'the alias is untouched').toBe(org.nameId);
  expect(stored.profile.displayName).toBe(newName);
  expect(stored.legalEntityName).toBe(legal);
  expect(stored.domain).toBe(domain);
  expect(stored.contactEmail).toBe(email);

  // The list finds it under the new name, and no longer under the old one.
  await expect(await adminOrganizationRow(page, newName)).toHaveCount(1);
  const stale = await adminOrganizationRow(page, oldName);
  await expect(page.getByText('Showing 0 of 0', { exact: true })).toBeVisible();
  await expect(stale).toHaveCount(0);

  // The edit form, reopened, holds the stored values.
  await page.goto(
    `${process.env.ALKEMIO_BASE_URL || 'http://localhost:3000'}/admin/organizations/${org.id}/edit`
  );
  await expect(
    page.getByRole('textbox', { name: 'Display name', exact: true })
  ).toHaveValue(newName);
  await expect(
    page.getByRole('textbox', { name: 'Legal entity name', exact: true })
  ).toHaveValue(legal);
  await expect(
    page.getByRole('textbox', { name: 'Domain', exact: true })
  ).toHaveValue(domain);
  await expect(
    page.getByRole('textbox', { name: 'Contact email', exact: true })
  ).toHaveValue(email);
  // Keep the scenario's model in step, so teardown and any later case use the stored name.
  org.profile.displayName = newName;
});
