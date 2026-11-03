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
 * Create Posts and Create Subspaces are privileges the server grants to
 * MEMBERS (CreateCallout on the callouts set, CreateSubspace on the Space —
 * the client renders the button from them). While each is on, a NON-MEMBER
 * who can read the public Space must still not be given it: that is the
 * regression where the toggle is granted to every reader instead of to the
 * community. Video Calls has no such check: the client shows its link to any
 * viewer with READ once the setting is on (`useVideoCall`), so what a
 * non-member should see there is an open product question, not an oracle.
 *
 *   admin `space.admin` · member `space.member` · non-member `non.space`
 * The admin is never the oracle: an admin sees all three regardless.
 */
let scenario: OrganizationWithSpaceModel | undefined;
let admin: PersonaPage | undefined;
let member: PersonaPage | undefined;
let nonMember: PersonaPage | undefined;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  scenario = await seedSettingsScenario('col');
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

/** Opens the Space as `viewer` on `tab`, waits for the feed, returns the page. */
const viewerOn = async (viewer: PersonaPage, tab: 'Home' | 'Subspaces'): Promise<Page> => {
  const page = viewer.page;
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
  /** A members-only privilege: a non-member reader must not get the control while it is on. */
  membersOnly: boolean;
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
    membersOnly: false,
  },
  {
    id: 'C4-2',
    label: 'Create Posts',
    field: 'allowMembersToCreateCallouts',
    seeded: false,
    tab: 'Home',
    control: page => spaceSidebar(page).getByRole('button', { name: 'Add Post', exact: true }),
    membersOnly: true,
  },
  {
    id: 'C4-3',
    label: 'Create Subspaces',
    field: 'allowMembersToCreateSubspaces',
    seeded: false,
    tab: 'Subspaces',
    control: page => spaceSidebar(page).getByRole('button', { name: 'Create Subspace', exact: true }),
    membersOnly: true,
  },
];

const expectControl = async (c: Case, shown: boolean) => {
  const page = await viewerOn(member!, c.tab);
  if (shown) await expect(c.control(page)).toBeVisible();
  else await expect(c.control(page)).toHaveCount(0);
};

/** While the toggle is on: the non-member reads the Space (positive control) and has no control. */
const expectNoControlForNonMember = async (c: Case) => {
  const page = await viewerOn(nonMember!, c.tab);
  await expect(c.control(page), `non-member "${c.label}" control`).toHaveCount(0);
};

test.describe('W2 journey 4 — collaboration toggles, changed in Space settings', () => {
  for (const c of CASES) {
    test(`${c.id} "${c.label}" ${c.seeded ? 'off and on' : 'on and off'}: saved and read back each way, and the member's "${c.label}" control follows${c.membersOnly ? '; a non-member never gets it' : ''}`, async () => {
      // Precondition — the seeded value, on the server and in the member's view.
      expect((await serverSettings(space().id)).collaboration[c.field]).toBe(c.seeded);
      await expectControl(c, c.seeded);

      await flip(c.label, !c.seeded);
      expect((await serverSettings(space().id)).collaboration[c.field]).toBe(!c.seeded);
      await expectControl(c, !c.seeded);
      if (c.membersOnly) {
        // Members-only toggles are seeded off, so this is their "on" state.
        expect(c.seeded, `${c.id} is checked for non-members in its on state`).toBe(false);
        await expectNoControlForNonMember(c);
      }

      await flip(c.label, c.seeded);
      expect((await serverSettings(space().id)).collaboration[c.field]).toBe(c.seeded);
      await expectControl(c, c.seeded);
    });
  }
});
