/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { FhirPackageInstaller, type FpiConfig } from 'fhir-package-installer';

import config from '../../config';
import type { ILogger } from '../../types';
import { getLogger } from '../logger';

/**
 * Create a logger with FPI prefix for all messages
 * @returns Logger instance with FPI prefix
 */
const createFpiLogger = (): ILogger => {
  const baseLogger = getLogger();
  return {
    info: (msg: any) => baseLogger.info(`[FPI] ${msg}`),
    warn: (msg: any) => baseLogger.warn(`[FPI] ${msg}`),
    error: (msg: any) => baseLogger.error(`[FPI] ${msg}`)
  };
};

/**
 * Singleton instance of FhirPackageInstaller configured for FUME
 */
let fpiInstance: FhirPackageInstaller | null = null;

/**
 * Get or create the FhirPackageInstaller instance
 * @returns Configured FhirPackageInstaller instance
 */
export const getFpiInstance = (): FhirPackageInstaller => {
  if (fpiInstance === null) {
    const fpiLogger = createFpiLogger();
    const fpiConfig: FpiConfig = {
      logger: fpiLogger,
      registryUrl: config.getFhirPackageRegistryUrl(),
      registryToken: config.getFhirPackageRegistryToken(),
      cachePath: config.getFhirPackageCacheDir()
    };

    fpiInstance = new FhirPackageInstaller(fpiConfig);
    fpiLogger.info('FhirPackageInstaller instance created');
  }

  return fpiInstance;
};

/**
 * Reset the FhirPackageInstaller instance (mainly for testing)
 */
export const resetFpiInstance = (): void => {
  fpiInstance = null;
};
