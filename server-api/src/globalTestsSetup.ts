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
  const [first, last] = userName.split('.');
  return [first, last];
};

export const userRegisterFlow = async (userName: string) => {
  const [firstName, lastName] = getUserName(userName);
  const email = `${userName}@alkem.io`;
  try {
    await registerInKratosOrFail(firstName, lastName, email);

    LogManager.getLogger().info(`User ${email} registered in Kratos`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    // Guard against network errors where response body is absent
    const errorMessages = e.response?.data?.ui?.messages as
      | UiText[]
      | undefined;
    if (!errorMessages?.length) {
      throw new Error(
        `Registration failed for ${email}: ${e.message ?? e}`
      );
    }

    const errorMessage = errorMessages.map(x => x.text).join('\n');
    const userExists = errorMessages.some(
      (x: { id: number }) => x.id === 4000007
    );

    if (userExists) {
      LogManager.getLogger().warn(`User ${email} already registered in Kratos`);
    } else {
      throw new Error(errorMessage);
    }
  }

  await verifyInKratosOrFail(email);
  LogManager.getLogger().info(`User ${email} verified`);
};
