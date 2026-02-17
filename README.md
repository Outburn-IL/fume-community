# FUME Community (fume-fhir-converter) — v3

FUME Community is an open-source FHIR® conversion + mapping engine (and a standalone HTTP server) built around the FUME language.

## What’s new in v3

This is a major release focused on correctness, diagnostics, and runtime scalability:

- Better automatic conformance (injecting `system` and `display` values), deeper structural and terminology validations
- Better diagnostics and behavior-control knobs (validation thresholds, throwLevel, etc.)
	- `verbose` mode returns a detailed evaluation report
- Improved caching and concurrency support
- Syntax improvements in the FUME language
- Accurate position pointers in errors
- File-based mappings (`*.fume` files) in addition to server-hosted StructureMap resources
- Improved performance

## Quick links

- Getting started (deployment + usage): [docs/getting-started.md](docs/getting-started.md)
- Migration guide (v2 → v3): [docs/migration-guide.md](docs/migration-guide.md)
- Environment variables: [docs/env-vars.md](docs/env-vars.md)
- HTTP API (endpoints + `verbose` mode): [docs/http-api.md](docs/http-api.md)
- Sandbox: https://try.fume.health
- Release notes: https://www.fume.health/docs/release-notes/community

## Use as a library (Node)

Create a `FumeEngine` and call `transform()`:

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

Note: when embedding as a module, FUME does not read `process.env` / `.env` automatically. Pass `config` explicitly.

## Run as an HTTP server

See [docs/getting-started.md](docs/getting-started.md) for deployment options, including Docker.

The HTTP API is documented here: [docs/http-api.md](docs/http-api.md)

## License

AGPL-3.0
