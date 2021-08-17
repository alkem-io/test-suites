import puppeteer from 'puppeteer';
import UserProfilePage from './user-profile-page-object';
import LoginPage from '../authentication/login-page-object';
import {
  createTestEcoverse,
  removeEcoverseMutation,
} from '@test/functional-api/integration/ecoverse/ecoverse.request.params';
import {
  createOrganisationMutation,
  organisationName,
  hostNameId,
  deleteOrganisationMutation,
} from '@test/functional-api/integration/organisation/organisation.request.params';
import EcoversePage from '../ecoverse/ecoverse-page-object';
import { uniqueId } from '@test/utils/mutations/create-mutation';

let ecoverseName = 'testEcoverse' + uniqueId;
export let zz = 'test';
export const ecoverseNameId = 'econameid' + uniqueId;
let ecoverseId = '';
let organisationId = '';
const firstName = 'community';
const lastName = 'admin';
const userFullName = firstName + ' ' + lastName;
const userProfilePage = new UserProfilePage();
const loginPage = new LoginPage();
const ecoversePage = new EcoversePage();

const email = 'community.admin@alkem.io';
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
const answerOne = 'answerOne';
const answerTwo = 'answerTwo';
const answerThree = 'answerThree';
const answerFour = 'answerFour';

describe('User profile update smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      defaultViewport: null,
      args: ['--window-size=1920,1080'],
    });

    const responseOrg = await createOrganisationMutation(
      organisationName,
      hostNameId
    );
    organisationId = responseOrg.body.data.createOrganisation.id;
    let responseEco = await createTestEcoverse(
      ecoverseName,
      ecoverseNameId,
      organisationId
    );
    ecoverseId = responseEco.body.data.createEcoverse.id;
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(process.env.ALKEMIO_BASE_URL + '/identity/login');
    await loginPage.login(page, email, password);
  });

  afterEach(async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  });

  afterAll(async () => {
    await browser.close();
    await removeEcoverseMutation(ecoverseId);
    await deleteOrganisationMutation(organisationId);
  });

  describe('User application', () => {
    test('User create application to ecoverse successfully', async () => {
      // Arrange
      await page.goto(process.env.ALKEMIO_BASE_URL + `/${ecoverseNameId}`);

      // Act
      await ecoversePage.clicksApplyLink(page);
      await ecoversePage.setQuestionsValues(
        page,
        answerOne,
        answerTwo,
        answerThree,
        answerFour
      );
      await ecoversePage.clicksApplyButton(page);

      // Assert
      expect(
        await ecoversePage.verifyApplicationConfirmationPage(page)
      ).toEqual(
        `Thank you for completing your application for ${ecoverseName}`
      );

      // Act
      await ecoversePage.clicksApplicationBackButton(page);

      // Assert
      expect(await ecoversePage.verifyApplicationPendingButton(page)).toEqual(
        'Application pending'
      );

      // Act
      await userProfilePage.clicksUserProfileButton(page);
      await userProfilePage.selectMyProfileOption(page);

      // Assert
      expect(await userProfilePage.arePendingApplicationsVisible(page)).toEqual(
        true
      );
      expect(
        await userProfilePage.getUserProfilePendingApplications(page)
      ).toEqual(`${ecoverseName} new`);

      // Act
      await userProfilePage.clicksDeleteApplicationButton(page);

      // Assert
      expect(await userProfilePage.arePendingApplicationsVisible(page)).toEqual(
        false
      );
    });
  });
});
