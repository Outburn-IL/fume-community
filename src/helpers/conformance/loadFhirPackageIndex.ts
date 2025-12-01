/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import fs from 'fs-extra';
import path from 'path';

import config from '../../config';
import expressions from '../jsonataExpression';
import { getLogger } from '../logger';
import { omitKeys } from '../objectFunctions';
import { isNumeric } from '../stringFunctions';
import { getFpiInstance } from './fpiInstance';

export type IFhirPackage = any;
export type IFhirPackageIndex = Record<string, IFhirPackage>;
let fhirPackageIndex: IFhirPackageIndex = {};

const getFumeIndexFilePath = () => {
  return path.join(path.resolve('.'), 'fhirPackageIndex.json');
};

const buildFhirCacheIndex = async () => {
  getLogger().info('Building global package index (this might take some time...)');
  const loadedPackageLabels = Object.keys(config.getFhirPackages());
  getLogger().info(`FHIR Packages to index: ${loadedPackageLabels.join(', ')}`);
  const packageIndexArray = (await Promise.all(loadedPackageLabels.map(async key => {
    const manifest = { ...config.getFhirPackages()[key] };
    const packPath = manifest.installedPath;
    const packageIndex = manifest['.index.json'];
    delete manifest.installedPath;
    delete manifest['.index.json'];
    if (packPath && Object.keys(manifest).length > 0) {
      return {
        package: path.basename(packPath),
        path: path.join(packPath, 'package'),
        packageManifest: manifest,
        packageIndex
      };
    } else {
      getLogger().warn(`Package '${key}' is invalid (no package.json file found). Skipping it...`);
      return undefined;
    };
  }))).filter(Boolean);

  const bindings = {
    omitKeys,
    pathJoin: path.join,
    isNumeric
  };
  const packageIndexObject = await (await expressions).createRawPackageIndexObject.evaluate(packageIndexArray, bindings);

  const fixedIndex = await (await expressions).fixPackageIndexObject.evaluate(packageIndexObject, { isNumeric });

  // attach metadata so we can detect cache path changes and regenerate automatically
  const cachePath = getFpiInstance().getCachePath();
  const meta = {
    cachePath,
    generatedAt: new Date().toISOString(),
    packageCount: loadedPackageLabels.length
  };
  return { _meta: meta, ...fixedIndex };
};

const parseFhirPackageIndex = async (): Promise<IFhirPackageIndex> => {
  const fumeIndexPath = getFumeIndexFilePath();
  if (fs.existsSync(fumeIndexPath)) {
    getLogger().info(`Found global package index file at ${fumeIndexPath}`);
    const dirList = Object.keys(config.getFhirPackages()).map(k => {
      const packPath = config.getFhirPackages()[k].installedPath;
      return packPath ? path.basename(packPath) : undefined;
    }).filter(p => typeof p === 'string');
    try {
      const fileContent = await fs.readFile(fumeIndexPath, { encoding: 'utf8' });
      if (!fileContent || fileContent.trim().length === 0) {
        getLogger().warn('Global package index file is empty. It will be regenerated.');
      } else {
        const currentIndex = JSON.parse(fileContent);
        // Check for cache path metadata; if missing or different we must rebuild
        const expectedCachePath = path.resolve(getFpiInstance().getCachePath());
        const existingCachePath = path.resolve(currentIndex?._meta?.cachePath);
        if (!existingCachePath) {
          getLogger().info('Global package index file missing cache path metadata; regenerating.');
        } else if (existingCachePath !== expectedCachePath) {
          getLogger().info(`Global package index cache path differs (index=${existingCachePath}, expected=${expectedCachePath}); regenerating.`);
        } else {
          const currentPackages = await (await expressions).extractCurrentPackagesFromIndex.evaluate(currentIndex);
          const diff: string[] = await (await expressions).checkPackagesMissingFromIndex.evaluate({ dirList, packages: currentPackages });
          if (diff.length === 0) {
            getLogger().info('Global package index file is up-to-date');
            return currentIndex;
          } else {
            getLogger().info('Global package index file is outdated (package diff detected)');
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      getLogger().warn(`Global package index file could not be parsed and will be regenerated: ${msg}`);
    }
  } else {
    getLogger().info('Global package index file is missing');
  }
  const fumeIndexFile = await buildFhirCacheIndex();
  await fs.writeFile(fumeIndexPath, JSON.stringify(fumeIndexFile, null, 2));
  return fumeIndexFile;
};

export const getFhirPackageIndex = (): IFhirPackageIndex => fhirPackageIndex;

export const loadFhirPackageIndex = async () => {
  try {
    getLogger().info('Trying to load global package index...');
    const index = await parseFhirPackageIndex();
    fhirPackageIndex = index;
    return true;
  } catch (e) {
    getLogger().error(e);
    throw (e);
  }
};
