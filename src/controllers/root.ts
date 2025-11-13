/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { Request, Response } from 'express';

import { version as engineVersion } from '../../package.json';
import config from '../config';
import { getCache } from '../helpers/cache';
import { recacheFromServer } from '../helpers/conformance';
import { convertInputToJson } from '../helpers/inputConverters';
import { pretty, transform } from '../helpers/jsonataFunctions';
import { getLogger } from '../helpers/logger';
import { toJsonataString } from '../helpers/parser/toJsonataString';
import { createFumeError } from '../types';

const get = async (req: Request, res: Response) => {
  return res.status(200).json(
    {
      fume_version: `FUME Community v${engineVersion}`
    });
};

const evaluate = async (req: Request, res: Response) => {
  try {
    const inputJson = await convertInputToJson(req.body.input, req.body.contentType);
    const extraBindings = config.getBindings();
    const response = await transform(inputJson, req.body.fume, extraBindings);
    return res.status(200).json(response);
  } catch (error: any) {
    getLogger().error({ error });
    const fumeError = createFumeError(error);
    return res.status(422).json(fumeError);
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
      if (typeof contentType === 'string' && (contentType.startsWith('text/plain') || contentType.startsWith('application/vnd.outburn.fume'))) {
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
