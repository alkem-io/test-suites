/**
 * Fixture: a test file with @testCase tags in every form the grammar allows.
 * Exercises single ID, comma list, whitespace list, JSDoc block, single-line
 * comment, outer-describe inheritance, and inner-test override.
 *
 * Never executed. Used only as input to parse/code-tags.ts tests.
 */

/* eslint-disable */

import { describe, it, test } from 'vitest';

// @testCase TC-9001
describe('Single-ID tag (single-line comment)', () => {
  it('inherits the tag from the describe', () => {});
});

/**
 * @testCase TC-9001, TC-9002
 */
describe('Comma-separated multi-ID tag (JSDoc block)', () => {
  it('covers both TC-9001 and TC-9002', () => {});
});

// @testCase TC-9001 TC-9002
describe('Whitespace-separated multi-ID tag', () => {
  it('covers both TC-9001 and TC-9002 via whitespace form', () => {});
});

// @testCase TC-9001
describe('Outer tag with inner override', () => {
  it('inherits TC-9001', () => {});

  // @testCase TC-9002
  it('overrides to TC-9002', () => {});
});

// @testCase TC-9999
test('tag references a nonexistent case (expected: unknown-case-ref defect)', () => {});
