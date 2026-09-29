const globals = require('globals');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const prettier = require('eslint-plugin-prettier');

const env = (prod, dev) => (process.env.NODE_ENV === 'production' ? prod : dev);

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
      prettier,
    },
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-console': env(1, 0),
      'no-debugger': env(1, 0),
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        env(2, 1),
        {
          argsIgnorePattern: '^_',
        },
      ],
      'no-multiple-empty-lines': 'error',
      // Never type a password through `Locator.fill`: reporters record it as
      // a step titled `Fill "<value>" <locator>`, and the nightly report is
      // published to the PUBLIC gh-pages site. Use `fillSecret` from
      // src/functional-e2e/helpers/login.helper.ts instead. The selectors
      // catch (a) a password-ish argument (identifier, property, or template
      // literal containing one) and (b) a password-named locator receiver.
      'no-restricted-syntax': [
        'error',
        ...[
          "CallExpression[callee.property.name='fill'][arguments.0.name=/[Pp]ass(word|wd)|PASSWORD|[Ss]ecret/]",
          "CallExpression[callee.property.name='fill'][arguments.0.property.name=/[Pp]ass(word|wd)|PASSWORD|[Ss]ecret/]",
          "CallExpression[callee.property.name='fill'][arguments.0.type='TemplateLiteral'] Identifier[name=/[Pp]ass(word|wd)|PASSWORD|[Ss]ecret/]",
          "CallExpression[callee.property.name='fill'][callee.object.name=/[Pp]assword/]",
          "CallExpression[callee.property.name='fill'][callee.object.callee.name=/[Pp]assword/]",
          "CallExpression[callee.property.name='fill'][callee.object.callee.property.name=/^getBy/][callee.object.arguments.0.value=/[Pp]assword/]",
          "CallExpression[callee.property.name='fill'][callee.object.callee.property.name=/^getBy/][callee.object.arguments.1.properties.0.value.value=/[Pp]assword/]",
          "CallExpression[callee.property.name='fill'][callee.object.callee.property.name=/^getBy/][callee.object.arguments.1.properties.1.value.value=/[Pp]assword/]",
        ].map(selector => ({
          selector,
          message:
            'Do not pass a password through Locator.fill — it is published in the report step title. Use fillSecret() from helpers/login.helper.ts.',
        })),
      ],
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**'],
  },
];
