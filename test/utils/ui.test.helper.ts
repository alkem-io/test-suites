import puppeteer from 'puppeteer';

export const clearInput = async (page: puppeteer.Page, selector: string) => {
  await page.waitForSelector(selector);
  await page.evaluate(selector => {
    document.querySelector(selector).value = '';
  }, selector);
  await page.waitForSelector(selector);
};
