/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import fumifier from 'fumifier';

import { getCache } from './cache';
import { getTranslationTable } from './getTranslationTable';
import { getLogger } from './logger';

export const translateCode = async (input: string, tableId: string) => {
  const { tables } = getCache();
  try {
    let map = tables.get(tableId);
    if (map === undefined) {
      getLogger().info(`Table ${tableId} not cached, trying to fetch from server...`);
      const table = await getTranslationTable(tableId);
      if (table) {
        map = table[tableId];
        tables.set(tableId, map);
      }
    }

    const mapFiltered = map?.[input];
    let result;

    if (mapFiltered) {
      if (mapFiltered.length === 1) {
        result = mapFiltered[0].code;
      } else {
        result = await (await fumifier('$mapFiltered.code')).evaluate({}, { mapFiltered });
      }
    }
    return result;
  } catch (error) {
    getLogger().error({ error });
    return undefined;
  }
};

export const translateCoding = async (input: string, tableId: string) => {
  const { tables } = getCache();
  try {
    let map = tables.get(tableId);
    if (map === undefined) {
      getLogger().info(`Table ${tableId} not cached, trying to fetch from server...`);
      const table = await getTranslationTable(tableId);
      if (table) {
        map = table[tableId];
        tables.set(tableId, map);
      }
    }

    const mapFiltered = map?.[input];
    let result;

    if (mapFiltered) {
      if (mapFiltered.length === 1) {
        result = mapFiltered[0];
      } else {
        result = mapFiltered;
      }
    }

    const coding = await (await fumifier(`
    $result.{
      'system': target,
      'code': code,
      'display': display
    }`)).evaluate({}, { result, input });
    return coding;
  } catch (error) {
    getLogger().error({ error });
    return undefined;
  }
};
