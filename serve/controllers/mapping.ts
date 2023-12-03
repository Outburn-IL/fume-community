/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import fume from '../../dist/fume';

const get = async (req, res) => {
  try {
    const mappingId: string = req.params.mappingId;

    // get mapping expression from cache
    const mappingObj = fume.cache.mappingCacheCompiled[mappingId];
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

const transform = async (req, res) => {
  try {
    const mappingId = req.params.mappingId;
    const mappingFromCache = fume.cache.mappingCacheCompiled[mappingId];
    const contentType = req.get('Content-Type');
    let inputJson;

    if (contentType.startsWith('x-application/hl7-v2+er7')) {
      console.log('Content-Type header suggests HL7 V2.x message');
      const bodyString = req.body;
      console.log('Trying to parse V2 message as JSON...');
      inputJson = await fume.v2json(bodyString);
    } else {
      if (contentType.startsWith('text/csv')) {
        inputJson = fume.parseCsv(req.body);
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
