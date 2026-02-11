# Getting Started

# Sandbox
Before you install FUME, you can play with the mapping language in our interactive public sandbox: [https://try.fume.health](https://try.fume.health).

## Initial Setup

Install [Node.js](https://nodejs.org/en/download/). The minimum version is specified in `.nvmrc`.

Update to the latest version of `npm`

```shell
npm install -g npm@latest
```

## Installing FUME and its dependencies
In the root folder:
`npm install`

## Running the RESTful API server
- `npm start`

## API instructions:
POST to the base address of the server a JSON object with input data in 'input' and a mapping (as string) in 'fume'.
If you have a FHIR server, you can store mappings as StructureMap resources (see an example in the root of the project). When FUME initializes, all the mappings found on the FHIR server become endpoints where you can just POST the input data and recieve the results. The endpoint is in the pattern [FumeServerBase]/Mapping/[StructureMapId].

# Deployment

This section describes how to deploy the server

## Environment Variables

Copy the `.env.example` file to `.env` and edit it to set the environment variables.

**Notes:**
- Set `FHIR_SERVER_BASE` to your FHIR server endpoint, or `n/a` to disable the server source.
- Set `MAPPINGS_FOLDER` to a folder path (or `n/a`) to enable or disable file-based mappings/aliases.
- If both sources are unset or `n/a`, saved-mapping endpoints are disabled and return `405`.

# In a Node.js application
Install the module into your project:
- `npm install fume-fhir-converter --save`

Then you can import the module and start using it.
```
import fume from 'fume-fhir-converter';
```
To initialize, run the async init() function, and pass an options object. At minimum, fhirVersion should be passed, but a FHIR server endpoint is also highly recommended:
```
await fume.init({
    fhirVersion: '4.0.1',
    fhirServer: 'http://hapi-fhir.outburn.co.il/fhir'
  });
```
Additional options you may find useful:
- fhirPackages: (string) Comma delimited list of packages to import. For example: il.core.fhir.r4@0.11.0,hl7.fhir.us.core@6.0.0.
- fhirServerTimeout: (number) In milliseconds
- searchBundleSize: (number) How many resources the server should put in a single search result page
- logger: (object) Override the default logger (console.log) with an external one. The object needs to contain three keys: info, warn and error. Each key needs to be a function that can handle inputs of all types.
- additionalBindings: (object) Extend the functionality of FUME by passing key-value pairs that will become accessible as named paramerters (including functions) inside FUME expressions. E.g. if you pass an object containig a JS function with the key "someFunc", you can call this function from any FUME expression using $someFunc($someArgument)

After init, you can start transforming data using the transform() function. For example, a blood pressure profile:

```
const map = `
  Instance: $uuid()
  InstanceOf: bp
  * effectiveDateTime = $now()
  * subject.identifier.value = mrn
  * component[SystolicBP].valueQuantity.value = systolic
  * component[DiastolicBP].valueQuantity.value = diastolic
`;
const input = {
  "mrn": "PP875023983",
  "systolic": 120,
  "diastolic": 80
};
const res = await fume.transform(input, map);
```

The results will be an Observation resource populated according to the official HL7 Blood Pressure Profile.

**NOTE:** Expressions undergo a compilation process when run for the first time. This process may be slow for some complex mappings, but after the first time the compiled function is cached and then reused in subsequent calls, so compilation only happens once per expression.

If you don't want FUME to evaluate your expression against an input immediatly, you can use fume.toFunction(expr). This will return an async JS function that you can pass downstream and call later with different inputs, as many times as you wish (Just remember to use the 'await' keyword)

# Further Documentation
## Read the docs at our [documentation website](https://www.fume.health/). 
## Watch our [video tutorials](https://youtube.com/playlist?list=PL44ht-s6WWPfgVNkibzMj_UB-ex41rl49).


