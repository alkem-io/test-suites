// spec: workspace#086-subspace-sidebar-config (US4-AS11 — adding a phase; US6 — replacing the
// innovation flow). Plan rows S-14 and S-15 (sidebar-widgets-test-plan.md § 086).
// The story's QA step says the setting "survives" a new flow; spec US6 (operator ruling D-19)
// says the subspace sidebar is REPLACED by the template's, with one sentence in the
// confirmation saying so (FR-032). S-15 follows the spec (plan OQ-4). Adding a phase appends
// it with the generic list and leaves the sidebar alone. S-15 replaces Alpha's flow, so the
// file seeds its own fixture and S-15 runs last.
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { getGraphqlClient, TestUserManager } from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { SidebarWidget } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import {
  addL1,
  GENERIC_SIDEBAR,
  openCustomizeSidebar,
  openPersona,
  openSettingsLayout,
  openSubspace,
  readPhases,
  readSidebar,
  seedSubspaceFixture,
  selectedWidgets,
  setSidebar,
  sidebarEntries,
  subspaceSidebar,
  SUBSPACE_DEFAULT_SIDEBAR,
  teardownSubspaceFixture,
  toggle,
  WIDGET_LABEL,
  type SubspaceFixture,
  type SubspaceRef,
} from './subspace-sidebar.helpers';

// Admin sessions must never reach the public trace/video archive.
test.use({ trace: 'off', video: 'off' });
// S-15 destroys Alpha's flow; S-14 must run on the template flow first.
test.describe.configure({ mode: 'serial' });

const SIDEBAR_NOTE = "The subspace sidebar will be replaced by the template's.";

let fixture: SubspaceFixture | undefined;
let beta: SubspaceRef | undefined;
let templateName = '';
let adminContext: BrowserContext;
let memberContext: BrowserContext;
let admin: Page;
let member: Page;

test.describe('086 US4/US6 — adding a phase keeps the sidebar, replacing the flow replaces it', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    fixture = await seedSubspaceFixture('086-us6-subspace-flow-changes');
    // Donor for S-15: a second L1 whose first list differs from the positional default, saved
    // as a space template into the L0's own templates set (the picker lists that set).
    beta = await addL1(fixture, 'Beta');
    const betaFirst = (await readPhases(beta.id)).phases[0];
    await setSidebar(betaFirst.id, [
      SidebarWidget.Community,
      SidebarWidget.Index,
    ]);
    templateName = `Beta flow ${fixture.runId}`;
    const created = await graphqlErrorWrapper(
      (t: string | undefined) =>
        getGraphqlClient().CreateTemplateFromSpace(
          {
            spaceId: beta!.id,
            templatesSetId: fixture!.scenario.space.templateSetId,
            profileData: { displayName: templateName },
          },
          { authorization: `Bearer ${t}` }
        ),
      TestUser.GLOBAL_ADMIN
    );
    if (created.error)
      throw new Error(
        `createTemplateFromSpace failed: ${JSON.stringify(created.error)}`
      );

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

  test('S-14 — adding a phase appends it with the generic list and leaves the subspace sidebar unchanged', async () => {
    const f = fixture!;
    const before = (await readPhases(f.alpha.id)).phases;
    expect(before[0].settings.sidebar).toEqual(SUBSPACE_DEFAULT_SIDEBAR);
    const phaseName = `Discovery ${f.runId}`;

    await openSettingsLayout(admin, f.alpha.url);
    await admin.getByRole('button', { name: 'Add phase', exact: true }).click();
    const dialog = admin.getByRole('dialog', { name: 'Add a new phase' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Phase name' }).fill(phaseName);
    await dialog
      .getByRole('button', { name: 'Add phase', exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect(admin.getByTitle(phaseName, { exact: true })).toBeVisible();

    const after = (await readPhases(f.alpha.id)).phases;
    expect(after.map(p => p.displayName)).toEqual([
      ...before.map(p => p.displayName),
      phaseName,
    ]);
    expect(after[after.length - 1].settings.sidebar).toEqual(GENERIC_SIDEBAR);
    expect(after[0].id).toBe(before[0].id);
    expect(after[0].settings.sidebar).toEqual(SUBSPACE_DEFAULT_SIDEBAR);

    // The editor and the page still show the first phase's list.
    const customize = await openCustomizeSidebar(admin);
    expect(await selectedWidgets(customize)).toEqual(
      SUBSPACE_DEFAULT_SIDEBAR.map(w => WIDGET_LABEL[w])
    );
    await admin.keyboard.press('Escape');
    await expect(customize).toBeHidden();
    await openSubspace(member, f.alpha.url);
    await member
      .getByRole('button', { name: `Switch to phase ${phaseName}` })
      .click();
    const entries = (await sidebarEntries(subspaceSidebar(member))).join('|');
    expect(entries).toContain('BUTTON:About this Subspace');
    expect(entries).toContain('BUTTON:Add Post');
    expect(entries).not.toContain('Search posts');
  });

  test('S-15 — Replace innovation flow warns that the sidebar will be replaced, and the template’s first list replaces it', async () => {
    const f = fixture!;
    const betaPhases = (await readPhases(beta!.id)).phases;
    const templateFirst = betaPhases[0].settings.sidebar;
    expect(templateFirst).toEqual([
      SidebarWidget.Community,
      SidebarWidget.Index,
    ]);
    // Positive control: before the replace, Alpha's first list is still the positional default
    // and the member sees About / Add Post.
    expect(await readSidebar(f.alpha.id)).toEqual(SUBSPACE_DEFAULT_SIDEBAR);
    await openSubspace(member, f.alpha.url);
    expect((await sidebarEntries(subspaceSidebar(member))).join('|')).toContain(
      'BUTTON:About this Subspace'
    );

    await openSettingsLayout(admin, f.alpha.url);
    await admin
      .getByRole('button', { name: 'Replace innovation flow', exact: true })
      .click();
    const picker = admin.getByRole('dialog', { name: 'Use a template' });
    await expect(picker).toBeVisible();
    await picker.getByRole('button', { name: templateName }).click();
    await picker.getByRole('button', { name: 'Use this template' }).click();

    const apply = admin.getByRole('dialog', { name: 'Apply new template' });
    await expect(apply).toBeVisible();
    await expect(apply.getByText(SIDEBAR_NOTE, { exact: true })).toBeVisible(); // FR-032
    await apply
      .getByRole('radio', {
        name: 'Replace flow without adding template Posts',
      })
      .check();
    await apply.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(apply).toBeHidden();

    await expect
      .poll(async () => await readSidebar(f.alpha.id))
      .toEqual(templateFirst);
    const alphaPhases = (await readPhases(f.alpha.id)).phases;
    expect(alphaPhases.map(p => p.displayName)).toEqual(
      betaPhases.map(p => p.displayName)
    );
    expect(alphaPhases.map(p => p.settings.sidebar)).toEqual(
      betaPhases.map(p => p.settings.sidebar)
    );

    // The page renders the template's list: Community and Post Index, no About / Add Post.
    await openSubspace(member, f.alpha.url);
    const entries = (await sidebarEntries(subspaceSidebar(member))).join('|');
    expect(entries).toContain('Community');
    expect(entries).toContain('Post Index');
    expect(entries).not.toContain('About this Subspace');
    expect(entries).not.toContain('Add Post');
    // And the editor pre-selects it.
    await openSettingsLayout(admin, f.alpha.url);
    const customize = await openCustomizeSidebar(admin);
    expect(await selectedWidgets(customize)).toEqual(
      templateFirst.map(w => WIDGET_LABEL[w])
    );
    await expect(toggle(customize, 'Community')).toBeChecked();
    await admin.keyboard.press('Escape');
    await expect(customize).toBeHidden();
  });
});
