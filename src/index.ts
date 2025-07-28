/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import config from './config';
import { getAliasResource, getFhirPackageIndex } from './helpers/conformance';
import fhirFuncs from './helpers/fhirFunctions';
import { parseCsv } from './helpers/inputConverters';
import { v2json } from './helpers/inputConverters/hl7v2';
import expressions from './helpers/jsonataExpression';
import { selectKeys } from './helpers/objectFunctions';
import parser from './helpers/parser';
import {
  duplicate,
  endsWith,
  startsWith,
  substringAfter,
  substringBefore
} from './helpers/stringFunctions';

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
  duplicate,
  getAliasResource,
  substringBefore,
  substringAfter,
  selectKeys,
  startsWith,
  endsWith,
  parseCsv,
  getFhirVersion: config.getFhirVersion,
  getFhirCorePackage: config.getFhirCorePackage,
  getFhirVersionMinor: config.getFhirVersionMinor,
  toJsonataString: parser.toJsonataString,
  getSnapshot: parser.getSnapshot,
  v2json,
  getFhirPackageIndex,
  // FHIR functions
  search: fhirFuncs.search,
  resolve: fhirFuncs.resolve,
  literal: fhirFuncs.literal,
  searchSingle: fhirFuncs.searchSingle
};
