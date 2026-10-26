// spec: workspace#086-subspace-sidebar-config (US1 — a subspace admin customizes the sidebar
// once for every phase). Plan rows S-07..S-13 (sidebar-widgets-test-plan.md § 086).
// Customize Sidebar on subspace Settings › Layout edits the FIRST phase's stored list, which
// every phase, the collapsed rail and the phone drawer render; the per-phase Layout dialog
// never writes it; a pending column reorder is honoured at save time. Each case puts Alpha
// and Alpha-2 back to the template's phase order and positional first list through the API
// before it starts, so the cases are order-independent; the file's afterAll restores them
// too, so a red case never cascades into the next file.
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import { SidebarWidget } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  columnOrder,
  keyboardDrag,
  L1_VOCABULARY,
  L2_ONLY_HIDDEN,
  labelsOf,
  mainContent,
  openCustomizeSidebar,
  openPersona,
  openPhaseLayoutDialog,
  openSettingsLayout,
  openSubspace,
  PHONE_VIEWPORT,
  phaseButtonNames,
  readPhases,
  readSidebar,
  recordMutations,
  restoreSubspaceFlow,
  seedSubspaceFixture,
  selectedWidgets,
  setSidebar,
  sidebarEntries,
  spaNavigate,
  subspaceSidebar,
  subspaceWidgets,
  teardownSubspaceFixture,
  toggle,
  unselectedWidgets,
  updatePhaseSettings,
  WIDGET_LABEL,
  type SubspaceFixture,
} from './subspace-sidebar.helpers';

// Admin sessions must never reach the public trace/video archive.
test.use({ trace: 'off', video: 'off' });

const HELP_TEXT =
  "Choose which widgets appear in this subspace's sidebar, and in what order. This applies to the whole subspace — every phase shows the same set.";

let fixture: SubspaceFixture | undefined;
let adminContext: BrowserContext;
let memberContext: BrowserContext;
let admin: Page;
let member: Page;

const noReloadMarker = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __noReload?: string }).__noReload
  );

test.describe('086 US1 — admin customizes the subspace sidebar once for every phase', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    fixture = await seedSubspaceFixture('086-us1-subspace-customize');
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
    await restoreSubspaceFlow(fixture!.alpha2.id);
  });

  test.afterAll(async () => {
    await adminContext?.close();
    await memberContext?.close();
    if (fixture) {
      await restoreSubspaceFlow(fixture.alpha.id);
      await restoreSubspaceFlow(fixture.alpha2.id);
    }
    await teardownSubspaceFixture(fixture);
  });

  test('S-08 — Customize Sidebar sits beside Replace flow / Add phase on L1 and L2 and not on the L0; the dialog pre-selects the first phase with 13 (L1) / 11 (L2) labels', async () => {
    const f = fixture!;
    for (const [space, vocabulary] of [
      [f.alpha, L1_VOCABULARY],
      [f.alpha2, L1_VOCABULARY.filter(w => !L2_ONLY_HIDDEN.includes(w))],
    ] as const) {
      await openSettingsLayout(admin, space.url);
      const buttons = await mainContent(admin)
        .getByRole('button')
        .evaluateAll(els =>
          els
            .map(
              e => e.textContent?.trim() || e.getAttribute('aria-label') || ''
            )
            .filter(Boolean)
        );
      const at = buttons.indexOf('Customize Sidebar');
      expect(at, `Customize Sidebar on ${space.url}`).toBeGreaterThanOrEqual(0);
      expect(buttons.slice(at, at + 3)).toEqual([
        'Customize Sidebar',
        'Replace innovation flow',
        'Add phase',
      ]);

      const first = await readSidebar(space.id);
      const dialog = await openCustomizeSidebar(admin);
      await expect(dialog.getByRole('heading', { level: 2 })).toHaveText(
        'Layout: Sidebar'
      );
      await expect(dialog.getByText(HELP_TEXT, { exact: true })).toBeVisible();
      await expect(dialog.getByRole('switch')).toHaveCount(0); // widget section only, no per-phase settings
      const selected = await selectedWidgets(dialog);
      const unselected = await unselectedWidgets(dialog);
      expect(selected).toEqual(
        labelsOf(first.filter(w => vocabulary.includes(w)))
      );
      expect([...selected, ...unselected].sort()).toEqual(
        labelsOf(vocabulary).sort()
      );
      await admin.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
    await admin.goto(`${f.l0Url}/settings/layout`);
    await expect(
      admin.getByRole('button', { name: 'Add tab', exact: true })
    ).toBeVisible();
    await expect(
      admin.getByRole('button', { name: 'Customize Sidebar' })
    ).toHaveCount(0);
  });

  test('S-09 — remove Post Index and move Search to the top: every phase, the rail and the drawer follow, without a reload, and the stored list equals the dialog', async () => {
    const f = fixture!;
    await openSettingsLayout(admin, f.alpha.url);
    await admin.evaluate(() => {
      (window as unknown as { __noReload: string }).__noReload = 'kept';
    });
    const dialog = await openCustomizeSidebar(admin);
    await toggle(dialog, WIDGET_LABEL[SidebarWidget.Index]).uncheck();
    await toggle(dialog, WIDGET_LABEL[SidebarWidget.Search]).check();
    await keyboardDrag(
      admin,
      dialog.getByRole('button', { name: 'Reorder Search' }),
      'ArrowUp',
      'intent'
    );
    const dialogOrder = await selectedWidgets(dialog);
    expect(dialogOrder[0]).toBe('Search');
    expect(dialogOrder).not.toContain('Post Index');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(await noReloadMarker(admin)).toBe('kept');

    expect(labelsOf(await readSidebar(f.alpha.id))).toEqual(dialogOrder);

    await spaNavigate(admin, f.alpha.url);
    const sidebar = subspaceSidebar(admin);
    await expect(sidebar).toBeVisible();
    const phases = await phaseButtonNames(admin);
    expect(phases.length).toBeGreaterThan(1);
    for (const label of phases) {
      await admin.getByRole('button', { name: label }).click();
      await expect(admin.getByRole('button', { name: label })).toHaveAttribute(
        'aria-current',
        'page'
      );
      const entries = await sidebarEntries(sidebar);
      expect(entries[0]).toBe('BUTTON:Collapse');
      expect(entries[1]).toBe('INPUT:Search posts');
      expect(entries.join('|')).not.toContain('Post Index');
    }
    // Collapsed rail: Post Index gone; Search is expanded-only by design.
    const w = subspaceWidgets(sidebar);
    await w.collapse.click();
    await expect(w.expand).toBeVisible();
    const rail = (await sidebarEntries(sidebar)).join('|');
    expect(rail).not.toContain('Post Index');
    expect(rail).not.toContain('Search');
    await w.expand.click();
    await expect(w.collapse).toBeVisible();
    // Phone drawer, still without a document load.
    await admin.setViewportSize(PHONE_VIEWPORT);
    await admin.getByRole('button', { name: 'Open menu' }).click();
    const drawer = admin.getByRole('dialog', { name: 'Menu' });
    await expect(drawer).toBeVisible();
    const drawerEntries = await sidebarEntries(
      drawer.getByRole('complementary')
    );
    expect(drawerEntries[0]).toBe('INPUT:Search posts');
    expect(drawerEntries.join('|')).not.toContain('Post Index');
    expect(await noReloadMarker(admin)).toBe('kept');
  });

  test('S-07 — on an L2 the dialog neither offers nor shows Create Subspace and Subspaces, yet a save keeps their stored values', async () => {
    const f = fixture!;
    const first = (await readPhases(f.alpha2.id)).phases[0];
    await setSidebar(first.id, [
      SidebarWidget.Intent,
      SidebarWidget.CreateSubspace,
      SidebarWidget.SubspaceLinks,
      SidebarWidget.Index,
    ]);

    await openSettingsLayout(admin, f.alpha2.url);
    const dialog = await openCustomizeSidebar(admin);
    expect(await selectedWidgets(dialog)).toEqual([
      'Intention & Leads',
      'Post Index',
    ]);
    const offered = [
      ...(await selectedWidgets(dialog)),
      ...(await unselectedWidgets(dialog)),
    ];
    expect(offered).not.toContain('Create Subspace');
    expect(offered).not.toContain('Subspaces');
    await toggle(dialog, 'Search').check();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();

    expect(await readSidebar(f.alpha2.id)).toEqual([
      SidebarWidget.Intent,
      SidebarWidget.CreateSubspace,
      SidebarWidget.SubspaceLinks,
      SidebarWidget.Index,
      SidebarWidget.Search,
    ]);
    await openSubspace(admin, f.alpha2.url);
    const entries = (await sidebarEntries(subspaceSidebar(admin))).join('|');
    expect(entries).toContain('INPUT:Search posts');
    expect(entries).toContain('Post Index');
    expect(entries).not.toMatch(/Create Subspace|H3:Subspaces|Show all/);
  });

  test('S-10 — a hidden first phase stays authoritative for the page and the editor', async () => {
    const f = fixture!;
    const before = (await readPhases(f.alpha.id)).phases;
    await updatePhaseSettings(before[0].id, { visible: false });

    await openSettingsLayout(admin, f.alpha.url);
    const dialog = await openCustomizeSidebar(admin);
    expect(await selectedWidgets(dialog)).toEqual(
      labelsOf(before[0].settings.sidebar)
    );
    await toggle(dialog, WIDGET_LABEL[SidebarWidget.AddUser]).check();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();

    const after = (await readPhases(f.alpha.id)).phases;
    expect(after[0].settings.visible).toBe(false);
    expect(after[0].settings.sidebar).toEqual([
      ...before[0].settings.sidebar,
      SidebarWidget.AddUser,
    ]);
    expect(after[1].settings.sidebar).toEqual(before[1].settings.sidebar);

    await openSubspace(admin, f.alpha.url);
    const entries = (await sidebarEntries(subspaceSidebar(admin))).join('|');
    expect(entries).toContain('BUTTON:Invite');
    expect(entries).toContain('BUTTON:About this Subspace'); // the first phase's list, not phase 2's
    expect(await phaseButtonNames(admin)).not.toContain(
      `Switch to phase ${before[0].displayName}`
    );
  });

  test('S-12 — the per-phase Layout dialog never writes the sidebar, also right after a reorder', async () => {
    const f = fixture!;
    const before = (await readPhases(f.alpha.id)).phases;
    await openSettingsLayout(admin, f.alpha.url);
    const sent = recordMutations(admin);

    // A plain toggle on phase 2.
    let dialog = await openPhaseLayoutDialog(admin, before[1].displayName);
    await expect(dialog.getByText(/sidebar/i)).toHaveCount(0);
    await dialog
      .getByRole('switch', { name: 'Collapse Post descriptions' })
      .click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect
      .poll(
        async () =>
          (await readPhases(f.alpha.id)).phases[1].settings
            .descriptionDisplayMode
      )
      .toBe('COLLAPSED');
    expect((await readPhases(f.alpha.id)).phases[1].settings.sidebar).toEqual(
      before[1].settings.sidebar
    );
    expect(sent.length).toBeGreaterThan(0);
    for (const m of sent)
      expect(JSON.stringify(m.variables).toLowerCase()).not.toContain(
        'sidebar'
      );

    // Reorder through the Save bar, then toggle again on the phase now at position 2.
    await keyboardDrag(
      admin,
      admin.getByRole('button', { name: 'Drag to reorder phase' }).nth(1),
      'ArrowLeft',
      `col:${before[0].id}`
    );
    await admin.getByRole('button', { name: 'Save Changes' }).click();
    await expect
      .poll(async () => (await readPhases(f.alpha.id)).phases[0].id)
      .toBe(before[1].id);
    const reordered = (await readPhases(f.alpha.id)).phases;
    sent.length = 0;
    dialog = await openPhaseLayoutDialog(admin, reordered[1].displayName);
    await dialog.getByRole('switch').first().click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => sent.length).toBeGreaterThan(0);
    const after = (await readPhases(f.alpha.id)).phases;
    expect(after.map(p => p.settings.sidebar)).toEqual(
      reordered.map(p => p.settings.sidebar)
    );
    for (const m of sent)
      expect(JSON.stringify(m.variables).toLowerCase()).not.toContain(
        'sidebar'
      );
  });

  test('S-11 — an empty list hides the sidebar, rail and collapse control; only admins keep the drawer (edit-flow link)', async () => {
    const f = fixture!;
    await openSettingsLayout(admin, f.alpha.url);
    const dialog = await openCustomizeSidebar(admin);
    for (const label of await selectedWidgets(dialog)) {
      await toggle(dialog, label).uncheck();
    }
    await expect(dialog.getByText(/No widgets selected/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(await readSidebar(f.alpha.id)).toEqual([]);

    await spaNavigate(admin, f.alpha.url);
    await expect(mainContent(admin)).toBeVisible();
    await expect(subspaceSidebar(admin)).toHaveCount(0);
    await expect(
      admin.getByRole('button', { name: 'Collapse', exact: true })
    ).toHaveCount(0);
    await expect(
      admin.getByRole('button', { name: 'Expand', exact: true })
    ).toHaveCount(0);

    await admin.setViewportSize(PHONE_VIEWPORT);
    await admin.getByRole('button', { name: 'Open menu' }).click();
    const drawer = admin.getByRole('dialog', { name: 'Menu' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('complementary')).toHaveCount(0);
    await expect(
      drawer.getByRole('link', { name: 'Edit innovation flow' })
    ).toBeVisible();

    // The member has neither a sidebar nor a menu to open.
    await member.setViewportSize(PHONE_VIEWPORT);
    await member.goto(f.alpha.url);
    await expect(mainContent(member)).toBeVisible();
    await expect(member.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(member.getByRole('button', { name: 'Open menu' })).toHaveCount(
      0
    );
  });

  test('S-13 — customizing during a pending column reorder lands the list on the phase at position 1, and the editor stays honest', async () => {
    const f = fixture!;
    const before = (await readPhases(f.alpha.id)).phases;
    await openSettingsLayout(admin, f.alpha.url);
    // The phase columns wrap into a grid; at desktop width the first four share one row, so an
    // ArrowLeft walk from column 3 to column 1 is a straight line (see keyboardDrag).
    await keyboardDrag(
      admin,
      admin.getByRole('button', { name: 'Drag to reorder phase' }).nth(2),
      'ArrowLeft',
      `col:${before[0].id}`
    );
    expect((await columnOrder(admin))[0]).toBe(before[2].displayName);

    const dialog = await openCustomizeSidebar(admin);
    for (const label of await selectedWidgets(dialog)) {
      await toggle(dialog, label).uncheck();
    }
    await toggle(dialog, WIDGET_LABEL[SidebarWidget.Intent]).check();
    await toggle(dialog, WIDGET_LABEL[SidebarWidget.About]).check();
    expect(await selectedWidgets(dialog)).toEqual([
      'Intention & Leads',
      'About this Space',
    ]);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(
      admin.getByRole('button', { name: 'Save Changes' })
    ).toBeEnabled(); // the reorder is still pending

    await admin.getByRole('button', { name: 'Save Changes' }).click();
    await expect
      .poll(async () => (await readPhases(f.alpha.id)).phases[0].id)
      .toBe(before[2].id);
    expect(await readSidebar(f.alpha.id)).toEqual([
      SidebarWidget.Intent,
      SidebarWidget.About,
    ]);

    await openSubspace(admin, f.alpha.url);
    const entries = (await sidebarEntries(subspaceSidebar(admin))).join('|');
    expect(entries).toContain('BUTTON:About this Subspace');
    expect(entries).not.toMatch(/Add Post|Search posts|Quick Actions/);
  });
});
