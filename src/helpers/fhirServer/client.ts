/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import axios, { AxiosInstance } from 'axios';

import config from '../../config';
import { IConfig, IFhirClient } from '../../types';
import { getLogger } from '../logger';

export class FhirClient implements IFhirClient {
  protected readonly contentType: string;
  protected fhirServer?: AxiosInstance;
  protected readonly serverConfig: IConfig;
  protected readonly isStateless: boolean;

  constructor () {
    this.serverConfig = config.getServerConfig();
    this.contentType = `application/fhir+json;fhirVersion=${config.getFhirVersionMinor()}`;
    this.isStateless = this.serverConfig.SERVER_STATELESS;
    this.init();
  }

  private authHeader (authType: string, username?: string, password?: string) {
    if (authType === 'BASIC' && username && password && username > '' && password > '') {
      const buff = Buffer.from(`${username}:${password}`, 'utf-8');
      return `Basic ${buff.toString('base64')}`;
    } else {
      return undefined;
    }
  }

  private init () {
    if (!this.isStateless) {
      const { FHIR_SERVER_BASE, FHIR_SERVER_TIMEOUT, FHIR_SERVER_AUTH_TYPE, FHIR_SERVER_UN, FHIR_SERVER_PW } = this.serverConfig;
      const server = axios.create({
        baseURL: FHIR_SERVER_BASE,
        timeout: FHIR_SERVER_TIMEOUT,
        headers: {
          'Content-Type': this.contentType,
          Accept: this.contentType,
          Authorization: this.authHeader(FHIR_SERVER_AUTH_TYPE, FHIR_SERVER_UN, FHIR_SERVER_PW)
        }
      });
      getLogger().info(`Using FHIR server: ${FHIR_SERVER_BASE}`);
      this.fhirServer = server;
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

    const response = await this.fhirServer!.get(`${url}`);
    return response.data;
  }

  public async search (query: string, params?: object) {
    if (this.checkStateless()) {
      return;
    }

    const response = await this.fhirServer!.get(`/${query}`, { params });
    return response.data;
  }

  public async create (resource: object, resourceType: string) {
    throw new Error('Method not implemented.');
  }

  public async update (resourceType: string, resourceId: string, resource: object) {
    throw new Error('Method not implemented.');
  }

  public async simpleDelete (resourceType: string, resourceId: string) {
    throw new Error('Method not implemented.');
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
