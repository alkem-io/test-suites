// @forge-acceptance
//
// User Story 3 — Act from the card: view the profile or send a message
// (priority P2).
//
// Spec: the workspace feature spec (AS1..AS8)
// Contract: the workspace feature's contracts/crd-contributor-card.md §5
//
// Builds its own isolated scenario (space + base organisation + virtual
// contributor) via TestScenarioFactory rather than depending on the shared
// "Cards" fixture, so this file runs standalone. Deterministic selectors only
// (the page object's contract locators — `actionsButton`/`menuItem`/
// `websiteLink`/`contributorCard`); no fixed sleeps — every wait is an
// auto-retrying Playwright assertion or a real UI event
// (`context.waitForEvent('page')` for the new-tab check).

import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestUserManager, getGraphqlClient } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/graphql';
import { assignRoleToVirtualContributor } from '@alkemio/tests-lib/scenario/baseFunctions';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { expect, test as base } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { ContributorsCalloutPage } from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const uniqueId = Date.now();

const TITLE = `US3 Card Menu ${uniqueId}`;
const ORG_WEBSITE = 'https://greenfuture.example';
const VC_NAME = `US3 Card Menu VC ${uniqueId}`;

const scenarioConfig: TestScenarioConfig = {
  name: `us3-card-menu-${uniqueId}`,
  space: {
    about: { profile: { displayName: `US3 Card Menu Space ${uniqueId}` } },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      // SPACE_MEMBER stands in for "Ben" (the profile/message target); QA_USER
      // stands in for "Quiet Quinn" (messaging turned off in beforeAll below).
      members: [TestUser.SPACE_MEMBER, TestUser.QA_USER],
    },
  },
  virtualContributors: {
    useBaseOrganization: true,
    virtualContributors: [{ profileDisplayName: VC_NAME }],
  },
};

/** Grants `role` to an ORGANIZATION actor on a space's roleset (space
 * membership — not the organisation's own roleset). `@alkemio/tests-lib` has
 * `assignRoleToUser` / `assignRoleToVirtualContributor` but no organisation
 * equivalent; the generated SDK exposes the mutation directly (same pattern
 * as `us5-organisation-website.spec.ts`'s local helper). */
const assignRoleToOrganization = async (
  roleSetID: string,
  actorID: string,
  role: RoleName
) => {
  const client = getGraphqlClient();
  const res = await graphqlErrorWrapper(
    authToken =>
      client.AssignRoleToOrganization(
        { roleData: { actorID, roleSetID, role } },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (res.error) {
    throw new Error(
      `assignRoleToOrganization(${role}) failed for ${actorID} on ${roleSetID}: ${JSON.stringify(res.error)}`
    );
  }
};

let baseScenario: OrganizationWithSpaceModel;

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'us3-card-menu-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

/** A fresh, unauthenticated context/page — used only for the signed-out half of AS5. */
const anonTest = base;

adminFixture.test.describe(
  'US3 — Act from the card (view profile / message)',
  { tag: '@forge-acceptance' },
  () => {
    adminFixture.test.describe.configure({ mode: 'serial' });

    adminFixture.test.beforeAll(async ({ browser }) => {
      adminFixture.test.setTimeout(120_000);

      baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
      const spaceRoleSetID = baseScenario.space.community.roleSetId;

      // The base organisation is created by every scenario but is NOT a
      // member of the space by default — add it so it renders as an
      // Organizations-segment card.
      await assignRoleToOrganization(
        spaceRoleSetID,
        baseScenario.organization.id,
        RoleName.Member
      );

      const vcId = baseScenario.virtualContributors?.[0]?.id;
      if (!vcId) {
        throw new Error('Scenario did not create the virtual contributor');
      }
      const assigned = await assignRoleToVirtualContributor(
        vcId,
        spaceRoleSetID,
        RoleName.Member
      );
      if (assigned.error) {
        throw new Error(
          `Unable to add the VC to the space: ${JSON.stringify(assigned.error)}`
        );
      }

      // "Quiet Quinn" — turn off receiving messages (AS6 precondition).
      // Inlined (rather than importing the tests-lib helper of the same
      // name) because that helper's module resolves its own internal
      // `@src/*` imports against ITS package's tsconfig; pulled into
      // client-web's compilation it collides with client-web's own `@src/*`
      // alias. Same `graphqlRequestAuth` pattern as the website mutation
      // below.
      const settingsResult = await graphqlRequestAuth(
        {
          operationName: 'DisableMessagingForUs3',
          query: `mutation DisableMessagingForUs3($settingsData: UpdateUserSettingsInput!) {
            updateUserSettings(settingsData: $settingsData) {
              id
              settings { communication { allowOtherUsersToSendMessages } }
            }
          }`,
          variables: {
            settingsData: {
              userID: TestUserManager.users.qaUser.id,
              settings: { communication: { allowOtherUsersToSendMessages: false } },
            },
          },
        },
        TestUser.GLOBAL_ADMIN
      );
      if (settingsResult.body.errors) {
        throw new Error(
          `Unable to disable messaging for the quiet persona: ${JSON.stringify(settingsResult.body.errors)}`
        );
      }

      // A usable, absolute https website on the organisation card (AS7's
      // tab-stop order requires the website control to actually render).
      const websiteResult = await graphqlRequestAuth(
        {
          operationName: 'SetOrganizationWebsiteForUs3',
          query: `mutation SetOrganizationWebsiteForUs3($organizationData: UpdateOrganizationInput!) {
            updateOrganization(organizationData: $organizationData) { id website }
          }`,
          variables: {
            organizationData: { ID: baseScenario.organization.id, website: ORG_WEBSITE },
          },
        },
        TestUser.GLOBAL_ADMIN
      );
      if (websiteResult.body.errors) {
        throw new Error(
          `Unable to set the organisation website: ${JSON.stringify(websiteResult.body.errors)}`
        );
      }

      await adminFixture.setupAuthentication(
        browser,
        TestUserManager.users.spaceAdmin.email
      );

      // Created via the real UI form (same as 0.1contributors-callout.spec.ts)
      // rather than a raw API call, so this file has no cross-package
      // dependency on the server-api package's fixture helpers.
      const cc = new ContributorsCalloutPage(adminFixture.getSharedPage(), baseUrl);
      await cc.navigateToSpace(baseScenario.space.nameId);
      await cc.createContributorsCallout(TITLE);
    });

    adminFixture.test.afterAll(async () => {
      adminFixture.test.setTimeout(30_000);
      await adminFixture.teardownAuthentication();
      if (baseScenario) {
        await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
      }
    });

    // AS1 — "View Profile" opens the contributor's profile in a NEW tab
    // and leaves the space page untouched.
    adminFixture.test(
      'US3-AS1 View Profile opens a new tab; the space page is unchanged',
      async ({ page, context }) => {
        adminFixture.test.setTimeout(30_000);
        const cc = new ContributorsCalloutPage(page, baseUrl);
        await cc.navigateToSpace(baseScenario.space.nameId);
        const col = cc.collection(TITLE);
        await expect(col.region).toBeVisible();
        await col.switchType('People');

        const memberName = TestUserManager.users.spaceMember.displayName;
        const startUrl = page.url();

        await col.actionsButton(memberName).click();
        await expect(col.menuItem('View Profile')).toBeVisible();

        const [newPage] = await Promise.all([
          context.waitForEvent('page'),
          col.menuItem('View Profile').click(),
        ]);
        await newPage.waitForLoadState('domcontentloaded');
        expect(newPage.url()).not.toBe(startUrl);
        await expect(
          newPage.getByRole('heading', { name: memberName })
        ).toBeVisible({ timeout: 15_000 });
        await newPage.close();

        // The originating page kept its URL — nothing navigated it away.
        expect(page.url()).toBe(startUrl);
      }
    );

    // AS2 — "Message" opens the messaging panel on the 1:1 conversation;
    // reopening it lands on the same conversation; nothing is sent.
    adminFixture.test(
      'US3-AS2 Message opens the 1:1 panel; reopening returns the same conversation',
      async ({ page }) => {
        adminFixture.test.setTimeout(30_000);
        const cc = new ContributorsCalloutPage(page, baseUrl);
        await cc.navigateToSpace(baseScenario.space.nameId);
        const col = cc.collection(TITLE);
        await col.switchType('People');

        const memberName = TestUserManager.users.spaceMember.displayName;
        const panelHeading = page.getByRole('heading', { name: memberName });
        const composer = page.getByRole('textbox', { name: 'Add a comment...' });
        const closeButton = page.getByRole('button', { name: 'Close chat' });

        await col.actionsButton(memberName).click();
        await col.menuItem('Message').click();
        await expect(panelHeading).toBeVisible({ timeout: 10_000 });
        await expect(composer).toHaveValue('');

        // Close the panel.
        await closeButton.click();
        await expect(panelHeading).toHaveCount(0);

        // Reopen — same conversation (same header, still nothing sent/typed).
        await col.actionsButton(memberName).click();
        await col.menuItem('Message').click();
        await expect(panelHeading).toBeVisible({ timeout: 10_000 });
        await expect(composer).toHaveValue('');
        await closeButton.click();
      }
    );

    // AS3 — "Message" on an organisation opens the platform's
    // organisation-message dialog; Escape-with-text asks before discarding;
    // sending closes it and confirms success.
    adminFixture.test(
      'US3-AS3 Message on an organisation: compose, discard-guard, send',
      async ({ page }) => {
        adminFixture.test.setTimeout(30_000);
        const cc = new ContributorsCalloutPage(page, baseUrl);
        await cc.navigateToSpace(baseScenario.space.nameId);
        const col = cc.collection(TITLE);
        await col.switchType('Organizations');

        const orgName = baseScenario.organization.profile.displayName;
        await col.actionsButton(orgName).click();
        await col.menuItem('Message').click();

        const dialog = page.getByRole('dialog', { name: 'Send an email' });
        await expect(dialog).toBeVisible();
        await expect(
          dialog.getByText("Delivered to the organisation's administrators.")
        ).toBeVisible();

        const textarea = dialog.getByRole('textbox', { name: 'Compose message' });
        await textarea.fill('Hello from the US3 acceptance walk.');

        // Escape with unsent text asks before discarding.
        await page.keyboard.press('Escape');
        const discardDialog = page.getByRole('alertdialog', {
          name: 'Discard your changes?',
        });
        await expect(discardDialog).toBeVisible();

        // "Keep editing" returns to the compose dialog with the draft intact.
        await discardDialog.getByRole('button', { name: 'Keep editing' }).click();
        await expect(discardDialog).toBeHidden();
        await expect(dialog).toBeVisible();
        await expect(textarea).toHaveValue('Hello from the US3 acceptance walk.');

        // Sending closes the dialog and shows the success toast.
        await dialog.getByRole('button', { name: 'Send', exact: true }).click();
        await expect(page.getByText('Your message has been sent.')).toBeVisible({
          timeout: 10_000,
        });
        await expect(dialog).toBeHidden();
      }
    );

    // AS4 — a Virtual Contributor's menu contains "View Profile" and
    // nothing else.
    adminFixture.test(
      'US3-AS4 A Virtual Contributor card menu offers View Profile only',
      async ({ page }) => {
        adminFixture.test.setTimeout(30_000);
        const cc = new ContributorsCalloutPage(page, baseUrl);
        await cc.navigateToSpace(baseScenario.space.nameId);
        const col = cc.collection(TITLE);
        await col.switchType('Virtual Contributors');

        await col.actionsButton(VC_NAME).click();
        await expect(page.getByRole('menuitem')).toHaveCount(1);
        await expect(col.menuItem('View Profile')).toBeVisible();
        await page.keyboard.press('Escape');
      }
    );

    // AS5 (self half) — the space admin's own card offers View Profile
    // but never Message.
    adminFixture.test(
      "US3-AS5 A viewer's own card never offers Message",
      async ({ page }) => {
        adminFixture.test.setTimeout(30_000);
        const cc = new ContributorsCalloutPage(page, baseUrl);
        await cc.navigateToSpace(baseScenario.space.nameId);
        const col = cc.collection(TITLE);
        await col.switchType('People');

        const ownName = TestUserManager.users.spaceAdmin.displayName;
        await col.actionsButton(ownName).click();
        await expect(page.getByRole('menuitem')).toHaveCount(1);
        await expect(col.menuItem('View Profile')).toBeVisible();
        await expect(col.menuItem('Message')).toHaveCount(0);
        await page.keyboard.press('Escape');
      }
    );

    // AS6 — messaging a recipient who has turned off receiving messages
    // shows the friendly refusal toast, and only that toast; no panel opens.
    adminFixture.test(
      'US3-AS6 Messaging a non-contactable recipient shows one friendly toast',
      async ({ page }) => {
        adminFixture.test.setTimeout(30_000);
        const cc = new ContributorsCalloutPage(page, baseUrl);
        await cc.navigateToSpace(baseScenario.space.nameId);
        const col = cc.collection(TITLE);
        await col.switchType('People');

        const quietName = TestUserManager.users.qaUser.displayName;
        await col.actionsButton(quietName).click();
        await col.menuItem('Message').click();

        await expect(
          page.getByText('This person cannot be contacted.')
        ).toBeVisible({ timeout: 10_000 });
        // No raw/generic backend-error toast alongside the friendly one, and
        // no messaging panel opened.
        await expect(page.getByText(/Error Code: 13103/)).toHaveCount(0);
        await expect(page.getByRole('heading', { name: quietName })).toHaveCount(0);
      }
    );

    // AS7 — keyboard-only: tab stops in order (name, website, actions),
    // Enter/Space opens, arrows move, Escape closes and returns focus,
    // activating the actions control never navigates.
    adminFixture.test(
      'US3-AS7 Keyboard-only: tab order, menu operation, focus return, no navigation',
      async ({ page }) => {
        adminFixture.test.setTimeout(30_000);
        const cc = new ContributorsCalloutPage(page, baseUrl);
        await cc.navigateToSpace(baseScenario.space.nameId);
        const col = cc.collection(TITLE);
        await col.switchType('Organizations');

        const orgName = baseScenario.organization.profile.displayName;
        const nameLink = col.contributorCard(orgName);
        const websiteControl = col.websiteLink(orgName);
        const actionsControl = col.actionsButton(orgName);
        const startUrl = page.url();

        await nameLink.focus();
        await expect(nameLink).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(websiteControl).toBeFocused();

        await page.keyboard.press('Tab');
        await expect(actionsControl).toBeFocused();

        // Enter opens the menu; activating the control itself never navigates.
        await page.keyboard.press('Enter');
        await expect(col.menuItem('View Profile')).toBeVisible();
        expect(page.url()).toBe(startUrl);

        // Arrow keys move between items.
        await page.keyboard.press('ArrowDown');
        await expect(col.menuItem('Message')).toBeFocused();

        // Escape closes the menu and returns focus to the actions control.
        await page.keyboard.press('Escape');
        await expect(col.menuItem('View Profile')).toHaveCount(0);
        await expect(actionsControl).toBeFocused();
        expect(page.url()).toBe(startUrl);
      }
    );

    // AS8 — the space admin sees no "Remove from Space" item on any card
    // type (deferred — R-7 / R-8).
    adminFixture.test(
      'US3-AS8 No "Remove from Space" item on any card type, for the admin',
      async ({ page }) => {
        adminFixture.test.setTimeout(30_000);
        const cc = new ContributorsCalloutPage(page, baseUrl);
        await cc.navigateToSpace(baseScenario.space.nameId);
        const col = cc.collection(TITLE);

        const removeItem = page.getByRole('menuitem', {
          name: /remove from space/i,
        });

        await col.switchType('People');
        await col
          .actionsButton(TestUserManager.users.spaceMember.displayName)
          .click();
        await expect(removeItem).toHaveCount(0);
        await page.keyboard.press('Escape');

        await col.switchType('Organizations');
        await col
          .actionsButton(baseScenario.organization.profile.displayName)
          .click();
        await expect(removeItem).toHaveCount(0);
        await page.keyboard.press('Escape');

        await col.switchType('Virtual Contributors');
        await col.actionsButton(VC_NAME).click();
        await expect(removeItem).toHaveCount(0);
        await page.keyboard.press('Escape');
      }
    );
  }
);

// AS5 (signed-out half) — a signed-out visitor never sees "Message" on
// any card. Runs unauthenticated — deliberately outside the admin fixture's
// shared session/context.
anonTest(
  'US3-AS5 A signed-out visitor never sees Message on any card',
  async ({ page }) => {
    anonTest.setTimeout(30_000);
    // baseScenario is populated by the serial block's beforeAll, which
    // Playwright runs before any test in the file (top-level tests run after
    // every describe block in the same file has executed its beforeAll); the
    // Contributors post is on a public space, so an anonymous visitor can
    // read it.
    const cc = new ContributorsCalloutPage(page, baseUrl);
    await cc.navigateToSpace(baseScenario.space.nameId);
    const col = cc.collection(TITLE);
    await expect(col.region).toBeVisible({ timeout: 15_000 });
    await col.switchType('People');

    const memberName = TestUserManager.users.spaceMember.displayName;
    await col.actionsButton(memberName).click();
    await expect(col.menuItem('View Profile')).toBeVisible();
    await expect(col.menuItem('Message')).toHaveCount(0);
    await page.keyboard.press('Escape');

    await col.switchType('Organizations');
    const orgName = baseScenario.organization.profile.displayName;
    await col.actionsButton(orgName).click();
    await expect(col.menuItem('View Profile')).toBeVisible();
    await expect(col.menuItem('Message')).toHaveCount(0);
    await page.keyboard.press('Escape');
  }
);
