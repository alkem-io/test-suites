// Seed spec for Contributors CRUD testing
// Issue: #1696
//
// Scope: Full CRUD operations testing for User, Organization, and VC contributors
// - User: Registration, Profile updates, Account/Membership/Notifications/Settings tabs, Delete
// - Organization: Create (via GA), Profile updates, Community/Authorization tabs, Delete
// - Virtual Contributor: Create, Profile updates, Knowledge management, Space interactions, Settings, Delete
//
// Test Personas (from agents.md):
// - Global Admin (GA): For organization creation
// - Organization Admin: For org management
// - Space Admin: For space-level operations
// - Beta Tester: For testing features
// - Space Member: For member-level operations

import { expect } from '@playwright/test';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestUserManager } from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/client-lib/dist/generated/graphql';
import { createAuthenticatedSessionFixture } from './fixtures/authenticated-session.fixture';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'contributors-crud.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const scenarioConfig: TestScenarioConfig = {
  name: 'contributors-crud',
  organization: {
    verification: { setVerified: true },
  },
  space: {
    about: {
      profile: {
        displayName: 'CRUD Test Space',
        tagline: 'Space for testing contributor interactions',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.GLOBAL_BETA_TESTER,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: { policy: CommunityMembershipPolicy.Applications },
    },
  },
  // Innovation Pack with templates for VC knowledge management
  innovationPack: {
    useBaseOrganization: true,
    pack: {
      displayName: 'CRUD Test Template Pack',
      tags: ['crud', 'test', 'contributors'],
    },
    visibility: { listedInStore: true, searchVisibility: 'PUBLIC' },
    templates: [
      {
        type: 'POST' as any,
        profileDisplayName: 'Post Template - CRUD',
        postDefaultDescription: 'Template for VC knowledge posts',
      },
      {
        type: 'COMMUNITY_GUIDELINES' as any,
        profileDisplayName: 'Community Guidelines - CRUD',
      },
      {
        type: 'CALLOUT' as any,
        profileDisplayName: 'Collaboration Tool - CRUD',
        calloutFramingType: 'MEMO',
        calloutResponseTypes: ['POST', 'MEMO'],
        calloutAllowedContributors: 'MEMBERS',
        calloutMemoFramingMarkdown:
          '# Collaboration Space\n\nUse this space to interact with Virtual Contributors.',
      },
    ],
  },
  // Platform discussion for testing VC tagging
  platformDiscussion: {
    title: 'CRUD Test Discussion',
    description: 'Discussion for testing Virtual Contributor tagging',
    category: 'PLATFORM_FUNCTIONALITIES',
  },
};

let baseScenario: OrganizationWithSpaceModel;

// Serial mode to ensure clean setup/teardown
(test.describe as any).configure?.({ mode: 'serial' });

test.describe('Contributors CRUD - Scenario Setup', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

    // Setup authentication for Global Admin (for organization creation tests)
    await setupAuthentication(browser, TestUserManager.users.globalAdmin.email);
  });

  test.afterAll(async () => {
    test.setTimeout(30_000);
    await teardownAuthentication();
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  });

  test('Scenario setup successful - all components created', async () => {
    expect(baseScenario.scenarioSetupSucceeded).toBeTruthy();

    // Verify organization
    expect(baseScenario.organization).toBeDefined();
    expect(baseScenario.organization.id).toBeTruthy();
    expect(baseScenario.organization.nameId).toBeTruthy();

    // Verify space
    expect(baseScenario.space).toBeDefined();
    expect(baseScenario.space.id).toBeTruthy();
    expect(baseScenario.space.nameId).toBeTruthy();

    // Verify innovation pack
    expect(baseScenario.innovationPack).toBeDefined();
    expect(baseScenario.innovationPack!.id).toBeTruthy();
    expect(baseScenario.innovationPack!.templatesSetId).toBeTruthy();

    // Verify platform discussion
    expect(baseScenario.platformDiscussionId).toBeDefined();
    expect(baseScenario.platformDiscussionId).toBeTruthy();

    console.log(`
✅ Contributors CRUD Scenario Setup Complete

Organization:
  - ID: ${baseScenario.organization.id}
  - NameID: ${baseScenario.organization.nameId}

Space:
  - ID: ${baseScenario.space.id}
  - NameID: ${baseScenario.space.nameId}

Innovation Pack:
  - ID: ${baseScenario.innovationPack!.id}
  - NameID: ${baseScenario.innovationPack!.nameId}
  - Templates: ${baseScenario.innovationPack!.templatesSetId}

Platform Discussion:
  - ID: ${baseScenario.platformDiscussionId}

Test Users Available:
  - Global Admin: ${TestUserManager.users.globalAdmin.email}
  - Organization Admin: ${TestUserManager.users.organizationAdmin.email}
  - Space Admin: ${TestUserManager.users.spaceAdmin.email}
  - Space Member: ${TestUserManager.users.spaceMember.email}
  - Beta Tester: ${TestUserManager.users.betaTester.email}
    `);
  });

  test('Verify space and community created', async () => {
    // Verify space community was created
    expect(baseScenario.space.community).toBeDefined();
    expect(baseScenario.space.community?.id).toBeTruthy();
    expect(baseScenario.space.community?.roleSetId).toBeTruthy();

    console.log(`
✅ Space Community Verification Complete

Community ID: ${baseScenario.space.community?.id}
RoleSet ID: ${baseScenario.space.community?.roleSetId}
    `);
  });
});
