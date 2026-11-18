#!/usr/bin/env node
// Encrypts or decrypts one file with a passphrase (AES-256-GCM, key from scrypt).
//
// The nightly's jobs hand their Playwright blob reports to the report job as
// workflow artifacts. This repository is public, so anyone signed in can
// download a workflow artifact, and a blob report holds traces and videos of
// signed-in sessions. The jobs therefore upload only what this script wrote,
// and the report job is the only place where the reports exist in the clear.
//
//   node scripts/blob-crypt.mjs encrypt <in> <out>
//   node scripts/blob-crypt.mjs decrypt <in> <out>
//
// The passphrase is read from BLOB_REPORT_KEY, never from the command line.
// File layout: magic (8) | salt (16) | iv (12) | ciphertext | auth tag (16).

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { createReadStream, createWriteStream, openSync, readSync, closeSync, statSync, rmSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';

const MAGIC = Buffer.from('ALKBLOB1');
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + SALT_BYTES + IV_BYTES;

const fail = message => {
  console.error(`blob-crypt: ${message}`);
  process.exit(1);
};

const [mode, source, target] = process.argv.slice(2);
if (!['encrypt', 'decrypt'].includes(mode) || !source || !target) {
  fail('usage: blob-crypt.mjs encrypt|decrypt <in> <out>');
}
const passphrase = process.env.BLOB_REPORT_KEY;
if (!passphrase || passphrase.length < 32) {
  // A short key could be guessed offline from the public ciphertext.
  fail('BLOB_REPORT_KEY is not set, or is shorter than 32 characters');
}

const keyFrom = salt => scryptSync(passphrase, salt, 32);

const readAt = (file, position, length) => {
  const fd = openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const read = readSync(fd, buffer, 0, length, position);
    if (read !== length) fail(`${file} is too short to be an encrypted report`);
    return buffer;
  } finally {
    closeSync(fd);
  }
};

try {
  if (mode === 'encrypt') {
    const salt = randomBytes(SALT_BYTES);
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', keyFrom(salt), iv);
    const out = createWriteStream(target);
    out.write(Buffer.concat([MAGIC, salt, iv]));
    await pipeline(createReadStream(source), cipher, out, { end: false });
    await new Promise((resolve, reject) => {
      out.on('error', reject);
      out.end(cipher.getAuthTag(), resolve);
    });
  } else {
    const size = statSync(source).size;
    if (size < HEADER_BYTES + TAG_BYTES) fail(`${source} is too short to be an encrypted report`);
    const header = readAt(source, 0, HEADER_BYTES);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) fail(`${source} was not written by this script`);
    const salt = header.subarray(MAGIC.length, MAGIC.length + SALT_BYTES);
    const iv = header.subarray(MAGIC.length + SALT_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', keyFrom(salt), iv);
    decipher.setAuthTag(readAt(source, size - TAG_BYTES, TAG_BYTES));
    const lastByte = size - TAG_BYTES - 1;
    if (lastByte < HEADER_BYTES) {
      // Nothing was encrypted; the tag still has to verify.
      decipher.final();
      createWriteStream(target).end();
    } else {
      await pipeline(
        createReadStream(source, { start: HEADER_BYTES, end: lastByte }),
        decipher,
        createWriteStream(target)
      );
    }
  }
} catch (error) {
  // A wrong key or a changed file fails the tag check; leave no partial output.
  rmSync(target, { force: true });
  fail(`${mode} of ${source} failed: ${error.message}`);
}
