/**
 * © Copyright Outburn Ltd. 2022 All Rights Reserved
 *   Project name: FUME
 */

import expressions from "../../engine/jsonataExpression";
import cache from "../cache";
import config from "../config";
import parser from '../../engine/parser'
import conformance from "../../engine/conformance";

export const getAliases = async (createFunc?: Function) => {
  const logger = config.getLogger();
  if (config.isStatelessMode()) {
    logger.error('FUME running in stateless mode. Cannot fetch mappings from server.');
    return undefined;
  };
  let aliasObject;
  let aliasResource = await conformance.getAliasResource();
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

export const recacheFromServer = async () => {
  // load tables, aliases and mappings
  const logger = config.getLogger();
  if (config.isStatelessMode()) {
    logger.error('FUME running in stateless mode. Cannot recache from server.');
    return false;
  };
  try {
    cache.aliases = await getAliases();
    if (cache.aliases !== undefined && Object.keys(cache.aliases).length > 0) {
      logger.info(`Updated cache with aliases: ${Object.keys(cache.aliases).join(', ')}.`);
    };
    const mappingObject = await conformance.getAllMappings();
    Object.keys(mappingObject).forEach((key: string) => {
      parser.cacheMapping(key, mappingObject[key]);
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
  getAliases,
  recacheFromServer
};
