/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import axios from 'axios';
import { v2 as compose } from 'docker-compose';
import fs from 'fs';
import path from 'path';

import { FumeServer } from '../src/server';
import { FHIR_PACKAGE_CACHE_DIR, LOCAL_FHIR_API, LOCAL_FHIR_SERVER_BASE } from './config';

/**
 * Disable axios cache during integration tests
 * @param config
 * @returns
 */
const originalCreate = axios.create;
axios.create = function createPatchedAxios (config) {
  const instance = originalCreate(config);
  instance.interceptors.request.use((request) => {
    request.headers['Cache-Control'] = 'no-cache';
    return request;
  });
  return instance;
};

/**
 * Awaits for the FHIR server to start and for its API to be available
 * @param maxAttempts
 * @param currentAttempt
 * @returns
 */
async function waitForFhirApi (maxAttempts, currentAttempt = 1) {
  try {
    console.log(`Attempt ${currentAttempt} to query FHIR API...`);
    await axios.get(LOCAL_FHIR_SERVER_BASE);
  } catch (error: any) {
    console.error(`Attempt ${currentAttempt} failed:`, error.message);

    if (currentAttempt >= maxAttempts) {
      throw new Error(`Failed to query FHIR API after ${maxAttempts} attempts`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    return waitForFhirApi(maxAttempts, currentAttempt + 1);
  }
}

async function setup () {
  console.log('Starting FHIR server (using docker compose V2)...');
  await compose.upAll({
    cwd: path.join(__dirname),
    config: 'docker-compose.yml',
    log: true
  });
  const result = await compose.ps({ cwd: path.join(__dirname) });

  globalThis.services = result.data.services;

  globalThis.services.forEach((service) => {
    console.log(service.name, service.command, service.state, service.ports);
  });

  console.log('Waiting for startup of FHIR server!');
  await waitForFhirApi(30);

  console.log('starting server...');

  // Ensure at least one package is re-downloaded on repeated test runs by deleting it from the cache if present
  try {
    if (FHIR_PACKAGE_CACHE_DIR) {
      const corePkgDir = path.resolve(FHIR_PACKAGE_CACHE_DIR, 'hl7.fhir.r4.core#4.0.1');
      if (fs.existsSync(corePkgDir)) {
        console.log(`Deleting cached FHIR core package to force re-download: ${corePkgDir}`);
        // Node 14+ supports recursive rm
        fs.rmSync(corePkgDir, { recursive: true, force: true });
      } else {
        console.log(`FHIR core package directory not found (will be downloaded): ${corePkgDir}`);
      }
    }
  } catch (e: any) {
    console.error('Failed to delete cached FHIR core package:', e?.message || e);
  }

  globalThis.fumeServer = new FumeServer();
  await globalThis.fumeServer.warmUp({
    FHIR_SERVER_BASE: LOCAL_FHIR_API,
    FHIR_PACKAGES: 'il.core.fhir.r4@0.14.2,il.tasmc.fhir.r4@0.1.1',
    FHIR_PACKAGE_CACHE_DIR
  });
  globalThis.app = globalThis.fumeServer.getExpressApp();
  console.log('server started!');
}

export default setup;
