// Every relative Markdown link in the docs and agent files points at a file that exists, and
// no link is an absolute machine path (C:\..., /home/...). Every requirement row with a Proof
// column in docs/REQUIREMENTS.md names at least one file that exists: a test or spec by file name,
// or a path (#13). Run: node scripts/check-docs.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const skip = new Set(['node_modules', '.git', 'dist', 'state']);

function* markdownFiles(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* markdownFiles(full);
    else if (name.endsWith('.md')) yield full;
  }
}

const problems = [];
for (const file of markdownFiles(root)) {
  const text = readFileSync(file, 'utf8');
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const rel = path.relative(root, file);
    if (/^([a-zA-Z]:[\\/]|\/)/.test(target)) {
      problems.push(`${rel}: absolute path link ${target}`);
      continue;
    }
    const resolved = path.resolve(path.dirname(file), target.split('#')[0]);
    if (!existsSync(resolved)) problems.push(`${rel}: broken link ${target}`);
  }
}
// Requirement proofs (#13): `name.test.ts`, `name.spec.ts` or a repository path, in backticks.
const filesByName = new Map();
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else filesByName.set(name, (filesByName.get(name) ?? 0) + 1);
  }
})(root);
const reqText = readFileSync(path.join(root, 'docs', 'REQUIREMENTS.md'), 'utf8');
let proofColumn = -1;
for (const line of reqText.split(/\r?\n/)) {
  if (line.startsWith('| Id |')) {
    proofColumn = line.split('|').map((c) => c.trim()).indexOf('Proof');
    continue;
  }
  const id = /^\| (R\d+) \|/.exec(line)?.[1];
  if (!id || proofColumn < 0) continue;
  const proof = line.split('|').map((c) => c.trim())[proofColumn] ?? '';
  const named = [...proof.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((n) => /\.(test|spec)\.tsx?$|\//.test(n));
  if (named.length === 0) {
    problems.push(`docs/REQUIREMENTS.md: ${id} names no test or file in Proof (${proof})`);
    continue;
  }
  for (const n of named) {
    const found = n.includes('/') ? existsSync(path.join(root, n)) : filesByName.has(path.basename(n));
    if (!found) problems.push(`docs/REQUIREMENTS.md: ${id} names missing proof ${n}`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('docs: links ok; every requirement names its proof');
