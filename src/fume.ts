/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
import { fhirCorePackages } from './constants';
import conformance from './conformance';
import config from './config';
import client from './client';
import cache from './cache';
import transpiler from './transpiler';
import objectFuncs from './objectFunctions';
import * as stringFuncs from './stringFunctions';
import v2 from './hl7v2';

const init = async (options) => {
  console.log('FUME initializing...');
  // override logger object if provided
  if (typeof options?.logger !== 'undefined') {
    config.setLogger(options.logger);
  }
  // override default fhir version if provided
  if (typeof options?.fhirVersion === 'string') {
    config.setFhirVersion(options.fhirVersion);
  };
  const logger = config.getLogger();
  logger.info(`Default FHIR version is set to ${config.getFhirVersion()}`);
  // translate fhir version to package id
  const fhirVersionCorePackageId = fhirCorePackages[config.getFhirVersion()];
  // load package or throw error
  if (fhirVersionCorePackageId !== undefined && fhirVersionCorePackageId !== null) {
    const loadRes = await conformance.loadPackage(fhirVersionCorePackageId);
    if (loadRes?.errors?.length > 0) {
      throw new Error(`Errors loading package for FHIR version ${config.getFhirVersion()}: ${loadRes.errors.join(', ')}`);
    }
  } else {
    throw new Error(`FHIR version ${config.getFhirVersion()} is unsupported/invalid!`);
  };
  // load additional packages, if defined
  if (typeof options?.fhirPackages !== 'undefined' && options?.fhirPackages !== '') {
    await conformance.loadPackage(options.fhirPackages);
  };
  // load index of all packages found in global fhir cache (on disk)
  await conformance.loadFhirCacheIndex();
  // if fhir server defined, load mappings and aliases from it
  if (options?.fhirServer !== undefined && options?.fhirServer !== null && typeof options.fhirServer === 'string' && options.fhirServer !== '') {
    config.setFhirServerBase(options.fhirServer);
    if (options?.searchBundleSize !== undefined && typeof options?.searchBundleSize === 'number') {
      logger.info(`Setting bundle search size: ${JSON.stringify(options.searchBundleSize)}`);
      config.setSearchBundleSize(options.searchBundleSize);
    };
    if (options?.fhirServerTimeout !== undefined && options?.fhirServerTimeout !== null && typeof options.fhirServerTimeout === 'number') {
      config.setFhirServerTimeout(options.fhirServerTimeout);
      logger.info({ fhirServerTimeout: config.getFhirServerTimeout() });
    };
    logger.info(`Loading FUME resources from FHIR server ${config.getFhirServerBase()} into cache...`);
    client.init();
    conformance.recacheFromServer().then(_result => {
      logger.info('Successfully loaded cache');
    }).catch(_notFound => {
      logger.info('Error loading cache');
    });
  } else {
    logger.info('Running in stateless mode');
    config.setFhirServerBase('');
  };
  if (options.additionalBindings !== undefined) {
    config.setAdditionalBindings(options.additionalBindings);
  };
  // set fume as initialized
  config.setFumeInitialized();
  logger.info({ fumeInitialized: config.getFumeInitialized() });
  return config.getFumeInitialized();
};

export default {
  init,
  fhirVersion: config.getFhirVersion(),
  fhirVersionWithoutPatch: config.getFhirVersionWithoutPatch(),
  fhirClient: client,
  cache,
  conformance,
  toFunction: transpiler.toFunction,
  transform: transpiler.transform,
  getSnapshot: transpiler.getSnapshot,
  fhirCorePackages,
  objectFuncs,
  stringFuncs,
  setLogger: config.setLogger,
  v2json: v2.v2json,
  parseCsv: stringFuncs.parseCsv,
  config
};
