import { expect, type Locator, type Page, type Request } from '@playwright/test';
import { updateSpaceSettings } from '@alkemio/tests-lib';
import { CommunityMembershipPolicy, SpacePrivacyMode } from '@alkemio/client-lib';

/**
 * Shared helpers for the Applications area (client-web#10419 invitation-only
 * cases). Not a spec: it needs no nightly registration.
 */

/**
 * Every label `SpaceAboutApplyButton` can render (crd-space `about.*`). "No
 * apply control" means none of these exists as a button in the scope.
 */
export const THE_CONTROL_NAMES = [
  'Apply',
  'Join',
  'Application pending',
  'Parent application pending',
  'Apply not available',
  'Accept invitation',
  'Sign in to apply',
] as const;

/**
 * Sets a space's membership policy as the default global admin and throws if
 * the server reports an error.
 *
 * `updateSpaceSettings` always sends a full `membership` block (policy
 * defaulting to OPEN) and the server replaces `settings.membership`
 * wholesale, so privacy and membership are always sent together here. Flip
 * L0 first, then L1, so the L1's authorization recompute sees the L0's new
 * state.
 */
export const setMembershipPolicy = async (
  spaceId: string,
  policy: CommunityMembershipPolicy
): Promise<void> => {
  const result = await updateSpaceSettings(spaceId, {
    privacy: { mode: SpacePrivacyMode.Public },
    membership: { policy, allowSubspaceAdminsToInviteMembers: true },
  });
  if (result.error) {
    throw new Error(
      `setMembershipPolicy(${spaceId}, ${policy}) failed: ${JSON.stringify(result.error)}`
    );
  }
};

const SETTLE_OPERATIONS = new Set([
  'UrlResolver',
  'ApplicationButton',
  'UserPendingMemberships',
]);

type GraphqlOperation = {
  operationName?: string;
  variables?: { spaceId?: string };
};

const readOperation = (request: Request): GraphqlOperation | undefined => {
  if (request.method() !== 'POST' || !request.url().includes('/graphql')) {
    return undefined;
  }
  try {
    // Multipart (file upload) bodies are not JSON; those are ignored.
    return request.postDataJSON() as GraphqlOperation | undefined;
  } catch {
    return undefined;
  }
};

/**
 * Observes the apply flow's own network traffic so an ABSENCE assertion is
 * made against a resolved render, not a loading one (while loading, the
 * About dialogs and the banner render nothing, which is the same DOM as
 * "hidden").
 *
 * What the product actually does (observed on the local stack): the surface
 * mounts once `UrlResolver` has resolved, and its apply hook then issues
 * `UserPendingMemberships` (cache-and-network, so always a network request)
 * and, when the space is not already in Apollo's cache, `ApplicationButton`.
 * An L0 space is already cached by the page's own queries, so no
 * `ApplicationButton` request is made there; a subspace has one. The hook's
 * `loading` spans these requests, so "settled" means: the URL resolved, at
 * least one `UserPendingMemberships` started after that and every tracked
 * request has finished (and, when `buttonSpaceId` is given, that space's
 * `ApplicationButton` finished too).
 *
 * Create it BEFORE `page.goto`; call `settled()` after the positive anchor is
 * visible; `dispose()` in `finally`.
 */
export const applyFlowSettled = (
  page: Page,
  buttonSpaceId?: string
): { settled: () => Promise<void>; dispose: () => void } => {
  const inFlight = new Set<Request>();
  let urlResolved = false;
  let pendingStartedAfterResolve = 0;
  let buttonFinished = false;

  const onRequest = (request: Request) => {
    const op = readOperation(request);
    if (!op?.operationName || !SETTLE_OPERATIONS.has(op.operationName)) {
      return;
    }
    inFlight.add(request);
    if (op.operationName === 'UserPendingMemberships' && urlResolved) {
      pendingStartedAfterResolve++;
    }
  };
  const onDone = (request: Request) => {
    if (!inFlight.delete(request)) {
      return;
    }
    const op = readOperation(request);
    if (op?.operationName === 'UrlResolver') {
      urlResolved = true;
    }
    if (
      op?.operationName === 'ApplicationButton' &&
      op.variables?.spaceId === buttonSpaceId
    ) {
      buttonFinished = true;
    }
  };

  page.on('request', onRequest);
  page.on('requestfinished', onDone);
  page.on('requestfailed', onDone);

  return {
    settled: async () => {
      await expect
        .poll(
          () =>
            urlResolved &&
            pendingStartedAfterResolve > 0 &&
            inFlight.size === 0 &&
            (buttonSpaceId === undefined || buttonFinished),
          { message: 'the apply flow did not finish loading' }
        )
        .toBe(true);
      // Let React commit the resolved render.
      await page.evaluate(
        () =>
          new Promise(resolve =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => resolve(null))
            )
          )
      );
    },
    dispose: () => {
      page.off('request', onRequest);
      page.off('requestfinished', onDone);
      page.off('requestfailed', onDone);
    },
  };
};

/** Asserts none of THE_CONTROL_NAMES exists as a button inside `scope`. */
export const expectNoApplyControl = async (scope: Locator | Page): Promise<void> => {
  for (const name of THE_CONTROL_NAMES) {
    await expect(
      scope.getByRole('button', { name, exact: true }),
      `no "${name}" button`
    ).toHaveCount(0);
  }
};
