// spec: workspace#086-subspace-sidebar-config (US2 — existing and new subspaces look exactly
// as before the upgrade). Plan rows S-01..S-04 (sidebar-widgets-test-plan.md § 086).
// A fresh L1 and L2 created from the platform subspace template render today's sidebar —
// About this Subspace, Add Post, the four Quick Actions, nested subspaces — in the expanded
// sidebar, the collapsed rail and the phone drawer, for an admin, a plain member and an
// anonymous viewer, with no search field. The fixture is seeded through the API
// (subspace-sidebar.helpers.ts); the UI is used only for what is under test.
import {
  test,
  expect,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import { expectInDocumentOrder } from './sidebar-widgets.helpers';
import {
  openAnonymous,
  openPersona,
  openPhoneDrawer,
  openSubspace,
  QUICK_ACTIONS,
  seedSubspaceFixture,
  sidebarEntries,
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

/**
 * Today's subspace sidebar: About this Subspace, Add Post, Quick Actions (Community, Events,
 * Recent Activity, Post Index), then the nested subspaces — in that order, and no search.
 * `addPost` and `recentActivity` are false for the viewers the gates hide them from.
 */
async function expectTodaysSidebar(
  root: Locator,
  opts: { addPost: boolean; recentActivity: boolean; nested: boolean }
) {
  const w = subspaceWidgets(root);
  await expect(w.about).toBeVisible();
  // Position 1, intent: the info block inside the parent-space stack, whose cards are links
  // named "Go to <parent>" (one per ancestor; the first places the widget).
  const intent = root.getByRole('link', { name: /^Go to / }).first();
  await expectInDocumentOrder([intent, w.about]);
  if (opts.addPost) {
    await expectInDocumentOrder([w.about, w.createPost, w.quickActions]);
  } else {
    await expect(w.createPost).toHaveCount(0);
    await expectInDocumentOrder([w.about, w.quickActions]);
  }
  const quick = QUICK_ACTIONS.filter(
    name => opts.recentActivity || name !== 'Recent Activity'
  ).map(name => w.quickActions.getByRole('button', { name, exact: true }));
  await expectInDocumentOrder(quick);
  if (!opts.recentActivity) await expect(w.activity).toHaveCount(0);
  if (opts.nested) {
    await expectInDocumentOrder([quick[quick.length - 1], w.subspaceLinks]);
  } else {
    await expect(w.subspaceLinks).toHaveCount(0);
  }
  // The subspace sidebar has no search field by default (055 placed SEARCH on L0 lists only).
  await expect(root.getByRole('searchbox')).toHaveCount(0);
  await expect(root.getByRole('textbox')).toHaveCount(0);
}

test.describe('086 US2 — untouched subspaces look as before', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    fixture = await seedSubspaceFixture('086-us2-subspace-defaults');
    ({ context: adminContext, page: admin } = await openPersona(
      browser,
      TestUserManager.users.spaceAdmin.email
    ));
    ({ context: memberContext, page: member } = await openPersona(
      browser,
      TestUserManager.users.spaceMember.email
    ));
  });

  test.afterAll(async () => {
    await adminContext?.close();
    await memberContext?.close();
    await teardownSubspaceFixture(fixture);
  });

  test('S-01 — admin: expanded sidebar, collapsed rail and phone drawer show today’s widgets in order, no search', async () => {
    const f = fixture!;
    await openSubspace(admin, f.alpha.url);
    const sidebar = subspaceSidebar(admin);
    await expectTodaysSidebar(sidebar, {
      addPost: true,
      recentActivity: true,
      nested: true,
    });

    // Collapsed rail: icon-only Add Post plus the four Quick Actions, still no search. The
    // collapsed state persists in localStorage (`menuState`) across the shared admin context,
    // so a red assertion in here must not leave the rail collapsed for the next case.
    const w = subspaceWidgets(sidebar);
    await w.collapse.click();
    try {
      await expect(w.expand).toBeVisible();
      await expect(w.createPost).toBeVisible();
      for (const name of QUICK_ACTIONS) {
        await expect(
          sidebar.getByRole('button', { name, exact: true })
        ).toBeVisible();
      }
      await expect(sidebar.getByRole('searchbox')).toHaveCount(0);
      // The rail in list order, ending with the nested L2's tile (US2-AS1 "same order").
      expect(await sidebarEntries(sidebar)).toEqual([
        'BUTTON:Expand',
        'BUTTON:Add Post',
        ...QUICK_ACTIONS.map(name => `BUTTON:${name}`),
        `A:Alpha-2 ${f.runId}`,
      ]);
    } finally {
      if (await w.expand.isVisible()) await w.expand.click();
    }
    await expect(w.collapse).toBeVisible();

    const drawer = await openPhoneDrawer(admin, f.alpha.url);
    await expectTodaysSidebar(drawer, {
      addPost: true,
      recentActivity: true,
      nested: true,
    });
  });

  test('S-02 — plain member: the same widgets, without any editing entry point', async () => {
    const f = fixture!;
    await openSubspace(member, f.alpha.url);
    const sidebar = subspaceSidebar(member);
    await expectTodaysSidebar(sidebar, {
      addPost: true,
      recentActivity: true,
      nested: true,
    });
    await expect(
      sidebar.getByRole('button', { name: 'Edit description' })
    ).toHaveCount(0);
    await expect(
      member.getByRole('button', { name: /Customize Sidebar/ })
    ).toHaveCount(0);
    await expect(
      member.getByRole('link', { name: 'Edit innovation flow' })
    ).toHaveCount(0);
    await expect(
      member.getByRole('link', { name: 'Settings', exact: true })
    ).toHaveCount(0);

    const drawer = await openPhoneDrawer(member, f.alpha.url);
    await expectTodaysSidebar(drawer, {
      addPost: true,
      recentActivity: true,
      nested: true,
    });
    await expect(
      drawer.getByRole('link', { name: 'Edit innovation flow' })
    ).toHaveCount(0);
  });

  test('S-03 — anonymous viewer: the same widgets minus Add Post and Recent Activity, no error notice, no activity request', async ({
    browser,
  }) => {
    const f = fixture!;
    const { context, page } = await openAnonymous(browser);
    // Raw bodies, not operation names: the field name is matched wherever it appears.
    const graphqlBodies: string[] = [];
    page.on('request', request => {
      if (request.url().includes('graphql')) {
        graphqlBodies.push(request.postData() ?? '');
      }
    });
    try {
      await openSubspace(page, f.alpha.url);
      await expectTodaysSidebar(subspaceSidebar(page), {
        addPost: false,
        recentActivity: false,
        nested: true,
      });
      await expect(page.getByRole('alert')).toHaveCount(0);
      // Control: the listener saw the page's GraphQL traffic, so the absence below is not vacuous.
      expect(
        graphqlBodies.length,
        'control: GraphQL requests must be captured'
      ).toBeGreaterThan(0);
      // FR-021: a viewer the gate hides Recent Activity from issues no activity-log request.
      expect(
        graphqlBodies.filter(b => /activityLogOnCollaboration/i.test(b))
      ).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('S-04 — an L2 subspace renders today’s sidebar too, without a nested-subspaces section', async () => {
    const f = fixture!;
    await openSubspace(admin, f.alpha2.url);
    await expectTodaysSidebar(subspaceSidebar(admin), {
      addPost: true,
      recentActivity: true,
      nested: false,
    });
    await openSubspace(member, f.alpha2.url);
    await expectTodaysSidebar(subspaceSidebar(member), {
      addPost: true,
      recentActivity: true,
      nested: false,
    });
  });
});
