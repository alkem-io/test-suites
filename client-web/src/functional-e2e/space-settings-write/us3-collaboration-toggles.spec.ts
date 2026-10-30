// spec: client-web/src/functional-e2e/space-settings-write/space-settings-write-test-plan.md
// W2 journey 4 (docs/qa/server-rebuild/plan.md § W2), collaboration toggles:
// Video Calls, Create Posts, Create Subspaces.

import { test, expect, type Locator, type Page } from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  baseUrl,
  calloutHeading,
  openPersonaPage,
  spaceSidebar,
  teardownScenario,
  type PersonaPage,
} from '../helpers/space-access.helper';
import {
  openSettingsTab,
  saveSettings,
  seedSettingsScenario,
  serverSettings,
  settingSwitch,
} from './space-settings-write.helpers';

/**
 * Three "Allowed Actions" switches whose effect a plain MEMBER can see:
 *
 *   Video Calls     (allowMembersToVideoCall)        — the "Video Call" link in the Space tabs
 *   Create Posts    (allowMembersToCreateCallouts)   — "Add Post" in the Space sidebar
 *   Create Subspaces(allowMembersToCreateSubspaces)  — "Create Subspace" in the Subspaces tab sidebar
 *
 * Each case turns one switch to the non-default value and back, saving each
 * time; the server's settings and the member's view must follow both ways.
 * The member's view is read only once the Space's callout has rendered for
 * them — the positive control that makes a missing control an observation.
 *
 *   admin `space.admin` · member `space.member`
 * The admin is never the oracle: an admin sees all three regardless.
 */
let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;
let member: PersonaPage | undefined;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  scenario = await seedSettingsScenario('col');
  admin = await openPersonaPage(browser, TestUserManager.users.spaceAdmin.email);
  member = await openPersonaPage(browser, TestUserManager.users.spaceMember.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await admin?.close();
  await member?.close();
  await teardownScenario(scenario);
  scenario = undefined;
});

const space = () => scenario!.space;

/** Opens the Space as the member on `tab`, waits for the feed, returns the page. */
const memberOn = async (tab: 'Home' | 'Subspaces'): Promise<Page> => {
  const page = member!.page;
  await page.goto(`${baseUrl}/${space().nameId}`);
  await expect(calloutHeading(page, space().collaboration.calloutPostDisplayName)).toBeVisible();
  if (tab !== 'Home') {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('tab', { name: tab, selected: true })).toBeVisible();
  }
  await expect(spaceSidebar(page).getByRole('searchbox', { name: 'Search posts' })).toBeVisible();
  return page;
};

const flip = async (label: string, to: boolean) => {
  const page = admin!.page;
  await openSettingsTab(page, space().nameId);
  const toggle = settingSwitch(page, label);
  await expect(toggle).toHaveAttribute('aria-checked', String(!to));
  await toggle.click();
  await saveSettings(page);
  await page.reload();
  await expect(settingSwitch(page, label)).toHaveAttribute('aria-checked', String(to));
};

type Case = {
  id: string;
  label: string;
  field: 'allowMembersToVideoCall' | 'allowMembersToCreateCallouts' | 'allowMembersToCreateSubspaces';
  seeded: boolean;
  tab: 'Home' | 'Subspaces';
  control: (page: Page) => Locator;
};

const CASES: Case[] = [
  {
    id: 'C4-1',
    label: 'Video Calls',
    field: 'allowMembersToVideoCall',
    seeded: true,
    tab: 'Home',
    control: page =>
      page
        .getByRole('navigation', { name: 'Space navigation tabs' })
        .getByRole('link', { name: 'Video Call', exact: true }),
  },
  {
    id: 'C4-2',
    label: 'Create Posts',
    field: 'allowMembersToCreateCallouts',
    seeded: false,
    tab: 'Home',
    control: page => spaceSidebar(page).getByRole('button', { name: 'Add Post', exact: true }),
  },
  {
    id: 'C4-3',
    label: 'Create Subspaces',
    field: 'allowMembersToCreateSubspaces',
    seeded: false,
    tab: 'Subspaces',
    control: page => spaceSidebar(page).getByRole('button', { name: 'Create Subspace', exact: true }),
  },
];

const expectControl = async (c: Case, shown: boolean) => {
  const page = await memberOn(c.tab);
  if (shown) await expect(c.control(page)).toBeVisible();
  else await expect(c.control(page)).toHaveCount(0);
};

test.describe('W2 journey 4 — collaboration toggles, changed in Space settings', () => {
  for (const c of CASES) {
    test(`${c.id} "${c.label}" ${c.seeded ? 'off and on' : 'on and off'}: saved and read back each way, and the member's "${c.label}" control follows`, async () => {
      // Precondition — the seeded value, on the server and in the member's view.
      expect((await serverSettings(space().id)).collaboration[c.field]).toBe(c.seeded);
      await expectControl(c, c.seeded);

      await flip(c.label, !c.seeded);
      expect((await serverSettings(space().id)).collaboration[c.field]).toBe(!c.seeded);
      await expectControl(c, !c.seeded);

      await flip(c.label, c.seeded);
      expect((await serverSettings(space().id)).collaboration[c.field]).toBe(c.seeded);
      await expectControl(c, c.seeded);
    });
  }
});
