import { UiText } from '@ory/kratos-client';
import { registerInKratosOrFail } from './register-in-kratos-or-fail';
import { verifyInKratosOrFail } from './verify-in-kratos-or-fail';
import { TestUser } from '../../common/enums/test.user';

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
 */
export const registerTestUser = async (userName: string): Promise<void> => {
  const [firstName, lastName] = parseUserName(userName);
  const email = `${userName}@alkem.io`;
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
 * Registers all predefined test users sequentially.
 *
 * Sequential execution is required — parallel registration causes Kratos
 * flow override errors.
 */
export const registerAllTestUsers = async (): Promise<void> => {
  const userNames = Object.values(TestUser);

  for (const username of userNames) {
    try {
      await registerTestUser(username);
    } catch (error) {
      console.error(`Unable to register user ${username}: ${error}`);
    }
  }

  // workspace#027-platform-role-redesign (Slice A, T004): single-role
  // fixture role seeding (`grantSingleRoleFixtures`) is called from
  // `globalTestsSetup.ts` AFTER both provisioning branches (this one and
  // `provisionTestIdentities`), not here — qual-ts-2 (2026-07-30 fix wave):
  // calling it only from this function left the CI `provisionTestIdentities`
  // branch with single-role fixtures holding NO platform role at all, so
  // every ALLOW cell failed and every denial assertion passed vacuously.
};
