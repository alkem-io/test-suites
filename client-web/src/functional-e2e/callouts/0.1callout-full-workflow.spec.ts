// spec: client-web/src/functional-e2e/plans/callouts-test-plan.md
// seed: client-web/src/functional-e2e/seed-public-space.spec.ts

import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import {
  createCalloutOnCalloutsSet,
  getGraphqlClient,
  TestUser as LibTestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { CalloutContributionType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { expect, test } from '@playwright/test';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { CollaborationPage } from './pages';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const scenarioConfig: TestScenarioConfig = {
  name: 'callout-full-workflow',
  space: {
    about: {
      profile: {
        displayName: 'Callout Full Workflow Test Space',
      },
    },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
// Assigned per worker in the hooks below. Module-level `const ... Date.now()`
// names are poison here: local fullyParallel can place the three fixture
// describes in separate workers (fresh module eval => fresh timestamp), a
// retry always gets a fresh worker, and running a single step in isolation
// never runs the sibling describe that would have created the entity.
let sharedCalloutName = '';
// API-seeded published callout every non-Step-1 test can rely on, created in
// the OUTER beforeAll so it exists for any subset of tests in any worker.
let workflowCalloutName = '';
let workflowCalloutId = '';
let workflowCommentsRoomId = '';

const adminFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-workflow-admin.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

const memberFixture = createAuthenticatedSessionFixture({
  storageStateName: 'callout-workflow-member.json',
  cleanupAfterTests: process.env.cleanupAfterTests === 'true',
});

test.describe.serial('Callout Full Workflow', () => {
  test.beforeAll(async () => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

    // Seed the callout the member/moderation walks exercise. The lib default
    // is Published with Post contributions + comments enabled — exactly the
    // state Step 2 would produce through the UI.
    workflowCalloutName = `Full Workflow Callout ${Date.now()}`;
    const created = await createCalloutOnCalloutsSet(
      baseScenario.space.collaboration.calloutsSetId,
      {
        framing: {
          profile: {
            displayName: workflowCalloutName,
            description: 'Seeded for the member/moderation workflow steps',
          },
        },
      }
    );
    workflowCalloutId = created.data?.createCalloutOnCalloutsSet?.id ?? '';
    workflowCommentsRoomId =
      created.data?.createCalloutOnCalloutsSet?.comments?.id ?? '';
    if (!workflowCalloutId) {
      throw new Error(
        `[workflow seed] published callout was not created: ${JSON.stringify(created.error ?? created)}`
      );
    }
  });

  test.afterAll(async () => {
    if (baseScenario) {
      await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    }
  });

  adminFixture.test.describe.serial(
    'Admin Creates and Publishes Callout',
    () => {
      adminFixture.test.beforeAll(async ({ browser }) => {
        adminFixture.test.setTimeout(60_000);
        // Steps 1+2 run serially in one worker; assigning here (not at module
        // level) keeps the name consistent on a retry's fresh worker too.
        sharedCalloutName = `Admin UI Callout ${Date.now()}`;
        await adminFixture.setupAuthentication(
          browser,
          TestUserManager.users.spaceAdmin.email
        );
      });

      adminFixture.test.afterAll(async () => {
        adminFixture.test.setTimeout(30_000);
        await adminFixture.teardownAuthentication();
      });

      adminFixture.test(
        'Step 1: Admin creates Post Collection callout',
        async ({ page }) => {
          adminFixture.test.setTimeout(60_000);
          const collaborationPage = new CollaborationPage(page, baseUrl);

          await collaborationPage.navigateToSpace(baseScenario.space.nameId);

          await collaborationPage.createCalloutWithContributions(
            sharedCalloutName,
            'posts',
            'A post collection for the full workflow test',
            true
          );

          const isVisible =
            await collaborationPage.isCalloutVisible(sharedCalloutName);
          expect(isVisible).toBe(true);
        }
      );

      adminFixture.test(
        'Step 2: Admin publishes the callout',
        async ({ page }) => {
          // Must exceed clickCallout's 30s hydration wait or a slow feed load
          // times the whole test out ("Target page closed" on the click).
          adminFixture.test.setTimeout(60_000);
          const collaborationPage = new CollaborationPage(page, baseUrl);

          await collaborationPage.navigateToSpace(baseScenario.space.nameId);
          await collaborationPage.clickCallout(sharedCalloutName);

          await collaborationPage.openContextualMenu();
          await collaborationPage.publishCallout();

          await collaborationPage.openContextualMenu();
          await expect(collaborationPage.publishMenuItem).not.toBeVisible({
            timeout: 5000,
          });
        }
      );
    }
  );

  memberFixture.test.describe.serial('Member Contributions', () => {
    memberFixture.test.beforeAll(async ({ browser }) => {
      memberFixture.test.setTimeout(60_000);
      await memberFixture.setupAuthentication(
        browser,
        TestUserManager.users.spaceMember.email
      );
    });

    memberFixture.test.afterAll(async () => {
      memberFixture.test.setTimeout(30_000);
      await memberFixture.teardownAuthentication();
    });

    memberFixture.test(
      'Step 3: Member adds post contribution',
      async ({ page }) => {
        memberFixture.test.setTimeout(60_000);
        const collaborationPage = new CollaborationPage(page, baseUrl);
        const postTitle = `Member Post ${Date.now()}`;
        const postContent = 'This is a contribution from a space member';

        await collaborationPage.navigateToSpace(baseScenario.space.nameId);

        await collaborationPage.clickCallout(workflowCalloutName);

        await collaborationPage.addPostContribution(postTitle, postContent);
        // No fixed delay: poll until the contribution renders — 1s+3s flaked
        // on the slower local stack while a human (or CI's single worker)
        // never notices the latency.
        await expect(page.getByText(postTitle).first()).toBeVisible({
          timeout: 15000,
        });
      }
    );

    memberFixture.test(
      'Step 4: Member comments on callout',
      async ({ page }) => {
        memberFixture.test.setTimeout(60_000);
        const collaborationPage = new CollaborationPage(page, baseUrl);
        const commentText = `Member comment ${Date.now()}`;

        await collaborationPage.navigateToSpace(baseScenario.space.nameId);
        await collaborationPage.clickCallout(workflowCalloutName);

        await expect(collaborationPage.commentInput).toBeVisible();

        await collaborationPage.addComment(commentText);

        // Wait for comment to appear - use paragraph locator for reliable matching
        await expect(
          page.locator('p', { hasText: commentText }).first()
        ).toBeVisible({ timeout: 10000 });
      }
    );
  });

  const adminModerationFixture = createAuthenticatedSessionFixture({
    storageStateName: 'callout-workflow-admin-mod.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

  adminModerationFixture.test.describe.serial('Admin Moderation', () => {
    adminModerationFixture.test.beforeAll(async ({ browser }) => {
      adminModerationFixture.test.setTimeout(60_000);
      // Step 5 asserts contributions > 0 and comments > 0. Seed both via the
      // API so the assertions hold even when this describe runs in isolation
      // (or in a different worker than the member steps).
      const graphqlClient = getGraphqlClient();
      const contribution = await graphqlErrorWrapper(
        authToken =>
          graphqlClient.CreateContributionOnCallout(
            {
              contributionData: {
                calloutID: workflowCalloutId,
                type: CalloutContributionType.Post,
                post: {
                  profileData: {
                    displayName: `Moderation seed post ${Date.now()}`,
                  },
                },
              },
            },
            { authorization: `Bearer ${authToken}` }
          ),
        LibTestUser.SPACE_MEMBER
      );
      if (!contribution.data?.createContributionOnCallout?.post?.id) {
        throw new Error(
          `[moderation seed] contribution was not created: ${JSON.stringify(contribution.error ?? contribution)}`
        );
      }
      const comment = await graphqlErrorWrapper(
        authToken =>
          graphqlClient.SendMessageToRoom(
            {
              messageData: {
                roomID: workflowCommentsRoomId,
                message: `Moderation seed comment ${Date.now()}`,
              },
            },
            { authorization: `Bearer ${authToken}` }
          ),
        LibTestUser.SPACE_MEMBER
      );
      if (!comment.data?.sendMessageToRoom?.id) {
        throw new Error(
          `[moderation seed] comment was not sent: ${JSON.stringify(comment.error ?? comment)}`
        );
      }
      await adminModerationFixture.setupAuthentication(
        browser,
        TestUserManager.users.spaceAdmin.email
      );
    });

    adminModerationFixture.test.afterAll(async () => {
      adminModerationFixture.test.setTimeout(30_000);
      await adminModerationFixture.teardownAuthentication();
    });

    adminModerationFixture.test(
      'Step 5: Admin moderates content',
      async ({ page }) => {
        adminModerationFixture.test.setTimeout(60_000);
        const collaborationPage = new CollaborationPage(page, baseUrl);

        await collaborationPage.navigateToSpace(baseScenario.space.nameId);
        await collaborationPage.clickCallout(workflowCalloutName);

        const contributions = collaborationPage.contributionsList;
        await expect(contributions.first()).toBeVisible();

        const contributionCount =
          await collaborationPage.getContributionCount();
        expect(contributionCount).toBeGreaterThan(0);

        const commentCount = await collaborationPage.getCommentCount();
        expect(commentCount).toBeGreaterThan(0);

        // Verify comments are visible using Reply button (each comment has one)
        await expect(collaborationPage.replyButton.first()).toBeVisible();

        await collaborationPage.openContextualMenu();
        await expect(collaborationPage.editButton).toBeVisible();
        await expect(collaborationPage.deleteButton).toBeVisible();
      }
    );
  });
});
