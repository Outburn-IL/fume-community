# Getting Started (v3)

Before you install FUME, you can play with the mapping language in the public sandbox: https://try.fume.health

## Docs you will likely want open

- HTTP endpoints + `verbose` mode: [http-api.md](http-api.md)
- All runtime env vars (server config): [env-vars.md](env-vars.md)
- v2 → v3 migration notes (library/server embedding): [migration-guide.md](migration-guide.md)

## Quick demo: Blood Pressure Observation from JSON

This is a minimal end-to-end example you can run immediately. It takes 3 input fields and produces a fully conformant FHIR Observation (`InstanceOf: bp`) with profile-driven defaults injected (codes, units, etc.).

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

### Run it via HTTP (ad-hoc expression)

Send the expression and input to `POST /` (see [http-api.md](http-api.md#post-)).

PowerShell:

```powershell
$expression = @'
Instance: $uuid()
InstanceOf: bp
* status = 'final'
* effectiveDateTime = $now()
* subject.identifier.value = mrn
* component[SystolicBP].value = systolic
* component[DiastolicBP].value = diastolic
'@

$body = @{
  fume = $expression
  input = @{ mrn = 'PP875023983'; systolic = 120; diastolic = 80 }
  contentType = 'application/json'
} | ConvertTo-Json -Depth 30

Invoke-RestMethod -Method Post -Uri 'http://localhost:42420/' -ContentType 'application/json' -Body $body
```

### Run it via HTTP (saved mapping file)

1) Ensure the server has `MAPPINGS_FOLDER` configured (file-based mappings). In Docker this typically means mounting a folder and setting `MAPPINGS_FOLDER` to the container path.

2) Save the expression as a mapping file (example filename: `bpDemo.fume`) in your mappings folder.

3) Post the input JSON directly to the mapping endpoint:

```sh
curl -s \
  -H "Content-Type: application/json" \
  -d '{"mrn":"PP875023983","systolic":120,"diastolic":80}' \
  http://localhost:42420/Mapping/bpDemo
```

### Run it via Node (library API)

```ts
import { FumeEngine } from 'fume-fhir-converter';

const expression = `
  Instance: $uuid()
  InstanceOf: bp
  * status = 'final'
  * effectiveDateTime = $now()
  * subject.identifier.value = mrn
  * component[SystolicBP].value = systolic
  * component[DiastolicBP].value = diastolic
`;

const input = { mrn: 'PP875023983', systolic: 120, diastolic: 80 };

const engine = await FumeEngine.create({
  config: {
    FHIR_SERVER_BASE: 'n/a',
    FHIR_VERSION: '4.0.1',
    FHIR_PACKAGES: ''
  }
});

// Note: you can also omit FHIR_PACKAGES (or set it to an empty/whitespace string)
// to run with only the base R4 package implied by FHIR_VERSION.

const result = await engine.transform(input, expression);
const verboseReport = await engine.transformVerbose(input, expression);
```

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
    FHIR_PACKAGES: ''
  }
});

// Note: you can also omit FHIR_PACKAGES (or set it to an empty/whitespace string)
// to run with only the base R4 package implied by FHIR_VERSION.

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


