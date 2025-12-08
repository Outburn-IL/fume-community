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
import { getLogger } from '../helpers/logger';
import { transform } from '../helpers/transform';

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
    const isFlashError = !!error.instanceOf || error.token === 'InstanceOf:';
    // const line = error.line && isFlashError ? error.line - 1 : error.line ?? '';
    const line = error.line ?? '';
    const data = {
      __isFumeError: true,
      __isFlashError: isFlashError,
      message: error.message ?? '',
      code: error.code ?? '',
      name: error.name ?? '',
      value: error.value ?? '',
      token: error.token ?? '',
      cause: error.cause ?? '',
      line,
      start: error.start ?? '',
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
      res.status(500).json({ message: 'Operation \'$transpile\' is no longer supported' });
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
