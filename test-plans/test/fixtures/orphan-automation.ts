/**
 * Fixture: a test file with zero @testCase tags — every describe/it/test
 * block here must be surfaced as an orphan-automation coverage defect.
 *
 * Never executed. Used only as input to parse/code-tags.ts tests.
 */

/* eslint-disable */

import { describe, it, test } from 'vitest';

describe('Orphan suite A', () => {
  it('does a thing', () => {
    // no tag
  });

  test('does another thing', () => {
    // still no tag
  });
});

describe('Orphan suite B', () => {
  it('inner case', () => {});
});
