/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { replaceColonsWithBrackets } from '../stringFunctions';
import { getElementDefinition } from './getElementDefinition';
import { getSnapshot } from './getSnapshot';
import { funcs } from './jsonataFuncs';
import { toJsonataString } from './toJsonataString';

export default {
  toJsonataString,
  getSnapshot,
  getMandatoriesOfElement: funcs.getMandatoriesOfElement,
  getMandatoriesOfStructure: funcs.getMandatoriesOfStructure,
  getElementDefinition,
  replaceColonsWithBrackets
};
