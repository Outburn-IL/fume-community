/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { FhirClient } from '@outburn/fhir-client';

import config from '../../config';
import { getLogger } from '../logger';

/**
 * Initialize and return a new FhirClient instance
 */
export const createFhirClient = (): FhirClient => {
  const serverConfig = config.getServerConfig();
  const { FHIR_SERVER_BASE, FHIR_SERVER_TIMEOUT, FHIR_SERVER_AUTH_TYPE, FHIR_SERVER_UN, FHIR_SERVER_PW } = serverConfig;

  const fhirVersion = config.getFhirVersion();
  
  const auth = FHIR_SERVER_AUTH_TYPE === 'BASIC' && FHIR_SERVER_UN && FHIR_SERVER_PW
    ? { username: FHIR_SERVER_UN, password: FHIR_SERVER_PW }
    : undefined;

  const client = new FhirClient({
    baseUrl: FHIR_SERVER_BASE,
    fhirVersion,
    timeout: FHIR_SERVER_TIMEOUT,
    auth
  });
  
  getLogger().info(`Using FHIR server: ${FHIR_SERVER_BASE}`);
  
  return client;
};

/** Global fhir client */
let fhirClient: FhirClient | undefined;

export const setFhirClient = (client: FhirClient) => {
  fhirClient = client;
};

export const getFhirClient = (): FhirClient => {
  if (!fhirClient) {
    throw new Error('FHIR client not initialized');
  }
  return fhirClient;
};
