/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */
import { getCache } from '../cache';

export const registerV2key = (key, normalized) => {
  getCache().v2keyMap.set(key, normalized);
};
