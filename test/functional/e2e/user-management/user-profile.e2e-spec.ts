import puppeteer from 'puppeteer';
import UserProfilePage from './user-profile-page-object';
import {
  getUser,
  removeUserMutation,
} from '@test/functional/user-management/user.request.params';
import LoginPage from '../authentication/login-page-object';

let userId;
const firstName = 'Qa';
const lastName = 'User';
const userFullName = firstName + ' ' + lastName;
const userProfilePage = new UserProfilePage();
const loginPage = new LoginPage();

const fullNameChange = 'change';
const firstNameChange = 'change';
const lastNameChange = 'change';
const countryName = 'Bulgaria';
const city = 'Test City';
const phone = '+359777777777';
const bio = 'Test account:  Bio information';
const skills = 'skill1';
const keywords = `keyword1`;
const referenceName = `TestRefName`;
const referenceValue = `https://www.test.com`;

const email = 'qa.user@alkem.io';
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';

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
    await page.goto(process.env.ALKEMIO_BASE_URL + '/auth/login');
    await loginPage.login(page, email, password);
    await userProfilePage.clicksUserProfileButton(page);
    await userProfilePage.selectMyProfileOption(page);
    await userProfilePage.clicksEditProfileButton(page);
    await userProfilePage.verifyUserProfileForm(page);
  });

  afterEach(async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  });

  afterAll(async () => {
    const requestUserData = await getUser(email);
    userId = requestUserData.body.data.user.id;
    await removeUserMutation(userId);
    await browser.close();
  });

  describe('User profile', () => {
    test('User updates its profile successfully', async () => {
      await userProfilePage.verifyUserProfileForm(page);
      await userProfilePage.updateUserProfileFields(
        page,
        fullNameChange,
        firstNameChange,
        lastNameChange,
        countryName,
        city,
        phone,
        bio
      );
      await userProfilePage.updateSkillsTagsEditProfilePage(page, skills);
      await userProfilePage.updateKeywordsTagsEditProfilePage(page, keywords);
      await userProfilePage.addReferenceEditProfilePage(
        page,
        referenceName,
        referenceValue
      );
      await userProfilePage.saveChangesPofilePage(page);
      await userProfilePage.closeSuccessMessageProfilePage(page);
      await userProfilePage.closeEditProfilePage(page);
      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        email
      );
      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        bio
      );
      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        phone
      );
      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        countryName
      );
      expect(await userProfilePage.verifyTagsEntities(page)).toContain(skills);
      expect(await userProfilePage.verifyTagsEntities(page)).toContain(
        keywords
      );
      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        referenceName
      );
      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        referenceValue
      );
    });

    test('User removes its reference successfully', async () => {
      await userProfilePage.removeReferenceEditProfilePage(page);
      await userProfilePage.saveChangesPofilePage(page);
      await userProfilePage.closeSuccessMessageProfilePage(page);
      await userProfilePage.closeEditProfilePage(page);

      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        email
      );
      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        bio
      );
      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        phone
      );
      expect(await userProfilePage.verifyTagsEntities(page)).toContain(skills);
      expect(await userProfilePage.verifyTagsEntities(page)).toContain(
        keywords
      );
      expect(
        await userProfilePage.verifyUserProfileEntities(page)
      ).not.toContain(referenceName);
      expect(
        await userProfilePage.verifyUserProfileEntities(page)
      ).not.toContain(referenceValue);
    });

    test('User removes its tagset successfully', async () => {
      await userProfilePage.updateSkillsTagsEditProfilePage(page, '');
      await userProfilePage.saveChangesPofilePage(page);
      await userProfilePage.closeSuccessMessageProfilePage(page);
      await userProfilePage.closeEditProfilePage(page);

      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        email
      );
      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        bio
      );
      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        phone
      );
      expect(await userProfilePage.verifyTagsEntities(page)).not.toContain(
        skills
      );
      expect(await userProfilePage.verifyTagsEntities(page)).toContain(
        keywords
      );
      expect(
        await userProfilePage.verifyUserProfileEntities(page)
      ).not.toContain(referenceName);
      expect(
        await userProfilePage.verifyUserProfileEntities(page)
      ).not.toContain(referenceValue);
    });
  });
});
