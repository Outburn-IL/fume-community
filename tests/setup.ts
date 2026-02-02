/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import axios from 'axios';
import compose from 'docker-compose';
// import { createMockArtifactoryServer, MOCK_ARTIFACTORY_VALID_TOKEN } from 'fhir-package-installer/mock-artifactory-server';
import fs from 'fs';
import path from 'path';

import { FumeServer } from '../src/server';
import { FHIR_PACKAGE_CACHE_DIR, LOCAL_FHIR_API } from './config';

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

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
 * Check if containers are already running
 * @returns true if both containers are running
 */
async function areContainersRunning (): Promise<boolean> {
  try {
    const result = await compose.ps({ cwd: path.join(__dirname) });
    const services = result.data.services;
    
    const hapiRunning = services.some(
      (s) => s.name.includes('hapi_test') && s.state === 'running'
    );
    const dbRunning = services.some(
      (s) => s.name.includes('hapi_db_test') && s.state === 'running'
    );
    
    return hapiRunning && dbRunning;
  } catch {
    return false;
  }
}

/**
 * Awaits for the FHIR server to start and for its API to be available
 * @param maxAttempts
 * @param currentAttempt
 * @returns
 */
async function waitForFhirApi (maxAttempts, currentAttempt = 1) {
  try {
    console.log(`Attempt ${currentAttempt} to query FHIR API...`);
    // Poll the FHIR server capability statement endpoint instead of root
    // Using /metadata is more explicit and aligns with FHIR spec for server availability
    await axios.get(`${LOCAL_FHIR_API}/metadata`);
  } catch (error: unknown) {
    console.error(`Attempt ${currentAttempt} failed:`, toErrorMessage(error));

    if (currentAttempt >= maxAttempts) {
      throw new Error(`Failed to query FHIR API after ${maxAttempts} attempts`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    return await waitForFhirApi(maxAttempts, currentAttempt + 1);
  }
}

async function setup () {
  console.log('--- Global setup starting: dual registry warm-up preflight ---');
  
  const containersAlreadyRunning = await areContainersRunning();
  
  if (containersAlreadyRunning) {
    console.log('FHIR server containers already running, skipping startup...');
  } else {
    console.log('Starting FHIR server (using docker compose V2)...');
    await compose.upAll({
      cwd: path.join(__dirname),
      config: 'docker-compose.yml',
      log: true
    });
  }
  
  const result = await compose.ps({ cwd: path.join(__dirname) });

  globalThis.services = result.data.services;

  globalThis.services.forEach((service) => {
    console.log(service.name, service.command, service.state, service.ports);
  });

  if (containersAlreadyRunning) {
    console.log('Verifying FHIR server is responsive...');
    await waitForFhirApi(5); // Quick check with fewer attempts
  } else {
    console.log('Waiting for startup of FHIR server!');
    await waitForFhirApi(30);
  }

  // Helper to delete core package from cache
  const deleteCorePackage = async () => {
    if (!FHIR_PACKAGE_CACHE_DIR) {
      return;
    }

    const corePkgDir = path.resolve(FHIR_PACKAGE_CACHE_DIR, 'hl7.fhir.r4.core#4.0.1');
    if (!fs.existsSync(corePkgDir)) {
      console.log(`FHIR core package directory not found (will be downloaded): ${corePkgDir}`);
      return;
    }

    console.log(`Deleting cached FHIR core package to force re-download: ${corePkgDir}`);

    // Windows can intermittently fail recursive deletes if a previous run was interrupted
    // while files were being written. Retry a few times to avoid leaving partial JSON caches.
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        fs.rmSync(corePkgDir, { recursive: true, force: true });
        return;
      } catch (e: unknown) {
        const msg = toErrorMessage(e);
        console.warn(`Failed to delete core package dir (attempt ${attempt}/${maxAttempts}): ${msg}`);
        if (attempt === maxAttempts) {
          throw new Error(`Failed to delete cached FHIR core package directory after ${maxAttempts} attempts: ${msg}`);
        }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
  };

  const assertCorePackagePresent = (phase: string) => {
    const corePkgDir = path.resolve(FHIR_PACKAGE_CACHE_DIR, 'hl7.fhir.r4.core#4.0.1');
    if (!fs.existsSync(corePkgDir)) {
      throw new Error(`[${phase}] Core package directory NOT found after warmUp: ${corePkgDir}`);
    }
    console.log(`[${phase}] Core package directory confirmed: ${corePkgDir}`);
  };

  // Phase 1: Warm-up with DEFAULT public registries (no custom registry URL/TOKEN)
  console.log('Phase 1: Warming FUME with default registry (no custom URL/TOKEN)...');
  await deleteCorePackage();
  const firstServer = new FumeServer();
  await firstServer.warmUp({
    SERVER_PORT: 42420,
    SERVER_STATELESS: false,
    FHIR_SERVER_BASE: LOCAL_FHIR_API,
    FHIR_SERVER_AUTH_TYPE: 'NONE',
    FHIR_SERVER_UN: '',
    FHIR_SERVER_PW: '',
    FHIR_SERVER_TIMEOUT: 30000,
    FHIR_VERSION: '4.0.1',
    FHIR_PACKAGES: 'il.core.fhir.r4@0.14.2,fume.outburn.r4@0.1.1,il.tasmc.fhir.r4@0.1.1',
    FHIR_PACKAGE_CACHE_DIR
  });
  assertCorePackagePresent('Phase 1');
  // Since we're using Phase 1 server for tests, set global references
  globalThis.fumeServer = firstServer;
  globalThis.app = firstServer.getExpressApp();

  // Create test Practitioner resource for $literal() test
  console.log('Creating test Practitioner resource...');
  try {
    const practitionerId = 'cc829d28-3b32-43df-af57-e72035d98e18';
    
    // First, search for any Practitioners with identifier 1-820958 but different IDs and delete them
    const searchResponse = await axios.get(`${LOCAL_FHIR_API}/Practitioner`, {
      params: { identifier: '1-820958' }
    });
    
    if (searchResponse.data.entry) {
      for (const entry of searchResponse.data.entry) {
        if (entry.resource.id !== practitionerId) {
          console.log(`Deleting duplicate Practitioner with ID: ${entry.resource.id}`);
          await axios.delete(`${LOCAL_FHIR_API}/Practitioner/${entry.resource.id}`);
        }
      }
    }
    
    // Now PUT the Practitioner with the exact ID we need
    const practitioner = {
      resourceType: 'Practitioner',
      id: practitionerId,
      identifier: [
        {
          value: '1-820958'
        }
      ],
      name: [
        {
          text: 'Dr. Dolittle',
          family: 'Dolittle',
          prefix: ['Dr.']
        }
      ],
      active: true
    };
    const response = await axios.put(`${LOCAL_FHIR_API}/Practitioner/${practitionerId}`, practitioner, {
      headers: { 'Content-Type': 'application/fhir+json' }
    });
    console.log(`Created/Updated Practitioner with ID: ${response.data.id}`);
  } catch (e: unknown) {
    console.error('Failed to create test Practitioner:', toErrorMessage(e));
    throw e;
  }

  // Phase 2: Warm-up with MOCK ARTIFACTORY registry (re-download CORE again via mock)
  // console.log('Phase 2: Starting mock Artifactory server...');
  // Keep Phase 1 server alive (different port) to avoid process.exit side-effects from its shutdown.

  // const mockPort = 3333; // default port provided by FPI mock server
  // const mockServer = createMockArtifactoryServer(mockPort);
  // await mockServer.start();
  // globalThis.mockArtifactoryServer = mockServer;
  // console.log(`Mock Artifactory server running on port ${mockPort}`);

  // Delete core again to force a second re-download from the mock registry
  // deleteCorePackage();

  // Use RAW token (no base64) for clarity; mock expects Bearer test-token
  // const registryTokenRaw = MOCK_ARTIFACTORY_VALID_TOKEN;
  // console.log('[Phase 2] Using mock registry token value:', registryTokenRaw);

  // console.log('Phase 2: Warming FUME with mock Artifactory registry settings...');
  // globalThis.fumeServer = new FumeServer();
  // Manual metadata probe to verify mock registry availability before warmUp
  // try {
  //   const metaUrl = `http://localhost:${mockPort}/artifactory/api/npm/fhir-npm-remote/hl7.fhir.r4.core/`;
  //   const metaResp = await axios.get(metaUrl, { headers: { Authorization: `Bearer ${registryTokenRaw}` } });
  //   console.log(`[Phase 2] Mock registry metadata status: ${metaResp.status}; keys: ${Object.keys(metaResp.data || {}).length}`);
  // } catch (e: any) {
  //   console.warn('[Phase 2] Mock registry metadata request failed:', e?.response?.status, e?.message);
  // }
  // await globalThis.fumeServer.warmUp({
  //   SERVER_PORT: 42420,
  //   SERVER_STATELESS: false,
  //   FHIR_SERVER_BASE: LOCAL_FHIR_API,
  //   FHIR_SERVER_AUTH_TYPE: 'NONE',
  //   FHIR_SERVER_UN: '',
  //   FHIR_SERVER_PW: '',
  //   FHIR_SERVER_TIMEOUT: 30000,
  //   FHIR_VERSION: '4.0.1',
  //   // Phase 2: use same package list as Phase 1 to validate core re-download under mock registry
  //   FHIR_PACKAGES: 'il.core.fhir.r4@0.14.2,fume.outburn.r4@0.1.1,il.tasmc.fhir.r4@0.1.1',
  //   FHIR_PACKAGE_CACHE_DIR,
  //   FHIR_PACKAGE_REGISTRY_URL: `http://localhost:${mockPort}/artifactory/api/npm/fhir-npm-remote`,
  //   FHIR_PACKAGE_REGISTRY_TOKEN: registryTokenRaw,
  //   FHIR_PACKAGE_REGISTRY_ALLOW_HTTP: true
  // });
  // assertCorePackagePresent('Phase 2');

  // Final server app will be used by integration tests
  // globalThis.app = globalThis.fumeServer.getExpressApp();

  // Integration safeguard: ensure US Core dependency is indexed although not explicitly requested
  // try {
  //   const indexPath = path.resolve('fhirPackageIndex.json');
  //   if (fs.existsSync(indexPath)) {
  //     const raw = fs.readFileSync(indexPath, 'utf8');
  //     const json = JSON.parse(raw || '{}');
  //     const packages = json.packages || {};
  //     if (!packages['hl7.fhir.us.core@6.1.0']) {
  //       throw new Error('Mandatory package \'hl7.fhir.us.core@6.1.0\' not found in global FHIR package index. Dependencies were not installed correctly.');
  //     } else {
  //       console.log('Verified dependency package \'hl7.fhir.us.core@6.1.0\' is present in global index.');
  //     }
  //   } else {
  //     throw new Error('Global FHIR package index file not found after server warm up.');
  //   }
  // } catch (e: any) {
  //   console.error('FHIR package index validation failed:', e?.message || e);
  //   throw e;
  // }
  // console.log('Dual warm-up preflight complete. Integration tests may proceed using mock registry configuration.');
}

export default setup;
