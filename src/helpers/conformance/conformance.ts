/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import fs from 'fs-extra';

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
    const error = new Error(`Found multiple definitions with the same id "${definitionId}"!`);
    getLogger().error(error);
    throw (error);
  } else {
    const path: string = indexed;
    const fullDef = JSON.parse(fs.readFileSync(path).toString()); // load file
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

export const getCodeSystem = async (codeSystemId: string): Promise<any> => {
  const packageIndex = getFhirPackageIndex()[config.getFhirVersionMinor()];
  const indexed = packageIndex.codeSystems.byUrl[codeSystemId] ??
  packageIndex.codeSystems.byId[codeSystemId] ??
  packageIndex.codeSystems.byName[codeSystemId];

  if (!indexed) { // if not indexed, throw warning and return nothing
    const msg = 'CodeSystem "' + codeSystemId + '" not found!';
    getLogger().warn(msg);
    return undefined;
  } else if (Array.isArray(indexed)) {
    const error = new Error(`Found multiple CodeSystem resources with the same id "${codeSystemId}"!`);
    getLogger().error(error);
    throw (error);
  } else {
    const path: string = indexed;
    const resource = JSON.parse(fs.readFileSync(path).toString()); // load file
    return resource;
  };
};

export const getValueSet = async (valueSetId: string): Promise<any> => {
  const packageIndex = getFhirPackageIndex()[config.getFhirVersionMinor()];
  const indexed = packageIndex.valueSets.byUrl[valueSetId] ??
  packageIndex.valueSets.byId[valueSetId] ??
  packageIndex.valueSets.byName[valueSetId];

  if (!indexed) { // if not indexed, throw warning and return nothing
    const msg = 'ValueSet "' + valueSetId + '" not found!';
    getLogger().warn(msg);
    return undefined;
  } else if (Array.isArray(indexed)) {
    const error = new Error(`Found multiple ValueSet resources with the same id "${valueSetId}"!`);
    getLogger().error(error);
    throw (error);
  } else {
    const path: string = indexed;
    const resource = JSON.parse(fs.readFileSync(path).toString()); // load file
    return resource;
  };
};

export const codeSystemDictionary = async (codeSystemId: string): Promise<any> => {
  const resource = await getCodeSystem(codeSystemId);
  const csContent = resource?.content;
  if (csContent === 'complete') {
    return await expressions.codeSystemToDictionary.evaluate(resource);
  } else {
    getLogger().warn(`CodeSystem resource '${codeSystemId}' does not contain the full list of codes. Codes in this system cannot be validated`);
    return undefined;
  }
};

export const valueSetExpandDictionary = async (valueSetId: string): Promise<any> => {
  const resource = await getValueSet(valueSetId);
  return await expressions.valueSetExpandDictionary.evaluate({}, { vs: resource, valueSetExpand: valueSetExpandDictionary, codeSystemDictionary });
};
