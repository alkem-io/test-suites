// spec: workspace#086-subspace-sidebar-config (US5 — Community and Recent Activity join the
// L0 vocabulary). Plan row S-16 (sidebar-widgets-test-plan.md § 086).
// An L0 tab configured with COMMUNITY and ACTIVITY renders both buttons for a signed-in
// viewer and each opens its dialog; an anonymous viewer gets Community but no Recent Activity
// and no activity-log request (FR-007, D-11). The editor half (both labels offered on the L0
// Layout dialog) is covered by us2-admin-config.spec.ts › US2-AS1.
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import { SidebarWidget } from '@alkemio/tests-lib';
import { L0_DEFAULT_SIDEBARS, spaceSidebar } from './sidebar-widgets.helpers';
import {
  DESKTOP_VIEWPORT,
  openAnonymous,
  openPersona,
  readPhases,
  seedSubspaceFixture,
  setSidebar,
  teardownSubspaceFixture,
  type SubspaceFixture,
} from './subspace-sidebar.helpers';

test.use({ trace: 'off', video: 'off' });

let fixture: SubspaceFixture | undefined;
let memberContext: BrowserContext;
let member: Page;

const HOME_WITH_COMMUNITY_ACTIVITY = [
  ...L0_DEFAULT_SIDEBARS[0],
  SidebarWidget.Community,
  SidebarWidget.Activity,
];

test.describe('086 US5 — Community and Recent Activity on an L0 tab', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    fixture = await seedSubspaceFixture('086-us5-l0-community-activity');
    const home = (await readPhases(fixture.scenario.space.id)).phases[0];
    await setSidebar(home.id, HOME_WITH_COMMUNITY_ACTIVITY);
    ({ context: memberContext, page: member } = await openPersona(
      browser,
      TestUserManager.users.spaceMember.email
    ));
  });

  test.afterAll(async () => {
    await memberContext?.close();
    await teardownSubspaceFixture(fixture);
  });

  test('S-16 — a member sees Community and Recent Activity on the Home tab and each opens its dialog', async () => {
    const f = fixture!;
    await member.setViewportSize(DESKTOP_VIEWPORT);
    await member.goto(f.l0Url);
    const sidebar = spaceSidebar(member);
    const community = sidebar.getByRole('button', {
      name: 'Community',
      exact: true,
    });
    const activity = sidebar.getByRole('button', {
      name: 'Recent Activity',
      exact: true,
    });
    await expect(community).toBeVisible();
    await expect(activity).toBeVisible();

    await community.click();
    const communityDialog = member.getByRole('dialog', { name: 'Community' });
    await expect(communityDialog).toBeVisible();
    await member.keyboard.press('Escape');
    await expect(communityDialog).toBeHidden();

    await activity.click();
    const activityDialog = member.getByRole('dialog', {
      name: 'Recent Activity',
    });
    await expect(activityDialog).toBeVisible();
    await member.keyboard.press('Escape');
    await expect(activityDialog).toBeHidden();
  });

  test('S-16 — an anonymous viewer gets Community but no Recent Activity and no activity request', async ({
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
      await page.goto(f.l0Url);
      const sidebar = spaceSidebar(page);
      await expect(
        sidebar.getByRole('button', { name: 'Community', exact: true })
      ).toBeVisible(); // positive control
      await expect(
        sidebar.getByRole('button', { name: 'Recent Activity', exact: true })
      ).toHaveCount(0);
      await expect(page.getByRole('alert')).toHaveCount(0);
      // Control: the listener saw the page's GraphQL traffic, so the absence below is not vacuous.
      expect(
        graphqlBodies.length,
        'control: GraphQL requests must be captured'
      ).toBeGreaterThan(0);
      expect(
        graphqlBodies.filter(b => /activityLogOnCollaboration/i.test(b))
      ).toEqual([]);
    } finally {
      await context.close();
    }
  });
});
