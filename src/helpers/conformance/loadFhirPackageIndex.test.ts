/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { test } from '@jest/globals';
import * as fs from 'fs';
import os from 'os';
import path from 'path';

import { loadFhirPackageIndex } from './loadFhirPackageIndex';
jest.mock('fs');

describe('loadFhirPackageIndex', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test.skip('Creates the cache folder if it does not exist', async () => {
    let counter = 0;
    (fs.existsSync as jest.Mock).mockImplementation((name: string) => {
      if (name.includes('fhirPackageIndex.json')) {
        return false;
      }
      if (counter === 0) {
        counter++;
        return false;
      }
      return true;
    });
    (fs.mkdirSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    await loadFhirPackageIndex();
    expect(fs.mkdirSync).toHaveBeenCalledTimes(1);
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join(os.homedir(), '.fhir', 'packages'), { recursive: true });
  });

  test.skip('Doesnt create the cache folder if it exists', async () => {
    (fs.existsSync as jest.Mock).mockImplementation((name: string) => {
      if (name.includes('fhirPackageIndex.json')) {
        return false;
      }
      return true;
    });
    (fs.mkdirSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
    await loadFhirPackageIndex();
    expect(fs.mkdirSync).toHaveBeenCalledTimes(0);
  });
});
