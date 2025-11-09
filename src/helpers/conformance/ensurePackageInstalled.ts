/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { PackageIdentifier, PackageIndex, PackageManifest } from 'fhir-package-installer';

import config from '../../config';
import { getFpiInstance } from './fpiInstance';

const getDependencies = async (packageObject: PackageIdentifier) => {
  return (await getFpiInstance().getManifest(packageObject))?.dependencies;
};

/**
 * Ensures that a package and all of its dependencies are installed in the global package cache.
 * If a version is not supplied, the latest release will be looked up and installed.
 * @param packageId string in the format packageId@version | packageId | packageId#version
 */
const ensure = async (packageId: string): Promise<boolean> => {
  const fpi = getFpiInstance();

  // Install package (fpi handles dependency resolution automatically)
  await fpi.install(packageId);

  // Get package info and add to config
  const packageObject: PackageIdentifier = await fpi.toPackageObject(packageId);
  const manifest: PackageManifest = await fpi.getManifest(packageObject);
  const installedPath: string = await fpi.getPackageDirPath(packageObject);
  const packageIndex: PackageIndex = await fpi.getPackageIndexFile(packageObject);

  config.addFhirPackage(packageObject, manifest, installedPath, packageIndex);

  // package itself is installed now. Ensure dependencies.
  const deps = await getDependencies(packageObject);
  if (deps) {
    await Promise.all(
      Object.entries(deps).map(async ([pack, version]) => {
        try {
          await ensure(pack + '@' + version);
        } catch (err) {
          // Print error but do not throw, so other dependencies can proceed
          fpi.getLogger().error(`Failed to install dependency ${pack}@${version}: ${err}`);
        }
      })
    );
  }

  return true;
};

export default ensure;
