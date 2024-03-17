/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { getCache } from '../cache';
import { getTable } from '../conformance';
import expressions from '../jsonataExpression';
import { getLogger } from '../logger';

export const translateCode = async (input: string, tableId: string) => {
  const { tables } = getCache();
  try {
    let map = tables.get(tableId);
    if (map === undefined) {
      getLogger().info(`Table ${tableId} not cached, trying to fetch from server...`);
      const table = await getTable(tableId);
      if (table) {
        map = table[tableId];
        tables.set(tableId, map);
      }
    };

    const mapFiltered = map[input];
    let result;

    if (mapFiltered) {
      if (mapFiltered.length === 1) {
        result = mapFiltered[0].code;
      } else {
        result = await expressions.translateCodeExtract.evaluate({}, { mapFiltered });
      }
    }
    return result;
  } catch (error) {
    getLogger().error({ error });
    return undefined;
  }
};
