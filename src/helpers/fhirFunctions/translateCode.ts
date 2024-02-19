
import expressions from '../jsonataExpression';
import { getCache } from '../cache';
import conformance from '../conformance';
import { getLogger } from '../logger';

export const translateCode = async (input: string, tableId: string) => {
  const { tables } = getCache();
  // fork: os
  try {
    let map = tables.get(tableId);
    if (map === undefined) {
      getLogger().info(`Table ${tableId} not cached, trying to fetch from server...`);
      map = (await conformance.getTable(tableId))[tableId];
      tables.set(tableId, map);
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
