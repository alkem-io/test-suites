import puppeteer from 'puppeteer';
import UserProfilePage from './user-profile-page-object';
import LoginPage from '../authentication/login-page-object';
import { removeUserMutation } from '@test/functional-api/user-management/user.request.params';
import {
  acceptCookies,
  waitForLoadingIndicatorToHide,
} from '@test/utils/ui.test.helper';

const firstName = 'community';
const lastName = 'admin';
const userFullName = firstName + ' ' + lastName;
const userProfilePage = new UserProfilePage();
const loginPage = new LoginPage();

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
let entities: string[] = [
  '',
  '',
  'Email',
  email,
  'Bio',
  bio,
  'Phone',
  phone,
  'Country',
  countryName,
  'City',
  city,
  'skill1',
  skills,
  referenceName,
  referenceValue,
];
let entitiesNoRef: string[] = [
  '',
  '',
  'Email',
  email,
  'Bio',
  bio,
  'Phone',
  phone,
  'Country',
  countryName,
  'City',
  city,
  'skill1',
  skills,
];
let entitiesNoTagAndRef: string[] = [
  '',
  '',
  'Email',
  email,
  'Bio',
  bio,
  'Phone',
  phone,
  'Country',
  countryName,
  'City',
  city,
];

describe('User profile update smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      defaultViewport: null,
      args: ['--window-size=1920,1040'],
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(process.env.ALKEMIO_BASE_URL + '/identity/login');
    await acceptCookies(page);
    await loginPage.login(page, email, password);
    await waitForLoadingIndicatorToHide(page);
    await userProfilePage.clicksUserProfileButton(page);
    await userProfilePage.selectMyProfileOption(page);
    await userProfilePage.verifyUserProfileTitle(page, userFullName);
    await userProfilePage.clicksEditProfileButton(page);
    await userProfilePage.verifyUserProfileForm(page);
  });

  afterEach(async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  });

  afterAll(async () => {
    await removeUserMutation(email);
    await browser.close();
    browser = await puppeteer.launch({});
    page = await browser.newPage();
    await page.goto(process.env.ALKEMIO_BASE_URL + '/identity/login');
    await loginPage.login(page, email, password);
    await browser.close();
  });

  describe('User profile', () => {
    test('User updates its profile successfully', async () => {
      await userProfilePage.verifyUserProfileForm(page);
      await userProfilePage.updateUserProfileFields(
        page,
        userFullName,
        firstNameChange,
        lastNameChange,
        countryName,
        city,
        phone,
        bio
      );
      await userProfilePage.updateSkillsTagsEditProfilePage(page, skills);
      await userProfilePage.addReferenceEditProfilePage(
        page,
        referenceName,
        referenceValue
      );
      await userProfilePage.saveChangesPofilePage(page);
      await userProfilePage.closeSuccessMessageProfilePage(page);
      await userProfilePage.closeEditProfilePage(
        page,
        process.env.ALKEMIO_BASE_URL + '/profile'
      );

      expect(await userProfilePage.getUserProfileEntities(page)).toEqual(
        entities
      );
    });

    // Disabling tests due to existing rasing condition bug:
    // https://app.zenhub.com/workspaces/alkemio-5ecb98b262ebd9f4aec4194c/issues/alkem-io/client-web/909
    test.skip('User removes its reference successfully', async () => {
      await userProfilePage.removeReferenceEditProfilePage(page);
      await userProfilePage.saveChangesPofilePage(page);
      await userProfilePage.closeSuccessMessageProfilePage(page);
      await userProfilePage.closeEditProfilePage(
        page,
        process.env.ALKEMIO_BASE_URL + '/profile'
      );

      expect(await userProfilePage.getUserProfileEntities(page)).toEqual(
        entitiesNoRef
      );
    });

    test.skip('User removes its tagset successfully', async () => {
      await userProfilePage.updateSkillsTagsEditProfilePage(page, '');
      await userProfilePage.saveChangesPofilePage(page);
      await userProfilePage.closeSuccessMessageProfilePage(page);
      await userProfilePage.closeEditProfilePage(
        page,
        process.env.ALKEMIO_BASE_URL + '/profile'
      );

      expect(await userProfilePage.getUserProfileEntities(page)).toEqual(
        entitiesNoTagAndRef
      );
    });
  });
});
