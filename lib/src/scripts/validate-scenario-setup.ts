/* eslint-disable @typescript-eslint/no-explicit-any */
// This is critical to be able to use TypeScript aliases in Jest tests
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('tsconfig-paths/register');
import { TestScenarioFactory } from '../scenario/TestScenarioFactory';
import { TestScenarioConfig } from '../scenario/config/test-scenario-config';
import { registerInAlkemioOrFail } from '@src/scenario/registration/register-in-alkemio-or-fail';
import { UiText } from '@ory/kratos-client';
import { registerInKratosOrFail } from '@src/scenario/registration/register-in-kratos-or-fail';
import { verifyInKratosOrFail } from '@src/scenario/registration/verify-in-kratos-or-fail';
import { LogManager } from '@src/scenario/LogManager';
import { TestUser } from '@src/common/enums/test.user';

const scenarioConfig: TestScenarioConfig = {
  name: 'organization-settings',
  space: {},
};

const main = async () => {

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

  const baseScenario =
    await TestScenarioFactory.createBaseScenario(scenarioConfig);
  LogManager.getLogger().info(
    `Base scenario: ${JSON.stringify(baseScenario, null, 2)}`
  );
};

const getUserName = (userName: string): [string, string] => {
  const [first, last] = userName.split('.');
  return [first, last];
};

const userRegisterFlow = async (userName: string) => {
  const [firstName, lastName] = getUserName(userName);
  const email = `${userName}@alkem.io`;
  try {
    await registerInKratosOrFail(firstName, lastName, email);

    LogManager.getLogger().info(`User ${email} registered in Kratos`);
  } catch (e: any) {
    const errorMessages = (e as any).response?.data.ui.messages as UiText[];
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

try {
  main();
} catch (error) {
  LogManager.getLogger().error(error);
}
