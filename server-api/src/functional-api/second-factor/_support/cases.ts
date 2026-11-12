import { afterEach, beforeEach, inject } from 'vitest';
import {
  clearAddressCounters,
  createThrowawayUser,
  deleteThrowawayUser,
  type ThrowawayUser,
} from '@alkemio/tests-lib';

/** The run's role tokens (seeded once by the project's global setup). */
export const roleTokens = () => inject('secondFactor').tokens;

/**
 * Wires a spec file's cases: every case starts with the runner's address
 * counters cleared, and every identity a case makes through the returned
 * function is deleted (platform user and Kratos identity) after it.
 */
export const secondFactorCases = (): ((tag: string) => Promise<ThrowawayUser>) => {
  const made: ThrowawayUser[] = [];
  beforeEach(async () => {
    await clearAddressCounters();
  });
  afterEach(async () => {
    // Every delete is attempted; the first failure is reported after them.
    const failures: unknown[] = [];
    while (made.length > 0) {
      await deleteThrowawayUser(made.pop()!, roleTokens().usersAdmin).catch(
        error => failures.push(error)
      );
    }
    if (failures.length > 0) throw failures[0];
  });
  return async tag => {
    const user = await createThrowawayUser(tag);
    made.push(user);
    return user;
  };
};
