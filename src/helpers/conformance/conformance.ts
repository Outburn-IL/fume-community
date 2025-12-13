/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { getFhirClient } from '../fhirClient';
import expressions from '../jsonataExpressions';
import { getLogger } from '../logger';

export const getTable = async (tableId: string) => {
  if (tableId === undefined || tableId.trim() === '') {
    // exit if no id provided
    throw new Error('First argument to function getTable must be a table id, url or name');
  }
  const err = `Failed to fetch ConceptMap whose id, url or name is: '${tableId}'`;
  let response;
  try {
    // try to fetch by id
    response = await getFhirClient().read('ConceptMap', tableId);
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
  }
  const table = await (await expressions).conceptMapToTable.evaluate(response);
  return table;
};
