import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as shared from '../src/index';

const apiDocPath = path.resolve(__dirname, '../../../docs/API.md');

type HttpExample = {
  index: number;
  schemaName: string | undefined;
  bodyText: string;
};

function extractHttpExamples(markdown: string): HttpExample[] {
  const blockRe = /(?:<!--\s*schema:\s*([A-Za-z0-9_]+)\s*-->\s*\r?\n)?```http\r?\n([\s\S]*?)```/g;
  const examples: HttpExample[] = [];
  let index = 0;

  for (const match of markdown.matchAll(blockRe)) {
    index += 1;
    const schemaName = match[1];
    const block = match[2]!;
    const separatorMatch = /\r?\n\r?\n/.exec(block);
    if (!separatorMatch) continue;
    const bodyText = block.slice(separatorMatch.index + separatorMatch[0].length).trim();
    if (!bodyText) continue;
    examples.push({ index, schemaName, bodyText });
  }

  return examples;
}

describe('docs/API.md JSON examples', () => {
  it('every http JSON body has a schema marker and parses with its @lm/shared schema', () => {
    const markdown = readFileSync(apiDocPath, 'utf8');
    const examples = extractHttpExamples(markdown);
    expect(examples.length).toBeGreaterThanOrEqual(3);

    for (const ex of examples) {
      expect(ex.schemaName, `http block #${ex.index} is missing <!-- schema: <Name> -->`).toBeDefined();
      const candidate = (shared as Record<string, unknown>)[ex.schemaName!];
      expect(
        candidate instanceof z.ZodType,
        `http block #${ex.index} names unknown schema ${ex.schemaName}`,
      ).toBe(true);
      const schema = candidate as z.ZodType;
      const json: unknown = JSON.parse(ex.bodyText);
      const parsed = schema.safeParse(json);
      expect(
        parsed.success,
        `http block #${ex.index} (${ex.schemaName}) failed schema check: ${parsed.success ? '' : parsed.error.message}`,
      ).toBe(true);
    }
  });
});
