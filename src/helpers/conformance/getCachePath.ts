/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import path from 'path';

import { getFpiInstance } from '../conformance/fpiInstance';

export const getCachePackagesPath = () => {
  return getFpiInstance().getCachePath();
};

export const getFumeIndexFilePath = () => {
  return path.join(path.resolve('.'), 'fhirPackageIndex.json');
};
