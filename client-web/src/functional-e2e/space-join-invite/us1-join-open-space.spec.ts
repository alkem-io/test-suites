// spec: client-web/src/functional-e2e/space-join-invite/space-join-invite-test-plan.md
// W2 journey 1 (docs/qa/server-rebuild/plan.md § W2): join an open Space, then open it.

import { test, expect } from '@playwright/test';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  aboutDialog,
  baseUrl,
  calloutHeading,
  contentFeed,
  expectMutationAnswered,
  openPersonaPage,
  spaceTitle,
  teardownScenario,
  userIdsInRole,
  type PersonaPage,
} from '../helpers/space-access.helper';

/**
 * A PRIVATE Space whose membership policy is OPEN: its content (one published
 * post callout) is readable by members only, and anyone may join. That makes
 * the member-only callout the oracle of the join — the server grants READ on
 * the content exactly when the join landed.
 *
 *   joiner    `non.space`        — clicks Join
 *   bystander `subspace.member`  — never joins (negative control)
 *
 * Both are harness personas; the only state they gain is a membership of this
 * run's own Space, which is deleted with it.
 */
const uid = UniqueIDGenerator.getID();
const scenarioName = `w2-join-${uid}`;

let scenario: OrganizationWithSpaceModel | undefined;
let joiner: PersonaPage | undefined;
let bystander: PersonaPage | undefined;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  scenario = await TestScenarioFactory.createBaseScenario({
    name: scenarioName,
    space: {
      collaboration: { addPostCallout: true },
      community: { admins: [TestUser.SPACE_ADMIN], members: [TestUser.SPACE_ADMIN] },
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },
        membership: { policy: CommunityMembershipPolicy.Open },
      },
    },
  });
  joiner = await openPersonaPage(browser, TestUserManager.users.nonSpaceMember.email);
  bystander = await openPersonaPage(browser, TestUserManager.users.subspaceMember.email);
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await joiner?.close();
  await bystander?.close();
  await teardownScenario(scenario);
  scenario = undefined;
});

const space = () => scenario!.space;
const calloutName = () => space().collaboration.calloutPostDisplayName;
const joinerId = () => TestUserManager.users.nonSpaceMember.id;
const bystanderId = () => TestUserManager.users.subspaceMember.id;

test.describe('W2 journey 1 — join an open Space, then open it', () => {
  test('J1-1 a non-member of a private open Space is shown its About page with Join, and none of its content', async () => {
    const page = joiner!.page;
    await page.goto(`${baseUrl}/${space().nameId}`);

    const about = aboutDialog(page, space().about.profile.displayName);
    await expect(about).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${space().nameId}/about$`));
    await expect(about.getByRole('button', { name: 'Join', exact: true })).toBeVisible();
    // The dialog above is the rendered answer for this viewer; the feed is not part of it.
    await expect(contentFeed(page)).toHaveCount(0);
    expect(await userIdsInRole(space().community.roleSetId)).not.toContain(joinerId());
  });

  test('J1-2 clicking Join makes the persona a MEMBER, and the Space then opens with its member-only callout', async () => {
    const page = joiner!.page;
    const about = aboutDialog(page, space().about.profile.displayName);
    await expect(about).toBeVisible();

    const joined = expectMutationAnswered(page, 'joinRoleSet');
    await about.getByRole('button', { name: 'Join', exact: true }).click();
    await joined();

    await expect.poll(() => userIdsInRole(space().community.roleSetId)).toContain(joinerId());

    await page.goto(`${baseUrl}/${space().nameId}`);
    await expect(spaceTitle(page, space().about.profile.displayName)).toBeVisible();
    await expect(calloutHeading(page, calloutName())).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${space().nameId}$`));
    await expect(aboutDialog(page, space().about.profile.displayName)).toHaveCount(0);
  });

  test('J1-3 a persona who did not join still cannot see the callout the new member sees', async () => {
    // Positive control first: the new member sees it on a fresh load.
    await joiner!.page.reload();
    await expect(calloutHeading(joiner!.page, calloutName())).toBeVisible();

    const page = bystander!.page;
    await page.goto(`${baseUrl}/${space().nameId}`);
    const about = aboutDialog(page, space().about.profile.displayName);
    await expect(about).toBeVisible();
    await expect(about.getByRole('button', { name: 'Join', exact: true })).toBeVisible();
    await expect(contentFeed(page)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: calloutName(), exact: true })).toHaveCount(0);

    const members = await userIdsInRole(space().community.roleSetId);
    expect(members).toContain(joinerId());
    expect(members).not.toContain(bystanderId());
  });
});
