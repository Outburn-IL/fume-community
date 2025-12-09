/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { test } from '@jest/globals';
import mockAxios from 'jest-mock-axios';

import config from '../../config';
import { FhirClient } from './client';

const mockConfig = {
  FHIR_SERVER_BASE: 'test.com',
  FHIR_SERVER_TIMEOUT: 1000,
  SERVER_PORT: 111,
  FHIR_SERVER_AUTH_TYPE: '',
  FHIR_SERVER_UN: '',
  FHIR_SERVER_PW: '',
  SERVER_STATELESS: false,
  FHIR_VERSION: '4.0.1',
  FHIR_PACKAGES: ''
};

describe('FhirClient', () => {
  let mockAxiosInstance: jest.Mocked<any>;

  afterEach(() => {
    jest.resetAllMocks();
    mockAxios.reset();
  });

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()

    } as any;
    mockAxios.create.mockReturnValue(mockAxiosInstance);
  });

  test('constructor uses config, no auth, stateless = false', async () => {
    config.setServerConfig(mockConfig);
    /* eslint-disable no-new */
    new FhirClient();

    expect(mockAxios.create).toHaveBeenCalledWith({
      baseURL: mockConfig.FHIR_SERVER_BASE,
      timeout: mockConfig.FHIR_SERVER_TIMEOUT,
      headers: {
        Accept: 'application/fhir+json;fhirVersion=4.0',
        'Content-Type': 'application/fhir+json;fhirVersion=4.0',
        Authorization: undefined
      }
    });
  });

  test('constructor uses config, with BASIC auth, stateless = false', async () => {
    config.setServerConfig({
      ...mockConfig,
      FHIR_SERVER_AUTH_TYPE: 'BASIC',
      FHIR_SERVER_UN: 'user',
      FHIR_SERVER_PW: 'pw'
    });
    /* eslint-disable no-new */
    new FhirClient();

    expect(mockAxios.create).toHaveBeenCalledWith({
      baseURL: mockConfig.FHIR_SERVER_BASE,
      timeout: mockConfig.FHIR_SERVER_TIMEOUT,
      headers: {
        Accept: 'application/fhir+json;fhirVersion=4.0',
        'Content-Type': 'application/fhir+json;fhirVersion=4.0',
        Authorization: 'Basic dXNlcjpwdw=='
      }
    });
  });

  test('constructor uses config, no auth, stateless = false', async () => {
    config.setServerConfig({
      ...mockConfig,
      SERVER_STATELESS: true
    });

    /* eslint-disable no-new */
    new FhirClient();

    expect(mockAxios.create).not.toHaveBeenCalled();
  });

  test('read returns empty in stateless mode', async () => {
    config.setServerConfig({
      ...mockConfig,
      SERVER_STATELESS: true
    });
    const client = new FhirClient();
    const url = 'test';
    const res = await client.read(url);
    expect(res).toBeUndefined();
    expect(mockAxios.get).not.toHaveBeenCalled();
  });

  test('read returns response data', async () => {
    config.setServerConfig(mockConfig);
    const client = new FhirClient();
    const url = 'test-url';
    mockAxiosInstance.get.mockResolvedValue({ data: 'test' });
    const response = await client.read(url);
    expect(response).toBe('test');
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(url);
  });

  test('search returns empty in stateless mode', async () => {
    config.setServerConfig({
      ...mockConfig,
      SERVER_STATELESS: true
    });
    const client = new FhirClient();
    const url = 'test';
    const res = await client.search(url);
    expect(res).toBeUndefined();
    expect(mockAxios.get).not.toHaveBeenCalled();
  });

  test('search returns response data', async () => {
    config.setServerConfig({
      ...mockConfig,
    });
    const client = new FhirClient();
    const url = 'test-url';
    mockAxiosInstance.get.mockResolvedValue({ data: 'test' });
    const response = await client.search(url, { test: 'test-param' });
    expect(response).toBe('test');

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test-url', { params: { _count: 45, test: 'test-param' } });
  });

  test('create throws error in community', async () => {
    config.setServerConfig({
      ...mockConfig,
      SERVER_STATELESS: true
    });
    const client = new FhirClient();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(client.create({}, 'test')).rejects.toThrow('Method not implemented.');
  });

  test('update throws error in community', async () => {
    config.setServerConfig({
      ...mockConfig,
      SERVER_STATELESS: true
    });
    const client = new FhirClient();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(client.update('test', 'test', {})).rejects.toThrow('Method not implemented.');
  });

  test('simpleDelete throws error in community', async () => {
    config.setServerConfig({
      ...mockConfig,
      SERVER_STATELESS: true
    });
    const client = new FhirClient();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    expect(client.simpleDelete('test', 'test')).rejects.toThrow('Method not implemented.');
  });
});
