import { UiText } from '@ory/kratos-client';
import { registerInKratosOrFail } from './register-in-kratos-or-fail';
import { verifyInKratosOrFail } from './verify-in-kratos-or-fail';
import { TestUser } from '../../common/enums/test.user';
import { buildPoolIdentifierEmail } from '../pool-identity';

const parseUserName = (userName: string): [string, string] => {
  const parts = userName.split('.');
  const first = parts[0];
  const last = parts.length > 1 ? parts[1] : first;
  return [first, last];
};

/**
 * Registers a single test user in Kratos and verifies their email via the
 * link method. Alkemio user creation is handled automatically by Kratos hooks.
 *
 * Gracefully handles "user already exists" (Kratos error 4000007).
 * Verification is best-effort — failures are logged but not thrown.
 *
 * `workerIndex` (default 0, today's single shared pool) selects which
 * worker-slot identity gets registered — see `pool-identity.ts`. Name
 * traits stay derived from the role name alone; only the email varies by
 * worker.
 */
export const registerTestUser = async (
  userName: TestUser,
  workerIndex = 0
): Promise<void> => {
  const [firstName, lastName] = parseUserName(userName);
  const email = buildPoolIdentifierEmail(userName, workerIndex);
  let verificationFlowId: string | undefined;

  try {
    const result = await registerInKratosOrFail(firstName, lastName, email);
    verificationFlowId = result.verificationFlowId;
    console.error(`[registration] ${email} registered`);
  } catch (e: unknown) {
    const axiosError = e as {
      response?: { status?: number; data?: { ui?: { messages?: UiText[] } } };
      message?: string;
    };
    const errorMessages = axiosError.response?.data?.ui?.messages;

    if (!errorMessages?.length) {
      console.error(
        `[registration] ${email} failed — status: ${axiosError.response?.status}, ` +
          `body: ${JSON.stringify(axiosError.response?.data ?? 'no response body')}`
      );
      throw new Error(
        `Registration failed for ${email}: ${axiosError.message ?? e}`
      );
    }

    const userExists = errorMessages.some(
      (x: { id: number }) => x.id === 4000007
    );

    if (userExists) {
      console.error(`[registration] ${email} already exists`);
    } else {
      const errorMessage = errorMessages.map(x => x.text).join('\n');
      throw new Error(errorMessage);
    }
  }

  try {
    await verifyInKratosOrFail(email, verificationFlowId);
    console.error(`[verification] ${email} verified`);
  } catch (e: unknown) {
    const err = e as Error;
    console.error(
      `[verification] ${email} failed (non-fatal) — ${err.message ?? e}`
    );
  }
};

/**
 * Registers all predefined test users, for every worker slot 0..workerCount-1,
 * sequentially.
 *
 * Sequential execution is required — parallel registration causes Kratos
 * flow override errors. This is the local-dev fallback path (no Kratos admin
 * API reachable); CI always has admin access and provisions via
 * `provisionTestIdentities` instead, so `workerCount`× more self-service
 * registrations here only slows down a developer's own machine, never CI.
 */
export const registerAllTestUsers = async (workerCount = 1): Promise<void> => {
  const userNames = Object.values(TestUser);

  for (let workerIndex = 0; workerIndex < workerCount; workerIndex++) {
    for (const username of userNames) {
      try {
        await registerTestUser(username, workerIndex);
      } catch (error) {
        console.error(`Unable to register user ${username} (worker ${workerIndex}): ${error}`);
      }
    }
  }
};
