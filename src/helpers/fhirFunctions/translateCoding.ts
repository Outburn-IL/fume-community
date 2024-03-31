/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { getCache } from '../cache';
import { expressions } from '../jsonataExpr';
import { getLogger } from '../logger';

export const translateCoding = async (input, tableId) => {
  // fork: os
  const { tables } = getCache();
  try {
    const map = tables.get(tableId);
    const mapFiltered = map[input];
    let result;

    if (mapFiltered) {
      if (mapFiltered.length === 1) {
        result = mapFiltered[0];
      } else {
        result = mapFiltered;
      }
    }

    const coding = expressions.translateCodingExtract(result, input);
    return coding;
  } catch (error) {
    getLogger().error({ error });
    return undefined;
  }
};
