import { UiText } from '@ory/kratos-client';
import {
  LogManager,
  registerInAlkemioOrFail,
  registerInKratosOrFail,
  stringifyConfig,
  testConfiguration,
  TestUser,
  verifyInKratosOrFail,
} from '@alkemio/tests-lib';

export default async function setup() {
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

  // get all user names to register
  // exclude GLOBAL_ADMIN as he already is created and verified
  // and it's used to create the the users
  const userNames = Object.values(TestUser).filter(
    x => x !== TestUser.GLOBAL_ADMIN
  );
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

  // Return a teardown function so Vitest can ensure a clean exit.
  // The GraphQL client is stateless HTTP and WebSocket subscriptions are
  // terminated in per-file afterAll hooks, so no global cleanup is needed.
  return () => {
    LogManager.getLogger().info('Global teardown complete');
  };
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorMessages = e.response?.data.ui.messages as UiText[];
    const errorMessage =
      errorMessages.map(x => x.text).join('\n') ?? 'Unknown error';
    const userExists =
      errorMessages.filter((x: { id: number }) => x.id === 4000007).length > 0;

    if (userExists) {
      LogManager.getLogger().warn(`User ${email} already registered in Kratos`);
    } else {
      throw new Error(errorMessage);
    }
  }

  await verifyInKratosOrFail(email);
  LogManager.getLogger().info(`User ${email} verified`);
  try {
    await registerInAlkemioOrFail(firstName, lastName, email);
    LogManager.getLogger().info(`User ${email} registered in Alkemio`);
  } catch (e) {
    const err = e as Error;
    if (err.message.indexOf('already registered') > -1) {
      LogManager.getLogger().warn(
        `User ${email} already registered in Alkemio`
      );
    } else {
      throw new Error(err.message);
    }
  }
};
