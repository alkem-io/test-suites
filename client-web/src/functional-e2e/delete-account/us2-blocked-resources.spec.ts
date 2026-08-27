// Durable regression cover for the delete-own-account acceptance walk
// covering the "blocked by resources I still own" story.
//
// A brand-new self-registered identity holds ZERO space-creation entitlement
// by default (`ACCOUNT_SPACE_FREE` limit 0/0 — confirmed live: the CRD
// "Create Space" flow shows a "Capacity reached" dialog for a fresh account).
// Seeding the "owns a Space" blocker therefore needs two admin-authenticated
// steps before any space can exist on the subject's account:
//   1. `assignPlatformRoleToUser(PLATFORM_BETA_TESTER)` — grants the
//      `ACCOUNT_SPACE_FREE` entitlement (mirrors
//      `server-api/src/functional-api/entitlements/user-entitlements.it-spec.ts`).
//   2. `createSpace(spaceData:{accountID, ...})` as admin, targeting the
//      subject's own account — admin may create/delete a Space on ANY
//      account regardless of that account's entitlement ceiling (soft
//      license limit only), which is also how ">25 blockers" (AS3) is
//      seeded without registering 26 real users.
//
// One subject (`blockedSubject`) carries AS1 → AS2 → AS4 → AS5 through a
// single continuously authenticated page, in that fixed order: AS4 clears
// the one blocker AS1/AS2 asserted against, and AS5 re-introduces a fresh
// one mid-flow (the TOCTOU race) — hence `serial` mode for this file. A
// second, independently provisioned subject (`manyBlockersSubject`) carries
// AS3 (the 25-item cap + truncation indicator), seeded with 26 Spaces.
//
// The raw-API-bypass half of AS1 ("the server-side refusal is authoritative
// even if the user bypasses the in-app pre-check") is proven via
// `page.request` — Playwright's `APIRequestContext` shares the browser
// context's cookies, so this is a genuine same-session raw GraphQL call,
// not a fabricated one.

import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import {
  getUserToken,
  postGraphqlRaw,
  queryHarnessDb,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  adminEmail,
  baseUrl,
  deleteAccountTriggerButton,
  deleteUserQuietly,
  DisposableSubject,
  loginAsSubject,
  navigateToSecurityTab,
  provisionSubject,
} from './delete-account.helpers';

const graphqlUrl = `${baseUrl}/graphql`;

const blockedDialog = (page: Page) =>
  page.getByRole('dialog', { name: /can.t delete your account yet/i });

// --- Admin-authenticated setup/teardown helpers -----------------------

const adminAssignBetaTester = async (
  adminToken: string,
  actorID: string
): Promise<void> => {
  const res = await postGraphqlRaw(
    `mutation Us2AssignBetaTester($actorID: UUID!) {
      assignPlatformRoleToUser(roleData: { actorID: $actorID, role: PLATFORM_BETA_TESTER }) { id }
    }`,
    { bearerToken: adminToken, variables: { actorID } }
  );
  if (res.body.errors) {
    throw new Error(
      `adminAssignBetaTester failed for ${actorID}: ${res.raw}`
    );
  }
};

const adminCreateSpace = async (
  adminToken: string,
  accountID: string,
  nameID: string,
  displayName: string
): Promise<string> => {
  const res = await postGraphqlRaw<{ createSpace: { id: string } }>(
    `mutation Us2CreateSpace($accountID: UUID!, $nameID: NameID!, $displayName: String!) {
      createSpace(spaceData: {
        accountID: $accountID
        nameID: $nameID
        about: { profileData: { displayName: $displayName } }
        collaborationData: { calloutsSetData: {} }
      }) { id }
    }`,
    { bearerToken: adminToken, variables: { accountID, nameID, displayName } }
  );
  const id = res.body.data?.createSpace.id;
  if (!id) {
    throw new Error(`adminCreateSpace('${displayName}') failed: ${res.raw}`);
  }
  return id;
};

const adminDeleteSpace = async (
  adminToken: string,
  id: string
): Promise<void> => {
  await postGraphqlRaw(
    'mutation Us2DeleteSpace($id: UUID!) { deleteSpace(deleteData: { ID: $id }) { id } }',
    { bearerToken: adminToken, variables: { id } }
  );
};

/** Raw same-session GraphQL call via the browser's own cookies — the
 * "user bypasses the in-app pre-check" half of AS1. */
const rawDeleteUserViaBrowserSession = async (
  request: APIRequestContext,
  deleteUserId: string
) =>
  request.post(graphqlUrl, {
    data: {
      query: 'mutation Us2RawBypass($id: UUID!) { deleteUser(deleteData: { ID: $id }) { id } }',
      variables: { id: deleteUserId },
    },
  });

test.describe(
  'Blocked by resources I still own',
  { tag: '@forge-acceptance' },
  () => {
    // AS4 clears the blocker AS1/AS2 asserted against and AS5 re-introduces
    // a fresh one mid-flow (the TOCTOU race) on the SAME `blockedPage` — the
    // whole file must run in one fixed order, not distributed across
    // parallel workers each with their own independent `beforeAll` state.
    test.describe.configure({ mode: 'serial' });

    let adminToken: string;
    let blockedSubject: DisposableSubject;
    let blockerSpaceId: string;
    let blockedContext: Awaited<ReturnType<import('@playwright/test').Browser['newContext']>>;
    let blockedPage: Page;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(180_000);
      adminToken = await getUserToken(adminEmail);

      blockedSubject = await provisionSubject('us2blk');
      await adminAssignBetaTester(adminToken, blockedSubject.userId);
      blockerSpaceId = await adminCreateSpace(
        adminToken,
        blockedSubject.accountId,
        `us2-blocker-${UniqueIDGenerator.getID()}`,
        'Blocker Space'
      );

      blockedContext = await browser.newContext();
      blockedPage = await blockedContext.newPage();
      await loginAsSubject(blockedPage, blockedSubject.email);
      await navigateToSecurityTab(blockedPage);
    });

    test.afterAll(async () => {
      await blockedContext?.close().catch(() => {});
      await adminDeleteSpace(adminToken, blockerSpaceId).catch(() => {});
      await deleteUserQuietly(blockedSubject?.userId, adminToken);
    });

    test('US2-AS1: the blocked dialog names the space that blocks deletion; the server refuses even a raw bypass', async () => {
      await deleteAccountTriggerButton(blockedPage).click();

      const dialog = blockedDialog(blockedPage);
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByText('Blocker Space', { exact: true })
      ).toBeVisible();
      await expect(dialog.getByText('Space: 1')).toBeVisible();

      // Raw-API bypass, same authenticated session, no UI involved: the
      // server-side refusal is authoritative regardless of what the client
      // pre-check showed.
      const bypass = await rawDeleteUserViaBrowserSession(
        blockedPage.request,
        blockedSubject.userId
      );
      const bypassBody = await bypass.json();
      expect(bypassBody.errors?.[0]?.extensions?.code).toBe(
        'ACCOUNT_DELETION_BLOCKED'
      );
    });

    test('US2-AS2: the primary action deep-links to account resources; support is offered as a parallel route', async () => {
      const dialog = blockedDialog(blockedPage);
      await expect(dialog).toBeVisible();

      const supportLink = dialog.getByRole('link', {
        name: 'Contact support',
      });
      await expect(supportLink).toHaveAttribute(
        'href',
        'mailto:support@alkem.io'
      );

      await dialog
        .getByRole('link', { name: 'Manage my account resources' })
        .click();

      await blockedPage.waitForURL(/.*\/settings\/account.*/);
      await expect(
        blockedPage.getByText('Blocker Space', { exact: true })
      ).toBeVisible({ timeout: 15_000 });
    });

    test('US2-AS4: once the blocking space is deleted, re-attempting deletion proceeds without a fresh page load', async () => {
      await adminDeleteSpace(adminToken, blockerSpaceId);

      await navigateToSecurityTab(blockedPage);
      await deleteAccountTriggerButton(blockedPage).click();

      // No blocked dialog this time — the client re-fetched a fresh
      // pre-flight and correctly found nothing blocking.
      await expect(blockedDialog(blockedPage)).toHaveCount(0);
      await expect(
        blockedPage.getByPlaceholder('Type your name to confirm')
      ).toBeVisible();
    });

    test('US2-AS5: a space created in another tab after the pre-check refuses the confirm with the fresh authoritative state', async () => {
      await blockedPage
        .getByPlaceholder('Type your name to confirm')
        .fill(blockedSubject.displayName);
      const confirmButton = blockedPage.getByRole('button', {
        name: 'Delete my account',
        exact: true,
      });
      await expect(confirmButton).toBeEnabled();

      // The "other tab": a new blocking space appears after the client's
      // pre-check but before this confirm click resolves.
      const raceSpaceId = await adminCreateSpace(
        adminToken,
        blockedSubject.accountId,
        `us2-toctou-${UniqueIDGenerator.getID()}`,
        'TOCTOU Race Space'
      );

      await confirmButton.click();

      // No stale "you can delete" state is trusted: the dialog re-renders
      // as blocked, naming the race-created space, from a fresh
      // authoritative pre-flight — never a silent success.
      const dialog = blockedDialog(blockedPage);
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await expect(
        dialog.getByText('TOCTOU Race Space', { exact: true })
      ).toBeVisible();

      // Nothing was deleted: no primary audit row for this subject yet.
      const rows = await queryHarnessDb<{ outcome: string }>(
        'SELECT outcome FROM platform_audit_entry WHERE "subjectUserId" = $1 AND outcome = \'account_deleted\'',
        [blockedSubject.userId]
      );
      expect(rows).toHaveLength(0);

      await adminDeleteSpace(adminToken, raceSpaceId);
    });
  }
);

test.describe(
  'Capped blocker list with an accurate total and an explicit truncation indicator',
  { tag: '@forge-acceptance' },
  () => {
    const SPACE_COUNT = 26; // one more than the server's 25-item cap

    let adminToken: string;
    let subject: DisposableSubject;
    let spaceIds: string[] = [];

    test.beforeAll(async () => {
      test.setTimeout(240_000);
      adminToken = await getUserToken(adminEmail);
      subject = await provisionSubject('us2cap');
      await adminAssignBetaTester(adminToken, subject.userId);

      for (let i = 0; i < SPACE_COUNT; i++) {
        // Sequential on purpose: keeps this a plain, debuggable admin-token
        // loop rather than racing many concurrent mutations under one token.
        const id = await adminCreateSpace(
          adminToken,
          subject.accountId,
          `us2-cap-${i}-${UniqueIDGenerator.getID()}`,
          `Cap Space ${i}`
        );
        spaceIds.push(id);
      }
    });

    test.afterAll(async () => {
      for (const id of spaceIds) {
        await adminDeleteSpace(adminToken, id).catch(() => {});
      }
      await deleteUserQuietly(subject?.userId, adminToken);
    });

    test('US2-AS3: the blocked dialog shows the 25-item cap, an accurate total, and a truncation indicator', async ({
      browser,
    }) => {
      test.setTimeout(60_000);
      const context = await browser.newContext();
      const page = await context.newPage();

      await loginAsSubject(page, subject.email);
      await navigateToSecurityTab(page);
      await deleteAccountTriggerButton(page).click();

      const dialog = blockedDialog(page);
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(`Space: ${SPACE_COUNT}`)).toBeVisible();
      await expect(
        dialog.getByText(
          new RegExp(`Showing the first 25 of ${SPACE_COUNT} items`, 'i')
        )
      ).toBeVisible();
      await expect(dialog.getByRole('listitem')).toHaveCount(25);

      await context.close();
    });
  }
);
