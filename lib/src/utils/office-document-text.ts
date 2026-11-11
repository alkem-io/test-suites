import { inflateRawSync } from "node:zlib";
import { testConfiguration } from "../config/test.configuration";
import { TestUser } from "../common/enums/test.user";
import { type GraphqlActor, resolveActor } from "./graphql.actor";

/**
 * Read the text of a stored office document back through the storage REST
 * endpoint.
 * Collabora renders its tiles on canvas, so a typed paragraph is never in any
 * DOM: the stored file is the only text oracle there is.
 */

const PREVIEW_URL = /\/api\/private\/wopi\/files\/([^/]+)\/preview$/;

/** The file id named by a Collabora `previewUrl`; throws on any other URL. */
export const officeDocumentFileId = (previewUrl: string): string => {
  const fileID = previewUrl.match(PREVIEW_URL)?.[1];
  if (!fileID) throw new Error(`not a Collabora preview URL: ${previewUrl}`);
  return decodeURIComponent(fileID);
};

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

/** One entry of a zip archive, read through the central directory (the local header may carry zero sizes). */
const unzipEntry = (zip: Buffer, name: string): Buffer | undefined => {
  let eocd = -1;
  for (
    let i = zip.length - 22;
    i >= Math.max(0, zip.length - 22 - 0xffff);
    i -= 1
  ) {
    if (zip.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return undefined;
  const entries = zip.readUInt16LE(eocd + 10);
  let cursor = zip.readUInt32LE(eocd + 16);
  for (let n = 0; n < entries; n += 1) {
    if (zip.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) return undefined;
    const method = zip.readUInt16LE(cursor + 10);
    const compressedSize = zip.readUInt32LE(cursor + 20);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const extraLength = zip.readUInt16LE(cursor + 30);
    const commentLength = zip.readUInt16LE(cursor + 32);
    const localOffset = zip.readUInt32LE(cursor + 42);
    const entryName = zip.toString(
      "utf8",
      cursor + 46,
      cursor + 46 + nameLength
    );
    if (entryName === name) {
      if (zip.readUInt32LE(localOffset) !== LOCAL_SIGNATURE) return undefined;
      const dataStart =
        localOffset +
        30 +
        zip.readUInt16LE(localOffset + 26) +
        zip.readUInt16LE(localOffset + 28);
      const data = zip.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return Buffer.from(data);
      if (method === 8) return inflateRawSync(data);
      throw new Error(`unsupported zip compression method ${method}`);
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return undefined;
};

const XML_ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
};

/** Named XML entities and decimal / hexadecimal character references, in one pass. */
const decodeEntities = (text: string): string =>
  text.replace(/&(?:lt|gt|amp|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, (entity) =>
    entity.startsWith("&#x")
      ? String.fromCodePoint(parseInt(entity.slice(3, -1), 16))
      : entity.startsWith("&#")
      ? String.fromCodePoint(parseInt(entity.slice(2, -1), 10))
      : XML_ENTITIES[entity]
  );

/** `<text:s/>` is one space; `<text:s text:c="N"/>` is N spaces. */
const odfSpaces = (element: string): string =>
  " ".repeat(Number(/text:c="(\d+)"/.exec(element)?.[1] ?? 1));

/** OpenDocument `content.xml`: `text:p` / `text:h` in document order. */
const odfParagraphs = (xml: string): string[] => {
  const paragraphs: string[] = [];
  const element = /<text:(p|h)(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/text:\1>)/g;
  for (let match = element.exec(xml); match; match = element.exec(xml)) {
    paragraphs.push(
      decodeEntities(
        (match[2] ?? "")
          .replace(/<text:s(?:\s[^>]*)?\/>/g, odfSpaces)
          .replace(/<text:tab(?:\s[^>]*)?\/>/g, "\t")
          .replace(/<text:line-break(?:\s[^>]*)?\/>/g, "\n")
          .replace(/<[^>]+>/g, "")
      ).trim()
    );
  }
  return paragraphs;
};

/** WordprocessingML `word/document.xml`: `w:p` in document order, the text of its `w:t` runs. */
const wordParagraphs = (xml: string): string[] => {
  const paragraphs: string[] = [];
  const element = /<w:p(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/w:p>)/g;
  for (let match = element.exec(xml); match; match = element.exec(xml)) {
    const inner = (match[1] ?? "")
      .replace(/<w:tab(?:\s[^>]*)?\/>/g, "<w:t>\t</w:t>")
      .replace(/<w:br(?:\s[^>]*)?\/>/g, "<w:t>\n</w:t>");
    let text = "";
    const run = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    for (let t = run.exec(inner); t; t = run.exec(inner)) text += t[1];
    paragraphs.push(decodeEntities(text).trim());
  }
  return paragraphs;
};

/**
 * The paragraphs of an office document file, in document order, trimmed,
 * empty ones included. Never collapsed to one string: an order oracle needs
 * the paragraphs. COOL saves in the document's own format, and the platform
 * stores a blank WORDPROCESSING document as a DOCX (WordprocessingML), so both
 * formats are read: OpenDocument (`content.xml`) and DOCX (`word/document.xml`).
 * An empty file (a blank document no editor has saved yet is stored with zero
 * bytes) has no paragraphs. Throws `not an office document` for bytes that are
 * neither.
 */
export const officeDocumentParagraphs = (file: Buffer): string[] => {
  if (file.length === 0) return [];
  const odf = unzipEntry(file, "content.xml");
  if (odf) return odfParagraphs(odf.toString("utf8"));
  const word = unzipEntry(file, "word/document.xml");
  if (word) return wordParagraphs(word.toString("utf8"));
  throw new Error(
    "not an office document (neither content.xml nor word/document.xml)"
  );
};

/**
 * The text of the document behind a Collabora `previewUrl`, as the actor reads
 * the stored bytes. Re-read `previewUrl` on every call: never cache the file id.
 * `bytes` is 0 for a document nobody has saved yet; a non-2xx answer throws, so
 * "no paragraphs" is never the result of a failed read.
 */
export const readOfficeDocumentText = async (
  previewUrl: string,
  actor: GraphqlActor = TestUser.GLOBAL_ADMIN
): Promise<{ paragraphs: string[]; bytes: number }> => {
  const fileID = officeDocumentFileId(previewUrl);
  const base = testConfiguration.endPoints.server.replace(/\/$/, "");
  const response = await fetch(
    `${base}/api/private/rest/storage/document/${encodeURIComponent(fileID)}`,
    { headers: resolveActor(actor).headers }
  );
  if (!response.ok) {
    throw new Error(`office document fetch failed: ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  return { paragraphs: officeDocumentParagraphs(bytes), bytes: bytes.length };
};
