import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strToU8, zipSync } from 'fflate';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'zips');
mkdirSync(outDir, { recursive: true });

const FIXED_MTIME = new Date('2026-01-01T00:00:00.000Z');
const SAMPLE_TEXT = 'Name, Latitude, Longitude\nSuria KLCC,3.157324409,101.7121981\n';

function makeZip(entries) {
  const mapped = {};
  for (const [name, data] of Object.entries(entries)) {
    const bytes = typeof data === 'string' ? strToU8(data) : data;
    mapped[name] = [bytes, { mtime: FIXED_MTIME, level: 6 }];
  }
  return Buffer.from(zipSync(mapped));
}

function writeZip(name, buf) {
  writeFileSync(path.join(outDir, name), buf);
}

// 1. Valid single .txt
const oneZip = makeZip({ 'locations.txt': SAMPLE_TEXT });
writeZip('one.zip', oneZip);

// 2. Nested .txt with explicit directory entry
writeZip(
  'nested.zip',
  makeZip({
    'data/': new Uint8Array(0),
    'data/locations.txt': SAMPLE_TEXT,
  }),
);

// 3. macOS Finder-style ZIP
writeZip(
  'finder.zip',
  makeZip({
    'x.txt': SAMPLE_TEXT,
    '__MACOSX/._x.txt': new Uint8Array([0x00, 0x05, 0x16, 0x07]),
    '.DS_Store': new Uint8Array([0x00, 0x00, 0x00, 0x01]),
  }),
);

// 4. Two .txt files
writeZip('two-txt.zip', makeZip({ 'a.txt': SAMPLE_TEXT, 'b.txt': SAMPLE_TEXT }));

// 5. One .txt and one .png
writeZip(
  'txt-and-png.zip',
  makeZip({ 'a.txt': SAMPLE_TEXT, 'photo.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }),
);

// 6. Empty ZIP (no files)
writeZip('empty.zip', makeZip({}));

// 7. One .csv (not .txt)
writeZip('csv-only.zip', makeZip({ 'locations.csv': SAMPLE_TEXT }));

// 8. Invalid UTF-8 in .txt
writeZip('invalid-utf8.zip', makeZip({ 'bad.txt': new Uint8Array([0xff, 0xfe, 0xfd]) }));

// 9. NUL byte in .txt
writeZip('nul-byte.zip', makeZip({ 'nul.txt': new Uint8Array([0x41, 0x00, 0x42]) }));

// 10. Truncated ZIP
writeZip('truncated.zip', oneZip.subarray(0, Math.floor(oneZip.length / 2)));

// 11. Encrypted entry (set bit 0 of general purpose bit flag in LFH + CDH)
const encZip = Buffer.from(makeZip({ 'secret.txt': SAMPLE_TEXT }));
// Local file header flag at offset 6..7
encZip.writeUInt16LE(encZip.readUInt16LE(6) | 0x0001, 6);
// Central directory header signature 0x02014b50, flag at +8..9
const cdOffset = encZip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
if (cdOffset !== -1) {
  encZip.writeUInt16LE(encZip.readUInt16LE(cdOffset + 8) | 0x0001, cdOffset + 8);
}
writeZip('encrypted.zip', encZip);

// 12. ZIP bomb (> 5 MiB uncompressed, highly compressible)
const bombBytes = Buffer.alloc(5 * 1024 * 1024 + 64 * 1024, 0x61);
writeZip('bomb.zip', makeZip({ 'bomb.txt': new Uint8Array(bombBytes) }));

// 13. 11 entries
const eleven = {};
for (let i = 1; i <= 11; i++) {
  eleven[`f${i}.txt`] = SAMPLE_TEXT;
}
writeZip('eleven-entries.zip', makeZip(eleven));

// 14. Lying header: declared uncompressedSize = 100, actual = 50 MiB of 'a'
const fiftyMib = Buffer.alloc(50 * 1024 * 1024, 0x61);
const lyingZip = Buffer.from(makeZip({ 'lying.txt': new Uint8Array(fiftyMib) }));
// Local file header uncompressed size at offset 22..25
lyingZip.writeUInt32LE(100, 22);
// Central directory header uncompressed size at +24..27
const lyingCdOffset = lyingZip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
if (lyingCdOffset !== -1) {
  lyingZip.writeUInt32LE(100, lyingCdOffset + 24);
}
writeZip('lying-header.zip', lyingZip);
