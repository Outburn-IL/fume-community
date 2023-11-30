/* eslint-disable no-multi-spaces */
/* eslint-disable no-trailing-spaces */
/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import cache from '../logic/cache';
import jsonata from 'jsonata';
import logger from '../logic/logFunctions';
import addFumeFuncs from '../logic/additionalJsonataFunctions';

const fhirVersionMinor = addFumeFuncs.getMinorFhirVersion();

const getStructureDefinition = async (definitionId: string): Promise<any> => {
  // fork: os
  const indexed = cache.fhirCacheIndex[fhirVersionMinor].structureDefinitions.byId[definitionId] ?? 
    cache.fhirCacheIndex[fhirVersionMinor].structureDefinitions.byUrl[definitionId] ?? 
    cache.fhirCacheIndex[fhirVersionMinor].structureDefinitions.byName[definitionId];

  if (!indexed) { // if not indexed, throw warning and return nothing
    const msg = 'Definition "' + definitionId + '" not found!';
    logger.warn(msg);
    return undefined;
  } else if (Array.isArray(indexed)) {
    const error = new Error(`Found multiple definition with the same id "${definitionId}"!`);
    logger.error(error);
    throw (error);
  } else {
    const path: string = indexed;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fullDef = require(path); // load file
    // logger.info(`Definition loaded: ${path}`);
    return fullDef;
  };
};

const logInfo = (message) => {
  // fork: os
  logger.info(message);
  return undefined;
};

const logWarn = (message) => {
  // fork: os
  logger.warn(message);
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
  return await addFumeFuncs.compiledExpression(expression);
};

export default {
  getStructureDefinition,
  logInfo,
  logWarn,
  isEmpty,
  compiledExpression
};
