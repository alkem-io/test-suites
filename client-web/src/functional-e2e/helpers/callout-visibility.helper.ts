import { expect } from '@playwright/test';
import {
  readCalloutsSetCalloutVisibility,
  type CalloutVisibility,
  type GraphqlActor,
} from '@alkemio/tests-lib';
import { must } from './lib-actor.helper';

/**
 * The stored visibility (DRAFT / PUBLISHED) of the callout titled `title`, as
 * `actor` is allowed to list it — `undefined` when the server does not list
 * it for that actor. The server leaves a DRAFT out of a member's listing
 * (probed 2026-11-09: admin 4 callouts, member 3 while one is a draft), so
 * read as a member this is also the server-side half of "a member cannot see
 * a draft".
 */
export async function readCalloutVisibilityByTitle(
  calloutsSetId: string,
  title: string,
  actor: GraphqlActor
): Promise<CalloutVisibility | undefined> {
  const set = must(
    await readCalloutsSetCalloutVisibility(calloutsSetId, actor),
    'read back the callouts set visibility'
  );
  const matches = (set.lookup.calloutsSet?.callouts ?? []).filter(
    c => c.framing.profile.displayName === title
  );
  expect(
    matches.length,
    `at most one stored callout titled "${title}"`
  ).toBeLessThanOrEqual(1);
  return matches[0]?.settings.visibility;
}

/**
 * Wait until the callout titled `title` reads back with `expected` for
 * `actor` (`undefined` = not listed for that actor). Polls: a UI publish
 * answers after its confirm dialog has already closed.
 */
export async function expectStoredCalloutVisibility(
  calloutsSetId: string,
  title: string,
  actor: GraphqlActor,
  expected: CalloutVisibility | undefined,
  what: string
): Promise<void> {
  await expect
    .poll(() => readCalloutVisibilityByTitle(calloutsSetId, title, actor), {
      message: what,
    })
    .toBe(expected);
}
