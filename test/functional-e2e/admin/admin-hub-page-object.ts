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
export const spaceInputName = 'input[name="name"]';
export const spaceInputNameId = 'input[name="nameID"]';

export const spaceTextAreaTagline = 'textarea[name="tagline"]';

export default class AdminSpacePage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  static async invalidCredentials(page: puppeteer.Page) {
    return await returnElementText(page, invalidCredentialsMessage);
  }

  static async verifyAvailableAvatar(page: puppeteer.Page) {
    return await returnElementText(page, authenticatedUserName);
  }

  static async fillSpaceData(
    page: puppeteer.Page,
    name: string,
    nameId: string,
    tagline: string
  ) {
    await verifyElementExistOnPage(page, spaceInputName);
    await fillVisibleInput(page, spaceInputName, name);
    await fillVisibleInput(page, spaceInputNameId, nameId);
    await clickVisibleElement(page, menu);
    await clickVisibleElement(page, firstOptionDropdown);
    await verifyElementDoesNotExistOnPage(page, firstOptionDropdown);
    await fillVisibleInput(page, spaceTextAreaTagline, tagline);
  }

  static async fillChallengeData(
    page: puppeteer.Page,
    name: string,
    nameId: string,
    tagline: string
  ) {
    await verifyElementExistOnPage(page, spaceInputName);
    await fillVisibleInput(page, spaceInputName, name);
    await fillVisibleInput(page, spaceInputNameId, nameId);
    await fillVisibleInput(page, spaceTextAreaTagline, tagline);
  }

  static async saveAdminEntity(page: puppeteer.Page) {
    await clickVisibleElement(page, saveButton);
    await verifyElementExistOnPage(page, alertMessageSuccess);
  }
}
