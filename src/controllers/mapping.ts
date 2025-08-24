/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { Request, Response } from 'express';

import { getCache } from '../helpers/cache';
import { convertInputToJson } from '../helpers/inputConverters';
import { pretty } from '../helpers/jsonataFunctions';
import { getLogger } from '../helpers/logger';
import { toJsonataString } from '../helpers/parser/toJsonataString';
import { createFumeError } from '../types';

const get = async (req: Request, res: Response) => {
  const logger = getLogger();
  try {
    // get mapping id from route
    const mappingId: string = req.params.mappingId;
    // get mapping object from cache
    const mappingObj = getCache().compiledMappings.get(mappingId);
    if (mappingObj) {
      // get expression from mapping object
      const mapping: string = mappingObj.expression;
      res.set('Content-Type', 'application/vnd.outburn.fume');
      res.status(200).send(mapping);
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
  const logger = getLogger();
  try {
    const mappingId = req.params.mappingId;
    const mappingFromCache = getCache().compiledMappings.get(mappingId);
    const contentType = req.get('Content-Type');
    const inputJson = await convertInputToJson(req.body, contentType);

    if (mappingFromCache) {
      const result = await mappingFromCache.function(inputJson);
      res.set('Content-Type', 'application/json');
      res.status(200).json(result);
    } else {
      logger.error(`Mapping '${mappingId}' not found!`);
      res.status(404).json({ message: 'not found' });
    }
  } catch (error: any) {
    logger.error({ error });
    const fumeError = createFumeError(error);
    res.status(422).json(fumeError);
  }
};

const operation = async (req: Request, res: Response) => {
  const logger = getLogger();
  const operationName: string = req.params?.operation;
  if (operationName === '$transpile') {
    try {
      const mappingId: string = req.params.mappingId;
      const { compiledMappings } = getCache();
      const mappingFromCache = compiledMappings.get(mappingId);
      const expressionString = mappingFromCache.expression;
      const tranpiled = await toJsonataString(expressionString);
      if (tranpiled) {
        const prettyExpr = await pretty(tranpiled);
        res.set('Content-Type', 'application/vnd.outburn.fume');
        res.status(200).send(prettyExpr);
      } else {
        res.status(404).json({ message: `Mapping '${mappingId}' not found` });
      }
    } catch (e) {
      logger.error(e);
      res.status(500).json({ message: e });
    }
  } else {
    res.status(500).json({ message: `Unknown operation '${operationName}'` });
  }
};

export default { get, transform, operation };
