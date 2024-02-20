/* eslint-disable no-multi-spaces */
/* eslint-disable no-trailing-spaces */
/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { getCache } from './cache/cache';
import thrower from './thrower';
import * as stringFuncs from './stringFunctions';
import fhirFuncs from './fhirFunctions';
import jsonata from 'jsonata';
import { getLogger } from './logger';
import compiler from './parser';
import HL7Dictionary from 'hl7-dictionary';
import config from '../serverConfig';
import runtime from './runtime';
import conformance from './conformance';
import * as v2 from './hl7v2';
import * as objectFuncs from './objectFunctions';

// TODO: get from app instance
const fhirVersionMinor = fhirFuncs.fhirVersionToMinor(config.FHIR_VERSION);

const getStructureDefinitionPath = (definitionId: string): any => {
  // fork: os
  const fhirPackageIndex = conformance.getFhirPackageIndex();
  const cached = fhirPackageIndex[fhirVersionMinor];
  const indexed = cached.structureDefinitions.byId[definitionId] ?? 
    cached.structureDefinitions.byUrl[definitionId] ?? 
    cached.structureDefinitions.byName[definitionId];

  if (!indexed) { // if not indexed, throw warning and return nothing
    const msg = 'Definition "' + definitionId + '" not found!';
    getLogger().warn(msg);
    return undefined;
  } else if (Array.isArray(indexed)) {
    const error = new Error(`Found multiple definition with the same id "${definitionId}"!`);
    getLogger().error(error);
    throw (error);
  } else {
    return indexed;
  }
};

export const getStructureDefinition = (definitionId: string): any => {
  try {
    const path: string = getStructureDefinitionPath(definitionId); 

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fullDef = require(path); // load file
    // getLogger().info(`Definition loaded: ${path}`);
    return fullDef;
  } catch (e) {
    return thrower.throwParseError(`A Problem occured while getting the structure definition of '${definitionId}'. The error is: ${e}`);
  }
};

export const logInfo = (message) => {
  // fork: os
  getLogger().info(message);
  return undefined;
};

export const logWarn = (message) => {
  // fork: os
  getLogger().warn(message);
  return undefined;
};

const isEmptyExpr = jsonata(`(
  $exists($value)?(
    $typeOfValue := $type($value);
    $typeOfValue != 'null' ? (
      $typeOfValue != 'string' ? (
        $typeOfValue = 'object' ? (
          $value = {} ? (
            true
            ):(
              /* check all keys of object */
              $boolean($value.*)?false:true;
            )
        ):(
          $typeOfValue = 'array' ? (
            $value = [] ? (
              true
            ):(
              /* check all array values */
            $boolean($value)?false:true
            )
          ):(
            $typeOfValue = 'number' ? (
              false /* a number is regarded as non-empty */
            ):(
              $typeOfValue = 'boolean' ? (
                false /* boolean is regarded as non-empty */
              ):(
                true /* type is a function, regarded as empty */
              )
            )
          )
        )
      ):(
        false
      )
    ):true;
  ):true;    
)`);

const isEmpty = async (value) => {
  // fork: os
  const res = isEmptyExpr.evaluate({}, { value });
  return await res;
};

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

const registerTable = (tableId: string): string => {
  return 'No need to register tables anymore. You may use $translate() with any ConceptMap that exists on your FHIR server. The $registerTable function has been depricated.';
};

const transform = async (input, expression: string) => {
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
    bindings.isEmpty = isEmpty;
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

    const { compiledDefinitions, aliases } = getCache();
    // these are debug functions, should be removed in production versions
    bindings.fhirCacheIndex = conformance.getFhirPackageIndex();
    bindings.getSnapshot = compiler.getSnapshot;
    bindings.getStructureDefinition = getStructureDefinition;
    bindings.getTable = conformance.getTable;
    bindings.v2dictionary = HL7Dictionary.definitions;
    bindings.v2codeLookup = v2.v2codeLookup;
    bindings.v2tableUrl = v2.v2tableUrl;
    bindings.toJsonataString = compiler.toJsonataString;
    bindings.compiledDefinitions = compiledDefinitions.getDict();
    bindings.getMandatoriesOfElement = compiler.getMandatoriesOfElement;
    bindings.getMandatoriesOfStructure = compiler.getMandatoriesOfStructure;
    bindings.getElementDefinition = compiler.getElementDefinition;
    bindings.replaceColonsWithBrackets = compiler.replaceColonsWithBrackets;
    // end of debug functions

    // bind all aliases from cache
    bindings = { 
      ...aliases.getDict(), 
      ...bindings 
    };

    const res = await expr.evaluate(input, bindings);
    return res;
  } catch (error) {
    getLogger().error(error);
    throw error;
  }
};

const mappingToJsFunction = (mapping) => {
  // fork: os
  return async (input) => {
    const res = await transform(input, mapping);
    return res;
  };
};

const cacheMapping = (mappingId: string, mappingExpr: string) => {
  // fork: os
  const { compiledMappings } = getCache();
  const mappingFunc = mappingToJsFunction(mappingExpr);
  const cacheEntry = {
    expression: mappingExpr,
    function: mappingFunc
  };
  compiledMappings.set(mappingId, cacheEntry);
};

export default {
  transform,
  mappingToJsFunction,
  cacheMapping,
  getStructureDefinition,
  getStructureDefinitionPath,
  logInfo
};
