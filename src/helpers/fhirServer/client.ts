/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { FhirClient as OutburnFhirClient } from '@outburn/fhir-client';

import config from '../../config';
import { IConfig, IFhirClient } from '../../types';
import { getLogger } from '../logger';

export class FhirClient implements IFhirClient {
  protected readonly serverConfig: IConfig;
  protected readonly isStateless: boolean;
  private client?: OutburnFhirClient;

  constructor () {
    this.serverConfig = config.getServerConfig();
    this.isStateless = this.serverConfig.SERVER_STATELESS;
    this.init();
  }

  private init () {
    if (!this.isStateless) {
      const { FHIR_SERVER_BASE, FHIR_SERVER_TIMEOUT, FHIR_SERVER_AUTH_TYPE, FHIR_SERVER_UN, FHIR_SERVER_PW } = this.serverConfig;
      
      const fhirVersionMinor = config.getFhirVersionMinor();
      const fhirVersion = fhirVersionMinor === '3.0' ? 'R3' : fhirVersionMinor === '5.0' ? 'R5' : 'R4';
      
      const auth = FHIR_SERVER_AUTH_TYPE === 'BASIC' && FHIR_SERVER_UN && FHIR_SERVER_PW
        ? { username: FHIR_SERVER_UN, password: FHIR_SERVER_PW }
        : undefined;

      this.client = new OutburnFhirClient({
        baseUrl: FHIR_SERVER_BASE,
        fhirVersion,
        timeout: FHIR_SERVER_TIMEOUT,
        auth
      });
      
      getLogger().info(`Using FHIR server: ${FHIR_SERVER_BASE}`);
    }
  }

  protected checkStateless () {
    if (this.isStateless) {
      getLogger().warn('Server is stateless, not performing the operation');
      return true;
    }
    return false;
  }

  public async read (url: string) {
    if (this.checkStateless()) {
      return;
    }

    // The @outburn/fhir-client's resolve method handles both:
    // - Literal references like "Patient/123"
    // - Full URLs
    return await this.client!.resolve(url);
  }

  public async search (query: string, params?: object) {
    if (this.checkStateless()) {
      return;
    }

    return await this.client!.search(query, params as any);
  }

  /**
   * Get the underlying @outburn/fhir-client instance for direct access
   * This is used for passing to fumifier for FHIR function support
   */
  public getClient () {
    return this.client;
  }
}

/** Global fhir client */
let fhirClient: IFhirClient | undefined;

export const setFhirClient = (client: IFhirClient) => {
  fhirClient = client;
};

export const getFhirClient = () => {
  if (!fhirClient) {
    throw new Error('FHIR client not initialized');
  }
  return fhirClient;
};
