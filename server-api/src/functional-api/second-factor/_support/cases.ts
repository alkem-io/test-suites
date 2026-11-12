import { afterEach, beforeEach, inject } from 'vitest';
import {
  clearAddressCounters,
  createThrowawayUser,
  deleteThrowawayUsers,
  readServedUser,
  type ThrowawayUser,
} from '@alkemio/tests-lib';

/** The run's role tokens (seeded once by the project's global setup). */
export const roleTokens = () => inject('secondFactor').tokens;

/** The platform user a bearer token signs in as. */
export const userIdOf = async (bearerToken: string): Promise<string> => {
  const me = await readServedUser({ bearerToken });
  const id = me.body.data?.me.user?.id;
  if (!id) {
    throw new Error(`second-factor: a role token is served as no user: ${me.raw}`);
  }
  return id;
};

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
