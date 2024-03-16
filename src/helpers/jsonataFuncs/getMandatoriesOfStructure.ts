/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */
/* eslint-disable */

import { getSnapshot } from '../parser/getSnapshot';
import { replaceColonsWithBrackets } from '../stringFunctions';
import { getMandatoriesOfElement } from './getMandatoriesOfElement';

export const getMandatoriesOfStructure = async (structId: string): Promise<any> => {
  const snapshot = await getSnapshot(structId);
  const rootMandatories = snapshot.snapshot.element.filter(item => item.min > 0 && item.id.split('.').length === 2);
  const res = {};
  for (const item of rootMandatories) {
    const idSuffix = item.id.substring(item.id.indexOf(snapshot.type) + snapshot.type.length + 1);
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
