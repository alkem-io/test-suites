import { afterEach, beforeEach, inject } from 'vitest';
import {
  clearAddressCounters,
  createThrowawayUser,
  deleteThrowawayUsers,
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
    await deleteThrowawayUsers(made.splice(0).reverse(), roleTokens().usersAdmin);
  });
  return async tag => {
    const user = await createThrowawayUser(tag);
    made.push(user);
    return user;
  };
};
