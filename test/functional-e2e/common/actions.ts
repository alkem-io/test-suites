import { returnElementText } from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';
import { alertMessage } from './selectors';

export default class CommonActions {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  async getAlertMessage(page: puppeteer.Page) {
    await page.waitForSelector(alertMessage, {
      hidden: false,
    });
    return await returnElementText(page, alertMessage);
  }
}
