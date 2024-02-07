/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { ICache } from '../types';

class SimpleCache implements ICache {
  private cache: Record<string, any> = {};

  get (key: string) {
    return this.cache[key];
  }

  set (key: string, value: any) {
    this.cache[key] = value;
  }

  keys () {
    return Object.keys(this.cache);
  }

  reset () {
    this.cache = {};
  }
}

export const tables: Record<string, any> = {};
export const snapshots = {}; // cache for generated StructureDefinition snapshots
export const aliases: Record<string, any> = {};
export const v2keyMap = {};

export const expressions = {}; // previously parsed expressions
export const compiledExpressions = new SimpleCache();
export const mappings = {}; // user defined functions
export const compiledMappings = new SimpleCache();
export const fhirCacheIndex = {}; // complete index of all cached fhir packages
export const elementDefinition = new SimpleCache();
export const definitions = new SimpleCache();
export const compiledDefinitions = new SimpleCache();

export default {
  snapshots,
  tables,
  mappings,
  compiledMappings,
  aliases,
  expressions,
  compiledExpressions,
  v2keyMap,
  fhirCacheIndex,
  definitions,
  elementDefinition,
  compiledDefinitions
};
