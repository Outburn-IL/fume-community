import { initCap } from '../stringFunctions';
import expressions from '../jsonataExpression';
import { registerV2key } from './registerV2key';
import { getCache } from '../cache';

export const v2normalizeKey = async (key: string) => {
  const bindings = {
    initCap,
    keyMap: getCache().v2keyMap.getDict(),
    registerV2key
  };
  const res = await expressions.v2normalizeKey.evaluate(key, bindings);
  return res;
};
