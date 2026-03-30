import { TestScenarioFactory } from '../scenario/TestScenarioFactory';
import { TestScenarioConfig } from '../scenario/config/test-scenario-config';
import { registerAllTestUsers } from '../scenario/registration/register-test-user';
import { LogManager } from '../scenario/LogManager';

const scenarioConfig: TestScenarioConfig = {
  name: 'organization-settings',
  space: {},
};

const main = async () => {
  await registerAllTestUsers();

  const baseScenario =
    await TestScenarioFactory.createBaseScenario(scenarioConfig);
  LogManager.getLogger().info(
    `Base scenario: ${JSON.stringify(baseScenario, null, 2)}`
  );
};

try {
  main();
} catch (error) {
  LogManager.getLogger().error(error);
}
