import {
  clearInput,
  reloadPage,
  verifyElementExistOnPage,
  verifyUserIsOnPageByJoinTextElements,
  waitForLoadingIndicatorToHide,
} from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';
import { userProfileButton } from '../authentication/login-page-object';

const userProfileOption =
  '.MuiBox-root:nth-child(2) button .MuiButton-label span';
const userProfilePageName = 'h2 span';
const editProfileButton = 'div span button[aria-label="Edit"]';
const userProfileFormTitle = 'form h2 span';
const fullNameField = 'input[name="displayName"]';
const firstNameField = 'input[name="firstName"]';
const lastNameField = 'input[name="lastName"]';
const cityField = 'input[name="city"]';
const phoneField = 'input[name="phone"]';
const bioField = 'textarea[name="bio"]';
const skillsField = 'input[placeholder="Communication, Blockchain"]';
const keywordsField = 'input[placeholder="Innovation, AI, Technology"]';
const genderMenu = 'div.MuiSelect-select';
const countryDropdown = 'div.MuiOutlinedInput-adornedEnd';
const countryDropdownMenuSearch = 'div.MuiOutlinedInput-adornedEnd input';
const countryDropdownMenuFirstOption = '.MuiAutocomplete-popper';
const saveButtonUpdateProfilePage = 'button[type="submit"]';
const closeButtonUpdateProfilePage = `.MuiGrid-justify-content-xs-flex-end .MuiGrid-item button[type="button"] span`;
const successMessage = '.MuiAlert-message';
const closeSuccessMessage = 'button[aria-label="Close"] span svg';
const addReferenceButton = '[title="Add a reference"] button';
const referenceName = 'input[name="references.0.name"]';
const referenceValue = 'input[name="references.0.uri"]';
const removeReferenceButton = 'button[title="Remove the reference"]';
const userProilePageEntities = '.ct-card-body div div span';
const spinner = '.spinner-grow';
const userProfilePendingApplications =
  'div:nth-child(3).MuiBox-root  .ct-card-body div:nth-child(2 ) span span';
const deleteApplicationButton =
  'div:nth-child(3).MuiBox-root  .ct-card-body button';
const userProfilePopup = 'div.MuiPopover-paper .MuiBox-root';

export default class UserProfilePage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  async verifyUserProfileTitle(page: puppeteer.Page, username: string) {
    await waitForLoadingIndicatorToHide(page);
    await page.waitForSelector(userProfilePageName, {
      visible: true,
      hidden: false,
    });
    const usernameHeader = await verifyUserIsOnPageByJoinTextElements(
      page,
      userProfilePageName
    );

    if (usernameHeader !== username) {
      throw new Error('The user name is incorrect!');
    }
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

  async getUserProfilePendingApplications(page: puppeteer.Page) {
    await page.waitForSelector(userProfilePendingApplications, {
      hidden: false,
    });
    return await verifyUserIsOnPageByJoinTextElements(
      page,
      userProfilePendingApplications
    );
  }

  async verifyUserProfileForm(page: puppeteer.Page) {
    await page.waitForSelector(userProfileFormTitle, { visible: true });
  }

  async arePendingApplicationsVisible(page: puppeteer.Page) {
    return await verifyElementExistOnPage(page, userProfilePendingApplications);
  }

  async clicksDeleteApplicationButton(page: puppeteer.Page) {
    await page.waitForSelector(deleteApplicationButton);
    await page.click(deleteApplicationButton);
    await page.waitForSelector(deleteApplicationButton, { hidden: true });
  }

  async clicksUserProfileButton(page: puppeteer.Page) {
    await page.waitForSelector(userProfileButton, { hidden: false });
    await page.click(userProfileButton);
    await page.waitForSelector(userProfilePopup, {
      visible: true,
      hidden: false,
    });
  }

  async selectMyProfileOption(page: puppeteer.Page) {
    await page.waitForSelector(userProfileOption, {
      visible: true,
      timeout: 5000,
    });
    await page.click(userProfileOption);
    await page.waitForSelector(userProfilePopup, {
      visible: false,
      hidden: true,
    });
  }

  async clicksEditProfileButton(page: puppeteer.Page) {
    await page.waitForSelector(editProfileButton);
    await page.focus(editProfileButton);
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
    await reloadPage(page);
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
