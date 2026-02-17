# Environment variables (FUME Community)

This document describes the environment variables supported by the standalone FUME Community server.

Notes:

- The standalone server (the built app / Docker image) loads `.env` via `dotenv`.
- When embedding FUME as a library (`FumeEngine.create(...)` / `FumeServer.create(...)`), FUME intentionally does **not** read `process.env` or `.env` automatically; pass `config` explicitly.

Related docs:

- HTTP API (including `verbose` mode): [http-api.md](http-api.md)
- Getting started: [getting-started.md](getting-started.md)

## Server

| Variable | Type | Default | Description |
|---|---:|---:|---|
| `SERVER_PORT` | number | `42420` | TCP port the HTTP server listens on. |
| `FUME_REQUEST_BODY_LIMIT` | string | `400mb` | Max request body size accepted by the HTTP server (JSON/XML/CSV/HL7v2). Examples: `10mb`, `100kb`, `1gb`. |
| `LOG_LEVEL` | string | `info` | Standalone app log level filter: `debug` \| `info` \| `warn` \| `error` \| `silent`. |

## Evaluation policy thresholds

FUME uses numeric severities (lower = more critical):

- `fatal=0`, `invalid=10`, `error=20`, `warning=30`, `notice=40`, `info=50`, `debug=60`

Threshold comparisons are **exclusive**: an action triggers when `severity < threshold`.

| Variable | Type | Default | Description |
|---|---:|---:|---|
| `FUME_EVAL_THROW_LEVEL` | number | `30` | Throw (fail evaluation) when severity is below this threshold. |
| `FUME_EVAL_LOG_LEVEL` | number | `40` | Emit policy logs when severity is below this threshold. |
| `FUME_EVAL_DIAG_COLLECT_LEVEL` | number | `70` | Collect diagnostics entries when severity is below this threshold. |
| `FUME_EVAL_VALIDATION_LEVEL` | number | `30` | Enable structural/terminology validations up to this severity threshold. |

## FHIR server
Used for fetching stored mappings (StructureMap resource), translation tables (ConceptMap resource) for $translate* operations, and for inline data retrieval operaions ($search(), $resolve() etc.).

| Variable | Type | Default | Description |
|---|---:|---:|---|
| `FHIR_SERVER_BASE` | string | _(unset)_ | Base URL of the FHIR server. Use `n/a` to disable the server source. |
| `FHIR_SERVER_AUTH_TYPE` | string | `NONE` | Authentication mode. `BASIC` enables HTTP basic auth using `FHIR_SERVER_UN`/`FHIR_SERVER_PW`. Other values behave like `NONE`. |
| `FHIR_SERVER_UN` | string | _(unset)_ | Basic-auth username (used only when `FHIR_SERVER_AUTH_TYPE=BASIC`). |
| `FHIR_SERVER_PW` | string | _(unset)_ | Basic-auth password (used only when `FHIR_SERVER_AUTH_TYPE=BASIC`). |
| `FHIR_SERVER_TIMEOUT` | number | `30000` | HTTP client timeout (ms) for talking to the FHIR server. |

## FHIR package context

| Variable | Type | Default | Description |
|---|---:|---:|---|
| `FHIR_VERSION` | string | `4.0.1` | Default FHIR version (`4.0.1`, etc.). |
| `FHIR_PACKAGES` | string | _(unset)_ | Comma-separated list of `packageId@version` to load at startup. Example: `il.core.fhir.r4@0.14.2,hl7.fhir.us.core@6.0.0`. |
| `FHIR_PACKAGE_REGISTRY_URL` | string | _(public registries)_ | Optional custom FHIR package registry URL (enterprise environments). |
| `FHIR_PACKAGE_REGISTRY_TOKEN` | string | _(unset)_ | Optional auth token for a private registry (base64-encoded; no `Bearer` prefix). Used only when `FHIR_PACKAGE_REGISTRY_URL` is set. |
| `FHIR_PACKAGE_CACHE_DIR` | string | _(default cache location)_ | Optional local cache directory for downloaded packages. |

## Mapping sources & polling

These options control loading saved mappings from files and/or FHIR server.

| Variable | Type | Default | Description |
|---|---:|---:|---|
| `MAPPINGS_FOLDER` | string | _(unset)_ | Folder path for file-based mappings. Use `n/a` (or leave unset) to disable file mappings. |
| `MAPPINGS_FILE_EXTENSION` | string | `.fume` | File extension for mappings (used when `MAPPINGS_FOLDER` is set). |
| `MAPPINGS_FILE_POLLING_INTERVAL_MS` | number | _(provider default)_ | How often to poll the mappings folder for changes. Set `<= 0` to disable polling. |
| `MAPPINGS_SERVER_POLLING_INTERVAL_MS` | number | _(provider default)_ | How often to poll the FHIR server for changes (StructureMap/ConceptMap). Set `<= 0` to disable polling. |
| `MAPPINGS_FORCED_RESYNC_INTERVAL_MS` | number | _(provider default)_ | Force a resync of mapping sources on an interval even if polling is enabled. Set `<= 0` to disable. |

## In-memory expression cache (LRU)

| Variable | Type | Default | Description |
|---|---:|---:|---|
| `FUME_COMPILED_EXPR_CACHE_MAX_ENTRIES` | number | `1000` | Max number of compiled expressions to cache in-process. |
