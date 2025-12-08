/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
/* eslint-disable no-trailing-spaces */
/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import fumifier, { FumifierCompiled, FumifierOptions, MappingCacheInterface } from 'fumifier';

import config from '../config';
import { IAppBinding } from '../types';
import { getCache } from './cache';
import * as conformance from './conformance';
import fhirFuncs from './fhirFunctions';
import { parseCsv, v2json } from './inputConverters';
import { getLogger } from './logger';

/**
 * An implementation of Fumifier's MappingCacheInterface over the FUME mapping cache
 */
const fumifierMappingCache: MappingCacheInterface = {
  getKeys: async () => {
    const cache = getCache().mappings;
    return Array.from(cache.keys());
  },
  get: async (key: string) => {
    const cache = getCache().mappings;
    return cache.get(key);
  }
};

const getFumifierOptions = async (): Promise<FumifierOptions> => {
  const globalContext = config.getGlobalFhirContext();
  
  if (!globalContext.isInitialized || !globalContext.navigator) {
    throw new Error('Global FHIR context is not initialized. This should be done during server warmup.');
  }

  return {
    mappingCache: fumifierMappingCache,
    navigator: globalContext.navigator
  };
};

/**
 * Parses and compiles a FUME expression into a FumifierCompiled object
 * @param expression 
 * @returns 
 */
const compileExpression = async (expression: string): Promise<FumifierCompiled> => {
  const { compiledExpressions } = getCache();
  let compiled: FumifierCompiled = compiledExpressions.get(expression); // get from cache
  if (!compiled) { // not cached, compile it
    const options = await getFumifierOptions();
    compiled = await fumifier(expression, options);
    compiled.setLogger(getLogger());
    compiledExpressions.set(expression, compiled);
  }
  return compiled;
};

export const transform = async (input: any, expression: string, extraBindings: Record<string, IAppBinding> = {}) => {
  try {
    getLogger().info('Running transformation...');

    const expr = await compileExpression(expression);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    let bindings: Record<string, Function | Record<string, any> | string> = {};

    // bind functions
    bindings.resourceId = fhirFuncs.resourceId;
    bindings.translateCode = fhirFuncs.translateCode;
    bindings.translate = fhirFuncs.translateCode;
    bindings.translateCoding = fhirFuncs.translateCoding;
    bindings.search = fhirFuncs.search;
    bindings.searchSingle = fhirFuncs.searchSingle;
    bindings.literal = fhirFuncs.literal;
    bindings.resolve = fhirFuncs.resolve;
    bindings.parseCsv = parseCsv;
    bindings.v2json = v2json;
    bindings.capabilities = fhirFuncs.capabilities;

    const { aliases } = getCache();
    // these are debug functions, should be removed in production versions
    bindings.getTable = conformance.getTable;
    // bindings.getCodeSystem = conformance.getCodeSystem;
    // bindings.getValueSet = conformance.getValueSet;
    // end of debug functions

    // bind all aliases from cache
    bindings = { 
      ...aliases.getDict(), 
      ...bindings,
      ...extraBindings
    };

    // expr.registerFunction(
    //   'getStructureDefinition',
    //   (defId: string) => getStructureDefinition(defId, config.getFhirVersion(), conformance.getFhirPackageIndex(), getLogger()),
    //   '<s-:o>'
    // );
    // expr.registerFunction(
    //   'getSnapshot',
    //   async (defId: string) => await compiler.getSnapshot(defId, config.getFhirVersion(), conformance.getFhirPackageIndex(), getLogger()),
    //   '<s-:o>'
    // );

    const res = await expr.evaluate(input, bindings);
    return res;
  } catch (error) {
    getLogger().error(error);
    throw error;
  }
};
