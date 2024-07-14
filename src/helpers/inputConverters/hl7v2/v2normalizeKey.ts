/**
 * © Copyright Outburn Ltd. 2022-2024 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { getCache } from '../../cache';
import expressions from '../../jsonataExpression';
import { initCap } from '../../stringFunctions';
import { registerV2key } from './registerV2key';

export const v2normalizeKey = async (key: string) => {
  const bindings = {
    initCap,
    keyMap: getCache().v2keyMap.getDict(),
    registerV2key
  };
  const res = await expressions.v2normalizeKey.evaluate(key, bindings);
  return res;
};
