/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { test } from '@jest/globals';

import config from './config';

const serverDefaults = {
  EXCLUDE_FHIR_PACKAGES: '',
  FHIR_PACKAGES: 'il.core.fhir.r4@0.11.0,hl7.fhir.us.core@6.0.0,fhir.outburn.co.il@0.0.1,laniado.test.fhir.r4',
  FHIR_SERVER_AUTH_TYPE: 'NONE',
  FHIR_SERVER_BASE: 'http://hapi-fhir.outburn.co.il/fhir',
  FHIR_SERVER_PW: '',
  FHIR_SERVER_TIMEOUT: 10000,
  FHIR_SERVER_UN: '',
  FHIR_VERSION: '4.0.1',
  SEARCH_BUNDLE_PAGE_SIZE: 20,
  SERVER_PORT: 42420,
  SERVER_STATELESS: false
};

jest.mock('./serverConfig', () => (serverDefaults));

describe('setServerConfig', () => {
  test('Uses defaults', async () => {
    config.setServerConfig({});
    expect(config.getServerConfig()).toEqual({
      ...serverDefaults,
      FHIR_SERVER_BASE: '',
      SERVER_STATELESS: true
    });
  });

  test('Uses defaults, with FHIR_SERVER_BASE, sets stateless to false', async () => {
    config.setServerConfig({
      FHIR_SERVER_BASE: 'http://hapi-fhir.outburn.co.il/fhir-test   '
    });
    expect(config.getServerConfig()).toEqual({
      EXCLUDE_FHIR_PACKAGES: '',
      FHIR_PACKAGES: 'il.core.fhir.r4@0.11.0,hl7.fhir.us.core@6.0.0,fhir.outburn.co.il@0.0.1,laniado.test.fhir.r4',
      FHIR_SERVER_AUTH_TYPE: 'NONE',
      FHIR_SERVER_BASE: 'http://hapi-fhir.outburn.co.il/fhir-test',
      FHIR_SERVER_PW: '',
      FHIR_SERVER_TIMEOUT: 10000,
      FHIR_SERVER_UN: '',
      FHIR_VERSION: '4.0.1',
      SEARCH_BUNDLE_PAGE_SIZE: 20,
      SERVER_PORT: 42420,
      SERVER_STATELESS: false
    });
  });

  test('Uses defaults, without FHIR_SERVER_BASE, sets stateless to true', async () => {
    config.setServerConfig({
      SERVER_STATELESS: false
    });
    expect(config.getServerConfig()).toEqual({
      EXCLUDE_FHIR_PACKAGES: '',
      FHIR_PACKAGES: 'il.core.fhir.r4@0.11.0,hl7.fhir.us.core@6.0.0,fhir.outburn.co.il@0.0.1,laniado.test.fhir.r4',
      FHIR_SERVER_AUTH_TYPE: 'NONE',
      FHIR_SERVER_BASE: '',
      FHIR_SERVER_PW: '',
      FHIR_SERVER_TIMEOUT: 10000,
      FHIR_SERVER_UN: '',
      FHIR_VERSION: '4.0.1',
      SEARCH_BUNDLE_PAGE_SIZE: 20,
      SERVER_PORT: 42420,
      SERVER_STATELESS: true
    });
  });
});
