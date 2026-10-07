// spec: client-web/src/functional-e2e/organization-space-membership/organization-space-membership-test-plan.md
// server-api coverage: server-api/src/functional-api/roleset/organization/organization-self-removal.it-spec.ts

import { expect, Locator, Page } from '@playwright/test';
import {
  getUserToken,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import {
  baseUrl,
  clearHostLead,
  COPY,
  errorToast,
  ensureOrgRole,
  leaveMenuItem,
  MembershipType,
  membershipTabUrl,
  orgIsLeadOf,
  orgIsMemberOf,
  removeAllOrgSpaceRoles,
  removeOrgRoleIfHeld,
  successToast,
} from './organization-space-membership.helpers';

/**
 * @forge-acceptance
 *
 * User Story 2 — an organization admin makes the organization leave a Space
 * or Subspace from its Membership tab. Every outcome is asserted on the
 * Space's role set through the API as well as on screen.
 *
 * Serial: each test builds on the previous state. The scenario organization
 * starts as a plain Member of Space S and Subspace S1 (and, through the
 * parent/child invitation rule, S2); a second Space L has it as Member + Lead.
 *
 * Environment notes (verified against the 027 platform-role server):
 *  - A NEW organization can only enter a Space through an accepted invitation
 *    (`roleset-entry-role-assign-organization` is no longer held by anyone), so
 *    memberships are seeded with invite + accept, not `assignRoleToOrganization`.
 *  - The Membership tab lists only Spaces the VIEWER can read (Clarification
 *    C-5), and a Subspace is readable by its members only — the persona is
 *    therefore also made a user-Member of S, S1 and S2.
 *  - The harness `admin@alkem.io` must hold PLATFORM_SUPPORT,
 *    PLATFORM_CONTENT_FULL_ACCESS, PLATFORM_LICENSE_MANAGER and
 *    FEATURE_ORGANIZATION_CREATOR for `TestScenarioFactory` to build scenarios.
 */

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'org-membership-leave-admin.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const runSuffix = UniqueIDGenerator.getID();
const gqlEndpoint =
  process.env.ALKEMIO_SERVER ||
  'http://localhost:3000/api/private/non-interactive/graphql';
const adminEmail = process.env.AUTH_TEST_HARNESS_EMAIL || 'admin@alkem.io';

let baseScenario: OrganizationWithSpaceModel;
let leadScenario: OrganizationWithSpaceModel;

const sceneConfig = (name: string, deep: boolean): TestScenarioConfig => ({
  name,
  space: {
    collaboration: { addTutorialCallouts: false },
    ...(deep
      ? {
          subspace: {
            collaboration: { addTutorialCallouts: false },
            subspace: { collaboration: { addTutorialCallouts: false } },
          },
        }
      : {}),
  },
});

const orgId = () => baseScenario.organization.id;
const spaceRoleSetId = () => baseScenario.space.community.roleSetId;
const subspaceRoleSetId = () => baseScenario.subspace.community.roleSetId;
const subsubspaceRoleSetId = () => baseScenario.subsubspace.community.roleSetId;
const leadRoleSetId = () => leadScenario.space.community.roleSetId;
const spaceName = () => baseScenario.space.about.profile.displayName;
const subspaceName = () => baseScenario.subspace.about.profile.displayName;
const subsubspaceName = () =>
  baseScenario.subsubspace.about.profile.displayName;
const leadName = () => leadScenario.space.about.profile.displayName;

// --- API fixtures ----------------------------------------------------------

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

/** Invites `actorID` to the entry role of a Space role set and accepts the
 * invitation as `accepterEmail` (a platform admin may accept on an
 * organization's behalf). Accepting a Subspace invitation also seats the actor
 * in the parent chain (`invitedToParent`). */
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
        welcomeMessage: "us2", extraRoles: $extra
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

/** Makes the scenario organization a Member of the Space, Subspace and
 * sub-subspace (the Space itself is held since creation). */
const seedOrgChain = async () => {
  for (const roleSetId of [
    spaceRoleSetId(),
    subspaceRoleSetId(),
    subsubspaceRoleSetId(),
  ]) {
    if (!(await orgIsMemberOf(roleSetId, orgId()))) {
      await inviteAndAccept(orgId(), roleSetId, adminEmail);
    }
  }
};

/** The persona must be able to READ the Subspaces or their cards are hidden. */
const makePersonaUserMember = async () => {
  const persona = TestUserManager.users.organizationAdmin;
  await inviteAndAccept(persona.id, spaceRoleSetId(), persona.email);
  for (const roleSetId of [subspaceRoleSetId(), subsubspaceRoleSetId()]) {
    await gqlAs(
      adminEmail,
      `mutation($roleSetID: UUID!, $actorID: UUID!) {
        assignRoleToUser(roleData: { roleSetID: $roleSetID, actorID: $actorID, role: MEMBER }) { id }
      }`,
      { roleSetID: roleSetId, actorID: persona.id }
    );
  }
};

// --- Locators ---------------------------------------------------------------

/** The membership cards (leaf cards carrying the menu), excluding the outer
 * "Space Memberships" container, which is a card too. */
const cards = (page: Page): Locator =>
  page
    .locator('[data-slot="card"]')
    .filter({ hasNot: page.locator('[data-slot="card"]') })
    .filter({ has: page.getByRole('button', { name: COPY.menuTrigger }) });

const card = (page: Page, name: string): Locator =>
  cards(page).filter({ has: page.getByText(name, { exact: true }) });

const dialogOf = (page: Page): Locator => page.getByRole('alertdialog');
const leaveButton = (dialog: Locator): Locator =>
  dialog.getByRole('button', { name: COPY.dialogConfirm, exact: true });
const cancelBtn = (dialog: Locator): Locator =>
  dialog.getByRole('button', { name: COPY.dialogCancel, exact: true });

const openTabWithCards = async (page: Page, count: number) => {
  await expect(async () => {
    await page.goto(
      membershipTabUrl(baseUrl, baseScenario.organization.nameId)
    );
    await expect(page).toHaveURL(/\/settings\/membership/, { timeout: 5_000 });
    await expect(cards(page)).toHaveCount(count, { timeout: 5_000 });
  }).toPass({ timeout: 45_000 });
};

const startLeave = async (page: Page, name: string, type: MembershipType) => {
  await card(page, name)
    .getByRole('button', { name: COPY.menuTrigger })
    .click();
  await leaveMenuItem(page, type).click();
  const dialog = dialogOf(page);
  await expect(dialog).toBeVisible();
  return dialog;
};

test.describe('Organization Membership tab — leave a Space', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(240_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(
      sceneConfig(`org-membership-us2-${runSuffix}`, true)
    );
    leadScenario = await TestScenarioFactory.createBaseScenario(
      sceneConfig(`org-membership-us2l-${runSuffix}`, false)
    );
    await clearHostLead(baseScenario);
    await makePersonaUserMember();
    await seedOrgChain();
    // Space L: the organization is Member + Lead (Lead through the invitation).
    await inviteAndAccept(orgId(), leadRoleSetId(), adminEmail, [
      RoleName.Lead,
    ]);
    await setupAuthentication(
      browser,
      TestUserManager.users.organizationAdmin.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(120_000);
    await teardownAuthentication();
    await removeOrgRoleIfHeld(orgId(), leadRoleSetId(), RoleName.Lead);
    await removeOrgRoleIfHeld(orgId(), leadRoleSetId(), RoleName.Member);
    await removeAllOrgSpaceRoles(baseScenario);
    await TestScenarioFactory.cleanUpBaseScenario(leadScenario);
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('US2-AS1 Leave Subspace opens a destructive confirmation naming the Subspace', async ({
    page,
  }) => {
    await openTabWithCards(page, 4); // S, S1, S2, L

    const removeRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('graphql') && request.method() === 'POST') {
        const op = request.postDataJSON()?.operationName ?? '';
        if (/removerolefromorganization/i.test(op)) removeRequests.push(op);
      }
    });

    const dialog = await startLeave(page, subspaceName(), 'Subspace');

    await expect(
      dialog.getByText(COPY.dialogTitle, { exact: true })
    ).toBeVisible();
    await expect(dialog).toContainText(subspaceName());
    // Nothing is sent before confirming.
    expect(removeRequests).toHaveLength(0);
    expect(await orgIsMemberOf(subspaceRoleSetId(), orgId())).toBe(true);
  });

  test('US2-AS2 Cancel changes nothing', async ({ page }) => {
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();

    await cancelBtn(dialog).click();

    await expect(dialog).toBeHidden();
    await expect(cards(page)).toHaveCount(4);
    expect(await orgIsMemberOf(subspaceRoleSetId(), orgId())).toBe(true);
    expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(true);
  });

  test('US2-AS3 confirming leaves only the Subspace chosen', async ({
    page,
  }) => {
    const dialog = await startLeave(page, subspaceName(), 'Subspace');

    await leaveButton(dialog).click();

    await expect(successToast(page)).toBeVisible({ timeout: 5_000 });
    await expect(card(page, subspaceName())).toHaveCount(0);
    await expect(card(page, spaceName())).toBeVisible();
    expect(await orgIsMemberOf(subspaceRoleSetId(), orgId())).toBe(false);
    expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(true);
  });

  test('US2-AS4 leaving the Space ends its Subspace memberships too', async ({
    page,
  }) => {
    // Leaving S1 also ended S2 (shared cascade), and a Subspace invitation
    // re-seats the parent chain — so re-seed the whole chain.
    await seedOrgChain();
    await openTabWithCards(page, 4); // S, S1, S2, L
    await expect(card(page, subsubspaceName())).toBeVisible();

    const dialog = await startLeave(page, spaceName(), 'Space');
    await leaveButton(dialog).click();

    await expect(successToast(page)).toBeVisible({ timeout: 5_000 });
    await expect(card(page, spaceName())).toHaveCount(0);
    await expect(card(page, subspaceName())).toHaveCount(0);
    await expect(card(page, subsubspaceName())).toHaveCount(0);
    await expect(cards(page)).toHaveCount(1); // only L remains
    expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(false);
    expect(await orgIsMemberOf(subspaceRoleSetId(), orgId())).toBe(false);
    expect(await orgIsMemberOf(subsubspaceRoleSetId(), orgId())).toBe(false);
  });

  test('US2-AS5 leaving a Space where the organization is Lead keeps the Lead role', async ({
    page,
  }) => {
    expect(await orgIsMemberOf(leadRoleSetId(), orgId())).toBe(true);
    expect(await orgIsLeadOf(leadRoleSetId(), orgId())).toBe(true);
    await openTabWithCards(page, 1);
    await expect(
      card(page, leadName()).getByText(COPY.roleLead, { exact: true })
    ).toBeVisible();

    const dialog = await startLeave(page, leadName(), 'Space');
    await leaveButton(dialog).click();

    await expect(successToast(page)).toBeVisible({ timeout: 5_000 });
    expect(await orgIsMemberOf(leadRoleSetId(), orgId())).toBe(false);
    expect(await orgIsLeadOf(leadRoleSetId(), orgId())).toBe(true);
    await expect(card(page, leadName())).toBeVisible();
    await expect(
      card(page, leadName()).getByText(COPY.roleLead, { exact: true })
    ).toBeVisible();
  });

  test('US2-AS6 a membership removed meanwhile reports an error, never success', async ({
    page,
  }) => {
    await ensureOrgRole(orgId(), spaceRoleSetId(), RoleName.Member).catch(() =>
      inviteAndAccept(orgId(), spaceRoleSetId(), adminEmail)
    );
    await openTabWithCards(page, 2); // S, L

    // A Space admin removes the organization while the tab is open.
    await removeOrgRoleIfHeld(orgId(), spaceRoleSetId(), RoleName.Member);
    expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(false);
    await expect(card(page, spaceName())).toBeVisible(); // stale tab

    const dialog = await startLeave(page, spaceName(), 'Space');
    await leaveButton(dialog).click();

    await expect(errorToast(page)).toBeVisible({ timeout: 8_000 });
    await expect(dialog).toBeHidden();
    await expect(successToast(page)).toHaveCount(0);
    // The list refreshes to the actual memberships.
    await expect(card(page, spaceName())).toHaveCount(0, { timeout: 8_000 });
    await expect(cards(page)).toHaveCount(1);
  });

  test('US2-AS7 a second submit is impossible while the leave is in flight', async ({
    page,
  }) => {
    await inviteAndAccept(orgId(), spaceRoleSetId(), adminEmail);
    await openTabWithCards(page, 2); // S, L

    let removeRequests = 0;
    await page.route('**/graphql', async route => {
      const op = route.request().postDataJSON()?.operationName ?? '';
      if (/removerolefromorganization/i.test(op)) {
        removeRequests += 1;
        await new Promise(resolve => setTimeout(resolve, 3_000));
      }
      await route.continue();
    });

    try {
      const dialog = await startLeave(page, spaceName(), 'Space');
      await leaveButton(dialog).click();

      // Re-open the same confirmation while the request is still in flight:
      // its confirm is busy/disabled, so no second request can be sent.
      await card(page, spaceName())
        .getByRole('button', { name: COPY.menuTrigger })
        .click();
      await leaveMenuItem(page, 'Space').click();
      await expect(leaveButton(dialogOf(page))).toBeDisabled();
      expect(removeRequests).toBe(1);

      await expect(successToast(page)).toBeVisible({ timeout: 15_000 });
      expect(removeRequests).toBe(1);
      expect(await orgIsMemberOf(spaceRoleSetId(), orgId())).toBe(false);
    } finally {
      await page.unroute('**/graphql');
    }
  });
});
