/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { loadPackages } from './loadPackages';
import { test } from '@jest/globals';
import mockAxios from 'jest-mock-axios';

import * as fpl from 'fhir-package-loader';
jest.mock('fhir-package-loader');
const mockFpl = jest.mocked(fpl, { shallow: true });

describe('loadPackages', () => {
  afterEach(() => {
    mockAxios.reset();
    jest.resetAllMocks();
  });

  test('Load empty list of packages asa', async () => {
    await loadPackages([], [], []);
    mockFpl.fpl.mockResolvedValue({} as any);
    expect(mockFpl.fpl).toHaveBeenCalledTimes(1);
    expect(mockFpl.fpl).toHaveBeenCalledWith([], { log: expect.any(Function) });
  });

  test('Excludes packages in exclude list', async () => {
    await loadPackages(['il.core.fhir.r4@0.11.0', 'hl7.fhir.us.core'], [], ['hl7.fhir.us.core']);

    mockFpl.fpl.mockResolvedValue({} as any);
    expect(mockFpl.fpl).toHaveBeenCalledTimes(1);
    expect(mockFpl.fpl).toHaveBeenCalledWith(['il.core.fhir.r4@0.11.0'], { log: expect.any(Function) });
  });

  test('Fetches versions only for packages without version', async () => {
    mockAxios.get.mockResolvedValue({ data: { 'dist-tags': { latest: '6.1.0' } } });
    await loadPackages(['il.core.fhir.r4@0.11.0', 'hl7.fhir.us.core'], [], []);
    expect(mockAxios.get).toHaveBeenCalledTimes(1);
    expect(mockAxios.get).toHaveBeenCalledWith('https://packages.fhir.org/hl7.fhir.us.core/');

    mockFpl.fpl.mockResolvedValue({} as any);
    expect(mockFpl.fpl).toHaveBeenCalledTimes(1);
    expect(mockFpl.fpl).toHaveBeenCalledWith(['il.core.fhir.r4@0.11.0', 'hl7.fhir.us.core@6.1.0'], { log: expect.any(Function) });
  });

  test('Ignores package if version not found', async () => {
    mockAxios.get.mockResolvedValue({ data: {} });
    await loadPackages(['bad.package.name'], [], []);
    expect(mockAxios.get).toHaveBeenCalledTimes(1);
    expect(mockAxios.get).toHaveBeenCalledWith('https://packages.fhir.org/bad.package.name/');

    mockFpl.fpl.mockResolvedValue({} as any);
    expect(mockFpl.fpl).toHaveBeenCalledTimes(1);
    expect(mockFpl.fpl).toHaveBeenCalledWith([], { log: expect.any(Function) });
  });

  test('Ignores duplicate package names', async () => {
    mockAxios.get.mockResolvedValue({ data: {} });
    await loadPackages(['il.core.fhir.r4@0.11.0'], ['il.core.fhir.r4@0.11.0'], []);

    mockFpl.fpl.mockResolvedValue({} as any);
    expect(mockFpl.fpl).toHaveBeenCalledTimes(1);
    expect(mockFpl.fpl).toHaveBeenCalledWith(['il.core.fhir.r4@0.11.0'], { log: expect.any(Function) });
  });
});
