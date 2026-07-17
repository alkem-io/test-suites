const globals = require('globals');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: tsparser,
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Note: lib/src predates the eslint9 modernization and is written in
      // double-quote style throughout; unlike client-web/server-api this
      // package does not enforce `quotes` (workspace#019-typescript-7-upgrade
      // T041 — toolchain modernization only, not a style rewrite).
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
        },
      ],
      'no-multiple-empty-lines': 'error',
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**'],
  },
];
