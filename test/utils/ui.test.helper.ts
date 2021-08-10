import puppeteer from 'puppeteer';

export const clearInput = async (page: puppeteer.Page, selector: string) => {
  await page.waitForSelector(selector);
  await page.evaluate(selector => {
    document.querySelector(selector).value = '';
  }, selector);
  await page.waitForSelector(selector);
};

export const reloadPage = async (page: puppeteer.Page) => {
  await page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] });
};

export const verifyUserIsOnPageByJoinTextElements = async (
  page: puppeteer.Page,
  selector: string
) => {
  await page.waitForSelector(selector);
  const returnedText = await page.$$eval(selector, element => {
    return element.map(element => element.textContent?.trim()).join(' ');
  });

  return returnedText;
};

export const verifyUserIsOnPageByGetTextElement = async (
  page: puppeteer.Page,
  selector: string
) => {
  await page.waitForSelector(selector);
  const returnedText = await page.$eval(selector, element =>
    element.textContent?.trim()
  );

  return returnedText;
};

export const verifyElementExistOnPage = async (
  page: puppeteer.Page,
  selector: string
) => !!(await page.$(selector));
