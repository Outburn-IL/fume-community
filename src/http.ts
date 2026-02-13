/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import express, { type NextFunction, type Request, type Response } from 'express';

import { version as engineVersion } from '../package.json';
import type { FumeEngine } from './engine';
import { getFhirServerEndpoint, hasMappingSources } from './utils/mappingSources';
import { getRouteParam } from './utils/routeParams';

type EngineLocals = { engine: FumeEngine };

type FumeHttpInvocation = {
  mappingId: string;
  method: string;
  subroute: string[];
  subpath: string;
  query: Request['query'];
  headers: Record<string, string | string[] | undefined>;
};

const getEngine = (req: Request): FumeEngine => {
  return (req.app.locals as EngineLocals).engine;
};

const failOnStateless = (req: Request, res: Response, next: NextFunction) => {
  const engine = getEngine(req);
  if (!hasMappingSources(engine.getConfig())) {
    res.status(405).json({ message: 'Endpoint unavailable without mapping sources (FHIR server or mappings folder).' });
    return;
  }
  next();
};

const rootGet = async (req: Request, res: Response) => {
  const engine = getEngine(req);
  const config = engine.getConfig();
  const fhirServerEndpoint = getFhirServerEndpoint(config);
  const contextPackages = engine.getContextPackages();
  const uptime = engine.getUptime();

  return res.status(200).json({
    fume_version: `FUME Community v${engineVersion}`,
    fhir_server: fhirServerEndpoint,
    uptime,
    context_packages: contextPackages
  });
};

const health = async (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'UP'
  });
};

const isUnsupportedContentTypeError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.message.startsWith('Unsupported Content-Type:');
  }
  const msg = (error as { message?: unknown } | undefined)?.message;
  return typeof msg === 'string' && msg.startsWith('Unsupported Content-Type:');
};

const rootEvaluate = async (req: Request, res: Response) => {
  const engine = getEngine(req);

  try {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const expression = body.fume;
    if (typeof expression !== 'string' || expression.trim() === '') {
      return res.status(400).json({
        __isFumeError: true,
        __isFlashError: false,
        message: 'No expression was provided (fume). Nothing to evaluate.',
        code: 'NO_EXPRESSION',
        name: 'BadRequest',
        value: '',
        token: '',
        cause: '',
        line: '',
        start: '',
        position: ''
      });
    }

    const contentType = typeof body.contentType === 'string' ? body.contentType : undefined;
    const input = body.input;

    let inputJson: unknown;
    try {
      // If no input exists, evaluate against null input (no error).
      inputJson = input === undefined ? null : await engine.convertInputToJson(input, contentType);
    } catch (error: unknown) {
      if (isUnsupportedContentTypeError(error)) {
        return res.status(415).json({
          message: (error as { message?: unknown })?.message ?? 'Unsupported Content-Type',
          code: 'UNSUPPORTED_MEDIA_TYPE'
        });
      }
      throw error;
    }

    const response = await engine.transform(inputJson, expression, engine.getBindings());
    return res.status(200).json(response);
  } catch (error: unknown) {
    if (isUnsupportedContentTypeError(error)) {
      return res.status(415).json({
        message: (error as { message?: unknown })?.message ?? 'Unsupported Content-Type',
        code: 'UNSUPPORTED_MEDIA_TYPE'
      });
    }

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

const rootRecache = async (req: Request, res: Response, options?: { deprecated?: boolean }) => {
  const engine = getEngine(req);
  const logger = engine.getLogger();

  if (!hasMappingSources(engine.getConfig())) {
    return res.status(405).json({ message: 'Endpoint unavailable without mapping sources (FHIR server or mappings folder).' });
  }

  if (options?.deprecated) {
    const warning = 'POST /recache is deprecated; use POST /$recache';
    logger.warn(warning);
    res.set('Warning', `299 - "${warning}"`);
  }

  try {
    const recacheSuccess = await engine.recacheFromServer();

    if (recacheSuccess) {
      const provider = engine.getMappingProvider();
      const mappingKeys = provider.getUserMappingKeys();

      const response = {
        message: 'The following Mappings were loaded to cache',
        mappings: mappingKeys,
        ...(options?.deprecated ? { deprecated: true } : {})
      };

      return res.status(200).json(response);
    }

    logger.error('Failed to load cache');
    return res.status(500).json({
      message: 'error loading cache',
      code: 'RECACHE_FAILED'
    });
  } catch (error: unknown) {
    const message = (error as { message?: unknown } | undefined)?.message;
    logger.error({ error }, 'Failed to load cache');
    return res.status(500).json({
      message: typeof message === 'string' && message !== '' ? message : 'error loading cache',
      code: 'RECACHE_FAILED'
    });
  }
};

const rootOperation = async (req: Request, res: Response) => {
  try {
    const operationName = getRouteParam(req.params, 'operation') ?? '';
    if (operationName === '$transpile') {
      return res.status(500).json({ message: "Operation '$transpile' is no longer supported" });
    } else if (operationName === '$recache') {
      return await rootRecache(req, res);
    } else if (operationName === 'recache') {
      return await rootRecache(req, res, { deprecated: true });
    } else {
      return res.status(500).json({ message: `Unknown operation '${operationName}'` });
    }
  } catch (e) {
    getEngine(req).getLogger().error(e);
    return res.status(500).json({ message: e });
  }
};

const recacheGetNotAllowed = async (_req: Request, res: Response) => {
  return res.status(405).json({
    message: 'GET /recache is not supported. Use POST /$recache instead.',
    code: 'METHOD_NOT_ALLOWED'
  });
};

const mappingGet = async (req: Request, res: Response) => {
  const engine = getEngine(req);
  const logger = engine.getLogger();

  try {
    const mappingId = getRouteParam(req.params, 'mappingId');
    if (!mappingId) {
      res.status(400).json({ message: 'missing mappingId' });
      return;
    }
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

const getSubrouteSegments = (req: Request, mappingId: string): string[] => {
  const path = req.path ?? '';
  const prefix = `/${mappingId}`;
  const remainder = path.startsWith(prefix) ? path.slice(prefix.length) : '';
  const trimmed = remainder.replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed === '' ? [] : trimmed.split('/').filter(Boolean);
};

const sanitizeHeaders = (headers: Request['headers']): Record<string, string | string[] | undefined> => {
  const redacted = '[REDACTED]';
  const out: Record<string, string | string[] | undefined> = {};

  const isSensitiveKey = (key: string) => {
    const k = key.toLowerCase();
    return (
      k === 'authorization' ||
      k === 'proxy-authorization' ||
      k === 'cookie' ||
      k === 'set-cookie' ||
      k.includes('token') ||
      k.includes('secret') ||
      k.includes('password') ||
      k.includes('session') ||
      k.includes('api-key') ||
      k.includes('apikey')
    );
  };

  for (const [key, value] of Object.entries(headers)) {
    if (isSensitiveKey(key)) {
      out[key] = redacted;
      continue;
    }
    // express typings allow string | string[] | undefined
    out[key] = value as string | string[] | undefined;
  }

  return out;
};

const createFumeHttpInvocation = (req: Request, mappingId: string): FumeHttpInvocation => {
  const subroute = getSubrouteSegments(req, mappingId);
  return {
    mappingId,
    method: req.method,
    subroute,
    subpath: subroute.join('/'),
    query: req.query,
    headers: sanitizeHeaders(req.headers)
  };
};

const mappingTransform = async (req: Request, res: Response, next?: NextFunction) => {
  const engine = getEngine(req);
  const logger = engine.getLogger();

  try {
    const mappingId = getRouteParam(req.params, 'mappingId');
    if (!mappingId) {
      res.status(400).json({ message: 'missing mappingId' });
      return;
    }

    // PUT is reserved for mapping update when no internal subroute exists.
    // (FUME Community doesn't implement update, but downstream products can register it.)
    if (req.method === 'PUT') {
      const subroute = getSubrouteSegments(req, mappingId);
      if (subroute.length === 0) {
        if (next) {
          next();
          return;
        }
        res.status(404).json({ message: 'not found' });
        return;
      }
    }

    const provider = engine.getMappingProvider();
    const mapping = provider.getUserMapping(mappingId);

    if (!mapping) {
      logger.error(`Mapping '${mappingId}' not found!`);
      res.status(404).json({ message: 'not found' });
      return;
    }

    const contentType = req.get('Content-Type') ?? undefined;
    let inputJson: unknown;
    try {
      inputJson = await engine.convertInputToJson(req.body, contentType);
    } catch (error: unknown) {
      if (isUnsupportedContentTypeError(error)) {
        res.status(415).json({
          message: (error as { message?: unknown })?.message ?? 'Unsupported Content-Type',
          code: 'UNSUPPORTED_MEDIA_TYPE'
        });
        return;
      }
      throw error;
    }

    const expression = typeof mapping.expression === 'string' ? mapping.expression : undefined;
    if (!expression || expression.trim() === '') {
      logger.error(`Mapping '${mappingId}' does not contain a valid expression`);
      res.status(500).json({ message: 'Mapping does not contain a valid expression' });
      return;
    }

    const fumeHttpInvocation = createFumeHttpInvocation(req, mappingId);
    const result = await engine.transform(inputJson, expression, { fumeHttpInvocation } as unknown as Record<string, unknown>);
    res.set('Content-Type', 'application/json');
    res.status(200).json(result);
  } catch (error) {
    if (isUnsupportedContentTypeError(error)) {
      res.status(415).json({
        message: (error as { message?: unknown })?.message ?? 'Unsupported Content-Type',
        code: 'UNSUPPORTED_MEDIA_TYPE'
      });
      return;
    }
    logger.error({ error });
    res.status(500).json({ message: error });
  }
};

const mappingOperation = async (req: Request, res: Response) => {
  const operationName = getRouteParam(req.params, 'operation') ?? '';
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
  // Execute mapping (official)
  mapping.post('/:mappingId/', mappingTransform);
  // Execute mapping with additional routing segments (e.g. /Mapping/{id}/a/b/c)
  mapping.post('/:mappingId/*subroute', mappingTransform);
  // PUT executes mapping only when there's a subroute (PUT /Mapping/{id} is reserved for update)
  mapping.put('/:mappingId/*subroute', mappingTransform);
  router.use('/Mapping/', mapping);

  // root
  const root = express.Router();
  root.post('/:operation', rootOperation);
  root.get('/recache', recacheGetNotAllowed);
  root.get('/health', health);
  root.get('/', rootGet);
  root.post('/', rootEvaluate);
  router.use('/', root);

  return {
    routes: router,
    notFound
  };
};
