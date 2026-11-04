// spec: workspace#086-subspace-sidebar-config (US3 — members use the configured subspace
// sidebar). Plan rows S-05 and S-06 (sidebar-widgets-test-plan.md § 086).
// S-05 is the decision table of the permission gates: configuration never grants an action.
// Anonymous × member × admin over Add Post, Create Subspace, Invite and Recent Activity, plus
// the member's missing entry points (no Customize Sidebar, no Settings route). S-06 renders
// an L0 tab list on an L1: Apply / Join is skipped on render and kept at its index on save.
// The member's privileges are read back over the API first, so a drifted fixture reads as
// such and not as a product red.
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { SidebarWidget } from '@alkemio/tests-lib';
import { L0_DEFAULT_SIDEBARS } from './sidebar-widgets.helpers';
import {
  myPrivileges,
  openAnonymous,
  openCustomizeSidebar,
  openPersona,
  openSettingsLayout,
  openSubspace,
  readPhases,
  readSidebar,
  restoreSubspaceFlow,
  seedSubspaceFixture,
  setSidebar,
  subspaceSidebar,
  subspaceWidgets,
  teardownSubspaceFixture,
  type SubspaceFixture,
} from './subspace-sidebar.helpers';

// Admin sessions must never reach the public trace/video archive.
test.use({ trace: 'off', video: 'off' });

let fixture: SubspaceFixture | undefined;
let adminContext: BrowserContext;
let memberContext: BrowserContext;
let admin: Page;
let member: Page;

test.describe('086 US3 — permission gates and out-of-vocabulary values on the configured sidebar', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    fixture = await seedSubspaceFixture('086-us3-subspace-widgets');
    ({ context: adminContext, page: admin } = await openPersona(
      browser,
      TestUserManager.users.spaceAdmin.email
    ));
    ({ context: memberContext, page: member } = await openPersona(
      browser,
      TestUserManager.users.spaceMember.email
    ));
  });

  test.beforeEach(async () => {
    await restoreSubspaceFlow(fixture!.alpha.id);
  });

  test.afterAll(async () => {
    await adminContext?.close();
    await memberContext?.close();
    try {
      if (fixture) await restoreSubspaceFlow(fixture.alpha.id);
    } finally {
      // A restore that throws must not leak the Space tree.
      await teardownSubspaceFixture(fixture);
    }
  });

  test('S-05 — gates are never granted by configuration: anonymous × member × admin over Add Post, Create Subspace, Invite, Recent Activity; a member has no entry point', async ({
    browser,
  }) => {
    const f = fixture!;
    const first = (await readPhases(f.alpha.id)).phases[0];
    await setSidebar(first.id, [
      SidebarWidget.CreatePost,
      SidebarWidget.CreateSubspace,
      SidebarWidget.AddUser,
      SidebarWidget.Activity,
    ]);
    // Precondition, not an assertion on the product: the member arm proves something only
    // while the member lacks the privileges behind the gates (Create Subspace ← CREATE_SUBSPACE,
    // Invite ← UPDATE, both on the space's own authorization); the fixture pins
    // allowMembersToCreateSubspaces=false for that. Add Post and Recent Activity being visible
    // for the member is the positive control (their privileges live on the callouts set).
    const memberPrivileges = await myPrivileges(
      f.alpha.id,
      TestUser.SPACE_MEMBER
    );
    expect(
      memberPrivileges,
      'fixture: the member must not hold CREATE_SUBSPACE'
    ).not.toContain('CREATE_SUBSPACE');
    expect(
      memberPrivileges,
      'fixture: the member must not hold UPDATE'
    ).not.toContain('UPDATE');

    // Anonymous: the sidebar renders (positive control) and shows none of the four.
    const anonymous = await openAnonymous(browser);
    try {
      await openSubspace(anonymous.page, f.alpha.url);
      const w = subspaceWidgets(subspaceSidebar(anonymous.page));
      await expect(w.collapse).toBeVisible();
      for (const gated of [
        w.createPost,
        w.createSubspace,
        w.addUser,
        w.activity,
      ]) {
        await expect(gated).toHaveCount(0);
      }
    } finally {
      await anonymous.context.close();
    }

    // Member: Add Post and Recent Activity, nothing that needs CREATE_SUBSPACE or UPDATE.
    await openSubspace(member, f.alpha.url);
    const m = subspaceWidgets(subspaceSidebar(member));
    await expect(m.createPost).toBeVisible();
    await expect(m.activity).toBeVisible();
    await expect(m.createSubspace).toHaveCount(0);
    await expect(m.addUser).toHaveCount(0);
    await expect(
      member.getByRole('button', { name: /Customize Sidebar/ })
    ).toHaveCount(0);
    await expect(
      member.getByRole('link', { name: 'Edit innovation flow' })
    ).toHaveCount(0);
    await expect(
      member.getByRole('link', { name: 'Settings', exact: true })
    ).toHaveCount(0);
    for (const path of ['/settings', '/settings/layout']) {
      await member.goto(`${f.alpha.url}${path}`);
      await expect(member.getByText('Access Restricted')).toBeVisible();
      await expect(
        member.getByRole('button', { name: 'Customize Sidebar' })
      ).toHaveCount(0);
    }

    // Admin: all four.
    await openSubspace(admin, f.alpha.url);
    const a = subspaceWidgets(subspaceSidebar(admin));
    for (const granted of [
      a.createPost,
      a.createSubspace,
      a.addUser,
      a.activity,
    ]) {
      await expect(granted).toBeVisible();
    }
  });

  test('S-06 — an L0 tab list on an L1: Apply / Join is skipped on render and kept at its index on save', async () => {
    const f = fixture!;
    const first = (await readPhases(f.alpha.id)).phases[0];
    const l0Tab1 = L0_DEFAULT_SIDEBARS[0];
    expect(l0Tab1).toContain(SidebarWidget.ApplicationButton); // the value outside the subspace vocabulary
    await setSidebar(first.id, l0Tab1);

    await openSubspace(member, f.alpha.url);
    const w = subspaceWidgets(subspaceSidebar(member));
    await expect(w.about).toBeVisible(); // positive control: the in-vocabulary neighbours render
    await expect(w.createPost).toBeVisible();
    await expect(
      subspaceSidebar(member).getByRole('button', { name: /apply|join/i })
    ).toHaveCount(0);

    await openSettingsLayout(admin, f.alpha.url);
    const dialog = await openCustomizeSidebar(admin);
    await expect(dialog.getByRole('checkbox', { name: /apply/i })).toHaveCount(
      0
    );
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(await readSidebar(f.alpha.id)).toEqual(l0Tab1);
  });
});
