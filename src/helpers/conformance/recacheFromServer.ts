
import config from '../../config';
import { getCache } from '../cache';
import { read, search } from '../client';
import expressions from '../jsonataExpression';
import jsonataFunctions from '../jsonataFunctions';
import { getLogger } from '../logger';

const logger = getLogger();
const serverConfig = config.getServerConfig();

const toFunction = (mapping: string) => {
  return async (input: any) => {
    const res = await jsonataFunctions.transform(input, mapping);
    return res;
  };
};

export const cacheMapping = (mappingId: string, mappingExpr: string) => {
  const mappingFunc = toFunction(mappingExpr);
  const cacheEntry = {
    expression: mappingExpr,
    function: mappingFunc
  };
  getCache().compiledMappings.set(mappingId, cacheEntry);
};

const getNextBundle = async (bundle) => {
  if (serverConfig.SERVER_STATELESS) {
    throw new Error('FUME running in stateless mode. Cannot get next page of search results budle.');
  };
  let nextBundle;
  const nextLink = await expressions.extractNextLink.evaluate(bundle);
  if (typeof nextLink === 'string' && nextLink > '') {
    nextBundle = await read(nextLink);
  }
  return nextBundle;
};

const fullSearch = async (query, params) => {
  if (serverConfig.SERVER_STATELESS) {
    throw new Error('FUME running in stateless mode. Cannot perform search.');
  };
  const bundleArray: any[] = [];
  let page: Record<string, any> = await search(query, params);
  while (typeof page === 'object' && page?.resourceType === 'Bundle') {
    bundleArray.push(page);
    page = await getNextBundle(page);
  };
  const resourceArray = await expressions.bundleToArrayOfResources.evaluate({}, { bundleArray });
  return resourceArray;
};

const getAliasResource = async () => {
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot fetch aliases from server.');
    return undefined;
  };
  let resource;
  const aliasResourceSearch = await search('ConceptMap', { context: 'http://codes.fume.health|fume', name: 'FumeAliases' });
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
  return resource;
};

const getAliases = async (createFunc?: Function) => {
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot fetch mappings from server.');
    return undefined;
  };
  let aliasObject;
  let aliasResource = await getAliasResource();
  if (typeof aliasResource === 'object') {
    if (typeof aliasResource.resourceType === 'string' && aliasResource.resourceType === 'ConceptMap') {
      aliasObject = await expressions.aliasResourceToObject.evaluate(aliasResource);
    } else {
      if (createFunc !== undefined) {
        logger.info('Creating new alias resource...');
        aliasResource = await createFunc();
        aliasObject = await expressions.aliasResourceToObject.evaluate(aliasResource);
      }
    }
  };
  return aliasObject;
};

const getAllMappings = async () => {
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot fetch mappings from server.');
    return undefined;
  };
  const allStructureMaps = await fullSearch('StructureMap/', { context: 'http://codes.fume.health|fume' });
  const mappingObject = await expressions.structureMapsToMappingObject.evaluate(allStructureMaps);
  if (typeof mappingObject === 'object' && Object.keys(mappingObject).length > 0) {
    logger.info('Loaded the following mappings from server: ' + Object.keys(mappingObject).join(', '));
  };
  return mappingObject;
};

export const recacheFromServer = async (): Promise<boolean> => {
  // load tables, aliases and mappings
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot recache from server.');
    return false;
  };
  try {
    const { aliases } = getCache();
    aliases.reset();
    aliases.populate(await getAliases());
    if (aliases.keys().length > 0) {
      logger.info(`Updated cache with aliases: ${aliases.keys().join(', ')}.`);
    };
    const mappingObject = await getAllMappings();
    Object.keys(mappingObject).forEach((key: string) => {
      cacheMapping(key, mappingObject[key]);
    });
    if (mappingObject !== undefined && Object.keys(mappingObject).length > 0) {
      logger.info(`Updated cache with mappings: ${Object.keys(mappingObject).join(', ')}.`);
    };
    // TODO: clear deleted mappings from cache
  } catch (e) {
    logger.error(e);
    return false;
  };
  return true;
};
