/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
/* eslint-disable no-trailing-spaces */
/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import type { Logger } from '@outburn/types';
import fumifier, { FumifierCompiled, FumifierOptions, MappingCacheInterface } from 'fumifier';

import config from '../config';
import { IAppBinding } from '../types';
import { getCache } from './cache';
import * as conformance from './conformance';
import { getFhirClient } from './fhirClient';
import { parseCsv, v2json } from './inputConverters';
import { getLogger } from './logger';
import { getMappingProvider } from './mappingProvider';
import * as translate from './translate';

/**
 * An implementation of Fumifier's MappingCacheInterface over the FUME mapping provider
 */
const fumifierMappingCache: MappingCacheInterface = {
  getKeys: async () => {
    const provider = getMappingProvider();
    return provider.getUserMappingKeys();
  },
  get: async (key: string) => {
    const provider = getMappingProvider();
    const mapping = provider.getUserMapping(key);
    if (!mapping) {
      throw new Error(`Mapping '${key}' not found`);
    }
    return mapping.expression;
  }
};

const getFumifierOptions = async (): Promise<FumifierOptions> => {
  const globalContext = config.getGlobalFhirContext();
  
  if (!globalContext.isInitialized || !globalContext.navigator) {
    throw new Error('Global FHIR context is not initialized. This should be done during server warmup.');
  }

  if (!globalContext.terminologyRuntime) {
    throw new Error('Global terminology runtime is not initialized. This should be done during server warmup.');
  }

  let fhirClient;
  try {
    // Get the FhirClient instance directly for fumifier
    fhirClient = getFhirClient();
  } catch {
    // FHIR client not initialized - this is OK in stateless mode
    fhirClient = undefined;
  }

  return {
    mappingCache: fumifierMappingCache,
    navigator: globalContext.navigator,
    terminologyRuntime: globalContext.terminologyRuntime,
    fhirClient
  };
};

/**
 * Parses and compiles a FUME expression into a FumifierCompiled object
 * @param expression 
 * @returns 
 */
const compileExpression = async (expression: string): Promise<FumifierCompiled> => {
  const { compiledExpressions } = getCache();
  let compiled = compiledExpressions.get(expression); // get from cache
  if (!compiled) { // not cached, compile it
    const options = await getFumifierOptions();
    compiled = await fumifier(expression, options);
    compiled.setLogger(getLogger() as Logger);
    compiledExpressions.set(expression, compiled);
  }
  return compiled;
};

export const transform = async (input: unknown, expression: string, extraBindings: Record<string, IAppBinding> = {}) => {
  try {
    getLogger().info('Running transformation...');

    const expr = await compileExpression(expression);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    let bindings: Record<string, unknown> = {};

    // bind functions
    bindings.translateCode = translate.translateCode;
    bindings.translate = translate.translateCode;
    bindings.translateCoding = translate.translateCoding;
    bindings.parseCsv = parseCsv;
    bindings.v2json = v2json;

    // these are debug functions, should be removed in production versions
    bindings.getTable = conformance.getTable;
    // bindings.getCodeSystem = conformance.getCodeSystem;
    // bindings.getValueSet = conformance.getValueSet;
    // end of debug functions

    // bind all aliases from FumeMappingProvider
    try {
      const provider = getMappingProvider();
      const aliases = provider.getAliases();
      bindings = { 
        ...aliases, 
        ...bindings,
        ...extraBindings
      };
    } catch {
      // Provider not initialized (stateless mode) - no aliases
      bindings = { 
        ...bindings,
        ...extraBindings
      };
    }

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
