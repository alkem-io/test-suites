import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { createCalloutOnCalloutsSet } from '@functional-api/callout/callouts.request.params';
import { getSpaceData } from '@functional-api/journey/space/space.request.params';
import { buildMatrixFixtures, teardownMatrixFixtures } from './fixtures';
import type { MatrixFixtures } from './fixtures';
import { isAuthorizationDenial } from './surface-invocations';

/**
 * workspace#027-platform-role-redesign — Slice A QA review ruling cells that
 * fall OUTSIDE the generated role-action-matrix (`role-action-matrix.it-spec.ts`):
 * two of the four Slice A QA rulings are census additions
 * (`eventOnOrganizationVerification` A6, `createInnovationHub` A12) and are
 * already exercised there once `verification/a-row-surfaces.data.ts` and
 * `surface-invocations.ts` are re-synced — no separate file needed for
 * those two. The other two rulings are NOT A-row census surfaces at all, so
 * the generator produces no cell for either, and this file states them
 * directly:
 *
 *  - **server-C2-c** (ruling (a)): a privilege rule threads
 *    UPDATE/CREATE/FILE_UPLOAD (never DELETE) from `platform-support-org-resources`
 *    onto each org-owned pack/hub/template's profile, visual, reference and
 *    storage-bucket policy — not a new gate on a shared resolver, so no
 *    census member exists to declare. Probed here via `updateVisual` (the
 *    same UPDATE gate `uploadImageOnVisual` checks, without the multipart
 *    upload plumbing) against the fixture innovation hub's own banner
 *    visual — server's own coverage list for this ruling names
 *    `innovation.hub.service.authorization.spec.ts` alongside the pack and
 *    template services, so the hub is an equally valid witness for the SAME
 *    threaded rule.
 *  - **server-C1-1** (ruling (b′) "mover-only reads"): A16's `READ` surface
 *    already asserts platform-resource-admin CAN read a space (mirrored in
 *    `verification/mirror-integrity.it-spec.ts` and exercised live by A16's
 *    own matrix cell). What neither of those states is the other half of
 *    "mover-only": the grant is NON-cascading, so the mover must NOT reach
 *    a callout's own content inside that space, while A9's own census
 *    surfaces (`moveContributionToCallout`, `transferCallout`) already
 *    prove it CAN still resolve and act on a transfer target. This file
 *    states both halves of that contrast together, against ONE DRAFT
 *    callout in A16's own private-space fixture.
 */

let fixtures: MatrixFixtures;
let draftCalloutId: string;

beforeAll(async () => {
  fixtures = await buildMatrixFixtures();

  // QA server-C1-1: a DRAFT callout (the `createCalloutOnCalloutsSet`
  // default — see `callouts.request.params.ts`'s `defaultCallout`) inside
  // `fx.a16PrivateSpaceId`, a PRIVATE space with no membership grants
  // (T007b/corr-ts-4) — so no path other than the ones this file names
  // reaches it.
  const spaceResult = await getSpaceData(fixtures.a16PrivateSpaceId);
  const calloutsSetId =
    spaceResult.data?.lookup.space?.collaboration?.calloutsSet.id ?? '';
  const calloutResult = await createCalloutOnCalloutsSet(calloutsSetId, {
    framing: {
      profile: { displayName: 'qa-c1-1 draft callout (never published)' },
    },
  });
  draftCalloutId = calloutResult.data?.createCalloutOnCalloutsSet?.id ?? '';
  expect(
    draftCalloutId,
    'qa-review-ruling-cells: could not create the DRAFT callout fixture — the negative assertion below would pass for the wrong reason (no target) rather than the right one (denied)'
  ).toBeTruthy();
}, 300_000);

afterAll(async () => {
  if (fixtures) {
    await teardownMatrixFixtures(fixtures);
  }
});

describe('QA server-C2-c (ruling (a)) — platform-support edits an org-owned hub visual', () => {
  it('platform-support UPDATEs the innovation hub banner visual (threaded PLATFORM_SUPPORT_ORG_RESOURCES rule)', async () => {
    const client = getGraphqlClient();
    const res = await graphqlErrorWrapper(
      token =>
        client.updateVisual(
          {
            updateData: {
              visualID: fixtures.innovationHubBannerVisualId,
              uri: 'https://example.org/qa-c2-c-support-banner.png',
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_SUPPORT
    );

    expect(
      res.error,
      `platform-support was refused updateVisual on the org-owned hub's banner — the threaded PLATFORM_SUPPORT_ORG_RESOURCES rule (server-C2-c ruling (a)) should reach it: ${JSON.stringify(res.error?.errors)}`
    ).toBeUndefined();
    expect(res.data?.updateVisual?.uri).toBe(
      'https://example.org/qa-c2-c-support-banner.png'
    );
  });

  it('a role with none of the fourteen (an ordinary registered user) is DENIED the same visual', async () => {
    const client = getGraphqlClient();
    const res = await graphqlErrorWrapper(
      token =>
        client.updateVisual(
          {
            updateData: {
              visualID: fixtures.innovationHubBannerVisualId,
              uri: 'https://example.org/qa-c2-c-should-not-land.png',
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.NON_SPACE_MEMBER
    );

    expect(
      res.error,
      'an ordinary user updated an org-owned hub visual — PLATFORM_SUPPORT_ORG_RESOURCES (or an unrelated over-broad grant) leaked to a role that should not reach it'
    ).toBeDefined();
    expect(isAuthorizationDenial(res.error?.errors)).toBe(true);
  });
});

describe('QA server-C1-1 (ruling (b′) "mover-only reads") — platform-resource-admin cannot read a DRAFT callout, but still resolves a transfer target', () => {
  it('platform-resource-admin is DENIED reading the DRAFT callout in a private space it has never been granted', async () => {
    const client = getGraphqlClient();
    const res = await graphqlErrorWrapper(
      token =>
        client.calloutReadProbe(
          { calloutId: draftCalloutId },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_RESOURCE_ADMIN
    );

    expect(
      res.error,
      "platform-resource-admin read a DRAFT callout's content — its space READ is supposed to be NON-cascading (space + About card only, server-C1-1 ruling (b′)), and its calloutsSet/callout reads are supposed to be PUBLISHED-only"
    ).toBeDefined();
    expect(isAuthorizationDenial(res.error?.errors)).toBe(true);
  });

  it('platform-resource-admin CAN still invoke moveContributionToCallout — the A9 target-resolution capability the mover-only read exists to preserve', async () => {
    // The same A9 surface `surface-invocations.ts` already wires for the
    // generated matrix (`fx.contributionId` -> `fx.secondCalloutId`) —
    // restated here, directly beside the DENY above, so the two halves of
    // "mover-only" read as one contrast rather than two files a reviewer
    // has to cross-reference.
    const client = getGraphqlClient();
    const res = await graphqlErrorWrapper(
      token =>
        client.moveContributionToCallout(
          {
            moveContributionData: {
              contributionID: fixtures.contributionId,
              calloutID: fixtures.secondCalloutId,
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_RESOURCE_ADMIN
    );

    expect(
      res.error,
      `platform-resource-admin was refused moveContributionToCallout — A9's own target-resolution capability should be unaffected by the mover-only read narrowing: ${JSON.stringify(res.error?.errors)}`
    ).toBeUndefined();
  });
});
