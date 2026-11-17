// What the upload popup says for each failure (R12, docs/ERRORS.md). One sentence each; the
// details come from the error's `details`, which the API documents per code.
import type { ApiError } from '../api/client';

type RowProblem = { line: number; reason: string };

function rowsOf(details: unknown): { rows: RowProblem[]; total: number } | null {
  const d = details as { rows?: unknown; total?: unknown } | null;
  if (!d || !Array.isArray(d.rows) || typeof d.total !== 'number') return null;
  return { rows: d.rows as RowProblem[], total: d.total };
}

function filesOf(details: unknown): string[] {
  const files = (details as { files?: unknown } | null)?.files;
  return Array.isArray(files) ? files.filter((f): f is string => typeof f === 'string') : [];
}

export function uploadMessage(error: ApiError): string {
  switch (error.code) {
    case 'ZIP_ENTRY_COUNT': {
      const files = filesOf(error.details);
      return files.length === 0
        ? 'The ZIP must hold exactly one text file. This one holds none.'
        : `The ZIP must hold exactly one text file. This one holds ${files.length}: ${files.join(', ')}.`;
    }
    case 'ZIP_NOT_TEXT': {
      const file = (error.details as { file?: unknown } | null)?.file;
      return `The file in the ZIP${typeof file === 'string' ? ` (${file})` : ''} must be a UTF-8 .txt file of at most 5 MiB.`;
    }
    case 'ZIP_INVALID':
      return 'That file is not a ZIP that can be opened.';
    case 'FILE_EMPTY':
      return 'The text file has no locations in it.';
    case 'FILE_ROWS_INVALID': {
      const rows = rowsOf(error.details);
      const first = rows?.rows[0];
      if (!rows || !first) return 'Some lines in the text file are not valid locations.';
      const more = rows.total > 1 ? `, and ${rows.total - 1} more` : '';
      return `Line ${first.line}: ${first.reason}${more}. Nothing was imported.`;
    }
    case 'PAYLOAD_TOO_LARGE': {
      const limit = (error.details as { limitBytes?: unknown } | null)?.limitBytes;
      const mib = typeof limit === 'number' ? `${Math.round(limit / (1024 * 1024))} MiB` : '1 MiB';
      return `The ZIP is larger than ${mib}.`;
    }
    case 'RATE_LIMITED':
      return 'Too many uploads. Try again in a minute.';
    case 'NETWORK':
      return 'Network error. Check your connection and try again.';
    default:
      return 'The upload failed. Please try again.';
  }
}
