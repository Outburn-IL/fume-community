/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import fs from 'fs-extra';
import path from 'path';

import { ILogger } from '../../types';
import { IFhirPackageIndex } from '../conformance';
import { getStructureDefinition, getStructureDefinitionPath } from '../jsonataFunctions/getStructureDefinition';
import { generateSnapshot } from '../snapshotBuilder';
import * as stringFuncs from '../stringFunctions';

const diskCachePath: string = path.join('.', 'snapshots');
fs.ensureDirSync(diskCachePath);

export const getSnapshot = async (rootType: string, fhirVersion: string, fhirPackageIndex: IFhirPackageIndex, logger: ILogger) => {
  if (rootType.startsWith('#')) {
    return getStructureDefinition(rootType, fhirVersion, fhirPackageIndex, logger);
  }
  // fetch a snapshot from disk cache or build it and save to cache

  const originalDefinitionPath: string | undefined = getStructureDefinitionPath(rootType, fhirVersion, fhirPackageIndex, logger);
  if (originalDefinitionPath) {
    // found the definition path in index, turn it into a hashkey
    const hashKey: string = stringFuncs.hashKey(originalDefinitionPath);
    const snapshotPath: string = path.join(diskCachePath, hashKey + '.json');
    // check if disk cache has a file with that key
    if (fs.existsSync(snapshotPath)) {
      // snapshot exists in disk cache, return it
      return JSON.parse(fs.readFileSync(snapshotPath).toString());
    } else {
      // snapshot does not exist in disk cache, generate it
      const snapshot = await generateSnapshot(rootType, fhirVersion, fhirPackageIndex, logger);
      // then save it
      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
      return snapshot;
    }
  } else {
    // did not find the definition in index
    return undefined;
  }
};
