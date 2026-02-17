/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import axios from 'axios';
// import { createMockArtifactoryServer, MOCK_ARTIFACTORY_VALID_TOKEN } from 'fhir-package-installer/mock-artifactory-server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { FumeServer } from '../src/server';
import { FHIR_PACKAGE_CACHE_DIR, LOCAL_FHIR_API } from './config';

const TEST_TARGET = (process.env.FUME_TEST_TARGET ?? 'node').toLowerCase();
const DOCKER_CONTAINER_NAME = process.env.FUME_TEST_DOCKER_CONTAINER_NAME ?? 'fume_community_test_server';
const DOCKER_IMAGE = process.env.FUME_TEST_DOCKER_IMAGE ?? 'fume-community:test';
const DOCKER_BASE_URL = process.env.FUME_TEST_BASE_URL ?? 'http://127.0.0.1:42420';
const DOCKER_HAPI_API = process.env.FUME_TEST_FHIR_API ?? 'http://host.docker.internal:8080/fhir';

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

async function waitForHapiReady (baseUrl: string, opts?: { maxAttempts?: number; delayMs?: number; timeoutMs?: number }) {
  const maxAttempts = opts?.maxAttempts ?? 60;
  const delayMs = opts?.delayMs ?? 2000;
  const timeoutMs = opts?.timeoutMs ?? 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(`${baseUrl}/metadata`, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        return;
      }
    } catch (e: unknown) {
      if (attempt === 1) {
        console.log('Waiting for HAPI FHIR server to be ready...');
      }
      console.error(`Attempt ${attempt} failed:`, toErrorMessage(e));
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error('HAPI FHIR server failed to start within timeout');
}

async function waitForFumeReady (baseUrl: string, opts?: { maxAttempts?: number; delayMs?: number; timeoutMs?: number; containerName?: string }) {
  const maxAttempts = opts?.maxAttempts ?? 90;
  const delayMs = opts?.delayMs ?? 1000;
  const timeoutMs = opts?.timeoutMs ?? 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) {
        return;
      }
    } catch (e: unknown) {
      if (attempt === 1) {
        console.log('Waiting for FUME server to be ready...');
      }
      console.error(`Attempt ${attempt} failed:`, toErrorMessage(e));
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // If running in container mode, dump logs to help debug CI/local timeouts.
  if (opts?.containerName) {
    try {
      console.error(`FUME container '${opts.containerName}' did not become ready. Dumping docker status/logs...`);
      try {
        execSync('docker ps --no-trunc --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"', { stdio: 'inherit' });
      } catch {
        // ignore
      }
      execSync(`docker logs --tail 200 ${opts.containerName}`, { stdio: 'inherit' });
    } catch (e: unknown) {
      console.error('Failed to dump docker logs:', toErrorMessage(e));
    }
  }

  throw new Error('FUME server failed to start within timeout');
}

async function setup () {
  console.log('--- Global setup starting: dual registry warm-up preflight ---');

  console.log('Checking HAPI FHIR server status...');
  try {
    const response = await fetch(`${LOCAL_FHIR_API}/metadata`);
    if (response.ok) {
      console.log('HAPI FHIR server is already running and healthy!');
    } else {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  } catch {
    console.log('Starting HAPI FHIR server...');
    const composeFile = path.join(__dirname, 'docker-compose.yml');
    execSync(`docker compose -f "${composeFile}" up -d`, {
      stdio: 'inherit',
      cwd: __dirname
    });
  }

  await waitForHapiReady(LOCAL_FHIR_API, { maxAttempts: 60, delayMs: 2000 });

  // Give it a bit more time to fully stabilize
  await new Promise(resolve => setTimeout(resolve, 2000));

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
  const effectiveConfig = {
    SERVER_PORT: 42420,
    FHIR_SERVER_BASE: LOCAL_FHIR_API,
    FHIR_SERVER_AUTH_TYPE: 'NONE',
    FHIR_SERVER_UN: '',
    FHIR_SERVER_PW: '',
    FHIR_SERVER_TIMEOUT: 30000,
    FHIR_VERSION: '4.0.1',
    FHIR_PACKAGES: 'il.core.fhir.r4@0.14.2,fume.outburn.r4@0.1.1,il.tasmc.fhir.r4@0.1.1',
    FHIR_PACKAGE_CACHE_DIR
  };

  if (TEST_TARGET === 'docker' || TEST_TARGET === 'container') {
    console.log(`Phase 1: Using Docker target (image=${DOCKER_IMAGE})...`);

    const dockerConfig = {
      ...effectiveConfig,
      // From inside the container, localhost would be the container itself.
      // We publish HAPI on the host at :8080, so use host.docker.internal.
      FHIR_SERVER_BASE: DOCKER_HAPI_API
    };

    // Ensure cache dir exists on host so the volume mount works
    if (FHIR_PACKAGE_CACHE_DIR) {
      const hostCacheDir = path.resolve(FHIR_PACKAGE_CACHE_DIR);
      fs.mkdirSync(hostCacheDir, { recursive: true });
    }

    // Remove any previous container (avoid port conflicts)
    try {
      execSync(`docker rm -f ${DOCKER_CONTAINER_NAME}`, { stdio: 'ignore' });
    } catch {
      // ignore
    }

    const hostCacheDir = FHIR_PACKAGE_CACHE_DIR ? path.resolve(FHIR_PACKAGE_CACHE_DIR) : undefined;
    const containerCacheDir = '/usr/src/app/tests/.fhir-packages';

    const envParts = [
      '-e HOME=/tmp',
      `-e SERVER_PORT=${dockerConfig.SERVER_PORT}`,
      `-e FHIR_SERVER_BASE=${dockerConfig.FHIR_SERVER_BASE}`,
      `-e FHIR_SERVER_AUTH_TYPE=${dockerConfig.FHIR_SERVER_AUTH_TYPE}`,
      `-e FHIR_SERVER_UN=${dockerConfig.FHIR_SERVER_UN}`,
      `-e FHIR_SERVER_PW=${dockerConfig.FHIR_SERVER_PW}`,
      `-e FHIR_SERVER_TIMEOUT=${dockerConfig.FHIR_SERVER_TIMEOUT}`,
      `-e FHIR_VERSION=${dockerConfig.FHIR_VERSION}`,
      `-e FHIR_PACKAGES=${dockerConfig.FHIR_PACKAGES}`,
      ...(hostCacheDir ? [`-e FHIR_PACKAGE_CACHE_DIR=${containerCacheDir}`] : [])
    ];

    const volumeParts = hostCacheDir
      ? [`-v "${hostCacheDir}":"${containerCacheDir}"`]
      : [];

    const userParts: string[] = [];
    if (hostCacheDir && typeof (process as unknown as { getuid?: () => number }).getuid === 'function' && typeof (process as unknown as { getgid?: () => number }).getgid === 'function') {
      const uid = (process as unknown as { getuid: () => number }).getuid();
      const gid = (process as unknown as { getgid: () => number }).getgid();
      userParts.push(`--user ${uid}:${gid}`);
    }

    const runCmd = [
      'docker run -d',
      `--name ${DOCKER_CONTAINER_NAME}`,
      '-p 42420:42420',
      // Ensure host.docker.internal works on Linux (GitHub Actions)
      '--add-host host.docker.internal:host-gateway',
      ...userParts,
      ...envParts,
      ...volumeParts,
      DOCKER_IMAGE
    ].join(' ');

    console.log(`Starting FUME container: ${DOCKER_CONTAINER_NAME}`);
    execSync(runCmd, { stdio: 'inherit' });

    await waitForFumeReady(DOCKER_BASE_URL, { maxAttempts: 90, delayMs: 1000, timeoutMs: 5000, containerName: DOCKER_CONTAINER_NAME });

    globalThis.fumeServer = undefined;
    globalThis.app = DOCKER_BASE_URL;

    // In container mode we can't reliably validate the host cache path structure here.
  } else {
    console.log('Phase 1: Warming FUME with default registry (no custom URL/TOKEN)...');
    await deleteCorePackage();
    const firstServer = await FumeServer.create({
      config: effectiveConfig
    });
    assertCorePackagePresent('Phase 1');

    // Since we're using Phase 1 server for tests, set global references
    globalThis.fumeServer = firstServer;
    globalThis.app = firstServer.getExpressApp();
  }

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
