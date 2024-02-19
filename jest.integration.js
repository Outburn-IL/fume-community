module.exports = {
  globalSetup: './tests/setup.ts',
  globalTeardown: './tests/teardown.ts',
  testPathIgnorePatterns: ['dist/*'],
  testMatch: ['<rootDir>/tests/**/*.test.ts']
};
