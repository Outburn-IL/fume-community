/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import fume from '../../dist/fume';

const get = async (req, res) => {
  return res.status(200).json(
    {
      public_sandbox: 'https://try.fume.health',
      api_instructions: 'POST a JSON object to this endpoint, containing an input json value and a FUME expression.',
      example_body: {
        input: { values: ['value1', 'value2'] },
        fume: 'values[1]',
        contentType: 'application/json'
      },
      should_return: 'value2'
    });
};

const evaluate = async (req, res) => {
  try {
    let inputJson;
    if (req.body.contentType === 'x-application/hl7-v2+er7') {
      console.log('Content-Type suggests HL7 V2.x message');
      console.log('Trying to parse V2 message as JSON...');
      inputJson = await fume.v2json(req.body.input);
      console.log('Parsed V2 message');
    } else {
      if (req.body.contentType === 'text/csv') {
        console.log('Content-Type suggests CSV input');
        console.log('Trying to parse CSV to JSON...');
        inputJson = await fume.parseCsv(req.body.input);
        console.log('Parsed CSV to JSON');
      } else {
        inputJson = req.body.input;
      }
    };

    const response = await fume.transform(inputJson, req.body.fume);
    if (typeof response === 'undefined' || response === null) {
      console.warn('Evaluation result is empty');
      console.log({
        contentType: req.body.contentType,
        fumeExpression: req.body.fume,
        inputJson,
        httpRequestObject: req
      });
    }
    return res.status(200).json(response);
  } catch (error: any) {
    const data = {
      __isFumeError: true,
      message: error.message ?? '',
      code: error.code ?? '',
      name: error.name ?? '',
      token: error.token ?? '',
      cause: error.cause ?? '',
      position: error.position ?? ''
    };
    console.error({ error });
    return res.status(422).json(data);
  }
};

const recache = async (req, res) => {
  try {
    const recacheSuccess = await fume.conformance.recacheFromServer();

    if (recacheSuccess) {
      const response = {
        message: 'The following Tables & Mappings were loaded to cache',
        tables: fume.cache.tables,
        mappings: fume.cache.mappingCacheCompiled
      };
      return res.status(200).json(response);
    } else {
      console.error('Error loading cache');
      return res.status(404).json({ message: 'error loading cache' });
    }
  } catch (error) {
    console.error('Failed to load cache', { error });
    return res.status(404).json({ message: error });
  }
};

export default { get, evaluate, recache };
