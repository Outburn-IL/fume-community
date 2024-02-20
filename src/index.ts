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

export type { IFumeServer, ILogger, ICache, IConfig, IAppBinding } from './types';
export type { IAppCache } from './helpers/cache';
export { FumeServer } from './server';

export const fumeUtils = {
  duplicate,
  substringBefore,
  substringAfter,
  selectKeys,
  startsWith,
  endsWith,
  parseCsv,
  expressions,
  getFhirVersion: config.getFhirVersion,
  getFhirCorePackage: config.getFhirCorePackage,
  getFhirVersionMinor: config.getFhirVersionMinor,
  toJsonataString: parser.toJsonataString,
  getSnapshot: parser.getSnapshot,
  v2json
};
