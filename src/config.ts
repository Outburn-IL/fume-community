/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
import { fhirCorePackages } from './constants';
import { fhirVersionToMinor } from './helpers/fhirFunctions/fhirVersionToMinor';
import defaultConfig from './serverConfig';
import type { IAppBinding, IConfig } from './types';

const additionalBindings: Record<string, IAppBinding> = {}; // additional functions to bind when running transformations
let serverConfig: IConfig = { ...defaultConfig };

const setServerConfig = <ConfigType extends IConfig>(config: ConfigType) => {
  let fhirServerBase: string = config.FHIR_SERVER_BASE;
  let isStatelessMode: boolean = config.SERVER_STATELESS;

  if (!fhirServerBase || fhirServerBase.trim() === '' || isStatelessMode) {
    fhirServerBase = '';
    isStatelessMode = true;
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

export default {
  getFhirVersion,
  getFhirCorePackage,
  getFhirVersionMinor,
  getServerConfig,
  setServerConfig,
  setBinding,
  getBindings
};
