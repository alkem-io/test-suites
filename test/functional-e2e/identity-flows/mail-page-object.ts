import { clickVisibleElement } from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';

const lastEmail = '#mailItemsColumn tr:first-child a[href="#"]';
const redirectLink = '#mailDetailsColumn p:nth-child(4) a';
const mailRefreshButton = '#btnRefresh';
const mailRows = '#mailItemsColumn tr';
const loadingIndicator = '.blockUI.blockMsg';

export default class MailPage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  static async clickRefreshButton(page: puppeteer.Page) {
    await clickVisibleElement(page, mailRefreshButton);
    await page.waitForSelector(loadingIndicator, {
      visible: false,
      hidden: true,
    });
  }

  static async openLastEmail(page: puppeteer.Page) {
    await clickVisibleElement(page, lastEmail);
    await page.waitForSelector(loadingIndicator, {
      visible: false,
      hidden: true,
    });
  }

  static async clickRedirectLink(page: puppeteer.Page) {
    await clickVisibleElement(page, redirectLink);
  }

  static async getNumberOfMails(page: puppeteer.Page) {
    await page.waitForSelector(mailRows, { visible: true, hidden: false });
    return (await page.$$(mailRows)).length;
  }
}
