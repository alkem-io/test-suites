// plan: client-web/src/functional-e2e/account-deletion/account-deletion-test-plan.md
// (workspace#054, client-web#10107) — the portable delta after test-suites#620.
//
// ⚠ Never use `createAuthenticatedSessionFixture` in this area. It reuses a
// disk-cached storage state for the whole run, so the session's `created_at`
// can exceed the 15-minute freshness window the server checks on self
// deletion — which looks exactly like a product bug. Every sign-in here is a
// fresh per-test browser context (`signIn`, or `openLoggedInSession` from
// `session-revocation.helpers.ts` when a distinct disposable subject needs
// its own cookie session).
//
// `signIn` / `goToSecuritySettings` are lifted from
// `user-profile/mcp-api-keys-mint.spec.ts` — their third copy in this repo.
// If test-suites#620 merges, its own `delete-account/delete-account.helpers.ts`
// duplicates the same walk again; reconcile the two directories rather than
// keeping both.

import { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import axios from 'axios';
import { getGraphqlClient, testConfiguration, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import {
  acceptAllCookiesButton,
  logInHeaderLink,
} from '../authentication/common-authentication-page-elements';

export const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
export const adminEmail = process.env.AUTH_ADMIN_EMAIL || 'admin@alkem.io';
export const defaultPassword =
  process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

/**
 * Sign in through the real SPA form (default context/page — never a cached
 * storage state). Mirrors `mcp-api-keys-mint.spec.ts`'s walk.
 */
export const signIn = async (
  page: Page,
  email: string = adminEmail,
  password: string = defaultPassword
): Promise<void> => {
  await page.goto(baseUrl);
  if (
    await acceptAllCookiesButton(page)
      .isVisible({ timeout: 3000 })
      .catch(() => false)
  ) {
    await acceptAllCookiesButton(page).click();
  }
  if (
    await logInHeaderLink(page)
      .isVisible({ timeout: 5000 })
      .catch(() => false)
  ) {
    await logInHeaderLink(page).click();
  } else {
    await page.goto(`${baseUrl}/login`);
  }
  await page.getByRole('textbox', { name: 'E-Mail' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), {
    timeout: 15000,
  });
};

/**
 * Navigate to the SIGNED-IN caller's OWN Security settings tab, resolving
 * their nameID from the header's "My Account" link rather than hardcoding
 * it — keeps this valid regardless of which identity the environment seeds.
 */
export const goToSecuritySettings = async (page: Page): Promise<void> => {
  await page.goto(`${baseUrl}/home`);
  const accountLink = page.getByRole('link', { name: 'My Account' });
  await accountLink.waitFor({ state: 'visible', timeout: 15000 });
  const href = await accountLink.getAttribute('href');
  const nameId = href?.match(/\/user\/([^/]+)\/settings/)?.[1];
  expect(nameId).toBeTruthy();
  await page.goto(`${baseUrl}/user/${nameId}/settings/security`);
};

/**
 * Navigate directly to an ARBITRARY user's Security settings tab by nameID —
 * for the cross-user visibility check (TC-16), where the signed-in caller is
 * never the subject whose settings are being opened.
 */
export const gotoUserSecuritySettings = async (
  page: Page,
  nameId: string
): Promise<void> => {
  await page.goto(`${baseUrl}/user/${nameId}/settings/security`);
};

/**
 * Create a Post contribution on a callout AS the given user's own bearer, so
 * the activity log's `triggeredBy` genuinely resolves to that user (never an
 * admin proxy). No generated-client wrapper exists for this in `@alkemio/
 * tests-lib` today (the same "raw document" situation the build sheet notes
 * for `accountDeletion`) — sent directly, matching the pattern already used
 * in `session-revocation.helpers.ts`.
 */
const CREATE_POST_CONTRIBUTION_MUTATION = `
  mutation createContributionOnCalloutForActivity($contributionData: CreateContributionOnCalloutInput!) {
    createContributionOnCallout(contributionData: $contributionData) {
      id
      post {
        id
        profile {
          displayName
        }
      }
    }
  }`;

export const createPostContributionAsUser = async (
  token: string,
  calloutID: string,
  displayName: string
): Promise<{ postId: string; postDisplayName: string }> => {
  const response = await axios.post(
    testConfiguration.endPoints.graphql.private,
    {
      query: CREATE_POST_CONTRIBUTION_MUTATION,
      variables: {
        contributionData: {
          calloutID,
          type: 'POST',
          post: {
            profileData: { displayName },
          },
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    }
  );

  const errors = response.data?.errors;
  if (errors?.length) {
    throw new Error(
      `createContributionOnCallout failed: ${JSON.stringify(errors)}`
    );
  }
  const post = response.data?.data?.createContributionOnCallout?.post;
  if (!post?.id) {
    throw new Error(
      `createContributionOnCallout returned no post: ${JSON.stringify(response.data)}`
    );
  }
  return { postId: post.id, postDisplayName: post.profile.displayName };
};

/**
 * Resolve the Alkemio user id for the caller identified by `token` (via
 * `me { user { id } }`) — the smallest raw probe available, matching
 * `session-revocation.helpers.ts::resolveAlkemioUserId`.
 */
export const resolveUserIdFromToken = async (token: string): Promise<string> => {
  const response = await axios.post(
    testConfiguration.endPoints.graphql.private,
    { query: '{ me { user { id } } }' },
    {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      validateStatus: () => true,
    }
  );
  const userId = response.data?.data?.me?.user?.id;
  if (!userId) {
    throw new Error(
      `Unable to resolve user id from token (HTTP ${response.status}): ${JSON.stringify(response.data)}`
    );
  }
  return userId;
};

/**
 * `platform.admin.userProfileRemoved` ships `inApp: false` by default
 * (`user.service.ts::getDefaultUserSettings`) — an operational admin has to
 * opt in before the notification centre shows anything for this event at
 * all. TC-14 needs it on for the duration of the test; flip it back after,
 * so a shared `TestUserManager` persona's settings are not left mutated for
 * every other suite that runs against this environment.
 */
export const setUserProfileRemovedInAppNotification = async (
  userID: string,
  enabled: boolean
): Promise<void> => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateUserSettings(
      {
        settingsData: {
          userID,
          settings: {
            notification: {
              platform: {
                admin: {
                  userProfileRemoved: { inApp: enabled },
                },
              },
            },
          },
        },
      },
      { authorization: `Bearer ${authToken}` }
    );

  const result = await graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
  if (result.error) {
    throw new Error(
      `setUserProfileRemovedInAppNotification failed: ${JSON.stringify(result.error)}`
    );
  }
};
