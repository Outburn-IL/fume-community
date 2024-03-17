
import { getCache } from '../cache';
import { getTable } from '../conformance';
import { expressions } from '../jsonataExpr';
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
        result = expressions.translateCodeExtract(mapFiltered);
      }
    }
    return result;
  } catch (error) {
    getLogger().error({ error });
    return undefined;
  }
};
