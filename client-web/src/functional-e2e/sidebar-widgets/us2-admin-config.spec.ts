// spec: workspace#040-sidebar-widget-config (specs/040-sidebar-widget-config/spec.md, US2)
// Admin configures each tab's sidebar in Space Settings > Layout, and members see exactly
// the saved composition. AS1-AS4 drive the per-phase Layout dialog as the Space admin and
// read the result back both through the API (persistence) and as a plain member (rendering).
// AS5-AS7 are API-level contract checks (authorization, validation, partial update).
// The fixture is seeded through the API (sidebar-widgets.helpers.ts).
// AS6 is the LAST test on purpose: it is `test.skip`ped until alkem-io/server#6571 ships, and
// once un-skipped a red run would otherwise skip every test after it in serial mode.

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { getGraphqlClient, TestUserManager } from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { SidebarWidget } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import {
  L0_DEFAULT_SIDEBARS,
  WIDGET_LABEL,
  expectInDocumentOrder,
  labelsOf,
  openLayoutDialog,
  openPersona,
  openTab,
  readStates,
  seedSidebarSpace,
  selectedWidgetLabels,
  spaceSidebar,
  teardownSidebarSpace,
  widgets,
  type SidebarFixture,
} from './sidebar-widgets.helpers';

// Admin sessions must never reach the public trace/video archive (see us2-expanded-card-switch).
test.use({ trace: 'off', video: 'off' });
test.describe.configure({ mode: 'serial' });

let fixture: SidebarFixture | undefined;
let adminContext: BrowserContext;
let memberContext: BrowserContext;
let admin: Page;
let member: Page;

/** `updateInnovationFlowState` through the shared lib document, as the given persona. */
const updateState = (
  role: TestUser,
  stateData: {
    innovationFlowStateID: string;
    displayName?: string;
    settings?: { sidebar: SidebarWidget[] };
  }
) =>
  graphqlErrorWrapper(
    (t: string | undefined) =>
      getGraphqlClient().UpdateInnovationFlowState(
        { stateData },
        { authorization: `Bearer ${t}` }
      ),
    role
  );

/** Loads the Space home page as `page` and returns the GraphQL operations it issued. */
async function loadHomeCollectingOperations(
  page: Page,
  spaceUrl: string
): Promise<string[]> {
  const operations: string[] = [];
  const onRequest = (request: { postData(): string | null }) => {
    const name = /"operationName":"([^"]+)"/.exec(request.postData() ?? '');
    if (name) operations.push(name[1]);
  };
  page.on('request', onRequest);
  try {
    await page.goto(spaceUrl);
    await expect(widgets(spaceSidebar(page)).updates).toBeVisible();
    await page.waitForLoadState('networkidle');
  } finally {
    page.off('request', onRequest);
  }
  return operations;
}

test.describe('@forge-acceptance US2 — admin sidebar configuration (Space Settings > Layout)', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    fixture = await seedSidebarSpace('us2-sidebar-widgets');
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
    await teardownSidebarSpace(fixture?.scenario);
  });

  test('US2-AS1 — Layout dialog lists the whole vocabulary by name, with the current selection in its stored order', async () => {
    const dialog = await openLayoutDialog(admin, fixture!.spaceUrl, 'Home');
    const toggles = await dialog
      .getByRole('checkbox')
      .evaluateAll(els => els.map(el => el.getAttribute('aria-label') ?? ''));
    expect([...toggles].sort()).toEqual(
      Object.values(WIDGET_LABEL)
        .map(label => `Toggle ${label}`)
        .sort()
    );
    expect(await selectedWidgetLabels(dialog)).toEqual(
      labelsOf(L0_DEFAULT_SIDEBARS[0])
    );
    await expect(dialog.getByRole('checkbox', { checked: true })).toHaveCount(
      L0_DEFAULT_SIDEBARS[0].length
    );
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });

  test('US2-AS2 — removing Upcoming Events from Home persists, stops its data request, and leaves every other tab unchanged', async () => {
    const f = fixture!;
    const before = await readStates(f.scenario.space.id);
    const memberHome = widgets(spaceSidebar(member));

    // Positive control: the widget renders and its request fires while configured.
    const opsWhileConfigured = await loadHomeCollectingOperations(
      member,
      f.spaceUrl
    );
    await expect(memberHome.events).toBeVisible();
    expect(opsWhileConfigured).toContain('SpaceCalendarEvents');

    const dialog = await openLayoutDialog(admin, f.spaceUrl, 'Home');
    await dialog
      .getByRole('checkbox', { name: 'Toggle Upcoming Events' })
      .uncheck();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();

    const after = await readStates(f.scenario.space.id);
    expect(after[0].settings.sidebar).toEqual(
      L0_DEFAULT_SIDEBARS[0].filter(w => w !== SidebarWidget.Events)
    );
    expect(after.slice(1).map(s => s.settings.sidebar)).toEqual(
      before.slice(1).map(s => s.settings.sidebar)
    );

    const opsAfterRemoval = await loadHomeCollectingOperations(
      member,
      f.spaceUrl
    );
    await expect(memberHome.events).toHaveCount(0);
    await expect(
      spaceSidebar(member).getByRole('button', { name: f.eventTitle })
    ).toHaveCount(0);
    await expectInDocumentOrder([
      memberHome.intent,
      memberHome.about,
      memberHome.search,
      memberHome.subspaceLinks,
      memberHome.updates,
    ]);
    // FR-019 / SC-008: no data request for a widget the tab does not configure.
    expect(opsAfterRemoval).not.toContain('SpaceCalendarEvents');
  });

  test('US2-AS3 — adding Upcoming Events to Community and moving it to the top renders it first, then the rest in saved order', async () => {
    const f = fixture!;
    const dialog = await openLayoutDialog(admin, f.spaceUrl, 'Community');
    await dialog
      .getByRole('checkbox', { name: 'Toggle Upcoming Events' })
      .check();
    // dnd-kit keyboard sensor: lift, one step up, drop — repeated until the row leads.
    const handle = dialog.getByRole('button', {
      name: 'Reorder Upcoming Events',
    });
    await expect
      .poll(
        async () => {
          await handle.focus();
          await admin.keyboard.press('Space');
          await admin.keyboard.press('ArrowUp');
          await admin.keyboard.press('Space');
          return (await selectedWidgetLabels(dialog))[0];
        },
        { timeout: 20_000 }
      )
      .toBe(WIDGET_LABEL[SidebarWidget.Events]);
    const expected = [SidebarWidget.Events, ...L0_DEFAULT_SIDEBARS[1]];
    expect(await selectedWidgetLabels(dialog)).toEqual(labelsOf(expected));
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();

    const after = await readStates(f.scenario.space.id);
    expect(after[1].settings.sidebar).toEqual(expected);

    // The member's next visit is a fresh page load; an already-open page keeps the
    // Space's tab data it loaded before the admin saved.
    await member.goto(f.spaceUrl);
    await openTab(member, f.spaceUrl, 'Community');
    const sidebar = spaceSidebar(member);
    const w = widgets(sidebar);
    await expectInDocumentOrder([
      w.events,
      w.intent,
      w.search,
      w.contactLeads,
      sidebar.getByRole('heading', { name: f.guidelinesTitle }),
    ]);
    await expect(
      sidebar.getByRole('button', { name: f.eventTitle })
    ).toBeVisible();
  });

  test('US2-AS4 — deselecting every widget on Subspaces empties that sidebar while the tab content still works', async () => {
    const f = fixture!;
    // Positive control: the tab has a sidebar before the change.
    await openTab(member, f.spaceUrl, 'Subspaces');
    await expect(widgets(spaceSidebar(member)).intent).toBeVisible();

    const dialog = await openLayoutDialog(admin, f.spaceUrl, 'Subspaces');
    for (const label of await selectedWidgetLabels(dialog)) {
      await dialog.getByRole('checkbox', { name: `Toggle ${label}` }).uncheck();
    }
    await expect(dialog.getByText(/^No widgets selected/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();

    const after = await readStates(f.scenario.space.id);
    expect(after[2].settings.sidebar).toEqual([]);

    await member.goto(f.spaceUrl);
    await openTab(member, f.spaceUrl, 'Subspaces');
    const w = widgets(spaceSidebar(member));
    for (const absent of Object.values(w)) {
      await expect(absent).toHaveCount(0);
    }
    await expect(
      member
        .getByRole('region', { name: 'Space content feed' })
        .getByText(f.subspaceName)
        .first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('US2-AS5 — a plain member cannot change a sidebar through the API and the stored list is unchanged', async () => {
    const f = fixture!;
    const [home] = await readStates(f.scenario.space.id);
    const res = await updateState(TestUser.SPACE_MEMBER, {
      innovationFlowStateID: home.id,
      settings: { sidebar: [SidebarWidget.Intent] },
    });
    expect(res.error?.errors[0]).toEqual(
      expect.objectContaining({
        code: 'FORBIDDEN_POLICY',
        message: expect.stringContaining("unable to grant 'update' privilege"),
      })
    );
    const [homeAfter] = await readStates(f.scenario.space.id);
    expect(homeAfter.settings.sidebar).toEqual(home.settings.sidebar);
  });

  test('US2-AS7 — duplicate and unknown widget IDs are rejected with a validation error and leave stored data unchanged', async () => {
    // The 20-entry cap of FR-005 is unreachable through the API: input is enum-typed and
    // duplicates are rejected, so no valid list exceeds the 14-value vocabulary (QA-PF-03,
    // recorded in the plan). It is pinned by the server's DTO unit spec only.
    const f = fixture!;
    const [home] = await readStates(f.scenario.space.id);

    const duplicate = await updateState(TestUser.SPACE_ADMIN, {
      innovationFlowStateID: home.id,
      settings: { sidebar: [SidebarWidget.Intent, SidebarWidget.Intent] },
    });
    expect(duplicate.error?.errors[0]).toEqual(
      expect.objectContaining({
        code: 'BAD_USER_INPUT',
        message: expect.stringMatching(/settings\.sidebar[\s\S]*arrayUnique/),
      })
    );
    expect((await readStates(f.scenario.space.id))[0].settings.sidebar).toEqual(
      home.settings.sidebar
    );

    const unknown = await updateState(TestUser.SPACE_ADMIN, {
      innovationFlowStateID: home.id,
      settings: { sidebar: ['BOGUS_WIDGET' as SidebarWidget] },
    });
    expect(unknown.error?.errors[0]).toEqual(
      expect.objectContaining({
        code: 'BAD_USER_INPUT',
        message: 'Invalid value supplied for a GraphQL variable',
      })
    );
    expect((await readStates(f.scenario.space.id))[0].settings.sidebar).toEqual(
      home.settings.sidebar
    );
  });

  // Product finding QA-PF-01 — https://github.com/alkem-io/server/issues/6571
  // Skipped by decision of the QA lead (2026-10-01): the concurrent read-modify-write in
  // updateInnovationFlowState silently drops the sidebar-only save (reproduced 12/12 on
  // server develop @ 615817441). Un-skip when alkem-io/server#6571 ships; the assertions
  // below are the acceptance oracle for that fix and must not be softened.
  test.skip('US2-AS6 — a sidebar-only save and a concurrent rename by another admin both persist', async () => {
    const f = fixture!;
    const knowledge = (await readStates(f.scenario.space.id))[3];
    const sidebar = [SidebarWidget.Index, SidebarWidget.Intent];
    const displayName = `${knowledge.displayName} renamed`;

    const [sidebarSave, rename] = await Promise.all([
      updateState(TestUser.SPACE_ADMIN, {
        innovationFlowStateID: knowledge.id,
        settings: { sidebar },
      }),
      updateState(TestUser.GLOBAL_ADMIN, {
        innovationFlowStateID: knowledge.id,
        displayName,
      }),
    ]);
    expect(sidebarSave.error).toBeUndefined();
    expect(rename.error).toBeUndefined();

    const stored = (await readStates(f.scenario.space.id)).find(
      state => state.id === knowledge.id
    );
    expect(stored?.displayName).toBe(displayName);
    expect(stored?.settings.sidebar).toEqual(sidebar);
  });
});
