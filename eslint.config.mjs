import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

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
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['apps/api/src/**/*.ts'],
    rules: {
      // D7 and ERRORS.md: handlers throw AppError; only the error middleware writes error bodies.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='json'][callee.object.callee.property.name='status'][callee.object.arguments.0.value>=400]",
          message: 'Throw AppError; only http/errorHandler.ts writes error responses (docs/ERRORS.md).',
        },
      ],
    },
  },
  {
    files: ['apps/api/src/http/errorHandler.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
