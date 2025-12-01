/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
/* eslint-disable no-trailing-spaces */
/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import fumifier, { FumifierCompiled } from 'fumifier';
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
import compiler from '../parser';
import { removeComments } from '../parser/removeComments';
import runtime from '../runtime';
import * as stringFuncs from '../stringFunctions';
import { getStructureDefinition } from './getStructureDefinition';
import { logInfo, logWarn } from './log';
import { registerTable } from './registerTable';

const dev = process.env.NODE_ENV === 'dev';

const compiledExpression = async (expression: string): Promise<FumifierCompiled> => {
  const { compiledExpressions } = getCache();
  // takes a fume expression string and compiles it into a jsonata expression
  // or returns the already compiled expression from cache
  const key = stringFuncs.hashKey(expression); // turn expression string to a key
  let compiled: any = compiledExpressions.get(key); // get from cache
  if (compiled === undefined) { // not cached
    getLogger().info('expression not cached, compiling it...');
    const parsedAsJsonataStr = await compiler.toJsonataString(expression);
    compiled = await fumifier(parsedAsJsonataStr!);
    compiledExpressions.set(key, compiled);
  };
  return compiled;
};

export const transform = async (input: any, expression: string, extraBindings: Record<string, IAppBinding> = {}) => {
  try {
    getLogger().info('Running transformation...');

    const expr = await compiledExpression(expression);

    let bindings: Record<string, Function | Record<string, any> | string> = {};

    // bind all mappings from cache
    const { compiledMappings } = getCache();
    const mappingIds: any[] = Array.from(compiledMappings.keys());
    if (mappingIds) {
      mappingIds.forEach((mappingId) => {
        const mapping: any = compiledMappings.get(mappingId);
        expr.registerFunction(mappingId, mapping?.function, '<x-o?:x>');
      });
    }

    // bind functions
    bindings.__checkResourceId = runtime.checkResourceId;
    bindings.__finalize = runtime.finalize;
    bindings.__castToFhir = runtime.castToFhir;
    bindings.__flashMerge = runtime.flashMerge;
    bindings.wait = runtime.wait;
    bindings.resourceId = fhirFuncs.resourceId;
    bindings.initCap = stringFuncs.initCap;
    bindings.isEmpty = objectFuncs.isEmpty;
    bindings.matches = stringFuncs.matches;
    bindings.stringify = JSON.stringify;
    bindings.selectKeys = objectFuncs.selectKeys;
    bindings.omitKeys = objectFuncs.omitKeys;

    bindings.uuid = stringFuncs.uuid;
    bindings.registerTable = registerTable;
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
    bindings.toJsonataString = compiler.toJsonataString;
    if (dev) bindings.getMandatoriesOfElement = compiler.getMandatoriesOfElement;
    if (dev) bindings.getMandatoriesOfStructure = compiler.getMandatoriesOfStructure;
    if (dev) bindings.getElementDefinition = compiler.getElementDefinition;
    if (dev) bindings.replaceColonsWithBrackets = compiler.replaceColonsWithBrackets;
    if (dev) bindings.removeComments = removeComments;
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

    expr.registerFunction('base64encode', stringFuncs.base64encode, '<s-:s>');
    expr.registerFunction('base64decode', stringFuncs.base64decode, '<s-:s>');
    expr.registerFunction('startsWith', stringFuncs.startsWith, '<s-s:b>');
    expr.registerFunction('endsWith', stringFuncs.endsWith, '<s-s:b>');
    expr.registerFunction('isNumeric', stringFuncs.isNumeric, '<j-:b>');
    expr.registerFunction('reference', fhirFuncs.reference, '<o-:s>');
    expr.registerFunction(
      'getStructureDefinition',
      (defId: string) => getStructureDefinition(defId, config.getFhirVersion(), conformance.getFhirPackageIndex(), getLogger()),
      '<s-:o>'
    );
    expr.registerFunction(
      'getSnapshot',
      async (defId: string) => await compiler.getSnapshot(defId, config.getFhirVersion(), conformance.getFhirPackageIndex(), getLogger()),
      '<s-:o>'
    );

    const res = await expr.evaluate(input, bindings);
    return res;
  } catch (error) {
    getLogger().error(error);
    throw error;
  }
};
