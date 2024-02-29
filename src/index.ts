/**
 * Utils
 */

import { selectKeys } from './helpers/objectFunctions';
import parser from './helpers/parser';
import {
  duplicate,
  endsWith,
  startsWith,
  parseCsv,
  substringBefore,
  substringAfter
} from './helpers/stringFunctions';
import config from './config';
import expressions from './helpers/jsonataExpression';
import { v2json } from './helpers/hl7v2';

/**
 * Export types
 */
export type { IFumeServer, ILogger, ICache, IConfig, IAppBinding, IFhirClient } from './types';
export type { IAppCache, IAppCacheKeys } from './helpers/cache';

/**
 * Export classes and utils
 */
export { FumeServer } from './server';
export { FumeConfigSchema } from './serverConfigSchema';
export { FhirClient } from './helpers/fhirServer';
export const fumeUtils = {
  expressions,
  duplicate,
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
  v2json
};
