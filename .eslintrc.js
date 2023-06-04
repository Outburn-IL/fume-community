module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: 'standard-with-typescript',
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        project: './tsconfig.json'
      },
      rules: {
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/semi': ['error', 'always'],
        '@typescript-eslint/quotes': ['error', 'single'],
        '@typescript-eslint/indent': ['error', 2],
        '@typescript-eslint/explicit-function-return-type': 'off'
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
