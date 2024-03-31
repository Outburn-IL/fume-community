/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
import { getCache } from '../cache';
import { registerV2key } from '../hl7v2/registerV2key';

export const v2normalizeKey = (key: string): string => {
  const cached = getCache().v2keyMap.get(key);
  if (!cached) {
    const titleCased = ((key ?? '').replace('\'', '').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(''));
    const dtmFixed = (titleCased ?? '').replace('Date/Time', 'DateTime').replace('Date / Time', 'DateTime');
    const underscored = (dtmFixed ?? '').replace(/[-+".()\\//]/g, '_');
    registerV2key(key, underscored);
    return underscored;
  } else {
    return cached;
  }
};
