import { UiText } from '@ory/kratos-client';
import {
  LogManager,
  registerInKratosOrFail,
  stringifyConfig,
  testConfiguration,
  TestUser,
  verifyInKratosOrFail,
} from '@alkemio/tests-lib';

export default async function setup() {
  console.log('[globalSetup] Starting global test setup...');

  // Guard against duplicate invocations when Vitest projects inherit
  // globalSetup from root config via extends: true (array merge semantics).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((globalThis as any).__alkemioGlobalSetupDone) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__alkemioGlobalSetupDone = true;

  LogManager.getLogger().info(
    `\nLaunching tests using configuration: ${stringifyConfig(testConfiguration)}`
  );

  if (!testConfiguration.registerUsers) return;

  // Register all users including GLOBAL_ADMIN (which may not exist after a
  // full DB wipe). The catch block below handles "user already exists" (4000007)
  // gracefully, so re-registering an existing admin is safe.
  const userNames = Object.values(TestUser);
  // running register flows in parallel brings 3x less waiting times
  // NOTE: may require limit on amount of flows run in parallel

  //DO NOT MAKE THIS PARALLEL AS NEW FLOW TRIES TO OVERRIDE OLD FLOWS RESULTING IN ERRORS
  for (const username of userNames) {
    try {
      await userRegisterFlow(username);
    } catch (error) {
      LogManager.getLogger().error(
        `Unable to register user ${username}: ${error}`
      );
    }
  }
}

const getUserName = (userName: string): [string, string] => {
  const parts = userName.split('.');
  const first = parts[0];
  const last = parts.length > 1 ? parts[1] : first;
  return [first, last];
};

export const userRegisterFlow = async (userName: string) => {
  const [firstName, lastName] = getUserName(userName);
  const email = `${userName}@alkem.io`;
  let needsVerification = true;

  try {
    await registerInKratosOrFail(firstName, lastName, email);
    console.error(`[registration] ${email} registered`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const errorMessages = e.response?.data?.ui?.messages as
      | UiText[]
      | undefined;
    if (!errorMessages?.length) {
      // Log the full response for debugging non-UI errors
      console.error(
        `[registration] ${email} failed — status: ${e.response?.status}, ` +
        `body: ${JSON.stringify(e.response?.data ?? 'no response body')}`
      );
      throw new Error(
        `Registration failed for ${email}: ${e.message ?? e}`
      );
    }

    const userExists = errorMessages.some(
      (x: { id: number }) => x.id === 4000007
    );

    if (userExists) {
      console.error(`[registration] ${email} already exists — skipping`);
      needsVerification = false;
    } else {
      const errorMessage = errorMessages.map(x => x.text).join('\n');
      throw new Error(errorMessage);
    }
  }

  if (needsVerification) {
    try {
      await verifyInKratosOrFail(email);
      console.error(`[verification] ${email} verified`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // Verification is best-effort: it depends on Kratos SMTP routing
      // emails to mail slurper, which may not be configured.
      // If Kratos doesn't enforce verification for login, tests still pass.
      console.error(
        `[verification] ${email} failed (non-fatal) — ${e.message ?? e}`
      );
    }
  }
};
