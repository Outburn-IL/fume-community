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
* component[SystolicBP].valueQuantity.value = systolic
* component[DiastolicBP].valueQuantity.value = diastolic
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

## Run as an HTTP server

See [docs/getting-started.md](docs/getting-started.md) for deployment options, including Docker.

The HTTP API is documented here: [docs/http-api.md](docs/http-api.md)

## License

AGPL-3.0
