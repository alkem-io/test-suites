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

import * as TestLib from '@alkemio/tests-lib';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
const baseUrl = testConfiguration.endPoints.server + '/home';
const uniqueId = UniqueIDGenerator.getID();

const userEmail = `test+${uniqueId}@alkem.io`;
const newPassword = password;

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'organization-owner',
};

test.beforeAll(async () => {
  // Check if TestScenarioFactory is properly imported
  if (
    !TestLib.TestScenarioFactory ||
    !TestLib.TestScenarioFactory.createBaseScenarioEmpty
  ) {
    console.error('TestScenarioFactory is not properly imported!');
    throw new Error(
      'TestScenarioFactory.createBaseScenarioEmpty is not available'
    );
  }
  await TestLib.TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await deleteMailSlurperMails();
});

test.describe.configure({ mode: 'serial' });

test.only('verify registration page', async ({ page }) => {
  await navigateToRegistrationFromSignUp(baseUrl, page);
  await verifyRegistrationPageElements(page);
});
