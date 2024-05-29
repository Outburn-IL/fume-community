/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { Request, Response } from 'express';

import config from '../config';
import { getCache } from '../helpers/cache';
import { recacheFromServer } from '../helpers/conformance';
import { v2json } from '../helpers/hl7v2';
import { pretty, transform } from '../helpers/jsonataFunctions';
import { getLogger } from '../helpers/logger';
import { toJsonataString } from '../helpers/parser/toJsonataString';
import { parseCsv } from '../helpers/stringFunctions';

const get = async (req: Request, res: Response) => {
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

const evaluate = async (req: Request, res: Response) => {
  try {
    let inputJson;

    if (req.body.contentType === 'x-application/hl7-v2+er7') {
      getLogger().info('Content-Type suggests HL7 V2.x message');
      getLogger().info('Trying to parse V2 message as JSON...');
      inputJson = await v2json(req.body.input);
      getLogger().info('Parsed V2 message');
    } else {
      if (req.body.contentType === 'text/csv') {
        getLogger().info('Content-Type suggests CSV input');
        getLogger().info('Trying to parse CSV to JSON...');
        inputJson = await parseCsv(req.body.input);
        getLogger().info('Parsed CSV to JSON');
      } else {
        inputJson = req.body.input;
      }
    };

    const extraBindings = config.getBindings();
    const response = await transform(inputJson, req.body.fume, extraBindings);
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
    getLogger().error({ error });
    return res.status(422).json(data);
  }
};

const recache = async (req: Request, res: Response) => {
  try {
    const recacheSuccess = await recacheFromServer();

    if (recacheSuccess) {
      const { tables, compiledMappings } = getCache();
      const response = {
        message: 'The following Tables & Mappings were loaded to cache',
        tables: tables.getDict(),
        mappings: compiledMappings.keys()
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

const operation = async (req: Request, res: Response) => {
  try {
    const operationName: string = req.params?.operation;
    if (operationName === '$transpile') {
      const contentType: string | undefined = req.get('Content-Type');
      if (contentType === 'text/plain' || contentType === 'application/vnd.outburn.fume') {
        const inputMapping: string = req.body;
        const tranpiled: string | undefined = await toJsonataString(inputMapping);
        if (tranpiled) {
          const prettyExpr = await pretty(tranpiled);
          res.set('Content-Type', 'application/vnd.outburn.fume');
          res.status(200).send(prettyExpr);
        } else {
          res.status(500).json({ message: 'Error parsing FUME expression' });
        }
      } else {
        res.status(415).json({ message: `Content-Type '${contentType}' is invalid for the $transpile operation. Please send a valid FUME expression and set Content-Type: 'application/vnd.outburn.fume'` });
      }
    } else if (operationName === 'recache' || operationName === '$recache') {
      res.redirect('/recache');
    } else {
      res.status(500).json({ message: `Unknown operation '${operationName}'` });
    }
  } catch (e) {
    getLogger().error(e);
    res.status(500).json({ message: e });
  }
};

export default { get, evaluate, recache, operation };
