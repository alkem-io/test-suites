import { expect, type Locator, type Page } from '@playwright/test';
import {
  readSpaceSettings,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import { baseUrl, expectMutationAnswered } from '../helpers/space-access.helper';

/**
 * The Space settings "Settings" tab as the admin uses it, for W2 journey 4.
 * The tab edits a draft and writes it with one "Save changes" (an "Unsaved
 * changes" bar counts the edits), so every case changes ONE setting, saves,
 * and checks the save three ways: the browser's own `updateSpaceSettings`
 * answered without errors, the server's settings read back the new value,
 * and the tab shows it again after a reload.
 */

/** A PUBLIC + OPEN Space with one published post callout, a member and an admin. */
export const seedSettingsScenario = (area: string): Promise<OrganizationWithSpaceModel> =>
  TestScenarioFactory.createBaseScenario({
    name: `w2-${area}-${UniqueIDGenerator.getID()}`,
    space: {
      collaboration: { addPostCallout: true },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN, TestUser.SPACE_MEMBER],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Public },
        membership: { policy: CommunityMembershipPolicy.Open },
      },
    },
  });

export const openSettingsTab = async (page: Page, spaceNameId: string): Promise<void> => {
  await page.goto(`${baseUrl}/${spaceNameId}/settings/settings`);
  await expect(page.getByRole('tab', { name: 'Settings', selected: true })).toBeVisible();
  await expect(privacyRadio(page, 'Public')).toBeVisible();
};

/** Privacy radios are named by their label followed by their description. */
export const privacyRadio = (page: Page, mode: 'Public' | 'Private'): Locator =>
  page.getByRole('radio', { name: new RegExp(`^${mode} `) });

export const POLICY_LABEL: Record<CommunityMembershipPolicy, string> = {
  [CommunityMembershipPolicy.Open]: 'No Application Required',
  [CommunityMembershipPolicy.Applications]: 'Application Required',
  [CommunityMembershipPolicy.Invitations]: 'Invitation Only',
};

export const policyRadio = (page: Page, policy: CommunityMembershipPolicy): Locator =>
  page.getByRole('radio', { name: new RegExp(`^${POLICY_LABEL[policy]} `) });

/** The "Allowed Actions" switches, by their visible label. */
export const settingSwitch = (page: Page, label: string): Locator =>
  page.getByRole('switch', { name: label, exact: true });

/** Saves the one pending change and waits for the server to have taken it. */
export const saveSettings = async (page: Page): Promise<void> => {
  const unsaved = page.getByRole('region', { name: 'Unsaved changes' });
  await expect(unsaved).toContainText('1 unsaved change');
  const answered = expectMutationAnswered(page, 'updateSpaceSettings');
  await unsaved.getByRole('button', { name: 'Save changes', exact: true }).click();
  await answered();
  await expect(page.getByText('Changes saved', { exact: true })).toBeVisible();
  await expect(unsaved).toBeHidden();
};

/** The space's settings as the server holds them (platform admin read). */
export const serverSettings = async (spaceId: string) => {
  const { lookup } = must(await readSpaceSettings(spaceId), `readSpaceSettings(${spaceId})`);
  return lookup.space!.settings;
};
