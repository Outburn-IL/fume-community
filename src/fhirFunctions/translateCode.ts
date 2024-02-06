
import expressions from '../jsonataExpression';
import cache from '../cache';
import conformance from '../conformance';
import { getLogger } from '../logger';

const logger = getLogger();

export const translateCode = async (input: string, tableId: string) => {
  // fork: os
  try {
    let map = cache.tables[tableId];
    debugger;
    if (map === undefined) {
      logger.info(`Table ${tableId} not cached, trying to fetch from server...`);
      map = (await conformance.getTable(tableId))[tableId];
      cache.tables[tableId] = map;
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
    logger.error({ error });
    return undefined;
  }
};
