/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import fs from 'fs-extra';
import path from 'path';

import expressions from '../jsonataExpression';
import { getLogger } from '../logger';
import { omitKeys } from '../objectFunctions';
import { isNumeric } from '../stringFunctions';
import { getCachedPackageDirs, getCachePackagesPath, getFumeIndexFilePath } from './getCachePath';

export type IFhirPackage = any;
export type IFhirPackageIndex = Record<string, IFhirPackage>;
let fhirPackageIndex: IFhirPackageIndex = {};

const createPackageIndexFile = (packagePath: string) => {
  try {
    const fileList = fs.readdirSync(path.join(packagePath, 'package'));
    const files = fileList.flatMap((file: string) => {
      if (file.endsWith('.json') && file !== 'package.json') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const content = require(path.join(packagePath, 'package', file));
        const indexEntry = {
          filename: file,
          resourceType: content.resourceType,
          id: content.id,
          url: (typeof content.url === 'string' ? content.url : undefined),
          version: (typeof content.version === 'string' ? content.version : undefined),
          kind: (typeof content.kind === 'string' ? content.kind : undefined),
          type: (typeof content.type === 'string' ? content.type : undefined)
        };
        return indexEntry;
      } else {
        return [];
      }
    });
    fs.writeFileSync(path.join(packagePath, 'package', '.index.json'), JSON.stringify({ 'index-version': 1, files }, null, 2));
  } catch (e) {
    getLogger().error(e);
    return false;
  };
  return true;
};

const buildFhirCacheIndex = async () => {
  getLogger().info('Building global package index (this might take some time...)');
  const cachePath = getCachePackagesPath();
  const dirList: string[] = getCachedPackageDirs();
  getLogger().info(`FHIR Packages found in global cache: ${dirList.join(', ')}`);
  const packageIndexArray = dirList.map(pack => {
    if (fs.existsSync(path.join(cachePath, pack, 'package', 'package.json'))) {
      if (!fs.existsSync(path.join(cachePath, pack, 'package', '.index.json'))) {
        getLogger().info(`Generating .index.json for package ${pack}...`);
        createPackageIndexFile(path.join(cachePath, pack));
      };
      return {
        package: pack,
        path: path.join(cachePath, pack, 'package'),
        packageManifest: require(path.join(cachePath, pack, 'package', 'package.json')),
        packageIndex: require(path.join(cachePath, pack, 'package', '.index.json'))
      };
    } else {
      getLogger().warn(`Folder '${pack}' found in the local FHIR cache does not seem to be a FHIR package (no package.json file found). Skipping it...`);
      return undefined;
    };
  });

  const bindings = {
    omitKeys,
    pathJoin: path.join,
    require: (filePath: string) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const payload = require(filePath);
        return payload;
      } catch (e) {
        getLogger().error(e);
        throw (e);
      }
    },
    isNumeric
  };
  const packageIndexObject = await expressions.createRawPackageIndexObject.evaluate(packageIndexArray, bindings);

  const fixedIndex = await expressions.fixPackageIndexObject.evaluate(packageIndexObject, { isNumeric });
  return fixedIndex;
};

const parseFhirPackageIndex = async (): Promise<IFhirPackageIndex> => {
  const fumeIndexPath = getFumeIndexFilePath();
  if (fs.existsSync(fumeIndexPath)) {
    getLogger().info(`Found global package index file at ${fumeIndexPath}`);
    const dirList: string[] = getCachedPackageDirs();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const currentIndex = require(fumeIndexPath);
    const currentPackages = await expressions.extractCurrentPackagesFromIndex.evaluate(currentIndex);
    const diff: string[] = await expressions.checkPackagesMissingFromIndex.evaluate({ dirList, packages: currentPackages });
    if (diff.length === 0) {
      getLogger().info('Global package index file is up-to-date');
      return require(fumeIndexPath);
    } else {
      getLogger().info('Global package index file is outdated');
    };
  } else {
    getLogger().info('Global package index file is missing');
  }
  const fumeIndexFile = await buildFhirCacheIndex();
  fs.writeFileSync(fumeIndexPath, JSON.stringify(fumeIndexFile, null, 2));
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
