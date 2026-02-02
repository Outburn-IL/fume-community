const js = require('@eslint/js');
const globals = require('globals');

const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const stylistic = require('@stylistic/eslint-plugin');
const header = require('eslint-plugin-header');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'tests/.fhir-packages/**',
      '**/hapi.postgress.data/**'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        ...globals.es2021,
        ...globals.node,
        ...globals.browser
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'simple-import-sort': simpleImportSort,
      '@stylistic': stylistic,
      header
    },
    rules: {
      ...tseslint.configs.recommended.rules,

      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',

      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      '@stylistic/no-multiple-empty-lines': [2, { max: 2, maxBOF: 0 }],
      'header/header': 'off',

      'no-extra-semi': 'error',
      semi: ['warn', 'always']
    }
  }
];
