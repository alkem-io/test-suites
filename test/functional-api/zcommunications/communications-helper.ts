import { getMails } from '@test/utils/rest.request';

// To be used only in test, when there is dependancy on thrid party service (i.e. mailslurper)
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Returns 2 values:
 ** 1st: emails array
 ** 2nd: emails count
 */
export const getMailsData = async () => {
  let response = await getMails();
  let emailsData = response.body.mailItems;
  let emailsCount = response.body.totalRecords;

  return [emailsData, emailsCount];
};
