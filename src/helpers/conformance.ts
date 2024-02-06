/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import {
  read
  , search
} from './client';
import transpiler from '../transpiler';
import config from '../config';
import expressions from './jsonataExpression';
import cache from './cache';
import objectFuncs from './objectFunctions';
import { isNumeric } from './stringFunctions';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { fpl } from 'fhir-package-loader';
import { getLogger } from './logger';

export const getStructureDefinition = async (definitionId: string): Promise<any> => {
  const logger = getLogger();
  const indexed = cache.fhirCacheIndex[config.getFhirVersionWithoutPatch()].structureDefinitions.byId[definitionId] ??
    cache.fhirCacheIndex[config.getFhirVersionWithoutPatch()].structureDefinitions.byUrl[definitionId] ??
    cache.fhirCacheIndex[config.getFhirVersionWithoutPatch()].structureDefinitions.byName[definitionId];

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
    return fullDef;
  };
};

const createPackageIndexFile = (packagePath: string) => {
  const logger = getLogger();
  try {
    const fileList = fs.readdirSync(path.join(packagePath, 'package'));
    const files = fileList.flatMap((file: string) => {
      if (file.endsWith('.json') && file !== 'package.json') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const content = require(path.join(packagePath, 'package', file));
        const indexEntry = {
          filename: file,
          resourceType: content.resourceType,
          id: content.id,
          url: (typeof content.url === 'string' ? content.url : undefined),
          version: (typeof content.version === 'string' ? content.version : undefined),
          kind: (typeof content.kind === 'string' ? content.kind : undefined),
          type: (typeof content.type === 'string' ? content.type : undefined)
        };
        return indexEntry;
      } else {
        return [];
      }
    });
    fs.writeFileSync(path.join(packagePath, 'package', '.index.json'), JSON.stringify({ 'index-version': 1, files }, null, 2));
  } catch (e) {
    logger.error(e);
    return false;
  };
  return true;
};

export const loadPackage = async (fhirPackage: string | string[]) => {
  const logger = getLogger();
  return await fpl(fhirPackage, {
    log: (level: string, message: string) => {
      if (level === 'error') {
        logger.error(message);
      } else {
        logger.info({ level, message });
      }
    }
  });
};

const buildFhirCacheIndex = async () => {
  const logger = getLogger();
  logger.info('Building global package index (this might take some time...)');
  const cachePath = path.join(os.homedir(), '.fhir', 'packages');
  const dirList: string[] = fs.readdirSync(cachePath, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(dir => dir.name);
  logger.info(`FHIR Packages found in global cache: ${dirList.join(', ')}`);
  const packageIndexArray = dirList.map(pack => {
    if (fs.existsSync(path.join(cachePath, pack, 'package', 'package.json')) && !fs.existsSync(path.join(cachePath, pack, 'package', '.index.json'))) {
      logger.info(`Generating .index.json for package ${pack}...`);
      createPackageIndexFile(path.join(cachePath, pack));
    };
    return {
      package: pack,
      path: path.join(cachePath, pack, 'package'),
      packageManifest: require(path.join(cachePath, pack, 'package', 'package.json')),
      packageIndex: require(path.join(cachePath, pack, 'package', '.index.json'))
    };
  });

  const bindings = {
    omitKeys: objectFuncs.omitKeys,
    pathJoin: path.join,
    require: (filePath: string) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const payload = require(filePath);
        return payload;
      } catch (e) {
        logger.error(e);
        throw (e);
      }
    },
    isNumeric
  };
  const packageIndexObject = await expressions.createRawPackageIndexObject.evaluate(packageIndexArray, bindings);

  const fixedIndex = await expressions.fixPackageIndexObject.evaluate(packageIndexObject, { isNumeric });
  return fixedIndex;
};

const getFhirCacheIndex = async () => {
  const logger = getLogger();
  const cachePath = path.join(os.homedir(), '.fhir');
  const fumeIndexPath = path.join(cachePath, 'fume.index.json');
  if (fs.existsSync(fumeIndexPath)) {
    logger.info(`Found global package index file at ${fumeIndexPath}`);
    const dirList: string[] = fs.readdirSync(path.join(cachePath, 'packages'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(dir => dir.name);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const currentIndex = require(fumeIndexPath);
    const currentPackages = await expressions.extractCurrentPackagesFromIndex.evaluate(currentIndex);
    const diff: string[] = await expressions.checkPackagesMissingFromIndex.evaluate({ dirList, packages: currentPackages });
    if (diff.length === 0) {
      logger.info('Global package index file is up-to-date');
      return require(fumeIndexPath);
    } else {
      logger.info('Global package index file is outdated');
    };
  } else {
    logger.info('Global package index file is missing');
  }
  const fumeIndexFile = await buildFhirCacheIndex();
  fs.writeFileSync(fumeIndexPath, JSON.stringify(fumeIndexFile, null, 2));
  return fumeIndexFile;
};

export const loadFhirCacheIndex = async () => {
  const logger = getLogger();
  try {
    logger.info('Trying to load global package index...');
    const index = await getFhirCacheIndex();
    cache.fhirCacheIndex = index;
    return true;
  } catch (e) {
    logger.error(e);
    throw (e);
  }
};

const getTable = async (tableId: string) => {
  if (config.isStatelessMode()) {
    throw new Error('FUME running in stateless mode. Cannot perform $registerTable()');
  };
  if (tableId === undefined || tableId.trim() === '') {
    // exit if no id provided
    throw new Error('First argument to function getTable must be a table id, url or name');
  };
  const err = new Error(`Failed to fetch ConceptMap whose id, url or name is: '${tableId}'`);
  let response;
  try {
    // try to fetch by id
    response = await read('ConceptMap/' + tableId);
  } catch {
    // not found by id
    try {
      // try by url
      response = await search('ConceptMap', { url: tableId });
      if (typeof response === 'object' && typeof response.total === 'number' && response.total !== 1) {
        // try by name
        response = await search('ConceptMap', { name: tableId });
        if (typeof response === 'object' && typeof response.total === 'number' && response.total !== 1) {
          // coudn't find
          throw err;
        }
      }
    } catch {
      throw err;
    }
  };
  const table = await expressions.conceptMapToTable.evaluate(response);
  return table;
};

const getAllMappings = async () => {
  const logger = getLogger();
  if (config.isStatelessMode()) {
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

const getAliasResource = async () => {
  const logger = getLogger();
  if (config.isStatelessMode()) {
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
  const logger = getLogger();
  if (config.isStatelessMode()) {
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

const getNextBundle = async (bundle) => {
  if (config.isStatelessMode()) {
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
  if (config.isStatelessMode()) {
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

export const cacheMapping = (mappingId: string, mappingExpr: string) => {
  const mappingFunc = transpiler.toFunction(mappingExpr);
  const cacheEntry = {
    expression: mappingExpr,
    function: mappingFunc
  };
  cache.mappings[mappingId] = cacheEntry;
};

export const recacheFromServer = async (): Promise<boolean> => {
  // load tables, aliases and mappings
  const logger = getLogger();
  if (config.isStatelessMode()) {
    logger.error('FUME running in stateless mode. Cannot recache from server.');
    return false;
  };
  try {
    cache.aliases = await getAliases();
    if (cache.aliases !== undefined && Object.keys(cache.aliases).length > 0) {
      logger.info(`Updated cache with aliases: ${Object.keys(cache.aliases).join(', ')}.`);
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

export default {
  getAllMappings,
  getStructureDefinition,
  getAliasResource,
  getTable,
  loadFhirCacheIndex,
  getAliases,
  loadPackage,
  recacheFromServer,
  cacheMapping
};
