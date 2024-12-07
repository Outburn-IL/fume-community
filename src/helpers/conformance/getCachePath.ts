/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { getLogger } from '../logger';

export const getCachePath = (innerFolder = '') => {
  const cachePath = path.join(os.homedir(), '.fhir', innerFolder);
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
    getLogger().info(`Directory '${cachePath}' created successfully.`);
  }
  return cachePath;
};

export const getCachePackagesPath = () => {
  return getCachePath('packages');
};

export const getFumeIndexFilePath = () => {
  return path.join(path.resolve('.'), 'fhirPackageIndex.json');
};
