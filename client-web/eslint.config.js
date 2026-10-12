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
        // No fixed waits. A sleep is a guess about how long the platform
        // takes — right on one machine, wrong on the next — and every flaky
        // red in this suite's history started as one. Wait for the thing
        // itself: a web-first `expect(locator)…`, `expect.poll`, `expect(…)
        // .toPass`, `locator.waitFor`, `page.waitForURL/Response`. The one
        // legitimate sleep is a NEGATIVE settle window ("nothing arrives for
        // N seconds") derived from a product constant — mark it with
        // `// eslint-disable-next-line no-restricted-syntax -- <why>` so the
        // reason is reviewed. See docs/e2e-conventions.md.
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message:
            'No fixed waits (page.waitForTimeout). Wait for a condition instead — see docs/e2e-conventions.md § Waiting.',
        },
        {
          selector: "CallExpression[callee.name='delay']",
          message:
            'No fixed waits (delay()). Wait for a condition instead — see docs/e2e-conventions.md § Waiting.',
        },
        // `waitUntil: 'networkidle'` never settles on a page that keeps a
        // subscription or poll open — which every authenticated Alkemio page
        // does — so it burns the whole budget on a slow environment.
        {
          selector: "Property[key.name='waitUntil'][value.value='networkidle']",
          message:
            "Do not wait for 'networkidle' — authenticated pages never go idle. Wait for the element the test needs.",
        },
        {
          selector: "CallExpression[callee.property.name='waitForLoadState'][arguments.0.value='networkidle']",
          message:
            "Do not wait for 'networkidle' — authenticated pages never go idle. Wait for the element the test needs.",
        },
      ],
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**'],
  },
];
