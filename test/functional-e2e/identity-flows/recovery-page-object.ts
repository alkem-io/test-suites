import {
  clickVisibleElement,
  fillVisibleInput,
} from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';

export const recoveryPageSubmitButton = '.MuiGrid-grid-xs-12 button ';
export const recoveryPageTitle = '.MuiGrid-grid-sm-4 .MuiBox-root span';
export const recoveryPageSuccessMessage = 'div .MuiAlert-message';
export const recoveryPageErrorMessage =
  '.MuiAlert-standardError .MuiAlert-message';
export const newPasswordSettingPage = 'input[name="password"]';
const savePasswordButtonSettingsPage = 'button[value="password"]';
const emailInputRecoveryPage = 'input[name="email"]';

export default class RecoveryPage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  static async setRecoveryEmail(page: puppeteer.Page, email: string) {
    await fillVisibleInput(page, emailInputRecoveryPage, email);
  }

  static async submitRecoveryPageForm(page: puppeteer.Page) {
    await clickVisibleElement(page, recoveryPageSubmitButton);
  }

  static async savePasswordButtonSettingsPageForm(page: puppeteer.Page) {
    await clickVisibleElement(page, savePasswordButtonSettingsPage);
  }
}
