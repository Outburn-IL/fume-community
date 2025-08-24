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
  let hadErrors = false;
  for (const pack of fhirPackage) {
    try {
      await ensurePack(pack);
    } catch (e: any) {
      const details = e?.stack ?? e?.message ?? String(e);
      getLogger().error(`Failed to download package ${pack}: ${details}`);
      hadErrors = true;
    }
  }
  return hadErrors ? null : true;
};
