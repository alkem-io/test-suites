// User Story 1: "Space admin invites an organization".
// server-api coverage: server-api/src/functional-api/roleset/invitations/invitation-organization.it-spec.ts
//   (AS7/AS8 are validation errors ONLY reachable through the API — the unified
//   invite dialog never offers an Admin role or a non-actor id for organizations —
//   so they are proven there, not re-driven through this browser walk.)

import { expect, Page, test as baseTest } from '@playwright/test';
import { TestScenarioConfig, TestScenarioFactory } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  RoleName,
  RoleSetInvitationResultType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  OrgFixture,
  TestUser,
  TestUserManager,
  assignOrgRole,
  assignOrganizationAdmin,
  cleanUpTestOrganizations,
  clearHostOrgFromSpace,
  createTestOrganization,
  getMyCommunityInvitationIds,
  getSpaceInvitationIds,
  inviteOrganizationViaApi,
  runSuffix,
  setAllowSpaceInvitations,
} from './organization-space-invitations.helpers';

/**
 * @forge-acceptance
 *
 * Live acceptance walk for User Story 1 ("Space admin invites an
 * organization", P1) — scenarios AS1..AS9.
 *
 * Every organization fixture is purpose-built per scenario (own display name,
 * own state) so scenarios never depend on one another's outcome and can be
 * read/maintained independently, even though they share one Space (created
 * once in `beforeAll`) and run against the live stack.
 *
 * AS7 and AS8 are validation errors that are ONLY reachable through the raw
 * API — the unified invite dialog never offers an organization the Admin role
 * or lets a non-actor id be typed in — so they are not (and cannot honestly
 * be) driven through this browser walk. They are covered end-to-end by
 * `server-api/src/functional-api/roleset/invitations/invitation-organization.it-spec.ts`.
 *
 * Fixture setup (`beforeAll`/`afterAll`) is pure API work with no `page`/
 * `browser` dependency, so it is registered on the plain `@playwright/test`
 * `test` (root scope, runs once for the whole file) rather than on either
 * persona-scoped `test` below — those are only for the two UI personas
 * AS1 needs (a Space admin and a platform admin).
 */

// Literal fixture-persona emails (TestUser.SPACE_ADMIN / TestUser.GLOBAL_ADMIN,
// per `TestUserManager`'s `<value>@alkem.io` convention) — `createPersonaTest`
// runs at module load time, before global-setup has populated
// `TestUserManager.users`, so it cannot be read here (existing precedent:
// client-web/src/functional-e2e/user-profile/*.spec.ts use the same literal-email pattern).
const spaceAdminTest = createPersonaTest('space.admin@alkem.io');
const platformAdminTest = createPersonaTest('admin@alkem.io');
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

// This file's `describe` blocks share one beforeAll-created scenario (and its
// own set of purpose-built organization fixtures): force one worker so
// `fullyParallel` cannot run them in separate workers, which would trigger
// `beforeAll` twice (two independent scenarios, doubling every organization
// created) and race `afterAll`'s cleanup of the first.
baseTest.describe.configure({ mode: 'serial' });

let baseScenario: OrganizationWithSpaceModel;
let communityUrl: string;

// One organization fixture per scenario that needs one — created once in
// beforeAll, asserted against in exactly one scenario each.
let orgAS2: OrgFixture; // fresh org, invited as Member only
let orgAS3Filler1: OrgFixture; // already granted Lead (fills slot 1 of 2)
let orgAS3Filler2: OrgFixture; // already granted Lead (fills slot 2 of 2)
let orgAS3Overflow: OrgFixture; // invited as Lead once both slots are full
let orgAS4: OrgFixture; // allowSpaceInvitations: false
let orgAS5Member: OrgFixture; // already granted Member directly
let orgAS5Invited: OrgFixture; // already has a pending invitation (seeded via API)
let orgAS6: OrgFixture; // invited via the dialog, then revoked
let orgAS9Match: OrgFixture; // already a Member — matches the AS9 search term
let orgAS9NoMatch: OrgFixture; // already a Member — must NOT match the AS9 search term

const scenarioConfig: TestScenarioConfig = {
  name: `org-invite-us1-${runSuffix}`,
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN],
    },
  },
};

baseTest.beforeAll(async () => {
  baseTest.setTimeout(180_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  communityUrl = `${baseUrl}/${baseScenario.space.nameId}/settings/community`;
  const roleSetId = baseScenario.space.community.roleSetId;

  // The Space's own hosting organization is granted Member+Lead on creation, so
  // one of the two Lead-organization slots is occupied before this fixture
  // starts. The AS3 fixture below fills "both Lead slots" and overflowed on the
  // second with ROLESET_POLICY_ROLE_LIMITS_VIOLATED. Free them first — the same
  // thing `organization-invitations.it-spec.ts` has always done.
  await clearHostOrgFromSpace(baseScenario.organization.id, roleSetId);

  [
    orgAS2,
    orgAS3Filler1,
    orgAS3Filler2,
    orgAS3Overflow,
    orgAS4,
    orgAS5Member,
    orgAS5Invited,
    orgAS6,
    orgAS9Match,
    orgAS9NoMatch,
  ] = await Promise.all([
    createTestOrganization('AS2 Fresh Org', runSuffix),
    createTestOrganization('AS3 Lead Filler One', runSuffix),
    createTestOrganization('AS3 Lead Filler Two', runSuffix),
    createTestOrganization('AS3 Lead Overflow', runSuffix),
    createTestOrganization('AS4 Opted Out Org', runSuffix),
    createTestOrganization('AS5 Existing Member', runSuffix),
    createTestOrganization('AS5 Existing Invite', runSuffix),
    createTestOrganization('AS6 Revoke Target', runSuffix),
    createTestOrganization('ZzzSearchable Acme', runSuffix),
    createTestOrganization('ZzzSearchable Beta', runSuffix),
  ]);

  // AS3 fixture: both Lead slots already taken (granted, not just invited).
  await assignOrgRole(orgAS3Filler1.id, roleSetId, RoleName.Member);
  await assignOrgRole(orgAS3Filler1.id, roleSetId, RoleName.Lead);
  await assignOrgRole(orgAS3Filler2.id, roleSetId, RoleName.Member);
  await assignOrgRole(orgAS3Filler2.id, roleSetId, RoleName.Lead);

  // AS4 fixture: opted out of Space invitations.
  await setAllowSpaceInvitations(orgAS4.id, false);

  // AS5 fixtures: one already a Member, one already invited.
  await assignOrgRole(orgAS5Member.id, roleSetId, RoleName.Member);
  await inviteOrganizationViaApi(
    roleSetId,
    orgAS5Invited.id,
    `US1-AS5 pre-seeded invitation ${runSuffix}`,
    TestUser.GLOBAL_ADMIN
  );

  // AS6 fixture: an org-admin standing on orgAS6 itself, for the
  // org-admin-side "gone from their pending invitations" check.
  // TestUser.QA_USER has no role on this scenario's own Space, so it is a
  // spare persona free to be repurposed as orgAS6's admin.
  await assignOrganizationAdmin(orgAS6.roleSetId, TestUserManager.users.qaUser.id);

  // AS9 fixtures: both already Members (search filters the Member
  // Organisations table itself, not the pending list).
  await assignOrgRole(orgAS9Match.id, roleSetId, RoleName.Member);
  await assignOrgRole(orgAS9NoMatch.id, roleSetId, RoleName.Member);
});

baseTest.afterAll(async () => {
  // Ad-hoc org fixtures first: cleanUpBaseScenario does not know about them,
  // so without this each run leaks every organization this file created.
  await cleanUpTestOrganizations();
  // beforeAll may have failed before the scenario existed (a browser that will
  // not launch is enough). cleanUpBaseScenario dereferences the scenario, so
  // calling it with undefined replaces the real failure with a TypeError.
  if (baseScenario) {
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  }
});

// ─── Page-level helpers (source-derived selectors — see
// client-web/src/crd/components/space/settings/SpaceSettingsCommunityView.tsx
// and client-web/src/crd/components/community/InviteMembersDialog.tsx) ───

async function openMemberOrganizationsSection(page: Page) {
  await page.goto(communityUrl);
  const toggle = page.getByRole('button', { name: /Member Organisations/ });
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

/** Drives the unified invite dialog (organization kind) end to end for one
 * organization and returns the text of its result row. Leaves the dialog
 * closed on return. */
async function inviteOrganizationViaDialog(
  page: Page,
  org: OrgFixture,
  options: { asLead?: boolean } = {}
): Promise<string> {
  await page.getByRole('button', { name: 'Invite Organisation' }).click();
  // Scoped to the dialog: the Member Organisations SECTION DESCRIPTION behind it
  // now also reads "…Invite an organisation to join, or add one directly."
  // (spaceSettings i18n), so an unscoped getByText matches two elements and
  // fails Playwright strict mode. The dialog's own title carries the Space name.
  await expect(page.getByRole('dialog').getByText(/Invite an organisation to join/)).toBeVisible();

  const search = page.getByRole('textbox', { name: 'Search for organisations by name' });
  await search.fill(org.displayName);
  await page.getByRole('button', { name: org.displayName }).click();

  if (options.asLead) {
    const roleTrigger = page.getByRole('button', { name: 'Choose roles for the invitees' });
    await roleTrigger.click();
    await page.getByRole('checkbox', { name: 'Lead' }).check();
    // Close the popover (re-click the trigger) rather than pressing Escape,
    // which would also risk dismissing the outer Dialog.
    await roleTrigger.click();
  }

  await page.getByRole('button', { name: 'Send' }).click();

  // Scope to the dialog: the pending-invitations list behind it can render
  // its own <li> for the same organization (already-invited scenarios, or
  // a background refetch while this dialog is still open), which would
  // otherwise make this locator resolve to more than one element.
  const dialog = page.getByRole('dialog');
  // Wait for the RESULTS view before reading any <li>. The selection step keeps
  // its own <li> chip per selected organization — avatar initials + display
  // name — and it is still mounted while the send is in flight, so reading
  // straight after the click returned "AFAS2 Fresh Org 31596" (the chip)
  // instead of the outcome. `Back` exists only in the results view, so its
  // appearance is the transition signal; `Send` is not usable for this because
  // it becomes "Sending…", which still substring-matches "Send".
  await expect(dialog.getByRole('button', { name: 'Back' })).toBeVisible();
  const resultRow = dialog.locator('li').filter({ hasText: org.displayName });
  await expect(resultRow).toBeVisible();
  const resultText = (await resultRow.textContent()) ?? '';

  // Exact match: the dialog's own dismiss control is labelled "Close invite
  // dialog", which a substring match would also select, making this locator
  // resolve to two elements and fail Playwright's strict mode.
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  return resultText;
}

spaceAdminTest.describe('US1-AS1 — permission gating (space admin half)', () => {
  spaceAdminTest(
    'a Space admin who is not a platform admin can Invite Organisation; Add Organisation is present but disabled',
    async ({ page }) => {
      await openMemberOrganizationsSection(page);
      await expect(page.getByRole('button', { name: 'Invite Organisation' })).toBeEnabled();
      // Gated, not hidden: the platform-wide convention (workspace#085) renders
      // an unavailable action disabled with a reason tooltip rather than
      // concealing that it exists. `GatedAction` sets the native disabled
      // attribute, so the control is genuinely inert.
      await expect(page.getByRole('button', { name: 'Add Organisation' })).toBeDisabled();
    }
  );
});

platformAdminTest.describe('US1-AS1 — permission gating (platform admin half)', () => {
  platformAdminTest(
    'a platform admin sees both Invite Organisation and Add Organisation',
    async ({ page }) => {
      await openMemberOrganizationsSection(page);
      await expect(page.getByRole('button', { name: 'Invite Organisation' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Organisation' })).toBeEnabled();
    }
  );
});

spaceAdminTest.describe('US1-AS2..AS9 — space admin invite walk', () => {
  spaceAdminTest(
    'US1-AS2: inviting as Member produces "Invitation sent" and a Member-only pending row, not in the top pending table',
    async ({ page }) => {
      await openMemberOrganizationsSection(page);
      const resultText = await inviteOrganizationViaDialog(page, orgAS2);
      expect(resultText).toContain('Invitation sent');

      const pendingRow = page.locator('li').filter({ hasText: orgAS2.displayName });
      await expect(pendingRow).toBeVisible();
      await expect(pendingRow).toContainText('Role: Member');
      await expect(pendingRow).not.toContainText('Member + Lead');
      await expect(
        page.getByRole('button', { name: `Revoke invitation to ${orgAS2.displayName}` })
      ).toBeVisible();

      // The organization pending list lives under its own "Pending
      // Invitations" heading inside Member Organisations — not the page's
      // top pending-memberships table (user/VC only). That table is the one
      // with a "Status" column (unique to it — neither the Members nor the
      // Organizations table has one), so scope the negative assertion to it.
      await expect(page.getByRole('heading', { name: 'Pending Invitations' })).toBeVisible();
      const topPendingTable = page.locator('table').filter({
        has: page.getByRole('columnheader', { name: 'Status' }),
      });
      await expect(topPendingTable.getByText(orgAS2.displayName)).toHaveCount(0);
    }
  );

  spaceAdminTest(
    'US1-AS2 (search exclusion fix): an organization that is already a granted Member of the Space is excluded from the invite dialog\'s organization search results',
    async ({ page }) => {
      // Regression test for the defect found in an earlier verification pass:
      // InviteMembersDialogConnector.tsx called useRoleSetAvailableContributors
      // for organization candidates without filterCurrentMembers, so an
      // already-granted-Member organization was still offered as a selectable
      // search result (the server-side ALREADY_MEMBER_OF_ROLE_SET safety net
      // caught it on send, but the UI-level exclusion the scenario requires
      // never happened). orgAS5Member is granted MEMBER directly in beforeAll,
      // before any test runs, so it is already a current member here.
      await openMemberOrganizationsSection(page);
      await page.getByRole('button', { name: 'Invite Organisation' }).click();
      await expect(page.getByRole('dialog').getByText(/Invite an organisation to join/)).toBeVisible();

      const search = page.getByRole('textbox', { name: 'Search for organisations by name' });
      await search.fill(orgAS5Member.displayName);
      await expect(page.getByText(/no matching/i)).toBeVisible();
      await expect(page.getByRole('button', { name: orgAS5Member.displayName })).toHaveCount(0);

      // The bare "Close" button belongs to the RESULTS view and only exists
      // after a send. This scenario never sends, so the dialog's own chrome
      // dismiss control ("Close invite dialog", community.en.json ->
      // closeAriaLabel) is the only way out.
      await page.getByRole('button', { name: 'Close invite dialog' }).click();
    }
  );

  spaceAdminTest(
    'US1-AS3: inviting a 3rd organization as Lead once both Lead slots are granted returns the Lead-limit outcome and creates nothing',
    async ({ page }) => {
      await openMemberOrganizationsSection(page);
      const resultText = await inviteOrganizationViaDialog(page, orgAS3Overflow, { asLead: true });
      expect(resultText).toContain('The Lead role limit for organisations has been reached');

      await expect(
        page.locator('li').filter({ hasText: orgAS3Overflow.displayName })
      ).toHaveCount(0);
    }
  );

  spaceAdminTest(
    'US1-AS4: inviting an organization that opted out returns the not-accepting outcome and creates nothing',
    async ({ page }) => {
      await openMemberOrganizationsSection(page);
      const resultText = await inviteOrganizationViaDialog(page, orgAS4);
      expect(resultText).toContain('This organisation is not accepting Space invitations');
      await expect(page.locator('li').filter({ hasText: orgAS4.displayName })).toHaveCount(0);
    }
  );

  // US1-AS5 is a TWO-LAYER scenario, and the two layers cannot both be driven
  // through the dialog.
  //
  // The dialog now excludes both an already-granted Member (via
  // `filterCurrentMembers`) and an organization with an open invitation (via
  // `openOrgInvitationIds`) from its search results — that is the AS2 fix, and
  // the walk below proves it for the already-invited case (AS2's own walk
  // proves it for the member case). There is therefore NO sequence of UI
  // actions that reaches the "Already a member" / "Already invited" outcome
  // rows: an earlier version of this file tried to click those very buttons
  // and could only ever time out.
  //
  // The server-side safety net those outcomes belong to is still required —
  // the mutation is public API and must stay idempotent for any other caller —
  // so it is asserted here at the layer where it is actually reachable.

  spaceAdminTest(
    'US1-AS5 (UI layer): an organization with an open invitation is excluded from the invite dialog\'s search results',
    async ({ page }) => {
      await openMemberOrganizationsSection(page);
      await page.getByRole('button', { name: 'Invite Organisation' }).click();
      await expect(page.getByRole('dialog').getByText(/Invite an organisation to join/)).toBeVisible();

      const search = page.getByRole('textbox', { name: 'Search for organisations by name' });
      await search.fill(orgAS5Invited.displayName);
      await expect(page.getByText(/no matching/i)).toBeVisible();
      await expect(
        page.getByRole('button', { name: orgAS5Invited.displayName })
      ).toHaveCount(0);

      // The bare "Close" button belongs to the RESULTS view and only exists
      // after a send. This scenario never sends, so the dialog's own chrome
      // dismiss control ("Close invite dialog", community.en.json ->
      // closeAriaLabel) is the only way out.
      await page.getByRole('button', { name: 'Close invite dialog' }).click();

      // The pre-seeded pending row is still there, exactly once — excluding the
      // organization from the picker must not have disturbed the pending list.
      await expect(
        page.locator('li').filter({ hasText: orgAS5Invited.displayName })
      ).toHaveCount(1);
    }
  );

  baseTest(
    'US1-AS5 (server safety net): re-inviting an already-Member or already-invited organization is idempotent — typed outcome, nothing created',
    async () => {
      const roleSetId = baseScenario.space.community.roleSetId;

      const alreadyMember = await inviteOrganizationViaApi(
        roleSetId,
        orgAS5Member.id,
        'AS5 duplicate — already a member'
      );
      expect(alreadyMember.data?.inviteForEntryRoleOnRoleSet?.[0]?.type).toEqual(
        RoleSetInvitationResultType.AlreadyMemberOfRoleSet
      );
      expect(
        alreadyMember.data?.inviteForEntryRoleOnRoleSet?.[0]?.invitation
      ).toBeFalsy();

      const invitationIdsBefore = await getSpaceInvitationIds(baseScenario.space.id);

      const alreadyInvited = await inviteOrganizationViaApi(
        roleSetId,
        orgAS5Invited.id,
        'AS5 duplicate — already invited'
      );
      expect(alreadyInvited.data?.inviteForEntryRoleOnRoleSet?.[0]?.type).toEqual(
        RoleSetInvitationResultType.AlreadyInvitedToRoleSet
      );
      // ALREADY_INVITED deliberately echoes the EXISTING invitation so the
      // client can point the inviter at it (role.set.resolver.mutations.
      // membership.ts) — unlike ALREADY_MEMBER above, which has no invitation
      // to point at. "Nothing created" is proven by the unchanged id set
      // below, not by an absent payload.
      expect(invitationIdsBefore).toContain(
        alreadyInvited.data?.inviteForEntryRoleOnRoleSet?.[0]?.invitation?.id
      );

      // No second invitation row for the organization: the open-invitation
      // count on the Space is unchanged.
      const invitationIdsAfter = await getSpaceInvitationIds(baseScenario.space.id);
      expect(invitationIdsAfter.sort()).toEqual(invitationIdsBefore.sort());
    }
  );

  spaceAdminTest(
    "US1-AS6: revoking a pending organization invitation removes it from the Space list and from the org admin's pending invitations",
    async ({ page }) => {
      await openMemberOrganizationsSection(page);
      const resultText = await inviteOrganizationViaDialog(page, orgAS6);
      expect(resultText).toContain('Invitation sent');

      // Confirmed visible to orgAS6's admin (via the API — the org-side UI is
      // US3's scope) before revoking.
      const [beforeIds, spaceInvitationsBefore] = await Promise.all([
        getMyCommunityInvitationIds(TestUser.QA_USER),
        getSpaceInvitationIds(baseScenario.space.id),
      ]);
      const invitationId = spaceInvitationsBefore.find(id => beforeIds.includes(id));
      expect(invitationId).toBeTruthy();

      await page.getByRole('button', { name: `Revoke invitation to ${orgAS6.displayName}` }).click();
      // Revoking is destructive, so it is confirmed: the row survives the first
      // click and only goes once the alertdialog is confirmed.
      const revokeConfirm = page.getByRole('alertdialog', { name: 'Revoke invitation' });
      await expect(revokeConfirm).toBeVisible();
      await revokeConfirm.getByRole('button', { name: 'Confirm' }).click();
      await expect(page.locator('li').filter({ hasText: orgAS6.displayName })).toHaveCount(0);

      const afterIds = await getMyCommunityInvitationIds(TestUser.QA_USER);
      expect(afterIds).not.toContain(invitationId);
    }
  );

  spaceAdminTest(
    'US1-AS9: typing in the search field above Member Organisations filters the list by name',
    async ({ page }) => {
      await openMemberOrganizationsSection(page);
      await expect(page.getByText(orgAS9Match.displayName)).toBeVisible();
      await expect(page.getByText(orgAS9NoMatch.displayName)).toBeVisible();

      await page.getByRole('textbox', { name: 'Search organisations…' }).fill('ZzzSearchable Acme');

      await expect(page.getByText(orgAS9Match.displayName)).toBeVisible();
      await expect(page.getByText(orgAS9NoMatch.displayName)).toHaveCount(0);
    }
  );
});
