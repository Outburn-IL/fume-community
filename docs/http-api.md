# HTTP API

This document describes the public HTTP surface exposed by the FUME Community server.

Related docs:

- Getting started: [getting-started.md](getting-started.md)
- Environment variables: [env-vars.md](env-vars.md)

## Overview

FUME exposes two primary ways to evaluate mappings:

- **Ad-hoc expressions**: send an expression in the request body to `POST /`.
- **Saved mappings (StructureMap)**: when mapping sources are configured, cached mappings become runnable endpoints under `/Mapping/{mappingId}`.

### Mapping sources

Mappings and aliases can be loaded from:

- **FHIR server** (`FHIR_SERVER_BASE`)
- **Local files** (`MAPPINGS_FOLDER`)

If both sources are unset or `n/a`:

- `POST /` (ad-hoc evaluation) remains available.
- `/Mapping/*` endpoints are disabled and return `405`.

### Content types

FUME converts the request body to JSON according to the request `Content-Type`.

Supported inputs:

- `application/json`
- `application/fhir+json`
- `application/xml`
- `application/fhir+xml`
- `text/csv`
- `x-application/hl7-v2+er7` (HL7 v2)

If an unsupported content type is provided, the request fails with `415 Unsupported Media Type`.

## Verbose mode

Evaluation endpoints support a `verbose` query parameter (e.g. `?verbose=true`) that returns the engine's full evaluation report instead of the raw result.

### Query parameter

- Name: `verbose`
- Verbose mode is enabled only when `verbose` is one of:
  - `1`
  - `true` (case-insensitive)
- All other values (including missing param) are treated as verbose mode off.

### Supported endpoints

- `POST /`
- `POST /Mapping/{mappingId}`
- `POST /Mapping/{mappingId}/{subRoute1}/{subRoute2}/...`
- `PUT /Mapping/{mappingId}/{subRoute1}/{subRoute2}/...`

### Response shape when verbose is enabled

When verbose mode is enabled:

- The HTTP response status matches the report's `status`.
- The response body is a JSON object with this shape:

```json
{
  "ok": true,
  "status": 200,
  "result": {},
  "diagnostics": {
    "error": [],
    "warning": [],
    "debug": []
  },
  "executionId": "..."
}
```

Notes:

- `executionId` is always present and is a non-empty string.
- `diagnostics.error`, `diagnostics.warning`, and `diagnostics.debug` are always present arrays.
- For certain failures that occur before evaluation (e.g. missing expression, mapping not found, unsupported media type), FUME returns a **synthetic** verbose report with `ok=false` and a single entry in `diagnostics.error`.


## Root endpoints

### `GET /`

Returns basic server info. While this endpoint *could* be used for availability checks, users are encouraged to use the [`/health`](#get-health) endpoint for routine health probing (e.g. load balancers, Kubernetes liveness/readiness probes).

Response `200`:

```json
{
  "fume_version": "FUME Community vX.Y.Z",
  "fhir_server": "http://..." | "n/a",
  "uptime": "...",
  "context_packages": [ { "id": "...", "version": "..." } ]
}
```

### `GET /health`

Health probe endpoint.

Response `200`:

```json
{ "status": "UP" }
```

### `POST /`

Evaluate an ad-hoc expression.

Request body:

```json
{
  "fume": "<expression>",
  "input": { "any": "json" },
  "contentType": "application/json"
}
```

Notes:

- `fume` is required.
- If `input` is omitted, the expression is evaluated against `null`.
- `contentType` controls how `input` is converted to JSON (see [`supported content types`](#content-types)).

Responses:

- `200` / `206`: evaluation result (any JSON)
- `400`: missing/empty expression (`fume`)
- `415`: unsupported media type (conversion failure)
- `422`: handled expression compilation/evaluation error

When `?verbose=true` is provided, the response body is the full verbose report (see [Verbose mode](#verbose-mode)).

#### Example: Blood Pressure Observation from JSON

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

Request (PowerShell):

```powershell
$expression = @'
Instance: $uuid()
InstanceOf: bp
* status = 'final'
* effectiveDateTime = $now()
* subject.identifier.value = mrn
* component[SystolicBP].valueQuantity.value = systolic
* component[DiastolicBP].valueQuantity.value = diastolic
'@

$body = @{
  fume = $expression
  input = @{ mrn = 'PP875023983'; systolic = 120; diastolic = 80 }
  contentType = 'application/json'
} | ConvertTo-Json -Depth 30

Invoke-RestMethod -Method Post -Uri 'http://localhost:42420/' -ContentType 'application/json' -Body $body
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

### `POST /{operation}`

Root operations.

#### `POST /$recache` (preferred)

Reloads mappings and aliases from the configured sources into cache. Flushes the ConceptMap cache (`$translate()` calls will re-populate the cache with a fresh version of the requested ConceptMap).

- Available only when at least one mapping source is configured.
- Returns `200` with a list of mapping keys on success.
- Returns `500` if the cache could not be refreshed.

#### `POST /recache` (deprecated)

Same as `POST /$recache`, but deprecated.

- Still returns `200`.
- Emits a warning in logs and a `Warning` response header.
- **Will be disabled in future releases**

### `GET /recache` (disabled)

Recache has side-effects, so `GET /recache` is no longer supported.

- Returns `405 Method Not Allowed` with guidance to use `POST /$recache`.

## Saved-mapping endpoints (`/Mapping/*`)

All `/Mapping/*` endpoints are available only when at least one mapping source is configured.

### `GET /Mapping/{mappingId}`

Fetches the mapping expression for a saved mapping.

- Response `200`: body is plain text (FUME expression), content-type `application/vnd.outburn.fume`
- Response `404`: mapping not found

### Execute a saved mapping (official)

#### `POST /Mapping/{mappingId}`

Invokes `mappingTransform` for the saved mapping.

- Request body is treated as the input, converted according to request `Content-Type`.
- Response `200` / `206`: mapping result as JSON
- Response `404`: mapping not found
- Response `415`: unsupported media type (conversion failure)
- Response `422`: handled compilation/transform/evaluation failure

When `?verbose=true` is provided, the response body is the full verbose report (see [Verbose mode](#verbose-mode)).

##### Example (same BP mapping, as a saved mapping)

If you saved the BP expression above as `bpDemo.fume` and configured `MAPPINGS_FOLDER`, you can invoke it like this:

```sh
curl -s \
  -H "Content-Type: application/json" \
  -d '{"mrn":"PP875023983","systolic":120,"diastolic":80}' \
  http://localhost:42420/Mapping/bpDemo
```

### Execute a saved mapping with subroutes

These routes allow “routing data” to be passed via the URL after the mapping id.

Note on Swagger/OpenAPI:

- OpenAPI cannot represent the Express route shape used here (`/:mappingId/*subroute`).
- As a result, Swagger UI “Try it out” cannot be used to test the multi-segment
  form.
- The OpenAPI spec documents this route only to describe the behavior.

#### `POST /Mapping/{mappingId}/{subRoute1}/{subRoute2}/...`

Same behavior as `POST /Mapping/{mappingId}`.

Supports `?verbose=true` with the same response behavior as the base mapping endpoint.

The difference is that any path segments after `{mappingId}` are captured as routing metadata and exposed via `$fumeHttpInvocation`:

- `$fumeHttpInvocation.subroute` will contain the segments after `{mappingId}`
- `$fumeHttpInvocation.subpath` will be those segments joined by `/`

Note: `$fumeHttpInvocation` is also present for `POST /Mapping/{mappingId}`; in that case `subroute` is `[]` and `subpath` is `""`.

#### `PUT /Mapping/{mappingId}/{subRoute1}/{subRoute2}/...`

Same as the POST subroute form, but with `method: "PUT"`.

Supports `?verbose=true` with the same response behavior as the base mapping endpoint.

Important: **PUT is special**

- `PUT /Mapping/{mappingId}` is reserved for **mapping updates** (not implemented in FUME Community).
- Transform is invoked only when **there is at least one path segment after `{mappingId}`**.

FUME supports this type of invocation mainly to allow the usage of saved mappings as HTTP interceptors.

## `$fumeHttpInvocation` binding (saved-mapping transforms)

When a saved mapping is invoked through an HTTP endpoint (`/Mapping/...`), FUME injects a binding named `$fumeHttpInvocation` into the mapping.

- If a mapping is invoked via mapping-as-function (e.g. `$someMapping($)` inside another expression), `$fumeHttpInvocation` is not automatically provided.
- If the binding is missing, evaluating `$fumeHttpInvocation` yields `undefined` (no error).

Shape:

```ts
type FumeHttpInvocation = {
  mappingId: string;
  method: string;            // e.g. "POST" | "PUT"
  subroute: string[];        // segments after the mappingId
  subpath: string;           // subroute joined by '/'
  query: object;             // parsed query params
  headers: Record<string, string | string[] | undefined>; // sanitized
};
```

Examples:

- `POST /Mapping/myMap` → `subroute: []`, `subpath: ""`
- `POST /Mapping/myMap/a/b/123?x=1` → `subroute: ["a","b","123"]`, `subpath: "a/b/123"`, `query: {"x":"1"}`

### Header redaction (security)

`$fumeHttpInvocation.headers` is intentionally **sanitized** to reduce accidental leakage if a mapping prints or returns headers.

FUME redacts common secret-bearing headers/keys (case-insensitive), including:

- `authorization`, `proxy-authorization`
- `cookie`, `set-cookie`
- any header name containing: `token`, `secret`, `password`, `session`, `api-key`, `apikey`

Redacted values are returned as the literal string:

```json
"[REDACTED]"
```

If you need access to full headers for a trusted internal deployment, the recommended approach is to add a **custom binding** in a downstream project that returns only the specific header values you want to allow.

## Downstream integration notes (mapping update)

FUME Community intentionally does not implement mapping updates so it can stay side-effects free, but a dedicated HTTP route is reserved so downstream projects can register a custom  update interaction.

### Goal

- Handle **mapping update** at `PUT /Mapping/:mappingId`.
- Keep **transform** behavior at `PUT /Mapping/:mappingId/<any subroute...>`.

### Recommended approach: intercept via `appMiddleware`


Example:

```ts
import type { Request, Response, NextFunction } from 'express';
import { FumeServer } from 'fume-fhir-converter';

const server = await FumeServer.create({
  config: {
    SERVER_PORT: 42420,
  },
  appMiddleware: (req: Request, res: Response, next: NextFunction) => {
  // Only intercept base PUT /Mapping/:mappingId
  const match = req.path.match(/^\/Mapping\/([^\/]+)\/?$/);
  if (req.method === 'PUT' && match) {
    /* --------------------------------------------*/
    /* ---- Mapping update handler code here ----- */
    /* --------------------------------------------*/
    res.status(204).send();
    return;
  }

  next();
  }
});
```

This preserves:

- `PUT /Mapping/:mappingId` → update (downstream)
- `PUT /Mapping/:mappingId/a/b` → transform (FUME)

## OpenAPI spec and Swagger UI

FUME serves an OpenAPI 3.0.3 spec and an interactive Swagger UI out of the box.

### `GET /openapi.json`

Returns the OpenAPI spec as JSON. The `info.version` field is injected at runtime from the package version.

### `GET /docs`

Serves the Swagger UI. Renders the spec from `GET /openapi.json`.

### Customizing the OpenAPI spec (`openApiSpec`)

Downstream projects can override the spec served by these two endpoints by passing `openApiSpec` in `FumeServerCreateOptions`. This is useful for adding custom endpoints to the spec, changing metadata, or replacing the spec entirely.

The option accepts either a **static object** (full replacement) or a **factory function** (extend/modify the base spec).

#### Static replacement

Pass a plain object. It completely replaces the default FUME spec.

```ts
import { FumeServer } from 'fume-fhir-converter';
import type { OpenApiSpec } from 'fume-fhir-converter';

const mySpec: OpenApiSpec = {
  openapi: '3.0.3',
  info: { title: 'My API', version: '1.0.0' },
  paths: {
    '/my-endpoint': {
      get: { summary: 'My endpoint', responses: { '200': { description: 'OK' } } }
    }
  }
};

const server = await FumeServer.create({
  config: { SERVER_PORT: 42420 },
  openApiSpec: mySpec
});
```

#### Factory function (extend the base spec)

Pass a function. It receives a clone of the default FUME spec (with the runtime-injected version) and must return the spec to serve. Use this to add paths or change metadata while keeping the built-in FUME endpoints documented.

```ts
import { FumeServer } from 'fume-fhir-converter';
import type { OpenApiSpec, OpenApiSpecFactory } from 'fume-fhir-converter';

const extendSpec: OpenApiSpecFactory = (base) => ({
  ...base,
  info: {
    ...(base.info as Record<string, unknown>),
    title: 'My FUME-based API'
  },
  paths: {
    ...(base.paths as Record<string, unknown>),
    '/test/override': {
      get: {
        summary: 'Custom downstream endpoint',
        responses: { '200': { description: 'OK' } }
      }
    }
  }
});

const server = await FumeServer.create({
  config: { SERVER_PORT: 42420 },
  openApiSpec: extendSpec
});
```

The factory receives a **deep clone** of the base spec, so mutations to `base` do not affect the internal default.
