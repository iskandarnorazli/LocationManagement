// The uploaded ZIP to the text of its one .txt file, by D9. Issue #6.
import yauzl from 'yauzl';

export const MAX_ENTRIES = 10;
export const MAX_UNCOMPRESSED_BYTES = 5 * 1024 * 1024;
export const IGNORED_ENTRY = /(^|\/)(__MACOSX\/|\.DS_Store$)/;

export type ZipResult =
  | { ok: true; fileName: string; text: string }
  | { ok: false; code: 'ZIP_INVALID' }
  | { ok: false; code: 'ZIP_ENTRY_COUNT'; files: string[] }
  | { ok: false; code: 'ZIP_NOT_TEXT'; file: string };

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

export function readSingleTextFile(zip: Buffer): Promise<ZipResult> {
  return new Promise((resolve) => {
    yauzl.fromBuffer(zip, { lazyEntries: true, autoClose: false }, (openErr, zipfile) => {
      if (openErr || !zipfile) {
        resolve({ ok: false, code: 'ZIP_INVALID' });
        return;
      }

      let settled = false;
      const finish = (result: ZipResult) => {
        if (settled) return;
        settled = true;
        try {
          zipfile.close();
        } catch {
          // Ignore close errors on corrupt streams.
        }
        resolve(result);
      };

      const keptFiles: string[] = [];
      let candidate: yauzl.Entry | undefined;
      let totalEntries = 0;

      zipfile.on('error', () => {
        finish({ ok: false, code: 'ZIP_INVALID' });
      });

      zipfile.on('entry', (entry: yauzl.Entry) => {
        if (settled) return;
        totalEntries += 1;
        if (totalEntries > MAX_ENTRIES) {
          finish({ ok: false, code: 'ZIP_ENTRY_COUNT', files: keptFiles });
          return;
        }

        if ((entry.generalPurposeBitFlag & 0x1) !== 0) {
          finish({ ok: false, code: 'ZIP_INVALID' });
          return;
        }

        if (entry.fileName.endsWith('/') || IGNORED_ENTRY.test(entry.fileName)) {
          zipfile.readEntry();
          return;
        }

        keptFiles.push(entry.fileName);
        candidate = entry;
        zipfile.readEntry();
      });

      zipfile.on('end', () => {
        if (settled) return;
        if (keptFiles.length !== 1 || !candidate) {
          finish({ ok: false, code: 'ZIP_ENTRY_COUNT', files: keptFiles });
          return;
        }

        const file = candidate.fileName;
        if (!file.toLowerCase().endsWith('.txt')) {
          finish({ ok: false, code: 'ZIP_NOT_TEXT', file });
          return;
        }

        if (candidate.uncompressedSize > MAX_UNCOMPRESSED_BYTES) {
          finish({ ok: false, code: 'ZIP_NOT_TEXT', file });
          return;
        }

        zipfile.openReadStream(candidate, (streamErr, stream) => {
          if (streamErr || !stream) {
            finish({ ok: false, code: 'ZIP_INVALID' });
            return;
          }

          const chunks: Buffer[] = [];
          let totalBytes = 0;

          stream.on('data', (chunk: Buffer) => {
            if (settled) return;
            totalBytes += chunk.length;
            if (totalBytes > MAX_UNCOMPRESSED_BYTES) {
              stream.destroy();
              finish({ ok: false, code: 'ZIP_NOT_TEXT', file });
              return;
            }
            if (chunk.includes(0)) {
              stream.destroy();
              finish({ ok: false, code: 'ZIP_NOT_TEXT', file });
              return;
            }
            chunks.push(chunk);
          });

          stream.on('error', () => {
            finish({ ok: false, code: 'ZIP_INVALID' });
          });

          stream.on('end', () => {
            if (settled) return;
            const buf = Buffer.concat(chunks, totalBytes);
            try {
              const text = utf8Decoder.decode(buf);
              finish({ ok: true, fileName: file, text });
            } catch {
              finish({ ok: false, code: 'ZIP_NOT_TEXT', file });
            }
          });
        });
      });

      zipfile.readEntry();
    });
  });
}
