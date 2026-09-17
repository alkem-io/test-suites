// Shared PNG fixture generator, lifted out of the 033-chat-avatars suite
// (client-web/src/functional-e2e/chat-avatars/chat-avatars.helpers.ts) and
// parameterised so callers can pick a non-square size — the 10178 space-banner
// suite needs 1200×120, 1199×120, 1536×256 and 2000×200 fixtures, and a
// hard-coded 64×64 square cannot express any of them.
//
// Node 20.9.0 (the Volta-pinned runtime) has no `zlib.crc32`, so the PNG
// below carries its own CRC-32 implementation — unchanged from the original.

import fs from "fs";
import os from "os";
import path from "path";
import zlib from "zlib";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export type PngFixtureOptions = {
  /** Pixel width. */
  width: number;
  /** Pixel height. */
  height: number;
  /** Shifts the palette so two successive fixtures are distinguishable. */
  variant?: "a" | "b";
};

/**
 * Writes a small, valid, distinctly-striped PNG at the requested dimensions
 * and returns its path.
 *
 * The striped fill (not a flat colour) is deliberate: a flat colour risks the
 * server's image pipeline optimising the encoded dimensions away, which would
 * make a size-boundary fixture assert nothing.
 */
export function createPngFixture({
  width,
  height,
  variant = "a",
}: PngFixtureOptions): string {
  const chunk = (tag: string, data: Buffer): Buffer => {
    const tagBuffer = Buffer.from(tag, "ascii");
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([tagBuffer, data])), 0);
    return Buffer.concat([length, tagBuffer, data, crc]);
  };

  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // colour type: RGB

  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const stripe = (x + y) % 16 < 8;
      const [r, g, b] =
        variant === "a"
          ? stripe
            ? [20, 160, 220]
            : [220, 20, 20]
          : stripe
            ? [240, 200, 10]
            : [10, 90, 240];
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }

  const png = Buffer.concat([
    signature,
    chunk("IHDR", ihdrData),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "png-fixture-"));
  const file = path.join(dir, `fixture-${variant}-${width}x${height}.png`);
  fs.writeFileSync(file, png);
  return file;
}
