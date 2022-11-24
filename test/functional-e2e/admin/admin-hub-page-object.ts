import {
  clickVisibleElement,
  fillVisibleInput,
  loading,
  returnElementText,
  verifyElementDoesNotExistOnPage,
  verifyElementExistOnPage,
} from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';
import {
  alertMessageSuccess,
  firstOptionDropdown,
  menu,
} from '../common/selectors';
import { saveButton } from './admin-page-object';

const authenticatedUserName = '#main div:nth-child(1).reversed span';
const invalidCredentialsMessage = '.MuiGrid-item .MuiAlert-message';
export const signInButtonHome = '.small[href="/identity/login"] span';
export const hubInputName = 'input[name="name"]';
export const hubInputNameId = 'input[name="nameID"]';

export const hubTextAreaTagline = 'textarea[name="tagline"]';

export default class AdminHubPage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  static async invalidCredentials(page: puppeteer.Page) {
    return await returnElementText(page, invalidCredentialsMessage);
  }

  static async verifyAvailableAvatar(page: puppeteer.Page) {
    return await returnElementText(page, authenticatedUserName);
  }

  static async fillHubData(
    page: puppeteer.Page,
    name: string,
    nameId: string,
    tagline: string
  ) {
    await verifyElementExistOnPage(page, hubInputName);
    await fillVisibleInput(page, hubInputName, name);
    await fillVisibleInput(page, hubInputNameId, nameId);
    await clickVisibleElement(page, menu);
    await clickVisibleElement(page, firstOptionDropdown);
    await verifyElementDoesNotExistOnPage(page, firstOptionDropdown);
    await fillVisibleInput(page, hubTextAreaTagline, tagline);
  }

  static async fillChallengeData(
    page: puppeteer.Page,
    name: string,
    nameId: string,
    tagline: string
  ) {
    await verifyElementExistOnPage(page, hubInputName);
    await fillVisibleInput(page, hubInputName, name);
    await fillVisibleInput(page, hubInputNameId, nameId);
    await fillVisibleInput(page, hubTextAreaTagline, tagline);
  }

  static async saveAdminEntity(page: puppeteer.Page) {
    await clickVisibleElement(page, saveButton);
    await verifyElementExistOnPage(page, alertMessageSuccess);
  }
}
