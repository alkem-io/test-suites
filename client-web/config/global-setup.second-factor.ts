import { clearAddressCounters } from '@alkemio/tests-lib';

/**
 * globalSetup for the second-factor runner. A successful sign-in no longer
 * clears its address's counter at the login proxy, so the run starts by
 * clearing the counters before any identity is provisioned or token minted;
 * every spec clears them again in its own `beforeEach`.
 */
export default async function globalSetup() {
  await clearAddressCounters();
}
