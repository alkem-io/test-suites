import puppeteer from 'puppeteer';

export const clearInput = async (page: puppeteer.Page, selector: string) => {
  await page.waitForSelector(selector);
  await page.evaluate(selector => {
    document.querySelector(selector).value = '';
  }, selector);
  await page.waitForSelector(selector);
};

export const reloadPage = async (page: puppeteer.Page, pageUrl: string) => {
  let url = page.url();
  if (url !== pageUrl) {
    throw new Error('Url is not correct!');
  }
  await page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] });
};

export const verifyUserIsOnPageByTextElements = async (
  page: puppeteer.Page,
  selector: string,
  textElement: string
) => {
  await page.waitForSelector(selector);

  await page.waitForSelector(selector);
  const returnedText = await page.$$eval(selector, element => {
    return element.map(element => element.textContent?.trim()).join(' ');
  });

  return returnedText === textElement;
};

export const verifyUserIsOnPageByJoinTextElements = async (
  page: puppeteer.Page,
  selector: string
) => {
  await page.waitForSelector(selector);

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
) => {
  if (await page.$(selector)) {
    return true;
  } else {
    return false;
  }
};
