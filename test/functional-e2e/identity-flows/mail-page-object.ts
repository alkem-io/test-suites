import puppeteer from 'puppeteer';

const lastEmail = '#mailItemsColumn tr:first-child a[href="#"]';
const redirectLink = '#mailDetailsColumn p:nth-child(4) a';
const mailRefreshButton = '#btnRefresh';
const mailRows = '#mailItemsColumn tr';
const loadingIndicator = '.blockUI.blockMsg';

export default class MailPage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  async clickRefreshButton(page: puppeteer.Page) {
    await page.waitForSelector(mailRefreshButton, {
      visible: true,
      hidden: false,
    });
    await page.click(mailRefreshButton);
    await page.waitForSelector(loadingIndicator, {
      visible: false,
      hidden: true,
    });
  }

  async openLastEmail(page: puppeteer.Page) {
    await page.waitForSelector(lastEmail, { visible: true, hidden: false });
    await page.click(lastEmail);
    await page.waitForSelector(loadingIndicator, {
      visible: false,
      hidden: true,
    });
  }

  async clickRedirectLink(page: puppeteer.Page) {
    await page.waitForSelector(redirectLink, { visible: true, hidden: false });
    await page.click(redirectLink);
  }

  async getNumberOfMails(page: puppeteer.Page) {
    await page.waitForSelector(mailRows, { visible: true, hidden: false });
    return (await page.$$(mailRows)).length;
  }
}
