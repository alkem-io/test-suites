// spec: client-web/src/functional-e2e/organization-space-membership/organization-space-membership-test-plan.md
// server-api coverage: server-api/src/functional-api/roleset/organization/organization-self-removal.it-spec.ts

import { expect, Page } from '@playwright/test';
import {
  createOrganization,
  deleteOrganization,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  createAuthenticatedSessionFixture,
  ensurePersonaState,
} from '../fixtures/authenticated-session.fixture';
import {
  baseUrl,
  changeUserOrgRole,
  clearHostLead,
  COPY,
  ensureOrgRole,
  gotoMembershipTab,
  membershipCard,
  membershipCards,
  membershipTabUrl,
  openCardMenu,
  removeAllOrgSpaceRoles,
  seedOrgMemberships,
  summaryLine,
  viewMenuItem,
} from './organization-space-membership.helpers';

/**
 * @forge-acceptance
 *
 * User Story 1 — an organization admin sees the organization's Space
 * memberships on Organization → Settings → Membership. The scenario
 * organization is a Member of Space S and of its Subspace S1; the persona is
 * the scenario organization's admin.
 */

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'org-membership-tab-admin.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const runSuffix = UniqueIDGenerator.getID();
const associateEmail = 'qa.user@alkem.io';

let baseScenario: OrganizationWithSpaceModel;
let emptyOrg: { id: string; nameID: string; roleSetId: string } | undefined;

const scenarioConfig: TestScenarioConfig = {
  name: `org-membership-us1-${runSuffix}`,
  space: {
    collaboration: { addTutorialCallouts: false },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      subspace: {
        collaboration: { addTutorialCallouts: false },
      },
    },
  },
};

const spaceName = () => baseScenario.space.about.profile.displayName;
const subspaceName = () => baseScenario.subspace.about.profile.displayName;

const openTabWithCards = (page: Page, count: number) =>
  gotoMembershipTab(page, baseScenario.organization.nameId, async p => {
    await expect(membershipCards(p)).toHaveCount(count, { timeout: 10_000 });
  });

test.describe('Organization Membership tab — list, search, filter', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await clearHostLead(baseScenario);
    await seedOrgMemberships(baseScenario);
    await changeUserOrgRole(
      'assign',
      TestUserManager.users.qaUser.id,
      baseScenario.organization.roleSetId,
      RoleName.Associate
    );
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(90_000);
    await teardownAuthentication();
    await changeUserOrgRole(
      'remove',
      TestUserManager.users.qaUser.id,
      baseScenario.organization.roleSetId,
      RoleName.Associate
    ).catch(() => undefined);
    if (emptyOrg) {
      await changeUserOrgRole(
        'remove',
        TestUserManager.users.organizationAdmin.id,
        emptyOrg.roleSetId,
        RoleName.Admin
      ).catch(() => undefined);
      await deleteOrganization(emptyOrg.id);
    }
    await removeAllOrgSpaceRoles(baseScenario);
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('US1-AS1 tab lists the Space and Subspace memberships', async ({
    page,
  }) => {
    await openTabWithCards(page, 2);

    // The Membership tab sits between Associates and Invitations.
    const tabLabels = (
      await page.getByRole('tablist').getByRole('tab').allTextContents()
    ).map(label => label.trim());
    const membershipIndex = tabLabels.indexOf(COPY.tab);
    expect(membershipIndex).toBeGreaterThan(-1);
    expect(tabLabels[membershipIndex - 1]).toBe(COPY.tabBefore);
    expect(tabLabels[membershipIndex + 1]).toBe(COPY.tabAfter);

    const spaceCard = membershipCard(page, spaceName());
    const subspaceCard = membershipCard(page, subspaceName());
    await expect(spaceCard.getByText('Space', { exact: true })).toBeVisible();
    await expect(
      subspaceCard.getByText('Subspace', { exact: true })
    ).toBeVisible();
    await expect(
      spaceCard.getByText(COPY.roleMember, { exact: true })
    ).toBeVisible();
    await expect(
      subspaceCard.getByText(COPY.roleMember, { exact: true })
    ).toBeVisible();
    await expect(summaryLine(page, 2, 2)).toBeVisible();
  });

  test('US1-AS2 search narrows by name and the filter splits Spaces from Subspaces', async ({
    page,
  }) => {
    await openTabWithCards(page, 2);
    const search = page.getByPlaceholder(COPY.searchPlaceholder);

    await search.fill(subspaceName());
    await expect(membershipCards(page)).toHaveCount(1);
    await expect(membershipCard(page, subspaceName())).toBeVisible();
    await expect(summaryLine(page, 1, 2)).toBeVisible();

    await search.fill('');
    await expect(membershipCards(page)).toHaveCount(2);

    await page
      .getByRole('button', { name: COPY.filterSubspaces, exact: true })
      .click();
    await expect(membershipCards(page)).toHaveCount(1);
    await expect(membershipCard(page, subspaceName())).toBeVisible();
    await expect(
      page.getByRole('button', { name: COPY.filterSubspaces, exact: true })
    ).toHaveAttribute('aria-pressed', 'true');

    await page
      .getByRole('button', { name: COPY.filterSpaces, exact: true })
      .click();
    await expect(membershipCards(page)).toHaveCount(1);
    await expect(membershipCard(page, spaceName())).toBeVisible();

    await page
      .getByRole('button', { name: COPY.filterAll, exact: true })
      .click();
    await expect(membershipCards(page)).toHaveCount(2);
  });

  test('US1-AS3 nothing matches → No memberships found, Clear Filters resets', async ({
    page,
  }) => {
    await openTabWithCards(page, 2);
    const search = page.getByPlaceholder(COPY.searchPlaceholder);

    await page
      .getByRole('button', { name: COPY.filterSpaces, exact: true })
      .click();
    await search.fill(`zz-no-such-space-${runSuffix}`);
    await expect(membershipCards(page)).toHaveCount(0);
    await expect(
      page.getByText(COPY.filteredEmptyTitle, { exact: true })
    ).toBeVisible();

    await page
      .getByRole('button', { name: COPY.clearFilters, exact: true })
      .click();
    await expect(search).toHaveValue('');
    await expect(
      page.getByRole('button', { name: COPY.filterAll, exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(membershipCards(page)).toHaveCount(2);
    await expect(summaryLine(page, 2, 2)).toBeVisible();
  });

  test('US1-AS6 View Space opens the Space', async ({ page }) => {
    await openTabWithCards(page, 2);
    const spaceCard = membershipCard(page, spaceName());

    await openCardMenu(spaceCard);
    await viewMenuItem(page, 'Space').click();

    await expect(page).toHaveURL(
      new RegExp(`/${baseScenario.space.nameId}(?:[/?#]|$)`)
    );
  });

  test('US1-AS5 Lead role shows the Lead badge', async ({ page }) => {
    await ensureOrgRole(
      baseScenario.organization.id,
      baseScenario.space.community.roleSetId,
      RoleName.Lead
    );

    await openTabWithCards(page, 2);
    const spaceCard = membershipCard(page, spaceName());
    await expect(
      spaceCard.getByText(COPY.roleLead, { exact: true })
    ).toBeVisible();
    await expect(
      membershipCard(page, subspaceName()).getByText(COPY.roleMember, {
        exact: true,
      })
    ).toBeVisible();
  });

  test('US1-AS4 organization with no memberships shows only the empty caption', async ({
    page,
  }) => {
    const nameID = `orgmemempty${runSuffix}`.toLowerCase().slice(0, 25);
    const res = await createOrganization(
      `Org Membership Empty ${runSuffix}`,
      nameID
    );
    const created = res.data?.createOrganization;
    if (!created) {
      throw new Error(
        `Creating the empty organization failed: ${JSON.stringify(res.error)}`
      );
    }
    emptyOrg = {
      id: created.id,
      nameID: created.nameID,
      roleSetId: created.roleSet.id,
    };
    await changeUserOrgRole(
      'assign',
      TestUserManager.users.organizationAdmin.id,
      emptyOrg.roleSetId,
      RoleName.Admin
    );

    await gotoMembershipTab(page, emptyOrg.nameID, async p => {
      await expect(p.getByText(COPY.empty, { exact: true })).toBeVisible({
        timeout: 10_000,
      });
    });
    await expect(page.getByPlaceholder(COPY.searchPlaceholder)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: COPY.filterAll, exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByText(/^Showing \d+ of \d+ memberships$/)
    ).toHaveCount(0);
  });

  test('US1-AS7 a plain associate is redirected to the public profile', async ({
    browser,
  }) => {
    const statePath = await ensurePersonaState(browser, associateEmail);
    const context = await browser.newContext({ storageState: statePath });
    try {
      const associatePage = await context.newPage();
      const orgNameId = baseScenario.organization.nameId;
      await associatePage.goto(membershipTabUrl(baseUrl, orgNameId));

      await expect(associatePage).toHaveURL(
        new RegExp(`/organization/${orgNameId}/?(?:[?#]|$)`),
        { timeout: 15_000 }
      );
      await expect(
        associatePage.getByRole('tab', { name: COPY.tab, exact: true })
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
