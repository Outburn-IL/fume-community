# FHIR-Utilized Mapping Engine

This project is a Mapping Engine for FHIR-related transformations of data.
The engine has the following main parts:

 * A JSON-to-JSON mapping language interpreter, based on IBM's JSONata
 * Connection to a FHIR server that enables it to be used as a repository for saved FUME mappings & translation tables
 * FHIR-oriented functions that assist in the transformation to or from FHIR resources
 * RESTful API to run the transformation against a JSON, CSV or HL7 V2 input
 
## Initial Setup

Install [Node.js v16](https://nodejs.org/en/download/)

Update to the latest version of `npm`

```shell
npm install -g npm@latest
```

## Running the app locally

- `npm install`
- `npm start`

## Running the app with Docker Compose

Install [Docker](https://docs.docker.com/get-docker/) if you don't already have it.

Run in terminal:

```shell
docker compose up --build
```

# Deployment

This section describes how to deploy the server

## Environment Variables

### Stateless deployment

Stateless means no FHIR server connection.

Copy the `.env.example.stateless` file to `.env` and edit it to set the environment variables.

```shell
cd fume
cp .env.example.stateless .env
```

### Stateful deployment

Copy the `.env.example.stateful` file to `.env` and edit it to set the environment variables.

**NOTE:** You _MUST_ edit the `FHIR_SERVER_BASE` environment variable to point to your FHIR server

```shell
cd fume
cp .env.example.stateful .env
```

## Deploy with Node.js

```shell
cd fume
npm install
npm run start
```

## Deploy with Docker Compose

```shell
cd fume
docker compose up --build
```
## Logs

Logs are saved in the `logs` folder.
