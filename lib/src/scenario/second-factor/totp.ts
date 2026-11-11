import { createHmac } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIOD_S = 30;
const DIGITS = 6;

const base32Decode = (secret: string): Buffer => {
  const clean = secret.replace(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) {
      throw new Error(`totp: '${char}' is not a base32 character`);
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

/**
 * The RFC 6238 code Kratos expects for `secret` (its defaults: HMAC-SHA1, six
 * digits, thirty-second steps). `stepOffset` shifts the time step, so a test
 * can produce the previous step's code or one far outside the accepted window.
 */
export const totpCode = (
  secret: string,
  options?: { atMs?: number; stepOffset?: number }
): string => {
  const step =
    Math.floor((options?.atMs ?? Date.now()) / 1000 / PERIOD_S) +
    (options?.stepOffset ?? 0);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
};

/**
 * A six-digit code that is wrong for `secret` at every step Kratos accepts
 * (the current one and its neighbours): the right code with each digit shifted.
 */
export const wrongTotpCode = (secret: string): string => {
  const accepted = new Set(
    [-1, 0, 1].map(stepOffset => totpCode(secret, { stepOffset }))
  );
  for (let shift = 1; shift < 10; shift++) {
    const candidate = totpCode(secret)
      .split('')
      .map(d => String((Number(d) + shift) % 10))
      .join('');
    if (!accepted.has(candidate)) return candidate;
  }
  throw new Error('totp: could not derive a wrong code');
};
