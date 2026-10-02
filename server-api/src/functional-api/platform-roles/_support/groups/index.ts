import type { GroupModule, Invocation } from '../types';
import { A1_GROUP } from './a1';
import { A2_GROUP } from './a2';
import { A3_GROUP } from './a3';
import { A4_GROUP } from './a4';
import { A5_GROUP } from './a5';
import { A6_GROUP } from './a6';
import { A7_GROUP } from './a7';
import { A8_GROUP } from './a8';
import { A9_GROUP } from './a9';
import { A10_GROUP } from './a10';
import { A11_GROUP } from './a11';
import { A12_GROUP } from './a12';
import { A13_GROUP } from './a13';
import { A14_GROUP } from './a14';
import { A15_GROUP } from './a15';
import { A16_GROUP } from './a16';
import { A19_GROUP } from './a19';
import { A20_GROUP, A20B_GROUP } from './a20';
import { A21_GROUP } from './a21';

/**
 * One module per capability group. A group owns its fixtures, its teardown and
 * its invocations, so adding a group never touches another group's code.
 * Build order = list order; teardown runs in reverse.
 */
export const GROUPS = [
  A1_GROUP,
  A2_GROUP,
  A3_GROUP,
  A4_GROUP,
  A5_GROUP,
  A6_GROUP,
  A7_GROUP,
  A8_GROUP,
  A9_GROUP,
  A10_GROUP,
  A11_GROUP,
  A12_GROUP,
  A13_GROUP,
  A14_GROUP,
  A15_GROUP,
  A16_GROUP,
  A19_GROUP,
  A20_GROUP,
  A20B_GROUP,
  A21_GROUP,
] as unknown as readonly GroupModule[];

/**
 * Groups whose build() creates organizations as Platform Support. They are built
 * ONE AFTER ANOTHER: creating an organization changes the creator's credentials
 * and invalidates its cached actor context, and when one actor does that
 * concurrently the server can re-cache a stale credential set — observed as
 * Support being refused `grant` on the role-set of an organization it had just
 * created. Every other group builds in parallel beside this lane.
 */
export const BUILT_IN_SEQUENCE: ReadonlySet<string> = new Set([
  'A1',
  'A2',
  'A3',
  'A6',
  'A7',
  'A8',
  'A9',
  'A11',
  'A12',
  'A20',
  'A20b',
]);

export const invocationFor = (
  capabilityId: string
): { group: GroupModule; invocation: Invocation } | undefined => {
  for (const group of GROUPS) {
    const invocation = group.invocations[capabilityId];
    if (invocation) return { group, invocation };
  }
  return undefined;
};
