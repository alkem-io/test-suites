// spec: client-web/src/functional-e2e/account-deletion/account-deletion-test-plan.md
// story: client-web#10107, workspace#054 — the portable delta after test-suites#620.
//
// TC-15 — a departed user's activity renders as `Former member`. Untouched
// by test-suites#620.
//
// The "no warning flood" half of US5-AS5 (no per-entry lookup storm on a
// deleted actor) is a server-log assertion and is OUT OF SCOPE here — the
// sentinel resolves from the batch loader without per-entry lookups, already
// covered by the server's own unit specs (server#6416,
// `deleted.user.sentinel.ts`).

import { expect, test } from '@playwright/test';
import {
  assignRoleToUser,
  getUserToken,
  TestScenarioFactory,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import {
  deleteUserAsGlobalAdmin,
  provisionDisposableUser,
} from '../session-revocation/session-revocation.helpers';
import { SpacePage } from '../space/pages';
import {
  adminEmail,
  createPostContributionAsUser,
  signIn,
} from './account-deletion.helpers';

let baseScenario: OrganizationWithSpaceModel;
let postDisplayName: string;

const scenarioConfig: TestScenarioConfig = {
  name: 'account-deletion-former-member-activity',
  space: {
    collaboration: {
      addPostCollectionCallout: true,
    },
  },
};

test.describe('Former-member activity attribution (054 delta)', () => {
  test.beforeAll(async () => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(
      scenarioConfig
    );

    // A disposable, self-registered member — never a TestUserManager
    // persona, since this subject gets deleted.
    const contributor = await provisionDisposableUser('del-activity');
    await assignRoleToUser(
      contributor.userId,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );

    // One activity-generating action, created AS the contributor's own
    // bearer so the activity log's `triggeredBy` genuinely resolves to them
    // (never an admin proxy).
    const contributorToken = await getUserToken(contributor.email);
    const uniqueTitle = `TC-15 former-member post ${Date.now()}`;
    const post = await createPostContributionAsUser(
      contributorToken,
      baseScenario.space.collaboration.calloutPostCollectionId,
      uniqueTitle
    );
    postDisplayName = post.postDisplayName;

    // Admin-initiated deletion — branch-independent for the sentinel too.
    await deleteUserAsGlobalAdmin(contributor.userId, { deleteIdentity: true });
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('TC-15 — the activity feed shows Former member and still loads', async ({
    page,
  }) => {
    // "As a different member" — a real TestUserManager persona who is a
    // genuine member of this space (GLOBAL_ADMIN created it), never the
    // deleted contributor.
    await signIn(page, adminEmail);

    const spacePage = new SpacePage(page);
    await spacePage.goto(baseScenario.space.nameId);

    await page.getByRole('button', { name: 'Activity' }).click();
    const dialog = page.getByRole('dialog', { name: 'Recent Activity' });
    await expect(dialog).toBeVisible({ timeout: 15000 });

    // The feed loads without error and the entry is still present — scoped
    // to the dialog: the same post title also renders in the space's own
    // Post-callout feed behind it, which a page-wide text locator would
    // ambiguously match too.
    // Attribution reads exactly "Former member" — the server's
    // DELETED_USER_SENTINEL_DISPLAY_NAME, deliberately not localized. It is
    // not rendered as separate visible text (only baked into the row's
    // accessible name), so assert via role + accessible name.
    const row = dialog.getByRole('link', { name: /Former member/ });
    await expect(row.first()).toBeVisible({ timeout: 20000 });
    await expect(row.first()).toContainText(postDisplayName);

    // Never a translated variant, in whichever locale the environment
    // happens to render.
    await expect(
      dialog.getByText(/Bijna verwijderd|Ancien membre/)
    ).toHaveCount(0);
  });
});
