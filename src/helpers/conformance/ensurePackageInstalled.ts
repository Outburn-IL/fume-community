/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';
import temp from 'temp';

import config from '../../config';
import { BaseResource } from '../../types/BaseResource';
import { FileInPackageIndex } from '../../types/FileInPackageIndex';
import { PackageIdentifier } from '../../types/PackageIdentifier';
import { PackageIndex } from '../../types/PackageIndex';
import { PackageManifest } from '../../types/PackageManifest';
import { getLogger } from '../logger';
import { getCachePackagesPath } from './getCachePath';

const cachePath = getCachePackagesPath();
const registryUrl = 'https://packages.fhir.org';
const fallbackTarballUrl = (packageObject: PackageIdentifier) => `https://packages.simplifier.net/${packageObject.id}/-/${packageObject.id}-${packageObject.version}.tgz`;

/**
 * Takes a PackageObject and returns the corresponding directory name of the package
 * @param packageObject A PackageObject with both name and version keys
 * @returns (string) Directory name in the standard format `name#version`
 */
const toDirName = (packageObject: PackageIdentifier): string => packageObject.id + '#' + packageObject.version;

const getPackageDirPath = (packageObject: PackageIdentifier): string => {
  const dirName = toDirName(packageObject);
  const packPath = path.join(cachePath, dirName);
  return packPath;
};

const getPackageIndexPath = (packageObject: PackageIdentifier): string => path.join(getPackageDirPath(packageObject), 'package', '.fume.index.json');

/**
 * Scans a package folder and generates a new `.fume.index.json` file
 * @param packagePath The path where the package is installed
 * @returns PackageIndex
 */
const generatePackageIndex = async (packageObject: PackageIdentifier): Promise<PackageIndex> => {
  getLogger().info(`Generating new .fume.index.json file for package ${packageObject.id}@${packageObject.version}...`);
  const packagePath = getPackageDirPath(packageObject);
  const indexPath = getPackageIndexPath(packageObject);
  const evalAttribute = (att: any | any[]) => (typeof att === 'string' ? att : undefined);
  try {
    const fileList = await fs.readdir(path.join(packagePath, 'package'));
    const files = await Promise.all(
      fileList.filter(
        file => file.endsWith('.json') && file !== 'package.json' && !file.endsWith('.index.json')
      ).map(
        async (file: string) => {
          const content: BaseResource = JSON.parse(await fs.readFile(path.join(packagePath, 'package', file), { encoding: 'utf8' }));
          const indexEntry: FileInPackageIndex = {
            filename: file,
            resourceType: content.resourceType,
            id: content.id,
            url: evalAttribute(content.url),
            name: evalAttribute(content.name),
            version: evalAttribute(content.version),
            kind: evalAttribute(content.kind),
            type: evalAttribute(content.type),
            supplements: evalAttribute(content.supplements),
            content: evalAttribute(content.content),
            baseDefinition: evalAttribute(content.baseDefinition),
            derivation: evalAttribute(content.derivation),
            date: evalAttribute(content.date)
          };
          return indexEntry;
        }
      )
    );
    const indexJson: PackageIndex = {
      'index-version': 2,
      files
    };
    await fs.writeFile(indexPath, JSON.stringify(indexJson, null, 2));
    return indexJson;
  } catch (e) {
    getLogger().error(e);
    throw (e);
  };
};

const getPackageIndexFile = async (packageObject: PackageIdentifier): Promise<PackageIndex> => {
  const path = getPackageIndexPath(packageObject);
  if (await fs.exists(path)) {
    const contents: string = await fs.readFile(path, { encoding: 'utf8' });
    const parsed: PackageIndex = JSON.parse(contents);
    return parsed;
  };
  /* If we got here it means the index file is missing */
  /* Hence, we need to build it */
  const newIndex: PackageIndex = await generatePackageIndex(packageObject);
  return newIndex;
};

/**
 * Checks if the package folder is found in the package cache
 * @param packageObject An object with `name` and `version` keys
 * @returns `true` if the package folder was found, `false` otherwise
 */
const isInstalled = (packageObject: PackageIdentifier): boolean => {
  const packPath = getPackageDirPath(packageObject);
  return fs.existsSync(packPath);
};

/**
 * Extracts the version of the package
 * @param packageId (string) Raw package identifier string. Could be `name@version`, `name#version` or just `name`
 * @returns The version part of the package identifier. If not supplied, `latest` will be returned
 */
const getVersionFromPackageString = (packageId: string): string => {
  const byPound = packageId.split('#');
  const byAt = packageId.split('@');
  if (byPound.length === 2) return byPound[1];
  if (byAt.length === 2) return byAt[1];
  return 'latest';
};

/**
 * Queries the registry for the package information
 * @param packageName Only the package name (no version)
 * @returns The response object from the registry
 */
const getPackageDataFromRegistry = async (packageName: string): Promise<Record<string, any | any[]>> => {
  const packageData = await axios.get(`${registryUrl}/${packageName}/`);
  return packageData.data;
};

/**
 * Checks the package registry for the latest published version of a package
 * @param packageName (string) The package id alone, without the version part
 * @returns The latest published version of the package
 */
const checkLatestPackageDist = async (packageName: string): Promise<string> => {
  const packageData = await getPackageDataFromRegistry(packageName);
  const latest = packageData['dist-tags']?.latest;
  return latest;
};

/**
 * Parses a package identifier string into a PackageObject.
 * If the version was not supplied it will be resolved to the latest published version
 * @param packageId (string) Raw package identifier string. Could be `name@version`, `name#version` or just `name`
 * @returns a PackageObject with name and version
 */
const toPackageObject = async (packageId: string): Promise<PackageIdentifier> => {
  const packageName: string = packageId.split('#')[0].split('@')[0];
  let packageVersion: string = getVersionFromPackageString(packageId);
  if (packageVersion === 'latest') packageVersion = await checkLatestPackageDist(packageName);
  return { id: packageName, version: packageVersion };
};

/**
 * Resolve a package object into a URL for the package tarball
 * @param packageObject
 * @returns Tarball URL
 */
const getTarballUrl = async (packageObject: PackageIdentifier): Promise<string> => {
  let tarballUrl: string;
  try {
    const packageData = await getPackageDataFromRegistry(packageObject.id);
    const versionData = packageData.versions[packageObject.version];
    tarballUrl = versionData?.dist?.tarball;
  } catch {
    tarballUrl = fallbackTarballUrl(packageObject);
  };
  return tarballUrl;
};

/**
 * Move an extracted package content from temporary directory into the FHIR package cache
 * @param packageObject
 * @param tempDirectory
 * @returns The final path of the package in the cache
 */
const cachePackageTarball = async (packageObject: PackageIdentifier, tempDirectory: string): Promise<string> => {
  const finalPath = path.join(cachePath, toDirName(packageObject));
  if (!isInstalled(packageObject)) {
    await fs.move(tempDirectory, finalPath);
    getLogger().info(`Installed ${packageObject.id}@${packageObject.version} in the FHIR package cache: ${finalPath}`);
  }
  return finalPath;
};

/**
 * Downloads the tarball file into a temp folder and returns the path
 * @param packageObject
 */
const downloadTarball = async (packageObject: PackageIdentifier): Promise<string> => {
  const tarballUrl: string = await getTarballUrl(packageObject);
  const res = await axios.get(tarballUrl, { responseType: 'stream' });
  if (res?.status === 200 && res?.data) {
    try {
      const tarballStream: Readable = res.data;
      temp.track();
      const tempDirectory = temp.mkdirSync();
      await pipeline(tarballStream, tar.x({ cwd: tempDirectory }));
      getLogger().info(`Downloaded ${packageObject.id}@${packageObject.version} to a temporary directory`);
      return tempDirectory;
    } catch (e) {
      getLogger().error(`Failed to extract tarball of package ${packageObject.id}@${packageObject.version}`);
      throw e;
    }
  } else {
    throw new Error(`Failed to download package ${packageObject.id}@${packageObject.version} from URL: ${tarballUrl}`);
  }
};

const getManifest = async (packageObject: PackageIdentifier): Promise<PackageManifest> => {
  const manifestPath: string = path.join(cachePath, toDirName(packageObject), 'package', 'package.json');
  const manifestFile = await fs.readFile(manifestPath, { encoding: 'utf8' });
  if (manifestFile) {
    const manifest = JSON.parse(manifestFile);
    return manifest;
  } else {
    getLogger().warn(`Could not find package manifest for ${packageObject.id}@${packageObject.version}`);
    return { name: packageObject.id, version: packageObject.version };
  }
};

const getDependencies = async (packageObject: PackageIdentifier) => {
  return (await getManifest(packageObject))?.dependencies;
};

/**
 * Ensures that a package and all of its dependencies are installed in the global package cache.
 * If a version is not supplied, the latest release will be looked up and installed.
 * @param packagId string in the format packageId@version | packageId | packageId#version
 */

const ensure = async (packageId: string) => {
  const packageObject = await toPackageObject(packageId);
  const installed = isInstalled(packageObject);
  let installedPath: string;
  if (!installed) {
    try {
      const tempPath: string = await downloadTarball(packageObject);
      installedPath = await cachePackageTarball(packageObject, tempPath);
    } catch (e) {
      getLogger().error(e);
      throw new Error(`Failed to install package ${packageId}`);
    }
  } else {
    installedPath = getPackageDirPath(packageObject);
  };
  const packageIndex: PackageIndex = await getPackageIndexFile(packageObject);
  config.addFhirPackage(packageObject, await getManifest(packageObject), installedPath, packageIndex);
  // package itself is installed now. Ensure dependencies.
  const deps = await getDependencies(packageObject);
  for (const pack in deps) {
    await ensure(pack + '@' + deps[pack]);
  };
  return true;
};

export default ensure;
