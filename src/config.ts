/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
import { fhirCorePackages } from './constants';

let fhirServerBase: string = 'http://hapi-fhir.outburn.co.il/fhir';
let fhirServerTimeout: number = 10000;
let fhirVersion: string = '4.0.1';
let fhirVersionWithoutPatch: string = '4.0';
let statelessMode: boolean;
const additionalBindings = {}; // additional functions to bind when running transformations

let searchBundleSize: number = 20;

const setFhirServerBase = (url: string): void => {
  if (url === undefined || url === null || (typeof url === 'string' && url === '')) {
    fhirServerBase = '';
    statelessMode = true;
  } else {
    fhirServerBase = url;
    statelessMode = false;
  }
};

const getFhirServerBase = (): string => {
  return fhirServerBase;
};

const setFhirServerTimeout = (millis: number): void => {
  fhirServerTimeout = millis;
};

const getFhirServerTimeout = (): number => {
  return fhirServerTimeout;
};

const setFhirVersion = (version: string): void => {
  const fhirVersionRemovePatch = (fhirVersion: string) => {
    const parts = fhirVersion.split('.');
    return parts[0] + '.' + parts[1];
  };
  fhirVersion = version;
  fhirVersionWithoutPatch = fhirVersionRemovePatch(version);
};

const getFhirVersion = (): string => {
  return fhirVersion;
};

const getFhirVersionWithoutPatch = (): string => {
  return fhirVersionWithoutPatch;
};

const setSearchBundleSize = (size: number): void => {
  searchBundleSize = size;
};

const getSearchBundleSize = (): number => {
  return searchBundleSize;
};

const isStatelessMode = (): boolean => {
  if (statelessMode) return true;
  return false;
};

const setBinding = (name, binding): void => {
  additionalBindings[name] = binding;
};

const getAdditionalBindings = () => {
  return additionalBindings;
};

export default {
  fhirCorePackages,
  getFhirVersion,
  setFhirVersion,
  getFhirVersionWithoutPatch,
  getFhirServerBase,
  setFhirServerBase,
  getFhirServerTimeout,
  setFhirServerTimeout,
  setSearchBundleSize,
  getSearchBundleSize,
  isStatelessMode,
  setBinding,
  getAdditionalBindings
};
