import { initCap } from "../stringFunctions";
import expressions from '../jsonataExpression';
import { registerV2key } from "./registerV2key";
import cache from '../cache';

export const v2normalizeKey = async (key: string) => {
  const bindings = { initCap, keyMap: cache.v2keyMap, registerV2key };
  const res = await expressions.v2normalizeKey.evaluate(key, bindings);
  return res;
};
