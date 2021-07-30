import { clearInput } from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';

const userProfileButton = '.col span';
const userProfileOption = '.popover .MuiBox-root:nth-child(2) button';
const userProfilePageName = 'h2 span';
const editProfileButton = '.d-flex .align-items-end svg';
const userProfileFormTitle = 'form h2 span';
const fullNameField = 'input[name="displayName"]';
const firstNameField = 'input[name="firstName"]';
const lastNameField = 'input[name="lastName"]';
const cityField = 'input[name="city"]';
const phoneField = 'input[name="phone"]';
const bioField = 'textarea[name="bio"]';
const skillsField = 'input[placeholder="Communication, Blockchain"]';
const keywordsField = 'input[placeholder="Innovation, AI, Technology"]';
const genderMenu = 'select[name="gender"]';
const countryDropdown = '.dropdown button';
const countryDropdownMenuSearch = '.dropdown-menu input';
const countryDropdownMenuFirstOption = '.dropdown-menu a';
const saveButtonUpdateProfilePage = 'button[type="submit"]';
const closeButtonUpdateProfilePage = `.d-flex.mt-4 button[type="button"]`;
const successMessage = '.toast-header .text-success';
const closeSuccessMessage = '.toast-header .close span:nth-child(1)';
const addReferenceButton = '.flex-row-reverse button';
const referenceName = 'input[name="references.0.name"]';
const referenceValue = 'input[name="references.0.uri"]';
const removeReferenceButton = '.align-items-end button';
const userProilePageEntities = '.ct-card-body div div span';
const spinner = '.spinner-grow';

export default class UserProfilePage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  async verifyUserProfileTitle(page: puppeteer.Page, username: string) {
    await page.waitForSelector(userProfilePageName);
    const usernameHeader = await page.$eval(userProfilePageName, element =>
      element.textContent?.trim()
    );

    if (usernameHeader !== username) {
      throw new Error('The user name is incorrect!');
    }
    return usernameHeader;
  }

  async getUserProfileEntities(page: puppeteer.Page) {
    await page.waitForSelector(userProilePageEntities, { hidden: false });

    const text = await page.$$eval(userProilePageEntities, element => {
      return element.map(element => element.textContent?.trim());
    });

    if (!text) {
      throw new Error(`No such user profile entity is available: ${text}`);
    }

    return text;
  }

  async verifyUserProfileForm(page: puppeteer.Page) {
    await page.waitForSelector(userProfileFormTitle, { visible: true });
  }

  async clicksUserProfileButton(page: puppeteer.Page) {
    await page.waitForSelector(userProfileButton);
    await page.click(userProfileButton);
  }

  async selectMyProfileOption(page: puppeteer.Page) {
    await page.waitForSelector(userProfileOption);
    await page.click(userProfileOption);
  }

  async clicksEditProfileButton(page: puppeteer.Page) {
    await page.waitForSelector(editProfileButton, { visible: true });
    await page.click(editProfileButton);
  }

  async clicksAddReferenceButton(page: puppeteer.Page) {
    await page.waitForSelector(addReferenceButton);
    await page.click(addReferenceButton);
  }

  async closeEditProfilePage(page: puppeteer.Page, pageUrl: string) {
    await page.waitForSelector(closeButtonUpdateProfilePage, { hidden: false });
    await page.click(closeButtonUpdateProfilePage);
    await page.waitForSelector(closeButtonUpdateProfilePage, { hidden: true });
    await page.waitForSelector(spinner, { hidden: true });
    let url = page.url();
    if (url !== pageUrl) {
      throw new Error('Url is not correct!');
    }
    await page.waitForSelector(editProfileButton, { visible: true });
  }

  async updateSkillsTagsEditProfilePage(page: puppeteer.Page, skills: string) {
    await clearInput(page, skillsField);
    await page.type(skillsField, skills);
  }

  async updateKeywordsTagsEditProfilePage(
    page: puppeteer.Page,
    keywords: string
  ) {
    await clearInput(page, keywordsField);
    await page.type(keywordsField, keywords);
  }

  async addReferenceEditProfilePage(
    page: puppeteer.Page,
    refName: string,
    refValue: string
  ) {
    await page.click(addReferenceButton);
    await page.waitForSelector(referenceName);
    await clearInput(page, referenceName);
    await page.type(referenceName, refName);
    await page.type(referenceValue, refValue);
  }

  async removeReferenceEditProfilePage(page: puppeteer.Page) {
    await page.waitForSelector(removeReferenceButton);
    await page.click(removeReferenceButton);
    await page.waitForSelector(removeReferenceButton, { hidden: true });
  }

  async closeSuccessMessageProfilePage(page: puppeteer.Page) {
    await page.waitForSelector(successMessage);
    await page.click(closeSuccessMessage);
    await page.waitForSelector(successMessage, { hidden: true });
  }

  async saveChangesPofilePage(page: puppeteer.Page) {
    await page.waitForSelector(saveButtonUpdateProfilePage, { visible: true });
    await page.click(saveButtonUpdateProfilePage);
    await page.waitForSelector(saveButtonUpdateProfilePage, { hidden: true });
    await page.waitForSelector(saveButtonUpdateProfilePage, { hidden: false });
    await page.waitForSelector(successMessage);
  }

  async updateUserProfileFields(
    page: puppeteer.Page,
    fullName: string,
    firstName: string,
    lastName: string,
    countryName: string,
    city: string,
    phone: string,
    bio: string
  ) {
    await clearInput(page, fullNameField);
    await page.type(fullNameField, fullName);
    await clearInput(page, firstNameField);
    await page.type(firstNameField, firstName);
    await clearInput(page, lastNameField);
    await page.type(lastNameField, lastName);
    await page.click(genderMenu);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.click(countryDropdown);
    await page.waitForSelector(countryDropdownMenuSearch);
    await page.type(countryDropdownMenuSearch, countryName);
    await page.waitForSelector(countryDropdownMenuFirstOption);
    await page.click(countryDropdownMenuFirstOption);
    await page.waitForSelector(countryDropdown);
    await page.waitForSelector(cityField);
    await clearInput(page, cityField);
    await page.type(cityField, city);
    await clearInput(page, phoneField);
    await page.type(phoneField, phone);
    await clearInput(page, bioField);
    await page.type(bioField, bio);
  }
}
