// spec: workspace#040-sidebar-widget-config (specs/040-sidebar-widget-config/spec.md, US1 + US4-AS2)
// Members keep the sidebar they know, now driven by per-tab configuration: each tab of a
// fresh L0 Space renders its FR-009 default list, in order, through the permission gating
// of FR-012. The fixture is seeded through the API (sidebar-widgets.helpers.ts); the UI is
// used only for what is under test, plus adding one tab through Settings > Layout (US4-AS2).
// US1-AS5 (missing / unknown stored entries) is not automated here — see the plan.

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import {
  GENERIC_DEFAULT_SIDEBAR,
  expectInDocumentOrder,
  openPersona,
  openTab,
  readStates,
  seedSidebarSpace,
  spaceSidebar,
  teardownSidebarSpace,
  widgets,
  type SidebarFixture,
} from './sidebar-widgets.helpers';

// Admin sessions must never reach the public trace/video archive (see us2-expanded-card-switch).
test.use({ trace: 'off', video: 'off' });
test.describe.configure({ mode: 'serial' });

const EXTRA_TAB = 'Extra';

let fixture: SidebarFixture | undefined;
let adminContext: BrowserContext;
let memberContext: BrowserContext;
let admin: Page;
let member: Page;

test.describe('@forge-acceptance US1 — default sidebar rendering (per-tab widget config)', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    fixture = await seedSidebarSpace('us1-sidebar-widgets');
    ({ context: adminContext, page: admin } = await openPersona(
      browser,
      TestUserManager.users.spaceAdmin.email
    ));
    ({ context: memberContext, page: member } = await openPersona(
      browser,
      TestUserManager.users.spaceMember.email
    ));

    // US4-AS2 arrange: an admin adds a 5th tab through Settings > Layout.
    await admin.goto(`${fixture.spaceUrl}/settings/layout`);
    await admin.getByRole('button', { name: 'Add tab' }).click();
    const addTab = admin.getByRole('dialog', { name: 'Add a new tab' });
    await addTab.getByRole('textbox', { name: 'Tab name' }).fill(EXTRA_TAB);
    await addTab.getByRole('button', { name: 'Add tab' }).click();
    await expect(admin.getByTitle(EXTRA_TAB, { exact: true })).toBeVisible();
  });

  test.afterAll(async () => {
    await adminContext?.close();
    await memberContext?.close();
    await teardownSidebarSpace(fixture?.scenario);
  });

  test('US1-AS1 — Home tab renders Intention & Leads, About, Search, Subspaces, Events, Update in order', async () => {
    const f = fixture!;
    await openTab(member, f.spaceUrl, 'Home');
    const sidebar = spaceSidebar(member);
    const w = widgets(sidebar);
    await expectInDocumentOrder([
      w.intent,
      w.about,
      w.search,
      w.subspaceLinks,
      w.events,
      w.updates,
    ]);
    // Each configured widget shows its own data, not just its frame.
    await expect(
      sidebar.getByRole('link', { name: f.subspaceName })
    ).toBeVisible();
    await expect(
      sidebar.getByRole('button', { name: f.eventTitle })
    ).toBeVisible();
    await expect(sidebar.getByText(f.updateText)).toBeVisible();
    // No other tab's widgets leak onto Home.
    for (const absent of [w.contactLeads, w.index, w.virtualContributors]) {
      await expect(absent).toHaveCount(0);
    }
  });

  test('US1-AS2 — Community tab renders Intention & Leads, Search, Contact Leads, Guidelines in order', async () => {
    const f = fixture!;
    await openTab(member, f.spaceUrl, 'Community');
    const sidebar = spaceSidebar(member);
    const w = widgets(sidebar);
    const guidelines = sidebar.getByRole('heading', {
      name: f.guidelinesTitle,
    });
    await expectInDocumentOrder([
      w.intent,
      w.search,
      w.contactLeads,
      guidelines,
    ]);
    // Configured but gated (FR-012): a plain member may not invite, and the Space has no VCs.
    await expect(w.addUser).toHaveCount(0);
    await expect(w.virtualContributors).toHaveCount(0);
    // Home-only widgets (present on Home, US1-AS1) do not leak here.
    for (const absent of [
      w.about,
      w.subspaceLinks,
      w.events,
      w.updates,
      w.index,
    ]) {
      await expect(absent).toHaveCount(0);
    }
  });

  test('US1-AS3 — Subspaces tab renders Intention & Leads then Search, and nothing from tabs 1, 2 or 4', async () => {
    const f = fixture!;
    await openTab(member, f.spaceUrl, 'Subspaces');
    const sidebar = spaceSidebar(member);
    const w = widgets(sidebar);
    await expectInDocumentOrder([w.intent, w.search]);
    for (const absent of [
      w.about,
      w.subspaceLinks,
      w.events,
      w.updates,
      w.contactLeads,
      sidebar.getByRole('heading', { name: f.guidelinesTitle }),
      w.index,
    ]) {
      await expect(absent).toHaveCount(0);
    }
  });

  test('US1-AS4 — Knowledge and an added tab render Intention & Leads, Search, Post Index in order; Post Index opens', async () => {
    const f = fixture!;
    for (const tab of ['Knowledge', EXTRA_TAB]) {
      await openTab(member, f.spaceUrl, tab);
      const sidebar = spaceSidebar(member);
      const w = widgets(sidebar);
      await expectInDocumentOrder([w.intent, w.search, w.index]);
      for (const absent of [
        w.about,
        w.subspaceLinks,
        w.events,
        w.updates,
        w.contactLeads,
      ]) {
        await expect(absent).toHaveCount(0);
      }
      await w.index.click();
      const dialog = member.getByRole('dialog', { name: 'Post Index' });
      await expect(dialog).toBeVisible();
      await member.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
  });

  test('US4-AS2 — a tab added through Settings > Layout stores the generic default', async () => {
    const states = await readStates(fixture!.scenario.space.id);
    const extra = states.find(state => state.displayName === EXTRA_TAB);
    expect(extra?.settings.sidebar).toEqual(GENERIC_DEFAULT_SIDEBAR);
  });

  test('FR-012 / story visibility rule — action widgets render for the Space admin but not for a plain member', async () => {
    const f = fixture!;
    // Positive controls: the admin sees the configured action widgets...
    await openTab(admin, f.spaceUrl, 'Home');
    await expect(widgets(spaceSidebar(admin)).createPost).toBeVisible();
    await openTab(admin, f.spaceUrl, 'Subspaces');
    await expect(widgets(spaceSidebar(admin)).createSubspace).toBeVisible();
    // ...the member, on the same tabs and the same configuration, does not.
    await openTab(member, f.spaceUrl, 'Home');
    await expect(widgets(spaceSidebar(member)).intent).toBeVisible();
    await expect(widgets(spaceSidebar(member)).createPost).toHaveCount(0);
    await openTab(member, f.spaceUrl, 'Subspaces');
    await expect(widgets(spaceSidebar(member)).intent).toBeVisible();
    await expect(widgets(spaceSidebar(member)).createSubspace).toHaveCount(0);
  });
});
