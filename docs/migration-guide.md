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

## Removed / changed exports

- `fumeUtils` was removed.
- Singleton helper modules were removed from the public surface.
