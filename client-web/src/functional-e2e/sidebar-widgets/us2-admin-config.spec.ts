// spec: workspace#040-sidebar-widget-config (specs/040-sidebar-widget-config/spec.md, US2)
// Acceptance walk for User Story 2 — "Admin configures each tab's sidebar".
// Builds a Space with fixture content (subspace, future event, community
// update, guidelines) purely through the product UI, then drives the
// per-phase Layout dialog's widget editor as admin and confirms the
// member-facing tab reflects exactly the saved composition. AS5-AS7 are
// proven at the API layer (authorization + partial-update + validation
// contract), matching how the spec itself frames those scenarios ("via API").

import { test, expect, type APIRequestContext } from '@playwright/test';
import { TestScenarioFactory, TestUserManager } from '@alkemio/tests-lib';
import {
  HomePage,
  MyAccountPage,
  CreateSpaceDialog,
  SpacePage,
  SpaceSettingsPage,
} from '@src/functional-e2e/space/pages';
import { acceptCookiesIfVisible } from '@src/functional-e2e/helpers/cookies.helper';
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const graphqlUrl = `${baseUrl}/api/private/graphql`;

const admin = createAuthenticatedSessionFixture({
  storageStateName: 'us2-sidebar-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});
const member = createAuthenticatedSessionFixture({
  storageStateName: 'us2-sidebar-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

let spaceName: string;
let spaceUrl: string;
let spaceId: string;
let homeStateId: string;
let communityStateId: string;

type FlowState = {
  id: string;
  displayName: string;
  sortOrder: number;
  settings: { sidebar: string[] };
};

async function fetchStates(request: APIRequestContext): Promise<FlowState[]> {
  const query = `
    query Us2VerifyStates($spaceId: [UUID!]!) {
      spaces(IDs: $spaceId) {
        collaboration { innovationFlow { states { id displayName sortOrder settings { sidebar } } } }
      }
    }
  `;
  const res = await request.post(graphqlUrl, {
    data: { query, variables: { spaceId: [spaceId] } },
  });
  // Guard the transport before parsing — a 401/502 here should name itself
  // instead of surfacing as a TypeError on `body.data`.
  if (!res.ok()) {
    throw new Error(
      `fetchStates: HTTP ${res.status()} from ${graphqlUrl}: ${await res.text()}`
    );
  }
  const body = await res.json();
  const states = body?.data?.spaces?.[0]?.collaboration?.innovationFlow?.states;
  if (!states) {
    throw new Error(
      `fetchStates: no states in GraphQL payload: ${JSON.stringify(
        body?.errors ?? body
      )}`
    );
  }
  return states;
}

async function updateState(
  request: APIRequestContext,
  stateData: Record<string, unknown>
): Promise<{ status: number; body: any }> {
  const mutation = `
    mutation Us2VerifyUpdateState($stateData: UpdateInnovationFlowStateInput!) {
      updateInnovationFlowState(stateData: $stateData) {
        id displayName settings { sidebar }
      }
    }
  `;
  const res = await request.post(graphqlUrl, {
    data: { query: mutation, variables: { stateData } },
    // Negative scenarios (AS5/AS7) assert on the error payload — never throw on
    // a non-2xx status; callers inspect the returned `status`/`body` instead.
    failOnStatusCode: false,
  });
  return { status: res.status(), body: await res.json() };
}

test.describe('@forge-acceptance US2 — admin sidebar configuration (Space Settings > Layout)', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);

    await TestScenarioFactory.createBaseScenarioEmpty({
      name: 'us2-sidebar-widgets',
    });

    await admin.setupAuthentication(
      browser,
      TestUserManager.users.globalAdmin.email
    );
    await member.setupAuthentication(
      browser,
      TestUserManager.users.qaUser.email
    );

    const adminPage = admin.getSharedPage();
    const uniqueId = Date.now().toString().slice(-6);
    spaceName = `US2 Sidebar Space ${uniqueId}`;
    spaceUrl = `us2-sidebar-${uniqueId}`;

    const homePage = new HomePage(adminPage, baseUrl);
    const myAccountPage = new MyAccountPage(adminPage, baseUrl);
    const createSpaceDialog = new CreateSpaceDialog(adminPage);
    const spacePage = new SpacePage(adminPage, baseUrl);

    await homePage.navigateToMyAccount();
    await myAccountPage.openCreateSpaceDialog();
    await createSpaceDialog.waitForVisible();
    await createSpaceDialog.createSpace(spaceName, spaceUrl);
    await createSpaceDialog.waitForHidden();
    await adminPage.waitForURL(new RegExp(`.*/${spaceUrl}.*`));
    await spacePage.waitForSpaceReady();
    await spacePage.dismissSuccessDialog();

    // --- Subspace (feeds subspaceLinks on Home) -----------------------------
    await adminPage.goto(`${baseUrl}/${spaceUrl}/subspaces`);
    await acceptCookiesIfVisible(adminPage);
    await adminPage.getByRole('button', { name: 'CREATE SUBSPACE' }).click();
    const subspaceDialog = adminPage.getByRole('dialog', {
      name: 'Create new Subspace',
    });
    await subspaceDialog
      .getByRole('textbox', { name: 'Name' })
      .fill('US2 Sub One');
    await subspaceDialog
      .getByRole('button', { name: 'CREATE SUBSPACE' })
      .click();
    await expect(adminPage.getByText('US2 Sub One')).toBeVisible({
      timeout: 15_000,
    });

    // --- Future calendar event (feeds events on Home) -----------------------
    await adminPage.goto(`${baseUrl}/${spaceUrl}`);
    await acceptCookiesIfVisible(adminPage);
    const homeSidebar = adminPage.locator('#crd-space-sidebar-desktop');
    await homeSidebar.getByRole('button', { name: 'Add event' }).click();
    const eventDialog = adminPage.getByRole('dialog', { name: 'Add event' });
    await eventDialog
      .getByRole('textbox', { name: 'Title' })
      .fill('US2 Kickoff Call');
    await eventDialog.getByRole('button', { name: /Start date/ }).click();
    await adminPage.getByRole('button', { name: 'Go to next month' }).click();
    await adminPage.getByRole('gridcell', { name: '15', exact: true }).click();
    await eventDialog.getByRole('combobox', { name: 'Type' }).click();
    await adminPage.getByRole('option', { name: 'Meeting' }).click();
    await eventDialog.getByRole('button', { name: 'Save' }).click();
    await expect(eventDialog).toBeHidden({ timeout: 10_000 });
    await adminPage.keyboard.press('Escape');

    // --- Community guidelines (feeds guidelines on Community) ---------------
    await adminPage.goto(
      `${baseUrl}/${spaceUrl}/settings/community#guidelines`
    );
    await acceptCookiesIfVisible(adminPage);
    await adminPage
      .getByRole('textbox', { name: 'Title' })
      .fill(`${spaceName} Guidelines`);
    await adminPage.locator('[contenteditable="true"]').first().click();
    await adminPage.keyboard.type('Be respectful and collaborative.');
    await adminPage.getByRole('button', { name: 'SAVE GUIDELINES' }).click();
    await expect(
      adminPage.getByText('Community guidelines updated successfully.')
    ).toBeVisible({
      timeout: 10_000,
    });

    // --- Invite the member persona ------------------------------------------
    await adminPage.goto(`${baseUrl}/${spaceUrl}/settings/community`);
    await acceptCookiesIfVisible(adminPage);
    await adminPage
      .getByRole('button', { name: 'Invite', exact: true })
      .click();
    const inviteDialog = adminPage.getByRole('dialog', {
      name: /Invite others/,
    });
    await inviteDialog
      .getByRole('textbox', { name: 'Search for users by name or email' })
      .fill(TestUserManager.users.qaUser.email);
    await inviteDialog.getByRole('button', { name: /qa/i }).click();
    await inviteDialog.getByRole('button', { name: 'Send' }).click();
    await expect(inviteDialog.getByText('Invitation sent')).toBeVisible({
      timeout: 10_000,
    });
    await inviteDialog.getByRole('button', { name: 'Close' }).click();

    const memberPage = member.getSharedPage();
    await memberPage.goto(`${baseUrl}/home`);
    await acceptCookiesIfVisible(memberPage);
    await memberPage.getByRole('link', { name: 'Invitations' }).click();
    await memberPage.getByRole('button', { name: 'ACCEPT' }).click();
    await expect(memberPage.getByText(spaceName)).toBeVisible({
      timeout: 15_000,
    });

    // --- Resolve space + state IDs for the API-driven scenarios (AS5-AS7) ---
    const request = adminPage.context().request;
    const spacesRes = await request.post(graphqlUrl, {
      data: {
        query:
          'query Us2VerifySpaceId { spaces(filter: {}) { id about { profile { url } } } }',
      },
    });
    const spacesBody = await spacesRes.json();
    const found = (
      spacesBody?.data?.spaces as
        | {
            id: string;
            about: { profile: { url: string } };
          }[]
        | undefined
    )?.find(s => s.about.profile.url.includes(spaceUrl));
    if (!found) throw new Error(`Could not resolve spaceId for ${spaceUrl}`);
    spaceId = found.id;

    const states = await fetchStates(request);
    const byOrder = [...states].sort((a, b) => a.sortOrder - b.sortOrder);
    homeStateId = byOrder[0].id;
    communityStateId = byOrder[1].id;
  });

  test.afterAll(async () => {
    const adminPage = admin.getSharedPage();
    if (spaceUrl) {
      const spacePage = new SpacePage(adminPage, baseUrl);
      const spaceSettingsPage = new SpaceSettingsPage(adminPage);
      await spacePage.goto(spaceUrl).catch(() => {});
      await spacePage.navigateToSettings().catch(() => {});
      await spaceSettingsPage.deleteSpace().catch(() => {});
    }
    await admin.teardownAuthentication();
    await member.teardownAuthentication();
  });

  test('US2-AS1 — Layout dialog lists the full widget vocabulary, localized, pre-filled', async () => {
    const adminPage = admin.getSharedPage();
    await adminPage.goto(`${baseUrl}/${spaceUrl}/settings/layout`);
    await acceptCookiesIfVisible(adminPage);

    await adminPage.getByRole('heading', { name: 'Home', level: 3 }).waitFor();
    const homeColumn = adminPage
      .locator('div', {
        has: adminPage.getByRole('heading', { name: 'Home', level: 3 }),
      })
      .first();
    await homeColumn.getByRole('button', { name: 'Column actions' }).click();
    await adminPage.getByRole('menuitem', { name: 'Layout' }).click();

    const dialog = adminPage.getByRole('dialog', { name: 'Layout: Home' });
    await expect(dialog).toBeVisible();

    // Full vocabulary — all 12 widgets, localized labels (FR-001/FR-014; `Add Post`
    // (createPost) and `Apply / Join` (applicationButton) are operator-requested
    // widgets added after the initial spec).
    const widgetLabels = [
      'Intention & Leads',
      'About this Space',
      'Add Post',
      'Apply / Join',
      'Subspaces',
      'Upcoming Events',
      'Latest Update',
      'Contact Leads',
      'Invite',
      'Virtual Contributors',
      'Community Guidelines',
      'Post Index',
    ];
    for (const label of widgetLabels) {
      await expect(dialog.getByText(label, { exact: true })).toBeAttached();
    }

    // Current selection pre-filled — the FR-009 Home default has 7 checked widgets:
    // intent, about, createPost, applicationButton, subspaceLinks, events, updates.
    const checkedBoxes = dialog.locator('[role="list"] li').filter({
      has: adminPage.locator(
        'button[aria-checked="true"], [data-state="checked"]'
      ),
    });
    await expect(checkedBoxes).toHaveCount(7);
    await expect(
      dialog.getByText('Upcoming Events', { exact: true })
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
  });

  test('US2-AS2 — removing Upcoming Events from Home persists and leaves other tabs unchanged', async () => {
    const adminPage = admin.getSharedPage();
    await adminPage.goto(`${baseUrl}/${spaceUrl}/settings/layout`);
    await acceptCookiesIfVisible(adminPage);

    const homeColumn = adminPage
      .locator('div', {
        has: adminPage.getByRole('heading', { name: 'Home', level: 3 }),
      })
      .first();
    await homeColumn.getByRole('button', { name: 'Column actions' }).click();
    await adminPage.getByRole('menuitem', { name: 'Layout' }).click();

    const dialog = adminPage.getByRole('dialog', { name: 'Layout: Home' });
    await dialog
      .getByRole('checkbox', { name: 'Toggle Upcoming Events' })
      .click();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    // Member reopens tab 1 — Events section gone, no SpaceCalendarEvents fetch (R-9).
    const memberPage = member.getSharedPage();
    let eventsRequestFired = false;
    const onRequest = (req: import('@playwright/test').Request) => {
      if (
        req.url().includes('/graphql') &&
        (req.postData() ?? '').includes('SpaceCalendarEvents')
      ) {
        eventsRequestFired = true;
      }
    };
    const sidebar = memberPage.locator('#crd-space-sidebar-desktop');
    memberPage.on('request', onRequest);
    try {
      await memberPage.goto(`${baseUrl}/${spaceUrl}`);
      await acceptCookiesIfVisible(memberPage);

      await expect(sidebar.getByText('Space Lead')).toBeVisible();
      await expect(
        sidebar.getByRole('heading', { name: 'Events' })
      ).toHaveCount(0);
      await expect(sidebar.getByText('US2 Kickoff Call')).toHaveCount(0);
      // Other Home widgets untouched.
      await expect(
        sidebar.getByRole('button', { name: 'About this Space' })
      ).toBeVisible();
      await expect(sidebar.getByText('US2 Sub One')).toBeVisible();
    } finally {
      // Always detach — a failed assertion must not leave the listener attached
      // to the shared member page for later tests.
      memberPage.off('request', onRequest);
    }
    expect(eventsRequestFired).toBe(false);

    // Other tab (Community) unaffected by the Home-tab edit.
    await memberPage.goto(`${baseUrl}/${spaceUrl}/community`);
    await acceptCookiesIfVisible(memberPage);
    await expect(sidebar.getByText(`${spaceName} Guidelines`)).toBeVisible();
  });

  test('US2-AS3 — adding Upcoming Events to Community and moving it to the top renders it first', async () => {
    const adminPage = admin.getSharedPage();
    await adminPage.goto(`${baseUrl}/${spaceUrl}/settings/layout`);
    await acceptCookiesIfVisible(adminPage);

    const communityColumn = adminPage
      .locator('div', {
        has: adminPage.getByRole('heading', { name: 'Community', level: 3 }),
      })
      .first();
    await communityColumn
      .getByRole('button', { name: 'Column actions' })
      .click();
    await adminPage.getByRole('menuitem', { name: 'Layout' }).click();

    const dialog = adminPage.getByRole('dialog', { name: 'Layout: Community' });
    await dialog
      .getByRole('checkbox', { name: 'Toggle Upcoming Events' })
      .click();
    // Move the newly-selected Events row (appended last among the selected rows) to
    // the top with the dialog's real reorder control: each selected row renders a
    // drag handle ('Reorder <widget>') wired to dnd-kit's KeyboardSensor with
    // sortableKeyboardCoordinates, so keyboard reordering is first-class — focus the
    // handle, lift with Space, step up with ArrowUp, drop with Space. No catch:
    // a missing handle must fail the walk loudly, not silently no-op the reorder.
    const dragHandle = dialog.getByRole('button', {
      name: 'Reorder Upcoming Events',
    });
    await expect(dragHandle).toBeVisible();
    const selectedCount = await dialog
      .getByRole('button', { name: /^Reorder / })
      .count();
    await dragHandle.focus();
    await adminPage.keyboard.press('Space'); // lift
    for (let i = 0; i < selectedCount - 1; i++) {
      // Brief pause lets dnd-kit re-measure droppable rects between keyboard moves.
      await adminPage.waitForTimeout(100);
      await adminPage.keyboard.press('ArrowUp');
    }
    await adminPage.waitForTimeout(100);
    await adminPage.keyboard.press('Space'); // drop
    // Prove the reorder landed in the dialog before saving: the first selected row
    // (first item of the sortable list) is now Upcoming Events.
    await expect(
      dialog.locator('[role="list"]').first().locator('li').first()
    ).toContainText('Upcoming Events');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    const memberPage = member.getSharedPage();
    await memberPage.goto(`${baseUrl}/${spaceUrl}/community`);
    await acceptCookiesIfVisible(memberPage);

    const sidebar = memberPage.locator('#crd-space-sidebar-desktop');
    await expect(
      sidebar.getByRole('heading', { name: 'Events' })
    ).toBeVisible();
    await expect(sidebar.getByText('US2 Kickoff Call')).toBeVisible();

    const sidebarText = await sidebar.innerText();
    expect(sidebarText.indexOf('Events')).toBeGreaterThanOrEqual(0);
    expect(sidebarText.indexOf('Events')).toBeLessThan(
      sidebarText.indexOf('Space Lead')
    );
  });

  test('US2-AS4 — deselecting every widget on Subspaces empties the sidebar; main content still works', async () => {
    const adminPage = admin.getSharedPage();
    await adminPage.goto(`${baseUrl}/${spaceUrl}/settings/layout`);
    await acceptCookiesIfVisible(adminPage);

    const subspacesColumn = adminPage
      .locator('div', {
        has: adminPage.getByRole('heading', { name: 'Subspaces', level: 3 }),
      })
      .first();
    await subspacesColumn
      .getByRole('button', { name: 'Column actions' })
      .click();
    await adminPage.getByRole('menuitem', { name: 'Layout' }).click();

    const dialog = adminPage.getByRole('dialog', { name: 'Layout: Subspaces' });
    // Uncheck every currently-selected widget (FR-016 — empty is valid).
    const toggleButtons = dialog.getByRole('checkbox', { checked: true });
    let remaining = await toggleButtons.count();
    while (remaining > 0) {
      await toggleButtons.first().click();
      remaining = await dialog.getByRole('checkbox', { checked: true }).count();
    }
    await expect(dialog.getByText('No widgets selected')).toBeVisible();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    const memberPage = member.getSharedPage();
    await memberPage.goto(`${baseUrl}/${spaceUrl}/?tab=3`);
    await acceptCookiesIfVisible(memberPage);

    const sidebar = memberPage.locator('#crd-space-sidebar-desktop');
    await expect(sidebar.locator('[role="list"], h3, button')).toHaveCount(0);
    // Main content (the Subspaces callout / "Sub One" card) still renders.
    await expect(memberPage.getByText('US2 Sub One')).toBeVisible();
  });

  test('US2-AS5 — a non-admin member is rejected by the API and the stored config is unchanged', async () => {
    const memberPage = member.getSharedPage();
    const before = await fetchStates(admin.getSharedPage().context().request);
    const homeBefore = before.find(s => s.id === homeStateId)!;

    const { body } = await updateState(memberPage.context().request, {
      innovationFlowStateID: homeStateId,
      settings: { sidebar: ['INTENT'] },
    });
    expect(body.errors?.length).toBeGreaterThan(0);
    expect(JSON.stringify(body.errors)).toMatch(/authoriz/i);

    const after = await fetchStates(admin.getSharedPage().context().request);
    const homeAfter = after.find(s => s.id === homeStateId)!;
    expect(homeAfter.settings.sidebar).toEqual(homeBefore.settings.sidebar);
  });

  test('US2-AS6 — a sidebar-only save and a later rename-only save each leave the other field untouched (partial-update semantics)', async () => {
    // Sequential, not Promise.all: updateInnovationFlowState reads-modifies-writes the
    // whole flow-state aggregate, so two writes to the same state racing each other would
    // lost-update one another regardless of which fields they touch — that's a concurrency
    // hazard in the mutation's implementation, not the partial-update contract under test
    // here. Sequencing the two saves isolates the actual assertion: a save that sends only
    // `settings.sidebar` must not disturb `displayName`, and a save that sends only
    // `displayName` must not disturb the previously-saved `sidebar`.
    const request = admin.getSharedPage().context().request;
    const before = await fetchStates(request);
    const communityBefore = before.find(s => s.id === communityStateId)!;
    const displayNameBefore = communityBefore.displayName;
    const newSidebar = communityBefore.settings.sidebar.slice().reverse();

    const sidebarResult = await updateState(request, {
      innovationFlowStateID: communityStateId,
      settings: { sidebar: newSidebar },
    });
    expect(sidebarResult.body.errors).toBeUndefined();

    const afterSidebarSave = await fetchStates(request);
    const communityAfterSidebarSave = afterSidebarSave.find(
      s => s.id === communityStateId
    )!;
    expect(communityAfterSidebarSave.settings.sidebar).toEqual(newSidebar);
    expect(communityAfterSidebarSave.displayName).toBe(displayNameBefore);

    const renameResult = await updateState(request, {
      innovationFlowStateID: communityStateId,
      displayName: 'Community Renamed (US2-AS6)',
    });
    expect(renameResult.body.errors).toBeUndefined();

    const after = await fetchStates(request);
    const communityAfter = after.find(s => s.id === communityStateId)!;
    expect(communityAfter.displayName).toBe('Community Renamed (US2-AS6)');
    expect(communityAfter.settings.sidebar).toEqual(newSidebar);
  });

  test('US2-AS7 — invalid sidebar writes (duplicate, unknown, oversized) are rejected and stored data is unchanged', async () => {
    const request = admin.getSharedPage().context().request;
    const before = await fetchStates(request);
    const homeBefore = before.find(s => s.id === homeStateId)!;

    const duplicate = await updateState(request, {
      innovationFlowStateID: homeStateId,
      settings: { sidebar: ['INTENT', 'INTENT'] },
    });
    expect(duplicate.body.errors?.length).toBeGreaterThan(0);

    const unknown = await updateState(request, {
      innovationFlowStateID: homeStateId,
      settings: { sidebar: ['BOGUS_WIDGET'] },
    });
    expect(unknown.body.errors?.length).toBeGreaterThan(0);

    const vocabulary = [
      'INTENT',
      'ABOUT',
      'SUBSPACE_LINKS',
      'EVENTS',
      'UPDATES',
      'CONTACT_LEADS',
      'ADD_USER',
      'VIRTUAL_CONTRIBUTORS',
      'GUIDELINES',
      'INDEX',
    ];
    const oversized = Array.from(
      { length: 21 },
      (_, i) => vocabulary[i % vocabulary.length]
    );
    const tooLong = await updateState(request, {
      innovationFlowStateID: homeStateId,
      settings: { sidebar: oversized },
    });
    expect(tooLong.body.errors?.length).toBeGreaterThan(0);

    const after = await fetchStates(request);
    const homeAfter = after.find(s => s.id === homeStateId)!;
    expect(homeAfter.settings.sidebar).toEqual(homeBefore.settings.sidebar);
  });
});
