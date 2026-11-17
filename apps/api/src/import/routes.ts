// POST /api/locations/import (docs/API.md, D8). Order: multer (1 MiB) -> readSingleTextFile ->
// parseLocations -> one transaction with insertMany. Each failure throws the AppError whose code
// the step returned. Issue #7.
import type { Location, NewLocation } from '@lm/shared';
import { Router } from 'express';
import multer from 'multer';
import type { Deps } from '../deps';
import { requireAuth, userIdOf, type UserId } from '../auth';
import { AppError } from '../http/AppError';
import { insertMany } from '../locations';
import { parseLocations } from './parseLocations';
import { readSingleTextFile } from './readSingleTextFile';

export const MAX_UPLOAD_BYTES = 1024 * 1024;

export async function importRows(
  deps: Pick<Deps, 'db' | 'ids'>,
  userId: UserId,
  rows: ReadonlyArray<NewLocation>,
): Promise<Location[]> {
  const rowsWithIds = rows.map((r) => ({ ...r, id: deps.ids.uuid() }));
  const client = await deps.db.connect();
  try {
    await client.query('BEGIN');
    const locations = await insertMany(client, userId, rowsWithIds);
    await client.query('COMMIT');
    return locations;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 0,
    parts: 1,
    headerPairs: 20,
  },
});

export function importRouter(deps: Deps): Router {
  const router = Router();
  router.use(requireAuth(deps));

  router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
      throw new AppError('VALIDATION_FAILED', 'A ZIP file in field "file" is required.', [
        { path: 'file', message: 'File is required' },
      ]);
    }

    const zip = await readSingleTextFile(req.file.buffer);
    if (!zip.ok) {
      if (zip.code === 'ZIP_INVALID') {
        throw new AppError('ZIP_INVALID', 'The uploaded file is not a valid ZIP archive.');
      }
      if (zip.code === 'ZIP_ENTRY_COUNT') {
        throw new AppError(
          'ZIP_ENTRY_COUNT',
          `The ZIP must contain exactly one text file; it contains ${zip.files.length} files.`,
          { files: zip.files },
        );
      }
      throw new AppError(
        'ZIP_NOT_TEXT',
        'The ZIP entry must be a valid UTF-8 .txt file under 5 MiB.',
        { file: zip.file },
      );
    }

    const parsed = parseLocations(zip.text);
    if (!parsed.ok) {
      if (parsed.code === 'FILE_EMPTY') {
        throw new AppError('FILE_EMPTY', 'The uploaded text file contains no data lines.');
      }
      throw new AppError('FILE_ROWS_INVALID', 'One or more rows in the file are invalid.', {
        rows: parsed.rows,
        total: parsed.total,
      });
    }

    const locations = await importRows(deps, userIdOf(req), parsed.rows);
    res.status(201).json({ imported: locations.length, locations });
  });

  return router;
}
