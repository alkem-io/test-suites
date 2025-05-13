import puppeteer from 'puppeteer';
import { TestUser } from '@alkemio/tests-lib';
import { getMails } from './mailslurper.rest.requests';

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
  const response = await getMails();
  const lastEmailBody = response.body.mailItems[0].body as string;

  function detectUrl(text: string) {
    const cleanText = text.replace(/<.*?>/gm, '');
    const urlRegex = /(((https?:\/\/)|(https:\/\/)|(www\.))[^\s,]+)/;
    const url = cleanText.match(urlRegex);
    return (url && url[0]?.toString()) || undefined;
  }

  const url = detectUrl(lastEmailBody);
  const emailsCount = response.body.totalRecords;

  return [url, lastEmailBody, emailsCount];
};

/**
 * Returns 3 values:
 ** 1st: if email doesn't contain link - the message
 ** 2nd: if email contains URL - the link
 ** 3rd: always returns number of all emails
 */
export const getRecoveryCode = async (): Promise<[
  string | undefined,
  string,
  number
]> => {
  const response = await getMails();
  const lastEmailBody = response.body.mailItems[0].body as string;

  function detectRecoveryCode(text: string): string | undefined {
    const cleanText = text.replace(/<.*?>/gm, '');
    text = cleanText;
    const match = text.match(/\b\d{6}\b/);

    if (match) {
      const recoveryCode: string = match[0];
      return recoveryCode;
    } else {
      console.error('Recovery code not found.');
    }

    return recoveryCode;
  }

  const recoveryCode = detectRecoveryCode(lastEmailBody);
  const emailsCount = response.body.totalRecords;

  return [recoveryCode, lastEmailBody, emailsCount];
};
