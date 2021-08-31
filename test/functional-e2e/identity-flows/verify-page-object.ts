import { verifyUserIsOnPageByGetTextElement } from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';

const verifyPageTitle = '.MuiGrid-item.MuiGrid-grid-sm-4 .MuiBox-root span';
const verifyPageEmailInput = 'input[name="email"]';
const verifyPageSubmitButton = '.MuiGrid-grid-xs-12 button';
const verifyPageSuccessMessage =
  '.MuiContainer-maxWidthXl div:nth-child(2) div:nth-child(2) span';
const linkToProfile = 'a[href="/profile"]';

export default class VerifyPage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  static async getVerifyPageTitle(page: puppeteer.Page) {
    await page.waitForSelector(verifyPageTitle, {
      hidden: false,
    });
    return await verifyUserIsOnPageByGetTextElement(page, verifyPageTitle);
  }

  static async getVerifyPageSuccessTitle(page: puppeteer.Page) {
    await page.waitForSelector(verifyPageSuccessMessage, {
      hidden: false,
      visible: true,
    });
    return await verifyUserIsOnPageByGetTextElement(
      page,
      verifyPageSuccessMessage
    );
  }

  static async setVerifyEmail(page: puppeteer.Page, email: string) {
    await page.waitForSelector(verifyPageEmailInput);
    await page.type(verifyPageEmailInput, email);
  }

  static async submitVerifyPageForm(page: puppeteer.Page, email: string) {
    await this.setVerifyEmail(page, email);
    await page.click(verifyPageSubmitButton);
  }

  static async navigateToUserProfile(page: puppeteer.Page) {
    await page.click(linkToProfile);
    await page.waitForSelector(linkToProfile, {
      hidden: true,
      visible: false,
    });
  }
}
