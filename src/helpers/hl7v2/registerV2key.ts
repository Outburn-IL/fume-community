import { getCache } from '../cache';

export const registerV2key = (key, normalized) => {
  getCache().v2keyMap.set(key, normalized);
};
