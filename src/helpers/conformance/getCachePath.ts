/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

export const getCachePath = (innerFolder = '') => {
  const cachePath = path.join(os.homedir(), '.fhir', innerFolder);
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
    console.log(`Directory '${cachePath}' created successfully.`);
  }
  return cachePath;
};

export const getCachePackagesPath = () => {
  return getCachePath('packages');
};

export const getCachedPackageDirs = () => {
  const cachePath = getCachePackagesPath();
  return fs.readdirSync(cachePath, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(dir => dir.name);
};

export const getFumeIndexFilePath = () => {
  return path.join(getCachePath(), 'fume.index.json');
};
