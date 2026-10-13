import { beforeAll, describe, expect, jest, test } from '@jest/globals';
import express from 'express';
import { defineFunction } from 'fumifier';
import type { Server } from 'http';
import request from 'supertest';

import { FumeEngine } from '../../src/engine';
import { createHttpRouter, createMappingExecutionHandler } from '../../src/http';
import { FumeServer } from '../../src/server';
import type { EngineEvaluationContext, EvaluationContextFactory } from '../../src/types';

const config = {
  FHIR_SERVER_BASE: 'n/a',
  MAPPINGS_FOLDER: 'n/a',
  FHIR_PACKAGE_CACHE_DIR: 'tests/.fhir-packages',
  FUME_EVAL_THROW_LEVEL: 30,
  FUME_EVAL_DIAG_COLLECT_LEVEL: 70
};
const emptyCache = { async getKeys() { return []; }, async get() { return undefined; } };
const factory: EvaluationContextFactory = ({ builtins, user }) => {
  const scope = Object.freeze({ bindings: Object.freeze({ ...builtins.bindings, local: 'scoped' }), mappingCache: emptyCache });
  return {
    default: {
      bindings: { ...builtins.bindings, ...user.bindings },
      mappingCache: {
        ...user.mappingCache,
        async getKeys() { return [...await user.mappingCache.getKeys(), 'isolated']; },
        async getDefinition(key: string) {
          return key === 'isolated' ? { expression: '[$local, $exists($private), $throwLevel, $collectLevel]', scope } : undefined;
        }
      }
    },
    scopes: new Map([['isolated', scope]])
  };
};

describe('engine evaluation contexts', () => {
  let engine: FumeEngine;
  beforeAll(async () => {
    engine = await FumeEngine.create({ config, bindings: { private: 'deployment' }, builtinBindings: { service: 'available' }, evaluationContextFactory: factory });
  }, 30000);

  test('isolates named and direct scoped calls but retains builtins and explicit overrides', async () => {
    expect(await engine.transform({}, '$isolated()')).toEqual(['scoped', false, 30, 70]);
    expect(await engine.transform({}, '[$local, $exists($private), $service]', {}, { scopeId: 'isolated' })).toEqual(['scoped', false, 'available']);
    expect(await engine.transform({}, '$local', { local: 'override' }, { scopeId: 'isolated' })).toBe('override');
    expect(await engine.transform({}, '$private')).toBe('deployment');
    await expect(engine.transform({}, '$', {}, { scopeId: 'missing' })).rejects.toThrow('Unknown evaluation scope');
  });

  test('HTTP overlays reach nested scopes without changing frozen factory output', async () => {
    expect(await engine.transform({}, '$isolated()', {}, { http: true })).toEqual(['scoped', false, 30, 30]);
    expect(await engine.transform({}, '$isolated()')).toEqual(['scoped', false, 30, 70]);
  });

  test('factory receives fresh frozen snapshots and startup validation uses the same path', async () => {
    const received: EngineEvaluationContext[] = [];
    const contextual = await FumeEngine.create({ config, evaluationContextFactory: ({ builtins, user }) => {
      received.push(user);
      expect(Object.isFrozen(user)).toBe(true);
      expect(Object.isFrozen(user.bindings)).toBe(true);
      return { default: { bindings: { ...builtins.bindings, ...user.bindings }, mappingCache: user.mappingCache }, scopes: new Map() };
    } });
    contextual.validateEvaluationContexts();
    contextual.registerBinding('fresh', 1);
    expect(await contextual.transform({}, '$fresh')).toBe(1);
    expect(received).toHaveLength(2);
    expect(received[0]).not.toBe(received[1]);
    expect(received[0].bindings.fresh).toBeUndefined();
  });

  test('ordinary mappings keep lexical inheritance and snapshot provider sources once', async () => {
    const ordinary = await FumeEngine.create({ config, bindings: { private: 'deployment' } });
    const getKeys = jest.fn(() => ['ordinary']);
    const getMapping = jest.fn(() => ({ expression: '$private' }));
    Object.defineProperty(ordinary, 'mappingProvider', { value: {
      getUserMappingKeys: getKeys, getUserMapping: getMapping, getAliases: () => ({ alias: 'yes' })
    } });
    expect(await ordinary.transform({}, '($private := "lexical"; $ordinary())')).toBe('lexical');
    expect(getKeys).toHaveBeenCalledTimes(1);
    expect(getMapping).toHaveBeenCalledTimes(1);
  });

  test('legacy binding access and caller-owned create options retain their behavior', async () => {
    const bindings = { value: 'initial' };
    const ordinary = await FumeEngine.create({ config, bindings });
    bindings.value = 'outside';
    expect(await ordinary.transform({}, '$value')).toBe('initial');
    ordinary.getBindings().value = 'updated';
    expect(await ordinary.transform({}, '$value')).toBe('updated');
    expect(ordinary.getBindings()).toBe(ordinary.getBindings());
  });

  test('concurrent evaluations do not mutate cached compiled environments', async () => {
    const callback = defineFunction(async function() {
      await Promise.resolve();
      return this.evaluateMapping({ expression: '$local', scope: { bindings: { local: this.input }, mappingCache: emptyCache } });
    }, '<:x>');
    const results = await Promise.all([1, 2].map(input => engine.transform(input, '$callback()', { callback })));
    expect(results).toEqual([1, 2]);
  });

  test('revalidates factory collisions at startup and after provider changes', async () => {
    let conflict = false;
    const contextual = await FumeEngine.create({ config, evaluationContextFactory: ({ builtins, user }) => {
      if (conflict) throw new Error('Context collision');
      return { default: { bindings: builtins.bindings, mappingCache: user.mappingCache }, scopes: new Map() };
    } });
    contextual.validateEvaluationContexts();
    conflict = true;
    expect(() => contextual.validateEvaluationContexts()).toThrow('Context collision');
    await expect(contextual.transform({}, '$')).rejects.toThrow('Context collision');
  });

  test('provider snapshot is retained across an awaited call and refreshed next time', async () => {
    const ordinary = await FumeEngine.create({ config });
    let source = '"before"';
    Object.defineProperty(ordinary, 'mappingProvider', { value: {
      getUserMappingKeys: () => ['current'], getUserMapping: () => ({ expression: source }), getAliases: () => ({})
    } });
    const change = defineFunction(function() { source = '"after"'; }, '<:x>');
    expect(await ordinary.transform({}, '($change(); $current())', { change })).toBe('before');
    expect(await ordinary.transform({}, '$current()')).toBe('after');
  });

  test('downstream execution needs no provider and preserves body, subroutes, and metadata', async () => {
    const app = express();
    app.locals.engine = engine;
    app.use(express.json());
    const execute = createMappingExecutionHandler(req => ({
      mappingId: 'private-id', scopeId: 'isolated',
      expression: '{"input": $, "local": $local, "invocation": $fumeHttpInvocation}',
      subroute: req.path.split('/').slice(2).filter(Boolean)
    }));
    app.post('/alias{/*subroute}', execute);
    app.put('/alias{/*subroute}', execute);
    const http = createHttpRouter();
    app.use(http.routes);
    app.use(http.notFound);
    const result = await request(app).post('/alias/one/two/?q=yes&scopeId=missing')
      .set('Authorization', 'secret').set('X-Token', 'secret').send([0, false, null]).expect(200);
    expect(result.body.input).toEqual([0, false, null]);
    expect(result.body.local).toBe('scoped');
    expect(result.body.invocation).toMatchObject({ mappingId: 'private-id', subroute: ['one', 'two'], subpath: 'one/two', query: { q: 'yes', scopeId: 'missing' } });
    expect(result.body.invocation.headers.authorization).toBe('[REDACTED]');
    expect(result.body.invocation.headers['x-token']).toBe('[REDACTED]');
    await request(app).put('/alias/one').send({}).expect(200);
    await request(app).put('/alias').send({}).expect(404);
    await request(app).post('/Mapping/missing').send({}).expect(405);
    await request(app).get('/Mapping/missing').expect(405);
    await request(app).post('/alias').set('Content-Type', 'image/png').send('bad').expect(415);
  });

  test('HTTP thresholds preserve verbose failure status inside a scoped callee', async () => {
    const contextual = await FumeEngine.create({ config, evaluationContextFactory: ({ builtins, user }) => {
      const scope = { bindings: builtins.bindings, mappingCache: emptyCache };
      return { default: { bindings: builtins.bindings, mappingCache: {
        ...user.mappingCache, async getKeys() { return ['fail']; },
        async getDefinition() { return { expression: '$error("expected")', scope }; }
      } }, scopes: new Map([['fail', scope]]) };
    } });
    const app = express();
    app.locals.engine = contextual;
    app.use(express.json());
    app.post('/alias', createMappingExecutionHandler(() => ({ mappingId: 'fail', expression: '$error("expected")', scopeId: 'fail', subroute: [] })));
    app.use(createHttpRouter().routes);
    const nested = await request(app).post('/?verbose=true').send({ input: {}, fume: '$fail()' }).expect(422);
    const direct = await request(app).post('/alias?verbose=true').send({}).expect(422);
    expect(nested.body.ok).toBe(false);
    expect(direct.body.ok).toBe(false);
    expect(nested.body.status).toBe(direct.body.status);
    expect(nested.body.diagnostics.error[0].code).toBe('F3001');
    expect(direct.body.diagnostics.error[0].code).toBe('D3137');
    const legacy = await request(app).post('/alias').send({}).expect(422);
    expect(legacy.body.__isFumeError).toBe(true);
  });
});

describe('server scoped options and shutdown', () => {
  test('forwards create options and invokes hooks while HTTP work is pending', async () => {
    let release: () => void = () => undefined;
    let markStarted: () => void = () => undefined;
    const started = new Promise<void>(resolve => { markStarted = resolve; });
    const pending = new Promise<void>(resolve => { release = resolve; });
    const hook = jest.fn(async () => { release(); });
    const server = await FumeServer.create({ config: { ...config, SERVER_PORT: 0 },
      engine: { builtinBindings: { service: 'forwarded' }, bindings: { private: 'hidden' }, evaluationContextFactory: factory },
      configureApp(app, instance) {
        instance.getEngine().validateEvaluationContexts();
        instance.registerShutdownHook(hook);
        app.get('/pending', async (_req, res) => { markStarted(); await pending; res.json({ done: true }); });
      }
    });
    try {
      expect(await server.getEngine().transform({}, '[$service, $exists($private)]', {}, { scopeId: 'isolated' })).toEqual(['forwarded', false]);
      const listener = Reflect.get(server, 'server') as Server;
      const response = request(listener).get('/pending').then(result => result);
      await started;
      const stop = server.shutDown();
      expect(server.shutDown()).toBe(stop);
      await stop;
      await response;
      expect(hook).toHaveBeenCalledTimes(1);
      expect(() => server.registerShutdownHook(async () => undefined)).toThrow('shutdown');
    } finally {
      release();
      await server.shutDown();
    }
  });

  test('cleans up registered resources when synchronous configuration fails', async () => {
    const hook = jest.fn(async () => undefined);
    await expect(FumeServer.create({ config: { ...config, SERVER_PORT: 0 }, configureApp(_app, server) {
      server.registerShutdownHook(hook);
      throw new Error('configuration failed');
    } })).rejects.toThrow('configuration failed');
    expect(hook).toHaveBeenCalledTimes(1);
  });

  test('runs all hooks and waits for cleanup when one throws', async () => {
    const server = await FumeServer.create({ config: { ...config, SERVER_PORT: 0 } });
    const other = jest.fn(async () => undefined);
    server.registerShutdownHook(() => { throw new Error('hook failed'); });
    server.registerShutdownHook(other);
    await expect(server.shutDown()).rejects.toThrow('hook failed');
    await expect(server.shutDown()).rejects.toThrow('hook failed');
    expect(other).toHaveBeenCalledTimes(1);
  });

  test('cleans up registered resources if the HTTP listener cannot bind', async () => {
    const owner = await FumeServer.create({ config: { ...config, SERVER_PORT: 0 } });
    try {
      const listener = Reflect.get(owner, 'server') as Server;
      const address = listener.address();
      if (!address || typeof address === 'string') throw new Error('Expected a TCP listener');
      const hook = jest.fn(async () => undefined);
      await expect(FumeServer.create({ config: { ...config, SERVER_PORT: address.port }, configureApp(_app, server) {
        server.registerShutdownHook(hook);
      } })).rejects.toThrow('EADDRINUSE');
      expect(hook).toHaveBeenCalledTimes(1);
    } finally {
      await owner.shutDown();
    }
  });
});