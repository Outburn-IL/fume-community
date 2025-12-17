/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { Request, Response } from 'express';

import { version as engineVersion } from '../../../package.json';
import type { FumeEngine } from '../../engine';

const get = async (req: Request, res: Response) => {
  return res.status(200).json(
    {
      fume_version: `FUME Community v${engineVersion}`
    });
};

const evaluate = async (req: Request, res: Response) => {
  try {
    const engine = req.app.locals.engine as FumeEngine;
    const inputJson = await engine.convertInputToJson(req.body.input, req.body.contentType);
    const response = await engine.transform(inputJson, req.body.fume, engine.getBindings());
    return res.status(200).json(response);
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    const isFlashError = !!err.instanceOf || err.token === 'InstanceOf:';
    // const line = error.line && isFlashError ? error.line - 1 : error.line ?? '';
    const line = err.line ?? '';
    const data = {
      __isFumeError: true,
      __isFlashError: isFlashError,
      message: err.message ?? '',
      code: err.code ?? '',
      name: err.name ?? '',
      value: err.value ?? '',
      token: err.token ?? '',
      cause: err.cause ?? '',
      line,
      start: err.start ?? '',
      position: err.position ?? ''
    };
    const engine = req.app.locals.engine as FumeEngine;
    engine.getLogger().error({ error });
    return res.status(422).json(data);
  }
};

const recache = async (req: Request, res: Response) => {
  try {
    const engine = req.app.locals.engine as FumeEngine;
    const recacheSuccess = await engine.recacheFromServer();

    if (recacheSuccess) {
      const { tables } = engine.getCache();
      const provider = engine.getMappingProvider();
      const mappingKeys = provider.getUserMappingKeys();
      
      const response = {
        message: 'The following Tables & Mappings were loaded to cache',
        tables: tables.getDict(),
        mappings: mappingKeys
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
    const engine = req.app.locals.engine as FumeEngine;
    engine.getLogger().error(e);
    res.status(500).json({ message: e });
  }
};

export default { get, evaluate, recache, operation };
