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
const selectGenderOptionMale = 'select[name="gender"] option:nth-child(2)';
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
const userProilePageEntities = '.ct-card-body div span';

export default class UserProfilePage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  async verifyUserProfileTitle(page: puppeteer.Page, username: string) {
    const usernameHeader = await page.$eval('h2 span', el =>
      el.textContent?.trim()
    );
    if (usernameHeader !== username) {
      throw console.error(
        'User is not on the page or username is not available!'
      );
    }
    return usernameHeader;
  }
  async verifyUserProfileEntities(page: puppeteer.Page) {
    const text = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.ct-card-body div span'), element =>
        element.textContent?.trimEnd()
      )
    );

    return text;
  }

  async verifyTagsAndReferencesEntities(page: puppeteer.Page) {
    const text = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll('.ct-card-body div span span'),
        element => element.textContent?.trimEnd()
      )
    );

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
    await page.waitForSelector(editProfileButton);
    await page.click(editProfileButton);
  }

  async clicksAddReferenceButton(page: puppeteer.Page) {
    await page.waitForSelector(addReferenceButton);
    await page.click(addReferenceButton);
  }

  async closeEditProfilePage(page: puppeteer.Page) {
    await page.waitForSelector(closeButtonUpdateProfilePage);
    await page.click(closeButtonUpdateProfilePage);
  }

  clearInput = async (page: puppeteer.Page, selector: string) => {
    await page.waitForSelector(selector);
    await page.evaluate(selector => {
      document.querySelector(selector).value = '';
    }, selector);
    await page.waitForSelector(selector);
  };

  async updateSkillsTagsEditProfilePage(page: puppeteer.Page, skills: string) {
    await this.clearInput(page, skillsField);
    await page.type(skillsField, skills);
  }

  async updateKeywordsTagsEditProfilePage(
    page: puppeteer.Page,
    keywords: string
  ) {
    await this.clearInput(page, keywordsField);
    await page.type(keywordsField, keywords);
  }

  async addReferenceEditProfilePage(
    page: puppeteer.Page,
    refName: string,
    refValue: string
  ) {
    await page.click(addReferenceButton);
    await page.waitForSelector(referenceName);
    await this.clearInput(page, referenceName);
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
    await page.waitForSelector(saveButtonUpdateProfilePage);
    await page.click(saveButtonUpdateProfilePage);
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
    await page.type(fullNameField, fullName);
    await page.type(firstNameField, firstName);
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
    await page.type(cityField, city);
    await page.type(phoneField, phone);
    await page.type(bioField, bio);
  }
}
