/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { Request, Response } from 'express';

import { getCache } from '../helpers/cache';
import { v2json } from '../helpers/hl7v2';
import { getLogger } from '../helpers/logger';
import { parseCsv } from '../helpers/stringFunctions';

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
    let inputJson;

    if (contentType?.startsWith('x-application/hl7-v2+er7')) {
      logger.info('Content-Type header suggests HL7 V2.x message');
      const bodyString = req.body;
      logger.info('Trying to parse V2 message as JSON...');
      inputJson = await v2json(bodyString);
    } else {
      if (contentType?.startsWith('text/csv')) {
        logger.info('Content-Type header suggests CSV input');
        inputJson = await parseCsv(req.body);
      } else {
        inputJson = req.body;
      }
    };

    if (mappingFromCache) {
      const result = await mappingFromCache.function(inputJson);
      res.set('Content-Type', 'application/json');
      res.status(200).json(result);
    } else {
      logger.error(`Mapping '${mappingId}' not found!`);
      res.status(404).json({ message: 'not found' });
    }
  } catch (error) {
    logger.error({ error });
    res.status(500).json({ message: error });
  }
};

export default { get, transform };
