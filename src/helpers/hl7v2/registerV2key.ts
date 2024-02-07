import cache from '../cache';

export const registerV2key = (key, normalized) => {
  cache.v2keyMap[key] = normalized;
};
