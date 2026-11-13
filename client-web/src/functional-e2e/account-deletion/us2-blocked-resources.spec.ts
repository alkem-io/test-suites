// plan: client-web/src/functional-e2e/account-deletion/account-deletion-test-plan.md
// (US2 — blocked by resources I still own; TC-10 / TC-13 / D-5)
//
// A fresh self-registered identity has no Space entitlement, so the "owns a
// Space" blocker is seeded by the platform admin in two steps: grant
// FEATURE_BETA_TESTER (the ACCOUNT_SPACE_FREE entitlement), then
// `createSpaceOnAccount` on the subject's own account — which is also how the
// 26 Spaces of AS3 are seeded without 26 users.
//
// One subject carries AS1 → AS2 → AS4 → AS5 on one signed-in page, in that
// order (AS4 removes the blocker AS1/AS2 assert, AS5 adds one mid-flow — the
// TOCTOU race): serial. A second subject carries AS3 (the 25-item cap).
//
// W2 Tier 0 item 3: "nothing was deleted" is read back over GraphQL
// (`lookup.user` as the platform admin, and the subject's own pre-flight
// `me.accountDeletion.canDelete`), not from the audit table; the walk starts
// on the Account tab's Danger Zone, where the card lives since
// client-web#10437. Everything here runs on the shared test cluster.

import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  assignPlatformRole,
  createSpaceOnAccount,
  deleteSpace,
  deleteUser,
  readMyAccountDeletionCanDelete,
  RoleName,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { must, sessionActor } from '../helpers/lib-actor.helper';
import {
  confirmDeleteButton,
  deleteAccountTriggerButton,
  deleteSubjectIfPresent,
  DisposableSubject,
  getAdminToken,
  loginAsSubject,
  openDeleteAccountSection,
  provisionSubject,
  runTeardown,
  typedNameField,
  userExists,
} from './delete-account.helpers';

const RUN = UniqueIDGenerator.getID();
const BLOCKER_NAME = `Blocker Space ${RUN}`;
const RACE_NAME = `TOCTOU Race Space ${RUN}`;
const SPACE_COUNT = 26; // one more than the server's 25-item cap

const blockedDialog = (page: Page) =>
  page.getByRole('dialog', { name: "You can't delete your account yet" });

// --- admin set-up -----------------------------------------------------------

const grantSpaceEntitlement = async (actorID: string): Promise<void> => {
  must(
    await assignPlatformRole(actorID, RoleName.FeatureBetaTester, {
      bearerToken: await getAdminToken(),
    }),
    `grant FEATURE_BETA_TESTER to ${actorID}`
  );
};

const createSpaceOn = async (
  accountID: string,
  nameID: string,
  displayName: string
): Promise<string> =>
  must(
    await createSpaceOnAccount(
      {
        accountID,
        nameID,
        about: { profileData: { displayName } },
        collaborationData: { calloutsSetData: {} },
      },
      { bearerToken: await getAdminToken() }
    ),
    `create space '${displayName}'`
  ).createSpace.id;

/** Teardown: delete a seeded Space unless a walk already did. */
const deleteSpaceIfPresent = async (id: string): Promise<void> => {
  const result = await deleteSpace(id, { bearerToken: await getAdminToken() });
  if (!result.error) return;
  if (result.error.errors.every(e => e.code === 'ENTITY_NOT_FOUND')) return;
  throw new Error(`deleteSpace(${id}): ${JSON.stringify(result.error.errors)}`);
};

/** The subject's own server pre-flight, over its browser session. */
const canDeleteNow = async (page: Page): Promise<boolean> =>
  must(
    await readMyAccountDeletionCanDelete(await sessionActor(page)),
    'read me.accountDeletion'
  ).me.accountDeletion.canDelete;

// --- file-level state and teardown ------------------------------------------

let blockedSubject: DisposableSubject | undefined;
let capSubject: DisposableSubject | undefined;
let blockedContext: BrowserContext | undefined;
let capContext: BrowserContext | undefined;
const seededSpaceIds: string[] = [];

// File level, so it also runs when a failure retires the worker mid-file.
// Spaces before their owners: a user that still owns one cannot be deleted.
test.afterAll(async () => {
  test.setTimeout(180_000);
  await runTeardown([
    ['close blocked context', async () => blockedContext?.close()],
    ['close cap context', async () => capContext?.close()],
    ...seededSpaceIds.map((id): [string, () => Promise<void>] => [
      `delete space ${id}`,
      () => deleteSpaceIfPresent(id),
    ]),
    [
      'delete blocked subject',
      () => deleteSubjectIfPresent(blockedSubject?.userId),
    ],
    ['delete cap subject', () => deleteSubjectIfPresent(capSubject?.userId)],
  ]);
});

test.describe(
  'Blocked by resources I still own',
  { tag: '@forge-acceptance' },
  () => {
    test.describe.configure({ mode: 'serial' });

    let blockedPage: Page;
    let blockerSpaceId: string;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(180_000);
      blockedSubject = await provisionSubject('us2blk');
      await grantSpaceEntitlement(blockedSubject.userId);
      blockerSpaceId = await createSpaceOn(
        blockedSubject.accountId,
        `us2-blocker-${RUN}`,
        BLOCKER_NAME
      );
      seededSpaceIds.push(blockerSpaceId);

      blockedContext = await browser.newContext();
      blockedPage = await blockedContext.newPage();
      await loginAsSubject(blockedPage, blockedSubject.email);
      await openDeleteAccountSection(blockedPage);
    });

    test('US2-AS1: the blocked dialog names the space that blocks deletion; the server refuses even a raw bypass', async () => {
      await deleteAccountTriggerButton(blockedPage).click();

      const dialog = blockedDialog(blockedPage);
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByText(BLOCKER_NAME, { exact: true })
      ).toBeVisible();
      await expect(dialog.getByText('Space: 1', { exact: true })).toBeVisible();

      // The same session, no UI: the server's refusal is authoritative
      // whatever the client pre-check showed. The code is the client-actionable
      // contract the dialog branches on.
      const bypass = await deleteUser(
        blockedSubject!.userId,
        await sessionActor(blockedPage)
      );
      expect(bypass.error?.errors?.[0]?.code).toBe('ACCOUNT_DELETION_BLOCKED');
      expect(await userExists(blockedSubject!.userId)).toBe(true);
      expect(await canDeleteNow(blockedPage)).toBe(false);
    });

    test('US2-AS2: the primary action links to the account resources; support is offered beside it', async () => {
      const dialog = blockedDialog(blockedPage);
      await expect(dialog).toBeVisible();

      await expect(
        dialog.getByRole('link', { name: 'Contact support', exact: true })
      ).toHaveAttribute('href', 'mailto:support@alkem.io');

      const resolveLink = dialog.getByRole('link', {
        name: 'Manage my account resources',
        exact: true,
      });
      // The resources live on the same Account tab the card sits on, so the
      // URL alone proves nothing: check the target, follow it, and find the
      // blocker in the resources list once the dialog is gone.
      await expect(resolveLink).toHaveAttribute('href', /\/settings\/account$/);
      await resolveLink.click();
      await expect(dialog).toBeHidden();
      await expect(
        blockedPage.getByRole('main').getByText(BLOCKER_NAME, { exact: true })
      ).toBeVisible();
    });

    test('US2-AS4: once the blocking space is deleted, deletion proceeds to the confirm step', async () => {
      must(
        await deleteSpace(blockerSpaceId, {
          bearerToken: await getAdminToken(),
        }),
        'delete the blocker space'
      );
      expect(await canDeleteNow(blockedPage)).toBe(true);

      await openDeleteAccountSection(blockedPage);
      await deleteAccountTriggerButton(blockedPage).click();

      // The client ran a fresh pre-flight and found nothing blocking.
      await expect(typedNameField(blockedPage)).toBeVisible();
      await expect(blockedDialog(blockedPage)).toHaveCount(0);
    });

    test('US2-AS5: a space created after the pre-check refuses the confirm with the fresh authoritative state', async () => {
      await typedNameField(blockedPage).fill(blockedSubject!.displayName);
      const confirmButton = confirmDeleteButton(blockedPage);
      await expect(confirmButton).toBeEnabled();

      // The "other tab": a blocker appears after the pre-check, before confirm.
      seededSpaceIds.push(
        await createSpaceOn(
          blockedSubject!.accountId,
          `us2-toctou-${RUN}`,
          RACE_NAME
        )
      );

      await confirmButton.click();

      // Never a silent success: the dialog re-renders as blocked, naming the
      // new space, from a fresh pre-flight…
      const dialog = blockedDialog(blockedPage);
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(RACE_NAME, { exact: true })).toBeVisible();
      // …and nothing was deleted.
      expect(await userExists(blockedSubject!.userId)).toBe(true);
    });
  }
);

test.describe(
  'Capped blocker list with an accurate total and an explicit truncation indicator',
  { tag: '@forge-acceptance' },
  () => {
    test.beforeAll(async () => {
      // 26 sequential admin creates on one account.
      test.setTimeout(300_000);
      capSubject = await provisionSubject('us2cap');
      await grantSpaceEntitlement(capSubject.userId);
      for (let i = 0; i < SPACE_COUNT; i++) {
        seededSpaceIds.push(
          await createSpaceOn(
            capSubject.accountId,
            `us2-cap-${i}-${RUN}`,
            `Cap Space ${i} ${RUN}`
          )
        );
      }
    });

    test('US2-AS3: the blocked dialog shows the 25-item cap, an accurate total, and a truncation indicator', async ({
      browser,
    }) => {
      capContext = await browser.newContext();
      const page = await capContext.newPage();
      await loginAsSubject(page, capSubject!.email);
      await openDeleteAccountSection(page);
      await deleteAccountTriggerButton(page).click();

      const dialog = blockedDialog(page);
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByText(`Space: ${SPACE_COUNT}`, { exact: true })
      ).toBeVisible();
      await expect(
        dialog.getByText(`Showing the first 25 of ${SPACE_COUNT} items.`, {
          exact: true,
        })
      ).toBeVisible();
      await expect(dialog.getByRole('listitem')).toHaveCount(25);
    });
  }
);
