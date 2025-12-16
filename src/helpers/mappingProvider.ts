/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { FumeMappingProvider } from '@outburn/fume-mapping-provider';

let mappingProvider: FumeMappingProvider | undefined;

export const setMappingProvider = (provider: FumeMappingProvider) => {
  mappingProvider = provider;
};

export const getMappingProvider = (): FumeMappingProvider => {
  if (!mappingProvider) {
    throw new Error('Mapping provider not initialized');
  }
  return mappingProvider;
};
