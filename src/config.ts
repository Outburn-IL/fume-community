/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { FhirStructureNavigator } from '@outburn/structure-navigator';
import type { PackageManifest } from 'fhir-package-installer';
import type { BaseFhirVersion, FhirSnapshotGenerator } from 'fhir-snapshot-generator';

import { fhirVersionToMinor } from './helpers/fhirFunctions/fhirVersionToMinor';
import defaultConfig from './serverConfig';
import type { IAppBinding, IConfig } from './types';

const additionalBindings: Record<string, IAppBinding> = {}; // additional functions to bind when running transformations
let serverConfig: IConfig = { ...defaultConfig };
let fhirPackages: Record<string, PackageManifest> = {};

// Global FHIR context - initialized during warmup
interface GlobalFhirContext {
  navigator: FhirStructureNavigator | null
  generator: FhirSnapshotGenerator | null
  normalizedPackages: string[]
  fhirVersion: BaseFhirVersion
  cachePath: string
  registryUrl?: string
  registryToken?: string
  isInitialized: boolean
}

let globalFhirContext: GlobalFhirContext = {
  navigator: null,
  generator: null,
  normalizedPackages: [],
  fhirVersion: '4.0.1',
  cachePath: '',
  registryUrl: undefined,
  registryToken: undefined,
  isInitialized: false
};

const setFhirPackages = (packages: Record<string, PackageManifest>) => {
  fhirPackages = packages;
};

const getFhirPackages = () => {
  return fhirPackages;
};

const setServerConfig = <ConfigType extends IConfig>(config: Partial<ConfigType>) => {
  let fhirServerBase: string | undefined = config.FHIR_SERVER_BASE ? config.FHIR_SERVER_BASE.trim() : undefined;
  let isStatelessMode: boolean | undefined = config.SERVER_STATELESS;

  if (!fhirServerBase || fhirServerBase === '' || isStatelessMode) {
    fhirServerBase = '';
    isStatelessMode = true;
  } else {
    isStatelessMode = false;
  }
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

// Global FHIR context functions
const initializeGlobalFhirContext = async (
  navigator: FhirStructureNavigator,
  generator: FhirSnapshotGenerator,
  normalizedPackages: string[]
) => {
  globalFhirContext = {
    navigator,
    generator,
    normalizedPackages,
    fhirVersion: getFhirVersion() as BaseFhirVersion,
    cachePath: getFhirPackageCacheDir() || '',
    registryUrl: getFhirPackageRegistryUrl(),
    registryToken: getFhirPackageRegistryToken(),
    isInitialized: true
  };
};

const getGlobalFhirContext = (): GlobalFhirContext => {
  return globalFhirContext;
};

const resetGlobalFhirContext = () => {
  globalFhirContext = {
    navigator: null,
    generator: null,
    normalizedPackages: [],
    fhirVersion: '4.0.1',
    cachePath: '',
    registryUrl: undefined,
    registryToken: undefined,
    isInitialized: false
  };
};

export default {
  getFhirVersion,
  getFhirVersionMinor,
  getServerConfig,
  setServerConfig,
  setBinding,
  getBindings,
  setFhirPackages,
  getFhirPackages,
  getFhirPackageRegistryUrl,
  getFhirPackageRegistryToken,
  getFhirPackageCacheDir,
  initializeGlobalFhirContext,
  getGlobalFhirContext,
  resetGlobalFhirContext
};
