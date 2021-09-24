import puppeteer from 'puppeteer';
import UserProfilePage, {
  userProfilePendingApplicationName,
} from './user-profile-page-object';
import {
  createTestEcoverse,
  removeEcoverseMutation,
} from '@test/functional-api/integration/ecoverse/ecoverse.request.params';
import {
  createOrganizationMutation,
  organizationName,
  hostNameId,
  deleteOrganizationMutation,
} from '@test/functional-api/integration/organization/organization.request.params';
import EcoversePage from '../ecoverse/ecoverse-page-object';
import { uniqueId } from '@test/utils/mutations/create-mutation';

import {
  getUser,
  removeUserMutation,
} from '@test/functional-api/user-management/user.request.params';
import RegistrationPage from '../identity-flows/registration-page-object';
import VerifyPage from '../identity-flows/verify-page-object';
import { successMessageSignUp } from '../common/messages-list';
import {
  goToUrlWait,
  verifyElementDoesNotExistOnPage,
  verifyElementExistOnPage,
} from '@test/utils/ui.test.helper';
import { baseUrl, urlIdentityRegistration } from '../common/url-list';

export const ecoverseNameId = 'econameid' + uniqueId;
let ecoverseName = 'testEcoverse' + uniqueId;
let ecoverseId = '';
let organizationId = '';
let userId = '';
const answerOne = 'answerOne';
const answerTwo = 'answerTwo';
const answerThree = 'answerThree';
const answerFour = 'answerFour';
const answerFive = 'answerFive';
const initPassword = 'test45612%%$';
const firstName = 'testFN';
const lastName = 'testLN';
let regEmail = `regMail-${uniqueId}@alkem.io`;

describe('User profile update smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      //headless: false,
      // slowMo: 10,
      defaultViewport: null,
      args: ['--window-size=1920,1080'],
    });

    const responseOrg = await createOrganizationMutation(
      organizationName,
      hostNameId
    );
    organizationId = responseOrg.body.data.createOrganization.id;
    let responseEco = await createTestEcoverse(
      ecoverseName,
      ecoverseNameId,
      organizationId
    );
    ecoverseId = responseEco.body.data.createEcoverse.id;

    page = await browser.newPage();
    await goToUrlWait(page, urlIdentityRegistration);
    await RegistrationPage.register(
      page,
      regEmail,
      initPassword,
      firstName,
      lastName
    );
    expect(await VerifyPage.getVerifyPageSuccessTitle(page)).toEqual(
      successMessageSignUp
    );
  });

  afterEach(async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  });

  afterAll(async () => {
    await browser.close();
    await removeEcoverseMutation(ecoverseId);
    await deleteOrganizationMutation(organizationId);
    const requestUserData = await getUser(regEmail);
    userId = requestUserData.body.data.user.id;
    await removeUserMutation(regEmail);
  });

  describe('User application', () => {
    test('User create application to ecoverse successfully', async () => {
      // Arrange
      await goToUrlWait(page, baseUrl + `/${ecoverseNameId}`);

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
      expect(
        await verifyElementExistOnPage(page, userProfilePendingApplicationName)
      ).toBeTruthy();
      expect(
        await UserProfilePage.getUserProfilePendingApplications(page)
      ).toEqual(`${ecoverseName} new`);

      // Act
      await UserProfilePage.clicksDeleteApplicationButton(page);

      // Assert
      expect(
        await verifyElementDoesNotExistOnPage(
          page,
          userProfilePendingApplicationName
        )
      ).toBeTruthy();
    });
  });
});
