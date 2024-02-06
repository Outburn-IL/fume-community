/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { getLogger } from './logger';
import config from './config';
import axios, { AxiosInstance } from 'axios';

const logger = getLogger();

let contentType: string;

let fhirServer: AxiosInstance;

const init = (): void => {
  contentType = `application/fhir+json;fhirVersion=${config.getFhirVersionWithoutPatch()}`;
  if (config.getFhirServerBase() === undefined || (typeof config.getFhirServerBase() === 'string' && config.getFhirServerBase() === '')) {
    isStateless = true;
  } else {
    const server = axios.create({
      baseURL: config.getFhirServerBase(),
      timeout: config.getFhirServerTimeout(),
      headers: {
        'Content-Type': contentType,
        Accept: contentType
      }
    });
    logger.info(`Using FHIR server: ${config.getFhirServerBase()}`);
    fhirServer = server;
  }
};

let isStateless: boolean;

export const read = async (url: string) => {
  if (isStateless) {
    logger.warn('Server is stateless, not reading the resource');
    return undefined;
  }

  const response = await fhirServer.get(`${url}`);
  return response.data;
};

export const search = async (query: string, params?: object) => {
  if (isStateless) {
    logger.warn('Server is stateless, skipping search');
    return undefined;
  };

  let queryConfigParams = { _count: config.getSearchBundleSize() };
  logger.info(`Performing search, page size: ${config.getSearchBundleSize()}`);
  if (params) {
    queryConfigParams = { ...queryConfigParams, ...params };
  };

  const response = await fhirServer.get(`/${query}`, { params: queryConfigParams });
  return response.data;
};

export const create = async (resource: object, resourceType: string) => {
  if (isStateless) {
    logger.info('Server is stateless, not posting resource');
    return undefined;
  }

  const response = await fhirServer.post(`/${resourceType}`, resource);
  return response.data;
};

export const update = async (resourceType: string, resourceId: string, resource) => {
  if (isStateless) {
    logger.warn('Server is stateless, not updating the resource');
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
    logger.warn('Server is stateless, not deleting the resource');
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
