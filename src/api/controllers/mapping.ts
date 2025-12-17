/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { Request, Response } from 'express';

import type { FumeEngine } from '../../engine';

const get = async (req: Request, res: Response) => {
  const engine = req.app.locals.engine as FumeEngine;
  const logger = engine.getLogger();
  try {
    // get mapping id from route
    const mappingId: string = req.params.mappingId;
    // get mapping from provider
    const provider = engine.getMappingProvider();
    const mapping = provider.getUserMapping(mappingId);
    
    if (mapping) {
      res.set('Content-Type', 'application/vnd.outburn.fume');
      res.status(200).send(mapping.expression);
    } else {
      const message: string = `Mapping '${mappingId}' could not be found`;
      logger.error(message);
      res.status(404).json({ message });
    }
  } catch (error) {
    logger.error({ error });
    res.status(500).json({ message: error });
  }
};

const transform = async (req: Request, res: Response) => {
  const engine = req.app.locals.engine as FumeEngine;
  const logger = engine.getLogger();
  try {
    const mappingId = req.params.mappingId;
    
    // Get mapping expression from provider
    const provider = engine.getMappingProvider();
    const mapping = provider.getUserMapping(mappingId);
    
    if (!mapping) {
      logger.error(`Mapping '${mappingId}' not found!`);
      res.status(404).json({ message: 'not found' });
      return;
    }
    
    const contentType = req.get('Content-Type');
    const inputJson = await engine.convertInputToJson(req.body, contentType ?? undefined);
    
    // Check if compiled version is cached (keyed by expression)
    const cache = engine.getCache();
    let compiledMapping = cache.compiledMappings.get(mapping.expression);
    
    if (!compiledMapping) {
      // Not cached - compile and cache it
      engine.cacheMapping(mapping.expression);
      compiledMapping = cache.compiledMappings.get(mapping.expression);
    }
    
    if (compiledMapping) {
      const result = await compiledMapping.function(inputJson);
      res.set('Content-Type', 'application/json');
      res.status(200).json(result);
    } else {
      logger.error(`Failed to compile mapping '${mappingId}'`);
      res.status(500).json({ message: 'Failed to compile mapping' });
    }
  } catch (error) {
    logger.error({ error });
    res.status(500).json({ message: error });
  }
};

const operation = async (req: Request, res: Response) => {
  const operationName: string = req.params?.operation;
  if (operationName === '$transpile') {
    res.status(500).json({ message: 'Operation \'$transpile\' is no longer supported' });
  } else {
    res.status(500).json({ message: `Unknown operation '${operationName}'` });
  }
};

export default { get, transform, operation };
