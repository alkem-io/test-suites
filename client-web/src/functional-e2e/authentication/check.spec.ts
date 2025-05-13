import { test } from '@playwright/test';
import { navigateToRegistrationFromSignUp } from './login-page-objects';
import { verifyRegistrationPageElements } from '../identity-flows/registration-page-objects';
import {
  deleteMailSlurperMails,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { testConfiguration } from '@src/config/test.configuration';
//import { testConfiguration } from '@src/config/test.configuration';
//import { TestScenarioNoPreCreationConfig } from '@alkemio/tests-lib/dist/scenario/config/test-scenario-config';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
const baseUrl = testConfiguration.endPoints.server + '/home'; //process.env.ALKEMIO_BASE_URL || '';
const uniqueId = UniqueIDGenerator.getID();

const userEmail = `test+${uniqueId}@alkem.io`;
const newPassword = password;
//const baseUrl =

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'organization',
};
test.beforeAll(async () => {
  const a = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  console.log('Scenario created:', a);
});

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await deleteMailSlurperMails();
});
test.describe.configure({ mode: 'serial' });

test.only('verify registration page', async ({ page }) => {
  // const a = await createOrganization(
  //   'Test Organization',
  //   'test-organization',
  //   'test-organization'
  // );
  // const orgId = a.data?.createOrganization?.id ?? '';
  // console.log('Organization created:', a);
  await navigateToRegistrationFromSignUp(baseUrl, page);
  await verifyRegistrationPageElements(page);
  //deleteOrganization(a.data?.createOrganization?.id ?? '');
});
