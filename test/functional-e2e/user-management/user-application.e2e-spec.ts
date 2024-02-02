import puppeteer from 'puppeteer';
import UserProfilePage, {
  userProfileAppDialogCreateDate,
  userProfileApplicationsDialogButtonClose,
  userProfileInfoDialog,
  userProfilePendingApplicationName,
} from './user-profile-page-object';
import {
  createTestSpace,
  deleteSpaceCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import {
  createOrganizationCodegen,
  organizationName,
  hostNameId,
  deleteOrganizationCodegen,
} from '@test/functional-api/organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

import {
  getUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';
import RegistrationPage from '../identity-flows/registration-page-object';
import VerifyPage from '../identity-flows/verify-page-object';
import { successMessageSignUp } from '../common/messages-list';
import {
  clickVisibleElement,
  goToUrlWait,
  verifyElementDoesNotExistOnPage,
  verifyElementExistOnPage,
} from '@test/utils/ui.test.helper';
import { baseUrl, urlIdentityRegistration } from '../common/url-list';
import {
  setSpaceVisibility,
  setSpaceVisibilityVariableData,
} from '@test/utils/mutations/authorization-mutation';
import { mutation } from '@test/utils/graphql.request';
import SpacePage from '../hub/hub-page-object';

export const spaceNameId = 'econameid' + uniqueId;
const spaceName = 'testSpace' + uniqueId;
let spaceId = '';
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
const regEmail = `regMail-${uniqueId}@alkem.io`;

describe('User profile update smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      slowMo: 10,
      defaultViewport: null,
      args: ['--window-size=1920,1080'],
    });

    const responseOrg = await createOrganizationCodegen(
      organizationName,
      hostNameId
    );
    organizationId = responseOrg?.data?.createOrganization.id ?? '';
    const responseEco = await createTestSpace(
      spaceName,
      spaceNameId,
      organizationId
    );
    spaceId = responseEco.body.data.createSpace.id;
    await mutation(
      setSpaceVisibility,
      setSpaceVisibilityVariableData(spaceId, true)
    );

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
    await deleteSpaceCodegen(spaceId);
    await deleteOrganizationCodegen(organizationId);
    const requestUserData = await getUser(regEmail);
    userId = requestUserData.body.data.user.id;
    await removeUser(regEmail);
  });
  // Skipped until updated to correspond the new UI
  describe.skip('User application', () => {
    test('User create application to space successfully', async () => {
      // Arrange
      await goToUrlWait(page, baseUrl + `/${spaceNameId}`);

      // Act
      await SpacePage.clicksApplyLink(page);
      await SpacePage.setQuestionsValues(
        page,
        answerOne,
        answerTwo,
        answerThree,
        answerFour,
        answerFive
      );
      await SpacePage.clicksApplyButton(page);

      // Assert
      expect(await SpacePage.verifyApplicationConfirmationPage(page)).toEqual(
        `Thank you for completing your application for ${spaceName}`
      );

      // Act
      await SpacePage.clicksApplicationBackButton(page);

      // Assert
      expect(await SpacePage.verifyApplicationPendingButton(page)).toEqual(
        'Application pending'
      );

      // Act
      await UserProfilePage.clicksUserProfileButton(page);
      await UserProfilePage.selectMyProfileOption(page);
      await clickVisibleElement(page, userProfileInfoDialog);

      expect(
        await verifyElementExistOnPage(page, userProfileAppDialogCreateDate)
      ).toBeTruthy();

      await clickVisibleElement(page, userProfileApplicationsDialogButtonClose);

      // Assert

      expect(
        await verifyElementExistOnPage(page, userProfilePendingApplicationName)
      ).toBeTruthy();
      expect(
        await UserProfilePage.getUserProfilePendingApplications(page)
      ).toEqual(`${spaceName} Space new`);

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
