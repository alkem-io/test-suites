import {
  clearInput,
  verifyUserIsOnPageByGetTextElement,
  verifyUserIsOnPageByJoinTextElements,
} from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';

const applyLink = `.container-fluid .d-flex a[type="button"]`;
const applyButton = '.container button[type="submit"]';
const firstQuestionField = '.container .form-group:nth-child(4) textarea';
const secondQuestionField = '.container .form-group:nth-child(5) textarea';
const thirdQuestionField = '.container .form-group:nth-child(6) textarea';
const fourthQuestionField = '.container .form-group:nth-child(7) textarea';
const confirmationApplicationText = '.container div:nth-child(2) div span ';
const applicationBackButton = '.container a[href';
const applicationPendingOnEcoPage =
  ' .flex-column.col-lg-6 button:nth-child(1) div span';

export default class EcoversePage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  async clicksApplyLink(page: puppeteer.Page) {
    await page.waitForSelector(applyLink, { hidden: false });
    await page.click(applyLink);
  }

  async clicksApplyButton(page: puppeteer.Page) {
    await page.waitForSelector(applyButton, { hidden: false });
    await page.focus(applyButton);
    await page.click(applyButton);
  }
  async clicksApplicationBackButton(page: puppeteer.Page) {
    await page.waitForSelector(applicationBackButton, { hidden: false });
    await page.focus(applicationBackButton);
    await page.click(applicationBackButton);
  }

  async setQuestionsValues(
    page: puppeteer.Page,
    firstQuestion: string,
    secondQuestion: string,
    thirdQuestion: string,
    fourthQuestion: string
  ) {
    await clearInput(page, firstQuestionField);
    await page.type(firstQuestionField, firstQuestion);
    await clearInput(page, secondQuestionField);
    await page.type(secondQuestionField, secondQuestion);
    await clearInput(page, thirdQuestionField);
    await page.type(thirdQuestionField, thirdQuestion);
    await clearInput(page, fourthQuestionField);
    await page.type(fourthQuestionField, fourthQuestion);
  }

  async verifyApplicationConfirmationPage(page: puppeteer.Page) {
    await page.waitForSelector(applicationBackButton, { hidden: false });
    return await verifyUserIsOnPageByJoinTextElements(
      page,
      confirmationApplicationText
    );
  }

  async verifyApplicationPendingButton(page: puppeteer.Page) {
    await page.waitForSelector(applicationPendingOnEcoPage, { hidden: false });
    return await verifyUserIsOnPageByGetTextElement(
      page,
      applicationPendingOnEcoPage
    );
  }
}
