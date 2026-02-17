/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import type { IConfig } from '../types';

const normalizeOptionalSetting = (value?: string): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'n/a') {
    return undefined;
  }
  return trimmed;
};

export const getFhirServerBaseIfAny = (config: IConfig): string | undefined => {
  return normalizeOptionalSetting(config.FHIR_SERVER_BASE);
};

export const getMappingsFolderIfAny = (config: IConfig): string | undefined => {
  return normalizeOptionalSetting(config.MAPPINGS_FOLDER);
};

export const hasMappingSources = (config: IConfig): boolean => {
  return !!getFhirServerBaseIfAny(config) || !!getMappingsFolderIfAny(config);
};

export const getFhirServerEndpoint = (config: IConfig): string => {
  return getFhirServerBaseIfAny(config) ?? 'n/a';
};
