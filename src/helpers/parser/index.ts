/**
 * © Copyright Outburn Ltd. 2022-2023 All Rights Reserved
 *   Project name: FUME-COMMUNITY
 */

import { funcs } from '../jsonataFuncs';
import { replaceColonsWithBrackets } from '../stringFunctions';
import { getElementDefinition } from './getElementDefinition';
import { getSnapshot } from './getSnapshot';
import { toJsonataString } from './toJsonataString';

export default {
  toJsonataString,
  getSnapshot,
  getMandatoriesOfElement: funcs.getMandatoriesOfElement,
  getMandatoriesOfStructure: funcs.getMandatoriesOfStructure,
  getElementDefinition,
  replaceColonsWithBrackets
};
