# Migration Guide (Next Major)

This project was refactored to be a thin wrapper around extracted modules.
The HTTP API is intentionally unchanged (integration tests validate this).

## Summary

- **Old**: global singletons (`config`, `logger`, `cache`, `mappingProvider`, `transform`, etc.)
- **New**: an explicit, class-based runtime: `FumeEngine`
- **Server**: `FumeServer` now owns a `FumeEngine` instance and exposes the same HTTP endpoints.

## Library usage (Node)

### Before

Most usage patterns relied on global state via helper modules or `fumeUtils` exports.

### After

Create a `FumeEngine`:

```ts
import { FumeEngine } from 'fume-fhir-converter';

const engine = await FumeEngine.create({
  config: {
    FHIR_SERVER_BASE: 'n/a',
    FHIR_VERSION: '4.0.1',
    FHIR_PACKAGES: 'il.core.fhir.r4@0.14.2'
  }
});

const out = await engine.transform(input, expression);
```

## Server usage (standalone HTTP)

No HTTP changes were introduced.

```ts
import { FumeServer } from 'fume-fhir-converter';

// Note: when embedding as a module, FUME does not read process.env/.env automatically.
// Pass configuration explicitly from your host application.
await FumeServer.create({
  config: {
    SERVER_PORT: 42420,
  }
});
```

## Downstream server embedding (Express extensions)

If you have a downstream project that:

- Builds a `FumeServer` programmatically (instead of using the standalone binary)
- Adds application-level middleware
- Swaps the cache implementation
- Registers extra bindings
- Adds additional Express routes

…the new `FumeServer` still supports that style.

### Key rules

- Pass config + injections (logger/AST cache/initial bindings) via `create()`.
- Use `configureApp` to register extra Express routes/middleware **before** the built-in FUME router is mounted.
- `registerBinding()` is the only supported runtime mutation (additions after startup).
- The FHIR client is **owned by `FumeEngine`** (the server is just an HTTP wrapper).
  - Access it via `server.getEngine().getFhirClient()`.

### Before → After mapping

- Use `FumeServer.create({ config, engine: { logger, astCache, bindings }, appMiddleware, configureApp })`.
- Runtime-only APIs:
  - `server.registerAppMiddleware(fn)`
  - `server.registerBinding(key, value)` (or `server.getEngine().registerBinding(...)`)

## Removed / changed exports

- `fumeUtils` was removed.
- Singleton helper modules were removed from the public surface.

## See also

- Getting started: [getting-started.md](getting-started.md)
- Environment variables: [env-vars.md](env-vars.md)
- HTTP API: [http-api.md](http-api.md)
