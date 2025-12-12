import { test } from '@playwright/test';
import { verifyRegistrationPageElements } from '../identity-flows/registration-page-objects';
import {
  createOrganization,
  deleteMailSlurperMails,
  TestScenarioConfig,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { testConfiguration } from '@src/config/test.configuration';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { SpacePrivacyMode } from '@alkemio/client-lib';
import { navigateToRegistrationFromSignUpAcceptTermsAndContinue } from './login-page-objects';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
const baseUrl = testConfiguration.endPoints.server + '/home';
const uniqueId = UniqueIDGenerator.getID();

const userEmail = `test+${uniqueId}@alkem.io`;
const newPassword = password;

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'client-test-with-scenario-setup',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Private },
    },
  },
};

test.beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

test.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await deleteMailSlurperMails();
});

test.describe.configure({ mode: 'serial' });

test.skip('Experiment - client test with scenario setup', async ({ page }) => {
  await navigateToRegistrationFromSignUpAcceptTermsAndContinue(baseUrl, page);
  await verifyRegistrationPageElements(page);
});
