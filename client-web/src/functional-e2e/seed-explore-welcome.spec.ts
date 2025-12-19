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
    storageStateName: 'seed-explore-welcome.example.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

const scenarioConfig: TestScenarioConfig = {
  name: 'seed-explore-welcome',
  organization: {
    verification: { setVerified: true },
  },
  // Optional space creation (kept minimal here); can be omitted if not needed.
  space: {
    about: {
      profile: {
        displayName: 'Seeded Space for Pack Example',
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
      membership: { policy: CommunityMembershipPolicy.Applications },
    },
  },
  // New: seed an Innovation Pack (provider org + templates) before tests execute
  innovationPack: {
    useBaseOrganization: true,
    providerOrganization: {
      about: { profile: { displayName: 'Provider Org for Pack - Example' } },
      verification: { setVerified: true },
    },
    pack: {
      displayName: 'Innovation Pack – Example',
      tags: ['innovation', 'pack', 'example'],
    },
    visibility: { listedInStore: true, searchVisibility: 'PUBLIC' },
    templates: [
      {
        type: 'POST' as any,
        profileDisplayName: 'Post Template A',
        postDefaultDescription: 'Default text for posts',
      },
      {
        type: 'COMMUNITY_GUIDELINES' as any,
        profileDisplayName: 'Community Guidelines A',
      },
      // ========== Callout Templates with different framing & response types ==========
      {
        type: 'CALLOUT' as any,
        profileDisplayName: 'Callout (Memo Framing, Memo Responses)',
        calloutFramingType: 'MEMO',
        calloutResponseTypes: ['MEMO'],
        calloutAllowedContributors: 'ADMINS',
        // Optional: customize the memo framing markdown content
        calloutMemoFramingMarkdown:
          '# Guidelines\n\nPlease follow these guidelines:\n- Be respectful\n- Share knowledge\n- Collaborate openly',
      },
    ],
  },
  platformDiscussion: {
    title: 'Alkemio forum discussion',
  },
};

let baseScenario: OrganizationWithSpaceModel;

// Keep test mode serial to ensure clean create/cleanup lifecycle
(test.describe as any).configure?.({ mode: 'serial' });

test.describe.skip('Innovation Pack seeding via TestScenarioFactory', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120_000);
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

    // Optional: Auth as any user you need for later UI actions
    await setupAuthentication(browser, TestUserManager.users.globalAdmin.email);
  });

  test.afterAll(async () => {
    test.setTimeout(30_000);
    await teardownAuthentication();

    // Core cleanup for the base scenario
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    // Note: The Innovation Pack provider organization is separate from the scenario org.
    // If you wish to delete it as well, add a helper or call delete via tests-lib here.
  });

  test('Pack and all templates are created before tests execute', async () => {
    expect(baseScenario.scenarioSetupSucceeded).toBeTruthy();
    expect(baseScenario.innovationPack).toBeDefined();

    const pack = baseScenario.innovationPack!;
    expect(pack.id).toBeTruthy();
    expect(pack.templatesSetId).toBeTruthy();

    // Log pack details for inspection
    console.log(`Created Innovation Pack:
      - ID: ${pack.id}
      - NameID: ${pack.nameId}
      - TemplatesSetId: ${pack.templatesSetId}
      - Provider Org ID: ${pack.providerOrganizationId}
    `);
  });
});
