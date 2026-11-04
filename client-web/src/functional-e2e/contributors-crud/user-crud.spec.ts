// spec: client-web/src/functional-e2e/contributors-crud/contributors-crud-test-plan.md
// Story: alkem-io/alkemio#1699 (QA P1: Contributors - CRUD Full), section "User".
//
// Every edit is made on a disposable user registered in beforeAll; the
// harness personas are only signed in to look. The oracle for each write is
// the reloaded tab AND the record read back over the API.

import { test, expect } from '@playwright/test';
import {
  createOrganizationOrAdopt,
  findUsersPaginated,
  getUserData,
  getVerificationLinkFor,
  TestUserManager,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { navigateToRegistrationFromAcceptTerms } from '../authentication/login-page-objects';
import { nextButton } from '../authentication/common-authentication-page-elements';
import {
  fillUpSignUpPageElements,
  fillUpSignUpPasswordElements,
} from '../identity-flows/registration-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from '../identity-flows/signin-page-objects';
import { expectSignedIn } from '../my-dashboard/my-dashboard-page-objects';
import { must } from '../helpers/lib-actor.helper';
import {
  openPersonaPage,
  type PersonaPage,
} from '../helpers/space-access.helper';
import { UserProfileSettingsPage } from '../user-profile/user-profile-settings.page';
import {
  accountSection,
  accountSectionHeadings,
  associateUser,
  baseUrl,
  deleteDisposableUser,
  deleteOrganizationIfPresent,
  deleteOrganizationInAdmin,
  expectAccessibleNames,
  expectSettingsTabs,
  organizationIdByNameId,
  registerDisposableUser,
  runId,
  seedOrganizationScenario,
  teardownScenario,
  userSettingsUrl,
  type DisposableUser,
} from './contributors-crud.helpers';

const RUN = runId();
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

/** The user settings shell, as every signed-in user sees their own. */
const USER_SETTINGS_TABS = [
  'Profile',
  'Account',
  'Membership',
  'Organisations',
  'Notifications',
  'Settings',
  'Security',
];

let scenario: OrganizationWithSpaceModel | undefined;
let user: DisposableUser | undefined;
let self: PersonaPage | undefined;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  scenario = await seedOrganizationScenario(`user-crud-${RUN}`);
  user = await registerDisposableUser(`user ${RUN}`);
  await associateUser(user.id, scenario.organization.roleSetId);
  self = await openPersonaPage(browser, user.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await self?.close();
  await deleteDisposableUser(user);
  await teardownScenario(scenario);
});

const myOrganisations = () =>
  self!.page.getByRole('main').getByRole('list').getByRole('listitem');

test.describe('Contributors CRUD — User', () => {
  test('1.1 a registered user gets a verification mail, signs in, and owns a profile carrying the names entered', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const email = `crud-reg-${RUN}@alkem.io`;
    const lastName = `Reg${RUN}`;
    let registeredId: string | undefined;
    try {
      await navigateToRegistrationFromAcceptTerms(baseUrl, page);
      await fillUpSignUpPageElements(email, 'Crud', lastName, page);
      await nextButton(page).click();
      await fillUpSignUpPasswordElements(password, page);
      await nextButton(page).click();
      await expect(
        page.getByRole('heading', { name: 'Verify your email' })
      ).toBeVisible();

      // The verification mail for THIS address, read by recipient.
      await expect
        .poll(() => getVerificationLinkFor(email), { timeout: 30_000 })
        .toBeTruthy();
      await page.goto((await getVerificationLinkFor(email))!);
      await expect(page.getByText('You successfully verified')).toBeVisible();

      // Continue → the Kratos sign-in flow (a hard visit to /login does not start one).
      await page.getByRole('link', { name: 'Continue', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Sign in' })
      ).toBeVisible();
      await fillUpSignInPageElements(email, password, page);
      await pressSignInButtonSignInPage(page);
      await expectSignedIn(page);

      const found = must(
        await findUsersPaginated({ email }),
        'find registered user'
      ).usersPaginated.users;
      expect(found.map(u => u.email)).toEqual([email]);
      registeredId = found[0].id;
      const record = must(
        await getUserData(registeredId),
        'registered user'
      ).user;
      expect([record.firstName, record.lastName]).toEqual(['Crud', lastName]);

      const profile = new UserProfileSettingsPage(page);
      await profile.goto(record.nameID);
      await expect(profile.field('First Name')).toHaveValue('Crud');
      await expect(profile.field('Last Name')).toHaveValue(lastName);
      await expect(profile.field('Email')).toHaveValue(email);
    } finally {
      if (!registeredId) {
        registeredId = (await findUsersPaginated({ email })).data
          ?.usersPaginated.users[0]?.id;
      }
      if (registeredId) {
        await deleteDisposableUser({
          id: registeredId,
          email,
          nameId: '',
          displayName: '',
        });
      }
    }
  });

  test('1.2 a profile update is saved, survives a reload, and is what another signed-in user sees', async ({
    browser,
  }) => {
    const page = self!.page;
    const newName = `Crud Renamed ${RUN}`;
    const newTagline = `Tagline ${RUN}`;

    const profile = new UserProfileSettingsPage(page);
    await profile.goto(user!.nameId);
    await profile.fillField('Display Name', newName);
    await profile.openSection('About You');
    await profile.fillField('Tagline', newTagline);
    await profile.saveChanges();

    await profile.reload();
    await expect(profile.field('Display Name')).toHaveValue(newName);
    await profile.openSection('About You');
    await expect(profile.field('Tagline')).toHaveValue(newTagline);

    const stored = must(await getUserData(user!.id), 'user after update').user
      .profile;
    expect([stored?.displayName, stored?.tagline]).toEqual([
      newName,
      newTagline,
    ]);

    const viewer = await openPersonaPage(
      browser,
      TestUserManager.users.spaceMember.email
    );
    try {
      await viewer.page.goto(`${baseUrl}/user/${user!.nameId}`);
      await expect(
        viewer.page.getByRole('heading', {
          level: 1,
          name: newName,
          exact: true,
        })
      ).toBeVisible();
      await expect(
        viewer.page.getByRole('main').getByText(newTagline, { exact: true })
      ).toBeVisible();
      // The viewer is not the owner: no settings entry on someone else's profile.
      await expect(
        viewer.page.getByRole('link', { name: 'Open user settings' })
      ).toHaveCount(0);
    } finally {
      await viewer.close();
    }
  });

  test('1.3 the Account tab shows each resource block with used / available counts for an unlicensed user', async () => {
    const page = self!.page;
    await page.goto(userSettingsUrl(user!.nameId, 'account'));
    await expect(accountSection(page, 'Hosted Spaces 0/0')).toBeVisible();
    await expect(
      accountSection(page, 'Virtual Contributors 0/0')
    ).toBeVisible();
    await expect(accountSection(page, 'Template Packs 0/0')).toBeVisible();
    // Custom homepages need CREATE_INNOVATION_HUB, which only a platform
    // licence manager holds: an account owner reads "Not available".
    await expect(
      accountSection(page, 'Custom Homepages Not available')
    ).toBeVisible();
    await expectAccessibleNames(accountSectionHeadings(page), [
      'Hosted Spaces 0/0',
      'Virtual Contributors 0/0',
      'Template Packs 0/0',
      'Custom Homepages Not available',
      'Danger Zone',
    ]);
  });

  test('1.4 the Organisations tab lists exactly the organisation the user is associated with, with the Associate role and a link to it', async () => {
    const page = self!.page;
    await page.goto(userSettingsUrl(user!.nameId, 'organizations'));
    await expect(
      page.getByText('Showing 1 of 1 organisations', { exact: true })
    ).toBeVisible();
    const row = myOrganisations();
    await expect(row).toHaveCount(1);
    await expect(
      row.getByRole('link', {
        name: scenario!.organization.profile.displayName,
        exact: true,
      })
    ).toHaveAttribute(
      'href',
      `${baseUrl}/organization/${scenario!.organization.nameId}`
    );
    await expect(row.getByText('Associate', { exact: true })).toBeVisible();
  });

  test('1.5 toggling a notification channel saves it, and it survives a reload', async () => {
    const page = self!.page;
    const label =
      'Toggle Email notification for: Receive a notification when a Post is published in a community I am a member of';
    const before = must(await getUserData(user!.id), 'settings before').user
      .settings.notification.space.collaborationCalloutPublished.email;

    await page.goto(userSettingsUrl(user!.nameId, 'notifications'));
    await page
      .getByRole('heading', { level: 3, name: /^Space Notifications/ })
      .getByRole('button')
      .click();
    const toggle = page.getByRole('switch', { name: label, exact: true });
    await expect(toggle).toBeChecked({ checked: before });
    await toggle.click();
    await expect(toggle).toBeChecked({ checked: !before });

    await expect
      .poll(
        async () =>
          must(await getUserData(user!.id), 'settings after').user.settings
            .notification.space.collaborationCalloutPublished.email
      )
      .toBe(!before);
    await page.reload();
    await page
      .getByRole('heading', { level: 3, name: /^Space Notifications/ })
      .getByRole('button')
      .click();
    await expect(
      page.getByRole('switch', { name: label, exact: true })
    ).toBeChecked({
      checked: !before,
    });
  });

  test('1.6 turning off direct messages on the Settings tab saves it, and it survives a reload', async () => {
    const page = self!.page;
    const label = 'Allow other users to send me direct messages';
    await page.goto(userSettingsUrl(user!.nameId, 'settings'));
    const toggle = page.getByRole('switch', { name: label, exact: true });
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();

    await expect
      .poll(
        async () =>
          must(await getUserData(user!.id), 'settings after').user.settings
            .communication.allowOtherUsersToSendMessages
      )
      .toBe(false);
    await page.reload();
    await expect(
      page.getByRole('switch', { name: label, exact: true })
    ).not.toBeChecked();
  });

  test('1.7 once the platform admin deletes an organisation, its former associate no longer lists it', async ({
    browser,
  }) => {
    const name = `Crud Doomed ${RUN}`;
    const nameId = `crud-doomed-${RUN}`;
    const created = must(
      await createOrganizationOrAdopt(name, nameId),
      'create doomed org'
    ).createOrganization;
    try {
      await associateUser(user!.id, created.roleSet.id);

      // Positive control: both organisations are listed before the delete.
      const page = self!.page;
      await page.goto(userSettingsUrl(user!.nameId, 'organizations'));
      await expect(
        page.getByText('Showing 2 of 2 organisations', { exact: true })
      ).toBeVisible();
      await expect(
        myOrganisations().getByRole('link', { name, exact: true })
      ).toBeVisible();

      const admin = await openPersonaPage(
        browser,
        TestUserManager.users.globalAdmin.email
      );
      try {
        await deleteOrganizationInAdmin(admin.page, name);
      } finally {
        await admin.close();
      }
      await expect.poll(() => organizationIdByNameId(nameId)).toBeNull();

      await page.reload();
      await expect(
        page.getByText('Showing 1 of 1 organisations', { exact: true })
      ).toBeVisible();
      await expect(
        myOrganisations().getByRole('link', { name, exact: true })
      ).toHaveCount(0);
      await expect(
        myOrganisations().getByRole('link', {
          name: scenario!.organization.profile.displayName,
          exact: true,
        })
      ).toBeVisible();
    } finally {
      await deleteOrganizationIfPresent(nameId);
    }
  });

  const roles = [
    ['Space Admin', () => TestUserManager.users.spaceAdmin],
    ['Org Admin', () => TestUserManager.users.organizationAdmin],
    ['Beta Tester', () => TestUserManager.users.betaTester],
    ['Space Member', () => TestUserManager.users.spaceMember],
  ] as const;

  for (const [role, persona] of roles) {
    test(`1.8 ${role}: their own settings open on an editable Profile tab carrying their name, behind the full tab strip`, async ({
      browser,
    }) => {
      const { email, id } = persona();
      const stored = must(await getUserData(id), `${role} record`).user;
      const viewer = await openPersonaPage(browser, email);
      try {
        const profile = new UserProfileSettingsPage(viewer.page);
        await profile.goto(stored.nameID);
        await expectSettingsTabs(viewer.page, USER_SETTINGS_TABS);
        await expect(profile.field('Display Name')).toHaveValue(
          stored.profile?.displayName ?? ''
        );
        await expect(profile.field('Display Name')).toBeEditable();
        await expect(profile.field('First Name')).toBeEditable();
        await expect(profile.field('Last Name')).toBeEditable();
        // The address is changed through support only.
        await expect(profile.field('Email')).not.toBeEditable();
      } finally {
        await viewer.close();
      }
    });
  }
});
