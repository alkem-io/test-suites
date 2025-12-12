import { test } from '@playwright/test';

import {
  TestScenarioConfig,
  TestUser,
  TestScenarioFactory,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

/**
 * Comprehensive seed for membership scenarios
 * Creates a hierarchy with multiple users, organizations, spaces and subspaces
 * with different membership levels (admin, member, lead) for testing various
 * membership management scenarios.
 *
 * Structure:
 * - Organization with admin and members
 * - Space (L0) - Public with multiple admins, members, and leads
 *   - Subspace (L1) - Public with different membership configuration
 *     - Subsubspace (L2) - Private with restricted membership
 *
 * Users configured:
 * - GLOBAL_ADMIN: Platform admin
 * - ORGANIZATION_ADMIN: Organization admin
 * - SPACE_ADMIN: Space level admin
 * - SPACE_MEMBER: Space level member
 * - SUBSPACE_ADMIN: Subspace level admin
 * - SUBSPACE_MEMBER: Subspace level member
 * - SUBSUBSPACE_ADMIN: Subsubspace level admin
 * - SUBSUBSPACE_MEMBER: Subsubspace level member
 * - NON_SPACE_MEMBER: User not part of any space/community
 */
const scenarioConfig: TestScenarioConfig = {
  name: 'seed-memberships',
  organization: {
    community: {
      addMembers: true,
      addAdmin: true,
    },
  },
  space: {
    about: {
      profile: {
        displayName: 'Membership Test Space',
        description:
          'Public space for testing membership scenarios at space level',
        tagline: 'Testing space memberships',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
      addPostCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN, TestUser.GLOBAL_ADMIN],
      leads: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
        TestUser.ORGANIZATION_ADMIN,
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
          description:
            'Public subspace for testing membership scenarios at subspace level',
          tagline: 'Testing subspace memberships',
        },
      },
      collaboration: {
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
        addPostCallout: true,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        leads: [TestUser.SUBSPACE_ADMIN, TestUser.SPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
          TestUser.SPACE_ADMIN,
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
            description:
              'Private subsubspace for testing restricted membership scenarios',
            tagline: 'Testing subsubspace memberships',
          },
        },
        collaboration: {
          addPostCollectionCallout: true,
          addWhiteboardCallout: false,
          addPostCallout: true,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          leads: [TestUser.SUBSUBSPACE_ADMIN, TestUser.SUBSPACE_ADMIN],
          members: [
            TestUser.SUBSUBSPACE_MEMBER,
            TestUser.SUBSUBSPACE_ADMIN,
            TestUser.SUBSPACE_ADMIN,
          ],
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

test.beforeAll(async () => {
  test.setTimeout(60_000); // 60 seconds for comprehensive scenario setup
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

test.afterAll(async () => {
  test.setTimeout(45_000); // 45 seconds for cleanup
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

test('seed memberships scenario', async ({ page }) => {
  await page.goto(baseUrl);
  await page.getByRole('button', { name: 'Accept All Cookies' }).click();
  await page.getByTestId('PersonIcon').click();
  await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
  await page.waitForURL(/.*login.*/);
  await page.getByRole('textbox', { name: 'E-Mail' }).fill('admin@alkem.io');
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/.*home.*/);
});
