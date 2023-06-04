# FHIR-Utilized Mapping Engine

This project is a FHIR convertion tool.
The engine has the following main parts:

 * A FUME mapping language interpreter, based on a fusion between JSONata and FHIR Shorthand. See here: [https://www.fume.health/docs/flash](https://www.fume.health/docs/flash)
 * Connection to a FHIR server that enables it to be used as a repository for saved FUME mappings & translation tables
 * FHIR-oriented functions that assist in the transformation to or from FHIR resources
 * RESTful API to run the transformation against a JSON, CSV or HL7 V2 input

You can play with the mapping language in the inteactive public sandbox: [https://try.fume.health](https://try.fume.health).
Video tutorials: https://www.youtube.com/playlist?list=PL44ht-s6WWPfgVNkibzMj_UB-ex41rl49
 
## Initial Setup

Install [Node.js v16](https://nodejs.org/en/download/)

Update to the latest version of `npm`

```shell
npm install -g npm@latest
```

## Running the RestfulAPI server locally
In the root folder:
- `npm install`
- `npm run build`

Then go to the 'serve' folder, and start the server:

- `npm install`
- `npm start`

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

