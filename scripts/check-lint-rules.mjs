// The lint rules that enforce the architecture (docs/ARCHITECTURE.md, D20) are themselves
// tested: each case below is code at a path; a "bad" case must be reported with the given
// message, an "ok" case must get no report from the restriction rules. A rule that stops
// firing (a typo in a selector, a config block that overrides another) fails here.
// Run: node scripts/check-lint-rules.mjs
import { ESLint } from 'eslint';

const RESTRICTIONS = new Set([
  'no-restricted-syntax',
  'no-restricted-globals',
  'no-restricted-imports',
  '@typescript-eslint/no-restricted-imports',
]);

const cases = [
  ['bad', 'apps/api/src/import/case.ts', "import { hashPassword } from '../auth/password';\nexport const f = hashPassword;\n", 'Import a feature through its index'],
  ['ok', 'apps/api/src/import/case.ts', "import { requireAuth } from '../auth';\nexport const f = requireAuth;\n"],
  ['bad', 'apps/api/src/locations/case.ts', "import pg from 'pg';\nexport const p = pg;\n", 'Only db/pool.ts creates a pool'],
  ['ok', 'apps/api/src/locations/case.ts', "import type { Pool } from 'pg';\nexport type P = Pool;\n"],
  ['bad', 'apps/api/src/auth/case.ts', 'export const t = Date.now();\n', 'not Date.now()'],
  ['bad', 'apps/api/src/auth/case.ts', 'export const d = new Date();\n', 'not new Date()'],
  ['ok', 'apps/api/src/auth/case.ts', 'export const d = new Date(0).toISOString();\n'],
  ['bad', 'apps/api/src/auth/case.ts', 'export const r = Math.random();\n', 'not Math.random()'],
  ['bad', 'apps/api/src/auth/case.ts', "import { randomUUID } from 'node:crypto';\nexport const u = randomUUID;\n", 'Use the injected Ids port'],
  ['ok', 'apps/api/src/auth/case.ts', "import { randomBytes } from 'node:crypto';\nexport const b = randomBytes;\n"],
  ['bad', 'apps/api/src/locations/case.ts', 'export function h(res: { status(n: number): { json(b: unknown): void } }) {\n  res.status(400).json({});\n}\n', 'Throw AppError'],
  ['ok', 'apps/api/src/locations/case.ts', 'export function h(res: { status(n: number): { json(b: unknown): void } }) {\n  res.status(201).json({});\n}\n'],
  ['ok', 'apps/api/src/ports.ts', 'export const t = Date.now();\n'],
  ['bad', 'apps/web/src/upload/case.ts', "export const r = fetch('/api/x');\n", 'Only apps/web/src/api/client.ts calls fetch'],
  ['ok', 'apps/web/src/api/client.ts', "export const r = fetch('/api/x');\n"],
  ['bad', 'apps/web/src/upload/case.ts', 'export const t = Date.now();\n', 'not Date.now()'],
];

const eslint = new ESLint();
let failures = 0;
for (const [kind, filePath, code, expected] of cases) {
  const [result] = await eslint.lintText(code, { filePath });
  const msgs = (result?.messages ?? []).filter((m) => m.ruleId && RESTRICTIONS.has(m.ruleId));
  const ok = kind === 'bad' ? msgs.some((m) => m.message.includes(expected)) : msgs.length === 0;
  if (!ok) {
    failures += 1;
    const got = msgs.map((m) => `${m.ruleId}: ${m.message}`).join(' | ') || 'no restriction reported';
    console.error(`FAIL ${kind} ${filePath}: expected ${kind === 'bad' ? `"${expected}"` : 'no report'}; got ${got}`);
  }
}
if (failures) process.exit(1);
console.log(`lint rules: ${cases.length} cases behave as D20 says`);
