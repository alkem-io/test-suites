import puppeteer from 'puppeteer';

export const clearInput = async (page: puppeteer.Page, selector: string) => {
  await page.waitForSelector(selector);
  await page.click(selector);
  await page.evaluate(selector => {
    document.querySelector(selector).value = '';
  }, selector);
};

export const reloadPage = async (page: puppeteer.Page) => {
  await page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] });
};

export const verifyUserIsOnPageByJoinTextElements = async (
  page: puppeteer.Page,
  selector: string
) => {
  await page.waitForSelector(selector, {
    visible: true,
    hidden: false,
  });
  const returnedText = await page.$$eval(selector, element => {
    return element.map(element => element.textContent?.trim()).join(' ');
  });

  return returnedText;
};

export const verifyUserIsOnPageByGetTextElement = async (
  page: puppeteer.Page,
  selector: string
) => {
  await page.waitForSelector(selector, { hidden: false, visible: true });
  const returnedText = await page.$eval(selector, element =>
    element.textContent?.trim()
  );

  return returnedText;
};

export const verifyElementExistOnPage = async (
  page: puppeteer.Page,
  selector: string
) => !!(await page.$(selector));

export const acceptCookies = async (page: puppeteer.Page) => {
  const selector = '#rcc-confirm-button';
  await page.waitForSelector(selector, { visible: true });
  await page.click(selector);
  await page.waitForSelector(selector, { hidden: true });
};

export const waitForLoadingIndicatorToHide = async (
  page: puppeteer.Page,
  param: boolean
) => {
  await page.waitForSelector(
    '.MuiCircularProgress-indeterminate .MuiCircularProgress-svg',
    { hidden: param }
  );
};

export const clickVisibleElement = async (
  page: puppeteer.Page,
  selector: string
) => {
  await page.waitForSelector(selector, { visible: true, hidden: false });
  await page.click(selector);
};

export const fillVisibleInput = async (
  page: puppeteer.Page,
  selector: string,
  value: string
) => {
  await page.waitForSelector(selector, { hidden: false, visible: true });
  await page.type(selector, value);
};
