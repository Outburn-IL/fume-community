# FUME Community (fume-fhir-converter) — v3
[![npm version](https://img.shields.io/npm/v/fume-fhir-converter.svg)](https://www.npmjs.com/package/fume-fhir-converter) [![docker image version](https://img.shields.io/docker/v/outburnltd/fume-fhir-converter?sort=semver&label=docker)](https://hub.docker.com/r/outburnltd/fume-fhir-converter)

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

- FUME Playground: https://try.fume.health
- Getting started (deployment + usage): [docs/getting-started.md](docs/getting-started.md)
- Migration guide (v2 → v3): [docs/migration-guide.md](docs/migration-guide.md)
- Environment variables: [docs/env-vars.md](docs/env-vars.md)
- HTTP API (endpoints + `verbose` mode): [docs/http-api.md](docs/http-api.md)
- Release notes: https://www.fume.health/docs/release-notes/community

## TL;DR: a full FHIR resource from 3 numbers

This example turns a tiny JSON payload into a fully-conformant Blood Pressure Observation (`InstanceOf: bp`) and demonstrates FUME's automatic conformance (injected codes, units, etc.).

Expression:

```txt
Instance: $uuid()
InstanceOf: bp
* status = 'final'
* effectiveDateTime = $now()
* subject.identifier.value = mrn
* component[SystolicBP].value = systolic
* component[DiastolicBP].value = diastolic
```

Input:

```json
{
	"mrn": "PP875023983",
	"systolic": 120,
	"diastolic": 80
}
```

Example output (one run). Note: `id` and `effectiveDateTime` will differ because they come from `$uuid()` and `$now()`:

```json
{
	"resourceType": "Observation",
	"id": "3c91d1da-894c-4e5e-b400-93121a2043e9",
	"meta": {
		"profile": [
			"http://hl7.org/fhir/StructureDefinition/bp"
		]
	},
	"status": "final",
	"category": [
		{
			"coding": [
				{
					"system": "http://terminology.hl7.org/CodeSystem/observation-category",
					"code": "vital-signs",
					"display": "Vital Signs"
				}
			]
		}
	],
	"code": {
		"coding": [
			{
				"system": "http://loinc.org",
				"code": "85354-9"
			}
		]
	},
	"subject": {
		"identifier": {
			"value": "PP875023983"
		}
	},
	"effectiveDateTime": "2026-02-16T23:50:49.527Z",
	"component": [
		{
			"code": {
				"coding": [
					{
						"system": "http://loinc.org",
						"code": "8480-6"
					}
				]
			},
			"valueQuantity": {
				"value": 120,
				"unit": "millimeter of mercury",
				"system": "http://unitsofmeasure.org",
				"code": "mm[Hg]"
			}
		},
		{
			"code": {
				"coding": [
					{
						"system": "http://loinc.org",
						"code": "8462-4"
					}
				]
			},
			"valueQuantity": {
				"value": 80,
				"unit": "millimeter of mercury",
				"system": "http://unitsofmeasure.org",
				"code": "mm[Hg]"
			}
		}
	]
}
```

How to run this example:
- Use the [public playground](https://try.fume.health). Paste input in the left pane, expression in the top-right pane, and watch the results in bottom-right pane
- HTTP server (ad-hoc): `POST /` with `{ fume, input }`
- HTTP server (saved mapping): configure a mapping folder, save the expression as `bpDemo.fume` and `POST /Mapping/bpDemo`
- Node library: `engine.transform(input, expression)` or `engine.transformVerbose(...)`

See [docs/getting-started.md](docs/getting-started.md) and [docs/http-api.md](docs/http-api.md) for copy/paste invocation snippets.

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

### Evaluation contexts

Embedding applications can supply `builtinBindings` and a synchronous
`evaluationContextFactory` to `FumeEngine.create` (or under `engine` in
`FumeServer.create`). These APIs let embedding applications define evaluation
contexts and control binding visibility.

The factory receives `{ builtins, user }`, two fresh, shallow-frozen contexts.
`builtins` contains format converters, configuration-derived threshold defaults,
and supplied `builtinBindings`; fumifier's static functions remain the underlying
base. `user` contains deployment bindings, provider aliases/static values, and a
snapshot of callable user mappings. Each context has `bindings` and `mappingCache`.
Nested binding values are not deep-frozen; their owner is responsible for them.

```ts
const engine = await FumeEngine.create({
	config: { FHIR_SERVER_BASE: 'n/a', MAPPINGS_FOLDER: 'n/a' },
	bindings: { deploymentValue: 'user' },
	evaluationContextFactory({ builtins, user }) {
		const isolated = {
			bindings: { ...builtins.bindings, localValue: 'isolated' },
			mappingCache: builtins.mappingCache
		};
		return {
			default: {
				bindings: { ...user.bindings, ...builtins.bindings },
				mappingCache: user.mappingCache
			},
			scopes: new Map([['isolated', isolated]])
		};
	}
});

const value = await engine.transform({}, '$localValue', {}, { scopeId: 'isolated' });
```

`transform` and `transformVerbose` accept an optional fourth argument
`{ scopeId }`. Unknown IDs fail; scope selection is server-owned and cannot be
requested through HTTP JSON. Third-argument bindings retain precedence. A scoped
callee excludes caller lexical variables, while ordinary string-only named
mappings continue to inherit their caller's context. Use mapping-cache
`getDefinition` entries with explicit scopes to select a callee context on entry.
Build references between mutually callable scopes within that factory invocation,
not in compiled-expression caches.

Call `engine.validateEvaluationContexts()` during synchronous `configureApp` to
run the same snapshot/factory path at startup. The factory also runs for every
evaluation, so embedding applications can reject new name collisions after
provider polling or recache. It must throw on conflicts rather than change targets
silently. HTTP handlers apply `collectLevel = throwLevel` to every request scope,
including scopes reached through mapping definitions, without mutating factory
output. Direct library evaluations retain their configured collection threshold.

### Downstream HTTP execution and disposal

`createMappingExecutionHandler(resolve)` returns an Express handler sharing the
built-in input conversion, sanitized `$fumeHttpInvocation`, verbose reports, and
legacy result/error projection. Its resolver returns
`{ mappingId, expression, scopeId?, subroute }`, or `undefined` for not found;
it may be asynchronous. `subroute` is an explicit array of captured segments
excluding the route prefix. Mount it after application authentication/authorization
middleware in `configureApp`. The resolver must validate its own targets; request
data is not an evaluation scope or mapping definition.

The handler works without a mapping provider. It executes POST and PUT with a
nonempty subroute; base PUT calls `next()` so downstream update/404 handling stays
available. Register only the intended execution methods. Built-in `/Mapping`
routes still require ordinary mapping sources and retain their existing order.

`server.registerShutdownHook(async () => { /* bounded resource disposal */ })`
registers a generic resource disposer. `shutDown()` is idempotent, stops accepting
HTTP connections, starts all hooks without first waiting for active requests, and
awaits both HTTP close and all hooks. Hooks must bound their own cleanup and revoke
work that would otherwise keep HTTP requests pending. A failing hook does not
prevent other hooks from running; shutdown rejects after cleanup settles.
Registered hooks also run if configuration, router creation, or listener startup
fails. `configureApp` remains synchronous; perform asynchronous resource loading
before calling `FumeServer.create`.

Inside `configureApp`, a fixed server-owned execution target can be mounted after
your own authentication/authorization middleware:

```ts
app.post('/isolated-copy', createMappingExecutionHandler(() => ({
	mappingId: 'copy',
	expression: '$',
	scopeId: 'isolated',
	subroute: []
})));
```

This assumes the `isolated` context registered in the example above. The handler
does not register a provider mapping, source endpoint, update route or permission.
Authorize the actual incoming path/method, and resolve only approved server-owned
targets; never accept an expression/scope definition from untrusted request data.
HTTP invocation metadata contains `mappingId`, `method`, `subroute`, `subpath`,
query values and allowlisted headers, not an Express request or service object.

Register bounded disposal hooks while the server is alive. Repeated `shutDown()`
calls share completion; hooks also clean up partial startup. Stop new resource
admission in the hook and await real work or revoke it within your own deadline,
rather than returning while background work still owns HTTP connections.

## Run as an HTTP server

See [docs/getting-started.md](docs/getting-started.md) for deployment options, including Docker.

The HTTP API is documented here: [docs/http-api.md](docs/http-api.md)

## License

AGPL-3.0
