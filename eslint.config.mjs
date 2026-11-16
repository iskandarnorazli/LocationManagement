// Lint is how the architecture (docs/ARCHITECTURE.md D17-D20) is enforced, not just described.
// Every rule below names the decision it protects; an agent that breaks one fails CI.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// D18: time and randomness come from injected ports, so tests replay exactly.
const determinism = [
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: 'Use the injected Clock (apps/api/src/ports.ts), not Date.now() (D18).',
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: 'Use the injected Clock, not new Date() (D18). new Date(ms) to format is fine.',
  },
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
    message: 'Use an injected or seeded source, not Math.random() (D18).',
  },
];

// docs/ERRORS.md: handlers throw AppError; only http/errorHandler.ts writes error bodies.
const oneErrorWriter = {
  selector:
    "CallExpression[callee.property.name='json'][callee.object.callee.property.name='status'][callee.object.arguments.0.value>=400]",
  message: 'Throw AppError; only http/errorHandler.ts writes error responses (docs/ERRORS.md).',
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // ---------- API (apps/api/src)
  {
    files: ['apps/api/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', oneErrorWriter, ...determinism],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'pg',
              allowTypeImports: true,
              message: 'Only db/pool.ts creates a pool; features receive Deps.db (D17). Type imports are fine.',
            },
            {
              name: 'node:crypto',
              importNames: ['randomUUID'],
              message: 'Use the injected Ids port (apps/api/src/ports.ts) (D18).',
            },
          ],
          patterns: [
            {
              group: ['**/auth/*', '**/locations/*', '**/import/*'],
              message: 'Import a feature through its index (../auth, ../locations, ../import), never its files (D17).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/http/errorHandler.ts'],
    rules: { 'no-restricted-syntax': ['error', ...determinism] },
  },
  {
    files: ['apps/api/src/ports.ts'],
    rules: { 'no-restricted-syntax': 'off', '@typescript-eslint/no-restricted-imports': 'off' },
  },
  {
    files: ['apps/api/src/db/pool.ts'],
    rules: { '@typescript-eslint/no-restricted-imports': 'off' },
  },

  // ---------- Web (apps/web/src)
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', 'apps/web/src/test/**'],
    rules: {
      'no-restricted-syntax': ['error', ...determinism],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Only apps/web/src/api/client.ts calls fetch (docs/ERRORS.md).' },
      ],
    },
  },
  {
    files: ['apps/web/src/api/client.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
);
