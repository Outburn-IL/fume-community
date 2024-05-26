/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
/* eslint-disable no-trailing-spaces */
/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import HL7Dictionary from 'hl7-dictionary';
import jsonata from 'jsonata';

import { IAppBinding } from '../../types';
import { getCache } from '../cache';
import * as conformance from '../conformance';
import fhirFuncs from '../fhirFunctions';
import * as v2 from '../hl7v2';
import { getLogger } from '../logger';
import * as objectFuncs from '../objectFunctions';
import compiler from '../parser';
import runtime from '../runtime';
import * as stringFuncs from '../stringFunctions';
import { getStructureDefinition } from './getStructureDefinition';
import { logInfo, logWarn } from './log';
import { registerTable } from './registerTable';

const compiledExpression = async (expression: string): Promise<jsonata.Expression> => {
  const { compiledExpressions } = getCache();
  // takes a fume expression string and compiles it into a jsonata expression
  // or returns the already compiled expression from cache
  const key = stringFuncs.hashKey(expression); // turn expression string to a key
  let compiled: any = compiledExpressions.get(key); // get from cache
  if (compiled === undefined) { // not cached
    getLogger().info('expression not cached, compiling it...');
    const parsedAsJsonataStr = await compiler.toJsonataString(expression);
    compiled = jsonata(parsedAsJsonataStr!);
    compiledExpressions.set(key, compiled);
  };
  return compiled;
};

export const transform = async (input, expression: string, extraBindings: Record<string, IAppBinding> = {}) => {
  // fork: os
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
        bindings[mappingId] = mapping?.function;
      });
    }

    // bind functions
    bindings.__checkResourceId = runtime.checkResourceId;
    bindings.__finalize = runtime.finalize;
    bindings.__castToFhir = runtime.castToFhir;
    bindings.__flashMerge = runtime.flashMerge;
    bindings.reference = fhirFuncs.reference;
    bindings.resourceId = fhirFuncs.resourceId;
    bindings.initCap = stringFuncs.initCap;
    bindings.isEmpty = objectFuncs.isEmpty;
    bindings.matches = stringFuncs.matches;
    bindings.stringify = JSON.stringify;
    bindings.selectKeys = objectFuncs.selectKeys;
    bindings.omitKeys = objectFuncs.omitKeys;
    bindings.startsWith = stringFuncs.startsWith;
    bindings.endsWith = stringFuncs.endsWith;
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
    bindings.parseCsv = stringFuncs.parseCsv;
    bindings.v2parse = v2.v2parse;
    bindings.v2json = v2.v2json;
    bindings.isNumeric = stringFuncs.isNumeric;
    bindings.capabilities = fhirFuncs.capabilities;

    const { aliases } = getCache();
    // these are debug functions, should be removed in production versions
    bindings.fhirCacheIndex = conformance.getFhirPackageIndex();
    bindings.getSnapshot = compiler.getSnapshot;
    bindings.getStructureDefinition = getStructureDefinition;
    bindings.getTable = conformance.getTable;
    bindings.v2dictionary = HL7Dictionary.definitions;
    bindings.v2codeLookup = v2.v2codeLookup;
    bindings.v2tableUrl = v2.v2tableUrl;
    bindings.toJsonataString = compiler.toJsonataString;
    bindings.getMandatoriesOfElement = compiler.getMandatoriesOfElement;
    bindings.getMandatoriesOfStructure = compiler.getMandatoriesOfStructure;
    bindings.getElementDefinition = compiler.getElementDefinition;
    bindings.replaceColonsWithBrackets = compiler.replaceColonsWithBrackets;
    // end of debug functions

    // bind all aliases from cache
    bindings = { 
      ...aliases.getDict(), 
      ...bindings,
      ...extraBindings
    };

    const res = await expr.evaluate(input, bindings);
    return res;
  } catch (error) {
    getLogger().error(error);
    throw error;
  }
};
