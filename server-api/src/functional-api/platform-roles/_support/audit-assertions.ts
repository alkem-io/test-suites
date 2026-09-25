import { expect } from 'vitest';
import { countFor, recordsFor } from './mcp-client';

/**
 * "This was recorded" — asserted the only honest way: the subject's record
 * COUNT grows by exactly `adds` across the action, and only then is the newest
 * record's content checked. Never "the newest row looks right" on its own: on a
 * persistent subject that passes on a stale record from an earlier run.
 */
export const expectRecorded = async (
  auditReaderToken: string,
  subjectUserId: string,
  act: () => Promise<unknown>,
  expected: {
    adds?: number;
    /** Matched against the NEWEST record (the tool returns newest first). */
    newest: Record<string, unknown>;
  }
): Promise<void> => {
  const before = await countFor(auditReaderToken, subjectUserId);
  await act();
  expect(await countFor(auditReaderToken, subjectUserId)).toBe(
    before + (expected.adds ?? 1)
  );
  const [newest] = await recordsFor(auditReaderToken, subjectUserId);
  expect(newest).toMatchObject(expected.newest);
};

/** A refused role assignment: the record carries the rejection MESSAGE, which names the rule. */
export const rejectedGrant = (naming: string | RegExp) => ({
  category: 'platform_role_assignment',
  outcome: 'role_grant_rejected',
  details: {
    rejectedRule:
      typeof naming === 'string'
        ? expect.stringContaining(naming)
        : expect.stringMatching(naming),
  },
});
