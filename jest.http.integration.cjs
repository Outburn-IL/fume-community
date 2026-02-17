module.exports = {
  globalSetup: './tests/setup.ts',
  globalTeardown: './tests/teardown.ts',
  testTimeout: 10000,
  roots: ['<rootDir>/tests'],
  // Ignore local cached FHIR packages to prevent jest-haste-map naming collisions
  modulePathIgnorePatterns: ['<rootDir>/tests/.fhir-packages'],
  testPathIgnorePatterns: ['<rootDir>/tests/.fhir-packages', '<rootDir>/tests/nodeOnly'],
  verbose: false,
  silent: false,
  errorOnDeprecated: false,
  noStackTrace: true
};
