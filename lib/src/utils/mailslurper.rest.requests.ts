import request from "supertest";
import { testConfiguration } from "..";

export const deleteMailSlurperMails = async () => {
  return await request(testConfiguration.endPoints.mailSlurper)
    .delete("")
    .send({
      pruneCode: "all",
    })
    .set("Accept", "application/json")
    .set("Content-Type", "application/json")
    .set("Connection", "keep-alive");
};

export const getMails = async () => {
  return await request(testConfiguration.endPoints.mailSlurper)
    .get("")
    .set("Accept", "application/json")
    .set("Content-Type", "application/json")
    .set("Connection", "keep-alive")
    .set("Accept-Encoding", "gzip, deflate, br");
};

/** One MailSlurper inbox entry, as the REST API returns it. The three named
 * fields are what the suites assert on; everything else (id, dateSent, ...) is
 * passed through untyped. `getMailsData` keeps its untyped tuple for the
 * callers that grew up on it; readers that want the shape cast to
 * `[MailItem[], number]`. */
export type MailItem = {
  subject?: string;
  body?: string;
  toAddresses?: string[];
  [key: string]: unknown;
};

export const getMailsData = async () => {
  const response = await getMails();
  // MailSlurper omits `mailItems` entirely for an empty inbox rather than
  // returning []. Every caller treats this as an array (`.filter`, `.find`),
  // so an inbox that is legitimately empty — precisely the state a negative
  // "no mail was sent" assertion creates — threw
  // `Cannot read properties of undefined (reading 'filter')` instead of
  // asserting. Normalize here, at the single reader, not in each spec.
  const emailsData = response.body.mailItems ?? [];
  const emailsCount = response.body.totalRecords ?? 0;

  return [emailsData, emailsCount];
};
