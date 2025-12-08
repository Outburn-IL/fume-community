
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'simple-import-sort',
    '@stylistic/eslint-plugin-js',
    'eslint-plugin-header'
  ],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        project: './tsconfig.json'
      },
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': 'warn',
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        '@stylistic/js/no-multiple-empty-lines': [2, { max: 2, maxBOF: 0 }],
        'header/header': [2, '.header'],
        'no-extra-semi': 'error'
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    semi: ['warn', 'always']
  }
};
