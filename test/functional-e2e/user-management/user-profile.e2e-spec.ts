import puppeteer from 'puppeteer';
import UserProfilePage, { profilePageAvatar } from './user-profile-page-object';
import LoginPage from '../authentication/login-page-object';
import {
  getUser,
  removeUserMutation,
} from '@test/functional-api/user-management/user.request.params';
import {
  acceptCookies,
  clearBrowserCookies,
  goToUrlWait,
  loading,
  reloadPage,
  verifyElementExistOnPage,
} from '@test/utils/ui.test.helper';
import { urlIdentityLogin } from '../common/url-list';

const firstName = 'community';
const lastName = 'admin';
const userFullName = firstName + ' ' + lastName;
const firstNameChange = 'change';
const lastNameChange = 'change';
const countryName = 'Bulgaria';
const city = 'Test City';
const phone = '+359777777777';
const bio = 'Test account:  Bio information';
const skills = 'skill1';
const referenceName = `TestRefName`;
const referenceValue = `https://www.test.com`;
const email = 'community.admin@alkem.io';
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';

let entities = ` Email ${email} Bio ${bio} Phone ${phone} Country ${countryName} City ${city} ${skills} ${referenceName} ${referenceValue}`;
let entitiesNoRef = ` Email ${email} Bio ${bio} Phone ${phone} Country ${countryName} City ${city} ${skills}`;
let entitiesNoTagAndRef = ` Email ${email} Bio ${bio} Phone ${phone} Country ${countryName} City ${city}`;
describe('User profile update smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      slowMo: 10,
      defaultViewport: null,
      args: ['--window-size=1920,1040'],
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await clearBrowserCookies(page);
    await goToUrlWait(page, urlIdentityLogin);
    await acceptCookies(page);
    await LoginPage.login(page, email, password);
    await UserProfilePage.clicksUserProfileButton(page);
    await UserProfilePage.selectMyProfileOption(page);
    await loading(page);
    await reloadPage(page);
    await verifyElementExistOnPage(page, profilePageAvatar);
    await UserProfilePage.clicksEditProfileButton(page);
    await UserProfilePage.verifyUserProfileForm(page);
  });

  afterAll(async () => {
    await browser.close();
    const requestUserData = await getUser(email);
    const userId = requestUserData.body.data.user.id;
    await removeUserMutation(userId);
  });

  describe('User profile', () => {
    test('User updates its profile successfully', async () => {
      await UserProfilePage.verifyUserProfileForm(page);
      await UserProfilePage.updateUserProfileFields(
        page,
        userFullName,
        firstNameChange,
        lastNameChange,
        countryName,
        city,
        phone,
        bio
      );
      await UserProfilePage.updateSkillsTagsEditProfilePage(page, skills);
      await UserProfilePage.addReferenceEditProfilePage(
        page,
        referenceName,
        referenceValue
      );
      await UserProfilePage.saveChangesPofilePage(page);
      await UserProfilePage.closeSuccessMessageProfilePage(page);
      await UserProfilePage.closeEditProfilePage(page);

      expect(await UserProfilePage.getUserProfileEntities(page)).toEqual(
        entities
      );
    });

    test('User removes its reference successfully', async () => {
      await UserProfilePage.removeReferenceEditProfilePage(page);
      await UserProfilePage.saveChangesPofilePage(page);
      await UserProfilePage.closeSuccessMessageProfilePage(page);
      await UserProfilePage.closeEditProfilePage(page);

      expect(await UserProfilePage.getUserProfileEntities(page)).toEqual(
        entitiesNoRef
      );
    });

    test.skip('User removes its tagset successfully', async () => {
      await UserProfilePage.updateSkillsTagsEditProfilePage(page, '');
      await UserProfilePage.saveChangesPofilePage(page);
      await UserProfilePage.closeSuccessMessageProfilePage(page);
      await UserProfilePage.closeEditProfilePage(page);

      expect(await UserProfilePage.getUserProfileEntities(page)).toEqual(
        entitiesNoTagAndRef
      );
    });
  });
});
