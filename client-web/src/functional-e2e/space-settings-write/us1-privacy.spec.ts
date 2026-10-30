// spec: client-web/src/functional-e2e/space-settings-write/space-settings-write-test-plan.md
// W2 journey 4 (docs/qa/server-rebuild/plan.md § W2), privacy: public ↔ private.

import { test, expect } from '@playwright/test';
import { SpacePrivacyMode, TestUserManager } from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  aboutDialog,
  baseUrl,
  calloutHeading,
  contentFeed,
  openPersonaPage,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  openSettingsTab,
  privacyRadio,
  saveSettings,
  seedSettingsScenario,
  serverSettings,
} from './space-settings-write.helpers';

/**
 * The admin flips privacy in the Settings tab; the oracle is what a
 * NON-MEMBER can read: the Space's callout on a public Space, only its About
 * page on a private one. A MEMBER reading the same callout is the positive
 * control after every change (the page rendered, the Space still works).
 *
 *   admin `space.admin` · member `space.member` · non-member `non.space`
 */
let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;
let member: PersonaPage | undefined;
let nonMember: PersonaPage | undefined;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  scenario = await seedSettingsScenario('priv');
  admin = await openPersonaPage(browser, TestUserManager.users.spaceAdmin.email);
  member = await openPersonaPage(browser, TestUserManager.users.spaceMember.email);
  nonMember = await openPersonaPage(browser, TestUserManager.users.nonSpaceMember.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await admin?.close();
  await member?.close();
  await nonMember?.close();
  await teardownScenario(scenario);
  scenario = undefined;
});

const space = () => scenario!.space;
const calloutName = () => space().collaboration.calloutPostDisplayName;

const expectMemberReadsCallout = async () => {
  await member!.page.goto(`${baseUrl}/${space().nameId}`);
  await expect(calloutHeading(member!.page, calloutName())).toBeVisible();
};

const expectNonMemberReadsCallout = async () => {
  const page = nonMember!.page;
  await page.goto(`${baseUrl}/${space().nameId}`);
  await expect(calloutHeading(page, calloutName())).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/${space().nameId}$`));
};

const expectNonMemberSeesAboutOnly = async () => {
  const page = nonMember!.page;
  await page.goto(`${baseUrl}/${space().nameId}`);
  await expect(aboutDialog(page, space().about.profile.displayName)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/${space().nameId}/about$`));
  await expect(contentFeed(page)).toHaveCount(0);
};

test.describe('W2 journey 4 — privacy, changed in Space settings', () => {
  test('P4-1 public → private: saved and read back, and the non-member loses the content while the member keeps it', async () => {
    // Precondition — the seeded public Space is readable by the non-member.
    await expectNonMemberReadsCallout();

    const page = admin!.page;
    await openSettingsTab(page, space().nameId);
    await expect(privacyRadio(page, 'Public')).toBeChecked();
    await privacyRadio(page, 'Private').click();
    await saveSettings(page);

    expect((await serverSettings(space().id)).privacy.mode).toBe(SpacePrivacyMode.Private);
    await page.reload();
    await expect(privacyRadio(page, 'Private')).toBeChecked();

    await expectMemberReadsCallout();
    await expectNonMemberSeesAboutOnly();
  });

  test('P4-2 private → public: saved and read back, and the non-member can read the content again', async () => {
    // Precondition — left private by P4-1.
    await expectNonMemberSeesAboutOnly();

    const page = admin!.page;
    await openSettingsTab(page, space().nameId);
    await expect(privacyRadio(page, 'Private')).toBeChecked();
    await privacyRadio(page, 'Public').click();
    await saveSettings(page);

    expect((await serverSettings(space().id)).privacy.mode).toBe(SpacePrivacyMode.Public);
    await page.reload();
    await expect(privacyRadio(page, 'Public')).toBeChecked();

    await expectMemberReadsCallout();
    await expectNonMemberReadsCallout();
  });
});
