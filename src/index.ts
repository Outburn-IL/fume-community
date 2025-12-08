/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import config from './config';
import { getAliasResource } from './helpers/conformance';
import fhirFuncs from './helpers/fhirFunctions';
import { parseCsv, v2json } from './helpers/inputConverters';
import expressions from './helpers/jsonataExpressions';

/**
 * Export types
 */
export type { IAppCache, IAppCacheKeys } from './helpers/cache';
export type { IAppBinding, ICache, IConfig, IFhirClient, IFumeServer, ILogger } from './types';

/**
 * Export classes and utils
 */
export { FhirClient } from './helpers/fhirServer';
export { FumeServer } from './server';
export { FumeConfigSchema } from './serverConfigSchema';
export const fumeUtils = {
  expressions,
  getAliasResource,
  parseCsv,
  getFhirVersion: config.getFhirVersion,
  getFhirVersionMinor: config.getFhirVersionMinor,
  getNavigator: () => config.getGlobalFhirContext().navigator,
  // getSnapshot: parser.getSnapshot,
  v2json,
  // FHIR functions
  search: fhirFuncs.search,
  resolve: fhirFuncs.resolve,
  literal: fhirFuncs.literal,
  searchSingle: fhirFuncs.searchSingle
};
