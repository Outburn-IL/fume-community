/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import config from '../../config';
import { getCache } from '../cache';
import { getFhirClient } from '../fhirClient';
import expressions from '../jsonataExpressions';
import { getLogger } from '../logger';
import { transform } from '../transform';

const serverConfig = config.getServerConfig();

// Returns the mapping as a function, ready to be called directly from JSONata expressions
const toFunction = (mapping: string) => {
  return async (input: unknown, bindings?: Record<string, unknown>) => {
    const extraBindings = config.getBindings();
    const res = await transform(input, mapping, { ...extraBindings, ...bindings });
    return res;
  };
};

// Saves a mapping's expression and function in cache
export const cacheMapping = (mappingId: string, mappingExpr: string) => {
  const mappingFunc = toFunction(mappingExpr);
  const cacheEntry = {
    expression: mappingExpr,
    function: mappingFunc
  };
  const cache = getCache();
  cache.compiledMappings.set(mappingId, cacheEntry);
  // Also store raw expression in mappings cache for fumifier access
  cache.mappings.set(mappingId, mappingExpr);
};

// Scan for all resources in all pages of a FHIR search using fetchAll
const fullSearch = async (query: string, params?: Record<string, string | number | boolean | (string | number | boolean)[]>) => {
  if (serverConfig.SERVER_STATELESS) {
    throw new Error('FUME running in stateless mode. Cannot perform search.');
  }
  
  const client = getFhirClient();
  
  // Remove trailing slash if present
  const cleanQuery = query.endsWith('/') ? query.slice(0, -1) : query;
  
  // Use fetchAll option to automatically traverse all pages
  // This returns an array of resources instead of a Bundle
  const resourceArray = await client.search(cleanQuery, params, { fetchAll: true });
  return resourceArray;
};

// Searches for the alias ConceptMap resource on the server and returns it
export const getAliasResource = async () => {
  const logger = getLogger();
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot fetch aliases from server.');
    return undefined;
  }
  let resource;
  try {
    const aliasResourceSearch = await getFhirClient().search('ConceptMap', { context: 'http://codes.fume.health|fume', name: 'FumeAliases' });
    // Check if it's a Bundle (not an array from fetchAll)
    if (!Array.isArray(aliasResourceSearch) && typeof aliasResourceSearch === 'object' && 'resourceType' in aliasResourceSearch && aliasResourceSearch.resourceType === 'Bundle') {
      if (aliasResourceSearch.total === 1 && aliasResourceSearch.entry?.[0]) {
        logger.info(`Alias resource found: ${aliasResourceSearch.entry[0].fullUrl as string}`);
        resource = aliasResourceSearch.entry[0].resource;
      } else {
        if (aliasResourceSearch.total === 0) {
          logger.info('Alias resource not found');
          resource = {};
        } else {
          logger.error('Multiple alias resources found on server!');
        }
      }
    } else {
      logger.error('Error fetching alias resource!');
    }
  } catch {
    resource = {};
  }
  return resource;
};

// Fetches the alias resource and returns it in an alias object structure
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const getAliases = async (createFunc?: Function) => {
  const logger = getLogger();
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot fetch mappings from server.');
    return undefined;
  }
  let aliasObject;
  let aliasResource = await getAliasResource();
  if (typeof aliasResource === 'object') {
    if (typeof aliasResource.resourceType === 'string' && aliasResource.resourceType === 'ConceptMap') {
      aliasObject = await (await expressions).aliasResourceToObject.evaluate(aliasResource);
    } else {
      if (createFunc !== undefined) {
        logger.info('Creating new alias resource...');
        aliasResource = await createFunc();
        aliasObject = await (await expressions).aliasResourceToObject.evaluate(aliasResource);
      }
    }
  }
  return aliasObject;
};

// Searches the server for all saved mappings and returns their expressions in a single dictionary
const getAllMappings = async (): Promise<Record<string, string>> => {
  const logger = getLogger();
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot fetch mappings from server.');
    return {};
  }
  const allStructureMaps = await fullSearch('StructureMap', { context: 'http://codes.fume.health|fume' });
  const mappingDict: Record<string, string> = await (await expressions).structureMapsToMappingObject.evaluate(allStructureMaps);
  if (Object.keys(mappingDict).length > 0) {
    logger.info('Loaded the following mappings from server: ' + Object.keys(mappingDict).join(', '));
  }
  return mappingDict;
};

// Resets the cache and reloads it from the FHIR server
export const recacheFromServer = async (): Promise<boolean> => {
  const logger = getLogger();
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot recache from server.');
    return false;
  }
  try {
    const { aliases, compiledMappings } = getCache();
    aliases.reset();
    aliases.populate(await getAliases());
    if (aliases.keys().length > 0) {
      logger.info(`Updated cache with aliases: ${aliases.keys().join(', ')}.`);
    }
    const mappingDict: Record<string, string> = await getAllMappings();
    compiledMappings.reset();
    Object.keys(mappingDict).forEach((key: string) => {
      cacheMapping(key, mappingDict[key]);
    });
    if (Object.keys(mappingDict).length > 0) {
      logger.info(`Updated cache with mappings: ${Object.keys(mappingDict).join(', ')}.`);
    }
  } catch (e) {
    logger.error(e);
    return false;
  }

  return true;
};
