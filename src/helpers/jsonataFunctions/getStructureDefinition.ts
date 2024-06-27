/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import fs from 'fs-extra';

import config from '../../config';
import { getFhirPackageIndex } from '../conformance';
import fhirFuncs from '../fhirFunctions';
import { getLogger } from '../logger';
import thrower from '../thrower';

export const getStructureDefinitionPath = (definitionId: string): any => {
  const serverConfig = config.getServerConfig();
  const fhirVersionMinor = fhirFuncs.fhirVersionToMinor(serverConfig.FHIR_VERSION);
  const fhirPackageIndex = getFhirPackageIndex();
  const cached = fhirPackageIndex[fhirVersionMinor];
  const indexed = cached.structureDefinitions.byId[definitionId] ??
    cached.structureDefinitions.byUrl[definitionId] ??
    cached.structureDefinitions.byName[definitionId];

  if (!indexed) { // if not indexed, throw warning and return nothing
    const msg = 'Definition "' + definitionId + '" not found!';
    getLogger().warn(msg);
    return undefined;
  } else if (Array.isArray(indexed)) {
    const error = new Error(`Found multiple definition with the same id "${definitionId}"!`);
    getLogger().error(error);
    throw (error);
  } else {
    return indexed;
  }
};

export const getStructureDefinition = (definitionId: string): any => {
  // First check if this is a BackboneElement referenced by contentRefernce (strats with #)
  try {
    if (definitionId.startsWith('#')) {
      // Take the base type name
      const elementId: string = definitionId.substring(1);
      const baseType: string = elementId.split('.')[0];
      const baseSnapshot = getStructureDefinition(baseType);
      const allElements: any[] = baseSnapshot?.snapshot?.element;
      const backboneElements = allElements.filter((e) => e?.id === elementId || String(e?.id).startsWith(elementId + '.'));
      return {
        derivation: 'specialization',
        differential: { element: backboneElements },
        snapshot: { element: backboneElements }
      };
    };
    const path: string = getStructureDefinitionPath(definitionId);
    if (path) {
      const fullDef = JSON.parse(fs.readFileSync(path).toString()); // load file
      return fullDef;
    } else return undefined;
  } catch (e) {
    return thrower.throwParseError(`A Problem occured while getting the structure definition of '${definitionId}'. The error is: ${e}`);
  }
};
