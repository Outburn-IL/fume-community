/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { getCache } from '../cache';
import { getTable } from '../conformance';
import expressions from '../jsonataExpressions';
import { getLogger } from '../logger';

export const translateCoding = async (input: string, tableId: string) => {
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
    }

    const mapFiltered = map[input];
    let result;

    if (mapFiltered) {
      if (mapFiltered.length === 1) {
        result = mapFiltered[0];
      } else {
        result = mapFiltered;
      }
    }

    const coding = await (await expressions).translateCodingExtract.evaluate({}, { result, input });
    return coding;
  } catch (error) {
    getLogger().error({ error });
    return undefined;
  }
};
