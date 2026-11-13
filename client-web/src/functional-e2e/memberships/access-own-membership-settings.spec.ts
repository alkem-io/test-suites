// spec: client-web/src/functional-e2e/plans/memberships-test-plan.md (2.1 + 2.3)

import { expect } from '@playwright/test';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  type TestScenarioConfig,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import {
  teardownScenario,
  userIdsInRole,
} from '../helpers/space-access.helper';
import {
  leaveMembership,
  membershipRow,
  openMembershipSettings,
  uniqueName,
} from './memberships.helpers';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'my-feature-test.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'memberships',
  space: {
    about: {
      profile: {
        displayName: uniqueName('Membership Test Space'),
        tagline: 'Testing space memberships',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
  },
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(60_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  await setupAuthentication(browser, TestUserManager.users.spaceMember.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  try {
    await teardownAuthentication();
  } finally {
    await teardownScenario(baseScenario);
  }
});

test.describe('User Membership Settings', () => {
  test(
    'Access Own Membership Settings',
    {
      tag: ['@regression'],
    },
    async ({ page }) => {
      const member = TestUserManager.users.spaceMember;
      const spaceName = baseScenario.space.about.profile.displayName;
      const roleSetId = baseScenario.space.community.roleSetId;
      expect(member.id, 'space.member id resolved').not.toBe('');

      // Precondition (server): the seeded membership exists.
      expect(await userIdsInRole(roleSetId)).toContain(member.id);

      // 1. Own membership settings render, and list the seeded space
      //    (positive control for the absence asserted after the leave).
      await openMembershipSettings(page, member.nameId);
      await expect(page).toHaveURL(/\/settings\/membership$/);
      await expect(membershipRow(page, spaceName)).toHaveCount(1);

      // 2. Leave it: the row's "Leave <name>" button, then the destructive
      //    confirmation; the browser's removeRoleFromUser must answer cleanly.
      await leaveMembership(page, spaceName);

      // 3. Server: the user no longer holds MEMBER on the space's role set.
      await expect
        .poll(() => userIdsInRole(roleSetId))
        .not.toContain(member.id);

      // 4. UI, after a reload: once the list has rendered (summary or empty
      //    caption), the space is no longer in it.
      await openMembershipSettings(page, member.nameId);
      await expect(membershipRow(page, spaceName)).toHaveCount(0);
    }
  );
});
