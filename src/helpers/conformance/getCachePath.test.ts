/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { test } from '@jest/globals';
import * as fs from 'fs';
import os from 'os';
import path from 'path';

import { getCachedPackageDirs, getCachePath } from './getCachePath';
jest.mock('fs');

describe('Cache paths', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Creates the getCachePath folder if it does not exist', async () => {
    let counter = 0;
    (fs.existsSync as jest.Mock).mockImplementation(() => {
      if (counter === 0) {
        counter++;
        return false;
      }
      return true;
    });
    (fs.mkdirSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    await getCachePath();
    expect(fs.mkdirSync).toHaveBeenCalledTimes(1);
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(os.homedir(), '.fhir'), { recursive: true });
  });

  test('Doesnt create the cache folder if it exists', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    await getCachePath();
    expect(fs.mkdirSync).toHaveBeenCalledTimes(0);
  });

  test('empty getCachedPackageDirs', async () => {
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    const dirs = getCachedPackageDirs();
    expect(dirs).toHaveLength(0);
  });

  test('getCachedPackageDirs with folders', async () => {
    (fs.readdirSync as jest.Mock).mockReturnValue([{
      isDirectory: () => true,
      name: 'test'
    }]);
    const dirs = getCachedPackageDirs();
    expect(dirs).toHaveLength(1);
    expect(dirs[0]).toBe('test');
  });

  test('getCachedPackageDirs with non folder', async () => {
    (fs.readdirSync as jest.Mock).mockReturnValue([{
      isDirectory: () => false,
      name: 'test'
    }]);
    const dirs = getCachedPackageDirs();
    expect(dirs).toHaveLength(0);
  });
});
