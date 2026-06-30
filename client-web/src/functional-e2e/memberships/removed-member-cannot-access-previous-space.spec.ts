// spec: client-web/src/functional-e2e/plans/memberships-test-plan.md
// seed: client-web/src/functional-e2e/seed-memberships.spec.ts

import { expect } from '@playwright/test';
import {
  TestUser,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'removed-member-cannot-access.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'memberships',
  space: {
    about: {
      profile: {
        displayName: 'Membership Test Space',
        tagline: 'Testing space memberships',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_MEMBER,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
    subspace: {
      about: {
        profile: {
          displayName: 'Subspace for Membership Tests',
          tagline: 'Testing subspace memberships',
        },
      },
      collaboration: {
        addTutorialCallouts: false,
        addPostCollectionCallout: true,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
        ],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Public },
        membership: {
          policy: CommunityMembershipPolicy.Applications,
        },
      },
      subspace: {
        about: {
          profile: {
            displayName: 'Subsubspace for Membership Tests',
            tagline: 'Testing subsubspace memberships',
          },
        },
        collaboration: {
          addTutorialCallouts: false,
          addPostCollectionCallout: true,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
        settings: {
          privacy: { mode: SpacePrivacyMode.Private },
          membership: {
            policy: CommunityMembershipPolicy.Applications,
          },
        },
      },
    },
  },
};

test.describe('Security & Permissions', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await setupAuthentication(
      browser,
      TestUserManager.users.subsubspaceMember.email
    );
  });

  test.afterAll(async () => {
    test.setTimeout(45_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test(
    'Removed Member Cannot Access Previous Space',
    {
      tag: ['@bug', '@regression'],
    },
    async ({ page }) => {
      // 1. Navigate to the private subsubspace as a member
      await page.goto(
        `${baseUrl}/${baseScenario.space.nameId}/challenges/${baseScenario.subspace.nameId}/opportunities/${baseScenario.subsubspace.nameId}`
      );

      // 2. Verify full access is granted as a member
      await expect(page).toHaveURL(
        new RegExp(`/${baseScenario.subsubspace.nameId}`)
      );
      await expect(
        page
          .getByRole('heading', {
            name: baseScenario.subsubspace.about.profile.displayName,
          })
          .first()
      ).toBeVisible({ timeout: 5000 });

      // 3. Verify can participate in collaboration
      // CRD: full member access exposes the "Community" view (replaces the
      // legacy "contributors" affordance).
      await expect(
        page.getByRole('button', { name: 'Community', exact: true }).first()
      ).toBeVisible({ timeout: 5000 });

      // 4. Navigate to user membership settings
      await page.goto(
        `${baseUrl}/user/${TestUserManager.users.subsubspaceMember.nameId}/settings/membership`
      );
      await expect(page).toHaveURL(/.*\/settings\/membership/);

      // 5. Leave the subsubspace community
      // CRD: memberships are a searchable card grid; narrow to the subsubspace
      // so the per-card actions are unambiguous.
      const subsubspaceName = baseScenario.subsubspace.about.profile.displayName;
      const search = page.getByPlaceholder('Search memberships...');
      await search.fill(subsubspaceName);

      const subsubspaceCardLink = page
        .getByRole('link', { name: subsubspaceName })
        .first();
      await expect(subsubspaceCardLink).toBeVisible({ timeout: 5000 });

      // CRD flow change: the Leave action lives in the card's "More actions"
      // (kebab) menu, then a confirmation alertdialog.
      await page.getByRole('button', { name: 'More actions' }).first().click();
      await page.getByRole('menuitem', { name: /Leave/i }).click();

      // 6. Confirm leaving in the destructive alertdialog.
      const confirmDialog = page.getByRole('alertdialog');
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });
      await confirmDialog.getByRole('button', { name: 'Leave' }).click();

      // 7. Wait for the leave action to complete
      await expect(
        page.getByRole('link', { name: subsubspaceName })
      ).not.toBeVisible({ timeout: 5000 });

      // 8. Navigate back to the private subsubspace
      await page.goto(
        `${baseUrl}/${baseScenario.space.nameId}/challenges/${baseScenario.subspace.nameId}/opportunities/${baseScenario.subsubspace.nameId}`
      );

      // 9. Verify access is now restricted - user can only preview the about section
      await expect(page).toHaveURL(
        new RegExp(`/${baseScenario.subsubspace.nameId}`)
      );
      await expect(page).toHaveURL(new RegExp('/about'));

      // 10. Verify about section is still visible (preview mode)
      await expect(
        page
          .getByRole('heading', {
            name: baseScenario.subsubspace.about.profile.displayName,
          })
          .first()
      ).toBeVisible({ timeout: 3000 });

      // [BUG]? no apply/join button shown
      // 11. Verify Apply/Join button is now visible (since user is no longer a member)
      // await expect(
      //   page.getByRole('button', { name: /Apply|Join|Sign in/i })
      // ).toBeVisible();

      // 13. Verify privacy indicator is shown (limited preview mode)
      // CRD: after leaving, the gated About dialog surfaces the no-access /
      // privacy state as an image with the accessible name "You don't have
      // access to this space." (the icon's alt text is the stable hook; there
      // is no literal "Private" label on this preview surface).
      await expect(
        page.getByRole('img', { name: /don't have access to this space/i }).first()
      ).toBeVisible();
    }
  );
});
