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

Create a `FumeEngine` and warm it up explicitly:

```ts
import { FumeEngine } from 'fume-fhir-converter';

const engine = new FumeEngine();
await engine.warmUp({
  SERVER_STATELESS: true,
  FHIR_VERSION: '4.0.1',
  FHIR_PACKAGES: 'il.core.fhir.r4@0.14.2'
});

const out = await engine.transform(input, expression);
```

## Server usage (standalone HTTP)

No HTTP changes were introduced.

```ts
import { FumeServer } from 'fume-fhir-converter';

const server = new FumeServer();
await server.warmUp();
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

- Register extensions (middleware, cache, bindings, extra routes) **before** calling `warmUp()`.
- The FHIR client is now **owned by `FumeServer`** and **cannot be overridden**.
  - Remove any `registerFhirClient(...)` usage.
  - If you need access to the client (read-only), call `server.getFhirClient()` after `warmUp()`.

### Before → After mapping

- `registerLogger(logger)` stays the same.
- `registerAppMiddleware(fn)` stays the same.
- `registerCacheClass(CacheClass, options, keys)` stays the same.
- `registerBinding(key, value)` stays the same.
- `getExpressApp()` stays the same (add your extra routes there).
- `registerFhirClient(...)` was removed (server-managed FHIR client).

## Removed / changed exports

- `fumeUtils` was removed.
- Singleton helper modules were removed from the public surface.
