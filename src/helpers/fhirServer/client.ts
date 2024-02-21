/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { getLogger } from '../logger';
import config from '../../config';
import axios, { AxiosInstance } from 'axios';
import { IFhirClient } from '../../types';

export class FhirClient implements IFhirClient {
  private readonly contentType: string;
  private fhirServer?: AxiosInstance;
  private readonly serverConfig: any;
  private readonly isStateless: boolean;

  constructor () {
    this.serverConfig = config.getServerConfig();
    this.contentType = `application/fhir+json;fhirVersion=${config.getFhirVersionMinor()}`;
    this.isStateless = this.serverConfig.SERVER_STATELESS;
    this.init();
  }

  private authHeader (authType: string, username?: string, password?: string) {
    if (authType === 'BASIC' && username && password && username > '' && password > '') {
      return `Basic ${btoa(username + ':' + password)}`;
    } else {
      return undefined;
    }
  };

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

  public async read (url: string) {
    if (this.isStateless) {
      getLogger().warn('Server is stateless, not reading the resource');
      return undefined;
    }

    const response = await this.fhirServer!.get(`${url}`);
    return response.data;
  };

  public async search (query: string, params?: object) {
    if (this.isStateless) {
      getLogger().warn('Server is stateless, skipping search');
      return undefined;
    };

    const { SEARCH_BUNDLE_PAGE_SIZE } = this.serverConfig;

    let queryConfigParams = { _count: SEARCH_BUNDLE_PAGE_SIZE };
    getLogger().info(`Performing search, page size: ${SEARCH_BUNDLE_PAGE_SIZE}`);
    if (params) {
      queryConfigParams = { ...queryConfigParams, ...params };
    };

    const response = await this.fhirServer!.get(`/${query}`, { params: queryConfigParams });
    return response.data;
  };

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
