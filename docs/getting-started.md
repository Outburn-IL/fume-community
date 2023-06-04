# Getting Started

# Sandbox
Before you install FUME, you can play with the mapping language in our inteactive public sandbox: [https://try.fume.health](https://try.fume.health).

## Initial Setup

Install [Node.js v16](https://nodejs.org/en/download/)

Update to the latest version of `npm`

```shell
npm install -g npm@latest
```

## Running the RESTful API server
In the root folder:
- `npm install`
- `npm run build`

Then go to the 'serve' folder, and start the server:

- `npm install`
- `npm start`

## API instructions:
POST to the base address of the server a JSON object with input data in 'input' and a mapping (as string) in 'fume'.
If you have a FHIR server, you can store mappings as StructureMap resources (see an example in the root of the project). When the server initializes, all the mapping found on the server become an endpoint where you can just POST the input data and recieve the results. The endpoint is in the pattern [FUME Server]/Mapping/[StructureMap ID].

# Deployment

This section describes how to deploy the server

## Environment Variables

### Stateless deployment

Stateless means no FHIR server connection. 
Copy the `.env.example.stateless` file to `.env` and edit it to set the environment variables.
**NOTE:** In stateless mode, you can run mappings you pass to the API, but you cannot load mappings from a FHIR server. Needless to say, mappings that use try to fetch data from a FHIR server using functions like $search, $resolve, $literal etc will throw an error.

### Stateful deployment

Copy the `.env.example.stateful` file to `.env` and edit it to set the environment variables.

**NOTE:** You _MUST_ edit the `FHIR_SERVER_BASE` environment variable to point to your FHIR server

# In a Node.js application
Install the module into you project:
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
- logger: (object) Override the default logger (console.log) with an external one. The object need to contain three keys: info, warn and error. Each key needs to be a function that can handle inputs of all types.

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
  "systolic": 140,
  "diastolic": 80
};
const res = await fume.transform(input, map);
```

The results will be an Observation resource populated according to the official HL7 Blood Pressure Profile.

# Further Documenttation
You can watch our [video tutorials](https://www.youtue.com/playlist?list=PL44ht-s6WWPfgVNkibzMj_UB-ex41rl49).

