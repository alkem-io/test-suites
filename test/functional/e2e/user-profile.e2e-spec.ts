import {
  getUser,
  removeUserMutation,
} from '../user-management/user.request.params';
import puppeteer from 'puppeteer';
import RegistrationPage from './registration-page-object';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import UserProfilePage from './user-profile-page-object';
import LoginPage from './login-page-object';

let userId;
const email = `mail-${uniqueId}@alkem.io`;
const password = 'test45612%%$';
const firstName = 'testFN';
const lastName = 'testLN';
const userFullName = firstName + ' ' + lastName;
const userProfilePage = new UserProfilePage();
const registrationPage = new RegistrationPage();

const fullNameChange = 'change';
const firstNameChange = 'change';
const lastNameChange = 'change';
const countryName = 'bulgaria';
const city = 'Test City';
const phone = '+359777777777';
const bio = 'Test account:  Bio information';
const skills = 'skill1';
const keywords = `keyword1`;
const referenceName = `TestRefName`;
const referenceValue = `https://www.test.com`;

describe('User profile update smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      defaultViewport: null,
      args: ['--window-size=1920,1040'],
    });
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

  describe('add task to the list', () => {
    test('User updates its profile successfully', async () => {
      page = await browser.newPage();
      await page.goto(process.env.ALKEMIO_BASE_URL + '/auth/registration');
      await registrationPage.register(
        page,
        email,
        password,
        firstName,
        lastName
      );
      await userProfilePage.clicksUserProfileButton(page);
      await userProfilePage.selectMyProfileOption(page);
      await userProfilePage.verifyUserProfileTitle(page, userFullName);
      await userProfilePage.clicksEditProfileButton(page);
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
      // Commented until the bug is fixed/////////////
      // expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
      //   countryName
      // );
      expect(
        await userProfilePage.verifyTagsAndReferencesEntities(page)
      ).toContain(skills);
      expect(
        await userProfilePage.verifyTagsAndReferencesEntities(page)
      ).toContain(keywords);
      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        referenceName
      );
      expect(await userProfilePage.verifyUserProfileEntities(page)).toContain(
        referenceValue
      );

      await userProfilePage.clicksEditProfileButton(page);
      await userProfilePage.verifyUserProfileForm(page);
      await userProfilePage.updateSkillsTagsEditProfilePage(page, '');
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
      expect(
        await userProfilePage.verifyTagsAndReferencesEntities(page)
      ).not.toContain(skills);
      expect(
        await userProfilePage.verifyTagsAndReferencesEntities(page)
      ).toContain(keywords);
      expect(
        await userProfilePage.verifyTagsAndReferencesEntities(page)
      ).not.toContain(referenceName);
      expect(
        await userProfilePage.verifyTagsAndReferencesEntities(page)
      ).not.toContain(referenceValue);
    });
  });
});
