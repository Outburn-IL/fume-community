/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { PackageIdentifier, PackageIndex, PackageManifest } from 'fhir-package-installer';

import { fhirCorePackages } from './constants';
import { fhirVersionToMinor } from './helpers/fhirFunctions/fhirVersionToMinor';
import defaultConfig from './serverConfig';
import type { IAppBinding, IConfig } from './types';

const additionalBindings: Record<string, IAppBinding> = {}; // additional functions to bind when running transformations
let serverConfig: IConfig = { ...defaultConfig };
let fhirPackages: Record<string, PackageManifest> = {};

const setFhirPackages = (packages: Record<string, PackageManifest>) => {
  fhirPackages = packages;
};

const getFhirPackages = () => {
  return fhirPackages;
};

const addFhirPackage = (identifier: PackageIdentifier, manifest: PackageManifest, path: string, packageIndex: PackageIndex) => {
  const key = identifier.id + '@' + identifier.version;
  if (!fhirPackages[key]) {
    fhirPackages[key] = { ...manifest, installedPath: path, '.index.json': packageIndex };
  }
};

const setServerConfig = <ConfigType extends IConfig>(config: Partial<ConfigType>) => {
  let fhirServerBase: string | undefined = config.FHIR_SERVER_BASE ? config.FHIR_SERVER_BASE.trim() : undefined;
  let isStatelessMode: boolean | undefined = config.SERVER_STATELESS;

  if (!fhirServerBase || fhirServerBase === '' || isStatelessMode) {
    fhirServerBase = '';
    isStatelessMode = true;
  } else {
    isStatelessMode = false;
  };
  serverConfig = {
    ...defaultConfig,
    ...config,
    FHIR_SERVER_BASE: fhirServerBase,
    SERVER_STATELESS: isStatelessMode
  };
};

const getServerConfig = () => {
  return serverConfig;
};

const setBinding = (name: string, binding: IAppBinding): void => {
  additionalBindings[name] = binding;
};

const getBindings = () => {
  return additionalBindings;
};

const getFhirVersion = () => {
  return serverConfig.FHIR_VERSION;
};

const getFhirCorePackage = () => {
  return fhirCorePackages[serverConfig.FHIR_VERSION];
};

const getFhirVersionMinor = () => {
  return fhirVersionToMinor(serverConfig.FHIR_VERSION);
};

const getFhirPackageRegistryUrl = (): string | undefined => {
  return serverConfig.FHIR_PACKAGE_REGISTRY_URL;
};

const getFhirPackageRegistryToken = (): string | undefined => {
  return serverConfig.FHIR_PACKAGE_REGISTRY_TOKEN;
};

const getFhirPackageCacheDir = (): string | undefined => {
  return serverConfig.FHIR_PACKAGE_CACHE_DIR;
};

// Allow HTTP registry usage (testing against local mock Artifactory)
const getFhirPackageRegistryAllowHttp = (): boolean | undefined => {
  return serverConfig.FHIR_PACKAGE_REGISTRY_ALLOW_HTTP;
};

export default {
  getFhirVersion,
  getFhirCorePackage,
  getFhirVersionMinor,
  getServerConfig,
  setServerConfig,
  setBinding,
  getBindings,
  setFhirPackages,
  getFhirPackages,
  addFhirPackage,
  getFhirPackageRegistryUrl,
  getFhirPackageRegistryToken,
  getFhirPackageCacheDir,
  getFhirPackageRegistryAllowHttp
};
