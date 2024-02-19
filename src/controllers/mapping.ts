/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { getCache } from '../helpers/cache';
import { v2json } from '../helpers/hl7v2';
import { parseCsv } from '../helpers/stringFunctions';
import type {Request, Response} from 'express';

const get = async (req: Request, res: Response) => {
  try {
    const mappingId: string = req.params.mappingId;

    // get mapping expression from cache
    const mappingObj = getCache().mappings[mappingId];
    const mapping: string = mappingObj.expression;

    if (mapping) {
      res.set('Content-Type', 'application/vnd.outburn.fume');
      res.status(200).send(mapping);
    } else {
      res.status(404).json({ message: 'not found' });
    }
  } catch (error) {
    console.error({ error });
    res.status(500).json({ message: error });
  }
};

const transform = async (req: Request, res: Response) => {
  try {
    const mappingId = req.params.mappingId;
    const mappingFromCache = getCache().mappings[mappingId];
    const contentType = req.get('Content-Type');
    let inputJson;

    if (contentType?.startsWith('x-application/hl7-v2+er7')) {
      console.log('Content-Type header suggests HL7 V2.x message');
      const bodyString = req.body;
      console.log('Trying to parse V2 message as JSON...');
      inputJson = await v2json(bodyString);
    } else {
      if (contentType?.startsWith('text/csv')) {
        inputJson = parseCsv(req.body);
      } else {
        inputJson = req.body;
      }
    };

    if (mappingFromCache) {
      const result = await mappingFromCache.function(inputJson);
      res.set('Content-Type', 'application/json');
      res.status(200).json(result);
    } else {
      res.status(404).json({ message: 'not found' });
    }
  } catch (error) {
    console.error({ error });
    res.status(500).json({ message: error });
  }
};

export default { get, transform };
