/**
 * Grandfathered, pre-existing undocumented skips for the skip-citation
 * guard (`validate-skip-citations.ts`) — recorded once, when the guard was
 * introduced, so it doesn't also have to do the archaeology of filing a bug
 * for each one.
 *
 * This list is CLOSED: no new skip may be added to it going forward, and
 * any entry that stops matching a live undocumented skip in the tree
 * (because the test was documented, deleted, or renamed) must be removed in
 * the same change — the guard fails closed on a stale entry to enforce
 * that, same discipline as `NIGHTLY_EXCLUDE` in `nightly-lanes.ts`.
 *
 * Keyed by `file + kind + title`, not line number — see
 * validate-skip-citations.ts's module docstring for why.
 *
 * This module lives alongside the guard (rather than inline in it) so a
 * fixture tree can supply its own copy via `--root`, the same pattern
 * `validate-parallel-lanes.ts` uses for `nightly-lanes.ts`.
 */

export interface UndocumentedSkipEntry {
  /** server-api-relative posix path */
  file: string;
  /** e.g. 'test.skip', 'describe.skip', 'xit' */
  kind: string;
  /** the skip call's own title string, verbatim */
  title: string;
  /** ISO date this entry was grandfathered in */
  recordedOn: string;
  note: string;
}

export const UNDOCUMENTED_SKIPS: UndocumentedSkipEntry[] = [
  {
    file: 'src/functional-api/activity-logs/challenge-activity-logs.it-spec.ts',
    kind: 'test.skip',
    title:
      'should return CALLOUT_PUBLISHED, POST_CREATED, POST_COMMENT, DISCUSSION_COMMENT, WHITEBOARD_CREATED',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/activity-logs/opportunity-activity-logs.it-spec.ts',
    kind: 'test.skip',
    title:
      'should return CALLOUT_PUBLISHED, POST_CREATED, POST_COMMENT, DISCUSSION_COMMENT, WHITEBOARD_CREATED',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/activity-logs/space-activity-logs.it-spec.ts',
    kind: 'test.skip',
    title:
      'should return CALLOUT_PUBLISHED, POST_CREATED, POST_COMMENT, DISCUSSION_COMMENT, WHITEBOARD_CREATED',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/calendar/calendar-event.it-spec.ts',
    kind: 'test.skip',
    title: 'should redirect when accessed with Bearer token (session auth required)',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/callout/lock-state/close-state-callouts.it-spec.ts',
    kind: 'describe.skip',
    title: 'Callout - Close State - User Privileges Discussions',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/callout/transfer/transfer-callout-template-flow.it-spec.ts',
    kind: 'test.skip',
    title: 'the transferred callout adopts the destination default flow state',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/journey/space/space-platform-settings.it-spec.ts',
    kind: 'describe.skip',
    title: 'DDT role WITH access to public archived Space',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/journey/space/space-platform-settings.it-spec.ts',
    kind: 'describe.skip',
    title: 'DDT role WITHOUT access to public archived Space',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/journey/subspace/create-subspace.it-spec.ts',
    kind: 'test.skip',
    title: 'should create 2 subspaces with different names and nameIDs',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/journey/subspace/flows-subspace.it-spec.ts',
    kind: 'test.skip',
    title: 'should not result unassigned users to a subspace',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/notifications/messaging/conversation-messages-negative.it-spec.ts',
    kind: 'test.skip',
    title:
      'VC/guidance-bot sender produces zero notifications (US4-AS1) — delegated, not fabricated here',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/notifications/platform/space-creation.it-spec.ts',
    kind: 'describe.skip',
    title: 'Notifications - Space deletion',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/notifications/space/collaboration/callouts.it-spec.ts',
    kind: 'test.skip',
    title: 'HA create PUBLISHED space callout type: WHITEBOARD - HM(7) get notifications',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/notifications/user/mention-user.it-spec.ts',
    kind: 'describe.skip',
    title: 'Post comment',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/roleset/invitations/invitation-contributors.it-spec.ts',
    kind: 'test.skip',
    title: 'should throw error for quering not existing invitation',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/roleset/organization/organization-edge.it-spec.ts',
    kind: 'test.skip',
    title: 'Error is thrown for Space',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/search/search.it-spec.ts',
    kind: 'test.skip',
    title: 'should search without filters',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/search/search.it-spec.ts',
    kind: 'test.skip',
    title: 'should throw error for empty string search',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/search/search.it-spec.ts',
    kind: 'describe.skip',
    title: 'Search IN Public Space Private Subspace Data',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/storage/uploads.it-spec.ts',
    kind: 'test.skip',
    title: 'read uploaded file',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/storage/uploads.it-spec.ts',
    kind: 'test.skip',
    title: 'fail to read file after document deletion',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/storage/uploads.it-spec.ts',
    kind: 'test.skip',
    title: 'read uploaded file after related reference is removed',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
  {
    file: 'src/functional-api/storage/uploads.it-spec.ts',
    kind: 'test.skip',
    title: 'read uploaded visual',
    recordedOn: '2026-08-21',
    note: 'grandfathered when the skip-citation guard was introduced; pending documentation',
  },
];
