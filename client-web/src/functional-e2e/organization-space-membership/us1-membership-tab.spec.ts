// spec: client-web/src/functional-e2e/organization-space-membership/organization-space-membership-test-plan.md
// server-api coverage: server-api/src/functional-api/roleset/organization/organization-self-removal.it-spec.ts

import { expect, Locator, Page } from '@playwright/test';
import {
  createOrganization,
  deleteOrganization,
  getUserToken,
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
  gotoMembershipTab,
  membershipTabUrl,
  openCardMenu,
  orgIsMemberOf,
  removeAllOrgSpaceRoles,
  removeOrgRoleIfHeld,
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
const gqlEndpoint =
  process.env.ALKEMIO_SERVER ||
  'http://localhost:3000/api/private/non-interactive/graphql';
const adminEmail = process.env.AUTH_TEST_HARNESS_EMAIL || 'admin@alkem.io';

let baseScenario: OrganizationWithSpaceModel;
let leadScenario: OrganizationWithSpaceModel | undefined;
let emptyOrg: { id: string; nameID: string; roleSetId: string } | undefined;

// --- API fixtures ----------------------------------------------------------
// A NEW organization can only enter a Space through an accepted invitation
// (`roleset-entry-role-assign-organization` is held by nobody), so memberships
// are seeded with invite + accept rather than `assignRoleToOrganization`.

async function gqlAs<T>(
  email: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(gqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getUserToken(email)}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`);
  }
  return body.data as T;
}

/** Invites `actorID` to a role set and accepts it as `accepterEmail`. */
async function inviteAndAccept(
  actorID: string,
  roleSetId: string,
  accepterEmail: string,
  extraRoles: RoleName[] = []
) {
  const invited = await gqlAs<{
    inviteForEntryRoleOnRoleSet: Array<{ invitation: { id: string } | null }>;
  }>(
    adminEmail,
    `mutation($roleSetID: UUID!, $actors: [UUID!]!, $extra: [RoleName!]!) {
      inviteForEntryRoleOnRoleSet(invitationData: {
        invitedActorIDs: $actors, invitedUserEmails: [], roleSetID: $roleSetID,
        welcomeMessage: "us1", extraRoles: $extra
      }) { invitation { id } }
    }`,
    { roleSetID: roleSetId, actors: [actorID], extra: extraRoles }
  );
  const invitationID = invited.inviteForEntryRoleOnRoleSet[0]?.invitation?.id;
  if (!invitationID) {
    throw new Error(`No invitation created for ${actorID} on ${roleSetId}`);
  }
  await gqlAs(
    accepterEmail,
    `mutation($id: UUID!) {
      eventOnInvitation(eventData: { invitationID: $id, eventName: "ACCEPT" }) { id state }
    }`,
    { id: invitationID }
  );
}

/** Organization → Member of Space S and Subspace S1 (S2 stays out). */
const seedOrgMemberships = async () => {
  const orgId = baseScenario.organization.id;
  for (const roleSetId of [
    baseScenario.space.community.roleSetId,
    baseScenario.subspace.community.roleSetId,
  ]) {
    if (!(await orgIsMemberOf(roleSetId, orgId))) {
      await inviteAndAccept(orgId, roleSetId, adminEmail);
    }
  }
};

/** The persona must be able to READ S and S1, or their cards are hidden. */
const makePersonaUserMember = async () => {
  const persona = TestUserManager.users.organizationAdmin;
  await inviteAndAccept(
    persona.id,
    baseScenario.space.community.roleSetId,
    persona.email
  );
  await gqlAs(
    adminEmail,
    `mutation($roleSetID: UUID!, $actorID: UUID!) {
      assignRoleToUser(roleData: { roleSetID: $roleSetID, actorID: $actorID, role: MEMBER }) { id }
    }`,
    {
      roleSetID: baseScenario.subspace.community.roleSetId,
      actorID: persona.id,
    }
  );
};

// --- Locators ---------------------------------------------------------------

/** Membership cards: leaf cards carrying the menu (the outer "Space
 * Memberships" container is a card too and must not be counted). */
const membershipCards = (page: Page): Locator =>
  page
    .locator('[data-slot="card"]')
    .filter({ hasNot: page.locator('[data-slot="card"]') })
    .filter({ has: page.getByRole('button', { name: COPY.menuTrigger }) });

const membershipCard = (page: Page, name: string): Locator =>
  membershipCards(page).filter({ has: page.getByText(name, { exact: true }) });

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

test.describe('Organization Membership tab — list, search, filter @forge-acceptance', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ actionTimeout: 15_000 });

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await clearHostLead(baseScenario);
    await makePersonaUserMember();
    await seedOrgMemberships();
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
    if (leadScenario) {
      await TestScenarioFactory.cleanUpBaseScenario(leadScenario);
    }
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
    // A second Space L where the organization is Member + Lead (the Lead role
    // is granted through the invitation); removed again afterwards so the
    // later tests still see exactly S and S1.
    leadScenario = await TestScenarioFactory.createBaseScenario({
      name: `org-membership-us1l-${runSuffix}`,
      space: { collaboration: { addTutorialCallouts: false } },
    });
    const orgId = baseScenario.organization.id;
    const leadRoleSetId = leadScenario.space.community.roleSetId;
    const leadName = leadScenario.space.about.profile.displayName;
    try {
      await inviteAndAccept(orgId, leadRoleSetId, adminEmail, [RoleName.Lead]);

      await openTabWithCards(page, 3);
      await expect(
        membershipCard(page, leadName).getByText(COPY.roleLead, { exact: true })
      ).toBeVisible();
      await expect(
        membershipCard(page, subspaceName()).getByText(COPY.roleMember, {
          exact: true,
        })
      ).toBeVisible();
    } finally {
      await removeOrgRoleIfHeld(orgId, leadRoleSetId, RoleName.Lead);
      await removeOrgRoleIfHeld(orgId, leadRoleSetId, RoleName.Member);
    }
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

  test('US1-AS8 title, breadcrumb and copy are localized (no raw keys)', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openTabWithCards(page, 2);

    // English: browser title and breadcrumb name the Membership tab. The title
    // is asserted after in-app tab navigation: on a cold direct load every
    // organization settings tab (Associates, Invitations, Membership) keeps the
    // shell's "Profile" title — pre-existing shell behaviour, not specific to
    // this tab.
    await page.getByRole('tab', { name: COPY.tabAfter, exact: true }).click();
    await page.getByRole('tab', { name: COPY.tab, exact: true }).click();
    await expect(membershipCards(page)).toHaveCount(2);
    await expect(page).toHaveTitle(/Membership/);
    await expect(
      page.locator('header nav').getByText(COPY.tab, { exact: true })
    ).toBeVisible();

    const languageButton = () =>
      page.getByRole('contentinfo').getByRole('button').last();
    try {
      await languageButton().click();
      await page.getByRole('menuitem', { name: 'Nederlands' }).click();

      // The shell re-asserts its own title on a language change (same
      // pre-existing behaviour as above): re-enter the tab to read the title.
      await page
        .getByRole('tab', { name: 'Uitnodigingen', exact: true })
        .click();
      await page
        .getByRole('tab', { name: 'Lidmaatschap', exact: true })
        .click();
      await expect(page).toHaveTitle(/Lidmaatschap/);
      await expect(
        page.getByRole('tab', { name: 'Lidmaatschap', exact: true })
      ).toBeVisible();
      await expect(
        page.getByPlaceholder('Zoek lidmaatschappen...')
      ).toBeVisible();
      await expect(summaryLine(page, 2, 2)).toHaveCount(0);
      await expect(
        page.getByText('2 van 2 lidmaatschappen weergegeven', { exact: true })
      ).toBeVisible();

      // Leave dialog copy is translated too (opened, then dismissed).
      // The shared card locator keys on the English menu label, so address
      // the card by its title instead.
      await page
        .locator('[data-slot="card"]')
        .filter({ hasNot: page.locator('[data-slot="card"]') })
        .filter({ has: page.getByText(spaceName(), { exact: true }) })
        .getByRole('button', { name: 'Meer acties' })
        .click();
      await page.getByRole('menuitem', { name: 'Space verlaten' }).click();
      await expect(
        page
          .getByRole('alertdialog')
          .getByText('Dit lidmaatschap verlaten?', { exact: true })
      ).toBeVisible();
      await page.keyboard.press('Escape');

      // No untranslated i18n keys leak into the page.
      await expect(page.locator('main')).not.toContainText(
        /\b(?:org|shell|shared)\.[A-Za-z]+\.[A-Za-z.]+/
      );
    } finally {
      await languageButton().click();
      await page.getByRole('menuitem', { name: 'English' }).click();
      await expect(page.getByRole('tab', { name: COPY.tab })).toBeVisible();
    }
  });

  test('US1-AS9 skeleton while loading, never the empty caption before the cards', async ({
    page,
  }) => {
    let releaseRoles!: () => void;
    const rolesGate = new Promise<void>(resolve => {
      releaseRoles = resolve;
    });
    await page.route(/graphql/, async route => {
      const body = route.request().postData() ?? '';
      if (body.includes('"operationName":"rolesOrganization"')) {
        await rolesGate;
      }
      await route.continue();
    });

    await page.goto(
      membershipTabUrl(baseUrl, baseScenario.organization.nameId)
    );

    // While the memberships are unresolved: skeleton, and no empty caption.
    await expect(page.locator('main .animate-pulse').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(COPY.empty, { exact: true })).toHaveCount(0);

    releaseRoles();
    await expect(membershipCards(page)).toHaveCount(2, { timeout: 15_000 });
    await expect(page.getByText(COPY.empty, { exact: true })).toHaveCount(0);
    await page.unroute(/graphql/);
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
