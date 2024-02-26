/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import config from '../../config';
import { getFhirClient } from '../fhirServer';
import expressions from '../jsonataExpression';
import { getLogger } from '../logger';
import { getFhirPackageIndex } from './loadFhirPackageIndex';

export const getStructureDefinition = async (definitionId: string): Promise<any> => {
  const fhirPackageIndex = getFhirPackageIndex();
  const packageIndex = fhirPackageIndex[config.getFhirVersionMinor()];
  const indexed = packageIndex.structureDefinitions.byId[definitionId] ??
  packageIndex.structureDefinitions.byUrl[definitionId] ??
  packageIndex.structureDefinitions.byName[definitionId];

  if (!indexed) { // if not indexed, throw warning and return nothing
    const msg = 'Definition "' + definitionId + '" not found!';
    getLogger().warn(msg);
    return undefined;
  } else if (Array.isArray(indexed)) {
    const error = new Error(`Found multiple definition with the same id "${definitionId}"!`);
    getLogger().error(error);
    throw (error);
  } else {
    const path: string = indexed;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fullDef = require(path); // load file
    return fullDef;
  };
};

export const getTable = async (tableId: string) => {
  if (tableId === undefined || tableId.trim() === '') {
    // exit if no id provided
    throw new Error('First argument to function getTable must be a table id, url or name');
  };
  const err = `Failed to fetch ConceptMap whose id, url or name is: '${tableId}'`;
  let response;
  try {
    // try to fetch by id
    response = await getFhirClient().read('ConceptMap/' + tableId);
  } catch {
    // not found by id
    try {
      // try by url
      response = await getFhirClient().search('ConceptMap', { url: tableId });
      if (typeof response === 'object' && typeof response.total === 'number' && response.total !== 1) {
        // try by name
        response = await getFhirClient().search('ConceptMap', { name: tableId });
        if (typeof response === 'object' && typeof response.total === 'number' && response.total !== 1) {
          // coudn't find
          getLogger().error(err);
          throw new Error(err);
        }
      }
    } catch {
      getLogger().error(err);
      throw new Error(err);
    }
  };
  const table = await expressions.conceptMapToTable.evaluate(response);
  return table;
};
