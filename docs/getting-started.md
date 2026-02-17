# Getting Started (v3)

Before you install FUME, you can play with the mapping language in the public sandbox: https://try.fume.health

## Docs you will likely want open

- HTTP endpoints + `verbose` mode: [http-api.md](http-api.md)
- All runtime env vars (server config): [env-vars.md](env-vars.md)
- v2 → v3 migration notes (library/server embedding): [migration-guide.md](migration-guide.md)

## Option A: Deploy with Docker (published image)

FUME Community publishes a Docker image:

- `outburnltd/fume-fhir-converter:latest`
- `outburnltd/fume-fhir-converter:<version>`

Minimal run:

```sh
docker run --rm -p 42420:42420 outburnltd/fume-fhir-converter:latest
```

With configuration via an env file:

```sh
docker run --rm \
  -p 42420:42420 \
  --env-file ./.env \
  outburnltd/fume-fhir-converter:latest
```

If you want file-based mappings, mount a folder and point `MAPPINGS_FOLDER` at it:

```sh
docker run --rm \
  -p 42420:42420 \
  --env-file ./.env \
  -v "${PWD}/mappings:/usr/src/app/mappings" \
  outburnltd/fume-fhir-converter:latest
```

Then set in `.env`:

```dotenv
MAPPINGS_FOLDER=/usr/src/app/mappings
```

## Option B: Run the server from source

Prerequisites:

- Install Node.js (minimum is specified in `.nvmrc`).

Install dependencies:

```sh
npm install
```

Configure the server:

- Copy `.env.example` → `.env`
- Or set environment variables in your shell

Start the server:

```sh
npm start
```

## Option C: Use as a library (Node)

Install:

```sh
npm install fume-fhir-converter
```

Create an engine and call `transform()`:

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

Important: when embedding as a library, FUME does not read `process.env` / `.env` automatically. Pass `config` explicitly.

## Saved mappings: FHIR server + files

FUME can expose “saved mapping” endpoints under `/Mapping/*` when at least one mapping source is configured:

- `FHIR_SERVER_BASE` (StructureMap resources)
- `MAPPINGS_FOLDER` (file-based mappings; default extension is `*.fume`)

If both sources are unset or `n/a`, ad-hoc evaluation (`POST /`) remains available but `/Mapping/*` returns `405`.

## Further documentation

- Docs site: https://www.fume.health/
- Video tutorials: https://youtube.com/playlist?list=PL44ht-s6WWPfgVNkibzMj_UB-ex41rl49


