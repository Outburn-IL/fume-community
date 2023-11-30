/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import stringFuncs from './stringFunctions';
import expressions from './jsonataExpression';
import thrower from '../logic/throwErrors';
import params from '../logic/cache';
import logger from '../logic/logFunctions';
import utils from '../logic/dataAccess/utils';
import { read, search as fhirSearch } from '../logic/dataAccess/fhirCruds';
import addFumeFuncs from '../logic/additionalJsonataFunctions'

export const reference = (resource: any): string | undefined => {
  if (typeof resource === 'object' && Object.keys(resource).length > 0 && !Array.isArray(resource)) {
    return 'urn:uuid:' + stringFuncs.uuid(JSON.stringify(resource));
  }

  return undefined;
};

export const fhirVersionToMinor = (fhirVersion: string) => {
  const parts = fhirVersion.split('.');
  return parts[0] + '.' + parts[1];
};

export const translateCode = async (input: string, tableId: string) => {
  // fork: os
  try {
    let map = params.tableCache[tableId];
    if (map === undefined) {
      logger.info(`Table ${tableId} not cached, trying to fetch from server...`);
      map = (await utils.getTable(tableId))[tableId];
      params.tableCache[tableId] = map;
    };

    const mapFiltered = map[input];
    let result;

    if (mapFiltered) {
      if (mapFiltered.length === 1) {
        result = mapFiltered[0].code;
      } else {
        result = await expressions.translateCodeExtract.evaluate({}, { mapFiltered });
      }
    }
    return result;
  } catch (error) {
    logger.error({ error });
    return undefined;
  }
};

export const translateCoding = async (input, tableId) => {
  // fork: os
  try {
    const map = params.tableCache[tableId];
    const mapFiltered = map[input];
    let result;

    if (mapFiltered) {
      if (mapFiltered.length === 1) {
        result = mapFiltered[0];
      } else {
        result = mapFiltered;
      }
    }

    const coding = await expressions.translateCodingExtract.evaluate({}, { result, input });
    return coding;
  } catch (error) {
    logger.error({ error });
    return undefined;
  }
};

const registerTable = async (tableId: string) => {
  await addFumeFuncs.registerTable(tableId);
};

export const searchSingle = async (query: string, params?: Record<string, any>): Promise<any | undefined> => {
  const url: string = encodeURI(query);
  let options: Record<string, any> = {
    _count: 1
  };
  if (typeof params === 'object' && !Array.isArray(params) && Object.keys(params).length > 0) {
    options = {
      ...options,
      ...params
    };
  };

  const bundle = await fhirSearch(url, options);
  const res = await expressions.searchSingle.evaluate({}, { bundle });
  return res;
};

export const literal = async (query: string, params?: Record<string, any>): Promise<string | undefined> => {
  const res = await expressions.literal.evaluate({}, { query, searchSingle, params });
  return res;
};

export const search = async (query: string, params?: Record<string, any>): Promise<Record<string, any> | undefined> => {
  const url: string = encodeURI(query);
  const res = await fhirSearch(url, params);
  return res;
};

export const resolve = async (reference: string): Promise<Record<string, any> | undefined> => {
  // TODO: enable input to be a reference object, and handle logical references (search by identifier)
  // TODO: handle internal bundle and contained references
  if (reference.includes('?')) return thrower.throwRuntimeError(`The $resolve function only supports literal references. Got: '${reference}'`);
  let resource;
  try {
    resource = await read(reference);
  } catch (error) {
    return thrower.throwRuntimeError(`Failed to resolve reference '${reference}'. ${JSON.stringify(error)}`);
  }
  if ((resource.resourceType === 'Bundle' && !reference.startsWith('Bundle'))) {
    return thrower.throwRuntimeError(`The $resolve function can only resolve a reference to a single resource. Response from FHIR server is a Bundle. Reference: '${reference}'`);
  };
  return resource;
};

export const resourceId = async (query: string, params?: Record<string, any>): Promise<string | undefined> => {
  // fork: os
  const resource = await searchSingle(query, params);
  let resourceId: string;
  if (resource === undefined) {
    resourceId = undefined;
  } else {
    resourceId = resource.id;
  }
  return resourceId;
};

export default {
  resourceId,
  resolve,
  search,
  literal,
  searchSingle,
  translateCoding,
  translateCode,
  fhirVersionToMinor,
  reference,
  registerTable
};
