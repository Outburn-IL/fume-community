/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { getLogger } from '../logger';
import ensurePack from './ensurePackageInstalled';

/**
 * Download a list of packages from the registry to the local package cache (including dependencies)
 * @param fhirPackage A string or array of strings in the format `packageId@version`
 */
export const downloadPackages = async (fhirPackage: string[]) => {
  try {
    for (const pack of fhirPackage) {
      await ensurePack(pack);
    };
    return true;
  } catch (e) {
    getLogger().error(e);
    return null;
  }
};
