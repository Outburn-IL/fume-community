/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import config from '../config';
import { getCache } from './cache';
import { getLogger } from './logger';
import { getMappingProvider } from './mappingProvider';
import { transform } from './transform';

// Returns the mapping as a function, ready to be called directly from JSONata expressions
const toFunction = (mapping: string) => {
  return async (input: unknown, bindings?: Record<string, unknown>) => {
    const extraBindings = config.getBindings();
    const res = await transform(input, mapping, { ...extraBindings, ...bindings });
    return res;
  };
};

// Saves a mapping's compiled function in cache, keyed by expression
export const cacheMapping = (mappingExpr: string) => {
  const cache = getCache();
  // Only cache if not already cached
  if (!cache.compiledMappings.get(mappingExpr)) {
    const mappingFunc = toFunction(mappingExpr);
    const cacheEntry = {
      function: mappingFunc
    };
    cache.compiledMappings.set(mappingExpr, cacheEntry);
  }
};

// Reloads aliases and mappings from the FHIR server using FumeMappingProvider
export const recacheFromServer = async (): Promise<boolean> => {
  const logger = getLogger();
  const serverConfig = config.getServerConfig();
  if (serverConfig.SERVER_STATELESS) {
    logger.error('FUME running in stateless mode. Cannot recache from server.');
    return false;
  }
  try {
    const provider = getMappingProvider();
    const { compiledMappings } = getCache();
    
    // Reload aliases from server
    await provider.reloadAliases();
    const aliasObject = provider.getAliases();
    const aliasKeys = Object.keys(aliasObject);
    if (aliasKeys.length > 0) {
      logger.info(`Updated cache with aliases: ${aliasKeys.join(', ')}.`);
    }
    
    // Reload user mappings from server
    await provider.reloadUserMappings();
    const userMappings = provider.getUserMappings();
    
    // Reset and precompile all mappings
    compiledMappings.reset();
    userMappings.forEach((mapping) => {
      cacheMapping(mapping.expression);
    });
    
    if (userMappings.length > 0) {
      logger.info(`Updated cache with mappings: ${userMappings.map(m => m.key).join(', ')}.`);
    }
  } catch (e) {
    logger.error(e);
    return false;
  }

  return true;
};
