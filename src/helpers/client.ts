/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { getLogger } from './logger';
import config from '../config';
import axios, { AxiosInstance } from 'axios';

let contentType: string;
let fhirServer: AxiosInstance;

const serverConfig = config.getServerConfig();
const isStateless: boolean = serverConfig.SERVER_STATELESS;

const authHeader = (authType: string, username?: string, password?: string) => {
  if (authType === 'BASIC' && username && password && username > '' && password > '') {
    return `Basic ${btoa(username + ':' + password)}`;
  } else {
    return undefined;
  }
};

const init = (): void => {
  contentType = `application/fhir+json;fhirVersion=${config.getFhirVersionWithoutPatch()}`;
  if (!isStateless) {
    const server = axios.create({
      baseURL: serverConfig.FHIR_SERVER_BASE,
      timeout: serverConfig.FHIR_SERVER_TIMEOUT,
      headers: {
        'Content-Type': contentType,
        Accept: contentType,
        Authorization: authHeader(serverConfig.FHIR_SERVER_AUTH_TYPE, serverConfig.FHIR_SERVER_UN, serverConfig.FHIR_SERVER_PW)
      }
    });
    getLogger().info(`Using FHIR server: ${serverConfig.FHIR_SERVER_BASE}`);
    fhirServer = server;
  }
};

export const read = async (url: string) => {
  if (isStateless) {
    getLogger().warn('Server is stateless, not reading the resource');
    return undefined;
  }

  const response = await fhirServer.get(`${url}`);
  return response.data;
};

export const search = async (query: string, params?: object) => {
  if (isStateless) {
    getLogger().warn('Server is stateless, skipping search');
    return undefined;
  };

  let queryConfigParams = { _count: serverConfig.SEARCH_BUNDLE_PAGE_SIZE };
  getLogger().info(`Performing search, page size: ${serverConfig.SEARCH_BUNDLE_PAGE_SIZE}`);
  if (params) {
    queryConfigParams = { ...queryConfigParams, ...params };
  };

  const response = await fhirServer.get(`/${query}`, { params: queryConfigParams });
  return response.data;
};

export const create = async (resource: object, resourceType: string) => {
  if (isStateless) {
    getLogger().info('Server is stateless, not posting resource');
    return undefined;
  }

  const response = await fhirServer.post(`/${resourceType}`, resource);
  return response.data;
};

export const update = async (resourceType: string, resourceId: string, resource) => {
  if (isStateless) {
    getLogger().warn('Server is stateless, not updating the resource');
    return undefined;
  }

  const response = await fhirServer.put(
    `/${resourceType}/${resourceId}`,
    resource
  );
  return response.data;
};

export const simpleDelete = async (resourceType: string, resourceId: string) => {
  if (isStateless) {
    getLogger().warn('Server is stateless, not deleting the resource');
    return undefined;
  }

  const response = await fhirServer.delete(`/${resourceType}/${resourceId}`);
  return response.data;
};

export default {
  init,
  read,
  search,
  create,
  update,
  simpleDelete
};
