/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import express, { type NextFunction, type Request, type Response } from 'express';

import { version as engineVersion } from '../package.json';
import type { FumeEngine } from './engine';

type EngineLocals = { engine: FumeEngine };

const getEngine = (req: Request): FumeEngine => {
  return (req.app.locals as EngineLocals).engine;
};

const failOnStateless = (req: Request, res: Response, next: NextFunction) => {
  const engine = getEngine(req);
  if (engine.getConfig().SERVER_STATELESS) {
    res.status(405).json({ message: 'Endpoint unavailable without FHIR server' });
    return;
  }
  next();
};

const rootGet = async (_req: Request, res: Response) => {
  return res.status(200).json({
    fume_version: `FUME Community v${engineVersion}`
  });
};

const rootEvaluate = async (req: Request, res: Response) => {
  const engine = getEngine(req);

  try {
    const inputJson = await engine.convertInputToJson(req.body.input, req.body.contentType);
    const response = await engine.transform(inputJson, req.body.fume, engine.getBindings());
    return res.status(200).json(response);
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    const isFlashError = !!err.instanceOf || err.token === 'InstanceOf:';
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

    engine.getLogger().error({ error });
    return res.status(422).json(data);
  }
};

const rootRecache = async (req: Request, res: Response) => {
  const engine = getEngine(req);

  try {
    const recacheSuccess = await engine.recacheFromServer();

    if (recacheSuccess) {
      const provider = engine.getMappingProvider();
      const mappingKeys = provider.getUserMappingKeys();

      const response = {
        message: 'The following Mappings were loaded to cache',
        mappings: mappingKeys
      };

      return res.status(200).json(response);
    }

    // preserve previous behavior
    // eslint-disable-next-line no-console
    console.error('Error loading cache');
    return res.status(404).json({ message: 'error loading cache' });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load cache', { error });
    return res.status(404).json({ message: error });
  }
};

const rootOperation = async (req: Request, res: Response) => {
  try {
    const operationName: string = req.params?.operation;
    if (operationName === '$transpile') {
      res.status(500).json({ message: "Operation '$transpile' is no longer supported" });
    } else if (operationName === 'recache' || operationName === '$recache') {
      res.redirect('/recache');
    } else {
      res.status(500).json({ message: `Unknown operation '${operationName}'` });
    }
  } catch (e) {
    getEngine(req).getLogger().error(e);
    res.status(500).json({ message: e });
  }
};

const mappingGet = async (req: Request, res: Response) => {
  const engine = getEngine(req);
  const logger = engine.getLogger();

  try {
    const mappingId: string = req.params.mappingId;
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

const mappingTransform = async (req: Request, res: Response) => {
  const engine = getEngine(req);
  const logger = engine.getLogger();

  try {
    const mappingId = req.params.mappingId;

    const provider = engine.getMappingProvider();
    const mapping = provider.getUserMapping(mappingId);

    if (!mapping) {
      logger.error(`Mapping '${mappingId}' not found!`);
      res.status(404).json({ message: 'not found' });
      return;
    }

    const contentType = req.get('Content-Type') ?? undefined;
    const inputJson = await engine.convertInputToJson(req.body, contentType);

    const cache = engine.getCache();
    let compiledMapping = cache.compiledMappings.get(mapping.expression);

    if (!compiledMapping) {
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

const mappingOperation = async (req: Request, res: Response) => {
  const operationName: string = req.params?.operation;
  if (operationName === '$transpile') {
    res.status(500).json({ message: "Operation '$transpile' is no longer supported" });
  } else {
    res.status(500).json({ message: `Unknown operation '${operationName}'` });
  }
};

const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ message: 'not found' });
};

export const createHttpRouter = () => {
  const router = express.Router();

  // /Mapping/*
  const mapping = express.Router();
  mapping.use(failOnStateless);
  mapping.get('/:mappingId/:operation', mappingOperation);
  mapping.get('/:mappingId/', mappingGet);
  mapping.post('/:mappingId/', mappingTransform);
  router.use('/Mapping/', mapping);

  // root
  const root = express.Router();
  root.post('/:operation', rootOperation);
  root.get('/recache', failOnStateless, rootRecache);
  root.get('/', rootGet);
  root.post('/', rootEvaluate);
  router.use('/', root);

  return {
    routes: router,
    notFound
  };
};
