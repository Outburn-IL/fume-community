/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
import { fhirCorePackages } from './constants';
import type { IConfig } from './types';
import defaultConfig from './serverConfig';
import { fhirVersionToMinor } from './helpers/fhirFunctions/fhirVersionToMinor';

const additionalBindings = {}; // additional functions to bind when running transformations
let serverConfig: IConfig = { ...defaultConfig };
let fhirVersionWithoutPatch: string = fhirVersionToMinor(serverConfig.FHIR_VERSION);

const setServerConfig = (config: IConfig) => {
  let fhirServerBase: string = config.FHIR_SERVER_BASE;
  let isStatelessMode: boolean = config.SERVER_STATELESS;
  if (config.FHIR_VERSION) {
    fhirVersionWithoutPatch = fhirVersionToMinor(config.FHIR_VERSION);
  };
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

const getFhirVersionWithoutPatch = (): string => {
  return fhirVersionWithoutPatch;
};

const setBindings = (name: string, binding: any | any[]): void => {
  additionalBindings[name] = binding;
};

const getBindings = () => {
  return additionalBindings;
};

export default {
  fhirCorePackages,
  getFhirVersionWithoutPatch,
  getServerConfig,
  setServerConfig,
  setBindings,
  getBindings
};
