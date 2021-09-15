import puppeteer from 'puppeteer';
import UserProfilePage from './user-profile-page-object';
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
import RegistrationPage from '../registration/registration-page-object';
import {
  getUser,
  removeUserMutation,
} from '@test/functional-api/user-management/user.request.params';

export const ecoverseNameId = 'econameid' + uniqueId;
let ecoverseName = 'testEcoverse' + uniqueId;
let ecoverseId = '';
let organisationId = '';
let userId;
const email = `mail-${uniqueId}@alkem.io`;
const firstName = 'testFN';
const lastName = 'testLN';
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
const answerOne = 'answerOne';
const answerTwo = 'answerTwo';
const answerThree = 'answerThree';
const answerFour = 'answerFour';
const answerFive = 'answerFive';

describe('User profile update smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      defaultViewport: null,
      args: ['--window-size=1920,1080'],
    });

    page = await browser.newPage();
    await page.goto(process.env.ALKEMIO_BASE_URL + '/identity/registration', {
      waitUntil: ['networkidle0', 'domcontentloaded'],
    });
    await RegistrationPage.register(page, email, password, firstName, lastName);
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

  afterEach(async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  });

  afterAll(async () => {
    await browser.close();
    await removeEcoverseMutation(ecoverseId);
    await deleteOrganisationMutation(organisationId);
    const requestUserData = await getUser(email);
    userId = requestUserData.body.data.user.id;
    await removeUserMutation(userId);
  });

  describe('User application', () => {
    test.skip('User create application to ecoverse successfully', async () => {
      // Arrange
      await page.goto(process.env.ALKEMIO_BASE_URL + `/${ecoverseNameId}`, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
      });

      // Act
      await EcoversePage.clicksApplyLink(page);
      await EcoversePage.setQuestionsValues(
        page,
        answerOne,
        answerTwo,
        answerThree,
        answerFour,
        answerFive
      );
      await EcoversePage.clicksApplyButton(page);

      // Assert
      expect(
        await EcoversePage.verifyApplicationConfirmationPage(page)
      ).toEqual(
        `Thank you for completing your application for ${ecoverseName}`
      );

      // Act
      await EcoversePage.clicksApplicationBackButton(page);

      // Assert
      expect(await EcoversePage.verifyApplicationPendingButton(page)).toEqual(
        'Application pending'
      );

      // Act
      await UserProfilePage.clicksUserProfileButton(page);
      await UserProfilePage.selectMyProfileOption(page);

      // Assert
      expect(await UserProfilePage.arePendingApplicationsVisible(page)).toEqual(
        true
      );
      expect(
        await UserProfilePage.getUserProfilePendingApplications(page)
      ).toEqual(`${ecoverseName} new`);

      // Act
      await UserProfilePage.clicksDeleteApplicationButton(page);

      // Assert
      expect(await UserProfilePage.arePendingApplicationsVisible(page)).toEqual(
        false
      );
    });
  });
});
