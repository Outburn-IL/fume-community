import config from '../../config';
import conformance from '../conformance';
import fhirFuncs from '../fhirFunctions';
import { getLogger } from '../logger';
import thrower from '../thrower';

const getStructureDefinitionPath = (definitionId: string): any => {
  // fork: os
  const serverConfig = config.getServerConfig();
  const fhirVersionMinor = fhirFuncs.fhirVersionToMinor(serverConfig.FHIR_VERSION);
  const fhirPackageIndex = conformance.getFhirPackageIndex();
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
  try {
    const path: string = getStructureDefinitionPath(definitionId);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fullDef = require(path); // load file
    // getLogger().info(`Definition loaded: ${path}`);
    return fullDef;
  } catch (e) {
    return thrower.throwParseError(`A Problem occured while getting the structure definition of '${definitionId}'. The error is: ${e}`);
  }
};
