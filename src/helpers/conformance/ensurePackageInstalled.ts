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

import { getLogger } from '../logger';
import { getCachePackagesPath } from './getCachePath';

interface PackageObject {
  id: string
  version: string
};

const cachePath = getCachePackagesPath();
const registryUrl = 'https://packages.fhir.org';
const fallbackTarballUrl = (packageObject: PackageObject) => `https://packages.simplifier.net/${packageObject.id}/-/${packageObject.id}-${packageObject.version}.tgz`;

/**
 * Takes a PackageObject and returns the corresponding directory name of the package
 * @param packageObject A PackageObject with both name and version keys
 * @returns (string) Directory name in the standard format `name#version`
 */
const toDirName = (packageObject: PackageObject): string => packageObject.id + '#' + packageObject.version;

/**
 * Checks if the package folder is found in the package cache
 * @param packageObject An object with `name` and `version` keys
 * @returns `true` if the package folder was found, `false` otherwise
 */
const isInstalled = (packageObject: PackageObject): boolean => {
  const dirName = toDirName(packageObject);
  const packPath = path.join(cachePath, dirName);
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
const toPackageObject = async (packageId: string): Promise<PackageObject> => {
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
const getTarballUrl = async (packageObject: PackageObject): Promise<string> => {
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
const cachePackageTarball = async (packageObject: PackageObject, tempDirectory: string): Promise<string> => {
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
const downloadTarball = async (packageObject: PackageObject): Promise<string> => {
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

const getDependencies = async (packageObject: PackageObject) => {
  const manifestPath: string = path.join(cachePath, toDirName(packageObject), 'package', 'package.json');
  const manifestFile = await fs.readFile(manifestPath, { encoding: 'utf8' });
  if (manifestFile) {
    const manifest = JSON.parse(manifestFile);
    return manifest?.dependencies ?? {};
  } else {
    getLogger().warn(`Could not find package manifest for ${packageObject.id}@${packageObject.version}`);
    return {};
  }
};

/**
 * Ensures that a package and all of its dependencies are installed in the global package cache.
 * If a version is not supplied, the latest release will be looked up and installed.
 * @param packagId string in the format packageId@version | packageId | packageId#version
 */

const ensure = async (packageId: string) => {
  const packageObject = await toPackageObject(packageId);
  const installed = isInstalled(packageObject);
  if (!installed) {
    try {
      const tempPath: string = await downloadTarball(packageObject);
      await cachePackageTarball(packageObject, tempPath);
    } catch (e) {
      getLogger().error(e);
      throw new Error(`Failed to install package ${packageId}`);
    }
  };
  // package itself is installed now. Ensure dependencies.
  const deps: Record<string, string> = await getDependencies(packageObject);
  for (const pack in deps) {
    await ensure(pack + '@' + deps[pack]);
  };
  return true;
};

export default ensure;
