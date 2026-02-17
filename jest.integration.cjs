module.exports = {
  globalSetup: './tests/setup.ts',
  globalTeardown: './tests/teardown.ts',
  testTimeout: 10000,
  roots: ['<rootDir>/tests'],
  // Ignore local cached FHIR packages to prevent jest-haste-map naming collisions
  modulePathIgnorePatterns: ['<rootDir>/tests/.fhir-packages'],
  testPathIgnorePatterns: ['<rootDir>/tests/.fhir-packages'],
  // Reduce verbosity
  verbose: false,
  silent: false,
  // Limit error output
  errorOnDeprecated: false,
  // Show only first few lines of stack traces
  noStackTrace: true
};
