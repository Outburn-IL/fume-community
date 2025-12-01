/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
/* eslint-disable no-trailing-spaces */
/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { FhirStructureNavigator } from '@outburn/structure-navigator';
import { BaseFhirVersion, FhirSnapshotGenerator } from 'fhir-snapshot-generator';
import fumifier, { FumifierCompiled, FumifierOptions, MappingCacheInterface } from 'fumifier';
import HL7Dictionary from 'hl7-dictionary';

import config from '../../config';
import { IAppBinding } from '../../types';
import { getCache } from '../cache';
import * as conformance from '../conformance';
import { codeSystemDictionary, valueSetExpandDictionary } from '../conformance/conformance';
import fhirFuncs from '../fhirFunctions';
import { parseCsv } from '../inputConverters';
import * as v2 from '../inputConverters/hl7v2';
import { getLogger } from '../logger';
import * as objectFuncs from '../objectFunctions';
import * as stringFuncs from '../stringFunctions';
import { logInfo, logWarn } from './log';

const dev = process.env.NODE_ENV === 'dev';
const fumeMappingCache = getCache().mappings;
const fhirPackageContext = Object.keys(config.getFhirPackages());
const fhirVersion = config.getFhirVersion() as BaseFhirVersion;
const fhirPackageCachePath = config.getFhirPackageCacheDir();
const registryUrl = config.getFhirPackageRegistryUrl();
const registryToken = config.getFhirPackageRegistryToken();
let generator: FhirSnapshotGenerator | null = null;
let navigator: FhirStructureNavigator | null = null;

const getFsg = async () => {
  if (!generator) {
    generator = await FhirSnapshotGenerator.create({
      context: fhirPackageContext,
      cachePath: fhirPackageCachePath,
      fhirVersion,
      cacheMode: 'lazy',
      logger: getLogger(),
      registryUrl,
      registryToken
    });
  }
  return generator;
};

const getNavigator = async () => {
  if (!navigator) {
    const fsg = await getFsg();
    navigator = new FhirStructureNavigator(fsg, getLogger());
  };
  return navigator;
};

const getFumifierOptions = async (): Promise<FumifierOptions> => {
  return {
    mappingCache: fumifierMappingCache,
    navigator: await getNavigator()
  };
};

/**
 * An implementation of Fumifier's MappingCacheInterface over the FUME mapping cache
 */
const fumifierMappingCache: MappingCacheInterface = {
  getKeys: async () => {
    return Array.from(fumeMappingCache.keys());
  },
  get: async (key: string) => {
    return fumeMappingCache.get(key);
  }
};

/**
 * Parses and compiles a FUME expression into a FumifierCompiled object
 * @param expression 
 * @returns 
 */
const compileExpression = async (expression: string): Promise<FumifierCompiled> => {
  const { compiledExpressions } = getCache();
  const key = stringFuncs.hashKey(expression); // turn expression string to a key
  let compiled: FumifierCompiled = compiledExpressions.get(key); // get from cache
  if (!compiled) { // not cached, compile it
    const options = await getFumifierOptions();
    compiled = await fumifier(expression, options);
    compiledExpressions.set(key, compiled);
  };
  return compiled;
};

export const transform = async (input: any, expression: string, extraBindings: Record<string, IAppBinding> = {}) => {
  try {
    getLogger().info('Running transformation...');

    const expr = await compileExpression(expression);

    let bindings: Record<string, Function | Record<string, any> | string> = {};

    // bind functions
    bindings.resourceId = fhirFuncs.resourceId;
    bindings.isEmpty = objectFuncs.isEmpty;
    bindings.matches = stringFuncs.matches;
    bindings.stringify = JSON.stringify;
    bindings.selectKeys = objectFuncs.selectKeys;
    bindings.omitKeys = objectFuncs.omitKeys;

    bindings.translateCode = fhirFuncs.translateCode;
    bindings.translate = fhirFuncs.translateCode;
    bindings.translateCoding = fhirFuncs.translateCoding;
    bindings.search = fhirFuncs.search;
    bindings.searchSingle = fhirFuncs.searchSingle;
    bindings.literal = fhirFuncs.literal;
    bindings.resolve = fhirFuncs.resolve;
    bindings.warning = logWarn;
    bindings.info = logInfo;
    bindings.parseCsv = parseCsv;
    bindings.v2parse = v2.v2parse;
    bindings.v2json = v2.v2json;
    bindings.capabilities = fhirFuncs.capabilities;

    const { aliases } = getCache();
    // these are debug functions, should be removed in production versions
    bindings.fhirCacheIndex = conformance.getFhirPackageIndex();
    bindings.getTable = conformance.getTable;
    bindings.v2dictionary = HL7Dictionary.definitions;
    bindings.v2codeLookup = v2.v2codeLookup;
    bindings.v2tableUrl = v2.v2tableUrl;
    if (dev) bindings.valueSetExpandDictionary = valueSetExpandDictionary;
    if (dev) bindings.codeSystemDictionary = codeSystemDictionary;
    bindings.getCodeSystem = conformance.getCodeSystem;
    bindings.getValueSet = conformance.getValueSet;
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
