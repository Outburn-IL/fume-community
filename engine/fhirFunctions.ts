/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import config from '../logic/config';
import stringFuncs from './stringFunctions';
import expressions from './jsonataExpression';
import throwErrors from '../logic/throwErrors';
import cache from '../logic/cache';
import conformance from './conformance';
import { read, search as fhirSearch } from '../logic/dataAccess/fhirCruds';

const logger = config.getLogger();

const reference = (resource: any): string | undefined => {
  // takes a resource generated in the current expression and returns
  // its urn:uuid hash that represents its identity inside a bundle
  if (typeof resource === 'object' && Object.keys(resource).length > 0 && !Array.isArray(resource)) {
    return 'urn:uuid:' + stringFuncs.uuid(JSON.stringify(resource));
  }
  return undefined;
};

const translateCode = async (input: string, tableId: string) => {
  if (config.isStatelessMode()) {
    return throwErrors.throwRuntimeError('FUME running in stateless mode. Cannot translate codes using $translate()');
  };
  try {
    let map = cache.tables[tableId];
    if (map === undefined) {
      logger.info(`Table ${tableId} not cached, trying to fetch from server...`);
      map = (await conformance.getTable(tableId))[tableId];
      cache.tables[tableId] = map;
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

const translateCoding = async (input, tableId: string) => {
  if (config.isStatelessMode()) {
    return throwErrors.throwRuntimeError('FUME running in stateless mode. Cannot translate codes using $translateCoding()');
  };
  try {
    let map = cache.tables[tableId];
    if (map === undefined) {
      logger.info(`Table ${tableId} not cached, trying to fetch from server...`);
      map = (await conformance.getTable(tableId))[tableId];
      cache.tables[tableId] = map;
    };
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
  await registerTable(tableId);
};

const searchSingle = async (query: string, params?: Record<string, any>): Promise<any | undefined> => {
  if (config.isStatelessMode()) {
    return throwErrors.throwRuntimeError('FUME running in stateless mode. Cannot perform $searchSingle()');
  };
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

const literal = async (query: string, params?: Record<string, any>): Promise<string | undefined> => {
  if (config.isStatelessMode()) {
    return throwErrors.throwRuntimeError('FUME running in stateless mode. Cannot resolve conditional reference using $literal()');
  };
  const res = await expressions.literal.evaluate({}, { query, searchSingle, params });
  return res;
};

const search = async (query: string, params?: Record<string, any>): Promise<Record<string, any> | undefined> => {
  if (config.isStatelessMode()) {
    return throwErrors.throwRuntimeError('FUME running in stateless mode. Cannot perform $search()');
  };
  const url: string = encodeURI(query);
  const res = await fhirSearch(url, params);
  return res;
};

const resolve = async (reference: string): Promise<Record<string, any> | undefined> => {
  // TODO: enable input to be a reference object, and handle logical references (search by identifier)
  // TODO: handle internal bundle and contained references
  if (config.isStatelessMode()) {
    return throwErrors.throwRuntimeError('FUME running in stateless mode. Cannot perform $resolve()');
  };
  if (reference.includes('?')) return throwErrors.throwRuntimeError(`The $resolve function only supports literal references. Got: '${reference}'`);
  let resource;
  try {
    resource = await read(reference);
  } catch (error) {
    return throwErrors.throwRuntimeError(`Failed to resolve reference '${reference}'. ${JSON.stringify(error)}`);
  }
  if ((resource.resourceType === 'Bundle' && !reference.startsWith('Bundle'))) {
    return throwErrors.throwRuntimeError(`The $resolve function can only resolve a reference to a single resource. Response from FHIR server is a Bundle. Reference: '${reference}'`);
  };
  return resource;
};

const resourceId = async (query: string, params?: Record<string, any>): Promise<string | undefined> => {
  if (config.isStatelessMode()) {
    return throwErrors.throwRuntimeError('FUME running in stateless mode. Cannot perform $resourceId()');
  };
  const resource = await searchSingle(query, params);
  if (resource === undefined) {
    return undefined;
  };
  return resource.id;
};

export default {
  resourceId,
  resolve,
  search,
  literal,
  searchSingle,
  translateCoding,
  translateCode,
  reference,
  registerTable,
};
