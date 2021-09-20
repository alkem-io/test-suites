import puppeteer from 'puppeteer';
import { restRequestAuth } from './rest.request';
import { TestUser } from './token.helper';
import { cookies } from '@test/functional-e2e/common/selectors';

/**
 * Waits and clears input field from existing text
 * @param selector of the input field
 */
export const clearInput = async (page: puppeteer.Page, selector: string) => {
  await page.waitForSelector(selector);
  await page.click(selector);
  await page.evaluate(selector => {
    document.querySelector(selector).value = '';
  }, selector);
};

/**
 * Reloads current page
 */
export const reloadPage = async (page: puppeteer.Page) => {
  await page.reload({ waitUntil: ['networkidle2', 'domcontentloaded'] });
};

/**
 * Returns elements text with same selector and joins the text
 * @param selector of multiple elements with same selector
 */
export const returnMultipleElementsTextAndJoin = async (
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

/**
 * Returns unique element text
 * @param selector of unique element
 */
export const returnElementText = async (
  page: puppeteer.Page,
  selector: string
) => {
  await page.waitForSelector(selector, { hidden: false, visible: true });
  const returnedText = await page.$eval(selector, element =>
    element.textContent?.trim()
  );
  return returnedText;
};

/**
 * Awaits element to exist on page
 * @param selector of element
 */
export const verifyElementExistOnPage = async (
  page: puppeteer.Page,
  selector: string
) => await page.waitForSelector(selector, { hidden: false, visible: true });


/**
 * Awaits loadining indicator to show and hide
 */
export const loading = async (page: puppeteer.Page) => {
  let progressbarElement = await page.$('[role="progressbar"]');

  if (progressbarElement) {
    await page.waitForSelector('[role="progressbar"]', {
      hidden: true,
    });
  }

  await page.content();
};

/**
 * Accepts cookies on page and waits to hide
 * @param selector of cookies
 */
export const acceptCookies = async (page: puppeteer.Page) => {
  const selector = cookies;
  await page.waitForSelector(selector, { visible: true });
  await page.click(selector);
  await page.waitForSelector(selector, { hidden: true });
};

/**
 * Waits for particular element selector to be visible/invisible
 ** @param selector of element
 ** @param hiddenState default value is "false" and is optional
 ** @param visibilityState default value is "false" and is optional
 */
export const waitElementToBeVisibile = async (
  page: puppeteer.Page,
  selector: string,
  hiddenState?: false,
  visibilityState?: true
) => {
  !!(await page.waitForSelector(selector, {
    hidden: hiddenState,
    visible: visibilityState,
  }));
};

/**
 * Waits for element to become visible and clicks on it
 ** @param selector to be clicked
 */
export const clickVisibleElement = async (
  page: puppeteer.Page,
  selector: string
) => {
  await page.waitForSelector(selector, { visible: true });
  await page.click(selector);
};

/**
 * Clicks element by text
 * ToDo - make selector parameterized
 ** @param text to be clicked
 */
export const clickElementByText = async (
  page: puppeteer.Page,
  text: string
) => {
  const [element] = await page.$x(`//span[contains(., '${text}')]`);
  if (element) {
    await element.click();
  }
};

/**
 * Removes browser cookies
 */
export const clearBrowserCookies = async (page: puppeteer.Page) => {
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies');
};

/**
 * Waits for input field to become visible and sets value
 ** @param selector of the input field
 ** @param value to be set in the input field
 */
export const fillVisibleInput = async (
  page: puppeteer.Page,
  selector: string,
  value: string
) => {
  await page.waitForSelector(selector, { hidden: false, visible: true });
  await page.type(selector, value);
};

/**
 * Returns 3 values:
 ** 1st: if email doesn't contain link - the message
 ** 2nd: if email contains URL - the link
 ** 3rd: always returns number of all emails
 */
export const getEmails = async (): Promise<[
  string | undefined,
  string,
  number
]> => {
  let response = await restRequestAuth(TestUser.GLOBAL_ADMIN);
  let lastEmailBody = response.body.mailItems[0].body as string;

  function detectUrl(text: string) {
    let cleanText = text.replace(/<.*?>/gm, '');
    let urlRegex = /(((https?:\/\/)|(https:\/\/)|(www\.))[^\s]+)/g;
    let url = cleanText.match(urlRegex);
    return url?.toString();
  }

  let url = detectUrl(lastEmailBody);
  let emailsCount = response.body.totalRecords;

  return [url, lastEmailBody, emailsCount];
};

/**
 * Navigates to specified URL and awaits the document to load
 ** @param value to be set in the input field
 */
export const goToUrlWait = async (page: puppeteer.Page, url: string) => {
  await page.goto(url, {
    waitUntil: ['networkidle2', 'domcontentloaded'],
  });
};
