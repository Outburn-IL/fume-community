/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME
 */

import { toJsonataString } from './toJsonataString';
import { getSnapshot } from './getSnapshot';
import { funcs } from '../jsonataFuncs';
import { getElementDefinition } from './getElementDefinition';
import { replaceColonsWithBrackets } from '../stringFunctions';

export default {
  toJsonataString,
  getSnapshot,
  getMandatoriesOfElement: funcs.getMandatoriesOfElement,
  getMandatoriesOfStructure: funcs.getMandatoriesOfStructure,
  getElementDefinition,
  replaceColonsWithBrackets
};
