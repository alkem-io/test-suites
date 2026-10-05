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
import {
  TestUserManager,
  UniqueIDGenerator,
  getGraphqlClient,
} from '@alkemio/tests-lib';
import {
  RoleName,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/graphql';
import {
  assignRoleToOrganization,
  assignRoleToVirtualContributor,
  assignRoleToUser,
  createUser,
} from '@alkemio/tests-lib/scenario/baseFunctions';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { expect, type Route } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { ContributorsCalloutPage } from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const uniqueId = UniqueIDGenerator.getID();

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
      // SPACE_MEMBER stands in for "Ben" (the profile/message target).
      // "Quiet Quinn" is NOT a shared global persona — it is a throwaway
      // user this scenario creates and owns itself (see beforeAll below), so
      // it never has to touch a persona another suite relies on.
      members: [TestUser.SPACE_MEMBER],
    },
    // PUBLIC so the signed-out case (US3-AS5) can read the post at all; new
    // L0 spaces are PRIVATE by default.
    settings: { privacy: { mode: SpacePrivacyMode.Public } },
  },
  virtualContributors: {
    useBaseOrganization: true,
    virtualContributors: [{ profileDisplayName: VC_NAME }],
  },
};

/** Deletes the scenario-owned throwaway user created for "Quiet Quinn".
 * `@alkemio/tests-lib/scenario/baseFunctions` has no `deleteUser` export, so
 * this calls the generated SDK client directly — same
 * `graphqlErrorWrapper`/`getGraphqlClient` pattern as
 * `assignRoleToOrganization` above. */
const deleteQuietPersona = async (userId: string) => {
  const client = getGraphqlClient();
  const res = await graphqlErrorWrapper(
    authToken =>
      client.deleteUser(
        { deleteData: { ID: userId, deleteIdentity: false } },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (res.error) {
    throw new Error(
      `deleteUser failed for ${userId}: ${JSON.stringify(res.error)}`
    );
  }
};

let baseScenario: OrganizationWithSpaceModel;
// Scenario-owned throwaway persona standing in for "Quiet Quinn" (messaging
// turned off in beforeAll below). Created and deleted by this file — never
// the shared global `TestUserManager.users.qaUser`, which other suites on
// the same stack depend on being contactable.
let quietPersonaId: string;
const QUIET_NAME = `Quiet Quinn ${uniqueId}`;

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'us3-card-menu-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

adminFixture.test.describe(
  'US3 — Act from the card (view profile / message)',
  { tag: '@forge-acceptance' },
  () => {
    adminFixture.test.describe.configure({ mode: 'serial' });

    adminFixture.test.beforeAll(async ({ browser }) => {
      adminFixture.test.setTimeout(120_000);

      baseScenario =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);
      const spaceRoleSetID = baseScenario.space.community.roleSetId;

      // The base organisation is created by every scenario but is NOT a
      // member of the space by default — add it so it renders as an
      // Organizations-segment card.
      await assignRoleToOrganization(
        baseScenario.organization.id,
        spaceRoleSetID,
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

      // "Quiet Quinn" — a scenario-owned throwaway user, member of this
      // scenario's space, with messaging turned off (AS6 precondition).
      // `createUser`/`assignRoleToUser` come from the same
      // `@alkemio/tests-lib/scenario/baseFunctions` module already imported
      // above for the VC role assignment — plain relative imports, so
      // (unlike the tests-lib helper of the same name as the settings
      // mutation below) they don't collide with client-web's own `@src/*`
      // alias.
      const createdQuiet = await createUser({
        profileData: { displayName: QUIET_NAME },
      });
      if (createdQuiet.error) {
        throw new Error(
          `Unable to create the quiet persona: ${JSON.stringify(createdQuiet.error)}`
        );
      }
      quietPersonaId = createdQuiet.data!.createUser.id;

      const quietAssigned = await assignRoleToUser(
        quietPersonaId,
        spaceRoleSetID,
        RoleName.Member
      );
      if (quietAssigned.error) {
        throw new Error(
          `Unable to add the quiet persona to the space: ${JSON.stringify(quietAssigned.error)}`
        );
      }

      // Turn off receiving messages. Inlined (rather than importing the
      // tests-lib helper of the same name) because that helper's module
      // resolves its own internal `@src/*` imports against ITS package's
      // tsconfig; pulled into client-web's compilation it collides with
      // client-web's own `@src/*` alias.
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
              userID: quietPersonaId,
              settings: {
                communication: { allowOtherUsersToSendMessages: false },
              },
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
            organizationData: {
              ID: baseScenario.organization.id,
              website: ORG_WEBSITE,
            },
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
      const cc = new ContributorsCalloutPage(
        adminFixture.getSharedPage(),
        baseUrl
      );
      await cc.navigateToSpace(baseScenario.space.nameId);
      await cc.createContributorsCallout(TITLE);
    });

    adminFixture.test.afterAll(async () => {
      adminFixture.test.setTimeout(30_000);
      await adminFixture.teardownAuthentication();
      try {
        // Throws on failure so a leaked throwaway user is reported.
        if (quietPersonaId) await deleteQuietPersona(quietPersonaId);
      } finally {
        if (baseScenario) {
          await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
        }
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
        // The chat panel is a dialog named after the conversation partner.
        const panelHeading = page.getByRole('dialog', { name: memberName });
        const composer = page.getByRole('textbox', {
          name: 'Add a comment...',
        });
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
      'US3-AS3 Message on an organisation: compose, discard-guard, failed send keeps the draft, send, discard',
      async ({ page }) => {
        adminFixture.test.setTimeout(60_000);
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

        const textarea = dialog.getByRole('textbox', {
          name: 'Compose message',
        });
        await textarea.fill('Hello from the US3 acceptance walk.');

        // Escape with unsent text asks before discarding.
        await page.keyboard.press('Escape');
        const discardDialog = page.getByRole('alertdialog', {
          name: 'Discard your changes?',
        });
        await expect(discardDialog).toBeVisible();

        // "Keep editing" returns to the compose dialog with the draft intact.
        await discardDialog
          .getByRole('button', { name: 'Keep editing' })
          .click();
        await expect(discardDialog).toBeHidden();
        await expect(dialog).toBeVisible();
        await expect(textarea).toHaveValue(
          'Hello from the US3 acceptance walk.'
        );

        // A failed send keeps the draft and shows the error (FR-020). Fault
        // injection: only this one request is aborted at the network layer;
        // nothing is fabricated, the client handles a real transport failure.
        const failSend = async (route: Route) => {
          const body = route.request().postDataJSON() as {
            operationName?: string;
          } | null;
          if (body?.operationName === 'sendMessageToOrganization') {
            await route.abort('failed');
          } else {
            await route.fallback();
          }
        };
        await page.route('**/graphql*', failSend);
        await dialog.getByRole('button', { name: 'Send', exact: true }).click();
        await expect(dialog.getByRole('alert')).toBeVisible({
          timeout: 10_000,
        });
        await expect(dialog).toBeVisible();
        await expect(textarea).toHaveValue(
          'Hello from the US3 acceptance walk.'
        );
        await page.unroute('**/graphql*', failSend);

        // Sending closes the dialog and shows the success toast.
        await dialog.getByRole('button', { name: 'Send', exact: true }).click();
        await expect(page.getByText('Your message has been sent.')).toBeVisible(
          {
            timeout: 10_000,
          }
        );
        await expect(dialog).toBeHidden();

        // Confirming the discard question closes the dialog and drops the draft.
        await col.actionsButton(orgName).click();
        await col.menuItem('Message').click();
        await expect(dialog).toBeVisible();
        await textarea.fill('A draft to throw away.');
        await page.keyboard.press('Escape');
        await expect(discardDialog).toBeVisible();
        await discardDialog.getByRole('button', { name: 'Yes, close' }).click();
        await expect(dialog).toBeHidden();
        await col.actionsButton(orgName).click();
        await col.menuItem('Message').click();
        await expect(textarea).toHaveValue('');
        await page.keyboard.press('Escape');
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

        const quietName = QUIET_NAME;
        await col.actionsButton(quietName).click();
        await col.menuItem('Message').click();

        await expect(
          page.getByText('This person cannot be contacted.')
        ).toBeVisible({ timeout: 10_000 });
        // No raw/generic backend-error toast alongside the friendly one, and
        // no messaging panel opened.
        await expect(page.getByText(/Error Code: 13103/)).toHaveCount(0);
        // The chat panel would be a dialog named after the recipient (AS2).
        await expect(page.getByRole('dialog', { name: quietName })).toHaveCount(
          0
        );
        await expect(
          page.getByRole('button', { name: 'Close chat' })
        ).toHaveCount(0);
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

        const menu = page.getByRole('menu');
        const cases: [Parameters<typeof col.switchType>[0], string][] = [
          ['People', TestUserManager.users.spaceMember.displayName],
          ['Organizations', baseScenario.organization.profile.displayName],
          ['Virtual Contributors', VC_NAME],
        ];
        for (const [type, name] of cases) {
          await col.switchType(type);
          await col.actionsButton(name).click();
          // Positive control: the menu is open and populated before the absence check.
          await expect(menu, name).toBeVisible();
          await expect(col.menuItem('View Profile'), name).toBeVisible();
          await expect(removeItem, name).toHaveCount(0);
          await page.keyboard.press('Escape');
          await expect(menu, name).toBeHidden();
        }
      }
    );

    // AS5 (signed-out half) — a signed-out visitor never sees "Message" on
    // any card. Kept inside this serial block (rather than as a top-level
    // test) so it shares the block's beforeAll/afterAll lifecycle — a
    // top-level test in this file would either run in its own worker with
    // `baseScenario` never set (`fullyParallel: true`), or, on a single
    // worker, run after this block's afterAll has already deleted the
    // scenario. A fresh, unauthenticated `browser.newContext()` keeps it
    // signed-out despite running alongside the admin-session tests above —
    // the same pattern as us2-nothing-else-changes.spec.ts's AS2a.
    adminFixture.test(
      'US3-AS5 A signed-out visitor never sees Message on any card',
      async ({ browser }) => {
        adminFixture.test.setTimeout(30_000);
        const context = await browser.newContext();
        const page = await context.newPage();
        // The Contributors post is on a public space, so an anonymous
        // visitor can read it.
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

        await context.close();
      }
    );
    // Product finding QA-PF-01 — https://github.com/alkem-io/client-web/issues/10369
    // The name link cannot be focused unambiguously while the avatar anchor
    // also carries the contributor's name (two exact-name links per card).
    // Kept last so a red here skips nothing else in this serial block.
    // AS7 — keyboard-only: tab stops in order (name, website, actions),
    // Enter/Space opens, arrows move, Escape closes and returns focus,
    // activating the actions control never navigates.
    // Skipped by decision of the QA lead (2026-10-05) until that issue ships; the assertions below
    // are the acceptance oracle for the fix and must not be softened. Un-skip, do not delete.
    adminFixture.test.skip(
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
  }
);
