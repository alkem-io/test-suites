import request from "supertest";
import { testConfiguration } from "../config/test.configuration";
import { delay } from "./delay";
import type { MailItem } from "./mailslurper.rest.requests";

/**
 * Recipient-scoped mail readers — the only way a suite should read mail.
 *
 * The mail sink is ONE inbox shared by every flow that sends mail on the stack
 * (MailSlurper, now Swarmail behind the same MailSlurper-compatible API at
 * `MAIL_SLURPER_ENDPOINT`). A reader that counts the whole inbox races every
 * other suite, and a writer that prunes it first destroys mail other suites are
 * waiting for. So: read by recipient, measure what arrived since a mark you
 * took yourself, never prune.
 *
 * These read through the MailSlurper REST surface only, which both sinks serve,
 * so they do not depend on which sink is running.
 */

/** Page cap for one full read: Swarmail keeps at most 2000 mails
 * (`SWARMAIL_MAX_PER_INBOX`) and the API pages them 50 at a time. */
const MAX_PAGES = 100;

/** True when `mail` lists `address` among its recipients. The sink may render
 * a recipient as `Name <addr>`; only the address is compared, ignoring case. */
export const mailIsAddressedTo = (mail: MailItem, address: string): boolean => {
  const wanted = address.trim().toLowerCase();
  return (mail.toAddresses ?? []).some((to) => {
    const addr = (to.match(/<([^>]+)>/)?.[1] ?? to).trim().toLowerCase();
    return addr === wanted;
  });
};

const readPage = async (
  pageNumber: number
): Promise<{ items: MailItem[]; totalPages: number }> => {
  const response = await request(testConfiguration.endPoints.mailSlurper)
    .get("")
    .query({ pageNumber })
    .set("Accept", "application/json");
  if (response.status !== 200) {
    // A failed read must never look like an empty mailbox: every negative
    // ("no mail to X") claim built on these readers would pass on it.
    throw new Error(
      `mail sink read failed (HTTP ${response.status}) on page ${pageNumber}`
    );
  }
  return {
    // MailSlurper omits `mailItems` for an empty inbox rather than sending [].
    items: (response.body.mailItems ?? []) as MailItem[],
    totalPages: Number(response.body.totalPages ?? 1) || 1,
  };
};

/** Every mail in the sink addressed to `address`, across all pages. */
export const getMailsTo = async (address: string): Promise<MailItem[]> => {
  const out: MailItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items, totalPages } = await readPage(page);
    out.push(...items.filter((mail) => mailIsAddressedTo(mail, address)));
    if (page >= totalPages || items.length === 0) break;
  }
  return out;
};

const mailIdOf = (mail: MailItem): string => {
  const id = mail.id;
  if (typeof id !== "string" && typeof id !== "number") {
    // Without an id, "new since the mark" cannot be told from "already there",
    // and every "nothing new arrived" assertion would pass vacuously.
    throw new Error(
      "mail sink returned a mail item without an id; recipient-scoped deltas need one"
    );
  }
  return String(id);
};

/** What one recipient's mailbox held at a point in time. */
export type MailboxMark = {
  readonly address: string;
  readonly seenIds: ReadonlySet<string>;
};

/** Records the mails `address` has now, so later reads return only what arrives after. */
export const markMailbox = async (address: string): Promise<MailboxMark> => ({
  address,
  seenIds: new Set((await getMailsTo(address)).map(mailIdOf)),
});

/** Mails to the mark's recipient that were not there when the mark was taken. */
export const getMailsToSince = async (
  mark: MailboxMark
): Promise<MailItem[]> =>
  (await getMailsTo(mark.address)).filter(
    (mail) => !mark.seenIds.has(mailIdOf(mail))
  );

/**
 * Polls the mark's recipient until at least `atLeast` new mails have arrived
 * since the mark, or `timeoutMs` passes. With `settleMs`, once the threshold is
 * met it waits that much longer and reads again, so an "exactly N" caller sees
 * a late extra mail instead of the first sample that crossed the line — pass a
 * bound derived from the product's own window (e.g. a digest's max delay),
 * never a literal. Returns whatever is there at the end; the caller asserts.
 */
export const waitForMailsToSince = async (
  mark: MailboxMark,
  {
    atLeast,
    timeoutMs,
    intervalMs = 1_000,
    settleMs,
  }: {
    atLeast: number;
    timeoutMs: number;
    intervalMs?: number;
    settleMs?: number;
  }
): Promise<MailItem[]> => {
  const deadline = Date.now() + timeoutMs;
  let found = await getMailsToSince(mark);
  while (found.length < atLeast && Date.now() < deadline) {
    await delay(intervalMs);
    found = await getMailsToSince(mark);
  }
  if (settleMs !== undefined && found.length >= atLeast) {
    await delay(settleMs);
    found = await getMailsToSince(mark);
  }
  return found;
};
