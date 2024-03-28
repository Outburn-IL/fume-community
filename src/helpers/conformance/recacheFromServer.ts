
import config from '../../config';
import { getCache } from '../cache';
import { getFhirClient } from '../fhirServer';
import { expressions as expressionsNew } from '../jsonataExpr';
import { transform } from '../jsonataFunctions';
import { getLogger } from '../logger';

const serverConfig = config.getServerConfig();

// Returns the mapping as a function, ready to be called directly from JSONata expressions
const toFunction = (mapping: string) => {
  return async (input: any) => {
    const extraBindings = config.getBindings();
    const res = await transform(input, mapping, extraBindings);
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
  getCache().compiledMappings.set(mappingId, cacheEntry);
};

// Returns the next page in a series of searchset Bundles
const getNextBundle = async (bundle: Record<string, any>) => {
  if (serverConfig.SERVER_STATELESS) {
    throw new Error('FUME running in stateless mode. Cannot get next page of search results bundle.');
  };
  let nextBundle;
  const nextLink = expressionsNew.extractNextLink(bundle);
  if (typeof nextLink === 'string' && nextLink > '') {
    nextBundle = await getFhirClient().read(nextLink);
  }
  return nextBundle;
};

// Scan for all resources in all pages of a FHIR search
const fullSearch = async (query: string, params?: Record<string, any>) => {
  if (serverConfig.SERVER_STATELESS) {
    throw new Error('FUME running in stateless mode. Cannot perform search.');
  };
  const bundleArray: any[] = [];
  let page: Record<string, any> = await getFhirClient().search(query, params);
  while (typeof page === 'object' && page?.resourceType === 'Bundle') {
    bundleArray.push(page);
    page = await getNextBundle(page);
  };
  const resourceArray = expressionsNew.bundleToArrayOfResources(bundleArray);
  return resourceArray;
};

// Searches for the alias ConceptMap resource on the server and returns it
export const getAliasResource = async () => {
  const logger = getLogger();
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot fetch aliases from server.');
    return undefined;
  };
  let resource;
  try {
    const aliasResourceSearch = await getFhirClient().search('ConceptMap', { context: 'http://codes.fume.health|fume', name: 'FumeAliases' });
    if (typeof aliasResourceSearch === 'object' && aliasResourceSearch.resourceType === 'Bundle' && typeof aliasResourceSearch.total === 'number') {
      if (aliasResourceSearch.total === 1) {
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
    };
  } catch (e) {
    resource = {};
  }
  return resource;
};

// Fetches the alias resource and returns it in an alias object structure
const getAliases = async (createFunc?: Function) => {
  const logger = getLogger();
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot fetch mappings from server.');
    return undefined;
  };
  let aliasObject;
  let aliasResource = await getAliasResource();
  if (typeof aliasResource === 'object') {
    if (typeof aliasResource.resourceType === 'string' && aliasResource.resourceType === 'ConceptMap') {
      aliasObject = expressionsNew.aliasResourceToObject(aliasResource);
    } else {
      if (createFunc !== undefined) {
        logger.info('Creating new alias resource...');
        aliasResource = await createFunc();
        aliasObject = expressionsNew.aliasResourceToObject(aliasResource);
      }
    }
  };
  return aliasObject;
};

// Searches the server for all saved mappings and returns their expressions in a single dictionary
const getAllMappings = async (): Promise<Record<string, string>> => {
  const logger = getLogger();
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot fetch mappings from server.');
    return {};
  };
  const allStructureMaps = await fullSearch('StructureMap/', { context: 'http://codes.fume.health|fume' });
  const mappingDict: Record<string, string> = expressionsNew.structureMapsToMappingObject(allStructureMaps);
  if (Object.keys(mappingDict).length > 0) {
    logger.info('Loaded the following mappings from server: ' + Object.keys(mappingDict).join(', '));
  };
  return mappingDict;
};

// Resets the cache and reloads it from the FHIR server
export const recacheFromServer = async (): Promise<boolean> => {
  const logger = getLogger();
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot recache from server.');
    return false;
  };
  try {
    const { aliases, compiledMappings } = getCache();
    aliases.reset();
    aliases.populate(await getAliases());
    if (aliases.keys().length > 0) {
      logger.info(`Updated cache with aliases: ${aliases.keys().join(', ')}.`);
    };
    const mappingDict: Record<string, string> = await getAllMappings();
    compiledMappings.reset();
    Object.keys(mappingDict).forEach((key: string) => {
      cacheMapping(key, mappingDict[key]);
    });
    if (Object.keys(mappingDict).length > 0) {
      logger.info(`Updated cache with mappings: ${Object.keys(mappingDict).join(', ')}.`);
    };
  } catch (e) {
    logger.error(e);
    return false;
  };

  return true;
};
