/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
/* eslint-disable */

import { getSnapshot } from '../parser/getSnapshot';
import { replaceColonsWithBrackets } from '../stringFunctions';
import { getMandatoriesOfElement } from './getMandatoriesOfElement';
import { returnPathWithoutX } from '../parser/returnPathWithoutX'
import { initCapOnce } from '../stringFunctions';

const dev = process.env.NODE_ENV === 'dev';

export const getMandatoriesOfStructure = async (structId: string): Promise<any> => {
  if (dev) console.log({ func: getMandatoriesOfStructure, structId });
  const snapshot = await getSnapshot(structId);
  const rootMandatories = snapshot.snapshot.element.filter(item => item.min > 0 && item.id.split('.').length === 2);
  const res = {};
  for (const item of rootMandatories) {
    const typeCount = item.type.length;
    const isPoly = item.id.endsWith('[x]');
    const idSuffixRaw = item.id.substring(item.id.indexOf(snapshot.type) + snapshot.type.length + 1);
    const idSuffix = isPoly && typeCount === 1 ? returnPathWithoutX(idSuffixRaw) + initCapOnce(item.type[0].code) : idSuffixRaw;
    if (dev) console.log({ itemId: item.id, idSuffix });
    // if id suffix ends with [x] and there's a single type - fix the id accordingly
    const val = await getMandatoriesOfElement(structId, idSuffix);
    if (val) {
      if (item.base.max > '1' || item.base.max === '*' || item.max > '1' || item.max === '*') {
        res[idSuffix] = [val];
      } else {
        res[idSuffix] = val;
      }
    }
  }

  if (Object.keys(res).length > 0) {
    return Object.assign({}, ...Object.entries(res).map(([key, value]) => ({ [replaceColonsWithBrackets(key)]: value })));
  }
};
